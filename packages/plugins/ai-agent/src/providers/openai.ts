import { BaseAIProvider } from './base';
import type { AIMessage, AIResponse, AIStreamChunk, AIModelConfig } from '../types';
import { AIProviderError, InvalidJSONResponseError } from '../errors';

/**
 * OpenAI Provider Implementation
 * Supports GPT-4, GPT-4 Turbo, GPT-3.5-Turbo, and other OpenAI models
 */
export class OpenAIProvider extends BaseAIProvider {
  readonly name = 'openai';

  private readonly endpoint: string;

  // OpenAI pricing per 1M tokens (as of Dec 2024)
  private readonly pricing: Record<string, { prompt: number; completion: number }> = {
    'gpt-4o': { prompt: 2.5, completion: 10.0 },
    'gpt-4o-mini': { prompt: 0.15, completion: 0.6 },
    'gpt-4-turbo': { prompt: 10.0, completion: 30.0 },
    'gpt-4': { prompt: 30.0, completion: 60.0 },
    'gpt-3.5-turbo': { prompt: 0.5, completion: 1.5 }
  };

  constructor(
    apiKey: string,
    modelConfig: string | AIModelConfig,
    apiEndpoint?: string,
    timeout?: number
  ) {
    super(apiKey, modelConfig, apiEndpoint, timeout);
    this.endpoint = apiEndpoint || 'https://api.openai.com/v1/chat/completions';
  }

  /**
   * Ask a simple question
   */
  async ask(prompt: string, options?: Partial<AIModelConfig>): Promise<AIResponse> {
    const messages: AIMessage[] = [{ role: 'user', content: prompt }];
    return this.chat(messages, options);
  }

  /**
   * Ask for structured JSON response
   */
  async askJSON<T = any>(
    prompt: string,
    schema?: any,
    options?: Partial<AIModelConfig>
  ): Promise<T> {
    // Enhance prompt to request JSON
    const enhancedPrompt = schema
      ? `${prompt}\n\nRespond with valid JSON matching this structure: ${JSON.stringify(schema)}`
      : `${prompt}\n\nRespond with valid JSON only.`;

    const config = this.mergeModelConfig({
      ...options,
      responseFormat: 'json'
    });

    const messages: AIMessage[] = [{ role: 'user', content: enhancedPrompt }];

    const response = await this.makeRequest(messages, config);

    // Parse JSON response
    try {
      return JSON.parse(response.content);
    } catch (error) {
      throw new InvalidJSONResponseError(response.content);
    }
  }

  /**
   * Have a conversation
   */
  async chat(messages: AIMessage[], options?: Partial<AIModelConfig>): Promise<AIResponse> {
    const config = this.mergeModelConfig(options);
    return this.makeRequest(messages, config);
  }

  /**
   * Stream response chunks
   */
  async *stream(
    prompt: string,
    options?: Partial<AIModelConfig>
  ): AsyncGenerator<AIStreamChunk, void, unknown> {
    const config = this.mergeModelConfig(options);
    const messages: AIMessage[] = [{ role: 'user', content: prompt }];

    const requestBody = this.buildRequestBody(messages, config, true);

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        ...this.buildHeaders(),
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new AIProviderError(
        `OpenAI API error: ${error}`,
        'openai',
        response.status,
        error
      );
    }

    if (!response.body) {
      throw new AIProviderError('No response body from OpenAI', 'openai');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let totalTokens = { prompt: 0, completion: 0 };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield {
                content: '',
                done: true,
                usage: {
                  promptTokens: totalTokens.prompt,
                  completionTokens: totalTokens.completion,
                  totalTokens: totalTokens.prompt + totalTokens.completion
                }
              };
              return;
            }

            try {
              const json = JSON.parse(data);
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) {
                totalTokens.completion++;
                yield { content: delta, done: false };
              }

              // Capture usage if available
              if (json.usage) {
                totalTokens.prompt = json.usage.prompt_tokens;
                totalTokens.completion = json.usage.completion_tokens;
              }
            } catch {
              // Skip invalid JSON chunks
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Calculate cost for token usage
   */
  calculateCost(promptTokens: number, completionTokens: number): number {
    const modelName = this.getModelName();

    // Find matching pricing (handle variations like gpt-4-0613)
    const pricing = this.getPricing(modelName);

    const promptCost = (promptTokens / 1_000_000) * pricing.prompt;
    const completionCost = (completionTokens / 1_000_000) * pricing.completion;

    return promptCost + completionCost;
  }

  /**
   * Get pricing for a model
   */
  private getPricing(modelName: string): { prompt: number; completion: number } {
    // Direct match
    if (this.pricing[modelName]) {
      return this.pricing[modelName];
    }

    // Try to match base model name
    const baseModel = Object.keys(this.pricing).find(key => modelName.startsWith(key));
    if (baseModel && this.pricing[baseModel]) {
      return this.pricing[baseModel];
    }

    // Default to gpt-4o-mini pricing
    return this.pricing['gpt-4o-mini']!;
  }

  /**
   * Build request headers
   */
  protected buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`
    };
  }

  /**
   * Make a request to OpenAI API
   */
  private async makeRequest(
    messages: AIMessage[],
    config: AIModelConfig
  ): Promise<AIResponse> {
    const requestBody = this.buildRequestBody(messages, config, false);

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new AIProviderError(
        `OpenAI API error: ${error}`,
        'openai',
        response.status,
        error
      );
    }

    const data = await response.json();

    const content = data.choices?.[0]?.message?.content || '';
    const usage = data.usage;

    return {
      content,
      finishReason: data.choices?.[0]?.finish_reason,
      usage: usage
        ? {
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens
          }
        : undefined,
      cost: usage
        ? this.calculateCost(usage.prompt_tokens, usage.completion_tokens)
        : undefined,
      raw: data
    };
  }

  /**
   * Build request body for OpenAI API
   */
  private buildRequestBody(
    messages: AIMessage[],
    config: AIModelConfig,
    stream: boolean
  ): any {
    const body: any = {
      model: config.model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      stream
    };

    if (config.temperature !== undefined) {
      body.temperature = config.temperature;
    }

    if (config.maxTokens !== undefined) {
      body.max_tokens = config.maxTokens;
    }

    if (config.topP !== undefined) {
      body.top_p = config.topP;
    }

    if (config.stop) {
      body.stop = config.stop;
    }

    // JSON mode for OpenAI
    if (config.responseFormat === 'json') {
      body.response_format = { type: 'json_object' };
    }

    return body;
  }
}
