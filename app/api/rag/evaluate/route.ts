// ============================================
// RAG Evaluation API
// ============================================
// POST /api/rag/evaluate
// - Evaluates RAG retrieval quality
// - Auto-tunes hybrid search weights
// - Returns optimal configuration

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { autoTuneRAG, retrievalMonitor } from '@/lib/rag/evaluation';
import type { DocumentType } from '@/types/interview';

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Server Component context
            }
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const docTypes = body.docTypes as DocumentType[] | undefined;

    console.log('[RAG Evaluate] Starting auto-tune for user:', user.id);

    // Run auto-tuning
    const result = await autoTuneRAG(user.id, docTypes);

    // Get current monitoring metrics
    const monitoringMetrics = retrievalMonitor.getRecentMetrics();

    return NextResponse.json({
      success: true,
      tuning: {
        bestConfig: result.bestConfig,
        bestScore: result.bestScore,
        topConfigurations: result.allResults.slice(0, 5).map(r => ({
          config: r.config,
          score: r.combinedScore,
          metrics: r.metrics,
        })),
      },
      monitoring: {
        avgTopScore: monitoringMetrics.avgTopScore,
        avgResultScore: monitoringMetrics.avgResultScore,
        avgResultCount: monitoringMetrics.avgResultCount,
        lowQualityRate: monitoringMetrics.lowQualityRate,
        needsRetuning: retrievalMonitor.needsRetuning(),
      },
      recommendation: result.bestScore > 0.7
        ? '현재 RAG 설정이 우수합니다.'
        : result.bestScore > 0.5
          ? '일부 개선이 필요합니다. 추천 설정을 적용해보세요.'
          : '문서 품질 또는 쿼리 패턴을 검토해주세요.',
    });
  } catch (error) {
    console.error('RAG Evaluation Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'RAG 평가 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const maxDuration = 120; // Evaluation can take longer
