export const PLANS = [
  {
    id: "seed",
    name: "Seed",
    description: "AI 면접의 감각을 익히는 첫걸음",
    price: {
      monthly: "무료",
      annual: "무료",
    },
    features: [
      "기본 AI 면접관 1명 (Rule-based)",
      "일일 면접 연습 3회 제한",
      "기본 STT (음성 인식) 지원",
      "간단한 피드백 리포트",
      "커뮤니티 접근 권한"
    ],
    isPopular: false,
    buttonText: "무료로 시작하기"
  },
  {
    id: "bloom",
    name: "Bloom",
    description: "무제한 코칭으로 완성하는 나의 필승 전략",
    price: {
      monthly: "₩19,000",
      annual: "₩15,200", // 20% off
    },
    features: [
      "3인의 AI 면접관 (Persona 기반)",
      "무제한 면접 연습",
      "실시간 감정/발화 습관 분석",
      "GPT-4 기반 심층 피드백",
      "나만의 예상 질문 생성기",
      "지난 모의면접 다시보기 (녹음 저장)"
    ],
    isPopular: true,
    buttonText: "지금 시작하기"
  },
  {
    id: "forest",
    name: "Forest",
    description: "조직의 인재 밀도를 높이는 채용 솔루션",
    price: {
      monthly: "문의",
      annual: "문의",
    },
    features: [
      "기업 전용 커스텀 면접관 생성",
      "지원자 대량 관리 대시보드",
      "API 연동 지원 (HR 시스템)",
      "조직별 역량 평가 모델링",
      "SSO & 엔터프라이즈 보안",
      "전담 석세스 매니저 배정"
    ],
    isPopular: false,
    buttonText: "도입 문의하기"
  }
];
