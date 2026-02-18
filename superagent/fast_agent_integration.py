"""
Fast Agent Integration - Connect FastAgent to the AI OS API.

This module provides the integration layer between FastAgent and the
existing agent-api.py, enabling fast task execution through the API.
"""

import os
import time
import logging
from typing import Optional, Dict, Any, Callable
from PIL import Image

logger = logging.getLogger(__name__)

# Lazy imports to avoid circular dependencies
_fast_agent = None
_omniparser = None
_gemini_api = None
_executor = None


def get_omniparser():
    """Get or create OmniParser instance."""
    global _omniparser
    if _omniparser is None:
        try:
            from .omniparser import OmniParserV2
            _omniparser = OmniParserV2(
                cache_enabled=True,
                min_confidence=0.25,
                max_elements=50,
                generate_captions=False  # Disable Florence-2 for speed
            )
            logger.info("OmniParser V2 initialized for FastAgent")
        except Exception as e:
            logger.error(f"Failed to initialize OmniParser: {e}")
            _omniparser = None
    return _omniparser


def get_gemini_api():
    """Get or create Gemini Vision API instance."""
    global _gemini_api
    if _gemini_api is None:
        try:
            from .gemini_vision import GeminiVisionAPI
            
            api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
            if not api_key:
                logger.error("No Gemini API key found in environment")
                return None
            
            _gemini_api = GeminiVisionAPI(
                api_key=api_key,
                model="gemini-2.5-flash",  # Latest stable high-speed model
                timeout=30
            )
            logger.info("Gemini Vision API initialized for FastAgent")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini API: {e}")
            _gemini_api = None
    return _gemini_api


def get_executor():
    """Get or create action executor instance."""
    global _executor
    if _executor is None:
        try:
            from .executor import ActionExecutor
            _executor = ActionExecutor()
            logger.info("ActionExecutor initialized for FastAgent")
        except Exception as e:
            logger.error(f"Failed to initialize executor: {e}")
            _executor = None
    return _executor


def get_fast_agent():
    """Get or create FastAgent instance."""
    global _fast_agent
    if _fast_agent is None:
        try:
            from .fast_agent import FastAgent
            
            omniparser = get_omniparser()
            gemini_api = get_gemini_api()
            executor = get_executor()
            
            if omniparser is None or gemini_api is None or executor is None:
                logger.error("Missing required components for FastAgent")
                return None
            
            _fast_agent = FastAgent(
                vision_api=gemini_api,
                omniparser=omniparser,
                executor=executor,
                max_iterations=30,
                action_timeout=5.0,
                enable_cache=True
            )
            logger.info("FastAgent initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize FastAgent: {e}")
            _fast_agent = None
    return _fast_agent


def execute_fast_task(
    task: str,
    screenshot_func: Callable[[], Optional[Image.Image]],
    timeout: float = 120.0,
    user_id: str = "default"
) -> Dict[str, Any]:
    """
    Execute a task using FastAgent.
    
    This is the main entry point for fast task execution.
    
    Args:
        task: Natural language task description
        screenshot_func: Function that returns current screen as PIL Image
        timeout: Maximum execution time in seconds
        user_id: User identifier for logging
        
    Returns:
        Dict with execution result:
        {
            "success": bool,
            "actions_taken": int,
            "duration": float,
            "error": Optional[str],
            "final_state": Optional[str],
            "stats": Dict[str, Any]
        }
    """
    start_time = time.time()
    
    agent = get_fast_agent()
    if agent is None:
        return {
            "success": False,
            "actions_taken": 0,
            "duration": 0,
            "error": "FastAgent not available",
            "final_state": None,
            "stats": {}
        }
    
    logger.info(f"FastAgent executing task for user {user_id}: {task[:100]}")
    
    try:
        result = agent.execute_task(
            task=task,
            screenshot_func=screenshot_func,
            timeout=timeout
        )
        
        stats = agent.get_stats()
        
        return {
            "success": result.success,
            "actions_taken": result.actions_taken,
            "duration": result.duration_seconds,
            "error": result.error,
            "final_state": result.final_state,
            "stats": stats
        }
        
    except Exception as e:
        logger.error(f"FastAgent execution error: {e}")
        return {
            "success": False,
            "actions_taken": 0,
            "duration": time.time() - start_time,
            "error": str(e),
            "final_state": None,
            "stats": {}
        }


def cancel_fast_task():
    """Cancel the currently running fast task."""
    agent = get_fast_agent()
    if agent:
        agent.cancel()
        logger.info("FastAgent task cancellation requested")


def get_fast_agent_stats() -> Dict[str, Any]:
    """Get FastAgent performance statistics."""
    agent = get_fast_agent()
    if agent:
        return agent.get_stats()
    return {}


def reset_fast_agent():
    """Reset FastAgent state and statistics."""
    global _fast_agent
    agent = get_fast_agent()
    if agent:
        agent.reset_stats()
        agent.action_history.clear()
        if agent.element_cache:
            agent.element_cache.clear()
    logger.info("FastAgent reset complete")


class FastAgentAPI:
    """
    API wrapper for FastAgent integration.
    
    Provides a clean interface for the agent-api.py to use.
    """
    
    def __init__(self, screenshot_provider=None):
        """
        Initialize FastAgent API.
        
        Args:
            screenshot_provider: Object with capture() method that returns PIL Image
        """
        self.screenshot_provider = screenshot_provider
        self._initialized = False
    
    def initialize(self) -> bool:
        """Initialize FastAgent and all dependencies."""
        agent = get_fast_agent()
        self._initialized = agent is not None
        return self._initialized
    
    @property
    def is_available(self) -> bool:
        """Check if FastAgent is available."""
        return self._initialized or get_fast_agent() is not None
    
    def execute(self, task: str, timeout: float = 120.0, user_id: str = "default") -> Dict[str, Any]:
        """
        Execute a task.
        
        Args:
            task: Task to execute
            timeout: Timeout in seconds
            user_id: User identifier
            
        Returns:
            Execution result dict
        """
        if self.screenshot_provider is None:
            return {
                "success": False,
                "error": "No screenshot provider configured"
            }
        
        def get_screenshot():
            try:
                return self.screenshot_provider.capture()
            except Exception as e:
                logger.error(f"Screenshot capture failed: {e}")
                return None
        
        return execute_fast_task(
            task=task,
            screenshot_func=get_screenshot,
            timeout=timeout,
            user_id=user_id
        )
    
    def cancel(self):
        """Cancel current task."""
        cancel_fast_task()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get performance statistics."""
        return get_fast_agent_stats()
    
    def reset(self):
        """Reset agent state."""
        reset_fast_agent()


# Singleton instance
_fast_agent_api: Optional[FastAgentAPI] = None


def get_fast_agent_api(screenshot_provider=None) -> FastAgentAPI:
    """Get or create FastAgentAPI instance."""
    global _fast_agent_api
    if _fast_agent_api is None:
        _fast_agent_api = FastAgentAPI(screenshot_provider)
        _fast_agent_api.initialize()
    elif screenshot_provider is not None:
        _fast_agent_api.screenshot_provider = screenshot_provider
    return _fast_agent_api
