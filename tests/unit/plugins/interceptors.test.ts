import { describe, it, expect, vi } from 'vitest';
import { HttpClient } from '@fetchmax/core';
import { interceptorPlugin } from '@fetchmax/plugin-interceptors';
import { http } from 'msw';
import { server } from '../../setup';

describe('Interceptors Plugin', () => {
  describe('Request Interceptors', () => {
    it('should modify request before sending', async () => {
      server.use(
        http.get('https://api.test.com/data', ({ request }) => {
          const auth = request.headers.get('Authorization');
          return Response.json({ auth });
        })
      );

      const interceptors = interceptorPlugin();
      const client = new HttpClient().use(interceptors);

      interceptors.request.use((config) => {
        config.headers = {
          ...config.headers,
          'Authorization': 'Bearer token123'
        };
        return config;
      });

      const response = await client.get('https://api.test.com/data');
      expect(response.data.auth).toBe('Bearer token123');
    });

    it('should run multiple request interceptors in order', async () => {
      const callOrder: number[] = [];

      server.use(
        http.get('https://api.test.com/data', () => {
          return Response.json({ ok: true });
        })
      );

      const interceptors = interceptorPlugin();
      const client = new HttpClient().use(interceptors);

      interceptors.request.use((config) => {
        callOrder.push(1);
        return config;
      });

      interceptors.request.use((config) => {
        callOrder.push(2);
        return config;
      });

      interceptors.request.use((config) => {
        callOrder.push(3);
        return config;
      });

      await client.get('https://api.test.com/data');
      expect(callOrder).toEqual([1, 2, 3]);
    });

    it('should support async request interceptors', async () => {
      server.use(
        http.get('https://api.test.com/data', ({ request }) => {
          const token = request.headers.get('X-Token');
          return Response.json({ token });
        })
      );

      const interceptors = interceptorPlugin();
      const client = new HttpClient().use(interceptors);

      interceptors.request.use(async (config) => {
        // Simulate async token fetching
        await new Promise(resolve => setTimeout(resolve, 10));
        config.headers = {
          ...config.headers,
          'X-Token': 'async-token'
        };
        return config;
      });

      const response = await client.get('https://api.test.com/data');
      expect(response.data.token).toBe('async-token');
    });

    it('should allow ejecting request interceptors', async () => {
      let interceptorCalled = false;

      server.use(
        http.get('https://api.test.com/data', () => {
          return Response.json({ ok: true });
        })
      );

      const interceptors = interceptorPlugin();
      const client = new HttpClient().use(interceptors);

      const eject = interceptors.request.use((config) => {
        interceptorCalled = true;
        return config;
      });

      await client.get('https://api.test.com/data');
      expect(interceptorCalled).toBe(true);

      // Eject interceptor
      interceptorCalled = false;
      eject();

      await client.get('https://api.test.com/data');
      expect(interceptorCalled).toBe(false);
    });

    it('should clear all request interceptors', async () => {
      let count = 0;

      server.use(
        http.get('https://api.test.com/data', () => {
          return Response.json({ ok: true });
        })
      );

      const interceptors = interceptorPlugin();
      const client = new HttpClient().use(interceptors);

      interceptors.request.use((config) => { count++; return config; });
      interceptors.request.use((config) => { count++; return config; });

      await client.get('https://api.test.com/data');
      expect(count).toBe(2);

      count = 0;
      interceptors.request.clear();

      await client.get('https://api.test.com/data');
      expect(count).toBe(0);
    });
  });

  describe('Response Interceptors', () => {
    it('should transform response data', async () => {
      server.use(
        http.get('https://api.test.com/users', () => {
          return Response.json({ user_name: 'john_doe', user_id: 123 });
        })
      );

      const interceptors = interceptorPlugin();
      const client = new HttpClient().use(interceptors);

      // Transform snake_case to camelCase
      interceptors.response.use((response) => {
        if (response.data && typeof response.data === 'object') {
          const transformed: any = {};
          for (const [key, value] of Object.entries(response.data)) {
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            transformed[camelKey] = value;
          }
          response.data = transformed;
        }
        return response;
      });

      const response = await client.get('https://api.test.com/users');
      expect(response.data).toEqual({ userName: 'john_doe', userId: 123 });
    });

    it('should run multiple response interceptors in order', async () => {
      const callOrder: number[] = [];

      server.use(
        http.get('https://api.test.com/data', () => {
          return Response.json({ value: 1 });
        })
      );

      const interceptors = interceptorPlugin();
      const client = new HttpClient().use(interceptors);

      interceptors.response.use((response) => {
        callOrder.push(1);
        response.data.value *= 2;
        return response;
      });

      interceptors.response.use((response) => {
        callOrder.push(2);
        response.data.value += 10;
        return response;
      });

      const response = await client.get('https://api.test.com/data');
      expect(callOrder).toEqual([1, 2]);
      expect(response.data.value).toBe(12); // (1 * 2) + 10
    });

    it('should support async response interceptors', async () => {
      server.use(
        http.get('https://api.test.com/data', () => {
          return Response.json({ value: 'test' });
        })
      );

      const interceptors = interceptorPlugin();
      const client = new HttpClient().use(interceptors);

      interceptors.response.use(async (response) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        response.data.processed = true;
        return response;
      });

      const response = await client.get('https://api.test.com/data');
      expect(response.data.processed).toBe(true);
    });

    it('should allow ejecting response interceptors via eject function', async () => {
      server.use(
        http.get('https://api.test.com/data', () => {
          return Response.json({ value: 1 });
        })
      );

      const interceptors = interceptorPlugin();
      const client = new HttpClient().use(interceptors);

      const interceptorFn = (response: any) => {
        response.data.modified = true;
        return response;
      };

      interceptors.response.use(interceptorFn);

      let response = await client.get('https://api.test.com/data');
      expect(response.data.modified).toBe(true);

      interceptors.response.eject(interceptorFn);

      response = await client.get('https://api.test.com/data');
      expect(response.data.modified).toBeUndefined();
    });

    it('should clear all response interceptors', async () => {
      server.use(
        http.get('https://api.test.com/data', () => {
          return Response.json({ value: 1 });
        })
      );

      const interceptors = interceptorPlugin();
      const client = new HttpClient().use(interceptors);

      interceptors.response.use((response) => {
        response.data.interceptor1 = true;
        return response;
      });

      interceptors.response.use((response) => {
        response.data.interceptor2 = true;
        return response;
      });

      let response = await client.get('https://api.test.com/data');
      expect(response.data.interceptor1).toBe(true);
      expect(response.data.interceptor2).toBe(true);

      interceptors.response.clear();

      response = await client.get('https://api.test.com/data');
      expect(response.data.interceptor1).toBeUndefined();
      expect(response.data.interceptor2).toBeUndefined();
    });
  });

  describe('Error Interceptors', () => {
    it('should handle errors globally', async () => {
      const errorLog: string[] = [];

      server.use(
        http.get('https://api.test.com/error', () => {
          return new Response('Not Found', { status: 404 });
        })
      );

      const interceptors = interceptorPlugin();
      const client = new HttpClient().use(interceptors);

      interceptors.error.use((error) => {
        errorLog.push(`Error: ${error.status}`);
        throw error;
      });

      try {
        await client.get('https://api.test.com/error');
      } catch (error: any) {
        expect(error.status).toBe(404);
      }

      expect(errorLog).toContain('Error: 404');
    });

    it('should allow error recovery by returning response', async () => {
      server.use(
        http.get('https://api.test.com/error', () => {
          return new Response('Server Error', { status: 500 });
        })
      );

      const interceptors = interceptorPlugin();
      const client = new HttpClient().use(interceptors);

      interceptors.error.use((error) => {
        // Return fallback response
        return {
          data: { fallback: true },
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          config: error.config!,
          response: error.response!
        } as any;
      });

      const response = await client.get('https://api.test.com/error');
      expect(response.data).toEqual({ fallback: true });
      expect(response.status).toBe(200);
    });

    it('should run multiple error interceptors in order', async () => {
      const callOrder: number[] = [];

      server.use(
        http.get('https://api.test.com/error', () => {
          return new Response('Error', { status: 500 });
        })
      );

      const interceptors = interceptorPlugin();
      const client = new HttpClient().use(interceptors);

      interceptors.error.use((error) => {
        callOrder.push(1);
        throw error;
      });

      interceptors.error.use((error) => {
        callOrder.push(2);
        throw error;
      });

      try {
        await client.get('https://api.test.com/error');
      } catch {
        // Expected
      }

      expect(callOrder).toEqual([1, 2]);
    });

    it('should support async error interceptors', async () => {
      server.use(
        http.get('https://api.test.com/error', () => {
          return new Response('Unauthorized', { status: 401 });
        })
      );

      const interceptors = interceptorPlugin();
      const client = new HttpClient().use(interceptors);

      let retried = false;

      interceptors.error.use(async (error) => {
        if (error.status === 401 && !retried) {
          retried = true;
          // Simulate token refresh
          await new Promise(resolve => setTimeout(resolve, 10));
          // Return success response after "refresh"
          return {
            data: { success: true },
            status: 200,
            statusText: 'OK',
            headers: new Headers(),
            config: error.config!,
            response: error.response!
          } as any;
        }
        throw error;
      });

      const response = await client.get('https://api.test.com/error');
      expect(response.data.success).toBe(true);
    });

    it('should allow ejecting error interceptors', async () => {
      let interceptorCalled = false;

      server.use(
        http.get('https://api.test.com/error', () => {
          return new Response('Error', { status: 500 });
        })
      );

      const interceptors = interceptorPlugin();
      const client = new HttpClient().use(interceptors);

      const eject = interceptors.error.use((error) => {
        interceptorCalled = true;
        throw error;
      });

      try {
        await client.get('https://api.test.com/error');
      } catch {
        // Expected
      }

      expect(interceptorCalled).toBe(true);

      interceptorCalled = false;
      eject();

      try {
        await client.get('https://api.test.com/error');
      } catch {
        // Expected
      }

      expect(interceptorCalled).toBe(false);
    });

    it('should clear all error interceptors', async () => {
      let count = 0;

      server.use(
        http.get('https://api.test.com/error', () => {
          return new Response('Error', { status: 500 });
        })
      );

      const interceptors = interceptorPlugin();
      const client = new HttpClient().use(interceptors);

      interceptors.error.use((error) => {
        count++;
        throw error;
      });

      interceptors.error.use((error) => {
        count++;
        throw error;
      });

      try {
        await client.get('https://api.test.com/error');
      } catch {
        // Expected
      }

      expect(count).toBe(2);

      count = 0;
      interceptors.error.clear();

      try {
        await client.get('https://api.test.com/error');
      } catch {
        // Expected
      }

      expect(count).toBe(0);
    });
  });

  describe('Combined Interceptors', () => {
    it('should use request, response, and error interceptors together', async () => {
      const log: string[] = [];

      server.use(
        http.post('https://api.test.com/data', async ({ request }) => {
          const body = await request.json();
          return Response.json({ received: body });
        })
      );

      const interceptors = interceptorPlugin();
      const client = new HttpClient().use(interceptors);

      interceptors.request.use((config) => {
        log.push('request interceptor');
        config.headers = {
          ...config.headers,
          'X-Request-ID': '123'
        };
        return config;
      });

      interceptors.response.use((response) => {
        log.push('response interceptor');
        response.data.processed = true;
        return response;
      });

      interceptors.error.use((error) => {
        log.push('error interceptor');
        throw error;
      });

      const response = await client.post('https://api.test.com/data', { test: true });

      expect(log).toEqual(['request interceptor', 'response interceptor']);
      expect(response.data.processed).toBe(true);
    });

    it('should handle errors in interceptors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      server.use(
        http.get('https://api.test.com/data', () => {
          return Response.json({ ok: true });
        })
      );

      const interceptors = interceptorPlugin();
      const client = new HttpClient().use(interceptors);

      interceptors.request.use(() => {
        throw new Error('Interceptor error');
      });

      await expect(client.get('https://api.test.com/data')).rejects.toThrow('Interceptor error');

      consoleSpy.mockRestore();
    });
  });

  describe('Real-world Use Cases', () => {
    it('should add authentication token to all requests', async () => {
      server.use(
        http.get('https://api.test.com/protected', ({ request }) => {
          const auth = request.headers.get('Authorization');
          if (!auth || !auth.startsWith('Bearer ')) {
            return new Response('Unauthorized', { status: 401 });
          }
          return Response.json({ success: true });
        })
      );

      const interceptors = interceptorPlugin();
      const client = new HttpClient().use(interceptors);

      const token = 'initial-token';

      interceptors.request.use((config) => {
        config.headers = {
          ...config.headers,
          'Authorization': `Bearer ${token}`
        };
        return config;
      });

      const response = await client.get('https://api.test.com/protected');
      expect(response.data.success).toBe(true);
    });

    it('should implement token refresh on 401', async () => {
      let _requestCount = 0;
      let currentToken = 'expired-token';

      server.use(
        http.get('https://api.test.com/data', ({ request }) => {
          _requestCount++;
          const auth = request.headers.get('Authorization');

          if (auth === 'Bearer expired-token') {
            return new Response('Unauthorized', { status: 401 });
          }

          if (auth === 'Bearer fresh-token') {
            return Response.json({ data: 'success' });
          }

          return new Response('Bad Request', { status: 400 });
        })
      );

      const interceptors = interceptorPlugin();
      const client = new HttpClient().use(interceptors);

      interceptors.request.use((config) => {
        config.headers = {
          ...config.headers,
          'Authorization': `Bearer ${currentToken}`
        };
        return config;
      });

      interceptors.error.use(async (error) => {
        if (error.status === 401) {
          // Refresh token
          currentToken = 'fresh-token';
          // Return recovered response
          return {
            data: { data: 'success' },
            status: 200,
            statusText: 'OK',
            headers: new Headers(),
            config: error.config!,
            response: error.response!
          } as any;
        }
        throw error;
      });

      const response = await client.get('https://api.test.com/data');
      expect(response.data.data).toBe('success');
    });

    it('should log all requests and responses', async () => {
      const requestLog: string[] = [];
      const responseLog: string[] = [];

      server.use(
        http.get('https://api.test.com/users', () => {
          return Response.json({ users: [] });
        })
      );

      const interceptors = interceptorPlugin();
      const client = new HttpClient().use(interceptors);

      interceptors.request.use((config) => {
        requestLog.push(`${config.method} ${config.url}`);
        return config;
      });

      interceptors.response.use((response) => {
        responseLog.push(`${response.status} ${response.statusText}`);
        return response;
      });

      await client.get('https://api.test.com/users');

      expect(requestLog).toContain('GET https://api.test.com/users');
      expect(responseLog.length).toBeGreaterThan(0);
    });
  });
});
