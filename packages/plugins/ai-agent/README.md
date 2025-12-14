# @fetchmax/plugin-ai-agent

> AI Agent connection plugin for FetchMax - Unified interface for OpenAI, Anthropic, DeepSeek, and more

[![npm version](https://img.shields.io/npm/v/@fetchmax/plugin-ai-agent.svg)](https://www.npmjs.com/package/@fetchmax/plugin-ai-agent)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

The AI Agent plugin provides a unified interface to connect FetchMax with popular AI providers like OpenAI, Anthropic (Claude), DeepSeek, and more. It includes built-in cost tracking, rate limiting, and support for streaming responses.

**Status:** Alpha (v0.1.0-alpha) - API may change

## Features

✅ **Multi-Provider Support**
- OpenAI (GPT-4, GPT-4 Turbo, GPT-3.5-Turbo)
- Anthropic (Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku)
- DeepSeek (OpenAI-compatible)
- Custom OpenAI-compatible endpoints

✅ **Cost Tracking**
- Automatic token and cost calculation
- Budget limits with warnings
- Per-request cost breakdown

✅ **Rate Limiting**
- Requests per minute limits
- Tokens per minute limits
- Automatic queuing and retry

✅ **Flexible API**
- Simple text prompts
- Structured JSON responses
- Chat with message history
- Streaming responses

## Installation

```bash
npm install @fetchmax/plugin-ai-agent @fetchmax/core
```

## Quick Start

### OpenAI Example

```typescript
import { HttpClient } from '@fetchmax/core';
import { aiAgentPlugin } from '@fetchmax/plugin-ai-agent';

const client = new HttpClient().use(
  aiAgentPlugin({
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4o-mini',
    costTracking: {
      budgetLimit: 10.0, // $10 budget
      warningThreshold: 80 // Warn at 80%
    }
  })
);

// Simple question
const response = await client.aiAgent.ask('What is the capital of France?');
console.log(response.content); // "The capital of France is Paris."

// Get cost stats
const stats = client.aiAgent.getCostStats();
console.log(`Total cost: $${stats.totalCost.toFixed(4)}`);
```

### Anthropic (Claude) Example

```typescript
const client = new HttpClient().use(
  aiAgentPlugin({
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY!,
    model: 'claude-3-5-sonnet-20241022',
    rateLimiting: {
      requestsPerMinute: 50,
      tokensPerMinute: 40_000
    }
  })
);

const response = await client.aiAgent.ask(
  'Write a haiku about TypeScript'
);
console.log(response.content);
```

## API Reference

### Configuration

```typescript
interface AIAgentConfig {
  provider: 'openai' | 'anthropic' | 'deepseek' | 'custom';
  apiKey: string;
  model: string | AIModelConfig;
  apiEndpoint?: string; // For custom providers
  costTracking?: boolean | Partial<CostTrackingConfig>;
  rateLimiting?: boolean | Partial<RateLimitConfig>;
  systemMessage?: string;
  timeout?: number; // Default: 30000ms
  debug?: boolean;
}
```

### Methods

#### `ask(prompt: string, options?): Promise<AIResponse>`

Ask a simple question and get a text response.

```typescript
const response = await client.aiAgent.ask(
  'Explain quantum computing in simple terms',
  { temperature: 0.7, maxTokens: 200 }
);
```

#### `askJSON<T>(prompt: string, schema?, options?): Promise<T>`

Get a structured JSON response.

```typescript
interface UserProfile {
  name: string;
  age: number;
  occupation: string;
}

const user = await client.aiAgent.askJSON<UserProfile>(
  'Generate a random user profile',
  { name: 'string', age: 'number', occupation: 'string' }
);
```

#### `chat(messages: AIMessage[], options?): Promise<AIResponse>`

Have a conversation with message history.

```typescript
const response = await client.aiAgent.chat([
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'What is 2+2?' },
  { role: 'assistant', content: '2+2 equals 4.' },
  { role: 'user', content: 'What about 3+3?' }
]);
```

#### `stream(prompt: string, options?): AsyncGenerator<AIStreamChunk>`

Stream response chunks for long outputs.

```typescript
for await (const chunk of client.aiAgent.stream('Write a long story')) {
  if (!chunk.done) {
    process.stdout.write(chunk.content);
  } else {
    console.log('\n\nTokens used:', chunk.usage?.totalTokens);
  }
}
```

### Cost Tracking

```typescript
interface CostStats {
  totalRequests: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalCost: number; // in USD
  budgetLimit?: number;
  remainingBudget?: number;
  averageCost: number;
}

// Get stats
const stats = client.aiAgent.getCostStats();
console.log(`Average cost per request: $${stats.averageCost.toFixed(4)}`);

// Reset tracking
client.aiAgent.resetCostTracking();
```

### Rate Limiting

```typescript
// Get rate limit stats
const limits = client.aiAgent.getRateLimitStats();
console.log(`Requests in last minute: ${limits.requestsInLastMinute}`);
console.log(`Requests remaining: ${limits.requestsRemaining}`);

// Reset rate limiting
client.aiAgent.resetRateLimiting();
```

## Supported Models

### OpenAI

| Model | Cost (per 1M tokens) |
|-------|----------------------|
| gpt-4o | $2.50 / $10.00 (prompt/completion) |
| gpt-4o-mini | $0.15 / $0.60 |
| gpt-4-turbo | $10.00 / $30.00 |
| gpt-4 | $30.00 / $60.00 |
| gpt-3.5-turbo | $0.50 / $1.50 |

### Anthropic (Claude)

| Model | Cost (per 1M tokens) |
|-------|----------------------|
| claude-3-5-sonnet-20241022 | $3.00 / $15.00 |
| claude-3-opus-20240229 | $15.00 / $75.00 |
| claude-3-sonnet-20240229 | $3.00 / $15.00 |
| claude-3-haiku-20240307 | $0.25 / $1.25 |

## Advanced Usage

### Custom Endpoint

```typescript
const client = new HttpClient().use(
  aiAgentPlugin({
    provider: 'custom',
    apiKey: 'your-api-key',
    model: 'custom-model',
    apiEndpoint: 'https://your-api.example.com/v1/chat/completions'
  })
);
```

### DeepSeek (Cost-Effective Alternative)

```typescript
const client = new HttpClient().use(
  aiAgentPlugin({
    provider: 'deepseek',
    apiKey: process.env.DEEPSEEK_API_KEY!,
    model: 'deepseek-chat'
  })
);
```

### Budget Limits with Callbacks

```typescript
const client = new HttpClient().use(
  aiAgentPlugin({
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4o-mini',
    costTracking: {
      budgetLimit: 5.0,
      warningThreshold: 80,
      onBudgetWarning: (spent, limit) => {
        console.warn(`Warning: ${((spent / limit) * 100).toFixed(1)}% of budget used`);
      },
      onBudgetExceeded: (spent, limit) => {
        console.error(`Budget exceeded! Spent $${spent} / $${limit}`);
      }
    }
  })
);
```

## Error Handling

The plugin includes specific error types for better error handling:

```typescript
import {
  BudgetExceededError,
  RateLimitExceededError,
  AIProviderError,
  InvalidJSONResponseError
} from '@fetchmax/plugin-ai-agent';

try {
  const response = await client.aiAgent.ask('Hello');
} catch (error) {
  if (error instanceof BudgetExceededError) {
    console.error('Budget limit reached:', error.message);
  } else if (error instanceof RateLimitExceededError) {
    console.error('Rate limit hit, retry after:', error.retryAfter);
  } else if (error instanceof AIProviderError) {
    console.error('Provider error:', error.message, error.status);
  }
}
```

## Use Cases

### 1. Consumer Plugins

This plugin is designed as a foundation for other AI-powered plugins:

- **AI Mock Data Plugin** - Generate realistic mock API responses
- **AI Translate Plugin** - Translate response fields to different languages
- **AI Summarizer Plugin** - Summarize large API responses
- **AI Transformer Plugin** - Transform responses with natural language

See the [FetchMax AI Plugins Plan](https://github.com/zernabhussain/fetchmax) for more details.

### 2. Direct Usage

Use directly for AI-powered features in your applications:

```typescript
// Content generation
const blogPost = await client.aiAgent.askJSON(
  'Generate a blog post outline about TypeScript best practices',
  { title: 'string', sections: 'array of section titles' }
);

// Data analysis
const analysis = await client.aiAgent.ask(
  `Analyze this user feedback: "${feedback}". Provide sentiment and key themes.`
);

// Code generation
const code = await client.aiAgent.ask(
  'Write a TypeScript function to validate email addresses'
);
```

## TypeScript Support

Full TypeScript support with type inference:

```typescript
import type { AIResponse, AIMessage, CostStats } from '@fetchmax/plugin-ai-agent';

const response: AIResponse = await client.aiAgent.ask('Hello');
const messages: AIMessage[] = [
  { role: 'user', content: 'Hi' }
];
const stats: CostStats = client.aiAgent.getCostStats();
```

## License

MIT © FetchMax Contributors

## Contributing

Contributions are welcome! Please see our [Contributing Guide](https://github.com/zernabhussain/fetchmax/blob/main/CONTRIBUTING.md).

## Links

- [FetchMax Documentation](https://github.com/zernabhussain/fetchmax)
- [Report Issues](https://github.com/zernabhussain/fetchmax/issues)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Anthropic API Docs](https://docs.anthropic.com)
