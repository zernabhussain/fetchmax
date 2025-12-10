#!/bin/bash
# Cross-platform Node.js version testing

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$PROJECT_ROOT"

echo "=========================================="
echo "Cross-Platform Node.js Testing"
echo "=========================================="

# Build first
echo "Building packages..."
npm run build

# Node versions to test
NODE_VERSIONS=("18" "20" "22")

RESULTS=()

for VERSION in "${NODE_VERSIONS[@]}"; do
  echo ""
  echo "=========================================="
  echo "Testing on Node.js v$VERSION"
  echo "=========================================="

  # Use nvm to switch Node version
  if command -v nvm &> /dev/null; then
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

    nvm use "$VERSION" || {
      echo "ERROR: Node.js v$VERSION not installed. Install with: nvm install $VERSION"
      RESULTS+=("Node v$VERSION: SKIPPED (not installed)")
      continue
    }
  else
    CURRENT_NODE=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$CURRENT_NODE" != "$VERSION" ]; then
      echo "WARNING: nvm not found. Skipping version switching."
      echo "Current Node version: v$CURRENT_NODE"
      RESULTS+=("Node v$VERSION: SKIPPED (nvm not available)")
      continue
    fi
  fi

  # Run tests with Node-specific config
  if npx vitest run --config tests/platforms/configs/vitest.node.config.ts; then
    RESULTS+=("Node v$VERSION: PASSED ✓")
  else
    RESULTS+=("Node v$VERSION: FAILED ✗")
  fi
done

# Print summary
echo ""
echo "=========================================="
echo "Node.js Testing Summary"
echo "=========================================="
for RESULT in "${RESULTS[@]}"; do
  echo "$RESULT"
done
