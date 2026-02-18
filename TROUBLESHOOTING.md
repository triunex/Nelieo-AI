# 🔧 Quick Fix Guide - ECONNREFUSED Error

## Problem
The error `ECONNREFUSED` means the frontend can't connect to the backend API because **Docker Desktop is not running**.

```
[vite] http proxy error: /api/superagent/execute
AggregateError [ECONNREFUSED]:
```

This happens because:
- Frontend tries to call `/api/superagent/execute`
- Vite proxy forwards to `http://localhost:10000`
- But Docker container (backend) is not running
- Connection refused!

---

## Solution

### Step 1: Start Docker Desktop
1. Open **Docker Desktop** application (search in Windows Start menu)
2. Wait for Docker to fully start (~30-60 seconds)
3. You'll see the Docker whale icon in system tray turn solid (not flashing)

### Step 2: Start the AIOS Container
```powershell
# Start the container
docker start aios_nelieo_phase1

# Wait 10-15 seconds for backend to initialize
Start-Sleep -Seconds 15

# Check if it's running
docker ps --filter "name=aios_nelieo_phase1"
```

You should see:
```
CONTAINER ID   IMAGE          COMMAND     STATUS         PORTS
abc123...      aios-image     ...         Up 10 seconds  0.0.0.0:10000->10000/tcp, 0.0.0.0:10005->10005/tcp
```

### Step 3: Verify Backend API
```powershell
# Test the health endpoint
Invoke-RestMethod -Uri "http://localhost:10000/health" -Method GET
```

Expected response:
```json
{"status": "healthy"}
```

### Step 4: Test in Browser
1. Go to http://localhost:8080
2. Try a simple command: "Open Chrome"
3. You should see:
   - Toast: "🤖 Understanding Your Task"
   - Chrome window opens with Xpra stream
   - No ECONNREFUSED errors

---

## How to Check Live Logs

### Frontend Logs (Vite):
Already visible in your terminal where you ran `npm run dev`

### Backend Logs (Docker Container):

#### Method 1: Real-time streaming (Best for debugging)
```powershell
# Stream logs as they happen (press Ctrl+C to stop)
docker logs -f aios_nelieo_phase1
```

#### Method 2: Last N lines
```powershell
# Show last 100 lines
docker logs aios_nelieo_phase1 --tail 100

# Show last 50 lines with timestamps
docker logs aios_nelieo_phase1 --tail 50 --timestamps
```

#### Method 3: Check specific log file inside container
```powershell
# View agent API logs
docker exec aios_nelieo_phase1 tail -f /var/log/agent-api.log

# View last 200 lines
docker exec aios_nelieo_phase1 tail -200 /var/log/agent-api.log

# Search for specific errors
docker exec aios_nelieo_phase1 tail -500 /var/log/agent-api.log | Select-String "ERROR"

# Search for rate limit errors
docker exec aios_nelieo_phase1 tail -500 /var/log/agent-api.log | Select-String "429"
```

### Combined View (Frontend + Backend):
Open **two PowerShell windows**:

**Window 1** (Frontend):
```powershell
npm run dev
```

**Window 2** (Backend logs):
```powershell
docker logs -f aios_nelieo_phase1
```

---

## Common Issues & Fixes

### Issue 1: Docker Desktop Won't Start
**Symptoms**: Docker Desktop stuck at "Starting..."
**Fix**:
1. Close Docker Desktop completely
2. Open Task Manager (Ctrl+Shift+Esc)
3. End all Docker-related processes
4. Restart Docker Desktop
5. Wait 1-2 minutes

### Issue 2: Container Exists but Won't Start
**Symptoms**: `docker start` fails
**Fix**:
```powershell
# Check container status
docker ps -a --filter "name=aios_nelieo_phase1"

# If status is "Exited", check logs for error
docker logs aios_nelieo_phase1 --tail 50

# Remove and recreate container (if needed)
docker stop aios_nelieo_phase1
docker rm aios_nelieo_phase1

# Then rebuild from docker-compose
docker compose -f docker-compose.demo.yml up -d
```

### Issue 3: Port Already in Use
**Symptoms**: "Port 10000 is already allocated"
**Fix**:
```powershell
# Find what's using port 10000
netstat -ano | Select-String "10000"

# Kill the process (use PID from above command)
Stop-Process -Id <PID> -Force

# Or restart container
docker restart aios_nelieo_phase1
```

### Issue 4: Container Running but API Not Responding
**Symptoms**: Container shows "Up" but health check fails
**Fix**:
```powershell
# Check if API process is running inside container
docker exec aios_nelieo_phase1 ps aux | Select-String "python"

# Check backend logs for startup errors
docker logs aios_nelieo_phase1 --tail 100

# Restart container
docker restart aios_nelieo_phase1
Start-Sleep -Seconds 15

# Test again
Invoke-RestMethod -Uri "http://localhost:10000/health"
```

---

## Quick Diagnostic Script

```powershell
Write-Host "=== AIOS Diagnostic ===" -ForegroundColor Cyan

# 1. Check Docker
Write-Host "`n1. Docker Desktop Status:" -ForegroundColor Yellow
Get-Service -Name "com.docker.service" | Select-Object Name, Status

# 2. Check Container
Write-Host "`n2. Container Status:" -ForegroundColor Yellow
docker ps -a --filter "name=aios_nelieo_phase1" --format "{{.Names}}: {{.Status}}"

# 3. Check API
Write-Host "`n3. API Health Check:" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:10000/health" -TimeoutSec 3
    Write-Host "✅ API is healthy: $($health | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "❌ API not responding: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Check Ports
Write-Host "`n4. Port Usage:" -ForegroundColor Yellow
Write-Host "Port 10000 (API):"
netstat -ano | Select-String "10000" | Select-Object -First 3
Write-Host "`nPort 10005 (Xpra):"
netstat -ano | Select-String "10005" | Select-Object -First 3

Write-Host "`n=== End Diagnostic ===" -ForegroundColor Cyan
```

Save this as `diagnostic.ps1` and run: `./diagnostic.ps1`

---

## Testing After Fix

Once Docker is running and container started:

### Test 1: Backend API
```powershell
Invoke-RestMethod -Uri "http://localhost:10000/health"
```
Expected: `{"status": "healthy"}`

### Test 2: Frontend Connection
1. Open http://localhost:8080
2. Open browser DevTools (F12)
3. Go to Network tab
4. Type command: "Open Chrome"
5. Check Network tab - should see POST to `/api/superagent/execute` with status 200 (not error)

### Test 3: Xpra Stream
Open http://localhost:10005 in browser
Expected: Xpra desktop interface loads

---

## Current Status Checklist

- [ ] Docker Desktop is running
- [ ] Container `aios_nelieo_phase1` is started
- [ ] API responds at http://localhost:10000/health
- [ ] Frontend can reach backend (no ECONNREFUSED)
- [ ] Xpra stream accessible at http://localhost:10005

Once all checked, try your commands again! 🚀

---

## Next Steps After Fix

1. ✅ Start Docker Desktop
2. ✅ Start container: `docker start aios_nelieo_phase1`
3. ✅ Wait 15 seconds for backend to initialize
4. ✅ Test health: `Invoke-RestMethod -Uri "http://localhost:10000/health"`
5. ✅ Try command in AIOS: "Open Chrome"
6. ✅ Verify apps open with intent detection
7. ✅ Run full test suite: `./test-intent-detection.ps1`

**Then you're ready to record the demo video!** 🎥
