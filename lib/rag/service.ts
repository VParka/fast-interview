// ============================================
// Hybrid RAG Service
// Vector Search + BM25 + Cohere Reranker
// ============================================

import OpenAI from 'openai';
import { createServerClient } from '@/lib/supabase/client';
import type { Document, DocumentType } from '@/types/interview';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface RAGSearchResult {
  document: Document;
  score: number;
  highlights: string[];
}

export interface RAGConfig {
  vectorWeight?: number;
  bm25Weight?: number;
  useReranker?: boolean;
  topK?: number;
}

class RAGService {
  private cohereApiKey = process.env.COHERE_API_KEY;
  private embeddingModel = 'text-embedding-3-small';
  private embeddingDimension = 1536;

  // Generate embeddings using OpenAI
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
      model: this.embeddingModel,
      input: text,
    });

    return response.data[0].embedding;
  }

  // Upload and embed document
  async uploadDocument(
    userId: string,
    type: DocumentType,
    filename: string,
    content: string,
    metadata: Record<string, unknown> = {}
  ): Promise<Document> {
    const supabase = createServerClient();

    // Generate embedding
    const embedding = await this.generateEmbedding(content);

    // Store document
    const { data, error } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        type,
        filename,
        content,
        embedding,
        metadata,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      type: data.type as DocumentType,
      user_id: data.user_id,
      filename: data.filename,
      content: data.content,
      embedding: data.embedding as number[] | undefined,
      metadata: data.metadata as Record<string, unknown>,
      created_at: data.created_at,
    };
  }

  // Hybrid search with Vector + BM25 + Reranking
  async search(
    query: string,
    userId: string,
    docTypes?: DocumentType[],
    config: RAGConfig = {}
  ): Promise<RAGSearchResult[]> {
    const {
      vectorWeight = 0.6,
      bm25Weight = 0.4,
      useReranker = true,
      topK = 5,
    } = config;

    const supabase = createServerClient();

    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);

    // Call hybrid search function
    const { data: results, error } = await supabase.rpc('hybrid_search', {
      query_embedding: queryEmbedding,
      query_text: query,
      match_count: topK * 2, // Get more for reranking
      vector_weight: vectorWeight,
      bm25_weight: bm25Weight,
    });

    if (error) {
      console.error('Hybrid search error:', error);
      // Fallback to vector-only search
      return this.vectorOnlySearch(queryEmbedding, userId, docTypes, topK);
    }

    // Filter by document types if specified
    let filteredResults = results || [];
    if (docTypes && docTypes.length > 0) {
      filteredResults = filteredResults.filter((r: { metadata: { type?: string } }) =>
        docTypes.includes(r.metadata?.type as DocumentType)
      );
    }

    // Rerank with Cohere if enabled
    if (useReranker && this.cohereApiKey && filteredResults.length > 0) {
      filteredResults = await this.rerank(query, filteredResults, topK);
    }

    // Convert to RAGSearchResult format
    return filteredResults.slice(0, topK).map((r: { id: string; content: string; metadata: Record<string, unknown>; combined_score?: number; relevance_score?: number }) => ({
      document: {
        id: r.id,
        type: (r.metadata?.type as DocumentType) || 'resume',
        user_id: userId,
        filename: (r.metadata?.filename as string) || '',
        content: r.content,
        metadata: r.metadata,
        created_at: new Date().toISOString(),
      },
      score: r.combined_score || r.relevance_score || 0,
      highlights: this.extractHighlights(r.content, query),
    }));
  }

  // Vector-only search fallback
  private async vectorOnlySearch(
    queryEmbedding: number[],
    userId: string,
    docTypes?: DocumentType[],
    topK: number = 5
  ): Promise<RAGSearchResult[]> {
    const supabase = createServerClient();

    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: topK,
    });

    if (error) throw error;

    return (data || []).map((r: { id: string; content: string; metadata: Record<string, unknown>; similarity: number }) => ({
      document: {
        id: r.id,
        type: (r.metadata?.type as DocumentType) || 'resume',
        user_id: userId,
        filename: (r.metadata?.filename as string) || '',
        content: r.content,
        metadata: r.metadata,
        created_at: new Date().toISOString(),
      },
      score: r.similarity,
      highlights: [],
    }));
  }

  // Rerank results using Cohere
  private async rerank(
    query: string,
    documents: { id: string; content: string; metadata: Record<string, unknown>; combined_score?: number }[],
    topK: number
  ): Promise<{ id: string; content: string; metadata: Record<string, unknown>; relevance_score: number }[]> {
    try {
      const response = await fetch('https://api.cohere.ai/v1/rerank', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.cohereApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'rerank-multilingual-v3.0',
          query,
          documents: documents.map(d => d.content),
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
        relevance_score: r.relevance_score,
      }));
    } catch (error) {
      console.error('Cohere rerank failed:', error);
      // Return original order if reranking fails
      return documents.map(d => ({ ...d, relevance_score: d.combined_score || 0 }));
    }
  }

  // Extract relevant highlights from content
  private extractHighlights(content: string, query: string): string[] {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim());

    const relevantSentences = sentences.filter(sentence => {
      const lowerSentence = sentence.toLowerCase();
      return queryTerms.some(term => lowerSentence.includes(term));
    });

    return relevantSentences.slice(0, 3).map(s => s.trim());
  }

  // Generate context string from search results
  async getContextForInterview(
    userId: string,
    query: string,
    resumeDocId?: string
  ): Promise<string> {
    // Search user's resume
    const results = await this.search(query, userId, ['resume', 'portfolio'], {
      topK: 3,
      useReranker: true,
    });

    if (results.length === 0) {
      return '';
    }

    // Build context string
    const context = results
      .map((r, i) => `[문서 ${i + 1}]\n${r.highlights.join(' ... ')}`)
      .join('\n\n');

    return `지원자 정보:\n${context}`;
  }

  // Delete document
  async deleteDocument(documentId: string, userId: string): Promise<boolean> {
    const supabase = createServerClient();

    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', userId);

    return !error;
  }

  // Get user's documents
  async getUserDocuments(userId: string, type?: DocumentType): Promise<Document[]> {
    const supabase = createServerClient();

    let query = supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(d => ({
      id: d.id,
      type: d.type as DocumentType,
      user_id: d.user_id,
      filename: d.filename,
      content: d.content,
      embedding: d.embedding as number[] | undefined,
      metadata: d.metadata as Record<string, unknown>,
      created_at: d.created_at,
    }));
  }
}

// Singleton instance
export const ragService = new RAGService();

// Utility functions
export async function uploadDocument(
  userId: string,
  type: DocumentType,
  filename: string,
  content: string,
  metadata?: Record<string, unknown>
): Promise<Document> {
  return ragService.uploadDocument(userId, type, filename, content, metadata);
}

export async function searchDocuments(
  query: string,
  userId: string,
  docTypes?: DocumentType[],
  config?: RAGConfig
): Promise<RAGSearchResult[]> {
  return ragService.search(query, userId, docTypes, config);
}
