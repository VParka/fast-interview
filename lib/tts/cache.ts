// ============================================
// TTS Audio Caching with Supabase Storage
// ============================================
// Provides caching strategy for TTS audio files:
// - Hash-based cache key generation
// - Supabase Storage for persistent cache
// - In-memory LRU cache for hot data
// - Cache TTL management
// - CDN-friendly URL generation

import { createServerClient } from '@/lib/supabase/client';
import { createLatencyTimer } from '@/lib/monitoring/latency';
import crypto from 'crypto';

// ============================================
// Types
// ============================================

export interface CachedAudio {
  buffer: Buffer;
  contentType: string;
  cacheHit: boolean;
  url?: string;
  createdAt?: number;
}

export interface CacheConfig {
  bucketName: string;
  ttlSeconds: number;
  maxMemoryCacheSize: number;
  enableMemoryCache: boolean;
  enableStorageCache: boolean;
}

export interface CacheStats {
  memoryHits: number;
  memoryMisses: number;
  storageHits: number;
  storageMisses: number;
  memoryCacheSize: number;
  hitRate: number;
}

// ============================================
// Configuration
// ============================================

const DEFAULT_CONFIG: CacheConfig = {
  bucketName: 'tts-cache',
  ttlSeconds: 60 * 60 * 24 * 7, // 7 days
  maxMemoryCacheSize: 50, // Max 50 items in memory
  enableMemoryCache: true,
  enableStorageCache: true,
};

// ============================================
// LRU Memory Cache
// ============================================

interface MemoryCacheEntry {
  buffer: Buffer;
  contentType: string;
  timestamp: number;
  size: number;
}

class LRUCache<T> {
  private cache: Map<string, T> = new Map();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (item) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, item);
    }
    return item;
  }

  set(key: string, value: T): void {
    // If key exists, delete it first (will be re-added at end)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // If at capacity, remove oldest (first) item
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, value);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}

// ============================================
// TTS Cache Class
// ============================================

export class TTSCache {
  private config: CacheConfig;
  private memoryCache: LRUCache<MemoryCacheEntry>;
  private stats: CacheStats = {
    memoryHits: 0,
    memoryMisses: 0,
    storageHits: 0,
    storageMisses: 0,
    memoryCacheSize: 0,
    hitRate: 0,
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.memoryCache = new LRUCache(this.config.maxMemoryCacheSize);
  }

  // Generate cache key from text and voice settings
  generateCacheKey(
    text: string,
    voice: string,
    speed: number = 1.0,
    model: string = 'tts-1'
  ): string {
    const normalized = text.trim().toLowerCase();
    const input = `${normalized}:${voice}:${speed}:${model}`;
    const hash = crypto.createHash('sha256').update(input).digest('hex');
    return `${hash.substring(0, 16)}.mp3`;
  }

  // Get audio from cache (memory first, then storage)
  async get(cacheKey: string): Promise<CachedAudio | null> {
    const timer = createLatencyTimer('cache_get', 'tts-cache');

    // 1. Check memory cache first
    if (this.config.enableMemoryCache) {
      const memoryEntry = this.memoryCache.get(cacheKey);
      if (memoryEntry) {
        this.stats.memoryHits++;
        this.updateHitRate();
        timer.success({ source: 'memory' });

        return {
          buffer: memoryEntry.buffer,
          contentType: memoryEntry.contentType,
          cacheHit: true,
          createdAt: memoryEntry.timestamp,
        };
      }
      this.stats.memoryMisses++;
    }

    // 2. Check Supabase Storage
    if (this.config.enableStorageCache) {
      try {
        const supabase = createServerClient();
        const filePath = `audio/${cacheKey}`;

        // Try to download from storage
        const { data, error } = await supabase.storage
          .from(this.config.bucketName)
          .download(filePath);

        if (!error && data) {
          const arrayBuffer = await data.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // Add to memory cache
          if (this.config.enableMemoryCache) {
            this.memoryCache.set(cacheKey, {
              buffer,
              contentType: 'audio/mpeg',
              timestamp: Date.now(),
              size: buffer.length,
            });
            this.stats.memoryCacheSize = this.memoryCache.size();
          }

          this.stats.storageHits++;
          this.updateHitRate();
          timer.success({ source: 'storage' });

          // Get public URL for CDN
          const {
            data: { publicUrl },
          } = supabase.storage.from(this.config.bucketName).getPublicUrl(filePath);

          return {
            buffer,
            contentType: 'audio/mpeg',
            cacheHit: true,
            url: publicUrl,
            createdAt: Date.now(),
          };
        }

        this.stats.storageMisses++;
      } catch (error) {
        console.error('[TTSCache] Storage get error:', error);
        this.stats.storageMisses++;
      }
    }

    this.updateHitRate();
    timer.failure('Cache miss');
    return null;
  }

  // Store audio in cache
  async set(
    cacheKey: string,
    buffer: Buffer,
    contentType: string = 'audio/mpeg'
  ): Promise<string | null> {
    const timer = createLatencyTimer('cache_set', 'tts-cache');

    // 1. Store in memory cache
    if (this.config.enableMemoryCache) {
      this.memoryCache.set(cacheKey, {
        buffer,
        contentType,
        timestamp: Date.now(),
        size: buffer.length,
      });
      this.stats.memoryCacheSize = this.memoryCache.size();
    }

    // 2. Store in Supabase Storage
    if (this.config.enableStorageCache) {
      try {
        const supabase = createServerClient();
        const filePath = `audio/${cacheKey}`;

        // Upload to storage
        const { error } = await supabase.storage
          .from(this.config.bucketName)
          .upload(filePath, buffer, {
            contentType,
            cacheControl: `public, max-age=${this.config.ttlSeconds}`,
            upsert: true,
          });

        if (error) {
          console.error('[TTSCache] Storage upload error:', error);
          timer.failure(error.message);
          return null;
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from(this.config.bucketName).getPublicUrl(filePath);

        timer.success({ size: buffer.length });
        return publicUrl;
      } catch (error) {
        console.error('[TTSCache] Storage set error:', error);
        timer.failure(error instanceof Error ? error.message : 'Unknown error');
        return null;
      }
    }

    timer.success({ memory_only: true });
    return null;
  }

  // Delete from cache
  async delete(cacheKey: string): Promise<boolean> {
    // Delete from memory
    this.memoryCache.delete(cacheKey);

    // Delete from storage
    if (this.config.enableStorageCache) {
      try {
        const supabase = createServerClient();
        const { error } = await supabase.storage
          .from(this.config.bucketName)
          .remove([`audio/${cacheKey}`]);

        if (error) {
          console.error('[TTSCache] Storage delete error:', error);
          return false;
        }
      } catch (error) {
        console.error('[TTSCache] Delete error:', error);
        return false;
      }
    }

    return true;
  }

  // Clear all cache (memory only, storage requires manual cleanup)
  clear(): void {
    this.memoryCache.clear();
    this.stats.memoryCacheSize = 0;
  }

  // Get cache statistics
  getStats(): CacheStats {
    return { ...this.stats };
  }

  // Clean up expired files in storage
  async cleanupExpired(): Promise<number> {
    if (!this.config.enableStorageCache) return 0;

    try {
      const supabase = createServerClient();
      const { data: files, error } = await supabase.storage
        .from(this.config.bucketName)
        .list('audio');

      if (error || !files) return 0;

      const now = Date.now();
      const expiredFiles: string[] = [];

      for (const file of files) {
        if (file.created_at) {
          const createdAt = new Date(file.created_at).getTime();
          const age = now - createdAt;

          if (age > this.config.ttlSeconds * 1000) {
            expiredFiles.push(`audio/${file.name}`);
          }
        }
      }

      if (expiredFiles.length > 0) {
        await supabase.storage.from(this.config.bucketName).remove(expiredFiles);
        console.log(`[TTSCache] Cleaned up ${expiredFiles.length} expired files`);
      }

      return expiredFiles.length;
    } catch (error) {
      console.error('[TTSCache] Cleanup error:', error);
      return 0;
    }
  }

  private updateHitRate(): void {
    const totalRequests =
      this.stats.memoryHits +
      this.stats.memoryMisses +
      this.stats.storageHits +
      this.stats.storageMisses;

    const totalHits = this.stats.memoryHits + this.stats.storageHits;

    this.stats.hitRate =
      totalRequests > 0 ? Math.round((totalHits / totalRequests) * 100) / 100 : 0;
  }
}

// ============================================
// Singleton Instance
// ============================================

export const ttsCache = new TTSCache();

// ============================================
// Helper Functions
// ============================================

// Synthesize with caching
export async function synthesizeWithCache(
  text: string,
  voice: string,
  synthesizeFn: () => Promise<Buffer>,
  options: {
    speed?: number;
    model?: string;
  } = {}
): Promise<CachedAudio> {
  const cacheKey = ttsCache.generateCacheKey(
    text,
    voice,
    options.speed || 1.0,
    options.model || 'tts-1'
  );

  // Try to get from cache
  const cached = await ttsCache.get(cacheKey);
  if (cached) {
    console.log(`[TTSCache] Cache hit for key: ${cacheKey}`);
    return cached;
  }

  // Synthesize new audio
  console.log(`[TTSCache] Cache miss, synthesizing for key: ${cacheKey}`);
  const buffer = await synthesizeFn();

  // Store in cache (async, don't wait)
  ttsCache.set(cacheKey, buffer).catch((err) => {
    console.error('[TTSCache] Failed to store in cache:', err);
  });

  return {
    buffer,
    contentType: 'audio/mpeg',
    cacheHit: false,
    createdAt: Date.now(),
  };
}

// Get CDN-friendly URL for cached audio
export async function getCachedAudioUrl(
  text: string,
  voice: string,
  options: {
    speed?: number;
    model?: string;
  } = {}
): Promise<string | null> {
  const cacheKey = ttsCache.generateCacheKey(
    text,
    voice,
    options.speed || 1.0,
    options.model || 'tts-1'
  );

  const cached = await ttsCache.get(cacheKey);
  return cached?.url || null;
}
