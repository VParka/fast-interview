// ============================================
// Rate Limiting Implementation for Edge Middleware
// Enhanced with Daily Limits, Bot Protection, and Sliding Window
// ============================================

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

export interface DailyLimitConfig {
  maxPerDay: number;
  resource: string;
}

export interface DailyLimitResult {
  success: boolean;
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string;
}

// In-memory store (for development - use Vercel KV/Redis for production)
const memoryStore = new Map<string, { count: number; resetTime: number }>();
const dailyStore = new Map<string, { count: number; date: string }>();
const slidingWindowStore = new Map<string, number[]>();

// Bot detection: Track suspicious patterns
const suspiciousActivityStore = new Map<string, {
  rapidRequests: number;
  lastRequestTime: number;
  flaggedUntil: number;
}>();

// Cleanup expired entries periodically
let lastCleanup = Date.now();
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60000) return; // Run cleanup every minute
  lastCleanup = now;

  // Clean rate limit store
  for (const [key, value] of memoryStore.entries()) {
    if (value.resetTime < now) memoryStore.delete(key);
  }

  // Clean daily store (remove entries from previous days)
  const today = new Date().toISOString().split('T')[0];
  for (const [key, value] of dailyStore.entries()) {
    if (value.date !== today) dailyStore.delete(key);
  }

  // Clean sliding window store (remove old timestamps)
  for (const [key, timestamps] of slidingWindowStore.entries()) {
    const filtered = timestamps.filter(t => t > now - 3600000); // Keep last hour
    if (filtered.length === 0) {
      slidingWindowStore.delete(key);
    } else {
      slidingWindowStore.set(key, filtered);
    }
  }

  // Clean suspicious activity store
  for (const [key, value] of suspiciousActivityStore.entries()) {
    if (value.flaggedUntil < now) suspiciousActivityStore.delete(key);
  }
}

// ============================================
// Sliding Window Rate Limiter (More accurate than fixed window)
// ============================================
export async function slidingWindowRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  cleanup();
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const key = `sliding:${identifier}`;

  // Get existing timestamps
  let timestamps = slidingWindowStore.get(key) || [];

  // Filter out timestamps outside the window
  timestamps = timestamps.filter(t => t > windowStart);

  // Check if limit exceeded
  if (timestamps.length >= config.maxRequests) {
    const oldestInWindow = Math.min(...timestamps);
    const retryAfter = Math.ceil((oldestInWindow + config.windowMs - now) / 1000);

    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      reset: oldestInWindow + config.windowMs,
      retryAfter: Math.max(1, retryAfter),
    };
  }

  // Add current timestamp
  timestamps.push(now);
  slidingWindowStore.set(key, timestamps);

  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - timestamps.length,
    reset: now + config.windowMs,
  };
}

// ============================================
// Fixed Window Rate Limiter (Original, kept for compatibility)
// ============================================
export async function rateLimit(
  identifier: string,
  config: RateLimitConfig = {
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '20'),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS || '60') * 1000,
  }
): Promise<RateLimitResult> {
  cleanup();
  const now = Date.now();
  const key = `rate_limit:${identifier}`;
  const existing = memoryStore.get(key);

  if (!existing || existing.resetTime < now) {
    memoryStore.set(key, { count: 1, resetTime: now + config.windowMs });
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      reset: now + config.windowMs,
    };
  }

  existing.count += 1;
  const remaining = Math.max(0, config.maxRequests - existing.count);

  if (existing.count > config.maxRequests) {
    const retryAfter = Math.ceil((existing.resetTime - now) / 1000);
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      reset: existing.resetTime,
      retryAfter: Math.max(1, retryAfter),
    };
  }

  return {
    success: existing.count <= config.maxRequests,
    limit: config.maxRequests,
    remaining,
    reset: existing.resetTime,
  };
}

// ============================================
// Daily Resource Limit (e.g., interviews per day)
// ============================================
export async function checkDailyLimit(
  userId: string,
  config: DailyLimitConfig
): Promise<DailyLimitResult> {
  cleanup();
  const today = new Date().toISOString().split('T')[0];
  const key = `daily:${config.resource}:${userId}`;
  const existing = dailyStore.get(key);

  // Calculate when the limit resets (midnight UTC)
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  const resetsAt = tomorrow.toISOString();

  if (!existing || existing.date !== today) {
    // New day, reset count
    dailyStore.set(key, { count: 0, date: today });
    return {
      success: true,
      limit: config.maxPerDay,
      used: 0,
      remaining: config.maxPerDay,
      resetsAt,
    };
  }

  return {
    success: existing.count < config.maxPerDay,
    limit: config.maxPerDay,
    used: existing.count,
    remaining: Math.max(0, config.maxPerDay - existing.count),
    resetsAt,
  };
}

// Increment daily usage (call after successful resource creation)
export async function incrementDailyUsage(
  userId: string,
  resource: string
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const key = `daily:${resource}:${userId}`;
  const existing = dailyStore.get(key);

  if (!existing || existing.date !== today) {
    dailyStore.set(key, { count: 1, date: today });
  } else {
    existing.count += 1;
  }
}

// ============================================
// Bot Detection & Prevention
// ============================================
export interface BotCheckResult {
  isBot: boolean;
  confidence: number;
  reason?: string;
}

export function checkForBot(request: Request, identifier: string): BotCheckResult {
  const now = Date.now();
  const suspicious = suspiciousActivityStore.get(identifier);

  // Check if already flagged
  if (suspicious && suspicious.flaggedUntil > now) {
    return {
      isBot: true,
      confidence: 0.9,
      reason: 'Previously flagged for suspicious activity',
    };
  }

  // Check User-Agent
  const userAgent = request.headers.get('user-agent') || '';
  const suspiciousUA = [
    /curl/i,
    /wget/i,
    /python-requests/i,
    /httpie/i,
    /postman/i,
    /insomnia/i,
    /^$/,  // Empty user agent
  ];

  // Allow these for development, but flag in production
  if (process.env.NODE_ENV === 'production') {
    for (const pattern of suspiciousUA) {
      if (pattern.test(userAgent)) {
        return {
          isBot: true,
          confidence: 0.7,
          reason: `Suspicious User-Agent: ${userAgent.substring(0, 50)}`,
        };
      }
    }
  }

  // Check for rapid requests (more than 10 requests per second)
  if (suspicious) {
    const timeDiff = now - suspicious.lastRequestTime;
    if (timeDiff < 100) { // Less than 100ms between requests
      suspicious.rapidRequests += 1;
      suspicious.lastRequestTime = now;

      if (suspicious.rapidRequests > 10) {
        // Flag for 5 minutes
        suspicious.flaggedUntil = now + 5 * 60 * 1000;
        return {
          isBot: true,
          confidence: 0.95,
          reason: 'Rapid request pattern detected',
        };
      }
    } else if (timeDiff > 1000) {
      // Reset rapid request counter after 1 second gap
      suspicious.rapidRequests = 0;
    }
    suspicious.lastRequestTime = now;
  } else {
    suspiciousActivityStore.set(identifier, {
      rapidRequests: 0,
      lastRequestTime: now,
      flaggedUntil: 0,
    });
  }

  // Check for missing common headers (potential bot indicator)
  const hasAccept = request.headers.has('accept');
  const hasAcceptLanguage = request.headers.has('accept-language');

  if (!hasAccept && !hasAcceptLanguage) {
    return {
      isBot: false,
      confidence: 0.3,
      reason: 'Missing common browser headers',
    };
  }

  return {
    isBot: false,
    confidence: 0,
  };
}

// ============================================
// Rate Limit Headers
// ============================================
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  };

  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}

// ============================================
// Identifier Extraction
// ============================================
export function getIdentifier(request: Request, userId?: string): string {
  // Prefer user ID for authenticated requests
  if (userId) return `user:${userId}`;

  // For unauthenticated requests, use IP with fingerprinting
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfIp = request.headers.get('cf-connecting-ip');
  const ip = cfIp || realIp || forwardedFor?.split(',')[0]?.trim() || 'unknown';

  // Add a fingerprint for better tracking
  const userAgent = request.headers.get('user-agent') || '';
  const acceptLanguage = request.headers.get('accept-language') || '';
  const fingerprint = `${ip}:${hashString(userAgent + acceptLanguage)}`;

  return `ip:${fingerprint}`;
}

// Simple hash function for fingerprinting
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).substring(0, 8);
}

// ============================================
// API Rate Limit Configurations
// ============================================
export const API_RATE_LIMITS = {
  // Interview API - most expensive, strict limits
  interviewStart: { maxRequests: 10, windowMs: 60 * 60 * 1000 },  // 10 per hour
  interviewMessage: { maxRequests: 100, windowMs: 60 * 60 * 1000 }, // 100 per hour
  interviewEnd: { maxRequests: 20, windowMs: 60 * 60 * 1000 },    // 20 per hour

  // Speech API - moderate limits
  speech: { maxRequests: 50, windowMs: 60 * 1000 },          // 50 per minute
  tts: { maxRequests: 30, windowMs: 60 * 1000 },             // 30 per minute
  stt: { maxRequests: 30, windowMs: 60 * 1000 },             // 30 per minute

  // Upload API - strict limits
  upload: { maxRequests: 10, windowMs: 60 * 1000 },          // 10 per minute
  ragUpload: { maxRequests: 5, windowMs: 60 * 1000 },        // 5 per minute

  // Auth API - strict limits to prevent brute force
  login: { maxRequests: 5, windowMs: 15 * 60 * 1000 },       // 5 per 15 minutes
  signup: { maxRequests: 3, windowMs: 60 * 60 * 1000 },      // 3 per hour

  // Profile API
  profileUpdate: { maxRequests: 10, windowMs: 60 * 1000 },   // 10 per minute

  // Default for other APIs
  default: { maxRequests: 20, windowMs: 60 * 1000 },         // 20 per minute
} as const;

// Daily limits for resource creation
export const DAILY_LIMITS = {
  interviews: {
    free: 5,      // Free tier: 5 interviews per day
    pro: 50,      // Pro tier: 50 interviews per day
    unlimited: Infinity,
  },
  uploads: {
    free: 10,     // Free tier: 10 uploads per day
    pro: 100,     // Pro tier: 100 uploads per day
    unlimited: Infinity,
  },
} as const;

// Get rate limit config based on pathname
export function getRateLimitConfig(pathname: string): RateLimitConfig {
  if (pathname === '/api/interview/start') return API_RATE_LIMITS.interviewStart;
  if (pathname === '/api/interview/message') return API_RATE_LIMITS.interviewMessage;
  if (pathname === '/api/interview/end') return API_RATE_LIMITS.interviewEnd;
  if (pathname.includes('/api/interview')) return API_RATE_LIMITS.interviewMessage;
  if (pathname === '/api/tts') return API_RATE_LIMITS.tts;
  if (pathname === '/api/stt') return API_RATE_LIMITS.stt;
  if (pathname === '/api/transcribe') return API_RATE_LIMITS.stt;
  if (pathname === '/api/upload') return API_RATE_LIMITS.upload;
  if (pathname === '/api/rag/upload') return API_RATE_LIMITS.ragUpload;
  if (pathname === '/api/login') return API_RATE_LIMITS.login;
  if (pathname === '/api/profile/update') return API_RATE_LIMITS.profileUpdate;

  return API_RATE_LIMITS.default;
}

// ============================================
// Combined Rate Limit Check (for middleware)
// ============================================
export interface CombinedRateLimitResult {
  allowed: boolean;
  rateLimitResult?: RateLimitResult;
  dailyLimitResult?: DailyLimitResult;
  botCheckResult?: BotCheckResult;
  headers: Record<string, string>;
  errorMessage?: string;
}

export async function checkAllLimits(
  request: Request,
  userId?: string,
  pathname?: string,
  userTier: 'free' | 'pro' | 'unlimited' = 'free'
): Promise<CombinedRateLimitResult> {
  const identifier = getIdentifier(request, userId);
  const path = pathname || new URL(request.url).pathname;
  const config = getRateLimitConfig(path);

  // 1. Bot check
  const botCheck = checkForBot(request, identifier);
  if (botCheck.isBot && botCheck.confidence > 0.8) {
    return {
      allowed: false,
      botCheckResult: botCheck,
      headers: {},
      errorMessage: 'Request blocked: Automated access detected',
    };
  }

  // 2. Rate limit check (use sliding window for more accuracy)
  const rateLimitResult = await slidingWindowRateLimit(identifier, config);
  const headers = getRateLimitHeaders(rateLimitResult);

  if (!rateLimitResult.success) {
    return {
      allowed: false,
      rateLimitResult,
      headers,
      errorMessage: `Rate limit exceeded. Retry after ${rateLimitResult.retryAfter} seconds.`,
    };
  }

  // 3. Daily limit check (only for interview creation)
  if (userId && path === '/api/interview/start') {
    const dailyLimit = DAILY_LIMITS.interviews[userTier];
    const dailyResult = await checkDailyLimit(userId, {
      maxPerDay: dailyLimit,
      resource: 'interviews',
    });

    if (!dailyResult.success) {
      return {
        allowed: false,
        rateLimitResult,
        dailyLimitResult: dailyResult,
        headers: {
          ...headers,
          'X-DailyLimit-Limit': dailyResult.limit.toString(),
          'X-DailyLimit-Remaining': dailyResult.remaining.toString(),
          'X-DailyLimit-Reset': dailyResult.resetsAt,
        },
        errorMessage: `Daily interview limit reached (${dailyResult.limit}/day). Resets at ${dailyResult.resetsAt}`,
      };
    }
  }

  return {
    allowed: true,
    rateLimitResult,
    botCheckResult: botCheck,
    headers,
  };
}
