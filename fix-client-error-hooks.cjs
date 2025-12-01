const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'packages/core/src/client.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Fix: pass requestConfig to runErrorHooks instead of finalConfig
// But first, we need to make sure requestConfig is defined in the catch block scope
// Change from:
//   try {
//     let requestConfig = await this.runRequestHooks(finalConfig, context);
// To:
//   let requestConfig = finalConfig; // Initialize so it's in scope for catch
//   try {
//     requestConfig = await this.runRequestHooks(finalConfig, context);

content = content.replace(
  /try \{\s+\/\/ Run onRequest hooks\s+let requestConfig = await this\.runRequestHooks\(finalConfig, context\);/,
  `// Initialize requestConfig so it's in scope for catch block
    let requestConfig = finalConfig;

    try {
      // Run onRequest hooks
      requestConfig = await this.runRequestHooks(finalConfig, context);`
);

// Now change runErrorHooks to use requestConfig instead of finalConfig
content = content.replace(
  /const result = await this\.runErrorHooks\(error, finalConfig, context\);/,
  'const result = await this.runErrorHooks(error, requestConfig, context);'
);

fs.writeFileSync(filePath, content);
console.log('Client error hooks fixed successfully!');
