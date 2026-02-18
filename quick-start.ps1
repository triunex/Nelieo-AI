# AI OS Quick Start
# Simple script to build and start the AI OS

Write-Host "Starting AI OS..." -ForegroundColor Cyan
Write-Host ""

# Check Docker
Write-Host "[INFO] Checking Docker..." -ForegroundColor Cyan
docker version | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Docker is not running!" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Docker is running" -ForegroundColor Green
Write-Host ""

# Build and start
Write-Host "[INFO] Building and starting container (this takes 10-15 minutes first time)..." -ForegroundColor Cyan
docker-compose -f docker-compose.aios.yml up -d --build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERROR] Failed to start!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[OK] Container started!" -ForegroundColor Green
Write-Host ""
Write-Host "Waiting 30 seconds for services..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "AI OS is Ready!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Access Points:" -ForegroundColor Cyan
Write-Host "  Desktop Stream: http://localhost:10005" -ForegroundColor White
Write-Host "  Agent API:      http://localhost:8081" -ForegroundColor White
Write-Host ""
Write-Host "View logs:" -ForegroundColor Cyan
Write-Host "  docker logs aios_nelieo_phase1 -f" -ForegroundColor White
Write-Host ""
