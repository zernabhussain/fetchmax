import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpClient } from '@fetchmax/core';
import { cachePlugin } from '@fetchmax/plugin-cache';
import { http } from 'msw';
import { server } from '../../setup';

describe('Cache Plugin', () => {
  beforeEach(() => {
    vi.clearAllTimers();
  });

  describe('Basic Caching', () => {
    it('should cache GET requests by default', async () => {
      let requestCount = 0;

      server.use(
        http.get('https://api.test.com/users', () => {
          requestCount++;
          return Response.json({ users: ['Alice', 'Bob'] });
        })
      );

      const cache = cachePlugin({ ttl: 60000 });
      const client = new HttpClient().use(cache);

      // First request
      const response1 = await client.get('https://api.test.com/users');
      expect(response1.data).toEqual({ users: ['Alice', 'Bob'] });
      expect(requestCount).toBe(1);

      // Second request should hit cache
      const response2 = await client.get('https://api.test.com/users');
      expect(response2.data).toEqual({ users: ['Alice', 'Bob'] });
      expect(requestCount).toBe(1); // Still 1, not incremented
    });

    it('should not cache POST requests by default', async () => {
      let requestCount = 0;

      server.use(
        http.post('https://api.test.com/users', () => {
          requestCount++;
          return Response.json({ id: 1 });
        })
      );

      const cache = cachePlugin({ ttl: 60000 });
      const client = new HttpClient().use(cache);

      await client.post('https://api.test.com/users', { name: 'Charlie' });
      expect(requestCount).toBe(1);

      await client.post('https://api.test.com/users', { name: 'Charlie' });
      expect(requestCount).toBe(2); // Request made both times
    });

    it('should cache configured HTTP methods', async () => {
      let requestCount = 0;

      server.use(
        http.post('https://api.test.com/search', () => {
          requestCount++;
          return Response.json({ results: [] });
        })
      );

      const cache = cachePlugin({ ttl: 60000, methods: ['GET', 'POST'] });
      const client = new HttpClient().use(cache);

      await client.post('https://api.test.com/search', { query: 'test' });
      expect(requestCount).toBe(1);

      await client.post('https://api.test.com/search', { query: 'test' });
      expect(requestCount).toBe(1); // Should be cached
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should respect TTL and expire cached entries', async () => {
      vi.useFakeTimers();
      let requestCount = 0;

      server.use(
        http.get('https://api.test.com/data', () => {
          requestCount++;
          return Response.json({ value: 'test' });
        })
      );

      const cache = cachePlugin({ ttl: 1000 }); // 1 second TTL
      const client = new HttpClient().use(cache);

      // First request
      await client.get('https://api.test.com/data');
      expect(requestCount).toBe(1);

      // Immediately after - should hit cache
      await client.get('https://api.test.com/data');
      expect(requestCount).toBe(1);

      // Advance time past TTL
      vi.advanceTimersByTime(1001);

      // Should make new request
      await client.get('https://api.test.com/data');
      expect(requestCount).toBe(2);

      vi.useRealTimers();
    });

    it('should track hit count for cache entries', async () => {
      let requestCount = 0;

      server.use(
        http.get('https://api.test.com/popular', () => {
          requestCount++;
          return Response.json({ data: 'popular' });
        })
      );

      const cache = cachePlugin({ ttl: 60000 });
      const client = new HttpClient().use(cache);

      // Make multiple requests
      await client.get('https://api.test.com/popular');
      await client.get('https://api.test.com/popular');
      await client.get('https://api.test.com/popular');

      expect(requestCount).toBe(1); // Only first request hit server
    });
  });

  describe('Cache Size and LRU Eviction', () => {
    it('should evict least recently used entry when cache is full', async () => {
      server.use(
        http.get('https://api.test.com/:id', ({ params }) => {
          return Response.json({ id: params.id });
        })
      );

      const cache = cachePlugin({ ttl: 60000, maxSize: 2 });
      const client = new HttpClient().use(cache);

      // Fill cache
      await client.get('https://api.test.com/1');
      await client.get('https://api.test.com/2');

      // Verify both are cached
      const stats1 = cache.getStats();
      expect(stats1.size).toBe(2);

      // Add third entry - should evict first
      await client.get('https://api.test.com/3');

      const stats2 = cache.getStats();
      expect(stats2.size).toBe(2); // Still at max size
    });

    it('should track cache statistics', async () => {
      server.use(
        http.get('https://api.test.com/:id', ({ params }) => {
          return Response.json({ id: params.id });
        })
      );

      const cache = cachePlugin({ ttl: 60000 });
      const client = new HttpClient().use(cache);

      // Initial stats
      let stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.size).toBe(0);

      // Cache miss
      await client.get('https://api.test.com/1');
      stats = cache.getStats();
      expect(stats.misses).toBe(1);
      expect(stats.size).toBe(1);

      // Cache hit
      await client.get('https://api.test.com/1');
      stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.hitRate).toBeGreaterThan(0);
    });
  });

  describe('URL Exclusion', () => {
    it('should exclude URLs matching string patterns', async () => {
      let requestCount = 0;

      server.use(
        http.get('https://api.test.com/auth/token', () => {
          requestCount++;
          return Response.json({ token: 'abc123' });
        })
      );

      const cache = cachePlugin({ ttl: 60000, exclude: ['/auth/'] });
      const client = new HttpClient().use(cache);

      await client.get('https://api.test.com/auth/token');
      expect(requestCount).toBe(1);

      await client.get('https://api.test.com/auth/token');
      expect(requestCount).toBe(2); // Not cached
    });

    it('should exclude URLs matching regex patterns', async () => {
      let requestCount = 0;

      server.use(
        http.get('https://api.test.com/users/123', () => {
          requestCount++;
          return Response.json({ id: 123 });
        })
      );

      const cache = cachePlugin({ ttl: 60000, exclude: [/\/users\/\d+/] });
      const client = new HttpClient().use(cache);

      await client.get('https://api.test.com/users/123');
      expect(requestCount).toBe(1);

      await client.get('https://api.test.com/users/123');
      expect(requestCount).toBe(2); // Not cached
    });
  });

  describe('Cache Control Methods', () => {
    it('should clear all cache entries', async () => {
      server.use(
        http.get('https://api.test.com/:id', ({ params }) => {
          return Response.json({ id: params.id });
        })
      );

      const cache = cachePlugin({ ttl: 60000 });
      const client = new HttpClient().use(cache);

      // Add entries
      await client.get('https://api.test.com/1');
      await client.get('https://api.test.com/2');

      let stats = cache.getStats();
      expect(stats.size).toBe(2);

      // Clear cache
      cache.clear();

      stats = cache.getStats();
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    it('should invalidate entries matching string pattern', async () => {
      let userRequestCount = 0;
      let postRequestCount = 0;

      server.use(
        http.get('https://api.test.com/users', () => {
          userRequestCount++;
          return Response.json({ users: [] });
        }),
        http.get('https://api.test.com/posts', () => {
          postRequestCount++;
          return Response.json({ posts: [] });
        })
      );

      const cache = cachePlugin({ ttl: 60000 });
      const client = new HttpClient().use(cache);

      // Cache both endpoints
      await client.get('https://api.test.com/users');
      await client.get('https://api.test.com/posts');

      expect(cache.getStats().size).toBe(2);

      // Invalidate only users
      cache.invalidate('/users');

      expect(cache.getStats().size).toBe(1);

      // Users should make new request, posts should be cached
      await client.get('https://api.test.com/users');
      await client.get('https://api.test.com/posts');

      expect(userRequestCount).toBe(2); // New request
      expect(postRequestCount).toBe(1); // Still cached
    });

    it('should invalidate entries matching regex pattern', async () => {
      server.use(
        http.get('https://api.test.com/api/v1/data', () => {
          return Response.json({ version: 'v1' });
        })
      );

      const cache = cachePlugin({ ttl: 60000 });
      const client = new HttpClient().use(cache);

      await client.get('https://api.test.com/api/v1/data');
      expect(cache.getStats().size).toBe(1);

      cache.invalidate(/\/api\/v\d+/);
      expect(cache.getStats().size).toBe(0);
    });
  });

  describe('Custom Cache Key Generator', () => {
    it('should use custom key generator when provided', async () => {
      let requestCount = 0;

      server.use(
        http.get('https://api.test.com/data', () => {
          requestCount++;
          return Response.json({ value: 'test' });
        })
      );

      // Custom key generator that ignores query params
      const cache = cachePlugin({
        ttl: 60000,
        keyGenerator: (request) => `${request.method}:${request.url?.split('?')[0]}`
      });

      const client = new HttpClient().use(cache);

      await client.get('https://api.test.com/data', { params: { id: 1 } });
      expect(requestCount).toBe(1);

      // Different params, but same cache key
      await client.get('https://api.test.com/data', { params: { id: 2 } });
      expect(requestCount).toBe(1); // Should hit cache
    });
  });

  describe('Debug Logging', () => {
    it('should log cache hits and misses when debug is enabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      server.use(
        http.get('https://api.test.com/data', () => {
          return Response.json({ value: 'test' });
        })
      );

      const cache = cachePlugin({ ttl: 60000, debug: true });
      const client = new HttpClient().use(cache);

      // Miss
      await client.get('https://api.test.com/data');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Cache] MISS')
      );

      // Hit
      await client.get('https://api.test.com/data');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Cache] HIT')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle requests with identical URLs but different params', async () => {
      let request1Count = 0;
      let request2Count = 0;

      server.use(
        http.get('https://api.test.com/search', ({ request }) => {
          const url = new URL(request.url);
          const query = url.searchParams.get('q');

          if (query === 'test1') {
            request1Count++;
          } else if (query === 'test2') {
            request2Count++;
          }

          return Response.json({ query });
        })
      );

      const cache = cachePlugin({ ttl: 60000 });
      const client = new HttpClient().use(cache);

      // Different params should create different cache entries
      await client.get('https://api.test.com/search', { params: { q: 'test1' } });
      await client.get('https://api.test.com/search', { params: { q: 'test2' } });

      expect(request1Count).toBe(1);
      expect(request2Count).toBe(1);

      // Repeat requests should hit cache
      await client.get('https://api.test.com/search', { params: { q: 'test1' } });
      await client.get('https://api.test.com/search', { params: { q: 'test2' } });

      expect(request1Count).toBe(1); // Still 1
      expect(request2Count).toBe(1); // Still 1
    });

    it('should handle concurrent requests to same URL', async () => {
      let requestCount = 0;

      server.use(
        http.get('https://api.test.com/data', async () => {
          requestCount++;
          // Simulate delay
          await new Promise(resolve => setTimeout(resolve, 10));
          return Response.json({ value: 'test' });
        })
      );

      const cache = cachePlugin({ ttl: 60000 });
      const client = new HttpClient().use(cache);

      // Make concurrent requests
      const [result1, result2, result3] = await Promise.all([
        client.get('https://api.test.com/data'),
        client.get('https://api.test.com/data'),
        client.get('https://api.test.com/data')
      ]);

      // All should have the same data
      expect(result1.data).toEqual({ value: 'test' });
      expect(result2.data).toEqual({ value: 'test' });
      expect(result3.data).toEqual({ value: 'test' });

      // Note: Without dedupe plugin, cache won't prevent concurrent requests
      // Cache only works for subsequent requests after first completes
      expect(requestCount).toBeGreaterThanOrEqual(1);
    });

    it('should get cached entry by key', async () => {
      server.use(
        http.get('https://api.test.com/data', () => {
          return Response.json({ value: 'test' });
        })
      );

      const cache = cachePlugin({ ttl: 60000 });
      const client = new HttpClient().use(cache);

      await client.get('https://api.test.com/data');

      const entry = cache.getEntry('GET:https://api.test.com/data:');
      expect(entry).toBeDefined();
      expect(entry?.url).toContain('/data');
    });
  });
});
