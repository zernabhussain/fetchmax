/**
 * Supported AI providers
 */
export type AIProvider = 'openai' | 'anthropic' | 'deepseek' | 'google' | 'ollama' | 'custom';

/**
 * AI message role
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * AI chat message
 */
export interface AIMessage {
  role: MessageRole;
  content: string;
}

/**
 * AI model configuration
 */
export interface AIModelConfig {
  /** Model name (e.g., 'gpt-4o-mini', 'claude-3-5-sonnet-20241022') */
  model: string;
  /** Temperature for response randomness (0-2, default: 1) */
  temperature?: number;
  /** Maximum tokens in response */
  maxTokens?: number;
  /** Top P for nucleus sampling */
  topP?: number;
  /** Stop sequences */
  stop?: string[];
  /** Response format (for structured outputs) */
  responseFormat?: 'text' | 'json';
}

/**
 * Model pricing per 1K tokens (in USD)
 */
export interface ModelPricing {
  /** Cost per 1K input tokens */
  input: number;
  /** Cost per 1K output tokens */
  output: number;
}

/**
 * Custom pricing configuration
 * Allows users to override default pricing when providers change rates
 */
export interface CustomPricing {
  [provider: string]: {
    [model: string]: ModelPricing;
  };
}

/**
 * Cost tracking configuration
 */
export interface CostTrackingConfig {
  /** Enable cost tracking */
  enabled: boolean;
  /** Budget limit in USD (optional) */
  budgetLimit?: number;
  /** Warning threshold percentage (default: 80) */
  warningThreshold?: number;
  /** Callback when budget warning is triggered */
  onBudgetWarning?: (spent: number, limit: number) => void;
  /** Callback when budget limit is exceeded */
  onBudgetExceeded?: (spent: number, limit: number) => void;
  /**
   * Custom pricing for models (overrides built-in pricing)
   * Use this when providers change their pricing
   * @example
   * customPricing: {
   *   openai: {
   *     'gpt-4o-mini': { input: 0.00020, output: 0.00080 }
   *   }
   * }
   */
  customPricing?: CustomPricing;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  /** Maximum requests per minute */
  requestsPerMinute?: number;
  /** Maximum tokens per minute */
  tokensPerMinute?: number;
  /** Enable rate limiting */
  enabled: boolean;
}

/**
 * AI Agent plugin configuration
 */
export interface AIAgentConfig {
  /** AI provider */
  provider: AIProvider;
  /** API key for the provider */
  apiKey: string;
  /** API endpoint (for custom provider) */
  apiEndpoint?: string;
  /** Model configuration */
  model: string | AIModelConfig;
  /** Cost tracking configuration */
  costTracking?: boolean | Partial<CostTrackingConfig>;
  /** Rate limiting configuration */
  rateLimiting?: boolean | Partial<RateLimitConfig>;
  /** Default system message */
  systemMessage?: string;
  /** Timeout for AI requests in milliseconds (default: 30000) */
  timeout?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * AI response
 */
export interface AIResponse {
  /** Response content */
  content: string;
  /** Finish reason */
  finishReason?: 'stop' | 'length' | 'content_filter' | 'tool_calls';
  /** Token usage */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Cost in USD (if tracking enabled) */
  cost?: number;
  /** Raw response from provider */
  raw?: any;
}

/**
 * Streaming chunk from AI response
 */
export interface AIStreamChunk {
  /** Chunk content */
  content: string;
  /** Is this the final chunk? */
  done: boolean;
  /** Token usage (only in final chunk) */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Cost tracking stats
 */
export interface CostStats {
  /** Total requests made */
  totalRequests: number;
  /** Total tokens used (prompt + completion) */
  totalTokens: number;
  /** Total prompt tokens */
  promptTokens: number;
  /** Total completion tokens */
  completionTokens: number;
  /** Total cost in USD */
  totalCost: number;
  /** Budget limit (if set) */
  budgetLimit?: number;
  /** Remaining budget */
  remainingBudget?: number;
  /** Average cost per request */
  averageCost: number;
  /** Request count (alias for totalRequests, used in tests) */
  requestCount?: number;
  /** Requests (alias for totalRequests, used in demos) */
  requests?: number;
  /** Per-provider statistics */
  providers?: Record<string, { cost: number; requests: number }>;
  /** Per-model statistics */
  models?: Record<string, { cost: number; requests: number }>;
}
