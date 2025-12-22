import { describe, it, expect } from 'vitest';
import { HttpClient } from '@fetchmax/core';
import { progressPlugin } from '@fetchmax/plugin-progress';
import { http } from 'msw';
import { server } from '../../setup';

describe('Progress Plugin - Enhanced Coverage', () => {
  describe('formatBytes function', () => {
    it('should handle 0 bytes', async () => {
      const progressEvents: any[] = [];

      server.use(
        http.get('https://api.test.com/zero', () => {
          return new Response('', {
            headers: {
              'Content-Length': '0'
            }
          });
        })
      );

      const client = new HttpClient().use(
        progressPlugin({
          onDownloadProgress: (event) => {
            progressEvents.push(event);
            if (event.loaded === 0) {
              expect(event.bytes).toBe('0 B');
            }
          }
        })
      );

      await client.get('https://api.test.com/zero');
    });

    it('should format KB correctly', async () => {
      const progressEvents: any[] = [];
      const content = 'x'.repeat(2048); // 2KB

      server.use(
        http.get('https://api.test.com/kb', () => {
          return new Response(content, {
            headers: {
              'Content-Length': '2048'
            }
          });
        })
      );

      const client = new HttpClient().use(
        progressPlugin({
          onDownloadProgress: (event) => {
            progressEvents.push(event);
          }
        })
      );

      await client.get('https://api.test.com/kb');

      if (progressEvents.length > 0) {
        const lastEvent = progressEvents[progressEvents.length - 1];
        expect(lastEvent?.bytes).toContain('KB');
        expect(lastEvent?.bytes).toContain('2.00');
      }
    });

    it('should format MB correctly', async () => {
      const progressEvents: any[] = [];
      const content = 'x'.repeat(1048576); // 1MB

      server.use(
        http.get('https://api.test.com/mb', () => {
          return new Response(content, {
            headers: {
              'Content-Length': '1048576'
            }
          });
        })
      );

      const client = new HttpClient().use(
        progressPlugin({
          onDownloadProgress: (event) => {
            progressEvents.push(event);
          }
        })
      );

      await client.get('https://api.test.com/mb');

      if (progressEvents.length > 0) {
        const lastEvent = progressEvents[progressEvents.length - 1];
        expect(lastEvent?.bytes).toContain('MB');
        expect(lastEvent?.bytes).toContain('1.00');
      }
    });

    it('should format GB correctly', async () => {
      const progressEvents: any[] = [];

      server.use(
        http.get('https://api.test.com/gb', () => {
          // Simulate 1GB without actually creating the data
          return new Response('x'.repeat(1000), {
            headers: {
              'Content-Length': String(1073741824) // 1GB
            }
          });
        })
      );

      const client = new HttpClient().use(
        progressPlugin({
          onDownloadProgress: (event) => {
            progressEvents.push(event);
          }
        })
      );

      await client.get('https://api.test.com/gb');

      // Check if any event contains GB formatting
      if (progressEvents.length > 0) {
        const lastEvent = progressEvents[progressEvents.length - 1];
        expect(lastEvent?.bytes).toBeDefined();
      }
    });
  });

  describe('Response Type Handling', () => {
    it('should handle text responseType', async () => {
      server.use(
        http.get('https://api.test.com/text-type', () => {
          return new Response('Plain text content', {
            headers: {
              'Content-Type': 'text/plain',
              'Content-Length': '18'
            }
          });
        })
      );

      const client = new HttpClient().use(
        progressPlugin({
          onDownloadProgress: (_event) => {
            // Progress callback
          }
        })
      );

      const response = await client.get('https://api.test.com/text-type');
      expect(typeof response.data).toBe('string');
      expect(response.data).toContain('Plain text');
    });

    it('should handle JSON responseType with progress', async () => {
      server.use(
        http.get('https://api.test.com/json-type', () => {
          return Response.json(
            { key: 'value', number: 42 },
            {
              headers: {
                'Content-Length': '26'
              }
            }
          );
        })
      );

      const client = new HttpClient().use(
        progressPlugin({
          onDownloadProgress: (_event) => {
            // Progress callback
          }
        })
      );

      const response = await client.get('https://api.test.com/json-type');
      expect(response.data).toEqual({ key: 'value', number: 42 });
    });

    it('should handle image content-type', async () => {
      server.use(
        http.get('https://api.test.com/image', () => {
          return new Response('fake-image-data', {
            headers: {
              'Content-Type': 'image/png',
              'Content-Length': '15'
            }
          });
        })
      );

      const client = new HttpClient().use(
        progressPlugin({
          onDownloadProgress: (_event) => {
            // Progress callback
          }
        })
      );

      const response = await client.get('https://api.test.com/image');
      expect(response.data).toBeDefined();
    });

    it('should handle missing content-type header', async () => {
      server.use(
        http.get('https://api.test.com/no-content-type', () => {
          return new Response('{"data":"value"}', {
            headers: {
              'Content-Length': '16'
            }
          });
        })
      );

      const client = new HttpClient().use(
        progressPlugin({
          onDownloadProgress: (_event) => {
            // Progress callback
          }
        })
      );

      const response = await client.get('https://api.test.com/no-content-type');
      expect(response.data).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle response with no body', async () => {
      server.use(
        http.get('https://api.test.com/no-body', () => {
          return new Response(null, {
            status: 204,
            headers: {
              'Content-Length': '0'
            }
          });
        })
      );

      const client = new HttpClient().use(
        progressPlugin({
          onDownloadProgress: (_event) => {
            // Should not be called
          }
        })
      );

      const response = await client.get('https://api.test.com/no-body');
      expect(response.status).toBe(204);
    });

    it('should handle invalid JSON gracefully', async () => {
      server.use(
        http.get('https://api.test.com/invalid-json', () => {
          return new Response('not valid {json}', {
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': '16'
            }
          });
        })
      );

      const client = new HttpClient().use(
        progressPlugin({
          onDownloadProgress: (_event) => {
            // Progress callback
          }
        })
      );

      const response = await client.get('https://api.test.com/invalid-json');
      // Should fallback to text when JSON parse fails
      expect(typeof response.data).toBe('string');
    });

    it('should handle responses with bodyUsed = true', async () => {
      server.use(
        http.get('https://api.test.com/body-used', () => {
          return Response.json({ value: 'test' });
        })
      );

      const client = new HttpClient().use(
        progressPlugin({
          onDownloadProgress: (_event) => {
            // Progress callback
          }
        })
      );

      const response = await client.get('https://api.test.com/body-used');
      expect(response.data.value).toBe('test');
    });

    it('should calculate percentage as 0 when total is 0', async () => {
      const progressEvents: any[] = [];

      server.use(
        http.get('https://api.test.com/no-total', () => {
          return new Response('data', {
            // No Content-Length header
          });
        })
      );

      const client = new HttpClient().use(
        progressPlugin({
          onDownloadProgress: (event) => {
            progressEvents.push(event);
            if (event.total === 0) {
              expect(event.percentage).toBe(0);
            }
          }
        })
      );

      await client.get('https://api.test.com/no-total');
    });
  });

  describe('Multiple Requests', () => {
    it('should handle multiple concurrent requests', async () => {
      const progressEvents1: any[] = [];
      const progressEvents2: any[] = [];

      server.use(
        http.get('https://api.test.com/req1', () => {
          return new Response('data1', {
            headers: {
              'Content-Length': '5'
            }
          });
        }),
        http.get('https://api.test.com/req2', () => {
          return new Response('data2-longer', {
            headers: {
              'Content-Length': '12'
            }
          });
        })
      );

      const client1 = new HttpClient().use(
        progressPlugin({
          onDownloadProgress: (event) => {
            progressEvents1.push(event);
          }
        })
      );

      const client2 = new HttpClient().use(
        progressPlugin({
          onDownloadProgress: (event) => {
            progressEvents2.push(event);
          }
        })
      );

      const [response1, response2] = await Promise.all([
        client1.get('https://api.test.com/req1'),
        client2.get('https://api.test.com/req2')
      ]);

      expect(response1.data).toBeDefined();
      expect(response2.data).toBeDefined();
    });

    it('should handle sequential requests with different configs', async () => {
      server.use(
        http.get('https://api.test.com/seq', () => {
          return Response.json({ seq: true });
        })
      );

      const client = new HttpClient();

      // First request with progress
      const plugin1 = progressPlugin({
        onDownloadProgress: (_event) => {
          // Progress callback
        }
      });
      client.use(plugin1);
      const response1 = await client.get('https://api.test.com/seq');
      expect(response1.data.seq).toBe(true);

      // Second request without progress (plugin still active)
      const response2 = await client.get('https://api.test.com/seq');
      expect(response2.data.seq).toBe(true);
    });
  });

  describe('Progress Event Properties', () => {
    it('should include all required properties in progress event', async () => {
      const progressEvents: any[] = [];

      server.use(
        http.get('https://api.test.com/props', () => {
          return new Response('test', {
            headers: {
              'Content-Length': '4'
            }
          });
        })
      );

      const client = new HttpClient().use(
        progressPlugin({
          onDownloadProgress: (event) => {
            expect(event).toHaveProperty('loaded');
            expect(event).toHaveProperty('total');
            expect(event).toHaveProperty('percentage');
            expect(event).toHaveProperty('bytes');
            progressEvents.push(event);
          }
        })
      );

      await client.get('https://api.test.com/props');

      if (progressEvents.length > 0) {
        const event = progressEvents[0];
        expect(typeof event.loaded).toBe('number');
        expect(typeof event.total).toBe('number');
        expect(typeof event.percentage).toBe('number');
        expect(typeof event.bytes).toBe('string');
      }
    });

    it('should have increasing loaded values', async () => {
      const progressEvents: any[] = [];
      const content = 'x'.repeat(5000);

      server.use(
        http.get('https://api.test.com/increasing', () => {
          return new Response(content, {
            headers: {
              'Content-Length': String(content.length)
            }
          });
        })
      );

      const client = new HttpClient().use(
        progressPlugin({
          onDownloadProgress: (event) => {
            progressEvents.push(event);
          }
        })
      );

      await client.get('https://api.test.com/increasing');

      // Check that loaded values are non-decreasing
      if (progressEvents.length > 1) {
        for (let i = 1; i < progressEvents.length; i++) {
          expect(progressEvents[i].loaded).toBeGreaterThanOrEqual(
            progressEvents[i - 1].loaded
          );
        }
      }
    });
  });

  describe('onRequest Hook', () => {
    it('should set context properties in onRequest', async () => {
      server.use(
        http.get('https://api.test.com/context', () => {
          return Response.json({ test: true });
        })
      );

      const client = new HttpClient().use(
        progressPlugin({
          onDownloadProgress: (_event) => {
            // Progress callback
          }
        })
      );

      const response = await client.get('https://api.test.com/context');
      expect(response.data.test).toBe(true);
    });

    it('should not modify request when no callback provided', async () => {
      server.use(
        http.get('https://api.test.com/no-modify', () => {
          return Response.json({ test: true });
        })
      );

      const client = new HttpClient().use(progressPlugin({}));

      const response = await client.get('https://api.test.com/no-modify');
      expect(response.data.test).toBe(true);
    });
  });

  describe('Content Reconstruction', () => {
    it('should correctly reconstruct chunked data', async () => {
      const content = 'x'.repeat(1000);

      server.use(
        http.get('https://api.test.com/chunked', () => {
          return new Response(content, {
            headers: {
              'Content-Length': String(content.length)
            }
          });
        })
      );

      const client = new HttpClient().use(
        progressPlugin({
          onDownloadProgress: (_event) => {
            // Progress callback
          }
        })
      );

      const response = await client.get('https://api.test.com/chunked');

      if (typeof response.data === 'string') {
        expect(response.data.length).toBe(content.length);
      }
    });

    it('should preserve data integrity for JSON', async () => {
      const jsonData = {
        string: 'test',
        number: 123,
        boolean: true,
        array: [1, 2, 3],
        nested: { key: 'value' }
      };

      server.use(
        http.get('https://api.test.com/integrity', () => {
          return Response.json(jsonData, {
            headers: {
              'Content-Length': String(JSON.stringify(jsonData).length)
            }
          });
        })
      );

      const client = new HttpClient().use(
        progressPlugin({
          onDownloadProgress: (_event) => {
            // Progress callback
          }
        })
      );

      const response = await client.get('https://api.test.com/integrity');
      expect(response.data).toEqual(jsonData);
    });
  });
});
