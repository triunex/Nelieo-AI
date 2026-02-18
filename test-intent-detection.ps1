# Test Intent Detection Integration
# Run this after starting Docker Desktop and the AIOS container

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "🧪 AIOS Intent Detection Test Suite" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "1️⃣ Checking Docker status..." -ForegroundColor Yellow
$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker Desktop is not running!" -ForegroundColor Red
    Write-Host "   Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker is running" -ForegroundColor Green
Write-Host ""

# Check if AIOS container is running
Write-Host "2️⃣ Checking AIOS container..." -ForegroundColor Yellow
$containerStatus = docker ps --filter "name=aios_nelieo_phase1" --format "{{.Status}}" 2>&1
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrEmpty($containerStatus)) {
    Write-Host "❌ AIOS container is not running!" -ForegroundColor Red
    Write-Host "   Starting container..." -ForegroundColor Yellow
    docker start aios_nelieo_phase1
    Start-Sleep -Seconds 5
    $containerStatus = docker ps --filter "name=aios_nelieo_phase1" --format "{{.Status}}" 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrEmpty($containerStatus)) {
        Write-Host "❌ Failed to start container!" -ForegroundColor Red
        exit 1
    }
}
Write-Host "✅ Container status: $containerStatus" -ForegroundColor Green
Write-Host ""

# Test API endpoint
Write-Host "3️⃣ Testing SuperAgent API..." -ForegroundColor Yellow
try {
    $apiTest = Invoke-RestMethod -Uri "http://localhost:10000/health" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ API is responding: $($apiTest | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    Write-Host "❌ API is not responding!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Make sure container is fully started (wait 10-30 seconds)" -ForegroundColor Yellow
}
Write-Host ""

# Check Xpra stream
Write-Host "4️⃣ Testing Xpra desktop stream..." -ForegroundColor Yellow
try {
    $xpraTest = Invoke-WebRequest -Uri "http://localhost:10005/" -Method GET -TimeoutSec 5 -ErrorAction Stop
    if ($xpraTest.StatusCode -eq 200) {
        Write-Host "✅ Xpra stream is available at http://localhost:10005" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️ Xpra stream not responding (this is optional)" -ForegroundColor Yellow
}
Write-Host ""

# Test Intent Detection with Simple Commands
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "🎯 Testing Intent Detection Logic" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$testCases = @(
    @{
        query = "Open Chrome"
        expectedApps = @("chrome")
        description = "Simple browser command"
    },
    @{
        query = "Open Gmail and Instagram"
        expectedApps = @("gmail", "instagram")
        description = "Multi-app command"
    },
    @{
        query = "Go to instagram.com"
        expectedApps = @("instagram")
        description = "URL-based detection"
    },
    @{
        query = "Check my Gmail inbox"
        expectedApps = @("gmail")
        description = "Keyword-based detection"
    },
    @{
        query = "Send an email via Gmail then message John on Slack"
        expectedApps = @("gmail", "slack")
        description = "Multi-step workflow"
    },
    @{
        query = "Post on Instagram and Facebook"
        expectedApps = @("instagram", "facebook")
        description = "Social media multi-app"
    }
)

Write-Host "Test Cases (Intent Detection Logic):" -ForegroundColor Cyan
foreach ($test in $testCases) {
    Write-Host ""
    Write-Host "  Query: '$($test.query)'" -ForegroundColor White
    Write-Host "  Expected Apps: $($test.expectedApps -join ', ')" -ForegroundColor Gray
    Write-Host "  Description: $($test.description)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "📋 Manual Testing Instructions" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Open browser: http://localhost:8080" -ForegroundColor Yellow
Write-Host "2. Log into AIOS (or use demo mode)" -ForegroundColor Yellow
Write-Host "3. Try the test commands above in the command bar" -ForegroundColor Yellow
Write-Host "4. Verify:" -ForegroundColor Yellow
Write-Host "   - Correct apps open based on intent" -ForegroundColor Gray
Write-Host "   - Apps open sequentially (2-second delay)" -ForegroundColor Gray
Write-Host "   - Toast notifications show workflow description" -ForegroundColor Gray
Write-Host "   - Xpra windows display container desktop" -ForegroundColor Gray
Write-Host "   - Rate limit errors show graceful fallback message" -ForegroundColor Gray
Write-Host ""

# Start dev server if not already running
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "🚀 Starting Dev Server" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting Vite dev server on http://localhost:8080..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

# Check if dev server is already running
$devServerRunning = $false
try {
    $testPort = Test-NetConnection -ComputerName localhost -Port 8080 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    if ($testPort.TcpTestSucceeded) {
        Write-Host "✅ Dev server is already running at http://localhost:8080" -ForegroundColor Green
        Write-Host ""
        Write-Host "You can now test the integration!" -ForegroundColor Green
        Write-Host ""
        $devServerRunning = $true
    }
} catch {
    # Port not in use, we'll start the server
}

if (-not $devServerRunning) {
    Write-Host "Starting new dev server..." -ForegroundColor Yellow
    npm run dev
}
