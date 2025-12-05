// ============================================
// Interview Start API
// ============================================
// POST /api/interview/start
// - Creates new interview session
// - Returns first interviewer message

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { generateInterviewerResponse } from '@/lib/llm/router';
import { ragService } from '@/lib/rag/service';
import { INTERVIEWERS, type InterviewerType } from '@/types/interview';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      job_type,
      industry,
      difficulty = 'medium',
      resume_doc_id,
      timer_config,
    } = body;

    // TODO: Get user from auth
    const userId = 'anonymous'; // Replace with actual auth

    const supabase = createServerClient();

    // Create interview session
    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .insert({
        user_id: userId,
        job_type,
        industry,
        difficulty,
        resume_doc_id,
        status: 'active',
        turn_count: 0,
        max_turns: 10,
        timer_config: timer_config || {
          default_time_limit: 120,
          warning_threshold: 30,
          auto_submit_on_timeout: true,
        },
        current_interviewer_id: 'hiring_manager',
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return NextResponse.json(
        { success: false, error: '세션 생성 실패' },
        { status: 500 }
      );
    }

    // Get resume context if available
    let resumeContext = '';
    if (resume_doc_id) {
      try {
        resumeContext = await ragService.getContextForInterview(
          userId,
          '자기소개와 경력 요약',
          resume_doc_id
        );
      } catch (e) {
        console.warn('Failed to get resume context:', e);
      }
    }

    // Generate first message from hiring manager
    const firstInterviewer: InterviewerType = 'hiring_manager';
    const interviewer = INTERVIEWERS[firstInterviewer];

    const systemPrompt = `${interviewer.system_prompt}

면접 시작 시 인사를 하고 첫 질문을 합니다.
${resumeContext ? `\n지원자 정보:\n${resumeContext}` : ''}

현재 상황: 면접이 막 시작되었습니다. 친절하게 인사하고 간단한 자기소개를 요청하세요.`;

    const response = await generateInterviewerResponse(
      [{ role: 'user', content: '[면접 시작] 지원자가 입장했습니다.' }],
      firstInterviewer,
      job_type,
      false
    );

    // Save first message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        session_id: session.id,
        role: 'interviewer',
        interviewer_id: firstInterviewer,
        content: response.content,
        latency_ms: response.latencyMs,
      })
      .select()
      .single();

    if (messageError) {
      console.error('Message save error:', messageError);
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        user_id: session.user_id,
        job_type: session.job_type,
        industry: session.industry,
        difficulty: session.difficulty,
        status: session.status,
        turn_count: session.turn_count,
        max_turns: session.max_turns,
        timer_config: session.timer_config,
        current_interviewer_id: firstInterviewer,
        created_at: session.created_at,
        updated_at: session.updated_at,
      },
      first_message: {
        id: message?.id || 'welcome',
        session_id: session.id,
        role: 'interviewer',
        interviewer_id: firstInterviewer,
        content: response.content,
        timestamp: new Date().toISOString(),
        latency_ms: response.latencyMs,
      },
      interviewer: {
        id: firstInterviewer,
        name: interviewer.name,
        role: interviewer.role,
        emoji: interviewer.emoji,
      },
    });
  } catch (error) {
    console.error('Interview Start Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: '면접 시작 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
