const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'tests/unit/plugins/logger.test.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Fix the redirect mock to use an absolute URL instead of relative
content = content.replace(
  "{ status: 301, headers: { Location: '/' } }",
  "{ status: 301, headers: { Location: 'https://api.test.com/success' } }"
);

fs.writeFileSync(filePath, content);
console.log('Logger color test fixed successfully!');
