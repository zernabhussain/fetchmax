import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiAgentPlugin } from '@fetchmax/plugin-ai-agent';
import type { AIAgentConfig } from '@fetchmax/plugin-ai-agent';
import {
  InvalidProviderError,
  APIKeyMissingError,
  ProviderConfigError
} from '@fetchmax/plugin-ai-agent';

describe('aiAgentPlugin', () => {
  const mockConfig: AIAgentConfig = {
    provider: 'openai',
    apiKey: 'test-api-key',
    model: 'gpt-4o-mini'
  };

  it('should create plugin with correct name', () => {
    const plugin = aiAgentPlugin(mockConfig);

    expect(plugin.name).toBe('ai-agent');
    expect(plugin.aiAgent).toBeDefined();
  });

  it('should throw error if provider is missing', () => {
    expect(() => {
      aiAgentPlugin({ ...mockConfig, provider: undefined as any });
    }).toThrow(ProviderConfigError);
  });

  it('should throw error if API key is missing', () => {
    expect(() => {
      aiAgentPlugin({ ...mockConfig, apiKey: '' });
    }).toThrow(APIKeyMissingError);
  });

  it('should throw error if model is missing', () => {
    expect(() => {
      aiAgentPlugin({ ...mockConfig, model: undefined as any });
    }).toThrow(ProviderConfigError);
  });

  it('should throw error for invalid provider', () => {
    expect(() => {
      aiAgentPlugin({ ...mockConfig, provider: 'invalid' as any });
    }).toThrow(InvalidProviderError);
  });

  it('should create OpenAI provider', () => {
    const plugin = aiAgentPlugin({
      ...mockConfig,
      provider: 'openai'
    });

    const provider = plugin.aiAgent.getProvider();
    expect(provider.name).toBe('openai');
  });

  it('should create Anthropic provider', () => {
    const plugin = aiAgentPlugin({
      ...mockConfig,
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022'
    });

    const provider = plugin.aiAgent.getProvider();
    expect(provider.name).toBe('anthropic');
  });

  it('should create DeepSeek provider (OpenAI-compatible)', () => {
    const plugin = aiAgentPlugin({
      ...mockConfig,
      provider: 'deepseek'
    });

    const provider = plugin.aiAgent.getProvider();
    expect(provider.name).toBe('openai');
  });

  it('should create custom provider with endpoint', () => {
    const plugin = aiAgentPlugin({
      ...mockConfig,
      provider: 'custom',
      apiEndpoint: 'https://custom-api.example.com/v1/chat'
    });

    const provider = plugin.aiAgent.getProvider();
    expect(provider.name).toBe('openai');
  });

  it('should throw error for custom provider without endpoint', () => {
    expect(() => {
      aiAgentPlugin({
        ...mockConfig,
        provider: 'custom'
      });
    }).toThrow(ProviderConfigError);
  });

  it('should expose getCostStats method', () => {
    const plugin = aiAgentPlugin(mockConfig);

    const stats = plugin.aiAgent.getCostStats();

    expect(stats).toHaveProperty('totalRequests');
    expect(stats).toHaveProperty('totalCost');
    expect(stats.totalRequests).toBe(0);
  });

  it('should expose getRateLimitStats method', () => {
    const plugin = aiAgentPlugin(mockConfig);

    const stats = plugin.aiAgent.getRateLimitStats();

    expect(stats).toHaveProperty('requestsInLastMinute');
    expect(stats).toHaveProperty('tokensInLastMinute');
  });

  it('should disable cost tracking when set to false', () => {
    const plugin = aiAgentPlugin({
      ...mockConfig,
      costTracking: false
    });

    const stats = plugin.aiAgent.getCostStats();
    expect(stats.totalRequests).toBe(0);
  });

  it('should enable cost tracking with budget limit', () => {
    const plugin = aiAgentPlugin({
      ...mockConfig,
      costTracking: {
        budgetLimit: 10.0,
        warningThreshold: 80
      }
    });

    const stats = plugin.aiAgent.getCostStats();
    expect(stats.budgetLimit).toBe(10.0);
  });

  it('should reset cost tracking', () => {
    const plugin = aiAgentPlugin(mockConfig);

    plugin.aiAgent.resetCostTracking();

    const stats = plugin.aiAgent.getCostStats();
    expect(stats.totalRequests).toBe(0);
    expect(stats.totalCost).toBe(0);
  });

  it('should reset rate limiting', () => {
    const plugin = aiAgentPlugin({
      ...mockConfig,
      rateLimiting: {
        requestsPerMinute: 60
      }
    });

    plugin.aiAgent.resetRateLimiting();

    const stats = plugin.aiAgent.getRateLimitStats();
    expect(stats.requestsInLastMinute).toBe(0);
  });
});
