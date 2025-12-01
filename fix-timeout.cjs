const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'packages/plugins/timeout/src/index.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Import AbortError
content = content.replace(
  "import { TimeoutError } from '@fetchmax/core';",
  "import { TimeoutError, AbortError } from '@fetchmax/core';"
);

// 2. Fix the abort error detection to be more robust
content = content.replace(
  /if \(error\.name === 'AbortError' && request\.__timeoutValue\) \{/,
  `// Check if error was caused by timeout-triggered abort
      // Be robust to different error representations
      const isAbortError =
        error instanceof AbortError ||
        error?.name === 'AbortError' ||
        error?.code === 'ABORT_ERROR';

      if (isAbortError && request.__timeoutValue) {`
);

fs.writeFileSync(filePath, content);
console.log('Timeout plugin fixed successfully!');
