# ✅ AIOS.tsx Updated for Container Integration

## Changes Made

### 1. Updated App List (12 Container Apps)

**Old Apps (5):**
- remoteChrome
- remoteNotion
- remoteGmail
- remoteInstagram
- remoteFacebook

**New Apps (12) - Matches Container:**
1. ✅ **chrome** - Chrome Browser
2. ✅ **gmail** - Gmail  
3. ✅ **notion** - Notion
4. ✅ **instagram** - Instagram
5. ✅ **facebook** - Facebook
6. ✅ **salesforce** - Salesforce (Cloud icon)
7. ✅ **quickbooks** - QuickBooks (DollarSign icon)
8. ✅ **slack** - Slack (MessageSquare icon)
9. ✅ **linkedin** - LinkedIn (Linkedin icon)
10. ✅ **sheets** - Google Sheets (Sheet icon)
11. ✅ **zoom** - Zoom (Video icon)
12. ✅ **asana** - Asana (CheckSquare icon)

### 2. Added Missing Icons

Added lucide-react icons for apps without logo files:
```tsx
import {
  Chrome,
  MessageSquare,  // Slack
  Linkedin,       // LinkedIn
  Video,          // Zoom
  Sheet,          // Google Sheets
  CheckSquare,    // Asana
  DollarSign,     // QuickBooks
  Cloud,          // Salesforce
  Facebook,       // Facebook
} from "lucide-react";
```

### 3. Updated Default Pinned Apps

**New Default Dock:**
- Chrome
- Gmail
- Notion
- Slack
- Zoom
- Google Sheets

### 4. Integrated Agent API

Updated `runCommand()` function to:
- Send commands to container API: `http://localhost:8081/api/agent/execute`
- Launch apps in container before opening window
- Handle errors gracefully
- Show toast notifications

**API Integration:**
```tsx
const response = await fetch("http://localhost:8081/api/agent/execute", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userId: "current-user",
    prompt: t,
  }),
});
```

### 5. All Apps Use Single Xpra Stream

**Current Implementation:**
- All apps connect to: `http://localhost:10005/`
- Shows full Xpra desktop with all apps
- User can see the app they opened

**What's Needed for App-Only View:**
To show ONLY the specific app (not full desktop), we need to implement one of these:

**Option A: Per-App Xpra Sessions** (Recommended)
```bash
# In container, start separate Xpra for each app
xpra start :101 --bind-tcp=0.0.0.0:10006  # Chrome
xpra start :102 --bind-tcp=0.0.0.0:10007  # Gmail
# etc...

# Then launch apps on specific displays
DISPLAY=:101 google-chrome --app=https://www.google.com
DISPLAY=:102 google-chrome --app=https://mail.google.com
```

**Option B: Xpra Window Filtering**
```tsx
payload: {
  url: `http://localhost:10005/?window=<window_id>`,
  hideControls: true,
  isStreaming: true,
}
```

**Option C: Direct Web Embedding (Hybrid)**
For web apps, embed directly:
```tsx
// For Gmail, Sheets, etc.
payload: {
  url: "https://mail.google.com",
  isStreaming: false,  // Direct iframe
}

// For native apps (Slack, Zoom), use Xpra
payload: {
  url: "http://localhost:10005",
  isStreaming: true,
}
```

### 6. Simplified Window Tiling

Updated `tileRemote()` to handle all app types (not just "remoteChrome").

## Files Changed

- ✅ `src/pages/AIOS.tsx` - Complete rewrite of app system

## Testing

### 1. Start Container
```powershell
docker-compose -f docker-compose.aios.yml up -d
```

### 2. Start Frontend
```powershell
npm run dev
```

### 3. Test Commands

In the AI OS command box, try:
- `open chrome`
- `open gmail`
- `open slack`
- `open zoom`
- `list windows`
- `switch to chrome`
- `close gmail`

## Known Issue: Shows Full Desktop

**Current Behavior:**
When you click "Chrome" or "Gmail", a window opens showing the FULL Xpra desktop with ALL apps visible.

**Expected Behavior:**
Window should show ONLY the Chrome app interface (no desktop, no other apps).

**Solution Required:**

### Quick Fix (Easiest - 5 min):
Update agent-api.py to focus/raise the specific app window after launch:

```python
def handle_open_command(prompt, steps):
    # ... existing code ...
    launcher.launch_app(app_name)
    
    # NEW: Focus the window
    time.sleep(1)
    window_controller.switch_to_window(app_name)
    window_controller.raise_window(app_name)
    
    return app_name
```

### Complete Fix (Best - 1 hour):
Implement per-app Xpra sessions:

1. **Update Dockerfile** to start multiple Xpra servers
2. **Update supervisord.conf** to manage multiple Xpra processes
3. **Update AIOS.tsx** to use app-specific ports
4. **Update agent-api.py** to launch apps on specific displays

See `APP_INTEGRATION_PLAN.md` for detailed steps.

## Next Steps

1. **Test Current Implementation:**
   - Open http://localhost:5173
   - Click app icons in dock
   - Verify windows open with Xpra stream

2. **Implement App-Only View:**
   - Choose Option A, B, or C above
   - Modify container or frontend accordingly

3. **Add Visual Polish:**
   - Custom app icons/logos
   - Loading states
   - Better error messages

## Commands Available

```bash
# Backend
docker-compose -f docker-compose.aios.yml up -d     # Start container
docker logs aios_nelieo_phase1 -f                   # View logs
docker exec aios_nelieo_phase1 ps aux              # Check processes

# Frontend
npm run dev                                         # Start dev server
npm run build                                       # Build for production

# Testing
curl http://localhost:8081/health                   # Check API
curl http://localhost:10005                         # Check Xpra
```

## Summary

✅ **Done:**
- Updated app list to match container (12 apps)
- Added icons for all apps
- Integrated Agent API
- Fixed all TypeScript errors
- All apps launch via command box

⏳ **Next (To Show App-Only):**
- Implement per-app Xpra sessions OR
- Use window filtering OR
- Direct web embedding for web apps

🎯 **Result:**
AIOS.tsx now correctly shows all 12 container apps and can launch them via Agent API. The apps open in windows showing the Xpra stream. To show ONLY the specific app (not full desktop), implement one of the solutions above.
