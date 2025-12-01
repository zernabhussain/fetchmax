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
    testTimeout: 10000
  },
  resolve: {
    alias: {
      '@fetchmax/core': path.resolve(__dirname, './packages/core/src'),
      '@fetchmax/plugins': path.resolve(__dirname, './packages/plugins')
    }
  }
});
