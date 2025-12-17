/**
 * Summary length options
 */
export type SummaryLength = 'short' | 'medium' | 'long';

/**
 * Summary style options
 */
export type SummaryStyle = 'bullet-points' | 'paragraph' | 'key-points';

/**
 * Field selector for summarization
 */
export interface FieldSelector {
  include?: string[];
  exclude?: string[];
  minLength?: number; // Minimum text length to summarize (default: 200 characters)
  autoDetect?: boolean;
}

/**
 * AI Summarize plugin configuration
 */
export interface AISummarizeConfig {
  /** Summary length */
  length?: SummaryLength;

  /** Summary style */
  style?: SummaryStyle;

  /** Field selection */
  fields?: FieldSelector;

  /** Enable caching */
  cache?: boolean;

  /** Cache TTL in milliseconds (default: 3600000 = 1 hour) */
  cacheTTL?: number;

  /** Custom field suffix for summaries (default: '_summary') */
  summaryField?: string;

  /** Preserve original content */
  preserveOriginal?: boolean;

  /** Only summarize responses from specific endpoints */
  endpoints?: string[] | RegExp[];

  /** Custom summarization instructions */
  instructions?: string;

  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Cached summary
 */
export interface CachedSummary {
  original: string;
  summary: string;
  timestamp: number;
}

/**
 * Summarization stats
 */
export interface SummarizeStats {
  totalRequests: number;
  summarizedResponses: number;
  cacheHits: number;
  cacheMisses: number;
  averageSummarizationTime: number;
  totalCharactersSummarized: number;
}
