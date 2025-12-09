// ============================================
// IMSAM AI Interview - 채점 시스템 프롬프트
// ============================================
// 면접관 AI가 답변을 평가할 때 사용하는 프롬프트

import {
  CORE_RUBRIC,
  type CoreEvaluationCategory,
  type EvaluationScores,
  INTERVIEWER_EVALUATION_WEIGHTS,
  generateRubricDocument,
} from './scoring-rubric';
import type { InterviewerType } from '@/types/interview';

// ============================================
// 1. 실시간 답변 평가 시스템 프롬프트
// ============================================

/**
 * 실시간 답변 평가용 시스템 프롬프트
 * - 면접 중 각 답변에 대해 즉시 평가
 * - Structured Output으로 점수와 근거 반환
 */
export const REALTIME_SCORING_SYSTEM_PROMPT = `당신은 전문 면접 평가자입니다.
지원자의 답변을 아래 루브릭에 따라 **엄격하게** 평가하고, JSON 형식으로 점수와 근거를 제공합니다.

## ⚠️ 엄격한 채점 원칙

1. **루브릭 기준 엄수**: 반드시 아래 루브릭의 점수별 기준에 따라 채점하세요. 기준에 명시되지 않은 요소는 고려하지 마세요.
2. **관대한 점수 금지**: 
   - 5점은 "완벽한" 답변에만 부여합니다
   - 4점은 "충분히 좋은" 답변에 부여합니다
   - 3점이 "평균/무난한" 답변입니다
   - 의심스러우면 낮은 점수를 부여하세요
3. **증거 기반 평가**: 점수의 근거는 반드시 답변 내용에서 직접 인용해야 합니다
4. **감점 요소 적극 반영**:
   - 구체적 수치/사례 없음 → 최대 3점
   - STAR 구조 미충족 → 논리적 구조 최대 3점
   - 모호한 표현 사용 → 직무 전문성 최대 3점
   - 부정적/방어적 태도 → 태도/커뮤니케이션 최대 2점
5. **일관성 유지**: 동일한 수준의 답변에는 동일한 점수를 부여하세요

## 점수 분포 가이드라인
- 1점 (0-20%): 매우 부족, 기준 미달
- 2점 (20-40%): 부족, 개선 필요
- 3점 (40-60%): 보통, 무난한 수준
- 4점 (60-80%): 좋음, 기대 충족
- 5점 (80-100%): 매우 우수, 기대 초과

## 평가 루브릭

### 1. 논리적 구조 (20%)
STAR(상황-과제-행동-결과) 또는 PREP(결론-이유-예시-결론) 구조로 체계적으로 답변했는지 평가합니다.

| 점수 | 기준 |
|------|------|
| 1점 | 답변이 산만하고 구조가 없음. 질문과 관련 없는 내용이 많음 |
| 2점 | 답변에 일부 구조가 있으나 논리적 흐름이 부족함 |
| 3점 | 대체로 구조적이나 세부 연결이 약함. STAR 일부 요소 누락 |
| 4점 | 명확한 구조로 답변. STAR/PREP 대부분 충족 |
| 5점 | 매우 체계적이고 논리적인 구조. 완벽한 STAR/PREP 적용 |

### 2. 직무 전문성 (30%)
직무 관련 지식, 경험 사례, 문제 해결 방식이 구체적인지 평가합니다.

| 점수 | 기준 |
|------|------|
| 1점 | 직무 관련 지식이 거의 없음. 경험 사례가 모호하거나 없음 |
| 2점 | 기본 개념은 알지만 깊이가 부족함. 경험이 피상적 |
| 3점 | 직무 지식과 경험이 있으나 구체성이 부족함 |
| 4점 | 충분한 직무 역량 보유. 도구, 방법론을 구체적으로 설명 |
| 5점 | 깊은 전문성. 지표, 수치, 트레이드오프까지 상세히 설명 |

### 3. 태도/커뮤니케이션 (20%)
말하기 태도, 명료성, 예의, 협업 자세가 적절한지 평가합니다.

| 점수 | 기준 |
|------|------|
| 1점 | 부정적 인상. 무례하거나 방어적. 소통이 원활하지 않음 |
| 2점 | 소극적이거나 자신감 부족. 소통에 어려움 |
| 3점 | 무난한 수준. 기본적인 예의와 소통 능력 보유 |
| 4점 | 긍정적이고 적극적. 명확하게 의사 표현 |
| 5점 | 매우 긍정적 인상. 뛰어난 소통 능력과 협업 자세 |

### 4. 회사/직무 적합도 (15%)
조직의 가치, 직무 요구사항과의 연결 정도를 평가합니다.

| 점수 | 기준 |
|------|------|
| 1점 | 회사/직무에 대한 이해 없음. 연결점 전혀 없음 |
| 2점 | 피상적인 이해. 일반적인 답변만 제시 |
| 3점 | 기본적인 이해. 일반적인 수준의 연결 |
| 4점 | 회사/직무를 잘 이해하고 자신의 경험과 연결 |
| 5점 | 깊은 이해. 구체적인 기여 방안과 비전 제시 |

### 5. 성장 가능성 (15%)
피드백 수용 태도, 자기 성찰, 학습 의지가 드러나는지 평가합니다.

| 점수 | 기준 |
|------|------|
| 1점 | 성장 의지 없음. 피드백 거부. 자기 성찰 없음 |
| 2점 | 소극적. 피드백 수용 의지 약함 |
| 3점 | 일부 성장 의지 언급. 기본적인 자기 성찰 |
| 4점 | 적극적인 학습 의지. 실패에서 배운 점 명확 |
| 5점 | 뛰어난 성장 마인드셋. 구체적인 학습 계획과 자기 객관화 |

## 평가 지침

1. **객관성 유지**: 개인적 선호가 아닌 루브릭 기준에 따라 평가
2. **근거 제시**: 점수의 이유를 답변 내용에서 구체적으로 인용 (직접 인용 필수)
3. **건설적 피드백**: 개선점도 함께 제시
4. **맥락 고려**: 질문의 난이도와 직무 특성을 고려
5. **엄격한 기준 적용**: 애매하면 낮은 점수 부여, 5점은 정말 뛰어난 답변에만 부여

## 최종 점수 계산 공식

\`\`\`
총점 = (논리적구조×0.20 + 직무전문성×0.30 + 태도커뮤니케이션×0.20 + 회사적합도×0.15 + 성장가능성×0.15) × 20

예시: (4×0.20 + 3×0.30 + 4×0.20 + 3×0.15 + 4×0.15) × 20 = 3.55 × 20 = 71점
\`\`\`

- 70점 이상: 합격 (pass)
- 50-69점: 보류 (borderline)  
- 50점 미만: 불합격 (fail)

## 응답 형식

반드시 아래 JSON 스키마를 준수하여 응답하세요:

\`\`\`json
{
  "scores": {
    "logical_structure": 1-5,
    "job_expertise": 1-5,
    "attitude_communication": 1-5,
    "company_fit": 1-5,
    "growth_potential": 1-5
  },
  "reasoning": {
    "logical_structure": "점수 근거 설명",
    "job_expertise": "점수 근거 설명",
    "attitude_communication": "점수 근거 설명",
    "company_fit": "점수 근거 설명",
    "growth_potential": "점수 근거 설명"
  },
  "highlights": ["답변에서 좋았던 점 1", "좋았던 점 2"],
  "improvements": ["개선이 필요한 점 1", "개선이 필요한 점 2"],
  "overall_impression": "전체적인 답변에 대한 한 줄 평가"
}
\`\`\`
`;

// ============================================
// 2. 면접관별 실시간 평가 프롬프트
// ============================================

/**
 * 면접관 역할에 맞는 평가 프롬프트 생성
 */
export function buildInterviewerScoringPrompt(
  interviewerType: InterviewerType,
  jobType: string,
  industry: string
): string {
  const weights = INTERVIEWER_EVALUATION_WEIGHTS[interviewerType];

  const roleDescriptions: Record<InterviewerType, string> = {
    hiring_manager: `당신은 **실무팀장**으로서 직무 전문성(${(weights.job_expertise * 100).toFixed(0)}%)을 가장 중시합니다.
지원자가 팀에 합류했을 때 실질적인 기여를 할 수 있는지 평가합니다.
기술 깊이, 문제해결 과정, 의사결정 능력을 꼼꼼히 살펴봅니다.`,

    hr_manager: `당신은 **HR 담당자**로서 태도/커뮤니케이션(${(weights.attitude_communication * 100).toFixed(0)}%)과 
회사 적합도(${(weights.company_fit * 100).toFixed(0)}%)를 중시합니다.
지원자가 조직에 잘 적응하고 함께 성장할 수 있는지 평가합니다.
자기 객관화, 성장 마인드셋, 감정 지능을 살펴봅니다.`,

    senior_peer: `당신은 **시니어 동료**로서 직무 전문성(${(weights.job_expertise * 100).toFixed(0)}%)과
성장 가능성(${(weights.growth_potential * 100).toFixed(0)}%)을 중시합니다.
지원자와 함께 일하면서 시너지를 낼 수 있는지 평가합니다.
기술 호기심, 코드에 대한 책임감, 학습 의지를 살펴봅니다.`,
  };

  return `${REALTIME_SCORING_SYSTEM_PROMPT}

## 당신의 역할

${roleDescriptions[interviewerType]}

## 평가 가중치 (${interviewerType})
- 논리적 구조: ${(weights.logical_structure * 100).toFixed(0)}%
- 직무 전문성: ${(weights.job_expertise * 100).toFixed(0)}%
- 태도/커뮤니케이션: ${(weights.attitude_communication * 100).toFixed(0)}%
- 회사/직무 적합도: ${(weights.company_fit * 100).toFixed(0)}%
- 성장 가능성: ${(weights.growth_potential * 100).toFixed(0)}%

## 면접 정보
- 직무: ${jobType}
- 산업: ${industry}

이 정보를 바탕으로 지원자의 답변을 평가해주세요.
`;
}

// ============================================
// 3. 최종 종합 평가 시스템 프롬프트
// ============================================

/**
 * 면접 종료 후 전체 세션 종합 평가용 프롬프트
 */
export const FINAL_EVALUATION_SYSTEM_PROMPT = `당신은 면접 최종 평가자입니다.
면접 세션의 모든 질의응답을 종합하여 **엄격하게** 최종 평가 리포트를 작성합니다.

## ⚠️ 엄격한 최종 평가 원칙

1. **루브릭 기준 엄수**: 반드시 아래 루브릭의 점수별 기준에 따라 채점하세요
2. **관대한 점수 금지**: 
   - 70점 이상(합격)은 전체 답변이 일관되게 좋은 경우에만 부여
   - 평균적인 면접은 50-65점 범위
   - 의심스러우면 낮은 점수를 부여하세요
3. **증거 기반 평가**: 모든 점수의 근거를 면접 내용에서 직접 인용
4. **면접관별 가중치 반영**: 각 면접관의 평가 중점을 고려
5. **트렌드 반영**: 면접 초반 vs 후반 답변 품질 변화 반드시 분석

## 점수 산정 공식

\`\`\`
총점 = (논리적구조×0.20 + 직무전문성×0.30 + 태도×0.20 + 적합도×0.15 + 성장성×0.15) × 20

- 합격(pass): 70점 이상 - 채용 권고
- 보류(borderline): 50-69점 - 추가 면접 권고
- 불합격(fail): 50점 미만 - 채용 비권고
\`\`\`

## 평가 루브릭

${generateRubricDocument()}

## 최종 평가 지침

1. **일관성 검토**: 답변들 사이의 일관성 확인 - 불일치 발견 시 감점
2. **성장 곡선**: 면접 초반 vs 후반의 답변 품질 변화 - improving/stable/declining 반드시 기록
3. **종합적 판단**: 개별 점수의 가중 평균으로 계산, 주관적 가감 금지
4. **합격 여부**: 계산된 점수에 따라 엄격하게 판정
5. **면접관 일치도**: 3명의 면접관 평가가 크게 다를 경우 그 이유 분석

## 응답 형식

\`\`\`json
{
  "overall_score": 0-100,
  "pass_status": "pass" | "borderline" | "fail",
  "category_scores": {
    "logical_structure": { "score": 1-5, "trend": "improving" | "stable" | "declining" },
    "job_expertise": { "score": 1-5, "trend": "..." },
    "attitude_communication": { "score": 1-5, "trend": "..." },
    "company_fit": { "score": 1-5, "trend": "..." },
    "growth_potential": { "score": 1-5, "trend": "..." }
  },
  "competency_scores": {
    "behavioral": 0-100,
    "clarity": 0-100,
    "comprehension": 0-100,
    "communication": 0-100,
    "reasoning": 0-100,
    "problem_solving": 0-100,
    "leadership": 0-100,
    "adaptability": 0-100
  },
  "interviewer_impressions": {
    "hiring_manager": { "score": 0-100, "comment": "한 줄 평가" },
    "hr_manager": { "score": 0-100, "comment": "한 줄 평가" },
    "senior_peer": { "score": 0-100, "comment": "한 줄 평가" }
  },
  "feedback_summary": "전체 면접에 대한 2-3문장 요약",
  "strengths": ["강점 1", "강점 2", "강점 3"],
  "improvements": ["개선점 1", "개선점 2", "개선점 3"],
  "recommendation": "채용 관련 최종 의견"
}
\`\`\`
`;

// ============================================
// 4. 질문별 평가 시스템 프롬프트
// ============================================

/**
 * 개별 질문-답변 쌍에 대한 상세 평가용 프롬프트
 */
export function buildQuestionEvaluationPrompt(
  questionText: string,
  questionCategory: string,
  expectedPoints: string[]
): string {
  return `당신은 면접 평가자입니다.
아래 질문과 기대 평가 포인트를 참고하여 지원자의 답변을 평가합니다.

## 질문
"${questionText}"

## 질문 카테고리
${questionCategory}

## 기대 평가 포인트
${expectedPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

## 평가 기준

### 답변 완성도
- 질문에서 요구하는 모든 포인트를 다루었는가
- 기대 평가 포인트에 대한 적절한 응답이 있는가

### 구체성
- 추상적 답변이 아닌 구체적 사례/수치를 제시했는가
- STAR 프레임워크(상황-과제-행동-결과)를 활용했는가

### 관련성
- 질문 의도에 맞는 답변인가
- 불필요한 내용 없이 핵심에 집중했는가

## 응답 형식

\`\`\`json
{
  "question_score": 0-100,
  "point_coverage": {
    "covered": ["다룬 평가 포인트"],
    "missed": ["누락된 평가 포인트"]
  },
  "star_analysis": {
    "situation": { "present": true/false, "quality": "상/중/하" },
    "task": { "present": true/false, "quality": "상/중/하" },
    "action": { "present": true/false, "quality": "상/중/하" },
    "result": { "present": true/false, "quality": "상/중/하" }
  },
  "feedback": "이 질문에 대한 답변 피드백",
  "improved_answer_hint": "더 좋은 답변을 위한 힌트"
}
\`\`\`
`;
}

// ============================================
// 5. 면접관 속마음(Inner Thought) 프롬프트
// ============================================

/**
 * 면접관의 속마음 생성용 프롬프트
 */
export function buildInnerThoughtPrompt(
  interviewerType: InterviewerType,
  currentScore: number
): string {
  const thoughtStyles: Record<InterviewerType, { positive: string[]; neutral: string[]; negative: string[] }> = {
    hiring_manager: {
      positive: [
        '오, 이 친구 기술 깊이가 있네',
        '바로 실무에 투입해도 될 것 같은데?',
        '우리 팀에 딱 필요한 스킬이야',
      ],
      neutral: [
        '음, 나쁘진 않은데 조금 더 들어봐야겠어',
        '기본기는 있는 것 같은데...',
        '경험은 있는데 깊이가 좀 아쉽네',
      ],
      negative: [
        '이건 좀 기대에 못 미치는데...',
        '실무 경험이 부족해 보여',
        '이 정도론 우리 팀에서 힘들 것 같아',
      ],
    },
    hr_manager: {
      positive: [
        '팀 분위기에 잘 어울릴 것 같아요',
        '커뮤니케이션이 정말 좋네요',
        '성장 마인드셋이 확실해요',
      ],
      neutral: [
        '괜찮은데, 조직 적합성은 좀 더 봐야겠어요',
        '기본적인 소통은 되는 것 같아요',
        '나쁘진 않은데 뭔가 아쉬워요',
      ],
      negative: [
        '음... 팀워크가 걱정되네요',
        '성장 의지가 좀 부족해 보여요',
        '조직 문화와 안 맞을 수도 있겠어요',
      ],
    },
    senior_peer: {
      positive: [
        '오 이 사람이랑 같이 일하면 재밌겠다',
        '기술에 대한 열정이 느껴지네',
        '배우려는 자세가 좋아',
      ],
      neutral: [
        '음, 괜찮은 것 같은데 좀 더 얘기해봐야겠어',
        '기본기는 있는데 최신 트렌드는 좀...',
        '일은 하겠는데 시너지가 날까?',
      ],
      negative: [
        '같이 일하면 좀 피곤하겠다...',
        '기술 학습 의지가 안 보여',
        '코드 리뷰하면 힘들 것 같아',
      ],
    },
  };

  const style = thoughtStyles[interviewerType];

  if (currentScore >= 70) {
    return style.positive[Math.floor(Math.random() * style.positive.length)];
  } else if (currentScore >= 50) {
    return style.neutral[Math.floor(Math.random() * style.neutral.length)];
  } else {
    return style.negative[Math.floor(Math.random() * style.negative.length)];
  }
}

// ============================================
// 6. Structured Output JSON Schema
// ============================================

/**
 * 실시간 평가용 JSON Schema (OpenAI Structured Output)
 */
export const REALTIME_SCORING_SCHEMA = {
  type: 'object',
  properties: {
    scores: {
      type: 'object',
      properties: {
        logical_structure: { type: 'integer', minimum: 1, maximum: 5 },
        job_expertise: { type: 'integer', minimum: 1, maximum: 5 },
        attitude_communication: { type: 'integer', minimum: 1, maximum: 5 },
        company_fit: { type: 'integer', minimum: 1, maximum: 5 },
        growth_potential: { type: 'integer', minimum: 1, maximum: 5 },
      },
      required: [
        'logical_structure',
        'job_expertise',
        'attitude_communication',
        'company_fit',
        'growth_potential',
      ],
    },
    reasoning: {
      type: 'object',
      properties: {
        logical_structure: { type: 'string' },
        job_expertise: { type: 'string' },
        attitude_communication: { type: 'string' },
        company_fit: { type: 'string' },
        growth_potential: { type: 'string' },
      },
      required: [
        'logical_structure',
        'job_expertise',
        'attitude_communication',
        'company_fit',
        'growth_potential',
      ],
    },
    highlights: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 3,
    },
    improvements: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 3,
    },
    overall_impression: { type: 'string' },
  },
  required: ['scores', 'reasoning', 'highlights', 'improvements', 'overall_impression'],
};

/**
 * 최종 평가용 JSON Schema
 */
export const FINAL_EVALUATION_SCHEMA = {
  type: 'object',
  properties: {
    overall_score: { type: 'number', minimum: 0, maximum: 100 },
    pass_status: { type: 'string', enum: ['pass', 'borderline', 'fail'] },
    category_scores: {
      type: 'object',
      properties: {
        logical_structure: {
          type: 'object',
          properties: {
            score: { type: 'integer', minimum: 1, maximum: 5 },
            trend: { type: 'string', enum: ['improving', 'stable', 'declining'] },
          },
          required: ['score', 'trend'],
        },
        job_expertise: {
          type: 'object',
          properties: {
            score: { type: 'integer', minimum: 1, maximum: 5 },
            trend: { type: 'string', enum: ['improving', 'stable', 'declining'] },
          },
          required: ['score', 'trend'],
        },
        attitude_communication: {
          type: 'object',
          properties: {
            score: { type: 'integer', minimum: 1, maximum: 5 },
            trend: { type: 'string', enum: ['improving', 'stable', 'declining'] },
          },
          required: ['score', 'trend'],
        },
        company_fit: {
          type: 'object',
          properties: {
            score: { type: 'integer', minimum: 1, maximum: 5 },
            trend: { type: 'string', enum: ['improving', 'stable', 'declining'] },
          },
          required: ['score', 'trend'],
        },
        growth_potential: {
          type: 'object',
          properties: {
            score: { type: 'integer', minimum: 1, maximum: 5 },
            trend: { type: 'string', enum: ['improving', 'stable', 'declining'] },
          },
          required: ['score', 'trend'],
        },
      },
      required: [
        'logical_structure',
        'job_expertise',
        'attitude_communication',
        'company_fit',
        'growth_potential',
      ],
    },
    competency_scores: {
      type: 'object',
      properties: {
        behavioral: { type: 'number', minimum: 0, maximum: 100 },
        clarity: { type: 'number', minimum: 0, maximum: 100 },
        comprehension: { type: 'number', minimum: 0, maximum: 100 },
        communication: { type: 'number', minimum: 0, maximum: 100 },
        reasoning: { type: 'number', minimum: 0, maximum: 100 },
        problem_solving: { type: 'number', minimum: 0, maximum: 100 },
        leadership: { type: 'number', minimum: 0, maximum: 100 },
        adaptability: { type: 'number', minimum: 0, maximum: 100 },
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
    interviewer_impressions: {
      type: 'object',
      properties: {
        hiring_manager: {
          type: 'object',
          properties: {
            score: { type: 'number', minimum: 0, maximum: 100 },
            comment: { type: 'string' },
          },
          required: ['score', 'comment'],
        },
        hr_manager: {
          type: 'object',
          properties: {
            score: { type: 'number', minimum: 0, maximum: 100 },
            comment: { type: 'string' },
          },
          required: ['score', 'comment'],
        },
        senior_peer: {
          type: 'object',
          properties: {
            score: { type: 'number', minimum: 0, maximum: 100 },
            comment: { type: 'string' },
          },
          required: ['score', 'comment'],
        },
      },
      required: ['hiring_manager', 'hr_manager', 'senior_peer'],
    },
    feedback_summary: { type: 'string' },
    strengths: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
      maxItems: 5,
    },
    improvements: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
      maxItems: 5,
    },
    recommendation: { type: 'string' },
  },
  required: [
    'overall_score',
    'pass_status',
    'category_scores',
    'competency_scores',
    'interviewer_impressions',
    'feedback_summary',
    'strengths',
    'improvements',
    'recommendation',
  ],
};

// ============================================
// 7. OpenAI API 호출 설정 (temperature: 0)
// ============================================

/**
 * 채점용 OpenAI API 호출 설정
 * - temperature: 0 (일관성 있는 채점을 위해 무작위성 제거)
 * - top_p: 1 (기본값)
 * - max_tokens: 충분한 응답 길이 확보
 */
export const SCORING_API_CONFIG = {
  model: 'gpt-4o',
  temperature: 0,  // 🔴 중요: 일관된 채점을 위해 반드시 0으로 설정
  top_p: 1,
  max_tokens: 2000,
  // Structured Output을 사용할 때만 response_format 추가
};

/**
 * 실시간 답변 평가 API 호출 헬퍼
 * @param answer 지원자의 답변
 * @param interviewerType 면접관 유형
 * @param jobType 직무
 * @param industry 산업
 */
export interface ScoringApiRequest {
  model: string;
  temperature: number;
  top_p: number;
  max_tokens: number;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  response_format: {
    type: 'json_schema';
    json_schema: {
      name: string;
      strict: boolean;
      schema: Record<string, unknown>;
    };
  };
}

/**
 * 실시간 채점 API 요청 객체 생성
 */
export function buildRealtimeScoringRequest(
  answer: string,
  interviewerType: InterviewerType,
  jobType: string,
  industry: string,
  previousContext?: string
): ScoringApiRequest {
  const systemPrompt = buildInterviewerScoringPrompt(interviewerType, jobType, industry);
  
  const userMessage = previousContext 
    ? `## 이전 대화 맥락\n${previousContext}\n\n## 현재 지원자 답변\n${answer}\n\n위 답변을 루브릭에 따라 엄격하게 채점하세요.`
    : `## 지원자 답변\n${answer}\n\n위 답변을 루브릭에 따라 엄격하게 채점하세요.`;

  return {
    ...SCORING_API_CONFIG,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'realtime_scoring',
        strict: true,
        schema: REALTIME_SCORING_SCHEMA,
      },
    },
  };
}

/**
 * 최종 종합 평가 API 요청 객체 생성
 */
export function buildFinalEvaluationRequest(
  conversationHistory: string,
  jobType: string,
  industry: string
): ScoringApiRequest {
  const userMessage = `## 면접 정보
- 직무: ${jobType}
- 산업: ${industry}

## 전체 면접 대화
${conversationHistory}

위 면접 내용을 루브릭에 따라 **엄격하게** 종합 평가하세요.
점수 계산 공식을 반드시 따르고, 근거를 명확히 제시하세요.`;

  return {
    ...SCORING_API_CONFIG,
    max_tokens: 3000, // 최종 평가는 더 긴 응답 필요
    messages: [
      { role: 'system', content: FINAL_EVALUATION_SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'final_evaluation',
        strict: true,
        schema: FINAL_EVALUATION_SCHEMA,
      },
    },
  };
}

/**
 * 질문별 평가 API 요청 객체 생성
 */
export function buildQuestionScoringRequest(
  questionText: string,
  questionCategory: string,
  expectedPoints: string[],
  answer: string
): ScoringApiRequest {
  const systemPrompt = buildQuestionEvaluationPrompt(questionText, questionCategory, expectedPoints);
  
  return {
    ...SCORING_API_CONFIG,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `## 지원자 답변\n${answer}\n\n위 답변을 기대 평가 포인트와 비교하여 엄격하게 채점하세요.` },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'question_evaluation',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            question_score: { type: 'number', minimum: 0, maximum: 100 },
            point_coverage: {
              type: 'object',
              properties: {
                covered: { type: 'array', items: { type: 'string' } },
                missed: { type: 'array', items: { type: 'string' } },
              },
              required: ['covered', 'missed'],
            },
            star_analysis: {
              type: 'object',
              properties: {
                situation: {
                  type: 'object',
                  properties: {
                    present: { type: 'boolean' },
                    quality: { type: 'string', enum: ['상', '중', '하'] },
                  },
                  required: ['present', 'quality'],
                },
                task: {
                  type: 'object',
                  properties: {
                    present: { type: 'boolean' },
                    quality: { type: 'string', enum: ['상', '중', '하'] },
                  },
                  required: ['present', 'quality'],
                },
                action: {
                  type: 'object',
                  properties: {
                    present: { type: 'boolean' },
                    quality: { type: 'string', enum: ['상', '중', '하'] },
                  },
                  required: ['present', 'quality'],
                },
                result: {
                  type: 'object',
                  properties: {
                    present: { type: 'boolean' },
                    quality: { type: 'string', enum: ['상', '중', '하'] },
                  },
                  required: ['present', 'quality'],
                },
              },
              required: ['situation', 'task', 'action', 'result'],
            },
            feedback: { type: 'string' },
            improved_answer_hint: { type: 'string' },
          },
          required: ['question_score', 'point_coverage', 'star_analysis', 'feedback', 'improved_answer_hint'],
        },
      },
    },
  };
}

export default {
  // 시스템 프롬프트
  REALTIME_SCORING_SYSTEM_PROMPT,
  FINAL_EVALUATION_SYSTEM_PROMPT,
  // JSON 스키마
  REALTIME_SCORING_SCHEMA,
  FINAL_EVALUATION_SCHEMA,
  // 프롬프트 빌더
  buildInterviewerScoringPrompt,
  buildQuestionEvaluationPrompt,
  buildInnerThoughtPrompt,
  // API 설정 및 요청 빌더
  SCORING_API_CONFIG,
  buildRealtimeScoringRequest,
  buildFinalEvaluationRequest,
  buildQuestionScoringRequest,
};

