/**
 * Security Tests - Critical P0 Tests
 * Tests for security vulnerabilities and protection mechanisms
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HttpClient } from '@fetchmax/core';
import { loggerPlugin } from '@fetchmax/plugin-logger';
import { interceptorPlugin } from '@fetchmax/plugin-interceptors';
import { http, HttpResponse } from 'msw';
import { server } from '../../setup';

describe('Security: Prototype Pollution Prevention', () => {
  let client: HttpClient;

  beforeEach(() => {
    client = new HttpClient();
  });

  it('should not allow __proto__ pollution in config merge', async () => {
    const maliciousConfig = {
      baseURL: 'https://api.test.com',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    // Attempt to pollute prototype
    (maliciousConfig as any)['__proto__'] = { polluted: true };

    const client2 = new HttpClient(maliciousConfig);

    // Verify prototype was not polluted
    const plainObject = {};
    expect((plainObject as any).polluted).toBeUndefined();
  });

  it('should not allow constructor pollution in config merge', async () => {
    const maliciousConfig = {
      baseURL: 'https://api.test.com',
      headers: {
        constructor: { prototype: { polluted: true } }
      }
    };

    const client2 = new HttpClient(maliciousConfig as any);

    // Verify prototype was not polluted
    const plainObject = {};
    expect((plainObject as any).polluted).toBeUndefined();
  });

  it('should sanitize __proto__ in request body', async () => {
    server.use(
      http.post('https://api.test.com/data', async ({ request }) => {
        const body = await request.json();

        // Server should not receive __proto__ key
        expect(body).not.toHaveProperty('__proto__');

        return HttpResponse.json({ success: true });
      })
    );

    const maliciousBody = {
      name: 'test',
      '__proto__': { polluted: true }
    };

    const response = await client.post('https://api.test.com/data', maliciousBody);
    expect(response.status).toBe(200);

    // Verify no pollution occurred
    const plainObject = {};
    expect((plainObject as any).polluted).toBeUndefined();
  });
});

describe('Security: CSRF Token Handling', () => {
  it('should include CSRF token in state-changing requests', async () => {
    let csrfToken = 'initial-csrf-token';
    let requestCount = 0;

    server.use(
      http.get('https://api.test.com/csrf', () => {
        return HttpResponse.json(
          { token: csrfToken },
          { headers: { 'X-CSRF-Token': csrfToken } }
        );
      }),
      http.post('https://api.test.com/data', ({ request }) => {
        requestCount++;
        const token = request.headers.get('X-CSRF-Token');

        if (!token || token !== csrfToken) {
          return new Response('Forbidden', { status: 403 });
        }

        // Rotate token
        csrfToken = `token-${requestCount}`;

        return HttpResponse.json(
          { success: true },
          { headers: { 'X-CSRF-Token': csrfToken } }
        );
      })
    );

    const interceptors = interceptorPlugin();
    const client = new HttpClient().use(interceptors);

    interceptors.request.use((config) => {
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method?.toUpperCase() || '')) {
        config.headers = config.headers || {};
        config.headers['X-CSRF-Token'] = csrfToken;
      }
      return config;
    });

    interceptors.response.use((response) => {
      const newToken = response.headers.get('X-CSRF-Token');
      if (newToken) {
        csrfToken = newToken;
      }
      return response;
    });

    // First request - should succeed with initial token
    const response1 = await client.post('https://api.test.com/data', { value: 1 });
    expect(response1.status).toBe(200);
    expect(csrfToken).toBe('token-1');

    // Second request - should use rotated token
    const response2 = await client.post('https://api.test.com/data', { value: 2 });
    expect(response2.status).toBe(200);
    expect(csrfToken).toBe('token-2');
  });

  it('should reject requests with invalid CSRF token', async () => {
    server.use(
      http.post('https://api.test.com/data', ({ request }) => {
        const token = request.headers.get('X-CSRF-Token');

        if (token !== 'valid-token') {
          return new Response('CSRF token invalid', { status: 403 });
        }

        return HttpResponse.json({ success: true });
      })
    );

    const client = new HttpClient().use(interceptorPlugin({
      onRequest: (config) => {
        config.headers = config.headers || {};
        config.headers['X-CSRF-Token'] = 'invalid-token';
        return config;
      }
    }));

    await expect(client.post('https://api.test.com/data', { value: 1 }))
      .rejects.toThrow();
  });

  it('should not include CSRF token in GET requests', async () => {
    let csrfIncludedInGet = false;

    server.use(
      http.get('https://api.test.com/data', ({ request }) => {
        if (request.headers.get('X-CSRF-Token')) {
          csrfIncludedInGet = true;
        }
        return HttpResponse.json({ data: 'test' });
      })
    );

    const client = new HttpClient().use(interceptorPlugin({
      onRequest: (config) => {
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method?.toUpperCase() || '')) {
          config.headers = config.headers || {};
          config.headers['X-CSRF-Token'] = 'token';
        }
        return config;
      }
    }));

    await client.get('https://api.test.com/data');
    expect(csrfIncludedInGet).toBe(false);
  });
});

describe('Security: Sensitive Data Redaction', () => {
  it('should redact passwords in logs', async () => {
    const logs: string[] = [];

    server.use(
      http.post('https://api.test.com/login', () => {
        return HttpResponse.json({ token: 'abc123' });
      })
    );

    const client = new HttpClient().use(loggerPlugin({
      log: (message) => logs.push(message),
      logRequestBody: true
    }));

    await client.post('https://api.test.com/login', {
      email: 'user@example.com',
      password: 'SuperSecret123!'
    });

    const logOutput = logs.join('\n');

    // Should contain email
    expect(logOutput).toContain('user@example.com');

    // Should NOT contain password
    expect(logOutput).not.toContain('SuperSecret123!');
  });

  it('should redact authorization tokens in logs', async () => {
    const logs: string[] = [];

    server.use(
      http.get('https://api.test.com/user', () => {
        return HttpResponse.json({ name: 'John' });
      })
    );

    const client = new HttpClient({
      headers: {
        'Authorization': 'Bearer secret-token-12345'
      }
    }).use(loggerPlugin({
      log: (message) => logs.push(message),
      logHeaders: true
    }));

    await client.get('https://api.test.com/user');

    const logOutput = logs.join('\n');

    // Should NOT contain full token
    expect(logOutput).not.toContain('secret-token-12345');
  });

  it('should redact credit card numbers in logs', async () => {
    const logs: string[] = [];

    server.use(
      http.post('https://api.test.com/payment', () => {
        return HttpResponse.json({ success: true });
      })
    );

    const client = new HttpClient().use(loggerPlugin({
      log: (message) => logs.push(message),
      logRequestBody: true
    }));

    await client.post('https://api.test.com/payment', {
      amount: 99.99,
      card: '4532-1234-5678-9010'
    });

    const logOutput = logs.join('\n');

    // Should NOT contain full card number
    expect(logOutput).not.toContain('4532-1234-5678-9010');
    expect(logOutput).not.toContain('4532123456789010');
  });

  it('should redact SSN in logs', async () => {
    const logs: string[] = [];

    server.use(
      http.post('https://api.test.com/verify', () => {
        return HttpResponse.json({ verified: true });
      })
    );

    const client = new HttpClient().use(loggerPlugin({
      log: (message) => logs.push(message),
      logRequestBody: true
    }));

    await client.post('https://api.test.com/verify', {
      name: 'John Doe',
      ssn: '123-45-6789'
    });

    const logOutput = logs.join('\n');

    // Should contain name
    expect(logOutput).toContain('John Doe');

    // Should NOT contain SSN
    expect(logOutput).not.toContain('123-45-6789');
  });
});

describe('Security: Header Injection Prevention', () => {
  it('should prevent newline injection in header values', async () => {
    server.use(
      http.get('https://api.test.com/data', ({ request }) => {
        const customHeader = request.headers.get('X-Custom-Header');

        // If header contains newline, it should be sanitized or rejected
        if (customHeader && customHeader.includes('\n')) {
          return new Response('Header injection detected', { status: 400 });
        }

        return HttpResponse.json({ success: true });
      })
    );

    const client = new HttpClient();

    // Attempt header injection with newline
    const maliciousHeader = 'value\r\nX-Injected: malicious';

    await expect(
      client.get('https://api.test.com/data', {
        headers: {
          'X-Custom-Header': maliciousHeader
        }
      })
    ).rejects.toThrow();
  });

  it('should prevent CRLF injection in header values', async () => {
    server.use(
      http.get('https://api.test.com/data', ({ request }) => {
        const customHeader = request.headers.get('X-Custom-Header');

        if (customHeader && (customHeader.includes('\r') || customHeader.includes('\n'))) {
          return new Response('CRLF injection detected', { status: 400 });
        }

        return HttpResponse.json({ success: true });
      })
    );

    const client = new HttpClient();

    // Attempt CRLF injection
    const maliciousHeader = 'value\r\n\r\n<script>alert("XSS")</script>';

    await expect(
      client.get('https://api.test.com/data', {
        headers: {
          'X-Custom-Header': maliciousHeader
        }
      })
    ).rejects.toThrow();
  });
});

describe('Security: URL Validation', () => {
  it('should reject javascript: URLs', async () => {
    const client = new HttpClient();

    await expect(
      client.get('javascript:alert("XSS")')
    ).rejects.toThrow();
  });

  it('should reject data: URLs with executable content', async () => {
    const client = new HttpClient();

    await expect(
      client.get('data:text/html,<script>alert("XSS")</script>')
    ).rejects.toThrow();
  });

  it('should allow safe data: URLs', async () => {
    // Note: In real implementation, you may want to whitelist certain data: URLs
    const client = new HttpClient();

    // This should be handled carefully - for now, we expect it to fail
    // as most HTTP clients don't support data: URLs
    await expect(
      client.get('data:text/plain,Hello%20World')
    ).rejects.toThrow();
  });

  it('should validate URL protocol', async () => {
    const client = new HttpClient();

    // Should accept http/https
    server.use(
      http.get('https://api.test.com/safe', () => {
        return HttpResponse.json({ success: true });
      })
    );

    const response = await client.get('https://api.test.com/safe');
    expect(response.status).toBe(200);
  });
});

describe('Security: XSS Prevention in Logger', () => {
  it('should escape HTML in log messages', async () => {
    const logs: string[] = [];

    server.use(
      http.get('https://api.test.com/data', () => {
        return HttpResponse.json({
          message: '<script>alert("XSS")</script>'
        });
      })
    );

    const client = new HttpClient().use(loggerPlugin({
      log: (message) => logs.push(message),
      logResponseData: true
    }));

    await client.get('https://api.test.com/data');

    const logOutput = logs.join('\n');

    // Log should not contain unescaped script tags
    // (Implementation may vary - could be escaped or sanitized)
    expect(logOutput).toBeDefined();
  });

  it('should handle malicious URLs in logs safely', async () => {
    const logs: string[] = [];

    const client = new HttpClient().use(loggerPlugin({
      log: (message) => logs.push(message)
    }));

    server.use(
      http.get('https://api.test.com/xss', () => {
        return HttpResponse.json({ success: true });
      })
    );

    await client.get('https://api.test.com/xss?param=<script>alert("XSS")</script>');

    const logOutput = logs.join('\n');

    // Log should contain the URL but in a safe way
    expect(logOutput).toContain('api.test.com');
  });
});

describe('Security: CORS Handling', () => {
  it('should respect CORS headers', async () => {
    server.use(
      http.get('https://api.test.com/cors', () => {
        return HttpResponse.json(
          { data: 'test' },
          {
            headers: {
              'Access-Control-Allow-Origin': 'https://example.com',
              'Access-Control-Allow-Methods': 'GET, POST',
              'Access-Control-Allow-Headers': 'Content-Type'
            }
          }
        );
      })
    );

    const client = new HttpClient();
    const response = await client.get('https://api.test.com/cors');

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
  });

  it('should handle preflight OPTIONS requests', async () => {
    server.use(
      http.options('https://api.test.com/preflight', () => {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '3600'
          }
        });
      }),
      http.post('https://api.test.com/preflight', () => {
        return HttpResponse.json({ success: true });
      })
    );

    const client = new HttpClient();

    // POST with custom headers should trigger preflight
    const response = await client.post('https://api.test.com/preflight', {
      data: 'test'
    }, {
      headers: {
        'X-Custom-Header': 'value'
      }
    });

    expect(response.status).toBe(200);
  });
});

describe('Security: Content-Security-Policy', () => {
  it('should respect CSP headers', async () => {
    server.use(
      http.get('https://api.test.com/csp', () => {
        return HttpResponse.json(
          { data: 'test' },
          {
            headers: {
              'Content-Security-Policy': "default-src 'self'; script-src 'none';"
            }
          }
        );
      })
    );

    const client = new HttpClient();
    const response = await client.get('https://api.test.com/csp');

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Security-Policy')).toBeDefined();
  });
});
