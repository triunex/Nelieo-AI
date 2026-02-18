# 🔗 AI OS Integration Architecture

## Current Situation

### ✅ What Exists
1. **Frontend**: `src/pages/AIOS.tsx` - Beautiful desktop interface with:
   - Command input box (bottom of screen)
   - Window management (drag, resize, minimize)
   - App icons (Chrome, Gmail, Notion, Instagram, Facebook)
   - Agent communication via `/agent/v1/execute`

2. **Backend Container** (just built): `aios-xpra-app/`
   - Docker container with X11, Openbox, Xpra
   - 12 business apps (Chrome, Gmail, Notion, etc.)
   - ScreenAgent AI (GPT-4 Vision)
   - Window controller Python API
   - Streaming via Xpra on port 10005

### ❌ What's Missing
- **No connection** between frontend input box and backend ScreenAgent
- **No API bridge** to send user queries to ScreenAgent
- **No real-time feedback** from ScreenAgent to UI
- **No app state synchronization** between container and frontend
- **No workspace provisioning** integration

---

## 🎯 Integration Plan

### Architecture Overview

```
User Types Query in AIOS.tsx
         ↓
   Agent Bridge API (NEW)
         ↓
   ScreenAgent in Container
         ↓
   Executes in Real Apps (Chrome, Gmail, etc.)
         ↓
   Streams back to Frontend via Xpra
```

### Components to Build

#### 1. **Agent Bridge Service** (`src/services/aios-agent-bridge.ts`)
- Connects frontend to backend container
- Sends user queries to ScreenAgent
- Returns execution results
- Handles WebSocket for real-time updates

#### 2. **Container Manager** (`src/services/aios-container-manager.ts`)
- Provisions user workspaces (Docker containers)
- Manages container lifecycle (start/stop/restart)
- Monitors container health
- Maps user ID to container port

#### 3. **App Coordinator** (`src/services/aios-app-coordinator.ts`)
- Synchronizes app state between frontend and container
- Routes app launches to correct container
- Handles window focus/switching
- Updates UI based on container events

#### 4. **Enhanced AIOS.tsx**
- Connect command input to ScreenAgent
- Show real-time agent feedback
- Display Xpra stream in windows
- Handle multi-user workspace routing

---

## 🚀 Implementation Steps

### Phase 1: Basic Integration (30 minutes)
✅ Create Agent Bridge Service
✅ Update AIOS.tsx to use bridge
✅ Connect command input to ScreenAgent
✅ Display Xpra stream in Chrome window

### Phase 2: Container Management (1 hour)
✅ Create Container Manager Service
✅ Auto-provision workspace per user
✅ Dynamic port allocation
✅ Health monitoring

### Phase 3: Advanced Features (2 hours)
✅ Real-time agent feedback (WebSocket)
✅ App state synchronization
✅ Multi-window ScreenAgent tasks
✅ Screenshot/screen sharing integration

### Phase 4: Production Ready (3 hours)
✅ User authentication integration
✅ Workspace persistence (save state)
✅ Kubernetes deployment
✅ Load balancing and scaling

---

## 📝 Detailed Design

### 1. Agent Bridge Service

```typescript
// src/services/aios-agent-bridge.ts

export interface AgentQuery {
  userId: string;
  prompt: string;
  context?: any;
}

export interface AgentResponse {
  status: 'executing' | 'completed' | 'error';
  steps: Array<{
    action: string;
    app: string;
    result: string;
  }>;
  screenshot?: string;
  error?: string;
}

export class AIOSAgentBridge {
  private baseUrl: string;
  private wsConnection: WebSocket | null = null;
  
  constructor(userId: string) {
    // Get user's container endpoint
    this.baseUrl = this.getUserContainerUrl(userId);
  }
  
  async executeQuery(query: AgentQuery): Promise<AgentResponse> {
    // Send query to ScreenAgent in container
    const response = await fetch(`${this.baseUrl}/api/agent/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query)
    });
    return response.json();
  }
  
  subscribeToUpdates(callback: (update: any) => void) {
    // WebSocket for real-time feedback
    this.wsConnection = new WebSocket(`${this.baseUrl}/ws/agent`);
    this.wsConnection.onmessage = (event) => {
      callback(JSON.parse(event.data));
    };
  }
}
```

### 2. Container Manager Service

```typescript
// src/services/aios-container-manager.ts

export class AIOSContainerManager {
  private static instance: AIOSContainerManager;
  private userContainers: Map<string, ContainerInfo> = new Map();
  
  async provisionWorkspace(userId: string): Promise<ContainerInfo> {
    // Call provisioner API to create container
    const response = await fetch('http://localhost:3000/api/v1/workspace/provision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, email: user.email })
    });
    
    const container = await response.json();
    this.userContainers.set(userId, container);
    return container;
  }
  
  getContainerUrl(userId: string): string {
    const container = this.userContainers.get(userId);
    if (!container) throw new Error('No container for user');
    return `http://localhost:${container.port}`;
  }
  
  async checkHealth(userId: string): Promise<boolean> {
    const url = this.getContainerUrl(userId);
    try {
      const response = await fetch(`${url}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
```

### 3. Enhanced AIOS.tsx Integration

```typescript
// Changes to src/pages/AIOS.tsx

import { AIOSAgentBridge } from '@/services/aios-agent-bridge';
import { AIOSContainerManager } from '@/services/aios-container-manager';

// Inside component:
const [agentBridge, setAgentBridge] = useState<AIOSAgentBridge | null>(null);
const [agentFeedback, setAgentFeedback] = useState<string[]>([]);
const [containerReady, setContainerReady] = useState(false);

useEffect(() => {
  // Provision workspace when user logs in
  const initWorkspace = async () => {
    if (!auth.currentUser) return;
    
    const manager = AIOSContainerManager.getInstance();
    await manager.provisionWorkspace(auth.currentUser.uid);
    
    const bridge = new AIOSAgentBridge(auth.currentUser.uid);
    bridge.subscribeToUpdates((update) => {
      setAgentFeedback(prev => [...prev, update.message]);
    });
    
    setAgentBridge(bridge);
    setContainerReady(true);
  };
  
  initWorkspace();
}, [auth.currentUser]);

const runCommand = async (t: string) => {
  // ... existing simple commands ...
  
  // Send complex queries to ScreenAgent
  if (agentBridge && containerReady) {
    setAgentFeedback(['Agent is thinking...']);
    
    const response = await agentBridge.executeQuery({
      userId: auth.currentUser!.uid,
      prompt: t,
    });
    
    // Show feedback in UI
    setAgentFeedback(response.steps.map(s => 
      `${s.action} in ${s.app}: ${s.result}`
    ));
    
    // If agent opened an app, open corresponding window
    if (response.steps.some(s => s.action === 'open_app')) {
      // Open window with Xpra stream showing the app
      openWindow({
        appId: 'remoteChrome',
        title: 'AI Agent Workspace',
        payload: {
          url: `${agentBridge.baseUrl}:10005`,
          isStreaming: true
        }
      });
    }
  }
};
```

### 4. Backend API Endpoints (NEW)

Need to add to container:

```python
# aios-xpra-app/agent-api.py

from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
sys.path.insert(0, '/opt')
from app_launcher import AppLauncher
from window_controller import WindowController

app = Flask(__name__)
CORS(app)

launcher = AppLauncher()

@app.route('/api/agent/execute', methods=['POST'])
def execute_agent_query():
    data = request.json
    prompt = data.get('prompt')
    
    # Simple command routing (will be replaced by ScreenAgent)
    if 'open' in prompt.lower():
        if 'gmail' in prompt.lower():
            launcher.launch_app('Gmail')
            return jsonify({
                'status': 'completed',
                'steps': [{'action': 'open_app', 'app': 'Gmail', 'result': 'Opened Gmail'}]
            })
    
    # TODO: Send to ScreenAgent for complex queries
    return jsonify({
        'status': 'completed',
        'steps': [{'action': 'understood', 'app': 'agent', 'result': 'Processing...'}]
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8081)
```

---

## 🎨 UI/UX Enhancements

### Agent Feedback Panel
Add to AIOS.tsx bottom area (above command input):

```tsx
{agentFeedback.length > 0 && (
  <div className="agent-feedback-panel">
    {agentFeedback.map((msg, i) => (
      <div key={i} className="agent-step">
        <div className="agent-step-icon">✓</div>
        <div className="agent-step-text">{msg}</div>
      </div>
    ))}
  </div>
)}
```

### Loading States
```tsx
{!containerReady && (
  <div className="container-loading">
    <Loader className="animate-spin" />
    <span>Initializing your AI workspace...</span>
  </div>
)}
```

### Enhanced Command Input
```tsx
<input
  className="aios-input-field"
  placeholder={
    containerReady 
      ? "Ask me anything... (e.g., 'Reply to my latest email in Gmail')"
      : "Workspace loading..."
  }
  value={command}
  onChange={(e) => setCommand(e.target.value)}
  disabled={!containerReady}
/>
```

---

## 🔌 Port Mapping Strategy

### Development (Local)
- Frontend: `localhost:5173` (Vite)
- Provisioner API: `localhost:3000`
- User Container 1: `localhost:10005` (Xpra), `localhost:8081` (Agent API)
- User Container 2: `localhost:10006` (Xpra), `localhost:8082` (Agent API)

### Production (Kubernetes)
- Frontend: `https://aios.yourdomain.com`
- Provisioner API: `https://api.aios.yourdomain.com`
- User Containers: Dynamic subdomain per user
  - `https://user123.aios.yourdomain.com` (Xpra + Agent API)

---

## 🧪 Testing Strategy

### Integration Tests
1. User logs in → Container provisioned automatically
2. User types "Open Gmail" → Gmail opens in container + window appears
3. User types "Reply to latest email" → ScreenAgent executes in Gmail
4. User sees real-time feedback → Steps shown in UI
5. User clicks Chrome icon → Xpra stream loads in window

### Manual Testing Flow
```powershell
# 1. Start backend container
docker-compose -f docker-compose.aios.yml up -d

# 2. Start provisioner
cd provisioner
npm run dev

# 3. Start frontend
npm run dev

# 4. Open browser to localhost:5173
# 5. Login with Firebase auth
# 6. Type: "Open Chrome"
# 7. Verify: Window appears with Xpra stream
# 8. Type: "Go to Gmail and show my inbox"
# 9. Verify: Agent feedback appears + Gmail loads
```

---

## 📦 Files to Create/Modify

### New Files
- ✅ `src/services/aios-agent-bridge.ts` - Agent communication
- ✅ `src/services/aios-container-manager.ts` - Container lifecycle
- ✅ `src/services/aios-app-coordinator.ts` - App state sync
- ✅ `aios-xpra-app/agent-api.py` - Backend API for agent
- ✅ `aios-xpra-app/websocket-server.py` - Real-time updates

### Modified Files
- ✅ `src/pages/AIOS.tsx` - Integrate services, add feedback UI
- ✅ `aios-xpra-app/Dockerfile` - Add Flask, expose port 8081
- ✅ `aios-xpra-app/supervisord.conf` - Run agent-api.py
- ✅ `docker-compose.aios.yml` - Map port 8081

---

## 🚀 Next Steps - Priority Order

### Immediate (Do Now)
1. ✅ Create `agent-api.py` - Basic Flask API for agent queries
2. ✅ Update Dockerfile to install Flask and expose port 8081
3. ✅ Create `aios-agent-bridge.ts` - Frontend service
4. ✅ Update AIOS.tsx to use agent bridge
5. ✅ Test: Type "Open Gmail" → See it work

### Short-term (Today)
6. ✅ Add WebSocket for real-time feedback
7. ✅ Create container manager for multi-user
8. ✅ Add agent feedback panel to UI
9. ✅ Integrate ScreenAgent for complex queries
10. ✅ Test: "Reply to my latest email" → See ScreenAgent work

### Medium-term (This Week)
11. Deploy provisioner API
12. Kubernetes integration
13. User authentication flow
14. Workspace persistence
15. Production testing

---

## ❓ Questions to Answer

1. **Authentication**: Should each user get their own container automatically on login?
   - **Answer**: Yes, provision on first login, reuse existing container on subsequent logins

2. **Container Lifecycle**: How long should idle containers stay alive?
   - **Answer**: 30 minutes idle timeout, save state to volume before shutdown

3. **Scaling**: How many concurrent users?
   - **Answer**: Start with 10 concurrent (10 containers), scale to 100+ with K8s

4. **Pricing**: Will users see their container or just the UI?
   - **Answer**: Users only see UI windows, container is invisible backend

---

## 💡 Key Insights

1. **Your existing AIOS.tsx is the UI** - Keep it beautiful, just connect backend
2. **Container is invisible** - Users never know it exists
3. **Agent bridge is the glue** - All queries route through it
4. **Xpra streams into windows** - Existing window system works perfectly
5. **ScreenAgent is the brain** - Executes real actions in real apps

---

**Ready to implement? I'll start with the immediate priority items!**
