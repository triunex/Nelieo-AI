#!/usr/bin/env python3
"""Test complex multi-step workflows with the Cyborg agent"""

import requests
import json
import time

def test_task(task_description, timeout=90):
    """Test a single task and report results"""
    print(f"\n{'='*70}")
    print(f"🧪 Task: {task_description}")
    print(f"⏱️  Timeout: {timeout}s")
    print('='*70)
    
    start = time.time()
    
    try:
        response = requests.post(
            'http://localhost:10000/api/superagent/execute',
            json={
                'task': task_description,
                'timeout': timeout
            },
            timeout=timeout + 5
        )
        
        duration = time.time() - start
        
        if response.status_code == 200:
            result = response.json()
            success = result.get('success', False)
            iterations = result.get('iterations_used', 'N/A')
            
            print(f"\n{'✅' if success else '❌'} Result: {'SUCCESS' if success else 'FAILED'}")
            print(f"⏱️  Duration: {duration:.1f}s")
            print(f"🔄 Iterations: {iterations}")
            
            if success:
                print(f"💬 Message: {result.get('message', 'N/A')}")
            else:
                print(f"❌ Error: {result.get('error', 'Unknown error')}")
            
            return success, duration, iterations
        else:
            print(f"\n❌ HTTP Error: {response.status_code}")
            print(response.text[:500])
            return False, duration, 0
            
    except requests.exceptions.Timeout:
        duration = time.time() - start
        print(f"\n❌ Request timed out after {duration:.1f}s")
        return False, duration, 0
    except Exception as e:
        duration = time.time() - start
        print(f"\n❌ Exception: {e}")
        return False, duration, 0

def main():
    """Run complex task test suite"""
    
    print("\n" + "="*70)
    print("🚀 COMPLEX WORKFLOW TEST SUITE")
    print("="*70)
    
    test_cases = [
        # Navigation tasks - these should be FAST with Cyborg
        ("Go to google.com", 45),
        ("Navigate to github.com", 60),
        ("Go to news.ycombinator.com", 60),
        
        # Multi-step workflow
        ("Go to google.com and search for 'artificial intelligence'", 75),
    ]
    
    results = []
    total_start = time.time()
    
    for task, timeout in test_cases:
        success, duration, iterations = test_task(task, timeout)
        results.append({
            'task': task,
            'success': success,
            'duration': duration,
            'iterations': iterations
        })
        
        # Brief pause between tests
        time.sleep(2)
    
    total_duration = time.time() - total_start
    
    # Summary
    print("\n" + "="*70)
    print("📊 TEST SUMMARY")
    print("="*70)
    
    successful = sum(1 for r in results if r['success'])
    total = len(results)
    success_rate = (successful / total * 100) if total > 0 else 0
    
    print(f"\n✅ Successful: {successful}/{total} ({success_rate:.1f}%)")
    print(f"⏱️  Total Duration: {total_duration:.1f}s")
    print(f"📈 Avg Duration: {total_duration/total:.1f}s per task")
    
    print("\n📋 Detailed Results:")
    print("-" * 70)
    for i, r in enumerate(results, 1):
        status = "✅" if r['success'] else "❌"
        print(f"{i}. {status} {r['task'][:50]:<50} {r['duration']:>6.1f}s")
    
    print("\n" + "="*70)
    
    if success_rate >= 80:
        print("🎉 EXCELLENT: >80% success rate achieved!")
    elif success_rate >= 60:
        print("👍 GOOD: 60-80% success rate")
    elif success_rate >= 40:
        print("⚠️  FAIR: 40-60% success rate - needs improvement")
    else:
        print("❌ POOR: <40% success rate - major issues")
    
    print("="*70 + "\n")

if __name__ == "__main__":
    main()
