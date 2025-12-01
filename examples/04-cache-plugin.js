/**
 * Cache Plugin Example
 *
 * This example demonstrates how to use the cache plugin
 * to cache HTTP responses and improve performance.
 */

import { createClient } from '@fetchmax/core';
import { cachePlugin } from '@fetchmax/plugin-cache';

// Example 1: Basic caching with default TTL
const basicClient = createClient({
  baseURL: 'https://api.example.com'
}).use(cachePlugin({
  ttl: 60000  // Cache for 60 seconds
}));

async function basicCaching() {
  console.log('First request (will hit the server)');
  const response1 = await basicClient.get('/users/1');
  console.log('User:', response1.data);

  console.log('\nSecond request (will use cache)');
  const response2 = await basicClient.get('/users/1');
  console.log('User (cached):', response2.data);

  console.log('\nWait 61 seconds and request again (cache expired, hits server)');
  // After 61 seconds, the cache will be expired
}

// Example 2: Custom cache key strategy
const customKeyClient = createClient({
  baseURL: 'https://api.example.com'
}).use(cachePlugin({
  ttl: 300000,  // 5 minutes
  getCacheKey: (config) => {
    // Custom cache key including query params
    const url = config.url;
    const params = JSON.stringify(config.params || {});
    return `${config.method}:${url}:${params}`;
  }
}));

async function customKeyCaching() {
  // Different query params = different cache entries
  const users1 = await customKeyClient.get('/users', { params: { page: 1 } });
  const users2 = await customKeyClient.get('/users', { params: { page: 2 } });

  console.log('Page 1:', users1.data);
  console.log('Page 2:', users2.data);

  // This will use cache from first request
  const users1Again = await customKeyClient.get('/users', { params: { page: 1 } });
  console.log('Page 1 (cached):', users1Again.data);
}

// Example 3: Per-request cache control
const perRequestClient = createClient({
  baseURL: 'https://api.example.com'
}).use(cachePlugin({
  ttl: 60000
}));

async function perRequestCaching() {
  // Cache this request for 5 minutes
  const response1 = await perRequestClient.get('/users/1', {
    cache: { ttl: 300000 }
  });

  // Don't cache this request at all
  const response2 = await perRequestClient.get('/users/2', {
    cache: false
  });

  // Use default cache settings
  const response3 = await perRequestClient.get('/users/3');

  console.log('User 1 (cached 5min):', response1.data);
  console.log('User 2 (not cached):', response2.data);
  console.log('User 3 (cached 1min):', response3.data);
}

// Example 4: Cache with validation
const validateClient = createClient({
  baseURL: 'https://api.example.com'
}).use(cachePlugin({
  ttl: 60000,
  validate: (cachedResponse) => {
    // Validate cached data before using it
    const age = Date.now() - cachedResponse.cachedAt;
    return age < 60000;  // Use cache only if less than 60s old
  }
}));

async function cacheWithValidation() {
  const response = await validateClient.get('/data');
  console.log('Data:', response.data);
}

// Example 5: Method-specific caching
const methodClient = createClient({
  baseURL: 'https://api.example.com'
}).use(cachePlugin({
  ttl: 60000,
  methods: ['GET', 'HEAD']  // Only cache GET and HEAD requests
}));

async function methodSpecificCaching() {
  // This will be cached
  const getResponse = await methodClient.get('/users');
  console.log('Users (cached):', getResponse.data);

  // This will NOT be cached (POST is not in methods list)
  const postResponse = await methodClient.post('/users', { name: 'John' });
  console.log('Created user (not cached):', postResponse.data);
}

// Example 6: Cache with storage adapter
class LocalStorageAdapter {
  constructor() {
    this.storage = new Map();
  }

  get(key) {
    const item = this.storage.get(key);
    if (!item) return null;

    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.storage.delete(key);
      return null;
    }

    return item.data;
  }

  set(key, value, ttl) {
    this.storage.set(key, {
      data: value,
      expiresAt: Date.now() + ttl
    });
  }

  delete(key) {
    this.storage.delete(key);
  }

  clear() {
    this.storage.clear();
  }
}

const storageClient = createClient({
  baseURL: 'https://api.example.com'
}).use(cachePlugin({
  ttl: 300000,
  storage: new LocalStorageAdapter()
}));

async function cacheWithStorage() {
  const response = await storageClient.get('/users');
  console.log('Users:', response.data);

  // Cache persists even after page reload (if using real localStorage)
}

// Example 7: Programmatic cache management
const managedClient = createClient({
  baseURL: 'https://api.example.com'
}).use(cachePlugin({
  ttl: 60000
}));

async function manageCacheManually() {
  // Fetch and cache
  const response = await managedClient.get('/users/1');
  console.log('User:', response.data);

  // Clear specific cache entry
  managedClient.cache.delete('GET:/users/1');

  // Clear all cache
  managedClient.cache.clear();

  // Next request will hit the server again
  const response2 = await managedClient.get('/users/1');
  console.log('User (fresh from server):', response2.data);
}

// Run examples
async function main() {
  console.log('Cache Plugin Examples\n');

  // Uncomment to test (requires a real API endpoint)
  // await basicCaching();
  // await customKeyCaching();
  // await methodSpecificCaching();
}

main();
