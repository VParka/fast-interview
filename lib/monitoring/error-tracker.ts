// ============================================
// Error Tracking Utilities
// ============================================
// Provides comprehensive error tracking for:
// - API errors with automatic categorization
// - Rate limiting and retry logic
// - Error aggregation and deduplication
// - Error recovery suggestions

import { sentryClient, captureApiError, type ErrorContext } from './sentry';

// ============================================
// Types
// ============================================

export type ErrorCategory =
  | 'api_error'
  | 'rate_limit'
  | 'auth_error'
  | 'validation_error'
  | 'timeout'
  | 'network_error'
  | 'openai_error'
  | 'database_error'
  | 'unknown';

export interface TrackedError {
  id: string;
  category: ErrorCategory;
  message: string;
  code?: string;
  statusCode?: number;
  timestamp: number;
  count: number;
  lastOccurrence: number;
  context?: ErrorContext;
  recoveryAction?: string;
}

export interface ErrorPattern {
  pattern: RegExp | string;
  category: ErrorCategory;
  recoveryAction?: string;
}

// ============================================
// Error Pattern Definitions
// ============================================

const ERROR_PATTERNS: ErrorPattern[] = [
  // Rate limiting
  {
    pattern: /rate.?limit|too.?many.?requests|429/i,
    category: 'rate_limit',
    recoveryAction: 'Wait and retry with exponential backoff',
  },
  // Authentication
  {
    pattern: /unauthorized|invalid.?api.?key|auth|401|403/i,
    category: 'auth_error',
    recoveryAction: 'Check API key configuration',
  },
  // OpenAI specific
  {
    pattern: /openai|gpt|completion|embedding|whisper|tts/i,
    category: 'openai_error',
    recoveryAction: 'Check OpenAI API status and quota',
  },
  // Timeout
  {
    pattern: /timeout|timed.?out|deadline|exceeded/i,
    category: 'timeout',
    recoveryAction: 'Increase timeout or reduce payload size',
  },
  // Network
  {
    pattern: /network|fetch|connection|econnrefused|enotfound/i,
    category: 'network_error',
    recoveryAction: 'Check network connectivity',
  },
  // Validation
  {
    pattern: /validation|invalid|required|missing|400/i,
    category: 'validation_error',
    recoveryAction: 'Check request payload format',
  },
  // Database
  {
    pattern: /database|db|postgres|supabase|query/i,
    category: 'database_error',
    recoveryAction: 'Check database connection and query',
  },
];

// ============================================
// Error Tracker Class
// ============================================

export class ErrorTracker {
  private errors: Map<string, TrackedError> = new Map();
  private maxErrors = 500;
  private deduplicationWindow = 60000; // 1 minute

  // Track an error with automatic categorization
  track(
    error: Error | unknown,
    endpoint?: string,
    context?: ErrorContext
  ): TrackedError {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const category = this.categorizeError(errorObj);
    const errorKey = this.generateErrorKey(errorObj, endpoint);

    // Check for existing error (deduplication)
    const existing = this.errors.get(errorKey);
    const now = Date.now();

    if (existing && now - existing.lastOccurrence < this.deduplicationWindow) {
      // Update existing error count
      existing.count++;
      existing.lastOccurrence = now;
      this.errors.set(errorKey, existing);

      // Only log every 10th occurrence in dedup window
      if (existing.count % 10 === 0) {
        console.warn(`[ErrorTracker] Repeated error (${existing.count}x):`, existing.message);
      }

      return existing;
    }

    // Create new tracked error
    const trackedError: TrackedError = {
      id: errorKey,
      category,
      message: errorObj.message,
      code: this.extractErrorCode(errorObj),
      statusCode: this.extractStatusCode(errorObj),
      timestamp: now,
      count: 1,
      lastOccurrence: now,
      context,
      recoveryAction: this.getRecoveryAction(category),
    };

    this.errors.set(errorKey, trackedError);

    // Trim old errors
    if (this.errors.size > this.maxErrors) {
      this.trimOldErrors();
    }

    // Log the error
    console.error(`[ErrorTracker] New error [${category}]:`, {
      message: trackedError.message,
      code: trackedError.code,
      statusCode: trackedError.statusCode,
      endpoint,
      recoveryAction: trackedError.recoveryAction,
    });

    // Send to Sentry if it's a significant error
    if (this.shouldReportToSentry(category)) {
      captureApiError(error, endpoint || 'unknown', context);
    }

    return trackedError;
  }

  // Get error by category
  getErrorsByCategory(category: ErrorCategory): TrackedError[] {
    return Array.from(this.errors.values()).filter((e) => e.category === category);
  }

  // Get error counts by category
  getErrorCounts(): Record<ErrorCategory, number> {
    const counts: Record<ErrorCategory, number> = {
      api_error: 0,
      rate_limit: 0,
      auth_error: 0,
      validation_error: 0,
      timeout: 0,
      network_error: 0,
      openai_error: 0,
      database_error: 0,
      unknown: 0,
    };

    for (const error of this.errors.values()) {
      counts[error.category] += error.count;
    }

    return counts;
  }

  // Get recent errors
  getRecentErrors(limit = 50): TrackedError[] {
    return Array.from(this.errors.values())
      .sort((a, b) => b.lastOccurrence - a.lastOccurrence)
      .slice(0, limit);
  }

  // Check if rate limited
  isRateLimited(windowMs = 60000, maxErrors = 10): boolean {
    const rateLimitErrors = this.getErrorsByCategory('rate_limit');
    const recentErrors = rateLimitErrors.filter(
      (e) => Date.now() - e.lastOccurrence < windowMs
    );

    const totalCount = recentErrors.reduce((sum, e) => sum + e.count, 0);
    return totalCount >= maxErrors;
  }

  // Clear errors
  clear(): void {
    this.errors.clear();
  }

  // Private methods
  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();
    const combined = `${name} ${message}`;

    for (const pattern of ERROR_PATTERNS) {
      if (typeof pattern.pattern === 'string') {
        if (combined.includes(pattern.pattern.toLowerCase())) {
          return pattern.category;
        }
      } else if (pattern.pattern.test(combined)) {
        return pattern.category;
      }
    }

    return 'unknown';
  }

  private generateErrorKey(error: Error, endpoint?: string): string {
    // Create a stable key for deduplication
    const message = error.message.slice(0, 100);
    const code = this.extractErrorCode(error) || '';
    return `${endpoint || 'unknown'}-${error.name}-${code}-${message}`.replace(
      /[^a-z0-9-]/gi,
      ''
    );
  }

  private extractErrorCode(error: Error): string | undefined {
    // Check for common error code properties
    const errorWithCode = error as Error & {
      code?: string;
      error_code?: string;
      errorCode?: string;
    };

    return errorWithCode.code || errorWithCode.error_code || errorWithCode.errorCode;
  }

  private extractStatusCode(error: Error): number | undefined {
    const errorWithStatus = error as Error & {
      status?: number;
      statusCode?: number;
      response?: { status?: number };
    };

    return (
      errorWithStatus.status ||
      errorWithStatus.statusCode ||
      errorWithStatus.response?.status
    );
  }

  private getRecoveryAction(category: ErrorCategory): string | undefined {
    const pattern = ERROR_PATTERNS.find((p) => p.category === category);
    return pattern?.recoveryAction;
  }

  private shouldReportToSentry(category: ErrorCategory): boolean {
    // Don't report rate limits or validation errors to Sentry
    return !['rate_limit', 'validation_error'].includes(category);
  }

  private trimOldErrors(): void {
    // Remove oldest errors
    const errors = Array.from(this.errors.entries())
      .sort(([, a], [, b]) => a.lastOccurrence - b.lastOccurrence);

    const toRemove = errors.slice(0, Math.floor(this.maxErrors * 0.2));
    for (const [key] of toRemove) {
      this.errors.delete(key);
    }
  }
}

// Singleton instance
export const errorTracker = new ErrorTracker();

// ============================================
// Higher-Order Function for Error Tracking
// ============================================

export function withErrorTracking<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  endpoint: string,
  context?: ErrorContext
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      errorTracker.track(error, endpoint, context);
      throw error;
    }
  }) as T;
}

// ============================================
// Retry with Exponential Backoff
// ============================================

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: Error, attempt: number) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  endpoint: string,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    shouldRetry = (error) => {
      const tracked = errorTracker.track(error, endpoint);
      // Retry rate limits and timeouts, but not auth errors
      return ['rate_limit', 'timeout', 'network_error'].includes(tracked.category);
    },
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxAttempts && shouldRetry(lastError, attempt)) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
        console.log(`[Retry] Attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw lastError;
      }
    }
  }

  throw lastError;
}
