import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MockCache } from '@fetchmax/plugin-ai-mock';

describe('MockCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should store and retrieve cached mocks', () => {
    const cache = new MockCache(60000);
    const mockData = { id: 1, name: 'Test' };

    cache.set('/api/users', 'GET', mockData);

    const retrieved = cache.get('/api/users', 'GET');
    expect(retrieved).toEqual(mockData);
  });

  it('should return null for non-existent cache', () => {
    const cache = new MockCache();

    const retrieved = cache.get('/api/users', 'GET');
    expect(retrieved).toBeNull();
  });

  it('should expire cache after TTL', () => {
    const cache = new MockCache(1000); // 1 second TTL
    const mockData = { id: 1, name: 'Test' };

    cache.set('/api/users', 'GET', mockData);

    // Should be available immediately
    expect(cache.get('/api/users', 'GET')).toEqual(mockData);

    // Advance time past TTL
    vi.advanceTimersByTime(1001);

    // Should be expired
    expect(cache.get('/api/users', 'GET')).toBeNull();
  });

  it('should track cache hits', () => {
    const cache = new MockCache();
    const mockData = { id: 1, name: 'Test' };

    cache.set('/api/users', 'GET', mockData);

    cache.get('/api/users', 'GET');
    cache.get('/api/users', 'GET');
    cache.get('/api/users', 'GET');

    const stats = cache.getStats();
    expect(stats.totalHits).toBe(3);
  });

  it('should clear specific endpoint cache', () => {
    const cache = new MockCache();

    cache.set('/api/users', 'GET', { data: 'users' });
    cache.set('/api/posts', 'GET', { data: 'posts' });

    cache.clear('/api/users', 'GET');

    expect(cache.get('/api/users', 'GET')).toBeNull();
    expect(cache.get('/api/posts', 'GET')).toEqual({ data: 'posts' });
  });

  it('should clear all cache', () => {
    const cache = new MockCache();

    cache.set('/api/users', 'GET', { data: 'users' });
    cache.set('/api/posts', 'GET', { data: 'posts' });

    cache.clear();

    expect(cache.get('/api/users', 'GET')).toBeNull();
    expect(cache.get('/api/posts', 'GET')).toBeNull();
  });

  it('should check if endpoint is cached', () => {
    const cache = new MockCache();

    expect(cache.has('/api/users', 'GET')).toBe(false);

    cache.set('/api/users', 'GET', { data: 'test' });

    expect(cache.has('/api/users', 'GET')).toBe(true);
  });

  it('should differentiate between methods', () => {
    const cache = new MockCache();

    cache.set('/api/users', 'GET', { method: 'GET' });
    cache.set('/api/users', 'POST', { method: 'POST' });

    expect(cache.get('/api/users', 'GET')).toEqual({ method: 'GET' });
    expect(cache.get('/api/users', 'POST')).toEqual({ method: 'POST' });
  });
});
