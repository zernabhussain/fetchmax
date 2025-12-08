import type { Plugin, PluginContext } from '@fetchmax/core';

export interface RateLimitConfig {
  /** Maximum number of requests allowed */
  maxRequests: number;
  /** Time window in milliseconds */
  perMilliseconds: number;
  /** Queue requests when limit is reached (default: true) */
  queueOnLimit?: boolean;
  /** Maximum queue size (default: Infinity) */
  maxQueueSize?: number;
  /** Callback when rate limit is hit */
  onRateLimit?: (queueSize: number, waitTime: number) => void;
}

export class RateLimitError extends Error {
  name = 'RateLimitError';
  queueSize: number;

  constructor(message: string, queueSize: number) {
    super(message);
    this.queueSize = queueSize;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RateLimitError);
    }
  }
}

/**
 * Rate Limit Plugin
 *
 * Controls the rate of requests to prevent overwhelming servers or hitting API limits.
 *
 * @example
 * ```ts
 * // Allow 10 requests per second
 * const client = new HttpClient().use(rateLimitPlugin({
 *   maxRequests: 10,
 *   perMilliseconds: 1000
 * }));
 *
 * // Allow 100 requests per minute, throw error instead of queueing
 * const client = new HttpClient().use(rateLimitPlugin({
 *   maxRequests: 100,
 *   perMilliseconds: 60000,
 *   queueOnLimit: false
 * }));
 * ```
 */
export function rateLimitPlugin(config: RateLimitConfig): Plugin & {
  getStats: () => {
    requestCount: number;
    queueSize: number;
    timestamps: number[];
  };
  reset: () => void;
} {
  const {
    maxRequests,
    perMilliseconds,
    queueOnLimit = true,
    maxQueueSize = Infinity,
    onRateLimit
  } = config;

  // Track request timestamps
  const timestamps: number[] = [];

  // Queue for pending requests - stores resolve functions
  const queue: Array<{ resolve: () => void; reject: (error: Error) => void }> = [];

  // Track the current queue processor timeout
  let queueProcessorTimeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * Remove expired timestamps (outside the time window)
   */
  function removeExpiredTimestamps(): void {
    const now = Date.now();
    const cutoff = now - perMilliseconds;

    while (timestamps.length > 0 && timestamps[0]! < cutoff) {
      timestamps.shift();
    }
  }

  /**
   * Check if we can make a request now
   */
  function canMakeRequest(): boolean {
    removeExpiredTimestamps();
    return timestamps.length < maxRequests;
  }

  /**
   * Calculate wait time until next available slot
   */
  function getWaitTime(): number {
    if (timestamps.length === 0) return 0;

    const oldestTimestamp = timestamps[0]!;
    const now = Date.now();
    const elapsed = now - oldestTimestamp;

    return Math.max(0, perMilliseconds - elapsed);
  }

  /**
   * Process queued requests
   */
  function processQueue(): void {
    // Clear the timeout reference since we're running now
    queueProcessorTimeout = null;

    removeExpiredTimestamps();

    // Process as many queued requests as possible
    while (queue.length > 0 && canMakeRequest()) {
      const item = queue.shift();
      if (item) {
        timestamps.push(Date.now());
        item.resolve();
      }
    }

    // Schedule next queue processing if there are still items in queue
    scheduleQueueProcessing();
  }

  /**
   * Schedule queue processing for when slots become available
   */
  function scheduleQueueProcessing(): void {
    // Clear any existing timeout
    if (queueProcessorTimeout) {
      clearTimeout(queueProcessorTimeout);
      queueProcessorTimeout = null;
    }

    // If queue is empty, nothing to schedule
    if (queue.length === 0) {
      return;
    }

    // Calculate when the next slot will be available
    const waitTime = getWaitTime();

    // Schedule processing for when the slot becomes available
    // Add a small buffer to ensure the timestamp has expired
    queueProcessorTimeout = setTimeout(() => {
      processQueue();
    }, waitTime + 10);
  }

  /**
   * Wait for an available slot
   */
  async function waitForSlot(): Promise<void> {
    removeExpiredTimestamps();

    // If we can make request immediately, do it
    if (canMakeRequest()) {
      timestamps.push(Date.now());
      return;
    }

    // Check queue size
    if (queue.length >= maxQueueSize) {
      throw new RateLimitError(
        `Rate limit queue is full (${maxQueueSize} requests queued)`,
        queue.length
      );
    }

    if (!queueOnLimit) {
      throw new RateLimitError(
        `Rate limit exceeded: ${maxRequests} requests per ${perMilliseconds}ms`,
        queue.length
      );
    }

    // Calculate wait time
    const waitTime = getWaitTime();

    // Call callback if provided
    if (onRateLimit) {
      onRateLimit(queue.length, waitTime);
    }

    console.log(
      `[RateLimit] Request queued. ${queue.length + 1} in queue. Wait time: ~${waitTime}ms`
    );

    // Wait for slot to become available
    const promise = new Promise<void>((resolve, reject) => {
      queue.push({ resolve, reject });
    });

    // Schedule queue processing
    scheduleQueueProcessing();

    return promise;
  }

  const plugin: Plugin & {
    getStats: () => {
      requestCount: number;
      queueSize: number;
      timestamps: number[];
    };
    reset: () => void;
  } = {
    name: 'rate-limit',

    async onRequest(request: any, _context: PluginContext) {
      await waitForSlot();
      return request;
    },

    /**
     * Get rate limit statistics
     */
    getStats() {
      removeExpiredTimestamps();
      return {
        requestCount: timestamps.length,
        queueSize: queue.length,
        timestamps: [...timestamps]
      };
    },

    /**
     * Reset rate limiter (clear timestamps and queue)
     */
    reset() {
      timestamps.length = 0;
      queue.length = 0;

      // Clear any scheduled queue processing
      if (queueProcessorTimeout) {
        clearTimeout(queueProcessorTimeout);
        queueProcessorTimeout = null;
      }
    }
  };

  return plugin;
}

export default rateLimitPlugin;
