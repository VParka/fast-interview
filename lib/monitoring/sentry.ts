// ============================================
// Sentry Integration for Error Tracking & Performance Monitoring
// ============================================
// This module provides Sentry integration for:
// - Error tracking with context
// - Performance monitoring
// - OpenAI API latency tracking
// - Custom breadcrumbs for debugging

// Note: To use Sentry, install the SDK:
// npm install @sentry/nextjs

export interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
  tracesSampleRate?: number;
  profilesSampleRate?: number;
}

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  interviewId?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

export interface PerformanceSpan {
  name: string;
  op: string;
  startTime: number;
  data?: Record<string, unknown>;
}

// Lightweight Sentry-like interface that works without the actual SDK
// Replace with actual Sentry SDK calls when installed
class SentryClient {
  private initialized = false;
  private config: SentryConfig | null = null;
  private breadcrumbs: Array<{
    message: string;
    category: string;
    level: 'debug' | 'info' | 'warning' | 'error';
    timestamp: number;
    data?: Record<string, unknown>;
  }> = [];

  init(config: SentryConfig): void {
    this.config = config;
    this.initialized = true;

    console.log('[Sentry] Initialized with config:', {
      dsn: config.dsn ? '***configured***' : 'not set',
      environment: config.environment,
      tracesSampleRate: config.tracesSampleRate,
    });
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  // Capture an exception with optional context
  captureException(error: Error | unknown, context?: ErrorContext): string {
    const eventId = this.generateEventId();

    const errorObj = error instanceof Error ? error : new Error(String(error));

    const payload = {
      eventId,
      error: {
        name: errorObj.name,
        message: errorObj.message,
        stack: errorObj.stack,
      },
      context,
      breadcrumbs: this.breadcrumbs.slice(-20), // Last 20 breadcrumbs
      timestamp: Date.now(),
      environment: this.config?.environment || 'development',
    };

    // In production with Sentry SDK, this would send to Sentry
    // For now, log to console with structured format
    console.error('[Sentry] Exception captured:', JSON.stringify(payload, null, 2));

    // Clear breadcrumbs after capturing
    this.breadcrumbs = [];

    return eventId;
  }

  // Capture a message (non-error event)
  captureMessage(
    message: string,
    level: 'debug' | 'info' | 'warning' | 'error' = 'info',
    context?: ErrorContext
  ): string {
    const eventId = this.generateEventId();

    const payload = {
      eventId,
      message,
      level,
      context,
      timestamp: Date.now(),
      environment: this.config?.environment || 'development',
    };

    if (level === 'error' || level === 'warning') {
      console.warn('[Sentry] Message captured:', JSON.stringify(payload, null, 2));
    } else {
      console.log('[Sentry] Message captured:', JSON.stringify(payload, null, 2));
    }

    return eventId;
  }

  // Add a breadcrumb for debugging context
  addBreadcrumb(
    message: string,
    category: string,
    level: 'debug' | 'info' | 'warning' | 'error' = 'info',
    data?: Record<string, unknown>
  ): void {
    this.breadcrumbs.push({
      message,
      category,
      level,
      timestamp: Date.now(),
      data,
    });

    // Keep only last 100 breadcrumbs
    if (this.breadcrumbs.length > 100) {
      this.breadcrumbs = this.breadcrumbs.slice(-100);
    }
  }

  // Set user context for all subsequent events
  setUser(user: { id: string; email?: string; username?: string } | null): void {
    if (user) {
      this.addBreadcrumb(`User set: ${user.id}`, 'auth', 'info', { userId: user.id });
    }
  }

  // Set extra context data
  setContext(name: string, context: Record<string, unknown>): void {
    this.addBreadcrumb(`Context set: ${name}`, 'context', 'debug', context);
  }

  // Start a performance transaction
  startTransaction(name: string, op: string): PerformanceTransaction {
    return new PerformanceTransaction(name, op, this);
  }

  private generateEventId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Performance transaction for tracking operations
export class PerformanceTransaction {
  private name: string;
  private op: string;
  private startTime: number;
  private spans: PerformanceSpan[] = [];
  private client: SentryClient;
  private finished = false;

  constructor(name: string, op: string, client: SentryClient) {
    this.name = name;
    this.op = op;
    this.startTime = Date.now();
    this.client = client;
  }

  // Start a child span within this transaction
  startSpan(name: string, op: string, data?: Record<string, unknown>): () => void {
    const span: PerformanceSpan = {
      name,
      op,
      startTime: Date.now(),
      data,
    };
    this.spans.push(span);

    // Return a function to finish the span
    return () => {
      const duration = Date.now() - span.startTime;
      this.client.addBreadcrumb(
        `Span completed: ${name} (${duration}ms)`,
        'performance',
        'debug',
        { ...data, duration_ms: duration }
      );
    };
  }

  // Finish the transaction
  finish(): void {
    if (this.finished) return;
    this.finished = true;

    const totalDuration = Date.now() - this.startTime;

    console.log('[Sentry] Transaction completed:', {
      name: this.name,
      op: this.op,
      duration_ms: totalDuration,
      spans_count: this.spans.length,
    });
  }
}

// Singleton instance
export const sentryClient = new SentryClient();

// Initialize Sentry with environment config
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (!dsn) {
    console.warn('[Sentry] DSN not configured. Error tracking disabled.');
    return;
  }

  sentryClient.init({
    dsn,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    release: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}

// ============================================
// Error Tracking Utilities
// ============================================

// Capture API errors with full context
export function captureApiError(
  error: Error | unknown,
  endpoint: string,
  context?: ErrorContext
): string {
  sentryClient.addBreadcrumb(`API Error: ${endpoint}`, 'api', 'error', {
    endpoint,
    ...context?.metadata,
  });

  return sentryClient.captureException(error, {
    ...context,
    action: `api:${endpoint}`,
  });
}

// Capture OpenAI specific errors
export function captureOpenAIError(
  error: Error | unknown,
  operation: string,
  model: string,
  context?: ErrorContext
): string {
  sentryClient.addBreadcrumb(`OpenAI Error: ${operation}`, 'openai', 'error', {
    operation,
    model,
  });

  return sentryClient.captureException(error, {
    ...context,
    action: `openai:${operation}`,
    metadata: {
      ...context?.metadata,
      model,
      operation,
    },
  });
}

// Track user actions for debugging
export function trackUserAction(
  action: string,
  data?: Record<string, unknown>
): void {
  sentryClient.addBreadcrumb(action, 'user', 'info', data);
}

// Set interview context for all errors in a session
export function setInterviewContext(
  interviewId: string,
  userId: string,
  sessionData?: Record<string, unknown>
): void {
  sentryClient.setContext('interview', {
    interview_id: interviewId,
    user_id: userId,
    ...sessionData,
  });
}
