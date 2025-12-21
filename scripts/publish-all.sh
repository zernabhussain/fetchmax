#!/usr/bin/env bash

# Publish all FetchMax packages to npm
# Usage: bash scripts/publish-all.sh

set -e # Exit on error

echo ""
echo "📦 Publishing FetchMax packages to npm..."
echo ""

# Store the root directory (handle Windows paths in Git Bash)
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

# Publish core package first
echo "📦 Publishing @fetchmax/core..."
cd "packages/core" || exit 1
if npm publish --access public; then
    echo "✅ @fetchmax/core published successfully!"
else
    echo "❌ Failed to publish @fetchmax/core"
    cd "$ROOT_DIR"
    exit 1
fi
cd "$ROOT_DIR"
echo ""

# List of all plugins (9 core + 5 AI = 14 total)
PLUGINS=(
    # Core Plugins (9)
    "retry"
    "cache"
    "interceptors"
    "timeout"
    "logger"
    "dedupe"
    "rate-limit"
    "transform"
    "progress"
    # AI Plugins (5) - Production Ready v1.0.0
    "ai-agent"
    "ai-mock"
    "ai-translate"
    "ai-summarize"
    "ai-transform"
    # Future Plugins (uncomment when ready):
    # "graphql"
    # "offline-queue"
    # "websocket"
)

# Publish each plugin
SUCCESS_COUNT=0
SKIPPED_COUNT=0
declare -a FAILED_PLUGINS

for plugin in "${PLUGINS[@]}"; do
    PLUGIN_PATH="packages/plugins/$plugin"

    if [ -d "$PLUGIN_PATH" ]; then
        echo "📦 Publishing @fetchmax/plugin-$plugin..."
        cd "$PLUGIN_PATH" || exit 1
        if npm publish --access public; then
            echo "✅ @fetchmax/plugin-$plugin published successfully!"
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        else
            echo "❌ Failed to publish @fetchmax/plugin-$plugin"
            FAILED_PLUGINS+=("$plugin")
        fi
        cd "$ROOT_DIR"
        echo ""
    else
        echo "⏭️  Skipping @fetchmax/plugin-$plugin (directory not found)"
        SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
        echo ""
    fi
done

# Summary
echo "════════════════════════════════════════════"
echo "📊 Publishing Summary"
echo "════════════════════════════════════════════"
echo ""
echo "✅ Core package:     Published"
echo "✅ Plugins published: $SUCCESS_COUNT"

if [ $SKIPPED_COUNT -gt 0 ]; then
    echo "⏭️  Plugins skipped:   $SKIPPED_COUNT"
fi

if [ ${#FAILED_PLUGINS[@]} -gt 0 ]; then
    echo "❌ Plugins failed:    ${#FAILED_PLUGINS[@]}"
    echo "   Failed: ${FAILED_PLUGINS[*]}"
fi

echo ""
echo "════════════════════════════════════════════"
echo ""
echo "🎉 Publishing complete!"
echo ""
echo "📦 View your packages at:"
echo "   • Core: https://www.npmjs.com/package/@fetchmax/core"
echo "   • Org:  https://www.npmjs.com/org/fetchmax"
echo ""
echo "📝 Next steps:"
echo "   1. Verify packages on npm website"
echo "   2. Test installation: npm install @fetchmax/core"
echo "   3. Create git release tag: git tag -a v1.0.0 -m 'Release v1.0.0'"
echo "   4. Push tags: git push --tags"
echo ""
