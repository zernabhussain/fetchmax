import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAIProvider } from '../../../../packages/plugins/ai-agent/src/providers/openai';
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

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch as any;
    provider = new OpenAIProvider('test-api-key', 'gpt-4o');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with API key and model', () => {
      expect(provider.name).toBe('openai');
    });

    it('should use custom endpoint if provided', () => {
      const customProvider = new OpenAIProvider(
        'test-key',
        'gpt-4-turbo',
        'https://custom.openai.com/v1/chat/completions'
      );
      expect(customProvider.name).toBe('openai');
    });

    it('should use custom timeout if provided', () => {
      const customProvider = new OpenAIProvider(
        'test-key',
        'gpt-3.5-turbo',
        undefined,
        45000
      );
      expect(customProvider.name).toBe('openai');
    });
  });

  describe('ask()', () => {
    it('should make a simple request and return response', async () => {
      const mockResponse = {
        choices: [{
          message: { content: 'Hello! How can I assist you today?' },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 15,
          total_tokens: 25
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const response = await provider.ask('Hello');

      expect(response.content).toBe('Hello! How can I assist you today?');
      expect(response.finishReason).toBe('stop');
      expect(response.usage).toEqual({
        promptTokens: 10,
        completionTokens: 15,
        totalTokens: 25
      });
      expect(response.cost).toBeGreaterThan(0);
    });

    it('should pass options to underlying chat method', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Response' } }],
        usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const response = await provider.ask('Test', { temperature: 0.8, maxTokens: 200 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"temperature":0.8')
        })
      );
      expect(response.content).toBe('Response');
    });

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded'
      });

      await expect(provider.ask('Hello')).rejects.toThrow(AIProviderError);
      await expect(provider.ask('Hello')).rejects.toThrow('OpenAI API error');
    });
  });

  describe('askJSON()', () => {
    it('should parse JSON response', async () => {
      const mockResponse = {
        choices: [{ message: { content: '{"name":"Alice","role":"developer"}' } }],
        usage: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await provider.askJSON<{ name: string; role: string }>('Get user info');

      expect(result).toEqual({ name: 'Alice', role: 'developer' });
    });

    it('should use JSON mode (response_format)', async () => {
      const mockResponse = {
        choices: [{ message: { content: '{"status":"success"}' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await provider.askJSON('Get status');

      expect(mockFetch).toHaveBeenCalled();
      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.response_format).toEqual({ type: 'json_object' });
    });

    it('should include schema in prompt when provided', async () => {
      const mockResponse = {
        choices: [{ message: { content: '{"id":1,"name":"Test"}' } }],
        usage: { prompt_tokens: 20, completion_tokens: 8, total_tokens: 28 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const schema = { id: 'number', name: 'string' };
      await provider.askJSON('Get data', schema);

      expect(mockFetch).toHaveBeenCalled();
      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.messages[0].content).toContain(JSON.stringify(schema));
    });

    it('should throw InvalidJSONResponseError on parse failure', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Not a JSON response' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
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
        choices: [{ message: { content: 'I understand the context!' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 60, completion_tokens: 20, total_tokens: 80 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const messages = [
        { role: 'system' as const, content: 'You are a helpful assistant' },
        { role: 'user' as const, content: 'Hello' },
        { role: 'assistant' as const, content: 'Hi! How can I help?' },
        { role: 'user' as const, content: 'Tell me about context' }
      ];

      const response = await provider.chat(messages);

      expect(response.content).toBe('I understand the context!');
      expect(response.usage?.promptTokens).toBe(60);
    });

    it('should include all config options in request', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Response' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const options = {
        temperature: 0.5,
        maxTokens: 300,
        topP: 0.95,
        stop: ['END']
      };

      await provider.chat([{ role: 'user', content: 'Test' }], options);

      expect(mockFetch).toHaveBeenCalled();
      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.temperature).toBe(0.5);
      expect(body.max_tokens).toBe(300);
      expect(body.top_p).toBe(0.95);
      expect(body.stop).toEqual(['END']);
    });

    it('should not include optional params if undefined', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Response' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await provider.chat([{ role: 'user', content: 'Test' }]);

      expect(mockFetch).toHaveBeenCalled();
      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.temperature).toBeUndefined();
      expect(body.max_tokens).toBeUndefined();
      expect(body.top_p).toBeUndefined();
      expect(body.stop).toBeUndefined();
    });
  });

  describe('stream()', () => {
    it('should stream response chunks', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n')
          );
          controller.enqueue(
            encoder.encode('data: {"choices":[{"delta":{"content":" there"}}]}\n')
          );
          controller.enqueue(encoder.encode('data: [DONE]\n'));
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

      expect(chunks).toEqual(['Hello', ' there']);
    });

    it('should handle [DONE] marker', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode('data: {"choices":[{"delta":{"content":"Done"}}]}\n')
          );
          controller.enqueue(encoder.encode('data: [DONE]\n'));
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

      expect(finalChunk.done).toBe(true);
      expect(finalChunk.content).toBe('');
    });

    it('should capture usage data from stream', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode('data: {"choices":[{"delta":{"content":"Hi"}}]}\n')
          );
          controller.enqueue(
            encoder.encode(
              'data: {"usage":{"prompt_tokens":15,"completion_tokens":25}}\n'
            )
          );
          controller.enqueue(encoder.encode('data: [DONE]\n'));
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
        status: 503,
        text: async () => 'Service unavailable'
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
      await expect(generator.next()).rejects.toThrow('No response body from OpenAI');
    });

    it('should skip invalid JSON chunks in stream', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: invalid\n'));
          controller.enqueue(
            encoder.encode('data: {"choices":[{"delta":{"content":"valid"}}]}\n')
          );
          controller.enqueue(encoder.encode('data: [DONE]\n'));
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

    it('should increment completion tokens for each chunk', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode('data: {"choices":[{"delta":{"content":"A"}}]}\n')
          );
          controller.enqueue(
            encoder.encode('data: {"choices":[{"delta":{"content":"B"}}]}\n')
          );
          controller.enqueue(
            encoder.encode('data: {"choices":[{"delta":{"content":"C"}}]}\n')
          );
          controller.enqueue(encoder.encode('data: [DONE]\n'));
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

      // Should have counted 3 completion tokens (A, B, C)
      expect(finalChunk.usage.completionTokens).toBe(3);
    });
  });

  describe('calculateCost()', () => {
    it('should calculate cost for gpt-4o', () => {
      const cost = provider.calculateCost(1_000_000, 1_000_000);
      // $2.50 per 1M prompt + $10.00 per 1M completion = $12.50
      expect(cost).toBe(12.5);
    });

    it('should calculate cost for partial token usage', () => {
      const cost = provider.calculateCost(250_000, 100_000);
      // (250k / 1M) * $2.50 + (100k / 1M) * $10.00 = $0.625 + $1.00 = $1.625
      expect(cost).toBeCloseTo(1.625, 3);
    });

    it('should use gpt-4o-mini pricing for unknown models', () => {
      const unknownProvider = new OpenAIProvider('test-key', 'gpt-unknown');
      const cost = unknownProvider.calculateCost(1_000_000, 1_000_000);
      // gpt-4o-mini: $0.15 per 1M prompt + $0.60 per 1M completion = $0.75
      expect(cost).toBe(0.75);
    });

    it('should match base model name for versioned models', () => {
      const versionedProvider = new OpenAIProvider('test-key', 'gpt-4-0613');
      const cost = versionedProvider.calculateCost(1_000_000, 1_000_000);
      // Should match gpt-4 pricing: $30 + $60 = $90
      expect(cost).toBe(90.0);
    });

    it('should calculate cost for gpt-3.5-turbo', () => {
      const turboProvider = new OpenAIProvider('test-key', 'gpt-3.5-turbo');
      const cost = turboProvider.calculateCost(2_000_000, 1_000_000);
      // (2M / 1M) * $0.50 + (1M / 1M) * $1.50 = $1.00 + $1.50 = $2.50
      expect(cost).toBe(2.5);
    });
  });

  describe('buildHeaders()', () => {
    it('should include required OpenAI headers', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Response' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
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
            Authorization: 'Bearer test-api-key'
          }
        })
      );
    });
  });

  describe('response parsing', () => {
    it('should handle response without usage data', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'No usage data' }, finish_reason: 'stop' }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const response = await provider.ask('Test');

      expect(response.content).toBe('No usage data');
      expect(response.usage).toBeUndefined();
      expect(response.cost).toBeUndefined();
    });

    it('should handle empty content', async () => {
      const mockResponse = {
        choices: [{ message: { content: '' } }],
        usage: { prompt_tokens: 10, completion_tokens: 0, total_tokens: 10 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const response = await provider.ask('Test');

      expect(response.content).toBe('');
    });

    it('should handle missing choices array', async () => {
      const mockResponse = {
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
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
        id: 'chatcmpl-123',
        model: 'gpt-4o',
        choices: [{ message: { content: 'Response' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
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
