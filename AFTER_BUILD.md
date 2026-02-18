# 🚀 AI OS - After Build Completes

## What's Happening Now

Docker is building your AI OS container. This takes **10-15 minutes** on first build.

### What's Being Installed:
1. ✅ Ubuntu 22.04 base
2. ⏳ Xpra streaming server (from Ubuntu repos)
3. ⏳ Google Chrome
4. ⏳ Microsoft Edge
5. ⏳ Slack desktop app
6. ⏳ Zoom
7. ⏳ Python + AI dependencies (torch, transformers, openai)
8. ⏳ Flask API server
9. ⏳ Window management tools
- iemdd wo. instagram,telegram
10. ⏳ All configuration files

---

## Once Build Completes

### Step 1: Start the Container

The build command will automatically start it, or run:
```powershell
docker-compose -f docker-compose.aios.yml up -d
```

### Step 2: Wait for Services (30 seconds)

```powershell
Start-Sleep -Seconds 30
```

### Step 3: Check It's Running

```powershell
# Check container is up
docker ps | Select-String "aios"

# Check logs
docker logs aios_nelieo_phase1 --tail 50
```

### Step 4: Test Xpra Desktop

Open browser to: **http://localhost:10005**

You should see a Linux desktop!

### Step 5: Test Agent API

```powershell
curl http://localhost:8081/health
```

Should return: `{"status":"healthy"}`

---

## Next: Integrate with Frontend

### Option A: Quick Test (No Frontend Changes)

Test the backend directly:

```powershell
# Open Chrome via API
$body = @{
    userId = "test-user"
    prompt = "open chrome"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8081/api/agent/execute" -Method POST -Body $body -ContentType "application/json"
```

Then check http://localhost:10005 - Chrome should be opening!

### Option B: Full Integration (Update AIOS.tsx)

See **INTEGRATION_SIMPLE.md** for step-by-step guide to connect your frontend.

Key changes to `src/pages/AIOS.tsx`:

1. **Import agent bridge:**
```typescript
import AgentBridgeManager from '@/services/aios-agent-bridge';
```

2. **Initialize on mount:**
```typescript
useEffect(() => {
  const bridge = AgentBridgeManager.getBridge('demo-user');
  bridge.checkHealth().then(setContainerReady);
  setAgentBridge(bridge);
}, []);
```

3. **Update runCommand:**
```typescript
const runCommand = async (t: string) => {
  if (agentBridge && containerReady) {
    const response = await agentBridge.executeQuery(t);
    // Show response in UI
  }
};
```

---

## Troubleshooting

### Build Failed with Xpra Error
✅ **FIXED** - Now using Ubuntu's Xpra package instead of xpra.org repo

### Build Failed with Network Error
```powershell
# Retry with cache
docker-compose -f docker-compose.aios.yml build
```

### Build Takes Too Long
This is normal! First build downloads:
- Ubuntu base image (~100MB)
- Chrome (~300MB)
- Edge (~200MB)
- Python packages (~1GB)
- Total: ~1.5-2GB

### Container Won't Start After Build
```powershell
# Check logs
docker logs aios_nelieo_phase1 -f

# Restart
docker-compose -f docker-compose.aios.yml restart
```

### Port Already in Use
```powershell
# Find what's using port 10005
netstat -ano | findstr :10005

# Kill the process or change port in docker-compose.aios.yml
```

---

## Verification Commands

After container starts, run these to verify everything:

```powershell
# 1. Container is running
docker ps --filter "name=aios_nelieo_phase1"

# 2. Xvfb (X11 display) is running
docker exec aios_nelieo_phase1 bash -c 'ps aux | grep Xvfb'

# 3. Xpra is running
docker exec aios_nelieo_phase1 bash -c 'ps aux | grep xpra'

# 4. Agent API is running
docker exec aios_nelieo_phase1 bash -c 'ps aux | grep agent-api'

# 5. Check all logs
docker exec aios_nelieo_phase1 supervisorctl status
```

Expected output:
```
agent-api                        RUNNING   pid 123, uptime 0:01:00
app-manager                      EXITED    Oct 19 04:20 PM
screen-agent                     RUNNING   pid 124, uptime 0:01:00
xpra                            RUNNING   pid 122, uptime 0:01:00
```

---

## What Each Service Does

| Service      | Purpose                           | Log File                          |
|--------------|-----------------------------------|-----------------------------------|
| xpra         | Streams desktop to browser        | /var/log/supervisor/xpra.log      |
| agent-api    | Handles commands from frontend    | /var/log/supervisor/agent_api.log |
| screen-agent | AI agent (if ScreenAgent exists)  | /var/log/supervisor/screen_agent.log |
| app-manager  | Launches Phase 1 apps on startup  | /var/log/supervisor/app_manager.log |

---

## Quick Demo Commands

Once container is running, try these API calls:

### 1. List Available Apps
```powershell
Invoke-RestMethod -Uri "http://localhost:8081/api/apps"
```

### 2. Open Chrome
```powershell
$body = @{
    userId = "demo"
    prompt = "open chrome"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8081/api/agent/execute" -Method POST -Body $body -ContentType "application/json"
```

### 3. List Windows
```powershell
Invoke-RestMethod -Uri "http://localhost:8081/api/windows"
```

### 4. Open Gmail
```powershell
$body = @{
    userId = "demo"
    prompt = "open gmail"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8081/api/agent/execute" -Method POST -Body $body -ContentType "application/json"
```

---

## Performance Tips

### First Launch is Slow
- X11 needs to initialize
- Apps need to start
- Give it 60-90 seconds

### Improve Speed
```powershell
# Allocate more RAM to Docker (Docker Desktop settings)
# Recommended: 8GB RAM, 4 CPUs

# Use SSD storage for faster I/O
```

### Reduce Resource Usage
Edit `docker-compose.aios.yml`:
```yaml
deploy:
  resources:
    limits:
      memory: 4G  # Reduce from 8G if needed
      cpus: '2'   # Reduce from 4 if needed
```

---

## After Everything Works

### Save the Image
```powershell
# Tag the image
docker tag aios-xpra-app:latest aios-xpra-app:v1.0

# Save to file (for backup)
docker save aios-xpra-app:latest -o aios-v1.0.tar
```

### Push to Registry (For Production)
```powershell
# Tag for your registry
docker tag aios-xpra-app:latest your-registry.com/aios:latest

# Push
docker push your-registry.com/aios:latest
```

---

## Success Checklist

- [ ] Build completed without errors
- [ ] Container is running (`docker ps`)
- [ ] Xpra accessible at http://localhost:10005
- [ ] Agent API responds at http://localhost:8081/health
- [ ] Can see Linux desktop in browser
- [ ] Can open apps via API
- [ ] Frontend can connect (after AIOS.tsx update)

---

**Once build completes and container starts, you're ready to integrate with your frontend!**

See **INTEGRATION_SIMPLE.md** for the final 10-minute integration steps.
