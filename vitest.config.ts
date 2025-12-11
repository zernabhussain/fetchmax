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
        'examples/'
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90
      }
    },
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'packages/*/tests/**/*.test.ts'],
    exclude: ['tests/e2e/**/*.test.ts', 'node_modules/**'],
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
      '@fetchmax/plugins': path.resolve(__dirname, './packages/plugins')
    }
  }
});
