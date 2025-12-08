// ============================================
// Monitoring Module - Unified Exports
// ============================================

// Sentry integration
export {
  sentryClient,
  initSentry,
  captureApiError,
  captureOpenAIError,
  trackUserAction,
  setInterviewContext,
  PerformanceTransaction,
  type SentryConfig,
  type ErrorContext,
  type PerformanceSpan,
} from './sentry';

// Latency tracking
export {
  latencyTracker,
  trackOpenAILatency,
  trackApiLatency,
  createLatencyTimer,
  LatencyTimer,
  getOpenAIStats,
  getChatStats,
  getTTSStats,
  getSTTStats,
  getAllStats,
  type LatencyMetric,
  type LatencyStats,
  type OpenAILatencyContext,
  type OpenAICallResult,
  type TrackedApiCallOptions,
} from './latency';

// Error tracking utilities
export { ErrorTracker, errorTracker, withErrorTracking } from './error-tracker';
