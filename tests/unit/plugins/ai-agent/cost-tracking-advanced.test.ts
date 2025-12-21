/**
 * AI Cost Tracking Accuracy Tests - P0 Tests
 * Tests for accurate cost tracking and budget management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CostTracker } from '@fetchmax/plugin-ai-agent/cost-tracker';

describe('AI Cost Tracking: Token Counting Accuracy', () => {
  let tracker: CostTracker;

  beforeEach(() => {
    tracker = new CostTracker();
  });

  it('should accurately count tokens for simple text', () => {
    const text = 'Hello world';
    const tokens = tracker.estimateTokens(text);

    // Simple estimation: ~1 token per 4 characters
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThan(10);
  });

  it('should accurately count tokens for longer text', () => {
    const text = 'The quick brown fox jumps over the lazy dog'.repeat(10);
    const tokens = tracker.estimateTokens(text);

    // Should be proportional to text length
    expect(tokens).toBeGreaterThan(50);
    expect(tokens).toBeLessThan(500);
  });

  it('should handle empty strings', () => {
    const tokens = tracker.estimateTokens('');
    expect(tokens).toBe(0);
  });

  it('should handle special characters and punctuation', () => {
    const text = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
    const tokens = tracker.estimateTokens(text);

    // Special characters should be counted
    expect(tokens).toBeGreaterThan(0);
  });

  it('should handle multi-line text', () => {
    const text = `Line 1
Line 2
Line 3
Line 4`;
    const tokens = tracker.estimateTokens(text);

    expect(tokens).toBeGreaterThan(0);
  });

  it('should handle Unicode characters', () => {
    const text = '你好世界 مرحبا بالعالم';
    const tokens = tracker.estimateTokens(text);

    // Unicode characters should be counted
    expect(tokens).toBeGreaterThan(0);
  });
});

describe('AI Cost Tracking: Cost Calculation with Different Pricing Tiers', () => {
  let tracker: CostTracker;

  beforeEach(() => {
    tracker = new CostTracker({
      enabled: true,
      customPricing: {
        openai: {
          'gpt-4': { input: 0.03, output: 0.06 },
          'gpt-3.5-turbo': { input: 0.0015, output: 0.002 }
        },
        anthropic: {
          'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
          'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 }
        },
        deepseek: {
          'deepseek-chat': { input: 0.0002, output: 0.0006 }
        }
      }
    });
  });

  it('should calculate cost for OpenAI gpt-4 correctly', () => {
    tracker.trackRequest('openai', 'gpt-4', {
      inputTokens: 1000,
      outputTokens: 500
    });

    const stats = tracker.getStats();

    // GPT-4: $0.03/1K input tokens, $0.06/1K output tokens
    // Cost = (1000 * 0.03 / 1000) + (500 * 0.06 / 1000)
    // Cost = 0.03 + 0.03 = $0.06
    expect(stats.totalCost).toBeCloseTo(0.06, 4);
  });

  it('should calculate cost for OpenAI gpt-3.5-turbo correctly', () => {
    tracker.trackRequest('openai', 'gpt-3.5-turbo', {
      inputTokens: 1000,
      outputTokens: 500
    });

    const stats = tracker.getStats();

    // GPT-3.5-turbo: $0.0015/1K input, $0.002/1K output
    // Cost = (1000 * 0.0015 / 1000) + (500 * 0.002 / 1000)
    // Cost = 0.0015 + 0.001 = $0.0025
    expect(stats.totalCost).toBeCloseTo(0.0025, 4);
  });

  it('should calculate cost for Anthropic claude-3-opus correctly', () => {
    tracker.trackRequest('anthropic', 'claude-3-opus-20240229', {
      inputTokens: 1000,
      outputTokens: 500
    });

    const stats = tracker.getStats();

    // Claude 3 Opus: $0.015/1K input, $0.075/1K output
    // Cost = (1000 * 0.015 / 1000) + (500 * 0.075 / 1000)
    // Cost = 0.015 + 0.0375 = $0.0525
    expect(stats.totalCost).toBeCloseTo(0.0525, 4);
  });

  it('should calculate cost for Anthropic claude-3-sonnet correctly', () => {
    tracker.trackRequest('anthropic', 'claude-3-sonnet-20240229', {
      inputTokens: 1000,
      outputTokens: 500
    });

    const stats = tracker.getStats();

    // Claude 3 Sonnet: $0.003/1K input, $0.015/1K output
    // Cost = (1000 * 0.003 / 1000) + (500 * 0.015 / 1000)
    // Cost = 0.003 + 0.0075 = $0.0105
    expect(stats.totalCost).toBeCloseTo(0.0105, 4);
  });

  it('should calculate cost for DeepSeek correctly', () => {
    tracker.trackRequest('deepseek', 'deepseek-chat', {
      inputTokens: 1000,
      outputTokens: 500
    });

    const stats = tracker.getStats();

    // DeepSeek: $0.0002/1K input, $0.0006/1K output
    // Cost = (1000 * 0.0002 / 1000) + (500 * 0.0006 / 1000)
    // Cost = 0.0002 + 0.0003 = $0.0005
    expect(stats.totalCost).toBeCloseTo(0.0005, 4);
  });

  it('should accumulate costs across multiple requests', () => {
    tracker.trackRequest('openai', 'gpt-3.5-turbo', {
      inputTokens: 1000,
      outputTokens: 500
    });

    tracker.trackRequest('openai', 'gpt-4', {
      inputTokens: 500,
      outputTokens: 250
    });

    const stats = tracker.getStats();

    // Request 1: $0.0025
    // Request 2: $0.03 (gpt-4)
    // Total: $0.0325
    expect(stats.totalCost).toBeCloseTo(0.0325, 4);
  });
});

describe('AI Cost Tracking: Budget Warnings at Thresholds', () => {
  it('should warn at 10% budget threshold', () => {
    let warningFired = false;
    const tracker = new CostTracker({
      enabled: true,
      budgetLimit: 100, // $100 budget
      warningThreshold: 10, // Warn at 10%
      customPricing: {
        openai: {
          'gpt-4': { input: 0.03, output: 0.06 }
        }
      },
      onBudgetWarning: (spent: number, limit: number) => {
        warningFired = true;
        expect(spent).toBeGreaterThan(0);
        expect(limit).toBe(100);
      }
    });

    // Spend $10 (10% of budget)
    // GPT-4: $0.06 per 1000 input + 500 output tokens
    // Need 167 requests to reach $10
    for (let i = 0; i < 167; i++) {
      tracker.trackRequest('openai', 'gpt-4', {
        inputTokens: 1000,
        outputTokens: 500
      });
    }

    const stats = tracker.getStats();
    const percentage = (stats.totalCost / 100) * 100;

    expect(percentage).toBeGreaterThan(9);
    expect(percentage).toBeLessThan(12);
    expect(warningFired).toBe(true);
  });

  it('should warn at 50% budget threshold', () => {
    let warningFired = false;

    const tracker = new CostTracker({
      enabled: true,
      budgetLimit: 1, // $1 budget
      warningThreshold: 50,
      customPricing: {
        openai: {
          'gpt-4': { input: 0.03, output: 0.06 }
        }
      },
      onBudgetWarning: (spent: number, limit: number) => {
        const percentage = (spent / limit) * 100;
        if (percentage >= 50) {
          warningFired = true;
        }
      }
    });

    // Spend $0.50 (50% of budget)
    // Need ~8 gpt-4 requests at $0.06 each
    for (let i = 0; i < 9; i++) {
      tracker.trackRequest('openai', 'gpt-4', {
        inputTokens: 1000,
        outputTokens: 500
      });
    }

    expect(warningFired).toBe(true);
  });

  it('should warn at 90% budget threshold', () => {
    let warningFired = false;
    let warningPercentage = 0;

    const tracker = new CostTracker({
      enabled: true,
      budgetLimit: 1,
      warningThreshold: 90,
      customPricing: {
        openai: {
          'gpt-4': { input: 0.03, output: 0.06 }
        }
      },
      onBudgetWarning: (spent: number, limit: number) => {
        const percentage = (spent / limit) * 100;
        if (percentage >= 90) {
          warningFired = true;
          warningPercentage = percentage;
        }
      }
    });

    // Spend $0.90 (90% of budget)
    for (let i = 0; i < 15; i++) {
      tracker.trackRequest('openai', 'gpt-4', {
        inputTokens: 1000,
        outputTokens: 500
      });
    }

    expect(warningFired).toBe(true);
    expect(warningPercentage).toBeGreaterThan(90);
  });

  it('should prevent requests when budget exceeded', () => {
    const tracker = new CostTracker({
      enabled: true,
      budgetLimit: 0.1, // $0.10 budget
      customPricing: {
        openai: {
          'gpt-4': { input: 0.03, output: 0.06 }
        }
      }
    });

    // Try to spend more than budget
    expect(() => {
      for (let i = 0; i < 10; i++) {
        tracker.trackRequest('openai', 'gpt-4', {
          inputTokens: 1000,
          outputTokens: 500
        });
      }
    }).toThrow();
  });
});

describe('AI Cost Tracking: Concurrent Requests', () => {
  it('should accurately track cost with concurrent requests', async () => {
    const tracker = new CostTracker({
      enabled: true,
      customPricing: {
        openai: {
          'gpt-3.5-turbo': { input: 0.0015, output: 0.002 }
        }
      }
    });

    // Simulate 100 concurrent requests
    const promises = Array.from({ length: 100 }, () =>
      Promise.resolve().then(() => {
        tracker.trackRequest('openai', 'gpt-3.5-turbo', {
          inputTokens: 100,
          outputTokens: 50
        });
      })
    );

    await Promise.all(promises);

    const stats = tracker.getStats();

    // Each request: (100 * 0.0015 / 1000) + (50 * 0.002 / 1000)
    // = 0.00015 + 0.0001 = 0.00025
    // 100 requests: $0.025
    expect(stats.totalCost).toBeCloseTo(0.025, 4);
    expect(stats.requestCount).toBe(100);
  });

  it('should handle race conditions in cost accumulation', async () => {
    const tracker = new CostTracker({
      enabled: true,
      customPricing: {
        openai: {
          'gpt-3.5-turbo': { input: 0.0015, output: 0.002 }
        }
      }
    });

    // Fire many concurrent requests to test thread safety
    const promises = Array.from({ length: 1000 }, () =>
      Promise.resolve().then(() => {
        tracker.trackRequest('openai', 'gpt-3.5-turbo', {
          inputTokens: 10,
          outputTokens: 5
        });
      })
    );

    await Promise.all(promises);

    const stats = tracker.getStats();

    expect(stats.requestCount).toBe(1000);
    // Cost should be accurate despite concurrent updates
    expect(stats.totalCost).toBeGreaterThan(0);
  });
});

describe('AI Cost Tracking: Cost Reset and Statistics', () => {
  it('should reset cost statistics', () => {
    const tracker = new CostTracker({
      enabled: true,
      customPricing: {
        openai: {
          'gpt-4': { input: 0.03, output: 0.06 }
        }
      }
    });

    tracker.trackRequest('openai', 'gpt-4', {
      inputTokens: 1000,
      outputTokens: 500
    });

    let stats = tracker.getStats();
    expect(stats.totalCost).toBeGreaterThan(0);

    tracker.reset();

    stats = tracker.getStats();
    expect(stats.totalCost).toBe(0);
    expect(stats.requestCount).toBe(0);
  });

  it('should track costs per provider', () => {
    const tracker = new CostTracker({
      enabled: true,
      customPricing: {
        openai: {
          'gpt-4': { input: 0.03, output: 0.06 }
        },
        anthropic: {
          'claude-3-opus-20240229': { input: 0.015, output: 0.075 }
        }
      }
    });

    tracker.trackRequest('openai', 'gpt-4', {
      inputTokens: 1000,
      outputTokens: 500
    });

    tracker.trackRequest('anthropic', 'claude-3-opus-20240229', {
      inputTokens: 1000,
      outputTokens: 500
    });

    const stats = tracker.getStats();

    expect(stats.providers).toHaveProperty('openai');
    expect(stats.providers).toHaveProperty('anthropic');
    expect(stats.providers.openai.cost).toBeCloseTo(0.06, 4);
    expect(stats.providers.anthropic.cost).toBeCloseTo(0.0525, 4);
  });

  it('should track costs per model', () => {
    const tracker = new CostTracker({
      enabled: true,
      customPricing: {
        openai: {
          'gpt-4': { input: 0.03, output: 0.06 },
          'gpt-3.5-turbo': { input: 0.0015, output: 0.002 }
        }
      }
    });

    tracker.trackRequest('openai', 'gpt-4', {
      inputTokens: 1000,
      outputTokens: 500
    });

    tracker.trackRequest('openai', 'gpt-3.5-turbo', {
      inputTokens: 1000,
      outputTokens: 500
    });

    const stats = tracker.getStats();

    expect(stats.models).toHaveProperty('gpt-4');
    expect(stats.models).toHaveProperty('gpt-3.5-turbo');
    expect(stats.models['gpt-4'].cost).toBeCloseTo(0.06, 4);
    expect(stats.models['gpt-3.5-turbo'].cost).toBeCloseTo(0.0025, 4);
  });
});
