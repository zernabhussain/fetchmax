/**
 * Auth Plugin Example
 *
 * This example shows how to use the auth plugin for handling
 * authentication with various strategies.
 */

import { createClient } from '@fetchmax/core';
import { authPlugin } from '@fetchmax/plugin-auth';

// Example 1: Bearer Token Authentication
const bearerClient = createClient({
  baseURL: 'https://api.example.com'
}).use(authPlugin({
  type: 'bearer',
  token: 'your-access-token-here'
}));

async function fetchWithBearerToken() {
  try {
    // Automatically adds: Authorization: Bearer your-access-token-here
    const response = await bearerClient.get('/protected/user');
    console.log('User data:', response.data);
  } catch (error) {
    console.error('Auth failed:', error.message);
  }
}

// Example 2: Basic Authentication
const basicClient = createClient({
  baseURL: 'https://api.example.com'
}).use(authPlugin({
  type: 'basic',
  username: 'user@example.com',
  password: 'secret-password'
}));

async function fetchWithBasicAuth() {
  try {
    const response = await basicClient.get('/api/data');
    console.log('Data:', response.data);
  } catch (error) {
    console.error('Auth failed:', error.message);
  }
}

// Example 3: API Key Authentication
const apiKeyClient = createClient({
  baseURL: 'https://api.example.com'
}).use(authPlugin({
  type: 'api-key',
  key: 'x-api-key',
  value: 'your-api-key-here'
}));

async function fetchWithApiKey() {
  try {
    // Automatically adds: x-api-key: your-api-key-here
    const response = await apiKeyClient.get('/data');
    console.log('Data:', response.data);
  } catch (error) {
    console.error('Request failed:', error.message);
  }
}

// Example 4: Dynamic Token (for refreshing tokens)
let currentToken = 'initial-token';

const dynamicClient = createClient({
  baseURL: 'https://api.example.com'
}).use(authPlugin({
  type: 'bearer',
  getToken: async () => {
    // Fetch token dynamically (e.g., from storage or refresh)
    return currentToken;
  }
}));

async function fetchWithDynamicToken() {
  try {
    const response = await dynamicClient.get('/user/profile');
    console.log('Profile:', response.data);
  } catch (error) {
    if (error.status === 401) {
      // Token expired, refresh it
      currentToken = await refreshToken();
      // Retry the request
      const retryResponse = await dynamicClient.get('/user/profile');
      console.log('Profile (after refresh):', retryResponse.data);
    }
  }
}

async function refreshToken() {
  // Simulate token refresh
  console.log('Refreshing token...');
  return 'new-refreshed-token';
}

// Example 5: Custom Authorization Header
const customClient = createClient({
  baseURL: 'https://api.example.com'
}).use(authPlugin({
  type: 'custom',
  getHeaders: async () => {
    // Return custom auth headers
    return {
      'Authorization': `Custom ${await getCustomToken()}`,
      'X-Client-ID': 'my-app-client-id'
    };
  }
}));

async function getCustomToken() {
  // Get token from your auth service
  return 'custom-token-value';
}

async function fetchWithCustomAuth() {
  try {
    const response = await customClient.get('/data');
    console.log('Data:', response.data);
  } catch (error) {
    console.error('Request failed:', error.message);
  }
}

// Example 6: OAuth2 with automatic token refresh
class TokenManager {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = null;
  }

  async getAccessToken() {
    // Check if token is expired
    if (!this.accessToken || Date.now() >= this.expiresAt) {
      await this.refresh();
    }
    return this.accessToken;
  }

  async refresh() {
    // Call your OAuth2 refresh endpoint
    console.log('Refreshing OAuth2 token...');
    // Simulate refresh
    this.accessToken = 'new-access-token';
    this.expiresAt = Date.now() + 3600000; // 1 hour
  }

  setTokens(accessToken, refreshToken, expiresIn) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.expiresAt = Date.now() + (expiresIn * 1000);
  }
}

const tokenManager = new TokenManager();
tokenManager.setTokens('initial-access', 'refresh-token', 3600);

const oauth2Client = createClient({
  baseURL: 'https://api.example.com'
}).use(authPlugin({
  type: 'bearer',
  getToken: () => tokenManager.getAccessToken()
}));

async function fetchWithOAuth2() {
  try {
    const response = await oauth2Client.get('/user/data');
    console.log('Data:', response.data);
  } catch (error) {
    console.error('Request failed:', error.message);
  }
}

// Run examples
async function main() {
  console.log('Auth Plugin Examples\n');

  // Uncomment to test (requires a real API endpoint with auth)
  // await fetchWithBearerToken();
  // await fetchWithBasicAuth();
  // await fetchWithApiKey();
  // await fetchWithDynamicToken();
  // await fetchWithOAuth2();
}

main();
