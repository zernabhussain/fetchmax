# GitHub Actions CI/CD

This directory contains GitHub Actions workflows for continuous integration and deployment.

## Workflows

### 1. CI Pipeline (`workflows/ci.yml`)

**Purpose:** Comprehensive testing across multiple platforms and Node.js versions

**Triggers:**
- Push to `main` branch
- Pull requests to `main` branch

**Jobs:**

#### Test Job
- **Matrix Strategy:**
  - Operating Systems: Ubuntu, Windows, macOS
  - Node.js Versions: 18, 20, 22
  - Total combinations: 9 test runs

- **Steps:**
  1. Checkout code
  2. Setup Node.js with npm cache
  3. Install dependencies with `npm ci`
  4. Run linting (`npm run lint`)
  5. Run type checking (`npm run typecheck`)
  6. Build the project (`npm run build`)
  7. Run unit and integration tests (`npm test -- --run`)
  8. Install Playwright browsers (Ubuntu + Node 20 only)
  9. Run E2E tests (`npm run test:e2e`) (Ubuntu + Node 20 only)
  10. Upload test results as artifacts on failure

#### Coverage Job
- Runs separately on Ubuntu with Node.js 20
- Generates code coverage report
- Uploads coverage to Codecov
- Requires `CODECOV_TOKEN` secret

#### Status Check Job
- Waits for test and coverage jobs
- Verifies all checks passed
- Fails the workflow if any job failed

**Features:**
- Dependency caching for faster builds
- Parallel test execution across platforms
- Test result artifacts on failure
- Code coverage tracking

---

### 2. Quick PR Check (`workflows/pr-check.yml`)

**Purpose:** Fast feedback for pull request authors

**Triggers:**
- Pull requests to `main` branch

**Jobs:**

#### Quick Check
- Runs on Ubuntu with Node.js 20
- Fast single-platform validation

- **Steps:**
  1. Checkout code
  2. Setup Node.js with cache
  3. Install dependencies
  4. Lint code
  5. Type check
  6. Build project
  7. Run all tests
  8. Comment on PR with status

**Features:**
- Faster than full CI matrix
- Provides immediate feedback
- Automatic PR comments with results

---

## Configuration

### Required Secrets

To enable all features, configure these secrets in repository settings:

1. **CODECOV_TOKEN** (optional)
   - For uploading code coverage to Codecov
   - Get token from https://codecov.io/
   - Settings → Secrets and variables → Actions → New repository secret

### Branch Protection

Recommended branch protection rules for `main`:

1. Require status checks to pass before merging:
   - ✅ Test on ubuntu-latest with Node 18
   - ✅ Test on ubuntu-latest with Node 20
   - ✅ Test on ubuntu-latest with Node 22
   - ✅ Test on windows-latest with Node 20
   - ✅ Test on macos-latest with Node 20
   - ✅ Code Coverage
   - ✅ Status Check

2. Require pull request reviews before merging
3. Dismiss stale pull request approvals when new commits are pushed
4. Require linear history (optional)

---

## Local Testing

Run the same checks locally before pushing:

```bash
# Run all checks (mimics CI)
npm run lint && \
npm run typecheck && \
npm run build && \
npm test -- --run

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run platform-specific tests
npm run test:platforms:node
```

---

## Troubleshooting

### Test Failures

If tests fail in CI but pass locally:

1. **Check Node.js version:**
   ```bash
   node --version  # Should match CI version (18, 20, or 22)
   ```

2. **Use `npm ci` instead of `npm install`:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm ci
   ```

3. **Check for platform-specific issues:**
   - Windows: Path separators, line endings
   - macOS: Case-sensitive file systems
   - Ubuntu: Different file system permissions

### E2E Test Failures

If Playwright E2E tests fail:

1. **Install browsers locally:**
   ```bash
   npx playwright install --with-deps
   ```

2. **Run in debug mode:**
   ```bash
   npm run test:e2e:debug
   ```

3. **Check browser compatibility:**
   - E2E tests run on Chromium, Firefox, and WebKit
   - Ensure tests work in all browsers

### Coverage Upload Failures

If Codecov upload fails:

1. Check `CODECOV_TOKEN` secret is set
2. Verify coverage files are generated: `./coverage/coverage-final.json`
3. Check Codecov service status: https://status.codecov.io/

---

## Monitoring

### Viewing Workflow Runs

1. Go to repository → Actions tab
2. Select workflow (CI or PR Quick Check)
3. View individual run details
4. Download artifacts (test results, logs)

### Status Badges

Add CI status badge to README:

```markdown
[![CI](https://github.com/fetchmax/fetchmax/actions/workflows/ci.yml/badge.svg)](https://github.com/fetchmax/fetchmax/actions/workflows/ci.yml)
```

---

## Maintenance

### Updating Dependencies

When updating GitHub Actions versions:

1. Check for breaking changes in action documentation
2. Update all action versions consistently
3. Test locally if possible
4. Monitor first CI run after update

### Modifying Test Matrix

To add/remove platforms or Node.js versions:

Edit `ci.yml`:

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest, macos-latest]
    node: [18, 20, 22]  # Add/remove versions here
```

---

## Performance

### Caching Strategy

The workflows use npm caching to speed up builds:

```yaml
- uses: actions/setup-node@v4
  with:
    cache: 'npm'  # Caches ~/.npm
```

**Average CI times:**
- Quick PR Check: ~3-5 minutes
- Full CI Matrix: ~10-15 minutes (parallel)
- Coverage Job: ~4-6 minutes

### Optimization Tips

1. Use `npm ci` instead of `npm install` (faster, deterministic)
2. Cache dependencies between runs
3. Run expensive tests (E2E) only on one platform
4. Use `fail-fast: false` to see all failures
5. Run jobs in parallel when possible

---

## Best Practices

1. **Always run tests locally before pushing**
2. **Keep CI fast** - developers wait for results
3. **Test on multiple platforms** - catch OS-specific bugs early
4. **Use appropriate Node.js versions** - test on min, current, and latest
5. **Monitor CI health** - fix flaky tests immediately
6. **Keep actions up to date** - security and features
7. **Use secrets for sensitive data** - never commit tokens

---

## Support

For CI/CD issues:

1. Check [GitHub Actions documentation](https://docs.github.com/en/actions)
2. View workflow run logs in Actions tab
3. Open issue in repository
4. Contact maintainers

---

**Last Updated:** 2025-12-11
