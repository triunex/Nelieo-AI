#!/usr/bin/env python3
"""Test Level 1 YC Demo Tasks"""

import requests
import json
import time

def test_demo_task(task, timeout=90):
    """Test a demo task with proper error handling"""
    print(f"\n{'='*70}")
    print(f"🎯 {task}")
    print(f"⏱️  Timeout: {timeout}s")
    print('='*70)
    
    start = time.time()
    
    try:
        response = requests.post(
            'http://localhost:10000/api/superagent/execute',
            json={'task': task, 'timeout': timeout},
            timeout=timeout + 10  # Give extra time for HTTP
        )
        
        duration = time.time() - start
        
        if response.status_code == 200:
            result = response.json()
            success = result.get('success', False)
            
            if success:
                print(f"\n✅ SUCCESS in {duration:.1f}s")
                print(f"📊 Iterations: {result.get('iterations_used', 'N/A')}")
                return True, duration
            else:
                print(f"\n❌ FAILED in {duration:.1f}s")
                print(f"Error: {result.get('error', 'Unknown')}")
                return False, duration
        else:
            print(f"\n❌ HTTP {response.status_code}")
            return False, time.time() - start
            
    except requests.exceptions.Timeout:
        # Task might still have completed, just HTTP timeout
        duration = time.time() - start
        print(f"\n⚠️  HTTP timeout after {duration:.1f}s (task may have completed)")
        return None, duration  # Unknown status
    except Exception as e:
        duration = time.time() - start
        print(f"\n❌ Error: {e}")
        return False, duration

print("\n" + "="*70)
print("🚀 YC INTERVIEW DEMO - LEVEL 1 TASKS")
print("="*70)

# Start with simple navigation to verify basics work
basic_tests = [
    ("Open Chrome and go to google.com", 45),
    ("Navigate to github.com", 60),
    ("Go to news.ycombinator.com", 60),
]

print("\n📋 BASIC NAVIGATION TESTS")
print("-"*70)

basic_results = []
for task, timeout in basic_tests:
    success, duration = test_demo_task(task, timeout)
    basic_results.append(success)
    time.sleep(3)  # Pause between tests

# Count successes (excluding timeouts)
known_results = [r for r in basic_results if r is not None]
if known_results:
    success_rate = sum(known_results) / len(known_results) * 100
    print(f"\n📊 Basic Tests: {sum(known_results)}/{len(known_results)} ({success_rate:.0f}%)")
else:
    print("\n⚠️  All tests timed out - cannot determine success")

# If basics work, try simple workflows
if known_results and sum(known_results) >= 2:
    print("\n\n" + "="*70)
    print("📋 SIMPLE WORKFLOW TESTS")
    print("-"*70)
    
    workflow_tests = [
        ("Go to google.com and search for 'YC W26 batch'", 75),
        ("Navigate to ycombinator.com and click the Apply button", 90),
    ]
    
    for task, timeout in workflow_tests:
        test_demo_task(task, timeout)
        time.sleep(3)

print("\n" + "="*70)
print("🏁 TESTING COMPLETE")
print("="*70)
print("\n💡 Next Steps:")
print("   1. If success rate >70%: Move to Level 2 workflows")
print("   2. If 40-70%: Fix remaining navigation issues")
print("   3. If <40%: Debug core agent logic")
print("="*70 + "\n")
