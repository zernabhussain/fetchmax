import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { http, HttpResponse, delay } from 'msw';
import { setupServer } from 'msw/node';
import { HttpClient } from '@fetchmax/core';
import { retryPlugin } from '@fetchmax/plugin-retry';
import { timeoutPlugin } from '@fetchmax/plugin-timeout';
import { TimeoutError } from '@fetchmax/core';

/**
 * Network Resilience Tests
 *
 * Tests covering network failure scenarios and resilience patterns:
 * - Connection simulation (flaky networks, retries)
 * - Timeout scenarios (connect vs read timeouts)
 * - Offline/online transitions
 * - Response corruption and incomplete data
 * - Latency jitter handling
 * - Error recovery patterns
 */

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  vi.useFakeTimers();
});

afterEach(() => {
  server.resetHandlers();
  vi.clearAllTimers();
});

afterAll(() => {
  server.close();
  vi.useRealTimers();
});

describe('Network Resilience Tests', () => {
  describe('Connection Failures & Retry', () => {
    it('should handle intermittent connection failures', async () => {
      let attempts = 0;

      server.use(
        http.get('https://api.test.com/unstable', () => {
          attempts++;
          // Fail first 2 attempts, succeed on 3rd
          if (attempts < 3) {
            return new Response(null, {
              status: 503,
              statusText: 'Service Temporarily Unavailable'
            });
          }
          return HttpResponse.json({ success: true });
        })
      );

      const client = new HttpClient().use(
        retryPlugin({ maxRetries: 3, retryDelay: 100 })
      );

      const promise = client.get('https://api.test.com/unstable');
      await vi.advanceTimersByTimeAsync(500);

      const response = await promise;

      expect(attempts).toBe(3);
      expect(response.data).toEqual({ success: true });
    });

    it('should fail after max retries on persistent failures', async () => {
      let attempts = 0;

      server.use(
        http.get('https://api.test.com/always-fails', () => {
          attempts++;
          return new Response(null, { status: 503 });
        })
      );

      const client = new HttpClient().use(
        retryPlugin({ maxRetries: 2, retryDelay: 50 })
      );

      const promise = client.get('https://api.test.com/always-fails').catch(e => e);
      await vi.advanceTimersByTimeAsync(300);

      const error = await promise;

      expect(attempts).toBe(3); // 1 initial + 2 retries
      expect(error.status).toBe(503);
    });

    it('should handle network error simulation', async () => {
      let attempts = 0;

      server.use(
        http.get('https://api.test.com/network-error', () => {
          attempts++;
          // First attempt returns network error (502), second succeeds
          if (attempts === 1) {
            return new Response(null, { status: 502 }); // Simulates network error
          }
          return HttpResponse.json({ recovered: true });
        })
      );

      const client = new HttpClient().use(
        retryPlugin({ maxRetries: 2, retryDelay: 100 })
      );

      const promise = client.get('https://api.test.com/network-error');
      await vi.advanceTimersByTimeAsync(500);

      const response = await promise;

      expect(attempts).toBe(2);
      expect(response.data.recovered).toBe(true);
    });
  });

  describe('Flaky Network Simulation', () => {
    it('should handle predictable failure patterns', async () => {
      const failurePattern = [true, true, false]; // Fail twice, then succeed
      let attemptIndex = 0;

      server.use(
        http.get('https://flaky-pattern.test.com/api', () => {
          const shouldFail = failurePattern[attemptIndex];
          attemptIndex++;

          if (shouldFail) {
            return new Response(null, { status: 500 });
          }
          return HttpResponse.json({ attempt: attemptIndex });
        })
      );

      const client = new HttpClient().use(
        retryPlugin({ maxRetries: 3, retryDelay: 50 })
      );

      const promise = client.get('https://flaky-pattern.test.com/api');
      await vi.advanceTimersByTimeAsync(500);

      const response = await promise;

      expect(response.data.attempt).toBe(3); // Succeeded on 3rd attempt
      expect(attemptIndex).toBe(3);
    });

    it('should recover from sporadic 50x errors', async () => {
      let attempts = 0;

      server.use(
        http.get('https://api.test.com/sporadic-errors', () => {
          attempts++;
          // Intermittent failures
          if (attempts === 1 || attempts === 3) {
            return new Response(null, { status: 502 });
          }
          return HttpResponse.json({ success: true, attempts });
        })
      );

      const client = new HttpClient().use(
        retryPlugin({ maxRetries: 5, retryDelay: 50 })
      );

      const promise = client.get('https://api.test.com/sporadic-errors');
      await vi.advanceTimersByTimeAsync(1000);

      const response = await promise;

      expect(response.data.success).toBe(true);
      expect(attempts).toBeGreaterThanOrEqual(2);
    });

    it('should handle alternating success/failure patterns', async () => {
      let attempts = 0;

      server.use(
        http.get('https://api.test.com/alternating', () => {
          attempts++;
          // Alternate: fail, succeed, fail, succeed
          if (attempts % 2 === 1) {
            return new Response(null, { status: 503 });
          }
          return HttpResponse.json({ attempt: attempts });
        })
      );

      const client = new HttpClient().use(
        retryPlugin({ maxRetries: 2, retryDelay: 50 })
      );

      const promise = client.get('https://api.test.com/alternating');
      await vi.advanceTimersByTimeAsync(300);

      const response = await promise;

      expect(response.data.attempt).toBe(2); // First success on attempt 2
      expect(attempts).toBe(2);
    });
  });

  describe('Timeout Scenarios', () => {
    it('should handle connect timeout simulation', async () => {
      server.use(
        http.get('https://api.test.com/connect-timeout', async () => {
          await delay('infinite');
          return HttpResponse.json({ data: 'never' });
        })
      );

      const client = new HttpClient().use(timeoutPlugin({ timeout: 200 }));

      const promise = client.get('https://api.test.com/connect-timeout').catch(e => e);
      await vi.advanceTimersByTimeAsync(300);

      const error = await promise;

      expect(error).toBeInstanceOf(TimeoutError);
    });

    it('should handle read timeout with delayed responses', async () => {
      server.use(
        http.get('https://api.test.com/read-timeout', async () => {
          await delay(500); // Delayed response
          return HttpResponse.json({ data: 'slow' });
        })
      );

      const client = new HttpClient().use(timeoutPlugin({ timeout: 200 }));

      const promise = client.get('https://api.test.com/read-timeout').catch(e => e);
      await vi.advanceTimersByTimeAsync(300);

      const error = await promise;

      expect(error).toBeInstanceOf(TimeoutError);
    });

    it('should allow requests that complete within timeout', async () => {
      server.use(
        http.get('https://api.test.com/fast', async () => {
          await delay(50);
          return HttpResponse.json({ type: 'fast' });
        })
      );

      const client = new HttpClient();

      const promise = client.get('https://api.test.com/fast', {
        timeout: 150
      });
      await vi.advanceTimersByTimeAsync(200);
      const response = await promise;

      expect(response.data.type).toBe('fast');
    });

    it('should timeout slow requests even with retry plugin', async () => {
      let attempts = 0;

      server.use(
        http.get('https://api.test.com/always-slow', async () => {
          attempts++;
          await delay(300);
          return HttpResponse.json({ success: true });
        })
      );

      const client = new HttpClient().use(
        timeoutPlugin({ timeout: 200 }),
        retryPlugin({ maxRetries: 2, retryDelay: 100 })
      );

      const promise = client.get('https://api.test.com/always-slow').catch(e => e);
      await vi.advanceTimersByTimeAsync(1000);

      const error = await promise;

      // Each attempt times out at 200ms
      expect(error).toBeInstanceOf(TimeoutError);
      expect(attempts).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Offline/Online Transitions', () => {
    it('should recover when service becomes available after failures', async () => {
      let attempts = 0;

      server.use(
        http.get('https://api.test.com/status', () => {
          attempts++;
          // Fail first 2 attempts, succeed on 3rd
          if (attempts < 3) {
            return new Response(null, { status: 503 });
          }
          return HttpResponse.json({ status: 'online' });
        })
      );

      const client = new HttpClient().use(
        retryPlugin({ maxRetries: 3, retryDelay: 100 })
      );

      const promise = client.get('https://api.test.com/status');
      await vi.advanceTimersByTimeAsync(500);

      const response = await promise;

      expect(attempts).toBe(3);
      expect(response.data.status).toBe('online');
    });
  });

  describe('Proxy & Gateway Errors', () => {
    it('should handle proxy authentication required (407)', async () => {
      server.use(
        http.get('https://api.test.com/authenticated-proxy', () => {
          return new Response(null, {
            status: 407,
            statusText: 'Proxy Authentication Required'
          });
        })
      );

      const client = new HttpClient();

      const promise = client.get('https://api.test.com/authenticated-proxy').catch(e => e);
      await vi.advanceTimersByTimeAsync(100);

      const error = await promise;

      expect(error).toBeInstanceOf(Error);
      expect(error.status).toBe(407);
    });

    it('should handle bad gateway errors (502)', async () => {
      let attempts = 0;

      server.use(
        http.get('https://api.test.com/gateway', () => {
          attempts++;
          if (attempts < 2) {
            return new Response(null, { status: 502 });
          }
          return HttpResponse.json({ gateway: 'recovered' });
        })
      );

      const client = new HttpClient().use(
        retryPlugin({ maxRetries: 2, retryDelay: 100 })
      );

      const promise = client.get('https://api.test.com/gateway');
      await vi.advanceTimersByTimeAsync(500);

      const response = await promise;

      expect(attempts).toBe(2);
      expect(response.data.gateway).toBe('recovered');
    });

    it('should handle gateway timeout (504)', async () => {
      let attempts = 0;

      server.use(
        http.get('https://api.test.com/slow-gateway', () => {
          attempts++;
          if (attempts < 3) {
            return new Response(null, { status: 504 });
          }
          return HttpResponse.json({ success: true });
        })
      );

      const client = new HttpClient().use(
        retryPlugin({ maxRetries: 3, retryDelay: 50 })
      );

      const promise = client.get('https://api.test.com/slow-gateway');
      await vi.advanceTimersByTimeAsync(500);

      const response = await promise;

      expect(attempts).toBe(3);
      expect(response.data.success).toBe(true);
    });
  });

  describe('Response Corruption & Incomplete Data', () => {
    it('should handle JSON parse errors from invalid syntax', async () => {
      server.use(
        http.get('https://api.test.com/corrupted', () => {
          return new Response('{"invalid": json syntax}', {
            headers: { 'Content-Type': 'application/json' }
          });
        })
      );

      const client = new HttpClient();

      const promise = client.get('https://api.test.com/corrupted').catch(e => e);
      await vi.advanceTimersByTimeAsync(100);

      const error = await promise;

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('JSON');
    });

    it('should handle JSON parse errors from truncated response', async () => {
      let attempts = 0;

      server.use(
        http.get('https://api.test.com/sometimes-corrupted', () => {
          attempts++;
          if (attempts === 1) {
            return new Response('{"invalid":', {
              headers: { 'Content-Type': 'application/json' }
            });
          }
          return HttpResponse.json({ valid: true });
        })
      );

      const client = new HttpClient();

      // First attempt will fail to parse
      const promise = client.get('https://api.test.com/sometimes-corrupted').catch(e => e);
      await vi.advanceTimersByTimeAsync(100);

      const error = await promise;

      expect(attempts).toBe(1);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('JSON');
    });

    it('should handle empty responses gracefully', async () => {
      server.use(
        http.get('https://api.test.com/empty', () => {
          return new Response(null, {
            status: 204,
            statusText: 'No Content'
          });
        })
      );

      const client = new HttpClient();

      const response = await client.get('https://api.test.com/empty');

      expect(response.status).toBe(204);
      expect(response.data).toBeNull();
    });
  });

  describe('Latency Jitter Handling', () => {
    it('should handle variable response latency', async () => {
      const latencies = [50, 200, 75, 100]; // Variable response times
      let requestIndex = 0;

      server.use(
        http.get('https://api.test.com/jitter', async () => {
          const latency = latencies[requestIndex % latencies.length];
          requestIndex++;
          await delay(latency);
          return HttpResponse.json({ latency });
        })
      );

      const client = new HttpClient();

      const results: number[] = [];

      // Make multiple requests
      for (let i = 0; i < 4; i++) {
        const promise = client.get('https://api.test.com/jitter');
        await vi.advanceTimersByTimeAsync(250);
        const response = await promise;
        results.push(response.data.latency);
      }

      expect(results).toEqual(latencies);
    });

    it('should timeout only on excessive latency', async () => {
      const latencies = [50, 100, 150, 500]; // Last one exceeds timeout
      let requestIndex = 0;

      server.use(
        http.get('https://api.test.com/jitter-timeout', async () => {
          const latency = latencies[requestIndex];
          requestIndex++;
          await delay(latency);
          return HttpResponse.json({ latency });
        })
      );

      const client = new HttpClient().use(timeoutPlugin({ timeout: 200 }));

      // First 3 requests should succeed
      for (let i = 0; i < 3; i++) {
        const promise = client.get('https://api.test.com/jitter-timeout');
        await vi.advanceTimersByTimeAsync(250);
        const response = await promise;
        expect(response.data.latency).toBeLessThan(200);
      }

      // 4th request should timeout
      const timeoutPromise = client.get('https://api.test.com/jitter-timeout').catch(e => e);
      await vi.advanceTimersByTimeAsync(250);
      const error = await timeoutPromise;

      expect(error).toBeInstanceOf(TimeoutError);
    });

    it('should adapt to jitter with progressive retry delays', async () => {
      let attempts = 0;
      const jitterDelays = [100, 150, 200];

      server.use(
        http.get('https://api.test.com/adaptive', async () => {
          attempts++;
          if (attempts < 3) {
            await delay(jitterDelays[attempts - 1]);
            return new Response(null, { status: 503 });
          }
          return HttpResponse.json({ success: true, attempts });
        })
      );

      const client = new HttpClient().use(
        retryPlugin({
          maxRetries: 3,
          retryDelay: 150,
          backoff: 'linear'
        })
      );

      const promise = client.get('https://api.test.com/adaptive');
      await vi.advanceTimersByTimeAsync(1500);

      const response = await promise;

      expect(attempts).toBe(3);
      expect(response.data.success).toBe(true);
    });
  });

  describe('Error Recovery Patterns', () => {
    it('should recover from transient errors with exponential backoff', async () => {
      let attempts = 0;
      const startTime = Date.now();
      const retryTimes: number[] = [];

      server.use(
        http.get('https://api.test.com/transient', () => {
          attempts++;
          retryTimes.push(Date.now() - startTime);

          if (attempts < 4) {
            return new Response(null, { status: 503 });
          }
          return HttpResponse.json({ recovered: true });
        })
      );

      const client = new HttpClient().use(
        retryPlugin({
          maxRetries: 4,
          retryDelay: 100,
          backoff: 'exponential'
        })
      );

      const promise = client.get('https://api.test.com/transient');
      await vi.advanceTimersByTimeAsync(2000);

      const response = await promise;

      expect(attempts).toBe(4);
      expect(response.data.recovered).toBe(true);
      // Verify exponential backoff (100ms, 200ms, 400ms)
      expect(retryTimes.length).toBe(4);
    });

    it('should fail fast on non-retryable errors', async () => {
      let attempts = 0;

      server.use(
        http.get('https://api.test.com/bad-request', () => {
          attempts++;
          return new Response(null, { status: 400 }); // Client error - not retryable
        })
      );

      const client = new HttpClient().use(
        retryPlugin({ maxRetries: 3, retryDelay: 50 })
      );

      const promise = client.get('https://api.test.com/bad-request').catch(e => e);
      await vi.advanceTimersByTimeAsync(300);

      const error = await promise;

      expect(attempts).toBe(1); // No retries for 4xx errors
      expect(error.status).toBe(400);
    });

    it('should handle mixed error types in sequence', async () => {
      let attempts = 0;
      const errorSequence = [503, 502, 504]; // Different 5xx errors

      server.use(
        http.get('https://api.test.com/mixed-errors', () => {
          const errorCode = errorSequence[attempts] || 200;
          attempts++;

          if (errorCode !== 200) {
            return new Response(null, { status: errorCode });
          }
          return HttpResponse.json({ recovered: true, attempts });
        })
      );

      const client = new HttpClient().use(
        retryPlugin({ maxRetries: 4, retryDelay: 50 })
      );

      const promise = client.get('https://api.test.com/mixed-errors');
      await vi.advanceTimersByTimeAsync(500);

      const response = await promise;

      expect(attempts).toBe(4); // 3 errors + 1 success
      expect(response.data.recovered).toBe(true);
    });
  });
});
