// ============================================
// RAG Evaluation & Weight Tuning System
// ============================================
// Measures retrieval quality and optimizes hybrid search weights

import { ragService, type RAGConfig } from './service';
import type { DocumentType } from '@/types/interview';

export interface EvaluationMetric {
  precision: number;      // Relevant results / Total retrieved
  recall: number;         // Relevant results / Total relevant
  mrr: number;           // Mean Reciprocal Rank
  ndcg: number;          // Normalized Discounted Cumulative Gain
  avgRelevanceScore: number; // Average Cohere relevance score
}

export interface EvaluationQuery {
  query: string;
  relevantDocIds: string[]; // Ground truth relevant documents
  context?: string;
}

export interface WeightTuningResult {
  bestConfig: RAGConfig;
  bestScore: number;
  allResults: Array<{
    config: RAGConfig;
    metrics: EvaluationMetric;
    combinedScore: number;
  }>;
}

/**
 * Evaluate RAG retrieval quality on a set of test queries
 */
export async function evaluateRAG(
  userId: string,
  testQueries: EvaluationQuery[],
  config: RAGConfig,
  docTypes?: DocumentType[]
): Promise<EvaluationMetric> {
  let totalPrecision = 0;
  let totalRecall = 0;
  let totalMRR = 0;
  let totalNDCG = 0;
  let totalRelevanceScore = 0;

  for (const testQuery of testQueries) {
    const results = await ragService.search(
      testQuery.query,
      userId,
      docTypes,
      config
    );

    const retrievedIds = results.map(r => r.document.id);
    const relevantIds = new Set(testQuery.relevantDocIds);

    // Precision: relevant retrieved / total retrieved
    const relevantRetrieved = retrievedIds.filter(id => relevantIds.has(id)).length;
    const precision = retrievedIds.length > 0 ? relevantRetrieved / retrievedIds.length : 0;

    // Recall: relevant retrieved / total relevant
    const recall = relevantIds.size > 0 ? relevantRetrieved / relevantIds.size : 0;

    // MRR: 1 / rank of first relevant result
    const firstRelevantRank = retrievedIds.findIndex(id => relevantIds.has(id));
    const mrr = firstRelevantRank >= 0 ? 1 / (firstRelevantRank + 1) : 0;

    // NDCG: measure ranking quality with position discount
    const ndcg = calculateNDCG(retrievedIds, relevantIds);

    // Average relevance score from reranker
    const avgRelevance = results.length > 0
      ? results.reduce((sum, r) => sum + r.score, 0) / results.length
      : 0;

    totalPrecision += precision;
    totalRecall += recall;
    totalMRR += mrr;
    totalNDCG += ndcg;
    totalRelevanceScore += avgRelevance;
  }

  const count = testQueries.length;

  return {
    precision: totalPrecision / count,
    recall: totalRecall / count,
    mrr: totalMRR / count,
    ndcg: totalNDCG / count,
    avgRelevanceScore: totalRelevanceScore / count,
  };
}

/**
 * Calculate NDCG (Normalized Discounted Cumulative Gain)
 */
function calculateNDCG(retrievedIds: string[], relevantIds: Set<string>): number {
  // DCG: sum of (relevance / log2(position + 1))
  let dcg = 0;
  for (let i = 0; i < retrievedIds.length; i++) {
    const isRelevant = relevantIds.has(retrievedIds[i]) ? 1 : 0;
    dcg += isRelevant / Math.log2(i + 2); // i+2 to avoid log2(1)=0
  }

  // IDCG: ideal DCG (all relevant docs at top)
  let idcg = 0;
  const relevantCount = Math.min(retrievedIds.length, relevantIds.size);
  for (let i = 0; i < relevantCount; i++) {
    idcg += 1 / Math.log2(i + 2);
  }

  return idcg > 0 ? dcg / idcg : 0;
}

/**
 * Tune hybrid search weights to find optimal configuration
 * Uses grid search over vector_weight and bm25_weight
 */
export async function tuneHybridWeights(
  userId: string,
  testQueries: EvaluationQuery[],
  docTypes?: DocumentType[]
): Promise<WeightTuningResult> {
  console.log('[RAG Tuning] Starting weight optimization...');

  // Grid search: test different weight combinations
  const vectorWeights = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
  const useRerankerOptions = [true, false];

  const results: WeightTuningResult['allResults'] = [];

  for (const vectorWeight of vectorWeights) {
    const bm25Weight = 1 - vectorWeight;

    for (const useReranker of useRerankerOptions) {
      const config: RAGConfig = {
        vectorWeight,
        bm25Weight,
        useReranker,
        topK: 5,
      };

      console.log(`[RAG Tuning] Testing: vector=${vectorWeight}, bm25=${bm25Weight}, rerank=${useReranker}`);

      const metrics = await evaluateRAG(userId, testQueries, config, docTypes);

      // Combined score: weighted average of metrics
      // Prioritize precision and NDCG for retrieval quality
      const combinedScore =
        metrics.precision * 0.3 +
        metrics.recall * 0.2 +
        metrics.mrr * 0.2 +
        metrics.ndcg * 0.3;

      results.push({
        config,
        metrics,
        combinedScore,
      });

      console.log(`[RAG Tuning] Score: ${combinedScore.toFixed(4)} (P=${metrics.precision.toFixed(3)}, R=${metrics.recall.toFixed(3)}, NDCG=${metrics.ndcg.toFixed(3)})`);
    }
  }

  // Find best configuration
  results.sort((a, b) => b.combinedScore - a.combinedScore);
  const bestResult = results[0];

  console.log('[RAG Tuning] Best config:', bestResult.config);
  console.log('[RAG Tuning] Best score:', bestResult.combinedScore);

  return {
    bestConfig: bestResult.config,
    bestScore: bestResult.combinedScore,
    allResults: results,
  };
}

/**
 * Create evaluation dataset from existing user documents
 * Generates synthetic queries based on document sections
 */
export async function generateEvaluationDataset(
  userId: string,
  sampleSize: number = 10
): Promise<EvaluationQuery[]> {
  // Get user's documents
  const documents = await ragService.getUserDocuments(userId);

  if (documents.length === 0) {
    throw new Error('No documents found for user');
  }

  const queries: EvaluationQuery[] = [];

  // Generate queries from document chunks
  for (let i = 0; i < Math.min(sampleSize, documents.length); i++) {
    const doc = documents[i];
    const content = doc.content;

    // Extract key phrases as queries (first sentence of each paragraph)
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 20);

    for (const para of paragraphs.slice(0, 2)) {
      const sentences = para.split(/[.!?]/).filter(s => s.trim().length > 10);
      if (sentences.length > 0) {
        const query = sentences[0].trim().substring(0, 100); // First sentence as query

        queries.push({
          query,
          relevantDocIds: [doc.id],
        });
      }

      if (queries.length >= sampleSize) break;
    }

    if (queries.length >= sampleSize) break;
  }

  return queries;
}

/**
 * Run full evaluation pipeline with auto-generated dataset
 */
export async function autoTuneRAG(
  userId: string,
  docTypes?: DocumentType[]
): Promise<WeightTuningResult> {
  console.log('[RAG Auto-tune] Generating evaluation dataset...');

  // Generate test queries from user's documents
  const testQueries = await generateEvaluationDataset(userId, 20);

  console.log(`[RAG Auto-tune] Generated ${testQueries.length} test queries`);

  // Tune weights
  const result = await tuneHybridWeights(userId, testQueries, docTypes);

  return result;
}

/**
 * Continuous evaluation: track retrieval quality over time
 */
export interface RetrievalLog {
  timestamp: Date;
  query: string;
  topResultScore: number;
  avgResultScore: number;
  resultCount: number;
  config: RAGConfig;
}

export class RetrievalMonitor {
  private logs: RetrievalLog[] = [];
  private maxLogs = 1000;

  /**
   * Log a retrieval operation
   */
  log(query: string, scores: number[], config: RAGConfig): void {
    const log: RetrievalLog = {
      timestamp: new Date(),
      query,
      topResultScore: scores[0] || 0,
      avgResultScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      resultCount: scores.length,
      config,
    };

    this.logs.push(log);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  /**
   * Get quality metrics for recent retrievals
   */
  getRecentMetrics(windowSize: number = 100): {
    avgTopScore: number;
    avgResultScore: number;
    avgResultCount: number;
    lowQualityRate: number; // % of queries with top score < 0.5
  } {
    const recentLogs = this.logs.slice(-windowSize);

    if (recentLogs.length === 0) {
      return {
        avgTopScore: 0,
        avgResultScore: 0,
        avgResultCount: 0,
        lowQualityRate: 0,
      };
    }

    const avgTopScore = recentLogs.reduce((sum, log) => sum + log.topResultScore, 0) / recentLogs.length;
    const avgResultScore = recentLogs.reduce((sum, log) => sum + log.avgResultScore, 0) / recentLogs.length;
    const avgResultCount = recentLogs.reduce((sum, log) => sum + log.resultCount, 0) / recentLogs.length;
    const lowQualityCount = recentLogs.filter(log => log.topResultScore < 0.5).length;
    const lowQualityRate = lowQualityCount / recentLogs.length;

    return {
      avgTopScore,
      avgResultScore,
      avgResultCount,
      lowQualityRate,
    };
  }

  /**
   * Detect quality degradation
   */
  needsRetuning(threshold: number = 0.3): boolean {
    const metrics = this.getRecentMetrics();
    return metrics.lowQualityRate > threshold;
  }
}

// Singleton monitor instance
export const retrievalMonitor = new RetrievalMonitor();
