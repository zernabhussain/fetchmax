/**
 * Field type definitions for mock data structure
 */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'email'
  | 'url'
  | 'uuid'
  | 'array'
  | 'object'
  | string; // Allow custom types like 'admin | user | guest'
/* eslint-enable @typescript-eslint/no-redundant-type-constituents */

/**
 * Structure definition for a mock response field
 */
export interface FieldDefinition {
  type: FieldType;
  description?: string;
  required?: boolean;
  enum?: any[];
  items?: FieldDefinition; // For array types
  properties?: Record<string, FieldDefinition>; // For object types
}

/**
 * Mock response structure definition
 */
export type MockStructure = Record<string, FieldType | FieldDefinition>;

/**
 * HTTP method types
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * Mock configuration for a specific endpoint and method
 */
export interface MockEndpointConfig {
  /** HTTP method (default: GET) */
  method?: HttpMethod;
  /** Structure definition for the response */
  structure: MockStructure;
  /** Number of items to generate (for array responses, default: 1) */
  count?: number;
  /** Additional instructions for the AI */
  instructions?: string;
  /** Whether to enable caching for this endpoint */
  cache?: boolean;
  /** Status code to return (default: 200) */
  statusCode?: number;
}

/**
 * Endpoint pattern configuration
 */
export type EndpointPattern = string | RegExp;

/**
 * AI Mock plugin configuration
 */
export interface AIMockConfig {
  /** Endpoint configurations - keys are endpoint patterns (strings or stringified RegExp) */
  endpoints: Record<string, MockEndpointConfig | Record<HttpMethod, MockEndpointConfig>>;

  /** Global cache settings (default: true) */
  cache?: boolean;

  /** Cache TTL in milliseconds (default: 3600000 = 1 hour) */
  cacheTTL?: number;

  /** Enable variations in cached responses (default: false) */
  variations?: boolean;

  /** Global instructions to apply to all endpoints */
  globalInstructions?: string;

  /** Passthrough mode - let real requests through for specific patterns */
  passthrough?: EndpointPattern[];

  /** Learning mode - improve mocks from real responses (experimental) */
  learningMode?: boolean;

  /** Enable debug logging */
  debug?: boolean;

  /** AI Agent instance (for dependency injection in tests) */
  aiAgent?: any;
}

/**
 * Cached mock response
 */
export interface CachedMock {
  data: any;
  timestamp: number;
  hits: number;
}

/**
 * Mock generation stats
 */
export interface MockStats {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  generatedMocks: number;
  passthroughRequests: number;
  averageGenerationTime: number;
}
