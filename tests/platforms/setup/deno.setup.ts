import { beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';

export const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' });
  console.log('[Deno Setup] MSW server started');
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
  console.log('[Deno Setup] MSW server closed');
});

// @ts-ignore - Deno global
(globalThis as any).sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// @ts-ignore - Deno global
console.log(`[Deno Setup] Testing on Deno ${(globalThis as any).Deno?.version?.deno || 'unknown'}`);
