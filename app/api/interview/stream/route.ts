// ============================================
// Streaming Interview API - SSE
// ============================================
// POST /api/interview/stream
// - Receives audio from user
// - Streams back: STT result → LLM response → TTS audio
// - Target: E2E latency < 2s

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createSSEStream } from '@/lib/streaming/pipeline';
import { INTERVIEWER_BASE, type InterviewerType } from '@/types/interview';
import type { ChatMessage } from '@/lib/llm/router';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;
    const sessionId = formData.get('session_id') as string;

    if (!audioFile || !sessionId) {
      return NextResponse.json(
        { success: false, error: 'audio와 session_id가 필요합니다.' },
        { status: 400 }
      );
    }

    // Create Supabase client
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

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: '세션을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if ((session as { status: string }).status !== 'active') {
      return NextResponse.json(
        { success: false, error: '면접이 진행 중이 아닙니다.' },
        { status: 400 }
      );
    }

    // Get conversation history
    const { data: historyData } = await supabase
      .from('messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(10); // Last 10 messages for context

    const conversationHistory: ChatMessage[] = (historyData || []).map((msg: { role: string; content: string }) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    })) as ChatMessage[];

    // Get interviewer info
    const currentInterviewerId = (session.current_interviewer_id as InterviewerType) || 'hiring_manager';
    const interviewerBase = INTERVIEWER_BASE[currentInterviewerId];

    // Convert audio file to buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    // Create SSE stream
    const stream = createSSEStream(
      audioBuffer,
      {
        interviewerId: currentInterviewerId,
        position: session.job_type,
        conversationHistory,
        // voice defaults to 'alloy' in pipeline
        llmConfig: {
          context: undefined, // TODO: Add RAG context if needed
          industry: session.industry || undefined,
          difficulty: session.difficulty as 'easy' | 'medium' | 'hard',
          turnCount: session.turn_count + 1,
        },
      },
      true // Use parallel processing
    );

    // Return SSE response
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Streaming Interview Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: '스트리밍 처리 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Route config
export const runtime = 'nodejs';
export const maxDuration = 60;
