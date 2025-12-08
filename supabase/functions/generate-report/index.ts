// ============================================
// Edge Function: Generate Interview Report
// ============================================
// Generates a comprehensive interview report with:
// - Score analysis and comparison
// - Detailed competency breakdown
// - Personalized improvement recommendations
// - Historical trend analysis
//
// Usage:
// POST /functions/v1/generate-report
// Body: { session_id: string, include_history?: boolean }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface CompetencyScore {
  behavioral: number;
  clarity: number;
  comprehension: number;
  communication: number;
  reasoning: number;
  problem_solving: number;
  leadership: number;
  adaptability: number;
}

interface InterviewResult {
  id: string;
  session_id: string;
  user_id: string;
  overall_score: number;
  pass_status: string;
  interviewer_scores: {
    hiring_manager: number;
    hr_manager: number;
    senior_peer: number;
  };
  competency_scores: CompetencyScore;
  rank_percentile: number;
  growth_index: number;
  feedback_summary: string;
  strengths: string[];
  improvements: string[];
  created_at: string;
}

interface Session {
  id: string;
  user_id: string;
  job_type: string;
  industry: string;
  difficulty: string;
  turn_count: number;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  role: string;
  content: string;
  interviewer_id?: string;
  created_at: string;
}

const COMPETENCY_LABELS: Record<keyof CompetencyScore, string> = {
  behavioral: '행동 역량',
  clarity: '명확성',
  comprehension: '이해력',
  communication: '커뮤니케이션',
  reasoning: '논리적 사고',
  problem_solving: '문제 해결',
  leadership: '리더십',
  adaptability: '적응력',
};

const COMPETENCY_DESCRIPTIONS: Record<keyof CompetencyScore, string> = {
  behavioral: '과거 경험을 기반으로 구체적인 행동 사례를 제시하는 능력',
  clarity: '생각을 명확하고 구조화된 방식으로 전달하는 능력',
  comprehension: '질문의 의도를 정확히 파악하고 적절히 응답하는 능력',
  communication: '효과적으로 의사소통하고 상호작용하는 능력',
  reasoning: '논리적으로 사고하고 근거를 제시하는 능력',
  problem_solving: '문제를 분석하고 해결책을 도출하는 능력',
  leadership: '팀을 이끌고 영향력을 발휘하는 능력',
  adaptability: '변화에 유연하게 대응하고 적응하는 능력',
};

function getScoreGrade(score: number): { grade: string; color: string } {
  if (score >= 90) return { grade: 'A+', color: '#10B981' };
  if (score >= 85) return { grade: 'A', color: '#10B981' };
  if (score >= 80) return { grade: 'B+', color: '#3B82F6' };
  if (score >= 75) return { grade: 'B', color: '#3B82F6' };
  if (score >= 70) return { grade: 'C+', color: '#F59E0B' };
  if (score >= 65) return { grade: 'C', color: '#F59E0B' };
  if (score >= 60) return { grade: 'D', color: '#EF4444' };
  return { grade: 'F', color: '#EF4444' };
}

function generateCompetencyAnalysis(scores: CompetencyScore): string {
  const entries = Object.entries(scores) as [keyof CompetencyScore, number][];
  const sorted = entries.sort((a, b) => b[1] - a[1]);

  const topCompetencies = sorted.slice(0, 3);
  const bottomCompetencies = sorted.slice(-3).reverse();

  let analysis = '## 역량 분석\n\n';

  analysis += '### 상위 역량\n';
  topCompetencies.forEach(([key, score], index) => {
    const { grade } = getScoreGrade(score);
    analysis += `${index + 1}. **${COMPETENCY_LABELS[key]}** (${score}점, ${grade})\n`;
    analysis += `   ${COMPETENCY_DESCRIPTIONS[key]}\n\n`;
  });

  analysis += '### 개선 필요 역량\n';
  bottomCompetencies.forEach(([key, score], index) => {
    const { grade } = getScoreGrade(score);
    analysis += `${index + 1}. **${COMPETENCY_LABELS[key]}** (${score}점, ${grade})\n`;
    analysis += `   ${COMPETENCY_DESCRIPTIONS[key]}\n\n`;
  });

  return analysis;
}

function generateRecommendations(
  competencies: CompetencyScore,
  passStatus: string
): string {
  let recommendations = '## 개선 추천사항\n\n';

  const weakAreas = Object.entries(competencies)
    .filter(([, score]) => score < 70)
    .sort((a, b) => a[1] - b[1]);

  if (weakAreas.length === 0) {
    recommendations +=
      '모든 역량이 양호합니다! 현재 수준을 유지하면서 지속적인 연습을 권장합니다.\n\n';
  } else {
    weakAreas.forEach(([key, score]) => {
      const competency = key as keyof CompetencyScore;
      recommendations += `### ${COMPETENCY_LABELS[competency]} 향상 방법\n`;

      switch (competency) {
        case 'behavioral':
          recommendations += `- STAR 기법(상황-과제-행동-결과)을 활용하여 경험을 구조화하세요\n`;
          recommendations += `- 구체적인 수치와 결과를 포함한 사례를 준비하세요\n`;
          recommendations += `- 최근 3년 이내의 관련 경험을 정리해두세요\n`;
          break;
        case 'clarity':
          recommendations += `- 답변 전 핵심 포인트를 먼저 정리하는 습관을 기르세요\n`;
          recommendations += `- "첫째, 둘째" 같은 구조적 표현을 활용하세요\n`;
          recommendations += `- 불필요한 말(음, 그러니까)을 줄이는 연습을 하세요\n`;
          break;
        case 'comprehension':
          recommendations += `- 질문을 끝까지 듣고 핵심 키워드를 파악하세요\n`;
          recommendations += `- 불확실할 때는 질문의 의도를 다시 확인하세요\n`;
          recommendations += `- 다양한 면접 질문 유형에 익숙해지세요\n`;
          break;
        case 'communication':
          recommendations += `- 상대방의 반응을 살피며 대화하세요\n`;
          recommendations += `- 적절한 비언어적 표현(눈 맞춤, 제스처)을 연습하세요\n`;
          recommendations += `- 간결하면서도 충분한 정보를 전달하는 연습을 하세요\n`;
          break;
        case 'reasoning':
          recommendations += `- 주장에 대한 근거를 항상 함께 제시하세요\n`;
          recommendations += `- "왜냐하면", "따라서" 같은 논리적 연결어를 사용하세요\n`;
          recommendations += `- 복잡한 문제를 단계별로 분석하는 연습을 하세요\n`;
          break;
        case 'problem_solving':
          recommendations += `- 문제 해결 과정을 체계적으로 설명하는 연습을 하세요\n`;
          recommendations += `- 여러 대안을 비교 분석한 경험을 준비하세요\n`;
          recommendations += `- 알고리즘/시스템 디자인 문제를 꾸준히 풀어보세요\n`;
          break;
        case 'leadership':
          recommendations += `- 팀을 이끌었던 경험(규모와 무관)을 정리하세요\n`;
          recommendations += `- 갈등 해결, 동기 부여 사례를 준비하세요\n`;
          recommendations += `- 주도적으로 프로젝트를 진행한 경험을 강조하세요\n`;
          break;
        case 'adaptability':
          recommendations += `- 변화에 대응했던 구체적인 경험을 준비하세요\n`;
          recommendations += `- 새로운 기술/환경을 빠르게 학습한 사례를 정리하세요\n`;
          recommendations += `- 예상치 못한 상황에서의 대처 경험을 준비하세요\n`;
          break;
      }
      recommendations += `\n`;
    });
  }

  // Pass status specific advice
  if (passStatus === 'fail') {
    recommendations += '### 전반적인 조언\n';
    recommendations +=
      '기본기를 다지는 것이 중요합니다. 자주 나오는 면접 질문에 대한 답변을 준비하고, ';
    recommendations +=
      '모의 면접을 통해 실전 감각을 키우세요. 충분한 연습 후 다시 도전하시기 바랍니다.\n';
  } else if (passStatus === 'borderline') {
    recommendations += '### 전반적인 조언\n';
    recommendations +=
      '합격선에 근접해 있습니다! 약점 영역을 집중적으로 보완하면 충분히 합격할 수 있습니다. ';
    recommendations +=
      '특히 위에서 언급된 개선 영역에 집중하여 연습하세요.\n';
  }

  return recommendations;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { session_id, include_history = false } = await req.json();

    if (!session_id) {
      return new Response(
        JSON.stringify({ error: 'session_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch session with result
    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const typedSession = session as Session;

    // Fetch result
    const { data: result, error: resultError } = await supabase
      .from('interview_results')
      .select('*')
      .eq('session_id', session_id)
      .single();

    if (resultError || !result) {
      return new Response(
        JSON.stringify({ error: 'Interview result not found. Please complete the interview first.' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const typedResult = result as InterviewResult;

    // Fetch messages
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', session_id)
      .order('created_at', { ascending: true });

    const typedMessages = (messages || []) as Message[];

    // Calculate duration
    const startTime = new Date(typedSession.created_at);
    const endTime = new Date(typedSession.updated_at);
    const durationMinutes = Math.round(
      (endTime.getTime() - startTime.getTime()) / 60000
    );

    // Get score grade
    const { grade } = getScoreGrade(typedResult.overall_score);

    // Build report
    let report = `# 면접 결과 리포트\n\n`;
    report += `생성일: ${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}\n\n`;

    // Summary section
    report += `## 요약\n\n`;
    report += `| 항목 | 값 |\n`;
    report += `|------|----|\n`;
    report += `| 직무 | ${typedSession.job_type} |\n`;
    report += `| 산업 | ${typedSession.industry || '일반'} |\n`;
    report += `| 난이도 | ${typedSession.difficulty} |\n`;
    report += `| 질문 수 | ${typedSession.turn_count}개 |\n`;
    report += `| 소요 시간 | ${durationMinutes}분 |\n`;
    report += `| 총점 | ${typedResult.overall_score}점 (${grade}) |\n`;
    report += `| 합격 여부 | ${typedResult.pass_status === 'pass' ? '합격' : typedResult.pass_status === 'borderline' ? '경계선' : '불합격'} |\n`;

    if (typedResult.rank_percentile) {
      report += `| 상위 | ${(100 - typedResult.rank_percentile).toFixed(1)}% |\n`;
    }
    report += `\n`;

    // Overall feedback
    report += `## 종합 평가\n\n`;
    report += `${typedResult.feedback_summary}\n\n`;

    // Interviewer scores
    report += `## 면접관별 평가\n\n`;
    report += `| 면접관 | 점수 |\n`;
    report += `|--------|------|\n`;
    report += `| 실무팀장 | ${typedResult.interviewer_scores.hiring_manager}점 |\n`;
    report += `| HR 담당자 | ${typedResult.interviewer_scores.hr_manager}점 |\n`;
    report += `| 시니어 동료 | ${typedResult.interviewer_scores.senior_peer}점 |\n`;
    report += `\n`;

    // Competency scores
    report += `## 역량별 점수\n\n`;
    report += `| 역량 | 점수 | 등급 |\n`;
    report += `|------|------|------|\n`;
    for (const [key, score] of Object.entries(typedResult.competency_scores)) {
      const label = COMPETENCY_LABELS[key as keyof CompetencyScore];
      const { grade: compGrade } = getScoreGrade(score);
      report += `| ${label} | ${score}점 | ${compGrade} |\n`;
    }
    report += `\n`;

    // Competency analysis
    report += generateCompetencyAnalysis(typedResult.competency_scores);

    // Strengths and improvements
    report += `## 강점\n\n`;
    typedResult.strengths.forEach((strength, i) => {
      report += `${i + 1}. ${strength}\n`;
    });
    report += `\n`;

    report += `## 개선점\n\n`;
    typedResult.improvements.forEach((improvement, i) => {
      report += `${i + 1}. ${improvement}\n`;
    });
    report += `\n`;

    // Recommendations
    report += generateRecommendations(
      typedResult.competency_scores,
      typedResult.pass_status
    );

    // Q&A Summary
    report += `## 질문-답변 요약\n\n`;
    let questionNum = 0;
    for (let i = 0; i < typedMessages.length; i++) {
      const msg = typedMessages[i];
      if (msg.role === 'interviewer') {
        questionNum++;
        report += `### Q${questionNum}. ${msg.content}\n\n`;
        // Find user's answer
        const answer = typedMessages[i + 1];
        if (answer && answer.role === 'user') {
          report += `**답변:** ${answer.content}\n\n`;
        }
      }
    }

    // Historical comparison if requested
    if (include_history) {
      const { data: history } = await supabase
        .from('interview_results')
        .select('overall_score, created_at')
        .eq('user_id', typedSession.user_id)
        .order('created_at', { ascending: true })
        .limit(10);

      if (history && history.length > 1) {
        report += `## 성적 추이\n\n`;
        report += `| 날짜 | 점수 |\n`;
        report += `|------|------|\n`;
        history.forEach((h: { overall_score: number; created_at: string }) => {
          const date = new Date(h.created_at).toLocaleDateString('ko-KR');
          report += `| ${date} | ${h.overall_score}점 |\n`;
        });
        report += `\n`;
      }
    }

    // Footer
    report += `---\n`;
    report += `*이 리포트는 AI 면접 시스템에 의해 자동 생성되었습니다.*\n`;
    report += `*실제 면접 결과와 다를 수 있으며, 참고 목적으로만 활용하세요.*\n`;

    return new Response(
      JSON.stringify({
        success: true,
        report: {
          markdown: report,
          session_id,
          result_id: typedResult.id,
          overall_score: typedResult.overall_score,
          pass_status: typedResult.pass_status,
          grade,
          generated_at: new Date().toISOString(),
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Generate report error:', error);
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
