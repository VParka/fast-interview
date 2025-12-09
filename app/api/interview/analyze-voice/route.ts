// ============================================
// Voice Analysis API
// ============================================
// POST /api/interview/analyze-voice
// - Analyzes voice patterns from transcription
// - Returns WPM, filler words, confidence scores

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/database';
import { transcribeAudio } from '@/lib/stt/service';
import { analyzeVoice, generateVoiceFeedback } from '@/lib/analysis/voice';

const VOICE_ANALYSIS_CREDIT = Number(process.env.CREDIT_USE_VOICE_ANALYSIS ?? 1);

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
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
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    if (VOICE_ANALYSIS_CREDIT > 0) {
      const { data: chargeResult, error: chargeError } = await supabase.rpc('use_credit', {
        p_user_id: authData.user.id,
        p_amount: VOICE_ANALYSIS_CREDIT,
        p_reason: 'VOICE_ANALYSIS',
      });
      if (chargeError) {
        return NextResponse.json(
          { success: false, error: `크레딧 차감 실패: ${chargeError.message}` },
          { status: 400 }
        );
      }
      if (!chargeResult?.success) {
        const status = chargeResult?.error === 'insufficient_funds' ? 402 : 409;
        return NextResponse.json(
          { success: false, error: chargeResult?.error, balance: chargeResult?.balance },
          { status }
        );
      }
    }

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: 'audio 파일이 필요합니다.' },
        { status: 400 }
      );
    }

    // Convert audio to buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    // Transcribe with word timings
    const transcription = await transcribeAudio(audioBuffer, 'ko');

    // Analyze voice patterns
    const analysis = analyzeVoice(
      transcription.text,
      transcription.words || [],
      transcription.durationMs / 1000
    );

    // Generate feedback
    const feedback = generateVoiceFeedback(analysis);

    return NextResponse.json({
      success: true,
      transcription: {
        text: transcription.text,
        durationMs: transcription.durationMs,
      },
      analysis: {
        wpm: analysis.wpm,
        totalWords: analysis.totalWords,
        fillerWordCount: analysis.fillerWordCount,
        fillerWordRate: analysis.fillerWordRate,
        fillerWords: analysis.fillerWords,
        silenceStats: analysis.silenceStats,
        speakingTime: analysis.speakingTime,
        totalDuration: analysis.totalDuration,
        confidence: analysis.confidence,
      },
      feedback,
    });
  } catch (error) {
    console.error('Voice Analysis Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: '음성 분석 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const maxDuration = 30;
