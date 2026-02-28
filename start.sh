#!/bin/bash
# ═══════════════════════════════════════════════════════
#  FormForge AI — One-Click Launcher
#  Double-click this file to start the tool!
# ═══════════════════════════════════════════════════════

# Navigate to project directory
cd "$(dirname "$0")"

echo ""
echo "  ⚡ Starting FormForge AI..."
echo ""

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "  ❌ Node.js is not installed!"
    echo "  📥 Download it from: https://nodejs.org"
    echo ""
    read -p "  Press Enter to exit..."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "  📦 Installing dependencies (first time only)..."
    npm install
    echo ""
fi

# Start server in background
echo "  🚀 Starting server..."
npx ts-node src/server.ts &
SERVER_PID=$!

# Wait a moment for server to start
sleep 3

# Open browser
echo "  🌐 Opening browser..."
if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:3000"
elif command -v open &> /dev/null; then
    open "http://localhost:3000"
fi

echo ""
echo "  ✅ FormForge AI is running at http://localhost:3000"
echo ""
echo "  ╔═══════════════════════════════════════════╗"
echo "  ║  Press Enter when done to stop the server ║"
echo "  ╚═══════════════════════════════════════════╝"
echo ""
read -p "  "

# Stop the server
echo "  🛑 Stopping server..."
kill $SERVER_PID 2>/dev/null
echo "  👋 Goodbye!"
sleep 1
