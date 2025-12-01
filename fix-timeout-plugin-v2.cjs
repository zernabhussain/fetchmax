const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'packages/plugins/timeout/src/index.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Replace the onError logic to check for timeout regardless of error type
// The key insight: if the timeout fired and cleared __timeoutValue to a flag,
// we should throw TimeoutError regardless of what error MSW threw
content = content.replace(
  /async onError\(error: any, request: any, context: PluginContext\) \{[\s\S]*?throw error;\s+\}/,
  `async onError(error: any, request: any, context: PluginContext) {
      // Don't clear timeout here - we need to know if it fired

      // Check if this was a timeout by seeing if timeout fired
      // We check if __timeoutFired flag is set (will be set by timeout callback)
      if (request.__timeoutFired) {
        throw new TimeoutError(
          message || \`Request timeout after \${request.__timeoutValue}ms\`,
          request
        );
      }

      // Clear timeout if it didn't fire (request failed for other reasons)
      if (request.__timeoutId) {
        clearTimeout(request.__timeoutId);
      }

      throw error;
    }`
);

// Update onRequest to set a flag when timeout fires
content = content.replace(
  /\/\/ Set timeout\s+const timeoutId = setTimeout\(\(\) => \{[\s\S]*?\}, timeout\);/,
  `// Set timeout
      const timeoutId = setTimeout(() => {
        // Mark that timeout has fired
        request.__timeoutFired = true;

        if (request.__abortController) {
          request.__abortController.abort();
        }
      }, timeout);`
);

// Update onResponse to clear both timeout and flag
content = content.replace(
  /async onResponse\(response: any, request: any, context: PluginContext\) \{[\s\S]*?return response;\s+\}/,
  `async onResponse(response: any, request: any, context: PluginContext) {
      // Clear timeout on successful response
      if (request.__timeoutId) {
        clearTimeout(request.__timeoutId);
        request.__timeoutFired = false; // Reset flag
      }

      return response;
    }`
);

fs.writeFileSync(filePath, content);
console.log('Timeout plugin fixed (v2) successfully!');
