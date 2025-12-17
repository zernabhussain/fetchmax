import type { Plugin, HttpResponse, PluginContext } from '@fetchmax/core';
import type { AITranslateConfig, Language, TranslationStats, TranslationStrategy } from './types';
import { TranslationCache } from './cache';
import { Translator } from './translator';
import { TranslationConfigError } from './errors';

// Export types and errors
export * from './types';
export * from './errors';
export { TranslationCache } from './cache';
export { Translator } from './translator';

/**
 * AI Translation Plugin
 * Automatically translate API responses into different languages
 */
export function aiTranslatePlugin(config: AITranslateConfig): Plugin {
  // Validate configuration
  if (!config.targetLanguages || (Array.isArray(config.targetLanguages) && config.targetLanguages.length === 0)) {
    throw new TranslationConfigError('At least one target language must be configured');
  }

  // Normalize target languages to array
  const targetLanguages = Array.isArray(config.targetLanguages)
    ? config.targetLanguages
    : [config.targetLanguages];

  // Initialize cache
  const cache = new TranslationCache(config.cacheTTL);

  // Initialize stats
  const stats: TranslationStats = {
    totalRequests: 0,
    translatedResponses: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageTranslationTime: 0,
    languagesUsed: {}
  };

  let totalTranslationTime = 0;

  /**
   * Check if endpoint should be translated
   */
  function shouldTranslate(url: string): boolean {
    if (!config.endpoints || config.endpoints.length === 0) {
      return true; // Translate all endpoints if not specified
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
   * Translate response data
   */
  async function translateResponse(
    response: HttpResponse,
    context: PluginContext
  ): Promise<HttpResponse> {
    const startTime = Date.now();

    try {
      // Extract data from response
      const data = response.data;

      if (!data || typeof data !== 'object') {
        // Cannot translate non-object responses
        return response;
      }

      // Extract translatable fields
      const fields = Translator.extractTranslatableFields(data, config.fields);

      if (fields.size === 0) {
        // No translatable fields found
        return response;
      }

      const strategy = config.strategy || 'separate';
      const translatedData = JSON.parse(JSON.stringify(data)); // Deep clone

      // Translate each field
      for (const [path, text] of fields.entries()) {
        // Check cache
        const cacheEnabled = config.cache !== false;
        let translations: Record<Language, string> | null = null;

        if (cacheEnabled) {
          translations = cache.get(text, targetLanguages);
          if (translations) {
            stats.cacheHits++;
          }
        }

        // Generate translation if not cached
        if (!translations) {
          if (cacheEnabled) {
            stats.cacheMisses++;
          }

          translations = await Translator.translateText(
            text,
            targetLanguages,
            config.sourceLanguage,
            context
          );

          // Cache the translation
          if (cacheEnabled) {
            cache.set(text, targetLanguages, translations);
          }
        }

        // Apply translation based on strategy
        applyTranslation(translatedData, path, text, translations, strategy);

        // Update language usage stats
        for (const lang of targetLanguages) {
          stats.languagesUsed[lang] = (stats.languagesUsed[lang] || 0) + 1;
        }
      }

      const translationTime = Date.now() - startTime;
      totalTranslationTime += translationTime;
      stats.translatedResponses++;

      if (config.debug) {
        console.log(`[AI Translate] Translated ${fields.size} field(s) in ${translationTime}ms`);
      }

      // Update response with translated data
      return {
        ...response,
        data: translatedData
      };
    } catch (error) {
      // Log error but don't break the response
      console.error('[AI Translate] Translation failed:', error);
      return response;
    }
  }

  /**
   * Apply translation to data based on strategy
   */
  function applyTranslation(
    data: any,
    path: string,
    originalText: string,
    translations: Record<Language, string>,
    strategy: TranslationStrategy
  ): void {
    switch (strategy) {
      case 'replace':
        // Replace original with first target language
        const firstLang = targetLanguages[0];
        if (firstLang) {
          Translator.setNestedValue(data, path, translations[firstLang]);
        }
        break;

      case 'merge':
        // Add translations with language suffixes
        for (const [lang, text] of Object.entries(translations)) {
          const translatedPath = `${path}_${lang}`;
          Translator.setNestedValue(data, translatedPath, text);
        }
        if (!config.preserveOriginal) {
          // Remove original field
          Translator.setNestedValue(data, path, undefined);
        }
        break;

      case 'separate':
      default:
        // Add translations to a separate field
        const translationsField = config.translationsField || '_translations';
        if (!data[translationsField]) {
          data[translationsField] = {};
        }
        if (!data[translationsField][path]) {
          data[translationsField][path] = {};
        }
        for (const [lang, text] of Object.entries(translations)) {
          data[translationsField][path][lang] = text;
        }
        if (config.preserveOriginal !== false) {
          data[translationsField][path].original = originalText;
        }
        break;
    }
  }

  const plugin: Plugin = {
    name: 'ai-translate',

    async onResponse(response: HttpResponse, context: PluginContext) {
      stats.totalRequests++;

      const url = response.config.url || '';

      // Check if endpoint should be translated
      if (!shouldTranslate(url)) {
        return response;
      }

      // Translate response
      return translateResponse(response, context);
    }
  };

  // Expose utility methods
  (plugin as any).getStats = (): TranslationStats => {
    const avgTime =
      stats.translatedResponses > 0
        ? totalTranslationTime / stats.translatedResponses
        : 0;

    return {
      ...stats,
      averageTranslationTime: avgTime
    };
  };

  (plugin as any).getCacheStats = () => cache.getStats();

  (plugin as any).clearCache = () => {
    cache.clear();
  };

  return plugin;
}

export default aiTranslatePlugin;
