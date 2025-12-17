# @fetchmax/plugin-ai-translate

AI-powered automatic translation plugin for FetchMax. Automatically translate API responses into multiple languages.

## Features

- Automatic translation of API responses
- Support for multiple target languages simultaneously
- Smart field extraction (auto-detect or manual selection)
- Multiple translation strategies (replace, merge, separate)
- Translation caching with TTL
- Endpoint-specific translation rules
- Detailed statistics tracking

## Installation

```bash
npm install @fetchmax/plugin-ai-translate @fetchmax/plugin-ai-agent
```

## Basic Usage

```typescript
import { createClient } from '@fetchmax/core';
import { aiAgentPlugin } from '@fetchmax/plugin-ai-agent';
import { aiTranslatePlugin } from '@fetchmax/plugin-ai-translate';

const client = createClient({
  baseURL: 'https://api.example.com',
  plugins: [
    // Add AI Agent plugin first (required)
    aiAgentPlugin({
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4o-mini'
    }),

    // Add AI Translate plugin
    aiTranslatePlugin({
      targetLanguages: ['es', 'fr', 'de']
    })
  ]
});

// Response will include translations
const response = await client.get('/api/products/123');
console.log(response.data);
// Original response + translations in _translations field
```

## Translation Strategies

### Separate (Default)

Adds translations to a separate field:

```typescript
aiTranslatePlugin({
  targetLanguages: ['es', 'fr'],
  strategy: 'separate',
  translationsField: '_translations' // optional, defaults to '_translations'
})

// Response:
// {
//   name: "Hello",
//   _translations: {
//     name: {
//       original: "Hello",
//       es: "Hola",
//       fr: "Bonjour"
//     }
//   }
// }
```

### Replace

Replaces original text with translation:

```typescript
aiTranslatePlugin({
  targetLanguages: ['es'],
  strategy: 'replace'
})

// Response:
// {
//   name: "Hola"  // Replaced with Spanish
// }
```

### Merge

Adds translations as separate fields with language suffixes:

```typescript
aiTranslatePlugin({
  targetLanguages: ['es', 'fr'],
  strategy: 'merge',
  preserveOriginal: true // optional
})

// Response:
// {
//   name: "Hello",      // Original (if preserveOriginal: true)
//   name_es: "Hola",
//   name_fr: "Bonjour"
// }
```

## Field Selection

### Auto-Detect (Default)

Automatically detects and translates all string fields:

```typescript
aiTranslatePlugin({
  targetLanguages: ['es']
  // Auto-detects all string fields
})
```

### Include Specific Fields

Translate only specific fields:

```typescript
aiTranslatePlugin({
  targetLanguages: ['es'],
  fields: {
    include: ['title', 'description', 'product.name'],
    autoDetect: false
  }
})
```

### Exclude Specific Fields

Translate all except certain fields:

```typescript
aiTranslatePlugin({
  targetLanguages: ['es'],
  fields: {
    exclude: ['id', 'createdAt', 'userId']
  }
})
```

### Wildcard Patterns

Use wildcards for flexible field selection:

```typescript
aiTranslatePlugin({
  targetLanguages: ['es'],
  fields: {
    include: ['product.*', 'user.profile.*']
  }
})
```

## Configuration

### AITranslateConfig

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `targetLanguages` | `string \| string[]` | Target language(s) to translate to | required |
| `sourceLanguage` | `string` | Source language (auto-detect if not specified) | - |
| `strategy` | `'replace' \| 'merge' \| 'separate'` | Translation strategy | `'separate'` |
| `fields` | `FieldSelector` | Field selection rules | auto-detect all |
| `cache` | `boolean` | Enable translation caching | `true` |
| `cacheTTL` | `number` | Cache TTL in milliseconds | `86400000` (24h) |
| `translationsField` | `string` | Field name for separate strategy | `'_translations'` |
| `preserveOriginal` | `boolean` | Keep original text | `true` |
| `endpoints` | `string[] \| RegExp[]` | Only translate specific endpoints | all endpoints |
| `debug` | `boolean` | Enable debug logging | `false` |

### Supported Languages

Common language codes:
- `en` - English
- `es` - Spanish
- `fr` - French
- `de` - German
- `it` - Italian
- `pt` - Portuguese
- `ru` - Russian
- `ja` - Japanese
- `ko` - Korean
- `zh` - Chinese
- `ar` - Arabic
- `hi` - Hindi

Any valid language code is supported.

## Advanced Examples

### Translate Specific Endpoints

```typescript
aiTranslatePlugin({
  targetLanguages: ['es', 'fr'],
  endpoints: [
    '/api/products',
    '/api/posts',
    /^\/api\/content\/.*/
  ]
})
```

### Specify Source Language

```typescript
aiTranslatePlugin({
  targetLanguages: ['es'],
  sourceLanguage: 'en' // More accurate translations
})
```

### Disable Caching for Development

```typescript
aiTranslatePlugin({
  targetLanguages: ['es'],
  cache: false // Always generate fresh translations
})
```

### Complex Field Selection

```typescript
aiTranslatePlugin({
  targetLanguages: ['es', 'fr', 'de'],
  fields: {
    include: [
      'product.title',
      'product.description',
      'reviews[*].comment'
    ],
    exclude: ['reviews[*].author']
  }
})
```

## API Methods

### getStats()

Get translation statistics:

```typescript
const plugin = aiTranslatePlugin({ targetLanguages: ['es'] });

// Later...
const stats = (plugin as any).getStats();
console.log(stats);
// {
//   totalRequests: 100,
//   translatedResponses: 85,
//   cacheHits: 60,
//   cacheMisses: 25,
//   averageTranslationTime: 200,
//   languagesUsed: { es: 85 }
// }
```

### getCacheStats()

Get cache statistics:

```typescript
const cacheStats = (plugin as any).getCacheStats();
console.log(cacheStats);
// {
//   entries: 50,
//   hits: 60,
//   misses: 25,
//   hitRate: 0.7059
// }
```

### clearCache()

Clear the translation cache:

```typescript
(plugin as any).clearCache();
```

## Best Practices

1. Use caching to reduce AI costs
2. Specify `sourceLanguage` for better accuracy
3. Use field selectors to translate only necessary content
4. Use endpoint filters for targeted translation
5. Monitor statistics to optimize performance
6. Use the `separate` strategy to preserve original data

## Error Handling

```typescript
import {
  AIAgentNotFoundError,
  TranslationError,
  TranslationConfigError
} from '@fetchmax/plugin-ai-translate';

try {
  const response = await client.get('/api/products');
} catch (error) {
  if (error instanceof AIAgentNotFoundError) {
    console.error('AI Agent plugin not installed');
  } else if (error instanceof TranslationError) {
    console.error('Translation failed:', error.message);
  } else if (error instanceof TranslationConfigError) {
    console.error('Invalid configuration:', error.message);
  }
}
```

## Requirements

- `@fetchmax/core` >= 1.0.0
- `@fetchmax/plugin-ai-agent` >= 0.1.0-alpha.0

## License

MIT
