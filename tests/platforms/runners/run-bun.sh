#!/bin/bash
# Bun runtime testing

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$PROJECT_ROOT"

echo "=========================================="
echo "Bun Runtime Testing"
echo "=========================================="

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
  echo "ERROR: Bun is not installed."
  echo "Install from: https://bun.sh"
  exit 1
fi

echo "Bun version: $(bun --version)"

# Build first
echo "Building packages..."
npm run build

# Run tests with Bun
echo ""
echo "Running tests with Bun..."
bun run vitest run --config tests/platforms/configs/vitest.bun.config.ts

echo ""
echo "Bun Testing: PASSED ✓"
