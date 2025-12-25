import { describe, it, expect, vi } from 'vitest';
import { CostTracker } from '@fetchmax/plugin-ai-agent';
import { BudgetExceededError } from '@fetchmax/plugin-ai-agent';

describe('CostTracker', () => {
  it('should track requests and costs', () => {
    const tracker = new CostTracker({ enabled: true });

    tracker.record(100, 50, 0.001);
    tracker.record(200, 100, 0.002);

    const stats = tracker.getStats();

    expect(stats.totalRequests).toBe(2);
    expect(stats.promptTokens).toBe(300);
    expect(stats.completionTokens).toBe(150);
    expect(stats.totalTokens).toBe(450);
    expect(stats.totalCost).toBe(0.003);
    expect(stats.averageCost).toBe(0.0015);
  });

  it('should not track when disabled', () => {
    const tracker = new CostTracker({ enabled: false });

    tracker.record(100, 50, 0.001);

    const stats = tracker.getStats();

    expect(stats.totalRequests).toBe(0);
    expect(stats.totalCost).toBe(0);
  });

  it('should throw error when budget exceeded', () => {
    const tracker = new CostTracker({
      enabled: true,
      budgetLimit: 0.01
    });

    tracker.record(100, 50, 0.005);

    expect(() => {
      tracker.record(200, 100, 0.006);
    }).toThrow(BudgetExceededError);
  });

  it('should call budget warning callback', () => {
    const onBudgetWarning = vi.fn();

    const tracker = new CostTracker({
      enabled: true,
      budgetLimit: 0.01,
      warningThreshold: 50,
      onBudgetWarning
    });

    tracker.record(100, 50, 0.003);
    expect(onBudgetWarning).not.toHaveBeenCalled();

    tracker.record(100, 50, 0.003);
    expect(onBudgetWarning).toHaveBeenCalledWith(0.006, 0.01);
  });

  it('should call budget exceeded callback', () => {
    const onBudgetExceeded = vi.fn();

    const tracker = new CostTracker({
      enabled: true,
      budgetLimit: 0.01,
      onBudgetExceeded
    });

    tracker.record(100, 50, 0.005);

    try {
      tracker.record(200, 100, 0.006);
    } catch {
      // Expected error
    }

    expect(onBudgetExceeded).toHaveBeenCalledWith(0.011, 0.01);
  });

  it('should reset statistics', () => {
    const tracker = new CostTracker({ enabled: true });

    tracker.record(100, 50, 0.001);
    tracker.reset();

    const stats = tracker.getStats();

    expect(stats.totalRequests).toBe(0);
    expect(stats.totalCost).toBe(0);
  });

  it('should check if request can be made', () => {
    const tracker = new CostTracker({
      enabled: true,
      budgetLimit: 0.01
    });

    tracker.record(100, 50, 0.005);

    expect(tracker.canMakeRequest(0.004)).toBe(true);
    expect(tracker.canMakeRequest(0.006)).toBe(false);
  });

  it('should include budget info in stats when limit set', () => {
    const tracker = new CostTracker({
      enabled: true,
      budgetLimit: 0.01
    });

    tracker.record(100, 50, 0.003);

    const stats = tracker.getStats();

    expect(stats.budgetLimit).toBe(0.01);
    expect(stats.remainingBudget).toBe(0.007);
  });
});
