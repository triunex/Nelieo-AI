#!/usr/bin/env python3
"""
Level 1 Task Testing - Complex Real-World Workflows
Tests web scraping, multi-step research, data extraction

NOTE: Tasks should be ACTION-ORIENTED, not require verbal responses.
The agent can DO tasks but cannot "tell" you results (no chat interface).
"""

import requests
import time
import json

API_URL = "http://localhost:10000/api/superagent/execute"

def test_task(description, task, timeout=300):
    """Test a single task and return results"""
    print(f"\n{'='*75}")
    print(f"🎯 TASK: {task}")
    print(f"📝 Description: {description}")
    print(f"⏱️  Timeout: {timeout}s")
    print(f"{'='*75}\n")
    
    start_time = time.time()
    
    try:
        response = requests.post(
            API_URL,
            json={'task': task, 'timeout': timeout},
            timeout=timeout + 15
        )
        
        duration = time.time() - start_time
        
        if response.status_code == 200:
            result = response.json()
            success = result.get('success', False)
            actions = result.get('actions_taken', 0)
            if isinstance(actions, list):
                actions = len(actions)
            iterations = result.get('iterations', 'N/A')
            error = result.get('error', '')
            
            # STRICTER evaluation - only success if API says success AND no timeout
            # Timeout means agent didn't finish properly
            is_timeout = 'timeout' in str(error).lower() if error else False
            
            if success and not is_timeout:
                status = "✅ SUCCESS"
                actual_success = True
            elif is_timeout:
                status = "⚠️ TIMEOUT (may have completed)"
                actual_success = False  # Don't count timeouts as success
            elif actions >= 2:
                status = "⚠️ PARTIAL (actions taken but not verified)"
                actual_success = False
            else:
                status = "❌ FAILED"
                actual_success = False
                
            print(f"{status} in {duration:.1f}s")
            print(f"📊 Actions: {actions}, Iterations: {iterations}")
            
            # Show extracted data if available
            extracted = result.get('extracted_data', {})
            if extracted:
                print(f"\n📊 EXTRACTED DATA:")
                for key, value in extracted.items():
                    if isinstance(value, list):
                        print(f"   {key}: {value[:5]}...")  # Show first 5 items
                    else:
                        print(f"   {key}: {value}")
            
            # Show task results/findings
            task_results = result.get('results', [])
            if task_results:
                print(f"\n📝 FINDINGS:")
                for finding in task_results[:3]:  # Show first 3 findings
                    print(f"   - {finding[:100]}...")
            
            if error:
                print(f"❌ Error: {error}")
            
            return actual_success, duration
        else:
            print(f"❌ HTTP Error: {response.status_code}")
            return False, time.time() - start_time
            
    except requests.exceptions.Timeout:
        duration = time.time() - start_time
        print(f"❌ TIMEOUT after {duration:.1f}s")
        return False, duration
    except Exception as e:
        duration = time.time() - start_time
        print(f"❌ Exception: {e}")
        return False, duration

def main():
    print("="*75)
    print("🚀 LEVEL 1 TASK TESTING - ACTION-ORIENTED WORKFLOWS")
    print("="*75)
    print("\n⚠️  Note: Tasks are ACTION-based (navigate, click, type)")
    print("    Agent cannot 'tell you' results - no verbal response mechanism\n")
    
    # Test cases - SIMPLER, MORE SPECIFIC tasks
    tests = [
        # Level 1A: Simple navigation only
        {
            "description": "Simple navigation",
            "task": "Go to news.ycombinator.com",
            "timeout": 60
        },
        
        # Level 1B: Navigation + one action
        {
            "description": "Navigate and click",
            "task": "Go to news.ycombinator.com and click on the top story",
            "timeout": 120
        },
        
        # Level 1C: Search workflow
        {
            "description": "Search Google",
            "task": "Go to google.com and search for 'YC W26'",
            "timeout": 90
        },
        
        # Level 1D: Search + click
        {
            "description": "Search and click result",
            "task": "Go to google.com, search for 'Y Combinator', and click on the first result",
            "timeout": 150
        },
        
        # Level 1E: Navigate to specific site page
        {
            "description": "Navigate to specific page",
            "task": "Go to ycombinator.com",
            "timeout": 60
        },
    ]
    
    results = []
    
    for i, test in enumerate(tests, 1):
        print(f"\n\n{'#'*75}")
        print(f"# TEST {i}/{len(tests)}")
        print(f"{'#'*75}")
        
        success, duration = test_task(
            test["description"],
            test["task"],
            test["timeout"]
        )
        
        results.append({
            "test": i,
            "description": test["description"],
            "task": test["task"],
            "success": success,
            "duration": duration
        })
        
        # Brief pause between tests
        if i < len(tests):
            print("\n⏳ Waiting 3s before next test...")
            time.sleep(3)
    
    # Summary
    print("\n\n" + "="*75)
    print("📊 TEST SUMMARY")
    print("="*75)
    
    total = len(results)
    passed = sum(1 for r in results if r["success"])
    failed = total - passed
    
    print(f"\n✅ Passed: {passed}/{total} ({passed/total*100:.1f}%)")
    print(f"❌ Failed: {failed}/{total} ({failed/total*100:.1f}%)")
    
    print("\n📋 Detailed Results:")
    for r in results:
        status = "✅ PASS" if r["success"] else "❌ FAIL"
        print(f"\n{status} - Test {r['test']}")
        print(f"  Description: {r['description']}")
        print(f"  Duration: {r['duration']:.1f}s")
        print(f"  Task: {r['task'][:70]}...")
    
    # Performance stats
    successful_durations = [r["duration"] for r in results if r["success"]]
    if successful_durations:
        avg_duration = sum(successful_durations) / len(successful_durations)
        print(f"\n⚡ Average successful task duration: {avg_duration:.1f}s")
    
    print("\n" + "="*75)
    
    # Final verdict
    if passed >= 4:
        print("🎉 EXCELLENT! Level 1 capabilities verified!")
    elif passed >= 3:
        print("👍 GOOD! Most Level 1 tasks working")
    elif passed >= 2:
        print("⚠️  PARTIAL: Some tasks working, needs improvement")
    else:
        print("❌ NEEDS WORK: Level 1 capabilities not ready")

if __name__ == "__main__":
    main()
