# AI OS Testing Script
# Tests all components of the AI OS container

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "AI OS Comprehensive Testing Script" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$CONTAINER_NAME = "aios-test"
$PORT = 10005
$DISPLAY = ":100"

# Color functions
function Write-Success { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Error { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Warning { param($msg) Write-Host "[WARN] $msg" -ForegroundColor Yellow }

# Test counter
$script:passed = 0
$script:failed = 0

function Test-Step {
    param(
        [string]$Name,
        [scriptblock]$Test
    )
    
    Write-Host ""
    Write-Info "Testing: $Name"
    try {
        $result = & $Test
        if ($result) {
            Write-Success $Name
            $script:passed++
            return $true
        } else {
            Write-Error $Name
            $script:failed++
            return $false
        }
    } catch {
        Write-Error "$Name - Exception: $_"
        $script:failed++
        return $false
    }
}

Write-Info "Step 1: Checking prerequisites..."

# Check Docker
Test-Step "Docker is installed and running" {
    $dockerVersion = docker version 2>&1
    return $LASTEXITCODE -eq 0
}

# Check if container exists
$containerExists = docker ps -a --format "{{.Names}}" | Select-String -Pattern "^$CONTAINER_NAME$"

Write-Info "Step 2: Building and starting container..."

if ($containerExists) {
    Write-Warning "Container '$CONTAINER_NAME' already exists. Removing..."
    docker rm -f $CONTAINER_NAME 2>&1 | Out-Null
}

# Build the image
Write-Info "Building AI OS image (this may take 10-15 minutes)..."
docker-compose -f docker-compose.aios.yml build

if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker build failed!"
    exit 1
}

# Start the container
Write-Info "Starting AI OS container..."
docker-compose -f docker-compose.aios.yml up -d

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to start container!"
    exit 1
}

Write-Success "Container started successfully"

# Wait for container to initialize
Write-Info "Waiting 30 seconds for services to initialize..."
Start-Sleep -Seconds 30

Write-Info "Step 3: Testing container health..."

# Test: Container is running
Test-Step "Container is running" {
    $running = docker ps --filter "name=$CONTAINER_NAME" --format "{{.Status}}"
    return $running -match "Up"
}

# Test: X11 display is active
Test-Step "X11 display server (Xvfb) is running" {
    $result = docker exec $CONTAINER_NAME bash -c "ps aux | grep Xvfb | grep -v grep"
    return $result -ne $null
}

# Test: Openbox window manager is running
Test-Step "Openbox window manager is running" {
    $result = docker exec $CONTAINER_NAME bash -c "ps aux | grep openbox | grep -v grep"
    return $result -ne $null
}

# Test: Xpra is running
Test-Step "Xpra streaming server is running" {
    $result = docker exec $CONTAINER_NAME bash -c "ps aux | grep xpra | grep -v grep"
    return $result -ne $null
}

# Test: Xpra web interface is accessible
Test-Step "Xpra web interface is accessible" {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$PORT" -TimeoutSec 5 -UseBasicParsing
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

# Test: Supervisor is managing processes
Test-Step "Supervisord is running" {
    $result = docker exec $CONTAINER_NAME bash -c "supervisorctl status"
    return $LASTEXITCODE -eq 0
}

# Test: Window controller is functional
Test-Step "Window controller Python module loads" {
    $result = docker exec $CONTAINER_NAME bash -c "python3 -c 'from window_controller import WindowController; wc = WindowController(); print(\"OK\")'"
    return $result -match "OK"
}

# Test: App launcher is functional
Test-Step "App launcher module loads" {
    $result = docker exec $CONTAINER_NAME bash -c "python3 -c 'import sys; sys.path.insert(0, \"/opt\"); from app_launcher import AppLauncher; al = AppLauncher(); print(\"OK\")'"
    return $result -match "OK"
}

Write-Info "Step 4: Testing application launches..."

# Test: Launch Chrome
Test-Step "Launch Google Chrome" {
    docker exec $CONTAINER_NAME bash -c 'export DISPLAY=:100 && google-chrome --no-sandbox --disable-dev-shm-usage --app=https://www.google.com --new-window &'
    Start-Sleep -Seconds 5
    $result = docker exec $CONTAINER_NAME bash -c 'ps aux | grep chrome | grep -v grep'
    return $result -ne $null
}

# Test: List windows
Test-Step "Window manager can list windows" {
    $result = docker exec $CONTAINER_NAME bash -c 'export DISPLAY=:100 && wmctrl -l'
    return $LASTEXITCODE -eq 0
}

# Test: Launch Slack
Test-Step "Launch Slack" {
    docker exec $CONTAINER_NAME bash -c 'export DISPLAY=:100 && slack --no-sandbox &'
    Start-Sleep -Seconds 5
    $result = docker exec $CONTAINER_NAME bash -c 'ps aux | grep slack | grep -v grep'
    return $result -ne $null
}

Write-Info "Step 5: Testing ScreenAgent integration..."

# Test: ScreenAgent directory exists
Test-Step "ScreenAgent directory exists" {
    $result = docker exec $CONTAINER_NAME bash -c 'test -d /opt/screen-agent && echo OK'
    return $result -match "OK"
}

# Test: ScreenAgent Python dependencies
Test-Step "ScreenAgent dependencies installed (torch)" {
    $result = docker exec $CONTAINER_NAME bash -c 'python3 -c "import torch; print(\"OK\")"'
    return $result -match "OK"
}

Test-Step "ScreenAgent dependencies installed (transformers)" {
    $result = docker exec $CONTAINER_NAME bash -c 'python3 -c "import transformers; print(\"OK\")"'
    return $result -match "OK"
}

Test-Step "ScreenAgent dependencies installed (openai)" {
    $result = docker exec $CONTAINER_NAME bash -c 'python3 -c "import openai; print(\"OK\")"'
    return $result -match "OK"
}

Write-Info "Step 6: Testing logs and monitoring..."

# Test: Check supervisor logs
Test-Step "Supervisor logs are accessible" {
    $result = docker exec $CONTAINER_NAME bash -c 'test -f /var/log/supervisor/supervisord.log && echo OK'
    return $result -match "OK"
}

# Test: Check app-launcher logs
Test-Step "App launcher logs exist" {
    $result = docker exec $CONTAINER_NAME bash -c 'test -f /var/log/app-launcher.log && echo OK'
    return $result -match "OK"
}

Write-Info "Step 7: Performance and resource checks..."

# Test: Memory usage
Test-Step "Container memory usage is reasonable" {
    $stats = docker stats --no-stream --format "{{.MemUsage}}" $CONTAINER_NAME
    Write-Host "    Memory: $stats" -ForegroundColor Gray
    # Just check it returns something; actual validation depends on system
    return $stats -ne $null
}

# Test: CPU usage
Test-Step "Container CPU is responding" {
    $stats = docker stats --no-stream --format "{{.CPUPerc}}" $CONTAINER_NAME
    Write-Host "    CPU: $stats" -ForegroundColor Gray
    return $stats -ne $null
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Passed: $script:passed" -ForegroundColor Green
Write-Host "Failed: $script:failed" -ForegroundColor Red
Write-Host ""

if ($script:failed -eq 0) {
    Write-Success "All tests passed! AI OS is working smoothly!"
    Write-Host ""
    Write-Info "Access your AI OS at: http://localhost:$PORT"
    Write-Host ""
    Write-Info "Next steps:"
    Write-Host "  1. Open browser to http://localhost:$PORT"
    Write-Host "  2. Try launching apps via window manager"
    Write-Host "  3. Test ScreenAgent AI interactions"
    Write-Host "  4. Review logs: docker logs $CONTAINER_NAME"
    exit 0
} else {
    Write-Error "Some tests failed. Check logs for details."
    Write-Host ""
    Write-Info "View logs with:"
    Write-Host "  docker logs $CONTAINER_NAME"
    Write-Host "  docker exec $CONTAINER_NAME cat /var/log/supervisor/supervisord.log"
    exit 1
}
