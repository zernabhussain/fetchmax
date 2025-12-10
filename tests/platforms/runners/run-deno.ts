#!/usr/bin/env -S deno run --allow-read --allow-run --allow-env

import { join } from "https://deno.land/std@0.208.0/path/mod.ts";

console.log("==========================================");
console.log("Deno Runtime Testing");
console.log("==========================================");

// Check Deno version
console.log(`Deno version: ${Deno.version.deno}`);

const projectRoot = Deno.cwd();

// Build first
console.log("Building packages...");
const buildProcess = new Deno.Command("npm", {
  args: ["run", "build"],
  cwd: projectRoot,
  stdout: "inherit",
  stderr: "inherit",
});
const buildStatus = await buildProcess.output();

if (!buildStatus.success) {
  console.error("Build failed!");
  Deno.exit(1);
}

// Run tests with Deno + Vitest
console.log("");
console.log("Running tests with Deno...");
const testProcess = new Deno.Command("npx", {
  args: [
    "vitest",
    "run",
    "--config",
    "tests/platforms/configs/vitest.deno.config.ts"
  ],
  cwd: projectRoot,
  stdout: "inherit",
  stderr: "inherit",
});

const testStatus = await testProcess.output();

if (testStatus.success) {
  console.log("");
  console.log("Deno Testing: PASSED ✓");
  Deno.exit(0);
} else {
  console.log("");
  console.log("Deno Testing: FAILED ✗");
  Deno.exit(1);
}
