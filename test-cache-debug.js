// Quick debug test for cache plugin
import { HttpClient } from './packages/core/src/client.js';
import { cachePlugin } from './packages/plugins/cache/src/index.js';

const cache = cachePlugin({ debug: true });
const client = new HttpClient().use(cache);

console.log('Making first request...');
try {
  const result1 = await client.get('https://jsonplaceholder.typicode.com/posts/1');
  console.log('First request result:', result1?.status, result1?.data?.id);
} catch (error) {
  console.error('First request error:', error.message);
}

console.log('\nCache stats after first request:', cache.getStats());

console.log('\nMaking second request to same URL...');
try {
  const result2 = await client.get('https://jsonplaceholder.typicode.com/posts/1');
  console.log('Second request result:', result2?.status, result2?.data?.id);
} catch (error) {
  console.error('Second request error:', error.message);
}

console.log('\nFinal cache stats:', cache.getStats());
