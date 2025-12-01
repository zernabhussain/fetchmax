const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'packages/plugins/timeout/src/index.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Remove all the debug console.log statements
content = content.replace(/\s+console\.log\('\[TIMEOUT DEBUG\].*?'\);/g, '');

fs.writeFileSync(filePath, content);
console.log('Debug logging removed from timeout plugin!');
