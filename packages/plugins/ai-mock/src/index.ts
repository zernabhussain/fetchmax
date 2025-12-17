import type { Plugin, RequestConfig, HttpResponse, PluginContext } from '@fetchmax/core';
import type {
  AIMockConfig,
  MockEndpointConfig,
  MockStats,
  HttpMethod,
  EndpointPattern
} from './types';
import { MockCache } from './cache';
import { PromptBuilder } from './prompt-builder';
import {
  AIAgentNotFoundError,
  MockGenerationError,
  MockConfigError
} from './errors';

// Export types and errors
export * from './types';
export * from './errors';
export { MockCache } from './cache';
export { PromptBuilder } from './prompt-builder';

/**
 * AI Mock Data Plugin
 * Generate realistic mock API responses using AI
 */
export function aiMockPlugin(config: AIMockConfig): Plugin {
  // Validate configuration
  if (!config.endpoints || Object.keys(config.endpoints).length === 0) {
    throw new MockConfigError('At least one endpoint must be configured');
  }

  // Initialize cache
  const cache = new MockCache(config.cacheTTL);

  // Initialize stats
  const stats: MockStats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    generatedMocks: 0,
    passthroughRequests: 0,
    averageGenerationTime: 0
  };

  let totalGenerationTime = 0;

  /**
   * Check if endpoint matches pattern
   */
  function matchesPattern(url: string, pattern: EndpointPattern): boolean {
    if (typeof pattern === 'string') {
      // Exact match or wildcard match
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(url);
      }
      return url === pattern || url.startsWith(pattern);
    } else if (pattern instanceof RegExp) {
      return pattern.test(url);
    }
    return false;
  }

  /**
   * Check if endpoint should passthrough
   */
  function shouldPassthrough(url: string): boolean {
    if (!config.passthrough) {
      return false;
    }

    return config.passthrough.some(pattern => matchesPattern(url, pattern));
  }

  /**
   * Find matching endpoint configuration
   */
  function findEndpointConfig(
    url: string,
    method: HttpMethod
  ): MockEndpointConfig | null {
    for (const [pattern, endpointConfig] of Object.entries(config.endpoints)) {
      if (matchesPattern(url, pattern)) {
        // Check if config has method-specific configuration
        if ('method' in endpointConfig || 'structure' in endpointConfig) {
          // Direct config
          const cfg = endpointConfig as MockEndpointConfig;
          if (!cfg.method || cfg.method === method) {
            return cfg;
          }
        } else {
          // Method-specific config
          const methodConfig = (endpointConfig as Record<HttpMethod, MockEndpointConfig>)[
            method
          ];
          if (methodConfig) {
            return methodConfig;
          }
        }
      }
    }

    return null;
  }

  /**
   * Generate mock data using AI
   */
  async function generateMock(
    endpointConfig: MockEndpointConfig,
    url: string,
    method: HttpMethod,
    context: PluginContext
  ): Promise<any> {
    const client = context.client;

    // Check if AI Agent plugin is available
    if (!client || !client.aiAgent) {
      throw new AIAgentNotFoundError();
    }

    const startTime = Date.now();

    try {
      // Build prompt
      let prompt = PromptBuilder.buildPrompt(endpointConfig, url, method);

      // Add global instructions
      if (config.globalInstructions) {
        prompt += `\n\nGlobal requirements: ${config.globalInstructions}`;
      }

      // Generate mock data using AI Agent
      const mockData = await client.aiAgent.askJSON(prompt);

      const generationTime = Date.now() - startTime;
      totalGenerationTime += generationTime;
      stats.generatedMocks++;

      if (config.debug) {
        console.log(`[AI Mock] Generated mock for ${method} ${url} in ${generationTime}ms`);
      }

      return mockData;
    } catch (error) {
      throw new MockGenerationError(
        `Failed to generate mock for ${method} ${url}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        url
      );
    }
  }

  const plugin: Plugin = {
    name: 'ai-mock',

    async onRequest(requestConfig: RequestConfig, context: PluginContext) {
      stats.totalRequests++;

      const url = requestConfig.url || '';
      const method = (requestConfig.method || 'GET') as HttpMethod;

      // Check if should passthrough
      if (shouldPassthrough(url)) {
        stats.passthroughRequests++;
        if (config.debug) {
          console.log(`[AI Mock] Passthrough: ${method} ${url}`);
        }
        return requestConfig;
      }

      // Find matching endpoint configuration
      const endpointConfig = findEndpointConfig(url, method);

      if (!endpointConfig) {
        // No mock configured for this endpoint
        return requestConfig;
      }

      // Check cache
      const cacheEnabled = endpointConfig.cache !== undefined
        ? endpointConfig.cache
        : config.cache !== false;

      if (cacheEnabled && cache.has(url, method)) {
        const cachedData = cache.get(url, method);
        stats.cacheHits++;

        if (config.debug) {
          console.log(`[AI Mock] Cache hit: ${method} ${url}`);
        }

        // Create mock response
        const mockResponse: HttpResponse = {
          data: cachedData,
          status: endpointConfig.statusCode || 200,
          statusText: 'OK',
          headers: new Headers({
            'Content-Type': 'application/json',
            'X-Mock-Source': 'ai-mock-plugin',
            'X-Mock-Cached': 'true'
          }),
          config: requestConfig,
          response: new Response(JSON.stringify(cachedData), {
            status: endpointConfig.statusCode || 200,
            statusText: 'OK'
          })
        };

        // Store mock response in context to return it
        context.mockResponse = mockResponse;

        // Prevent actual request by throwing the mock response
        throw mockResponse;
      }

      // Generate new mock
      stats.cacheMisses++;

      const mockData = await generateMock(endpointConfig, url, method, context);

      // Cache the generated mock
      if (cacheEnabled) {
        cache.set(url, method, mockData);
      }

      // Create mock response
      const mockResponse: HttpResponse = {
        data: mockData,
        status: endpointConfig.statusCode || 200,
        statusText: 'OK',
        headers: new Headers({
          'Content-Type': 'application/json',
          'X-Mock-Source': 'ai-mock-plugin',
          'X-Mock-Cached': 'false'
        }),
        config: requestConfig,
        response: new Response(JSON.stringify(mockData), {
          status: endpointConfig.statusCode || 200,
          statusText: 'OK'
        })
      };

      // Store mock response in context
      context.mockResponse = mockResponse;

      // Prevent actual request by throwing the mock response
      throw mockResponse;
    },

    async onError(error: any, _config: RequestConfig, context: PluginContext) {
      // Check if error is actually our mock response
      if (context.mockResponse) {
        // Return the mock response instead of throwing error
        return context.mockResponse;
      }

      // Otherwise, let the error propagate
      throw error;
    }
  };

  // Expose utility methods
  (plugin as any).getStats = (): MockStats => {
    const avgTime =
      stats.generatedMocks > 0
        ? totalGenerationTime / stats.generatedMocks
        : 0;

    return {
      ...stats,
      averageGenerationTime: avgTime
    };
  };

  (plugin as any).getCacheStats = () => cache.getStats();

  (plugin as any).clearCache = (endpoint?: string, method?: string) => {
    cache.clear(endpoint, method);
  };

  return plugin;
}

export default aiMockPlugin;
