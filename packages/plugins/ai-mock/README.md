# @fetchmax/plugin-ai-mock

AI-powered mock data generator plugin for FetchMax. Generate realistic mock API responses using AI, perfect for development, testing, and prototyping.

## Features

- Generate realistic mock data using AI
- Flexible endpoint pattern matching (exact, wildcard, regex)
- Smart caching with TTL
- Method-specific configurations
- Custom data structures and types
- Global and endpoint-specific instructions
- Passthrough mode for selective mocking
- Detailed statistics tracking

## Installation

```bash
npm install @fetchmax/plugin-ai-mock @fetchmax/plugin-ai-agent
```

## Basic Usage

```typescript
import { createClient } from '@fetchmax/core';
import { aiAgentPlugin } from '@fetchmax/plugin-ai-agent';
import { aiMockPlugin } from '@fetchmax/plugin-ai-mock';

const client = createClient({
  baseURL: 'https://api.example.com',
  plugins: [
    // Add AI Agent plugin first (required)
    aiAgentPlugin({
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4o-mini'
    }),

    // Add AI Mock plugin
    aiMockPlugin({
      endpoints: {
        '/api/users': {
          structure: {
            id: 'number',
            name: 'string',
            email: 'email',
            createdAt: 'date'
          }
        }
      }
    })
  ]
});

// This request will be intercepted and return AI-generated mock data
const response = await client.get('/api/users');
console.log(response.data);
// Output: { id: 1, name: "John Doe", email: "john@example.com", createdAt: "2024-01-15T10:30:00Z" }
```

## Configuration

### AIMockConfig

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `endpoints` | `Record<string, EndpointConfig>` | Endpoint configurations | required |
| `cache` | `boolean` | Enable global caching | `true` |
| `cacheTTL` | `number` | Cache TTL in milliseconds | `3600000` (1 hour) |
| `globalInstructions` | `string` | Instructions applied to all endpoints | - |
| `passthrough` | `EndpointPattern[]` | Patterns to bypass mocking | - |
| `debug` | `boolean` | Enable debug logging | `false` |

### EndpointConfig

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `structure` | `MockStructure` | Data structure definition | required |
| `method` | `HttpMethod` | HTTP method filter | `'GET'` |
| `count` | `number` | Number of items for arrays | `1` |
| `instructions` | `string` | Endpoint-specific instructions | - |
| `cache` | `boolean` | Enable caching for this endpoint | inherits global |
| `statusCode` | `number` | HTTP status code to return | `200` |

### Field Types

- `string` - Random string
- `number` - Random number
- `boolean` - Random boolean
- `date` - ISO date string
- `email` - Valid email address
- `url` - Valid URL
- `uuid` - UUID v4
- `array` - Array type (use with `count`)
- `object` - Nested object (use with `properties`)

## Examples

### Array of Items

```typescript
aiMockPlugin({
  endpoints: {
    '/api/users': {
      structure: {
        id: 'number',
        name: 'string',
        email: 'email'
      },
      count: 10  // Generate array of 10 users
    }
  }
})
```

### Complex Nested Structures

```typescript
aiMockPlugin({
  endpoints: {
    '/api/posts': {
      structure: {
        id: 'number',
        title: 'string',
        author: {
          type: 'object',
          properties: {
            id: 'number',
            name: 'string',
            email: 'email'
          }
        },
        tags: 'array',
        published: 'boolean',
        createdAt: 'date'
      }
    }
  }
})
```

### Method-Specific Configurations

```typescript
aiMockPlugin({
  endpoints: {
    '/api/users': {
      GET: {
        structure: {
          id: 'number',
          name: 'string',
          email: 'email'
        },
        count: 10
      },
      POST: {
        structure: {
          id: 'number',
          name: 'string',
          email: 'email',
          createdAt: 'date'
        },
        statusCode: 201
      }
    }
  }
})
```

### Enum and Optional Fields

```typescript
aiMockPlugin({
  endpoints: {
    '/api/users': {
      structure: {
        id: 'number',
        name: 'string',
        role: {
          type: 'string',
          enum: ['admin', 'user', 'guest']
        },
        bio: {
          type: 'string',
          required: false  // Optional field
        }
      }
    }
  }
})
```

### Wildcard Patterns

```typescript
aiMockPlugin({
  endpoints: {
    // Match all user endpoints
    '/api/users/*': {
      structure: {
        id: 'number',
        name: 'string'
      }
    },

    // Match all product endpoints
    '/api/products/*': {
      structure: {
        id: 'number',
        name: 'string',
        price: 'number'
      }
    }
  }
})
```

### Custom Instructions

```typescript
aiMockPlugin({
  endpoints: {
    '/api/users': {
      structure: {
        name: 'string',
        country: 'string',
        age: 'number'
      },
      instructions: 'Generate diverse users from different countries with realistic names',
      count: 5
    }
  },
  globalInstructions: 'Make all data look realistic and production-like'
})
```

### Passthrough Mode

```typescript
aiMockPlugin({
  endpoints: {
    '/api/users': {
      structure: { id: 'number', name: 'string' }
    }
  },
  // Let authentication requests through
  passthrough: [
    '/api/auth/*',
    '/api/login',
    /^\/api\/oauth\/.*/
  ]
})
```

## API Methods

### getStats()

Get plugin statistics:

```typescript
const plugin = aiMockPlugin({ /* config */ });

// Later...
const stats = (plugin as any).getStats();
console.log(stats);
// {
//   totalRequests: 100,
//   cacheHits: 80,
//   cacheMisses: 20,
//   generatedMocks: 20,
//   passthroughRequests: 5,
//   averageGenerationTime: 150
// }
```

### getCacheStats()

Get cache statistics:

```typescript
const cacheStats = (plugin as any).getCacheStats();
console.log(cacheStats);
// {
//   entries: 10,
//   totalHits: 80,
//   totalSize: 15000
// }
```

### clearCache()

Clear the cache:

```typescript
// Clear all cache
(plugin as any).clearCache();

// Clear specific endpoint
(plugin as any).clearCache('/api/users', 'GET');
```

## Advanced Usage

### Disable Caching for Development

```typescript
aiMockPlugin({
  endpoints: {
    '/api/users': {
      structure: { /* ... */ },
      cache: false  // Always generate fresh data
    }
  }
})
```

### Debug Mode

```typescript
aiMockPlugin({
  endpoints: { /* ... */ },
  debug: true  // Log all mock generations
})
```

## Error Handling

The plugin throws specific errors for different scenarios:

```typescript
import {
  AIAgentNotFoundError,
  MockGenerationError,
  MockConfigError
} from '@fetchmax/plugin-ai-mock';

try {
  const response = await client.get('/api/users');
} catch (error) {
  if (error instanceof AIAgentNotFoundError) {
    console.error('AI Agent plugin not installed');
  } else if (error instanceof MockGenerationError) {
    console.error('Failed to generate mock data:', error.message);
  } else if (error instanceof MockConfigError) {
    console.error('Invalid configuration:', error.message);
  }
}
```

## How It Works

1. **Request Interception**: The plugin intercepts requests in the `onRequest` hook
2. **Pattern Matching**: Checks if the request URL matches any configured endpoint pattern
3. **Cache Check**: Looks for cached mock data (if caching is enabled)
4. **AI Generation**: If no cache hit, uses the AI Agent plugin to generate realistic mock data
5. **Response Creation**: Creates a mock HTTP response with the generated data
6. **Cache Storage**: Stores the generated data for future requests (if caching is enabled)

## Best Practices

1. Use specific patterns to avoid over-mocking
2. Enable caching in development to save AI costs
3. Use passthrough for authentication endpoints
4. Provide clear instructions for better mock quality
5. Use method-specific configs for different CRUD operations
6. Monitor statistics to optimize cache hit rates

## Requirements

- `@fetchmax/core` >= 1.0.0
- `@fetchmax/plugin-ai-agent` >= 0.1.0-alpha.0

## License

MIT
