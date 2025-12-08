-- ============================================
-- IMSAM AI Interview Service - Seed Data
-- ============================================
-- Run: npm run db:seed (after supabase link)

-- ============================================
-- Job Categories (직무 카테고리)
-- ============================================
CREATE TABLE IF NOT EXISTS job_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name_ko TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO job_categories (code, name_ko, name_en, description, icon, sort_order) VALUES
-- 개발 직군
('frontend', '프론트엔드 개발자', 'Frontend Developer', 'React, Vue, Angular 등 웹 프론트엔드 개발', '🖥️', 1),
('backend', '백엔드 개발자', 'Backend Developer', 'Node.js, Java, Python 등 서버 개발', '⚙️', 2),
('fullstack', '풀스택 개발자', 'Fullstack Developer', '프론트엔드와 백엔드 전반 개발', '🔧', 3),
('mobile', '모바일 개발자', 'Mobile Developer', 'iOS, Android, React Native, Flutter 앱 개발', '📱', 4),
('devops', 'DevOps 엔지니어', 'DevOps Engineer', 'CI/CD, 인프라, 클라우드 운영', '☁️', 5),
('data_engineer', '데이터 엔지니어', 'Data Engineer', '데이터 파이프라인, ETL, 데이터 인프라', '🗄️', 6),
('ml_engineer', 'ML 엔지니어', 'ML Engineer', '머신러닝 모델 개발 및 배포', '🤖', 7),
('security', '보안 엔지니어', 'Security Engineer', '정보보안, 취약점 분석, 보안 아키텍처', '🔒', 8),
('qa', 'QA 엔지니어', 'QA Engineer', '테스트 자동화, 품질 관리', '✅', 9),
('embedded', '임베디드 개발자', 'Embedded Developer', 'IoT, 펌웨어, 하드웨어 연동 개발', '🔌', 10),

-- 데이터/AI 직군
('data_scientist', '데이터 사이언티스트', 'Data Scientist', '데이터 분석, 통계 모델링, 인사이트 도출', '📊', 11),
('data_analyst', '데이터 분석가', 'Data Analyst', '비즈니스 데이터 분석, 대시보드 구축', '📈', 12),
('ai_researcher', 'AI 리서처', 'AI Researcher', 'AI/ML 연구 및 논문 작성', '🔬', 13),

-- 기획/디자인 직군
('pm', '프로덕트 매니저', 'Product Manager', '제품 기획, 로드맵 관리, 이해관계자 조율', '📋', 14),
('po', '프로덕트 오너', 'Product Owner', '애자일 환경에서의 제품 책임자', '🎯', 15),
('ux_designer', 'UX 디자이너', 'UX Designer', '사용자 경험 설계, 리서치, 와이어프레임', '🎨', 16),
('ui_designer', 'UI 디자이너', 'UI Designer', '인터페이스 디자인, 디자인 시스템', '✨', 17),
('service_planner', '서비스 기획자', 'Service Planner', '서비스 기획, 정책 수립, 운영 개선', '💡', 18),

-- 마케팅/비즈니스 직군
('growth_marketer', '그로스 마케터', 'Growth Marketer', '퍼포먼스 마케팅, 그로스 해킹', '📢', 19),
('content_marketer', '콘텐츠 마케터', 'Content Marketer', '콘텐츠 기획 및 제작, SNS 운영', '✍️', 20),
('sales', '세일즈', 'Sales', 'B2B/B2C 영업, 고객 관계 관리', '🤝', 21),
('business_dev', '사업개발', 'Business Development', '신규 사업 기획, 파트너십', '🚀', 22),

-- 기타 직군
('hr', 'HR 담당자', 'HR Manager', '채용, 인사관리, 조직문화', '👥', 23),
('finance', '재무/회계', 'Finance', '재무관리, 회계, 투자 분석', '💰', 24),
('legal', '법무', 'Legal', '계약 검토, 법률 자문, 컴플라이언스', '⚖️', 25),
('customer_success', '고객성공', 'Customer Success', '고객 온보딩, 리텐션, 만족도 관리', '💬', 26)
ON CONFLICT (code) DO UPDATE SET
  name_ko = EXCLUDED.name_ko,
  name_en = EXCLUDED.name_en,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order;

-- ============================================
-- Industries (산업 분야)
-- ============================================
CREATE TABLE IF NOT EXISTS industries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name_ko TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO industries (code, name_ko, name_en, description, icon, sort_order) VALUES
('tech', 'IT/테크', 'IT/Tech', '소프트웨어, 플랫폼, SaaS 기업', '💻', 1),
('finance', '금융/핀테크', 'Finance/Fintech', '은행, 증권, 핀테크 스타트업', '🏦', 2),
('ecommerce', '이커머스', 'E-commerce', '온라인 쇼핑, 리테일 플랫폼', '🛒', 3),
('healthcare', '헬스케어/바이오', 'Healthcare/Bio', '의료, 제약, 바이오테크', '🏥', 4),
('education', '에듀테크', 'EdTech', '온라인 교육, 학습 플랫폼', '📚', 5),
('game', '게임', 'Gaming', '게임 개발, 퍼블리싱', '🎮', 6),
('media', '미디어/엔터', 'Media/Entertainment', '콘텐츠, 스트리밍, 엔터테인먼트', '🎬', 7),
('logistics', '물류/유통', 'Logistics', '물류, 배송, 공급망 관리', '🚚', 8),
('mobility', '모빌리티', 'Mobility', '자동차, 자율주행, 공유 모빌리티', '🚗', 9),
('realestate', '부동산/프롭테크', 'Real Estate/PropTech', '부동산, 건설, 프롭테크', '🏢', 10),
('travel', '여행/호스피탈리티', 'Travel/Hospitality', '여행, 숙박, 관광', '✈️', 11),
('food', 'F&B/푸드테크', 'F&B/FoodTech', '외식, 식품, 배달 서비스', '🍽️', 12),
('manufacturing', '제조업', 'Manufacturing', '제조, 스마트팩토리', '🏭', 13),
('energy', '에너지/환경', 'Energy/CleanTech', '에너지, 친환경, 클린테크', '⚡', 14),
('consulting', '컨설팅', 'Consulting', '경영 컨설팅, IT 컨설팅', '💼', 15),
('agency', '에이전시', 'Agency', '광고, 마케팅, 디자인 에이전시', '🎯', 16),
('startup', '스타트업', 'Startup', '초기/성장 단계 스타트업', '🌱', 17),
('enterprise', '대기업', 'Enterprise', '대기업, 중견기업', '🏛️', 18)
ON CONFLICT (code) DO UPDATE SET
  name_ko = EXCLUDED.name_ko,
  name_en = EXCLUDED.name_en,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order;

-- ============================================
-- Question Categories (질문 카테고리)
-- ============================================
CREATE TABLE IF NOT EXISTS question_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name_ko TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description TEXT,
  weight NUMERIC(3,2) DEFAULT 1.0,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO question_categories (code, name_ko, name_en, description, weight, sort_order) VALUES
('self_introduction', '자기소개', 'Self Introduction', '지원자 소개 및 경력 요약', 0.10, 1),
('motivation', '지원동기', 'Motivation', '회사/직무 지원 동기', 0.15, 2),
('experience', '경험/경력', 'Experience', '과거 업무 경험 및 프로젝트', 0.20, 3),
('technical', '기술 질문', 'Technical', '직무 관련 기술 역량 평가', 0.20, 4),
('behavioral', '행동 질문', 'Behavioral', '과거 행동 기반 역량 평가 (STAR)', 0.15, 5),
('situational', '상황 질문', 'Situational', '가상 상황 대처 능력 평가', 0.10, 6),
('culture_fit', '조직 적합성', 'Culture Fit', '회사 문화 적합성 평가', 0.05, 7),
('closing', '마무리', 'Closing', '질문 및 마무리 인사', 0.05, 8)
ON CONFLICT (code) DO UPDATE SET
  name_ko = EXCLUDED.name_ko,
  description = EXCLUDED.description,
  weight = EXCLUDED.weight;

-- ============================================
-- Extended Question Bank (확장 질문 은행)
-- ============================================
-- Clear existing questions and re-insert
TRUNCATE TABLE questions CASCADE;

INSERT INTO questions (category, job_type, difficulty, question_text, evaluation_points, sample_answer, follow_ups) VALUES

-- ============================================
-- 자기소개 (Self Introduction)
-- ============================================
('self_introduction', NULL, 'easy',
 '간단하게 자기소개 부탁드립니다.',
 ARRAY['명확한 소개', '관련 경험 언급', '지원 동기 연결'],
 NULL,
 ARRAY['어떤 계기로 이 분야에 관심을 갖게 되셨나요?', '본인만의 강점은 무엇인가요?']),

('self_introduction', NULL, 'medium',
 '1분 동안 본인을 소개해주세요. 특히 이 포지션과 관련된 경험을 중심으로 말씀해주세요.',
 ARRAY['시간 관리', '핵심 역량 강조', '직무 연관성'],
 NULL,
 ARRAY['말씀하신 경험 중 가장 자신있는 부분은요?']),

('self_introduction', NULL, 'medium',
 '본인의 강점과 그것이 이 포지션에 어떻게 도움이 될지 설명해주세요.',
 ARRAY['자기 인식', '직무 이해', '구체적 예시'],
 NULL,
 ARRAY['반대로 본인의 약점은 무엇이라고 생각하시나요?', '그 약점을 보완하기 위해 어떤 노력을 하고 계신가요?']),

-- ============================================
-- 지원동기 (Motivation)
-- ============================================
('motivation', NULL, 'easy',
 '왜 저희 회사에 지원하셨나요?',
 ARRAY['회사 이해', '동기 진정성', '비전 연결'],
 NULL,
 ARRAY['저희 회사에 대해 어떻게 알게 되셨나요?', '다른 회사도 지원하셨나요?']),

('motivation', NULL, 'medium',
 '이 직무를 선택한 이유와 5년 후 본인의 모습을 말씀해주세요.',
 ARRAY['커리어 비전', '성장 의지', '직무 이해'],
 NULL,
 ARRAY['그 목표를 달성하기 위해 구체적으로 어떤 준비를 하고 계신가요?']),

('motivation', NULL, 'hard',
 '현재 재직 중이신데, 이직을 결심하게 된 결정적인 이유는 무엇인가요?',
 ARRAY['이직 동기', '진정성', '성장 욕구'],
 NULL,
 ARRAY['현 회사에서는 해결할 수 없는 부분인가요?']),

-- ============================================
-- 기술 질문 (Technical) - Frontend
-- ============================================
('technical', 'frontend', 'easy',
 '가장 자신있는 프론트엔드 기술 스택과 그 이유를 설명해주세요.',
 ARRAY['기술 이해도', '실무 경험', '선택 이유'],
 NULL,
 ARRAY['해당 기술의 단점은 무엇이라고 생각하시나요?']),

('technical', 'frontend', 'medium',
 'React의 Virtual DOM이 무엇이고, 어떻게 성능을 개선하는지 설명해주세요.',
 ARRAY['핵심 개념 이해', '동작 원리', '성능 최적화'],
 NULL,
 ARRAY['실제로 React 성능 최적화를 경험한 적 있으신가요?', 'useMemo와 useCallback은 언제 사용하시나요?']),

('technical', 'frontend', 'hard',
 '대규모 프론트엔드 애플리케이션의 상태 관리 전략에 대해 설명해주세요.',
 ARRAY['아키텍처 이해', '트레이드오프', '실무 경험'],
 NULL,
 ARRAY['Redux, Recoil, Zustand 중 선호하는 것과 이유는?', '서버 상태와 클라이언트 상태를 어떻게 구분하시나요?']),

('technical', 'frontend', 'hard',
 '웹 성능 최적화를 위해 어떤 방법들을 사용해보셨나요?',
 ARRAY['Core Web Vitals 이해', '최적화 기법', '측정 경험'],
 NULL,
 ARRAY['LCP, FID, CLS 각각을 개선하기 위한 방법은?', 'Bundle size 최적화 경험이 있으신가요?']),

-- ============================================
-- 기술 질문 (Technical) - Backend
-- ============================================
('technical', 'backend', 'easy',
 'REST API와 GraphQL의 차이점에 대해 설명해주세요.',
 ARRAY['개념 이해', '장단점 인식', '사용 경험'],
 NULL,
 ARRAY['어떤 상황에서 GraphQL을 선택하시겠어요?']),

('technical', 'backend', 'medium',
 '데이터베이스 인덱스가 무엇이고, 언제 사용해야 하는지 설명해주세요.',
 ARRAY['인덱스 원리', '적용 기준', '트레이드오프'],
 NULL,
 ARRAY['복합 인덱스는 언제 사용하나요?', '인덱스로 인한 성능 저하 경험이 있으신가요?']),

('technical', 'backend', 'hard',
 '마이크로서비스 아키텍처의 장단점과 도입 시 고려해야 할 점을 설명해주세요.',
 ARRAY['아키텍처 이해', '트레이드오프', '실무 적용'],
 NULL,
 ARRAY['서비스 간 통신은 어떤 방식을 선호하시나요?', '분산 트랜잭션은 어떻게 처리하시겠어요?']),

('technical', 'backend', 'hard',
 '대용량 트래픽을 처리하기 위한 시스템 설계 경험이 있으신가요?',
 ARRAY['스케일링 이해', '캐싱 전략', '실무 경험'],
 NULL,
 ARRAY['구체적으로 어떤 병목 현상이 있었고 어떻게 해결하셨나요?', '캐시 무효화 전략은 어떻게 설계하셨나요?']),

-- ============================================
-- 기술 질문 (Technical) - DevOps
-- ============================================
('technical', 'devops', 'medium',
 'CI/CD 파이프라인을 구축한 경험에 대해 설명해주세요.',
 ARRAY['도구 이해', '프로세스 설계', '자동화 경험'],
 NULL,
 ARRAY['배포 실패 시 롤백은 어떻게 처리하셨나요?', '테스트 자동화는 어떻게 구성하셨나요?']),

('technical', 'devops', 'hard',
 'Kubernetes 운영 경험과 주요 컴포넌트에 대해 설명해주세요.',
 ARRAY['K8s 이해', '운영 경험', '트러블슈팅'],
 NULL,
 ARRAY['Pod 스케줄링 실패 시 어떻게 디버깅하시나요?', 'HPA 설정은 어떤 기준으로 하시나요?']),

-- ============================================
-- 기술 질문 (Technical) - Data
-- ============================================
('technical', 'data_engineer', 'medium',
 '데이터 파이프라인을 설계할 때 고려해야 할 점들을 설명해주세요.',
 ARRAY['ETL 이해', '확장성', '모니터링'],
 NULL,
 ARRAY['데이터 품질은 어떻게 보장하시나요?', '파이프라인 장애 시 대응 방안은요?']),

('technical', 'data_scientist', 'hard',
 '머신러닝 모델의 과적합을 방지하기 위한 방법들을 설명해주세요.',
 ARRAY['개념 이해', '기법 적용', '실무 경험'],
 NULL,
 ARRAY['Cross-validation은 어떤 경우에 사용하시나요?', '실제로 과적합 문제를 해결한 경험이 있으신가요?']),

-- ============================================
-- 기술 질문 (Technical) - PM/Designer
-- ============================================
('technical', 'pm', 'medium',
 '제품의 성공을 측정하기 위해 어떤 지표들을 사용하시나요?',
 ARRAY['지표 이해', '데이터 기반 사고', '우선순위'],
 NULL,
 ARRAY['North Star Metric은 어떻게 정하시나요?', '지표 개선을 위한 A/B 테스트 경험이 있으신가요?']),

('technical', 'ux_designer', 'medium',
 '사용자 리서치를 어떻게 진행하시고, 결과를 디자인에 어떻게 반영하시나요?',
 ARRAY['리서치 방법론', '인사이트 도출', '의사결정'],
 NULL,
 ARRAY['정량적 리서치와 정성적 리서치를 어떻게 조합하시나요?']),

-- ============================================
-- 행동 질문 (Behavioral)
-- ============================================
('behavioral', NULL, 'easy',
 '팀 프로젝트에서 본인의 역할은 주로 어떤 편인가요?',
 ARRAY['팀워크', '자기 인식', '협업 능력'],
 NULL,
 ARRAY['팀원과 의견 충돌이 있었던 경험은요?', '그때 어떻게 해결하셨나요?']),

('behavioral', NULL, 'medium',
 '가장 도전적이었던 프로젝트와 어떻게 극복했는지 말씀해주세요.',
 ARRAY['문제 해결 과정', '끈기', '학습 능력'],
 NULL,
 ARRAY['그 경험에서 가장 크게 배운 점은 무엇인가요?', '다시 한다면 다르게 하실 부분이 있나요?']),

('behavioral', NULL, 'medium',
 '업무 중 실수를 했던 경험과 어떻게 대처했는지 말씀해주세요.',
 ARRAY['책임감', '문제 해결', '성장 마인드'],
 NULL,
 ARRAY['그 실수를 방지하기 위해 어떤 조치를 취하셨나요?']),

('behavioral', NULL, 'hard',
 '프로젝트 일정이 촉박한 상황에서 팀원이 업무를 제대로 수행하지 못할 때 어떻게 대처하시나요?',
 ARRAY['리더십', '커뮤니케이션', '문제 해결'],
 NULL,
 ARRAY['실제로 그런 상황을 경험하셨다면 구체적으로 말씀해주세요.']),

('behavioral', NULL, 'hard',
 '상사나 동료와 심하게 의견이 충돌했던 경험이 있으신가요?',
 ARRAY['갈등 해결', '커뮤니케이션', '협상 능력'],
 NULL,
 ARRAY['결과적으로 어떻게 해결되었나요?', '그 경험에서 배운 점은요?']),

-- ============================================
-- 상황 질문 (Situational)
-- ============================================
('situational', NULL, 'medium',
 '만약 상사가 기술적으로 잘못된 결정을 내렸다면 어떻게 하시겠어요?',
 ARRAY['커뮤니케이션', '문제 해결', '조직 이해'],
 NULL,
 ARRAY['실제로 비슷한 상황을 경험하신 적 있으신가요?']),

('situational', NULL, 'medium',
 '동시에 여러 개의 급한 업무가 주어졌을 때 어떻게 우선순위를 정하시나요?',
 ARRAY['우선순위 설정', '시간 관리', '의사결정'],
 NULL,
 ARRAY['실제로 그런 상황에서 어떻게 하셨나요?']),

('situational', NULL, 'hard',
 '새로운 기술을 도입하자는 제안이 팀 내에서 반대에 부딪혔을 때 어떻게 하시겠어요?',
 ARRAY['설득력', '협업', '기술 판단'],
 NULL,
 ARRAY['실제로 기술 도입을 주도한 경험이 있으신가요?']),

('situational', NULL, 'hard',
 '출시 직전에 심각한 버그가 발견되었습니다. 어떻게 대응하시겠어요?',
 ARRAY['위기 대응', '의사결정', '커뮤니케이션'],
 NULL,
 ARRAY['실제로 비슷한 상황을 경험하셨나요?']),

-- ============================================
-- 조직 적합성 (Culture Fit)
-- ============================================
('culture_fit', NULL, 'easy',
 '어떤 환경에서 일할 때 가장 효율적으로 일할 수 있나요?',
 ARRAY['자기 이해', '업무 스타일', '환경 적합성'],
 NULL,
 ARRAY['반대로 가장 힘들었던 업무 환경은요?']),

('culture_fit', NULL, 'medium',
 '이상적인 팀 문화는 어떤 것이라고 생각하시나요?',
 ARRAY['팀워크 이해', '가치관', '문화 적합성'],
 NULL,
 ARRAY['그런 문화를 만들기 위해 본인이 기여할 수 있는 부분은요?']),

('culture_fit', NULL, 'medium',
 '업무 시간 외에 자기 계발을 위해 어떤 활동을 하시나요?',
 ARRAY['성장 의지', '학습 방법', '열정'],
 NULL,
 ARRAY['최근에 공부하고 있는 것이 있으신가요?']),

-- ============================================
-- 마무리 (Closing)
-- ============================================
('closing', NULL, 'easy',
 '마지막으로 저희에게 하고 싶은 질문이 있으신가요?',
 ARRAY['관심도', '준비성', '적극성'],
 NULL,
 ARRAY[]::TEXT[]),

('closing', NULL, 'easy',
 '마지막으로 어필하고 싶은 부분이 있다면 말씀해주세요.',
 ARRAY['자기 어필', '핵심 강점', '열정'],
 NULL,
 ARRAY[]::TEXT[]);

-- ============================================
-- Interviewer Personas (면접관 페르소나)
-- ============================================
CREATE TABLE IF NOT EXISTS interviewer_personas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  emoji TEXT NOT NULL,
  personality TEXT,
  tone TEXT[],
  focus_areas TEXT[],
  evaluation_criteria TEXT[],
  system_prompt TEXT NOT NULL,
  base_probability NUMERIC(3,2) DEFAULT 0.33,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO interviewer_personas (id, name, role, emoji, personality, tone, focus_areas, evaluation_criteria, system_prompt, base_probability) VALUES
('hiring_manager', '김기술', '실무팀장', '👨‍💼', 'ENTJ',
 ARRAY['전문적', '논리적', '직접적'],
 ARRAY['기술 역량', '문제해결 능력', '시스템 설계'],
 ARRAY['기술 깊이', '구현 경험', '아키텍처 이해'],
 '당신은 IT 기업의 실무팀장 ''김기술''입니다.
기술적 역량과 문제해결 능력을 평가합니다.
- 구체적인 기술 스택과 구현 경험을 물어봅니다
- 시스템 설계와 아키텍처에 대한 이해도를 확인합니다
- 트레이드오프와 기술 선택 이유를 질문합니다
- 디버깅 경험과 문제해결 과정을 물어봅니다

답변 스타일:
- 전문적이고 논리적으로 질문
- 기술적 깊이를 파악하는 꼬리질문
- 1-2문장의 간결한 질문',
 0.40),

('hr_manager', '박인사', 'HR 담당자', '👩‍💻', 'ENFJ',
 ARRAY['따뜻함', '배려', '날카로움'],
 ARRAY['커뮤니케이션', '팀워크', '조직 적합성'],
 ARRAY['협업 경험', '갈등 해결', '성장 의지'],
 '당신은 IT 기업의 HR 담당자 ''박인사''입니다.
커뮤니케이션 능력과 조직 적합성을 평가합니다.
- 팀워크와 협업 경험을 물어봅니다
- 갈등 해결과 커뮤니케이션 방식을 확인합니다
- 회사 문화 적합성과 성장 의지를 파악합니다
- 장단점과 자기 인식을 질문합니다

답변 스타일:
- 따뜻하지만 날카로운 질문
- 행동 기반 질문 (STAR 기법)
- 1-2문장의 자연스러운 질문',
 0.20),

('senior_peer', '이시니어', '시니어 동료', '👨‍🔬', 'INTP',
 ARRAY['친근함', '전문성', '호기심'],
 ARRAY['실무 역량', '협업 방식', '학습 능력'],
 ARRAY['프로젝트 기여', '코드 품질', '성장 가능성'],
 '당신은 IT 기업의 시니어 개발자 ''이시니어''입니다.
실무 역량과 동료로서의 적합성을 평가합니다.
- 실제 프로젝트 경험과 기여도를 물어봅니다
- 코드 리뷰와 협업 방식을 확인합니다
- 학습 능력과 성장 가능성을 파악합니다
- 동료로서 함께 일하고 싶은지 판단합니다

답변 스타일:
- 친근하지만 전문적인 질문
- 실무 경험 중심의 구체적 질문
- 1-2문장의 대화체 질문',
 0.40)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  system_prompt = EXCLUDED.system_prompt,
  base_probability = EXCLUDED.base_probability;

-- ============================================
-- Competency Definitions (역량 정의)
-- ============================================
CREATE TABLE IF NOT EXISTS competencies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name_ko TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description TEXT,
  evaluation_criteria TEXT[],
  weight NUMERIC(3,2) DEFAULT 1.0,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO competencies (code, name_ko, name_en, description, evaluation_criteria, weight, sort_order) VALUES
('behavioral', '행동 역량', 'Behavioral Competency', '과거 행동 기반 역량 평가',
 ARRAY['구체적 경험 제시', 'STAR 기법 활용', '결과 중심 서술'], 1.0, 1),
('clarity', '명확성', 'Clarity', '의사 전달의 명확성과 구조화',
 ARRAY['논리적 구조', '핵심 전달', '간결한 표현'], 1.0, 2),
('comprehension', '이해력', 'Comprehension', '질문 이해 및 맥락 파악 능력',
 ARRAY['질문 의도 파악', '맥락 이해', '적절한 응답'], 1.0, 3),
('communication', '커뮤니케이션', 'Communication', '효과적인 의사소통 능력',
 ARRAY['경청', '공감', '설득력'], 1.0, 4),
('reasoning', '논리적 사고', 'Reasoning', '논리적 분석 및 추론 능력',
 ARRAY['인과관계 분석', '체계적 접근', '근거 기반'], 1.0, 5),
('problem_solving', '문제 해결', 'Problem Solving', '문제 인식 및 해결 능력',
 ARRAY['문제 정의', '해결책 도출', '실행력'], 1.0, 6),
('leadership', '리더십', 'Leadership', '팀 리딩 및 영향력 발휘 능력',
 ARRAY['방향 제시', '동기 부여', '책임감'], 0.8, 7),
('adaptability', '적응력', 'Adaptability', '변화 대응 및 유연성',
 ARRAY['변화 수용', '학습 민첩성', '스트레스 관리'], 0.8, 8)
ON CONFLICT (code) DO UPDATE SET
  name_ko = EXCLUDED.name_ko,
  description = EXCLUDED.description,
  evaluation_criteria = EXCLUDED.evaluation_criteria;

-- ============================================
-- Enable RLS for new tables
-- ============================================
ALTER TABLE job_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviewer_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE competencies ENABLE ROW LEVEL SECURITY;

-- Public read access for reference tables
CREATE POLICY "Anyone can read job_categories" ON job_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can read industries" ON industries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can read question_categories" ON question_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can read interviewer_personas" ON interviewer_personas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can read competencies" ON competencies FOR SELECT TO authenticated USING (true);

-- Grant permissions
GRANT SELECT ON job_categories TO authenticated;
GRANT SELECT ON industries TO authenticated;
GRANT SELECT ON question_categories TO authenticated;
GRANT SELECT ON interviewer_personas TO authenticated;
GRANT SELECT ON competencies TO authenticated;

-- ============================================
-- Done!
-- ============================================
