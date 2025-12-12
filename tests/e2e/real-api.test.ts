import { describe, it, expect } from 'vitest';
import { HttpClient } from '@fetchmax/core';

/**
 * E2E Tests - Real API Integration
 *
 * Tests FetchMax against real public APIs to verify:
 * - Universal compatibility
 * - Real-world usage patterns
 * - Network resilience
 */

describe('Real API Integration', () => {
  it('should fetch from GitHub API', async () => {
    const client = new HttpClient({
      baseURL: 'https://api.github.com'
    });

    const response = await client.get('/users/octocat');

    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.login).toBe('octocat');
    expect(response.data.type).toBe('User');
  });

  it('should fetch from JSONPlaceholder API', async () => {
    const client = new HttpClient({
      baseURL: 'https://jsonplaceholder.typicode.com'
    });

    const response = await client.get('/todos/1');

    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.id).toBe(1);
    expect(response.data.userId).toBe(1);
    expect(typeof response.data.title).toBe('string');
    expect(typeof response.data.completed).toBe('boolean');
  });

  it('should handle POST requests to real API', async () => {
    const client = new HttpClient({
      baseURL: 'https://jsonplaceholder.typicode.com'
    });

    const response = await client.post('/posts', {
      title: 'FetchMax E2E Test',
      body: 'Testing FetchMax with real API',
      userId: 1
    });

    expect(response.status).toBe(201);
    expect(response.data).toBeDefined();
    expect(response.data.title).toBe('FetchMax E2E Test');
    expect(response.data.userId).toBe(1);
    expect(response.data.id).toBeDefined();
  });

  it('should handle query parameters with real API', async () => {
    const client = new HttpClient({
      baseURL: 'https://jsonplaceholder.typicode.com'
    });

    const response = await client.get('/posts', {
      params: {
        userId: 1,
        _limit: 5
      }
    });

    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data.length).toBeLessThanOrEqual(5);
    expect(response.data.every((post: any) => post.userId === 1)).toBe(true);
  });

  it('should handle 404 errors from real API', async () => {
    const client = new HttpClient({
      baseURL: 'https://jsonplaceholder.typicode.com'
    });

    try {
      await client.get('/posts/999999');
      throw new Error('Should have thrown an error');
    } catch (error: any) {
      expect(error).toBeDefined();
      expect(error.status).toBe(404);
    }
  });

  it('should work with different HTTP methods', async () => {
    const client = new HttpClient({
      baseURL: 'https://jsonplaceholder.typicode.com'
    });

    // GET
    const getResponse = await client.get('/posts/1');
    expect(getResponse.status).toBe(200);

    // PUT
    const putResponse = await client.put('/posts/1', {
      id: 1,
      title: 'Updated Title',
      body: 'Updated Body',
      userId: 1
    });
    expect(putResponse.status).toBe(200);

    // PATCH
    const patchResponse = await client.patch('/posts/1', {
      title: 'Patched Title'
    });
    expect(patchResponse.status).toBe(200);

    // DELETE
    const deleteResponse = await client.delete('/posts/1');
    expect(deleteResponse.status).toBe(200);
  });

  it('should handle headers correctly', async () => {
    const client = new HttpClient({
      baseURL: 'https://api.github.com',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'FetchMax-E2E-Test'
      }
    });

    const response = await client.get('/users/octocat');

    expect(response.status).toBe(200);
    expect(response.headers).toBeDefined();
    expect(response.data).toBeDefined();
  });

  it('should work with response types', async () => {
    const client = new HttpClient({
      baseURL: 'https://jsonplaceholder.typicode.com'
    });

    // JSON (default)
    const jsonResponse = await client.get('/posts/1');
    expect(typeof jsonResponse.data).toBe('object');

    // Text
    const textResponse = await client.get('/posts/1', {
      responseType: 'text'
    });
    expect(typeof textResponse.data).toBe('string');
  });
});
