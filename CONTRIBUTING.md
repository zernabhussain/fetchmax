# Contributing to FetchMax

Thank you for your interest in contributing to FetchMax! This guide will help you get started.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Coding Standards](#coding-standards)
- [Submitting Changes](#submitting-changes)
- [Creating Plugins](#creating-plugins)

## 📜 Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please be respectful and considerate in all interactions.

## 🚀 Getting Started

1. **Fork the repository**
   ```bash
   # Click "Fork" button on GitHub
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/fetchmax.git
   cd fetchmax
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/fetchmax/fetchmax.git
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

## 💻 Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Install Dependencies

```bash
npm install
```

### Build the Project

```bash
# Build all packages
npm run build

# Build core only
cd packages/core && npm run build

# Build in watch mode
cd packages/core && npm run dev
```

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- client.test.ts
```

### Run Examples

```bash
# Run basic examples
cd examples/basic
npx tsx index.ts
```

## 📁 Project Structure

```
fetchmax/
├── packages/
│   ├── core/              # Core HTTP client
│   │   ├── src/
│   │   │   ├── client.ts  # Main HttpClient class
│   │   │   ├── types.ts   # TypeScript definitions
│   │   │   ├── errors.ts  # Error classes
│   │   │   ├── utils.ts   # Utilities
│   │   │   └── index.ts   # Public exports
│   │   └── tests/         # Core tests
│   │
│   └── plugins/           # Plugin packages
│       ├── retry/
│       ├── cache/
│       └── ...
│
├── tests/                 # Integration tests
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── examples/              # Usage examples
├── docs/                  # Documentation
└── scripts/               # Build scripts
```

## ✏️ Making Changes

### Creating a Branch

```bash
# Update your local main branch
git checkout main
git pull upstream main

# Create a new branch
git checkout -b feature/my-feature
# or
git checkout -b fix/my-bugfix
```

### Branch Naming Convention

- `feature/`: New features
- `fix/`: Bug fixes
- `docs/`: Documentation changes
- `refactor/`: Code refactoring
- `test/`: Test additions or changes
- `chore/`: Maintenance tasks

### Making Commits

```bash
git add .
git commit -m "feat: add new feature"
```

#### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject

body (optional)

footer (optional)
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Maintenance

**Examples:**
```
feat(cache): add localStorage support
fix(retry): correct exponential backoff calculation
docs(readme): update installation instructions
test(client): add tests for error handling
```

## 🧪 Testing

### Writing Tests

Tests should be comprehensive and cover:
- Happy path scenarios
- Error cases
- Edge cases
- Different configurations

**Test File Structure:**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { HttpClient } from '../../packages/core/src/client';
import { http } from 'msw';
import { server } from '../setup';

describe('Feature Name', () => {
  describe('Sub-feature', () => {
    it('should do something', async () => {
      // Arrange
      server.use(
        http.get('https://api.test.com/endpoint', () => {
          return Response.json({ data: 'test' });
        })
      );

      // Act
      const client = new HttpClient();
      const response = await client.get('https://api.test.com/endpoint');

      // Assert
      expect(response.data).toEqual({ data: 'test' });
    });
  });
});
```

### Test Coverage Requirements

- Core library: 95%+ coverage
- Plugins: 90%+ coverage
- All public APIs must be tested
- Edge cases and error paths must be tested

### Running Specific Tests

```bash
# Run specific test file
npm test -- retry.test.ts

# Run tests matching a pattern
npm test -- --grep "Retry Plugin"

# Run tests in watch mode
npm run test:watch
```

## 📝 Coding Standards

### TypeScript

- Use strict mode
- Provide explicit types for public APIs
- Avoid `any` type (use `unknown` instead)
- Document complex types with JSDoc

**Example:**
```typescript
/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /** Maximum number of retries (default: 3) */
  maxRetries?: number;
  /** Delay between retries in milliseconds (default: 1000) */
  retryDelay?: number;
}
```

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Add trailing commas in multi-line objects/arrays
- Keep lines under 100 characters when possible
- Use meaningful variable names

**Good:**
```typescript
const maxRetryAttempts = 3;
const userResponse = await client.get('/users');
```

**Bad:**
```typescript
const x = 3;
const r = await client.get('/users');
```

### Error Handling

- Always throw appropriate error types
- Include helpful error messages
- Add context to errors

**Example:**
```typescript
if (!config.url) {
  throw new Error('Request URL is required');
}

try {
  await fetch(url);
} catch (error) {
  throw new NetworkError('Failed to fetch data', config);
}
```

### Documentation

- Add JSDoc comments for public APIs
- Include examples in documentation
- Document parameters and return types
- Explain complex logic with inline comments

**Example:**
```typescript
/**
 * Makes an HTTP GET request
 *
 * @param url - The request URL
 * @param config - Optional request configuration
 * @returns Promise resolving to HTTP response
 *
 * @example
 * ```typescript
 * const response = await client.get('/users');
 * console.log(response.data);
 * ```
 */
async get<T = any>(url: string, config?: RequestConfig): Promise<HttpResponse<T>> {
  return this.request<T>({ ...config, url, method: 'GET' });
}
```

## 📤 Submitting Changes

### Before Submitting

1. **Run tests**
   ```bash
   npm test
   ```

2. **Check type errors**
   ```bash
   npm run typecheck
   ```

3. **Run linter**
   ```bash
   npm run lint
   ```

4. **Format code**
   ```bash
   npm run format
   ```

5. **Update documentation**
   - Update README if needed
   - Add/update JSDoc comments
   - Update CHANGELOG.md

### Creating a Pull Request

1. **Push your branch**
   ```bash
   git push origin feature/my-feature
   ```

2. **Create PR on GitHub**
   - Go to your fork on GitHub
   - Click "Pull Request"
   - Fill in the template

3. **PR Description Should Include:**
   - What changes were made
   - Why the changes are needed
   - How to test the changes
   - Screenshots (if applicable)
   - Related issues

**PR Template:**
```markdown
## Description
Brief description of changes

## Motivation
Why are these changes needed?

## Changes
- Change 1
- Change 2

## Testing
How to test these changes

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Code formatted
- [ ] All tests passing
```

### PR Review Process

1. Automated checks will run (tests, linting, type checking)
2. Maintainers will review your code
3. Address any feedback
4. Once approved, your PR will be merged

## 🔌 Creating Plugins

Plugins are a core feature of FetchMax. Here's how to create one:

### Plugin Structure

```typescript
import type { Plugin, PluginContext, HttpResponse } from '@fetchmax/core';

export interface MyPluginConfig {
  option1?: string;
  option2?: number;
}

export function myPlugin(config: MyPluginConfig = {}): Plugin {
  return {
    name: 'my-plugin',

    async onRequest(request, context) {
      // Modify request before sending
      return request;
    },

    async onResponse(response, request, context) {
      // Modify response after receiving
      return response;
    },

    async onError(error, request, context) {
      // Handle errors
      throw error;
    }
  };
}
```

### Plugin Hooks

**`onRequest(request, context)`**
- Called before request is sent
- Can modify request configuration
- Return modified request

**`onResponse(response, request, context)`**
- Called after successful response
- Can modify response data
- Return modified response

**`onError(error, request, context)`**
- Called when error occurs
- Can handle or transform errors
- Return response to recover, or throw error

### Plugin Context

The `context` object is shared across all plugin hooks for a single request:

```typescript
async onRequest(request, context) {
  context.startTime = Date.now();
  return request;
}

async onResponse(response, request, context) {
  const duration = Date.now() - context.startTime;
  console.log(`Request took ${duration}ms`);
  return response;
}
```

### Plugin Best Practices

1. **Use descriptive names**
   ```typescript
   name: 'retry' // Good
   name: 'plugin1' // Bad
   ```

2. **Provide TypeScript types**
   ```typescript
   export interface RetryConfig {
     maxRetries?: number;
   }
   ```

3. **Document configuration options**
   ```typescript
   /**
    * Retry plugin configuration
    */
   export interface RetryConfig {
     /** Maximum number of retries (default: 3) */
     maxRetries?: number;
   }
   ```

4. **Handle errors gracefully**
   ```typescript
   async onRequest(request, context) {
     try {
       // Plugin logic
     } catch (error) {
       console.error(`[${this.name}] Error:`, error);
       throw error;
     }
   }
   ```

5. **Test thoroughly**
   - Test with different configurations
   - Test error cases
   - Test with other plugins

### Example: Simple Logger Plugin

```typescript
import type { Plugin } from '@fetchmax/core';

export function simpleLoggerPlugin(): Plugin {
  return {
    name: 'simple-logger',

    async onRequest(request, context) {
      console.log(`→ ${request.method} ${request.url}`);
      context.startTime = Date.now();
      return request;
    },

    async onResponse(response, request, context) {
      const duration = Date.now() - (context.startTime || 0);
      console.log(`← ${response.status} (${duration}ms)`);
      return response;
    },

    async onError(error, request, context) {
      console.error(`✗ ${error.message}`);
      throw error;
    }
  };
}
```

## 🤔 Questions?

- Open an issue for bugs
- Start a discussion for questions
- Join our Discord for chat

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to FetchMax! 🎉
