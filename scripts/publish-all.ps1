# Publish all FetchMax packages to npm
# Usage: .\scripts\publish-all-no-emoji.ps1

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "Publishing FetchMax packages to npm..." -ForegroundColor Cyan
Write-Host ""

# Store the root directory
$rootDir = Get-Location

# Check if logged in to npm
Write-Host "Checking npm login status..." -ForegroundColor Yellow
try {
    $npmUser = npm whoami 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "You are not logged in to npm!" -ForegroundColor Red
        Write-Host "Please run: npm login" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "Logged in as: $npmUser" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "Error checking npm login status" -ForegroundColor Red
    exit 1
}

# Build all packages first
Write-Host "Building all packages..." -ForegroundColor Yellow
try {
    npm run build
    Write-Host "Build successful!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Publish core package first
Write-Host "Publishing @fetchmax/core..." -ForegroundColor Cyan
try {
    Set-Location "packages/core"
    npm publish --access public
    Write-Host "@fetchmax/core published successfully!" -ForegroundColor Green
    Set-Location $rootDir
    Write-Host ""
} catch {
    Write-Host "Failed to publish @fetchmax/core" -ForegroundColor Red
    Set-Location $rootDir
    exit 1
}

# List of all plugins (AI plugins first - they're trending!)
$plugins = @(
    "ai-agent",
    "ai-mock",
    "ai-translate",
    "ai-summarize",
    "ai-transform",
    "retry",
    "cache",
    "interceptors",
    "timeout",
    "logger",
    "dedupe",
    "rate-limit",
    "transform",
    "progress"
)

# Publish each plugin
$successCount = 0
$skippedCount = 0
$failedPlugins = @()

foreach ($plugin in $plugins) {
    $pluginPath = "packages/plugins/$plugin"

    if (Test-Path $pluginPath) {
        Write-Host "Publishing @fetchmax/plugin-$plugin..." -ForegroundColor Cyan
        try {
            Set-Location $pluginPath
            npm publish --access public
            Write-Host "@fetchmax/plugin-$plugin published successfully!" -ForegroundColor Green
            $successCount++
            Set-Location $rootDir
            Write-Host ""
        } catch {
            Write-Host "Failed to publish @fetchmax/plugin-$plugin" -ForegroundColor Red
            $failedPlugins += $plugin
            Set-Location $rootDir
            Write-Host ""
        }
    } else {
        Write-Host "Skipping @fetchmax/plugin-$plugin (directory not found)" -ForegroundColor Yellow
        $skippedCount++
        Write-Host ""
    }
}

# Summary
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Publishing Summary" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Core package:     Published" -ForegroundColor Green
Write-Host "Plugins published: $successCount" -ForegroundColor Green

if ($skippedCount -gt 0) {
    Write-Host "Plugins skipped:   $skippedCount" -ForegroundColor Yellow
}

if ($failedPlugins.Count -gt 0) {
    Write-Host "Plugins failed:    $($failedPlugins.Count)" -ForegroundColor Red
    Write-Host "   Failed: $($failedPlugins -join ', ')" -ForegroundColor Red
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Publishing complete!" -ForegroundColor Green
Write-Host ""
Write-Host "View your packages at:" -ForegroundColor Cyan
Write-Host "   - Core: https://www.npmjs.com/package/@fetchmax/core" -ForegroundColor White
Write-Host "   - Org:  https://www.npmjs.com/org/fetchmax" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "   1. Verify packages on npm website" -ForegroundColor White
Write-Host "   2. Test installation: npm install @fetchmax/core" -ForegroundColor White
Write-Host "   3. Create git release tag: git tag -a v1.0.0 -m 'Release v1.0.0'" -ForegroundColor White
Write-Host "   4. Push tags: git push --tags" -ForegroundColor White
Write-Host ""
