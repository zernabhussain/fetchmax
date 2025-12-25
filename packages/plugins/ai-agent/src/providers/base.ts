import type {
  AIMessage,
  AIResponse,
  AIStreamChunk,
  AIModelConfig
} from '../types';

/**
 * Base AI Provider Interface
 * All AI providers must implement this interface
 */
export interface AIProviderInterface {
  /**
   * Provider name
   */
  readonly name: string;

  /**
   * Ask a simple question and get a text response
   * @param prompt - The question or prompt
   * @param options - Optional model configuration
   * @returns AI response
   */
  ask(prompt: string, options?: Partial<AIModelConfig>): Promise<AIResponse>;

  /**
   * Ask a question and get a structured JSON response
   * @param prompt - The question or prompt (should request JSON format)
   * @param schema - Optional JSON schema or type description
   * @param options - Optional model configuration
   * @returns Parsed JSON response
   */
  askJSON<T = any>(
    prompt: string,
    schema?: any,
    options?: Partial<AIModelConfig>
  ): Promise<T>;

  /**
   * Have a conversation with message history
   * @param messages - Array of messages
   * @param options - Optional model configuration
   * @returns AI response
   */
  chat(messages: AIMessage[], options?: Partial<AIModelConfig>): Promise<AIResponse>;

  /**
   * Stream a response (for long outputs)
   * @param prompt - The question or prompt
   * @param options - Optional model configuration
   * @returns Async generator of response chunks
   */
  stream(
    prompt: string,
    options?: Partial<AIModelConfig>
  ): AsyncGenerator<AIStreamChunk, void, unknown>;

  /**
   * Calculate cost for a request (in USD)
   * @param promptTokens - Number of prompt tokens
   * @param completionTokens - Number of completion tokens
   * @returns Cost in USD
   */
  calculateCost(promptTokens: number, completionTokens: number): number;
}

/**
 * Base AI Provider Implementation
 * Provides common functionality for all providers
 */
export abstract class BaseAIProvider implements AIProviderInterface {
  abstract readonly name: string;

  constructor(
    protected apiKey: string,
    protected modelConfig: string | AIModelConfig,
    protected apiEndpoint?: string,
    protected timeout: number = 30000
  ) {
    if (!apiKey) {
      throw new Error('API key is required for AI provider');
    }
  }

  /**
   * Get model name from config
   */
  protected getModelName(): string {
    return typeof this.modelConfig === 'string'
      ? this.modelConfig
      : this.modelConfig.model;
  }

  /**
   * Merge model config with options
   */
  protected mergeModelConfig(options?: Partial<AIModelConfig>): AIModelConfig {
    const baseConfig =
      typeof this.modelConfig === 'string'
        ? { model: this.modelConfig }
        : this.modelConfig;

    return {
      ...baseConfig,
      ...options
    };
  }

  /**
   * Build request headers
   */
  protected buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json'
    };
  }

  abstract ask(prompt: string, options?: Partial<AIModelConfig>): Promise<AIResponse>;

  abstract askJSON<T = any>(
    prompt: string,
    schema?: any,
    options?: Partial<AIModelConfig>
  ): Promise<T>;

  abstract chat(messages: AIMessage[], options?: Partial<AIModelConfig>): Promise<AIResponse>;

  abstract stream(
    prompt: string,
    options?: Partial<AIModelConfig>
  ): AsyncGenerator<AIStreamChunk, void, unknown>;

  abstract calculateCost(promptTokens: number, completionTokens: number): number;
}
