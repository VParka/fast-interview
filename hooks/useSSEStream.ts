// ============================================
// React Hook for SSE Streaming
// ============================================
// Provides a React hook for consuming SSE streams with:
// - Streaming state management
// - Automatic cleanup on unmount
// - Type-safe event handling
// - Progressive content accumulation

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  SSEClient,
  createSSEClient,
  type InterviewStreamRequest,
  type SSEChunkData,
  type SSECompleteData,
  type SSEErrorData,
  type SSEStartData,
} from '@/lib/stream/sse-client';

// ============================================
// Types
// ============================================

export interface StreamState {
  isStreaming: boolean;
  content: string;
  error: string | null;
  latencyMs: number | null;
  model: string | null;
  chunksReceived: number;
}

export interface UseSSEStreamOptions {
  baseUrl?: string;
  onStart?: (data: SSEStartData) => void;
  onChunk?: (data: SSEChunkData, currentContent: string) => void;
  onComplete?: (data: SSECompleteData) => void;
  onError?: (data: SSEErrorData) => void;
}

export interface UseSSEStreamReturn {
  state: StreamState;
  startStream: (request: Omit<InterviewStreamRequest, 'type'>) => Promise<string>;
  stopStream: () => void;
  reset: () => void;
}

// ============================================
// Initial State
// ============================================

const initialState: StreamState = {
  isStreaming: false,
  content: '',
  error: null,
  latencyMs: null,
  model: null,
  chunksReceived: 0,
};

// ============================================
// Hook Implementation
// ============================================

export function useSSEStream(options: UseSSEStreamOptions = {}): UseSSEStreamReturn {
  const { baseUrl = '/api/stream', onStart, onChunk, onComplete, onError } = options;

  const [state, setState] = useState<StreamState>(initialState);
  const clientRef = useRef<SSEClient | null>(null);
  const contentRef = useRef<string>('');

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clientRef.current?.disconnect();
    };
  }, []);

  // Start streaming
  const startStream = useCallback(
    async (request: Omit<InterviewStreamRequest, 'type'>): Promise<string> => {
      // Cleanup any existing stream
      clientRef.current?.disconnect();
      contentRef.current = '';

      // Reset state
      setState({
        ...initialState,
        isStreaming: true,
      });

      return new Promise((resolve, reject) => {
        const client = createSSEClient({
          handlers: {
            onStart: (data) => {
              setState((prev) => ({
                ...prev,
                model: data.model,
              }));
              onStart?.(data);
            },

            onChunk: (data) => {
              contentRef.current += data.content;

              setState((prev) => ({
                ...prev,
                content: contentRef.current,
                chunksReceived: prev.chunksReceived + 1,
              }));

              onChunk?.(data, contentRef.current);
            },

            onComplete: (data) => {
              setState((prev) => ({
                ...prev,
                isStreaming: false,
                latencyMs: data.latency_ms,
                content: data.content,
              }));

              onComplete?.(data);
              resolve(data.content);
            },

            onError: (data) => {
              setState((prev) => ({
                ...prev,
                isStreaming: false,
                error: data.message,
              }));

              onError?.(data);
              reject(new Error(data.message));
            },

            onDone: () => {
              setState((prev) => ({
                ...prev,
                isStreaming: false,
              }));

              // If no complete event was received, resolve with accumulated content
              if (contentRef.current && state.isStreaming) {
                resolve(contentRef.current);
              }
            },

            onHeartbeat: () => {
              // Heartbeat received - connection is alive
              console.log('[SSE] Heartbeat received');
            },

            onWarning: (message) => {
              console.warn('[SSE] Warning:', message);
            },
          },

          onConnectionError: (error) => {
            setState((prev) => ({
              ...prev,
              isStreaming: false,
              error: error.message,
            }));
            reject(error);
          },
        });

        clientRef.current = client;

        // Start the connection
        client
          .connect(baseUrl, { type: 'interview', ...request })
          .catch((error) => {
            setState((prev) => ({
              ...prev,
              isStreaming: false,
              error: error.message,
            }));
            reject(error);
          });
      });
    },
    [baseUrl, onStart, onChunk, onComplete, onError]
  );

  // Stop streaming
  const stopStream = useCallback(() => {
    clientRef.current?.disconnect();
    clientRef.current = null;

    setState((prev) => ({
      ...prev,
      isStreaming: false,
    }));
  }, []);

  // Reset state
  const reset = useCallback(() => {
    stopStream();
    contentRef.current = '';
    setState(initialState);
  }, [stopStream]);

  return {
    state,
    startStream,
    stopStream,
    reset,
  };
}

// ============================================
// Simple Hook for Interview Streaming
// ============================================

export interface UseInterviewStreamReturn {
  content: string;
  isStreaming: boolean;
  error: string | null;
  sendMessage: (
    message: string,
    options?: {
      interviewerId?: string;
      conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
      position?: string;
    }
  ) => Promise<string>;
  stop: () => void;
  reset: () => void;
}

export function useInterviewStream(): UseInterviewStreamReturn {
  const { state, startStream, stopStream, reset } = useSSEStream();

  const sendMessage = useCallback(
    async (
      message: string,
      options?: {
        interviewerId?: string;
        conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
        position?: string;
      }
    ): Promise<string> => {
      return startStream({
        userMessage: message,
        interviewerId: options?.interviewerId,
        conversationHistory: options?.conversationHistory,
        position: options?.position,
      });
    },
    [startStream]
  );

  return {
    content: state.content,
    isStreaming: state.isStreaming,
    error: state.error,
    sendMessage,
    stop: stopStream,
    reset,
  };
}
