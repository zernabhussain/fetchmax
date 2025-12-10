import { beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';

export const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' });
  console.log('[Bun Setup] MSW server started');
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
  console.log('[Bun Setup] MSW server closed');
});

(global as any).sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

console.log(`[Bun Setup] Testing on Bun ${(globalThis as any).Bun?.version || 'unknown'}`);
