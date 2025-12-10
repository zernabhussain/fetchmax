import { beforeAll, afterEach, afterAll } from 'vitest';
import { setupWorker } from 'msw/browser';

// Create MSW worker for browser environment
export const worker = setupWorker();

beforeAll(async () => {
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: {
      url: '/mockServiceWorker.js'
    }
  });
  console.log('[Browser Setup] MSW worker started');
});

afterEach(() => {
  worker.resetHandlers();
});

afterAll(() => {
  worker.stop();
  console.log('[Browser Setup] MSW worker stopped');
});

// Add global utilities for browser
(window as any).sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

console.log(`[Browser Setup] Testing in ${navigator.userAgent}`);
