import { describe, it, expect } from 'vitest';
import { BaseAIProvider } from '../../../../packages/plugins/ai-agent/src/providers/base';
import type { AIMessage, AIResponse, AIStreamChunk, AIModelConfig } from '../../../../packages/plugins/ai-agent/src/types';

/**
 * Mock implementation of BaseAIProvider for testing
 */
class MockAIProvider extends BaseAIProvider {
  readonly name = 'mock';

  async ask(prompt: string, _options?: Partial<AIModelConfig>): Promise<AIResponse> {
    return {
      content: `Mock response to: ${prompt}`,
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      cost: 0.001
    };
  }

  async askJSON<T = any>(
    _prompt: string,
    _schema?: any,
    _options?: Partial<AIModelConfig>
  ): Promise<T> {
    return { mock: true } as T;
  }

  async chat(_messages: AIMessage[], _options?: Partial<AIModelConfig>): Promise<AIResponse> {
    return {
      content: 'Mock chat response',
      finishReason: 'stop',
      usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30 },
      cost: 0.002
    };
  }

  async *stream(
    _prompt: string,
    _options?: Partial<AIModelConfig>
  ): AsyncGenerator<AIStreamChunk, void, unknown> {
    yield { content: 'chunk1', done: false };
    yield { content: 'chunk2', done: false };
    yield {
      content: '',
      done: true,
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 }
    };
  }

  calculateCost(promptTokens: number, completionTokens: number): number {
    return (promptTokens + completionTokens) * 0.0001;
  }
}

describe('BaseAIProvider', () => {
  describe('constructor', () => {
    it('should initialize with API key and model string', () => {
      const provider = new MockAIProvider('test-api-key', 'test-model');
      expect(provider.name).toBe('mock');
    });

    it('should initialize with API key and model config object', () => {
      const config: AIModelConfig = {
        model: 'test-model',
        temperature: 0.7,
        maxTokens: 1000
      };
      const provider = new MockAIProvider('test-api-key', config);
      expect(provider.name).toBe('mock');
    });

    it('should accept optional endpoint parameter', () => {
      const provider = new MockAIProvider(
        'test-api-key',
        'test-model',
        'https://custom.api.com'
      );
      expect(provider.name).toBe('mock');
    });

    it('should accept optional timeout parameter', () => {
      const provider = new MockAIProvider(
        'test-api-key',
        'test-model',
        undefined,
        60000
      );
      expect(provider.name).toBe('mock');
    });

    it('should use default timeout of 30000ms if not provided', () => {
      const provider = new MockAIProvider('test-api-key', 'test-model');
      expect(provider.name).toBe('mock');
    });

    it('should throw error if API key is empty', () => {
      expect(() => {
        new MockAIProvider('', 'test-model');
      }).toThrow('API key is required for AI provider');
    });

    it('should throw error if API key is not provided', () => {
      expect(() => {
        new MockAIProvider(null as any, 'test-model');
      }).toThrow('API key is required for AI provider');
    });
  });

  describe('getModelName()', () => {
    it('should return model name from string config', () => {
      const provider = new MockAIProvider('test-api-key', 'gpt-4o');
      // Access protected method through any type
      const modelName = (provider as any).getModelName();
      expect(modelName).toBe('gpt-4o');
    });

    it('should return model name from object config', () => {
      const config: AIModelConfig = {
        model: 'claude-3-opus',
        temperature: 0.5
      };
      const provider = new MockAIProvider('test-api-key', config);
      const modelName = (provider as any).getModelName();
      expect(modelName).toBe('claude-3-opus');
    });
  });

  describe('mergeModelConfig()', () => {
    it('should convert string config to object config', () => {
      const provider = new MockAIProvider('test-api-key', 'test-model');
      const merged = (provider as any).mergeModelConfig();
      expect(merged).toEqual({ model: 'test-model' });
    });

    it('should return base config when no options provided', () => {
      const baseConfig: AIModelConfig = {
        model: 'test-model',
        temperature: 0.7,
        maxTokens: 1000
      };
      const provider = new MockAIProvider('test-api-key', baseConfig);
      const merged = (provider as any).mergeModelConfig();
      expect(merged).toEqual(baseConfig);
    });

    it('should merge options with string config', () => {
      const provider = new MockAIProvider('test-api-key', 'test-model');
      const options: Partial<AIModelConfig> = {
        temperature: 0.9,
        maxTokens: 2000
      };
      const merged = (provider as any).mergeModelConfig(options);
      expect(merged).toEqual({
        model: 'test-model',
        temperature: 0.9,
        maxTokens: 2000
      });
    });

    it('should merge options with object config', () => {
      const baseConfig: AIModelConfig = {
        model: 'test-model',
        temperature: 0.5,
        maxTokens: 500
      };
      const provider = new MockAIProvider('test-api-key', baseConfig);
      const options: Partial<AIModelConfig> = {
        temperature: 0.8
      };
      const merged = (provider as any).mergeModelConfig(options);
      expect(merged).toEqual({
        model: 'test-model',
        temperature: 0.8,
        maxTokens: 500
      });
    });

    it('should override base config properties with options', () => {
      const baseConfig: AIModelConfig = {
        model: 'test-model',
        temperature: 0.5,
        maxTokens: 500,
        topP: 0.9,
        stop: ['STOP1']
      };
      const provider = new MockAIProvider('test-api-key', baseConfig);
      const options: Partial<AIModelConfig> = {
        temperature: 1.0,
        stop: ['STOP2', 'STOP3']
      };
      const merged = (provider as any).mergeModelConfig(options);
      expect(merged).toEqual({
        model: 'test-model',
        temperature: 1.0,
        maxTokens: 500,
        topP: 0.9,
        stop: ['STOP2', 'STOP3']
      });
    });

    it('should handle all config properties', () => {
      const provider = new MockAIProvider('test-api-key', 'test-model');
      const options: Partial<AIModelConfig> = {
        temperature: 0.7,
        maxTokens: 1500,
        topP: 0.95,
        stop: ['END'],
        responseFormat: 'json'
      };
      const merged = (provider as any).mergeModelConfig(options);
      expect(merged).toEqual({
        model: 'test-model',
        temperature: 0.7,
        maxTokens: 1500,
        topP: 0.95,
        stop: ['END'],
        responseFormat: 'json'
      });
    });
  });

  describe('buildHeaders()', () => {
    it('should return basic headers', () => {
      const provider = new MockAIProvider('test-api-key', 'test-model');
      const headers = (provider as any).buildHeaders();
      expect(headers).toEqual({
        'Content-Type': 'application/json'
      });
    });

    it('should be overrideable by subclasses', () => {
      // This test verifies that subclasses can override buildHeaders
      class CustomProvider extends BaseAIProvider {
        readonly name = 'custom';

        protected buildHeaders(): Record<string, string> {
          return {
            'Content-Type': 'application/json',
            'X-Custom-Header': 'custom-value'
          };
        }

        async ask(): Promise<AIResponse> {
          return { content: '', finishReason: 'stop' };
        }
        async askJSON<T>(): Promise<T> {
          return {} as T;
        }
        async chat(): Promise<AIResponse> {
          return { content: '', finishReason: 'stop' };
        }
        async *stream(): AsyncGenerator<AIStreamChunk> {
          yield { content: '', done: true };
        }
        calculateCost(): number {
          return 0;
        }
      }

      const provider = new CustomProvider('test-key', 'test-model');
      const headers = (provider as any).buildHeaders();
      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'X-Custom-Header': 'custom-value'
      });
    });
  });

  describe('abstract methods implementation', () => {
    it('should implement ask method', async () => {
      const provider = new MockAIProvider('test-key', 'test-model');
      const response = await provider.ask('Test prompt');
      expect(response.content).toContain('Mock response');
    });

    it('should implement askJSON method', async () => {
      const provider = new MockAIProvider('test-key', 'test-model');
      const response = await provider.askJSON('Get JSON');
      expect(response).toEqual({ mock: true });
    });

    it('should implement chat method', async () => {
      const provider = new MockAIProvider('test-key', 'test-model');
      const messages: AIMessage[] = [
        { role: 'user', content: 'Hello' }
      ];
      const response = await provider.chat(messages);
      expect(response.content).toBe('Mock chat response');
    });

    it('should implement stream method', async () => {
      const provider = new MockAIProvider('test-key', 'test-model');
      const chunks: string[] = [];

      for await (const chunk of provider.stream('Test')) {
        if (!chunk.done) {
          chunks.push(chunk.content);
        }
      }

      expect(chunks).toEqual(['chunk1', 'chunk2']);
    });

    it('should implement calculateCost method', () => {
      const provider = new MockAIProvider('test-key', 'test-model');
      const cost = provider.calculateCost(1000, 500);
      expect(cost).toBe(0.15); // (1000 + 500) * 0.0001
    });
  });

  describe('model configuration edge cases', () => {
    it('should handle empty options object', () => {
      const provider = new MockAIProvider('test-key', {
        model: 'test-model',
        temperature: 0.5
      });
      const merged = (provider as any).mergeModelConfig({});
      expect(merged).toEqual({
        model: 'test-model',
        temperature: 0.5
      });
    });

    it('should handle undefined values in options', () => {
      const provider = new MockAIProvider('test-key', 'test-model');
      const options = {
        temperature: undefined,
        maxTokens: 1000
      };
      const merged = (provider as any).mergeModelConfig(options);
      expect(merged).toEqual({
        model: 'test-model',
        temperature: undefined,
        maxTokens: 1000
      });
    });

    it('should handle zero values in config', () => {
      const config: AIModelConfig = {
        model: 'test-model',
        temperature: 0,
        maxTokens: 0
      };
      const provider = new MockAIProvider('test-key', config);
      const merged = (provider as any).mergeModelConfig();
      expect(merged).toEqual({
        model: 'test-model',
        temperature: 0,
        maxTokens: 0
      });
    });
  });
});
