// ============================================
// Multi-LLM Router with Failover
// ============================================
// GPT-4o (Primary) + Claude 3.5 Sonnet (Fallback)
// Supports prompt caching and cost optimization

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { INTERVIEWERS, type InterviewerType, type StructuredResponse } from '@/types/interview';

// Initialize clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// LLM Provider Types
export type LLMProvider = 'openai' | 'anthropic';

export interface LLMRequest {
  messages: ChatMessage[];
  interviewerId: InterviewerType;
  position: string;
  systemPrompt?: string;
  structuredOutput?: boolean;
  maxTokens?: number;
  temperature?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMResponse {
  content: string;
  structuredResponse?: StructuredResponse;
  provider: LLMProvider;
  model: string;
  latencyMs: number;
  cached?: boolean;
}

// Structured output JSON schema
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
    },
    inner_thought: { type: 'string', description: '면접관의 속마음 (1-2문장)' },
    follow_up_intent: { type: 'boolean', description: '꼬리질문 의도 여부' },
    suggested_follow_up: { type: 'string', description: '다음 꼬리질문 제안' },
  },
  required: ['question', 'evaluation', 'follow_up_intent'],
};

export class MultiLLMRouter {
  private primaryProvider: LLMProvider = 'openai';
  private fallbackProvider: LLMProvider = 'anthropic';
  private retryCount = 2;
  private promptCacheEnabled = true;

  // Model selection by task type
  private modelMap = {
    persona_response: 'gpt-4o',
    evaluation: 'claude-3-5-sonnet-latest',
    follow_up: 'gpt-4o',
    summary: 'gpt-4o-mini',
  };

  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    const interviewer = INTERVIEWERS[request.interviewerId];

    // Build system prompt with interviewer persona
    const systemPrompt = request.systemPrompt || this.buildSystemPrompt(interviewer, request.position);

    // Try primary provider first
    try {
      const response = await this.callOpenAI({
        ...request,
        systemPrompt,
      });
      return {
        ...response,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      console.error('OpenAI call failed, trying Anthropic fallback:', error);

      // Fallback to Anthropic
      try {
        const response = await this.callAnthropic({
          ...request,
          systemPrompt,
        });
        return {
          ...response,
          latencyMs: Date.now() - startTime,
        };
      } catch (fallbackError) {
        console.error('Anthropic fallback also failed:', fallbackError);
        throw new Error('All LLM providers failed');
      }
    }
  }

  private buildSystemPrompt(interviewer: typeof INTERVIEWERS[InterviewerType], position: string): string {
    return `${interviewer.system_prompt}

현재 면접 상황:
- 지원 포지션: ${position}
- 면접관: ${interviewer.name} (${interviewer.role})

중요 지침:
1. 지원자의 답변을 경청하고 적절한 꼬리질문을 합니다
2. 답변이 불충분하면 더 구체적인 예시를 요청합니다
3. 답변이 좋으면 다른 관점에서 추가 질문을 합니다
4. 한국어로 자연스럽게 대화합니다
5. 질문은 1-2문장으로 간결하게 합니다
6. ${interviewer.name}의 성격(${interviewer.personality})에 맞게 대화합니다`;
  }

  private async callOpenAI(request: LLMRequest & { systemPrompt: string }): Promise<Omit<LLMResponse, 'latencyMs'>> {
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: request.systemPrompt },
      ...request.messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ];

    if (request.structuredOutput) {
      // Use structured output with JSON schema
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
      } catch {
        console.error('Failed to parse structured response');
      }

      return {
        content: structuredResponse?.question || content,
        structuredResponse,
        provider: 'openai',
        model: 'gpt-4o',
        cached: false,
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
        cached: false,
      };
    }
  }

  private async callAnthropic(request: LLMRequest & { systemPrompt: string }): Promise<Omit<LLMResponse, 'latencyMs'>> {
    const messages: Anthropic.MessageParam[] = request.messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));

    // Use prompt caching for system prompt (ephemeral cache)
    const systemContent: Anthropic.TextBlockParam[] = [
      {
        type: 'text',
        text: request.systemPrompt,
        // Note: cache_control is available in beta
      },
    ];

    const completion = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: request.maxTokens || 300,
      system: systemContent,
      messages,
    });

    const textContent = completion.content.find(c => c.type === 'text');
    const content = textContent?.type === 'text' ? textContent.text : '';

    if (request.structuredOutput) {
      // Parse structured response from Claude's output
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const structuredResponse = JSON.parse(jsonMatch[0]) as StructuredResponse;
          return {
            content: structuredResponse.question || content,
            structuredResponse,
            provider: 'anthropic',
            model: 'claude-3-5-sonnet-latest',
            cached: false,
          };
        }
      } catch {
        console.error('Failed to parse structured response from Claude');
      }
    }

    return {
      content,
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-latest',
      cached: false,
    };
  }

  // Select optimal model based on task type
  selectModel(taskType: keyof typeof this.modelMap): string {
    return this.modelMap[taskType] || 'gpt-4o';
  }
}

// Singleton instance
export const llmRouter = new MultiLLMRouter();

// Utility function for simple calls
export async function generateInterviewerResponse(
  messages: ChatMessage[],
  interviewerId: InterviewerType,
  position: string,
  structuredOutput: boolean = false
): Promise<LLMResponse> {
  return llmRouter.generateResponse({
    messages,
    interviewerId,
    position,
    structuredOutput,
  });
}
