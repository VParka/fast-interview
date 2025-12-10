// ============================================
// IMSAM AI Interview Service - Core Types
// ============================================

// Interview Session
export interface InterviewSession {
  id: string;
  user_id: string;
  job_type: string;
  industry: string;
  difficulty: 'easy' | 'medium' | 'hard';
  resume_doc_id?: string;
  company_doc_ids?: string[];
  status: 'waiting' | 'active' | 'paused' | 'completed';
  turn_count: number;
  max_turns: number;
  timer_config: AnswerTimerConfig;
  current_interviewer_id?: string;
  created_at: string;
  updated_at: string;
}

// Answer Timer Configuration
export interface AnswerTimerConfig {
  default_time_limit: number;   // seconds (default: 120)
  warning_threshold: number;    // seconds (default: 30)
  auto_submit_on_timeout: boolean;
}

// Interviewer Persona
export type InterviewerType = 'hiring_manager' | 'hr_manager' | 'senior_peer';

// 16 MBTI types for random selection
export const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
] as const;

export type MBTIType = typeof MBTI_TYPES[number];

// MBTI personality traits for prompt generation
export const MBTI_TRAITS: Record<MBTIType, { style: string; approach: string }> = {
  INTJ: { style: '전략적이고 분석적', approach: '체계적으로 질문하며 장기적 비전을 확인' },
  INTP: { style: '논리적이고 호기심 많은', approach: '원리를 깊이 파고들며 창의적 해결책을 탐색' },
  ENTJ: { style: '결단력 있고 직접적', approach: '효율적으로 핵심을 파악하며 리더십을 평가' },
  ENTP: { style: '도전적이고 혁신적', approach: '다양한 관점에서 질문하며 유연한 사고를 확인' },
  INFJ: { style: '통찰력 있고 이상적', approach: '깊은 의미와 동기를 탐색하며 진정성을 파악' },
  INFP: { style: '공감적이고 이상주의적', approach: '가치관과 열정을 확인하며 성장 가능성을 탐색' },
  ENFJ: { style: '따뜻하고 영향력 있는', approach: '잠재력을 끌어내며 조직 적합성을 평가' },
  ENFP: { style: '열정적이고 창의적', approach: '가능성을 탐색하며 혁신적 사고를 확인' },
  ISTJ: { style: '신중하고 체계적', approach: '구체적 사실과 경험을 꼼꼼히 확인' },
  ISFJ: { style: '세심하고 헌신적', approach: '팀 기여와 책임감을 섬세하게 파악' },
  ESTJ: { style: '조직적이고 실용적', approach: '명확한 기준으로 역량과 성과를 평가' },
  ESFJ: { style: '협력적이고 배려하는', approach: '팀워크와 대인관계 능력을 중점적으로 확인' },
  ISTP: { style: '실용적이고 분석적', approach: '실제 기술 적용과 문제해결 과정을 탐색' },
  ISFP: { style: '유연하고 관찰력 있는', approach: '개인의 가치와 적응력을 조용히 파악' },
  ESTP: { style: '에너지 넘치고 실용적', approach: '즉각적 대응력과 실행력을 활발하게 테스트' },
  ESFP: { style: '활발하고 사교적', approach: '즐거운 분위기에서 소통 능력을 자연스럽게 확인' },
};

export interface InterviewerBase {
  id: string;
  type: InterviewerType;
  name: string;
  role: string;
  emoji: string;
  base_probability: number;
  tone: string[];
  focus_areas: string[];
  evaluation_criteria: string[];
  // Dynamic: generated at runtime
  personality?: MBTIType;
}

// Role-specific traits that are ALWAYS present regardless of industry/job
export interface RoleSpecificTraits {
  core_responsibility: string;
  unique_perspective: string;
  question_style: string;
  follow_up_patterns: string[];
  evaluation_focus: string[];
}

export const ROLE_SPECIFIC_TRAITS: Record<InterviewerType, RoleSpecificTraits> = {
  hiring_manager: {
    core_responsibility: '팀에 합류할 인재의 실무 역량과 즉각적인 기여 가능성 평가',
    unique_perspective: '이 사람이 팀에 들어오면 바로 성과를 낼 수 있을까?',
    question_style: '직접적이고 핵심을 찌르는 질문, 기술 용어를 정확하게 사용',
    follow_up_patterns: [
      '그 방법을 선택한 구체적인 이유가 있나요?',
      '다른 대안은 고려해보셨나요? 왜 그 방법이 최선이었죠?',
      '그 성과를 수치로 말씀해주실 수 있나요?',
      '본인이 직접 구현한 부분은 정확히 어디까지인가요?',
      '그 기술의 장단점은 뭐라고 생각하세요?',
    ],
    evaluation_focus: ['기술 깊이', '문제해결 과정', '의사결정 능력', '트레이드오프 이해'],
  },
  hr_manager: {
    core_responsibility: '조직 문화 적합성과 장기적 성장 가능성 평가',
    unique_perspective: '이 사람이 조직에 잘 적응하고 함께 성장할 수 있을까?',
    question_style: '따뜻하게 시작하지만 핵심을 놓치지 않음, STAR 기법 활용',
    follow_up_patterns: [
      '상대방의 입장은 어떠했나요? 그분은 결과에 만족하셨나요?',
      '팀원들의 반응은 어땠나요?',
      '그 경험이 이후에 어떻게 도움이 되었나요?',
      '조금 더 구체적인 예시를 들어주실 수 있나요?',
      '그때 다르게 했다면 어떻게 하셨을까요?',
    ],
    evaluation_focus: ['자기 객관화', '성장 마인드셋', '감정 지능', '갈등 해결 능력'],
  },
  senior_peer: {
    core_responsibility: '실제로 함께 일할 동료로서의 협업 적합성 평가',
    unique_perspective: '이 사람과 같이 코드 리뷰하고 페어 프로그래밍하면 어떨까?',
    question_style: '친근하고 대화체, 동료처럼 편하게 대화하며 실력 확인',
    follow_up_patterns: [
      '아 그거 저도 써봤는데, 혹시 그 부분은 어떻게 처리하셨어요?',
      '재밌네요! 그런데 그 부분은 어떻게 구현하셨어요?',
      '오, 저도 비슷한 경험이 있는데... 그때 어떻게 해결하셨어요?',
      '요즘 그쪽 분야 핫하죠. 혹시 관련 기술도 살펴보셨어요?',
      '그 부분 더 듣고 싶어요. 구체적으로 설명해주실 수 있나요?',
    ],
    evaluation_focus: ['기술 호기심', '코드에 대한 책임감', '학습 의지', '열린 자세'],
  },
};

// Base interviewer config (without dynamic fields like MBTI and industry-specific prompts)
export const INTERVIEWER_BASE: Record<InterviewerType, InterviewerBase> = {
  hiring_manager: {
    id: 'hiring_manager',
    type: 'hiring_manager',
    name: '실무팀장',
    role: '실무팀장',
    emoji: '👨‍💼',
    base_probability: 0.4,
    tone: ['전문적', '논리적', '직접적'],
    focus_areas: ['직무 역량', '문제해결 능력', '업무 설계'],
    evaluation_criteria: ['전문성 깊이', '실무 경험', '업무 이해도'],
  },
  hr_manager: {
    id: 'hr_manager',
    type: 'hr_manager',
    name: 'HR 담당자',
    role: 'HR 담당자',
    emoji: '👩‍💼',
    base_probability: 0.2,
    tone: ['따뜻함', '배려', '통찰력'],
    focus_areas: ['커뮤니케이션', '팀워크', '조직 적합성'],
    evaluation_criteria: ['협업 경험', '갈등 해결', '성장 의지'],
  },
  senior_peer: {
    id: 'senior_peer',
    type: 'senior_peer',
    name: '시니어 동료',
    role: '시니어 동료',
    emoji: '👨‍🔬',
    base_probability: 0.4,
    tone: ['친근함', '전문성', '호기심'],
    focus_areas: ['실무 역량', '협업 방식', '학습 능력'],
    evaluation_criteria: ['업무 기여', '품질 의식', '성장 가능성'],
  },
};

// Dynamic system prompt builder
export function buildInterviewerSystemPrompt(
  interviewerType: InterviewerType,
  mbti: MBTIType,
  industry: string,
  jobType: string,
  interviewerName?: string
): string {
  const base = INTERVIEWER_BASE[interviewerType];
  const traits = ROLE_SPECIFIC_TRAITS[interviewerType];
  const mbtiTraits = MBTI_TRAITS[mbti];

  const name = interviewerName || base.name;

  return `당신은 {{industry}} 분야 {{job_type}} 채용 면접의 {{role}} '{{name}}'입니다.
성격 유형: {{mbti}} - {{mbti_style}}

## 당신의 핵심 역할
{{core_responsibility}}

## 당신의 관점
"{{unique_perspective}}"

## 질문 스타일
{{question_style}}
{{mbti_approach}}

## 꼬리질문 패턴
{{follow_up_patterns}}

## 평가 중점
{{evaluation_focus}}

## 중요 지침
- 산업({{industry}})과 직무({{job_type}})에 맞는 전문 용어와 상황을 활용하세요
- {{role}}로서의 고유한 관점을 유지하세요
- 1-2문장의 간결한 질문을 하세요
- 한국어로 자연스럽게 대화하세요`
    .replace(/\{\{industry\}\}/g, industry)
    .replace(/\{\{job_type\}\}/g, jobType)
    .replace(/\{\{role\}\}/g, base.role)
    .replace(/\{\{name\}\}/g, name)
    .replace(/\{\{mbti\}\}/g, mbti)
    .replace(/\{\{mbti_style\}\}/g, mbtiTraits.style)
    .replace(/\{\{mbti_approach\}\}/g, mbtiTraits.approach)
    .replace(/\{\{core_responsibility\}\}/g, traits.core_responsibility)
    .replace(/\{\{unique_perspective\}\}/g, traits.unique_perspective)
    .replace(/\{\{question_style\}\}/g, traits.question_style)
    .replace(/\{\{follow_up_patterns\}\}/g, traits.follow_up_patterns.map(p => `- ${p}`).join('\n'))
    .replace(/\{\{evaluation_focus\}\}/g, traits.evaluation_focus.map(f => `- ${f}`).join('\n'));
}

// Get random MBTI type
export function getRandomMBTI(): MBTIType {
  return MBTI_TYPES[Math.floor(Math.random() * MBTI_TYPES.length)];
}

// Fallback interviewer names (used when DB is not available)
export const FALLBACK_INTERVIEWER_NAMES: Record<InterviewerType, string[]> = {
  hiring_manager: [
    '김기술', '이준혁', '박성민', '정우진', '최동현',
    '김지현', '이수진', '박소연', '정민아', '최유진',
  ],
  hr_manager: [
    '박인사', '김민준', '이승호', '정재원', '최현석',
    '김하은', '이서연', '박지은', '정수빈', '최예진',
  ],
  senior_peer: [
    '이시니어', '김현준', '박진우', '정태영', '최민혁',
    '김다은', '이유나', '박세아', '정하린', '최서현',
  ],
};

// Get random name from fallback list
export function getRandomInterviewerName(roleType: InterviewerType): string {
  const names = FALLBACK_INTERVIEWER_NAMES[roleType];
  return names[Math.floor(Math.random() * names.length)];
}

// Session interviewer names assignment
export interface SessionInterviewerNames {
  hiring_manager: string;
  hr_manager: string;
  senior_peer: string;
}

// Generate random names for all interviewers in a session
export function generateSessionInterviewerNames(): SessionInterviewerNames {
  return {
    hiring_manager: getRandomInterviewerName('hiring_manager'),
    hr_manager: getRandomInterviewerName('hr_manager'),
    senior_peer: getRandomInterviewerName('senior_peer'),
  };
}

// Session-based interviewer with assigned MBTI and name
export interface SessionInterviewer extends InterviewerBase {
  personality: MBTIType;
  system_prompt: string;
  assignedName: string; // Randomly assigned name for this session
}

// Create session interviewers with random MBTI and names for each session
export function createSessionInterviewers(
  industry: string,
  jobType: string,
  names?: SessionInterviewerNames
): Record<InterviewerType, SessionInterviewer> {
  const result: Record<InterviewerType, SessionInterviewer> = {} as Record<InterviewerType, SessionInterviewer>;
  const assignedNames = names || generateSessionInterviewerNames();

  for (const type of ['hiring_manager', 'hr_manager', 'senior_peer'] as InterviewerType[]) {
    const mbti = getRandomMBTI();
    const base = INTERVIEWER_BASE[type];
    const assignedName = assignedNames[type];

    result[type] = {
      ...base,
      personality: mbti,
      system_prompt: buildInterviewerSystemPrompt(type, mbti, industry, jobType, assignedName),
      assignedName,
    };
  }

  return result;
}

// Legacy: Keep INTERVIEWERS for backward compatibility (with IT/tech defaults)
export interface Interviewer extends InterviewerBase {
  personality: MBTIType;
  system_prompt: string;
}

export const INTERVIEWERS: Record<InterviewerType, Interviewer> = {
  hiring_manager: {
    ...INTERVIEWER_BASE.hiring_manager,
    personality: 'ENTJ',
    system_prompt: buildInterviewerSystemPrompt('hiring_manager', 'ENTJ', 'IT/테크', '개발자'),
  },
  hr_manager: {
    ...INTERVIEWER_BASE.hr_manager,
    personality: 'ENFJ',
    system_prompt: buildInterviewerSystemPrompt('hr_manager', 'ENFJ', 'IT/테크', '개발자'),
  },
  senior_peer: {
    ...INTERVIEWER_BASE.senior_peer,
    personality: 'INTP',
    system_prompt: buildInterviewerSystemPrompt('senior_peer', 'INTP', 'IT/테크', '개발자'),
  },
};

// Message with Structured Output
export interface Message {
  id: string;
  session_id: string;
  role: 'user' | 'interviewer' | 'system';
  interviewer_id?: InterviewerType;
  content: string;
  structured_response?: StructuredResponse;
  audio_url?: string;
  timestamp: string;
  latency_ms?: number;
}

export interface StructuredResponse {
  question: string;
  evaluation: {
    relevance: number;      // 0-100
    clarity: number;        // 0-100
    depth: number;          // 0-100
  };
  inner_thought?: string;   // 면접관의 속마음
  follow_up_intent: boolean;
  suggested_follow_up?: string;
}

// RAG Document
export type DocumentType = 'resume' | 'company' | 'job_description' | 'portfolio';

export interface Document {
  id: string;
  type: DocumentType;
  user_id: string;
  filename: string;
  content: string;
  embedding?: number[];
  metadata: Record<string, unknown>;
  created_at: string;
}

// Interview Question (from PDF question bank)
export type JobCategory = 'frontend' | 'backend' | 'pm' | 'data' | 'marketing';

export interface InterviewQuestion {
  id: string;
  job_category: JobCategory;
  question_category: string;  // '개발경험', 'CS', 'React', '직무역량' 등
  question: string;
  source_company?: string;
  embedding?: number[];
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export interface InterviewQuestionSearchResult {
  id: string;
  question: string;
  question_category: string;
  job_category: string;
  source_company?: string;
  combined_score: number;
  vector_score: number;
  bm25_score: number;
}

// Interview Result (8-Axis Competency)
export interface InterviewResult {
  id: string;
  session_id: string;
  user_id: string;
  overall_score: number;
  pass_status: 'pass' | 'borderline' | 'fail';
  interviewer_scores: {
    hiring_manager: number;
    hr_manager: number;
    senior_peer: number;
  };
  competency_scores: CompetencyScores;
  rank_percentile?: number;
  growth_index?: number;
  feedback_summary: string;
  strengths: string[];
  improvements: string[];
  created_at: string;
}

export interface CompetencyScores {
  behavioral: number;       // 행동 역량
  clarity: number;          // 명확성
  comprehension: number;    // 이해력
  communication: number;    // 커뮤니케이션
  reasoning: number;        // 논리적 사고
  problem_solving: number;  // 문제 해결
  leadership: number;       // 리더십
  adaptability: number;     // 적응력
}

export const COMPETENCY_LABELS: Record<keyof CompetencyScores, string> = {
  behavioral: '행동 역량',
  clarity: '명확성',
  comprehension: '이해력',
  communication: '커뮤니케이션',
  reasoning: '논리적 사고',
  problem_solving: '문제 해결',
  leadership: '리더십',
  adaptability: '적응력',
};

// Emotion Analysis
export interface EmotionAnalysis {
  id: string;
  result_id: string;
  timeline: EmotionTimelineEntry[];
  average_scores: EmotionScores;
}

export interface EmotionTimelineEntry {
  timestamp: number;
  confidence: number;      // 자신감 (0-100)
  nervousness: number;     // 긴장도 (0-100)
  enthusiasm: number;      // 열정 (0-100)
}

export interface EmotionScores {
  confidence: number;
  nervousness: number;
  enthusiasm: number;
}

// Speech Analytics
export interface SpeechAnalytics {
  id: string;
  result_id: string;
  words_per_minute: number;
  filler_words: FillerWord[];
  silence_patterns: SilencePatterns;
  articulation_score: number;
}

export interface FillerWord {
  word: string;
  count: number;
}

export interface SilencePatterns {
  total_silence_seconds: number;
  avg_response_delay: number;
  long_pauses_count: number;  // 3초 이상
}

// Benchmark Data
export interface BenchmarkData {
  job_type: string;
  industry: string;
  sample_size: number;
  percentiles: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  competency_averages: Partial<CompetencyScores>;
}

// Question Bank
export interface Question {
  id: string;
  category: QuestionCategory;
  job_type?: string;
  industry?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question_text: string;
  evaluation_points: string[];
  sample_answer?: string;
  follow_ups?: string[];
}

export type QuestionCategory =
  | 'self_introduction'
  | 'motivation'
  | 'experience'
  | 'technical'
  | 'behavioral'
  | 'situational'
  | 'culture_fit'
  | 'closing';

// API Request/Response Types
export interface StartInterviewRequest {
  job_type: string;
  industry?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  resume_doc_id?: string;
  timer_config?: Partial<AnswerTimerConfig>;
}

export interface StartInterviewResponse {
  success: boolean;
  session: InterviewSession;
  first_message: Message;
}

export interface SendMessageRequest {
  session_id: string;
  content: string;
  audio_url?: string;
}

export interface SendMessageResponse {
  success: boolean;
  user_message: Message;
  interviewer_response: Message;
  session_status: InterviewSession['status'];
}

export interface EndInterviewRequest {
  session_id: string;
}

export interface EndInterviewResponse {
  success: boolean;
  result: InterviewResult;
}

// STT/TTS Types
export interface TranscribeRequest {
  audio: Blob;
  language?: string;
}

export interface TranscribeResponse {
  success: boolean;
  text: string;
  confidence?: number;
  timestamp: string;
  provider: 'deepgram' | 'whisper';
}

export interface SynthesizeRequest {
  text: string;
  voice?: string;
  speed?: number;
}

export interface SynthesizeResponse {
  success: boolean;
  audio_url: string;
  duration_ms: number;
  provider: 'openai' | 'elevenlabs';
}

// RAG Types
export interface RAGUploadRequest {
  type: DocumentType;
  file: File;
  metadata?: Record<string, unknown>;
}

export interface RAGUploadResponse {
  success: boolean;
  document: Document;
}

export interface RAGSearchRequest {
  query: string;
  doc_types?: DocumentType[];
  top_k?: number;
}

export interface RAGSearchResponse {
  success: boolean;
  results: RAGSearchResult[];
}

export interface RAGSearchResult {
  document: Document;
  score: number;
  highlights: string[];
}

// Job Types and Industries
export const JOB_TYPES = [
  { value: 'frontend', label: '프론트엔드 개발자' },
  { value: 'backend', label: '백엔드 개발자' },
  { value: 'fullstack', label: '풀스택 개발자' },
  { value: 'mobile', label: '모바일 개발자' },
  { value: 'devops', label: 'DevOps 엔지니어' },
  { value: 'data', label: '데이터 엔지니어' },
  { value: 'ml', label: 'ML 엔지니어' },
  { value: 'pm', label: '프로덕트 매니저' },
  { value: 'designer', label: 'UX/UI 디자이너' },
] as const;

export const INDUSTRIES = [
  { value: 'tech', label: 'IT/테크' },
  { value: 'finance', label: '금융/핀테크' },
  { value: 'ecommerce', label: '이커머스' },
  { value: 'healthcare', label: '헬스케어' },
  { value: 'education', label: '에듀테크' },
  { value: 'game', label: '게임' },
  { value: 'startup', label: '스타트업' },
  { value: 'enterprise', label: '대기업' },
] as const;

export const DIFFICULTY_LEVELS = [
  { value: 'easy', label: '초급', description: '기본적인 질문 위주' },
  { value: 'medium', label: '중급', description: '실무 경험 기반 질문' },
  { value: 'hard', label: '고급', description: '심층 기술 면접' },
] as const;
