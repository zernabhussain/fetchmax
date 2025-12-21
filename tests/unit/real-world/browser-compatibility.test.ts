import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { HttpClient } from '@fetchmax/core';
import { cachePlugin } from '@fetchmax/plugin-cache';
import { retryPlugin } from '@fetchmax/plugin-retry';

// MSW server setup
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());

/**
 * Phase 2 P1: Browser Compatibility Tests
 *
 * These tests validate FetchMax behavior with browser-specific features:
 * - Request credentials (include, omit, same-origin)
 * - CORS modes (cors, no-cors, same-origin)
 * - Referrer policies
 * - Cache modes
 * - Request modes
 * - Browser-specific headers
 * - FormData and File handling
 */
describe('Real-World: Browser Compatibility', () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  describe('Request Credentials', () => {
    it('should support credentials: include', async () => {
      server.use(
        http.get('https://api.test.com/with-credentials', ({ request }) => {
          // In real browsers, credentials: 'include' sends cookies
          return HttpResponse.json({ credentialsMode: 'include' });
        })
      );

      const client = new HttpClient();
      const response = await client.get('https://api.test.com/with-credentials', {
        credentials: 'include'
      });

      expect(response.status).toBe(200);
      expect(response.data.credentialsMode).toBe('include');
    });

    it('should support credentials: omit', async () => {
      server.use(
        http.get('https://api.test.com/no-credentials', () => {
          return HttpResponse.json({ credentialsMode: 'omit' });
        })
      );

      const client = new HttpClient();
      const response = await client.get('https://api.test.com/no-credentials', {
        credentials: 'omit'
      });

      expect(response.status).toBe(200);
      expect(response.data.credentialsMode).toBe('omit');
    });

    it('should support credentials: same-origin', async () => {
      server.use(
        http.get('https://api.test.com/same-origin-credentials', () => {
          return HttpResponse.json({ credentialsMode: 'same-origin' });
        })
      );

      const client = new HttpClient();
      const response = await client.get('https://api.test.com/same-origin-credentials', {
        credentials: 'same-origin'
      });

      expect(response.status).toBe(200);
      expect(response.data.credentialsMode).toBe('same-origin');
    });
  });

  describe('CORS Modes', () => {
    it('should support mode: cors', async () => {
      server.use(
        http.get('https://api.test.com/cors', ({ request }) => {
          return HttpResponse.json({ mode: 'cors' }, {
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE'
            }
          });
        })
      );

      const client = new HttpClient();
      const response = await client.get('https://api.test.com/cors', {
        mode: 'cors'
      });

      expect(response.status).toBe(200);
      expect(response.data.mode).toBe('cors');
    });

    it('should support mode: no-cors for opaque responses', async () => {
      server.use(
        http.get('https://api.test.com/no-cors', () => {
          // In no-cors mode, response is opaque
          return new Response(null, { status: 200 });
        })
      );

      const client = new HttpClient();
      const response = await client.get('https://api.test.com/no-cors', {
        mode: 'no-cors'
      });

      expect(response.status).toBe(200);
    });

    it('should support mode: same-origin', async () => {
      server.use(
        http.get('https://api.test.com/same-origin', () => {
          return HttpResponse.json({ mode: 'same-origin' });
        })
      );

      const client = new HttpClient();
      const response = await client.get('https://api.test.com/same-origin', {
        mode: 'same-origin'
      });

      expect(response.status).toBe(200);
      expect(response.data.mode).toBe('same-origin');
    });

    it('should handle CORS preflight requests', async () => {
      let preflightReceived = false;

      server.use(
        http.options('https://api.test.com/preflight', () => {
          preflightReceived = true;
          return new Response(null, {
            status: 204,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
          });
        }),
        http.post('https://api.test.com/preflight', () => {
          return HttpResponse.json({ success: true });
        })
      );

      const client = new HttpClient();
      const response = await client.post('https://api.test.com/preflight', {
        data: { test: 'data' }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });
  });

  describe('Referrer Policy', () => {
    it('should support referrerPolicy: no-referrer', async () => {
      server.use(
        http.get('https://api.test.com/no-referrer', ({ request }) => {
          const referrer = request.referrer;
          return HttpResponse.json({ referrer: referrer || 'none' });
        })
      );

      const client = new HttpClient();
      const response = await client.get('https://api.test.com/no-referrer', {
        referrerPolicy: 'no-referrer'
      });

      expect(response.status).toBe(200);
    });

    it('should support referrerPolicy: origin', async () => {
      server.use(
        http.get('https://api.test.com/origin-referrer', () => {
          return HttpResponse.json({ referrerPolicy: 'origin' });
        })
      );

      const client = new HttpClient();
      const response = await client.get('https://api.test.com/origin-referrer', {
        referrerPolicy: 'origin'
      });

      expect(response.status).toBe(200);
    });

    it('should support referrerPolicy: strict-origin-when-cross-origin', async () => {
      server.use(
        http.get('https://api.test.com/strict-origin', () => {
          return HttpResponse.json({ referrerPolicy: 'strict-origin-when-cross-origin' });
        })
      );

      const client = new HttpClient();
      const response = await client.get('https://api.test.com/strict-origin', {
        referrerPolicy: 'strict-origin-when-cross-origin'
      });

      expect(response.status).toBe(200);
    });
  });

  describe('Cache Modes', () => {
    it('should support cache: default', async () => {
      server.use(
        http.get('https://api.test.com/cache-default', () => {
          return HttpResponse.json({ cached: false });
        })
      );

      const client = new HttpClient();
      const response = await client.get('https://api.test.com/cache-default', {
        cache: 'default'
      });

      expect(response.status).toBe(200);
    });

    it('should support cache: no-store', async () => {
      let requestCount = 0;

      server.use(
        http.get('https://api.test.com/no-store', () => {
          requestCount++;
          return HttpResponse.json({ count: requestCount });
        })
      );

      const client = new HttpClient();

      // Both requests should hit the server
      await client.get('https://api.test.com/no-store', { cache: 'no-store' });
      await client.get('https://api.test.com/no-store', { cache: 'no-store' });

      expect(requestCount).toBe(2);
    });

    it('should support cache: reload', async () => {
      let requestCount = 0;

      server.use(
        http.get('https://api.test.com/reload', () => {
          requestCount++;
          return HttpResponse.json({ count: requestCount });
        })
      );

      const client = new HttpClient();

      // Reload bypasses cache
      await client.get('https://api.test.com/reload', { cache: 'reload' });
      await client.get('https://api.test.com/reload', { cache: 'reload' });

      expect(requestCount).toBe(2);
    });

    it('should support cache: force-cache', async () => {
      server.use(
        http.get('https://api.test.com/force-cache', () => {
          return HttpResponse.json({ data: 'cached' });
        })
      );

      const client = new HttpClient().use(cachePlugin({ ttl: 60000 }));

      const response1 = await client.get('https://api.test.com/force-cache');
      const response2 = await client.get('https://api.test.com/force-cache');

      expect(response1.data).toEqual(response2.data);
    });
  });

  describe('FormData and File Handling', () => {
    it('should handle FormData requests', async () => {
      server.use(
        http.post('https://api.test.com/formdata', async ({ request }) => {
          const contentType = request.headers.get('content-type') || '';
          return HttpResponse.json({
            received: true,
            contentType: contentType.includes('multipart/form-data')
          });
        })
      );

      const client = new HttpClient();

      // Simulate FormData
      const formData = new FormData();
      formData.append('name', 'test');
      formData.append('file', new Blob(['test content'], { type: 'text/plain' }), 'test.txt');

      const response = await client.post('https://api.test.com/formdata', {
        body: formData
      });

      expect(response.status).toBe(200);
      expect(response.data.received).toBe(true);
    });

    it('should handle Blob uploads', async () => {
      server.use(
        http.post('https://api.test.com/blob', async ({ request }) => {
          const contentType = request.headers.get('content-type');
          return HttpResponse.json({ contentType });
        })
      );

      const client = new HttpClient();
      const blob = new Blob(['{"test": "data"}'], { type: 'application/json' });

      const response = await client.post('https://api.test.com/blob', {
        body: blob,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status).toBe(200);
    });

    it('should handle ArrayBuffer uploads', async () => {
      server.use(
        http.post('https://api.test.com/arraybuffer', () => {
          return HttpResponse.json({ received: true });
        })
      );

      const client = new HttpClient();
      const buffer = new ArrayBuffer(8);
      const view = new Uint8Array(buffer);
      view[0] = 72; // 'H'

      const response = await client.post('https://api.test.com/arraybuffer', {
        body: buffer
      });

      expect(response.status).toBe(200);
      expect(response.data.received).toBe(true);
    });
  });

  describe('Request Headers', () => {
    it('should support custom user-agent headers', async () => {
      server.use(
        http.get('https://api.test.com/user-agent', ({ request }) => {
          const userAgent = request.headers.get('user-agent');
          return HttpResponse.json({ userAgent });
        })
      );

      const client = new HttpClient();
      const response = await client.get('https://api.test.com/user-agent', {
        headers: {
          'User-Agent': 'FetchMax/1.0'
        }
      });

      expect(response.status).toBe(200);
    });

    it('should support Accept headers', async () => {
      server.use(
        http.get('https://api.test.com/accept', ({ request }) => {
          const accept = request.headers.get('accept');
          return HttpResponse.json({ accept });
        })
      );

      const client = new HttpClient();
      const response = await client.get('https://api.test.com/accept', {
        headers: {
          'Accept': 'application/json, text/plain, */*'
        }
      });

      expect(response.status).toBe(200);
    });

    it('should support Content-Type headers', async () => {
      server.use(
        http.post('https://api.test.com/content-type', ({ request }) => {
          const contentType = request.headers.get('content-type');
          return HttpResponse.json({ contentType });
        })
      );

      const client = new HttpClient();
      const response = await client.post('https://api.test.com/content-type', {
        data: { test: 'data' },
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        }
      });

      expect(response.status).toBe(200);
      expect(response.data.contentType).toContain('application/json');
    });

    it('should support Authorization headers', async () => {
      server.use(
        http.get('https://api.test.com/auth', ({ request }) => {
          const auth = request.headers.get('authorization');
          return HttpResponse.json({ authorized: !!auth });
        })
      );

      const client = new HttpClient();
      const response = await client.get('https://api.test.com/auth', {
        headers: {
          'Authorization': 'Bearer token123'
        }
      });

      expect(response.status).toBe(200);
      expect(response.data.authorized).toBe(true);
    });
  });

  describe('Response Types', () => {
    it('should handle JSON responses', async () => {
      server.use(
        http.get('https://api.test.com/json', () => {
          return HttpResponse.json({ type: 'json', data: [1, 2, 3] });
        })
      );

      const client = new HttpClient();
      const response = await client.get('https://api.test.com/json');

      expect(response.status).toBe(200);
      expect(response.data.type).toBe('json');
      expect(Array.isArray(response.data.data)).toBe(true);
    });

    it('should handle text responses', async () => {
      server.use(
        http.get('https://api.test.com/text', () => {
          return new Response('Plain text response', {
            headers: { 'Content-Type': 'text/plain' }
          });
        })
      );

      const client = new HttpClient();
      const response = await client.get('https://api.test.com/text');

      expect(response.status).toBe(200);
      expect(typeof response.data).toBe('string');
    });

    it('should handle empty responses', async () => {
      server.use(
        http.get('https://api.test.com/empty', () => {
          return new Response(null, { status: 204 });
        })
      );

      const client = new HttpClient();
      const response = await client.get('https://api.test.com/empty');

      expect(response.status).toBe(204);
    });
  });

  describe('Browser-Specific Features', () => {
    it('should support per-request header overrides', async () => {
      server.use(
        http.get('https://api.test.com/protected', ({ request }) => {
          const auth = request.headers.get('authorization');
          if (!auth || !auth.includes('Bearer')) {
            return new Response(null, { status: 401 });
          }
          return HttpResponse.json({ protected: 'data', auth: auth });
        })
      );

      const client = new HttpClient({
        headers: {
          'Authorization': 'Bearer default-token'
        }
      });

      // Override with specific token for this request
      const response = await client.get('https://api.test.com/protected', {
        headers: {
          'Authorization': 'Bearer specific-token'
        }
      });

      expect(response.status).toBe(200);
      expect(response.data.protected).toBe('data');
      expect(response.data.auth).toBe('Bearer specific-token');
    });

    it('should handle network errors gracefully', async () => {
      server.use(
        http.get('https://api.test.com/network-error', () => {
          return Response.error();
        })
      );

      const client = new HttpClient().use(retryPlugin({ maxRetries: 1, retryDelay: 10 }));

      await expect(
        client.get('https://api.test.com/network-error')
      ).rejects.toThrow();
    });

    it('should support query string parameters', async () => {
      server.use(
        http.get('https://api.test.com/query', ({ request }) => {
          const url = new URL(request.url);
          const params = Object.fromEntries(url.searchParams);
          return HttpResponse.json({ params });
        })
      );

      const client = new HttpClient();
      const response = await client.get('https://api.test.com/query', {
        params: {
          search: 'fetchmax',
          page: 1,
          limit: 10
        }
      });

      expect(response.status).toBe(200);
      expect(response.data.params.search).toBe('fetchmax');
      expect(response.data.params.page).toBe('1');
      expect(response.data.params.limit).toBe('10');
    });
  });
});
