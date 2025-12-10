import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpClient, createClient, HttpError, NetworkError, RequestError, ServerError } from '@fetchmax/core';
import { http } from 'msw';
import { server } from '../setup';

describe('HttpClient', () => {
  describe('constructor', () => {
    it('should create client with default config', () => {
      const client = new HttpClient();
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(HttpClient);
    });

    it('should create client with custom config', () => {
      const client = new HttpClient({
        baseURL: 'https://api.example.com',
        headers: { 'X-Custom': 'value' }
      });
      expect(client).toBeDefined();
    });

    it('should accept plugins in config', () => {
      const mockPlugin = {
        name: 'test-plugin',
        onRequest: vi.fn(config => config)
      };

      const client = new HttpClient({ plugins: [mockPlugin] });
      expect(client).toBeDefined();
    });
  });

  describe('createClient factory', () => {
    it('should create a new client instance', () => {
      const client = createClient();
      expect(client).toBeInstanceOf(HttpClient);
    });

    it('should create client with config', () => {
      const client = createClient({ baseURL: 'https://test.com' });
      expect(client).toBeDefined();
    });
  });

  describe('create method', () => {
    it('should create a new client instance with merged config', () => {
      const parent = new HttpClient({
        baseURL: 'https://api.example.com',
        headers: { 'X-Parent': 'value' }
      });

      const child = parent.create({
        headers: { 'X-Child': 'value' }
      });

      expect(child).toBeInstanceOf(HttpClient);
      expect(child).not.toBe(parent);
    });

    it('should copy plugins to new instance', () => {
      const plugin = {
        name: 'test',
        onRequest: vi.fn(config => config)
      };

      const parent = new HttpClient().use(plugin);
      const child = parent.create();

      expect(child).toBeDefined();
    });
  });

  describe('use method (plugin system)', () => {
    it('should add a plugin', () => {
      const plugin = {
        name: 'test',
        onRequest: vi.fn(config => config)
      };

      const client = new HttpClient();
      const result = client.use(plugin);

      expect(result).toBe(client); // Should return self for chaining
    });

    it('should warn on duplicate plugin names', () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const plugin1 = { name: 'test', onRequest: vi.fn(c => c) };
      const plugin2 = { name: 'test', onRequest: vi.fn(c => c) };

      const client = new HttpClient();
      client.use(plugin1);
      client.use(plugin2);

      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('already registered')
      );

      consoleWarn.mockRestore();
    });

    it('should allow plugin chaining', () => {
      const plugin1 = { name: 'plugin1', onRequest: vi.fn(c => c) };
      const plugin2 = { name: 'plugin2', onRequest: vi.fn(c => c) };

      const client = new HttpClient();
      const result = client.use(plugin1).use(plugin2);

      expect(result).toBe(client);
    });
  });

  describe('GET requests', () => {
    it('should make a successful GET request', async () => {
      server.use(
        http.get('https://api.test.com/users', () => {
          return Response.json({ users: ['Alice', 'Bob'] });
        })
      );

      const client = new HttpClient();
      const response = await client.get('https://api.test.com/users');

      expect(response.status).toBe(200);
      expect(response.data).toEqual({ users: ['Alice', 'Bob'] });
      expect(response.headers).toBeDefined();
      expect(response.config).toBeDefined();
    });

    it('should use baseURL for relative URLs', async () => {
      server.use(
        http.get('https://api.test.com/users', () => {
          return Response.json({ users: [] });
        })
      );

      const client = new HttpClient({ baseURL: 'https://api.test.com' });
      const response = await client.get('/users');

      expect(response.status).toBe(200);
      expect(response.data).toEqual({ users: [] });
    });

    it('should send query parameters', async () => {
      server.use(
        http.get('https://api.test.com/users', ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get('page')).toBe('1');
          expect(url.searchParams.get('limit')).toBe('10');
          return Response.json({ users: [] });
        })
      );

      const client = new HttpClient();
      await client.get('https://api.test.com/users', {
        params: { page: 1, limit: 10 }
      });
    });

    it('should send custom headers', async () => {
      server.use(
        http.get('https://api.test.com/users', ({ request }) => {
          expect(request.headers.get('X-Custom-Header')).toBe('test-value');
          return Response.json({ users: [] });
        })
      );

      const client = new HttpClient();
      await client.get('https://api.test.com/users', {
        headers: { 'X-Custom-Header': 'test-value' }
      });
    });
  });

  describe('POST requests', () => {
    it('should make a successful POST request with JSON body', async () => {
      server.use(
        http.post('https://api.test.com/users', async ({ request }) => {
          const body = await request.json();
          expect(body).toEqual({ name: 'Alice', age: 30 });
          return Response.json({ id: 1, ...body }, { status: 201 });
        })
      );

      const client = new HttpClient();
      const response = await client.post('https://api.test.com/users', {
        name: 'Alice',
        age: 30
      });

      expect(response.status).toBe(201);
      expect(response.data).toMatchObject({ name: 'Alice', age: 30 });
    });

    it('should automatically set Content-Type for JSON', async () => {
      server.use(
        http.post('https://api.test.com/users', ({ request }) => {
          expect(request.headers.get('Content-Type')).toBe('application/json');
          return Response.json({ success: true });
        })
      );

      const client = new HttpClient();
      await client.post('https://api.test.com/users', { name: 'Alice' });
    });
  });

  describe('PUT requests', () => {
    it('should make a successful PUT request', async () => {
      server.use(
        http.put('https://api.test.com/users/1', async ({ request }) => {
          const body = await request.json();
          return Response.json({ id: 1, ...body });
        })
      );

      const client = new HttpClient();
      const response = await client.put('https://api.test.com/users/1', {
        name: 'Alice Updated'
      });

      expect(response.status).toBe(200);
      expect(response.data.name).toBe('Alice Updated');
    });
  });

  describe('DELETE requests', () => {
    it('should make a successful DELETE request', async () => {
      server.use(
        http.delete('https://api.test.com/users/1', () => {
          return new Response(null, { status: 204 });
        })
      );

      const client = new HttpClient();
      const response = await client.delete('https://api.test.com/users/1');

      expect(response.status).toBe(204);
    });
  });

  describe('PATCH requests', () => {
    it('should make a successful PATCH request', async () => {
      server.use(
        http.patch('https://api.test.com/users/1', async ({ request }) => {
          const body = await request.json();
          return Response.json({ id: 1, email: body.email });
        })
      );

      const client = new HttpClient();
      const response = await client.patch('https://api.test.com/users/1', {
        email: 'alice@example.com'
      });

      expect(response.status).toBe(200);
      expect(response.data.email).toBe('alice@example.com');
    });
  });

  describe('HEAD requests', () => {
    it('should make a successful HEAD request', async () => {
      server.use(
        http.head('https://api.test.com/users', () => {
          return new Response(null, {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        })
      );

      const client = new HttpClient();
      const response = await client.head('https://api.test.com/users');

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('OPTIONS requests', () => {
    it('should make a successful OPTIONS request', async () => {
      server.use(
        http.options('https://api.test.com/users', () => {
          return new Response(null, {
            status: 200,
            headers: { Allow: 'GET, POST, PUT, DELETE' }
          });
        })
      );

      const client = new HttpClient();
      const response = await client.options('https://api.test.com/users');

      expect(response.status).toBe(200);
      expect(response.headers.get('Allow')).toBe('GET, POST, PUT, DELETE');
    });
  });

  describe('error handling', () => {
    it('should throw RequestError for 4xx errors', async () => {
      server.use(
        http.get('https://api.test.com/not-found', () => {
          return Response.json(
            { error: 'Not found' },
            { status: 404, statusText: 'Not Found' }
          );
        })
      );

      const client = new HttpClient();

      await expect(client.get('https://api.test.com/not-found')).rejects.toThrow(
        RequestError
      );

      try {
        await client.get('https://api.test.com/not-found');
      } catch (error: any) {
        expect(error.status).toBe(404);
        expect(error.statusText).toBe('Not Found');
        expect(error.data).toEqual({ error: 'Not found' });
        expect(error.config).toBeDefined();
      }
    });

    it('should throw ServerError for 5xx errors', async () => {
      server.use(
        http.get('https://api.test.com/error', () => {
          return Response.json(
            { error: 'Internal server error' },
            { status: 500, statusText: 'Internal Server Error' }
          );
        })
      );

      const client = new HttpClient();

      await expect(client.get('https://api.test.com/error')).rejects.toThrow(
        ServerError
      );

      try {
        await client.get('https://api.test.com/error');
      } catch (error: any) {
        expect(error.status).toBe(500);
        expect(error.data).toEqual({ error: 'Internal server error' });
      }
    });

    it('should throw NetworkError for network failures', async () => {
      server.use(
        http.get('https://api.test.com/network-error', () => {
          return Response.error();
        })
      );

      const client = new HttpClient();

      await expect(client.get('https://api.test.com/network-error')).rejects.toThrow();
    });
  });

  describe('plugin hooks', () => {
    it('should call onRequest hook', async () => {
      const onRequest = vi.fn(config => {
        config.headers = { ...config.headers, 'X-Modified': 'true' };
        return config;
      });

      server.use(
        http.get('https://api.test.com/test', ({ request }) => {
          expect(request.headers.get('X-Modified')).toBe('true');
          return Response.json({ success: true });
        })
      );

      const plugin = { name: 'test', onRequest };
      const client = new HttpClient().use(plugin);

      await client.get('https://api.test.com/test');

      expect(onRequest).toHaveBeenCalled();
    });

    it('should call onResponse hook', async () => {
      const onResponse = vi.fn(response => {
        response.data = { ...response.data, modified: true };
        return response;
      });

      server.use(
        http.get('https://api.test.com/test', () => {
          return Response.json({ original: true });
        })
      );

      const plugin = { name: 'test', onResponse };
      const client = new HttpClient().use(plugin);

      const response = await client.get('https://api.test.com/test');

      expect(onResponse).toHaveBeenCalled();
      expect(response.data).toEqual({ original: true, modified: true });
    });

    it('should call onError hook', async () => {
      const onError = vi.fn((error, request, context) => {
        throw error;
      });

      server.use(
        http.get('https://api.test.com/error', () => {
          return new Response(null, { status: 500 });
        })
      );

      const plugin = { name: 'test', onError };
      const client = new HttpClient().use(plugin);

      await expect(client.get('https://api.test.com/error')).rejects.toThrow();
      expect(onError).toHaveBeenCalled();
    });

    it('should call multiple plugins in order', async () => {
      const calls: string[] = [];

      const plugin1 = {
        name: 'plugin1',
        onRequest: (config: any) => {
          calls.push('plugin1-request');
          return config;
        },
        onResponse: (response: any) => {
          calls.push('plugin1-response');
          return response;
        }
      };

      const plugin2 = {
        name: 'plugin2',
        onRequest: (config: any) => {
          calls.push('plugin2-request');
          return config;
        },
        onResponse: (response: any) => {
          calls.push('plugin2-response');
          return response;
        }
      };

      server.use(
        http.get('https://api.test.com/test', () => {
          return Response.json({ success: true });
        })
      );

      const client = new HttpClient().use(plugin1).use(plugin2);
      await client.get('https://api.test.com/test');

      expect(calls).toEqual([
        'plugin1-request',
        'plugin2-request',
        'plugin1-response',
        'plugin2-response'
      ]);
    });
  });

  describe('AbortController support', () => {
    it('should support request cancellation', async () => {
      server.use(
        http.get('https://api.test.com/slow', async () => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return Response.json({ success: true });
        })
      );

      const controller = new AbortController();
      const client = new HttpClient();

      const promise = client.get('https://api.test.com/slow', {
        signal: controller.signal
      });

      setTimeout(() => controller.abort(), 10);

      await expect(promise).rejects.toThrow();
    });
  });

  describe('response types', () => {
    it('should parse JSON response with responseType=json', async () => {
      server.use(
        http.get('https://api.test.com/json', () => {
          return Response.json({ data: 'test' });
        })
      );

      const client = new HttpClient();
      const response = await client.get('https://api.test.com/json', {
        responseType: 'json'
      });

      expect(response.data).toEqual({ data: 'test' });
    });

    it('should parse text response with responseType=text', async () => {
      server.use(
        http.get('https://api.test.com/text', () => {
          return new Response('plain text content');
        })
      );

      const client = new HttpClient();
      const response = await client.get('https://api.test.com/text', {
        responseType: 'text'
      });

      expect(response.data).toBe('plain text content');
    });

    it('should handle blob response with responseType=blob', async () => {
      server.use(
        http.get('https://api.test.com/blob', () => {
          return new Response(new Blob(['blob content']));
        })
      );

      const client = new HttpClient();
      const response = await client.get('https://api.test.com/blob', {
        responseType: 'blob'
      });

      expect(response.data).toBeInstanceOf(Blob);
    });

    it('should handle arrayBuffer response with responseType=arrayBuffer', async () => {
      server.use(
        http.get('https://api.test.com/buffer', () => {
          return new Response(new ArrayBuffer(8));
        })
      );

      const client = new HttpClient();
      const response = await client.get('https://api.test.com/buffer', {
        responseType: 'arrayBuffer'
      });

      expect(response.data).toBeInstanceOf(ArrayBuffer);
    });

    it('should handle empty responses', async () => {
      server.use(
        http.delete('https://api.test.com/resource', () => {
          return new Response(null, { status: 204 });
        })
      );

      const client = new HttpClient();
      const response = await client.delete('https://api.test.com/resource');

      expect(response.status).toBe(204);
      expect(response.data).toBeNull();
    });
  });

  describe('request body types', () => {
    it('should send FormData body', async () => {
      server.use(
        http.post('https://api.test.com/upload', async () => {
          return Response.json({ success: true });
        })
      );

      const client = new HttpClient();
      const formData = new FormData();
      formData.append('field', 'value');

      const response = await client.post('https://api.test.com/upload', formData);
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ success: true });
    });

    it('should send URLSearchParams body', async () => {
      server.use(
        http.post('https://api.test.com/form', async () => {
          return Response.json({ success: true });
        })
      );

      const client = new HttpClient();
      const params = new URLSearchParams();
      params.append('key', 'value');

      const response = await client.post('https://api.test.com/form', params);
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ success: true });
    });

    it('should send plain text body', async () => {
      server.use(
        http.post('https://api.test.com/text', async () => {
          return Response.json({ success: true });
        })
      );

      const client = new HttpClient();
      const response = await client.post('https://api.test.com/text', 'plain text');
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ success: true });
    });
  });

  describe('config merging', () => {
    it('should merge headers from baseConfig and request', async () => {
      server.use(
        http.get('https://api.test.com/test', ({ request }) => {
          expect(request.headers.get('X-Base')).toBe('base');
          expect(request.headers.get('X-Request')).toBe('request');
          return Response.json({ success: true });
        })
      );

      const client = new HttpClient({
        headers: { 'X-Base': 'base' }
      });

      await client.get('https://api.test.com/test', {
        headers: { 'X-Request': 'request' }
      });
    });

    it('should override base headers with request headers', async () => {
      server.use(
        http.get('https://api.test.com/test', ({ request }) => {
          expect(request.headers.get('X-Custom')).toBe('request');
          return Response.json({ success: true });
        })
      );

      const client = new HttpClient({
        headers: { 'X-Custom': 'base' }
      });

      await client.get('https://api.test.com/test', {
        headers: { 'X-Custom': 'request' }
      });
    });

    it('should use baseURL from config for relative URLs', async () => {
      server.use(
        http.get('https://api.test.com/users', () => {
          return Response.json({ users: [] });
        })
      );

      const client = new HttpClient({ baseURL: 'https://api.test.com' });
      const response = await client.get('/users');

      expect(response.status).toBe(200);
    });

    it('should ignore baseURL for absolute URLs', async () => {
      server.use(
        http.get('https://other.test.com/users', () => {
          return Response.json({ users: [] });
        })
      );

      const client = new HttpClient({ baseURL: 'https://api.test.com' });

      // Note: This test verifies that absolute URLs ignore baseURL
      // The URL should be used as-is without baseURL prepending
      const response = await client.get('https://other.test.com/users');

      expect(response.status).toBe(200);
      expect(response.data).toEqual({ users: [] });
    });
  });

  describe('edge cases', () => {
    it('should handle request without URL', async () => {
      const client = new HttpClient({ baseURL: 'https://api.test.com' });

      server.use(
        http.get('https://api.test.com/', () => {
          return Response.json({ success: true });
        })
      );

      const response = await client.get('');
      expect(response.status).toBe(200);
    });

    it('should handle empty query parameters', async () => {
      server.use(
        http.get('https://api.test.com/test', () => {
          return Response.json({ success: true });
        })
      );

      const client = new HttpClient();
      const response = await client.get('https://api.test.com/test', {
        params: {}
      });

      expect(response.status).toBe(200);
    });

    it('should handle null query parameter values', async () => {
      server.use(
        http.get('https://api.test.com/test', ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.has('null_value')).toBe(false);
          expect(url.searchParams.get('valid')).toBe('value');
          return Response.json({ success: true });
        })
      );

      const client = new HttpClient();
      await client.get('https://api.test.com/test', {
        params: { valid: 'value', null_value: null }
      });
    });

    it('should handle undefined query parameter values', async () => {
      server.use(
        http.get('https://api.test.com/test', ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.has('undefined_value')).toBe(false);
          expect(url.searchParams.get('valid')).toBe('value');
          return Response.json({ success: true });
        })
      );

      const client = new HttpClient();
      await client.get('https://api.test.com/test', {
        params: { valid: 'value', undefined_value: undefined }
      });
    });

    it('should preserve existing query parameters in URL', async () => {
      server.use(
        http.get('https://api.test.com/test', ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get('existing')).toBe('value');
          expect(url.searchParams.get('new')).toBe('param');
          return Response.json({ success: true });
        })
      );

      const client = new HttpClient();
      await client.get('https://api.test.com/test?existing=value', {
        params: { new: 'param' }
      });
    });
  });

  describe('plugin context', () => {
    it('should share context between plugin hooks', async () => {
      let contextChecked = false;

      const plugin = {
        name: 'context-test',
        onRequest: (config: any, context: any) => {
          context.requestTime = Date.now();
          return config;
        },
        onResponse: (response: any, config: any, context: any) => {
          // Verify context was shared from onRequest
          contextChecked = true;
          expect(context.requestTime).toBeDefined();
          expect(typeof context.requestTime).toBe('number');
          return response;
        }
      };

      server.use(
        http.get('https://api.test.com/test', () => {
          return Response.json({ success: true });
        })
      );

      const client = new HttpClient().use(plugin);
      await client.get('https://api.test.com/test');

      expect(contextChecked).toBe(true);
    });

    it('should isolate context between requests', async () => {
      const contexts: any[] = [];

      const plugin = {
        name: 'isolation-test',
        onRequest: (config: any, context: any) => {
          context.id = Math.random();
          return config;
        },
        onResponse: (response: any, config: any, context: any) => {
          contexts.push({ ...context });
          return response;
        }
      };

      server.use(
        http.get('https://api.test.com/test', () => {
          return Response.json({ success: true });
        })
      );

      const client = new HttpClient().use(plugin);
      await client.get('https://api.test.com/test');
      await client.get('https://api.test.com/test');

      expect(contexts).toHaveLength(2);
      expect(contexts[0].id).not.toBe(contexts[1].id);
    });
  });
});
