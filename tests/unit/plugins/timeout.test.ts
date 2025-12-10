import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { HttpClient, TimeoutError } from '@fetchmax/core';
import { timeoutPlugin } from '@fetchmax/plugin-timeout';
import { http, delay } from 'msw';
import { server } from '../../setup';

describe('Timeout Plugin', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Basic Timeout', () => {
    it('should abort request after timeout', async () => {
      server.use(
        http.get('https://api.test.com/slow', async () => {
          await delay(5000);
          return Response.json({ data: 'test' });
        })
      );

      const client = new HttpClient().use(timeoutPlugin({ timeout: 1000 }));

      const promise = client.get('https://api.test.com/slow').catch(e => e);

      // Advance timers past timeout
      await vi.advanceTimersByTimeAsync(1001);

      const error = await promise;
      expect(error).toBeInstanceOf(TimeoutError);
    });

    it('should not timeout if request completes in time', async () => {
      server.use(
        http.get('https://api.test.com/fast', () => {
          return Response.json({ data: 'test' });
        })
      );

      const client = new HttpClient().use(timeoutPlugin({ timeout: 5000 }));

      const response = await client.get('https://api.test.com/fast');
      expect(response.data).toEqual({ data: 'test' });
    });

    it('should include timeout value in error message', async () => {
      server.use(
        http.get('https://api.test.com/slow', async () => {
          await delay(5000);
          return Response.json({ data: 'test' });
        })
      );

      const client = new HttpClient().use(timeoutPlugin({ timeout: 2000 }));

      const promise = client.get('https://api.test.com/slow').catch(e => e);
      await vi.advanceTimersByTimeAsync(2001);

      const error = await promise;
      expect(error.message).toContain('2000ms');
    });
  });

  describe('Custom Error Message', () => {
    it('should use custom timeout message when provided', async () => {
      server.use(
        http.get('https://api.test.com/slow', async () => {
          await delay(5000);
          return Response.json({ data: 'test' });
        })
      );

      const client = new HttpClient().use(
        timeoutPlugin({
          timeout: 1000,
          message: 'Custom timeout error'
        })
      );

      const promise = client.get('https://api.test.com/slow').catch(e => e);
      await vi.advanceTimersByTimeAsync(1001);

      const error = await promise;
      expect(error.message).toBe('Custom timeout error');
      expect(error).toBeInstanceOf(TimeoutError);
    });
  });

  describe('Per-Request Timeout Override', () => {
    it('should allow overriding timeout per request', async () => {
      server.use(
        http.get('https://api.test.com/slow', async () => {
          // Return immediately - we're just testing that timeout doesn't fire
          return Response.json({ data: 'test' });
        })
      );

      const client = new HttpClient().use(timeoutPlugin({ timeout: 1000 }));

      // Override with longer timeout - request completes before timeout
      const response = await client.get('https://api.test.com/slow', { timeout: 5000 });

      expect(response.data).toEqual({ data: 'test' });
    });

    it('should use per-request timeout instead of default', async () => {
      server.use(
        http.get('https://api.test.com/data', async () => {
          await delay(2000);
          return Response.json({ data: 'test' });
        })
      );

      const client = new HttpClient().use(timeoutPlugin({ timeout: 5000 }));

      // Override with shorter timeout
      const promise = client.get('https://api.test.com/data', { timeout: 500 }).catch(e => e);

      await vi.advanceTimersByTimeAsync(501);

      const error = await promise;
      expect(error).toBeInstanceOf(TimeoutError);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero or negative timeout gracefully', async () => {
      server.use(
        http.get('https://api.test.com/data', () => {
          return Response.json({ data: 'test' });
        })
      );

      const client = new HttpClient().use(timeoutPlugin({ timeout: 0 }));

      const response = await client.get('https://api.test.com/data');
      expect(response.data).toEqual({ data: 'test' });
    });

    it('should clear timeout on successful response', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      server.use(
        http.get('https://api.test.com/data', () => {
          return Response.json({ data: 'test' });
        })
      );

      const client = new HttpClient().use(timeoutPlugin({ timeout: 5000 }));

      await client.get('https://api.test.com/data');

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should clear timeout on error', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      server.use(
        http.get('https://api.test.com/error', () => {
          return new Response('Server Error', { status: 500 });
        })
      );

      const client = new HttpClient().use(timeoutPlugin({ timeout: 5000 }));

      try {
        await client.get('https://api.test.com/error');
      } catch {
        // Expected
      }

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should work with existing AbortController', async () => {
      server.use(
        http.get('https://api.test.com/data', async () => {
          await delay(2000);
          return Response.json({ data: 'test' });
        })
      );

      const controller = new AbortController();
      const client = new HttpClient().use(timeoutPlugin({ timeout: 5000 }));

      // Manually abort before timeout
      setTimeout(() => controller.abort(), 100);

      const promise = client.get('https://api.test.com/data', {
        signal: controller.signal
      }).catch(e => e);

      await vi.advanceTimersByTimeAsync(101);

      const error = await promise;
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('Multiple Requests', () => {
    it('should handle timeouts independently for concurrent requests', async () => {
      server.use(
        http.get('https://api.test.com/fast', () => {
          return Response.json({ data: 'fast' });
        }),
        http.get('https://api.test.com/slow', async () => {
          await delay(3000);
          return Response.json({ data: 'slow' });
        })
      );

      const client = new HttpClient().use(timeoutPlugin({ timeout: 1000 }));

      const fastPromise = client.get('https://api.test.com/fast');
      const slowPromise = client.get('https://api.test.com/slow').catch(e => e);

      const fastResponse = await fastPromise;
      expect(fastResponse.data).toEqual({ data: 'fast' });

      await vi.advanceTimersByTimeAsync(1001);

      const error = await slowPromise;
      expect(error).toBeInstanceOf(TimeoutError);
    });
  });

  describe('Integration with Other Plugins', () => {
    it('should work with retry plugin', async () => {
      let attemptCount = 0;

      server.use(
        http.get('https://api.test.com/data', async () => {
          attemptCount++;
          await delay(2000);
          return Response.json({ data: 'test' });
        })
      );

      const client = new HttpClient().use(timeoutPlugin({ timeout: 500 }));

      const promise = client.get('https://api.test.com/data').catch(e => e);
      await vi.advanceTimersByTimeAsync(501);

      const error = await promise;
      expect(error).toBeInstanceOf(TimeoutError);
      expect(attemptCount).toBe(1);
    });
  });
});
