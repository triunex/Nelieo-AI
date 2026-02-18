#!/usr/bin/env python3
"""Test multi-step workflow capabilities"""

import requests
import json
import time

def test_workflow(task, timeout=120):
    """Test a workflow task"""
    print(f"\n{'='*75}")
    print(f"🎯 TASK: {task}")
    print(f"⏱️  Timeout: {timeout}s")
    print('='*75)
    
    start = time.time()
    
    try:
        response = requests.post(
            'http://localhost:10000/api/superagent/execute',
            json={'task': task, 'timeout': timeout},
            timeout=timeout + 15
        )
        
        duration = time.time() - start
        
        if response.status_code == 200:
            result = response.json()
            success = result.get('success', False)
            
            print(f"\n{'✅ SUCCESS' if success else '❌ FAILED'} in {duration:.1f}s")
            print(f"📊 Actions: {result.get('actions_taken', 'N/A')}")
            print(f"🔄 Iterations: {result.get('iterations_used', 'N/A')}")
            
            if not success:
                print(f"❌ Error: {result.get('error', 'Unknown')}")
            
            return success, duration
        else:
            print(f"\n❌ HTTP {response.status_code}")
            return False, duration
            
    except requests.exceptions.Timeout:
        duration = time.time() - start
        print(f"\n⚠️  HTTP timeout after {duration:.1f}s")
        return None, duration
    except Exception as e:
        duration = time.time() - start
        print(f"\n❌ Error: {e}")
        return False, duration

print("\n" + "="*75)
print("🚀 MULTI-STEP WORKFLOW TEST")
print("="*75)

# Test progressively complex tasks
tests = [
    # Level 0: Simple navigation (should still work)
    ("Go to google.com", 45),
    
    # Level 1: Two-step workflow
    ("Go to google.com and search for 'YC W26'", 90),
    
    # Level 2: Multi-step with interaction
    ("Navigate to news.ycombinator.com and click the first article", 120),
]

results = []
for task, timeout in tests:
    success, duration = test_workflow(task, timeout)
    results.append((task[:50], success, duration))
    time.sleep(5)  # Pause between tests

print("\n" + "="*75)
print("📊 RESULTS SUMMARY")
print("="*75)

known = [(t, s, d) for t, s, d in results if s is not None]
if known:
    success_count = sum(1 for _, s, _ in known if s)
    print(f"\n✅ Success Rate: {success_count}/{len(known)} ({success_count/len(known)*100:.0f}%)\n")
    
    for task, success, duration in results:
        status = "✅" if success else ("⚠️ " if success is None else "❌")
        print(f"{status} {task[:45]:<45} {duration:>6.1f}s")

print("\n" + "="*75 + "\n")
