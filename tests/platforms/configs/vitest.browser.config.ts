import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    name: 'browser',
    globals: true,
    setupFiles: ['./tests/platforms/setup/browser.setup.ts'],
    include: ['tests/unit/**/*.test.ts'],
    testTimeout: 15000,
    browser: {
      enabled: true,
      name: 'chromium', // Will be overridden by Playwright
      provider: 'playwright',
      headless: true,
    },
  },
  resolve: {
    alias: {
      '@fetchmax/core': path.resolve(__dirname, '../../../packages/core/dist'),
      '@fetchmax/plugin-retry': path.resolve(__dirname, '../../../packages/plugins/retry/dist'),
      '@fetchmax/plugin-timeout': path.resolve(__dirname, '../../../packages/plugins/timeout/dist'),
      '@fetchmax/plugin-cache': path.resolve(__dirname, '../../../packages/plugins/cache/dist'),
      '@fetchmax/plugin-dedupe': path.resolve(__dirname, '../../../packages/plugins/dedupe/dist'),
      '@fetchmax/plugin-interceptors': path.resolve(__dirname, '../../../packages/plugins/interceptors/dist'),
      '@fetchmax/plugin-logger': path.resolve(__dirname, '../../../packages/plugins/logger/dist'),
      '@fetchmax/plugin-progress': path.resolve(__dirname, '../../../packages/plugins/progress/dist'),
      '@fetchmax/plugin-rate-limit': path.resolve(__dirname, '../../../packages/plugins/rate-limit/dist'),
      '@fetchmax/plugin-transform': path.resolve(__dirname, '../../../packages/plugins/transform/dist'),
    }
  }
});
