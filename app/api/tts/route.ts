// ============================================
// TTS API - Text-to-Speech with Failover
// ============================================
// POST /api/tts
// - Primary: OpenAI TTS
// - Fallback: ElevenLabs

import { NextRequest, NextResponse } from 'next/server';
import { synthesizeSpeech } from '@/lib/tts/service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, interviewerId, voice, speed } = body;

    if (!text) {
      return NextResponse.json(
        { success: false, error: '텍스트가 없습니다.' },
        { status: 400 }
      );
    }

    // Synthesize speech with failover
    const result = await synthesizeSpeech(text, interviewerId, { voice, speed });

    // Return audio as response
    return new NextResponse(result.audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'X-Provider': result.provider,
        'X-Duration-Ms': result.durationMs.toString(),
      },
    });
  } catch (error) {
    console.error('TTS API Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: '음성 합성 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
