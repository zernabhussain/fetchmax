import { describe, it, expect } from 'vitest';
import {
  aiTranslatePlugin,
  TranslationConfigError
} from '@fetchmax/plugin-ai-translate';
import type { AITranslateConfig } from '@fetchmax/plugin-ai-translate';

describe('aiTranslatePlugin', () => {
  it('should create plugin with correct name', () => {
    const config: AITranslateConfig = {
      targetLanguages: ['es']
    };

    const plugin = aiTranslatePlugin(config);

    expect(plugin.name).toBe('ai-translate');
  });

  it('should throw error if no target languages configured', () => {
    expect(() => {
      aiTranslatePlugin({ targetLanguages: [] });
    }).toThrow(TranslationConfigError);
  });

  it('should normalize single target language to array', () => {
    const config: AITranslateConfig = {
      targetLanguages: 'es'
    };

    const plugin = aiTranslatePlugin(config);

    expect(plugin.name).toBe('ai-translate');
  });

  it('should expose stats method', () => {
    const config: AITranslateConfig = {
      targetLanguages: ['es']
    };

    const plugin = aiTranslatePlugin(config) as any;

    expect(plugin.getStats).toBeDefined();
    const stats = plugin.getStats();

    expect(stats).toHaveProperty('totalRequests');
    expect(stats).toHaveProperty('translatedResponses');
    expect(stats).toHaveProperty('cacheHits');
    expect(stats).toHaveProperty('languagesUsed');
  });

  it('should expose cache stats method', () => {
    const config: AITranslateConfig = {
      targetLanguages: ['es']
    };

    const plugin = aiTranslatePlugin(config) as any;

    expect(plugin.getCacheStats).toBeDefined();
    const cacheStats = plugin.getCacheStats();

    expect(cacheStats).toHaveProperty('entries');
    expect(cacheStats).toHaveProperty('hits');
  });

  it('should expose clearCache method', () => {
    const config: AITranslateConfig = {
      targetLanguages: ['es']
    };

    const plugin = aiTranslatePlugin(config) as any;

    expect(plugin.clearCache).toBeDefined();
    expect(() => plugin.clearCache()).not.toThrow();
  });

  it('should support multiple target languages', () => {
    const config: AITranslateConfig = {
      targetLanguages: ['es', 'fr', 'de']
    };

    const plugin = aiTranslatePlugin(config);

    expect(plugin.name).toBe('ai-translate');
  });

  it('should support replace strategy', () => {
    const config: AITranslateConfig = {
      targetLanguages: ['es'],
      strategy: 'replace'
    };

    const plugin = aiTranslatePlugin(config);

    expect(plugin.name).toBe('ai-translate');
  });

  it('should support merge strategy', () => {
    const config: AITranslateConfig = {
      targetLanguages: ['es', 'fr'],
      strategy: 'merge'
    };

    const plugin = aiTranslatePlugin(config);

    expect(plugin.name).toBe('ai-translate');
  });

  it('should support separate strategy with custom field', () => {
    const config: AITranslateConfig = {
      targetLanguages: ['es'],
      strategy: 'separate',
      translationsField: '_i18n'
    };

    const plugin = aiTranslatePlugin(config);

    expect(plugin.name).toBe('ai-translate');
  });

  it('should support field selector with include', () => {
    const config: AITranslateConfig = {
      targetLanguages: ['es'],
      fields: {
        include: ['title', 'description']
      }
    };

    const plugin = aiTranslatePlugin(config);

    expect(plugin.name).toBe('ai-translate');
  });

  it('should support field selector with exclude', () => {
    const config: AITranslateConfig = {
      targetLanguages: ['es'],
      fields: {
        exclude: ['id', 'createdAt']
      }
    };

    const plugin = aiTranslatePlugin(config);

    expect(plugin.name).toBe('ai-translate');
  });

  it('should support endpoint filtering', () => {
    const config: AITranslateConfig = {
      targetLanguages: ['es'],
      endpoints: ['/api/products', /^\/api\/posts\/.*/]
    };

    const plugin = aiTranslatePlugin(config);

    expect(plugin.name).toBe('ai-translate');
  });

  it('should support source language specification', () => {
    const config: AITranslateConfig = {
      targetLanguages: ['es'],
      sourceLanguage: 'en'
    };

    const plugin = aiTranslatePlugin(config);

    expect(plugin.name).toBe('ai-translate');
  });

  it('should support caching configuration', () => {
    const config: AITranslateConfig = {
      targetLanguages: ['es'],
      cache: true,
      cacheTTL: 3600000
    };

    const plugin = aiTranslatePlugin(config);

    expect(plugin.name).toBe('ai-translate');
  });
});
