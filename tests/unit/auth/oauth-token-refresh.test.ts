/**
 * OAuth Token Refresh Tests - P0 Tests
 * Tests for OAuth token refresh and authentication flows
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpClient } from '@fetchmax/core';
import { interceptorPlugin } from '@fetchmax/plugin-interceptors';
import { retryPlugin } from '@fetchmax/plugin-retry';
import { http, HttpResponse } from 'msw';
import { server } from '../../setup';

describe('OAuth: Token Refresh on 401', () => {
  let accessToken = 'initial-access-token';
  let refreshToken = 'initial-refresh-token';
  let tokenRefreshCount = 0;

  beforeEach(() => {
    accessToken = 'initial-access-token';
    refreshToken = 'initial-refresh-token';
    tokenRefreshCount = 0;
  });

  it('should refresh token on 401 and retry request', async () => {
    let requestAttempts = 0;

    server.use(
      http.post('https://api.test.com/auth/refresh', async ({ request }) => {
        const body = await request.json();

        if (body.refreshToken !== refreshToken) {
          return new Response('Invalid refresh token', { status: 401 });
        }

        tokenRefreshCount++;
        const newAccessToken = `access-token-${tokenRefreshCount}`;
        const newRefreshToken = `refresh-token-${tokenRefreshCount}`;

        return HttpResponse.json({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        });
      }),
      http.get('https://api.test.com/protected', ({ request }) => {
        requestAttempts++;
        const auth = request.headers.get('Authorization');

        // First attempt with expired token fails
        if (auth === 'Bearer initial-access-token') {
          return new Response('Unauthorized', { status: 401 });
        }

        // Retry with new token succeeds
        if (auth === 'Bearer access-token-1') {
          return HttpResponse.json({ data: 'protected data' });
        }

        return new Response('Invalid token', { status: 401 });
      })
    );

    const interceptors = interceptorPlugin();
    const client = new HttpClient({
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }).use(interceptors);

    // Add error interceptor for token refresh
    interceptors.error.use(async (error: any) => {
      if (error.status === 401 && !error.config._tokenRefreshed) {
        // Mark that we're refreshing to prevent infinite loops
        error.config._tokenRefreshed = true;

        // Refresh token
        const refreshResponse = await fetch('https://api.test.com/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });

        if (refreshResponse.ok) {
          const tokens = await refreshResponse.json();
          accessToken = tokens.accessToken;
          refreshToken = tokens.refreshToken;

          // Update authorization header for retry
          error.config.headers = error.config.headers || {};
          error.config.headers['Authorization'] = `Bearer ${accessToken}`;

          // Retry the request
          const retryClient = new HttpClient();
          return retryClient.request(error.config);
        }
      }

      throw error;
    });

    const response = await client.get('https://api.test.com/protected');

    expect(response.status).toBe(200);
    expect(response.data.data).toBe('protected data');
    expect(tokenRefreshCount).toBe(1);
    expect(requestAttempts).toBe(2); // Initial + retry after refresh
  });

  it('should handle concurrent requests during token refresh', async () => {
    let isRefreshing = false;
    let refreshPromise: Promise<any> | null = null;

    server.use(
      http.post('https://api.test.com/auth/refresh', async () => {
        tokenRefreshCount++;
        // Simulate slow token refresh
        await new Promise(resolve => setTimeout(resolve, 100));

        return HttpResponse.json({
          accessToken: `new-token-${tokenRefreshCount}`,
          refreshToken: `new-refresh-${tokenRefreshCount}`
        });
      }),
      http.get('https://api.test.com/data', ({ request }) => {
        const auth = request.headers.get('Authorization');

        if (auth === 'Bearer expired-token') {
          return new Response('Unauthorized', { status: 401 });
        }

        if (auth?.startsWith('Bearer new-token')) {
          return HttpResponse.json({ success: true });
        }

        return new Response('Invalid token', { status: 401 });
      })
    );

    const refreshTokenFn = async () => {
      if (isRefreshing) {
        // Wait for existing refresh to complete
        return refreshPromise;
      }

      isRefreshing = true;
      refreshPromise = fetch('https://api.test.com/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: 'refresh-token' })
      })
        .then(res => res.json())
        .then(tokens => {
          accessToken = tokens.accessToken;
          refreshToken = tokens.refreshToken;
          isRefreshing = false;
          refreshPromise = null;
          return tokens;
        })
        .catch(err => {
          isRefreshing = false;
          refreshPromise = null;
          throw err;
        });

      return refreshPromise;
    };

    accessToken = 'expired-token';

    const interceptors = interceptorPlugin();
    const client = new HttpClient({
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }).use(interceptors);

    interceptors.error.use(async (error: any) => {
      if (error.status === 401 && !error.config._tokenRefreshed) {
        error.config._tokenRefreshed = true;

        await refreshTokenFn();

        error.config.headers = error.config.headers || {};
        error.config.headers['Authorization'] = `Bearer ${accessToken}`;

        const retryClient = new HttpClient();
        return retryClient.request(error.config);
      }

      throw error;
    });

    // Fire 5 concurrent requests with expired token
    const promises = Array.from({ length: 5 }, () =>
      client.get('https://api.test.com/data')
    );

    const results = await Promise.all(promises);

    // All should succeed
    expect(results.every(r => r.status === 200)).toBe(true);

    // Should only refresh token once
    expect(tokenRefreshCount).toBe(1);
  });

  it('should handle token refresh failure', async () => {
    server.use(
      http.post('https://api.test.com/auth/refresh', () => {
        return new Response('Refresh token expired', { status: 401 });
      }),
      http.get('https://api.test.com/protected', () => {
        return new Response('Unauthorized', { status: 401 });
      })
    );

    const interceptors = interceptorPlugin();
    const client = new HttpClient({
      headers: {
        'Authorization': 'Bearer expired-token'
      }
    }).use(interceptors);

    interceptors.error.use(async (error: any) => {
      if (error.status === 401 && !error.config._tokenRefreshed) {
        error.config._tokenRefreshed = true;

        const refreshResponse = await fetch('https://api.test.com/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: 'expired-refresh' })
        });

        if (!refreshResponse.ok) {
          // Refresh failed - user needs to re-authenticate
          throw new Error('Token refresh failed - please log in again');
        }
      }

      throw error;
    });

    await expect(client.get('https://api.test.com/protected'))
      .rejects.toThrow('Token refresh failed');
  });

  it('should handle refresh token expiration', async () => {
    server.use(
      http.post('https://api.test.com/auth/refresh', ({ request }) => {
        return new Response('Refresh token expired', { status: 403 });
      }),
      http.get('https://api.test.com/data', () => {
        return new Response('Unauthorized', { status: 401 });
      })
    );

    let logoutCalled = false;

    const interceptors = interceptorPlugin();
    const client = new HttpClient({
      headers: {
        'Authorization': 'Bearer expired-token'
      }
    }).use(interceptors);

    interceptors.error.use(async (error: any) => {
      if (error.status === 401 && !error.config._tokenRefreshed) {
        error.config._tokenRefreshed = true;

        try {
          const refreshResponse = await fetch('https://api.test.com/auth/refresh', {
            method: 'POST',
            body: JSON.stringify({ refreshToken: 'old-refresh' })
          });

          if (refreshResponse.status === 403) {
            // Refresh token expired - logout user
            logoutCalled = true;
            throw new Error('Session expired - please log in again');
          }
        } catch (err: any) {
          throw err;
        }
      }

      throw error;
    });

    await expect(client.get('https://api.test.com/data'))
      .rejects.toThrow('Session expired');

    expect(logoutCalled).toBe(true);
  });
});
