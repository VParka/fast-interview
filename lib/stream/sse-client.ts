// ============================================
// SSE Client Utilities
// ============================================
// Provides client-side utilities for consuming SSE streams:
// - Event parsing and handling
// - Automatic reconnection with exponential backoff
// - Type-safe event handlers
// - React hook for easy integration

// ============================================
// Types
// ============================================

export interface SSEEvent<T = unknown> {
  event: string;
  data: T;
  id?: string;
}

export interface SSEChunkData {
  content: string;
  index: number;
  finish_reason?: string | null;
}

export interface SSECompleteData {
  content: string;
  latency_ms: number;
  total_chunks: number;
}

export interface SSEErrorData {
  message: string;
  code?: string;
}

export interface SSEStartData {
  model: string;
  interviewerId?: string;
  timestamp: number;
}

export type SSEEventType = 'start' | 'chunk' | 'complete' | 'error' | 'done' | 'heartbeat' | 'warning';

export interface SSEHandlers {
  onStart?: (data: SSEStartData) => void;
  onChunk?: (data: SSEChunkData) => void;
  onComplete?: (data: SSECompleteData) => void;
  onError?: (data: SSEErrorData) => void;
  onDone?: () => void;
  onHeartbeat?: () => void;
  onWarning?: (message: string) => void;
}

export interface SSEClientOptions {
  handlers: SSEHandlers;
  onConnectionError?: (error: Error) => void;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

export interface InterviewStreamRequest {
  type: 'interview';
  userMessage: string;
  interviewerId?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  position?: string;
  systemPrompt?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

// ============================================
// SSE Parser
// ============================================

export function parseSSEMessage(chunk: string): SSEEvent | null {
  const lines = chunk.split('\n');
  let event = 'message';
  let data = '';
  let id: string | undefined;

  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      data = line.slice(5).trim();
    } else if (line.startsWith('id:')) {
      id = line.slice(3).trim();
    }
  }

  if (!data) return null;

  try {
    return {
      event,
      data: JSON.parse(data),
      id,
    };
  } catch {
    return {
      event,
      data,
      id,
    };
  }
}

// ============================================
// SSE Client Class
// ============================================

export class SSEClient {
  private abortController: AbortController | null = null;
  private handlers: SSEHandlers;
  private reconnectAttempts = 0;
  private options: Required<Omit<SSEClientOptions, 'handlers' | 'onConnectionError'>> & {
    onConnectionError?: (error: Error) => void;
  };

  constructor(options: SSEClientOptions) {
    this.handlers = options.handlers;
    this.options = {
      reconnect: options.reconnect ?? false,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 3,
      reconnectDelay: options.reconnectDelay ?? 1000,
      onConnectionError: options.onConnectionError,
    };
  }

  async connect(url: string, body: InterviewStreamRequest): Promise<void> {
    this.abortController = new AbortController();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(body),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is empty');
      }

      // Reset reconnect attempts on successful connection
      this.reconnectAttempts = 0;

      // Process the stream
      await this.processStream(response.body);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Stream was cancelled
        return;
      }

      this.options.onConnectionError?.(
        error instanceof Error ? error : new Error(String(error))
      );

      // Attempt reconnection if enabled
      if (
        this.options.reconnect &&
        this.reconnectAttempts < this.options.maxReconnectAttempts
      ) {
        this.reconnectAttempts++;
        const delay = this.options.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.connect(url, body);
      }

      throw error;
    }
  }

  private async processStream(body: ReadableStream<Uint8Array>): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages (separated by double newline)
        const messages = buffer.split('\n\n');
        buffer = messages.pop() || ''; // Keep incomplete message in buffer

        for (const message of messages) {
          if (!message.trim()) continue;

          const event = parseSSEMessage(message);
          if (event) {
            this.handleEvent(event);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private handleEvent(event: SSEEvent): void {
    switch (event.event) {
      case 'start':
        this.handlers.onStart?.(event.data as SSEStartData);
        break;

      case 'chunk':
        this.handlers.onChunk?.(event.data as SSEChunkData);
        break;

      case 'complete':
        this.handlers.onComplete?.(event.data as SSECompleteData);
        break;

      case 'error':
        this.handlers.onError?.(event.data as SSEErrorData);
        break;

      case 'done':
        this.handlers.onDone?.();
        break;

      case 'heartbeat':
        this.handlers.onHeartbeat?.();
        break;

      case 'warning':
        this.handlers.onWarning?.((event.data as { message: string }).message);
        break;

      default:
        console.log('[SSE] Unknown event:', event.event, event.data);
    }
  }

  disconnect(): void {
    this.abortController?.abort();
    this.abortController = null;
  }
}

// ============================================
// Factory Function
// ============================================

export function createSSEClient(options: SSEClientOptions): SSEClient {
  return new SSEClient(options);
}

// ============================================
// Simple Streaming Function
// ============================================

export async function streamInterview(
  request: InterviewStreamRequest,
  handlers: SSEHandlers,
  baseUrl = '/api/stream'
): Promise<string> {
  return new Promise((resolve, reject) => {
    let fullContent = '';

    const client = createSSEClient({
      handlers: {
        ...handlers,
        onChunk: (data) => {
          fullContent += data.content;
          handlers.onChunk?.(data);
        },
        onComplete: (data) => {
          handlers.onComplete?.(data);
          resolve(data.content);
        },
        onError: (data) => {
          handlers.onError?.(data);
          reject(new Error(data.message));
        },
        onDone: () => {
          handlers.onDone?.();
          if (!fullContent) {
            resolve('');
          }
        },
      },
      onConnectionError: reject,
    });

    client.connect(baseUrl, request).catch(reject);
  });
}
