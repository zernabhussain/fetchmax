const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'tests/unit/plugins/timeout.test.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Replace all instances of vi.advanceTimersByTime with await vi.advanceTimersByTimeAsync
// This is needed to properly handle async operations with fake timers
content = content.replace(/vi\.advanceTimersByTime\(/g, 'await vi.advanceTimersByTimeAsync(');

// Also need to make sure the test functions that use it are async
// (they already are based on the test code I saw)

fs.writeFileSync(filePath, content);
console.log('Timeout tests fixed successfully!');
