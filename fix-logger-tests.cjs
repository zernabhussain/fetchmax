const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'tests/unit/plugins/logger.test.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Replace all instances of mockLogger with vi.fn() for group/groupEnd
// to make them actually capture logs
content = content.replace(
  /const mockLogger = \{\s+log: \(\.\.\.args: any\[\]\) => logs\.push\(args\.join\(' '\)\),\s+error: vi\.fn\(\),\s+group: vi\.fn\(\),\s+groupEnd: vi\.fn\(\)\s+\};/g,
  `const mockLogger = {
        log: (...args: any[]) => logs.push(args.join(' ')),
        error: vi.fn(),
        group: (...args: any[]) => logs.push(args.join(' ')),
        groupEnd: () => {}
      };`
);

// Also fix the ones that capture errors
content = content.replace(
  /const mockLogger = \{\s+log: vi\.fn\(\),\s+error: \(\.\.\.args: any\[\]\) => errors\.push\(args\.join\(' '\)\),\s+group: vi\.fn\(\),\s+groupEnd: vi\.fn\(\)\s+\};/g,
  `const mockLogger = {
        log: vi.fn(),
        error: (...args: any[]) => errors.push(args.join(' ')),
        group: (...args: any[]) => errors.push(args.join(' ')),
        groupEnd: () => {}
      };`
);

fs.writeFileSync(filePath, content);
console.log('Logger tests fixed successfully!');
