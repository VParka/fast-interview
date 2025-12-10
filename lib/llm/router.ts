// ============================================
// LLM Router - OpenAI GPT-4o with Dynamic Prompts
// ============================================

import OpenAI from 'openai';
import {
  INTERVIEWER_BASE,
  buildInterviewerSystemPrompt,
  getRandomMBTI,
  type InterviewerType,
  type StructuredResponse,
  type MBTIType,
  type InterviewQuestionSearchResult,
} from '@/types/interview';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface LLMRequest {
  messages: ChatMessage[];
  interviewerId: InterviewerType;
  position: string;
  systemPrompt?: string;
  context?: string; // RAG context from documents
  userKeywords?: UserKeyword[]; // Previous interview keywords for continuity
  industry?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  turnCount?: number;
  structuredOutput?: boolean;
  maxTokens?: number;
  temperature?: number;
  // New fields for enhanced logic
  previousInterviewerId?: InterviewerType; // For follow-up logic
  interviewerMbti?: MBTIType; // Pre-assigned MBTI for the session
  jdText?: string; // Job description for targeted questions
  relevantQuestions?: InterviewQuestionSearchResult[]; // RAG-retrieved interview questions
}

// User keyword from previous interviews
export interface UserKeyword {
  keyword: string;
  category: 'technical' | 'soft_skill' | 'experience' | 'project' | 'strength' | 'weakness';
  context?: string;
  mentioned_count: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMResponse {
  content: string;
  structuredResponse?: StructuredResponse;
  provider: 'openai';
  model: string;
  latencyMs: number;
}

// Structured output JSON schema (OpenAI requires additionalProperties: false)
const INTERVIEW_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    question: { type: 'string', description: '면접관의 질문 또는 응답' },
    evaluation: {
      type: 'object',
      properties: {
        relevance: { type: 'number', description: '답변 관련성 (0-100)' },
        clarity: { type: 'number', description: '답변 명확성 (0-100)' },
        depth: { type: 'number', description: '답변 깊이 (0-100)' },
      },
      required: ['relevance', 'clarity', 'depth'],
      additionalProperties: false,
    },
    inner_thought: { type: 'string', description: '면접관의 속마음 (1-2문장)' },
    follow_up_intent: { type: 'boolean', description: '꼬리질문 의도 여부' },
    suggested_follow_up: { type: 'string', description: '다음 꼬리질문 제안' },
  },
  required: ['question', 'evaluation', 'follow_up_intent', 'inner_thought', 'suggested_follow_up'],
  additionalProperties: false,
};

export class LLMRouter {
  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    const interviewerBase = INTERVIEWER_BASE[request.interviewerId];

    console.log('=== LLM Router: generateResponse ===');
    console.log('Interviewer:', request.interviewerId);
    console.log('Position:', request.position);
    console.log('Industry:', request.industry);
    console.log('MBTI:', request.interviewerMbti);
    console.log('Previous Interviewer:', request.previousInterviewerId);

    // Use provided MBTI or generate random one
    const mbti = request.interviewerMbti || getRandomMBTI();
    const industry = request.industry || 'IT/테크';

    // Build dynamic system prompt based on industry, job type, and MBTI
    const basePrompt = request.systemPrompt || buildInterviewerSystemPrompt(
      request.interviewerId,
      mbti,
      industry,
      request.position
    );

    // Add context and instructions
    const systemPrompt = this.enhanceSystemPrompt(
      basePrompt,
      request.context,
      request.userKeywords,
      request.difficulty,
      request.turnCount,
      request.previousInterviewerId,
      request.interviewerId,
      request.jdText,
      request.relevantQuestions
    );

    // Limit conversation history to last 3 turns (6 messages: 3 user + 3 assistant)
    const limitedMessages = this.limitConversationHistory(request.messages, 3);

    try {
      const response = await this.callOpenAI({
        ...request,
        messages: limitedMessages,
        systemPrompt,
      });
      console.log('OpenAI call succeeded');
      return {
        ...response,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      console.error('=== OpenAI Call Failed ===');
      console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      if (error instanceof Error && 'status' in error) {
        console.error('HTTP Status:', (error as { status: number }).status);
      }
      if (error instanceof Error && 'code' in error) {
        console.error('Error code:', (error as { code: string }).code);
      }
      throw new Error(`LLM request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Limit conversation to last N turns (each turn = 1 user message + 1 assistant message)
  private limitConversationHistory(messages: ChatMessage[], maxTurns: number): ChatMessage[] {
    if (messages.length <= maxTurns * 2) {
      return messages;
    }

    // Keep first message if it's a system marker, then last N turns
    const firstMessage = messages[0];
    const isSystemMarker = firstMessage?.content.includes('[면접 시작]');

    if (isSystemMarker) {
      // Keep system marker + last N turns
      return [firstMessage, ...messages.slice(-(maxTurns * 2))];
    }

    // Just return last N turns
    return messages.slice(-(maxTurns * 2));
  }

  private enhanceSystemPrompt(
    basePrompt: string,
    context?: string,
    userKeywords?: UserKeyword[],
    difficulty?: 'easy' | 'medium' | 'hard',
    turnCount?: number,
    previousInterviewerId?: InterviewerType,
    currentInterviewerId?: InterviewerType,
    jdText?: string,
    relevantQuestions?: InterviewQuestionSearchResult[]
  ): string {
    let prompt = basePrompt;

    // Add JD context FIRST (priority)
    if (jdText) {
      prompt += `

## [중요] 채용공고 요구사항 (JD)
아래 자격요건/우대사항을 반드시 참고하여 질문하세요.

${jdText}

→ JD 요구사항 충족 여부를 검증하는 질문을 우선하세요.`;
    }

    // Add relevant interview questions from question bank
    if (relevantQuestions && relevantQuestions.length > 0) {
      prompt += `

## 참고 기출문제 (해당 직무 관련)
아래 기출문제들을 참고하여 유사한 방식으로 질문하세요:

${relevantQuestions.map((q, i) => `${i + 1}. [${q.question_category}] ${q.question}${q.source_company ? ` (출처: ${q.source_company})` : ''}`).join('\n')}

→ 이 기출문제들을 그대로 사용하지 말고, 지원자의 경험에 맞게 변형하여 질문하세요.
→ 지원자의 이력서/포트폴리오 내용과 연결하여 질문하면 더 좋습니다.`;
    }

    // Add difficulty context
    prompt += `

## 면접 난이도: ${this.getDifficultyLabel(difficulty)}
- 현재 ${turnCount || 1}번째 대화`;

    // Add document context (resume/portfolio)
    if (context) {
      prompt += `

## 지원자 문서 정보 (이력서/포트폴리오)
${context}

→ 이 정보를 바탕으로 구체적인 경험이나 프로젝트에 대해 질문하세요.`;
    }

    // Add user keywords from previous interviews for continuity
    if (userKeywords && userKeywords.length > 0) {
      prompt += `

## 지원자의 이전 면접 키워드 (스펙 정보)
이전 면접에서 언급한 핵심 키워드입니다. 다른 각도로 질문하세요.

${this.formatKeywords(userKeywords)}`;
    }

    // Add follow-up instruction based on previous interviewer
    if (previousInterviewerId && currentInterviewerId) {
      if (previousInterviewerId === currentInterviewerId) {
        // Same interviewer - high probability of follow-up
        prompt += `

## 꼬리질문 지침 (같은 면접관 연속)
방금 전 질문에 대한 지원자의 답변을 기반으로 꼬리질문을 하세요.
- 더 구체적인 예시나 수치를 요청
- 답변에서 언급된 기술/경험을 더 깊이 파고들기
- "방금 말씀하신 ~에 대해 더 여쭤볼게요" 식으로 연결`;
      } else {
        // Different interviewer - transform or new question
        prompt += `

## 질문 전환 지침 (다른 면접관으로 교체)
이전 면접관의 질문을 이어받되, 당신의 역할에 맞게 변형하세요.
- 이전 주제를 당신의 관점에서 재질문 (예: 기술적 질문 → 협업 측면으로)
- 또는 완전히 새로운 주제로 전환
- "저는 다른 관점에서 여쭤볼게요" 식으로 자연스럽게 전환`;
      }
    }

    // Core instructions with anti-repetition
    prompt += `

## 핵심 지침
- 1-2문장의 간결한 질문
- 한국어로 자연스럽게 대화

## [필수] 반복 금지
- 이미 한 질문 또는 지원자가 답한 내용 재질문 금지
- 같은 주제 충분히 다뤘으면 새 주제로 전환

## [절대 금지] 에코 금지
- 절대로 지원자의 답변을 그대로 출력하지 마세요
- 당신은 면접관입니다. 오직 새로운 질문만 출력하세요`;

    return prompt;
  }

  private getDifficultyLabel(difficulty?: 'easy' | 'medium' | 'hard'): string {
    switch (difficulty) {
      case 'easy': return '초급 (기본적인 질문 위주)';
      case 'hard': return '고급 (심층 기술 면접)';
      default: return '중급 (실무 경험 기반 질문)';
    }
  }

  private formatKeywords(keywords: UserKeyword[]): string {
    const grouped: Record<string, UserKeyword[]> = {};

    for (const kw of keywords) {
      if (!grouped[kw.category]) {
        grouped[kw.category] = [];
      }
      grouped[kw.category].push(kw);
    }

    const categoryLabels: Record<string, string> = {
      technical: '기술 스택',
      soft_skill: '소프트 스킬',
      experience: '경험',
      project: '프로젝트',
      strength: '강점',
      weakness: '개선점',
    };

    let result = '';
    for (const [category, items] of Object.entries(grouped)) {
      result += `\n[${categoryLabels[category] || category}]\n`;
      for (const item of items) {
        result += `- ${item.keyword}${item.context ? ` (${item.context})` : ''}`;
        if (item.mentioned_count > 1) {
          result += ` - ${item.mentioned_count}회 언급`;
        }
        result += '\n';
      }
    }

    return result;
  }

  private async callOpenAI(request: LLMRequest & { systemPrompt: string }): Promise<Omit<LLMResponse, 'latencyMs'>> {
    try {
      const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: 'system', content: request.systemPrompt },
        ...request.messages.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
        })),
      ];

      if (request.structuredOutput) {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'interview_response',
              strict: true,
              schema: INTERVIEW_RESPONSE_SCHEMA,
            },
          },
          max_tokens: request.maxTokens || 500,
          temperature: request.temperature || 0.7,
        });

        const content = completion.choices[0]?.message?.content || '';
        let structuredResponse: StructuredResponse | undefined;

        try {
          structuredResponse = JSON.parse(content);
        } catch (parseError) {
          console.error('Failed to parse structured response:', parseError);
        }

        return {
          content: structuredResponse?.question || content,
          structuredResponse,
          provider: 'openai',
          model: 'gpt-4o',
        };
      } else {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages,
          max_tokens: request.maxTokens || 300,
          temperature: request.temperature || 0.7,
        });

        return {
          content: completion.choices[0]?.message?.content || '',
          provider: 'openai',
          model: 'gpt-4o',
        };
      }
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw error;
    }
  }
}

// Singleton instance
export const llmRouter = new LLMRouter();

// Utility function for simple calls
export async function generateInterviewerResponse(
  messages: ChatMessage[],
  interviewerId: InterviewerType,
  position: string,
  structuredOutput: boolean = false,
  context?: string,
  options?: {
    userKeywords?: UserKeyword[];
    industry?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    turnCount?: number;
    previousInterviewerId?: InterviewerType;
    interviewerMbti?: MBTIType;
    jdText?: string;
    relevantQuestions?: InterviewQuestionSearchResult[];
  }
): Promise<LLMResponse> {
  return llmRouter.generateResponse({
    messages,
    interviewerId,
    position,
    structuredOutput,
    context,
    ...options,
  });
}

// Re-export types for convenience
export type { MBTIType } from '@/types/interview';
export { getRandomMBTI } from '@/types/interview';

// Keyword extraction function - uses GPT-4o-mini for cost efficiency
export async function extractInterviewKeywords(
  conversationHistory: ChatMessage[],
  jobType: string
): Promise<ExtractedKeywords> {
  const systemPrompt = `당신은 면접 분석 전문가입니다.
주어진 면접 대화에서 지원자에 대한 핵심 키워드를 추출합니다.

## 추출 카테고리
1. **technical**: 기술 스택, 프레임워크, 언어, 도구 등
2. **soft_skill**: 커뮤니케이션, 리더십, 팀워크 등 소프트 스킬
3. **experience**: 경력, 경험 연차, 업무 도메인
4. **project**: 언급한 프로젝트명, 프로젝트 유형
5. **strength**: 강점으로 드러난 부분
6. **weakness**: 약점이나 개선이 필요한 부분

## 추출 기준
- 지원자가 직접 언급한 내용만 추출
- 구체적이고 의미있는 키워드만 선별 (최대 15개)
- 각 키워드에 대해 언급된 맥락 간략히 포함
- 같은 키워드가 여러 번 언급되면 횟수 기록

JSON 형식으로 응답하세요.`;

  const userPrompt = `다음 면접 대화에서 지원자(user)의 답변을 분석하여 핵심 키워드를 추출하세요.
지원 포지션: ${jobType}

대화 내용:
${conversationHistory.map(m => `[${m.role}]: ${m.content}`).join('\n')}

핵심 키워드를 추출하세요.`;

  try {
    // Use GPT-4o-mini for cost-effective keyword extraction
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'extracted_keywords',
          strict: true,
          schema: KEYWORD_EXTRACTION_SCHEMA,
        },
      },
      max_tokens: 800,
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content || '{}';
    return JSON.parse(content);
  } catch (error) {
    console.error('Keyword extraction failed:', error);
    return { keywords: [], summary: '' };
  }
}

// Schema for keyword extraction
const KEYWORD_EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    keywords: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: '키워드' },
          category: {
            type: 'string',
            enum: ['technical', 'soft_skill', 'experience', 'project', 'strength', 'weakness'],
            description: '키워드 카테고리',
          },
          context: { type: 'string', description: '키워드가 언급된 맥락' },
          mentioned_count: { type: 'number', description: '언급 횟수' },
        },
        required: ['keyword', 'category', 'mentioned_count'],
        additionalProperties: false,
      },
    },
    summary: { type: 'string', description: '지원자 요약 (2-3문장)' },
  },
  required: ['keywords', 'summary'],
  additionalProperties: false,
};

export interface ExtractedKeywords {
  keywords: UserKeyword[];
  summary: string;
}
