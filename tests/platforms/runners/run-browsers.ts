import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

const BROWSERS = ['chromium', 'firefox', 'webkit'] as const;

interface TestResult {
  browser: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  error?: string;
}

async function runBrowserTests(): Promise<void> {
  console.log('==========================================');
  console.log('Browser Testing with Playwright');
  console.log('==========================================');

  const projectRoot = path.resolve(__dirname, '../../..');

  // Build first
  console.log('Building packages...');
  try {
    await execAsync('npm run build', { cwd: projectRoot });
  } catch (error) {
    console.error('Build failed!', error);
    process.exit(1);
  }

  const results: TestResult[] = [];

  for (const browser of BROWSERS) {
    console.log('');
    console.log('==========================================');
    console.log(`Testing in ${browser.toUpperCase()}`);
    console.log('==========================================');

    try {
      // Run Vitest with Playwright browser provider
      const { stdout, stderr } = await execAsync(
        `npx vitest run --config tests/platforms/configs/vitest.browser.config.ts --browser.name=${browser}`,
        {
          cwd: projectRoot,
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        }
      );

      console.log(stdout);
      if (stderr) console.error(stderr);

      results.push({
        browser: browser.toUpperCase(),
        status: 'PASSED',
      });
    } catch (error: any) {
      console.error(`${browser} tests failed:`, error.message);
      results.push({
        browser: browser.toUpperCase(),
        status: 'FAILED',
        error: error.message,
      });
    }
  }

  // Print summary
  console.log('');
  console.log('==========================================');
  console.log('Browser Testing Summary');
  console.log('==========================================');
  results.forEach((result) => {
    const icon = result.status === 'PASSED' ? '✓' : '✗';
    console.log(`${result.browser}: ${result.status} ${icon}`);
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
  });

  const failed = results.filter((r) => r.status === 'FAILED').length;
  process.exit(failed > 0 ? 1 : 0);
}

runBrowserTests().catch((error) => {
  console.error('Browser testing failed:', error);
  process.exit(1);
});
