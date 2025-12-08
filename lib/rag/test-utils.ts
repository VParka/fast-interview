// ============================================
// RAG Testing Utilities
// ============================================
// Helper functions for testing RAG pipeline quality

import { ragService, type RAGConfig } from './service';
import { evaluateRAG, type EvaluationQuery } from './evaluation';
import type { DocumentType } from '@/types/interview';

/**
 * Sample test queries for Korean HR documents
 */
export const SAMPLE_EVALUATION_QUERIES: EvaluationQuery[] = [
  {
    query: 'React 프로젝트 경험',
    relevantDocIds: [], // Fill with actual doc IDs
  },
  {
    query: '팀 협업 경험',
    relevantDocIds: [],
  },
  {
    query: 'AWS 인프라 구축',
    relevantDocIds: [],
  },
  {
    query: '데이터베이스 최적화',
    relevantDocIds: [],
  },
  {
    query: '애자일 개발 방법론',
    relevantDocIds: [],
  },
];

/**
 * Quick RAG quality check
 */
export async function quickRAGCheck(
  userId: string,
  testQuery: string = 'React 프로젝트 경험',
  config: RAGConfig = {}
): Promise<void> {
  console.log('\n=== Quick RAG Quality Check ===\n');

  const startTime = Date.now();

  // Run search
  const results = await ragService.search(testQuery, userId, ['resume', 'portfolio'], {
    vectorWeight: config.vectorWeight || 0.6,
    bm25Weight: config.bm25Weight || 0.4,
    useReranker: config.useReranker !== false,
    topK: config.topK || 5,
  });

  const elapsedMs = Date.now() - startTime;

  console.log(`Query: "${testQuery}"`);
  console.log(`Latency: ${elapsedMs}ms`);
  console.log(`Results: ${results.length}`);
  console.log('\nTop Results:');

  results.forEach((result, idx) => {
    console.log(`\n[${idx + 1}] Score: ${result.score.toFixed(3)}`);
    console.log(`Filename: ${result.document.filename}`);
    console.log(`Section: ${result.document.metadata?.section || 'N/A'}`);
    console.log(`Preview: ${result.document.content.substring(0, 100)}...`);
    if (result.highlights.length > 0) {
      console.log(`Highlight: ${result.highlights[0]}`);
    }
  });

  console.log('\n=== Check Complete ===\n');
}

/**
 * Compare different RAG configurations
 */
export async function compareRAGConfigs(
  userId: string,
  testQueries: string[],
  configs: Array<{ name: string; config: RAGConfig }>
): Promise<void> {
  console.log('\n=== RAG Configuration Comparison ===\n');

  const results: Array<{
    name: string;
    avgLatency: number;
    avgTopScore: number;
    avgResultCount: number;
  }> = [];

  for (const { name, config } of configs) {
    console.log(`Testing: ${name}...`);

    let totalLatency = 0;
    let totalTopScore = 0;
    let totalResultCount = 0;

    for (const query of testQueries) {
      const startTime = Date.now();

      const searchResults = await ragService.search(
        query,
        userId,
        ['resume', 'portfolio'],
        config
      );

      totalLatency += Date.now() - startTime;
      totalTopScore += searchResults[0]?.score || 0;
      totalResultCount += searchResults.length;
    }

    results.push({
      name,
      avgLatency: totalLatency / testQueries.length,
      avgTopScore: totalTopScore / testQueries.length,
      avgResultCount: totalResultCount / testQueries.length,
    });
  }

  // Print comparison table
  console.log('\n┌─────────────────────────┬──────────┬──────────┬────────┐');
  console.log('│ Configuration           │ Latency  │ Top Score│ Results│');
  console.log('├─────────────────────────┼──────────┼──────────┼────────┤');

  results.forEach(r => {
    const name = r.name.padEnd(23);
    const latency = `${r.avgLatency.toFixed(0)}ms`.padStart(8);
    const topScore = r.avgTopScore.toFixed(3).padStart(9);
    const count = r.avgResultCount.toFixed(1).padStart(7);

    console.log(`│ ${name} │ ${latency} │ ${topScore} │ ${count} │`);
  });

  console.log('└─────────────────────────┴──────────┴──────────┴────────┘\n');

  // Find best config
  const bestConfig = results.reduce((best, current) =>
    current.avgTopScore > best.avgTopScore ? current : best
  );

  console.log(`Best Configuration: ${bestConfig.name}`);
  console.log(`Top Score: ${bestConfig.avgTopScore.toFixed(3)}`);
  console.log('\n=== Comparison Complete ===\n');
}

/**
 * Test chunking quality
 */
export async function testChunkingQuality(
  sampleText: string
): Promise<void> {
  const { chunkKoreanDocument } = await import('./chunking');

  console.log('\n=== Chunking Quality Test ===\n');

  const chunks = chunkKoreanDocument(sampleText, { test: true });

  console.log(`Input length: ${sampleText.length} chars`);
  console.log(`Chunks generated: ${chunks.length}`);
  console.log('\nChunk details:');

  chunks.forEach((chunk, idx) => {
    console.log(`\n[Chunk ${idx + 1}]`);
    console.log(`Section: ${chunk.metadata.section || 'N/A'}`);
    console.log(`Length: ${chunk.metadata.charCount} chars`);
    console.log(`Tokens: ~${chunk.metadata.tokenEstimate}`);
    console.log(`Preview: ${chunk.content.substring(0, 80)}...`);
  });

  // Check overlap
  if (chunks.length > 1) {
    console.log('\n--- Overlap Check ---');
    for (let i = 1; i < chunks.length; i++) {
      const prev = chunks[i - 1].content;
      const current = chunks[i].content;

      // Find common substring
      let overlapLength = 0;
      const searchLength = Math.min(200, prev.length, current.length);

      for (let len = searchLength; len > 20; len--) {
        const prevEnd = prev.substring(prev.length - len);
        if (current.startsWith(prevEnd)) {
          overlapLength = len;
          break;
        }
      }

      console.log(`Chunks ${i}→${i + 1}: ${overlapLength} chars overlap`);
    }
  }

  console.log('\n=== Test Complete ===\n');
}

/**
 * Benchmark RAG pipeline end-to-end
 */
export async function benchmarkRAGPipeline(
  userId: string,
  iterations: number = 10
): Promise<{
  avgUploadTime: number;
  avgSearchTime: number;
  avgEmbeddingTime: number;
}> {
  console.log('\n=== RAG Pipeline Benchmark ===\n');
  console.log(`Running ${iterations} iterations...\n`);

  const sampleText = `
1. 지원동기
저는 React와 TypeScript를 활용한 프론트엔드 개발 경력 3년차 개발자입니다.
특히 사용자 경험 최적화와 성능 개선에 관심이 많습니다.

2. 주요 경험
- React 기반 대시보드 개발 (2022-2024)
- Next.js 마이그레이션 프로젝트 리딩
- AWS 인프라 구축 및 CI/CD 파이프라인 구성
  `.trim();

  let totalUploadTime = 0;
  let totalSearchTime = 0;

  for (let i = 0; i < iterations; i++) {
    // Upload benchmark
    const uploadStart = Date.now();
    const doc = await ragService.uploadDocument(
      userId,
      'resume',
      `benchmark-${i}.txt`,
      sampleText,
      { benchmark: true }
    );
    totalUploadTime += Date.now() - uploadStart;

    // Search benchmark
    const searchStart = Date.now();
    await ragService.search('React 개발 경험', userId, ['resume'], {
      topK: 5,
    });
    totalSearchTime += Date.now() - searchStart;

    // Cleanup
    await ragService.deleteDocument(doc.id, userId);

    if ((i + 1) % 5 === 0) {
      console.log(`Progress: ${i + 1}/${iterations}`);
    }
  }

  const results = {
    avgUploadTime: totalUploadTime / iterations,
    avgSearchTime: totalSearchTime / iterations,
    avgEmbeddingTime: (totalUploadTime / iterations) * 0.7, // ~70% of upload time
  };

  console.log('\n--- Results ---');
  console.log(`Average Upload Time: ${results.avgUploadTime.toFixed(0)}ms`);
  console.log(`  - Embedding: ~${results.avgEmbeddingTime.toFixed(0)}ms`);
  console.log(`  - DB Insert: ~${(results.avgUploadTime - results.avgEmbeddingTime).toFixed(0)}ms`);
  console.log(`Average Search Time: ${results.avgSearchTime.toFixed(0)}ms`);

  console.log('\n=== Benchmark Complete ===\n');

  return results;
}

/**
 * Default configurations for testing
 */
export const TEST_CONFIGS = {
  vectorOnly: {
    name: 'Vector Only',
    config: {
      vectorWeight: 1.0,
      bm25Weight: 0.0,
      useReranker: false,
      topK: 5,
    },
  },
  hybridNoRerank: {
    name: 'Hybrid (no rerank)',
    config: {
      vectorWeight: 0.6,
      bm25Weight: 0.4,
      useReranker: false,
      topK: 5,
    },
  },
  hybridWithRerank: {
    name: 'Hybrid + Rerank',
    config: {
      vectorWeight: 0.6,
      bm25Weight: 0.4,
      useReranker: true,
      topK: 5,
    },
  },
  bm25Heavy: {
    name: 'BM25 Heavy',
    config: {
      vectorWeight: 0.3,
      bm25Weight: 0.7,
      useReranker: true,
      topK: 5,
    },
  },
};
