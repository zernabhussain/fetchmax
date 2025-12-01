import { HttpClient } from './packages/core/src/client.js';
import { cachePlugin } from './packages/plugins/cache/src/index.js';
import { http } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer();
server.listen({ onUnhandledRequest: 'bypass' });

let requestCount = 0;

server.use(
  http.get('https://api.test.com/users', () => {
    requestCount++;
    console.log('[SERVER] GET /users called, count:', requestCount);
    return Response.json({ users: ['Alice', 'Bob'] });
  })
);

const cache = cachePlugin({ ttl: 60000, debug: true });
const client = new HttpClient().use(cache);

try {
  console.log('[TEST] Making first request...');
  const response1 = await client.get('https://api.test.com/users');
  console.log('[TEST] First response:', response1);
  console.log('[TEST] First response data:', response1?.data);
  console.log('[TEST] Request count:', requestCount);
} catch (error) {
  console.error('[TEST] Error:', error);
}

server.close();
