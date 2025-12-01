/**
 * Basic Usage Example
 *
 * This example shows the simplest way to use FetchMax
 * for making HTTP requests.
 */

import { createClient } from '@fetchmax/core';

// Create a client instance
const client = createClient({
  baseURL: 'https://api.example.com',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Example 1: Simple GET request
async function getUser(userId) {
  try {
    const response = await client.get(`/users/${userId}`);
    console.log('User:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch user:', error.message);
    throw error;
  }
}

// Example 2: POST request with data
async function createUser(userData) {
  try {
    const response = await client.post('/users', userData);
    console.log('Created user:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to create user:', error.message);
    throw error;
  }
}

// Example 3: PUT request to update
async function updateUser(userId, updates) {
  try {
    const response = await client.put(`/users/${userId}`, updates);
    console.log('Updated user:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to update user:', error.message);
    throw error;
  }
}

// Example 4: DELETE request
async function deleteUser(userId) {
  try {
    const response = await client.delete(`/users/${userId}`);
    console.log('User deleted successfully');
    return response;
  } catch (error) {
    console.error('Failed to delete user:', error.message);
    throw error;
  }
}

// Example 5: Request with query parameters
async function searchUsers(query) {
  try {
    const response = await client.get('/users', {
      params: {
        search: query,
        limit: 10,
        page: 1
      }
    });
    console.log('Search results:', response.data);
    return response.data;
  } catch (error) {
    console.error('Search failed:', error.message);
    throw error;
  }
}

// Example 6: Request with custom headers
async function getProtectedResource() {
  try {
    const response = await client.get('/protected', {
      headers: {
        'Authorization': 'Bearer your-token-here'
      }
    });
    console.log('Protected data:', response.data);
    return response.data;
  } catch (error) {
    console.error('Access denied:', error.message);
    throw error;
  }
}

// Run examples
async function main() {
  // Uncomment to test (requires a real API endpoint)
  // await getUser(1);
  // await createUser({ name: 'John Doe', email: 'john@example.com' });
  // await searchUsers('john');
}

main();
