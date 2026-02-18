#!/usr/bin/env python3
"""
SuperAgent Test Script

Tests SuperAgent with simple tasks to verify:
1. Screenshot capture works
2. Vision API responds
3. Action execution works
4. OODA loop completes

Usage:
    python test_superagent.py
"""

import os
import sys
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Add superagent to path
sys.path.insert(0, '/opt/lumina-search-flow-main')

def test_screenshot():
    """Test 1: Verify screenshot capture works"""
    logger.info("=== Test 1: Screenshot Capture ===")
    
    try:
        from superagent.executor import ActionExecutor
        
        executor = ActionExecutor()
        screenshot = executor._capture_screen()
        
        if screenshot:
            # Screenshot is PIL Image object, check size instead
            logger.info(f"✓ Screenshot captured successfully ({screenshot.width}x{screenshot.height})")
            return True
        else:
            logger.error("✗ Screenshot capture failed")
            return False
            
    except Exception as e:
        logger.error(f"✗ Screenshot test failed: {e}")
        return False


def test_vision_api():
    """Test 2: Verify Vision API connectivity"""
    logger.info("\n=== Test 2: Vision API ===")
    
    try:
        from superagent.vision import VisionAPI
        from superagent.executor import ActionExecutor
        
        # Get API key
        api_key = os.getenv('OPENROUTER_API_KEY', '')
        if not api_key:
            logger.error("✗ OPENROUTER_API_KEY not set")
            return False
        
        # Create vision API
        vision = VisionAPI(api_key=api_key)
        
        # Get screenshot
        executor = ActionExecutor()
        screenshot = executor._capture_screen()
        
        if not screenshot:
            logger.error("✗ Failed to get screenshot")
            return False
        
        # Simple test: ask what's visible
        logger.info("Asking vision API to analyze screenshot...")
        action = vision.get_action(
            screenshot=screenshot,
            task="What applications are visible on screen?",
            context={}
        )
        
        if action:
            logger.info(f"✓ Vision API responded: {action}")
            return True
        else:
            logger.error("✗ Vision API returned no action")
            return False
            
    except Exception as e:
        logger.error(f"✗ Vision API test failed: {e}")
        return False


def test_action_execution():
    """Test 3: Verify action execution"""
    logger.info("\n=== Test 3: Action Execution ===")
    
    try:
        from superagent.executor import ActionExecutor
        from superagent.actions import Action, ActionType
        
        executor = ActionExecutor()
        
        # Test wait action (safest)
        action = Action(
            type=ActionType.WAIT,
            amount=0.5,
            reason="Test action execution"
        )
        
        logger.info(f"Executing test action: {action}")
        result = executor.execute(action, verify=False)
        
        if result.success:
            logger.info(f"✓ Action executed successfully (duration: {result.duration:.2f}s)")
            return True
        else:
            logger.error(f"✗ Action failed: {result.error}")
            return False
            
    except Exception as e:
        logger.error(f"✗ Action execution test failed: {e}")
        return False


def test_full_agent():
    """Test 4: Full agent with simple task"""
    logger.info("\n=== Test 4: Full SuperAgent ===")
    
    try:
        from superagent.core import SuperAgent
        
        # Get API key
        api_key = os.getenv('OPENROUTER_API_KEY', '')
        if not api_key:
            logger.error("✗ OPENROUTER_API_KEY not set")
            return False
        
        # Create agent
        agent = SuperAgent(
            api_key=api_key,
            max_iterations=5  # Keep it short for testing
        )
        
        # Simple task: identify current desktop
        task = "Look at the screen and tell me what you see (use DONE action to report)"
        
        logger.info(f"Executing task: {task}")
        result = agent.execute_task(task, timeout=30.0)
        
        if result.success:
            logger.info(f"✓ Task completed successfully!")
            logger.info(f"  - Actions taken: {result.actions_taken}")
            logger.info(f"  - Duration: {result.duration:.2f}s")
            logger.info(f"  - Final state: {result.final_state}")
            return True
        else:
            logger.error(f"✗ Task failed: {result.error}")
            logger.info(f"  - Actions taken: {result.actions_taken}")
            logger.info(f"  - Duration: {result.duration:.2f}s")
            return False
            
    except Exception as e:
        logger.error(f"✗ Full agent test failed: {e}")
        return False


def test_stats():
    """Test 5: Verify stats collection"""
    logger.info("\n=== Test 5: Statistics ===")
    
    try:
        from superagent.core import SuperAgent
        
        api_key = os.getenv('OPENROUTER_API_KEY', '')
        if not api_key:
            logger.warning("Skipping stats test (no API key)")
            return True
        
        agent = SuperAgent(api_key=api_key)
        stats = agent.get_stats()
        
        logger.info("✓ Stats collected:")
        logger.info(f"  - Vision API: {stats.get('vision', {})}")
        logger.info(f"  - Executor: {stats.get('executor', {})}")
        logger.info(f"  - Memory: {stats.get('short_memory', {})}")
        
        return True
        
    except Exception as e:
        logger.error(f"✗ Stats test failed: {e}")
        return False


def main():
    """Run all tests"""
    logger.info("=" * 60)
    logger.info("SuperAgent Test Suite")
    logger.info("=" * 60)
    
    tests = [
        ("Screenshot Capture", test_screenshot),
        ("Vision API", test_vision_api),
        ("Action Execution", test_action_execution),
        ("Full Agent", test_full_agent),
        ("Statistics", test_stats)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except KeyboardInterrupt:
            logger.info("\nTests interrupted by user")
            break
        except Exception as e:
            logger.error(f"Test '{test_name}' crashed: {e}")
            results.append((test_name, False))
    
    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("Test Summary")
    logger.info("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        logger.info(f"{status}: {test_name}")
    
    logger.info(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        logger.info("🎉 All tests passed!")
        logger.info("\n" + "=" * 60)
        logger.info("Next: Run workflow tests")
        logger.info("=" * 60)
        logger.info("python3 /opt/lumina-search-flow-main/test_workflows.py")
        return 0
    else:
        logger.warning(f"⚠️  {total - passed} test(s) failed")
        return 1


if __name__ == '__main__':
    sys.exit(main())
