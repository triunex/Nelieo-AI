# Nelieo Waitlist Server Startup Script
# Run this to start the SQLite server

Write-Host "🚀 Starting Nelieo Waitlist Server..." -ForegroundColor Cyan

# Navigate to waitlist directory
Set-Location $PSScriptRoot

# Check if node is available
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js not found! Please install Node.js from https://nodejs.org" -ForegroundColor Red
    pause
    exit 1
}

# Check if database exists
if (-not (Test-Path "lumina_waitlist.db")) {
    Write-Host "⚠️  Database not found. Initializing..." -ForegroundColor Yellow
    node init-db-sqlite.js
}

# Start the server
Write-Host "✅ Starting SQLite server on port 3001..." -ForegroundColor Green
node server-sqlite.js
