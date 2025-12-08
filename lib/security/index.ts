// ============================================
// Security Module - Central Export
// ============================================

// Encryption utilities
export {
  encrypt,
  decrypt,
  encryptFields,
  decryptFields,
  hash,
  verifyHash,
  generateSecureToken,
  deriveKeyFromPassword,
  maskSensitiveData,
  isEncrypted,
  safeEncrypt,
  safeDecrypt,
  sanitizeForLogging,
  DOCUMENT_ENCRYPTED_FIELDS,
  PROFILE_ENCRYPTED_FIELDS,
  SENSITIVE_LOG_FIELDS,
} from './encryption';

// Re-export rate limiting
export {
  rateLimit,
  slidingWindowRateLimit,
  checkDailyLimit,
  incrementDailyUsage,
  checkForBot,
  checkAllLimits,
  getIdentifier,
  getRateLimitConfig,
  getRateLimitHeaders,
  API_RATE_LIMITS,
  DAILY_LIMITS,
  type RateLimitConfig,
  type RateLimitResult,
  type DailyLimitConfig,
  type DailyLimitResult,
  type BotCheckResult,
  type CombinedRateLimitResult,
} from '../rate-limit';

// ============================================
// Security Validation Utilities
// ============================================

/**
 * Validate that a string is a valid UUID
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate and sanitize a URL
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Check for SQL injection patterns
 */
export function containsSqlInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE)\b)/i,
    /(--|\bOR\b|\bAND\b).*[=<>]/i,
    /[';]/,
    /\bUNION\b.*\bSELECT\b/i,
    /\bSLEEP\s*\(/i,
    /\bBENCHMARK\s*\(/i,
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Validate file path to prevent path traversal
 */
export function isValidFilePath(filepath: string): boolean {
  // Check for path traversal attempts
  if (filepath.includes('..') || filepath.includes('//')) {
    return false;
  }

  // Check for null bytes
  if (filepath.includes('\0')) {
    return false;
  }

  // Check for absolute paths (should be relative)
  if (filepath.startsWith('/') || /^[a-zA-Z]:/.test(filepath)) {
    return false;
  }

  return true;
}

// ============================================
// Request Validation
// ============================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate request body against a schema-like object
 */
export function validateRequestBody(
  body: Record<string, unknown>,
  requiredFields: string[],
  fieldValidators?: Record<string, (value: unknown) => boolean>
): ValidationResult {
  const errors: string[] = [];

  // Check required fields
  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Run field validators
  if (fieldValidators) {
    for (const [field, validator] of Object.entries(fieldValidators)) {
      if (body[field] !== undefined && !validator(body[field])) {
        errors.push(`Invalid value for field: ${field}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================
// CSRF Protection
// ============================================

/**
 * Generate a CSRF token
 */
export function generateCsrfToken(): string {
  const { generateSecureToken } = require('./encryption');
  return generateSecureToken(32);
}

/**
 * Validate Origin/Referer header against allowed origins
 */
export function validateOrigin(
  request: Request,
  allowedOrigins: string[]
): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // Check origin header first
  if (origin) {
    return allowedOrigins.some(allowed =>
      origin === allowed || origin.endsWith(`.${allowed.replace(/^https?:\/\//, '')}`)
    );
  }

  // Fall back to referer header
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      return allowedOrigins.some(allowed => {
        const allowedUrl = new URL(allowed);
        return refererUrl.origin === allowedUrl.origin;
      });
    } catch {
      return false;
    }
  }

  // No origin or referer - might be a same-origin request
  // Be lenient in development, strict in production
  return process.env.NODE_ENV !== 'production';
}

// ============================================
// Session Security
// ============================================

export interface SessionConfig {
  maxAge: number; // in seconds
  secure: boolean;
  httpOnly: boolean;
  sameSite: 'strict' | 'lax' | 'none';
}

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  maxAge: 24 * 60 * 60, // 24 hours
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'lax',
};

/**
 * Get cookie options for secure session management
 */
export function getSecureCookieOptions(
  config: Partial<SessionConfig> = {}
): SessionConfig {
  return {
    ...DEFAULT_SESSION_CONFIG,
    ...config,
    // Always force secure in production
    secure: process.env.NODE_ENV === 'production' ? true : (config.secure ?? DEFAULT_SESSION_CONFIG.secure),
  };
}
