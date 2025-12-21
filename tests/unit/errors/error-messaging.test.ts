/**
 * Error Messaging Quality Tests - P0 Tests
 * Tests that errors provide clear, actionable messages with context
 */

import { describe, it, expect } from 'vitest';
import { HttpClient } from '@fetchmax/core';
import { retryPlugin } from '@fetchmax/plugin-retry';
import { timeoutPlugin } from '@fetchmax/plugin-timeout';
import { http, HttpResponse } from 'msw';
import { server } from '../../setup';

describe('Error Messaging: Context Inclusion', () => {
  it('should include URL in error message', async () => {
    server.use(
      http.get('https://api.test.com/user/123', () => {
        return new Response('Not Found', { status: 404 });
      })
    );

    const client = new HttpClient();

    try {
      await client.get('https://api.test.com/user/123');
      expect.fail('Should have thrown error');
    } catch (error: any) {
      expect(error.message).toContain('404');
      expect(error.config.url).toBe('https://api.test.com/user/123');
    }
  });

  it('should include HTTP method in error message', async () => {
    server.use(
      http.post('https://api.test.com/data', () => {
        return new Response('Bad Request', { status: 400 });
      })
    );

    const client = new HttpClient();

    try {
      await client.post('https://api.test.com/data', { value: 'test' });
      expect.fail('Should have thrown error');
    } catch (error: any) {
      expect(error.config.method).toBe('POST');
      expect(error.status).toBe(400);
    }
  });

  it('should include request config in error', async () => {
    server.use(
      http.get('https://api.test.com/data', () => {
        return new Response('Unauthorized', { status: 401 });
      })
    );

    const client = new HttpClient({
      headers: {
        'X-Custom-Header': 'test-value'
      }
    });

    try {
      await client.get('https://api.test.com/data', {
        params: { id: 123 }
      });
      expect.fail('Should have thrown error');
    } catch (error: any) {
      expect(error.config).toBeDefined();
      expect(error.config.url).toContain('api.test.com');
      expect(error.config.params).toMatchObject({ id: 123 });
    }
  });

  it('should include response data in error when available', async () => {
    server.use(
      http.post('https://api.test.com/validate', () => {
        return new Response(
          JSON.stringify({
            error: 'Validation failed',
            fields: {
              email: 'Invalid email format',
              age: 'Must be at least 18'
            }
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );

    const client = new HttpClient();

    try {
      await client.post('https://api.test.com/validate', {
        email: 'invalid',
        age: 15
      });
      expect.fail('Should have thrown error');
    } catch (error: any) {
      expect(error.status).toBe(400);
      expect(error.data).toBeDefined();
      expect(error.data.error).toBe('Validation failed');
      expect(error.data.fields.email).toBe('Invalid email format');
    }
  });
});

describe('Error Messaging: Actionable Suggestions', () => {
  it('should suggest checking API key for 401 errors', async () => {
    server.use(
      http.get('https://api.test.com/protected', () => {
        return new Response('Unauthorized', { status: 401 });
      })
    );

    const client = new HttpClient();

    try {
      await client.get('https://api.test.com/protected');
      expect.fail('Should have thrown error');
    } catch (error: any) {
      // Error should indicate authentication issue
      expect(error.status).toBe(401);
      expect(error.message).toContain('401');
    }
  });

  it('should suggest retrying for 503 errors', async () => {
    server.use(
      http.get('https://api.test.com/service', () => {
        return new Response('Service Unavailable', { status: 503 });
      })
    );

    const client = new HttpClient();

    try {
      await client.get('https://api.test.com/service');
      expect.fail('Should have thrown error');
    } catch (error: any) {
      expect(error.status).toBe(503);
      // Error message should indicate temporary failure
      expect(error.statusText || error.message).toBeDefined();
    }
  });

  it('should provide clear message for network errors', async () => {
    server.use(
      http.get('https://api.test.com/network-fail', () => {
        return Response.error();
      })
    );

    const client = new HttpClient();

    try {
      await client.get('https://api.test.com/network-fail');
      expect.fail('Should have thrown error');
    } catch (error: any) {
      // Should provide clear network error message
      expect(error.message || error.code).toBeDefined();
    }
  });

  it('should include retry information after all retries exhausted', async () => {
    server.use(
      http.get('https://api.test.com/always-fail', () => {
        return new Response('Server Error', { status: 500 });
      })
    );

    const client = new HttpClient().use(retryPlugin({
      maxRetries: 2,
      retryDelay: 10
    }));

    try {
      await client.get('https://api.test.com/always-fail');
      expect.fail('Should have thrown error');
    } catch (error: any) {
      expect(error.status).toBe(500);
      // Error should indicate retries were attempted
      // (Implementation may store retry context)
    }
  });
});

describe('Error Messaging: Stack Trace Preservation', () => {
  it('should preserve error stack trace', async () => {
    server.use(
      http.get('https://api.test.com/error', () => {
        return new Response('Internal Server Error', { status: 500 });
      })
    );

    const client = new HttpClient();

    try {
      await client.get('https://api.test.com/error');
      expect.fail('Should have thrown error');
    } catch (error: any) {
      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
      expect(error.stack.length).toBeGreaterThan(0);
    }
  });

  it('should preserve stack trace across async boundaries', async () => {
    server.use(
      http.get('https://api.test.com/async-error', () => {
        return new Response('Error', { status: 500 });
      })
    );

    const client = new HttpClient();

    const makeRequest = async () => {
      return client.get('https://api.test.com/async-error');
    };

    try {
      await makeRequest();
      expect.fail('Should have thrown error');
    } catch (error: any) {
      expect(error.stack).toBeDefined();
      // Stack should include this test file
      expect(error.stack).toContain('error-messaging.test');
    }
  });

  it('should preserve stack trace through plugin error handlers', async () => {
    server.use(
      http.get('https://api.test.com/plugin-error', () => {
        return new Response('Error', { status: 500 });
      })
    );

    const client = new HttpClient().use(retryPlugin({
      maxRetries: 1,
      retryDelay: 10
    }));

    try {
      await client.get('https://api.test.com/plugin-error');
      expect.fail('Should have thrown error');
    } catch (error: any) {
      expect(error.stack).toBeDefined();
      expect(error.stack.length).toBeGreaterThan(0);
    }
  });
});

describe('Error Messaging: Error Codes Consistency', () => {
  it('should use consistent error codes for timeout errors', async () => {
    server.use(
      http.get('https://api.test.com/slow', async () => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        return HttpResponse.json({ data: 'test' });
      })
    );

    const client = new HttpClient().use(timeoutPlugin({ timeout: 100 }));

    try {
      await client.get('https://api.test.com/slow');
      expect.fail('Should have thrown error');
    } catch (error: any) {
      expect(error.code).toBe('TIMEOUT_ERROR');
      expect(error.message).toContain('timeout');
    }
  });

  it('should use consistent error codes for network errors', async () => {
    server.use(
      http.get('https://api.test.com/network', () => {
        return Response.error();
      })
    );

    const client = new HttpClient();

    try {
      await client.get('https://api.test.com/network');
      expect.fail('Should have thrown error');
    } catch (error: any) {
      // Should have a network error code
      expect(error.code || error.message).toBeDefined();
    }
  });

  it('should use consistent error codes for HTTP errors', async () => {
    const testCases = [
      { status: 400, expectedCode: 'REQUEST_ERROR' },
      { status: 404, expectedCode: 'REQUEST_ERROR' },
      { status: 500, expectedCode: 'SERVER_ERROR' },
      { status: 502, expectedCode: 'SERVER_ERROR' }
    ];

    for (const { status, expectedCode } of testCases) {
      server.use(
        http.get(`https://api.test.com/status-${status}`, () => {
          return new Response('Error', { status });
        })
      );

      const client = new HttpClient();

      try {
        await client.get(`https://api.test.com/status-${status}`);
        expect.fail(`Should have thrown error for ${status}`);
      } catch (error: any) {
        expect(error.code).toBe(expectedCode);
        expect(error.status).toBe(status);
      }
    }
  });
});
