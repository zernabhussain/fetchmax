export interface TestRunResult {
  platform: string;
  version: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
}

export class CrossPlatformReporter {
  private results: TestRunResult[] = [];

  addResult(result: TestRunResult): void {
    this.results.push(result);
  }

  printSummary(): void {
    console.log('\n');
    console.log('='.repeat(60));
    console.log('CROSS-PLATFORM TEST SUMMARY');
    console.log('='.repeat(60));
    console.log('\n');

    this.results.forEach((result) => {
      const status = result.failed === 0 ? '✓ PASSED' : '✗ FAILED';
      const color = result.failed === 0 ? '\x1b[32m' : '\x1b[31m';
      const reset = '\x1b[0m';

      console.log(`${color}${status}${reset} ${result.platform} (${result.version})`);
      console.log(`  Total: ${result.totalTests} | Passed: ${result.passed} | Failed: ${result.failed} | Skipped: ${result.skipped}`);
      console.log(`  Duration: ${(result.duration / 1000).toFixed(2)}s`);
      console.log('');
    });

    const totalTests = this.results.reduce((sum, r) => sum + r.totalTests, 0);
    const totalPassed = this.results.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = this.results.reduce((sum, r) => sum + r.failed, 0);
    const platformsPassed = this.results.filter((r) => r.failed === 0).length;
    const platformsTotal = this.results.length;

    console.log('='.repeat(60));
    console.log(`Platforms: ${platformsPassed}/${platformsTotal} passed`);
    console.log(`Tests: ${totalPassed}/${totalTests} passed, ${totalFailed} failed`);
    console.log('='.repeat(60));
  }

  hasFailures(): boolean {
    return this.results.some((r) => r.failed > 0);
  }
}
