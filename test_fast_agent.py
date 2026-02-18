#!/usr/bin/env python3
"""
Test FastAgent - Verify high-speed execution engine works correctly.

This script tests FastAgent components without requiring Docker.
Run inside the container to test full functionality.
"""

import os
import sys
import time
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def test_imports():
    """Test that all FastAgent components import correctly."""
    print("\n=== Testing Imports ===")
    
    try:
        from superagent.fast_agent import FastAgent, AgentAction, ExecutionResult, ActionType
        print("[OK] FastAgent imported")
    except ImportError as e:
        print(f"[FAIL] FastAgent import: {e}")
        return False
    
    try:
        from superagent.fast_agent_integration import FastAgentAPI, get_fast_agent_api
        print("[OK] FastAgentAPI imported")
    except ImportError as e:
        print(f"[FAIL] FastAgentAPI import: {e}")
        return False
    
    try:
        from superagent.omniparser import OmniParserV2, check_omniparser_available
        status = check_omniparser_available()
        print(f"[OK] OmniParser imported - status: {status}")
    except ImportError as e:
        print(f"[FAIL] OmniParser import: {e}")
        return False
    
    try:
        from superagent.gemini_vision import GeminiVisionAPI
        print("[OK] GeminiVisionAPI imported")
    except ImportError as e:
        print(f"[FAIL] GeminiVisionAPI import: {e}")
        return False
    
    try:
        from superagent.executor import ActionExecutor
        print("[OK] ActionExecutor imported")
    except ImportError as e:
        print(f"[FAIL] ActionExecutor import: {e}")
        return False
    
    return True


def test_element_class():
    """Test the Element class."""
    print("\n=== Testing Element Class ===")
    
    from superagent.fast_agent import Element
    
    elem = Element(
        id=1,
        element_type="button",
        text="Submit",
        x=100,
        y=200,
        width=80,
        height=30,
        confidence=0.95,
        is_interactable=True
    )
    
    # Test center calculation
    center = elem.center
    print(f"[OK] Element center: {center}")
    assert center == (140, 215), f"Expected (140, 215), got {center}"
    
    # Test prompt line generation
    prompt_line = elem.to_prompt_line()
    print(f"[OK] Prompt line: {prompt_line}")
    assert "[1]" in prompt_line
    assert "button" in prompt_line
    assert "Submit" in prompt_line
    
    return True


def test_response_parsing():
    """Test response parsing."""
    print("\n=== Testing Response Parsing ===")
    
    from superagent.fast_agent import FastAgent, ActionType
    
    # Create agent without components (just for parsing test)
    agent = FastAgent()
    
    # Test JSON response
    response = '{"action": "click", "element": 5, "reason": "Click search button"}'
    action = agent._parse_response(response)
    print(f"[OK] Parsed click action: element={action.element_id}, reason={action.reason}")
    assert action.action_type == ActionType.CLICK
    assert action.element_id == 5
    
    # Test done response
    response = '{"action": "done", "reason": "Task completed"}'
    action = agent._parse_response(response)
    print(f"[OK] Parsed done action: reason={action.reason}")
    assert action.action_type == ActionType.DONE
    
    # Test type response
    response = '{"action": "type", "text": "Hello World", "reason": "Enter search query"}'
    action = agent._parse_response(response)
    print(f"[OK] Parsed type action: text={action.text}")
    assert action.action_type == ActionType.TYPE
    assert action.text == "Hello World"
    
    # Test hotkey response
    response = '{"action": "hotkey", "keys": ["ctrl", "t"], "reason": "Open new tab"}'
    action = agent._parse_response(response)
    print(f"[OK] Parsed hotkey action: keys={action.keys}")
    assert action.action_type == ActionType.HOTKEY
    assert action.keys == ["ctrl", "t"]
    
    return True


def test_element_cache():
    """Test element cache."""
    print("\n=== Testing Element Cache ===")
    
    from superagent.fast_agent import ElementCache, Element
    from PIL import Image
    
    cache = ElementCache(max_age_seconds=2.0, max_entries=3)
    
    # Create test image
    img = Image.new('RGB', (100, 100), color='red')
    
    # Test cache miss
    result = cache.get(img)
    print(f"[OK] Cache miss: {result}")
    assert result is None
    assert cache.misses == 1
    
    # Add to cache
    elements = [
        Element(id=1, element_type="button", text="Test", x=0, y=0, width=10, height=10, confidence=0.9)
    ]
    cache.set(img, elements)
    print("[OK] Added elements to cache")
    
    # Test cache hit
    result = cache.get(img)
    print(f"[OK] Cache hit: {len(result)} elements")
    assert result is not None
    assert len(result) == 1
    assert cache.hits == 1
    
    return True


def test_full_initialization():
    """Test full FastAgent initialization (requires API keys)."""
    print("\n=== Testing Full Initialization ===")
    
    gemini_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not gemini_key:
        print("[SKIP] No GEMINI_API_KEY - skipping full initialization test")
        return True
    
    try:
        from superagent.fast_agent import FastAgent
        from superagent.gemini_vision import GeminiVisionAPI
        from superagent.omniparser import OmniParserV2
        from superagent.executor import ActionExecutor
        
        # Initialize components
        print("Initializing Gemini Vision API...")
        vision_api = GeminiVisionAPI(
            api_key=gemini_key,
            model="gemini-2.0-flash-exp",
            timeout=30
        )
        print("[OK] Gemini Vision API initialized")
        
        print("Initializing OmniParser V2...")
        omniparser = OmniParserV2(
            cache_enabled=True,
            min_confidence=0.25,
            max_elements=50,
            generate_captions=False
        )
        print(f"[OK] OmniParser V2 initialized - has_detection: {omniparser.model_loader.has_detection}")
        
        print("Initializing ActionExecutor...")
        executor = ActionExecutor()
        print("[OK] ActionExecutor initialized")
        
        print("Initializing FastAgent...")
        agent = FastAgent(
            vision_api=vision_api,
            omniparser=omniparser,
            executor=executor,
            max_iterations=10,
            action_timeout=5.0,
            enable_cache=True
        )
        print("[OK] FastAgent initialized")
        
        # Get stats
        stats = agent.get_stats()
        print(f"[OK] Agent stats: {stats}")
        
        return True
        
    except Exception as e:
        print(f"[FAIL] Full initialization failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests."""
    print("=" * 60)
    print("FastAgent Test Suite")
    print("=" * 60)
    
    # Add parent directory to path
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    tests = [
        ("Import Test", test_imports),
        ("Element Class Test", test_element_class),
        ("Response Parsing Test", test_response_parsing),
        ("Element Cache Test", test_element_cache),
        ("Full Initialization Test", test_full_initialization),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            success = test_func()
            results.append((name, success))
        except Exception as e:
            print(f"[FAIL] {name}: {e}")
            import traceback
            traceback.print_exc()
            results.append((name, False))
    
    print("\n" + "=" * 60)
    print("Test Results:")
    print("=" * 60)
    
    all_passed = True
    for name, success in results:
        status = "PASS" if success else "FAIL"
        print(f"  {status}: {name}")
        if not success:
            all_passed = False
    
    print("=" * 60)
    if all_passed:
        print("All tests passed!")
        return 0
    else:
        print("Some tests failed!")
        return 1


if __name__ == "__main__":
    sys.exit(main())
