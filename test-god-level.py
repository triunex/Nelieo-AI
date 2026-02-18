#!/usr/bin/env python3
"""
GOD-LEVEL INTELLIGENCE TEST

This tests the agent's ability to handle REAL complex tasks:
- Multi-app workflows
- Data extraction and transformation
- Structured data handling
- Cross-app data pipelines

These are the tasks that separate Level 1 from Level 10.
"""

import requests
import time
import json

API_URL = "http://localhost:10000/api/superagent/execute"

def test_god_level_task(description, task, timeout=300):
    """Test a complex god-level task"""
    print(f"\n{'='*80}")
    print(f"🚀 GOD-LEVEL TASK")
    print(f"📝 {description}")
    print(f"🎯 Task: {task}")
    print(f"⏱️  Timeout: {timeout}s")
    print(f"{'='*80}\n")
    
    start_time = time.time()
    
    try:
        response = requests.post(
            API_URL,
            json={'task': task, 'timeout': timeout},
            timeout=timeout + 30
        )
        
        duration = time.time() - start_time
        
        if response.status_code == 200:
            result = response.json()
            success = result.get('success', False)
            actions = result.get('actions_taken', 0)
            
            print(f"\n{'='*80}")
            if success:
                print(f"✅ SUCCESS in {duration:.1f}s")
            else:
                print(f"❌ FAILED in {duration:.1f}s")
            
            print(f"📊 Actions taken: {actions}")
            
            # Show working memory state
            working_memory = result.get('working_memory', {})
            if working_memory:
                print(f"\n🧠 WORKING MEMORY STATE:")
                
                extractions = working_memory.get('extractions', [])
                if extractions:
                    print(f"   📊 Data extractions: {len(extractions)}")
                    for i, ext in enumerate(extractions[:3], 1):
                        print(f"      {i}. {ext.get('type')}: {str(ext.get('data'))[:100]}...")
                
                pipeline = working_memory.get('data_pipeline', [])
                if pipeline:
                    print(f"   🔄 Data pipeline: {len(pipeline)} transfers")
                    for transfer in pipeline:
                        print(f"      {transfer['from']} → {transfer['to']}: {transfer['purpose']}")
                
                progress = working_memory.get('workflow_progress', {})
                if progress.get('status') != 'no_workflow':
                    print(f"   📈 Progress: {progress.get('progress', '0%')}")
                    print(f"      Completed: {progress.get('completed', 0)}")
                    print(f"      Remaining: {progress.get('remaining', 0)}")
            
            # Show extracted data (old system)
            extracted = result.get('extracted_data', {})
            if extracted:
                print(f"\n📊 EXTRACTED DATA:")
                for key, value in extracted.items():
                    if isinstance(value, list):
                        print(f"   {key}: {len(value)} items")
                    else:
                        print(f"   {key}: {value}")
            
            # Show findings
            findings = result.get('results', [])
            if findings:
                print(f"\n📝 KEY FINDINGS:")
                for finding in findings[:5]:
                    print(f"   • {finding[:150]}...")
            
            if not success:
                error = result.get('error', 'Unknown error')
                print(f"\n❌ Error: {error}")
            
            print(f"{'='*80}\n")
            
            return success, duration, working_memory
        else:
            print(f"❌ HTTP Error: {response.status_code}")
            return False, time.time() - start_time, {}
            
    except requests.exceptions.Timeout:
        duration = time.time() - start_time
        print(f"❌ TIMEOUT after {duration:.1f}s")
        return False, duration, {}
    except Exception as e:
        duration = time.time() - start_time
        print(f"❌ Exception: {e}")
        return False, duration, {}

def main():
    print("="*80)
    print("🧠 GOD-LEVEL INTELLIGENCE TEST")
    print("="*80)
    print("\nThese tasks test the agent's REAL capabilities:")
    print("- Multi-step workflows")
    print("- Data extraction and storage")
    print("- Cross-app coordination")
    print("- Structured data handling\n")
    
    # Test cases - progressive difficulty
    tests = [
        # LEVEL 1: Simple navigation with data awareness
        {
            "description": "Navigate and observe",
            "task": "Go to news.ycombinator.com",
            "timeout": 60
        },
        
        # LEVEL 2: Navigation + extraction
        {
            "description": "Navigate and extract visible data",
            "task": "Go to news.ycombinator.com and read the top 3 headlines",
            "timeout": 90
        },
        
        # LEVEL 3: Search + structured extraction
        {
            "description": "Search and extract structured results",
            "task": "Go to google.com, search for 'YC W26', and collect the first 5 result titles",
            "timeout": 120
        },
        
        # LEVEL 4: Multi-step workflow
        {
            "description": "Navigate, search, click, extract",
            "task": "Go to github.com, search for 'AI agent', and get the name of the first repository",
            "timeout": 150
        },
        
        # LEVEL 5: Complex extraction (requires working memory)
        {
            "description": "Extract and structure data",
            "task": "Go to news.ycombinator.com, get the top 3 stories with their titles and URLs",
            "timeout": 180
        },
    ]
    
    results = []
    
    for i, test in enumerate(tests, 1):
        print(f"\n{'#'*80}")
        print(f"# TEST {i}/{len(tests)}: LEVEL {i}")
        print(f"{'#'*80}")
        
        success, duration, memory = test_god_level_task(
            test["description"],
            test["task"],
            test["timeout"]
        )
        
        results.append({
            "level": i,
            "description": test["description"],
            "success": success,
            "duration": duration,
            "memory_items": len(memory.get('extractions', [])) if memory else 0
        })
        
        # Pause between tests
        if i < len(tests):
            print("\n⏳ Waiting 5s before next test...\n")
            time.sleep(5)
    
    # Summary
    print("\n" + "="*80)
    print("📊 GOD-LEVEL TEST SUMMARY")
    print("="*80)
    
    total = len(results)
    passed = sum(1 for r in results if r["success"])
    
    print(f"\n✅ Passed: {passed}/{total} ({passed/total*100:.1f}%)")
    print(f"❌ Failed: {total-passed}/{total}")
    
    print("\n📋 Detailed Results:")
    for r in results:
        status = "✅ PASS" if r["success"] else "❌ FAIL"
        print(f"\n{status} - Level {r['level']}")
        print(f"  Description: {r['description']}")
        print(f"  Duration: {r['duration']:.1f}s")
        print(f"  Memory items: {r['memory_items']}")
    
    # Capabilities assessment
    print("\n" + "="*80)
    print("🎯 CAPABILITIES ASSESSMENT")
    print("="*80)
    
    if passed >= 5:
        print("🌟 LEVEL 10 - GOD-LEVEL: Ready for production!")
    elif passed >= 4:
        print("💎 LEVEL 8 - EXPERT: Very strong capabilities")
    elif passed >= 3:
        print("⭐ LEVEL 6 - ADVANCED: Good capabilities, needs refinement")
    elif passed >= 2:
        print("👍 LEVEL 4 - INTERMEDIATE: Basic capabilities working")
    else:
        print("⚠️  LEVEL 2 - BEGINNER: Foundation needs work")
    
    print("\n" + "="*80)

if __name__ == "__main__":
    main()
