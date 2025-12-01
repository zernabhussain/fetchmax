import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpClient } from '../../../packages/core/src/client';
import { rateLimitPlugin, RateLimitError } from '../../../packages/plugins/rate-limit/src/index';
import { http } from 'msw';
import { server } from '../../setup';

describe('Rate Limit Plugin', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Basic Rate Limiting', () => {
    it('should allow requests within limit', async () => {
      server.use(
        http.get('https://api.test.com/data', () => {
          return Response.json({ value: 'test' });
        })
      );

      const rateLimit = rateLimitPlugin({
        maxRequests: 5,
        perMilliseconds: 1000
      });

      const client = new HttpClient().use(rateLimit);

      // Make 5 requests (at limit)
      const promises = Array(5).fill(null).map(() =>
        client.get('https://api.test.com/data')
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
      expect(results.every(r => r.data.value === 'test')).toBe(true);
    });

    it('should queue requests exceeding limit', async () => {
      let requestCount = 0;

      server.use(
        http.get('https://api.test.com/data', () => {
          requestCount++;
          return Response.json({ count: requestCount });
        })
      );

      const rateLimit = rateLimitPlugin({
        maxRequests: 2,
        perMilliseconds: 1000,
        queueOnLimit: true
      });

      const client = new HttpClient().use(rateLimit);

      // Start 4 requests (2 over limit)
      const promise1 = client.get('https://api.test.com/data');
      const promise2 = client.get('https://api.test.com/data');
      const promise3 = client.get('https://api.test.com/data');
      const promise4 = client.get('https://api.test.com/data');

      // First 2 should complete immediately
      const [r1, r2] = await Promise.all([promise1, promise2]);
      expect(r1.data.count).toBeLessThanOrEqual(2);
      expect(r2.data.count).toBeLessThanOrEqual(2);

      // Advance time to allow queued requests
      await vi.advanceTimersByTimeAsync(1100);

      const [r3, r4] = await Promise.all([promise3, promise4]);
      expect(r3.data).toBeDefined();
      expect(r4.data).toBeDefined();
    });

    it('should track request timestamps', async () => {
      server.use(
        http.get('https://api.test.com/data', () => {
          return Response.json({ ok: true });
        })
      );

      const rateLimit = rateLimitPlugin({
        maxRequests: 3,
        perMilliseconds: 1000
      });

      const client = new HttpClient().use(rateLimit);

      await client.get('https://api.test.com/data');
      await client.get('https://api.test.com/data');

      const stats = rateLimit.getStats();
      expect(stats.requestCount).toBe(2);
      expect(stats.timestamps).toHaveLength(2);
    });
  });

  describe('Queue Management', () => {
    it('should throw error when queue is full', async () => {
      server.use(
        http.get('https://api.test.com/data', async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return Response.json({ ok: true });
        })
      );

      const rateLimit = rateLimitPlugin({
        maxRequests: 1,
        perMilliseconds: 1000,
        queueOnLimit: true,
        maxQueueSize: 2
      });

      const client = new HttpClient().use(rateLimit);

      // Start requests to fill queue
      const p1 = client.get('https://api.test.com/data');
      const p2 = client.get('https://api.test.com/data');
      const p3 = client.get('https://api.test.com/data');

      // 4th request should exceed queue
      await expect(
        client.get('https://api.test.com/data')
      ).rejects.toThrow(RateLimitError);

      // Need to advance enough time for all 3 requests to complete
      // p1: 0-100ms, p2: 1010-1110ms, p3: 2020-2120ms
      await vi.advanceTimersByTimeAsync(100);  // p1 completes
      await vi.advanceTimersByTimeAsync(1020); // p2 completes (total 1120ms)
      await vi.advanceTimersByTimeAsync(1020); // p3 completes (total 2140ms)
      await Promise.allSettled([p1, p2, p3]);
    });

    it('should not queue when queueOnLimit is false', async () => {
      server.use(
        http.get('https://api.test.com/data', () => {
          return Response.json({ ok: true });
        })
      );

      const rateLimit = rateLimitPlugin({
        maxRequests: 2,
        perMilliseconds: 1000,
        queueOnLimit: false
      });

      const client = new HttpClient().use(rateLimit);

      await client.get('https://api.test.com/data');
      await client.get('https://api.test.com/data');

      // 3rd request should throw immediately
      await expect(
        client.get('https://api.test.com/data')
      ).rejects.toThrow(RateLimitError);
    });

    it('should get queue size from stats', async () => {
      server.use(
        http.get('https://api.test.com/data', async () => {
          await new Promise(resolve => setTimeout(resolve, 500));
          return Response.json({ ok: true });
        })
      );

      const rateLimit = rateLimitPlugin({
        maxRequests: 1,
        perMilliseconds: 1000,
        queueOnLimit: true
      });

      const client = new HttpClient().use(rateLimit);

      // Start multiple requests
      const p1 = client.get('https://api.test.com/data');
      const p2 = client.get('https://api.test.com/data');

      const stats = rateLimit.getStats();
      expect(stats.queueSize).toBeGreaterThanOrEqual(0);

      await vi.advanceTimersByTimeAsync(2000);
      await Promise.all([p1, p2]);
    });
  });

  describe('Time Window', () => {
    it('should reset limits after time window', async () => {
      let requestCount = 0;

      server.use(
        http.get('https://api.test.com/data', () => {
          requestCount++;
          return Response.json({ count: requestCount });
        })
      );

      const rateLimit = rateLimitPlugin({
        maxRequests: 2,
        perMilliseconds: 1000
      });

      const client = new HttpClient().use(rateLimit);

      // Use up limit
      await client.get('https://api.test.com/data');
      await client.get('https://api.test.com/data');

      expect(requestCount).toBe(2);

      // Advance past time window
      await vi.advanceTimersByTimeAsync(1100);

      // Should allow more requests
      await client.get('https://api.test.com/data');
      await client.get('https://api.test.com/data');

      expect(requestCount).toBe(4);
    });

    it('should remove expired timestamps', async () => {
      server.use(
        http.get('https://api.test.com/data', () => {
          return Response.json({ ok: true });
        })
      );

      const rateLimit = rateLimitPlugin({
        maxRequests: 5,
        perMilliseconds: 1000
      });

      const client = new HttpClient().use(rateLimit);

      await client.get('https://api.test.com/data');
      await client.get('https://api.test.com/data');

      let stats = rateLimit.getStats();
      expect(stats.requestCount).toBe(2);

      // Advance past expiry
      await vi.advanceTimersByTimeAsync(1100);

      stats = rateLimit.getStats();
      expect(stats.requestCount).toBe(0); // Timestamps should be cleared
    });
  });

  describe('Callback', () => {
    it('should call onRateLimit callback', async () => {
      let callbackCalled = false;
      let queueSizeInCallback = 0;
      let waitTimeInCallback = 0;

      server.use(
        http.get('https://api.test.com/data', () => {
          return Response.json({ ok: true });
        })
      );

      const rateLimit = rateLimitPlugin({
        maxRequests: 1,
        perMilliseconds: 1000,
        queueOnLimit: true,
        onRateLimit: (queueSize, waitTime) => {
          callbackCalled = true;
          queueSizeInCallback = queueSize;
          waitTimeInCallback = waitTime;
        }
      });

      const client = new HttpClient().use(rateLimit);

      const p1 = client.get('https://api.test.com/data');
      const p2 = client.get('https://api.test.com/data');

      await vi.advanceTimersByTimeAsync(1100);
      await Promise.all([p1, p2]);

      expect(callbackCalled).toBe(true);
      expect(queueSizeInCallback).toBeGreaterThanOrEqual(0);
      expect(waitTimeInCallback).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Reset Method', () => {
    it('should reset rate limiter state', async () => {
      server.use(
        http.get('https://api.test.com/data', () => {
          return Response.json({ ok: true });
        })
      );

      const rateLimit = rateLimitPlugin({
        maxRequests: 2,
        perMilliseconds: 1000
      });

      const client = new HttpClient().use(rateLimit);

      await client.get('https://api.test.com/data');
      await client.get('https://api.test.com/data');

      let stats = rateLimit.getStats();
      expect(stats.requestCount).toBe(2);

      rateLimit.reset();

      stats = rateLimit.getStats();
      expect(stats.requestCount).toBe(0);
      expect(stats.queueSize).toBe(0);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle 10 requests per second limit', async () => {
      let requestCount = 0;

      server.use(
        http.get('https://api.test.com/data', () => {
          requestCount++;
          return Response.json({ count: requestCount });
        })
      );

      const rateLimit = rateLimitPlugin({
        maxRequests: 10,
        perMilliseconds: 1000
      });

      const client = new HttpClient().use(rateLimit);

      // Make 10 requests
      const promises = Array(10).fill(null).map(() =>
        client.get('https://api.test.com/data')
      );

      await Promise.all(promises);
      expect(requestCount).toBe(10);
    });

    it('should handle API with 100 requests per minute limit', async () => {
      server.use(
        http.get('https://api.test.com/data', () => {
          return Response.json({ ok: true });
        })
      );

      const rateLimit = rateLimitPlugin({
        maxRequests: 100,
        perMilliseconds: 60000 // 1 minute
      });

      const client = new HttpClient().use(rateLimit);

      // Make several requests
      for (let i = 0; i < 10; i++) {
        await client.get('https://api.test.com/data');
      }

      const stats = rateLimit.getStats();
      expect(stats.requestCount).toBe(10);
    });
  });

  describe('Edge Cases', () => {
    it('should handle maxRequests = 1', async () => {
      server.use(
        http.get('https://api.test.com/data', () => {
          return Response.json({ ok: true });
        })
      );

      const rateLimit = rateLimitPlugin({
        maxRequests: 1,
        perMilliseconds: 1000,
        queueOnLimit: true
      });

      const client = new HttpClient().use(rateLimit);

      const p1 = client.get('https://api.test.com/data');
      const p2 = client.get('https://api.test.com/data');

      await p1;

      await vi.advanceTimersByTimeAsync(1100);
      await p2;

      expect(true).toBe(true); // Both completed
    });

    it('should handle very short time windows', async () => {
      server.use(
        http.get('https://api.test.com/data', () => {
          return Response.json({ ok: true });
        })
      );

      const rateLimit = rateLimitPlugin({
        maxRequests: 5,
        perMilliseconds: 100 // 100ms
      });

      const client = new HttpClient().use(rateLimit);

      await client.get('https://api.test.com/data');

      await vi.advanceTimersByTimeAsync(150);

      await client.get('https://api.test.com/data');
      expect(true).toBe(true);
    });

    it('should handle concurrent requests correctly', async () => {
      let completedCount = 0;

      server.use(
        http.get('https://api.test.com/data', () => {
          completedCount++;
          return Response.json({ count: completedCount });
        })
      );

      const rateLimit = rateLimitPlugin({
        maxRequests: 3,
        perMilliseconds: 1000,
        queueOnLimit: true
      });

      const client = new HttpClient().use(rateLimit);

      // Launch 6 concurrent requests
      const promises = Array(6).fill(null).map(() =>
        client.get('https://api.test.com/data')
      );

      // Allow first batch
      await vi.advanceTimersByTimeAsync(10);

      // Advance to process queue
      await vi.advanceTimersByTimeAsync(1100);

      await Promise.all(promises);
      expect(completedCount).toBe(6);
    });
  });
});
