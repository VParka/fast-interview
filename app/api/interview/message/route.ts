// ============================================
// Interview Message API
// ============================================
// POST /api/interview/message
// - Receives user answer
// - Generates interviewer response with LLM

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { generateInterviewerResponse, type ChatMessage } from '@/lib/llm/router';
import { ragService } from '@/lib/rag/service';
import { INTERVIEWERS, type InterviewerType } from '@/types/interview';

// Weighted interviewer selection
function selectNextInterviewer(currentId: InterviewerType): InterviewerType {
  const weights = {
    hiring_manager: 0.4,
    hr_manager: 0.2,
    senior_peer: 0.4,
  };

  const others = (Object.keys(weights) as InterviewerType[]).filter(id => id !== currentId);
  const totalWeight = others.reduce((sum, id) => sum + weights[id], 0);

  const random = Math.random() * totalWeight;
  let cumulative = 0;

  for (const id of others) {
    cumulative += weights[id];
    if (random <= cumulative) return id;
  }

  return others[0];
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const { session_id, content, audio_url } = body;

    if (!session_id || !content) {
      return NextResponse.json(
        { success: false, error: '세션 ID와 메시지가 필요합니다.' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: '세션을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (session.status !== 'active') {
      return NextResponse.json(
        { success: false, error: '면접이 진행 중이 아닙니다.' },
        { status: 400 }
      );
    }

    // Save user message
    const { data: userMessage, error: userMsgError } = await supabase
      .from('messages')
      .insert({
        session_id,
        role: 'user',
        content,
        audio_url,
      })
      .select()
      .single();

    if (userMsgError) {
      console.error('User message save error:', userMsgError);
    }

    // Get conversation history
    const { data: historyData } = await supabase
      .from('messages')
      .select('role, content, interviewer_id')
      .eq('session_id', session_id)
      .order('created_at', { ascending: true });

    const conversationHistory: ChatMessage[] = (historyData || []).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));

    // Add current message
    conversationHistory.push({ role: 'user', content });

    // Select next interviewer
    const currentInterviewerId = session.current_interviewer_id as InterviewerType || 'hiring_manager';
    const nextInterviewerId = selectNextInterviewer(currentInterviewerId);
    const interviewer = INTERVIEWERS[nextInterviewerId];

    // Get relevant context from RAG
    let context = '';
    if (session.resume_doc_id) {
      try {
        context = await ragService.getContextForInterview(
          session.user_id,
          content,
          session.resume_doc_id
        );
      } catch (e) {
        console.warn('Failed to get RAG context:', e);
      }
    }

    // Generate interviewer response
    const llmResponse = await generateInterviewerResponse(
      conversationHistory,
      nextInterviewerId,
      session.job_type,
      true // Use structured output
    );

    // Save interviewer message
    const { data: interviewerMessage, error: intMsgError } = await supabase
      .from('messages')
      .insert({
        session_id,
        role: 'interviewer',
        interviewer_id: nextInterviewerId,
        content: llmResponse.content,
        structured_response: llmResponse.structuredResponse,
        latency_ms: llmResponse.latencyMs,
      })
      .select()
      .single();

    if (intMsgError) {
      console.error('Interviewer message save error:', intMsgError);
    }

    // Update session
    const newTurnCount = session.turn_count + 1;
    const shouldEnd = newTurnCount >= session.max_turns;

    await supabase
      .from('interview_sessions')
      .update({
        turn_count: newTurnCount,
        current_interviewer_id: nextInterviewerId,
        status: shouldEnd ? 'completed' : 'active',
      })
      .eq('id', session_id);

    return NextResponse.json({
      success: true,
      user_message: {
        id: userMessage?.id || Date.now().toString(),
        session_id,
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      },
      interviewer_response: {
        id: interviewerMessage?.id || (Date.now() + 1).toString(),
        session_id,
        role: 'interviewer',
        interviewer_id: nextInterviewerId,
        content: llmResponse.content,
        structured_response: llmResponse.structuredResponse,
        timestamp: new Date().toISOString(),
        latency_ms: llmResponse.latencyMs,
      },
      interviewer: {
        id: nextInterviewerId,
        name: interviewer.name,
        role: interviewer.role,
        emoji: interviewer.emoji,
      },
      session_status: shouldEnd ? 'completed' : 'active',
      turn_count: newTurnCount,
      should_end: shouldEnd,
      total_latency_ms: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Interview Message Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: '메시지 처리 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
