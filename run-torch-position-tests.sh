#!/bin/bash

# Torch Position Verification Test Runner
# This script helps run the torch position verification tests

set -e

echo "🔥 Torch Position Verification Test Runner"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "Cargo.toml" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if Tauri is installed
if ! command -v cargo &> /dev/null; then
    echo "❌ Error: Cargo not found. Please install Rust and Cargo."
    exit 1
fi

echo "📋 Test Information:"
echo "  - Test 1: Torch at (r=0, z=0.5) → Center-Middle"
echo "  - Test 2: Torch at (r=0.5, z=0.25) → 50% Radius, 25% Height"
echo "  - Test 3: Torch at (r=1, z=1) → Edge-Top"
echo ""

echo "🚀 Starting Tauri application..."
echo ""
echo "📝 Instructions:"
echo "  1. Wait for the application window to open"
echo "  2. Navigate to the test page:"
echo "     - Open browser dev tools (Cmd+Option+I on Mac, F12 on Windows/Linux)"
echo "     - In the console, type: window.location.href = 'test-torch-position-verification.html'"
echo "  3. Click 'Run All Tests' button"
echo "  4. Wait for tests to complete (may take 1-2 minutes)"
echo "  5. Review results in the test page"
echo ""
echo "💡 Tip: You can also run individual tests by clicking the specific test buttons"
echo ""

# Change to src-tauri directory
cd src-tauri

# Run Tauri in dev mode
echo "🏃 Running: cargo tauri dev"
echo ""
cargo tauri dev

echo ""
echo "✅ Application closed"
