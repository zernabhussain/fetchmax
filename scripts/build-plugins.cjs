#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const pluginsDir = path.join(__dirname, '../packages/plugins');

// Get all plugin directories
const plugins = fs.readdirSync(pluginsDir).filter(name => {
  const pluginPath = path.join(pluginsDir, name);
  return fs.statSync(pluginPath).isDirectory() && fs.existsSync(path.join(pluginPath, 'package.json'));
});

console.log(`Building ${plugins.length} plugins...`);

let successCount = 0;
let failedPlugins = [];

plugins.forEach(plugin => {
  const pluginPath = path.join(pluginsDir, plugin);
  const packageJsonPath = path.join(pluginPath, 'package.json');

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Check if plugin has a build script
    if (packageJson.scripts && packageJson.scripts.build) {
      console.log(`\nBuilding plugin: ${plugin}...`);
      execSync('npm run build', {
        cwd: pluginPath,
        stdio: 'inherit'
      });
      successCount++;
      console.log(`✓ ${plugin} built successfully`);
    } else {
      console.log(`  Skipping ${plugin} (no build script)`);
    }
  } catch (error) {
    console.error(`✗ Failed to build ${plugin}:`, error.message);
    failedPlugins.push(plugin);
  }
});

console.log(`\n${'='.repeat(50)}`);
console.log(`Build Summary:`);
console.log(`  ✓ Successfully built: ${successCount} plugins`);
if (failedPlugins.length > 0) {
  console.log(`  ✗ Failed: ${failedPlugins.length} plugins (${failedPlugins.join(', ')})`);
  process.exit(1);
} else {
  console.log(`  All plugins built successfully!`);
}
