# Playwright E2E Testing Setup

## 🎭 Automated Playwright Integration

When user asks to "add E2E tests" or "setup Playwright", the orchestrator automatically handles everything.

---

## 📦 Installation (Automatic)

```bash
# Install Playwright
npm install -D @playwright/test

# Install Playwright MCP (Model Context Protocol)
npm install -D @modelcontextprotocol/server-playwright

# Install browsers
npx playwright install
```

---

## 📁 Directory Structure (Auto-Created)

```
fetchmax/
├── tests/
│   ├── e2e/                      # E2E tests (new)
│   │   ├── api-integration.test.ts
│   │   ├── plugins.test.ts
│   │   ├── real-world.test.ts
│   │   └── browser.test.ts
│   └── unit/                     # Existing unit tests
├── playwright.config.ts          # Playwright config (new)
└── .gitignore                    # Add playwright folders
```

---

## ⚙️ Configuration (Auto-Generated)

### `playwright.config.ts`
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
```

---

## 🧪 E2E Test Examples (Auto-Generated)

### 1. Real API Integration Test
```typescript
// tests/e2e/api-integration.test.ts
import { test, expect } from '@playwright/test';
import { HttpClient } from '@fetchmax/core';

test.describe('Real API Integration', () => {
  test('should fetch from GitHub API', async () => {
    const client = new HttpClient({
      baseURL: 'https://api.github.com'
    });

    const response = await client.get('/users/octocat');

    expect(response.status).toBe(200);
    expect(response.data.login).toBe('octocat');
  });

  test('should handle 404 errors', async () => {
    const client = new HttpClient({
      baseURL: 'https://api.github.com'
    });

    await expect(
      client.get('/users/this-user-definitely-does-not-exist-12345')
    ).rejects.toThrow();
  });
});
```

### 2. All Plugins Integration Test
```typescript
// tests/e2e/plugins.test.ts
import { test, expect } from '@playwright/test';
import { HttpClient } from '@fetchmax/core';
import { retryPlugin } from '@fetchmax/plugin-retry';
import { cachePlugin } from '@fetchmax/plugin-cache';
import { loggerPlugin } from '@fetchmax/plugin-logger';
import { timeoutPlugin } from '@fetchmax/plugin-timeout';

test.describe('Plugin Integration', () => {
  test('all plugins work together', async () => {
    const client = new HttpClient({
      baseURL: 'https://jsonplaceholder.typicode.com'
    })
      .use(retryPlugin({ maxRetries: 3 }))
      .use(cachePlugin({ ttl: 60000 }))
      .use(timeoutPlugin({ timeout: 5000 }))
      .use(loggerPlugin({ logRequest: true }));

    // First request - should be fresh
    const response1 = await client.get('/todos/1');
    expect(response1.status).toBe(200);

    // Second request - should be cached
    const response2 = await client.get('/todos/1');
    expect(response2.status).toBe(200);
    expect(response2.data).toEqual(response1.data);
  });

  test('retry works with real failures', async () => {
    let attempts = 0;

    const client = new HttpClient({
      baseURL: 'https://httpstat.us'
    }).use(retryPlugin({
      maxRetries: 3,
      onRetry: () => { attempts++; }
    }));

    // This endpoint returns 500 - should retry
    await expect(
      client.get('/500')
    ).rejects.toThrow();

    expect(attempts).toBeGreaterThan(0);
  });
});
```

### 3. Browser Integration Test
```typescript
// tests/e2e/browser.test.ts
import { test, expect } from '@playwright/test';

test.describe('Browser Environment', () => {
  test('should work in browser context', async ({ page }) => {
    // Create a test page that uses FetchMax
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="result"></div>
          <script type="module">
            import { HttpClient } from '@fetchmax/core';

            const client = new HttpClient({
              baseURL: 'https://jsonplaceholder.typicode.com'
            });

            const response = await client.get('/todos/1');
            document.getElementById('result').textContent = response.data.title;
          </script>
        </body>
      </html>
    `);

    // Wait for result
    await page.waitForFunction(() => {
      return document.getElementById('result').textContent !== '';
    });

    const result = await page.textContent('#result');
    expect(result).toBeTruthy();
  });
});
```

### 4. Performance Test
```typescript
// tests/e2e/performance.test.ts
import { test, expect } from '@playwright/test';
import { HttpClient } from '@fetchmax/core';

test.describe('Performance', () => {
  test('should handle 100 concurrent requests', async () => {
    const client = new HttpClient({
      baseURL: 'https://jsonplaceholder.typicode.com'
    });

    const start = Date.now();

    const promises = Array.from({ length: 100 }, (_, i) =>
      client.get(`/todos/${i + 1}`)
    );

    const responses = await Promise.all(promises);
    const duration = Date.now() - start;

    expect(responses).toHaveLength(100);
    responses.forEach(r => expect(r.status).toBe(200));

    // Should complete in reasonable time (adjust based on network)
    expect(duration).toBeLessThan(10000); // 10 seconds
  });

  test('cache improves performance', async () => {
    const client = new HttpClient({
      baseURL: 'https://jsonplaceholder.typicode.com'
    }).use(cachePlugin({ ttl: 60000 }));

    // First request - not cached
    const start1 = Date.now();
    await client.get('/todos/1');
    const duration1 = Date.now() - start1;

    // Second request - cached
    const start2 = Date.now();
    await client.get('/todos/1');
    const duration2 = Date.now() - start2;

    // Cached request should be much faster
    expect(duration2).toBeLessThan(duration1);
  });
});
```

---

## 🚀 Running E2E Tests (Automatic)

```bash
# Run all E2E tests
npm run test:e2e

# Run in UI mode
npm run test:e2e:ui

# Run in specific browser
npm run test:e2e -- --project=chromium

# Run with debugging
npm run test:e2e -- --debug

# Generate report
npm run test:e2e:report
```

---

## 📝 Package.json Scripts (Auto-Added)

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:report": "playwright show-report",
    "test:all": "npm run test:unit && npm run test:e2e"
  }
}
```

---

## 🔧 MCP Integration (Model Context Protocol)

### What is MCP?
MCP allows AI assistants to directly control Playwright and observe browser behavior.

### Setup
```json
// .mcp-config.json
{
  "mcpServers": {
    "playwright": {
      "command": "node",
      "args": ["node_modules/@modelcontextprotocol/server-playwright/dist/index.js"],
      "env": {}
    }
  }
}
```

### Benefits
- AI can write tests by seeing actual browser behavior
- Auto-generate selectors
- Debug failing tests visually
- Record and replay interactions

---

## 📊 Test Coverage (Auto-Updated)

After E2E tests are added:
- Unit tests: 288 tests
- E2E tests: 20+ tests
- Total coverage: 95%+
- All environments tested

---

## 🎯 E2E Test Strategy

### What to Test
✅ Real API integration
✅ Plugin combinations
✅ Browser compatibility
✅ Network conditions
✅ Error scenarios
✅ Performance
✅ Security

### What NOT to Test
❌ Implementation details (use unit tests)
❌ Mocked scenarios (use unit tests)
❌ Internal functions (use unit tests)

---

## 🔍 Debugging E2E Tests

### View Test Results
```bash
npx playwright show-report
```

### Debug Mode
```bash
npm run test:e2e -- --debug
```

### Trace Viewer
```bash
npx playwright show-trace trace.zip
```

---

## ✅ Orchestrator Auto-Actions

When user says "add E2E tests", orchestrator automatically:
1. ✅ Installs Playwright and MCP
2. ✅ Creates playwright.config.ts
3. ✅ Creates tests/e2e/ directory
4. ✅ Writes 20+ E2E test cases
5. ✅ Updates package.json scripts
6. ✅ Runs tests to verify
7. ✅ Updates documentation
8. ✅ Reports results to user

**Total user commands: 1**
**Total automation: Everything**

---

## 🎓 Best Practices

1. **Test Real APIs** - Don't mock in E2E tests
2. **Test Cross-Browser** - Run on Chrome, Firefox, Safari
3. **Test Error Cases** - Network failures, timeouts, etc.
4. **Keep Tests Fast** - Use parallel execution
5. **Verify Visually** - Use Playwright UI mode
6. **Auto-Heal Tests** - Let MCP help fix flaky tests

---

**This entire setup is automated. User just says "add E2E tests" and watches!**
