import { beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';

// Create MSW server for Node environment
export const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' });
  console.log('[Node Setup] MSW server started');
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
  console.log('[Node Setup] MSW server closed');
});

// Add global utilities
(global as any).sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Verify Node.js environment
console.log(`[Node Setup] Testing on Node.js ${process.version}`);
