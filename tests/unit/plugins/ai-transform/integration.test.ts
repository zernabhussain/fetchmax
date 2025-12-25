import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpClient } from '@fetchmax/core';
import { aiTransformPlugin } from '@fetchmax/plugin-ai-transform';
import type { AITransformConfig } from '@fetchmax/plugin-ai-transform';
import { http, HttpResponse } from 'msw';
import { server } from '../../../setup';

describe('aiTransformPlugin - Integration Tests', () => {
  let client: HttpClient;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it('should transform response data using AI', async () => {
    server.use(
      http.get('https://api.test.com/posts', () => {
        return HttpResponse.json({
          content: 'John Doe (john@example.com) and Jane Smith (555-1234) discussed the project.'
        });
      })
    );

    client = new HttpClient();

    const mockAskJSON = vi.fn().mockResolvedValue({
      emails: ['john@example.com'],
      phones: ['555-1234'],
      names: ['John Doe', 'Jane Smith']
    });

    const mockAiAgent = {
      askJSON: mockAskJSON
    };

    const config: AITransformConfig = {
      transforms: [
        {
          prompt: 'Extract all email addresses, phone numbers, and person names from the text',
          field: 'content',
          targetField: 'extracted'
        }
      ],
      aiAgent: mockAiAgent
    };

    client.use(aiTransformPlugin(config));

    const response = await client.get('https://api.test.com/posts');

    // Verify the response has extracted field
    expect(response.data).toHaveProperty('extracted');
    expect(response.data.extracted).toEqual({
      emails: ['john@example.com'],
      phones: ['555-1234'],
      names: ['John Doe', 'Jane Smith']
    });

    // Verify AI was called
    expect(mockAskJSON).toHaveBeenCalled();
  });

  it('should cache transformation results', async () => {
    server.use(
      http.get('https://api.test.com/data', () => {
        return HttpResponse.json({
          text: 'Contact us at support@example.com'
        });
      })
    );

    client = new HttpClient();

    const mockAskJSON = vi.fn().mockResolvedValue(['support@example.com']);

    const mockAiAgent = {
      askJSON: mockAskJSON
    };

    const config: AITransformConfig = {
      transforms: [
        {
          prompt: 'Extract email addresses',
          field: 'text',
          targetField: 'emails',
          cache: true
        }
      ],
      cache: true,
      cacheTTL: 60000,
      aiAgent: mockAiAgent
    };

    client.use(aiTransformPlugin(config));

    // First request - should call AI
    const response1 = await client.get('https://api.test.com/data');
    expect(response1.data.emails).toEqual(['support@example.com']);
    expect(mockAskJSON).toHaveBeenCalledTimes(1);

    // Second request with same data - should use cache
    const response2 = await client.get('https://api.test.com/data');
    expect(response2.data.emails).toEqual(['support@example.com']);
    expect(mockAskJSON).toHaveBeenCalledTimes(1); // Still 1, not 2
  });

  it('should handle AI errors gracefully', async () => {
    server.use(
      http.get('https://api.test.com/post', () => {
        return HttpResponse.json({ content: 'Some text' });
      })
    );

    client = new HttpClient();

    const mockAskJSON = vi.fn().mockRejectedValue(new Error('AI service unavailable'));

    const mockAiAgent = {
      askJSON: mockAskJSON
    };

    const config: AITransformConfig = {
      transforms: [
        {
          prompt: 'Extract data',
          field: 'content',
          targetField: 'extracted'
        }
      ],
      aiAgent: mockAiAgent
    };

    client.use(aiTransformPlugin(config));

    // Plugin handles errors gracefully - returns original response
    const response = await client.get('https://api.test.com/post');

    // Original data preserved
    expect(response.data.content).toBe('Some text');
  });

  it('should only transform matching endpoints', async () => {
    server.use(
      http.get('https://api.test.com/api/posts', () => {
        return HttpResponse.json({ text: 'Post content' });
      }),
      http.get('https://api.test.com/api/users', () => {
        return HttpResponse.json({ name: 'John' });
      })
    );

    client = new HttpClient();

    const mockAskJSON = vi.fn().mockResolvedValue(['extracted']);

    const mockAiAgent = {
      askJSON: mockAskJSON
    };

    const config: AITransformConfig = {
      transforms: [{ prompt: 'Extract', field: 'text', targetField: 'result' }],
      endpoints: ['/api/posts'], // Only transform /api/posts
      aiAgent: mockAiAgent
    };

    client.use(aiTransformPlugin(config));

    // This should transform
    await client.get('https://api.test.com/api/posts');
    expect(mockAskJSON).toHaveBeenCalledTimes(1);

    // This should NOT transform (different endpoint)
    const response = await client.get('https://api.test.com/api/users');
    expect(response.data).toEqual({ name: 'John' });
    expect(mockAskJSON).toHaveBeenCalledTimes(1); // Still 1
  });
});
