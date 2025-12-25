import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnthropicProvider } from '../../../../packages/plugins/ai-agent/src/providers/anthropic';
import { AIProviderError, InvalidJSONResponseError } from '../../../../packages/plugins/ai-agent/src/errors';

// Mock global fetch
const originalFetch = global.fetch;

// Polyfill AbortSignal.timeout for older Node versions
if (typeof AbortSignal.timeout === 'undefined') {
  (AbortSignal as any).timeout = function (ms: number) {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  };
}

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch as any;
    provider = new AnthropicProvider('test-api-key', 'claude-3-5-sonnet-20241022');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with API key and model', () => {
      expect(provider.name).toBe('anthropic');
    });

    it('should use custom endpoint if provided', () => {
      const customProvider = new AnthropicProvider(
        'test-key',
        'claude-3-opus-20240229',
        'https://custom.api.com/messages'
      );
      expect(customProvider.name).toBe('anthropic');
    });

    it('should use custom timeout if provided', () => {
      const customProvider = new AnthropicProvider(
        'test-key',
        'claude-3-haiku-20240307',
        undefined,
        60000
      );
      expect(customProvider.name).toBe('anthropic');
    });
  });

  describe('ask()', () => {
    it('should make a simple request and return response', async () => {
      const mockResponse = {
        content: [{ text: 'Hello! How can I help you?' }],
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 10,
          output_tokens: 20
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const response = await provider.ask('Hello');

      expect(response.content).toBe('Hello! How can I help you?');
      expect(response.finishReason).toBe('end_turn');
      expect(response.usage).toEqual({
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      });
      expect(response.cost).toBeGreaterThan(0);
    });

    it('should pass options to underlying chat method', async () => {
      const mockResponse = {
        content: [{ text: 'Response with options' }],
        usage: { input_tokens: 5, output_tokens: 10 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const response = await provider.ask('Test', { temperature: 0.5, maxTokens: 100 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"temperature":0.5')
        })
      );
      expect(response.content).toBe('Response with options');
    });

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Invalid API key'
      });

      await expect(provider.ask('Hello')).rejects.toThrow(AIProviderError);
      await expect(provider.ask('Hello')).rejects.toThrow('Anthropic API error');
    });
  });

  describe('askJSON()', () => {
    it('should parse JSON response without markdown', async () => {
      const mockResponse = {
        content: [{ text: '{"name":"John","age":30}' }],
        usage: { input_tokens: 10, output_tokens: 20 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await provider.askJSON<{ name: string; age: number }>('Get user data');

      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should parse JSON response with markdown code blocks (```json)', async () => {
      const mockResponse = {
        content: [{ text: '```json\n{"name":"Jane","age":25}\n```' }],
        usage: { input_tokens: 10, output_tokens: 20 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await provider.askJSON<{ name: string; age: number }>('Get user data');

      expect(result).toEqual({ name: 'Jane', age: 25 });
    });

    it('should parse JSON response with markdown code blocks (```)', async () => {
      const mockResponse = {
        content: [{ text: '```\n{"status":"ok"}\n```' }],
        usage: { input_tokens: 10, output_tokens: 20 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await provider.askJSON<{ status: string }>('Get status');

      expect(result).toEqual({ status: 'ok' });
    });

    it('should include schema in prompt when provided', async () => {
      const mockResponse = {
        content: [{ text: '{"id":123,"title":"Test"}' }],
        usage: { input_tokens: 15, output_tokens: 10 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const schema = { id: 'number', title: 'string' };
      await provider.askJSON('Get article', schema);

      expect(mockFetch).toHaveBeenCalled();
      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.messages[0].content).toContain(JSON.stringify(schema));
    });

    it('should throw InvalidJSONResponseError on parse failure', async () => {
      const mockResponse = {
        content: [{ text: 'This is not JSON' }],
        usage: { input_tokens: 10, output_tokens: 20 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await expect(provider.askJSON('Get data')).rejects.toThrow(InvalidJSONResponseError);
    });
  });

  describe('chat()', () => {
    it('should handle conversation with multiple messages', async () => {
      const mockResponse = {
        content: [{ text: 'I remember our previous conversation!' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 50, output_tokens: 30 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const messages = [
        { role: 'user' as const, content: 'Hello' },
        { role: 'assistant' as const, content: 'Hi there!' },
        { role: 'user' as const, content: 'Remember me?' }
      ];

      const response = await provider.chat(messages);

      expect(response.content).toBe('I remember our previous conversation!');
      expect(response.usage?.promptTokens).toBe(50);
    });

    it('should handle system messages separately', async () => {
      const mockResponse = {
        content: [{ text: 'I will be helpful and concise' }],
        usage: { input_tokens: 20, output_tokens: 10 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const messages = [
        { role: 'system' as const, content: 'Be helpful and concise' },
        { role: 'user' as const, content: 'Hello' }
      ];

      await provider.chat(messages);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"system":"Be helpful and concise"')
        })
      );
    });

    it('should include all config options in request', async () => {
      const mockResponse = {
        content: [{ text: 'Response' }],
        usage: { input_tokens: 10, output_tokens: 5 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const options = {
        temperature: 0.7,
        maxTokens: 500,
        topP: 0.9,
        stop: ['STOP']
      };

      await provider.chat([{ role: 'user', content: 'Test' }], options);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.temperature).toBe(0.7);
      expect(body.max_tokens).toBe(500);
      expect(body.top_p).toBe(0.9);
      expect(body.stop_sequences).toEqual(['STOP']);
    });

    it('should use default max_tokens if not provided', async () => {
      const mockResponse = {
        content: [{ text: 'Response' }],
        usage: { input_tokens: 10, output_tokens: 5 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await provider.chat([{ role: 'user', content: 'Test' }]);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.max_tokens).toBe(4096);
    });
  });

  describe('stream()', () => {
    it('should stream response chunks', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode('data: {"type":"content_block_delta","delta":{"text":"Hello"}}\n')
          );
          controller.enqueue(
            encoder.encode('data: {"type":"content_block_delta","delta":{"text":" world"}}\n')
          );
          controller.enqueue(
            encoder.encode(
              'data: {"type":"message_stop","usage":{"input_tokens":10,"output_tokens":20}}\n'
            )
          );
          controller.close();
        }
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream
      });

      const chunks: string[] = [];
      for await (const chunk of provider.stream('Test')) {
        if (!chunk.done) {
          chunks.push(chunk.content);
        } else {
          expect(chunk.usage).toEqual({
            promptTokens: 10,
            completionTokens: 20,
            totalTokens: 30
          });
        }
      }

      expect(chunks).toEqual(['Hello', ' world']);
    });

    it('should handle message_delta event with usage', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              'data: {"type":"message_delta","usage":{"input_tokens":15,"output_tokens":25}}\n'
            )
          );
          controller.close();
        }
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream
      });

      let finalChunk: any;
      for await (const chunk of provider.stream('Test')) {
        if (chunk.done) {
          finalChunk = chunk;
        }
      }

      expect(finalChunk.usage).toEqual({
        promptTokens: 15,
        completionTokens: 25,
        totalTokens: 40
      });
    });

    it('should throw error if response not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Server error'
      });

      const generator = provider.stream('Test');
      await expect(generator.next()).rejects.toThrow(AIProviderError);
    });

    it('should throw error if no response body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: null
      });

      const generator = provider.stream('Test');
      await expect(generator.next()).rejects.toThrow('No response body from Anthropic');
    });

    it('should skip invalid JSON chunks in stream', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: invalid json\n'));
          controller.enqueue(
            encoder.encode('data: {"type":"content_block_delta","delta":{"text":"valid"}}\n')
          );
          controller.enqueue(encoder.encode('data: {"type":"message_stop"}\n'));
          controller.close();
        }
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream
      });

      const chunks: string[] = [];
      for await (const chunk of provider.stream('Test')) {
        if (!chunk.done) {
          chunks.push(chunk.content);
        }
      }

      expect(chunks).toEqual(['valid']);
    });
  });

  describe('calculateCost()', () => {
    it('should calculate cost for claude-3-5-sonnet', () => {
      const cost = provider.calculateCost(1_000_000, 1_000_000);
      // $3.00 per 1M prompt + $15.00 per 1M completion = $18.00
      expect(cost).toBe(18.0);
    });

    it('should calculate cost for partial token usage', () => {
      const cost = provider.calculateCost(500_000, 250_000);
      // (500k / 1M) * $3.00 + (250k / 1M) * $15.00 = $1.50 + $3.75 = $5.25
      expect(cost).toBeCloseTo(5.25, 2);
    });

    it('should use haiku pricing for unknown models', () => {
      const unknownProvider = new AnthropicProvider('test-key', 'claude-unknown-model');
      const cost = unknownProvider.calculateCost(1_000_000, 1_000_000);
      // Haiku: $0.25 per 1M prompt + $1.25 per 1M completion = $1.50
      expect(cost).toBe(1.5);
    });

    it('should match base model name for versioned models', () => {
      const versionedProvider = new AnthropicProvider('test-key', 'claude-3-opus-20240229-v2');
      const cost = versionedProvider.calculateCost(1_000_000, 1_000_000);
      // Should match opus pricing: $15 + $75 = $90
      expect(cost).toBe(90.0);
    });
  });

  describe('buildHeaders()', () => {
    it('should include required Anthropic headers', async () => {
      const mockResponse = {
        content: [{ text: 'Response' }],
        usage: { input_tokens: 10, output_tokens: 5 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await provider.ask('Test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'test-api-key',
            'anthropic-version': '2023-06-01'
          }
        })
      );
    });
  });

  describe('response parsing', () => {
    it('should handle response without usage data', async () => {
      const mockResponse = {
        content: [{ text: 'Response without usage' }],
        stop_reason: 'end_turn'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const response = await provider.ask('Test');

      expect(response.content).toBe('Response without usage');
      expect(response.usage).toBeUndefined();
      expect(response.cost).toBeUndefined();
    });

    it('should handle empty content array', async () => {
      const mockResponse = {
        content: [],
        usage: { input_tokens: 10, output_tokens: 0 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const response = await provider.ask('Test');

      expect(response.content).toBe('');
    });

    it('should include raw response data', async () => {
      const mockResponse = {
        id: 'msg_123',
        content: [{ text: 'Response' }],
        model: 'claude-3-5-sonnet-20241022',
        usage: { input_tokens: 10, output_tokens: 5 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const response = await provider.ask('Test');

      expect(response.raw).toEqual(mockResponse);
    });
  });
});
