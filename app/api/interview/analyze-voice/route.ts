// ============================================
// Voice Analysis API
// ============================================
// POST /api/interview/analyze-voice
// - Analyzes voice patterns from transcription
// - Returns WPM, filler words, confidence scores

import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudio } from '@/lib/stt/service';
import { analyzeVoice, generateVoiceFeedback } from '@/lib/analysis/voice';

export async function POST(req: NextRequest) {
  try {
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
