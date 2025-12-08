// ============================================
// Encryption Utility for Sensitive Data
// AES-256-GCM encryption for data at rest
// ============================================

import crypto from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits
const SALT_LENGTH = 32; // 256 bits
const PBKDF2_ITERATIONS = 100000;

// Get encryption key from environment (or derive from master secret)
function getEncryptionKey(): Buffer {
  const masterKey = process.env.ENCRYPTION_MASTER_KEY;

  if (!masterKey) {
    console.warn('WARNING: ENCRYPTION_MASTER_KEY not set. Using fallback key (NOT SECURE FOR PRODUCTION)');
    // Generate a consistent fallback key for development only
    const fallbackKey = crypto.createHash('sha256')
      .update('development-fallback-key-not-for-production')
      .digest();
    return fallbackKey;
  }

  // If the key is in hex format, convert it
  if (masterKey.length === 64 && /^[0-9a-fA-F]+$/.test(masterKey)) {
    return Buffer.from(masterKey, 'hex');
  }

  // Otherwise, derive a key using SHA-256
  return crypto.createHash('sha256').update(masterKey).digest();
}

/**
 * Encrypt sensitive data using AES-256-GCM
 * Returns a string in format: iv:authTag:encryptedData (all in base64)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  // Combine IV, auth tag, and encrypted data
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt data encrypted with the encrypt function
 */
export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey();

  // Parse the encrypted string
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(parts[0], 'base64');
  const authTag = Buffer.from(parts[1], 'base64');
  const ciphertext = parts[2];

  // Validate lengths
  if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error('Invalid IV or auth tag length');
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Encrypt an object by encrypting each specified field
 */
export function encryptFields<T extends Record<string, unknown>>(
  obj: T,
  fieldsToEncrypt: (keyof T)[]
): T {
  const result = { ...obj };

  for (const field of fieldsToEncrypt) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = encrypt(result[field] as string) as T[keyof T];
    } else if (result[field] && typeof result[field] === 'object') {
      // For objects, stringify and encrypt
      result[field] = encrypt(JSON.stringify(result[field])) as T[keyof T];
    }
  }

  return result;
}

/**
 * Decrypt an object by decrypting each specified field
 */
export function decryptFields<T extends Record<string, unknown>>(
  obj: T,
  fieldsToDecrypt: (keyof T)[],
  jsonFields: (keyof T)[] = []
): T {
  const result = { ...obj };

  for (const field of fieldsToDecrypt) {
    if (result[field] && typeof result[field] === 'string') {
      try {
        const decrypted = decrypt(result[field] as string);

        // Parse as JSON if specified
        if (jsonFields.includes(field)) {
          result[field] = JSON.parse(decrypted) as T[keyof T];
        } else {
          result[field] = decrypted as T[keyof T];
        }
      } catch (error) {
        console.error(`Failed to decrypt field ${String(field)}:`, error);
        // Keep original value if decryption fails (might not be encrypted)
      }
    }
  }

  return result;
}

/**
 * Hash sensitive data (one-way, for comparison purposes)
 * Uses HMAC-SHA256 for consistent hashing
 */
export function hash(data: string): string {
  const key = getEncryptionKey();
  return crypto
    .createHmac('sha256', key)
    .update(data)
    .digest('hex');
}

/**
 * Verify if plain data matches a hash
 */
export function verifyHash(data: string, hashedValue: string): boolean {
  const dataHash = hash(data);
  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(dataHash, 'hex'),
    Buffer.from(hashedValue, 'hex')
  );
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Derive a key from a password using PBKDF2
 * Used for password-based encryption (if needed)
 */
export function deriveKeyFromPassword(
  password: string,
  salt?: Buffer
): { key: Buffer; salt: Buffer } {
  const usedSalt = salt || crypto.randomBytes(SALT_LENGTH);

  const key = crypto.pbkdf2Sync(
    password,
    usedSalt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    'sha256'
  );

  return { key, salt: usedSalt };
}

/**
 * Mask sensitive data for logging/display
 * Shows first and last few characters
 */
export function maskSensitiveData(
  data: string,
  showFirst: number = 4,
  showLast: number = 4
): string {
  if (data.length <= showFirst + showLast) {
    return '*'.repeat(data.length);
  }

  const firstPart = data.substring(0, showFirst);
  const lastPart = data.substring(data.length - showLast);
  const maskLength = Math.min(data.length - showFirst - showLast, 8);

  return `${firstPart}${'*'.repeat(maskLength)}${lastPart}`;
}

/**
 * Check if a string appears to be encrypted (has our format)
 */
export function isEncrypted(data: string): boolean {
  const parts = data.split(':');
  if (parts.length !== 3) return false;

  try {
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    return iv.length === IV_LENGTH && authTag.length === AUTH_TAG_LENGTH;
  } catch {
    return false;
  }
}

/**
 * Safely encrypt data, returning original if already encrypted
 */
export function safeEncrypt(data: string): string {
  if (isEncrypted(data)) {
    return data; // Already encrypted
  }
  return encrypt(data);
}

/**
 * Safely decrypt data, returning original if not encrypted
 */
export function safeDecrypt(data: string): string {
  if (!isEncrypted(data)) {
    return data; // Not encrypted
  }
  try {
    return decrypt(data);
  } catch {
    return data; // Decryption failed, return original
  }
}

// ============================================
// Sensitive Data Types
// ============================================

// Fields that should be encrypted in documents
export const DOCUMENT_ENCRYPTED_FIELDS = ['content'] as const;

// Fields that should be encrypted in user profiles
export const PROFILE_ENCRYPTED_FIELDS = [] as const; // Add if needed

// Fields that should be masked in logs
export const SENSITIVE_LOG_FIELDS = [
  'password',
  'token',
  'api_key',
  'secret',
  'authorization',
  'content', // Document content
  'resume',
  'portfolio',
];

/**
 * Sanitize an object for logging by masking sensitive fields
 */
export function sanitizeForLogging(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...obj };

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();

    // Check if this field should be masked
    const shouldMask = SENSITIVE_LOG_FIELDS.some(
      field => lowerKey.includes(field.toLowerCase())
    );

    if (shouldMask && typeof sanitized[key] === 'string') {
      sanitized[key] = maskSensitiveData(sanitized[key] as string);
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeForLogging(sanitized[key] as Record<string, unknown>);
    }
  }

  return sanitized;
}
