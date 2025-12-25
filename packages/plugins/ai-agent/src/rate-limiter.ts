import type { RateLimitConfig } from './types';
import { RateLimitExceededError } from './errors';

interface RequestRecord {
  timestamp: number;
  tokens: number;
}

/**
 * Rate Limiter
 * Enforces rate limits for AI API requests
 */
export class RateLimiter {
  private requestHistory: RequestRecord[] = [];

  constructor(private config: RateLimitConfig) {}

  /**
   * Check if a request can be made
   * @param estimatedTokens - Estimated tokens for the request
   * @throws RateLimitExceededError if rate limit would be exceeded
   */
  async checkLimit(estimatedTokens: number = 1000): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const now = Date.now();
    const oneMinuteAgo = now - 60_000;

    // Clean up old records
    this.requestHistory = this.requestHistory.filter(
      record => record.timestamp > oneMinuteAgo
    );

    // Check requests per minute limit
    if (this.config.requestsPerMinute) {
      if (this.requestHistory.length >= this.config.requestsPerMinute) {
        const oldestRequest = this.requestHistory[0];
        const waitTime = oldestRequest ? (60_000 - (now - oldestRequest.timestamp)) : 0;
        throw new RateLimitExceededError(waitTime > 0 ? waitTime : undefined);
      }
    }

    // Check tokens per minute limit
    if (this.config.tokensPerMinute) {
      const tokensInLastMinute = this.requestHistory.reduce(
        (sum, record) => sum + record.tokens,
        0
      );

      if (tokensInLastMinute + estimatedTokens > this.config.tokensPerMinute) {
        const oldestRequest = this.requestHistory[0];
        const waitTime = oldestRequest ? (60_000 - (now - oldestRequest.timestamp)) : 0;
        throw new RateLimitExceededError(waitTime > 0 ? waitTime : undefined);
      }
    }
  }

  /**
   * Record a request
   * @param tokens - Number of tokens used
   */
  record(tokens: number): void {
    if (!this.config.enabled) {
      return;
    }

    this.requestHistory.push({
      timestamp: Date.now(),
      tokens
    });
  }

  /**
   * Wait until a request can be made
   * @param estimatedTokens - Estimated tokens for the request
   */
  async waitForLimit(estimatedTokens: number = 1000): Promise<void> {
    while (true) {
      try {
        await this.checkLimit(estimatedTokens);
        return;
      } catch (error) {
        if (error instanceof RateLimitExceededError && error.retryAfter) {
          // Wait for the specified time
          await new Promise(resolve => setTimeout(resolve, error.retryAfter));
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Reset rate limit history
   */
  reset(): void {
    this.requestHistory = [];
  }

  /**
   * Get current rate limit stats
   */
  getStats(): {
    requestsInLastMinute: number;
    tokensInLastMinute: number;
    requestsRemaining?: number;
    tokensRemaining?: number;
  } {
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;

    const recentRequests = this.requestHistory.filter(
      record => record.timestamp > oneMinuteAgo
    );

    const tokensInLastMinute = recentRequests.reduce(
      (sum, record) => sum + record.tokens,
      0
    );

    const stats: {
      requestsInLastMinute: number;
      tokensInLastMinute: number;
      requestsRemaining?: number;
      tokensRemaining?: number;
    } = {
      requestsInLastMinute: recentRequests.length,
      tokensInLastMinute
    };

    if (this.config.requestsPerMinute) {
      stats.requestsRemaining = Math.max(
        0,
        this.config.requestsPerMinute - recentRequests.length
      );
    }

    if (this.config.tokensPerMinute) {
      stats.tokensRemaining = Math.max(
        0,
        this.config.tokensPerMinute - tokensInLastMinute
      );
    }

    return stats;
  }
}
