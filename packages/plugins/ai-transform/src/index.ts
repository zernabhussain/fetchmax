import type { Plugin, HttpResponse, PluginContext } from '@fetchmax/core';
import type { AITransformConfig, TransformRule, TransformStats, CachedTransform } from './types';
import { AIAgentNotFoundError, TransformationError, TransformConfigError } from './errors';

// Export types and errors
export * from './types';
export * from './errors';

/**
 * AI Transform Plugin
 * Apply custom AI-powered transformations to API responses
 */
export function aiTransformPlugin(config: AITransformConfig): Plugin {
  // Validate configuration
  if (!config.transforms || config.transforms.length === 0) {
    throw new TransformConfigError('At least one transformation rule must be configured');
  }

  // Initialize cache
  const cache = new Map<string, CachedTransform>();
  const cacheTTL = config.cacheTTL || 3600000;

  // Initialize stats
  const stats: TransformStats = {
    totalRequests: 0,
    transformedResponses: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageTransformationTime: 0,
    transformCount: {}
  };

  let totalTransformationTime = 0;

  /**
   * Check if endpoint should be transformed
   */
  function shouldTransform(url: string): boolean {
    if (!config.endpoints || config.endpoints.length === 0) {
      return true;
    }

    return config.endpoints.some(pattern => {
      if (typeof pattern === 'string') {
        return url.includes(pattern);
      } else if (pattern instanceof RegExp) {
        return pattern.test(url);
      }
      return false;
    });
  }

  /**
   * Get nested value from object
   */
  function getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set nested value in object
   */
  function setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!(key in current)) {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Apply transformation using AI
   */
  async function applyTransform(
    data: any,
    rule: TransformRule,
    context: PluginContext
  ): Promise<any> {
    const client = context.client;

    if (!client || !client.aiAgent) {
      throw new AIAgentNotFoundError();
    }

    try {
      // Get input data
      const input = rule.field ? getNestedValue(data, rule.field) : data;

      if (input === undefined) {
        return data;
      }

      const inputStr = JSON.stringify(input);
      const cacheKey = `${rule.prompt}:${inputStr}`;

      // Check cache
      const cacheEnabled = rule.cache !== false && config.cache !== false;
      if (cacheEnabled) {
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < cacheTTL) {
          stats.cacheHits++;
          return JSON.parse(cached.output);
        }
        stats.cacheMisses++;
      }

      // Apply transformation
      const prompt = `${rule.prompt}\n\nInput data:\n${inputStr}\n\nReturn only the transformed data as valid JSON.`;
      const result = await client.aiAgent.askJSON(prompt);

      // Cache the result
      if (cacheEnabled) {
        cache.set(cacheKey, {
          input: inputStr,
          output: JSON.stringify(result),
          timestamp: Date.now()
        });
      }

      // Update stats
      stats.transformCount[rule.prompt] = (stats.transformCount[rule.prompt] || 0) + 1;

      return result;
    } catch (error) {
      throw new TransformationError(
        `Failed to apply transformation: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  const plugin: Plugin = {
    name: 'ai-transform',

    async onResponse(response: HttpResponse, context: PluginContext) {
      stats.totalRequests++;

      const url = response.config.url || '';

      if (!shouldTransform(url)) {
        return response;
      }

      const startTime = Date.now();

      try {
        const data = response.data;

        if (!data || typeof data !== 'object') {
          return response;
        }

        let transformedData = JSON.parse(JSON.stringify(data));

        // Apply each transformation
        for (const rule of config.transforms) {
          const transformed = await applyTransform(transformedData, rule, context);

          if (rule.targetField) {
            // Set to specific target field
            setNestedValue(transformedData, rule.targetField, transformed);
          } else if (rule.field) {
            // Replace the source field
            setNestedValue(transformedData, rule.field, transformed);
          } else {
            // Replace entire response
            transformedData = transformed;
          }
        }

        const transformationTime = Date.now() - startTime;
        totalTransformationTime += transformationTime;
        stats.transformedResponses++;

        if (config.debug) {
          console.log(`[AI Transform] Applied ${config.transforms.length} transformation(s) in ${transformationTime}ms`);
        }

        return {
          ...response,
          data: transformedData
        };
      } catch (error) {
        console.error('[AI Transform] Transformation failed:', error);
        return response;
      }
    }
  };

  // Expose utility methods
  (plugin as any).getStats = (): TransformStats => {
    const avgTime =
      stats.transformedResponses > 0
        ? totalTransformationTime / stats.transformedResponses
        : 0;

    return {
      ...stats,
      averageTransformationTime: avgTime
    };
  };

  (plugin as any).clearCache = () => {
    cache.clear();
  };

  return plugin;
}

export default aiTransformPlugin;
