import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimiter } from '@fetchmax/plugin-ai-agent';
import { RateLimitExceededError } from '@fetchmax/plugin-ai-agent';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should allow requests within rate limit', async () => {
    const limiter = new RateLimiter({
      enabled: true,
      requestsPerMinute: 5
    });

    await expect(limiter.checkLimit()).resolves.toBeUndefined();
    limiter.record(1000);

    await expect(limiter.checkLimit()).resolves.toBeUndefined();
    limiter.record(1000);
  });

  it('should throw error when requests per minute exceeded', async () => {
    const limiter = new RateLimiter({
      enabled: true,
      requestsPerMinute: 2
    });

    await limiter.checkLimit();
    limiter.record(1000);

    await limiter.checkLimit();
    limiter.record(1000);

    await expect(limiter.checkLimit()).rejects.toThrow(RateLimitExceededError);
  });

  it('should throw error when tokens per minute exceeded', async () => {
    const limiter = new RateLimiter({
      enabled: true,
      tokensPerMinute: 5000
    });

    await limiter.checkLimit(3000);
    limiter.record(3000);

    await expect(limiter.checkLimit(3000)).rejects.toThrow(RateLimitExceededError);
  });

  it('should clean up old records after 1 minute', async () => {
    const limiter = new RateLimiter({
      enabled: true,
      requestsPerMinute: 2
    });

    await limiter.checkLimit();
    limiter.record(1000);

    await limiter.checkLimit();
    limiter.record(1000);

    // Should throw - limit reached
    await expect(limiter.checkLimit()).rejects.toThrow(RateLimitExceededError);

    // Advance time by 61 seconds
    vi.advanceTimersByTime(61_000);

    // Should pass - old records cleaned up
    await expect(limiter.checkLimit()).resolves.toBeUndefined();
  });

  it('should not enforce limits when disabled', async () => {
    const limiter = new RateLimiter({
      enabled: false,
      requestsPerMinute: 1
    });

    await limiter.checkLimit();
    limiter.record(1000);

    await limiter.checkLimit();
    limiter.record(1000);

    // Should not throw even though limit would be exceeded
    await expect(limiter.checkLimit()).resolves.toBeUndefined();
  });

  it('should wait until request can be made', async () => {
    const limiter = new RateLimiter({
      enabled: true,
      requestsPerMinute: 2
    });

    await limiter.checkLimit();
    limiter.record(1000);

    await limiter.checkLimit();
    limiter.record(1000);

    // Start waiting (should wait ~60 seconds)
    const waitPromise = limiter.waitForLimit();

    // Advance time
    await vi.advanceTimersByTimeAsync(61_000);

    await expect(waitPromise).resolves.toBeUndefined();
  });

  it('should reset rate limit history', async () => {
    const limiter = new RateLimiter({
      enabled: true,
      requestsPerMinute: 2
    });

    await limiter.checkLimit();
    limiter.record(1000);

    await limiter.checkLimit();
    limiter.record(1000);

    // Should throw - limit reached
    await expect(limiter.checkLimit()).rejects.toThrow(RateLimitExceededError);

    limiter.reset();

    // Should pass after reset
    await expect(limiter.checkLimit()).resolves.toBeUndefined();
  });

  it('should return accurate stats', async () => {
    const limiter = new RateLimiter({
      enabled: true,
      requestsPerMinute: 10,
      tokensPerMinute: 10000
    });

    await limiter.checkLimit(1000);
    limiter.record(1000);

    await limiter.checkLimit(2000);
    limiter.record(2000);

    const stats = limiter.getStats();

    expect(stats.requestsInLastMinute).toBe(2);
    expect(stats.tokensInLastMinute).toBe(3000);
    expect(stats.requestsRemaining).toBe(8);
    expect(stats.tokensRemaining).toBe(7000);
  });
});
