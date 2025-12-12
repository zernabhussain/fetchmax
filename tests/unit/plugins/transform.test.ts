import { describe, it, expect } from 'vitest';
import { HttpClient } from '@fetchmax/core';
import { transformPlugin, transforms } from '@fetchmax/plugin-transform';
import { http } from 'msw';
import { server } from '../../setup';

describe('Transform Plugin', () => {
  describe('Request Transformation', () => {
    it('should transform request body', async () => {
      server.use(
        http.post('https://api.test.com/data', async ({ request }) => {
          const body = await request.json();
          return Response.json({ received: body });
        })
      );

      const client = new HttpClient().use(
        transformPlugin({
          transformRequest: (data) => {
            return { ...data, transformed: true };
          }
        })
      );

      const response = await client.post('https://api.test.com/data', { value: 123 });
      expect(response.data.received).toEqual({ value: 123, transformed: true });
    });

    it('should have access to headers in request transform', async () => {
      let capturedHeaders: any;

      server.use(
        http.post('https://api.test.com/data', () => {
          return Response.json({ ok: true });
        })
      );

      const client = new HttpClient().use(
        transformPlugin({
          transformRequest: (data, headers) => {
            capturedHeaders = headers;
            return data;
          }
        })
      );

      await client.post('https://api.test.com/data', { test: true });
      expect(capturedHeaders).toBeDefined();
    });
  });

  describe('Response Transformation', () => {
    it('should transform response data', async () => {
      server.use(
        http.get('https://api.test.com/users', () => {
          return Response.json({ user_name: 'john', user_id: 123 });
        })
      );

      const client = new HttpClient().use(
        transformPlugin({
          transformResponse: (data) => {
            return { ...data, transformed: true };
          }
        })
      );

      const response = await client.get('https://api.test.com/users');
      expect(response.data).toEqual({
        user_name: 'john',
        user_id: 123,
        transformed: true
      });
    });

    it('should have access to headers in response transform', async () => {
      let contentType: string | undefined;

      server.use(
        http.get('https://api.test.com/data', () => {
          return Response.json({ value: 1 });
        })
      );

      const client = new HttpClient().use(
        transformPlugin({
          transformResponse: (data, headers) => {
            contentType = headers['content-type'];
            return data;
          }
        })
      );

      await client.get('https://api.test.com/data');
      expect(contentType).toBeDefined();
    });
  });

  describe('Utility Transforms', () => {
    describe('camelCase', () => {
      it('should convert snake_case to camelCase', () => {
        const input = {
          user_name: 'John',
          user_id: 123,
          is_active: true
        };

        const output = transforms.camelCase(input);

        expect(output).toEqual({
          userName: 'John',
          userId: 123,
          isActive: true
        });
      });

      it('should handle nested objects', () => {
        const input = {
          user_data: {
            first_name: 'John',
            last_name: 'Doe'
          }
        };

        const output = transforms.camelCase(input);

        expect(output).toEqual({
          userData: {
            firstName: 'John',
            lastName: 'Doe'
          }
        });
      });

      it('should handle arrays', () => {
        const input = [
          { user_name: 'Alice' },
          { user_name: 'Bob' }
        ];

        const output = transforms.camelCase(input);

        expect(output).toEqual([
          { userName: 'Alice' },
          { userName: 'Bob' }
        ]);
      });

      it('should handle primitive values', () => {
        expect(transforms.camelCase('string')).toBe('string');
        expect(transforms.camelCase(123)).toBe(123);
        expect(transforms.camelCase(true)).toBe(true);
        expect(transforms.camelCase(null)).toBe(null);
      });
    });

    describe('snakeCase', () => {
      it('should convert camelCase to snake_case', () => {
        const input = {
          userName: 'John',
          userId: 123,
          isActive: true
        };

        const output = transforms.snakeCase(input);

        expect(output).toEqual({
          user_name: 'John',
          user_id: 123,
          is_active: true
        });
      });

      it('should handle nested objects', () => {
        const input = {
          userData: {
            firstName: 'John',
            lastName: 'Doe'
          }
        };

        const output = transforms.snakeCase(input);

        expect(output).toEqual({
          user_data: {
            first_name: 'John',
            last_name: 'Doe'
          }
        });
      });

      it('should handle arrays', () => {
        const input = [
          { userName: 'Alice' },
          { userName: 'Bob' }
        ];

        const output = transforms.snakeCase(input);

        expect(output).toEqual([
          { user_name: 'Alice' },
          { user_name: 'Bob' }
        ]);
      });

      it('should handle primitive values', () => {
        expect(transforms.snakeCase('string')).toBe('string');
        expect(transforms.snakeCase(123)).toBe(123);
        expect(transforms.snakeCase(false)).toBe(false);
        expect(transforms.snakeCase(null)).toBe(null);
      });
    });
  });

  describe('Real-world Use Cases', () => {
    it('should convert API snake_case to client camelCase', async () => {
      server.use(
        http.get('https://api.test.com/user', () => {
          return Response.json({
            user_id: 1,
            first_name: 'John',
            last_name: 'Doe',
            created_at: '2024-01-01'
          });
        })
      );

      const client = new HttpClient().use(
        transformPlugin({
          transformResponse: transforms.camelCase
        })
      );

      const response = await client.get('https://api.test.com/user');
      expect(response.data).toEqual({
        userId: 1,
        firstName: 'John',
        lastName: 'Doe',
        createdAt: '2024-01-01'
      });
    });

    it('should convert client camelCase to API snake_case', async () => {
      server.use(
        http.post('https://api.test.com/user', async ({ request }) => {
          const body = await request.json();
          return Response.json({ received: body });
        })
      );

      const client = new HttpClient().use(
        transformPlugin({
          transformRequest: transforms.snakeCase
        })
      );

      const response = await client.post('https://api.test.com/user', {
        firstName: 'John',
        lastName: 'Doe',
        isActive: true
      });

      expect(response.data.received).toEqual({
        first_name: 'John',
        last_name: 'Doe',
        is_active: true
      });
    });

    it('should use both request and response transforms', async () => {
      server.use(
        http.post('https://api.test.com/users', async ({ request }) => {
          const body = await request.json() as Record<string, any>;
          return Response.json({
            user_id: 1,
            ...body
          });
        })
      );

      const client = new HttpClient().use(
        transformPlugin({
          transformRequest: transforms.snakeCase,
          transformResponse: transforms.camelCase
        })
      );

      const response = await client.post('https://api.test.com/users', {
        firstName: 'John',
        lastName: 'Doe'
      });

      expect(response.data).toEqual({
        userId: 1,
        firstName: 'John',
        lastName: 'Doe'
      });
    });

    it('should apply custom transformations', async () => {
      server.use(
        http.get('https://api.test.com/prices', () => {
          return Response.json([
            { price: '10.50' },
            { price: '20.99' }
          ]);
        })
      );

      const client = new HttpClient().use(
        transformPlugin({
          transformResponse: (data) => {
            if (Array.isArray(data)) {
              return data.map(item => ({
                ...item,
                price: parseFloat(item.price)
              }));
            }
            return data;
          }
        })
      );

      const response = await client.get('https://api.test.com/prices');
      expect(response.data).toEqual([
        { price: 10.50 },
        { price: 20.99 }
      ]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined body gracefully', async () => {
      server.use(
        http.get('https://api.test.com/data', () => {
          return Response.json({ value: 1 });
        })
      );

      const client = new HttpClient().use(
        transformPlugin({
          transformRequest: (data) => {
            return { ...data, transformed: true };
          }
        })
      );

      // GET request has no body
      const response = await client.get('https://api.test.com/data');
      expect(response.data).toEqual({ value: 1 });
    });

    it('should not transform if transformer not provided', async () => {
      server.use(
        http.get('https://api.test.com/data', () => {
          return Response.json({ snake_case: 'value' });
        })
      );

      const client = new HttpClient().use(transformPlugin({}));

      const response = await client.get('https://api.test.com/data');
      expect(response.data).toEqual({ snake_case: 'value' });
    });
  });
});
