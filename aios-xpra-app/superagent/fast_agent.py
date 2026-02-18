"""
Fast Agent - Production-ready high-speed screen automation.

This is the core execution engine for Nelieo AI OS.
Designed for speed (2-4 seconds per action) and accuracy (98%+).

Architecture:
1. Screen capture -> OmniParser (YOLO detection)
2. Element list -> Gemini Flash (structured query)
3. Element selection -> Direct coordinate click

No redundant OCR. No verbose prompts. Fast and accurate.
"""

import os
import time
import json
import logging
import hashlib
from typing import Dict, Any, Optional, List, Tuple, Union
from dataclasses import dataclass, field
from enum import Enum
from io import BytesIO
from PIL import Image

logger = logging.getLogger(__name__)


class ActionType(Enum):
    """Supported action types."""
    CLICK = "click"
    TYPE = "type"
    HOTKEY = "hotkey"
    SCROLL = "scroll"
    NAVIGATE = "navigate"
    WAIT = "wait"
    DONE = "done"


@dataclass
class Element:
    """Detected UI element with coordinates."""
    id: int
    element_type: str
    text: str
    x: int
    y: int
    width: int
    height: int
    confidence: float
    is_interactable: bool = True
    
    @property
    def center(self) -> Tuple[int, int]:
        """Get center coordinates for clicking."""
        return (self.x + self.width // 2, self.y + self.height // 2)
    
    def to_prompt_line(self) -> str:
        """Format element for LLM prompt (compact)."""
        text_preview = self.text[:30] if self.text else ""
        return f"[{self.id}] {self.element_type}: \"{text_preview}\" at ({self.center[0]},{self.center[1]})"


@dataclass
class AgentAction:
    """Action to execute."""
    action_type: ActionType
    element_id: Optional[int] = None
    x: Optional[int] = None
    y: Optional[int] = None
    text: Optional[str] = None
    keys: Optional[List[str]] = None
    url: Optional[str] = None
    direction: Optional[str] = None
    reason: str = ""
    confidence: float = 0.0


@dataclass
class ExecutionResult:
    """Result of task execution."""
    success: bool
    actions_taken: int
    duration_seconds: float
    error: Optional[str] = None
    final_state: Optional[str] = None


class ElementCache:
    """Cache for detected elements to avoid redundant detection."""
    
    def __init__(self, max_age_seconds: float = 2.0, max_entries: int = 3):
        self._cache: Dict[str, Tuple[float, List[Element]]] = {}
        self.max_age = max_age_seconds
        self.max_entries = max_entries
        self.hits = 0
        self.misses = 0
    
    def _compute_hash(self, image: Image.Image) -> str:
        """Fast image hash using sampling."""
        small = image.resize((32, 32), Image.Resampling.LANCZOS)
        return hashlib.md5(small.tobytes()).hexdigest()
    
    def get(self, image: Image.Image) -> Optional[List[Element]]:
        """Get cached elements if still valid."""
        img_hash = self._compute_hash(image)
        if img_hash in self._cache:
            timestamp, elements = self._cache[img_hash]
            if time.time() - timestamp < self.max_age:
                self.hits += 1
                return elements
            else:
                del self._cache[img_hash]
        self.misses += 1
        return None
    
    def set(self, image: Image.Image, elements: List[Element]):
        """Cache detected elements."""
        if len(self._cache) >= self.max_entries:
            oldest_key = min(self._cache.keys(), key=lambda k: self._cache[k][0])
            del self._cache[oldest_key]
        img_hash = self._compute_hash(image)
        self._cache[img_hash] = (time.time(), elements)
    
    def clear(self):
        """Clear all cached entries."""
        self._cache.clear()


class FastAgent:
    """
    High-performance screen automation agent.
    
    Design principles:
    - Minimal processing: OmniParser only, no OCR
    - Structured LLM queries: Element list -> Element ID
    - Direct execution: Use OmniParser coordinates
    - Intelligent caching: Skip redundant detection
    """
    
    # Compact system prompt
    SYSTEM_PROMPT = """You are a SUPERHUMAN screen automation agent. You have perfect vision and can reasoned about any interface. You can click elements by their ID from the list OR by their (x, y) coordinates from the visual image. Respond with JSON only."""
    
    ACTION_PROMPT = """TASK: {task}
SCREEN_ELEMENTS:
{elements}
HISTORY: {history}

RULES:
1. PERCEPTION: Carefully look at the screenshot. If you see the target (e.g., "Apply" button) but it's not in the SCREEN_ELEMENTS list, use direct x,y coordinates: {{"action":"click","x":<x>,"y":<y>,"reason":"..."}}.
2. PATIENCE: If you just navigated, wait AT LEAST 2 iterations for page load. If the page is blank/loading, use action "wait" with reason "waiting for page to load".
3. NO REPETITION: Never repeat a navigation to the same URL if you just did it.
4. COORDINATES: Screen is 1920x1080. Calculate coordinates EXACTLY from the image.

Select NEXT action. Respond ONLY with JSON:
{{"action":"click|type|hotkey|scroll|navigate|wait|done","element":<id>,"x":<x>,"y":<y>,"text":"<text>","keys":["key"],"url":"<url>","reason":"<why>"}}"""

    def __init__(
        self,
        vision_api=None,
        omniparser=None,
        executor=None,
        max_iterations: int = 30,
        action_timeout: float = 5.0,
        enable_cache: bool = True
    ):
        """
        Initialize fast agent.
        
        Args:
            vision_api: Gemini/OpenAI vision API instance
            omniparser: OmniParser V2 instance for element detection
            executor: Action executor for mouse/keyboard
            max_iterations: Maximum actions per task
            action_timeout: Timeout per action in seconds
            enable_cache: Enable element caching
        """
        self.vision_api = vision_api
        self.omniparser = omniparser
        self.executor = executor
        self.max_iterations = max_iterations
        self.action_timeout = action_timeout
        
        self.element_cache = ElementCache() if enable_cache else None
        self.current_elements: List[Element] = []
        self.action_history: List[str] = []
        self.last_navigated_url: Optional[str] = None  # Track last URL to prevent repeats
        self.last_action_type: Optional[str] = None  # Track last action type
        
        # Performance metrics
        self.stats = {
            "total_actions": 0,
            "successful_actions": 0,
            "total_detection_ms": 0,
            "total_llm_ms": 0,
            "total_execution_ms": 0,
            "cache_hits": 0,
            "cache_misses": 0
        }
        
        self._cancelled = False
        
        logger.info("FastAgent initialized")
        logger.info(f"  Vision API: {type(vision_api).__name__ if vision_api else 'None'}")
        logger.info(f"  OmniParser: {'enabled' if omniparser else 'disabled'}")
        logger.info(f"  Max iterations: {max_iterations}")
        logger.info(f"  Cache: {'enabled' if enable_cache else 'disabled'}")
    
    def cancel(self):
        """Request cancellation of current task."""
        self._cancelled = True
    
    def detect_elements(self, screenshot: Image.Image) -> List[Element]:
        """
        Detect UI elements using OmniParser.
        
        This is the ONLY detection method - no OCR fallback.
        OmniParser provides element type, text, and coordinates.
        
        Args:
            screenshot: PIL Image to analyze
            
        Returns:
            List of detected elements with coordinates
        """
        start_time = time.time()
        
        # Check cache first
        if self.element_cache:
            cached = self.element_cache.get(screenshot)
            if cached is not None:
                self.stats["cache_hits"] += 1
                logger.debug("Element cache hit")
                return cached
            self.stats["cache_misses"] += 1
        
        elements: List[Element] = []
        
        if self.omniparser is None:
            logger.error("OmniParser not available - cannot detect elements")
            return elements
        
        try:
            # Run OmniParser detection
            result = self.omniparser.parse(screenshot)
            
            # Convert to Element objects
            for i, omni_elem in enumerate(result.elements):
                bbox = omni_elem.bbox
                elem = Element(
                    id=i + 1,
                    element_type=omni_elem.element_type.name.lower() if hasattr(omni_elem.element_type, 'name') else 'element',
                    text=omni_elem.text or omni_elem.ocr_text or "",
                    x=int(bbox.x1),
                    y=int(bbox.y1),
                    width=int(bbox.width),
                    height=int(bbox.height),
                    confidence=omni_elem.confidence,
                    is_interactable=omni_elem.is_interactable
                )
                elements.append(elem)
            
            detection_ms = (time.time() - start_time) * 1000
            self.stats["total_detection_ms"] += detection_ms
            
            logger.info(f"Detected {len(elements)} elements in {detection_ms:.0f}ms")
            
            # Cache results
            if self.element_cache:
                self.element_cache.set(screenshot, elements)
            
        except Exception as e:
            logger.error(f"Element detection failed: {e}")
        
        return elements
    
    def build_elements_prompt(self, elements: List[Element], max_elements: int = 60) -> str:
        """
        Build compact element list for LLM prompt.
        
        Args:
            elements: List of detected elements
            max_elements: Maximum elements to include
            
        Returns:
            Formatted element list string
        """
        if not elements:
            return "No elements detected"
        
        # Prioritize interactable elements
        sorted_elements = sorted(
            elements,
            key=lambda e: (-int(e.is_interactable), -e.confidence)
        )[:max_elements]
        
        lines = [e.to_prompt_line() for e in sorted_elements]
        return "\n".join(lines)
    
    def get_action(self, screenshot: Image.Image, task: str, iteration: int) -> Optional[AgentAction]:
        """
        Get next action from vision API.
        
        Pipeline:
        1. Detect elements with OmniParser
        2. Build compact prompt with element list
        3. Query Gemini Flash for element selection
        4. Parse response and map to action
        
        Args:
            screenshot: Current screen state
            task: Task to accomplish
            iteration: Current iteration number
            
        Returns:
            AgentAction to execute, or None if failed
        """
        start_time = time.time()
        
        # Step 1: Detect elements
        self.current_elements = self.detect_elements(screenshot)
        
        if not self.current_elements:
            logger.warning("No elements detected - returning wait action")
            return AgentAction(
                action_type=ActionType.WAIT,
                reason="No elements detected, waiting for screen to load"
            )
        
        # Step 2: Build prompt
        elements_prompt = self.build_elements_prompt(self.current_elements)
        history_str = " -> ".join(self.action_history[-3:]) if self.action_history else "None"
        
        prompt = self.ACTION_PROMPT.format(
            task=task,
            iteration=iteration,
            max_iterations=self.max_iterations,
            elements=elements_prompt,
            history=history_str
        )
        
        # Step 3: Query vision API
        llm_start = time.time()
        try:
            response = self._call_vision_api(screenshot, prompt)
            llm_ms = (time.time() - llm_start) * 1000
            self.stats["total_llm_ms"] += llm_ms
            logger.info(f"LLM response in {llm_ms:.0f}ms")
        except Exception as e:
            logger.error(f"Vision API call failed: {e}")
            return AgentAction(
                action_type=ActionType.WAIT,
                reason=f"API error: {str(e)}"
            )
        
        # Step 4: Parse response
        action = self._parse_response(response)
        
        total_ms = (time.time() - start_time) * 1000
        logger.info(f"Action decision in {total_ms:.0f}ms total")
        
        return action
    
    def _call_vision_api(self, screenshot: Image.Image, prompt: str) -> str:
        """
        Call vision API with screenshot and prompt.
        
        Args:
            screenshot: PIL Image
            prompt: User prompt
            
        Returns:
            Raw API response text
        """
        if self.vision_api is None:
            raise ValueError("Vision API not configured")
        
        # Try direct Gemini API call for simpler response format
        if hasattr(self.vision_api, '_encode_image') and hasattr(self.vision_api, '_call_gemini_api'):
            # Direct call to Gemini - bypasses complex analyze_screen parsing
            try:
                img_base64 = self.vision_api._encode_image(screenshot)
                api_response = self.vision_api._call_gemini_api(prompt, img_base64)
                
                # Extract text from response
                candidate = api_response.get('candidates', [{}])[0]
                content = candidate.get('content', {})
                parts = content.get('parts', [])
                
                text_parts = []
                for part in parts:
                    if isinstance(part, dict) and 'text' in part:
                        text_parts.append(part['text'])
                
                return "\n".join(text_parts).strip()
            except Exception as e:
                logger.warning(f"Direct Gemini call failed: {e}, falling back to analyze_screen")
        
        # Fallback to analyze_screen
        if hasattr(self.vision_api, 'analyze_screen'):
            result = self.vision_api.analyze_screen(
                screenshot=screenshot,
                task=prompt,
                context={"mode": "fast"},
                mode="action"
            )
            # Try to extract the action field directly
            if isinstance(result, dict):
                action_data = result.get('action', result)
                if isinstance(action_data, dict):
                    # Flatten nested action
                    return json.dumps({
                        "action": action_data.get('type', action_data.get('name', 'wait')),
                        "element": action_data.get('element'),
                        "text": action_data.get('text'),
                        "keys": action_data.get('keys'),
                        "url": action_data.get('url'),
                        "x": action_data.get('x'),
                        "y": action_data.get('y'),
                        "reason": action_data.get('reason', result.get('observation', ''))
                    })
                return json.dumps(result)
            return str(result)
        
        elif hasattr(self.vision_api, 'call_with_image'):
            return self.vision_api.call_with_image(
                image=screenshot,
                prompt=prompt,
                system_prompt=self.SYSTEM_PROMPT
            )
        
        else:
            raise ValueError(f"Unsupported vision API type: {type(self.vision_api)}")
    
    def _parse_response(self, response: str) -> AgentAction:
        """
        Parse LLM response into AgentAction.
        
        Args:
            response: Raw LLM response
            
        Returns:
            Parsed AgentAction
        """
        try:
            # Clean response
            response = response.strip()
            
            # Extract JSON
            if response.startswith("```"):
                lines = response.split("\n")
                response = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
            
            # Find JSON object
            start_idx = response.find("{")
            end_idx = response.rfind("}") + 1
            if start_idx >= 0 and end_idx > start_idx:
                json_str = response[start_idx:end_idx]
                data = json.loads(json_str)
            else:
                raise ValueError("No JSON found in response")
            
            # Parse action type - handle dict or string
            action_val = data.get("action", "wait")
            if isinstance(action_val, dict):
                # Handle nested action object
                action_str = action_val.get("type", action_val.get("name", "wait"))
                if isinstance(action_str, dict):
                    action_str = "wait"
            else:
                action_str = str(action_val)
            action_str = action_str.lower().strip()
            
            action_type = ActionType.WAIT
            for at in ActionType:
                if at.value == action_str:
                    action_type = at
                    break
            
            # Build action
            action = AgentAction(
                action_type=action_type,
                reason=data.get("reason", "")
            )
            
            # Handle element reference
            if "element" in data:
                elem_id = int(data["element"])
                action.element_id = elem_id
                
                # Get coordinates from element
                for elem in self.current_elements:
                    if elem.id == elem_id:
                        action.x, action.y = elem.center
                        break
            
            # Handle direct coordinates
            if "x" in data and "y" in data:
                action.x = int(data["x"])
                action.y = int(data["y"])
            
            # Handle text
            if "text" in data:
                action.text = str(data["text"])
            
            # Handle keys
            if "keys" in data:
                keys = data["keys"]
                if isinstance(keys, str):
                    action.keys = [k.strip() for k in keys.split("+")]
                elif isinstance(keys, list):
                    action.keys = [str(k) for k in keys]
            
            # Handle URL
            if "url" in data:
                action.url = str(data["url"])
            
            # Handle scroll direction
            if "direction" in data:
                action.direction = str(data["direction"])
            
            return action
            
        except Exception as e:
            logger.warning(f"Failed to parse response: {e}")
            logger.debug(f"Raw response: {response[:500]}")
            return AgentAction(
                action_type=ActionType.WAIT,
                reason=f"Parse error: {str(e)}"
            )
    
    def execute_action(self, action: AgentAction) -> bool:
        """
        Execute the given action.
        
        Args:
            action: Action to execute
            
        Returns:
            True if action succeeded
        """
        if self.executor is None:
            logger.error("Executor not configured")
            return False
        
        # Prevent duplicate navigate actions
        if action.action_type == ActionType.NAVIGATE:
            if action.url and action.url == self.last_navigated_url:
                logger.info(f"Skipping duplicate navigation to {action.url} - waiting for page load")
                action = AgentAction(
                    action_type=ActionType.WAIT,
                    reason="Already navigated to this URL, waiting for page load"
                )
        
        start_time = time.time()
        success = False
        
        try:
            if action.action_type == ActionType.CLICK:
                if action.x is not None and action.y is not None:
                    self.executor.click(action.x, action.y)
                    success = True
                else:
                    logger.error("Click action missing coordinates")
            
            elif action.action_type == ActionType.TYPE:
                if action.text:
                    self.executor.type_text(action.text)
                    success = True
                else:
                    logger.error("Type action missing text")
            
            elif action.action_type == ActionType.HOTKEY:
                if action.keys:
                    self.executor.hotkey(*action.keys)
                    success = True
                else:
                    logger.error("Hotkey action missing keys")
            
            elif action.action_type == ActionType.SCROLL:
                direction = action.direction or "down"
                self.executor.scroll(direction)
                success = True
            
            elif action.action_type == ActionType.NAVIGATE:
                if action.url:
                    # Open URL in browser
                    self.executor.hotkey("ctrl", "l")
                    time.sleep(0.2)
                    self.executor.type_text(action.url)
                    self.executor.hotkey("return")
                    # Track this URL to prevent repeats
                    self.last_navigated_url = action.url
                    # Wait for page to load before next iteration - INCREASED for slow internet
                    time.sleep(8.0)
                    success = True
                else:
                    logger.error("Navigate action missing URL")
            
            elif action.action_type == ActionType.WAIT:
                # If waiting for page load, wait longer
                wait_time = 5.0 if "load" in str(action.reason).lower() else 1.0
                time.sleep(wait_time)
                success = True
            
            elif action.action_type == ActionType.DONE:
                success = True
            
            exec_ms = (time.time() - start_time) * 1000
            self.stats["total_execution_ms"] += exec_ms
            
            # Record action in history
            action_desc = f"{action.action_type.value}"
            if action.text:
                action_desc += f"(\"{action.text[:20]}\")"
            elif action.x is not None:
                action_desc += f"({action.x},{action.y})"
            self.action_history.append(action_desc)
            
            self.stats["total_actions"] += 1
            if success:
                self.stats["successful_actions"] += 1
            
        except Exception as e:
            logger.error(f"Action execution failed: {e}")
            success = False
        
        return success
    
    def execute_task(
        self,
        task: str,
        screenshot_func,
        timeout: float = 120.0
    ) -> ExecutionResult:
        """
        Execute a complete task.
        
        Args:
            task: Natural language task description
            screenshot_func: Function that returns PIL Image of current screen
            timeout: Maximum time for task completion
            
        Returns:
            ExecutionResult with success status and metrics
        """
        start_time = time.time()
        self._cancelled = False
        self.action_history.clear()
        
        logger.info(f"Starting task: {task}")
        
        iteration = 0
        last_action: Optional[AgentAction] = None
        
        try:
            while iteration < self.max_iterations:
                # Check timeout
                elapsed = time.time() - start_time
                if elapsed >= timeout:
                    return ExecutionResult(
                        success=False,
                        actions_taken=iteration,
                        duration_seconds=elapsed,
                        error="Timeout",
                        final_state=None
                    )
                
                # Check cancellation
                if self._cancelled:
                    return ExecutionResult(
                        success=False,
                        actions_taken=iteration,
                        duration_seconds=elapsed,
                        error="Cancelled",
                        final_state=None
                    )
                
                iteration += 1
                logger.info(f"Iteration {iteration}/{self.max_iterations}")
                
                # Capture screen
                screenshot = screenshot_func()
                if screenshot is None:
                    logger.error("Failed to capture screenshot")
                    time.sleep(0.5)
                    continue
                
                # Get action
                action = self.get_action(screenshot, task, iteration)
                if action is None:
                    logger.warning("No action returned - waiting")
                    time.sleep(0.5)
                    continue
                
                logger.info(f"Action: {action.action_type.value} - {action.reason}")
                
                # Check for done
                if action.action_type == ActionType.DONE:
                    return ExecutionResult(
                        success=True,
                        actions_taken=iteration,
                        duration_seconds=time.time() - start_time,
                        error=None,
                        final_state="Task completed"
                    )
                
                # Execute action
                success = self.execute_action(action)
                if not success:
                    logger.warning("Action execution failed")
                
                last_action = action
                
                # Brief pause to let UI update
                time.sleep(0.3)
            
            # Max iterations reached
            return ExecutionResult(
                success=False,
                actions_taken=iteration,
                duration_seconds=time.time() - start_time,
                error="Max iterations reached",
                final_state=None
            )
            
        except Exception as e:
            logger.error(f"Task execution error: {e}")
            return ExecutionResult(
                success=False,
                actions_taken=iteration,
                duration_seconds=time.time() - start_time,
                error=str(e),
                final_state=None
            )
    
    def get_stats(self) -> Dict[str, Any]:
        """Get performance statistics."""
        stats = dict(self.stats)
        
        # Add cache stats
        if self.element_cache:
            stats["cache_hits"] = self.element_cache.hits
            stats["cache_misses"] = self.element_cache.misses
        
        # Calculate averages
        if stats["total_actions"] > 0:
            stats["avg_detection_ms"] = stats["total_detection_ms"] / stats["total_actions"]
            stats["avg_llm_ms"] = stats["total_llm_ms"] / stats["total_actions"]
            stats["avg_execution_ms"] = stats["total_execution_ms"] / stats["total_actions"]
            stats["avg_total_ms"] = (
                stats["avg_detection_ms"] + 
                stats["avg_llm_ms"] + 
                stats["avg_execution_ms"]
            )
            stats["success_rate"] = stats["successful_actions"] / stats["total_actions"]
        
        return stats
    
    def reset_stats(self):
        """Reset performance statistics."""
        self.stats = {
            "total_actions": 0,
            "successful_actions": 0,
            "total_detection_ms": 0,
            "total_llm_ms": 0,
            "total_execution_ms": 0,
            "cache_hits": 0,
            "cache_misses": 0
        }
        if self.element_cache:
            self.element_cache.hits = 0
            self.element_cache.misses = 0


def create_fast_agent(
    gemini_api_key: Optional[str] = None,
    omniparser_weights_dir: Optional[str] = None
) -> FastAgent:
    """
    Create a FastAgent with default configuration.
    
    Args:
        gemini_api_key: Gemini API key (or from env)
        omniparser_weights_dir: Path to OmniParser weights
        
    Returns:
        Configured FastAgent instance
    """
    from .gemini_vision import GeminiVisionAPI
    from .omniparser import OmniParserV2
    from .executor import ActionExecutor
    
    # Initialize components
    api_key = gemini_api_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("Gemini API key required")
    
    vision_api = GeminiVisionAPI(
        api_key=api_key,
        model="gemini-2.5-flash"  # Fast model that exists
    )
    
    omniparser = OmniParserV2(
        weights_dir="/opt/omniparser/weights", # Correct path in container
        cache_enabled=True,
        min_confidence=0.25,
        max_elements=50,
        generate_captions=False  # Speed: Skip Florence-2
    )
    
    executor = ActionExecutor()
    
    return FastAgent(
        vision_api=vision_api,
        omniparser=omniparser,
        executor=executor,
        max_iterations=30,
        action_timeout=5.0,
        enable_cache=True
    )
