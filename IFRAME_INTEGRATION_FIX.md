# Iframe Integration Fix

## Problem
Agent was opening apps in the container, but the frontend iframe wasn't opening automatically. Users had to manually click the app icon after the agent opened it.

## Root Cause
The agent (SuperAgent) was launching apps directly in the container using `app_launcher.launch_app()`, but there was no communication to the frontend to open the corresponding iframe window showing the Xpra display.

## Solution

### 1. Backend Changes (superagent/enhanced_core.py)
- Added `socketio` parameter to `EnhancedSuperAgent.__init__()`
- When an app is opened, emit `app_opened` event via SocketIO:
  ```python
  if self.socketio:
      self.socketio.emit('app_opened', {
          'app': app_to_launch.lower(),  # chrome, gmail, etc.
          'appName': app_to_launch,  # Chrome, Gmail, etc.
          'url': 'http://localhost:10005/',
          'message': f'Opening {app_to_launch}...'
      })
  ```

### 2. Agent API Changes (aios-xpra-app/agent-api.py)
- Pass `socketio` instance when initializing EnhancedSuperAgent:
  ```python
  enhanced_super_agent = EnhancedSuperAgent(
      vision_api=vision_api,
      max_iterations=50,
      memory_path="/var/log/superagent_memory.json",
      enable_parallel=True,
      enable_reflection=True,
      enable_verification=True,
      app_launcher=launcher,
      socketio=socketio  # NEW
  )
  ```

### 3. Frontend Changes (src/services/simple-agent-bridge.ts)
- Added listener for `app_opened` events from backend:
  ```typescript
  this.socket.on('app_opened', (data: any) => {
      console.log('📱 App opened from backend:', data);
      this.emit('app_opened', data);
  });
  ```

### 4. Frontend UI Changes (src/pages/aios.tsx)
- Added useEffect to handle `app_opened` events:
  ```typescript
  useEffect(() => {
    const handleAppOpened = (data: any) => {
      const appId = data.app as AppId;
      if (APPS[appId]) {
        APPS[appId].launch(openWindow);
        toast({ title: "App Opened", description: `${data.appName} is now available` });
      }
    };
    
    simpleAgentBridge.on('app_opened', handleAppOpened);
    return () => simpleAgentBridge.off('app_opened', handleAppOpened);
  }, [APPS, openWindow]);
  ```

## Flow After Fix

1. **User sends task**: "find information about OpenAI"
2. **Agent strategic planning**: Understands need for browser research
3. **Agent opens Chrome**: 
   - Calls `app_launcher.launch_app('Chrome')` in container
   - Emits `app_opened` event via SocketIO
4. **Frontend receives event**: 
   - simple-agent-bridge forwards event
   - aios.tsx handler receives event
   - Calls `APPS['chrome'].launch(openWindow)`
5. **Iframe window opens**: Shows Xpra display at `http://localhost:10005/`
6. **Agent sees Chrome**: Can now interact with it in the iframe

## Loop Breaking Enhancement

The agent now:
- Detects if it's stuck trying to open Chrome 3 times
- Breaks the loop and assumes Chrome is open
- Moves to the next tactical step (interact with Chrome)

## Testing

Test with:
```
find information about OpenAI
```

Expected behavior:
1. Chrome iframe opens automatically after ~5 seconds
2. Agent attempts to interact (may fail if vision still broken)
3. No more infinite loop of opening Chrome

## Next Steps

1. ✅ Test iframe opening works
2. ⏳ Fix vision system to actually see Chrome UI
3. ⏳ Enable navigation/interaction with opened apps
4. ⏳ Multi-step tactical planning improvement
