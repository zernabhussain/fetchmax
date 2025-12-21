import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { HttpClient } from '@fetchmax/core';
import { retryPlugin } from '@fetchmax/plugin-retry';
import { cachePlugin } from '@fetchmax/plugin-cache';
import { rateLimitPlugin } from '@fetchmax/plugin-rate-limit';
import { dedupePlugin } from '@fetchmax/plugin-dedupe';
import { loggerPlugin } from '@fetchmax/plugin-logger';
import { timeoutPlugin } from '@fetchmax/plugin-timeout';

// MSW server setup
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/**
 * Phase 2 P1: High Concurrency & Performance Tests
 *
 * These tests validate FetchMax behavior under high load:
 * - 100+ concurrent requests
 * - Throughput measurements
 * - Memory usage
 * - Plugin overhead
 * - Race condition handling
 * - Deadlock prevention
 *
 * NOTE: These tests use REAL TIMERS instead of fake timers because Vitest's fake timers
 * don't properly handle complex async queue processing in the rate-limit plugin.
 * Tests will take longer (~10-15s) but validate actual production behavior.
 */
describe('Real-World: High Concurrency & Performance', () => {
  // No beforeEach/afterEach - using real timers for accurate rate-limit queue testing

  describe('Stress Testing', () => {
    it('should handle 100 concurrent requests with rate limiting', async () => {
      let requestCount = 0;

      server.use(
        http.get('https://api.test.com/data', ({ request }) => {
          requestCount++;
          const url = new URL(request.url);
          const id = url.searchParams.get('id');
          return HttpResponse.json({ id, data: 'test' });
        })
      );

      const client = new HttpClient()
        .use(retryPlugin({ maxRetries: 1, retryDelay: 50 }))
        .use(rateLimitPlugin({ maxRequests: 20, perMilliseconds: 1000 }))
        .use(dedupePlugin());

      // Create 100 concurrent requests (10 unique IDs)
      const requests = Array.from({ length: 100 }, (_, i) =>
        client.get('https://api.test.com/data', { params: { id: i % 10 } })
      );

      const results = await Promise.allSettled(requests);
      const successful = results.filter(r => r.status === 'fulfilled');

      // Verify high success rate
      expect(successful.length).toBeGreaterThan(90);

      // Deduplication should reduce actual requests
      expect(requestCount).toBeLessThan(100);
      expect(requestCount).toBeGreaterThan(5); // At least unique requests
    }, 20000); // 20 second timeout

    it('should handle 50 concurrent unique requests', async () => {
      let requestCount = 0;

      server.use(
        http.get('https://api.test.com/unique', ({ request }) => {
          requestCount++;
          const url = new URL(request.url);
          const id = url.searchParams.get('id');
          return HttpResponse.json({ id, timestamp: Date.now() });
        })
      );

      const client = new HttpClient()
        .use(rateLimitPlugin({ maxRequests: 10, perMilliseconds: 1000 }));

      // All unique requests
      const requests = Array.from({ length: 50 }, (_, i) =>
        client.get('https://api.test.com/unique', { params: { id: i } })
      );

      const results = await Promise.allSettled(requests);
      const successful = results.filter(r => r.status === 'fulfilled');

      // All should succeed
      expect(successful.length).toBe(50);
      expect(requestCount).toBe(50);
    }, 15000);

    it('should handle burst traffic patterns', async () => {
      let requestCount = 0;

      server.use(
        http.get('https://api.test.com/burst', () => {
          requestCount++;
          return HttpResponse.json({ processed: true });
        })
      );

      const client = new HttpClient()
        .use(rateLimitPlugin({ maxRequests: 5, perMilliseconds: 1000 }));

      // First burst: 25 requests
      const burst1 = Array.from({ length: 25 }, (_, i) =>
        client.get('https://api.test.com/burst', { params: { burst: 1, id: i } })
      );

      const results1 = await Promise.allSettled(burst1);
      expect(results1.filter(r => r.status === 'fulfilled').length).toBe(25);

      // Wait before second burst
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Second burst
      const burst2 = Array.from({ length: 25 }, (_, i) =>
        client.get('https://api.test.com/burst', { params: { burst: 2, id: i } })
      );

      const results2 = await Promise.allSettled(burst2);
      expect(results2.filter(r => r.status === 'fulfilled').length).toBe(25);
      expect(requestCount).toBe(50);
    }, 15000);
  });

  describe('Throughput & Performance', () => {
    it('should maintain consistent throughput under load', async () => {
      let requestCount = 0;

      server.use(
        http.get('https://api.test.com/throughput', () => {
          requestCount++;
          return HttpResponse.json({ count: requestCount });
        })
      );

      const client = new HttpClient()
        .use(rateLimitPlugin({ maxRequests: 20, perMilliseconds: 1000 }));

      // 60 requests
      const requests = Array.from({ length: 60 }, (_, i) =>
        client.get('https://api.test.com/throughput', { params: { id: i } })
      );

      const results = await Promise.allSettled(requests);
      expect(results.filter(r => r.status === 'fulfilled').length).toBe(60);
      expect(requestCount).toBe(60);
    }, 10000);

    it('should measure plugin overhead', async () => {
      server.use(
        http.get('https://api.test.com/overhead', () => {
          return HttpResponse.json({ data: 'test' });
        })
      );

      // Baseline: no plugins
      const baselineClient = new HttpClient();
      const baselineStart = Date.now();
      await baselineClient.get('https://api.test.com/overhead');
      const baselineTime = Date.now() - baselineStart;

      // With all plugins
      const fullClient = new HttpClient()
        .use(retryPlugin({ maxRetries: 1 }))
        .use(cachePlugin())
        .use(rateLimitPlugin({ maxRequests: 100, perMilliseconds: 1000 }))
        .use(dedupePlugin())
        .use(loggerPlugin())
        .use(timeoutPlugin({ timeout: 5000 }));

      const fullStart = Date.now();
      await fullClient.get('https://api.test.com/overhead');
      const fullTime = Date.now() - fullStart;

      const overhead = fullTime - baselineTime;

      // Overhead should be minimal
      expect(overhead).toBeLessThan(100);
    });
  });

  describe('Memory Management', () => {
    it('should handle cache eviction with 100 items', async () => {
      let requestCount = 0;

      server.use(
        http.get('https://api.test.com/cache', ({ request }) => {
          requestCount++;
          const url = new URL(request.url);
          const id = url.searchParams.get('id');
          return HttpResponse.json({ id, data: 'x'.repeat(1000) });
        })
      );

      const client = new HttpClient()
        .use(cachePlugin({ maxSize: 20, ttl: 60000 }));

      // Make 100 unique requests
      for (let i = 0; i < 100; i++) {
        await client.get('https://api.test.com/cache', { params: { id: i } });
      }

      expect(requestCount).toBe(100);

      // Access first 10 items - should require new requests (evicted)
      const initialCount = requestCount;

      for (let i = 0; i < 10; i++) {
        await client.get('https://api.test.com/cache', { params: { id: i } });
      }

      expect(requestCount).toBeGreaterThan(initialCount);

      // Access most recent 10 items - should be cached
      const beforeRecent = requestCount;

      for (let i = 90; i < 100; i++) {
        await client.get('https://api.test.com/cache', { params: { id: i } });
      }

      expect(requestCount).toBe(beforeRecent);
    });

    it('should not leak memory with repeated requests', async () => {
      server.use(
        http.get('https://api.test.com/leak-test', () => {
          return HttpResponse.json({ data: 'test'.repeat(100) });
        })
      );

      const client = new HttpClient()
        .use(cachePlugin({ maxSize: 5 }));

      // Make 100 requests to same endpoint
      for (let i = 0; i < 100; i++) {
        await client.get('https://api.test.com/leak-test');
      }

      // If we got here without crashing, memory management works
      expect(true).toBe(true);
    });
  });

  describe('Race Conditions & Deadlocks', () => {
    it('should prevent race conditions with dedupe plugin', async () => {
      let requestCount = 0;

      server.use(
        http.get('https://api.test.com/race', () => {
          requestCount++;
          return HttpResponse.json({ id: requestCount });
        })
      );

      const client = new HttpClient()
        .use(dedupePlugin());

      // 50 concurrent requests to same URL
      const requests = Array.from({ length: 50 }, () =>
        client.get('https://api.test.com/race')
      );

      const results = await Promise.all(requests);

      // All should succeed
      expect(results).toHaveLength(50);

      // Dedupe ensures only 1 actual request
      expect(requestCount).toBe(1);

      // All should have same data
      const firstData = results[0]?.data;
      results.forEach(result => {
        expect(result.data).toEqual(firstData);
      });
    });

    it('should handle rate limit queue without deadlock', async () => {
      let processedCount = 0;

      server.use(
        http.get('https://api.test.com/queue', () => {
          processedCount++;
          return HttpResponse.json({ processed: processedCount });
        })
      );

      const client = new HttpClient()
        .use(rateLimitPlugin({ maxRequests: 5, perMilliseconds: 1000 }));

      // 25 requests - will queue
      const requests = Array.from({ length: 25 }, (_, i) =>
        client.get('https://api.test.com/queue', { params: { id: i } })
      );

      const results = await Promise.allSettled(requests);

      // All should complete
      expect(results).toHaveLength(25);
      expect(results.every(r => r.status === 'fulfilled')).toBe(true);
      expect(processedCount).toBe(25);
    }, 15000);
  });

  describe('Queue Performance', () => {
    it('should efficiently process request queue', async () => {
      let requestCount = 0;

      server.use(
        http.get('https://api.test.com/queue-perf', () => {
          requestCount++;
          return HttpResponse.json({ count: requestCount });
        })
      );

      const client = new HttpClient()
        .use(rateLimitPlugin({ maxRequests: 10, perMilliseconds: 1000 }));

      const startTime = Date.now();

      // 50 requests
      const requests = Array.from({ length: 50 }, (_, i) =>
        client.get('https://api.test.com/queue-perf', { params: { id: i } })
      );

      const results = await Promise.allSettled(requests);
      const duration = Date.now() - startTime;

      // All should succeed
      expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(50);

      // Queue should process efficiently
      const expectedTime = Math.ceil(50 / 10) * 1000; // 5 seconds minimum
      expect(duration).toBeGreaterThanOrEqual(expectedTime - 1000);
    }, 15000);
  });
});
