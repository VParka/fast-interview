// ============================================
// Interview End API
// ============================================
// POST /api/interview/end
// - Ends interview session
// - Generates 8-axis competency analysis
// - Returns interview result

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { llmRouter, type ChatMessage } from '@/lib/llm/router';
import { INTERVIEWERS, type CompetencyScores, type InterviewerType } from '@/types/interview';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Schema for evaluation
const EVALUATION_SCHEMA = {
  type: 'object' as const,
  properties: {
    overall_score: { type: 'number', description: '전체 점수 (0-100)' },
    pass_status: { type: 'string', enum: ['pass', 'borderline', 'fail'] },
    interviewer_scores: {
      type: 'object',
      properties: {
        hiring_manager: { type: 'number' },
        hr_manager: { type: 'number' },
        senior_peer: { type: 'number' },
      },
    },
    competency_scores: {
      type: 'object',
      properties: {
        behavioral: { type: 'number', description: '행동 역량 (0-100)' },
        clarity: { type: 'number', description: '명확성 (0-100)' },
        comprehension: { type: 'number', description: '이해력 (0-100)' },
        communication: { type: 'number', description: '커뮤니케이션 (0-100)' },
        reasoning: { type: 'number', description: '논리적 사고 (0-100)' },
        problem_solving: { type: 'number', description: '문제 해결 (0-100)' },
        leadership: { type: 'number', description: '리더십 (0-100)' },
        adaptability: { type: 'number', description: '적응력 (0-100)' },
      },
    },
    feedback_summary: { type: 'string', description: '전체 피드백 요약 (2-3문장)' },
    strengths: {
      type: 'array',
      items: { type: 'string' },
      description: '강점 3가지',
    },
    improvements: {
      type: 'array',
      items: { type: 'string' },
      description: '개선점 3가지',
    },
  },
  required: [
    'overall_score',
    'pass_status',
    'interviewer_scores',
    'competency_scores',
    'feedback_summary',
    'strengths',
    'improvements',
  ],
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id } = body;

    if (!session_id) {
      return NextResponse.json(
        { success: false, error: '세션 ID가 필요합니다.' },
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

    // Get all messages
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', session_id)
      .order('created_at', { ascending: true });

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: '면접 기록이 없습니다.' },
        { status: 400 }
      );
    }

    // Build conversation transcript for evaluation
    const transcript = messages
      .map(msg => {
        const speaker = msg.role === 'user' ? '지원자' :
          INTERVIEWERS[msg.interviewer_id as InterviewerType]?.name || '면접관';
        return `${speaker}: ${msg.content}`;
      })
      .join('\n');

    // Generate evaluation using GPT-4o with structured output
    const evaluationPrompt = `다음은 AI 면접 기록입니다. 지원자의 면접 성과를 8가지 역량 축으로 분석하고 평가해주세요.

직무: ${session.job_type}
난이도: ${session.difficulty}

면접 기록:
${transcript}

평가 기준:
1. behavioral (행동 역량): 과거 행동 기반 답변의 질
2. clarity (명확성): 답변의 명확하고 구조적인 전달
3. comprehension (이해력): 질문 이해와 적절한 응답
4. communication (커뮤니케이션): 의사소통 능력
5. reasoning (논리적 사고): 논리적 흐름과 근거
6. problem_solving (문제 해결): 문제 해결 접근법
7. leadership (리더십): 리더십 및 팀워크
8. adaptability (적응력): 변화 대응 능력

각 역량을 0-100점으로 평가하고, 전체 점수와 합격 여부를 판단해주세요.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: '당신은 면접 평가 전문가입니다. 객관적이고 구체적인 평가를 제공합니다.' },
        { role: 'user', content: evaluationPrompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'interview_evaluation',
          strict: true,
          schema: EVALUATION_SCHEMA,
        },
      },
      temperature: 0.3,
    });

    const evaluationText = completion.choices[0]?.message?.content || '{}';
    let evaluation;

    try {
      evaluation = JSON.parse(evaluationText);
    } catch {
      console.error('Failed to parse evaluation:', evaluationText);
      // Provide default evaluation
      evaluation = {
        overall_score: 60,
        pass_status: 'borderline',
        interviewer_scores: { hiring_manager: 60, hr_manager: 60, senior_peer: 60 },
        competency_scores: {
          behavioral: 60, clarity: 60, comprehension: 60, communication: 60,
          reasoning: 60, problem_solving: 60, leadership: 60, adaptability: 60,
        },
        feedback_summary: '면접 평가 중 오류가 발생했습니다.',
        strengths: ['평가 불가'],
        improvements: ['다시 시도해주세요'],
      };
    }

    // Update session status
    await supabase
      .from('interview_sessions')
      .update({ status: 'completed' })
      .eq('id', session_id);

    // Save interview result
    const { data: result, error: resultError } = await supabase
      .from('interview_results')
      .insert({
        session_id,
        user_id: session.user_id,
        overall_score: evaluation.overall_score,
        pass_status: evaluation.pass_status,
        interviewer_scores: evaluation.interviewer_scores,
        competency_scores: evaluation.competency_scores,
        feedback_summary: evaluation.feedback_summary,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
      })
      .select()
      .single();

    if (resultError) {
      console.error('Result save error:', resultError);
    }

    return NextResponse.json({
      success: true,
      result: {
        id: result?.id || session_id,
        session_id,
        overall_score: evaluation.overall_score,
        pass_status: evaluation.pass_status,
        interviewer_scores: evaluation.interviewer_scores,
        competency_scores: evaluation.competency_scores,
        feedback_summary: evaluation.feedback_summary,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        turn_count: session.turn_count,
        duration_minutes: Math.round(
          (new Date().getTime() - new Date(session.created_at).getTime()) / 60000
        ),
        created_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Interview End Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: '면접 종료 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
