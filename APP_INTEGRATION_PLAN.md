# AI OS App Integration Plan

## Current Container Apps (12 total)

Based on `/opt/apps/configs/` in container:

1. **Chrome** - google-chrome → https://www.google.com
2. **Gmail** - google-chrome → https://mail.google.com  
3. **Notion** - google-chrome → https://www.notion.so
4. **Instagram** - google-chrome → https://www.instagram.com
5. **Facebook** - google-chrome → https://www.facebook.com
6. **Salesforce** - google-chrome → https://login.salesforce.com
7. **QuickBooks** - google-chrome → https://quickbooks.intuit.com
8. **Slack** - slack (native app)
9. **LinkedIn** - microsoft-edge → https://www.linkedin.com
10. **Google Sheets** - google-chrome → https://sheets.google.com
11. **Zoom** - zoom (native app)
12. **Asana** - google-chrome → https://app.asana.com

## Required App Logos

### Existing Logos (in `src/AI OS app logos/`):
- ✅ Chrome: `nhqu30ud.png`
- ✅ Gmail: `3nh7w077.png`
- ✅ Notion: `wzky7zfz.png`
- ✅ Instagram: `1725819461instagram-logo.png`
- ✅ Facebook: `facebook-logo-vector-8730.png`

### Missing Logos (need to add):
- ❌ Salesforce
- ❌ QuickBooks
- ❌ Slack
- ❌ LinkedIn
- ❌ Google Sheets
- ❌ Zoom
- ❌ Asana

## App Display Strategy

### Problem:
Currently AIOS.tsx shows full Xpra desktop at `http://localhost:10005` which displays ALL apps + OS interface.

### Solution:
**Option 1: Individual Xpra Sessions (Recommended)**
- Launch each app in its own Xpra session on different ports
- Chrome: port 10005
- Gmail: port 10006
- Notion: port 10007
- etc.

**Option 2: Window-specific Xpra URLs**
- Use Xpra's window filtering: `http://localhost:10005?window=<window_id>`
- Query Agent API for window ID when opening app
- Connect to that specific window only

**Option 3: Direct Web Apps (Hybrid)**
- For web-based apps (Gmail, Sheets, etc.), use direct iframe embedding
- Only use Xpra for native apps (Slack, Zoom)

## Recommended Implementation

### Step 1: Use lucide-react Icons for Missing Logos
Instead of downloading logo files, use icons from lucide-react library:

```tsx
import {
  Chrome,      // ✅ Already exists
  Mail,        // ✅ Gmail
  FileText,    // ✅ Notion (close enough)
  Instagram,   // ✅ Instagram
  Facebook,    // ✅ Facebook (if available, else custom)
  Cloud,       // Salesforce (cloud icon)
  DollarSign,  // QuickBooks
  MessageSquare, // Slack
  Linkedin,    // LinkedIn
  Sheet,       // Google Sheets
  Video,       // Zoom
  CheckSquare, // Asana
} from "lucide-react";
```

### Step 2: Update AIOS.tsx App Definitions

```tsx
type AppId =
  | "chrome"
  | "gmail"
  | "notion"
  | "instagram"
  | "facebook"
  | "salesforce"
  | "quickbooks"
  | "slack"
  | "linkedin"
  | "sheets"
  | "zoom"
  | "asana";

const APPS: Record<AppId, AppDefinition> = {
  chrome: {
    id: "chrome",
    name: "Chrome",
    icon: Chrome,
    category: "browser",
    launch: (open) => openApp("chrome", "Chrome Browser", open)
  },
  gmail: {
    id: "gmail",
    name: "Gmail",
    icon: Mail,
    category: "productivity",
    launch: (open) => openApp("gmail", "Gmail", open)
  },
  // ... etc for all 12 apps
};
```

### Step 3: Integrate Agent Bridge

```tsx
import AgentBridgeManager from '@/services/aios-agent-bridge';

// In component:
const [agentBridge, setAgentBridge] = useState<AIOSAgentBridge | null>(null);
const [containerReady, setContainerReady] = useState(false);

useEffect(() => {
  const initBridge = async () => {
    const bridge = AgentBridgeManager.getBridge('current-user-id');
    
    // Check if container is ready
    const health = await bridge.checkHealth();
    if (health.status === 'healthy') {
      setContainerReady(true);
      setAgentBridge(bridge);
      
      // Subscribe to updates
      bridge.subscribeToUpdates((update) => {
        console.log('Agent update:', update);
        // Show notification or update UI
      });
    }
  };
  
  initBridge();
}, []);
```

### Step 4: Update runCommand Function

```tsx
const runCommand = async (prompt: string) => {
  if (!agentBridge || !containerReady) {
    toast({
      title: "Container not ready",
      description: "Please wait for the AI OS container to start",
      variant: "destructive"
    });
    return;
  }
  
  // Send command to agent
  const result = await agentBridge.executeQuery(prompt);
  
  if (result.status === 'completed') {
    // Find which app was opened
    const openedApp = result.steps.find(s => s.action === 'open_app');
    
    if (openedApp) {
      // Open window showing ONLY that app via Xpra
      openWindow({
        appId: "remoteApp",
        title: openedApp.app,
        payload: {
          streamUrl: `http://localhost:10005`,
          appName: openedApp.app,
          hideDesktop: true
        }
      });
    }
  }
};
```

### Step 5: Individual App Streaming (Advanced)

Modify container to start multiple Xpra sessions:

```bash
# In start.sh or supervisord.conf
xpra start :100 --bind-tcp=0.0.0.0:10005 --html=on  # Main desktop
xpra start :101 --bind-tcp=0.0.0.0:10006 --html=on  # Chrome only
xpra start :102 --bind-tcp=0.0.0.0:10007 --html=on  # Gmail only
# etc...
```

Then launch each app in its specific display:
```bash
DISPLAY=:101 google-chrome --app=https://www.google.com
DISPLAY=:102 google-chrome --app=https://mail.google.com
```

## Final AIOS.tsx Structure

```tsx
const CONTAINER_APPS = [
  { id: 'chrome', name: 'Chrome', port: 10005 },
  { id: 'gmail', name: 'Gmail', port: 10006 },
  { id: 'notion', name: 'Notion', port: 10007 },
  { id: 'instagram', name: 'Instagram', port: 10008 },
  { id: 'facebook', name: 'Facebook', port: 10009 },
  { id: 'salesforce', name: 'Salesforce', port: 10010 },
  { id: 'quickbooks', name: 'QuickBooks', port: 10011 },
  { id: 'slack', name: 'Slack', port: 10012 },
  { id: 'linkedin', name: 'LinkedIn', port: 10013 },
  { id: 'sheets', name: 'Google Sheets', port: 10014 },
  { id: 'zoom', name: 'Zoom', port: 10015 },
  { id: 'asana', name: 'Asana', port: 10016 },
];
```

## Implementation Priority

1. **Quick Win** (10 minutes):
   - Update app list to match container apps
   - Use lucide-react icons
   - Connect agent bridge

2. **Medium** (30 minutes):
   - Integrate agent commands
   - Test app launching
   - Show only app interface (not full desktop)

3. **Advanced** (2 hours):
   - Multiple Xpra sessions per app
   - Window-specific streaming
   - Better UI feedback

## Next Steps

Choose implementation approach:
- **Fast**: Update apps, use existing single Xpra stream
- **Complete**: Implement per-app Xpra sessions for clean UI
