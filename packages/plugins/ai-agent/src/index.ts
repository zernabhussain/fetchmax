import type { Plugin } from '@fetchmax/core';
import type {
  AIAgentConfig,
  AIMessage,
  AIResponse,
  AIStreamChunk,
  AIModelConfig,
  CostStats,
  CostTrackingConfig,
  RateLimitConfig
} from './types';
import { AIProviderInterface } from './providers/base';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { CostTracker } from './cost-tracker';
import { RateLimiter } from './rate-limiter';
import {
  InvalidProviderError,
  APIKeyMissingError,
  ProviderConfigError
} from './errors';

// Export types and errors
export * from './types';
export * from './errors';
export { OpenAIProvider, AnthropicProvider };
export { CostTracker } from './cost-tracker';
export { RateLimiter } from './rate-limiter';

/**
 * AI Agent Plugin
 * Provides unified interface to connect with AI providers (OpenAI, Anthropic, etc.)
 */
export function aiAgentPlugin(config: AIAgentConfig): Plugin {
  // Validate configuration
  if (!config.provider) {
    throw new ProviderConfigError('Provider is required');
  }

  if (!config.apiKey) {
    throw new APIKeyMissingError(config.provider);
  }

  if (!config.model) {
    throw new ProviderConfigError('Model is required');
  }

  // Initialize provider
  const provider = createProvider(config);

  // Initialize cost tracker
  const costTracker = createCostTracker(config);

  // Initialize rate limiter
  const rateLimiter = createRateLimiter(config);

  // Create AI Agent API that will be exposed on client
  const aiAgent = {
    /**
     * Ask a simple question
     */
    async ask(prompt: string, options?: Partial<AIModelConfig>): Promise<AIResponse> {
      // Check rate limit
      await rateLimiter.waitForLimit();

      // Make request
      const response = await provider.ask(prompt, options);

      // Track cost
      if (response.usage) {
        const cost = response.cost || 0;
        costTracker.record(
          response.usage.promptTokens,
          response.usage.completionTokens,
          cost
        );
        rateLimiter.record(response.usage.totalTokens);
      }

      return response;
    },

    /**
     * Ask for structured JSON response
     */
    async askJSON<T = any>(
      prompt: string,
      schema?: any,
      options?: Partial<AIModelConfig>
    ): Promise<T> {
      // Check rate limit
      await rateLimiter.waitForLimit();

      // Enhance prompt to request JSON
      const enhancedPrompt = schema
        ? `${prompt}\n\nRespond with valid JSON matching this structure: ${JSON.stringify(schema)}`
        : `${prompt}\n\nRespond with valid JSON only.`;

      // Use ask() to get full response with usage tracking
      const response = await provider.ask(enhancedPrompt, {
        ...options,
        responseFormat: 'json'
      });

      // Track cost
      if (response.usage) {
        const cost = response.cost || 0;
        costTracker.record(
          response.usage.promptTokens,
          response.usage.completionTokens,
          cost
        );
        rateLimiter.record(response.usage.totalTokens);
      }

      // Parse and return JSON
      try {
        return JSON.parse(response.content) as T;
      } catch (error) {
        // If parsing fails, return as-is (might already be parsed)
        return response.content as T;
      }
    },

    /**
     * Have a conversation with message history
     */
    async chat(
      messages: AIMessage[],
      options?: Partial<AIModelConfig>
    ): Promise<AIResponse> {
      // Check rate limit
      await rateLimiter.waitForLimit();

      // Make request
      const response = await provider.chat(messages, options);

      // Track cost
      if (response.usage) {
        const cost = response.cost || 0;
        costTracker.record(
          response.usage.promptTokens,
          response.usage.completionTokens,
          cost
        );
        rateLimiter.record(response.usage.totalTokens);
      }

      return response;
    },

    /**
     * Stream a response
     */
    stream(
      prompt: string,
      options?: Partial<AIModelConfig>
    ): AsyncGenerator<AIStreamChunk, void, unknown> {
      return provider.stream(prompt, options);
    },

    /**
     * Get cost statistics
     */
    getCostStats(): CostStats {
      return costTracker.getStats();
    },

    /**
     * Get rate limit statistics
     */
    getRateLimitStats() {
      return rateLimiter.getStats();
    },

    /**
     * Reset cost tracking
     */
    resetCostTracking(): void {
      costTracker.reset();
    },

    /**
     * Reset rate limiting
     */
    resetRateLimiting(): void {
      rateLimiter.reset();
    },

    /**
     * Get provider instance (for advanced usage)
     */
    getProvider(): AIProviderInterface {
      return provider;
    }
  };

  // Return plugin
  const plugin: Plugin & { aiAgent: typeof aiAgent } = {
    name: 'ai-agent',

    // Expose aiAgent API on the plugin
    aiAgent,

    // No request/response hooks needed for this plugin
    // Consumer plugins will access aiAgent via context.client.aiAgent
  };

  return plugin;
}

/**
 * Create provider instance based on configuration
 */
function createProvider(config: AIAgentConfig): AIProviderInterface {
  const { provider, apiKey, model, apiEndpoint, timeout } = config;

  switch (provider) {
    case 'openai':
      return new OpenAIProvider(apiKey, model, apiEndpoint, timeout);

    case 'anthropic':
      return new AnthropicProvider(apiKey, model, apiEndpoint, timeout);

    case 'deepseek':
      // DeepSeek uses OpenAI-compatible API
      return new OpenAIProvider(
        apiKey,
        model,
        apiEndpoint || 'https://api.deepseek.com/v1/chat/completions',
        timeout
      );

    case 'google':
      throw new InvalidProviderError(
        'Google Gemini provider not yet implemented. Coming soon!'
      );

    case 'ollama':
      throw new InvalidProviderError('Ollama provider not yet implemented. Coming soon!');

    case 'custom':
      if (!apiEndpoint) {
        throw new ProviderConfigError(
          'API endpoint is required for custom provider'
        );
      }
      // Use OpenAI-compatible interface for custom endpoint
      return new OpenAIProvider(apiKey, model, apiEndpoint, timeout);

    default:
      throw new InvalidProviderError(provider);
  }
}

/**
 * Create cost tracker instance
 * Cost tracking is DISABLED by default - only enabled if explicitly configured
 */
function createCostTracker(config: AIAgentConfig): CostTracker {
  // If no costTracking config provided, disable it
  if (!config.costTracking) {
    return new CostTracker({ enabled: false });
  }

  // If costTracking is provided (boolean true or object), enable it
  const costConfig: CostTrackingConfig =
    typeof config.costTracking === 'object'
      ? { enabled: true, ...config.costTracking }
      : { enabled: true };

  return new CostTracker(costConfig);
}

/**
 * Create rate limiter instance
 */
function createRateLimiter(config: AIAgentConfig): RateLimiter {
  if (config.rateLimiting === false) {
    return new RateLimiter({ enabled: false });
  }

  const rateConfig: RateLimitConfig =
    typeof config.rateLimiting === 'object'
      ? { enabled: true, ...config.rateLimiting }
      : { enabled: false };

  return new RateLimiter(rateConfig);
}

export default aiAgentPlugin;
