// ============================================
// Interview End API
// ============================================
// POST /api/interview/end
// - Ends interview session
// - Generates 8-axis competency analysis with rubric-based scoring
// - Returns interview result

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { INTERVIEWERS, type InterviewerType } from '@/types/interview';
import { extractInterviewKeywords, type ChatMessage } from '@/lib/llm/router';
import { generateRubricDocument, PASS_CRITERIA } from '@/lib/llm/prompts/scoring-rubric';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Detailed evaluation schema with rubric-based scoring
const EVALUATION_SCHEMA = {
  type: 'object' as const,
  properties: {
    // 5축 핵심 평가 (1-5점 척도)
    category_scores: {
      type: 'object',
      properties: {
        logical_structure: {
          type: 'object',
          properties: {
            score: { type: 'integer', description: '1-5점 척도' },
            reasoning: { type: 'string', description: '점수 근거 (답변 인용 포함)' },
          },
          required: ['score', 'reasoning'],
          additionalProperties: false,
        },
        job_expertise: {
          type: 'object',
          properties: {
            score: { type: 'integer', description: '1-5점 척도' },
            reasoning: { type: 'string', description: '점수 근거 (답변 인용 포함)' },
          },
          required: ['score', 'reasoning'],
          additionalProperties: false,
        },
        attitude_communication: {
          type: 'object',
          properties: {
            score: { type: 'integer', description: '1-5점 척도' },
            reasoning: { type: 'string', description: '점수 근거 (답변 인용 포함)' },
          },
          required: ['score', 'reasoning'],
          additionalProperties: false,
        },
        company_fit: {
          type: 'object',
          properties: {
            score: { type: 'integer', description: '1-5점 척도' },
            reasoning: { type: 'string', description: '점수 근거 (답변 인용 포함)' },
          },
          required: ['score', 'reasoning'],
          additionalProperties: false,
        },
        growth_potential: {
          type: 'object',
          properties: {
            score: { type: 'integer', description: '1-5점 척도' },
            reasoning: { type: 'string', description: '점수 근거 (답변 인용 포함)' },
          },
          required: ['score', 'reasoning'],
          additionalProperties: false,
        },
      },
      required: ['logical_structure', 'job_expertise', 'attitude_communication', 'company_fit', 'growth_potential'],
      additionalProperties: false,
    },
    // 면접관별 인상 점수
    interviewer_impressions: {
      type: 'object',
      properties: {
        hiring_manager: {
          type: 'object',
          properties: {
            score: { type: 'number', description: '0-100점' },
            comment: { type: 'string', description: '한 줄 평가' },
          },
          required: ['score', 'comment'],
          additionalProperties: false,
        },
        hr_manager: {
          type: 'object',
          properties: {
            score: { type: 'number', description: '0-100점' },
            comment: { type: 'string', description: '한 줄 평가' },
          },
          required: ['score', 'comment'],
          additionalProperties: false,
        },
        senior_peer: {
          type: 'object',
          properties: {
            score: { type: 'number', description: '0-100점' },
            comment: { type: 'string', description: '한 줄 평가' },
          },
          required: ['score', 'comment'],
          additionalProperties: false,
        },
      },
      required: ['hiring_manager', 'hr_manager', 'senior_peer'],
      additionalProperties: false,
    },
    // 8축 역량 점수 (0-100)
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
      required: ['behavioral', 'clarity', 'comprehension', 'communication', 'reasoning', 'problem_solving', 'leadership', 'adaptability'],
      additionalProperties: false,
    },
    feedback_summary: { type: 'string', description: '전체 피드백 요약 (2-3문장)' },
    strengths: {
      type: 'array',
      items: { type: 'string' },
      description: '강점 3가지 (구체적 근거 포함)',
    },
    improvements: {
      type: 'array',
      items: { type: 'string' },
      description: '개선점 3가지 (구체적 조언 포함)',
    },
  },
  required: [
    'category_scores',
    'interviewer_impressions',
    'competency_scores',
    'feedback_summary',
    'strengths',
    'improvements',
  ],
  additionalProperties: false,
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

    // Create Supabase client with cookies for auth
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

    // Type for session
    interface SessionRow {
      id: string;
      user_id: string;
      job_type: string;
      difficulty: string;
      turn_count: number;
      status: string;
      created_at: string;
    }

    // Get session
    const { data: sessionData, error: sessionError } = await supabase
      .from('interview_sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (sessionError || !sessionData) {
      return NextResponse.json(
        { success: false, error: '세션을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const session = sessionData as SessionRow;

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

    // Type for message
    interface MessageRow {
      role: string;
      content: string;
      interviewer_id?: string;
    }

    // Build conversation transcript for evaluation
    const transcript = (messages as MessageRow[])
      .map(msg => {
        const speaker = msg.role === 'user' ? '지원자' :
          INTERVIEWERS[msg.interviewer_id as InterviewerType]?.name || '면접관';
        return `${speaker}: ${msg.content}`;
      })
      .join('\n');

    // Generate rubric document for evaluation
    const rubricDoc = generateRubricDocument();

    // Generate evaluation using GPT-4o with rubric-based structured output
    const evaluationPrompt = `다음은 AI 면접 기록입니다. 아래 루브릭에 따라 지원자의 면접 성과를 **엄격하게** 평가해주세요.

## 면접 정보
- 직무: ${session.job_type}
- 난이도: ${session.difficulty}

## 평가 루브릭
${rubricDoc}

## 면접 기록
${transcript}

## 평가 지침

### 1. 5축 핵심 평가 (1-5점)
각 항목을 루브릭 기준에 따라 엄격하게 채점하세요:
- **5점**: 완벽한 수준, 기대를 크게 초과
- **4점**: 좋음, 기대 충족
- **3점**: 보통, 무난한 수준 (기본)
- **2점**: 부족, 개선 필요
- **1점**: 매우 부족, 기준 미달

### 2. 면접관별 인상 점수 (0-100점)
각 면접관의 관점에서 평가:
- **실무팀장(hiring_manager)**: 직무 전문성(45%), 문제해결력 중시
- **HR담당자(hr_manager)**: 태도/커뮤니케이션(35%), 조직적합성(25%) 중시
- **시니어동료(senior_peer)**: 직무전문성(35%), 성장가능성(25%) 중시

### 3. 8축 역량 점수 (0-100점)
5축 점수를 기반으로 8축 역량으로 변환하여 평가

### 4. 총점 계산 공식
총점 = (논리적구조×0.20 + 직무전문성×0.30 + 태도×0.20 + 적합도×0.15 + 성장성×0.15) × 20

- 70점 이상: 합격 (pass)
- 50-69점: 보류 (borderline)
- 50점 미만: 불합격 (fail)

### 중요
- 모든 점수의 근거를 면접 내용에서 직접 인용하세요
- 강점과 개선점은 구체적인 예시와 함께 제시하세요
- 관대한 점수 금지: 평균적인 면접은 3점(60점)입니다`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `당신은 면접 평가 전문가입니다.
루브릭에 따라 객관적이고 엄격하게 평가합니다.
- 증거 기반 평가: 모든 점수의 근거를 답변 내용에서 직접 인용
- 관대한 점수 금지: 5점은 완벽한 답변에만, 의심스러우면 낮은 점수
- 일관성 유지: 동일한 수준의 답변에는 동일한 점수`
        },
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
      temperature: 0, // 일관된 채점을 위해 0으로 설정
    });

    const evaluationText = completion.choices[0]?.message?.content || '{}';
    let evaluation;

    try {
      evaluation = JSON.parse(evaluationText);
    } catch {
      console.error('Failed to parse evaluation:', evaluationText);
      // Provide default evaluation
      evaluation = {
        category_scores: {
          logical_structure: { score: 3, reasoning: '평가 오류' },
          job_expertise: { score: 3, reasoning: '평가 오류' },
          attitude_communication: { score: 3, reasoning: '평가 오류' },
          company_fit: { score: 3, reasoning: '평가 오류' },
          growth_potential: { score: 3, reasoning: '평가 오류' },
        },
        interviewer_impressions: {
          hiring_manager: { score: 60, comment: '평가 중 오류 발생' },
          hr_manager: { score: 60, comment: '평가 중 오류 발생' },
          senior_peer: { score: 60, comment: '평가 중 오류 발생' },
        },
        competency_scores: {
          behavioral: 60, clarity: 60, comprehension: 60, communication: 60,
          reasoning: 60, problem_solving: 60, leadership: 60, adaptability: 60,
        },
        feedback_summary: '면접 평가 중 오류가 발생했습니다.',
        strengths: ['평가 불가'],
        improvements: ['다시 시도해주세요'],
      };
    }

    // Calculate overall score from category scores using rubric weights
    const categoryScores = evaluation.category_scores;
    const overallScore = Math.round(
      (((categoryScores.logical_structure.score - 1) / 4) * 100 * 0.20) +
      (((categoryScores.job_expertise.score - 1) / 4) * 100 * 0.30) +
      (((categoryScores.attitude_communication.score - 1) / 4) * 100 * 0.20) +
      (((categoryScores.company_fit.score - 1) / 4) * 100 * 0.15) +
      (((categoryScores.growth_potential.score - 1) / 4) * 100 * 0.15)
    );

    // Determine pass status based on calculated score
    const passStatus = overallScore >= PASS_CRITERIA.pass ? 'pass' :
                       overallScore >= PASS_CRITERIA.borderline ? 'borderline' : 'fail';

    // Extract interviewer scores
    const interviewerScores = {
      hiring_manager: Math.round(evaluation.interviewer_impressions.hiring_manager.score),
      hr_manager: Math.round(evaluation.interviewer_impressions.hr_manager.score),
      senior_peer: Math.round(evaluation.interviewer_impressions.senior_peer.score),
    };

    // Update session status
    await supabase
      .from('interview_sessions')
      .update({ status: 'completed' })
      .eq('id', session_id);

    // Save interview result with detailed evaluation data
    const { data: result, error: resultError } = await supabase
      .from('interview_results')
      .insert({
        session_id,
        user_id: session.user_id,
        overall_score: overallScore,
        pass_status: passStatus,
        interviewer_scores: interviewerScores,
        competency_scores: evaluation.competency_scores,
        feedback_summary: evaluation.feedback_summary,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        // Store detailed category scores with reasoning for future reference
        category_scores: evaluation.category_scores,
        interviewer_comments: {
          hiring_manager: evaluation.interviewer_impressions.hiring_manager.comment,
          hr_manager: evaluation.interviewer_impressions.hr_manager.comment,
          senior_peer: evaluation.interviewer_impressions.senior_peer.comment,
        },
      })
      .select()
      .single();

    if (resultError) {
      console.error('Result save error:', resultError);
    }

    // Extract keywords for future interviews
    try {
      console.log('Extracting interview keywords...');

      // Build chat messages for keyword extraction
      const chatMessages: ChatMessage[] = (messages as MessageRow[]).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      }));

      const keywordResult = await extractInterviewKeywords(chatMessages, session.job_type);

      console.log('Extracted keywords:', keywordResult.keywords.length);

      // Save keywords to database
      for (const kw of keywordResult.keywords) {
        try {
          await supabase.rpc('upsert_user_keyword', {
            p_user_id: session.user_id,
            p_session_id: session_id,
            p_keyword: kw.keyword,
            p_category: kw.category,
            p_context: kw.context || null,
            p_mentioned_count: kw.mentioned_count,
          });
        } catch (kwError) {
          // Fallback: direct insert if function doesn't exist
          console.warn('RPC failed, using direct insert:', kwError);
          await supabase.from('user_keywords').upsert(
            {
              user_id: session.user_id,
              session_id,
              keyword: kw.keyword,
              category: kw.category,
              context: kw.context || null,
              mentioned_count: kw.mentioned_count,
            },
            { onConflict: 'user_id,keyword,category' }
          );
        }
      }

      // Save interview summary
      if (keywordResult.summary) {
        await supabase.from('user_interview_summaries').insert({
          user_id: session.user_id,
          session_id,
          summary: keywordResult.summary,
          job_type: session.job_type,
          industry: (sessionData as { industry?: string }).industry || null,
        });
      }

      console.log('Keywords saved successfully');
    } catch (keywordError) {
      // Don't fail the whole request if keyword extraction fails
      console.error('Keyword extraction failed:', keywordError);
    }

    return NextResponse.json({
      success: true,
      result: {
        id: result?.id || session_id,
        session_id,
        overall_score: overallScore,
        pass_status: passStatus,
        interviewer_scores: interviewerScores,
        competency_scores: evaluation.competency_scores,
        category_scores: evaluation.category_scores,
        interviewer_comments: {
          hiring_manager: evaluation.interviewer_impressions.hiring_manager.comment,
          hr_manager: evaluation.interviewer_impressions.hr_manager.comment,
          senior_peer: evaluation.interviewer_impressions.senior_peer.comment,
        },
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
