import type { Plugin, HttpResponse, PluginContext } from '@fetchmax/core';
import type { AISummarizeConfig, SummarizeStats, CachedSummary, SummaryLength, SummaryStyle } from './types';
import { AIAgentNotFoundError, SummarizationError } from './errors';

// Export types and errors
export * from './types';
export * from './errors';

/**
 * AI Summarize Plugin
 * Automatically summarize long text content in API responses
 */
export function aiSummarizePlugin(config: AISummarizeConfig = {}): Plugin {
  // Initialize cache
  const cache = new Map<string, CachedSummary>();
  const cacheTTL = config.cacheTTL || 3600000;

  // Initialize stats
  const stats: SummarizeStats = {
    totalRequests: 0,
    summarizedResponses: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageSummarizationTime: 0,
    totalCharactersSummarized: 0
  };

  let totalSummarizationTime = 0;

  /**
   * Check if endpoint should be summarized
   */
  function shouldSummarize(url: string): boolean {
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
   * Extract text fields to summarize
   */
  function extractTextFields(obj: any, prefix: string = ''): Map<string, string> {
    const fields = new Map<string, string>();
    const minLength = config.fields?.minLength || 200;

    if (typeof obj !== 'object' || obj === null) {
      return fields;
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        const nestedFields = extractTextFields(item, `${prefix}[${index}]`);
        nestedFields.forEach((value, key) => fields.set(key, value));
      });
      return fields;
    }

    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;

      // Check exclusions
      if (config.fields?.exclude?.includes(path)) {
        continue;
      }

      // Check inclusions
      if (config.fields?.include && !config.fields.include.includes(path)) {
        continue;
      }

      if (typeof value === 'string' && value.length >= minLength) {
        fields.set(path, value);
      } else if (typeof value === 'object' && value !== null) {
        const nestedFields = extractTextFields(value, path);
        nestedFields.forEach((v, k) => fields.set(k, v));
      }
    }

    return fields;
  }

  /**
   * Get cached summary
   */
  function getCachedSummary(text: string): string | null {
    const cached = cache.get(text);
    if (!cached || Date.now() - cached.timestamp > cacheTTL) {
      return null;
    }
    return cached.summary;
  }

  /**
   * Summarize text using AI
   */
  async function summarizeText(text: string, context: PluginContext): Promise<string> {
    const client = context.client;

    if (!client || !client.aiAgent) {
      throw new AIAgentNotFoundError();
    }

    // Check cache
    if (config.cache !== false) {
      const cached = getCachedSummary(text);
      if (cached) {
        stats.cacheHits++;
        return cached;
      }
      stats.cacheMisses++;
    }

    try {
      const prompt = buildSummaryPrompt(text, config.length, config.style, config.instructions);
      const summary = await client.aiAgent.ask(prompt);

      // Cache the summary
      if (config.cache !== false) {
        cache.set(text, {
          original: text,
          summary,
          timestamp: Date.now()
        });
      }

      return summary;
    } catch (error) {
      throw new SummarizationError(
        `Failed to summarize text: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Build summarization prompt
   */
  function buildSummaryPrompt(
    text: string,
    length?: SummaryLength,
    style?: SummaryStyle,
    instructions?: string
  ): string {
    const lengthInstructions = {
      short: 'in 1-2 sentences',
      medium: 'in 2-3 sentences',
      long: 'in a brief paragraph'
    };

    const styleInstructions = {
      'bullet-points': 'Format as bullet points.',
      'paragraph': 'Format as a concise paragraph.',
      'key-points': 'Extract and list the key points.'
    };

    const lengthText = length ? lengthInstructions[length] : lengthInstructions.medium;
    const styleText = style ? styleInstructions[style] : styleInstructions.paragraph;

    return `Summarize the following text ${lengthText}. ${styleText}

Text to summarize:
${text}

${instructions ? `Additional instructions: ${instructions}` : ''}

Return only the summary text without any additional formatting or explanations.`;
  }

  /**
   * Set nested value
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

  const plugin: Plugin = {
    name: 'ai-summarize',

    async onResponse(response: HttpResponse, context: PluginContext) {
      stats.totalRequests++;

      const url = response.config.url || '';

      if (!shouldSummarize(url)) {
        return response;
      }

      const startTime = Date.now();

      try {
        const data = response.data;

        if (!data || typeof data !== 'object') {
          return response;
        }

        // Extract fields to summarize
        const fields = extractTextFields(data);

        if (fields.size === 0) {
          return response;
        }

        const summarizedData = JSON.parse(JSON.stringify(data));

        // Summarize each field
        for (const [path, text] of fields.entries()) {
          const summary = await summarizeText(text, context);

          const summaryField = config.summaryField || '_summary';
          const summaryPath = config.preserveOriginal !== false
            ? `${path}${summaryField}`
            : path;

          setNestedValue(summarizedData, summaryPath, summary);

          stats.totalCharactersSummarized += text.length;
        }

        const summarizationTime = Date.now() - startTime;
        totalSummarizationTime += summarizationTime;
        stats.summarizedResponses++;

        if (config.debug) {
          console.log(`[AI Summarize] Summarized ${fields.size} field(s) in ${summarizationTime}ms`);
        }

        return {
          ...response,
          data: summarizedData
        };
      } catch (error) {
        console.error('[AI Summarize] Summarization failed:', error);
        return response;
      }
    }
  };

  // Expose utility methods
  (plugin as any).getStats = (): SummarizeStats => {
    const avgTime =
      stats.summarizedResponses > 0
        ? totalSummarizationTime / stats.summarizedResponses
        : 0;

    return {
      ...stats,
      averageSummarizationTime: avgTime
    };
  };

  (plugin as any).clearCache = () => {
    cache.clear();
  };

  return plugin;
}

export default aiSummarizePlugin;
