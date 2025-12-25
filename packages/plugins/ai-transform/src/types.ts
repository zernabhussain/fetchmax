/**
 * Transformation rule
 */
export interface TransformRule {
  /** Transformation description/prompt */
  prompt: string;

  /** Field path to transform (supports dot notation) */
  field?: string;

  /** Target field for transformed data */
  targetField?: string;

  /** Enable caching for this transformation */
  cache?: boolean;
}

/**
 * AI Transform plugin configuration
 */
export interface AITransformConfig {
  /** Transformation rules */
  transforms: TransformRule[];

  /** Only transform responses from specific endpoints */
  endpoints?: string[] | RegExp[];

  /** Enable caching */
  cache?: boolean;

  /** Cache TTL in milliseconds (default: 3600000 = 1 hour) */
  cacheTTL?: number;

  /** Enable debug logging */
  debug?: boolean;

  /** AI Agent instance (for dependency injection in tests) */
  aiAgent?: any;
}

/**
 * Cached transformation
 */
export interface CachedTransform {
  input: string;
  output: string;
  timestamp: number;
}

/**
 * Transformation stats
 */
export interface TransformStats {
  totalRequests: number;
  transformedResponses: number;
  cacheHits: number;
  cacheMisses: number;
  averageTransformationTime: number;
  transformCount: Record<string, number>;
}
