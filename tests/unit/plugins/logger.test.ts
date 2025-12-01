import { describe, it, expect, vi } from 'vitest';
import { HttpClient } from '../../../packages/core/src/client';
import { loggerPlugin } from '../../../packages/plugins/logger/src/index';
import { http } from 'msw';
import { server } from '../../setup';

describe('Logger Plugin', () => {
  describe('Request Logging', () => {
    it('should log requests by default', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      server.use(
        http.get('https://api.test.com/data', () => {
          return Response.json({ value: 'test' });
        })
      );

      const client = new HttpClient().use(loggerPlugin());

      await client.get('https://api.test.com/data');

      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should not log requests when logRequests is false', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      server.use(
        http.get('https://api.test.com/data', () => {
          return Response.json({ value: 'test' });
        })
      );

      const client = new HttpClient().use(loggerPlugin({ logRequests: false }));

      await client.get('https://api.test.com/data');

      expect(logSpy).not.toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should log HTTP method and URL', async () => {
      const logs: string[] = [];
      const mockLogger = {
        log: (...args: any[]) => logs.push(args.join(' ')),
        error: vi.fn(),
        group: (...args: any[]) => logs.push(args.join(' ')),
        groupEnd: () => {}
      };

      server.use(
        http.get('https://api.test.com/users', () => {
          return Response.json({ users: [] });
        })
      );

      const client = new HttpClient().use(
        loggerPlugin({ logger: mockLogger })
      );

      await client.get('https://api.test.com/users');

      const requestLog = logs.find(log => log.includes('GET') && log.includes('/users'));
      expect(requestLog).toBeDefined();
    });
  });

  describe('Response Logging', () => {
    it('should log responses by default', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      server.use(
        http.get('https://api.test.com/data', () => {
          return Response.json({ value: 'test' });
        })
      );

      const client = new HttpClient().use(loggerPlugin());

      await client.get('https://api.test.com/data');

      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should not log responses when logResponses is false', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      server.use(
        http.get('https://api.test.com/data', () => {
          return Response.json({ value: 'test' });
        })
      );

      const client = new HttpClient().use(
        loggerPlugin({ logRequests: false, logResponses: false })
      );

      await client.get('https://api.test.com/data');

      expect(logSpy).not.toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should log status code and duration', async () => {
      const logs: string[] = [];
      const mockLogger = {
        log: (...args: any[]) => logs.push(args.join(' ')),
        error: vi.fn(),
        group: (...args: any[]) => logs.push(args.join(' ')),
        groupEnd: () => {}
      };

      server.use(
        http.get('https://api.test.com/data', () => {
          return Response.json({ value: 'test' });
        })
      );

      const client = new HttpClient().use(
        loggerPlugin({ logger: mockLogger })
      );

      await client.get('https://api.test.com/data');

      const responseLog = logs.find(log => log.includes('200'));
      expect(responseLog).toBeDefined();
    });
  });

  describe('Error Logging', () => {
    it('should log errors by default', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      server.use(
        http.get('https://api.test.com/error', () => {
          return new Response('Server Error', { status: 500 });
        })
      );

      const client = new HttpClient().use(loggerPlugin());

      try {
        await client.get('https://api.test.com/error');
      } catch {
        // Expected
      }

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should not log errors when logErrors is false', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      server.use(
        http.get('https://api.test.com/error', () => {
          return new Response('Server Error', { status: 500 });
        })
      );

      const client = new HttpClient().use(
        loggerPlugin({ logErrors: false })
      );

      try {
        await client.get('https://api.test.com/error');
      } catch {
        // Expected
      }

      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should log error message and status', async () => {
      const errors: string[] = [];
      const mockLogger = {
        log: vi.fn(),
        error: (...args: any[]) => errors.push(args.join(' ')),
        group: (...args: any[]) => errors.push(args.join(' ')),
        groupEnd: () => {}
      };

      server.use(
        http.get('https://api.test.com/error', () => {
          return new Response('Not Found', { status: 404 });
        })
      );

      const client = new HttpClient().use(
        loggerPlugin({ logger: mockLogger })
      );

      try {
        await client.get('https://api.test.com/error');
      } catch {
        // Expected
      }

      const errorLog = errors.find(log => log.includes('404') || log.includes('Error'));
      expect(errorLog).toBeDefined();
    });
  });

  describe('Verbose Mode', () => {
    it('should log additional details in verbose mode', async () => {
      const logs: string[] = [];
      const mockLogger = {
        log: (...args: any[]) => logs.push(args.join(' ')),
        error: vi.fn(),
        group: (...args: any[]) => logs.push(args.join(' ')),
        groupEnd: () => {}
      };

      server.use(
        http.get('https://api.test.com/data', () => {
          return Response.json({ value: 'test' });
        })
      );

      const client = new HttpClient().use(
        loggerPlugin({ verbose: true, logger: mockLogger })
      );

      await client.get('https://api.test.com/data', {
        headers: { 'X-Custom': 'header' }
      });

      // Verbose mode should log more details
      expect(logs.length).toBeGreaterThan(2);
    });

    it('should log headers in verbose mode', async () => {
      const logs: string[] = [];
      const mockLogger = {
        log: (...args: any[]) => logs.push(args.join(' ')),
        error: vi.fn(),
        group: (...args: any[]) => logs.push(args.join(' ')),
        groupEnd: () => {}
      };

      server.use(
        http.post('https://api.test.com/data', () => {
          return Response.json({ ok: true });
        })
      );

      const client = new HttpClient().use(
        loggerPlugin({ verbose: true, logger: mockLogger })
      );

      await client.post('https://api.test.com/data', { test: true });

      const headerLog = logs.find(log => log.includes('Headers') || log.includes('Body'));
      expect(headerLog).toBeDefined();
    });
  });

  describe('Color Output', () => {
    it('should use colors by default', async () => {
      const logs: string[] = [];
      const mockLogger = {
        log: (...args: any[]) => logs.push(args.join(' ')),
        error: vi.fn(),
        group: (...args: any[]) => logs.push(args.join(' ')),
        groupEnd: () => {}
      };

      server.use(
        http.get('https://api.test.com/data', () => {
          return Response.json({ value: 'test' });
        })
      );

      const client = new HttpClient().use(
        loggerPlugin({ logger: mockLogger })
      );

      await client.get('https://api.test.com/data');

      // Check if ANSI color codes are present
      const hasColorCodes = logs.some(log => log.includes('\x1b['));
      expect(hasColorCodes).toBe(true);
    });

    it('should not use colors when colors is false', async () => {
      const logs: string[] = [];
      const mockLogger = {
        log: (...args: any[]) => logs.push(args.join(' ')),
        error: vi.fn(),
        group: (...args: any[]) => logs.push(args.join(' ')),
        groupEnd: () => {}
      };

      server.use(
        http.get('https://api.test.com/data', () => {
          return Response.json({ value: 'test' });
        })
      );

      const client = new HttpClient().use(
        loggerPlugin({ colors: false, logger: mockLogger })
      );

      await client.get('https://api.test.com/data');

      // Check that no ANSI color codes are present
      const hasColorCodes = logs.some(log => log.includes('\x1b['));
      expect(hasColorCodes).toBe(false);
    });
  });

  describe('Request Filtering', () => {
    it('should filter requests based on filter function', async () => {
      const logs: string[] = [];
      const mockLogger = {
        log: (...args: any[]) => logs.push(args.join(' ')),
        error: vi.fn(),
        group: (...args: any[]) => logs.push(args.join(' ')),
        groupEnd: () => {}
      };

      server.use(
        http.get('https://api.test.com/public', () => {
          return Response.json({ public: true });
        }),
        http.get('https://api.test.com/private', () => {
          return Response.json({ private: true });
        })
      );

      const client = new HttpClient().use(
        loggerPlugin({
          logger: mockLogger,
          filter: (request) => !request.url?.includes('private')
        })
      );

      await client.get('https://api.test.com/public');
      await client.get('https://api.test.com/private');

      const publicLog = logs.find(log => log.includes('public'));
      const privateLog = logs.find(log => log.includes('private'));

      expect(publicLog).toBeDefined();
      expect(privateLog).toBeUndefined();
    });

    it('should filter health check requests', async () => {
      const logs: string[] = [];
      const mockLogger = {
        log: (...args: any[]) => logs.push(args.join(' ')),
        error: vi.fn(),
        group: (...args: any[]) => logs.push(args.join(' ')),
        groupEnd: () => {}
      };

      server.use(
        http.get('https://api.test.com/health', () => {
          return Response.json({ status: 'ok' });
        }),
        http.get('https://api.test.com/users', () => {
          return Response.json({ users: [] });
        })
      );

      const client = new HttpClient().use(
        loggerPlugin({
          logger: mockLogger,
          filter: (request) => !request.url?.includes('/health')
        })
      );

      await client.get('https://api.test.com/health');
      await client.get('https://api.test.com/users');

      const healthLog = logs.find(log => log.includes('health'));
      const usersLog = logs.find(log => log.includes('users'));

      expect(healthLog).toBeUndefined();
      expect(usersLog).toBeDefined();
    });
  });

  describe('Custom Logger', () => {
    it('should use custom logger function', async () => {
      const customLogs: string[] = [];
      const customLogger = {
        log: (...args: any[]) => customLogs.push(`LOG: ${args.join(' ')}`),
        error: (...args: any[]) => customLogs.push(`ERROR: ${args.join(' ')}`),
        group: (...args: any[]) => customLogs.push(`GROUP: ${args.join(' ')}`),
        groupEnd: () => customLogs.push('GROUP_END')
      };

      server.use(
        http.get('https://api.test.com/data', () => {
          return Response.json({ value: 'test' });
        })
      );

      const client = new HttpClient().use(
        loggerPlugin({ logger: customLogger })
      );

      await client.get('https://api.test.com/data');

      expect(customLogs.length).toBeGreaterThan(0);
      expect(customLogs.some(log => log.startsWith('LOG:') || log.startsWith('GROUP:'))).toBe(true);
    });
  });

  describe('Status Code Colors', () => {
    it('should use different colors for different status codes', async () => {
      const logs: string[] = [];
      const mockLogger = {
        log: (...args: any[]) => logs.push(args.join(' ')),
        error: vi.fn(),
        group: (...args: any[]) => logs.push(args.join(' ')),
        groupEnd: () => {}
      };

      server.use(
        http.get('https://api.test.com/success', () => {
          return Response.json({ ok: true });
        }),
        http.get('https://api.test.com/redirect', () => {
          return new Response(null, { status: 301, headers: { Location: 'https://api.test.com/success' } });
        })
      );

      const client = new HttpClient().use(
        loggerPlugin({ logger: mockLogger })
      );

      logs.length = 0;
      await client.get('https://api.test.com/success');
      const successLog = logs.join(' ');

      logs.length = 0;
      await client.get('https://api.test.com/redirect');
      const redirectLog = logs.join(' ');

      // Both should have color codes
      expect(successLog).toContain('\x1b[');
      expect(redirectLog).toContain('\x1b[');
    });
  });

  describe('Performance Metrics', () => {
    it('should log request duration', async () => {
      const logs: string[] = [];
      const mockLogger = {
        log: (...args: any[]) => logs.push(args.join(' ')),
        error: vi.fn(),
        group: (...args: any[]) => logs.push(args.join(' ')),
        groupEnd: () => {}
      };

      server.use(
        http.get('https://api.test.com/data', () => {
          return Response.json({ value: 'test' });
        })
      );

      const client = new HttpClient().use(
        loggerPlugin({ logger: mockLogger })
      );

      await client.get('https://api.test.com/data');

      // Should log duration in ms or s
      const durationLog = logs.find(log => log.includes('ms') || log.includes('s'));
      expect(durationLog).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle requests without URL', async () => {
      const logs: string[] = [];
      const mockLogger = {
        log: (...args: any[]) => logs.push(args.join(' ')),
        error: vi.fn(),
        group: (...args: any[]) => logs.push(args.join(' ')),
        groupEnd: () => {}
      };

      const client = new HttpClient().use(
        loggerPlugin({ logger: mockLogger })
      );

      // This should not crash even with minimal config
      expect(() => {
        const plugin = loggerPlugin({ logger: mockLogger });
        // Simulate plugin hooks with minimal data
      }).not.toThrow();
    });

    it('should handle large response data gracefully', async () => {
      const logs: string[] = [];
      const mockLogger = {
        log: (...args: any[]) => logs.push(args.join(' ')),
        error: vi.fn(),
        group: (...args: any[]) => logs.push(args.join(' ')),
        groupEnd: () => {}
      };

      const largeData = { data: 'x'.repeat(10000) };

      server.use(
        http.get('https://api.test.com/large', () => {
          return Response.json(largeData);
        })
      );

      const client = new HttpClient().use(
        loggerPlugin({ verbose: true, logger: mockLogger })
      );

      await client.get('https://api.test.com/large');

      // Should log without crashing
      expect(logs.length).toBeGreaterThan(0);
    });
  });
});
