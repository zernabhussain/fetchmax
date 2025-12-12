import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest configuration for E2E tests
 *
 * These tests make real HTTP requests to external APIs and should be run separately from unit tests.
 * They require network access and may be slower/less reliable than unit tests.
 *
 * Run with: npm run test:e2e
 */
export default defineConfig({
  test: {
    globals: true,
    // Use Node.js environment for real fetch support
    environment: 'node',
    include: ['tests/e2e/**/*.test.ts'],
    testTimeout: 30000, // Longer timeout for real API calls
    // Retry flaky tests (network issues)
    retry: 1
  },
  resolve: {
    alias: {
      // Test against source files
      '@fetchmax/core': path.resolve(__dirname, './packages/core/src'),
      '@fetchmax/plugin-retry': path.resolve(__dirname, './packages/plugins/retry/src'),
      '@fetchmax/plugin-timeout': path.resolve(__dirname, './packages/plugins/timeout/src'),
      '@fetchmax/plugin-cache': path.resolve(__dirname, './packages/plugins/cache/src'),
      '@fetchmax/plugin-dedupe': path.resolve(__dirname, './packages/plugins/dedupe/src'),
      '@fetchmax/plugin-interceptors': path.resolve(__dirname, './packages/plugins/interceptors/src'),
      '@fetchmax/plugin-logger': path.resolve(__dirname, './packages/plugins/logger/src'),
      '@fetchmax/plugin-progress': path.resolve(__dirname, './packages/plugins/progress/src'),
      '@fetchmax/plugin-rate-limit': path.resolve(__dirname, './packages/plugins/rate-limit/src'),
      '@fetchmax/plugin-transform': path.resolve(__dirname, './packages/plugins/transform/src'),
      '@fetchmax/plugins': path.resolve(__dirname, './packages/plugins')
    }
  }
});
