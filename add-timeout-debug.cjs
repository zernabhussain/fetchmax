const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'packages/plugins/timeout/src/index.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Add console.log debugging to onError
content = content.replace(
  /async onError\(error: any, request: any, context: PluginContext\) \{\s+\/\/ Don't clear timeout here/,
  `async onError(error: any, request: any, context: PluginContext) {
      console.log('[TIMEOUT DEBUG] onError called');
      console.log('[TIMEOUT DEBUG] request.__timeoutFired:', request.__timeoutFired);
      console.log('[TIMEOUT DEBUG] request.__timeoutValue:', request.__timeoutValue);
      console.log('[TIMEOUT DEBUG] error:', error.constructor.name);

      // Don't clear timeout here`
);

fs.writeFileSync(filePath, content);
console.log('Added debug logging to timeout plugin!');
