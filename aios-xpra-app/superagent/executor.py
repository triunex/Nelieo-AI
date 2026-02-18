"""
Action Executor - Execute actions on X11 display with superhuman precision

Optimized for:
- Speed: Minimal delays between actions
- Reliability: Verify execution success
- Safety: Validate coordinates and inputs
"""

import os
import time
import subprocess
import logging
from typing import Optional, Tuple, List
from PIL import Image

try:
    import pyautogui
except ImportError:
    pyautogui = None
    logging.warning("pyautogui not available - install for full functionality")

from .actions import Action, ActionType, ActionResult

logger = logging.getLogger(__name__)


class ActionExecutor:
    """
    High-performance action executor for X11
    
    Features:
    - Direct X11 control via pyautogui
    - Action verification
    - Performance tracking
    - Safety bounds checking
    """
    
    def __init__(self, display: str = ':100', screen_size: Tuple[int, int] = (1920, 1080)):
        self.display = display
        self.screen_width, self.screen_height = screen_size
        
        # Configure environment
        os.environ['DISPLAY'] = display
        
        # Configure pyautogui for headless
        if pyautogui:
            pyautogui.FAILSAFE = False  # Disable mouse corner failsafe
            pyautogui.PAUSE = 0.1  # Minimal pause between actions
        
        # Performance tracking
        self.total_actions = 0
        self.successful_actions = 0
        self.total_time = 0.0
        self._preferred_keywords: List[str] = []
        self._preferred_wm_class: Optional[str] = None
        
        logger.info(f"ActionExecutor initialized on {display} ({screen_size[0]}x{screen_size[1]})")
    
    def execute(self, action: Action, verify: bool = True) -> ActionResult:
        """
        Execute action and optionally verify success
        
        Args:
            action: Action to execute
            verify: Whether to verify execution (slower but safer)
        
        Returns:
            ActionResult with success status
        """
        start_time = time.time()
        screenshot_before = None
        screenshot_after = None
        
        try:
            # Capture before state if verifying
            if verify and action.type not in [ActionType.WAIT, ActionType.DONE]:
                screenshot_before = self._capture_screen()
            
            # Execute the action
            success = self._execute_action(action)
            
            # Small delay for UI to respond
            if action.type != ActionType.WAIT:
                time.sleep(0.15)  # 🔥 SPEED: Reduced from 0.3s
            
            # Capture after state if verifying
            if verify and success and action.type not in [ActionType.WAIT, ActionType.DONE]:
                screenshot_after = self._capture_screen()
            
            # Track performance
            duration = time.time() - start_time
            self.total_actions += 1
            self.total_time += duration
            
            if success:
                self.successful_actions += 1
            
            logger.info(f"Executed {action.type.value}: {success} ({duration:.3f}s)")
            
            return ActionResult(
                success=success,
                action=action,
                duration=duration,
                screenshot_before=screenshot_before,
                screenshot_after=screenshot_after
            )
            
        except Exception as e:
            duration = time.time() - start_time
            self.total_actions += 1
            self.total_time += duration
            
            logger.error(f"Action execution failed: {e}")
            
            return ActionResult(
                success=False,
                action=action,
                error=str(e),
                duration=duration
            )
    
    def set_focus_hint(self, app_name: Optional[str]):
        """Provide a hint about which window should be focused for screenshots."""
        self._preferred_keywords = []
        self._preferred_wm_class = None
        self._preferred_description = None

        if not app_name:
            logger.info("Window focus hint cleared")
            return

        name = app_name.lower()
        hint_map = {
            'chrome': {'keywords': []},
            'gmail': {'keywords': ['gmail', 'inbox', 'mail']},
            'google sheets': {'keywords': ['google sheets', 'sheet', 'spreadsheet']},
            'linkedin': {'keywords': ['linkedin']},
            'notion': {'keywords': ['notion']},
            'facebook': {'keywords': ['facebook']},
            'instagram': {'keywords': ['instagram']},
            'salesforce': {'keywords': ['salesforce']},
            'quickbooks': {'keywords': ['quickbooks']},
            'asana': {'keywords': ['asana']},
            'zoom': {'wm_class': 'zoom'},
            'slack': {'wm_class': 'slack'}
        }

        hint = hint_map.get(name, {'keywords': [name]})

        keywords = hint.get('keywords', [])
        wm_class = hint.get('wm_class')

        self._preferred_keywords = keywords
        self._preferred_wm_class = wm_class

        if wm_class:
            logger.info(f"Window focus hint set to class '{wm_class}' for {app_name}")
        elif keywords:
            logger.info(f"Window focus hint keywords for {app_name}: {keywords}")
        else:
            logger.info(f"Window focus hint set to generic Chrome for {app_name}")

    def _execute_action(self, action: Action) -> bool:
        """Execute specific action type"""
        
        if not pyautogui:
            logger.error("pyautogui not available")
            return False
        
        try:
            if action.type == ActionType.CLICK:
                return self._click(action.x, action.y, action.reason)
            
            elif action.type == ActionType.DOUBLE_CLICK:
                return self._double_click(action.x, action.y)
            
            elif action.type == ActionType.RIGHT_CLICK:
                return self._right_click(action.x, action.y)
            
            elif action.type == ActionType.TYPE:
                return self._type_text(action.text)
            
            elif action.type == ActionType.HOTKEY:
                # Pass x,y coordinates if available (for Ctrl+Click)
                return self._hotkey(action.keys, getattr(action, 'x', None), getattr(action, 'y', None))
            
            elif action.type == ActionType.SCROLL:
                return self._scroll(action.amount)
            
            elif action.type == ActionType.DRAG:
                return self._drag(action.x, action.y)
            
            elif action.type == ActionType.WAIT:
                return self._wait(action.amount)
            
            elif action.type == ActionType.DONE:
                logger.info("Task completed successfully")
                return True
            
            else:
                logger.warning(f"Unknown action type: {action.type}")
                return False
                
        except Exception as e:
            logger.error(f"Action execution error: {e}")
            return False
    
    def _click(self, x: int, y: int, reason: str = "") -> bool:
        """Click at coordinates with adaptive wait based on action type."""
        if not self._validate_coordinates(x, y):
            return False
        
        pyautogui.click(x, y)
        
        # Adaptive wait based on action context
        wait_time = self._calculate_adaptive_wait(reason)
        if wait_time > 0:
            logger.info("Waiting %.1fs after click (%s)", wait_time, 
                       self._categorize_click(reason))
            time.sleep(wait_time)
        
        return True
    
    def _calculate_adaptive_wait(self, reason: str) -> float:
        """
        Calculate wait time based on action reason.
        
        Navigation actions need longer waits, UI clicks need minimal waits.
        """
        if not reason:
            return 0.5  # Default minimal wait
        
        reason_lower = reason.lower()
        
        # Long waits (1.5s) - page navigation actions
        navigation_keywords = [
            'navigate', 'go to', 'open page', 'new page', 'load',
            'submit', 'search result', 'link', 'url', 'website',
            'login', 'sign in', 'redirect'
        ]
        for keyword in navigation_keywords:
            if keyword in reason_lower:
                return 1.5
        
        # Medium waits (0.8s) - content loading
        content_keywords = [
            'search', 'find', 'video', 'image', 'content',
            'expand', 'dropdown', 'menu', 'tab', 'modal'
        ]
        for keyword in content_keywords:
            if keyword in reason_lower:
                return 0.8
        
        # Short waits (0.3s) - UI interactions
        ui_keywords = [
            'button', 'click', 'select', 'check', 'toggle',
            'input', 'field', 'focus', 'icon'
        ]
        for keyword in ui_keywords:
            if keyword in reason_lower:
                return 0.3
        
        # Default minimal wait
        return 0.5
    
    def _categorize_click(self, reason: str) -> str:
        """Categorize click for logging."""
        if not reason:
            return "default"
        
        reason_lower = reason.lower()
        
        if any(k in reason_lower for k in ['navigate', 'go to', 'link', 'url']):
            return "navigation"
        elif any(k in reason_lower for k in ['search', 'find']):
            return "search"
        elif any(k in reason_lower for k in ['button', 'submit']):
            return "button"
        elif any(k in reason_lower for k in ['input', 'field', 'type']):
            return "input"
        else:
            return "ui"
    
    def _double_click(self, x: int, y: int) -> bool:
        """Double-click at coordinates"""
        if not self._validate_coordinates(x, y):
            return False
        
        pyautogui.doubleClick(x, y)
        return True
    
    def _right_click(self, x: int, y: int) -> bool:
        """Right-click at coordinates"""
        if not self._validate_coordinates(x, y):
            return False
        
        pyautogui.rightClick(x, y)
        return True
    
    def _type_text(self, text: str) -> bool:
        """Type text with optimal speed"""
        if not text:
            logger.warning("Empty text to type")
            return False
        
        # Type with minimal interval for speed
        pyautogui.write(text, interval=0.02)
        return True
    
    def _hotkey(self, keys: list, x: int = None, y: int = None) -> bool:
        """Execute hotkey combination, with optional click coordinates for Ctrl+Click"""
        if not keys or not isinstance(keys, list):
            logger.warning(f"Invalid hotkey: {keys}")
            return False
        
        # Normalize key names
        normalized_keys = [self._normalize_key(k) for k in keys]
        
        # 🔥 SPECIAL: Ctrl+Click to open link in new tab
        if x is not None and y is not None and 'ctrl' in normalized_keys:
            if not self._validate_coordinates(x, y):
                return False
            logger.info(f"Ctrl+Click at ({x}, {y}) to open in new tab")
            pyautogui.keyDown('ctrl')
            time.sleep(0.05)
            pyautogui.click(x, y)
            time.sleep(0.05)
            pyautogui.keyUp('ctrl')
            return True
        
        # Regular hotkey
        pyautogui.hotkey(*normalized_keys)
        return True
    
    def _scroll(self, amount: int) -> bool:
        """Scroll by amount (negative = down, positive = up)"""
        if amount is None:
            amount = -3  # Default scroll down
        
        pyautogui.scroll(amount)
        return True
    
    def _drag(self, x: int, y: int) -> bool:
        """Drag to coordinates"""
        if not self._validate_coordinates(x, y):
            return False
        
        pyautogui.drag(x, y, duration=0.3)
        return True
    
    def _wait(self, duration: float) -> bool:
        """Wait for specified duration"""
        if duration is None:
            duration = 1.0
        
        time.sleep(duration)
        return True
    
    def _validate_coordinates(self, x: int, y: int) -> bool:
        """Validate coordinates are within screen bounds"""
        if x is None or y is None:
            logger.error("Missing coordinates")
            return False
        
        if not (0 <= x < self.screen_width and 0 <= y < self.screen_height):
            logger.error(f"Coordinates ({x}, {y}) out of bounds (0-{self.screen_width}, 0-{self.screen_height})")
            return False
        
        return True
    
    def _normalize_key(self, key: str) -> str:
        """Normalize key names for pyautogui"""
        key_map = {
            'control': 'ctrl',
            'ctl': 'ctrl',
            'return': 'enter',
            'escape': 'esc'
        }
        return key_map.get(key.lower(), key.lower())
    
    def _focus_preferred_window(self) -> bool:
        """Focus the window hinted by set_focus_hint."""
        # Try class-based focus first (Slack, Zoom, etc.)
        if self._preferred_wm_class:
            try:
                result = subprocess.run(
                    ['wmctrl', '-x', '-a', self._preferred_wm_class],
                    capture_output=True,
                    text=True,
                    env={'DISPLAY': self.display}
                )
                if result.returncode == 0:
                    logger.info(f"Focusing window with class {self._preferred_wm_class}")
                    time.sleep(0.2)  # 🔥 SPEED: Reduced from 0.5s
                    return True
                # Fallback to name-based focus
                result = subprocess.run(
                    ['wmctrl', '-a', self._preferred_wm_class],
                    capture_output=True,
                    text=True,
                    env={'DISPLAY': self.display}
                )
                if result.returncode == 0:
                    logger.info(f"Focusing window named {self._preferred_wm_class}")
                    time.sleep(0.2)  # 🔥 SPEED: Reduced from 0.5s
                    return True
            except Exception as exc:
                logger.debug(f"Class-based focus failed: {exc}")

        # Next try Chrome keyword matching
        if self._preferred_keywords:
            return self._focus_latest_chrome_window(self._preferred_keywords)

        return False

    def _focus_latest_chrome_window(self, preferred_keywords: Optional[List[str]] = None) -> bool:
        """Focus a Chrome window, preferring titles with given keywords."""
        try:
            # Get all Chrome windows
            result = subprocess.run(
                ['wmctrl', '-l'],
                capture_output=True,
                text=True,
                env={'DISPLAY': self.display}
            )
            
            # Find Chrome windows
            chrome_windows = [
                line for line in result.stdout.split('\n') 
                if 'Chrome' in line or 'Google Chrome' in line
            ]
            
            target_window = None
            if preferred_keywords:
                for line in reversed(chrome_windows):
                    title_lower = line.lower()
                    if any(keyword in title_lower for keyword in preferred_keywords):
                        target_window = line
                        break
            if target_window is None and chrome_windows:
                target_window = chrome_windows[-1]
            
            if target_window:
                parts = target_window.split()
                if not parts:
                    logger.warning("Unable to parse Chrome window line")
                    return False
                window_id = parts[0]
                if preferred_keywords:
                    logger.info(f"Focusing Chrome window matching {preferred_keywords}: {window_id}")
                else:
                    logger.info(f"Focusing Chrome window: {window_id}")
                subprocess.run(
                    ['wmctrl', '-ia', window_id],
                    env={'DISPLAY': self.display},
                    check=True
                )
                time.sleep(0.2)  # 🔥 SPEED: Reduced from 0.5s
                return True
            
            logger.warning("No Chrome windows found to focus")
            return False
                
        except Exception as e:
            logger.error(f"Failed to focus Chrome window: {e}")
            return False
    
    def _capture_screen(self) -> Optional[Image.Image]:
        """Capture current screen state via Xpra (what user actually sees)"""
        try:
            # Focus preferred window (or fallback to latest Chrome)
            if not self._focus_preferred_window():
                self._focus_latest_chrome_window()
            
            screenshot_path = '/tmp/action_verify.png'
            # Remove previous screenshot if it exists
            if os.path.exists(screenshot_path):
                os.remove(screenshot_path)
            
            # Method 1: Capture exactly what Xpra streams (requires active client)
            try:
                result = subprocess.run(
                    ['xpra', 'screenshot', screenshot_path, self.display],
                    capture_output=True,
                    timeout=5,
                    check=False
                )
                if result.returncode == 0 and os.path.exists(screenshot_path):
                    size_bytes = os.path.getsize(screenshot_path)
                    if size_bytes > 50_000:  # Real screenshots are at least ~50KB
                        logger.info(f"✅ Captured via Xpra ({size_bytes // 1024}KB)")
                        img = Image.open(screenshot_path)
                        if img.mode == 'RGBA':
                            img = img.convert('RGB')
                        return img
                    logger.warning(f"Xpra screenshot too small ({size_bytes} bytes) - falling back")
                else:
                    logger.warning(f"Xpra screenshot failed (code {result.returncode})")
            except Exception as e:
                logger.debug(f"Xpra screenshot error: {e}")
            
            # Method 2: Fallback to scrot (original method)
            subprocess.run(
                ['scrot', screenshot_path],
                env={'DISPLAY': self.display},
                check=True,
                stderr=subprocess.DEVNULL,
                timeout=3
            )
            
            if os.path.exists(screenshot_path):
                img = Image.open(screenshot_path)
                if img.mode == 'RGBA':
                    img = img.convert('RGB')
                logger.info(f"📸 Screenshot captured via fallback: {img.size}")
                return img
            
            logger.error("Screenshot file not created")
            return None
            
        except Exception as e:
            logger.error(f"Failed to capture screen: {e}")
            return None
    
    def get_mouse_position(self) -> Tuple[int, int]:
        """Get current mouse position"""
        if pyautogui:
            return pyautogui.position()
        return (0, 0)
    
    def move_mouse(self, x: int, y: int, duration: float = 0.2) -> bool:
        """Move mouse to position smoothly"""
        if not self._validate_coordinates(x, y):
            return False
        
        if pyautogui:
            pyautogui.moveTo(x, y, duration=duration)
            return True
        return False
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate percentage"""
        if self.total_actions == 0:
            return 0.0
        return (self.successful_actions / self.total_actions) * 100
    
    @property
    def avg_execution_time(self) -> float:
        """Average action execution time"""
        if self.total_actions == 0:
            return 0.0
        return self.total_time / self.total_actions
    
    def get_stats(self) -> dict:
        """Get performance statistics"""
        return {
            'total_actions': self.total_actions,
            'successful_actions': self.successful_actions,
            'success_rate': self.success_rate,
            'avg_execution_time': self.avg_execution_time,
            'total_time': self.total_time
        }
    
    # ====================== FastAgent Public API ======================
    # Simple methods for direct use by FastAgent
    
    def click(self, x: int, y: int, reason: str = "") -> bool:
        """Public method: Click at coordinates."""
        return self._click(x, y, reason)
    
    def type_text(self, text: str) -> bool:
        """Public method: Type text."""
        return self._type_text(text)
    
    def hotkey(self, *keys) -> bool:
        """Public method: Execute hotkey combination."""
        return self._hotkey(list(keys))
    
    def scroll(self, direction: str = "down", amount: int = 3) -> bool:
        """Public method: Scroll in direction."""
        scroll_amount = -amount if direction.lower() == "down" else amount
        return self._scroll(scroll_amount)
    
    def capture_screen(self) -> Optional[Image.Image]:
        """Public method: Capture screen and return PIL Image."""
        return self._capture_screen()

