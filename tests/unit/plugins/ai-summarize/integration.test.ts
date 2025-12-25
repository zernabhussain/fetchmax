import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpClient } from '@fetchmax/core';
import { aiSummarizePlugin } from '@fetchmax/plugin-ai-summarize';
import type { AISummarizeConfig } from '@fetchmax/plugin-ai-summarize';
import { http, HttpResponse } from 'msw';
import { server } from '../../../setup';

describe('aiSummarizePlugin - Integration Tests', () => {
  let client: HttpClient;

  const longArticle = `
    Artificial Intelligence (AI) has revolutionized the way we interact with technology.
    From voice assistants to autonomous vehicles, AI applications are becoming increasingly
    prevalent in our daily lives. Machine learning algorithms enable computers to learn from
    data and improve their performance over time without explicit programming. Deep learning,
    a subset of machine learning, uses neural networks with multiple layers to process
    complex patterns. Natural language processing allows machines to understand and generate
    human language. Computer vision enables machines to interpret and understand visual
    information from the world. The ethical implications of AI are significant, including
    concerns about privacy, bias, job displacement, and autonomous decision-making. As AI
    continues to advance, it's crucial that we develop it responsibly and ensure it benefits
    humanity as a whole.
  `;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it('should summarize long content in bullet-points style', async () => {
    server.use(
      http.get('https://api.test.com/article', () => {
        return HttpResponse.json({
          title: 'AI Revolution',
          content: longArticle
        });
      })
    );

    client = new HttpClient();

    const mockAsk = vi.fn().mockResolvedValue(
      '• AI has revolutionized technology interaction\n' +
      '• Applications include voice assistants and autonomous vehicles\n' +
      '• Machine learning enables computers to learn from data\n' +
      '• Ethical concerns include privacy, bias, and job displacement'
    );

    const mockAiAgent = {
      ask: mockAsk
    };

    const config: AISummarizeConfig = {
      fields: {
        include: ['content'],
        minLength: 50
      },
      length: 'medium',
      style: 'bullet-points',
      aiAgent: mockAiAgent
    };

    client.use(aiSummarizePlugin(config));

    const response = await client.get('https://api.test.com/article');

    // Original content preserved
    expect(response.data.content).toBe(longArticle);

    // Summary added with _summary suffix
    expect(response.data.content_summary).toBeDefined();
    expect(response.data.content_summary).toContain('•');

    // Verify AI was called
    expect(mockAsk).toHaveBeenCalled();
  });

  it('should work with default auto-detect fields', async () => {
    server.use(
      http.get('https://api.test.com/post', () => {
        return HttpResponse.json({
          body: longArticle
        });
      })
    );

    client = new HttpClient();

    const mockAsk = vi.fn().mockResolvedValue(
      'AI has transformed technology through applications like voice assistants.'
    );

    const mockAiAgent = {
      ask: mockAsk
    };

    const config: AISummarizeConfig = {
      length: 'short',
      style: 'paragraph',
      aiAgent: mockAiAgent
    };

    client.use(aiSummarizePlugin(config));

    const response = await client.get('https://api.test.com/post');

    // Should auto-detect and summarize 'body' field
    expect(response.data.body_summary).toBeDefined();
    expect(mockAsk).toHaveBeenCalled();
  });

  it('should cache summaries', async () => {
    server.use(
      http.get('https://api.test.com/content', () => {
        return HttpResponse.json({ text: longArticle });
      })
    );

    client = new HttpClient();

    const mockAsk = vi.fn().mockResolvedValue('Summary here');

    const mockAiAgent = {
      ask: mockAsk
    };

    const config: AISummarizeConfig = {
      fields: {
        include: ['text'],
        minLength: 50
      },
      cache: true,
      cacheTTL: 60000,
      aiAgent: mockAiAgent
    };

    client.use(aiSummarizePlugin(config));

    // First request
    await client.get('https://api.test.com/content');
    expect(mockAsk).toHaveBeenCalledTimes(1);

    // Second request - should use cache
    await client.get('https://api.test.com/content');
    expect(mockAsk).toHaveBeenCalledTimes(1); // Still 1
  });

  it('should handle AI errors by logging and continuing', async () => {
    server.use(
      http.get('https://api.test.com/doc', () => {
        return HttpResponse.json({ content: longArticle });
      })
    );

    client = new HttpClient();

    const mockAsk = vi.fn().mockRejectedValue(new Error('AI model timeout'));

    const mockAiAgent = {
      ask: mockAsk
    };

    const config: AISummarizeConfig = {
      fields: {
        include: ['content'],
        minLength: 50
      },
      aiAgent: mockAiAgent
    };

    client.use(aiSummarizePlugin(config));

    // Plugin handles errors gracefully - returns original response
    const response = await client.get('https://api.test.com/doc');

    // Original content should still be present
    expect(response.data.content).toBe(longArticle);

    // No summary added due to error (plugin logs error and continues)
    expect(response.data.content_summary).toBeUndefined();
  });

  it('should only summarize matching endpoints', async () => {
    server.use(
      http.get('https://api.test.com/articles/long', () => {
        return HttpResponse.json({ content: longArticle });
      }),
      http.get('https://api.test.com/articles/short', () => {
        return HttpResponse.json({ content: 'Short text' });
      })
    );

    client = new HttpClient();

    const mockAsk = vi.fn().mockResolvedValue('Summary');

    const mockAiAgent = {
      ask: mockAsk
    };

    const config: AISummarizeConfig = {
      fields: {
        include: ['content'],
        minLength: 50
      },
      endpoints: ['/articles/long'],
      aiAgent: mockAiAgent
    };

    client.use(aiSummarizePlugin(config));

    // Should summarize
    await client.get('https://api.test.com/articles/long');
    expect(mockAsk).toHaveBeenCalledTimes(1);

    // Should NOT summarize (different endpoint)
    await client.get('https://api.test.com/articles/short');
    expect(mockAsk).toHaveBeenCalledTimes(1); // Still 1
  });
});
