#!/usr/bin/env python3
"""Test complex tasks with Cyborg"""
import requests
import json
import time

def test_yc_apply():
    print("\n" + "="*80)
    print("🧪 TEST: YC Apply Button (Complex Navigation + Click)")
    print("="*80)
    
    task = "Go to ycombinator.com/apply and click the Apply button"
    print(f"\n📝 Task: {task}")
    print("⏱️  Expected: 20-40s with Cyborg (vs 60-120s before)")
    print("\n🚀 Starting...\n")
    
    start_time = time.time()
    
    try:
        response = requests.post(
            "http://localhost:10000/api/superagent/execute",
            json={"task": task, "timeout": 120},
            timeout=125
        )
        
        duration = time.time() - start_time
        
        if response.status_code == 200:
            result = response.json()
            success = result.get('success', False)
            
            print(f"{'✅' if success else '❌'} Task {'completed' if success else 'failed'} in {duration:.1f}s")
            print(f"\n📊 Results:")
            print(f"   Duration: {result.get('duration', 0):.1f}s")
            print(f"   Actions: {result.get('actions_taken', 0)}")
            print(f"   Final State: {result.get('final_state', 'unknown')}")
            
            if duration < 40:
                print(f"\n🎉 CYBORG SPEEDUP! ({duration:.1f}s vs typical 60-120s = {60/duration:.1f}x faster)")
            else:
                print(f"\n⚠️  Slower than expected ({duration:.1f}s)")
                
        else:
            print(f"❌ API Error: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        duration = time.time() - start_time
        print(f"❌ Failed after {duration:.1f}s: {e}")

def test_google_search():
    print("\n" + "="*80)
    print("🧪 TEST: Google Search Multi-Step")
    print("="*80)
    
    task = "Search for 'Python tutorials' on Google and click the first result"
    print(f"\n📝 Task: {task}")
    print("⏱️  Expected: 15-30s with Cyborg")
    print("\n🚀 Starting...\n")
    
    start_time = time.time()
    
    try:
        response = requests.post(
            "http://localhost:10000/api/superagent/execute",
            json={"task": task, "timeout": 90},
            timeout=95
        )
        
        duration = time.time() - start_time
        
        if response.status_code == 200:
            result = response.json()
            success = result.get('success', False)
            
            print(f"{'✅' if success else '❌'} Task {'completed' if success else 'failed'} in {duration:.1f}s")
            print(f"\n📊 Results:")
            print(f"   Duration: {result.get('duration', 0):.1f}s")
            print(f"   Actions: {result.get('actions_taken', 0)}")
            
            if duration < 35:
                print(f"\n🎉 EXCELLENT PERFORMANCE! ({duration:.1f}s)")
                
        else:
            print(f"❌ API Error: {response.status_code}")
            
    except Exception as e:
        duration = time.time() - start_time
        print(f"❌ Failed after {duration:.1f}s: {e}")

def test_screenshot_task():
    print("\n" + "="*80)
    print("🧪 TEST: Navigation + Screenshot")
    print("="*80)
    
    task = "Go to news.ycombinator.com and take a screenshot"
    print(f"\n📝 Task: {task}")
    print("⏱️  Expected: 10-20s with Cyborg")
    print("\n🚀 Starting...\n")
    
    start_time = time.time()
    
    try:
        response = requests.post(
            "http://localhost:10000/api/superagent/execute",
            json={"task": task, "timeout": 60},
            timeout=65
        )
        
        duration = time.time() - start_time
        
        if response.status_code == 200:
            result = response.json()
            success = result.get('success', False)
            
            print(f"{'✅' if success else '❌'} Task {'completed' if success else 'failed'} in {duration:.1f}s")
            print(f"\n📊 Results:")
            print(f"   Duration: {result.get('duration', 0):.1f}s")
            print(f"   Actions: {result.get('actions_taken', 0)}")
            
            if duration < 25:
                print(f"\n🎉 FAST! ({duration:.1f}s)")
                
        else:
            print(f"❌ API Error: {response.status_code}")
            
    except Exception as e:
        duration = time.time() - start_time
        print(f"❌ Failed after {duration:.1f}s: {e}")

if __name__ == "__main__":
    print("\n" + "="*80)
    print("🤖 CYBORG COMPLEX TASK TESTING")
    print("="*80)
    
    print("\n💡 Watch logs in another terminal:")
    print("   docker compose -f docker-compose.aios.yml logs -f aios_phase1 | grep -E 'Fast path|X-Ray|accessibility'")
    
    input("\nPress Enter to start Test 1 (YC Apply)...")
    test_yc_apply()
    
    input("\n\nPress Enter to start Test 2 (Google Search)...")
    test_google_search()
    
    input("\n\nPress Enter to start Test 3 (Screenshot)...")
    test_screenshot_task()
    
    print("\n" + "="*80)
    print("🎉 ALL TESTS COMPLETE")
    print("="*80)
    print("\n📊 Check the logs to see Cyborg features in action!")
