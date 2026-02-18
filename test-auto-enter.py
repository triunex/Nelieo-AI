#!/usr/bin/env python3
"""Quick test for auto-Enter on search"""

import requests
import time

def quick_test(task):
    print(f"\n🧪 Testing: {task}")
    start = time.time()
    try:
        r = requests.post(
            'http://localhost:10000/api/superagent/execute',
            json={'task': task, 'timeout': 75},
            timeout=80
        )
        duration = time.time() - start
        if r.status_code == 200:
            result = r.json()
            success = result.get('success', False)
            print(f"{'✅ SUCCESS' if success else '❌ FAILED'} in {duration:.1f}s")
            return success
        else:
            print(f"❌ HTTP {r.status_code}")
            return False
    except Exception as e:
        print(f"❌ {e}")
        return False

print("\n" + "="*60)
print("🔬 AUTO-ENTER TEST")
print("="*60)

# Test search with auto-Enter
quick_test("Go to google.com and search for 'OpenAI GPT-4'")

print("="*60 + "\n")
