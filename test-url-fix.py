#!/usr/bin/env python3
"""Test URL navigation loop fix"""

import requests
import json
import time

def test_url_fix():
    """Test that URL navigation loop is fixed"""
    
    print("🧪 Testing URL Loop Fix...")
    print("Task: Go to ycombinator.com and take a click on apply button")
    print("-" * 60)
    
    start = time.time()
    
    try:
        response = requests.post(
            'http://localhost:10000/api/superagent/execute',
            json={
                'task': 'Go to ycombinator.com and take a click on apply button',
                'timeout': 60
            },
            timeout=65
        )
        
        duration = time.time() - start
        result = response.json()
        
        print(f"\n⏱️  Duration: {duration:.1f}s")
        print(f"✅ Success: {result.get('success')}")
        print(f"📊 Iterations: {result.get('iterations_used', 'N/A')}")
        
        if result.get('success'):
            print("\n✅ URL LOOP FIX VALIDATED!")
            print("Task completed without timeout")
        else:
            print("\n❌ Task failed:")
            print(f"Error: {result.get('error', 'Unknown')}")
        
        # Show result details
        print("\n📄 Full Result:")
        print(json.dumps(result, indent=2))
        
    except requests.exceptions.Timeout:
        duration = time.time() - start
        print(f"\n❌ Request timed out after {duration:.1f}s")
        print("URL loop may still be present")
    except Exception as e:
        print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    test_url_fix()
