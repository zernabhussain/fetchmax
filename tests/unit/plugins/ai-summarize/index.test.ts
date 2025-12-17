import { describe, it, expect } from 'vitest';
import { aiSummarizePlugin } from '@fetchmax/plugin-ai-summarize';
import type { AISummarizeConfig } from '@fetchmax/plugin-ai-summarize';

describe('aiSummarizePlugin', () => {
  it('should create plugin with correct name', () => {
    const plugin = aiSummarizePlugin();
    expect(plugin.name).toBe('ai-summarize');
  });

  it('should create plugin with default config', () => {
    const plugin = aiSummarizePlugin({});
    expect(plugin.name).toBe('ai-summarize');
  });

  it('should expose stats method', () => {
    const plugin = aiSummarizePlugin() as any;

    expect(plugin.getStats).toBeDefined();
    const stats = plugin.getStats();

    expect(stats).toHaveProperty('totalRequests');
    expect(stats).toHaveProperty('summarizedResponses');
    expect(stats).toHaveProperty('cacheHits');
  });

  it('should expose clearCache method', () => {
    const plugin = aiSummarizePlugin() as any;

    expect(plugin.clearCache).toBeDefined();
    expect(() => plugin.clearCache()).not.toThrow();
  });

  it('should support short summary length', () => {
    const config: AISummarizeConfig = {
      length: 'short'
    };

    const plugin = aiSummarizePlugin(config);
    expect(plugin.name).toBe('ai-summarize');
  });

  it('should support bullet-points style', () => {
    const config: AISummarizeConfig = {
      style: 'bullet-points'
    };

    const plugin = aiSummarizePlugin(config);
    expect(plugin.name).toBe('ai-summarize');
  });

  it('should support field selection', () => {
    const config: AISummarizeConfig = {
      fields: {
        include: ['description', 'content'],
        exclude: ['id'],
        minLength: 100
      }
    };

    const plugin = aiSummarizePlugin(config);
    expect(plugin.name).toBe('ai-summarize');
  });

  it('should support endpoint filtering', () => {
    const config: AISummarizeConfig = {
      endpoints: ['/api/posts', /^\/api\/articles\/.*/]
    };

    const plugin = aiSummarizePlugin(config);
    expect(plugin.name).toBe('ai-summarize');
  });

  it('should support custom summary field', () => {
    const config: AISummarizeConfig = {
      summaryField: '_tldr'
    };

    const plugin = aiSummarizePlugin(config);
    expect(plugin.name).toBe('ai-summarize');
  });

  it('should support caching configuration', () => {
    const config: AISummarizeConfig = {
      cache: true,
      cacheTTL: 7200000
    };

    const plugin = aiSummarizePlugin(config);
    expect(plugin.name).toBe('ai-summarize');
  });
});
