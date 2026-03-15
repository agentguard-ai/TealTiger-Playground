import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheService } from '@/services/CacheService';

/**
 * Cache strategy tests for CacheService
 * Validates: Requirements 29.9
 *
 * Tests memory cache, LocalStorage persistence, cache invalidation,
 * and cache hit rate tracking.
 */

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    cache = new CacheService();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // --- Memory cache ---

  describe('memory cache', () => {
    it('should store and retrieve values from memory', () => {
      cache.set('workspace:1', { id: '1', name: 'Team Alpha' });
      const result = cache.get<{ id: string; name: string }>('workspace:1');
      expect(result).toEqual({ id: '1', name: 'Team Alpha' });
    });

    it('should return undefined for missing keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should expire entries after TTL', () => {
      vi.useFakeTimers();
      cache.set('policies:list', ['p1', 'p2'], { ttlMs: 1000 });

      expect(cache.get('policies:list')).toEqual(['p1', 'p2']);

      vi.advanceTimersByTime(1001);
      expect(cache.get('policies:list')).toBeUndefined();

      vi.useRealTimers();
    });

    it('should not expire entries before TTL', () => {
      vi.useFakeTimers();
      cache.set('data', 'value', { ttlMs: 5000 });

      vi.advanceTimersByTime(4999);
      expect(cache.get('data')).toBe('value');

      vi.useRealTimers();
    });

    it('should overwrite existing entries', () => {
      cache.set('key', 'v1');
      cache.set('key', 'v2');
      expect(cache.get('key')).toBe('v2');
    });
  });

  // --- LocalStorage persistent cache ---

  describe('LocalStorage persistent cache', () => {
    it('should persist values to LocalStorage when persistent option is set', () => {
      cache.set('workspace:2', { name: 'Persisted' }, { persistent: true });

      // Create a new cache instance to simulate page refresh
      const freshCache = new CacheService();
      const result = freshCache.get<{ name: string }>('workspace:2');
      expect(result).toEqual({ name: 'Persisted' });
    });

    it('should NOT persist to LocalStorage by default', () => {
      cache.set('temp', 'data');

      const freshCache = new CacheService();
      expect(freshCache.get('temp')).toBeUndefined();
    });

    it('should expire persistent entries after TTL', () => {
      vi.useFakeTimers();
      cache.set('expiring', 'data', { persistent: true, ttlMs: 2000 });

      vi.advanceTimersByTime(2001);

      const freshCache = new CacheService();
      expect(freshCache.get('expiring')).toBeUndefined();

      vi.useRealTimers();
    });

    it('should promote LocalStorage entries to memory on read', () => {
      cache.set('promoted', 'value', { persistent: true });

      // New instance — memory is empty, reads from LocalStorage
      const freshCache = new CacheService();
      freshCache.get('promoted'); // first read: from storage
      const stats = freshCache.getStats();
      expect(stats.memorySize).toBe(1); // promoted to memory
    });
  });

  // --- Cache invalidation ---

  describe('cache invalidation', () => {
    it('should invalidate a specific key from memory', () => {
      cache.set('key1', 'val1');
      cache.invalidate('key1');
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should invalidate a specific key from LocalStorage', () => {
      cache.set('key2', 'val2', { persistent: true });
      cache.invalidate('key2');

      const freshCache = new CacheService();
      expect(freshCache.get('key2')).toBeUndefined();
    });

    it('should invalidate keys by prefix', () => {
      cache.set('workspace:1:policies', ['p1']);
      cache.set('workspace:1:members', ['m1']);
      cache.set('workspace:2:policies', ['p2']);

      cache.invalidateByPrefix('workspace:1');

      expect(cache.get('workspace:1:policies')).toBeUndefined();
      expect(cache.get('workspace:1:members')).toBeUndefined();
      expect(cache.get('workspace:2:policies')).toEqual(['p2']);
    });

    it('should invalidate persistent keys by prefix', () => {
      cache.set('ws:1:data', 'a', { persistent: true });
      cache.set('ws:1:meta', 'b', { persistent: true });
      cache.set('ws:2:data', 'c', { persistent: true });

      cache.invalidateByPrefix('ws:1');

      const freshCache = new CacheService();
      expect(freshCache.get('ws:1:data')).toBeUndefined();
      expect(freshCache.get('ws:1:meta')).toBeUndefined();
      expect(freshCache.get('ws:2:data')).toBe('c');
    });

    it('should clear all cached data', () => {
      cache.set('a', 1);
      cache.set('b', 2, { persistent: true });
      cache.set('c', 3, { persistent: true });

      cache.clear();

      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBeUndefined();

      const freshCache = new CacheService();
      expect(freshCache.get('c')).toBeUndefined();
    });
  });

  // --- Cache hit rate tracking ---

  describe('cache hit rate tracking', () => {
    it('should track hits and misses', () => {
      cache.set('hit', 'data');
      cache.get('hit');   // hit
      cache.get('miss1'); // miss
      cache.get('miss2'); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBeCloseTo(1 / 3);
    });

    it('should report 0 hit rate when no accesses', () => {
      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0);
    });

    it('should report 100% hit rate when all accesses are hits', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.get('a');
      cache.get('b');

      expect(cache.getStats().hitRate).toBe(1);
    });

    it('should track memory and storage sizes', () => {
      cache.set('mem1', 'v');
      cache.set('mem2', 'v');
      cache.set('persist1', 'v', { persistent: true });

      const stats = cache.getStats();
      expect(stats.memorySize).toBe(3);
      expect(stats.localStorageSize).toBe(1);
    });

    it('should reset stats', () => {
      cache.set('x', 1);
      cache.get('x');
      cache.get('y');
      cache.resetStats();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);
    });
  });

  // --- has() ---

  describe('has()', () => {
    it('should return true for existing non-expired keys', () => {
      cache.set('exists', 'val');
      expect(cache.has('exists')).toBe(true);
    });

    it('should return false for missing keys', () => {
      expect(cache.has('nope')).toBe(false);
    });

    it('should return false for expired keys', () => {
      vi.useFakeTimers();
      cache.set('expiring', 'val', { ttlMs: 100 });
      vi.advanceTimersByTime(101);
      expect(cache.has('expiring')).toBe(false);
      vi.useRealTimers();
    });
  });

  // --- Performance: cache hit rates with realistic data ---

  describe('cache hit rates with realistic workloads', () => {
    it('should achieve >80% hit rate for repeated workspace data access', () => {
      // Simulate: load workspace data once, then access it 9 more times
      const workspaceData = { id: 'ws-1', name: 'Engineering', members: 25 };
      cache.set('workspace:ws-1', workspaceData, { ttlMs: 60_000 });

      // First access was a set, now simulate 9 reads (all hits)
      for (let i = 0; i < 9; i++) {
        cache.get('workspace:ws-1');
      }
      // 1 miss for a different key
      cache.get('workspace:ws-other');

      const stats = cache.getStats();
      expect(stats.hitRate).toBeGreaterThanOrEqual(0.8);
    });

    it('should achieve >60% hit rate for mixed policy list access', () => {
      // Simulate: 5 different policy lists cached, accessed in a pattern
      for (let i = 0; i < 5; i++) {
        cache.set(`policies:ws-${i}`, Array.from({ length: 50 }, (_, j) => `p-${j}`));
      }

      // 15 hits (accessing cached data)
      for (let round = 0; round < 3; round++) {
        for (let i = 0; i < 5; i++) {
          cache.get(`policies:ws-${i}`);
        }
      }
      // 5 misses (accessing uncached data)
      for (let i = 5; i < 10; i++) {
        cache.get(`policies:ws-${i}`);
      }

      const stats = cache.getStats();
      expect(stats.hitRate).toBeGreaterThanOrEqual(0.6);
    });
  });
});
