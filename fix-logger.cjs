const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'packages/plugins/logger/src/index.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Fix 1: Add skip logging flag in onRequest
content = content.replace(
  /if \(!logRequests \|\| !shouldLog\(request\)\) \{\s+return request;\s+\}/,
  `if (!logRequests || !shouldLog(request)) {
        request.__skipLogging = true;
        return request;
      }`
);

// Fix 2: Check skip logging flag in onResponse (before other checks)
content = content.replace(
  /async onResponse\(response: HttpResponse, request: any, context: PluginContext\) \{\s+if \(!logResponses/,
  `async onResponse(response: HttpResponse, request: any, context: PluginContext) {
      // Skip if logging was disabled for this request
      if (request.__skipLogging) {
        return response;
      }

      if (!logResponses`
);

// Fix 3: Check skip logging flag in onError (before other checks)
content = content.replace(
  /async onError\(error: HttpError, request: any, context: PluginContext\) \{\s+if \(!logErrors/,
  `async onError(error: HttpError, request: any, context: PluginContext) {
      // Skip if logging was disabled for this request
      if (request.__skipLogging) {
        throw error;
      }

      if (!logErrors`
);

fs.writeFileSync(filePath, content);
console.log('Logger plugin fixed successfully!');
