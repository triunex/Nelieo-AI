# AIOS Diagnostic Script
# Run this to check system status

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "       AIOS System Diagnostic" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Docker Desktop
Write-Host "1️⃣ Docker Desktop Status:" -ForegroundColor Yellow
try {
    $dockerService = Get-Service -Name "com.docker.service" -ErrorAction Stop
    if ($dockerService.Status -eq "Running") {
        Write-Host "   ✅ Docker Desktop is RUNNING" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Docker Desktop is STOPPED" -ForegroundColor Red
        Write-Host "   → Action: Open Docker Desktop from Start Menu" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Docker Desktop not found" -ForegroundColor Red
    Write-Host "   → Action: Install Docker Desktop" -ForegroundColor Yellow
}
Write-Host ""

# 2. Check Container Status
Write-Host "2️⃣ Container Status:" -ForegroundColor Yellow
try {
    $containerStatus = docker ps -a --filter "name=aios_nelieo_phase1" --format "{{.Names}}: {{.Status}}" 2>&1
    if ($LASTEXITCODE -eq 0 -and ![string]::IsNullOrEmpty($containerStatus)) {
        if ($containerStatus -match "Up") {
            Write-Host "   ✅ Container is RUNNING: $containerStatus" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️ Container exists but not running: $containerStatus" -ForegroundColor Yellow
            Write-Host "   → Action: Run 'docker start aios_nelieo_phase1'" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ❌ Container not found" -ForegroundColor Red
        Write-Host "   → Action: Build container with docker-compose" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Cannot check container (Docker not responding)" -ForegroundColor Red
}
Write-Host ""

# 3. Check API Health
Write-Host "3️⃣ Backend API Health:" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:10000/health" -Method GET -TimeoutSec 3 -ErrorAction Stop
    Write-Host "   ✅ API is HEALTHY: $($health | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    if ($_.Exception.Message -match "refused") {
        Write-Host "   ❌ API not responding (connection refused)" -ForegroundColor Red
        Write-Host "   → Action: Start container and wait 15 seconds" -ForegroundColor Yellow
    } elseif ($_.Exception.Message -match "timed out") {
        Write-Host "   ⚠️ API responding slowly (timeout)" -ForegroundColor Yellow
        Write-Host "   → Action: Wait for container to fully initialize" -ForegroundColor Yellow
    } else {
        Write-Host "   ❌ API error: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# 4. Check Xpra Stream
Write-Host "4️⃣ Xpra Desktop Stream:" -ForegroundColor Yellow
try {
    $xpra = Invoke-WebRequest -Uri "http://localhost:10005/" -Method GET -TimeoutSec 3 -ErrorAction Stop
    if ($xpra.StatusCode -eq 200) {
        Write-Host "   ✅ Xpra stream is AVAILABLE" -ForegroundColor Green
    }
} catch {
    Write-Host "   ⚠️ Xpra stream not responding (this is optional)" -ForegroundColor Yellow
}
Write-Host ""

# 5. Check Port Usage
Write-Host "5️⃣ Port Usage:" -ForegroundColor Yellow
Write-Host "   Port 10000 (Backend API):" -ForegroundColor Gray
$port10000 = netstat -ano | Select-String "10000" | Select-Object -First 1
if ($port10000) {
    Write-Host "   ✅ Port 10000 is in use" -ForegroundColor Green
    Write-Host "      $port10000" -ForegroundColor Gray
} else {
    Write-Host "   ❌ Port 10000 is NOT in use" -ForegroundColor Red
    Write-Host "   → Action: Container not running or backend crashed" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "   Port 10005 (Xpra Stream):" -ForegroundColor Gray
$port10005 = netstat -ano | Select-String "10005" | Select-Object -First 1
if ($port10005) {
    Write-Host "   ✅ Port 10005 is in use" -ForegroundColor Green
    Write-Host "      $port10005" -ForegroundColor Gray
} else {
    Write-Host "   ⚠️ Port 10005 is NOT in use" -ForegroundColor Yellow
}
Write-Host ""

# 6. Check Frontend Dev Server
Write-Host "6️⃣ Frontend Dev Server:" -ForegroundColor Yellow
try {
    $frontend = Test-NetConnection -ComputerName localhost -Port 8080 -WarningAction SilentlyContinue -ErrorAction Stop
    if ($frontend.TcpTestSucceeded) {
        Write-Host "   ✅ Dev server is RUNNING at http://localhost:8080" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Dev server is NOT running" -ForegroundColor Red
        Write-Host "   → Action: Run 'npm run dev' in a separate terminal" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Cannot check frontend server" -ForegroundColor Red
}
Write-Host ""

# 7. Summary & Recommendations
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "           Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# Check critical components
Write-Host "Critical Components:" -ForegroundColor Yellow

# Docker
try {
    $dockerService = Get-Service -Name "com.docker.service" -ErrorAction Stop
    if ($dockerService.Status -ne "Running") {
        Write-Host "  ❌ Docker Desktop must be running" -ForegroundColor Red
        $allGood = $false
    }
} catch {
    Write-Host "  ❌ Docker Desktop not found" -ForegroundColor Red
    $allGood = $false
}

# Container
try {
    $containerStatus = docker ps --filter "name=aios_nelieo_phase1" --format "{{.Status}}" 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrEmpty($containerStatus)) {
        Write-Host "  ❌ Container must be started" -ForegroundColor Red
        $allGood = $false
    }
} catch {
    Write-Host "  ❌ Container status unknown" -ForegroundColor Red
    $allGood = $false
}

# API
try {
    Invoke-RestMethod -Uri "http://localhost:10000/health" -TimeoutSec 2 -ErrorAction Stop | Out-Null
} catch {
    Write-Host "  ❌ Backend API must be responding" -ForegroundColor Red
    $allGood = $false
}

Write-Host ""

if ($allGood) {
    Write-Host "🎉 All systems GO! You're ready to test." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Open http://localhost:8080" -ForegroundColor White
    Write-Host "  2. Try command: 'Open Chrome'" -ForegroundColor White
    Write-Host "  3. Run full test: ./test-intent-detection.ps1" -ForegroundColor White
} else {
    Write-Host "⚠️ Issues detected! Follow the actions above." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Quick fix steps:" -ForegroundColor Cyan
    Write-Host "  1. Start Docker Desktop (if not running)" -ForegroundColor White
    Write-Host "  2. Run: docker start aios_nelieo_phase1" -ForegroundColor White
    Write-Host "  3. Wait 15 seconds" -ForegroundColor White
    Write-Host "  4. Run this diagnostic again" -ForegroundColor White
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
