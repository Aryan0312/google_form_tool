@echo off
REM ═══════════════════════════════════════════════════════
REM  FormForge AI — One-Click Launcher (Windows)
REM  Double-click this file to start the tool!
REM ═══════════════════════════════════════════════════════

cd /d "%~dp0"

echo.
echo   ⚡ Starting FormForge AI...
echo.

REM Check if node is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo   ❌ Node.js is not installed!
    echo   📥 Download it from: https://nodejs.org
    echo.
    pause
    exit /b 1
)

REM Install dependencies if needed
if not exist "node_modules" (
    echo   📦 Installing dependencies (first time only^)...
    call npm install
    echo.
)

REM Start server
echo   🚀 Starting server...
start /b npx ts-node src/server.ts

REM Wait for server to start
timeout /t 4 /nobreak >nul

REM Open browser
echo   🌐 Opening browser...
start http://localhost:3000

echo.
echo   ✅ FormForge AI is running at http://localhost:3000
echo.
echo   ╔═══════════════════════════════════════════╗
echo   ║  Press any key when done to stop server   ║
echo   ╚═══════════════════════════════════════════╝
echo.
pause >nul

REM Stop the server
echo   🛑 Stopping server...
taskkill /f /im node.exe >nul 2>nul
echo   👋 Goodbye!
timeout /t 2 /nobreak >nul
