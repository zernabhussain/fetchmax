import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types.ts',
        'benchmarks/',
        'scripts/',
        'examples/',
        // Exclude config files
        '*.config.ts',
        '*.config.js',
        '*.config.cjs',
        '*.config.mjs'
      ],
      thresholds: {
        lines: 82,
        functions: 84,
        branches: 84,
        statements: 82
      }
    },
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'packages/*/tests/**/*.test.ts'],
    exclude: [
      'node_modules/**',
      // E2E tests make real API calls and should be run separately
      // Use: npm run test:e2e
      'tests/e2e/**/*.test.ts'
    ],
    testTimeout: 10000
  },
  resolve: {
    alias: {
      // Test against source files (for development)
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
      '@fetchmax/plugin-ai-agent': path.resolve(__dirname, './packages/plugins/ai-agent/src'),
      '@fetchmax/plugin-ai-mock': path.resolve(__dirname, './packages/plugins/ai-mock/src'),
      '@fetchmax/plugin-ai-translate': path.resolve(__dirname, './packages/plugins/ai-translate/src'),
      '@fetchmax/plugin-ai-summarize': path.resolve(__dirname, './packages/plugins/ai-summarize/src'),
      '@fetchmax/plugin-ai-transform': path.resolve(__dirname, './packages/plugins/ai-transform/src'),
      '@fetchmax/plugins': path.resolve(__dirname, './packages/plugins')
    }
  }
});
