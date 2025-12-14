import { BaseAIProvider } from './base';
import type { AIMessage, AIResponse, AIStreamChunk, AIModelConfig } from '../types';
import { AIProviderError, InvalidJSONResponseError } from '../errors';

/**
 * Anthropic Provider Implementation
 * Supports Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku, and other Claude models
 */
export class AnthropicProvider extends BaseAIProvider {
  readonly name = 'anthropic';

  private readonly endpoint: string;

  // Anthropic pricing per 1M tokens (as of Dec 2024)
  private readonly pricing: Record<string, { prompt: number; completion: number }> = {
    'claude-3-5-sonnet-20241022': { prompt: 3.0, completion: 15.0 },
    'claude-3-5-sonnet-20240620': { prompt: 3.0, completion: 15.0 },
    'claude-3-opus-20240229': { prompt: 15.0, completion: 75.0 },
    'claude-3-sonnet-20240229': { prompt: 3.0, completion: 15.0 },
    'claude-3-haiku-20240307': { prompt: 0.25, completion: 1.25 }
  };

  constructor(
    apiKey: string,
    modelConfig: string | AIModelConfig,
    apiEndpoint?: string,
    timeout?: number
  ) {
    super(apiKey, modelConfig, apiEndpoint, timeout);
    this.endpoint = apiEndpoint || 'https://api.anthropic.com/v1/messages';
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
      ? `${prompt}\n\nRespond with ONLY valid JSON matching this structure: ${JSON.stringify(schema)}. Do not include any explanation or markdown formatting.`
      : `${prompt}\n\nRespond with ONLY valid JSON. Do not include any explanation or markdown formatting.`;

    const messages: AIMessage[] = [{ role: 'user', content: enhancedPrompt }];

    const response = await this.chat(messages, options);

    // Parse JSON response (handle markdown code blocks if present)
    let jsonContent = response.content.trim();

    // Remove markdown code blocks if present
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    try {
      return JSON.parse(jsonContent);
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
      headers: this.buildHeaders(),
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new AIProviderError(
        `Anthropic API error: ${error}`,
        'anthropic',
        response.status,
        error
      );
    }

    if (!response.body) {
      throw new AIProviderError('No response body from Anthropic', 'anthropic');
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

            try {
              const json = JSON.parse(data);

              // Handle content block delta
              if (json.type === 'content_block_delta') {
                const delta = json.delta?.text;
                if (delta) {
                  yield { content: delta, done: false };
                }
              }

              // Handle message completion
              if (json.type === 'message_stop' || json.type === 'message_delta') {
                if (json.usage) {
                  totalTokens.prompt = json.usage.input_tokens || totalTokens.prompt;
                  totalTokens.completion = json.usage.output_tokens || totalTokens.completion;
                }

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

    // Find matching pricing
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

    // Try to match base model name (e.g., claude-3-5-sonnet-*)
    const baseModel = Object.keys(this.pricing).find(key =>
      modelName.includes(key.split('-').slice(0, 4).join('-'))
    );
    if (baseModel && this.pricing[baseModel]) {
      return this.pricing[baseModel];
    }

    // Default to claude-3-haiku pricing
    return this.pricing['claude-3-haiku-20240307']!;
  }

  /**
   * Build request headers
   */
  protected buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01'
    };
  }

  /**
   * Make a request to Anthropic API
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
        `Anthropic API error: ${error}`,
        'anthropic',
        response.status,
        error
      );
    }

    const data = await response.json();

    const content = data.content?.[0]?.text || '';
    const usage = data.usage;

    return {
      content,
      finishReason: data.stop_reason,
      usage: usage
        ? {
            promptTokens: usage.input_tokens,
            completionTokens: usage.output_tokens,
            totalTokens: usage.input_tokens + usage.output_tokens
          }
        : undefined,
      cost: usage
        ? this.calculateCost(usage.input_tokens, usage.output_tokens)
        : undefined,
      raw: data
    };
  }

  /**
   * Build request body for Anthropic API
   */
  private buildRequestBody(
    messages: AIMessage[],
    config: AIModelConfig,
    stream: boolean
  ): any {
    // Anthropic requires system message separate from messages
    const systemMessage = messages.find(msg => msg.role === 'system');
    const userMessages = messages.filter(msg => msg.role !== 'system');

    const body: any = {
      model: config.model,
      messages: userMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      stream
    };

    if (systemMessage) {
      body.system = systemMessage.content;
    }

    if (config.temperature !== undefined) {
      body.temperature = config.temperature;
    }

    if (config.maxTokens !== undefined) {
      body.max_tokens = config.maxTokens;
    } else {
      // Anthropic requires max_tokens
      body.max_tokens = 4096;
    }

    if (config.topP !== undefined) {
      body.top_p = config.topP;
    }

    if (config.stop) {
      body.stop_sequences = config.stop;
    }

    return body;
  }
}
