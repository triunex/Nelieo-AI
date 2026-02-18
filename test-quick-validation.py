#!/usr/bin/env python3
"""Quick validation test for core functionality"""

import requests
import json
import time

def quick_test(task, timeout=45):
    """Run a single quick test"""
    print(f"\n🧪 Testing: {task}")
    start = time.time()
    
    try:
        r = requests.post(
            'http://localhost:10000/api/superagent/execute',
            json={'task': task, 'timeout': timeout},
            timeout=timeout + 5
        )
        duration = time.time() - start
        
        if r.status_code == 200:
            result = r.json()
            success = result.get('success', False)
            status = "✅ SUCCESS" if success else "❌ FAILED"
            print(f"{status} in {duration:.1f}s")
            if not success:
                print(f"   Error: {result.get('error', 'Unknown')}")
            return success
        else:
            print(f"❌ HTTP {r.status_code}")
            return False
    except Exception as e:
        print(f"❌ {e}")
        return False

print("\n" + "="*60)
print("🔬 QUICK VALIDATION TESTS")
print("="*60)

tests = [
    "Go to github.com",
    "Navigate to news.ycombinator.com", 
    "Go to google.com"
]

results = [quick_test(t) for t in tests]
success_rate = sum(results) / len(results) * 100

print("\n" + "="*60)
print(f"📊 Result: {sum(results)}/{len(results)} ({success_rate:.0f}%)")
print("="*60 + "\n")
