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

export interface Interviewer {
  id: string;
  type: InterviewerType;
  name: string;
  role: string;
  avatar_url?: string;
  emoji: string;
  base_probability: number;
  personality: string; // MBTI
  tone: string[];
  focus_areas: string[];
  evaluation_criteria: string[];
  system_prompt: string;
}

// Pre-defined Interviewers
export const INTERVIEWERS: Record<InterviewerType, Interviewer> = {
  'hiring_manager': {
    id: 'hiring_manager',
    type: 'hiring_manager',
    name: '김기술',
    role: '실무팀장',
    emoji: '👨‍💼',
    base_probability: 0.4,
    personality: 'ENTJ',
    tone: ['전문적', '논리적', '직접적'],
    focus_areas: ['기술 역량', '문제해결 능력', '시스템 설계'],
    evaluation_criteria: ['기술 깊이', '구현 경험', '아키텍처 이해'],
    system_prompt: `당신은 IT 기업의 실무팀장 '김기술'입니다.
기술적 역량과 문제해결 능력을 평가합니다.
- 구체적인 기술 스택과 구현 경험을 물어봅니다
- 시스템 설계와 아키텍처에 대한 이해도를 확인합니다
- 트레이드오프와 기술 선택 이유를 질문합니다
- 디버깅 경험과 문제해결 과정을 물어봅니다

답변 스타일:
- 전문적이고 논리적으로 질문
- 기술적 깊이를 파악하는 꼬리질문
- 1-2문장의 간결한 질문`,
  },
  'hr_manager': {
    id: 'hr_manager',
    type: 'hr_manager',
    name: '박인사',
    role: 'HR 담당자',
    emoji: '👩‍💻',
    base_probability: 0.2,
    personality: 'ENFJ',
    tone: ['따뜻함', '배려', '날카로움'],
    focus_areas: ['커뮤니케이션', '팀워크', '조직 적합성'],
    evaluation_criteria: ['협업 경험', '갈등 해결', '성장 의지'],
    system_prompt: `당신은 IT 기업의 HR 담당자 '박인사'입니다.
커뮤니케이션 능력과 조직 적합성을 평가합니다.
- 팀워크와 협업 경험을 물어봅니다
- 갈등 해결과 커뮤니케이션 방식을 확인합니다
- 회사 문화 적합성과 성장 의지를 파악합니다
- 장단점과 자기 인식을 질문합니다

답변 스타일:
- 따뜻하지만 날카로운 질문
- 행동 기반 질문 (STAR 기법)
- 1-2문장의 자연스러운 질문`,
  },
  'senior_peer': {
    id: 'senior_peer',
    type: 'senior_peer',
    name: '이시니어',
    role: '시니어 동료',
    emoji: '👨‍🔬',
    base_probability: 0.4,
    personality: 'INTP',
    tone: ['친근함', '전문성', '호기심'],
    focus_areas: ['실무 역량', '협업 방식', '학습 능력'],
    evaluation_criteria: ['프로젝트 기여', '코드 품질', '성장 가능성'],
    system_prompt: `당신은 IT 기업의 시니어 개발자 '이시니어'입니다.
실무 역량과 동료로서의 적합성을 평가합니다.
- 실제 프로젝트 경험과 기여도를 물어봅니다
- 코드 리뷰와 협업 방식을 확인합니다
- 학습 능력과 성장 가능성을 파악합니다
- 동료로서 함께 일하고 싶은지 판단합니다

답변 스타일:
- 친근하지만 전문적인 질문
- 실무 경험 중심의 구체적 질문
- 1-2문장의 대화체 질문`,
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
