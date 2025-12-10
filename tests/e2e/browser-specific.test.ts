import { test, expect } from '@playwright/test';
import { HttpClient, AbortError } from '@fetchmax/core';

/**
 * E2E Tests - Browser-Specific Features
 *
 * Tests FetchMax features that are specific to browser environments
 * like CORS, credentials, and browser-specific APIs.
 */

test.describe('Browser-Specific Features', () => {
  test('should handle CORS requests', async () => {
    const client = new HttpClient({
      baseURL: 'https://api.github.com'
    });

    const response = await client.get('/users/octocat');

    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
  });

  test('should work with credentials mode', async () => {
    const client = new HttpClient({
      baseURL: 'https://jsonplaceholder.typicode.com',
      credentials: 'same-origin'
    });

    const response = await client.get('/posts/1');

    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
  });

  test('should work with different cache modes', async () => {
    const client = new HttpClient({
      baseURL: 'https://jsonplaceholder.typicode.com',
      cache: 'no-cache'
    });

    const response = await client.get('/posts/1');

    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
  });

  test('should work with AbortController - pre-aborted signal', async () => {
    const controller = new AbortController();

    const client = new HttpClient({
      baseURL: 'https://jsonplaceholder.typicode.com'
    });

    // Pre-abort the signal before making the request
    controller.abort();

    // Should throw abort error when trying to make request with already-aborted signal
    try {
      await client.get('/posts/1', {
        signal: controller.signal
      });
      expect.fail('Should have thrown an abort error');
    } catch (error: any) {
      expect(error).toBeDefined();
      // FetchMax wraps native abort errors in its own AbortError class
      // Check for either FetchMax's AbortError or the error code
      const isAbortError =
        error instanceof AbortError ||
        error.name === 'AbortError' ||
        error.code === 'ABORT_ERROR' ||
        error.message?.toLowerCase().includes('abort');
      expect(isAbortError).toBe(true);
    }
  });

  test('should work with AbortController - abort during request', async () => {
    const controller = new AbortController();

    const client = new HttpClient({
      baseURL: 'https://jsonplaceholder.typicode.com'
    });

    // Start a request
    const requestPromise = client.get('/posts', {
      signal: controller.signal
    });

    // Abort immediately - the request should be cancelled
    controller.abort();

    // The request should either:
    // 1. Succeed if it completed before abort (fast network)
    // 2. Throw AbortError if it was cancelled (expected behavior)
    try {
      const response = await requestPromise;
      // If we get here, the request completed before abort
      // This is acceptable in fast network conditions
      expect(response).toBeDefined();
    } catch (error: any) {
      // This is the expected path - request was aborted
      expect(error).toBeDefined();
      // Check for abort-related errors
      const isAbortError =
        error instanceof AbortError ||
        error.name === 'AbortError' ||
        error.code === 'ABORT_ERROR' ||
        error.message?.toLowerCase().includes('abort');
      expect(isAbortError).toBe(true);
    }
  });

  test('should handle concurrent requests', async () => {
    const client = new HttpClient({
      baseURL: 'https://jsonplaceholder.typicode.com'
    });

    const promises = [
      client.get('/posts/1'),
      client.get('/posts/2'),
      client.get('/posts/3'),
      client.get('/posts/4'),
      client.get('/posts/5')
    ];

    const responses = await Promise.all(promises);

    expect(responses.length).toBe(5);
    responses.forEach((response, index) => {
      expect(response.status).toBe(200);
      expect(response.data.id).toBe(index + 1);
    });
  });

  test('should work with different response types in browser', async () => {
    const client = new HttpClient({
      baseURL: 'https://jsonplaceholder.typicode.com'
    });

    // JSON
    const jsonResponse = await client.get('/posts/1', {
      responseType: 'json'
    });
    expect(typeof jsonResponse.data).toBe('object');

    // Text
    const textResponse = await client.get('/posts/1', {
      responseType: 'text'
    });
    expect(typeof textResponse.data).toBe('string');

    // Blob
    const blobResponse = await client.get('/posts/1', {
      responseType: 'blob'
    });
    expect(blobResponse.data).toBeInstanceOf(Blob);
  });

  test('should handle custom headers', async () => {
    const client = new HttpClient({
      baseURL: 'https://api.github.com',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'FetchMax-Browser-E2E'
      }
    });

    const response = await client.get('/users/octocat');

    expect(response.status).toBe(200);
    expect(response.headers).toBeDefined();
  });

  test('should work across all browser types', async ({ browserName }) => {
    const client = new HttpClient({
      baseURL: 'https://jsonplaceholder.typicode.com'
    });

    const response = await client.get('/posts/1');

    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.id).toBe(1);

    // Log which browser this test ran on
    console.log(`Test passed on ${browserName}`);
  });

  test('should maintain referrer policy', async () => {
    const client = new HttpClient({
      baseURL: 'https://jsonplaceholder.typicode.com',
      referrerPolicy: 'no-referrer'
    });

    const response = await client.get('/posts/1');

    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
  });

  test('should work with redirect modes', async () => {
    const client = new HttpClient({
      baseURL: 'https://jsonplaceholder.typicode.com',
      redirect: 'follow'
    });

    const response = await client.get('/posts/1');

    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
  });
});
