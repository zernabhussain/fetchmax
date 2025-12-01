import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpClient } from '../../../packages/core/src/client';
import { retryPlugin } from '../../../packages/plugins/retry/src';
import { http } from 'msw';
import { server } from '../../setup';

describe('Retry Plugin', () => {
  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  describe('basic functionality', () => {
    it('should retry failed requests', async () => {
      let attempts = 0;

      server.use(
        http.get('https://api.test.com/unstable', () => {
          attempts++;
          if (attempts < 3) {
            return new Response(null, { status: 500 });
          }
          return Response.json({ success: true });
        })
      );

      const client = new HttpClient().use(
        retryPlugin({
          maxRetries: 3,
          retryDelay: 100
        })
      );

      const promise = client.get('https://api.test.com/unstable');

      // Advance timers to allow retries
      for (let i = 0; i < 3; i++) {
        await vi.advanceTimersByTimeAsync(100 * Math.pow(2, i) + 50);
      }

      const response = await promise;

      expect(attempts).toBe(3);
      expect(response.data).toEqual({ success: true });
    });

    it('should give up after max retries', async () => {
      let attempts = 0;

      server.use(
        http.get('https://api.test.com/always-fails', () => {
          attempts++;
          return new Response(null, { status: 500 });
        })
      );

      const client = new HttpClient().use(
        retryPlugin({
          maxRetries: 2,
          retryDelay: 50
        })
      );

      const promise = client.get('https://api.test.com/always-fails');

      // Advance timers for all retries
      for (let i = 0; i < 3; i++) {
        await vi.advanceTimersByTimeAsync(100 * Math.pow(2, i) + 50);
      }

      await expect(promise).rejects.toThrow();
      expect(attempts).toBe(3); // Initial + 2 retries
    });

    it('should not retry successful requests', async () => {
      let attempts = 0;

      server.use(
        http.get('https://api.test.com/success', () => {
          attempts++;
          return Response.json({ success: true });
        })
      );

      const client = new HttpClient().use(retryPlugin({ maxRetries: 3 }));

      await client.get('https://api.test.com/success');

      expect(attempts).toBe(1);
    });
  });

  describe('retry conditions', () => {
    it('should retry on 500 errors by default', async () => {
      let attempts = 0;

      server.use(
        http.get('https://api.test.com/test', () => {
          attempts++;
          if (attempts === 1) {
            return new Response(null, { status: 500 });
          }
          return Response.json({ success: true });
        })
      );

      const client = new HttpClient().use(
        retryPlugin({ maxRetries: 2, retryDelay: 50 })
      );

      const promise = client.get('https://api.test.com/test');
      await vi.advanceTimersByTimeAsync(200);
      await promise;

      expect(attempts).toBe(2);
    });

    it('should retry on 503 errors by default', async () => {
      let attempts = 0;

      server.use(
        http.get('https://api.test.com/test', () => {
          attempts++;
          if (attempts === 1) {
            return new Response(null, { status: 503 });
          }
          return Response.json({ success: true });
        })
      );

      const client = new HttpClient().use(
        retryPlugin({ maxRetries: 2, retryDelay: 50 })
      );

      const promise = client.get('https://api.test.com/test');
      await vi.advanceTimersByTimeAsync(200);
      await promise;

      expect(attempts).toBe(2);
    });

    it('should not retry on 404 errors by default', async () => {
      let attempts = 0;

      server.use(
        http.get('https://api.test.com/not-found', () => {
          attempts++;
          return new Response(null, { status: 404 });
        })
      );

      const client = new HttpClient().use(
        retryPlugin({ maxRetries: 3, retryDelay: 50 })
      );

      await expect(client.get('https://api.test.com/not-found')).rejects.toThrow();
      expect(attempts).toBe(1); // No retries
    });

    it('should respect custom retryOn status codes', async () => {
      let attempts = 0;

      server.use(
        http.get('https://api.test.com/test', () => {
          attempts++;
          if (attempts === 1) {
            return new Response(null, { status: 404 });
          }
          return Response.json({ success: true });
        })
      );

      const client = new HttpClient().use(
        retryPlugin({
          maxRetries: 2,
          retryDelay: 50,
          retryOn: [404] // Retry on 404
        })
      );

      const promise = client.get('https://api.test.com/test');
      await vi.advanceTimersByTimeAsync(200);
      await promise;

      expect(attempts).toBe(2);
    });

    it('should use custom shouldRetry function', async () => {
      let attempts = 0;

      server.use(
        http.get('https://api.test.com/test', () => {
          attempts++;
          if (attempts === 1) {
            return new Response(null, { status: 418 }); // I'm a teapot
          }
          return Response.json({ success: true });
        })
      );

      const shouldRetry = vi.fn((error, attempt) => {
        return error.status === 418 && attempt < 2;
      });

      const client = new HttpClient().use(
        retryPlugin({
          maxRetries: 3,
          retryDelay: 50,
          shouldRetry
        })
      );

      const promise = client.get('https://api.test.com/test');
      await vi.advanceTimersByTimeAsync(200);
      await promise;

      expect(attempts).toBe(2);
      expect(shouldRetry).toHaveBeenCalled();
    });
  });

  describe('backoff strategies', () => {
    it('should use exponential backoff by default', async () => {
      const delays: number[] = [];
      let attempts = 0;

      server.use(
        http.get('https://api.test.com/test', () => {
          attempts++;
          if (attempts < 4) {
            return new Response(null, { status: 500 });
          }
          return Response.json({ success: true });
        })
      );

      const onRetry = vi.fn((attempt, error, delay) => {
        delays.push(delay);
      });

      const client = new HttpClient().use(
        retryPlugin({
          maxRetries: 3,
          retryDelay: 100,
          backoff: 'exponential',
          onRetry
        })
      );

      const promise = client.get('https://api.test.com/test');

      // Advance timers for exponential backoff: 100ms, 200ms, 400ms
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(200);
      await vi.advanceTimersByTimeAsync(400);
      await promise;

      expect(delays).toEqual([100, 200, 400]);
    });

    it('should use linear backoff when specified', async () => {
      const delays: number[] = [];
      let attempts = 0;

      server.use(
        http.get('https://api.test.com/test', () => {
          attempts++;
          if (attempts < 4) {
            return new Response(null, { status: 500 });
          }
          return Response.json({ success: true });
        })
      );

      const onRetry = vi.fn((attempt, error, delay) => {
        delays.push(delay);
      });

      const client = new HttpClient().use(
        retryPlugin({
          maxRetries: 3,
          retryDelay: 100,
          backoff: 'linear',
          onRetry
        })
      );

      const promise = client.get('https://api.test.com/test');

      // Advance timers for linear backoff: 100ms, 200ms, 300ms
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(200);
      await vi.advanceTimersByTimeAsync(300);
      await promise;

      expect(delays).toEqual([100, 200, 300]);
    });
  });

  describe('HTTP method filtering', () => {
    it('should retry GET requests by default', async () => {
      let attempts = 0;

      server.use(
        http.get('https://api.test.com/test', () => {
          attempts++;
          if (attempts === 1) {
            return new Response(null, { status: 500 });
          }
          return Response.json({ success: true });
        })
      );

      const client = new HttpClient().use(
        retryPlugin({ maxRetries: 2, retryDelay: 50 })
      );

      const promise = client.get('https://api.test.com/test');
      await vi.advanceTimersByTimeAsync(200);
      await promise;

      expect(attempts).toBe(2);
    });

    it('should not retry POST requests by default', async () => {
      let attempts = 0;

      server.use(
        http.post('https://api.test.com/test', () => {
          attempts++;
          return new Response(null, { status: 500 });
        })
      );

      const client = new HttpClient().use(
        retryPlugin({ maxRetries: 3, retryDelay: 50 })
      );

      await expect(
        client.post('https://api.test.com/test', { data: 'test' })
      ).rejects.toThrow();

      expect(attempts).toBe(1); // No retries
    });

    it('should respect custom methods configuration', async () => {
      let attempts = 0;

      server.use(
        http.post('https://api.test.com/test', () => {
          attempts++;
          if (attempts === 1) {
            return new Response(null, { status: 500 });
          }
          return Response.json({ success: true });
        })
      );

      const client = new HttpClient().use(
        retryPlugin({
          maxRetries: 2,
          retryDelay: 50,
          methods: ['GET', 'POST'] // Allow POST retries
        })
      );

      const promise = client.post('https://api.test.com/test', { data: 'test' });
      await vi.advanceTimersByTimeAsync(200);
      await promise;

      expect(attempts).toBe(2);
    });
  });

  describe('onRetry callback', () => {
    it('should call onRetry before each retry', async () => {
      let attempts = 0;

      server.use(
        http.get('https://api.test.com/test', () => {
          attempts++;
          if (attempts < 3) {
            return new Response(null, { status: 500 });
          }
          return Response.json({ success: true });
        })
      );

      const onRetry = vi.fn();

      const client = new HttpClient().use(
        retryPlugin({
          maxRetries: 3,
          retryDelay: 50,
          onRetry
        })
      );

      const promise = client.get('https://api.test.com/test');

      for (let i = 0; i < 3; i++) {
        await vi.advanceTimersByTimeAsync(100);
      }

      await promise;

      expect(onRetry).toHaveBeenCalledTimes(2); // 2 retries
      expect(onRetry).toHaveBeenNthCalledWith(1, 1, expect.any(Object), expect.any(Number));
      expect(onRetry).toHaveBeenNthCalledWith(2, 2, expect.any(Object), expect.any(Number));
    });
  });

  describe('edge cases', () => {
    it('should handle maxRetries = 0', async () => {
      let attempts = 0;

      server.use(
        http.get('https://api.test.com/test', () => {
          attempts++;
          return new Response(null, { status: 500 });
        })
      );

      const client = new HttpClient().use(
        retryPlugin({ maxRetries: 0 })
      );

      await expect(client.get('https://api.test.com/test')).rejects.toThrow();
      expect(attempts).toBe(1); // No retries
    });

    it('should handle very large maxRetries', async () => {
      let attempts = 0;

      server.use(
        http.get('https://api.test.com/test', () => {
          attempts++;
          if (attempts === 2) {
            return Response.json({ success: true });
          }
          return new Response(null, { status: 500 });
        })
      );

      const client = new HttpClient().use(
        retryPlugin({ maxRetries: 1000, retryDelay: 10 })
      );

      const promise = client.get('https://api.test.com/test');
      await vi.advanceTimersByTimeAsync(50);
      await promise;

      expect(attempts).toBe(2); // Should stop after success
    });

    it('should handle retryDelay = 0', async () => {
      let attempts = 0;

      server.use(
        http.get('https://api.test.com/test', () => {
          attempts++;
          if (attempts < 3) {
            return new Response(null, { status: 500 });
          }
          return Response.json({ success: true });
        })
      );

      const client = new HttpClient().use(
        retryPlugin({ maxRetries: 2, retryDelay: 0 })
      );

      const promise = client.get('https://api.test.com/test');
      await vi.advanceTimersByTimeAsync(10);
      await promise;

      expect(attempts).toBe(3);
    });

    it('should handle network errors', async () => {
      let attempts = 0;

      server.use(
        http.get('https://api.test.com/test', () => {
          attempts++;
          if (attempts < 2) {
            return Response.error();
          }
          return Response.json({ success: true });
        })
      );

      const client = new HttpClient().use(
        retryPlugin({ maxRetries: 2, retryDelay: 50 })
      );

      const promise = client.get('https://api.test.com/test');
      await vi.advanceTimersByTimeAsync(200);

      // Network errors will still throw
      await expect(promise).rejects.toThrow();
    });

    it('should handle timeout during retry', async () => {
      let attempts = 0;

      server.use(
        http.get('https://api.test.com/test', async () => {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 100));
          return new Response(null, { status: 500 });
        })
      );

      const client = new HttpClient().use(
        retryPlugin({ maxRetries: 2, retryDelay: 50 })
      );

      const promise = client.get('https://api.test.com/test', {
        timeout: 50
      });

      await vi.advanceTimersByTimeAsync(500);

      await expect(promise).rejects.toThrow();
    });

    it('should preserve error data across retries', async () => {
      let attempts = 0;

      server.use(
        http.get('https://api.test.com/test', () => {
          attempts++;
          return Response.json(
            { error: 'Server error', attempt: attempts },
            { status: 500 }
          );
        })
      );

      const client = new HttpClient().use(
        retryPlugin({ maxRetries: 2, retryDelay: 50 })
      );

      const promise = client.get('https://api.test.com/test');

      for (let i = 0; i < 3; i++) {
        await vi.advanceTimersByTimeAsync(100);
      }

      try {
        await promise;
      } catch (error: any) {
        expect(error.data).toBeDefined();
        expect(error.data.error).toBe('Server error');
        expect(error.data.attempt).toBe(3); // Last attempt's data
      }
    });

    it('should handle mixed HTTP methods in retries', async () => {
      let getAttempts = 0;
      let postAttempts = 0;

      server.use(
        http.get('https://api.test.com/test', () => {
          getAttempts++;
          if (getAttempts === 1) {
            return new Response(null, { status: 500 });
          }
          return Response.json({ success: true });
        }),
        http.post('https://api.test.com/test', () => {
          postAttempts++;
          return new Response(null, { status: 500 });
        })
      );

      const client = new HttpClient().use(
        retryPlugin({ maxRetries: 2, retryDelay: 50 })
      );

      // GET should retry
      const getPromise = client.get('https://api.test.com/test');
      await vi.advanceTimersByTimeAsync(200);
      await getPromise;
      expect(getAttempts).toBe(2);

      // POST should not retry (by default)
      await expect(
        client.post('https://api.test.com/test', { data: 'test' })
      ).rejects.toThrow();
      expect(postAttempts).toBe(1);
    });
  });

  describe('context persistence', () => {
    it('should persist retry count in context', async () => {
      let attempts = 0;
      const retryCounts: number[] = [];

      const onRetry = vi.fn((attempt) => {
        retryCounts.push(attempt);
      });

      server.use(
        http.get('https://api.test.com/test', () => {
          attempts++;
          if (attempts < 4) {
            return new Response(null, { status: 500 });
          }
          return Response.json({ success: true });
        })
      );

      const client = new HttpClient().use(
        retryPlugin({
          maxRetries: 3,
          retryDelay: 50,
          onRetry
        })
      );

      const promise = client.get('https://api.test.com/test');

      for (let i = 0; i < 4; i++) {
        await vi.advanceTimersByTimeAsync(100);
      }

      await promise;

      expect(retryCounts).toEqual([1, 2, 3]);
    });

    it('should reset context for new requests', async () => {
      let firstRetries: number[] = [];
      let secondRetries: number[] = [];
      let isFirstRequest = true;

      const onRetry = vi.fn((attempt) => {
        if (isFirstRequest) {
          firstRetries.push(attempt);
        } else {
          secondRetries.push(attempt);
        }
      });

      server.use(
        http.get('https://api.test.com/test', () => {
          return new Response(null, { status: 500 });
        })
      );

      const client = new HttpClient().use(
        retryPlugin({
          maxRetries: 2,
          retryDelay: 50,
          onRetry
        })
      );

      // First request
      const promise1 = client.get('https://api.test.com/test');
      for (let i = 0; i < 3; i++) {
        await vi.advanceTimersByTimeAsync(100);
      }
      await expect(promise1).rejects.toThrow();

      isFirstRequest = false;

      // Second request
      const promise2 = client.get('https://api.test.com/test');
      for (let i = 0; i < 3; i++) {
        await vi.advanceTimersByTimeAsync(100);
      }
      await expect(promise2).rejects.toThrow();

      expect(firstRetries).toEqual([1, 2]);
      expect(secondRetries).toEqual([1, 2]);
    });
  });
});
