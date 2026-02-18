# Test SuperAgent in Docker Container
# Rebuilds container with SuperAgent and runs tests

Write-Host "=== SuperAgent Test Script ===" -ForegroundColor Cyan
Write-Host ""

# Check if OPENROUTER_API_KEY is set
if (-not $env:OPENROUTER_API_KEY) {
    Write-Host "ERROR: OPENROUTER_API_KEY environment variable not set" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please set it with:" -ForegroundColor Yellow
    Write-Host '  $env:OPENROUTER_API_KEY = "your-key-here"' -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ OPENROUTER_API_KEY is set" -ForegroundColor Green
Write-Host ""

# Step 1: Stop existing container
Write-Host "Step 1: Stopping existing container..." -ForegroundColor Cyan
docker-compose -f docker-compose.aios.yml down
Write-Host ""

# Step 2: Rebuild container
Write-Host "Step 2: Rebuilding container with SuperAgent..." -ForegroundColor Cyan
docker-compose -f docker-compose.aios.yml build --no-cache aios_phase1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Build complete" -ForegroundColor Green
Write-Host ""

# Step 3: Start container
Write-Host "Step 3: Starting container..." -ForegroundColor Cyan
docker-compose -f docker-compose.aios.yml up -d aios_phase1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Container failed to start" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Container started" -ForegroundColor Green
Write-Host ""

# Step 4: Wait for container to be ready
Write-Host "Step 4: Waiting for container to be ready..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

# Check container is running
$containerStatus = docker ps --filter "name=aios_nelieo_phase1" --format "{{.Status}}"
if (-not $containerStatus) {
    Write-Host "ERROR: Container not running" -ForegroundColor Red
    docker logs aios_nelieo_phase1 --tail 50
    exit 1
}
Write-Host "✓ Container is running: $containerStatus" -ForegroundColor Green
Write-Host ""

# Step 5: Run SuperAgent tests
Write-Host "Step 5: Running SuperAgent tests..." -ForegroundColor Cyan
Write-Host ""

docker exec -it aios_nelieo_phase1 python3 /opt/lumina-search-flow-main/test_superagent.py
$testExitCode = $LASTEXITCODE

Write-Host ""

if ($testExitCode -eq 0) {
    Write-Host "=== ALL TESTS PASSED ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "SuperAgent is ready! You can now:" -ForegroundColor Cyan
    Write-Host "1. Access Xpra UI: http://localhost:10005" -ForegroundColor Yellow
    Write-Host "2. Test via API:" -ForegroundColor Yellow
    Write-Host '   Invoke-RestMethod -Uri "http://localhost:8081/api/superagent/execute" -Method Post -ContentType "application/json" -Body ''{"task":"Find Chrome icon and click it"}''' -ForegroundColor Gray
    Write-Host "3. View logs:" -ForegroundColor Yellow
    Write-Host "   docker logs -f aios_nelieo_phase1" -ForegroundColor Gray
} else {
    Write-Host "=== TESTS FAILED ===" -ForegroundColor Red
    Write-Host ""
    Write-Host "Showing container logs..." -ForegroundColor Yellow
    docker logs aios_nelieo_phase1 --tail 100
}

Write-Host ""
Write-Host "Container status:" -ForegroundColor Cyan
docker ps --filter "name=aios_nelieo_phase1"
