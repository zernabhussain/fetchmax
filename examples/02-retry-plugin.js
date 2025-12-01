/**
 * Retry Plugin Example
 *
 * This example demonstrates how to use the retry plugin
 * to automatically retry failed requests with exponential backoff.
 */

import { createClient } from '@fetchmax/core';
import { retryPlugin } from '@fetchmax/plugin-retry';

// Example 1: Basic retry with defaults
const basicClient = createClient({
  baseURL: 'https://api.example.com'
}).use(retryPlugin({
  maxRetries: 3,           // Retry up to 3 times
  retryDelay: 1000,        // Start with 1 second delay
  backoff: 'exponential'   // 1s, 2s, 4s delays
}));

async function fetchWithBasicRetry() {
  try {
    const response = await basicClient.get('/unreliable-endpoint');
    console.log('Success:', response.data);
  } catch (error) {
    console.error('Failed after retries:', error.message);
  }
}

// Example 2: Linear backoff strategy
const linearClient = createClient({
  baseURL: 'https://api.example.com'
}).use(retryPlugin({
  maxRetries: 3,
  retryDelay: 1000,
  backoff: 'linear'  // 1s, 2s, 3s delays
}));

async function fetchWithLinearBackoff() {
  try {
    const response = await linearClient.get('/data');
    console.log('Data:', response.data);
  } catch (error) {
    console.error('Request failed:', error.message);
  }
}

// Example 3: Custom retry conditions
const customClient = createClient({
  baseURL: 'https://api.example.com'
}).use(retryPlugin({
  maxRetries: 5,
  retryDelay: 500,
  // Only retry on specific status codes
  retryOn: [408, 429, 500, 502, 503, 504],
  // Custom retry logic
  shouldRetry: (error, attempt) => {
    // Don't retry client errors (4xx) except 408 and 429
    if (error.status >= 400 && error.status < 500) {
      return error.status === 408 || error.status === 429;
    }
    // Always retry server errors (5xx)
    return error.status >= 500;
  }
}));

async function fetchWithCustomRetry() {
  try {
    const response = await customClient.get('/api/data');
    console.log('Data:', response.data);
  } catch (error) {
    console.error('All retries exhausted:', error.message);
  }
}

// Example 4: Retry with callback
const callbackClient = createClient({
  baseURL: 'https://api.example.com'
}).use(retryPlugin({
  maxRetries: 3,
  retryDelay: 1000,
  backoff: 'exponential',
  // Monitor retry attempts
  onRetry: (attempt, error, delay) => {
    console.log(`Retry attempt ${attempt} after ${delay}ms`);
    console.log(`Reason: ${error.message}`);
  }
}));

async function fetchWithCallback() {
  try {
    const response = await callbackClient.get('/data');
    console.log('Success:', response.data);
  } catch (error) {
    console.error('Final error:', error.message);
  }
}

// Example 5: Retry only GET requests
const getOnlyClient = createClient({
  baseURL: 'https://api.example.com'
}).use(retryPlugin({
  maxRetries: 3,
  retryDelay: 1000,
  methods: ['GET', 'HEAD', 'OPTIONS']  // Only retry safe methods
}));

async function safeRetry() {
  // This will retry
  const response1 = await getOnlyClient.get('/data');
  console.log('GET succeeded:', response1.data);

  // This will NOT retry (POST is not in the methods list)
  try {
    const response2 = await getOnlyClient.post('/data', { value: 1 });
    console.log('POST succeeded:', response2.data);
  } catch (error) {
    console.error('POST failed (no retry):', error.message);
  }
}

// Example 6: Network errors handling
const networkClient = createClient({
  baseURL: 'https://api.example.com'
}).use(retryPlugin({
  maxRetries: 5,
  retryDelay: 2000,
  backoff: 'exponential',
  onRetry: (attempt, error, delay) => {
    if (error.code === 'NETWORK_ERROR') {
      console.log(`Network error, retrying in ${delay}ms...`);
    }
  }
}));

async function handleNetworkErrors() {
  try {
    const response = await networkClient.get('/data');
    console.log('Data:', response.data);
  } catch (error) {
    if (error.code === 'NETWORK_ERROR') {
      console.error('Network is unreachable');
    } else {
      console.error('Request failed:', error.message);
    }
  }
}

// Run examples
async function main() {
  console.log('Retry Plugin Examples\n');

  // Uncomment to test (requires a real API endpoint)
  // await fetchWithBasicRetry();
  // await fetchWithLinearBackoff();
  // await fetchWithCustomRetry();
  // await fetchWithCallback();
}

main();
