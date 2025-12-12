import { beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';

// Create a mock server for all tests
export const server = setupServer();

// Start mock server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' });
});

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers();
});

// Clean up after all tests
afterAll(() => {
  server.close();
});

// Add global test utilities
(global as any).sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
