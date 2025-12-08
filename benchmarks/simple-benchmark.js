/**
 * Simple Performance Benchmark for FetchMax
 *
 * This benchmark measures the basic overhead of FetchMax vs native fetch
 * using performance.now() for accurate timing.
 */

import { HttpClient } from '../packages/core/dist/index.js';
import { performance } from 'perf_hooks';

// Mock fetch for testing
const originalFetch = globalThis.fetch;

// Simple mock response
const mockResponse = {
  ok: true,
  status: 200,
  statusText: 'OK',
  headers: new Headers({ 'content-type': 'application/json' }),
  json: async () => ({ data: 'test' }),
  text: async () => JSON.stringify({ data: 'test' }),
  clone: function() { return this; },
  url: 'https://api.test.com/data',
  redirected: false,
  type: 'basic',
};

// Mock fetch implementation
globalThis.fetch = async (url, options) => {
  return mockResponse;
};

/**
 * Benchmark a function with N iterations
 */
async function benchmark(name, fn, iterations = 1000) {
  // Warm up
  for (let i = 0; i < 10; i++) {
    await fn();
  }

  // Run benchmark
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    await fn();
  }
  const end = performance.now();

  const totalTime = end - start;
  const avgTime = totalTime / iterations;

  console.log(`${name}:`);
  console.log(`  Total: ${totalTime.toFixed(2)}ms`);
  console.log(`  Average: ${avgTime.toFixed(4)}ms`);
  console.log(`  Per second: ${(1000 / avgTime).toFixed(0)} ops/sec`);
  console.log();

  return avgTime;
}

/**
 * Run all benchmarks
 */
async function runBenchmarks() {
  console.log('FetchMax Performance Benchmarks');
  console.log('================================\n');

  const iterations = 1000;
  const results = {};

  // 1. Native fetch baseline
  results.nativeFetch = await benchmark(
    '1. Native fetch (baseline)',
    async () => {
      const response = await fetch('https://api.test.com/data');
      const data = await response.json();
    },
    iterations
  );

  // 2. FetchMax without plugins
  const client = new HttpClient({ baseURL: 'https://api.test.com' });
  results.fetchmaxBasic = await benchmark(
    '2. FetchMax (no plugins)',
    async () => {
      const response = await client.get('/data');
    },
    iterations
  );

  // 3. FetchMax with instance reuse
  results.fetchmaxReuse = await benchmark(
    '3. FetchMax (reused instance)',
    async () => {
      await client.get('/data');
    },
    iterations
  );

  // Calculate overhead
  console.log('Performance Comparison:');
  console.log('=======================\n');

  const baselineMs = results.nativeFetch;
  const overhead = results.fetchmaxBasic - baselineMs;
  const overheadPct = (overhead / baselineMs * 100).toFixed(1);

  console.log(`Native fetch:           ${baselineMs.toFixed(4)}ms (baseline)`);
  console.log(`FetchMax (no plugins):  ${results.fetchmaxBasic.toFixed(4)}ms (+${overhead.toFixed(4)}ms, +${overheadPct}%)`);
  console.log(`FetchMax (reused):      ${results.fetchmaxReuse.toFixed(4)}ms`);
  console.log();

  console.log('Summary:');
  console.log('========\n');
  console.log(`FetchMax adds ~${overhead.toFixed(4)}ms overhead per request`);
  console.log(`This represents a ${overheadPct}% increase over native fetch`);
  console.log(`Still capable of ${(1000 / results.fetchmaxBasic).toFixed(0)} requests/second`);
  console.log();

  // Restore original fetch
  globalThis.fetch = originalFetch;
}

// Run benchmarks
runBenchmarks().catch(console.error);
