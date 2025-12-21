import type { CostTrackingConfig, CostStats } from './types';
import { BudgetExceededError } from './errors';

/**
 * Cost Tracker
 * Tracks AI usage costs and enforces budget limits
 *
 * ⚠️ IMPORTANT: You must provide pricing for all models you use!
 * LLM providers frequently change their pricing. To ensure accurate cost tracking,
 * you must provide current pricing data via the customPricing config.
 *
 * Check current pricing at:
 * - OpenAI: https://openai.com/api/pricing/
 * - Anthropic: https://www.anthropic.com/pricing
 * - DeepSeek: https://platform.deepseek.com/pricing
 * - Google: https://ai.google.dev/pricing
 *
 * @example
 * costTracking: {
 *   enabled: true,
 *   customPricing: {
 *     openai: {
 *       'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
 *       'gpt-4': { input: 0.03, output: 0.06 }
 *     },
 *     anthropic: {
 *       'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 }
 *     }
 *   }
 * }
 */
export class CostTracker {
  private totalRequests = 0;
  private totalPromptTokens = 0;
  private totalCompletionTokens = 0;
  private totalCostUSD = 0;
  private providerStats: Record<string, { cost: number; requests: number }> = {};
  private modelStats: Record<string, { cost: number; requests: number }> = {};
  private pricing: Record<string, Record<string, { input: number; output: number }>>;

  constructor(private config: CostTrackingConfig = { enabled: true }) {
    // Use user-provided pricing (required for cost tracking)
    this.pricing = config.customPricing || {};
  }

  /**
   * Estimate tokens for a text string
   * Uses a simple heuristic: ~1 token per 4 characters
   * This is a rough approximation and may not match exact provider counting
   */
  estimateTokens(text: string): number {
    if (!text || text.length === 0) {
      return 0;
    }

    // Approximate: 1 token ≈ 4 characters for English text
    // This is a rough estimate; actual tokenization varies by model
    const estimate = Math.ceil(text.length / 4);

    return estimate;
  }

  /**
   * Track a request with provider and model information
   * Calculates cost based on user-provided pricing
   */
  trackRequest(
    provider: string,
    model: string,
    tokens: { inputTokens: number; outputTokens: number }
  ): void {
    if (!this.config.enabled) {
      return;
    }

    // Get user-provided pricing for this model
    const pricing = this.pricing[provider]?.[model];
    if (!pricing) {
      // User must provide pricing for cost tracking to work accurately
      console.warn(
        `⚠️  No pricing data for ${provider}/${model}.\n` +
        `Cost tracking will show $0 for this request.\n` +
        `To enable accurate cost tracking, add pricing to your config:\n\n` +
        `costTracking: {\n` +
        `  enabled: true,\n` +
        `  customPricing: {\n` +
        `    ${provider}: {\n` +
        `      '${model}': { input: 0.00X, output: 0.00X }\n` +
        `    }\n` +
        `  }\n` +
        `}\n\n` +
        `Check current pricing:\n` +
        `- OpenAI: https://openai.com/api/pricing/\n` +
        `- Anthropic: https://www.anthropic.com/pricing\n` +
        `- DeepSeek: https://platform.deepseek.com/pricing`
      );
      this.record(tokens.inputTokens, tokens.outputTokens, 0);
      return;
    }

    const inputCost = (tokens.inputTokens * pricing.input) / 1000;
    const outputCost = (tokens.outputTokens * pricing.output) / 1000;
    const totalCost = inputCost + outputCost;

    // Track per-provider stats
    if (!this.providerStats[provider]) {
      this.providerStats[provider] = { cost: 0, requests: 0 };
    }
    this.providerStats[provider].cost += totalCost;
    this.providerStats[provider].requests += 1;

    // Track per-model stats
    if (!this.modelStats[model]) {
      this.modelStats[model] = { cost: 0, requests: 0 };
    }
    this.modelStats[model].cost += totalCost;
    this.modelStats[model].requests += 1;

    // Record the request
    this.record(tokens.inputTokens, tokens.outputTokens, totalCost);
  }

  /**
   * Record a request and its cost
   */
  record(promptTokens: number, completionTokens: number, costUSD: number): void {
    if (!this.config.enabled) {
      return;
    }

    this.totalRequests++;
    this.totalPromptTokens += promptTokens;
    this.totalCompletionTokens += completionTokens;
    this.totalCostUSD += costUSD;

    // Check budget limit
    if (this.config.budgetLimit) {
      const spent = this.totalCostUSD;
      const limit = this.config.budgetLimit;

      // Check if budget exceeded
      if (spent >= limit) {
        if (this.config.onBudgetExceeded) {
          this.config.onBudgetExceeded(spent, limit);
        }
        throw new BudgetExceededError(spent, limit);
      }

      // Check if warning threshold reached
      const threshold = this.config.warningThreshold || 80;
      const percentUsed = (spent / limit) * 100;

      if (percentUsed >= threshold && this.config.onBudgetWarning) {
        this.config.onBudgetWarning(spent, limit);
      }
    }
  }

  /**
   * Get current cost statistics
   */
  getStats(): CostStats {
    const stats: CostStats = {
      totalRequests: this.totalRequests,
      requestCount: this.totalRequests, // Alias for tests
      requests: this.totalRequests, // Alias for demos
      totalTokens: this.totalPromptTokens + this.totalCompletionTokens,
      promptTokens: this.totalPromptTokens,
      completionTokens: this.totalCompletionTokens,
      totalCost: this.totalCostUSD,
      averageCost: this.totalRequests > 0 ? this.totalCostUSD / this.totalRequests : 0
    };

    if (this.config.budgetLimit) {
      stats.budgetLimit = this.config.budgetLimit;
      stats.remainingBudget = this.config.budgetLimit - this.totalCostUSD;
    }

    // Include per-provider stats if available
    if (Object.keys(this.providerStats).length > 0) {
      stats.providers = { ...this.providerStats };
    }

    // Include per-model stats if available
    if (Object.keys(this.modelStats).length > 0) {
      stats.models = { ...this.modelStats };
    }

    return stats;
  }

  /**
   * Reset all statistics
   */
  reset(): void {
    this.totalRequests = 0;
    this.totalPromptTokens = 0;
    this.totalCompletionTokens = 0;
    this.totalCostUSD = 0;
    this.providerStats = {};
    this.modelStats = {};
  }

  /**
   * Check if budget allows for a request
   * @param estimatedCost - Estimated cost for the request
   * @returns true if request is allowed
   */
  canMakeRequest(estimatedCost: number = 0): boolean {
    if (!this.config.enabled || !this.config.budgetLimit) {
      return true;
    }

    return this.totalCostUSD + estimatedCost < this.config.budgetLimit;
  }
}
