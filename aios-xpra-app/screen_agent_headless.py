#!/usr/bin/env python3
"""
Headless ScreenAgent Runner
Runs the ScreenAgent without Qt GUI for cloud-native deployment
"""

import os
import sys
import asyncio
import logging
from typing import Optional, List, Dict
from PIL import Image
import subprocess
import yaml

# Mock PyQt5 before importing ScreenAgent
sys.path.insert(0, '/opt')
import pyqt5_mock

# Add ScreenAgent to path
SCREENAGENT_PATH = "/opt/screen-agent/client"
sys.path.insert(0, SCREENAGENT_PATH)

from automaton import Automaton
from action import MouseAction, KeyboardAction, PlanAction, WaitAction

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class HeadlessVNCClient:
    """
    Headless replacement for VNCWidget
    Captures screenshots from Xvfb display and executes actions via xdotool/pyautogui
    """
    
    def __init__(self, display=":100", llm_client=None):
        self.display = display
        os.environ['DISPLAY'] = display
        self.current_screenshot = None
        self.llm_client = llm_client
        self.send_prompt = ""
        logger.info(f"HeadlessVNCClient initialized with display {display}")
    
    def get_now_screenshot(self) -> Image.Image:
        """Capture current screen using scrot"""
        try:
            screenshot_path = "/tmp/screenagent_screenshot.png"
            
            # Remove old screenshot
            if os.path.exists(screenshot_path):
                os.remove(screenshot_path)
            
            # Capture with scrot
            result = subprocess.run([
                'scrot', screenshot_path
            ], env={'DISPLAY': self.display}, capture_output=True, text=True)
            
            if result.returncode != 0:
                logger.error(f"Scrot failed: {result.stderr}")
                return None
            
            # Wait for file
            import time
            for _ in range(10):
                if os.path.exists(screenshot_path):
                    break
                time.sleep(0.1)
            
            if not os.path.exists(screenshot_path):
                logger.error("Screenshot not created")
                return None
            
            # Load image
            img = Image.open(screenshot_path)
            self.current_screenshot = img
            logger.info(f"Screenshot captured: {img.size}")
            return img
            
        except Exception as e:
            logger.error(f"Screenshot error: {e}")
            return None
    
    def execute_action(self, action):
        """Execute an action using pyautogui/xdotool"""
        try:
            import pyautogui
            
            if isinstance(action, MouseAction):
                from action import MouseActionType
                
                if action.mouse_action_type == MouseActionType.click:
                    x, y = action.mouse_position
                    pyautogui.click(x, y)
                    logger.info(f"Click at ({x}, {y})")
                    
                elif action.mouse_action_type == MouseActionType.move:
                    x, y = action.mouse_position
                    pyautogui.moveTo(x, y)
                    logger.info(f"Move to ({x}, {y})")
                    
                elif action.mouse_action_type == MouseActionType.scroll_up:
                    pyautogui.scroll(action.scroll_repeat or 3)
                    logger.info(f"Scroll up {action.scroll_repeat}")
                    
                elif action.mouse_action_type == MouseActionType.scroll_down:
                    pyautogui.scroll(-(action.scroll_repeat or 3))
                    logger.info(f"Scroll down {action.scroll_repeat}")
            
            elif isinstance(action, KeyboardAction):
                from action import KeyboardActionType
                
                if action.keyboard_action_type == KeyboardActionType.type:
                    pyautogui.write(action.keyboard_text)
                    logger.info(f"Type: {action.keyboard_text}")
                    
                elif action.keyboard_action_type == KeyboardActionType.hotkey:
                    keys = action.keyboard_key.split('+')
                    pyautogui.hotkey(*keys)
                    logger.info(f"Hotkey: {action.keyboard_key}")
            
        except Exception as e:
            logger.error(f"Action execution error: {e}")
    
    def automaton_state_changed(self, state):
        """Callback when automaton state changes"""
        logger.info(f"Automaton state: {state}")
    
    def set_send_prompt_display(self, prompt):
        """Display prompt being sent to LLM"""
        logger.info(f"Prompt: {prompt[:200]}...")
    
    def update_sub_task_display(self, sub_tasks, current_index):
        """Update display of sub-tasks"""
        logger.info(f"Sub-tasks: {len(sub_tasks)}, Current: {current_index}")
    
    def ask_llm_sync(self, prompt, image, ask_llm_recall_func):
        """Ask LLM and call callback with response"""
        self.send_prompt = prompt
        logger.info(f"Asking LLM: {prompt[:100]}...")
        
        try:
            # Call LLM client
            import uuid
            request_id = uuid.uuid4().hex
            
            def callback(response, fail_message, req_id):
                if response:
                    logger.info(f"LLM Response received: {len(response)} chars")
                    logger.info(f"LLM Response content: {response[:500]}")
                    # Parse the response to extract actions
                    from action import parse_action_from_text
                    actions = parse_action_from_text(response)
                    logger.info(f"Parsed {len(actions)} actions")
                    ask_llm_recall_func(actions)
                else:
                    logger.error(f"LLM failed: {fail_message}")
                    ask_llm_recall_func([])
            
            # Send request to LLM
            self.llm_client.send_request_to_server(prompt, image, request_id, callback)
            
        except Exception as e:
            logger.error(f"LLM request error: {e}")
            ask_llm_recall_func([])


class HeadlessScreenAgent:
    """
    Main headless ScreenAgent runner
    """
    
    def __init__(self, config_path: str, display: str = ":100"):
        self.display = display
        self.config_path = config_path
        self.config = None
        self.automaton = None
        self.vnc_client = None
        self.llm_client = None
        
        # Load config
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        # Initialize components
        self._initialize_llm_client()
        self._initialize_automaton()
        self._initialize_vnc_client()
        
        logger.info("HeadlessScreenAgent initialized")
    
    def _initialize_llm_client(self):
        """Initialize the LLM API client"""
        api_config = self.config['llm_api']
        
        if api_config.get("GPT4V", None):
            from interface_api.gpt4_client import LanguageModelClient
            self.llm_client = LanguageModelClient(api_config)
            logger.info("Using GPT-4V client")
            
        elif api_config.get("ScreenAgent", None):
            from interface_api.cogagent_llm_client import LanguageModelClient
            self.llm_client = LanguageModelClient("ScreenAgent", api_config)
            logger.info("Using ScreenAgent model")
            
        else:
            raise ValueError("No LLM API config found in config.yml")
    
    def _initialize_automaton(self):
        """Initialize the automaton state machine"""
        automaton_config = self.config['automaton']
        self.automaton = Automaton(automaton_config)
        self.automaton.auto_transitions = True  # Enable automatic state transitions
        self.automaton.auto_execute_actions = True  # Auto-execute planned actions
        logger.info("Automaton initialized")
    
    def _initialize_vnc_client(self):
        """Initialize headless VNC client"""
        self.vnc_client = HeadlessVNCClient(self.display, self.llm_client)
        
        # Connect automaton with vnc client
        self.automaton.vncwidget = self.vnc_client
        self.automaton.llm_client = self.llm_client
        
        logger.info("VNC client connected to automaton")
    
    async def execute_task(self, task: str, max_steps: int = 20) -> Dict:
        """
        Execute a task using ScreenAgent
        
        Args:
            task: Task description (e.g., "Go to Gmail and check unread emails")
            max_steps: Maximum execution steps
            
        Returns:
            Dict with status, steps, and results
        """
        logger.info(f"Executing task: {task}")
        
        # Get screen dimensions
        screenshot = self.vnc_client.get_now_screenshot()
        video_width, video_height = screenshot.size if screenshot else (1920, 1080)
        
        # Start automaton with proper parameters
        self.automaton.start(
            task_prompt=task,
            video_width=video_width,
            video_height=video_height
        )
        
        # Wait for completion or timeout
        try:
            steps = 0
            max_wait = max_steps * 10  # 10 seconds per step
            
            while steps < max_wait:
                await asyncio.sleep(1)
                steps += 1
                
                # Check if task is complete
                if hasattr(self.automaton, 'state') and self.automaton.state == 'finish':
                    break
            
            # Collect results
            result = {
                'status': 'completed' if self.automaton.state == 'finish' else 'timeout',
                'task': task,
                'sub_tasks': getattr(self.automaton, 'sub_task_list', {}),
                'total_steps': steps,
                'final_state': self.automaton.state
            }
            
            logger.info(f"Task completed: {result['status']}")
            return result
            
        except Exception as e:
            logger.error(f"Task execution error: {e}")
            return {
                'status': 'error',
                'error': str(e),
                'task': task
            }
    
    def execute_task_sync(self, task: str, max_steps: int = 20) -> Dict:
        """Synchronous wrapper for execute_task"""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(self.execute_task(task, max_steps))
        finally:
            loop.close()


# Standalone CLI
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Headless ScreenAgent Runner')
    parser.add_argument('-c', '--config', type=str, required=True, help='Path to config.yml')
    parser.add_argument('-t', '--task', type=str, required=True, help='Task to execute')
    parser.add_argument('--max-steps', type=int, default=20, help='Maximum steps')
    parser.add_argument('--display', type=str, default=':100', help='X display')
    
    args = parser.parse_args()
    
    # Create and run agent
    agent = HeadlessScreenAgent(args.config, args.display)
    result = agent.execute_task_sync(args.task, args.max_steps)
    
    print(json.dumps(result, indent=2))
