import type { Language, CachedTranslation } from './types';

/**
 * Cache for storing translations
 */
export class TranslationCache {
  private cache: Map<string, CachedTranslation> = new Map();
  private readonly ttl: number;
  private hits: number = 0;
  private misses: number = 0;

  constructor(ttl: number = 86400000) {
    // Default 24 hours
    this.ttl = ttl;
  }

  /**
   * Generate cache key
   */
  private getCacheKey(text: string, targetLanguages: Language[]): string {
    const languagesKey = targetLanguages.sort().join(',');
    return `${text}:${languagesKey}`;
  }

  /**
   * Get cached translation
   */
  get(text: string, targetLanguages: Language[]): Record<Language, string> | null {
    const key = this.getCacheKey(text, targetLanguages);
    const cached = this.cache.get(key);

    if (!cached) {
      this.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Check if all requested languages are cached
    const hasAllLanguages = targetLanguages.every(lang => lang in cached.translations);
    if (!hasAllLanguages) {
      this.misses++;
      return null;
    }

    this.hits++;
    return cached.translations;
  }

  /**
   * Set translation in cache
   */
  set(text: string, targetLanguages: Language[], translations: Record<Language, string>): void {
    const key = this.getCacheKey(text, targetLanguages);
    this.cache.set(key, {
      original: text,
      translations,
      timestamp: Date.now()
    });
  }

  /**
   * Check if translation is cached
   */
  has(text: string, targetLanguages: Language[]): boolean {
    return this.get(text, targetLanguages) !== null;
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      entries: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0 ? this.hits / (this.hits + this.misses) : 0
    };
  }
}
