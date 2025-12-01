/**
 * FetchMax Basic Usage Examples
 *
 * This file demonstrates the core features of FetchMax HTTP client.
 */

import { HttpClient } from '../../packages/core/src';
import { retryPlugin } from '../../packages/plugins/retry/src';
import { cachePlugin } from '../../packages/plugins/cache/src';
import { interceptorPlugin } from '../../packages/plugins/interceptors/src';
import { loggerPlugin } from '../../packages/plugins/logger/src';
import { timeoutPlugin } from '../../packages/plugins/timeout/src';

// =============================================================================
// Example 1: Basic HTTP Requests
// =============================================================================

async function basicRequests() {
  console.log('\n=== Example 1: Basic HTTP Requests ===\n');

  const client = new HttpClient({
    baseURL: 'https://jsonplaceholder.typicode.com'
  });

  // GET request
  const users = await client.get('/users');
  console.log('Users:', users.data.slice(0, 2));

  // GET with query parameters
  const filteredPosts = await client.get('/posts', {
    params: { userId: 1 }
  });
  console.log('User 1 posts:', filteredPosts.data.length);

  // POST request
  const newPost = await client.post('/posts', {
    title: 'My New Post',
    body: 'This is the content',
    userId: 1
  });
  console.log('Created post:', newPost.data);

  // PUT request
  const updatedPost = await client.put('/posts/1', {
    id: 1,
    title: 'Updated Title',
    body: 'Updated content',
    userId: 1
  });
  console.log('Updated post:', updatedPost.data);

  // DELETE request
  await client.delete('/posts/1');
  console.log('Post deleted');
}

// =============================================================================
// Example 2: Error Handling
// =============================================================================

async function errorHandling() {
  console.log('\n=== Example 2: Error Handling ===\n');

  const client = new HttpClient({
    baseURL: 'https://jsonplaceholder.typicode.com'
  });

  try {
    await client.get('/users/999999');
  } catch (error: any) {
    console.log('Error caught:');
    console.log('- Status:', error.status);
    console.log('- Message:', error.message);
    console.log('- Type:', error.name);
  }
}

// =============================================================================
// Example 3: Using Retry Plugin
// =============================================================================

async function retryExample() {
  console.log('\n=== Example 3: Retry Plugin ===\n');

  const client = new HttpClient({
    baseURL: 'https://jsonplaceholder.typicode.com'
  }).use(
    retryPlugin({
      maxRetries: 3,
      retryDelay: 1000,
      backoff: 'exponential',
      onRetry: (attempt, error, delay) => {
        console.log(`Retry attempt ${attempt} after ${delay}ms`);
      }
    })
  );

  // This will work normally
  const response = await client.get('/users/1');
  console.log('User fetched:', response.data.name);
}

// =============================================================================
// Example 4: Using Cache Plugin
// =============================================================================

async function cacheExample() {
  console.log('\n=== Example 4: Cache Plugin ===\n');

  const cache = cachePlugin({
    ttl: 5000, // 5 seconds
    debug: true
  });

  const client = new HttpClient({
    baseURL: 'https://jsonplaceholder.typicode.com'
  }).use(cache);

  // First request - will hit network
  console.log('First request...');
  await client.get('/users/1');

  // Second request - will use cache
  console.log('\nSecond request (should use cache)...');
  await client.get('/users/1');

  // Get cache stats
  const stats = cache.getStats();
  console.log('\nCache stats:', {
    hits: stats.hits,
    misses: stats.misses,
    hitRate: `${(stats.hitRate * 100).toFixed(2)}%`
  });

  // Clear cache
  cache.clear();
  console.log('\nCache cleared');
}

// =============================================================================
// Example 5: Using Interceptors
// =============================================================================

async function interceptorsExample() {
  console.log('\n=== Example 5: Interceptors Plugin ===\n');

  const interceptors = interceptorPlugin();

  const client = new HttpClient({
    baseURL: 'https://jsonplaceholder.typicode.com'
  }).use(interceptors);

  // Add request interceptor (add timestamp to all requests)
  interceptors.request.use((config) => {
    console.log(`📤 Request to: ${config.url}`);
    config.headers = {
      ...config.headers,
      'X-Request-Time': new Date().toISOString()
    };
    return config;
  });

  // Add response interceptor (log response time)
  let requestStartTime: number;
  interceptors.request.use((config) => {
    requestStartTime = Date.now();
    return config;
  });

  interceptors.response.use((response) => {
    const duration = Date.now() - requestStartTime;
    console.log(`📥 Response in ${duration}ms`);
    return response;
  });

  // Make some requests
  await client.get('/users/1');
  await client.get('/posts/1');
}

// =============================================================================
// Example 6: Combining Multiple Plugins
// =============================================================================

async function multiplePluginsExample() {
  console.log('\n=== Example 6: Multiple Plugins ===\n');

  const client = new HttpClient({
    baseURL: 'https://jsonplaceholder.typicode.com'
  })
    .use(
      loggerPlugin({
        verbose: false,
        logRequests: true,
        logResponses: true
      })
    )
    .use(
      retryPlugin({
        maxRetries: 2,
        retryDelay: 500
      })
    )
    .use(
      cachePlugin({
        ttl: 10000
      })
    )
    .use(
      timeoutPlugin({
        timeout: 5000
      })
    );

  console.log('Fetching user...');
  await client.get('/users/1');

  console.log('\nFetching same user again (cached)...');
  await client.get('/users/1');
}

// =============================================================================
// Example 7: Creating Client Instances
// =============================================================================

async function clientInstancesExample() {
  console.log('\n=== Example 7: Client Instances ===\n');

  // Parent client with base config
  const parentClient = new HttpClient({
    baseURL: 'https://jsonplaceholder.typicode.com',
    headers: {
      'X-App': 'FetchMax Example'
    }
  }).use(
    loggerPlugin({
      verbose: false
    })
  );

  // Child client inherits config and plugins
  const usersClient = parentClient.create({
    baseURL: 'https://jsonplaceholder.typicode.com/users'
  });

  const postsClient = parentClient.create({
    baseURL: 'https://jsonplaceholder.typicode.com/posts'
  });

  // Use specific clients
  console.log('Fetching from users endpoint...');
  await usersClient.get('/1');

  console.log('\nFetching from posts endpoint...');
  await postsClient.get('/1');
}

// =============================================================================
// Example 8: Advanced Configuration
// =============================================================================

async function advancedConfigExample() {
  console.log('\n=== Example 8: Advanced Configuration ===\n');

  const client = new HttpClient({
    baseURL: 'https://jsonplaceholder.typicode.com',
    headers: {
      'User-Agent': 'FetchMax/1.0',
      'Accept': 'application/json'
    },
    timeout: 10000
  });

  // Override config per request
  const response = await client.get('/users/1', {
    headers: {
      'X-Custom-Header': 'value'
    },
    params: {
      _embed: 'posts'
    }
  });

  console.log('User with custom config:', response.data.name);
  console.log('Response status:', response.status);
  console.log('Response headers:', Object.fromEntries(response.headers.entries()));
}

// =============================================================================
// Run All Examples
// =============================================================================

async function runExamples() {
  try {
    await basicRequests();
    await errorHandling();
    await retryExample();
    await cacheExample();
    await interceptorsExample();
    await multiplePluginsExample();
    await clientInstancesExample();
    await advancedConfigExample();

    console.log('\n✅ All examples completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runExamples();
}

export {
  basicRequests,
  errorHandling,
  retryExample,
  cacheExample,
  interceptorsExample,
  multiplePluginsExample,
  clientInstancesExample,
  advancedConfigExample
};
