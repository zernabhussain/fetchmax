const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'packages/plugins/cache/src/index.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Fix 1: Return new object with __cacheKey instead of mutating
content = content.replace(
  /\/\/ Store cache key in request for onResponse\s+request\.__cacheKey = key;\s+return request;/,
  `// Store cache key in request for onResponse
      return {
        ...request,
        __cacheKey: key
      };`
);

// Fix 2: Rename parameter from 'request' to 'config' in onResponse
content = content.replace(
  /async onResponse\(response: HttpResponse, request: any,/,
  'async onResponse(response: HttpResponse, config: any,'
);

// Fix 3: Remove dead code (cached check - this never executes)
content = content.replace(
  /\/\/ If data was already cached, return it\s+if \(request\.__cached\) \{\s+return request\.__cachedData;\s+\}\s+\/\/ Don't cache if no cache key/,
  `// Don't cache if no cache key`
);

// Fix 4: Update all references from 'request' to 'config' in onResponse
content = content.replace(/if \(!request\.__cacheKey\) \{/g, 'if (!config.__cacheKey) {');
content = content.replace(/const key = request\.__cacheKey;/, 'const key = config.__cacheKey;');
content = content.replace(/url: request\.url/g, 'url: config.url');
content = content.replace(
  /console\.log\(\`\[Cache\] STORED: \$\{request\.url\}/,
  'console.log(`[Cache] STORED: ${config.url}'
);

fs.writeFileSync(filePath, content);
console.log('Cache plugin fixed successfully!');
