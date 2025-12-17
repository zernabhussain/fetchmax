import type { CachedMock } from './types';

/**
 * Mock Cache Manager
 * Handles caching of generated mock responses
 */
export class MockCache {
  private cache: Map<string, CachedMock> = new Map();

  constructor(private ttl: number = 3600000) {} // Default: 1 hour

  /**
   * Generate cache key from endpoint and method
   */
  private getCacheKey(endpoint: string, method: string): string {
    return `${method.toUpperCase()}:${endpoint}`;
  }

  /**
   * Get cached mock if available and not expired
   */
  get(endpoint: string, method: string): any | null {
    const key = this.getCacheKey(endpoint, method);
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Increment hit counter
    cached.hits++;
    return cached.data;
  }

  /**
   * Store mock in cache
   */
  set(endpoint: string, method: string, data: any): void {
    const key = this.getCacheKey(endpoint, method);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0
    });
  }

  /**
   * Check if endpoint is cached
   */
  has(endpoint: string, method: string): boolean {
    const key = this.getCacheKey(endpoint, method);
    const cached = this.cache.get(key);

    if (!cached) {
      return false;
    }

    // Check if expired
    const now = Date.now();
    if (now - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear specific endpoint cache
   */
  clear(endpoint?: string, method?: string): void {
    if (endpoint && method) {
      const key = this.getCacheKey(endpoint, method);
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    let totalHits = 0;
    let entries = 0;

    for (const cached of this.cache.values()) {
      totalHits += cached.hits;
      entries++;
    }

    return {
      entries,
      totalHits,
      size: this.cache.size
    };
  }
}
