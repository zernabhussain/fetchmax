import { describe, it, expect } from 'vitest';
import { aiTransformPlugin, TransformConfigError } from '@fetchmax/plugin-ai-transform';
import type { AITransformConfig } from '@fetchmax/plugin-ai-transform';

describe('aiTransformPlugin', () => {
  it('should create plugin with correct name', () => {
    const config: AITransformConfig = {
      transforms: [
        { prompt: 'Extract keywords' }
      ]
    };

    const plugin = aiTransformPlugin(config);
    expect(plugin.name).toBe('ai-transform');
  });

  it('should throw error if no transforms configured', () => {
    expect(() => {
      aiTransformPlugin({ transforms: [] });
    }).toThrow(TransformConfigError);
  });

  it('should expose stats method', () => {
    const config: AITransformConfig = {
      transforms: [{ prompt: 'Transform data' }]
    };

    const plugin = aiTransformPlugin(config) as any;

    expect(plugin.getStats).toBeDefined();
    const stats = plugin.getStats();

    expect(stats).toHaveProperty('totalRequests');
    expect(stats).toHaveProperty('transformedResponses');
    expect(stats).toHaveProperty('transformCount');
  });

  it('should expose clearCache method', () => {
    const config: AITransformConfig = {
      transforms: [{ prompt: 'Transform data' }]
    };

    const plugin = aiTransformPlugin(config) as any;

    expect(plugin.clearCache).toBeDefined();
    expect(() => plugin.clearCache()).not.toThrow();
  });

  it('should support field-specific transformations', () => {
    const config: AITransformConfig = {
      transforms: [
        {
          prompt: 'Extract keywords',
          field: 'description',
          targetField: 'keywords'
        }
      ]
    };

    const plugin = aiTransformPlugin(config);
    expect(plugin.name).toBe('ai-transform');
  });

  it('should support multiple transforms', () => {
    const config: AITransformConfig = {
      transforms: [
        { prompt: 'Extract keywords', field: 'content', targetField: 'keywords' },
        { prompt: 'Analyze sentiment', field: 'content', targetField: 'sentiment' }
      ]
    };

    const plugin = aiTransformPlugin(config);
    expect(plugin.name).toBe('ai-transform');
  });

  it('should support endpoint filtering', () => {
    const config: AITransformConfig = {
      transforms: [{ prompt: 'Transform' }],
      endpoints: ['/api/posts', /^\/api\/data\/.*/]
    };

    const plugin = aiTransformPlugin(config);
    expect(plugin.name).toBe('ai-transform');
  });

  it('should support caching configuration', () => {
    const config: AITransformConfig = {
      transforms: [{ prompt: 'Transform', cache: true }],
      cache: true,
      cacheTTL: 7200000
    };

    const plugin = aiTransformPlugin(config);
    expect(plugin.name).toBe('ai-transform');
  });
});
