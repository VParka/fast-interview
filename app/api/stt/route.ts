// ============================================
// STT API - Speech-to-Text with Failover
// ============================================
// POST /api/stt
// - Primary: Deepgram Nova-2
// - Fallback: OpenAI Whisper

import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudio } from '@/lib/stt/service';

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const language = (formData.get('language') as string) || 'ko';

    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: '오디오 파일이 없습니다.' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Transcribe with failover
    const result = await transcribeAudio(buffer, language);

    return NextResponse.json({
      success: true,
      text: result.text,
      confidence: result.confidence,
      provider: result.provider,
      words: result.words,
      latencyMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('STT API Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: '음성 변환 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
