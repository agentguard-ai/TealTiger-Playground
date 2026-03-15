/**
 * CacheService - Client-side caching with memory and LocalStorage layers
 *
 * Provides a two-tier caching strategy:
 * 1. In-memory cache (Map-based) with TTL for hot data
 * 2. LocalStorage-based persistent cache for data surviving page refreshes
 *
 * Supports cache invalidation and hit rate tracking.
 *
 * Validates: Requirements 29.9
 */

export interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number; // Unix timestamp in ms
  createdAt: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  memorySize: number;
  localStorageSize: number;
}

export interface CacheOptions {
  /** TTL in milliseconds. Default: 5 minutes */
  ttlMs?: number;
  /** Whether to persist to LocalStorage. Default: false */
  persistent?: boolean;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const STORAGE_PREFIX = 'tt_cache_';

export class CacheService {
  private memoryCache: Map<string, CacheEntry> = new Map();
  private hits = 0;
  private misses = 0;

  /**
   * Get a value from cache. Checks memory first, then LocalStorage.
   * Returns undefined on miss or expiry.
   */
  get<T>(key: string): T | undefined {
    // 1. Check memory cache
    const memEntry = this.memoryCache.get(key);
    if (memEntry) {
      if (Date.now() < memEntry.expiresAt) {
        this.hits++;
        return memEntry.value as T;
      }
      // Expired — evict
      this.memoryCache.delete(key);
    }

    // 2. Check LocalStorage
    const stored = this.readFromStorage<T>(key);
    if (stored !== undefined) {
      this.hits++;
      return stored;
    }

    this.misses++;
    return undefined;
  }

  /**
   * Set a value in cache.
   */
  set<T>(key: string, value: T, options: CacheOptions = {}): void {
    const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    const now = Date.now();

    const entry: CacheEntry<T> = {
      value,
      expiresAt: now + ttlMs,
      createdAt: now,
    };

    // Always write to memory
    this.memoryCache.set(key, entry as CacheEntry);

    // Optionally persist to LocalStorage
    if (options.persistent) {
      this.writeToStorage(key, entry);
    }
  }

  /**
   * Invalidate a specific cache key from both layers.
   */
  invalidate(key: string): void {
    this.memoryCache.delete(key);
    this.removeFromStorage(key);
  }

  /**
   * Invalidate all keys matching a prefix.
   * Useful for invalidating all workspace data, all policies, etc.
   */
  invalidateByPrefix(prefix: string): void {
    // Memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.memoryCache.delete(key);
      }
    }

    // LocalStorage
    if (typeof localStorage === 'undefined') return;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (storageKey && storageKey.startsWith(STORAGE_PREFIX + prefix)) {
        keysToRemove.push(storageKey);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  }

  /**
   * Clear all cached data from both layers.
   */
  clear(): void {
    this.memoryCache.clear();

    if (typeof localStorage === 'undefined') return;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (storageKey && storageKey.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(storageKey);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  }

  /**
   * Get cache statistics including hit rate.
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total === 0 ? 0 : this.hits / total,
      memorySize: this.memoryCache.size,
      localStorageSize: this.countStorageEntries(),
    };
  }

  /**
   * Reset hit/miss counters.
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Check if a key exists and is not expired.
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  // --- Private helpers ---

  private readFromStorage<T>(key: string): T | undefined {
    if (typeof localStorage === 'undefined') return undefined;
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + key);
      if (!raw) return undefined;
      const entry: CacheEntry<T> = JSON.parse(raw);
      if (Date.now() >= entry.expiresAt) {
        localStorage.removeItem(STORAGE_PREFIX + key);
        return undefined;
      }
      // Promote to memory cache for faster subsequent reads
      this.memoryCache.set(key, entry as CacheEntry);
      return entry.value;
    } catch {
      return undefined;
    }
  }

  private writeToStorage<T>(key: string, entry: CacheEntry<T>): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
    } catch {
      // LocalStorage full or unavailable — silently degrade
    }
  }

  private removeFromStorage(key: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(STORAGE_PREFIX + key);
  }

  private countStorageEntries(): number {
    if (typeof localStorage === 'undefined') return 0;
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) count++;
    }
    return count;
  }
}
