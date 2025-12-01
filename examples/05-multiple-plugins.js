/**
 * Multiple Plugins Example
 *
 * This example shows how to combine multiple plugins
 * for a production-ready HTTP client setup.
 */

import { createClient } from '@fetchmax/core';
import { authPlugin } from '@fetchmax/plugin-auth';
import { retryPlugin } from '@fetchmax/plugin-retry';
import { cachePlugin } from '@fetchmax/plugin-cache';
import { timeoutPlugin } from '@fetchmax/plugin-timeout';
import { loggerPlugin } from '@fetchmax/plugin-logger';
import { dedupPlugin } from '@fetchmax/plugin-dedup';

// Example 1: Complete production client
const productionClient = createClient({
  baseURL: 'https://api.example.com',
  headers: {
    'Content-Type': 'application/json'
  }
})
  // Add authentication
  .use(authPlugin({
    type: 'bearer',
    getToken: async () => {
      // Get token from your auth service
      return localStorage.getItem('auth_token');
    }
  }))
  // Add request deduplication
  .use(dedupPlugin({
    ttl: 1000  // Deduplicate identical requests within 1 second
  }))
  // Add caching
  .use(cachePlugin({
    ttl: 300000,  // 5 minutes
    methods: ['GET', 'HEAD']
  }))
  // Add retry with backoff
  .use(retryPlugin({
    maxRetries: 3,
    retryDelay: 1000,
    backoff: 'exponential',
    retryOn: [408, 429, 500, 502, 503, 504],
    onRetry: (attempt, error, delay) => {
      console.log(`Retry ${attempt} after ${delay}ms: ${error.message}`);
    }
  }))
  // Add timeout
  .use(timeoutPlugin({
    timeout: 30000  // 30 seconds
  }))
  // Add logging
  .use(loggerPlugin({
    logRequest: true,
    logResponse: true,
    logError: true
  }));

async function productionExample() {
  try {
    // This request will:
    // 1. Add Bearer token
    // 2. Check for duplicates
    // 3. Check cache
    // 4. Set 30s timeout
    // 5. Retry up to 3 times if it fails
    // 6. Log everything
    const response = await productionClient.get('/users');
    console.log('Users:', response.data);
  } catch (error) {
    console.error('Request failed:', error.message);
  }
}

// Example 2: API client with different configs for different endpoints
class APIClient {
  constructor(baseURL, authToken) {
    // Base client with common plugins
    const baseClient = createClient({ baseURL })
      .use(authPlugin({
        type: 'bearer',
        token: authToken
      }))
      .use(loggerPlugin({
        logRequest: true,
        logResponse: true
      }));

    // Client for read operations (with cache)
    this.read = baseClient
      .create()
      .use(cachePlugin({
        ttl: 60000
      }))
      .use(retryPlugin({
        maxRetries: 3,
        retryDelay: 1000
      }));

    // Client for write operations (no cache, more retries)
    this.write = baseClient
      .create()
      .use(retryPlugin({
        maxRetries: 5,
        retryDelay: 2000,
        backoff: 'exponential',
        methods: []  // Don't retry write operations by default
      }));

    // Client for critical operations (no retry, low timeout)
    this.critical = baseClient
      .create()
      .use(timeoutPlugin({
        timeout: 5000  // 5 seconds
      }));
  }

  // Read operations
  async getUsers() {
    return this.read.get('/users');
  }

  async getUser(id) {
    return this.read.get(`/users/${id}`);
  }

  // Write operations
  async createUser(data) {
    return this.write.post('/users', data);
  }

  async updateUser(id, data) {
    return this.write.put(`/users/${id}`, data);
  }

  // Critical operations
  async processPayment(data) {
    return this.critical.post('/payments', data);
  }
}

async function apiClientExample() {
  const api = new APIClient('https://api.example.com', 'your-token');

  // Read with cache and retry
  const users = await api.getUsers();
  console.log('Users:', users.data);

  // Write with retry
  const newUser = await api.createUser({ name: 'John Doe' });
  console.log('Created:', newUser.data);

  // Critical operation with low timeout
  const payment = await api.processPayment({ amount: 100 });
  console.log('Payment:', payment.data);
}

// Example 3: Plugin execution order matters
const orderClient = createClient({
  baseURL: 'https://api.example.com'
})
  // 1. Dedup first - prevent duplicate requests
  .use(dedupPlugin())
  // 2. Cache second - check cache before retry
  .use(cachePlugin({ ttl: 60000 }))
  // 3. Auth third - add auth headers
  .use(authPlugin({ type: 'bearer', token: 'token' }))
  // 4. Retry fourth - retry with auth headers
  .use(retryPlugin({ maxRetries: 3 }))
  // 5. Timeout last - overall timeout including retries
  .use(timeoutPlugin({ timeout: 30000 }))
  // 6. Logger last - log everything
  .use(loggerPlugin());

async function pluginOrderExample() {
  // Execution flow:
  // Request → Dedup → Cache → Auth → Retry → Timeout → Network → Logger
  const response = await orderClient.get('/data');
  console.log('Data:', response.data);
}

// Example 4: Environment-specific configuration
function createAPIClient(env) {
  const config = {
    development: {
      baseURL: 'http://localhost:3000',
      cache: { ttl: 10000 },  // Short cache in dev
      retry: { maxRetries: 1 },  // Few retries in dev
      timeout: { timeout: 60000 },  // Long timeout in dev
      logger: { logRequest: true, logResponse: true }
    },
    staging: {
      baseURL: 'https://staging-api.example.com',
      cache: { ttl: 60000 },
      retry: { maxRetries: 3, retryDelay: 1000 },
      timeout: { timeout: 30000 },
      logger: { logRequest: true, logError: true }
    },
    production: {
      baseURL: 'https://api.example.com',
      cache: { ttl: 300000 },  // Long cache in prod
      retry: { maxRetries: 5, retryDelay: 2000, backoff: 'exponential' },
      timeout: { timeout: 30000 },
      logger: { logError: true }  // Only log errors in prod
    }
  };

  const envConfig = config[env];

  return createClient({ baseURL: envConfig.baseURL })
    .use(authPlugin({ type: 'bearer', getToken: () => getAuthToken() }))
    .use(dedupPlugin())
    .use(cachePlugin(envConfig.cache))
    .use(retryPlugin(envConfig.retry))
    .use(timeoutPlugin(envConfig.timeout))
    .use(loggerPlugin(envConfig.logger));
}

function getAuthToken() {
  // Get token from storage
  return localStorage.getItem('token') || '';
}

async function environmentExample() {
  const client = createAPIClient(process.env.NODE_ENV || 'development');

  const response = await client.get('/data');
  console.log('Data:', response.data);
}

// Example 5: Conditional plugin loading
function createConditionalClient(options = {}) {
  let client = createClient({
    baseURL: options.baseURL || 'https://api.example.com'
  });

  // Always add auth if token provided
  if (options.token) {
    client = client.use(authPlugin({
      type: 'bearer',
      token: options.token
    }));
  }

  // Add cache only if enabled
  if (options.enableCache) {
    client = client.use(cachePlugin({
      ttl: options.cacheTTL || 60000
    }));
  }

  // Add retry only if enabled
  if (options.enableRetry) {
    client = client.use(retryPlugin({
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000
    }));
  }

  // Add logging in development
  if (options.debug || process.env.NODE_ENV === 'development') {
    client = client.use(loggerPlugin({
      logRequest: true,
      logResponse: true,
      logError: true
    }));
  }

  return client;
}

async function conditionalExample() {
  // Client with all features
  const fullClient = createConditionalClient({
    token: 'my-token',
    enableCache: true,
    enableRetry: true,
    debug: true
  });

  // Minimal client
  const minimalClient = createConditionalClient({
    baseURL: 'https://api.example.com'
  });

  const response = await fullClient.get('/data');
  console.log('Data:', response.data);
}

// Run examples
async function main() {
  console.log('Multiple Plugins Examples\n');

  // Uncomment to test
  // await productionExample();
  // await apiClientExample();
  // await environmentExample();
}

main();
