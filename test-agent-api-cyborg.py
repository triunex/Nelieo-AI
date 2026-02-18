#!/usr/bin/env python3
"""
Test the Agent API with Cyborg enhancements
"""

import requests
import json
import time

# Agent API endpoint
API_URL = "http://localhost:10000"

def test_simple_task():
    """Test a simple task that should use Fast Path"""
    print("\n" + "="*80)
    print(" TEST: Simple Task (Should use Fast Path)")
    print("="*80)
    
    task = "Open Chrome browser"
    
    print(f"\n Task: {task}")
    print("  Expected: Fast Path (< 1 second)")
    print("\n Sending request...\n")
    
    start_time = time.time()
    
    try:
        response = requests.post(
            f"{API_URL}/api/superagent/execute",
            json={
                "task": task,
                "timeout": 60
            },
            timeout=65
        )
        
        duration = time.time() - start_time
        
        if response.status_code == 200:
            result = response.json()
            print(f" Task completed in {duration:.2f}s")
            print(f" Result: {json.dumps(result, indent=2)}")
            
            if duration < 2:
                print("\n🎉 FAST PATH LIKELY USED! (< 2s)")
            else:
                print(f"\n⚠️  Slower than expected ({duration:.2f}s) - may have used Gemini")
                
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        duration = time.time() - start_time
        print(f"❌ Request failed after {duration:.2f}s: {e}")

def test_complex_task():
    """Test a complex task that should use Hybrid mode"""
    print("\n" + "="*80)
    print(" TEST: Complex Task (Should use Hybrid Mode)")
    print("="*80)
    
    task = "Go to ycombinator.com/apply and take a screenshot"
    
    print(f"\n Task: {task}")
    print("  Expected: Hybrid (5-15 seconds)")
    print("\n Sending request...\n")
    
    start_time = time.time()
    
    try:
        response = requests.post(
            f"{API_URL}/api/superagent/execute",
            json={
                "task": task,
                "timeout": 120
            },
            timeout=125
        )
        
        duration = time.time() - start_time
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Task completed in {duration:.2f}s")
            print(f" Result: {json.dumps(result, indent=2)}")
            
            if duration < 30:
                print(f"\n🎉 CYBORG SPEEDUP! ({duration:.2f}s vs ~60s before)")
            else:
                print(f"\n  Took longer than expected ({duration:.2f}s)")
                
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        duration = time.time() - start_time
        print(f"❌ Request failed after {duration:.2f}s: {e}")

def check_api_health():
    """Check if API is running"""
    print("\n" + "="*80)
    print(" Checking Agent API Health")
    print("="*80)
    
    try:
        response = requests.get(f"{API_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Agent API is running")
            return True
        else:
            print(f"❌ API returned {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to API: {e}")
        print("\n💡 Make sure the container is running:")
        print("   docker compose -f docker-compose.aios.yml up -d aios_phase1")
        return False

def main():
    print("\n" + "="*80)
    print(" TESTING CYBORG AGENT API")
    print("   (Accessibility Bridge + Fast Path + Hybrid Vision)")
    print("="*80)
    
    # Check health
    if not check_api_health():
        return
    
    print("\n Watch the container logs in another terminal:")
    print("   docker compose -f docker-compose.aios.yml logs -f aios_phase1")
    print("\n   Look for these messages:")
    print("    Extracting accessibility tree (X-Ray Vision)...")
    print("    Fast path: Looking for clickable element...")
    print("    FAST PATH SUCCESS - Skipping Gemini call!")
    
    input("\nPress Enter to start tests...")
    
    # Run tests
    test_simple_task()
    
    print("\n" + "="*80)
    input("\nPress Enter to run complex task test...")
    
    test_complex_task()
    
    print("\n" + "="*80)
    print("🎉 TESTING COMPLETE")
    print("="*80)
    print("\n Check the logs to verify Cyborg features were used!")

if __name__ == "__main__":
    main()
