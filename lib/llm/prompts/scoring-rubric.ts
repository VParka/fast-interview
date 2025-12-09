// ============================================
// IMSAM AI Interview - 채점 루브릭 정의
// ============================================
// 면접 평가 기준 및 점수 산정 로직

import type { CompetencyScores, InterviewerType } from '@/types/interview';

// ============================================
// 1. 5축 핵심 평가 항목 (사용자 요청 기반)
// ============================================

/**
 * 핵심 평가 항목 타입
 * - 논리적 구조, 직무 전문성, 태도/커뮤니케이션, 회사/직무 적합도, 성장 가능성
 */
export type CoreEvaluationCategory =
  | 'logical_structure'      // 논리적 구조
  | 'job_expertise'          // 직무 전문성
  | 'attitude_communication' // 태도/커뮤니케이션
  | 'company_fit'            // 회사/직무 적합도
  | 'growth_potential';      // 성장 가능성

/**
 * 점수 레벨 (1-5점 척도)
 */
export type ScoreLevel = 1 | 2 | 3 | 4 | 5;

/**
 * 루브릭 항목 인터페이스
 */
export interface RubricItem {
  category: CoreEvaluationCategory;
  name: string;
  description: string;
  weight: number;          // 가중치 (0.0 ~ 1.0, 합계 = 1.0)
  criteria: Record<ScoreLevel, string>;  // 점수별 기준
  keywords: {
    positive: string[];    // 높은 점수를 받을 수 있는 키워드/표현
    negative: string[];    // 낮은 점수를 받을 수 있는 키워드/표현
  };
  examples: {
    good: string;          // 좋은 답변 예시
    bad: string;           // 나쁜 답변 예시
  };
}

// ============================================
// 2. 5축 핵심 루브릭 정의
// ============================================

export const CORE_RUBRIC: Record<CoreEvaluationCategory, RubricItem> = {
  logical_structure: {
    category: 'logical_structure',
    name: '논리적 구조',
    description: 'STAR, PREP, 두괄식 등의 체계적인 답변 구조를 갖추었는가',
    weight: 0.20,
    criteria: {
      1: '답변이 산만하고 구조가 없음. 질문과 관련 없는 내용이 많음',
      2: '답변에 일부 구조가 있으나 논리적 흐름이 부족함',
      3: '대체로 구조적이나 세부 연결이 약함. STAR 일부 요소 누락',
      4: '명확한 구조로 답변. STAR/PREP 대부분 충족',
      5: '매우 체계적이고 논리적인 구조. 완벽한 STAR/PREP 적용',
    },
    keywords: {
      positive: [
        '우선', '첫째', '둘째', '결론적으로', '요약하면',
        '상황은', '과제는', '제가 한 행동은', '결과는',
        '예를 들어', '구체적으로', '그 결과로',
      ],
      negative: [
        '음...', '그냥', '뭐랄까', '아무튼', '글쎄요',
        '잘 모르겠지만', '갑자기 생각나는 건',
      ],
    },
    examples: {
      good: '해당 프로젝트에서 (상황) 서버 응답 속도가 3초 이상 걸리는 문제가 있었습니다. (과제) 저는 성능 최적화를 담당했고, (행동) 쿼리 분석 후 인덱스 추가와 캐싱 레이어를 도입했습니다. (결과) 응답 속도가 0.3초로 90% 개선되었습니다.',
      bad: '음... 그 프로젝트에서 뭔가 느렸던 것 같아요. 그래서 이것저것 해봤는데... 잘 됐던 것 같습니다.',
    },
  },

  job_expertise: {
    category: 'job_expertise',
    name: '직무 전문성',
    description: '직무 관련 지식, 경험 사례, 문제 해결 방식이 구체적인가',
    weight: 0.30,
    criteria: {
      1: '직무 관련 지식이 거의 없음. 경험 사례가 모호하거나 없음',
      2: '기본 개념은 알지만 깊이가 부족함. 경험이 피상적',
      3: '직무 지식과 경험이 있으나 구체성이 부족함',
      4: '충분한 직무 역량 보유. 도구, 방법론을 구체적으로 설명',
      5: '깊은 전문성. 지표, 수치, 트레이드오프까지 상세히 설명',
    },
    keywords: {
      positive: [
        // 개발 직군
        'API', 'REST', 'GraphQL', '마이크로서비스', '스케일링',
        'CI/CD', 'Docker', 'Kubernetes', 'AWS', 'GCP',
        'TDD', '코드 리뷰', '리팩토링', '아키텍처',
        // 성과 지표
        '00% 개선', '00% 감소', 'DAU', 'MAU', 'CTR', 'CVR',
        'latency', 'throughput', 'SLA', 'uptime',
      ],
      negative: [
        '잘 모르겠습니다', '안 해봤습니다', '들어는 봤는데',
        '그건 다른 팀에서', '제 담당이 아니었어요',
      ],
    },
    examples: {
      good: 'TypeScript와 React를 사용해 컴포넌트 설계 시 합성 패턴을 적용했습니다. 이를 통해 재사용성을 높이고, 번들 사이즈를 30% 줄였습니다. 특히 lazy loading과 code splitting을 활용해 초기 로딩 시간을 2초에서 0.8초로 개선했습니다.',
      bad: '프론트엔드 개발 했습니다. React 썼고요. 잘 됐습니다.',
    },
  },

  attitude_communication: {
    category: 'attitude_communication',
    name: '태도/커뮤니케이션',
    description: '말하기 속도, 명료성, 예의, 협업 태도가 적절한가',
    weight: 0.20,
    criteria: {
      1: '부정적 인상. 무례하거나 방어적. 소통이 원활하지 않음',
      2: '소극적이거나 자신감 부족. 소통에 어려움',
      3: '무난한 수준. 기본적인 예의와 소통 능력 보유',
      4: '긍정적이고 적극적. 명확하게 의사 표현',
      5: '매우 긍정적 인상. 뛰어난 소통 능력과 협업 자세',
    },
    keywords: {
      positive: [
        '감사합니다', '좋은 질문입니다', '말씀해 주신 것처럼',
        '함께', '협업', '팀원들과', '공유했습니다', '피드백을 반영해',
        '배웠습니다', '성장했습니다', '개선했습니다',
      ],
      negative: [
        '그건 제 잘못이 아니에요', '다른 사람이', '저만 제대로',
        '몰라서', '시키는 대로', '어쩔 수 없이',
      ],
    },
    examples: {
      good: '좋은 질문 감사합니다. 해당 프로젝트에서 팀원들과 적극적으로 소통하며 문제를 해결했습니다. 특히 디자이너분과의 협업에서 일일 싱크업을 통해 피드백을 빠르게 반영했고, 이 경험을 통해 커뮤니케이션의 중요성을 배웠습니다.',
      bad: '그건 다른 팀원이 잘못해서 그런 거예요. 저는 제 일만 했는데 왜 물어보시는지...',
    },
  },

  company_fit: {
    category: 'company_fit',
    name: '회사/직무 적합도',
    description: '조직의 가치, 직무 요구사항과의 연결 정도',
    weight: 0.15,
    criteria: {
      1: '회사/직무에 대한 이해 없음. 연결점 전혀 없음',
      2: '피상적인 이해. 일반적인 답변만 제시',
      3: '기본적인 이해. 일반적인 수준의 연결',
      4: '회사/직무를 잘 이해하고 자신의 경험과 연결',
      5: '깊은 이해. 구체적인 기여 방안과 비전 제시',
    },
    keywords: {
      positive: [
        '귀사의', '이 회사의', '이 포지션에서',
        '조직의 미션', '회사의 비전', '팀의 목표',
        '기여할 수 있는', '성장할 수 있는',
      ],
      negative: [
        '아무 회사나', '어디든', '월급만 주면',
        '잘 모르겠는데', '조사는 안 해봤지만',
      ],
    },
    examples: {
      good: '귀사가 AI 기반 서비스 확장에 집중하고 있다고 알고 있습니다. 제가 이전 회사에서 ML 파이프라인 구축 경험이 있어서, 이 포지션에서 데이터 처리 자동화에 기여하고 싶습니다. 특히 귀사의 "데이터 민주화" 비전에 공감합니다.',
      bad: '음... 이 회사가 뭐 하는 곳인지 정확히는 모르겠는데, 일단 개발자 뽑는다고 해서요.',
    },
  },

  growth_potential: {
    category: 'growth_potential',
    name: '성장 가능성',
    description: '피드백 수용 태도, 자기 성찰, 학습 의지가 드러나는가',
    weight: 0.15,
    criteria: {
      1: '성장 의지 없음. 피드백 거부. 자기 성찰 없음',
      2: '소극적. 피드백 수용 의지 약함',
      3: '일부 성장 의지 언급. 기본적인 자기 성찰',
      4: '적극적인 학습 의지. 실패에서 배운 점 명확',
      5: '뛰어난 성장 마인드셋. 구체적인 학습 계획과 자기 객관화',
    },
    keywords: {
      positive: [
        '배웠습니다', '성장했습니다', '개선 중입니다',
        '피드백을 받고', '부족한 점을 깨닫고', '도전하고 있습니다',
        '새롭게 배우고 싶은', '더 나아지기 위해',
        '실패했지만', '그 경험을 통해', '앞으로는',
      ],
      negative: [
        '더 배울 건 없는 것 같고', '이미 다 알고',
        '실패한 적 없습니다', '완벽하게', '제가 최고',
      ],
    },
    examples: {
      good: '처음 TDD를 도입했을 때 팀에서 저항이 있었습니다. 제가 너무 급하게 추진한 것이 원인이었다고 생각합니다. 이 경험에서 변화 관리의 중요성을 배웠고, 이후에는 작은 범위부터 점진적으로 도입하는 방식으로 개선했습니다.',
      bad: '저는 실패한 적이 없어요. 항상 다 잘했습니다.',
    },
  },
};

// ============================================
// 3. 8축 역량과 5축 핵심 평가의 매핑
// ============================================

/**
 * 5축 핵심 평가 → 8축 역량 매핑 가중치
 * 각 핵심 평가 항목이 8축 역량에 기여하는 비율
 */
export const CORE_TO_COMPETENCY_MAPPING: Record<
  CoreEvaluationCategory,
  Partial<Record<keyof CompetencyScores, number>>
> = {
  logical_structure: {
    clarity: 0.4,
    reasoning: 0.4,
    communication: 0.2,
  },
  job_expertise: {
    problem_solving: 0.4,
    comprehension: 0.3,
    reasoning: 0.2,
    adaptability: 0.1,
  },
  attitude_communication: {
    communication: 0.4,
    behavioral: 0.3,
    leadership: 0.2,
    adaptability: 0.1,
  },
  company_fit: {
    behavioral: 0.3,
    comprehension: 0.3,
    adaptability: 0.4,
  },
  growth_potential: {
    adaptability: 0.4,
    behavioral: 0.3,
    leadership: 0.2,
    problem_solving: 0.1,
  },
};

// ============================================
// 4. 면접관별 평가 가중치
// ============================================

/**
 * 각 면접관이 중점을 두는 평가 항목 가중치
 */
export const INTERVIEWER_EVALUATION_WEIGHTS: Record<
  InterviewerType,
  Record<CoreEvaluationCategory, number>
> = {
  hiring_manager: {
    logical_structure: 0.15,
    job_expertise: 0.45,         // 실무팀장은 직무 전문성 중시
    attitude_communication: 0.15,
    company_fit: 0.10,
    growth_potential: 0.15,
  },
  hr_manager: {
    logical_structure: 0.10,
    job_expertise: 0.15,
    attitude_communication: 0.35, // HR은 태도/커뮤니케이션 중시
    company_fit: 0.25,            // 조직 적합성도 중시
    growth_potential: 0.15,
  },
  senior_peer: {
    logical_structure: 0.20,
    job_expertise: 0.35,         // 시니어는 전문성 중시
    attitude_communication: 0.15,
    company_fit: 0.05,
    growth_potential: 0.25,       // 성장 가능성도 중시
  },
};

// ============================================
// 5. 합격 기준
// ============================================

export interface PassCriteria {
  pass: number;        // 합격 기준 점수
  borderline: number;  // 보류 기준 점수
}

export const PASS_CRITERIA: PassCriteria = {
  pass: 70,        // 70점 이상: 합격
  borderline: 50,  // 50-69점: 보류
  // 50점 미만: 불합격
};

// ============================================
// 6. 루브릭 → RAG 문서 형식 변환
// ============================================

/**
 * 루브릭을 RAG에 넣을 수 있는 마크다운 형식으로 변환
 */
export function generateRubricDocument(): string {
  const header = `# IMSAM 면접 평가 루브릭

## 개요
이 문서는 AI 면접관이 지원자의 답변을 평가할 때 사용하는 기준입니다.
각 항목은 1-5점 척도로 평가하며, 점수별 기준을 참고하여 일관된 평가를 수행합니다.

---

`;

  const categories = Object.values(CORE_RUBRIC)
    .map((item) => {
      const criteriaTable = Object.entries(item.criteria)
        .map(([score, desc]) => `| ${score}점 | ${desc} |`)
        .join('\n');

      return `## ${item.name} (가중치: ${(item.weight * 100).toFixed(0)}%)

**설명:** ${item.description}

### 점수 기준
| 점수 | 기준 |
|------|------|
${criteriaTable}

### 좋은 답변 예시
> ${item.examples.good}

### 나쁜 답변 예시
> ${item.examples.bad}

### 긍정적 키워드
${item.keywords.positive.join(', ')}

### 부정적 키워드
${item.keywords.negative.join(', ')}

---

`;
    })
    .join('');

  const footer = `## 합격 기준

| 구분 | 점수 범위 |
|------|----------|
| 합격 | 70점 이상 |
| 보류 | 50-69점 |
| 불합격 | 50점 미만 |

## 최종 점수 산정

총점 = Σ(항목별 점수 × 가중치) × 20

- 논리적 구조: 20%
- 직무 전문성: 30%
- 태도/커뮤니케이션: 20%
- 회사/직무 적합도: 15%
- 성장 가능성: 15%
`;

  return header + categories + footer;
}

// ============================================
// 7. 점수 계산 유틸리티
// ============================================

export interface EvaluationScores {
  logical_structure: ScoreLevel;
  job_expertise: ScoreLevel;
  attitude_communication: ScoreLevel;
  company_fit: ScoreLevel;
  growth_potential: ScoreLevel;
}

/**
 * 5축 점수를 100점 만점으로 변환
 */
export function calculateTotalScore(scores: EvaluationScores): number {
  let total = 0;

  for (const [category, score] of Object.entries(scores)) {
    const rubricItem = CORE_RUBRIC[category as CoreEvaluationCategory];
    // 1-5점을 0-100점으로 변환 후 가중치 적용
    total += ((score - 1) / 4) * 100 * rubricItem.weight;
  }

  return Math.round(total);
}

/**
 * 5축 점수를 8축 역량 점수로 변환
 */
export function convertToCompetencyScores(
  scores: EvaluationScores
): CompetencyScores {
  const competencyScores: CompetencyScores = {
    behavioral: 0,
    clarity: 0,
    comprehension: 0,
    communication: 0,
    reasoning: 0,
    problem_solving: 0,
    leadership: 0,
    adaptability: 0,
  };

  for (const [category, score] of Object.entries(scores)) {
    const mapping = CORE_TO_COMPETENCY_MAPPING[category as CoreEvaluationCategory];
    const normalizedScore = ((score - 1) / 4) * 100; // 1-5 → 0-100

    for (const [competency, weight] of Object.entries(mapping)) {
      competencyScores[competency as keyof CompetencyScores] +=
        normalizedScore * (weight || 0);
    }
  }

  // 정규화 (0-100 범위로)
  for (const key of Object.keys(competencyScores) as (keyof CompetencyScores)[]) {
    competencyScores[key] = Math.round(Math.min(100, competencyScores[key]));
  }

  return competencyScores;
}

/**
 * 합격 여부 판정
 */
export function determinePassStatus(
  totalScore: number
): 'pass' | 'borderline' | 'fail' {
  if (totalScore >= PASS_CRITERIA.pass) return 'pass';
  if (totalScore >= PASS_CRITERIA.borderline) return 'borderline';
  return 'fail';
}

export default CORE_RUBRIC;

