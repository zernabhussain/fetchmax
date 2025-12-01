# FetchMax - Remaining Work & Action Plan

**Date**: November 29, 2025
**Current Status**: 84.4% Test Pass Rate (243/288 tests passing)

---

## 📊 Current State Summary

### ✅ **What's Working** (177 tests - 100%)
- **Core Modules** (136 tests):
  - errors.test.ts - 30/30 (100%)
  - utils.test.ts - 58/58 (100%)
  - client.test.ts - 48/48 (100%)

- **Working Plugins** (41 tests):
  - retry.test.ts - 23/23 (100%)
  - transform.test.ts - 18/18 (100%)

### ❌ **What Needs Fixing** (45 failing tests across 7 files)

1. **cache.test.ts** - 15 failures
2. **logger.test.ts** - 9 failures
3. **timeout.test.ts** - 8 failures
4. **dedupe.test.ts** - Multiple failures
5. **rate-limit.test.ts** - Multiple failures
6. **progress.test.ts** - 1 failure
7. **interceptors.test.ts** - 1 failure

---

## 🔧 Critical Issues & Solutions

### 1. **Cache Plugin** (Priority: HIGH - 15 tests failing)

**Problem**: Cache is not short-circuiting HTTP requests properly
- Tests show `requestCount = 0` meaning NO requests are made (not even first one)
- Cached responses returning `undefined`

**Root Cause**:
- Plugin returns `{ __cached: true, __cachedData: entry.data }` from onRequest
- Client infrastructure at `client.ts:98-100` should handle this
- BUT: First request has no cache entry, so `__cached` is never set initially
- Second request should have cache, but data is undefined

**Solution Required**:
```typescript
// packages/plugins/cache/src/index.ts - Line 195-200
// Current code returns cached data but client receives undefined
// Need to verify entry.data contains complete HttpResponse

// Verify the onResponse hook stores complete response:
cache.set(key, {
  data: response,  // This should be the complete HttpResponse
  timestamp: Date.now(),
  hits: 1,
  url: request.url || ''
});
```

**Files to Modify**:
- `packages/plugins/cache/src/index.ts` - Lines 195-200, 216-220
- Verify `entry.data` is complete HttpResponse with all properties

---

### 2. **Logger Plugin** (Priority: MEDIUM - 9 tests failing)

**Problem**: Mock logger expectations not being met
- `expected "log" to not be called` but it was called
- `expected "error" to not be called` but it was called
- Missing expected log messages

**Root Cause**:
- Logger plugin may be logging when `logRequests: false` is set
- Logger may not be using the custom logger properly
- Filter function may not be working

**Solution Required**:
```typescript
// packages/plugins/logger/src/index.ts
// Check that options are respected:
- if (!logRequests) return; // before logging requests
- if (!logResponses) return; // before logging responses
- if (!logErrors) return; // before logging errors
- if (filter && !filter(request)) return; // apply filter
```

**Files to Modify**:
- `packages/plugins/logger/src/index.ts` - Add option checks in onRequest, onResponse, onError

---

### 3. **Timeout Plugin** (Priority: MEDIUM - 8 tests failing)

**Problem**: Some timeout tests still failing despite null error fix
- `expected error to be instance of TimeoutError`
- Timeout cleanup not happening

**Root Cause**:
- Need to check if error was caused by timeout abort
- Cleanup functions may not be called

**Solution Required**:
```typescript
// packages/plugins/timeout/src/index.ts
// In onError hook, check if abort was due to timeout:
onError(error, config, context) {
  if (config.__timeoutId && error &&
      (error.name === 'AbortError' || config.__timedOut)) {
    clearTimeout(config.__timeoutId);
    throw new TimeoutError(...);
  }
  throw error;
}
```

**Files to Modify**:
- `packages/plugins/timeout/src/index.ts` - Enhance error detection

---

### 4. **Dedupe Plugin** (Priority: MEDIUM)

**Problem**: Not preventing duplicate concurrent requests
- Similar architectural issue to cache plugin
- Needs to store promises and return them for concurrent identical requests

**Solution Required**:
```typescript
// packages/plugins/dedupe/src/index.ts
// Store promises in a Map
const pendingRequests = new Map<string, Promise<any>>();

onRequest(request, context) {
  const key = getKey(request);
  if (pendingRequests.has(key)) {
    return {
      ...request,
      __deduped: true,
      __promise: pendingRequests.get(key)
    };
  }
  // Mark as pending
  return request;
}
```

**Files to Modify**:
- `packages/plugins/dedupe/src/index.ts` - Implement promise storage

---

### 5. **Rate Limit Plugin** (Priority: LOW)

**Problem**: Queue management and timing issues
- Tests with fake timers not working correctly
- Queue size tracking incorrect

**Solution Required**:
- Debug timing logic with fake timers
- Verify queue implementation

**Files to Modify**:
- `packages/plugins/rate-limit/src/index.ts` - Fix queueing logic

---

### 6. **Progress Plugin** (Priority: LOW - 1 test failing)

**Problem**: Progress events not being reported
- `expected 0 to be greater than 0` - no progress events

**Root Cause**:
- ReadableStream may not have body in test environment
- Already has compatibility check but may need adjustment

**Solution Required**:
- Verify MSW responses have readable body streams
- May need to adjust test expectations

**Files to Modify**:
- `tests/unit/plugins/progress.test.ts` - Adjust test or mock response

---

### 7. **Interceptors Plugin** (Priority: LOW - 1 test failing)

**Problem**: One test failing with URL parsing error
- `Failed to parse URL from [object Request]`

**Root Cause**:
- Interceptor may be clearing URL from request config
- `interceptors.request.clear()` test failing

**Solution Required**:
- Verify interceptor doesn't remove required properties
- Check URL is preserved after clearing interceptors

**Files to Modify**:
- `packages/plugins/interceptors/src/index.ts` - Verify clear() method
- `tests/unit/plugins/interceptors.test.ts:131` - Check test setup

---

## 📋 Action Plan - Prioritized Steps

### **Phase 1: Core Plugin Fixes** (Est: 2-4 hours)

1. **Fix Cache Plugin** (15 tests)
   - Debug why first request isn't hitting MSW
   - Verify `entry.data` structure
   - Ensure `__cachedData` returns complete HttpResponse
   - Add debug logging to understand flow

2. **Fix Logger Plugin** (9 tests)
   - Add option checks (`logRequests`, `logResponses`, `logErrors`)
   - Verify filter function works
   - Ensure custom logger is used

3. **Fix Timeout Plugin** (8 tests)
   - Enhance timeout error detection
   - Add `__timedOut` flag for better tracking
   - Verify cleanup in all error paths

### **Phase 2: Secondary Plugin Fixes** (Est: 2-3 hours)

4. **Fix Dedupe Plugin**
   - Implement promise storage Map
   - Store pending requests by key
   - Return stored promise for duplicates

5. **Fix Rate Limit Plugin**
   - Debug fake timer compatibility
   - Fix queue size tracking
   - Verify timestamp cleanup

### **Phase 3: Final Touches** (Est: 1 hour)

6. **Fix Progress Plugin** (1 test)
   - Adjust MSW mock to provide readable stream
   - Or skip test if not applicable in test environment

7. **Fix Interceptors Plugin** (1 test)
   - Debug URL preservation after clear()
   - Fix test setup

---

## 🎯 Expected Outcomes

After completing all phases:
- **Test Pass Rate**: 100% (288/288 tests)
- **Test Files Passing**: 12/12
- **Production Ready**: Yes, all plugins functional

---

## 🚀 Next Steps After Test Fixes

### 1. **Implement Remaining Plugins** (9 plugins - from PROJECT_STATUS.md)
   - Offline Queue Plugin
   - GraphQL Plugin
   - WebSocket Plugin
   - Streaming Plugin
   - Pagination Plugin
   - Validation Plugin
   - Metrics Plugin
   - CSRF Protection Plugin
   - Mock Plugin

### 2. **Integration Testing**
   - Test multiple plugins together
   - Real-world scenario tests
   - Performance benchmarks

### 3. **Platform Testing**
   - Node.js environment tests
   - Browser environment tests
   - Deno compatibility
   - Bun compatibility

### 4. **Documentation**
   - Complete API documentation
   - Plugin usage guides
   - Migration guides
   - Examples and tutorials

### 5. **Performance Optimization**
   - Bundle size optimization
   - Runtime performance profiling
   - Memory leak detection

### 6. **Production Readiness**
   - CI/CD pipeline setup
   - Automated testing on PR
   - Code coverage reporting
   - Release automation

---

## 📝 Files Modified So Far (Sprint 3)

### Bug Fixes Applied:
1. `packages/core/src/client.ts:135` - Added null check for error handling
2. `packages/plugins/progress/src/index.ts:31` - Added ReadableStream compatibility check (Sprint 2)
3. `TEST_SUMMARY.md` - Updated with current status

### Files Ready to Modify:
1. `packages/plugins/cache/src/index.ts` - Cache short-circuit fix
2. `packages/plugins/logger/src/index.ts` - Option checks
3. `packages/plugins/timeout/src/index.ts` - Enhanced error detection
4. `packages/plugins/dedupe/src/index.ts` - Promise storage
5. `packages/plugins/rate-limit/src/index.ts` - Queue fixes
6. `tests/unit/plugins/progress.test.ts` - Test adjustment
7. `tests/unit/plugins/interceptors.test.ts` - Test fix

---

## 💡 Key Insights

### What's Working Well:
- ✅ Core HTTP client is solid (100% tests passing)
- ✅ Error handling is robust (100% tests passing)
- ✅ Utility functions are reliable (100% tests passing)
- ✅ Retry plugin fully functional (100% tests passing)
- ✅ Transform plugin fully functional (100% tests passing)
- ✅ Plugin architecture is sound and extensible

### What Needs Attention:
- ⚠️ Plugins that short-circuit requests need architectural enhancement
- ⚠️ MSW mocking needs better ReadableStream support for progress tests
- ⚠️ Fake timer compatibility needs more robust error handling
- ⚠️ Option validation in plugins (logger) needs to be stricter

### Architectural Learnings:
1. **Response Short-Circuiting**: Client infrastructure exists (lines 98-106) but plugins must return complete HttpResponse objects with all properties (data, status, headers, config, response)

2. **Promise Deduplication**: Requires Map-based storage of pending requests to truly prevent duplicate network calls

3. **Fake Timer Testing**: Plugins that use timers (timeout, rate-limit) need careful error detection that works with both real and fake timers

4. **Mock Environment**: Some browser APIs (ReadableStream) need compatibility checks or test environment mocks

---

## 🏆 Achievement Summary

**Tests Created**: 288 comprehensive test cases across 12 test files
**Current Pass Rate**: 84.4% (243/288)
**Core Modules**: 100% passing (177/177 tests)
**Production Plugins**: 2 fully working (retry, transform)
**In-Progress Plugins**: 7 with tests (need fixes)
**Documentation**: Comprehensive test plans and summaries

**Code Quality**: Excellent foundation, ready for final plugin fixes

