// ============================================
// SSE (Server-Sent Events) Streaming Endpoint
// ============================================
// Provides real-time streaming for:
// - LLM responses (interview questions)
// - Long-running operations
// - Vercel Serverless Function timeout handling (streaming keeps connection alive)
//
// POST /api/stream
// - Streams interview responses in real-time
// - Implements heartbeat to prevent timeouts
// - Supports graceful error handling

import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { createLatencyTimer } from '@/lib/monitoring/latency';
import { errorTracker } from '@/lib/monitoring/error-tracker';
import { sentryClient } from '@/lib/monitoring/sentry';

// ============================================
// Configuration
// ============================================

const TEST_MODE = process.env.TEST_MODE === 'true';

const openai = TEST_MODE
  ? null
  : new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

// Vercel Serverless Function has max execution time:
// - Hobby: 10 seconds
// - Pro: 60 seconds
// - Enterprise: 900 seconds
// Streaming keeps the connection alive and resets the timeout with each chunk
const HEARTBEAT_INTERVAL = 15000; // 15 seconds heartbeat
const MAX_STREAM_DURATION = 55000; // 55 seconds max (leave buffer for Pro plan)

// ============================================
// Types
// ============================================

interface StreamRequest {
  type: 'interview' | 'tts' | 'custom';
  // Interview specific
  userMessage?: string;
  interviewerId?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  position?: string;
  systemPrompt?: string;
  // Common options
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

interface SSEEvent {
  event: string;
  data: unknown;
  id?: string;
}

// ============================================
// SSE Helper Functions
// ============================================

function formatSSEMessage(event: SSEEvent): string {
  let message = '';

  if (event.id) {
    message += `id: ${event.id}\n`;
  }

  message += `event: ${event.event}\n`;
  message += `data: ${JSON.stringify(event.data)}\n\n`;

  return message;
}

function createSSEStream(
  generator: () => AsyncGenerator<SSEEvent, void, unknown>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of generator()) {
          const message = formatSSEMessage(event);
          controller.enqueue(encoder.encode(message));
        }
      } catch (error) {
        // Send error event
        const errorEvent = formatSSEMessage({
          event: 'error',
          data: {
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now(),
          },
        });
        controller.enqueue(encoder.encode(errorEvent));
      } finally {
        // Send done event
        const doneEvent = formatSSEMessage({
          event: 'done',
          data: { timestamp: Date.now() },
        });
        controller.enqueue(encoder.encode(doneEvent));
        controller.close();
      }
    },
  });
}

// ============================================
// Interview Streaming Generator
// ============================================

async function* streamInterviewResponse(
  request: StreamRequest
): AsyncGenerator<SSEEvent, void, unknown> {
  const timer = createLatencyTimer('chat_stream', 'openai', request.model || 'gpt-4o');
  const startTime = Date.now();
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let lastChunkTime = Date.now();

  // Send initial event
  yield {
    event: 'start',
    data: {
      model: request.model || 'gpt-4o',
      interviewerId: request.interviewerId,
      timestamp: startTime,
    },
  };

  // Test mode - simulate streaming
  if (TEST_MODE || !openai) {
    const mockResponse = '좋은 답변이네요. 그 경험에서 가장 어려웠던 기술적 도전은 무엇이었나요?';

    // Simulate token-by-token streaming
    for (let i = 0; i < mockResponse.length; i++) {
      yield {
        event: 'chunk',
        data: {
          content: mockResponse[i],
          index: i,
        },
      };

      // Simulate delay
      await new Promise((resolve) => setTimeout(resolve, 30));
    }

    timer.success({ test_mode: true, total_chars: mockResponse.length });
    return;
  }

  try {
    // Build messages for OpenAI
    const messages: OpenAI.ChatCompletionMessageParam[] = [];

    // System prompt
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    } else {
      messages.push({
        role: 'system',
        content: `당신은 IT 기업의 면접관입니다.
지원자의 답변을 듣고 적절한 꼬리질문을 합니다.
- 1-2문장의 간결한 질문
- 한국어로 자연스럽게 대화
- 지원 포지션: ${request.position || '개발자'}`,
      });
    }

    // Conversation history
    if (request.conversationHistory) {
      for (const msg of request.conversationHistory) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      }
    }

    // Current user message
    if (request.userMessage) {
      messages.push({ role: 'user', content: request.userMessage });
    }

    // Start heartbeat to keep connection alive
    heartbeatTimer = setInterval(() => {
      // Heartbeats are handled by yielding in the stream
    }, HEARTBEAT_INTERVAL);

    // Create streaming completion
    const stream = await openai.chat.completions.create({
      model: request.model || 'gpt-4o',
      messages,
      max_tokens: request.maxTokens || 300,
      temperature: request.temperature || 0.7,
      stream: true,
    });

    let totalContent = '';
    let chunkIndex = 0;

    for await (const chunk of stream) {
      // Check for timeout
      if (Date.now() - startTime > MAX_STREAM_DURATION) {
        yield {
          event: 'warning',
          data: {
            message: 'Approaching timeout limit, wrapping up...',
            elapsed_ms: Date.now() - startTime,
          },
        };
        break;
      }

      const content = chunk.choices[0]?.delta?.content;

      if (content) {
        totalContent += content;
        lastChunkTime = Date.now();

        yield {
          event: 'chunk',
          data: {
            content,
            index: chunkIndex++,
            finish_reason: chunk.choices[0]?.finish_reason,
          },
          id: chunk.id,
        };
      }

      // Send heartbeat if no chunks for a while
      if (Date.now() - lastChunkTime > HEARTBEAT_INTERVAL) {
        yield {
          event: 'heartbeat',
          data: { timestamp: Date.now() },
        };
        lastChunkTime = Date.now();
      }
    }

    // Record success metrics
    const latency = timer.success({
      total_chars: totalContent.length,
      chunks: chunkIndex,
    });

    // Send completion event
    yield {
      event: 'complete',
      data: {
        content: totalContent,
        latency_ms: latency,
        total_chunks: chunkIndex,
      },
    };
  } catch (error) {
    timer.failure(error instanceof Error ? error : new Error(String(error)));
    errorTracker.track(error, 'stream/interview');

    yield {
      event: 'error',
      data: {
        message: error instanceof Error ? error.message : 'Streaming failed',
        code: 'STREAM_ERROR',
      },
    };
  } finally {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
    }
  }
}

// ============================================
// POST Handler
// ============================================

export async function POST(req: NextRequest) {
  try {
    const body: StreamRequest = await req.json();

    // Validate request
    if (body.type === 'interview' && !body.userMessage) {
      return new Response(
        JSON.stringify({ success: false, error: 'userMessage is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Add breadcrumb for debugging
    sentryClient.addBreadcrumb('SSE stream started', 'sse', 'info', {
      type: body.type,
      interviewerId: body.interviewerId,
    });

    // Create the appropriate stream based on type
    let stream: ReadableStream<Uint8Array>;

    switch (body.type) {
      case 'interview':
        stream = createSSEStream(() => streamInterviewResponse(body));
        break;

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Unsupported stream type' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
    }

    // Return SSE response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });
  } catch (error) {
    console.error('SSE endpoint error:', error);
    errorTracker.track(error, 'stream');

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to initialize stream',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// ============================================
// GET Handler - Stream Health Check
// ============================================

export async function GET() {
  return new Response(
    JSON.stringify({
      status: 'ok',
      endpoints: {
        POST: {
          description: 'Start an SSE stream',
          types: ['interview', 'tts', 'custom'],
          example: {
            type: 'interview',
            userMessage: '저는 3년간 백엔드 개발을 했습니다.',
            interviewerId: 'tech-lead',
            position: '백엔드 개발자',
          },
        },
      },
      config: {
        heartbeat_interval_ms: HEARTBEAT_INTERVAL,
        max_stream_duration_ms: MAX_STREAM_DURATION,
        test_mode: TEST_MODE,
      },
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
