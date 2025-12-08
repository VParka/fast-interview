// ============================================
// API Latency Tracking - OpenAI & External Services
// ============================================
// Provides detailed latency tracking for:
// - OpenAI API calls (Chat, TTS, STT)
// - External API integrations
// - Database operations
// - Performance metrics aggregation

import { sentryClient, captureApiError } from './sentry';

// ============================================
// Types
// ============================================

export interface LatencyMetric {
  operation: string;
  provider: string;
  model?: string;
  latency_ms: number;
  success: boolean;
  error?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface LatencyStats {
  operation: string;
  count: number;
  total_ms: number;
  avg_ms: number;
  min_ms: number;
  max_ms: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  success_rate: number;
}

export interface OpenAILatencyContext {
  model: string;
  operation: 'chat' | 'tts' | 'stt' | 'embedding';
  input_tokens?: number;
  output_tokens?: number;
  stream?: boolean;
}

// ============================================
// Latency Tracker Class
// ============================================

class LatencyTracker {
  private metrics: LatencyMetric[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics in memory

  // Track a single latency measurement
  track(metric: LatencyMetric): void {
    this.metrics.push(metric);

    // Trim old metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log the metric
    const logLevel = metric.success ? 'info' : 'warn';
    const logFn = logLevel === 'warn' ? console.warn : console.log;

    logFn(`[Latency] ${metric.provider}:${metric.operation}`, {
      latency_ms: metric.latency_ms,
      success: metric.success,
      model: metric.model,
      ...metric.metadata,
    });

    // Add breadcrumb for Sentry
    sentryClient.addBreadcrumb(
      `${metric.provider}:${metric.operation} - ${metric.latency_ms}ms`,
      'latency',
      metric.success ? 'info' : 'warning',
      {
        latency_ms: metric.latency_ms,
        model: metric.model,
        success: metric.success,
      }
    );

    // Alert on slow operations (>5 seconds)
    if (metric.latency_ms > 5000) {
      sentryClient.captureMessage(
        `Slow operation detected: ${metric.provider}:${metric.operation} took ${metric.latency_ms}ms`,
        'warning',
        {
          action: 'slow_operation',
          metadata: {
            ...metric.metadata,
            latency_ms: metric.latency_ms,
          },
        }
      );
    }
  }

  // Get statistics for a specific operation
  getStats(operation?: string, provider?: string): LatencyStats | null {
    let filtered = this.metrics;

    if (operation) {
      filtered = filtered.filter((m) => m.operation === operation);
    }
    if (provider) {
      filtered = filtered.filter((m) => m.provider === provider);
    }

    if (filtered.length === 0) return null;

    const latencies = filtered.map((m) => m.latency_ms).sort((a, b) => a - b);
    const successCount = filtered.filter((m) => m.success).length;

    return {
      operation: operation || 'all',
      count: filtered.length,
      total_ms: latencies.reduce((a, b) => a + b, 0),
      avg_ms: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length),
      min_ms: latencies[0],
      max_ms: latencies[latencies.length - 1],
      p50_ms: this.percentile(latencies, 50),
      p95_ms: this.percentile(latencies, 95),
      p99_ms: this.percentile(latencies, 99),
      success_rate: Math.round((successCount / filtered.length) * 100) / 100,
    };
  }

  // Get all recent metrics
  getRecentMetrics(limit = 100): LatencyMetric[] {
    return this.metrics.slice(-limit);
  }

  // Clear all metrics
  clear(): void {
    this.metrics = [];
  }

  private percentile(sortedArray: number[], p: number): number {
    const index = Math.ceil((p / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }
}

// Singleton instance
export const latencyTracker = new LatencyTracker();

// ============================================
// OpenAI Specific Latency Tracking
// ============================================

export interface OpenAICallResult<T> {
  data: T;
  latency_ms: number;
  model: string;
  tokens?: {
    input: number;
    output: number;
    total: number;
  };
}

// Wrapper function to track OpenAI API calls
export async function trackOpenAILatency<T>(
  operation: OpenAILatencyContext['operation'],
  model: string,
  apiCall: () => Promise<T>,
  extractTokens?: (result: T) => { input: number; output: number }
): Promise<OpenAICallResult<T>> {
  const startTime = Date.now();
  let success = false;
  let error: string | undefined;
  let tokens: { input: number; output: number; total: number } | undefined;

  try {
    const result = await apiCall();
    success = true;

    // Extract token usage if available
    if (extractTokens) {
      const tokenUsage = extractTokens(result);
      tokens = {
        input: tokenUsage.input,
        output: tokenUsage.output,
        total: tokenUsage.input + tokenUsage.output,
      };
    }

    const latency_ms = Date.now() - startTime;

    // Track the metric
    latencyTracker.track({
      operation,
      provider: 'openai',
      model,
      latency_ms,
      success: true,
      timestamp: Date.now(),
      metadata: tokens ? { tokens } : undefined,
    });

    return {
      data: result,
      latency_ms,
      model,
      tokens,
    };
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    const latency_ms = Date.now() - startTime;

    // Track failed metric
    latencyTracker.track({
      operation,
      provider: 'openai',
      model,
      latency_ms,
      success: false,
      error,
      timestamp: Date.now(),
    });

    // Capture error to Sentry
    captureApiError(err, `openai:${operation}`, {
      action: operation,
      metadata: { model, latency_ms },
    });

    throw err;
  }
}

// ============================================
// Generic API Call Tracking
// ============================================

export interface TrackedApiCallOptions {
  operation: string;
  provider: string;
  model?: string;
  metadata?: Record<string, unknown>;
}

// Generic wrapper for any API call
export async function trackApiLatency<T>(
  options: TrackedApiCallOptions,
  apiCall: () => Promise<T>
): Promise<{ data: T; latency_ms: number }> {
  const startTime = Date.now();

  try {
    const data = await apiCall();
    const latency_ms = Date.now() - startTime;

    latencyTracker.track({
      operation: options.operation,
      provider: options.provider,
      model: options.model,
      latency_ms,
      success: true,
      timestamp: Date.now(),
      metadata: options.metadata,
    });

    return { data, latency_ms };
  } catch (err) {
    const latency_ms = Date.now() - startTime;

    latencyTracker.track({
      operation: options.operation,
      provider: options.provider,
      model: options.model,
      latency_ms,
      success: false,
      error: err instanceof Error ? err.message : String(err),
      timestamp: Date.now(),
      metadata: options.metadata,
    });

    throw err;
  }
}

// ============================================
// Timer Utility for Manual Tracking
// ============================================

export class LatencyTimer {
  private operation: string;
  private provider: string;
  private model?: string;
  private startTime: number;
  private metadata: Record<string, unknown>;

  constructor(
    operation: string,
    provider: string,
    model?: string,
    metadata: Record<string, unknown> = {}
  ) {
    this.operation = operation;
    this.provider = provider;
    this.model = model;
    this.metadata = metadata;
    this.startTime = Date.now();
  }

  // End the timer and record success
  success(additionalMetadata?: Record<string, unknown>): number {
    const latency_ms = Date.now() - this.startTime;

    latencyTracker.track({
      operation: this.operation,
      provider: this.provider,
      model: this.model,
      latency_ms,
      success: true,
      timestamp: Date.now(),
      metadata: { ...this.metadata, ...additionalMetadata },
    });

    return latency_ms;
  }

  // End the timer and record failure
  failure(error: string | Error, additionalMetadata?: Record<string, unknown>): number {
    const latency_ms = Date.now() - this.startTime;
    const errorMessage = error instanceof Error ? error.message : error;

    latencyTracker.track({
      operation: this.operation,
      provider: this.provider,
      model: this.model,
      latency_ms,
      success: false,
      error: errorMessage,
      timestamp: Date.now(),
      metadata: { ...this.metadata, ...additionalMetadata },
    });

    return latency_ms;
  }

  // Get elapsed time without recording
  elapsed(): number {
    return Date.now() - this.startTime;
  }
}

// Factory function for creating timers
export function createLatencyTimer(
  operation: string,
  provider: string,
  model?: string,
  metadata?: Record<string, unknown>
): LatencyTimer {
  return new LatencyTimer(operation, provider, model, metadata);
}

// ============================================
// Exports for monitoring dashboard
// ============================================

export function getOpenAIStats(): LatencyStats | null {
  return latencyTracker.getStats(undefined, 'openai');
}

export function getChatStats(): LatencyStats | null {
  return latencyTracker.getStats('chat', 'openai');
}

export function getTTSStats(): LatencyStats | null {
  return latencyTracker.getStats('tts', 'openai');
}

export function getSTTStats(): LatencyStats | null {
  return latencyTracker.getStats('stt', 'openai');
}

export function getAllStats(): {
  openai: LatencyStats | null;
  chat: LatencyStats | null;
  tts: LatencyStats | null;
  stt: LatencyStats | null;
} {
  return {
    openai: getOpenAIStats(),
    chat: getChatStats(),
    tts: getTTSStats(),
    stt: getSTTStats(),
  };
}
