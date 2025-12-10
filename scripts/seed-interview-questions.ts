#!/usr/bin/env npx ts-node
// ============================================
// Seed Interview Questions from PDF Files
// ============================================
// This script reads PDF files from docs/ directory and seeds
// interview questions into the database.
//
// Usage:
//   npx ts-node scripts/seed-interview-questions.ts
//   # or
//   npm run seed:questions

// Load environment variables first
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// ============================================
// Types
// ============================================

type JobCategory = 'frontend' | 'backend' | 'pm' | 'data' | 'marketing';

interface ParsedQuestion {
  no: number;
  category: string;
  question: string;
  sourceCompany?: string;
}

// ============================================
// Configuration
// ============================================

const PDF_FILES: Array<{ filename: string; jobCategory: JobCategory }> = [
  { filename: '개발자기출.pdf', jobCategory: 'frontend' },
  { filename: '백엔드기출.pdf', jobCategory: 'backend' },
  { filename: 'PM기출.pdf', jobCategory: 'pm' },
  { filename: '데이터기출.pdf', jobCategory: 'data' },
  { filename: '마케팅기출.pdf', jobCategory: 'marketing' },
];

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const EMBEDDING_MODEL = 'text-embedding-3-small';

// ============================================
// Clients
// ============================================

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================
// PDF Parsing (simplified inline version)
// ============================================

async function parsePDF(pdfBuffer: Buffer): Promise<string> {
  // Try to use pdf-parse v2 (class-based API)
  try {
    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse({
      data: new Uint8Array(pdfBuffer),
    });
    const result = await parser.getText();
    await parser.destroy();

    const text = result.text
      .replace(/\0/g, '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .trim();

    return text;
  } catch (error) {
    console.warn('pdf-parse failed, using fallback:', error);
    // Ultimate fallback - raw text extraction
    return pdfBuffer
      .toString('utf-8')
      .replace(/[\x00-\x1F\x7F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

// ============================================
// Question Extraction
// ============================================

function extractQuestionsFromText(text: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);

  // Primary Pattern: "문제N \t 카테고리 \t 질문" (PDF 기출문제 형식)
  // e.g., "문제1 	직무역할 	서비스 기획자가 하는 일이 무엇이라고 생각하나요?"
  const pdfQuestionPattern = /^문제(\d+)\s+(\S+)\s+(.+)$/;

  // Pattern 2: Table format "번호 | 카테고리 | 문제"
  const tablePattern = /^(\d+)\s*[|｜]\s*([^|｜]+)\s*[|｜]\s*(.+)$/;

  // Pattern 3: Numbered with category "[카테고리] 질문"
  const numberedCategoryPattern = /^(\d+)[.)]\s*\[([^\]]+)\]\s*(.+)$/;

  // Pattern 4: Plain numbered "번호. 질문"
  const plainNumberedPattern = /^(\d+)[.)]\s+(.+)$/;

  // Pattern 5: Company source pattern
  const sourcePattern = /\(출처[：:]\s*([^)]+)\)|\[출처[：:]\s*([^\]]+)\]$/;

  let currentCategory = '기타';
  let questionNo = 0;

  // Also handle multi-line questions (where question continues on next line)
  let pendingQuestion: { no: number; category: string; question: string } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip header lines and page markers
    if (line.includes('카테고리') && line.includes('문제') && line.includes('No')) continue;
    if (line.startsWith('PART') || line.startsWith('Part')) continue;
    if (line.match(/^페이지|^Page/i)) continue;
    if (line.match(/^-- \d+ of \d+ --$/)) continue;
    if (line.match(/^\d+$/)) continue; // Page numbers only
    if (line.match(/^1\.4\$\)00-/)) continue; // PDF header artifacts

    // Try PDF question format first (primary pattern for 기출문제)
    let match = line.match(pdfQuestionPattern);
    if (match) {
      // Save any pending multi-line question
      if (pendingQuestion) {
        const question = cleanQuestionText(pendingQuestion.question);
        if (question.length >= 10) {
          const sourceMatch = question.match(sourcePattern);
          questions.push({
            no: pendingQuestion.no,
            category: pendingQuestion.category,
            question: question.replace(sourcePattern, '').trim(),
            sourceCompany: sourceMatch ? (sourceMatch[1] || sourceMatch[2])?.trim() : undefined,
          });
        }
        pendingQuestion = null;
      }

      const [, no, category, questionText] = match;
      // Check if this line ends with incomplete question (no punctuation)
      const endsWithPunctuation = /[?!.。？！]$/.test(questionText.trim());

      if (!endsWithPunctuation && i + 1 < lines.length) {
        // This might be a multi-line question
        pendingQuestion = {
          no: parseInt(no, 10),
          category: category.trim(),
          question: questionText.trim(),
        };
      } else {
        const question = cleanQuestionText(questionText);
        const sourceMatch = question.match(sourcePattern);
        questions.push({
          no: parseInt(no, 10),
          category: category.trim(),
          question: question.replace(sourcePattern, '').trim(),
          sourceCompany: sourceMatch ? (sourceMatch[1] || sourceMatch[2])?.trim() : undefined,
        });
      }
      currentCategory = category.trim();
      continue;
    }

    // Check if this is a continuation of a pending multi-line question
    if (pendingQuestion && !line.match(/^문제\d+/) && !line.match(/^(\d+)\s*[|｜]/)) {
      // Append to pending question if it looks like continuation
      if (!line.includes('No') && !line.includes('카테고리')) {
        pendingQuestion.question += ' ' + line;

        // Check if now complete
        const endsWithPunctuation = /[?!.。？！]$/.test(line.trim());
        if (endsWithPunctuation) {
          const question = cleanQuestionText(pendingQuestion.question);
          if (question.length >= 10) {
            const sourceMatch = question.match(sourcePattern);
            questions.push({
              no: pendingQuestion.no,
              category: pendingQuestion.category,
              question: question.replace(sourcePattern, '').trim(),
              sourceCompany: sourceMatch ? (sourceMatch[1] || sourceMatch[2])?.trim() : undefined,
            });
          }
          pendingQuestion = null;
        }
        continue;
      }
    }

    // Try table format
    match = line.match(tablePattern);
    if (match) {
      const [, no, category, questionText] = match;
      const question = cleanQuestionText(questionText);
      const sourceMatch = question.match(sourcePattern);

      questions.push({
        no: parseInt(no, 10),
        category: category.trim(),
        question: question.replace(sourcePattern, '').trim(),
        sourceCompany: sourceMatch ? (sourceMatch[1] || sourceMatch[2])?.trim() : undefined,
      });
      currentCategory = category.trim();
      continue;
    }

    // Try numbered with category format
    match = line.match(numberedCategoryPattern);
    if (match) {
      const [, no, category, questionText] = match;
      const question = cleanQuestionText(questionText);
      const sourceMatch = question.match(sourcePattern);

      questions.push({
        no: parseInt(no, 10),
        category: category.trim(),
        question: question.replace(sourcePattern, '').trim(),
        sourceCompany: sourceMatch ? (sourceMatch[1] || sourceMatch[2])?.trim() : undefined,
      });
      currentCategory = category.trim();
      continue;
    }

    // Try plain numbered format (as fallback)
    match = line.match(plainNumberedPattern);
    if (match) {
      const [, no, questionText] = match;
      const question = cleanQuestionText(questionText);

      if (question.length < 10) continue;
      if (!isLikelyQuestion(question)) continue;

      const sourceMatch = question.match(sourcePattern);
      questionNo = parseInt(no, 10);

      questions.push({
        no: questionNo,
        category: currentCategory,
        question: question.replace(sourcePattern, '').trim(),
        sourceCompany: sourceMatch ? (sourceMatch[1] || sourceMatch[2])?.trim() : undefined,
      });
      continue;
    }

    // Check for category header lines
    const categoryMatch = line.match(/^(?:카테고리|분류)[：:]\s*(.+)$/);
    if (categoryMatch) {
      currentCategory = categoryMatch[1].trim();
    }
  }

  // Don't forget any remaining pending question
  if (pendingQuestion) {
    const question = cleanQuestionText(pendingQuestion.question);
    if (question.length >= 10) {
      const sourceMatch = question.match(sourcePattern);
      questions.push({
        no: pendingQuestion.no,
        category: pendingQuestion.category,
        question: question.replace(sourcePattern, '').trim(),
        sourceCompany: sourceMatch ? (sourceMatch[1] || sourceMatch[2])?.trim() : undefined,
      });
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  return questions.filter(q => {
    const key = q.question.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cleanQuestionText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/^[-•·]\s*/, '')
    .replace(/\?{2,}/g, '?')
    .trim();
}

function isLikelyQuestion(text: string): boolean {
  const endsWithQuestion = text.endsWith('?');
  const hasQuestionWords = /어떻게|무엇|왜|어디|언제|설명|경험|대처|해결|극복/.test(text);
  const hasActionWords = /하셨|했던|해본|말씀|설명해|알려/.test(text);
  return endsWithQuestion || hasQuestionWords || hasActionWords;
}

// ============================================
// Embedding Generation
// ============================================

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const BATCH_SIZE = 100;
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    console.log(`  Generating embeddings ${i + 1}-${Math.min(i + BATCH_SIZE, texts.length)} of ${texts.length}`);

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    });

    embeddings.push(...response.data.map(d => d.embedding));

    if (i + BATCH_SIZE < texts.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return embeddings;
}

// ============================================
// Database Operations
// ============================================

async function clearQuestions(jobCategory: JobCategory): Promise<void> {
  const { error } = await supabase
    .from('interview_questions')
    .delete()
    .eq('job_category', jobCategory);

  if (error) {
    console.error(`  Error clearing ${jobCategory}:`, error);
  }
}

async function uploadQuestions(
  questions: ParsedQuestion[],
  jobCategory: JobCategory
): Promise<{ inserted: number; skipped: number }> {
  // Check for existing questions
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
    return !existingSet.has(key);
  });

  const skipped = questions.length - newQuestions.length;

  if (newQuestions.length === 0) {
    return { inserted: 0, skipped };
  }

  // Generate embeddings
  const questionTexts = newQuestions.map(q => `[${q.category}] ${q.question}`);
  const embeddings = await generateEmbeddings(questionTexts);

  // Prepare records
  const records = newQuestions.map((q, idx) => ({
    job_category: jobCategory,
    question_category: q.category,
    question: q.question,
    source_company: q.sourceCompany || null,
    embedding: embeddings[idx],
    metadata: { original_no: q.no },
  }));

  // Insert in batches
  const INSERT_BATCH_SIZE = 50;
  let inserted = 0;

  for (let i = 0; i < records.length; i += INSERT_BATCH_SIZE) {
    const batch = records.slice(i, i + INSERT_BATCH_SIZE);

    const { error } = await supabase
      .from('interview_questions')
      .insert(batch);

    if (error) {
      console.error(`  Insert error:`, error);
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, skipped };
}

async function getStats(): Promise<{ total: number; byCategory: Record<string, number> }> {
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

  return { total: data.length, byCategory };
}

// ============================================
// Main
// ============================================

interface SeedResult {
  filename: string;
  jobCategory: JobCategory;
  questionsFound: number;
  questionsInserted: number;
  questionsSkipped: number;
  error?: string;
}

async function seedQuestions(clearExisting: boolean = false): Promise<void> {
  console.log('====================================');
  console.log('Interview Questions Seeding Script');
  console.log('====================================\n');

  // Verify environment
  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY is not set');
    process.exit(1);
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL is not set');
    process.exit(1);
  }

  console.log('Environment OK');
  console.log(`Docs directory: ${DOCS_DIR}\n`);

  if (!fs.existsSync(DOCS_DIR)) {
    console.error(`Error: docs directory not found at ${DOCS_DIR}`);
    process.exit(1);
  }

  const results: SeedResult[] = [];

  for (const { filename, jobCategory } of PDF_FILES) {
    const filePath = path.join(DOCS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      console.warn(`Warning: ${filename} not found, skipping...`);
      results.push({
        filename,
        jobCategory,
        questionsFound: 0,
        questionsInserted: 0,
        questionsSkipped: 0,
        error: 'File not found',
      });
      continue;
    }

    console.log(`\nProcessing: ${filename} (${jobCategory})`);
    console.log('-'.repeat(50));

    try {
      // Read PDF
      const pdfBuffer = fs.readFileSync(filePath);
      console.log(`  File size: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);

      // Clear existing if requested
      if (clearExisting) {
        console.log(`  Clearing existing questions...`);
        await clearQuestions(jobCategory);
      }

      // Parse PDF
      console.log('  Parsing PDF...');
      const text = await parsePDF(pdfBuffer);
      console.log(`  Extracted ${text.length} characters`);

      // Extract questions
      const questions = extractQuestionsFromText(text);
      console.log(`  Found ${questions.length} questions`);

      if (questions.length === 0) {
        results.push({
          filename,
          jobCategory,
          questionsFound: 0,
          questionsInserted: 0,
          questionsSkipped: 0,
          error: 'No questions found',
        });
        continue;
      }

      // Show samples
      console.log('\n  Sample questions:');
      questions.slice(0, 3).forEach((q, i) => {
        console.log(`    ${i + 1}. [${q.category}] ${q.question.slice(0, 50)}...`);
      });

      // Upload
      console.log('\n  Uploading questions...');
      const { inserted, skipped } = await uploadQuestions(questions, jobCategory);

      console.log(`  Inserted: ${inserted}`);
      console.log(`  Skipped: ${skipped}`);

      results.push({
        filename,
        jobCategory,
        questionsFound: questions.length,
        questionsInserted: inserted,
        questionsSkipped: skipped,
      });
    } catch (error) {
      console.error(`  Error:`, error);
      results.push({
        filename,
        jobCategory,
        questionsFound: 0,
        questionsInserted: 0,
        questionsSkipped: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Summary
  console.log('\n====================================');
  console.log('Summary');
  console.log('====================================\n');

  let totalFound = 0;
  let totalInserted = 0;
  let totalSkipped = 0;

  results.forEach(r => {
    console.log(`${r.filename} (${r.jobCategory}):`);
    console.log(`  Found: ${r.questionsFound}, Inserted: ${r.questionsInserted}, Skipped: ${r.questionsSkipped}`);
    if (r.error) console.log(`  Error: ${r.error}`);
    totalFound += r.questionsFound;
    totalInserted += r.questionsInserted;
    totalSkipped += r.questionsSkipped;
  });

  console.log('\n------------------------------------');
  console.log(`Total Found: ${totalFound}`);
  console.log(`Total Inserted: ${totalInserted}`);
  console.log(`Total Skipped: ${totalSkipped}`);

  // Final stats
  try {
    const stats = await getStats();
    console.log('\nDatabase Statistics:');
    console.log(`  Total: ${stats.total}`);
    Object.entries(stats.byCategory).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}`);
    });
  } catch {
    console.log('\nCould not fetch stats');
  }

  console.log('\nDone!');
}

// Run
const args = process.argv.slice(2);
const clearExisting = args.includes('--clear') || args.includes('-c');

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: npx ts-node scripts/seed-interview-questions.ts [options]

Options:
  --clear, -c    Clear existing questions before seeding
  --help, -h     Show this help
`);
  process.exit(0);
}

seedQuestions(clearExisting)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Failed:', error);
    process.exit(1);
  });
