// ============================================
// Edge Function: Auto-Score Interview
// ============================================
// Automatically evaluates interview when session ends
// Triggered by database webhook or direct invocation
//
// Usage:
// POST /functions/v1/auto-score
// Body: { session_id: string }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// Competency evaluation schema for structured output
const EVALUATION_SCHEMA = {
  type: 'object',
  properties: {
    overall_score: {
      type: 'number',
      description: 'Overall interview score (0-100)',
    },
    pass_status: {
      type: 'string',
      enum: ['pass', 'borderline', 'fail'],
      description: 'Pass status based on score threshold',
    },
    interviewer_scores: {
      type: 'object',
      properties: {
        hiring_manager: { type: 'number' },
        hr_manager: { type: 'number' },
        senior_peer: { type: 'number' },
      },
      required: ['hiring_manager', 'hr_manager', 'senior_peer'],
    },
    competency_scores: {
      type: 'object',
      properties: {
        behavioral: { type: 'number', description: 'Behavioral competency (0-100)' },
        clarity: { type: 'number', description: 'Response clarity (0-100)' },
        comprehension: { type: 'number', description: 'Question comprehension (0-100)' },
        communication: { type: 'number', description: 'Communication skills (0-100)' },
        reasoning: { type: 'number', description: 'Logical reasoning (0-100)' },
        problem_solving: { type: 'number', description: 'Problem solving ability (0-100)' },
        leadership: { type: 'number', description: 'Leadership potential (0-100)' },
        adaptability: { type: 'number', description: 'Adaptability (0-100)' },
      },
      required: [
        'behavioral',
        'clarity',
        'comprehension',
        'communication',
        'reasoning',
        'problem_solving',
        'leadership',
        'adaptability',
      ],
    },
    feedback_summary: {
      type: 'string',
      description: 'Overall feedback summary in Korean (2-3 sentences)',
    },
    strengths: {
      type: 'array',
      items: { type: 'string' },
      description: 'Top 3 strengths in Korean',
    },
    improvements: {
      type: 'array',
      items: { type: 'string' },
      description: 'Top 3 areas for improvement in Korean',
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

interface Message {
  role: string;
  content: string;
  interviewer_id?: string;
}

interface Session {
  id: string;
  user_id: string;
  job_type: string;
  industry?: string;
  difficulty: string;
  turn_count: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json();

    if (!session_id) {
      return new Response(
        JSON.stringify({ error: 'session_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch session
    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Session not found', details: sessionError }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const typedSession = session as Session;

    // Check if already scored
    const { data: existingResult } = await supabase
      .from('interview_results')
      .select('id')
      .eq('session_id', session_id)
      .single();

    if (existingResult) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Already scored',
          result_id: existingResult.id,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', session_id)
      .order('created_at', { ascending: true });

    if (messagesError || !messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No messages found for session' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Build transcript
    const transcript = (messages as Message[])
      .map((msg) => {
        const speaker =
          msg.role === 'user'
            ? '지원자'
            : msg.interviewer_id
              ? `면접관(${msg.interviewer_id})`
              : '면접관';
        return `${speaker}: ${msg.content}`;
      })
      .join('\n');

    // Build evaluation prompt
    const evaluationPrompt = `다음은 AI 면접 기록입니다. 지원자의 면접 성과를 8가지 역량 축으로 분석하고 평가해주세요.

직무: ${typedSession.job_type}
산업: ${typedSession.industry || '일반'}
난이도: ${typedSession.difficulty}
총 질문 수: ${typedSession.turn_count}

면접 기록:
${transcript}

평가 기준 (각 0-100점):
1. behavioral (행동 역량): 과거 행동 기반 답변의 질, STAR 기법 활용도
2. clarity (명확성): 답변의 명확하고 구조적인 전달
3. comprehension (이해력): 질문 의도 파악 및 적절한 응답
4. communication (커뮤니케이션): 효과적인 의사소통 능력
5. reasoning (논리적 사고): 논리적 흐름과 근거 제시
6. problem_solving (문제 해결): 문제 해결 접근법과 창의성
7. leadership (리더십): 리더십 잠재력 및 팀워크 능력
8. adaptability (적응력): 변화 대응 능력과 유연성

합격 기준:
- pass: 전체 점수 75점 이상
- borderline: 60-74점
- fail: 60점 미만

면접관별 점수는 각 면접관의 관점에서 지원자를 평가한 점수입니다.
피드백과 강점/개선점은 구체적이고 실행 가능한 조언을 포함해주세요.`;

    // Call OpenAI API
    const openaiResponse = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content:
                '당신은 면접 평가 전문가입니다. 객관적이고 구체적인 평가를 제공합니다. 한국어로 응답하세요.',
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
          temperature: 0.3,
        }),
      }
    );

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const openaiData = await openaiResponse.json();
    const evaluationText = openaiData.choices[0]?.message?.content || '{}';

    let evaluation;
    try {
      evaluation = JSON.parse(evaluationText);
    } catch {
      console.error('Failed to parse evaluation:', evaluationText);
      // Provide fallback evaluation
      evaluation = {
        overall_score: 60,
        pass_status: 'borderline',
        interviewer_scores: {
          hiring_manager: 60,
          hr_manager: 60,
          senior_peer: 60,
        },
        competency_scores: {
          behavioral: 60,
          clarity: 60,
          comprehension: 60,
          communication: 60,
          reasoning: 60,
          problem_solving: 60,
          leadership: 60,
          adaptability: 60,
        },
        feedback_summary: '면접 평가 처리 중 오류가 발생했습니다.',
        strengths: ['평가 불가'],
        improvements: ['다시 시도해주세요'],
      };
    }

    // Update session status to completed
    await supabase
      .from('interview_sessions')
      .update({ status: 'completed' })
      .eq('id', session_id);

    // Save interview result
    const { data: result, error: resultError } = await supabase
      .from('interview_results')
      .insert({
        session_id,
        user_id: typedSession.user_id,
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
      console.error('Failed to save result:', resultError);
      return new Response(
        JSON.stringify({ error: 'Failed to save result', details: resultError }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        result: {
          id: result.id,
          session_id,
          overall_score: evaluation.overall_score,
          pass_status: evaluation.pass_status,
          competency_scores: evaluation.competency_scores,
          feedback_summary: evaluation.feedback_summary,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Auto-score error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
