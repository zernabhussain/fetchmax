/**
 * Base AI Agent Error
 */
export class AIAgentError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'AIAgentError';
  }
}

/**
 * Provider configuration error
 */
export class ProviderConfigError extends AIAgentError {
  constructor(message: string) {
    super(message, 'PROVIDER_CONFIG_ERROR');
    this.name = 'ProviderConfigError';
  }
}

/**
 * API key missing error
 */
export class APIKeyMissingError extends AIAgentError {
  constructor(provider: string) {
    super(`API key is required for provider: ${provider}`, 'API_KEY_MISSING');
    this.name = 'APIKeyMissingError';
  }
}

/**
 * Invalid provider error
 */
export class InvalidProviderError extends AIAgentError {
  constructor(provider: string) {
    super(`Invalid AI provider: ${provider}`, 'INVALID_PROVIDER');
    this.name = 'InvalidProviderError';
  }
}

/**
 * Budget exceeded error
 */
export class BudgetExceededError extends AIAgentError {
  constructor(
    public spent: number,
    public limit: number
  ) {
    super(`Budget exceeded: $${spent.toFixed(4)} / $${limit.toFixed(4)}`, 'BUDGET_EXCEEDED');
    this.name = 'BudgetExceededError';
  }
}

/**
 * Rate limit exceeded error
 */
export class RateLimitExceededError extends AIAgentError {
  constructor(
    public retryAfter?: number
  ) {
    const message = retryAfter
      ? `Rate limit exceeded. Retry after ${retryAfter}ms`
      : 'Rate limit exceeded';
    super(message, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitExceededError';
  }
}

/**
 * AI provider error (e.g., API errors from OpenAI, Anthropic)
 */
export class AIProviderError extends AIAgentError {
  constructor(
    message: string,
    public provider: string,
    public status?: number,
    public originalError?: any
  ) {
    super(message, 'AI_PROVIDER_ERROR');
    this.name = 'AIProviderError';
  }
}

/**
 * Invalid JSON response error
 */
export class InvalidJSONResponseError extends AIAgentError {
  constructor(content: string) {
    super(`Failed to parse JSON response: ${content}`, 'INVALID_JSON_RESPONSE');
    this.name = 'InvalidJSONResponseError';
  }
}
