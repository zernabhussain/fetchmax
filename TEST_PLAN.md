# FetchMax Comprehensive Test Plan

This document outlines all planned test cases for the FetchMax HTTP client library, organized by test type.

## Test Coverage Summary

### Current Status (as of 2025-11-28)

| Test Type | Status | Test Files | Test Count |
|-----------|--------|------------|------------|
| Unit Tests | ✅ Implemented | 4 files | ~130 tests |
| Integration Tests | 📋 Planned | 0 files | 0 tests |
| E2E Tests | 📋 Planned | 0 files | 0 tests |
| Platform Tests | 📋 Planned | 0 files | 0 tests |

---

## 1. Unit Tests ✅

### 1.1 Core HttpClient (`tests/unit/client.test.ts`)
**Current: 62 tests**

#### Constructor & Factory
- [x] Create client with default config
- [x] Create client with custom config
- [x] Accept plugins in config
- [x] Create client using factory function
- [x] Create child client with merged config
- [x] Copy plugins to child instance

#### Plugin System
- [x] Add plugin using `use()` method
- [x] Warn on duplicate plugin names
- [x] Allow plugin chaining
- [x] Call onRequest hooks
- [x] Call onResponse hooks
- [x] Call onError hooks
- [x] Call multiple plugins in order
- [x] Share context between plugin hooks
- [x] Isolate context between requests

#### HTTP Methods
- [x] GET requests
- [x] POST requests with JSON body
- [x] PUT requests
- [x] DELETE requests
- [x] PATCH requests
- [x] HEAD requests
- [x] OPTIONS requests

#### Request Features
- [x] Send query parameters
- [x] Send custom headers
- [x] Use baseURL for relative URLs
- [x] Handle FormData body
- [x] Handle URLSearchParams body
- [x] Handle plain text body
- [x] Automatically set Content-Type for JSON

#### Response Handling
- [x] Parse JSON responses
- [x] Parse text responses
- [x] Parse blob responses
- [x] Parse arrayBuffer responses
- [x] Handle empty responses (204, Content-Length: 0)
- [x] Handle responses with responseType option

#### Error Handling
- [x] Throw RequestError for 4xx errors
- [x] Throw ServerError for 5xx errors
- [x] Throw NetworkError for network failures
- [x] Error contains status, statusText, data, config

#### Configuration
- [x] Merge headers from base config and request
- [x] Override base headers with request headers
- [x] Handle baseURL with trailing slashes
- [x] Handle URL with leading slashes
- [x] Ignore baseURL for absolute URLs

#### Edge Cases
- [x] Handle empty URL with baseURL
- [x] Handle empty query parameters
- [x] Handle null/undefined query parameters
- [x] Preserve existing query parameters in URL
- [x] Handle mixed slashes in baseURL/URL

#### Advanced Features
- [x] AbortController support
- [x] Request cancellation

### 1.2 Retry Plugin (`tests/unit/plugins/retry.test.ts`)
**Current: 28 tests**

#### Basic Functionality
- [x] Retry failed requests
- [x] Give up after max retries
- [x] Don't retry successful requests

#### Retry Conditions
- [x] Retry on 500 errors by default
- [x] Retry on 503 errors by default
- [x] Don't retry on 404 errors by default
- [x] Respect custom retryOn status codes
- [x] Use custom shouldRetry function

#### Backoff Strategies
- [x] Exponential backoff by default
- [x] Linear backoff when specified
- [x] Calculate correct delays for each attempt

#### HTTP Method Filtering
- [x] Retry GET requests by default
- [x] Don't retry POST requests by default
- [x] Respect custom methods configuration
- [x] Handle mixed HTTP methods

#### Callbacks
- [x] Call onRetry before each retry
- [x] Pass correct attempt number to onRetry
- [x] Pass error and delay to onRetry

#### Edge Cases
- [x] Handle maxRetries = 0
- [x] Handle very large maxRetries
- [x] Handle retryDelay = 0
- [x] Handle network errors
- [x] Handle timeout during retry
- [x] Preserve error data across retries

#### Context Management
- [x] Persist retry count in context
- [x] Reset context for new requests
- [x] Maintain context across retries

### 1.3 Utilities (`tests/unit/utils.test.ts`)
**Current: 32 tests**

#### buildURL
- [x] Return URL as-is when no baseURL or params
- [x] Concatenate baseURL and URL
- [x] Handle trailing slash in baseURL
- [x] Handle leading slash in URL
- [x] Handle multiple slashes
- [x] Append query parameters
- [x] Handle array parameters
- [x] Skip null/undefined parameters
- [x] Handle existing query parameters
- [x] Handle empty params object
- [x] Convert param values to strings

#### mergeConfig
- [x] Merge multiple configs
- [x] Merge headers separately
- [x] Override conflicting properties
- [x] Override conflicting headers
- [x] Handle undefined configs
- [x] Skip undefined values

#### isPlainObject
- [x] Return true for plain objects
- [x] Return false for non-plain objects
- [x] Return false for class instances

#### prepareBody
- [x] Return undefined for falsy body
- [x] Return string body as-is
- [x] Return FormData as-is
- [x] Return Blob as-is
- [x] Return ArrayBuffer as-is
- [x] Return URLSearchParams as-is
- [x] Stringify plain objects and set Content-Type
- [x] Not override existing Content-Type
- [x] Handle case-insensitive Content-Type

#### parseResponse
- [x] Return null for empty response (Content-Length: 0)
- [x] Parse JSON with responseType=json
- [x] Parse text with responseType=text
- [x] Parse blob with responseType=blob
- [x] Parse arrayBuffer with responseType=arrayBuffer
- [x] Return stream with responseType=stream
- [x] Auto-detect JSON from Content-Type
- [x] Handle empty JSON response
- [x] Auto-detect text from Content-Type
- [x] Auto-detect blob from Content-Type
- [x] Handle invalid JSON gracefully

#### deepClone
- [x] Clone primitive values
- [x] Clone plain objects
- [x] Clone arrays
- [x] Clone Date objects
- [x] Clone Set objects
- [x] Clone Map objects
- [x] Clone nested structures

#### Environment Detection
- [x] Detect browser environment
- [x] Detect Node.js environment

#### Helpers
- [x] Delay execution with correct timing

### 1.4 Errors (`tests/unit/errors.test.ts`)
**Current: 27 tests**

#### HttpError Base Class
- [x] Create basic HttpError
- [x] Store status and statusText
- [x] Store data and config
- [x] Store response object
- [x] Have proper stack trace

#### NetworkError
- [x] Create NetworkError with correct properties
- [x] Store config
- [x] Have undefined status
- [x] Have NETWORK_ERROR code

#### TimeoutError
- [x] Create TimeoutError with correct properties
- [x] Store config
- [x] Have undefined status
- [x] Have TIMEOUT_ERROR code

#### AbortError
- [x] Create AbortError with correct properties
- [x] Store config
- [x] Have undefined status
- [x] Have ABORT_ERROR code

#### RequestError (4xx)
- [x] Create RequestError for 4xx errors
- [x] Store all error properties
- [x] Have REQUEST_ERROR code
- [x] Handle different 4xx status codes (400, 401, 403, 404, 422, 429)

#### ServerError (5xx)
- [x] Create ServerError for 5xx errors
- [x] Store all error properties
- [x] Have SERVER_ERROR code
- [x] Handle different 5xx status codes (500, 502, 503, 504)

#### ParseError
- [x] Create ParseError with correct properties
- [x] Have PARSE_ERROR code
- [x] Have undefined status

#### createHttpError Factory
- [x] Create RequestError for 4xx status
- [x] Create ServerError for 5xx status
- [x] Create generic HttpError for other statuses
- [x] Include error message with status
- [x] Handle all 4xx status codes
- [x] Handle all common 5xx status codes
- [x] Preserve response object

#### Error Inheritance
- [x] Maintain proper inheritance chain
- [x] Be catchable as Error
- [x] Be distinguishable by instanceof

---

## 2. Integration Tests 📋

### 2.1 Plugin Interactions (`tests/integration/plugin-interactions.test.ts`)
**Planned**

#### Multiple Plugin Combinations
- [ ] Retry + Logger plugins working together
- [ ] Retry + Cache plugins interaction
- [ ] Retry + Auth plugins interaction
- [ ] Logger + Auth plugins interaction
- [ ] Cache + Validator plugins interaction
- [ ] Multiple plugins modifying same request
- [ ] Plugin execution order matters
- [ ] Plugin error propagation through chain

#### Real-World Plugin Scenarios
- [ ] Authentication token refresh with retry
- [ ] Caching with retry fallback
- [ ] Request/response logging with errors
- [ ] Metrics collection across retries
- [ ] Offline queue with retry logic

### 2.2 Complex Request Flows (`tests/integration/request-flows.test.ts`)
**Planned**

#### Authentication Flows
- [ ] Login → Get token → Make authenticated request
- [ ] Token expiry → Refresh → Retry original request
- [ ] 401 response → Re-authenticate → Retry
- [ ] Concurrent requests with shared auth state

#### Data Operations
- [ ] Create → Read → Update → Delete flow
- [ ] Pagination through multiple pages
- [ ] File upload with progress tracking
- [ ] Streaming large responses
- [ ] Batch operations

#### Error Recovery
- [ ] Network failure → Retry → Success
- [ ] 5xx error → Retry with backoff → Success
- [ ] Timeout → Retry with longer timeout
- [ ] Partial failure in batch operations

### 2.3 Client Lifecycle (`tests/integration/client-lifecycle.test.ts`)
**Planned**

#### Client Creation and Configuration
- [ ] Create parent client with base config
- [ ] Create multiple child clients with different configs
- [ ] Share plugins across client instances
- [ ] Modify child config without affecting parent

#### Instance Management
- [ ] Multiple clients with different base URLs
- [ ] Client instance cleanup
- [ ] Memory leak prevention with many clients
- [ ] Concurrent requests across clients

---

## 3. End-to-End Tests 📋

### 3.1 Real API Integration (`tests/e2e/real-api.test.ts`)
**Planned**

#### Public API Testing
- [ ] JSONPlaceholder API - GET posts
- [ ] JSONPlaceholder API - POST new post
- [ ] JSONPlaceholder API - PUT update post
- [ ] JSONPlaceholder API - DELETE post
- [ ] GitHub API - GET user info
- [ ] GitHub API - GET repositories
- [ ] Handle rate limiting
- [ ] Handle pagination

#### Response Format Handling
- [ ] JSON API responses
- [ ] XML API responses
- [ ] HTML responses
- [ ] Binary file downloads
- [ ] Streaming responses
- [ ] Empty responses

### 3.2 Error Scenarios (`tests/e2e/error-scenarios.test.ts`)
**Planned**

#### Network Errors
- [ ] DNS resolution failure
- [ ] Connection refused
- [ ] Connection timeout
- [ ] SSL/TLS errors
- [ ] Network disconnection during request

#### HTTP Errors
- [ ] 400 Bad Request
- [ ] 401 Unauthorized
- [ ] 403 Forbidden
- [ ] 404 Not Found
- [ ] 429 Too Many Requests
- [ ] 500 Internal Server Error
- [ ] 502 Bad Gateway
- [ ] 503 Service Unavailable
- [ ] 504 Gateway Timeout

#### Edge Cases
- [ ] Very large response bodies
- [ ] Very slow responses
- [ ] Malformed JSON responses
- [ ] Invalid Content-Type headers
- [ ] Redirect loops
- [ ] Mixed content (HTTP/HTTPS)

### 3.3 Performance Testing (`tests/e2e/performance.test.ts`)
**Planned**

#### Throughput
- [ ] Sequential requests performance
- [ ] Concurrent requests performance
- [ ] Batch request processing
- [ ] Connection pooling efficiency

#### Latency
- [ ] Request overhead measurement
- [ ] Plugin hook overhead
- [ ] Retry delay accuracy
- [ ] AbortController cancellation speed

#### Resource Usage
- [ ] Memory usage with many concurrent requests
- [ ] Memory leak detection
- [ ] CPU usage during heavy load
- [ ] Network bandwidth utilization

---

## 4. Platform-Specific Tests 📋

### 4.1 Node.js Environment (`tests/platforms/node.test.ts`)
**Planned**

#### Node.js Features
- [ ] HTTP/HTTPS native modules compatibility
- [ ] Node.js streams support
- [ ] File system integration
- [ ] Environment variables
- [ ] Process signals (SIGINT, SIGTERM)

#### Node.js Specific APIs
- [ ] Buffer handling
- [ ] Custom agents
- [ ] Proxy configuration
- [ ] Certificate validation
- [ ] Client certificates

#### Node.js Versions
- [ ] Node.js 16.x compatibility
- [ ] Node.js 18.x compatibility
- [ ] Node.js 20.x compatibility
- [ ] Node.js 22.x compatibility
- [ ] Latest LTS version

### 4.2 Browser Environment (`tests/platforms/browser.test.ts`)
**Planned**

#### Browser Features
- [ ] XMLHttpRequest fallback (legacy browsers)
- [ ] Fetch API usage
- [ ] CORS handling
- [ ] Cookies and credentials
- [ ] Local storage integration

#### Browser APIs
- [ ] FormData with file uploads
- [ ] Blob and File objects
- [ ] ReadableStream for responses
- [ ] Service Worker compatibility
- [ ] Web Workers compatibility

#### Browser Compatibility
- [ ] Chrome latest
- [ ] Firefox latest
- [ ] Safari latest
- [ ] Edge latest
- [ ] Mobile browsers (Chrome, Safari)

### 4.3 Bundlers & Build Tools (`tests/platforms/bundlers.test.ts`)
**Planned**

#### Webpack
- [ ] Webpack 5 bundling
- [ ] Tree shaking
- [ ] Code splitting
- [ ] Development mode
- [ ] Production mode optimization

#### Vite
- [ ] Vite bundling
- [ ] Hot module replacement
- [ ] Development server
- [ ] Production build

#### Other Bundlers
- [ ] Rollup bundling
- [ ] esbuild bundling
- [ ] Parcel bundling
- [ ] Browserify compatibility

### 4.4 TypeScript Support (`tests/platforms/typescript.test.ts`)
**Planned**

#### Type Safety
- [ ] Correct type inference for responses
- [ ] Generic type support
- [ ] Plugin type definitions
- [ ] Error type discrimination
- [ ] Config type validation

#### TypeScript Versions
- [ ] TypeScript 4.x compatibility
- [ ] TypeScript 5.x compatibility
- [ ] Strict mode compilation
- [ ] Type-only imports/exports

---

## 5. Plugin Tests (Future) 📋

### 5.1 Cache Plugin
- [ ] In-memory cache
- [ ] LocalStorage cache
- [ ] IndexedDB cache
- [ ] Cache invalidation
- [ ] Cache expiry
- [ ] Conditional requests (ETag, Last-Modified)

### 5.2 Offline Plugin
- [ ] Queue failed requests
- [ ] Replay on reconnection
- [ ] Request persistence
- [ ] Conflict resolution
- [ ] Optimistic updates

### 5.3 GraphQL Plugin
- [ ] GraphQL query execution
- [ ] GraphQL mutations
- [ ] GraphQL subscriptions
- [ ] Error handling
- [ ] Batching

### 5.4 Validation Plugin
- [ ] Request validation
- [ ] Response validation
- [ ] Schema validation
- [ ] Custom validators
- [ ] Error reporting

### 5.5 Metrics Plugin
- [ ] Request count tracking
- [ ] Response time tracking
- [ ] Error rate tracking
- [ ] Custom metrics
- [ ] Metrics export

### 5.6 Logger Plugin
- [ ] Request logging
- [ ] Response logging
- [ ] Error logging
- [ ] Custom formatters
- [ ] Log levels

### 5.7 CSRF Plugin
- [ ] CSRF token extraction
- [ ] CSRF token injection
- [ ] Token refresh
- [ ] Custom token sources

### 5.8 Mock Plugin
- [ ] Request mocking
- [ ] Response fixtures
- [ ] Delay simulation
- [ ] Error simulation
- [ ] Conditional mocking

### 5.9 Rate Limit Plugin
- [ ] Request throttling
- [ ] Rate limit detection
- [ ] Backoff strategies
- [ ] Queue management

### 5.10 WebSocket Plugin
- [ ] WebSocket connection
- [ ] Message sending
- [ ] Message receiving
- [ ] Reconnection logic
- [ ] Event handling

---

## 6. Test Utilities & Helpers 📋

### 6.1 Test Fixtures
- [ ] Mock server setup
- [ ] Test data generators
- [ ] Response fixtures
- [ ] Error fixtures

### 6.2 Test Helpers
- [ ] Custom matchers
- [ ] Assertion helpers
- [ ] Async test utilities
- [ ] Mock factories

---

## Test Execution Strategy

### Unit Tests
- Run on every commit
- Target: 95%+ code coverage
- Fast execution (<10 seconds)
- Isolated from network

### Integration Tests
- Run on pull requests
- Test plugin combinations
- Medium execution time (<1 minute)
- Use mock servers

### E2E Tests
- Run nightly or before releases
- Test against real APIs (with rate limiting)
- Slower execution (minutes)
- May require external services

### Platform Tests
- Run in CI/CD matrix
- Test on multiple Node versions
- Test on multiple browsers
- Test with different bundlers

---

## Coverage Goals

| Area | Target Coverage |
|------|----------------|
| Core HttpClient | 100% |
| Plugins | 95%+ |
| Utilities | 100% |
| Error Handling | 100% |
| Type Definitions | N/A (TypeScript compiler) |
| Overall | 95%+ |

---

## Test Quality Standards

1. **Test Naming**: Clear, descriptive test names using "should" convention
2. **Test Structure**: Arrange-Act-Assert pattern
3. **Test Isolation**: Each test should be independent
4. **Test Speed**: Unit tests should complete in milliseconds
5. **Test Clarity**: Tests should be easy to understand and maintain
6. **Test Coverage**: Aim for both code coverage and scenario coverage
7. **Test Documentation**: Complex tests should have comments explaining the scenario

---

## Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run e2e tests only
npm run test:e2e

# Run platform-specific tests
npm run test:platforms

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npm test -- tests/unit/client.test.ts

# Run tests matching pattern
npm test -- --grep "retry"
```

---

## Future Improvements

1. **Visual Regression Testing**: Screenshot testing for documentation
2. **Performance Benchmarks**: Automated performance regression detection
3. **Mutation Testing**: Use tools like Stryker to test test quality
4. **Fuzz Testing**: Random input testing for edge cases
5. **Contract Testing**: API contract verification
6. **Accessibility Testing**: Ensure error messages are accessible
7. **Security Testing**: Vulnerability scanning
8. **Load Testing**: High-concurrency scenarios

---

**Last Updated**: 2025-11-28
**Maintained By**: FetchMax Development Team
