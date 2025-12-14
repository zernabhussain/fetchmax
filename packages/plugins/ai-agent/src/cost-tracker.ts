import type { CostTrackingConfig, CostStats } from './types';
import { BudgetExceededError } from './errors';

/**
 * Cost Tracker
 * Tracks AI usage costs and enforces budget limits
 */
export class CostTracker {
  private totalRequests = 0;
  private totalPromptTokens = 0;
  private totalCompletionTokens = 0;
  private totalCostUSD = 0;

  constructor(private config: CostTrackingConfig) {}

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
