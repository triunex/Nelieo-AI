# AI OS Management Script
# Quick commands to manage your AI OS container

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("start", "stop", "restart", "logs", "status", "shell", "rebuild", "clean")]
    [string]$Command = "status"
)

$composeFile = "docker-compose.aios.yml"
$containerName = "aios_nelieo_phase1"

Write-Host ""
Write-Host "🤖 AI OS Manager" -ForegroundColor Cyan
Write-Host "=================" -ForegroundColor Cyan
Write-Host ""

switch ($Command) {
    "start" {
        Write-Host "Starting AI OS..." -ForegroundColor Green
        docker compose -f $composeFile up -d
        Write-Host "✅ AI OS started! Access at: http://localhost:10005" -ForegroundColor Green
    }
    
    "stop" {
        Write-Host "Stopping AI OS..." -ForegroundColor Yellow
        docker compose -f $composeFile down
        Write-Host "✅ AI OS stopped" -ForegroundColor Green
    }
    
    "restart" {
        Write-Host "Restarting AI OS..." -ForegroundColor Yellow
        docker compose -f $composeFile restart
        Write-Host "✅ AI OS restarted! Access at: http://localhost:10005" -ForegroundColor Green
    }
    
    "logs" {
        Write-Host "Showing live logs (Press Ctrl+C to exit)..." -ForegroundColor Cyan
        Write-Host ""
        docker compose -f $composeFile logs -f
    }
    
    "status" {
        Write-Host "AI OS Status:" -ForegroundColor Cyan
        Write-Host ""
        docker compose -f $composeFile ps
        Write-Host ""
        
        # Check if container is running
        $running = docker ps -q -f name=$containerName
        if ($running) {
            Write-Host "✅ AI OS is RUNNING" -ForegroundColor Green
            Write-Host "🌐 Access at: http://localhost:10005" -ForegroundColor Cyan
            Write-Host ""
            
            # Show supervisor status
            Write-Host "App Status:" -ForegroundColor Yellow
            docker exec $containerName supervisorctl status 2>$null
        } else {
            Write-Host "❌ AI OS is NOT running" -ForegroundColor Red
            Write-Host "Run: .\manage-aios.ps1 start" -ForegroundColor Yellow
        }
    }
    
    "shell" {
        Write-Host "Opening shell in AI OS container..." -ForegroundColor Cyan
        docker exec -it $containerName bash
    }
    
    "rebuild" {
        Write-Host "Rebuilding AI OS (this may take several minutes)..." -ForegroundColor Yellow
        docker compose -f $composeFile down
        docker compose -f $composeFile build --no-cache
        docker compose -f $composeFile up -d
        Write-Host "✅ AI OS rebuilt and started!" -ForegroundColor Green
    }
    
    "clean" {
        Write-Host "Cleaning up AI OS (removing volumes)..." -ForegroundColor Yellow
        $confirm = Read-Host "This will delete all data. Continue? (yes/no)"
        if ($confirm -eq "yes") {
            docker compose -f $composeFile down -v
            Write-Host "✅ AI OS cleaned" -ForegroundColor Green
        } else {
            Write-Host "Cancelled" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "Available commands:" -ForegroundColor Gray
Write-Host "  .\manage-aios.ps1 start      - Start AI OS" -ForegroundColor Gray
Write-Host "  .\manage-aios.ps1 stop       - Stop AI OS" -ForegroundColor Gray
Write-Host "  .\manage-aios.ps1 restart    - Restart AI OS" -ForegroundColor Gray
Write-Host "  .\manage-aios.ps1 logs       - View live logs" -ForegroundColor Gray
Write-Host "  .\manage-aios.ps1 status     - Check status" -ForegroundColor Gray
Write-Host "  .\manage-aios.ps1 shell      - Open container shell" -ForegroundColor Gray
Write-Host "  .\manage-aios.ps1 rebuild    - Rebuild container" -ForegroundColor Gray
Write-Host "  .\manage-aios.ps1 clean      - Clean all data" -ForegroundColor Gray
Write-Host ""
