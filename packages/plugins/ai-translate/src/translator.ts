import type { Language, FieldSelector } from './types';
import type { PluginContext } from '@fetchmax/core';
import { AIAgentNotFoundError, TranslationError } from './errors';

/**
 * Translator class that handles AI-powered translations
 */
export class Translator {
  /**
   * Translate text to target languages
   */
  static async translateText(
    text: string,
    targetLanguages: Language[],
    sourceLanguage: Language | undefined,
    context: PluginContext
  ): Promise<Record<Language, string>> {
    const client = context.client;

    // Check if AI Agent plugin is available
    if (!client || !client.aiAgent) {
      throw new AIAgentNotFoundError();
    }

    try {
      // Build translation prompt
      const prompt = this.buildTranslationPrompt(text, targetLanguages, sourceLanguage);

      // Get translations from AI
      const result = await client.aiAgent.askJSON(prompt);

      // Validate result
      if (typeof result !== 'object' || result === null) {
        throw new TranslationError('Invalid translation response from AI');
      }

      return result as Record<Language, string>;
    } catch (error) {
      throw new TranslationError(
        `Failed to translate text: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Build translation prompt for AI
   */
  private static buildTranslationPrompt(
    text: string,
    targetLanguages: Language[],
    sourceLanguage?: Language
  ): string {
    const languageList = targetLanguages.join(', ');
    const sourceInfo = sourceLanguage ? ` from ${sourceLanguage}` : '';

    return `Translate the following text${sourceInfo} into ${languageList}.

Text to translate:
${text}

Return the translations as a JSON object where keys are language codes (${targetLanguages.join(', ')}) and values are the translated text.
Maintain the tone, style, and meaning of the original text.
If the text contains technical terms or proper nouns, keep them unchanged unless they have standard translations.

Example format:
{
  "es": "translated text in Spanish",
  "fr": "translated text in French"
}`;
  }

  /**
   * Extract translatable text from object based on field selector
   */
  static extractTranslatableFields(
    obj: any,
    fieldSelector?: FieldSelector
  ): Map<string, any> {
    const fields = new Map<string, any>();

    if (!fieldSelector || fieldSelector.autoDetect !== false) {
      // Auto-detect string fields
      this.findStringFields(obj, fields, '', fieldSelector);
    } else if (fieldSelector.include) {
      // Only include specified fields
      for (const path of fieldSelector.include) {
        const value = this.getNestedValue(obj, path);
        if (typeof value === 'string') {
          fields.set(path, value);
        }
      }
    }

    return fields;
  }

  /**
   * Find all string fields in object recursively
   */
  private static findStringFields(
    obj: any,
    fields: Map<string, any>,
    prefix: string,
    fieldSelector?: FieldSelector
  ): void {
    if (typeof obj !== 'object' || obj === null) {
      return;
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        this.findStringFields(item, fields, `${prefix}[${index}]`, fieldSelector);
      });
      return;
    }

    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;

      // Check if field should be excluded
      if (fieldSelector?.exclude?.some(pattern => this.matchesPattern(path, pattern))) {
        continue;
      }

      // Check if field should be included
      if (fieldSelector?.include) {
        const matches = fieldSelector.include.some(pattern => this.matchesPattern(path, pattern));
        const couldMatchChildren = fieldSelector.include.some(pattern =>
          pattern.startsWith(path + '.') || pattern.includes('*')
        );

        if (!matches && typeof value === 'string') {
          // Skip strings that don't match
          continue;
        }

        if (!matches && !couldMatchChildren && typeof value === 'object') {
          // Skip objects that won't match any patterns
          continue;
        }
      }

      if (typeof value === 'string' && value.trim() !== '') {
        fields.set(path, value);
      } else if (typeof value === 'object' && value !== null) {
        this.findStringFields(value, fields, path, fieldSelector);
      }
    }
  }

  /**
   * Check if path matches pattern (supports wildcards)
   */
  private static matchesPattern(path: string, pattern: string): boolean {
    const regexPattern = pattern.replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  /**
   * Get nested value from object using dot notation
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set nested value in object using dot notation
   */
  static setNestedValue(obj: any, path: string, value: any): void {
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
}
