// ============================================
// Interview Question Service
// ============================================
// Handles embedding generation, storage, and hybrid search
// for interview questions from PDF question banks

import OpenAI from 'openai';
import { createServerClient } from '@/lib/supabase/client';
import type { JobCategory, InterviewQuestion, InterviewQuestionSearchResult } from '@/types/interview';
import type { ParsedQuestion } from './question-parser';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EMBEDDING_MODEL = 'text-embedding-3-small';
const COHERE_API_KEY = process.env.COHERE_API_KEY;

// ============================================
// Embedding Generation
// ============================================

/**
 * Generate embedding for a single text
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in batch
 * OpenAI allows up to 2048 inputs per request
 */
async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const BATCH_SIZE = 100; // Conservative batch size
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    console.log(`[QuestionService] Generating embeddings ${i + 1}-${Math.min(i + BATCH_SIZE, texts.length)} of ${texts.length}`);

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    });

    embeddings.push(...response.data.map(d => d.embedding));

    // Small delay to avoid rate limiting
    if (i + BATCH_SIZE < texts.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return embeddings;
}

// ============================================
// Question Upload
// ============================================

export interface UploadQuestionsResult {
  success: boolean;
  insertedCount: number;
  skippedCount: number;
  errors: string[];
}

/**
 * Upload parsed questions to database with embeddings
 */
export async function uploadInterviewQuestions(
  questions: ParsedQuestion[],
  jobCategory: JobCategory
): Promise<UploadQuestionsResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient() as any;
  const errors: string[] = [];
  let insertedCount = 0;
  let skippedCount = 0;

  // Check for existing questions to avoid duplicates
  const { data: existingQuestions } = await supabase
    .from('interview_questions')
    .select('question')
    .eq('job_category', jobCategory);

  const existingSet = new Set(
    (existingQuestions || []).map((q: { question: string }) => q.question.toLowerCase().trim())
  );

  // Filter out duplicates
  const newQuestions = questions.filter(q => {
    const key = q.question.toLowerCase().trim();
    if (existingSet.has(key)) {
      skippedCount++;
      return false;
    }
    return true;
  });

  if (newQuestions.length === 0) {
    return {
      success: true,
      insertedCount: 0,
      skippedCount,
      errors: [],
    };
  }

  console.log(`[QuestionService] Uploading ${newQuestions.length} new questions (${skippedCount} duplicates skipped)`);

  // Generate embeddings for all questions
  const questionTexts = newQuestions.map(q =>
    `[${q.category}] ${q.question}`
  );
  const embeddings = await generateEmbeddingsBatch(questionTexts);

  // Prepare records for insertion
  const records = newQuestions.map((q, idx) => ({
    job_category: jobCategory,
    question_category: q.category,
    question: q.question,
    source_company: q.sourceCompany || null,
    embedding: embeddings[idx],
    metadata: {
      original_no: q.no,
    },
  }));

  // Insert in batches to avoid payload size limits
  const INSERT_BATCH_SIZE = 50;
  for (let i = 0; i < records.length; i += INSERT_BATCH_SIZE) {
    const batch = records.slice(i, i + INSERT_BATCH_SIZE);

    const { error } = await supabase
      .from('interview_questions')
      .insert(batch);

    if (error) {
      errors.push(`Batch ${Math.floor(i / INSERT_BATCH_SIZE) + 1}: ${error.message}`);
      console.error(`[QuestionService] Insert error:`, error);
    } else {
      insertedCount += batch.length;
    }
  }

  return {
    success: errors.length === 0,
    insertedCount,
    skippedCount,
    errors,
  };
}

/**
 * Clear all questions for a job category
 */
export async function clearQuestionsByCategory(jobCategory: JobCategory): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient() as any;

  const { error } = await supabase
    .from('interview_questions')
    .delete()
    .eq('job_category', jobCategory);

  return !error;
}

// ============================================
// Question Search
// ============================================

export interface QuestionSearchConfig {
  vectorWeight?: number;
  bm25Weight?: number;
  useReranker?: boolean;
  topK?: number;
}

/**
 * Search relevant interview questions using hybrid search
 * Combines user context (resume, JD, keywords) for query
 */
export async function searchRelevantQuestions(
  resumeText: string,
  jdText: string,
  userKeywords: string[],
  jobCategory: JobCategory,
  config: QuestionSearchConfig = {}
): Promise<InterviewQuestionSearchResult[]> {
  const {
    vectorWeight = 0.6,
    bm25Weight = 0.4,
    useReranker = true,
    topK = 5,
  } = config;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient() as any;

  // Build search query from context
  const queryParts: string[] = [];

  // Extract key skills/experiences from resume (first 500 chars)
  if (resumeText) {
    queryParts.push(resumeText.slice(0, 500));
  }

  // Extract requirements from JD (first 300 chars)
  if (jdText) {
    queryParts.push(jdText.slice(0, 300));
  }

  // Add user keywords
  if (userKeywords.length > 0) {
    queryParts.push(userKeywords.join(' '));
  }

  const queryText = queryParts.join(' ').trim();

  if (!queryText) {
    console.warn('[QuestionService] Empty search query');
    return [];
  }

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(queryText);

  // Call hybrid search function
  const { data: results, error } = await supabase.rpc('search_interview_questions', {
    query_embedding: queryEmbedding,
    query_text: queryText,
    p_job_category: jobCategory,
    match_count: useReranker ? topK * 2 : topK, // Get more for reranking
    vector_weight: vectorWeight,
    bm25_weight: bm25Weight,
  });

  if (error) {
    console.error('[QuestionService] Hybrid search error:', error);
    // Fallback to vector-only search
    return vectorOnlySearch(queryEmbedding, jobCategory, topK);
  }

  if (!results || results.length === 0) {
    return [];
  }

  // Rerank with Cohere if enabled
  if (useReranker && COHERE_API_KEY && results.length > topK) {
    const reranked = await rerankQuestions(queryText, results, topK);
    return reranked;
  }

  return results.slice(0, topK);
}

/**
 * Vector-only search fallback
 */
async function vectorOnlySearch(
  queryEmbedding: number[],
  jobCategory: JobCategory,
  topK: number
): Promise<InterviewQuestionSearchResult[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient() as any;

  const { data, error } = await supabase.rpc('match_interview_questions', {
    query_embedding: queryEmbedding,
    match_threshold: 0.5,
    match_count: topK,
    p_job_category: jobCategory,
  });

  if (error) {
    console.error('[QuestionService] Vector search error:', error);
    return [];
  }

  return (data || []).map((r: {
    id: string;
    question: string;
    question_category: string;
    job_category: string;
    source_company: string | null;
    similarity: number;
  }) => ({
    id: r.id,
    question: r.question,
    question_category: r.question_category,
    job_category: r.job_category,
    source_company: r.source_company || undefined,
    combined_score: r.similarity,
    vector_score: r.similarity,
    bm25_score: 0,
  }));
}

/**
 * Rerank results using Cohere
 */
async function rerankQuestions(
  query: string,
  documents: InterviewQuestionSearchResult[],
  topK: number
): Promise<InterviewQuestionSearchResult[]> {
  try {
    const response = await fetch('https://api.cohere.ai/v1/rerank', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${COHERE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'rerank-multilingual-v3.0',
        query,
        documents: documents.map(d => `[${d.question_category}] ${d.question}`),
        top_n: topK,
        return_documents: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Cohere rerank error: ${response.status}`);
    }

    const data = await response.json();

    // Reorder documents based on rerank results
    return data.results.map((r: { index: number; relevance_score: number }) => ({
      ...documents[r.index],
      combined_score: r.relevance_score,
    }));
  } catch (error) {
    console.error('[QuestionService] Cohere rerank failed:', error);
    return documents.slice(0, topK);
  }
}

/**
 * Get random questions by category (fallback when no context available)
 */
export async function getRandomQuestions(
  jobCategory: JobCategory,
  count: number = 5
): Promise<InterviewQuestion[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient() as any;

  // Get random questions using ORDER BY random()
  const { data, error } = await supabase
    .from('interview_questions')
    .select('id, job_category, question_category, question, source_company')
    .eq('job_category', jobCategory)
    .order('created_at', { ascending: false })
    .limit(count * 3); // Get more and randomly select

  if (error || !data) {
    console.error('[QuestionService] Random questions error:', error);
    return [];
  }

  // Shuffle and take top N
  const shuffled = data.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Get question statistics
 */
export async function getQuestionStats(): Promise<{
  total: number;
  byCategory: Record<string, number>;
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient() as any;

  const { data } = await supabase
    .from('interview_questions')
    .select('job_category');

  if (!data) {
    return { total: 0, byCategory: {} };
  }

  const byCategory: Record<string, number> = {};
  for (const row of data) {
    byCategory[row.job_category] = (byCategory[row.job_category] || 0) + 1;
  }

  return {
    total: data.length,
    byCategory,
  };
}
