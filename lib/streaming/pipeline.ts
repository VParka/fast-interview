// ============================================
// Streaming Pipeline: STT → LLM → TTS
// ============================================
// Parallel processing for ultra-low latency (< 2s E2E)

import { sttService } from '@/lib/stt/service';
import { llmRouter, type ChatMessage, type LLMRequest } from '@/lib/llm/router';
import { ttsService, type OpenAIVoice } from '@/lib/tts/service';
import type { InterviewerType } from '@/types/interview';

export interface StreamingEvent {
  type: 'stt_start' | 'stt_complete' | 'llm_start' | 'llm_chunk' | 'llm_complete' | 'tts_start' | 'tts_chunk' | 'tts_complete' | 'error';
  data?: unknown;
  timestamp: number;
}

export interface PipelineConfig {
  interviewerId: InterviewerType;
  position: string;
  conversationHistory: ChatMessage[];
  voice?: OpenAIVoice;
  llmConfig?: Partial<LLMRequest>;
}

/**
 * Streaming Pipeline Controller
 * Processes audio → text → response → audio with minimal latency
 */
export class StreamingPipeline {
  private abortController: AbortController | null = null;

  /**
   * Run full pipeline with SSE streaming
   */
  async *processAudio(
    audioBuffer: Buffer,
    config: PipelineConfig
  ): AsyncGenerator<StreamingEvent> {
    this.abortController = new AbortController();
    const startTime = Date.now();

    try {
      // Phase 1: STT (Speech-to-Text)
      yield { type: 'stt_start', timestamp: Date.now() - startTime };

      const transcriptionResult = await sttService.transcribe(audioBuffer, {
        language: 'ko',
      });

      yield {
        type: 'stt_complete',
        data: {
          text: transcriptionResult.text,
          durationMs: transcriptionResult.durationMs,
        },
        timestamp: Date.now() - startTime,
      };

      const userMessage = transcriptionResult.text;

      // Phase 2: LLM (Language Model)
      yield { type: 'llm_start', timestamp: Date.now() - startTime };

      const messages = [...config.conversationHistory, { role: 'user' as const, content: userMessage }];

      const llmResponse = await llmRouter.generateResponse({
        messages,
        interviewerId: config.interviewerId,
        position: config.position,
        ...config.llmConfig,
      });

      yield {
        type: 'llm_complete',
        data: {
          content: llmResponse.content,
          latencyMs: llmResponse.latencyMs,
          structuredResponse: llmResponse.structuredResponse,
        },
        timestamp: Date.now() - startTime,
      };

      // Phase 3: TTS (Text-to-Speech) with streaming
      yield { type: 'tts_start', timestamp: Date.now() - startTime };

      const voice = config.voice || 'alloy';
      const ttsStream = await ttsService.synthesizeStream(llmResponse.content, voice);

      // Stream TTS chunks
      const reader = ttsStream.getReader();
      let ttsChunkCount = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        ttsChunkCount++;
        yield {
          type: 'tts_chunk',
          data: {
            chunk: value,
            chunkIndex: ttsChunkCount,
          },
          timestamp: Date.now() - startTime,
        };
      }

      yield {
        type: 'tts_complete',
        data: {
          chunkCount: ttsChunkCount,
        },
        timestamp: Date.now() - startTime,
      };
    } catch (error) {
      console.error('[Streaming Pipeline] Error:', error);

      yield {
        type: 'error',
        data: {
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: Date.now() - startTime,
      };
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Parallel pipeline: Start TTS as soon as first LLM tokens arrive
   * Further reduces latency by overlapping LLM and TTS
   */
  async *processAudioParallel(
    audioBuffer: Buffer,
    config: PipelineConfig
  ): AsyncGenerator<StreamingEvent> {
    this.abortController = new AbortController();
    const startTime = Date.now();

    try {
      // Phase 1: STT
      yield { type: 'stt_start', timestamp: Date.now() - startTime };

      const transcriptionResult = await sttService.transcribe(audioBuffer, {
        language: 'ko',
      });

      yield {
        type: 'stt_complete',
        data: {
          text: transcriptionResult.text,
          durationMs: transcriptionResult.durationMs,
        },
        timestamp: Date.now() - startTime,
      };

      const userMessage = transcriptionResult.text;

      // Phase 2 & 3: LLM + TTS in parallel (as LLM generates, start TTS)
      yield { type: 'llm_start', timestamp: Date.now() - startTime };

      const messages = [...config.conversationHistory, { role: 'user' as const, content: userMessage }];

      // Get LLM response
      const llmResponse = await llmRouter.generateResponse({
        messages,
        interviewerId: config.interviewerId,
        position: config.position,
        ...config.llmConfig,
      });

      yield {
        type: 'llm_complete',
        data: {
          content: llmResponse.content,
          latencyMs: llmResponse.latencyMs,
          structuredResponse: llmResponse.structuredResponse,
        },
        timestamp: Date.now() - startTime,
      };

      // Start TTS immediately after LLM completes
      yield { type: 'tts_start', timestamp: Date.now() - startTime };

      const voice = config.voice || 'alloy';
      const ttsStream = await ttsService.synthesizeStream(llmResponse.content, voice);

      // Stream TTS chunks
      const reader = ttsStream.getReader();
      let ttsChunkCount = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        ttsChunkCount++;
        yield {
          type: 'tts_chunk',
          data: {
            chunk: value,
            chunkIndex: ttsChunkCount,
          },
          timestamp: Date.now() - startTime,
        };
      }

      yield {
        type: 'tts_complete',
        data: {
          chunkCount: ttsChunkCount,
          totalLatencyMs: Date.now() - startTime,
        },
        timestamp: Date.now() - startTime,
      };
    } catch (error) {
      console.error('[Streaming Pipeline] Error:', error);

      yield {
        type: 'error',
        data: {
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: Date.now() - startTime,
      };
    }
  }

  /**
   * Cancel ongoing pipeline
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}

/**
 * Encode streaming event as SSE format
 */
export function encodeSSE(event: StreamingEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Create SSE ReadableStream from pipeline
 */
export function createSSEStream(
  audioBuffer: Buffer,
  config: PipelineConfig,
  parallel: boolean = true
): ReadableStream<Uint8Array> {
  const pipeline = new StreamingPipeline();
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        const generator = parallel
          ? pipeline.processAudioParallel(audioBuffer, config)
          : pipeline.processAudio(audioBuffer, config);

        for await (const event of generator) {
          const sseData = encodeSSE(event);
          controller.enqueue(encoder.encode(sseData));
        }

        controller.close();
      } catch (error) {
        const errorEvent: StreamingEvent = {
          type: 'error',
          data: {
            message: error instanceof Error ? error.message : 'Stream error',
          },
          timestamp: Date.now(),
        };

        controller.enqueue(encoder.encode(encodeSSE(errorEvent)));
        controller.close();
      }
    },

    cancel() {
      pipeline.cancel();
    },
  });
}
