-- ============================================
-- Migration 008: Expanded Question Bank
-- ============================================
-- Additional interview questions for various job types
-- Organized by category and difficulty

-- ============================================
-- 1. Additional Technical Questions - Frontend
-- ============================================

INSERT INTO questions (category, job_type, difficulty, question_text, evaluation_points, sample_answer, follow_ups) VALUES

-- Frontend - Easy
('technical', 'frontend', 'easy',
 'CSS Box Model에 대해 설명해주세요.',
 ARRAY['기본 개념 이해', 'content/padding/border/margin 구분', 'box-sizing 이해'],
 NULL,
 ARRAY['box-sizing: border-box와 content-box의 차이점은요?', '마진 병합(margin collapse)은 언제 발생하나요?']),

('technical', 'frontend', 'easy',
 'JavaScript에서 var, let, const의 차이점을 설명해주세요.',
 ARRAY['스코프 이해', '호이스팅 개념', '재할당/재선언 규칙'],
 NULL,
 ARRAY['Temporal Dead Zone이 무엇인가요?', '실무에서 주로 어떤 것을 사용하시나요?']),

('technical', 'frontend', 'easy',
 'SPA(Single Page Application)와 MPA(Multi Page Application)의 차이점은 무엇인가요?',
 ARRAY['개념 이해', '장단점 인식', '적합한 사용 케이스'],
 NULL,
 ARRAY['SEO 관점에서 SPA의 단점은 어떻게 해결할 수 있나요?']),

-- Frontend - Medium
('technical', 'frontend', 'medium',
 'React Hooks가 도입된 이유와 Class Component와의 차이점을 설명해주세요.',
 ARRAY['훅스 도입 배경', '함수형 컴포넌트 이점', '생명주기 비교'],
 NULL,
 ARRAY['useEffect와 componentDidMount의 차이점은?', '커스텀 훅을 만들어본 경험이 있으신가요?']),

('technical', 'frontend', 'medium',
 '웹 접근성(Web Accessibility)을 개선하기 위해 어떤 노력을 하셨나요?',
 ARRAY['접근성 이해', 'ARIA 활용', '실무 경험'],
 NULL,
 ARRAY['WAI-ARIA에 대해 설명해주세요.', '스크린 리더 테스트를 해보신 적 있으신가요?']),

('technical', 'frontend', 'medium',
 'Next.js의 렌더링 방식(SSR, SSG, ISR)에 대해 설명해주세요.',
 ARRAY['렌더링 방식 이해', '각 방식의 장단점', '적합한 사용 케이스'],
 NULL,
 ARRAY['언제 SSR 대신 SSG를 선택하시나요?', 'ISR의 revalidate 옵션은 어떻게 설정하시나요?']),

-- Frontend - Hard
('technical', 'frontend', 'hard',
 'JavaScript 이벤트 루프와 비동기 처리 메커니즘에 대해 설명해주세요.',
 ARRAY['이벤트 루프 이해', 'Call Stack/Task Queue/Microtask Queue', 'Promise/async-await 동작'],
 NULL,
 ARRAY['setTimeout 0과 Promise.resolve의 실행 순서는?', 'requestAnimationFrame은 어디서 처리되나요?']),

('technical', 'frontend', 'hard',
 'Webpack, Vite 등 번들러의 동작 원리와 최적화 방법을 설명해주세요.',
 ARRAY['번들링 개념', 'Tree Shaking', 'Code Splitting'],
 NULL,
 ARRAY['Vite가 개발 모드에서 빠른 이유는?', 'Dynamic Import를 활용한 경험이 있으신가요?']),

-- ============================================
-- 2. Additional Technical Questions - Backend
-- ============================================

-- Backend - Easy
('technical', 'backend', 'easy',
 'HTTP 상태 코드의 종류와 각각의 의미를 설명해주세요.',
 ARRAY['상태 코드 분류', '주요 코드 이해', '적절한 사용'],
 NULL,
 ARRAY['400과 422의 차이점은?', '실제로 어떤 상태 코드를 가장 많이 사용하시나요?']),

('technical', 'backend', 'easy',
 'SQL에서 JOIN의 종류와 차이점을 설명해주세요.',
 ARRAY['JOIN 종류 이해', '결과 차이', '적절한 사용 케이스'],
 NULL,
 ARRAY['INNER JOIN과 OUTER JOIN은 언제 사용하나요?', 'N+1 문제를 경험하신 적 있나요?']),

-- Backend - Medium
('technical', 'backend', 'medium',
 'JWT(JSON Web Token)의 구조와 인증 흐름을 설명해주세요.',
 ARRAY['JWT 구조 이해', '인증 vs 인가', '보안 고려사항'],
 NULL,
 ARRAY['Refresh Token은 왜 필요한가요?', 'JWT의 단점은 무엇인가요?']),

('technical', 'backend', 'medium',
 '데이터베이스 트랜잭션과 ACID 속성에 대해 설명해주세요.',
 ARRAY['트랜잭션 개념', 'ACID 이해', '격리 수준'],
 NULL,
 ARRAY['Dirty Read, Phantom Read의 차이점은?', '실무에서 트랜잭션 관련 문제를 해결한 경험이 있으신가요?']),

('technical', 'backend', 'medium',
 'Redis를 어떤 용도로 사용해보셨나요?',
 ARRAY['Redis 활용 경험', '데이터 구조 이해', '캐싱 전략'],
 NULL,
 ARRAY['캐시 무효화는 어떻게 처리하셨나요?', 'Redis의 데이터 영속성은 어떻게 보장하나요?']),

-- Backend - Hard
('technical', 'backend', 'hard',
 '분산 시스템에서 데이터 일관성을 유지하는 방법에 대해 설명해주세요.',
 ARRAY['CAP 이론', '일관성 모델', '실제 해결 방안'],
 NULL,
 ARRAY['Eventual Consistency를 적용한 경험이 있으신가요?', 'Saga 패턴에 대해 설명해주세요.']),

('technical', 'backend', 'hard',
 '대용량 데이터 처리를 위한 데이터베이스 샤딩 전략에 대해 설명해주세요.',
 ARRAY['샤딩 개념', '샤딩 키 선택', '실무 경험'],
 NULL,
 ARRAY['샤딩과 파티셔닝의 차이점은?', '샤딩으로 인한 JOIN 문제는 어떻게 해결하나요?']),

-- ============================================
-- 3. Additional Technical Questions - DevOps
-- ============================================

('technical', 'devops', 'easy',
 'Docker와 가상머신(VM)의 차이점을 설명해주세요.',
 ARRAY['컨테이너 개념', '리소스 효율성', '사용 케이스'],
 NULL,
 ARRAY['Docker 이미지와 컨테이너의 차이점은?', 'Dockerfile 작성 경험이 있으신가요?']),

('technical', 'devops', 'medium',
 'Infrastructure as Code(IaC)의 개념과 사용 경험을 말씀해주세요.',
 ARRAY['IaC 개념', '도구 사용 경험', '장점 이해'],
 NULL,
 ARRAY['Terraform과 CloudFormation의 차이점은?', 'IaC 코드 리뷰는 어떻게 하시나요?']),

('technical', 'devops', 'hard',
 '무중단 배포(Zero Downtime Deployment) 전략에 대해 설명해주세요.',
 ARRAY['배포 전략 이해', 'Blue-Green/Canary/Rolling', '실무 경험'],
 NULL,
 ARRAY['데이터베이스 마이그레이션은 어떻게 처리하나요?', '롤백 전략은 어떻게 세우시나요?']),

-- ============================================
-- 4. Additional Technical Questions - Data
-- ============================================

('technical', 'data_engineer', 'easy',
 'ETL과 ELT의 차이점을 설명해주세요.',
 ARRAY['개념 이해', '장단점 비교', '적합한 사용 케이스'],
 NULL,
 ARRAY['어떤 상황에서 ELT를 선택하시나요?']),

('technical', 'data_engineer', 'medium',
 '데이터 레이크와 데이터 웨어하우스의 차이점은 무엇인가요?',
 ARRAY['아키텍처 이해', '데이터 구조 차이', '사용 케이스'],
 NULL,
 ARRAY['Lakehouse 아키텍처에 대해 들어보셨나요?']),

('technical', 'data_scientist', 'medium',
 '편향-분산 트레이드오프(Bias-Variance Tradeoff)에 대해 설명해주세요.',
 ARRAY['개념 이해', '균형 맞추기', '실무 적용'],
 NULL,
 ARRAY['모델 복잡도를 어떻게 조절하시나요?', '앙상블 방법은 이 트레이드오프에 어떤 영향을 미치나요?']),

-- ============================================
-- 5. Additional Technical Questions - Mobile
-- ============================================

('technical', 'mobile', 'medium',
 '모바일 앱의 상태 관리 방법에 대해 설명해주세요.',
 ARRAY['상태 관리 개념', '사용 도구/라이브러리', '실무 경험'],
 NULL,
 ARRAY['전역 상태와 로컬 상태를 어떻게 구분하시나요?', 'React Native에서 주로 어떤 상태 관리 도구를 사용하시나요?']),

('technical', 'mobile', 'hard',
 '모바일 앱 성능 최적화를 위해 어떤 방법을 사용하셨나요?',
 ARRAY['렌더링 최적화', '메모리 관리', '네트워크 최적화'],
 NULL,
 ARRAY['FlatList 최적화 경험이 있으신가요?', '앱 시작 시간을 개선한 경험이 있으신가요?']),

-- ============================================
-- 6. Additional PM/Designer Questions
-- ============================================

('technical', 'pm', 'easy',
 'PRD(Product Requirements Document)에 포함되어야 할 핵심 요소는 무엇인가요?',
 ARRAY['문서 구성 이해', '핵심 요소 파악', '작성 경험'],
 NULL,
 ARRAY['PRD 작성 시 가장 중요하게 생각하는 부분은?']),

('technical', 'pm', 'hard',
 '기능의 우선순위를 정하는 본인만의 프레임워크가 있나요?',
 ARRAY['우선순위 프레임워크', '의사결정 과정', '스테이크홀더 관리'],
 NULL,
 ARRAY['RICE, MoSCoW 등 프레임워크를 활용해보셨나요?', '기술 부채와 신규 기능 사이 균형은 어떻게 맞추시나요?']),

('technical', 'ux_designer', 'easy',
 '디자인 시스템의 필요성과 구성요소에 대해 설명해주세요.',
 ARRAY['디자인 시스템 이해', '구성요소 파악', '구축 경험'],
 NULL,
 ARRAY['디자인 시스템 구축에 참여한 경험이 있으신가요?']),

('technical', 'ux_designer', 'hard',
 '사용성 테스트를 설계하고 진행한 경험을 말씀해주세요.',
 ARRAY['테스트 설계', '진행 방법', '인사이트 도출'],
 NULL,
 ARRAY['테스트 참가자는 어떻게 선정하셨나요?', '테스트 결과를 팀에 어떻게 공유하셨나요?']),

-- ============================================
-- 7. Additional Behavioral Questions
-- ============================================

('behavioral', NULL, 'easy',
 '새로운 기술이나 도구를 학습할 때 어떤 방법을 사용하시나요?',
 ARRAY['학습 방법론', '자기 주도성', '지속적 성장'],
 NULL,
 ARRAY['최근에 학습한 새로운 기술은 무엇인가요?']),

('behavioral', NULL, 'medium',
 '업무 중 스트레스를 받았던 상황과 어떻게 대처했는지 말씀해주세요.',
 ARRAY['스트레스 관리', '문제 해결', '회복력'],
 NULL,
 ARRAY['스트레스 예방을 위해 평소에 어떤 노력을 하시나요?']),

('behavioral', NULL, 'medium',
 '피드백을 받았을 때 어떻게 반응하고 적용하시나요?',
 ARRAY['피드백 수용성', '성장 마인드셋', '구체적 적용'],
 NULL,
 ARRAY['건설적이지 않은 피드백을 받았을 때는 어떻게 하시나요?']),

('behavioral', NULL, 'hard',
 '팀의 의사결정에 동의하지 않았지만 따라야 했던 경험이 있으신가요?',
 ARRAY['조직 적응력', '의견 표현 방식', '팀워크'],
 NULL,
 ARRAY['결과적으로 그 결정은 어떻게 되었나요?', '비슷한 상황이 다시 온다면 다르게 하실 부분이 있나요?']),

-- ============================================
-- 8. Additional Situational Questions
-- ============================================

('situational', NULL, 'easy',
 '처음 해보는 업무를 맡게 되었을 때 어떻게 접근하시겠어요?',
 ARRAY['학습 접근법', '리소스 활용', '문제 해결'],
 NULL,
 ARRAY['도움을 요청하는 것에 대해 어떻게 생각하시나요?']),

('situational', NULL, 'medium',
 '고객(또는 사용자)의 불만 사항을 처리해야 할 때 어떻게 하시겠어요?',
 ARRAY['고객 대응', '문제 해결', '커뮤니케이션'],
 NULL,
 ARRAY['실제로 불만 처리 경험이 있으신가요?']),

('situational', NULL, 'hard',
 '프로젝트 중간에 요구사항이 크게 변경되었습니다. 어떻게 대응하시겠어요?',
 ARRAY['변화 대응', '스테이크홀더 관리', '우선순위 조정'],
 NULL,
 ARRAY['요구사항 변경의 영향을 어떻게 평가하시나요?', '팀원들에게는 어떻게 공유하시겠어요?']),

-- ============================================
-- 9. Additional Culture Fit Questions
-- ============================================

('culture_fit', NULL, 'easy',
 '원격 근무와 사무실 근무 중 어떤 환경을 선호하시나요?',
 ARRAY['업무 스타일', '자기 관리', '협업 방식'],
 NULL,
 ARRAY['원격 근무 시 자기 관리는 어떻게 하시나요?']),

('culture_fit', NULL, 'medium',
 '실패한 프로젝트나 경험에 대해 말씀해주세요.',
 ARRAY['실패 수용', '학습 능력', '성장 마인드셋'],
 NULL,
 ARRAY['그 실패에서 가장 크게 배운 점은 무엇인가요?']),

('culture_fit', NULL, 'hard',
 '회사의 가치와 개인의 가치가 충돌할 때 어떻게 하시겠어요?',
 ARRAY['가치관', '의사결정', '조직 적합성'],
 NULL,
 ARRAY['실제로 그런 상황을 경험하신 적 있으신가요?'])

ON CONFLICT DO NOTHING;

-- ============================================
-- 10. Update question statistics view
-- ============================================

CREATE OR REPLACE VIEW question_statistics AS
SELECT
  category,
  job_type,
  difficulty::TEXT,
  COUNT(*) AS question_count,
  COUNT(*) FILTER (WHERE job_type IS NULL) AS general_questions,
  COUNT(*) FILTER (WHERE job_type IS NOT NULL) AS specific_questions
FROM questions
GROUP BY category, job_type, difficulty
ORDER BY category, job_type NULLS FIRST, difficulty;

GRANT SELECT ON question_statistics TO authenticated;

-- ============================================
-- 11. Function to get random questions for interview
-- ============================================

CREATE OR REPLACE FUNCTION get_random_questions(
  p_job_type TEXT,
  p_difficulty TEXT DEFAULT 'medium',
  p_count INT DEFAULT 10,
  p_categories TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  category TEXT,
  question_text TEXT,
  evaluation_points TEXT[],
  follow_ups TEXT[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH categorized AS (
    SELECT
      q.id,
      q.category,
      q.question_text,
      q.evaluation_points,
      q.follow_ups,
      ROW_NUMBER() OVER (
        PARTITION BY q.category
        ORDER BY RANDOM()
      ) AS rn
    FROM questions q
    WHERE (q.job_type IS NULL OR q.job_type = p_job_type)
      AND q.difficulty::TEXT = p_difficulty
      AND (p_categories IS NULL OR q.category = ANY(p_categories))
  )
  SELECT
    c.id,
    c.category,
    c.question_text,
    c.evaluation_points,
    c.follow_ups
  FROM categorized c
  WHERE c.rn <= 2  -- Max 2 per category for variety
  ORDER BY RANDOM()
  LIMIT p_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_random_questions(TEXT, TEXT, INT, TEXT[]) TO authenticated;

COMMENT ON FUNCTION get_random_questions IS 'Get random interview questions with category distribution';
