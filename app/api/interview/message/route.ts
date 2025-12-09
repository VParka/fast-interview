// ============================================
// Interview Message API
// ============================================
// POST /api/interview/message
// - Receives user answer
// - Generates interviewer response with LLM
// - Enhanced interviewer transition logic

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import * as Sentry from '@sentry/nextjs';
import { generateInterviewerResponse, type ChatMessage, type UserKeyword } from '@/lib/llm/router';
import { ragService } from '@/lib/rag/service';
import { INTERVIEWER_BASE, type InterviewerType, type MBTIType } from '@/types/interview';

// Enhanced interviewer selection with follow-up probability
// If same interviewer selected, high chance of follow-up question
// If different interviewer, transform question or ask new one
function selectNextInterviewer(
  currentId: InterviewerType,
  turnCount: number
): { nextId: InterviewerType; isFollowUp: boolean } {
  // Base weights for each interviewer
  const baseWeights = {
    hiring_manager: 0.4,
    hr_manager: 0.2,
    senior_peer: 0.4,
  };

  // Follow-up probability: same interviewer continues (higher early in interview)
  const followUpProbability = Math.max(0.3, 0.6 - (turnCount * 0.05)); // Starts at 55%, decreases

  // Decide if same interviewer should continue for follow-up
  if (Math.random() < followUpProbability) {
    return { nextId: currentId, isFollowUp: true };
  }

  // Select different interviewer
  const others = (Object.keys(baseWeights) as InterviewerType[]).filter(id => id !== currentId);
  const totalWeight = others.reduce((sum, id) => sum + baseWeights[id], 0);

  const random = Math.random() * totalWeight;
  let cumulative = 0;

  for (const id of others) {
    cumulative += baseWeights[id];
    if (random <= cumulative) {
      return { nextId: id, isFollowUp: false };
    }
  }

  return { nextId: others[0], isFollowUp: false };
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  console.log('=== Interview Message API: Started ===');

  try {
    const body = await req.json();
    const { session_id, content, audio_url } = body;
    console.log('Request body:', { session_id, content: content?.substring(0, 50), audio_url });

    if (!session_id || !content) {
      console.error('Missing required fields:', { session_id, hasContent: !!content });
      return NextResponse.json(
        { success: false, error: '세션 ID와 메시지가 필요합니다.' },
        { status: 400 }
      );
    }

    // Create Supabase client with cookies for auth
    console.log('Creating Supabase client...');
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
    console.log('Fetching session:', session_id);
    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      console.error('Session fetch error:', sessionError);
      return NextResponse.json(
        { success: false, error: '세션을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    console.log('Session found:', { 
      id: session.id, 
      status: (session as { status: string }).status,
      turn_count: session.turn_count 
    });

    if ((session as { status: string }).status !== 'active') {
      console.error('Session not active:', (session as { status: string }).status);
      return NextResponse.json(
        { success: false, error: '면접이 진행 중이 아닙니다.' },
        { status: 400 }
      );
    }

    // Save user message
    console.log('Saving user message...');
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
      throw new Error(`Failed to save user message: ${userMsgError.message}`);
    }
    console.log('User message saved:', userMessage?.id);

    // Get conversation history (excluding current message to avoid race condition)
    console.log('Fetching conversation history...');
    const { data: historyData, error: historyError } = await supabase
      .from('messages')
      .select('role, content, interviewer_id')
      .eq('session_id', session_id)
      .neq('id', userMessage?.id || '') // Exclude the just-saved message
      .order('created_at', { ascending: true });

    if (historyError) {
      console.error('History fetch error:', historyError);
      throw new Error(`Failed to fetch history: ${historyError.message}`);
    }

    // Build conversation history
    const conversationHistory: ChatMessage[] = (historyData || []).map((msg: { role: string; content: string }) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    })) as ChatMessage[];

    // Add current user message explicitly
    conversationHistory.push({ role: 'user', content });

    // Select next interviewer with enhanced follow-up logic
    const currentInterviewerId = session.current_interviewer_id as InterviewerType || 'hiring_manager';
    const { nextId: nextInterviewerId, isFollowUp } = selectNextInterviewer(
      currentInterviewerId,
      session.turn_count
    );
    const interviewerBase = INTERVIEWER_BASE[nextInterviewerId];

    // Get interviewer MBTI and name from session metadata
    interface SessionMetadata {
      interviewer_mbti?: Record<InterviewerType, MBTIType>;
      interviewer_names?: Record<InterviewerType, string>;
    }
    const sessionMetadata = (session.timer_config as unknown as SessionMetadata) || {};
    const interviewerMbti = sessionMetadata.interviewer_mbti?.[nextInterviewerId] as MBTIType | undefined;
    const interviewerName = sessionMetadata.interviewer_names?.[nextInterviewerId] || interviewerBase.name;

    // Get relevant context from RAG (both resume and portfolio)
    const contextParts: string[] = [];

    if (session.resume_doc_id) {
      console.log('Fetching RAG context for resume:', session.resume_doc_id);
      try {
        const resumeContext = await ragService.getContextForInterview(
          session.user_id,
          content,
          session.resume_doc_id
        );
        if (resumeContext) {
          contextParts.push(`[이력서/자소서]\n${resumeContext}`);
        }
      } catch (e) {
        console.warn('Failed to get resume RAG context:', e);
      }
    }

    if (session.portfolio_doc_id) {
      try {
        const portfolioContext = await ragService.getContextForInterview(
          session.user_id,
          content,
          session.portfolio_doc_id
        );
        if (portfolioContext) {
          contextParts.push(`[포트폴리오]\n${portfolioContext}`);
        }
      } catch (e) {
        console.warn('Failed to get portfolio RAG context:', e);
      }
    }

    const context = contextParts.join('\n\n');

    // Get user's previous interview keywords for continuity
    let userKeywords: UserKeyword[] = [];
    try {
      const { data: keywordsData } = await supabase
        .from('user_keywords')
        .select('keyword, category, context, mentioned_count')
        .eq('user_id', session.user_id)
        .order('mentioned_count', { ascending: false })
        .limit(20);

      if (keywordsData && keywordsData.length > 0) {
        userKeywords = keywordsData.map(kw => ({
          keyword: kw.keyword,
          category: kw.category as UserKeyword['category'],
          context: kw.context || undefined,
          mentioned_count: kw.mentioned_count,
        }));
      }
    } catch (e) {
      console.warn('Failed to load user keywords:', e);
    }

    // Generate interviewer response with RAG context, keywords, and follow-up logic
    const llmResponse = await generateInterviewerResponse(
      conversationHistory,
      nextInterviewerId,
      session.job_type,
      true, // Use structured output
      context || undefined, // Pass RAG context from resume and portfolio
      {
        userKeywords: userKeywords.length > 0 ? userKeywords : undefined,
        industry: session.industry || undefined,
        difficulty: session.difficulty as 'easy' | 'medium' | 'hard',
        turnCount: session.turn_count + 1,
        previousInterviewerId: isFollowUp ? undefined : currentInterviewerId, // Pass previous for transition
        interviewerMbti,
      }
    );
    console.log('LLM response generated:', {
      contentLength: llmResponse.content.length,
      hasStructured: !!llmResponse.structuredResponse,
      latency: llmResponse.latencyMs
    });

    // Save interviewer message
    console.log('Saving interviewer message...');
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
      throw new Error(`Failed to save interviewer message: ${intMsgError.message}`);
    }
    console.log('Interviewer message saved:', interviewerMessage?.id);

    // Update session
    const newTurnCount = session.turn_count + 1;
    const shouldEnd = newTurnCount >= session.max_turns;
    console.log('Updating session:', { newTurnCount, shouldEnd });

    const { error: updateError } = await supabase
      .from('interview_sessions')
      .update({
        turn_count: newTurnCount,
        current_interviewer_id: nextInterviewerId,
        status: shouldEnd ? 'completed' : 'active',
      })
      .eq('id', session_id);

    if (updateError) {
      console.error('Session update error:', updateError);
      throw new Error(`Failed to update session: ${updateError.message}`);
    }

    console.log('=== Interview Message API: Success ===');
    console.log('Total latency:', Date.now() - startTime, 'ms');

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
        name: interviewerName, // Use session-assigned name
        role: interviewerBase.role,
        emoji: interviewerBase.emoji,
      },
      session_status: shouldEnd ? 'completed' : 'active',
      turn_count: newTurnCount,
      should_end: shouldEnd,
      total_latency_ms: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Error in interview message API:', error);
    
    // Capture error in Sentry
    Sentry.captureException(error, {
      tags: {
        api: 'interview-message',
      },
    });
    
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '메시지 처리 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
