import type { Plugin, PluginContext, HttpResponse } from '@fetchmax/core';

export interface CacheConfig {
  /** Time to live in milliseconds (default: 5 minutes) */
  ttl?: number;
  /** Maximum cache size (default: 100 entries) */
  maxSize?: number;
  /** HTTP methods to cache (default: ['GET']) */
  methods?: string[];
  /** URL patterns to exclude from caching */
  exclude?: (string | RegExp)[];
  /** Storage type: 'memory' or 'localStorage' (default: 'memory') */
  storage?: 'memory' | 'localStorage';
  /** Custom cache key generator */
  keyGenerator?: (request: any) => string;
  /** Enable debug logging */
  debug?: boolean;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  hits: number;
  url: string;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

/**
 * Cache Plugin
 *
 * Caches GET requests to reduce redundant network calls.
 *
 * @example
 * ```ts
 * const cache = cachePlugin({
 *   ttl: 5 * 60 * 1000, // 5 minutes
 *   maxSize: 100
 * });
 *
 * const client = new HttpClient().use(cache);
 *
 * // Clear cache
 * cache.clear();
 *
 * // Invalidate specific URLs
 * cache.invalidate('/api/users');
 * ```
 */
export function cachePlugin(config: CacheConfig = {}): Plugin & {
  clear: () => void;
  invalidate: (pattern: string | RegExp) => void;
  getStats: () => CacheStats;
  getEntry: (key: string) => CacheEntry | undefined;
} {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes
    maxSize = 100,
    methods = ['GET'],
    exclude = [],
    storage = 'memory',
    keyGenerator,
    debug = false
  } = config;

  // Cache storage
  const cache = new Map<string, CacheEntry>();

  // Statistics
  const stats = {
    hits: 0,
    misses: 0,
    size: 0
  };

  /**
   * Generates cache key from request
   */
  function getCacheKey(request: any): string {
    if (keyGenerator) {
      return keyGenerator(request);
    }

    const method = request.method?.toUpperCase() || 'GET';
    const url = request.url || '';
    const params = request.params ? JSON.stringify(request.params) : '';

    return `${method}:${url}:${params}`;
  }

  /**
   * Checks if cache entry is expired
   */
  function isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > ttl;
  }

  /**
   * Checks if URL should be excluded from caching
   */
  function shouldExclude(url: string): boolean {
    return exclude.some(pattern => {
      if (typeof pattern === 'string') {
        return url.includes(pattern);
      }
      return pattern.test(url);
    });
  }

  /**
   * Evicts least recently used entry when cache is full
   */
  function evictLRU(): void {
    if (cache.size < maxSize) return;

    let lruKey: string | null = null;
    let minHits = Infinity;
    let oldestTimestamp = Infinity;

    // Find entry with lowest hits, or oldest if tied
    for (const [key, entry] of cache.entries()) {
      if (entry.hits < minHits || (entry.hits === minHits && entry.timestamp < oldestTimestamp)) {
        minHits = entry.hits;
        oldestTimestamp = entry.timestamp;
        lruKey = key;
      }
    }

    if (lruKey) {
      cache.delete(lruKey);
      if (debug) {
        console.log(`[Cache] Evicted LRU entry: ${lruKey}`);
      }
    }
  }

  /**
   * Removes expired entries from cache
   */
  function cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (now - entry.timestamp > ttl) {
        cache.delete(key);
        if (debug) {
          console.log(`[Cache] Expired entry removed: ${key}`);
        }
      }
    }
    stats.size = cache.size;
  }

  // Periodically clean expired entries
  if (typeof setInterval !== 'undefined') {
    setInterval(cleanExpired, Math.min(ttl, 60000)); // Clean every minute or TTL, whichever is smaller
  }

  const plugin: Plugin & {
    clear: () => void;
    invalidate: (pattern: string | RegExp) => void;
    getStats: () => CacheStats;
    getEntry: (key: string) => CacheEntry | undefined;
  } = {
    name: 'cache',

    async onRequest(request: any, context: PluginContext) {
      // Only cache specific methods
      const method = request.method?.toUpperCase() || 'GET';
      if (!methods.includes(method)) {
        return request;
      }

      // Check if URL should be excluded
      if (shouldExclude(request.url || '')) {
        return request;
      }

      const key = getCacheKey(request);
      const entry = cache.get(key);

      // Cache hit
      if (entry && !isExpired(entry)) {
        stats.hits++;
        entry.hits++;

        if (debug) {
          console.log(`[Cache] HIT: ${request.url} (${entry.hits} hits)`);
        }

        // Return cached data
        return {
          ...request,
          __cached: true,
          __cachedData: entry.data
        };
      }

      // Cache miss
      stats.misses++;

      if (debug) {
        console.log(`[Cache] MISS: ${request.url}`);
      }

      // Store cache key in request for onResponse
      return {
        ...request,
        __cacheKey: key
      };
    },

    async onResponse(response: HttpResponse, config: any, context: PluginContext) {
      // Don't cache if no cache key (excluded or wrong method)
      if (!config.__cacheKey) {
        return response;
      }

      const key = config.__cacheKey;

      // Evict old entries if needed
      evictLRU();

      // Store in cache
      cache.set(key, {
        data: response,
        timestamp: Date.now(),
        hits: 1,
        url: config.url || ''
      });

      stats.size = cache.size;

      if (debug) {
        console.log(`[Cache] STORED: ${config.url} (${cache.size}/${maxSize})`);
      }

      return response;
    },

    /**
     * Clear all cache entries
     */
    clear() {
      cache.clear();
      stats.hits = 0;
      stats.misses = 0;
      stats.size = 0;

      if (debug) {
        console.log('[Cache] Cache cleared');
      }
    },

    /**
     * Invalidate cache entries matching pattern
     */
    invalidate(pattern: string | RegExp) {
      let removed = 0;

      for (const [key, entry] of cache.entries()) {
        const matches =
          typeof pattern === 'string'
            ? entry.url.includes(pattern) || key.includes(pattern)
            : pattern.test(entry.url) || pattern.test(key);

        if (matches) {
          cache.delete(key);
          removed++;
        }
      }

      stats.size = cache.size;

      if (debug) {
        console.log(`[Cache] Invalidated ${removed} entries matching pattern: ${pattern}`);
      }
    },

    /**
     * Get cache statistics
     */
    getStats(): CacheStats {
      return {
        ...stats,
        hitRate: stats.hits / (stats.hits + stats.misses) || 0
      };
    },

    /**
     * Get cached entry by key
     */
    getEntry(key: string): CacheEntry | undefined {
      return cache.get(key);
    }
  };

  return plugin;
}

export default cachePlugin;
