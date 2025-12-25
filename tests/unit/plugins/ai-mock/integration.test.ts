import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpClient } from '@fetchmax/core';
import { aiMockPlugin } from '@fetchmax/plugin-ai-mock';
import type { AIMockConfig } from '@fetchmax/plugin-ai-mock';
import { http, HttpResponse } from 'msw';
import { server } from '../../../setup';

describe('aiMockPlugin - Integration Tests', () => {
  let client: HttpClient;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it('should generate mock data for matching endpoints', async () => {
    client = new HttpClient();

    const mockData = {
      id: 123,
      title: 'Mock Article',
      content: 'This is AI-generated mock content'
    };

    const mockAskJSON = vi.fn().mockResolvedValue(mockData);

    const mockAiAgent = {
      askJSON: mockAskJSON
    };

    const config: AIMockConfig = {
      endpoints: {
        'https://api.test.com/api/articles': {
          structure: {
            id: 'number',
            title: 'string',
            content: 'string'
          }
        }
      },
      aiAgent: mockAiAgent
    };

    client.use(aiMockPlugin(config));

    // Request to mocked endpoint
    const response = await client.get('https://api.test.com/api/articles');

    expect(response.data).toEqual(mockData);
    expect(response.status).toBe(200);
    expect(mockAskJSON).toHaveBeenCalled();
    expect(response.headers.get('X-Mock-Source')).toBe('ai-mock-plugin');
  });

  it('should pass through non-matching endpoints', async () => {
    // Setup real endpoint response
    server.use(
      http.get('https://api.test.com/api/real', () => {
        return HttpResponse.json({ real: true, data: 'Real data' });
      })
    );

    client = new HttpClient();

    const mockAskJSON = vi.fn().mockResolvedValue({
      mocked: true
    });

    const mockAiAgent = {
      askJSON: mockAskJSON
    };

    const config: AIMockConfig = {
      endpoints: {
        'https://api.test.com/api/mocked': {
          structure: { mocked: 'boolean' }
        }
      },
      aiAgent: mockAiAgent
    };

    client.use(aiMockPlugin(config));

    // Request to real endpoint (not mocked)
    const response = await client.get('https://api.test.com/api/real');

    expect(response.data.real).toBe(true);
    expect(response.data.data).toBe('Real data');
    expect(mockAskJSON).not.toHaveBeenCalled(); // Should not mock
  });

  it('should handle AI errors gracefully by returning error', async () => {
    client = new HttpClient();

    const mockAskJSON = vi.fn().mockRejectedValue(new Error('AI rate limit exceeded'));

    const mockAiAgent = {
      askJSON: mockAskJSON
    };

    const config: AIMockConfig = {
      endpoints: {
        'https://api.test.com/api/test': {
          structure: { data: 'string' }
        }
      },
      aiAgent: mockAiAgent
    };

    client.use(aiMockPlugin(config));

    // Plugin will throw error when AI fails
    await expect(client.get('https://api.test.com/api/test')).rejects.toThrow();
  });
});
