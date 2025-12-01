import { describe, it, expect, vi } from 'vitest';
import { HttpClient } from '../../../packages/core/src/client';
import { dedupePlugin } from '../../../packages/plugins/dedupe/src/index';
import { http, delay } from 'msw';
import { server } from '../../setup';

describe('Dedupe Plugin', () => {
  describe('Basic Deduplication', () => {
    it('should deduplicate identical concurrent requests', async () => {
      let requestCount = 0;

      server.use(
        http.get('https://api.test.com/data', async () => {
          requestCount++;
          await delay(100);
          return Response.json({ value: 'test' });
        })
      );

      const dedupe = dedupePlugin();
      const client = new HttpClient().use(dedupe);

      // Make 3 concurrent requests
      const [r1, r2, r3] = await Promise.all([
        client.get('https://api.test.com/data'),
        client.get('https://api.test.com/data'),
        client.get('https://api.test.com/data')
      ]);

      // All should return the same data
      expect(r1.data).toEqual({ value: 'test' });
      expect(r2.data).toEqual({ value: 'test' });
      expect(r3.data).toEqual({ value: 'test' });

      // Only one actual request should have been made
      expect(requestCount).toBe(1);
    });

    it('should not deduplicate sequential requests', async () => {
      let requestCount = 0;

      server.use(
        http.get('https://api.test.com/data', () => {
          requestCount++;
          return Response.json({ value: 'test' });
        })
      );

      const client = new HttpClient().use(dedupePlugin());

      await client.get('https://api.test.com/data');
      await client.get('https://api.test.com/data');
      await client.get('https://api.test.com/data');

      // Each request should hit the server
      expect(requestCount).toBe(3);
    });

    it('should deduplicate requests with same URL and params', async () => {
      let requestCount = 0;

      server.use(
        http.get('https://api.test.com/search', async () => {
          requestCount++;
          await delay(50);
          return Response.json({ results: [] });
        })
      );

      const client = new HttpClient().use(dedupePlugin());

      const [r1, r2] = await Promise.all([
        client.get('https://api.test.com/search', { params: { q: 'test' } }),
        client.get('https://api.test.com/search', { params: { q: 'test' } })
      ]);

      expect(r1.data).toEqual({ results: [] });
      expect(r2.data).toEqual({ results: [] });
      expect(requestCount).toBe(1);
    });
  });

  describe('Different Requests', () => {
    it('should not deduplicate requests with different URLs', async () => {
      let request1Count = 0;
      let request2Count = 0;

      server.use(
        http.get('https://api.test.com/users', async () => {
          request1Count++;
          await delay(50);
          return Response.json({ users: [] });
        }),
        http.get('https://api.test.com/posts', async () => {
          request2Count++;
          await delay(50);
          return Response.json({ posts: [] });
        })
      );

      const client = new HttpClient().use(dedupePlugin());

      await Promise.all([
        client.get('https://api.test.com/users'),
        client.get('https://api.test.com/posts')
      ]);

      expect(request1Count).toBe(1);
      expect(request2Count).toBe(1);
    });

    it('should not deduplicate requests with different params', async () => {
      let requestCount = 0;

      server.use(
        http.get('https://api.test.com/search', async ({ request }) => {
          requestCount++;
          await delay(50);
          const url = new URL(request.url);
          const q = url.searchParams.get('q');
          return Response.json({ query: q });
        })
      );

      const client = new HttpClient().use(dedupePlugin());

      const [r1, r2] = await Promise.all([
        client.get('https://api.test.com/search', { params: { q: 'test1' } }),
        client.get('https://api.test.com/search', { params: { q: 'test2' } })
      ]);

      expect(r1.data.query).toBe('test1');
      expect(r2.data.query).toBe('test2');
      expect(requestCount).toBe(2);
    });

    it('should not deduplicate different HTTP methods', async () => {
      let getCount = 0;
      let postCount = 0;

      server.use(
        http.get('https://api.test.com/data', async () => {
          getCount++;
          await delay(50);
          return Response.json({ method: 'GET' });
        }),
        http.post('https://api.test.com/data', async () => {
          postCount++;
          await delay(50);
          return Response.json({ method: 'POST' });
        })
      );

      const client = new HttpClient().use(dedupePlugin());

      await Promise.all([
        client.get('https://api.test.com/data'),
        client.post('https://api.test.com/data', {})
      ]);

      expect(getCount).toBe(1);
      expect(postCount).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in deduplicated requests', async () => {
      server.use(
        http.get('https://api.test.com/error', () => {
          return new Response('Server Error', { status: 500 });
        })
      );

      const client = new HttpClient().use(dedupePlugin());

      const results = await Promise.allSettled([
        client.get('https://api.test.com/error'),
        client.get('https://api.test.com/error'),
        client.get('https://api.test.com/error')
      ]);

      // All should reject
      expect(results.every(r => r.status === 'rejected')).toBe(true);
    });

    it('should clear deduplication state after error', async () => {
      let requestCount = 0;

      server.use(
        http.get('https://api.test.com/data', () => {
          requestCount++;
          if (requestCount === 1) {
            return new Response('Error', { status: 500 });
          }
          return Response.json({ value: 'success' });
        })
      );

      const client = new HttpClient().use(dedupePlugin());

      try {
        await client.get('https://api.test.com/data');
      } catch {
        // Expected
      }

      const response = await client.get('https://api.test.com/data');
      expect(response.data).toEqual({ value: 'success' });
      expect(requestCount).toBe(2);
    });
  });

  describe('Clear Method', () => {
    it('should clear deduplication cache', async () => {
      let requestCount = 0;

      server.use(
        http.get('https://api.test.com/data', async () => {
          requestCount++;
          await delay(100);
          return Response.json({ value: 'test' });
        })
      );

      const dedupe = dedupePlugin();
      const client = new HttpClient().use(dedupe);

      // Start concurrent requests
      const promise1 = client.get('https://api.test.com/data');
      const promise2 = client.get('https://api.test.com/data');

      // Clear cache while requests are in flight
      dedupe.clear();

      await Promise.all([promise1, promise2]);

      expect(requestCount).toBe(1);
    });
  });

  describe('Logging', () => {
    it('should log when request is deduplicated', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      server.use(
        http.get('https://api.test.com/data', async () => {
          await delay(50);
          return Response.json({ value: 'test' });
        })
      );

      const client = new HttpClient().use(dedupePlugin());

      await Promise.all([
        client.get('https://api.test.com/data'),
        client.get('https://api.test.com/data')
      ]);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Dedupe]')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid sequential requests', async () => {
      let requestCount = 0;

      server.use(
        http.get('https://api.test.com/data', () => {
          requestCount++;
          return Response.json({ value: requestCount });
        })
      );

      const client = new HttpClient().use(dedupePlugin());

      // Rapid sequential requests (no overlap)
      const r1 = await client.get('https://api.test.com/data');
      const r2 = await client.get('https://api.test.com/data');
      const r3 = await client.get('https://api.test.com/data');

      expect(r1.data.value).toBe(1);
      expect(r2.data.value).toBe(2);
      expect(r3.data.value).toBe(3);
      expect(requestCount).toBe(3);
    });

    it('should handle mixed concurrent and sequential requests', async () => {
      let requestCount = 0;

      server.use(
        http.get('https://api.test.com/data', async () => {
          requestCount++;
          await delay(100);
          return Response.json({ count: requestCount });
        })
      );

      const client = new HttpClient().use(dedupePlugin());

      // First batch of concurrent requests
      const [r1, r2] = await Promise.all([
        client.get('https://api.test.com/data'),
        client.get('https://api.test.com/data')
      ]);

      expect(r1.data.count).toBe(1);
      expect(r2.data.count).toBe(1);

      // Second batch of concurrent requests
      const [r3, r4] = await Promise.all([
        client.get('https://api.test.com/data'),
        client.get('https://api.test.com/data')
      ]);

      expect(r3.data.count).toBe(2);
      expect(r4.data.count).toBe(2);

      expect(requestCount).toBe(2);
    });
  });
});
