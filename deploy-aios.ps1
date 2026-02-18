# AI OS Phase 1 Deployment Script
# Removes old containers and deploys new multi-app AI OS

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   AI OS Phase 1 - Deployment Script" -ForegroundColor Cyan
Write-Host "   12 Apps + Nelieo Screen Agent" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Clean up old containers
Write-Host "Step 1: Cleaning up old containers..." -ForegroundColor Yellow
Write-Host ""

# Stop old chrome container
Write-Host "  Stopping chrome_xpra container..." -ForegroundColor Gray
docker stop chrome_xpra 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Stopped chrome_xpra" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  chrome_xpra not running or doesn't exist" -ForegroundColor Yellow
}

# Remove old chrome container
Write-Host "  Removing chrome_xpra container..." -ForegroundColor Gray
docker rm chrome_xpra 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Removed chrome_xpra" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  chrome_xpra doesn't exist" -ForegroundColor Yellow
}

# Stop old demo containers
Write-Host "  Stopping old demo containers..." -ForegroundColor Gray
docker compose -f docker-compose.demo.yml down 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Stopped demo containers" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  No demo containers running" -ForegroundColor Yellow
}

Write-Host ""

# Step 2: Copy Screen Agent files
Write-Host "Step 2: Verifying Screen Agent files..." -ForegroundColor Yellow
$screenAgentPath = ".\Nelieo Screen Agent AI OS\ScreenAgent-main\ScreenAgent-main"
if (Test-Path $screenAgentPath) {
    Write-Host "  ✅ Screen Agent found at: $screenAgentPath" -ForegroundColor Green
} else {
    Write-Host "  ❌ Screen Agent not found!" -ForegroundColor Red
    Write-Host "  Please ensure Screen Agent is at: $screenAgentPath" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 3: Build new container
Write-Host "Step 3: Building AI OS Phase 1 container..." -ForegroundColor Yellow
Write-Host "  This may take 5-10 minutes..." -ForegroundColor Gray
Write-Host ""

docker compose -f docker-compose.aios.yml build --no-cache

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed! Check logs above." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "  ✅ Build completed successfully!" -ForegroundColor Green
Write-Host ""

# Step 4: Start new container
Write-Host "Step 4: Starting AI OS Phase 1..." -ForegroundColor Yellow
docker compose -f docker-compose.aios.yml up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start container!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "  ✅ AI OS started successfully!" -ForegroundColor Green
Write-Host ""

# Step 5: Wait for container to be ready
Write-Host "Step 5: Waiting for AI OS to initialize..." -ForegroundColor Yellow
Write-Host "  Apps are launching, this takes about 30 seconds..." -ForegroundColor Gray

Start-Sleep -Seconds 10

# Show container status
Write-Host ""
Write-Host "Container Status:" -ForegroundColor Cyan
docker compose -f docker-compose.aios.yml ps

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Phase 1 Apps Running:" -ForegroundColor White
Write-Host "  1. Chrome             7. QuickBooks" -ForegroundColor Gray
Write-Host "  2. Gmail              8. Slack" -ForegroundColor Gray
Write-Host "  3. Notion             9. LinkedIn" -ForegroundColor Gray
Write-Host "  4. Instagram         10. Google Sheets" -ForegroundColor Gray
Write-Host "  5. Facebook          11. Zoom" -ForegroundColor Gray
Write-Host "  6. Salesforce        12. Asana" -ForegroundColor Gray
Write-Host ""
Write-Host "🤖 Nelieo Screen Agent: ACTIVE" -ForegroundColor Green
Write-Host ""
Write-Host "Access AI OS at: http://localhost:10005" -ForegroundColor Cyan
Write-Host ""
Write-Host "Useful Commands:" -ForegroundColor Yellow
Write-Host "  View logs:      docker compose -f docker-compose.aios.yml logs -f" -ForegroundColor Gray
Write-Host "  Stop AI OS:     docker compose -f docker-compose.aios.yml down" -ForegroundColor Gray
Write-Host "  Restart AI OS:  docker compose -f docker-compose.aios.yml restart" -ForegroundColor Gray
Write-Host "  Shell access:   docker exec -it aios_nelieo_phase1 bash" -ForegroundColor Gray
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan

# Option to view logs
Write-Host ""
$viewLogs = Read-Host "Would you like to view the live logs? (y/n)"
if ($viewLogs -eq "y" -or $viewLogs -eq "Y") {
    Write-Host ""
    Write-Host "Showing live logs (Press Ctrl+C to exit)..." -ForegroundColor Yellow
    Write-Host ""
    docker compose -f docker-compose.aios.yml logs -f
}
