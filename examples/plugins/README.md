# FetchMax Plugin Examples

This directory contains real-world examples for all FetchMax plugins.

## Table of Contents

- [Retry Plugin](#retry-plugin)
- [Cache Plugin](#cache-plugin)
- [Interceptors Plugin](#interceptors-plugin)
- [Timeout Plugin](#timeout-plugin)
- [Logger Plugin](#logger-plugin)
- [Rate Limit Plugin](#rate-limit-plugin)
- [Progress Plugin](#progress-plugin)
- [Dedupe Plugin](#dedupe-plugin)
- [Transform Plugin](#transform-plugin)
- [Combined Plugins](#combined-plugins)

---

## Retry Plugin

### Basic Retry with Exponential Backoff

```typescript
import { HttpClient } from '@fetchmax/core';
import { retryPlugin } from '@fetchmax/plugin-retry';

const client = new HttpClient({
  baseURL: 'https://api.example.com'
}).use(retryPlugin({
  maxRetries: 3,
  retryDelay: 1000,
  backoff: 'exponential' // 1s, 2s, 4s
}));

const response = await client.get('/users');
// Automatically retries on 5xx errors with exponential backoff
```

### Custom Retry Logic

```typescript
const client = new HttpClient({
  baseURL: 'https://api.example.com'
}).use(retryPlugin({
  maxRetries: 5,
  retryDelay: 500,
  shouldRetry: (error, attempt, config) => {
    // Only retry on specific status codes
    if (error.status === 429) return true; // Rate limited
    if (error.status === 503) return true; // Service unavailable
    if (error.status >= 500) return true; // Server errors
    return false;
  },
  onRetry: (attempt, error, config) => {
    console.log(`Retry attempt ${attempt} for ${config.url}`);
  }
}));
```

### Retry with Linear Backoff

```typescript
const client = new HttpClient()
  .use(retryPlugin({
    maxRetries: 3,
    retryDelay: 2000,
    backoff: 'linear', // 2s, 4s, 6s
    methods: ['GET', 'PUT', 'DELETE'] // Only retry safe methods
  }));
```

---

## Cache Plugin

### Basic Caching

```typescript
import { HttpClient } from '@fetchmax/core';
import { cachePlugin } from '@fetchmax/plugin-cache';

const client = new HttpClient({
  baseURL: 'https://api.example.com'
}).use(cachePlugin({
  ttl: 60000, // Cache for 1 minute
  maxSize: 100 // Keep up to 100 cached responses
}));

// First call - fetches from API
const response1 = await client.get('/users');

// Second call within 1 minute - returns from cache
const response2 = await client.get('/users');
```

### LocalStorage Caching

```typescript
const client = new HttpClient()
  .use(cachePlugin({
    ttl: 3600000, // 1 hour
    storage: 'localStorage', // Persist across page reloads
    keyPrefix: 'myapp-' // Namespace for localStorage keys
  }));
```

### Cache with Exclusions

```typescript
const client = new HttpClient()
  .use(cachePlugin({
    ttl: 300000, // 5 minutes
    exclude: [
      '/auth/login',
      '/auth/logout',
      /^\/admin\//,  // Regex: exclude all /admin/* endpoints
      (url) => url.includes('private') // Custom function
    ]
  }));
```

### Cache Statistics

```typescript
const cache = cachePlugin({ ttl: 60000, debug: true });
const client = new HttpClient().use(cache);

await client.get('/users');
await client.get('/users'); // Cache hit
await client.get('/posts');

const stats = cache.getStats();
console.log(`
  Hits: ${stats.hits}
  Misses: ${stats.misses}
  Hit Rate: ${stats.hitRate}%
  Size: ${stats.size}
`);

// Clear cache
cache.clear();

// Invalidate specific URL
cache.invalidate('/users');
```

---

## Interceptors Plugin

### Authentication Token Injection

```typescript
import { HttpClient } from '@fetchmax/core';
import { interceptorsPlugin } from '@fetchmax/plugin-interceptors';

const client = new HttpClient({
  baseURL: 'https://api.example.com'
}).use(interceptorsPlugin());

// Add auth token to all requests
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${token}`
    };
  }
  return config;
});

// Now all requests include the auth token
await client.get('/protected/data');
```

### Token Refresh on 401

```typescript
const client = new HttpClient({
  baseURL: 'https://api.example.com'
}).use(interceptorsPlugin());

// Handle 401 errors and refresh token
client.interceptors.error.use(async (error, config) => {
  if (error.status === 401 && !config._retry) {
    config._retry = true;

    // Refresh the token
    const newToken = await refreshAuthToken();
    localStorage.setItem('auth_token', newToken);

    // Retry the original request with new token
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${newToken}`
    };

    return { retry: true };
  }

  throw error;
});
```

### Request/Response Logging

```typescript
const client = new HttpClient()
  .use(interceptorsPlugin());

// Log all requests
client.interceptors.request.use((config) => {
  console.log(`→ ${config.method} ${config.url}`);
  return config;
});

// Log all responses
client.interceptors.response.use((response) => {
  console.log(`← ${response.status} ${response.config.url}`);
  return response;
});
```

### Data Transformation

```typescript
const client = new HttpClient()
  .use(interceptorsPlugin());

// Transform snake_case to camelCase
client.interceptors.response.use((response) => {
  if (response.data && typeof response.data === 'object') {
    response.data = snakeToCamel(response.data);
  }
  return response;
});

// Transform camelCase to snake_case for requests
client.interceptors.request.use((config) => {
  if (config.body && typeof config.body === 'object') {
    config.body = camelToSnake(config.body);
  }
  return config;
});
```

### Removing Interceptors

```typescript
const client = new HttpClient()
  .use(interceptorsPlugin());

// Add interceptor and keep the ID
const id = client.interceptors.request.use((config) => {
  console.log('Intercepted:', config.url);
  return config;
});

// Later, remove it
client.interceptors.request.eject(id);

// Or clear all interceptors
client.interceptors.request.clear();
```

---

## Timeout Plugin

### Global Timeout

```typescript
import { HttpClient } from '@fetchmax/core';
import { timeoutPlugin } from '@fetchmax/plugin-timeout';

const client = new HttpClient({
  baseURL: 'https://api.example.com'
}).use(timeoutPlugin({
  timeout: 5000, // 5 seconds for all requests
  message: 'Request took too long'
}));

try {
  const response = await client.get('/slow-endpoint');
} catch (error) {
  if (error.name === 'TimeoutError') {
    console.log('Request timed out after 5 seconds');
  }
}
```

### Per-Request Timeout

```typescript
const client = new HttpClient()
  .use(timeoutPlugin({ timeout: 10000 })); // Default 10s

// Override timeout for specific request
const response = await client.get('/quick-endpoint', {
  timeout: 2000 // 2 seconds for this request only
});
```

### With Retry Plugin

```typescript
const client = new HttpClient()
  .use(timeoutPlugin({ timeout: 5000 }))
  .use(retryPlugin({ maxRetries: 3 }));

// Automatically retries if timeout occurs
const response = await client.get('/endpoint');
```

---

## Logger Plugin

### Basic Logging

```typescript
import { HttpClient } from '@fetchmax/core';
import { loggerPlugin } from '@fetchmax/plugin-logger';

const client = new HttpClient({
  baseURL: 'https://api.example.com'
}).use(loggerPlugin({
  logRequests: true,
  logResponses: true,
  logErrors: true
}));

// Logs:
// → GET https://api.example.com/users
// ← 200 GET https://api.example.com/users (125ms)
await client.get('/users');
```

### Verbose Logging

```typescript
const client = new HttpClient()
  .use(loggerPlugin({
    verbose: true, // Include headers and body
    colors: true,  // ANSI color output
    logRequests: true,
    logResponses: true
  }));
```

### Custom Logger

```typescript
const client = new HttpClient()
  .use(loggerPlugin({
    logger: (message) => {
      // Send to your logging service
      myLoggingService.log(message);
    }
  }));
```

### Filtering Logs

```typescript
const client = new HttpClient()
  .use(loggerPlugin({
    filter: (url) => {
      // Don't log health checks or tracking endpoints
      if (url.includes('/health')) return false;
      if (url.includes('/analytics')) return false;
      return true;
    }
  }));
```

---

## Rate Limit Plugin

### Basic Rate Limiting

```typescript
import { HttpClient } from '@fetchmax/core';
import { rateLimitPlugin } from '@fetchmax/plugin-rate-limit';

const client = new HttpClient({
  baseURL: 'https://api.example.com'
}).use(rateLimitPlugin({
  maxRequests: 10,
  timeWindow: 1000 // 10 requests per second
}));

// First 10 requests execute immediately
// Requests 11+ are queued and executed when window resets
for (let i = 0; i < 20; i++) {
  client.get(`/users/${i}`); // Automatic queuing
}
```

### With Queue Size Limit

```typescript
const client = new HttpClient()
  .use(rateLimitPlugin({
    maxRequests: 5,
    timeWindow: 60000, // 5 requests per minute
    maxQueueSize: 10,  // Queue up to 10 requests
    queueRequests: true
  }));

try {
  // If queue is full, throws error
  await client.get('/endpoint');
} catch (error) {
  if (error.message.includes('queue is full')) {
    console.log('Too many pending requests');
  }
}
```

### Rate Limit Callback

```typescript
const client = new HttpClient()
  .use(rateLimitPlugin({
    maxRequests: 100,
    timeWindow: 60000, // 100 requests per minute
    onRateLimit: (queueSize) => {
      console.log(`Rate limited. Queue size: ${queueSize}`);
      // Update UI to show rate limit status
      updateRateLimitIndicator(queueSize);
    }
  }));
```

### Get Queue Statistics

```typescript
const rateLimit = rateLimitPlugin({
  maxRequests: 10,
  timeWindow: 1000
});

const client = new HttpClient().use(rateLimit);

// Make some requests
await client.get('/users');

// Check stats
const stats = rateLimit.getStats();
console.log(`Queue size: ${stats.queueSize}`);

// Reset if needed
rateLimit.reset();
```

---

## Progress Plugin

### Download Progress

```typescript
import { HttpClient } from '@fetchmax/core';
import { progressPlugin } from '@fetchmax/plugin-progress';

const client = new HttpClient({
  baseURL: 'https://api.example.com'
}).use(progressPlugin());

const response = await client.get('/large-file.zip', {
  onDownloadProgress: (progress) => {
    console.log(`
      Downloaded: ${progress.loadedFormatted} / ${progress.totalFormatted}
      Percentage: ${progress.percentage}%
    `);

    // Update progress bar
    updateProgressBar(progress.percentage);
  }
});
```

### Upload Progress

```typescript
const client = new HttpClient()
  .use(progressPlugin());

const formData = new FormData();
formData.append('file', fileInput.files[0]);

await client.post('/upload', formData, {
  onUploadProgress: (progress) => {
    console.log(`Uploading: ${progress.percentage}%`);
  }
});
```

---

## Dedupe Plugin

### Basic Deduplication

```typescript
import { HttpClient } from '@fetchmax/core';
import { dedupePlugin } from '@fetchmax/plugin-dedupe';

const client = new HttpClient({
  baseURL: 'https://api.example.com'
}).use(dedupePlugin());

// These 3 concurrent requests will only trigger 1 HTTP request
const [response1, response2, response3] = await Promise.all([
  client.get('/users'),
  client.get('/users'),
  client.get('/users')
]);

// All three get the same response
console.log(response1.data === response2.data); // true
```

### With Debug Logging

```typescript
const client = new HttpClient()
  .use(dedupePlugin({ debug: true }));

// Logs:
// [Dedupe] Request already in flight: https://api.example.com/users
await Promise.all([
  client.get('/users'),
  client.get('/users')
]);
```

### Manual Cache Control

```typescript
const dedupe = dedupePlugin();
const client = new HttpClient().use(dedupe);

await client.get('/users');

// Clear dedupe cache if needed
dedupe.clear();
```

---

## Transform Plugin

### Snake Case to Camel Case

```typescript
import { HttpClient } from '@fetchmax/core';
import { transformPlugin, transforms } from '@fetchmax/plugin-transform';

const client = new HttpClient({
  baseURL: 'https://api.example.com'
}).use(transformPlugin({
  transformResponse: transforms.snakeToCamel
}));

// API returns: { user_name: "John", created_at: "2025-01-01" }
const response = await client.get('/user');
// response.data is: { userName: "John", createdAt: "2025-01-01" }
```

### Camel Case to Snake Case

```typescript
const client = new HttpClient()
  .use(transformPlugin({
    transformRequest: transforms.camelToSnake
  }));

// Send: { userName: "John", createdAt: "2025-01-01" }
await client.post('/user', {
  userName: "John",
  createdAt: "2025-01-01"
});
// API receives: { user_name: "John", created_at: "2025-01-01" }
```

### Bidirectional Transformation

```typescript
const client = new HttpClient()
  .use(transformPlugin({
    transformRequest: transforms.camelToSnake,
    transformResponse: transforms.snakeToCamel
  }));

// Client uses camelCase, API uses snake_case
const response = await client.post('/users', {
  firstName: "John",
  lastName: "Doe"
});
// API receives: { first_name: "John", last_name: "Doe" }
// response.data returns: { userId: 123, createdAt: "2025-01-01" }
```

### Custom Transformation

```typescript
const client = new HttpClient()
  .use(transformPlugin({
    transformResponse: (data, headers) => {
      // Add metadata from headers
      return {
        ...data,
        _metadata: {
          contentType: headers.get('content-type'),
          timestamp: new Date().toISOString()
        }
      };
    }
  }));
```

---

## Combined Plugins

### Production Setup

```typescript
import { HttpClient } from '@fetchmax/core';
import { retryPlugin } from '@fetchmax/plugin-retry';
import { cachePlugin } from '@fetchmax/plugin-cache';
import { timeoutPlugin } from '@fetchmax/plugin-timeout';
import { loggerPlugin } from '@fetchmax/plugin-logger';
import { interceptorsPlugin } from '@fetchmax/plugin-interceptors';
import { transformPlugin, transforms } from '@fetchmax/plugin-transform';

const client = new HttpClient({
  baseURL: 'https://api.example.com'
})
  .use(loggerPlugin({
    logRequests: process.env.NODE_ENV === 'development',
    logResponses: process.env.NODE_ENV === 'development',
    logErrors: true
  }))
  .use(timeoutPlugin({ timeout: 10000 }))
  .use(retryPlugin({
    maxRetries: 3,
    retryDelay: 1000,
    backoff: 'exponential'
  }))
  .use(cachePlugin({
    ttl: 300000, // 5 minutes
    maxSize: 100,
    exclude: ['/auth/', '/admin/']
  }))
  .use(transformPlugin({
    transformRequest: transforms.camelToSnake,
    transformResponse: transforms.snakeToCamel
  }))
  .use(interceptorsPlugin());

// Add auth interceptor
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${token}`
    };
  }
  return config;
});

// Handle token refresh
client.interceptors.error.use(async (error, config) => {
  if (error.status === 401 && !config._retry) {
    config._retry = true;
    const newToken = await refreshToken();
    localStorage.setItem('token', newToken);
    return { retry: true };
  }
  throw error;
});

export default client;
```

### File Upload with Progress

```typescript
const client = new HttpClient()
  .use(timeoutPlugin({ timeout: 300000 })) // 5 minutes for large files
  .use(progressPlugin())
  .use(loggerPlugin({ logRequests: true }));

async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await client.post('/upload', formData, {
      onUploadProgress: (progress) => {
        console.log(`Upload: ${progress.percentage}%`);
        updateUI(progress);
      }
    });

    return response.data;
  } catch (error) {
    if (error.name === 'TimeoutError') {
      console.error('Upload timed out');
    }
    throw error;
  }
}
```

### High-Traffic API Client

```typescript
const client = new HttpClient({
  baseURL: 'https://api.high-traffic.com'
})
  .use(rateLimitPlugin({
    maxRequests: 100,
    timeWindow: 60000, // 100 requests per minute
    maxQueueSize: 50
  }))
  .use(dedupePlugin())
  .use(cachePlugin({
    ttl: 60000,
    maxSize: 200
  }))
  .use(retryPlugin({
    maxRetries: 3,
    shouldRetry: (error) => error.status === 429 || error.status >= 500
  }))
  .use(timeoutPlugin({ timeout: 5000 }));
```

---

## Best Practices

### 1. Plugin Order Matters

```typescript
// ✅ Good: Logger first to see all requests
const client = new HttpClient()
  .use(loggerPlugin())
  .use(retryPlugin())
  .use(cachePlugin());

// ❌ Bad: Logger after cache won't log cached responses
const client = new HttpClient()
  .use(cachePlugin())
  .use(loggerPlugin());
```

### 2. Cache + Retry

```typescript
// Cache before retry to avoid retrying cached responses
const client = new HttpClient()
  .use(cachePlugin({ ttl: 60000 }))
  .use(retryPlugin({ maxRetries: 3 }));
```

### 3. Timeout + Retry

```typescript
// Set timeout lower than total retry time
const client = new HttpClient()
  .use(timeoutPlugin({ timeout: 5000 }))
  .use(retryPlugin({
    maxRetries: 3,
    retryDelay: 1000
  }));
// Total possible time: 5s + (1s + 2s + 4s) = 12s
```

### 4. Transform + Interceptors

```typescript
// Transform happens before interceptors
const client = new HttpClient()
  .use(transformPlugin({ transformRequest: transforms.camelToSnake }))
  .use(interceptorsPlugin());

// Interceptor sees transformed data
client.interceptors.request.use((config) => {
  console.log(config.body); // Already in snake_case
  return config;
});
```

---

For more examples, see the [test files](../../tests) which demonstrate all plugin features with comprehensive test coverage.
