import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TranslationCache } from '@fetchmax/plugin-ai-translate';

describe('TranslationCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should store and retrieve cached translations', () => {
    const cache = new TranslationCache(60000);
    const text = 'Hello world';
    const languages = ['es', 'fr'];
    const translations = { es: 'Hola mundo', fr: 'Bonjour le monde' };

    cache.set(text, languages, translations);

    const retrieved = cache.get(text, languages);
    expect(retrieved).toEqual(translations);
  });

  it('should return null for non-existent cache', () => {
    const cache = new TranslationCache();

    const retrieved = cache.get('Hello', ['es']);
    expect(retrieved).toBeNull();
  });

  it('should expire cache after TTL', () => {
    const cache = new TranslationCache(1000); // 1 second TTL
    const text = 'Hello';
    const languages = ['es'];
    const translations = { es: 'Hola' };

    cache.set(text, languages, translations);

    // Should be available immediately
    expect(cache.get(text, languages)).toEqual(translations);

    // Advance time past TTL
    vi.advanceTimersByTime(1001);

    // Should be expired
    expect(cache.get(text, languages)).toBeNull();
  });

  it('should track cache hits and misses', () => {
    const cache = new TranslationCache();
    const text = 'Hello';
    const languages = ['es'];
    const translations = { es: 'Hola' };

    // Miss
    cache.get(text, languages);

    // Set and hit
    cache.set(text, languages, translations);
    cache.get(text, languages);
    cache.get(text, languages);

    const stats = cache.getStats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
  });

  it('should return null if not all languages are cached', () => {
    const cache = new TranslationCache();
    const text = 'Hello';

    // Cache only Spanish
    cache.set(text, ['es'], { es: 'Hola' });

    // Request Spanish and French
    const retrieved = cache.get(text, ['es', 'fr']);
    expect(retrieved).toBeNull();
  });

  it('should check if translation is cached', () => {
    const cache = new TranslationCache();
    const text = 'Hello';
    const languages = ['es'];

    expect(cache.has(text, languages)).toBe(false);

    cache.set(text, languages, { es: 'Hola' });

    expect(cache.has(text, languages)).toBe(true);
  });

  it('should clear cache', () => {
    const cache = new TranslationCache();

    cache.set('Hello', ['es'], { es: 'Hola' });
    cache.set('World', ['es'], { es: 'Mundo' });

    cache.clear();

    expect(cache.get('Hello', ['es'])).toBeNull();
    expect(cache.get('World', ['es'])).toBeNull();
    expect(cache.getStats().entries).toBe(0);
  });

  it('should calculate hit rate', () => {
    const cache = new TranslationCache();
    const text = 'Hello';
    const languages = ['es'];

    cache.set(text, languages, { es: 'Hola' });

    cache.get(text, languages); // hit
    cache.get(text, languages); // hit
    cache.get('Other', languages); // miss

    const stats = cache.getStats();
    expect(stats.hitRate).toBeCloseTo(2 / 3, 2);
  });
});
