#!/usr/bin/env bash

# Test what will be published without actually publishing
# Usage: bash scripts/test-publish.sh

echo ""
echo "🧪 Testing FetchMax publishing (DRY RUN - no actual publishing)"
echo ""

# Store the root directory
ROOT_DIR="$(pwd)"

# Check if logged in to npm
echo "🔍 Checking npm login status..."
if ! npm whoami > /dev/null 2>&1; then
    echo "❌ You are not logged in to npm!"
    echo "Please run: npm login"
    exit 1
fi
NPM_USER=$(npm whoami)
echo "✅ Logged in as: $NPM_USER"
echo ""

# Build all packages first
echo "🔨 Building all packages..."
if npm run build; then
    echo "✅ Build successful!"
    echo ""
else
    echo "❌ Build failed!"
    exit 1
fi

# Test core package
echo "📦 Testing @fetchmax/core (dry-run)..."
cd "packages/core" || exit 1
echo ""
npm pack --dry-run
echo ""
cd "$ROOT_DIR"

# Test one plugin as example
echo "📦 Testing @fetchmax/plugin-retry (dry-run)..."
cd "packages/plugins/retry" || exit 1
echo ""
npm pack --dry-run
echo ""
cd "$ROOT_DIR"

echo "════════════════════════════════════════════"
echo "✅ Dry run complete!"
echo ""
echo "📝 What you saw above:"
echo "   • List of files that will be published"
echo "   • Package size"
echo "   • No files from root directory (PUBLISHING_QUICKSTART.md, etc.)"
echo "   • Only dist/, package.json, and README.md from each package"
echo ""
echo "🚀 To actually publish, run:"
echo "   bash scripts/publish-all.sh"
echo ""
