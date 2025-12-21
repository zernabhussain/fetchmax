/**
 * Supported languages for translation
 */
export type Language =
  | 'en' // English
  | 'es' // Spanish
  | 'fr' // French
  | 'de' // German
  | 'it' // Italian
  | 'pt' // Portuguese
  | 'ru' // Russian
  | 'ja' // Japanese
  | 'ko' // Korean
  | 'zh' // Chinese
  | 'ar' // Arabic
  | 'hi' // Hindi
  | string; // Allow custom language codes

/**
 * Translation strategy
 */
export type TranslationStrategy =
  | 'replace' // Replace the original response with translated version
  | 'merge' // Merge translations into original response with language suffixes
  | 'separate'; // Return translations in a separate field

/**
 * Field selection for translation
 */
export interface FieldSelector {
  /** Fields to translate (supports dot notation for nested fields) */
  include?: string[];
  /** Fields to exclude from translation */
  exclude?: string[];
  /** Automatically detect and translate string fields */
  autoDetect?: boolean;
}

/**
 * Translation configuration
 */
export interface AITranslateConfig {
  /** Target language(s) to translate to */
  targetLanguages: Language | Language[];

  /** Source language (auto-detect if not specified) */
  sourceLanguage?: Language;

  /** Translation strategy */
  strategy?: TranslationStrategy;

  /** Field selection */
  fields?: FieldSelector;

  /** Enable caching of translations */
  cache?: boolean;

  /** Cache TTL in milliseconds (default: 86400000 = 24 hours) */
  cacheTTL?: number;

  /** Custom field name for separate strategy (default: '_translations') */
  translationsField?: string;

  /** Preserve original response */
  preserveOriginal?: boolean;

  /** Enable debug logging */
  debug?: boolean;

  /** Only translate responses from specific endpoints */
  endpoints?: string[] | RegExp[];

  /** AI Agent instance (for dependency injection in tests) */
  aiAgent?: any;
}

/**
 * Cached translation
 */
export interface CachedTranslation {
  original: string;
  translations: Record<Language, string>;
  timestamp: number;
}

/**
 * Translation stats
 */
export interface TranslationStats {
  totalRequests: number;
  translatedResponses: number;
  cacheHits: number;
  cacheMisses: number;
  averageTranslationTime: number;
  languagesUsed: Record<Language, number>;
}
