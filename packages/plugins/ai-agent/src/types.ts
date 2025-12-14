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
}
