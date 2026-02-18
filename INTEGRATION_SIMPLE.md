# 🚀 AI OS - Complete Integration Guide

## Quick Start (5 minutes)

### 1. Start the Backend Container

```powershell
.\quick-start.ps1
```

This will:
- Build the Docker container with all 12 apps
- Start X11, Openbox, Xpra, and Agent API
- Make it accessible at `localhost:10005` (desktop) and `localhost:8081` (API)

### 2. Update Frontend (One-Time Setup)

Open `src/pages/AIOS.tsx` and add these lines:

**At the top (imports):**
```typescript
import AgentBridgeManager, { AIOSAgentBridge, AgentUpdate } from '@/services/aios-agent-bridge';
```

**Inside component (after other useState declarations):**
```typescript
const [agentBridge, setAgentBridge] = useState<AIOSAgentBridge | null>(null);
const [agentFeedback, setAgentFeedback] = useState<AgentUpdate[]>([]);
const [containerReady, setContainerReady] = useState(false);
```

**Add useEffect to initialize bridge:**
```typescript
useEffect(() => {
  const initBridge = async () => {
    const userId = auth.currentUser?.uid || 'demo-user';
    const bridge = AgentBridgeManager.getBridge(userId);
    
    bridge.subscribeToUpdates((update) => {
      setAgentFeedback(prev => [...prev, update]);
    });
    
    const isHealthy = await bridge.checkHealth();
    setContainerReady(isHealthy);
    
    if (!isHealthy) {
      setTimeout(async () => {
        const retry = await bridge.checkHealth();
        setContainerReady(retry);
      }, 30000);
    }
    
    setAgentBridge(bridge);
  };
  
  initBridge();
  
  return () => {
    if (auth.currentUser) {
      AgentBridgeManager.cleanup(auth.currentUser.uid);
    }
  };
}, [auth.currentUser]);
```

**Update the runCommand function:**
```typescript
const runCommand = async (t: string) => {
  // Handle simple "open <app>" commands
  const appId = (Object.keys(APPS) as AppId[]).find((k) =>
    t.toLowerCase().includes(k.replace("remote", "").toLowerCase())
  );

  if (appId && t.toLowerCase().startsWith("open")) {
    // Open window with Xpra stream
    const streamingUrl = agentBridge?.getStreamingUrl() || "http://localhost:10005";
    
    APPS[appId].launch((partial) => {
      openWindow({
        ...partial,
        payload: {
          ...partial.payload,
          url: streamingUrl,
          isStreaming: true,
        }
      });
    });
    
    // Send to agent to launch in container
    if (agentBridge && containerReady) {
      await agentBridge.executeQuery(t);
    }
    return;
  }

  // All other commands go to agent
  if (!agentBridge || !containerReady) {
    toast({
      title: "Workspace Not Ready",
      description: "Please wait for your AI workspace to initialize.",
      variant: "destructive",
    });
    return;
  }

  try {
    setAgentFeedback([]);
    const response = await agentBridge.executeQuery(t);
    
    toast({
      title: "Task Completed",
      description: response.steps.map(s => 
        `${s.action} in ${s.app}: ${s.result}`
      ).join('\n'),
    });
  } catch (error) {
    toast({
      title: "Agent Error",
      description: error instanceof Error ? error.message : "Connection failed",
      variant: "destructive",
    });
  }
};
```

### 3. Start Frontend

```powershell
npm run dev
```

### 4. Test It!

1. Open `http://localhost:5173` (your frontend)
2. Type in command box: **"open chrome"**
3. You should see:
   - A window appear with the Xpra stream
   - Chrome running inside the container
   - Real browser you can interact with!

4. Try more commands:
   - `"open gmail"`
   - `"open slack"`
   - `"list windows"`

---

## How It Works

```
┌─────────────────────────────────────────────┐
│  AIOS.tsx (Your Beautiful Frontend)        │
│  - Command input box                        │
│  - Window management                        │
│  - User interface                           │
└─────────────┬───────────────────────────────┘
              │ User types command
              ↓
┌─────────────────────────────────────────────┐
│  aios-agent-bridge.ts (Service Layer)      │
│  - executeQuery(prompt)                     │
│  - WebSocket for real-time updates          │
└─────────────┬───────────────────────────────┘
              │ HTTP POST to localhost:8081
              ↓
┌─────────────────────────────────────────────┐
│  agent-api.py (Flask REST API)             │
│  - Receives query                           │
│  - Routes to app_launcher or ScreenAgent    │
│  - Returns execution steps                  │
└─────────────┬───────────────────────────────┘
              │ Executes command
              ↓
┌─────────────────────────────────────────────┐
│  Docker Container (Backend)                 │
│  - X11 display server                       │
│  - Openbox window manager                   │
│  - 12 real apps (Chrome, Gmail, etc.)       │
│  - ScreenAgent AI                           │
│  - Xpra streaming (port 10005)              │
└─────────────┬───────────────────────────────┘
              │ Streams desktop
              ↓
┌─────────────────────────────────────────────┐
│  Frontend Window (Xpra iframe)             │
│  - Shows real app running in container      │
│  - User can interact with it                │
└─────────────────────────────────────────────┘
```

---

## API Endpoints

### Agent API (localhost:8081)

**POST /api/agent/execute**
```json
{
  "userId": "user123",
  "prompt": "open gmail"
}
```
Response:
```json
{
  "status": "completed",
  "steps": [
    {
      "action": "open_app",
      "app": "Gmail",
      "result": "Opened successfully"
    }
  ]
}
```

**GET /api/windows**
Lists all open windows

**GET /api/apps**
Lists all available apps

**GET /health**
Health check

### WebSocket Events

Connect to `ws://localhost:8081`

**Subscribe:**
```javascript
socket.emit('subscribe', { userId: 'user123' });
```

**Receive updates:**
```javascript
socket.on('agent_update', (data) => {
  console.log(data.message); // "Opening Gmail..."
});
```

---

## Troubleshooting

### Container won't start
```powershell
# Check Docker
docker ps

# View logs
docker logs aios_nelieo_phase1 -f

# Rebuild
docker-compose -f docker-compose.aios.yml down
docker-compose -f docker-compose.aios.yml up -d --build
```

### Can't access localhost:10005
```powershell
# Check if Xpra is running
docker exec aios_nelieo_phase1 bash -c 'ps aux | grep xpra'

# Check logs
docker exec aios_nelieo_phase1 cat /var/log/supervisor/xpra.log
```

### Agent API not responding
```powershell
# Check if API is running
docker exec aios_nelieo_phase1 bash -c 'ps aux | grep agent-api'

# Check logs
docker exec aios_nelieo_phase1 cat /var/log/supervisor/agent_api.log

# Test endpoint
curl http://localhost:8081/health
```

### Frontend can't connect
1. Make sure backend is running: `docker ps`
2. Make sure ports are accessible: `netstat -ano | findstr :8081`
3. Check browser console for errors
4. Verify socket.io-client is installed: `npm list socket.io-client`

---

## File Structure

```
lumina-search-flow-main/
├── src/
│   ├── pages/
│   │   └── AIOS.tsx              # Your frontend (needs updates)
│   └── services/
│       └── aios-agent-bridge.ts   # ✅ Agent communication service
│
├── aios-xpra-app/
│   ├── Dockerfile                 # ✅ Container definition
│   ├── agent-api.py               # ✅ Flask REST API
│   ├── app-launcher.py            # ✅ App launcher
│   ├── window_controller.py       # ✅ Window management
│   ├── run-screen-agent.sh        # ✅ ScreenAgent startup
│   └── supervisord.conf           # ✅ Process manager
│
├── docker-compose.aios.yml        # ✅ Docker Compose config
├── quick-start.ps1                # ✅ Quick deployment script
└── .env.example                   # ✅ Environment variables template
```

---

## Next Steps

1. ✅ Backend is ready (container with all apps)
2. ✅ Agent API is ready (Flask + WebSocket)
3. ✅ Agent Bridge service is ready (frontend service)
4. ⏳ **Update AIOS.tsx** (follow Step 2 above)
5. ⏳ **Test integration** (follow Step 4 above)
6. ⏳ **Add ScreenAgent AI** (for complex queries)
7. ⏳ **Deploy to production** (Kubernetes)

---

## 🎉 You're Almost There!

The backend is **100% ready**. Just need to connect your beautiful frontend by following **Step 2** above!

Once connected, users can:
- Type natural language commands
- See real apps running in real-time
- Have ScreenAgent AI execute complex tasks
- All through your beautiful AIOS.tsx interface!
