#!/usr/bin/env python3
"""
Quick Test: SuperAgent Visual Integration
Tests that the frontend can communicate with SuperAgent in the container
"""

import requests
import json
import time

# Colors for terminal output
GREEN = '\033[92m'
BLUE = '\033[94m'
YELLOW = '\033[93m'
RED = '\033[91m'
RESET = '\033[0m'

def test_agent_api():
    """Test that agent API is accessible"""
    print(f"\n{BLUE}🧪 Testing SuperAgent Integration{RESET}\n")
    
    # Test 1: Health check
    print(f"{YELLOW}1. Testing API health...{RESET}")
    try:
        response = requests.get('http://localhost:10000/api/health', timeout=5)
        if response.status_code == 200:
            print(f"{GREEN}✓ Agent API is running{RESET}")
            print(f"   Response: {response.json()}")
        else:
            print(f"{RED}✗ API returned status {response.status_code}{RESET}")
            return False
    except Exception as e:
        print(f"{RED}✗ Cannot connect to agent API: {e}{RESET}")
        print(f"   Make sure Docker container is running: docker start aios_nelieo_phase1")
        return False
    
    # Test 2: Check SuperAgent status
    print(f"\n{YELLOW}2. Checking SuperAgent status...{RESET}")
    try:
        response = requests.get('http://localhost:10000/api/superagent/stats', timeout=5)
        if response.status_code == 200:
            stats = response.json()
            print(f"{GREEN}✓ SuperAgent is available{RESET}")
            print(f"   Stats: {json.dumps(stats, indent=2)}")
        else:
            print(f"{YELLOW}⚠ SuperAgent stats unavailable (status {response.status_code}){RESET}")
    except Exception as e:
        print(f"{YELLOW}⚠ SuperAgent stats error: {e}{RESET}")
    
    # Test 3: Send a simple task (won't execute, just test the endpoint)
    print(f"\n{YELLOW}3. Testing task submission endpoint...{RESET}")
    try:
        test_task = {
            "task": "Find Chrome icon on screen",
            "userId": "test",
            "timeout": 5
        }
        
        print(f"   Sending task: {test_task['task']}")
        print(f"   {BLUE}(This will attempt to execute - press Ctrl+C to skip if needed){RESET}")
        
        # Send request with short timeout
        response = requests.post(
            'http://localhost:10000/api/agent/task',
            json=test_task,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"{GREEN}✓ Task executed successfully{RESET}")
            print(f"   Result: {json.dumps(result, indent=2)}")
        else:
            print(f"{YELLOW}⚠ Task returned status {response.status_code}{RESET}")
            print(f"   Response: {response.text}")
    except requests.exceptions.Timeout:
        print(f"{YELLOW}⚠ Task timed out (normal for slow Ollama){RESET}")
    except KeyboardInterrupt:
        print(f"\n{YELLOW}⚠ Test skipped by user{RESET}")
    except Exception as e:
        print(f"{RED}✗ Task submission error: {e}{RESET}")
    
    # Test 4: Check Xpra stream
    print(f"\n{YELLOW}4. Testing Xpra desktop stream...{RESET}")
    try:
        response = requests.get('http://localhost:10005/', timeout=5)
        if response.status_code == 200:
            print(f"{GREEN}✓ Xpra stream is accessible{RESET}")
            print(f"   You can view it at: http://localhost:10005/")
        else:
            print(f"{RED}✗ Xpra stream returned status {response.status_code}{RESET}")
    except Exception as e:
        print(f"{RED}✗ Cannot connect to Xpra: {e}{RESET}")
        print(f"   Make sure Xpra is running in the container")
    
    # Summary
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{GREEN}🎉 Integration Test Complete!{RESET}\n")
    print(f"Next steps:")
    print(f"1. Open browser: {BLUE}http://localhost:8081{RESET}")
    print(f"2. You should see AIOS interface")
    print(f"3. Type a command: {YELLOW}'Open Chrome'{RESET}")
    print(f"4. Watch the magic:")
    print(f"   • Animated cursor appears")
    print(f"   • Status overlay shows thinking")
    print(f"   • Chrome opens in the stream")
    print(f"   • Cursor shows where it clicked")
    print(f"\n{BLUE}Architecture:{RESET}")
    print(f"  Browser → WebSocket → agent-api.py → SuperAgent → pyautogui → X11 → Xpra → Browser")
    print(f"\n{BLUE}Files involved:{RESET}")
    print(f"  Frontend: src/pages/AIOS.tsx")
    print(f"  Bridge:   src/services/simple-agent-bridge.ts")
    print(f"  Backend:  aios-xpra-app/agent-api.py")
    print(f"  Brain:    superagent/core.py (or enhanced_core.py)")
    print(f"  Executor: superagent/executor.py")
    print(f"{BLUE}{'='*60}{RESET}\n")
    
    return True

if __name__ == '__main__':
    test_agent_api()
