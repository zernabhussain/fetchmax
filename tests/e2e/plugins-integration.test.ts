import { test, expect } from '@playwright/test';
import { HttpClient } from '@fetchmax/core';
import { retryPlugin } from '@fetchmax/plugin-retry';
import { loggerPlugin } from '@fetchmax/plugin-logger';
import { timeoutPlugin } from '@fetchmax/plugin-timeout';
import { cachePlugin } from '@fetchmax/plugin-cache';
import { interceptorPlugin } from '@fetchmax/plugin-interceptors';
import { transformPlugin, transforms } from '@fetchmax/plugin-transform';

/**
 * E2E Tests - Plugin Integration
 *
 * Tests that all FetchMax plugins work together correctly
 * with real-world APIs and scenarios.
 */

test.describe('Plugin Integration with Real APIs', () => {
  test('should work with retry + logger plugins', async () => {
    const logs: string[] = [];

    const client = new HttpClient({
      baseURL: 'https://jsonplaceholder.typicode.com'
    })
      .use(retryPlugin({ maxRetries: 3, retryDelay: 100 }))
      .use(loggerPlugin({
        logRequests: true,
        logResponses: true,
        logger: {
          log: (...args: any[]) => logs.push(args.join(' ')),
          error: (...args: any[]) => logs.push(args.join(' '))
        }
      }));

    const response = await client.get('/posts/1');

    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    // Logger plugin now logs, so we should have logs
    expect(logs.length).toBeGreaterThan(0);
  });

  test('should work with timeout + retry plugins', async () => {
    const client = new HttpClient({
      baseURL: 'https://jsonplaceholder.typicode.com'
    })
      .use(timeoutPlugin({ timeout: 10000 }))
      .use(retryPlugin({ maxRetries: 2, retryDelay: 100 }));

    const response = await client.get('/posts/1');

    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
  });

  test('should work with cache plugin', async () => {
    const client = new HttpClient({
      baseURL: 'https://jsonplaceholder.typicode.com'
    }).use(cachePlugin({ ttl: 60000 }));

    // First request - should hit API
    const response1 = await client.get('/posts/1');
    expect(response1.status).toBe(200);

    // Second request - should use cache
    const response2 = await client.get('/posts/1');
    expect(response2.status).toBe(200);
    expect(response2.data).toEqual(response1.data);
  });

  test('should work with interceptors plugin', async () => {
    let requestIntercepted = false;
    let responseIntercepted = false;

    const interceptors = interceptorPlugin();

    // Add interceptors using the plugin's API
    interceptors.request.use((config) => {
      requestIntercepted = true;
      return config;
    });

    interceptors.response.use((response) => {
      responseIntercepted = true;
      return response;
    });

    const client = new HttpClient({
      baseURL: 'https://jsonplaceholder.typicode.com'
    }).use(interceptors);

    const response = await client.get('/posts/1');

    expect(response.status).toBe(200);
    expect(requestIntercepted).toBe(true);
    expect(responseIntercepted).toBe(true);
  });

  test('should work with transform plugin', async () => {
    const client = new HttpClient({
      baseURL: 'https://jsonplaceholder.typicode.com'
    }).use(
      transformPlugin({
        transformResponse: (data, headers) => {
          // Add a custom field to demonstrate transformation
          return {
            ...data,
            transformed: true,
            customField: 'E2E Test'
          };
        }
      })
    );

    const response = await client.get('/posts/1');

    expect(response.status).toBe(200);
    expect(response.data.transformed).toBe(true);
    expect(response.data.customField).toBe('E2E Test');
  });

  test('should work with multiple plugins combined', async () => {
    const logs: string[] = [];

    const client = new HttpClient({
      baseURL: 'https://jsonplaceholder.typicode.com'
    })
      .use(timeoutPlugin({ timeout: 10000 }))
      .use(retryPlugin({ maxRetries: 2, retryDelay: 100 }))
      .use(cachePlugin({ ttl: 60000 }))
      .use(loggerPlugin({
        logRequests: true,
        logResponses: true,
        logger: {
          log: (...args: any[]) => logs.push(args.join(' ')),
          error: (...args: any[]) => logs.push(args.join(' '))
        }
      }))
      .use(
        transformPlugin({
          transformResponse: (data) => ({
            ...data,
            transformed: true
          })
        })
      );

    // First request
    const response1 = await client.get('/posts/1');
    expect(response1.status).toBe(200);
    expect(response1.data.transformed).toBe(true);

    // Second request (should use cache)
    const response2 = await client.get('/posts/1');
    expect(response2.status).toBe(200);
    expect(response2.data).toEqual(response1.data);

    // Verify logging worked
    expect(logs.length).toBeGreaterThan(0);
  });

  test('should handle errors with multiple plugins', async () => {
    let errorIntercepted = false;

    const interceptors = interceptorPlugin();
    interceptors.error.use((error) => {
      errorIntercepted = true;
      throw error;
    });

    const client = new HttpClient({
      baseURL: 'https://jsonplaceholder.typicode.com'
    })
      .use(timeoutPlugin({ timeout: 10000 }))
      .use(retryPlugin({ maxRetries: 1, retryDelay: 100 }))
      .use(interceptors);

    try {
      await client.get('/posts/999999');
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error).toBeDefined();
      expect(error.status).toBe(404);
      expect(errorIntercepted).toBe(true);
    }
  });

  test('should maintain interceptor order within a plugin', async () => {
    const executionOrder: string[] = [];

    const interceptors = interceptorPlugin();

    // Add multiple interceptors to the same plugin
    interceptors.request.use((config) => {
      executionOrder.push('interceptor-1');
      return config;
    });

    interceptors.request.use((config) => {
      executionOrder.push('interceptor-2');
      return config;
    });

    const client = new HttpClient({
      baseURL: 'https://jsonplaceholder.typicode.com'
    }).use(interceptors);

    await client.get('/posts/1');

    expect(executionOrder).toEqual(['interceptor-1', 'interceptor-2']);
  });

  test('should work with all plugins in real-world scenario', async () => {
    const logs: string[] = [];
    let retryAttempts = 0;

    const interceptors = interceptorPlugin();
    interceptors.request.use((config) => {
      config.headers = config.headers || {};
      config.headers['X-Custom-Header'] = 'FetchMax-E2E';
      return config;
    });

    const client = new HttpClient({
      baseURL: 'https://jsonplaceholder.typicode.com'
    })
      .use(timeoutPlugin({ timeout: 15000 }))
      .use(
        retryPlugin({
          maxRetries: 2,
          retryDelay: 100,
          onRetry: (attempt) => {
            retryAttempts = attempt;
          }
        })
      )
      .use(cachePlugin({ ttl: 30000 }))
      .use(interceptors)
      .use(
        transformPlugin({
          transformResponse: (data) => ({
            ...data,
            tested: true
          })
        })
      )
      .use(
        loggerPlugin({
          logRequests: true,
          logResponses: true,
          logger: {
            log: (...args: any[]) => logs.push(args.join(' ')),
            error: (...args: any[]) => logs.push(args.join(' '))
          }
        })
      );

    // Successful request
    const response = await client.get('/posts/1');

    expect(response.status).toBe(200);
    expect(response.data.id).toBe(1);
    expect(response.data.tested).toBe(true);
    expect(logs.length).toBeGreaterThan(0);

    // Should use cache for second request
    const cachedResponse = await client.get('/posts/1');
    expect(cachedResponse.data).toEqual(response.data);
  });
});
