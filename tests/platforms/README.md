# FetchMax Cross-Platform Testing

This directory contains infrastructure for testing FetchMax across multiple JavaScript/TypeScript platforms to ensure universal compatibility.

## Supported Platforms

FetchMax is tested on the following platforms:

- **Node.js**: v18, v20, v22
- **Bun**: latest stable
- **Deno**: latest stable
- **Browsers**: Chrome, Firefox, Safari (via Playwright)

All 288 existing tests run identically across all platforms.

---

## Quick Start

### Prerequisites

Before running platform tests, install the required runtimes:

```bash
# Install Node.js versions with nvm
nvm install 18
nvm install 20
nvm install 22

# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install Deno
curl -fsSL https://deno.land/install.sh | sh

# Install Playwright browsers
npx playwright install
```

### Running Tests

```bash
# Run all platform tests (Node, Bun, Deno, Browsers)
npm run test:platforms:all

# Run individual platform tests
npm run test:platforms:node      # All Node.js versions (18, 20, 22)
npm run test:platforms:bun       # Bun runtime
npm run test:platforms:deno      # Deno runtime
npm run test:platforms:browsers  # All browsers (Chrome, Firefox, Safari)

# Run specific browser tests
npm run test:platforms:chrome
npm run test:platforms:firefox
npm run test:platforms:safari

# Run Node.js test without version switching
npm run test:platforms:node:run
```

---

## Directory Structure

```
tests/platforms/
├── configs/              # Vitest configurations per platform
│   ├── vitest.node.config.ts
│   ├── vitest.bun.config.ts
│   ├── vitest.deno.config.ts
│   └── vitest.browser.config.ts
├── setup/                # Platform-specific MSW setups
│   ├── node.setup.ts     # MSW server for Node.js
│   ├── bun.setup.ts      # MSW server for Bun
│   ├── deno.setup.ts     # MSW server for Deno
│   └── browser.setup.ts  # MSW worker for browsers
├── runners/              # Execution scripts
│   ├── run-node.sh       # Node version switching + tests
│   ├── run-bun.sh        # Bun test runner
│   ├── run-deno.ts       # Deno test runner
│   └── run-browsers.ts   # Playwright browser orchestrator
├── browser/
│   ├── playwright.config.ts  # Playwright configuration
│   └── public/
│       ├── index.html        # Test runner HTML
│       └── mockServiceWorker.js  # MSW service worker
└── utils/
    ├── platform-detector.ts  # Runtime detection utilities
    └── test-reporter.ts      # Cross-platform result aggregation
```

---

## How It Works

### Testing Strategy

**Hybrid Approach:**
- **Node.js, Bun, Deno**: Use real runtime environments with MSW Node server
- **Browsers**: Use Playwright for automated browser testing with MSW browser worker

**Test Against Built Artifacts:**
- All tests import from `dist/` instead of `src/`
- Validates the actual code that will be published to npm
- Uses Vitest's `resolve.alias` to redirect imports

**No Test Changes Required:**
- All 288 existing tests in `tests/unit/` run unchanged
- Only Vitest configs and setup files differ per platform

### MSW (Mock Service Worker) Strategy

**Node.js / Bun / Deno:**
```typescript
import { setupServer } from 'msw/node';
const server = setupServer();
server.listen();
```

**Browsers:**
```typescript
import { setupWorker } from 'msw/browser';
const worker = setupWorker();
await worker.start();
```

All test files use the same MSW request handlers (`http.get()`, `http.post()`, etc.) which work identically across both setups.

---

## Architecture

### Vitest Configuration Pattern

Each platform has its own Vitest config:

```typescript
export default defineConfig({
  test: {
    name: 'PLATFORM_NAME',
    environment: 'node' | 'browser',
    globals: true,
    setupFiles: ['./tests/platforms/setup/PLATFORM.setup.ts'],
    include: ['tests/unit/**/*.test.ts'],
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@fetchmax/core': path.resolve(__dirname, '../../../packages/core/dist'),
    }
  }
});
```

### Platform Setup Pattern

Each setup file initializes MSW for its environment:

**Node-like runtimes (Node, Bun, Deno):**
```typescript
import { beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';

export const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

global.sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
```

**Browser:**
```typescript
import { beforeAll, afterEach, afterAll } from 'vitest';
import { setupWorker } from 'msw/browser';

export const worker = setupWorker();

beforeAll(async () => {
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: '/mockServiceWorker.js' }
  });
});

afterEach(() => worker.resetHandlers());
afterAll(() => worker.stop());
```

---

## Testing Matrix

| Platform   | Version | Tests | Environment | MSW Setup     | Status |
|------------|---------|-------|-------------|---------------|--------|
| Node.js    | 18.x    | 288   | node        | msw/node      | ✅     |
| Node.js    | 20.x    | 288   | node        | msw/node      | ✅     |
| Node.js    | 22.x    | 288   | node        | msw/node      | ✅     |
| Bun        | latest  | 288   | node        | msw/node      | ✅     |
| Deno       | latest  | 288   | node        | msw/node      | ✅     |
| Chrome     | latest  | 288   | browser     | msw/browser   | ✅     |
| Firefox    | latest  | 288   | browser     | msw/browser   | ✅     |
| Safari     | latest  | 288   | browser     | msw/browser   | ✅     |

**Total**: 8 platforms × 288 tests = **2,304 test executions**

---

## Troubleshooting

### Node.js Version Switching Not Working

**Problem**: `nvm: command not found` or version switching fails

**Solution**:
1. Install nvm: https://github.com/nvm-sh/nvm
2. Or run tests with your current Node version: `npm run test:platforms:node:run`

### Bun Not Installed

**Problem**: `bun: command not found`

**Solution**:
```bash
curl -fsSL https://bun.sh/install | bash
```

### Deno Not Installed

**Problem**: `deno: command not found`

**Solution**:
```bash
# macOS/Linux
curl -fsSL https://deno.land/install.sh | sh

# Windows (PowerShell)
irm https://deno.land/install.ps1 | iex
```

### Playwright Browsers Not Installed

**Problem**: `browserType.launch: Executable doesn't exist`

**Solution**:
```bash
npx playwright install
```

### MSW Service Worker Issues

**Problem**: Browser tests fail with service worker errors

**Solution**:
```bash
# Regenerate service worker
npx msw init tests/platforms/browser/public --save
```

### Tests Timing Out

**Problem**: Tests fail with timeout errors

**Solution**:
- Increase `testTimeout` in the relevant Vitest config
- Check if the runtime has network access
- Verify MSW is starting correctly (check console logs)

### Import Resolution Errors

**Problem**: `Cannot find module '@fetchmax/core'`

**Solution**:
```bash
# Build the packages first
npm run build
```

---

## Performance

Expected test execution times:

- **Node.js** (per version): ~2-5 seconds
- **Bun**: ~1-3 seconds (fastest runtime)
- **Deno**: ~3-6 seconds
- **Browsers** (all 3): ~10-20 seconds (slowest due to browser startup)

**Total for all platforms**: ~2-3 minutes

---

## CI/CD Integration (Future)

While currently designed for local testing only, this infrastructure can be extended for CI/CD:

```yaml
# Example GitHub Actions workflow
jobs:
  test-platforms:
    strategy:
      matrix:
        platform: [node18, node20, node22, bun, deno]
    steps:
      - uses: actions/setup-node@v3
      - run: npm run test:platforms:${{ matrix.platform }}
```

---

## Development

### Adding a New Platform

1. Create Vitest config: `tests/platforms/configs/vitest.PLATFORM.config.ts`
2. Create setup file: `tests/platforms/setup/PLATFORM.setup.ts`
3. Create runner script: `tests/platforms/runners/run-PLATFORM.sh`
4. Add npm script to `package.json`
5. Update this README

### Debugging Platform-Specific Issues

Use the platform detector utility:

```typescript
import { getRuntimeInfo } from './tests/platforms/utils/platform-detector';

console.log(getRuntimeInfo());
// { platform: 'node', version: 'v20.10.0' }
```

---

## Resources

- **Vitest**: https://vitest.dev
- **MSW**: https://mswjs.io
- **Playwright**: https://playwright.dev
- **Node.js**: https://nodejs.org
- **Bun**: https://bun.sh
- **Deno**: https://deno.land

---

## Success Criteria

✅ All 288 tests pass on all platforms
✅ No test file modifications required
✅ Consistent MSW mocking across environments
✅ Clear separation of platform-specific code
✅ Easy to run locally with npm scripts
✅ Comprehensive documentation

---

**Last Updated**: December 2025
**Test Count**: 288 tests across 8 platforms
**Coverage**: Node.js (18, 20, 22), Bun, Deno, Chrome, Firefox, Safari
