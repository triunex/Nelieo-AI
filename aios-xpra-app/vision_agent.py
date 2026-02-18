#!/usr/bin/env python3
"""
Headless Vision Agent for AI OS
Uses GPT-4 Vision to autonomously control applications
"""

import os
import sys
import time
import base64
import logging
import subprocess
from io import BytesIO
from PIL import Image
import pyautogui
from openai import OpenAI

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/vision-agent.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class VisionAgent:
    def __init__(self, display=":100", api_key=None):
        self.display = display
        os.environ['DISPLAY'] = display
        
        # Initialize OpenAI client
        self.api_key = api_key or os.environ.get('OPENAI_API_KEY')
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY not set")
        
        self.client = OpenAI(api_key=self.api_key)
        
        # Configure pyautogui
        pyautogui.FAILSAFE = False
        pyautogui.PAUSE = 0.5
        
        logger.info(f"VisionAgent initialized with display {display}")
    
    def take_screenshot(self) -> Image.Image:
        """Capture current screen using Xvfb display"""
        try:
            # Use scrot to capture screenshot
            screenshot_path = "/tmp/screenshot.png"
            
            # Remove old screenshot if exists
            if os.path.exists(screenshot_path):
                os.remove(screenshot_path)
            
            result = subprocess.run([
                'scrot', screenshot_path
            ], env={'DISPLAY': self.display}, capture_output=True, text=True)
            
            if result.returncode != 0:
                logger.error(f"Scrot failed: {result.stderr}")
                raise RuntimeError(f"Screenshot failed: {result.stderr}")
            
            # Wait for file to be created
            import time
            for _ in range(10):  # Wait up to 1 second
                if os.path.exists(screenshot_path):
                    break
                time.sleep(0.1)
            
            if not os.path.exists(screenshot_path):
                raise FileNotFoundError(f"Screenshot was not created at {screenshot_path}")
            
            # Load and return image
            img = Image.open(screenshot_path)
            logger.info(f"Screenshot captured: {img.size}")
            return img
        except Exception as e:
            logger.error(f"Failed to capture screenshot: {e}")
            raise
    
    def encode_image_base64(self, image: Image.Image) -> str:
        """Convert PIL Image to base64 string"""
        buffered = BytesIO()
        image.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        return img_str
    
    def vision_analyze(self, task: str, max_steps: int = 20) -> dict:
        """
        Use GPT-4 Vision to analyze screen and execute task
        Returns execution log with steps taken
        """
        logger.info(f"Starting vision task: {task}")
        
        steps_log = []
        step_count = 0
        
        system_prompt = """You are an AI agent controlling a computer screen via vision.
You can see the current screen and must decide what actions to take.

Available actions:
1. CLICK(x, y) - Click at coordinates
2. TYPE(text) - Type text
3. KEY(key_name) - Press a key (Enter, Tab, Escape, etc.)
4. SCROLL(direction, amount) - Scroll up/down/left/right
5. WAIT(seconds) - Wait for screen to update
6. DONE(message) - Task completed

Analyze the screen and respond with ONE action in this exact format:
ACTION: <action_name>(<parameters>)
REASONING: <why you're taking this action>

Example responses:
ACTION: CLICK(500, 300)
REASONING: Clicking the Gmail compose button to start a new email

ACTION: TYPE(Hello, this is a reply)
REASONING: Typing the email body

ACTION: DONE(Successfully replied to 5 emails)
REASONING: Task is complete
"""
        
        while step_count < max_steps:
            step_count += 1
            logger.info(f"Step {step_count}/{max_steps}")
            
            # Capture current screen
            screenshot = self.take_screenshot()
            img_base64 = self.encode_image_base64(screenshot)
            
            # Call GPT-4 Vision (using gpt-4o which has vision capabilities)
            try:
                response = self.client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {
                            "role": "system",
                            "content": system_prompt
                        },
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": f"Current task: {task}\n\nWhat action should I take next? (Step {step_count}/{max_steps})"
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/png;base64,{img_base64}",
                                        "detail": "high"
                                    }
                                }
                            ]
                        }
                    ],
                    max_tokens=300,
                    temperature=0.3
                )
                
                ai_response = response.choices[0].message.content
                logger.info(f"AI Response:\n{ai_response}")
                
                # Parse action and reasoning
                action_line = [l for l in ai_response.split('\n') if l.startswith('ACTION:')]
                reasoning_line = [l for l in ai_response.split('\n') if l.startswith('REASONING:')]
                
                if not action_line:
                    logger.warning("No ACTION found in response, retrying...")
                    continue
                
                action = action_line[0].replace('ACTION:', '').strip()
                reasoning = reasoning_line[0].replace('REASONING:', '').strip() if reasoning_line else "No reasoning provided"
                
                # Log step
                step_info = {
                    'step': step_count,
                    'action': action,
                    'reasoning': reasoning,
                    'screenshot': f"/tmp/step_{step_count}.png"
                }
                steps_log.append(step_info)
                
                # Save screenshot
                screenshot.save(step_info['screenshot'])
                
                # Execute action
                result = self._execute_action(action)
                step_info['result'] = result
                
                # Check if done
                if action.startswith('DONE'):
                    logger.info(f"Task completed: {action}")
                    break
                
                # Wait for UI to update
                time.sleep(1)
                
            except Exception as e:
                logger.error(f"Error in step {step_count}: {e}")
                step_info = {
                    'step': step_count,
                    'error': str(e)
                }
                steps_log.append(step_info)
                break
        
        return {
            'task': task,
            'steps': steps_log,
            'total_steps': step_count,
            'status': 'completed' if step_count < max_steps else 'max_steps_reached'
        }
    
    def _execute_action(self, action: str) -> str:
        """Execute a parsed action"""
        try:
            action = action.strip()
            
            # CLICK
            if action.startswith('CLICK'):
                coords = action.split('(')[1].split(')')[0]
                x, y = map(int, coords.split(','))
                pyautogui.click(x, y)
                logger.info(f"Clicked at ({x}, {y})")
                return f"Clicked at ({x}, {y})"
            
            # TYPE
            elif action.startswith('TYPE'):
                text = action.split('(')[1].rsplit(')', 1)[0]
                # Remove quotes if present
                text = text.strip('"').strip("'")
                pyautogui.typewrite(text, interval=0.05)
                logger.info(f"Typed: {text[:50]}...")
                return f"Typed text"
            
            # KEY
            elif action.startswith('KEY'):
                key = action.split('(')[1].split(')')[0].strip('"').strip("'")
                pyautogui.press(key.lower())
                logger.info(f"Pressed key: {key}")
                return f"Pressed {key}"
            
            # SCROLL
            elif action.startswith('SCROLL'):
                params = action.split('(')[1].split(')')[0].split(',')
                direction = params[0].strip().strip('"').strip("'")
                amount = int(params[1].strip()) if len(params) > 1 else 3
                
                if direction.lower() in ['up', 'down']:
                    clicks = amount if direction.lower() == 'up' else -amount
                    pyautogui.scroll(clicks * 100)
                logger.info(f"Scrolled {direction} by {amount}")
                return f"Scrolled {direction}"
            
            # WAIT
            elif action.startswith('WAIT'):
                seconds = action.split('(')[1].split(')')[0]
                seconds = float(seconds)
                time.sleep(seconds)
                logger.info(f"Waited {seconds}s")
                return f"Waited {seconds}s"
            
            # DONE
            elif action.startswith('DONE'):
                message = action.split('(')[1].rsplit(')', 1)[0].strip('"').strip("'")
                logger.info(f"Task done: {message}")
                return f"Completed: {message}"
            
            else:
                logger.warning(f"Unknown action: {action}")
                return f"Unknown action: {action}"
        
        except Exception as e:
            logger.error(f"Error executing action {action}: {e}")
            return f"Error: {str(e)}"
    
    def execute_task(self, task: str, max_steps: int = 20) -> dict:
        """
        High-level task execution interface
        """
        logger.info(f"Executing task: {task}")
        
        try:
            result = self.vision_analyze(task, max_steps)
            logger.info(f"Task execution completed: {result['status']}")
            return result
        except Exception as e:
            logger.error(f"Task execution failed: {e}")
            return {
                'task': task,
                'status': 'error',
                'error': str(e)
            }


def main():
    """CLI interface for testing"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Headless Vision Agent')
    parser.add_argument('--task', type=str, required=True, help='Task to execute')
    parser.add_argument('--display', type=str, default=':100', help='X display')
    parser.add_argument('--max-steps', type=int, default=20, help='Maximum steps')
    
    args = parser.parse_args()
    
    agent = VisionAgent(display=args.display)
    result = agent.execute_task(args.task, max_steps=args.max_steps)
    
    print("\n" + "="*60)
    print("TASK EXECUTION RESULT")
    print("="*60)
    print(f"Task: {result['task']}")
    print(f"Status: {result['status']}")
    print(f"Total Steps: {result['total_steps']}")
    print("\nSteps:")
    for step in result['steps']:
        print(f"  Step {step['step']}: {step.get('action', 'N/A')}")
        print(f"    Reasoning: {step.get('reasoning', 'N/A')}")
        print(f"    Result: {step.get('result', 'N/A')}")
    print("="*60)


if __name__ == "__main__":
    main()
