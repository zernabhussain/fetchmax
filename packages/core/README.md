# @fetchmax/core

[![npm version](https://img.shields.io/npm/v/@fetchmax/core.svg)](https://www.npmjs.com/package/@fetchmax/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

**The HTTP Client with AI Superpowers**

Modern, lightweight, and extensible HTTP client built on native Fetch API with powerful plugin system and AI capabilities. Works seamlessly in Node.js, Deno, Bun, and browsers.

- 🤖 **AI-Powered** - Use LLMs without extra libraries (OpenAI, Anthropic, DeepSeek)
- ⚡ **Ultra-Lightweight** - 3.7 KB core (gzipped)
- 🔌 **14 Official Plugins** - Modular architecture, use only what you need
- 🎯 **TypeScript First** - Perfect type inference and safety
- 🌍 **Universal** - Browser, Node.js, Deno, Bun, Edge runtimes

## Quick Start

```bash
npm install @fetchmax/core
```

```javascript
import { HttpClient } from '@fetchmax/core';

const client = new HttpClient({
  baseURL: 'https://api.example.com'
});

const response = await client.get('/users');
console.log(response.data);
```

## Available Plugins

### AI Plugins (5) 🤖 ⭐ NEW

Use AI without installing separate AI SDKs:

```bash
npm install @fetchmax/plugin-ai-agent      # AI foundation (required for AI plugins)
npm install @fetchmax/plugin-ai-mock       # Generate realistic mock data
npm install @fetchmax/plugin-ai-translate  # Multi-language translation
npm install @fetchmax/plugin-ai-summarize  # Content summarization
npm install @fetchmax/plugin-ai-transform  # Custom AI transformations
```

### Core Plugins (9)

Production-ready HTTP utilities:

```bash
npm install @fetchmax/plugin-retry         # Auto-retry with exponential backoff
npm install @fetchmax/plugin-cache         # Response caching with TTL
npm install @fetchmax/plugin-interceptors  # Request/response/error interceptors
npm install @fetchmax/plugin-timeout       # Request timeouts
npm install @fetchmax/plugin-logger        # Debug logging
npm install @fetchmax/plugin-dedupe        # Prevent duplicate requests
npm install @fetchmax/plugin-rate-limit    # Rate limiting with queue
npm install @fetchmax/plugin-transform     # Data transformation
npm install @fetchmax/plugin-progress      # Upload/download progress
```

## Usage Example

```javascript
import { HttpClient } from '@fetchmax/core';
import { retryPlugin } from '@fetchmax/plugin-retry';
import { cachePlugin } from '@fetchmax/plugin-cache';

const client = new HttpClient({ baseURL: 'https://api.example.com' })
  .use(retryPlugin({ maxRetries: 3, backoff: 'exponential' }))
  .use(cachePlugin({ ttl: 300000 }));

// Requests now have auto-retry and caching
const users = await client.get('/users');
```

## AI Example

**Use LLMs in production without installing separate AI SDKs:**

```javascript
import { HttpClient } from '@fetchmax/core';
import { aiAgentPlugin } from '@fetchmax/plugin-ai-agent';
import { aiTranslatePlugin } from '@fetchmax/plugin-ai-translate';

// Setup AI (no openai or @anthropic-ai/sdk needed!)
const aiAgent = aiAgentPlugin({
  provider: 'openai', // or 'anthropic' or 'deepseek'
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o-mini'
}).aiAgent;

// Translate API responses on-the-fly
const client = new HttpClient({ baseURL: 'https://api.example.com' })
  .use(aiTranslatePlugin({
    aiAgent,
    targetLanguages: ['es', 'fr', 'de'], // Spanish, French, German
    fields: { include: ['title', 'description'] }
  }));

// One request, multiple languages!
const response = await client.get('/articles/123');
// Returns: { title: "Hello", title_es: "Hola", title_fr: "Bonjour", ... }
```

## Complete Documentation

**For complete documentation, guides, and examples:**

📚 **[View Full Documentation on GitHub](https://github.com/zernabhussain/fetchmax#readme)**

The main documentation includes:
- Detailed plugin guides
- AI provider setup (OpenAI, Anthropic, DeepSeek)
- Production-ready examples
- Error handling patterns
- Plugin development guide
- Testing strategies
- And much more!

## Package Size

| Format | Size | Gzipped |
|--------|------|---------|
| ESM | 15 KB | 3.7 KB |
| CJS | 17 KB | 4.1 KB |
| TypeScript Defs | 11 KB | - |
| **Total (unpacked)** | **53.6 KB** | **3.7 KB** |

*What matters: The gzipped size is only 3.7 KB!*

## Features

- ✅ All standard HTTP methods (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
- ✅ Request/response interceptors
- ✅ Automatic retries with backoff
- ✅ Response caching
- ✅ Request timeout
- ✅ Progress tracking
- ✅ Request deduplication
- ✅ Rate limiting
- ✅ AI integration (OpenAI, Anthropic, DeepSeek)
- ✅ TypeScript support with perfect type inference
- ✅ Works everywhere: Browser, Node.js, Deno, Bun
- ✅ 100% test coverage (622+ tests passing)

## Browser Support

Works in all modern browsers and runtimes that support native Fetch API:
- Chrome, Firefox, Safari, Edge (all recent versions)
- Node.js 18+
- Deno (latest)
- Bun (latest)
- Cloudflare Workers, Vercel Edge Functions, etc.

## License

MIT © FetchMax Contributors

## Links

- 📦 [npm Organization](https://www.npmjs.com/org/fetchmax)
- 📚 [GitHub Repository](https://github.com/zernabhussain/fetchmax)
- 📖 [Full Documentation](https://github.com/zernabhussain/fetchmax#readme)
- 🐛 [Report Issues](https://github.com/zernabhussain/fetchmax/issues)

---

Made with ❤️ by the FetchMax community
