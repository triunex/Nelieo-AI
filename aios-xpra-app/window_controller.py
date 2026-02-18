#!/usr/bin/env python3
"""
Window Controller for AI OS
Manages multiple application windows in the desktop environment
"""

import subprocess
import time
import os
import logging
from typing import List, Dict, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class WindowController:
    """Controls window operations in X11 environment"""
    
    def __init__(self, display=":100"):
        self.display = display
        os.environ['DISPLAY'] = display
        logger.info(f"WindowController initialized with display {display}")
        
        # Verify X11 connection
        try:
            subprocess.run(['xdpyinfo'], capture_output=True, check=True, timeout=5)
            logger.info("X11 display verified")
        except Exception as e:
            logger.error(f"X11 display check failed: {e}")
    
    def list_windows(self) -> List[Dict[str, str]]:
        """List all open windows with their details"""
        try:
            # Use xdotool to get all window IDs
            result = subprocess.run(
                ['xdotool', 'search', '--name', '.*'],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            windows = []
            if result.stdout.strip():
                window_ids = result.stdout.strip().split('\n')
                
                for wid in window_ids:
                    try:
                        # Get window name using xdotool
                        name_result = subprocess.run(
                            ['xdotool', 'getwindowname', wid],
                            capture_output=True,
                            text=True,
                            timeout=2
                        )
                        
                        # Get window class using xprop
                        class_result = subprocess.run(
                            ['xprop', '-id', wid, 'WM_CLASS'],
                            capture_output=True,
                            text=True,
                            timeout=2
                        )
                        
                        window_name = name_result.stdout.strip() if name_result.returncode == 0 else ''
                        window_class = ''
                        
                        if class_result.returncode == 0:
                            # Parse WM_CLASS output: WM_CLASS(STRING) = "instance", "class"
                            class_line = class_result.stdout.strip()
                            if '=' in class_line:
                                class_part = class_line.split('=')[1].strip()
                                window_class = class_part.replace('"', '').replace("'", "")
                        
                        windows.append({
                            'id': wid,
                            'title': window_name,
                            'class': window_class
                        })
                    except Exception as e:
                        logger.debug(f"Error getting details for window {wid}: {e}")
                        continue
            
            logger.debug(f"Found {len(windows)} windows")
            return windows
        except subprocess.TimeoutExpired:
            logger.error("Timeout listing windows")
            return []
        except Exception as e:
            logger.error(f"Unexpected error listing windows: {e}", exc_info=True)
            return []
    
    def switch_to_window(self, window_identifier: str) -> bool:
        """
        Switch focus to a specific window
        window_identifier can be window title, class name, or ID
        """
        try:
            # Try by title first
            result = subprocess.run(
                ['wmctrl', '-a', window_identifier],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                print(f"✅ Switched to window: {window_identifier}")
                time.sleep(0.5)  # Give time for window to focus
                return True
            
            # Try by window ID
            result = subprocess.run(
                ['wmctrl', '-i', '-a', window_identifier],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                print(f"✅ Switched to window ID: {window_identifier}")
                time.sleep(0.5)
                return True
            
            print(f"⚠️  Could not switch to window: {window_identifier}")
            return False
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Error switching window: {e}")
            return False
    
    def open_application(self, command: str, wait_time: float = 2.0) -> bool:
        """
        Open a new application
        command: Command to execute (e.g., 'google-chrome', 'slack')
        """
        try:
            print(f"🚀 Opening application: {command}")
            
            # Ensure DBUS_SESSION_BUS_ADDRESS is present
            env = dict(os.environ)
            env['DISPLAY'] = self.display
            
            if 'DBUS_SESSION_BUS_ADDRESS' not in env:
                print("⚠️ DBUS_SESSION_BUS_ADDRESS missing in env, trying to find it...")
                # Try to find it from at-spi-bus-launcher
                try:
                    pids = [p for p in os.listdir('/proc') if p.isdigit()]
                    for pid in pids:
                        try:
                            with open(f'/proc/{pid}/cmdline', 'rb') as f:
                                cmd_line = f.read().decode('utf-8', errors='ignore')
                                if 'at-spi-bus-launcher' in cmd_line:
                                    with open(f'/proc/{pid}/environ', 'rb') as ef:
                                        env_data = ef.read().decode('utf-8', errors='ignore')
                                        for line in env_data.split('\0'):
                                            if line.startswith('DBUS_SESSION_BUS_ADDRESS='):
                                                addr = line.split('=', 1)[1]
                                                # Strip guid if present, as it might confuse some apps (like Chrome)
                                                if ',' in addr:
                                                    addr = addr.split(',')[0]
                                                env['DBUS_SESSION_BUS_ADDRESS'] = addr
                                                print(f"✅ Found DBus address from PID {pid}: {addr}")
                                                break
                        except:
                            continue
                        if 'DBUS_SESSION_BUS_ADDRESS' in env:
                            break
                except Exception as e:
                    print(f"❌ Error finding DBus address: {e}")
            
            if 'DBUS_SESSION_BUS_ADDRESS' in env:
                print(f"🔧 Using DBus Address: {env['DBUS_SESSION_BUS_ADDRESS']}")
            else:
                print("❌ DBUS_SESSION_BUS_ADDRESS still missing!")

            # Pass the modified environment to the subprocess
            subprocess.Popen(
                command.split(),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                env=env
            )
            time.sleep(wait_time)  # Wait for app to open
            print(f"✅ Application opened: {command}")
            return True
        except Exception as e:
            print(f"❌ Error opening application: {e}")
            return False
    
    def close_window(self, window_identifier: str) -> bool:
        """Close a specific window gracefully"""
        try:
            result = subprocess.run(
                ['wmctrl', '-c', window_identifier],
                capture_output=True,
                text=True,
                check=True
            )
            print(f"✅ Closed window: {window_identifier}")
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ Error closing window: {e}")
            return False
    
    def minimize_window(self, window_identifier: str) -> bool:
        """Minimize a specific window"""
        try:
            # Get window ID first
            windows = self.list_windows()
            window_id = None
            
            for window in windows:
                if window_identifier.lower() in window['title'].lower() or \
                   window_identifier.lower() in window['class'].lower():
                    window_id = window['id']
                    break
            
            if not window_id:
                print(f"⚠️  Window not found: {window_identifier}")
                return False
            
            # Use xdotool to minimize
            subprocess.run(
                ['xdotool', 'windowminimize', window_id],
                check=True
            )
            print(f"✅ Minimized window: {window_identifier}")
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Error minimizing window: {e}")
            return False
    
    def maximize_window(self, window_identifier: str) -> bool:
        """Maximize a specific window by ID or name"""
        try:
            window_id = window_identifier
            
            # If identifier is not a numeric ID, search for the window
            if not window_identifier.isdigit():
                windows = self.list_windows()
                window_id = None
                
                for window in windows:
                    if window_identifier.lower() in window['title'].lower() or \
                       window_identifier.lower() in window['class'].lower():
                        window_id = window['id']
                        break
                
                if not window_id:
                    logger.warning(f"Window not found: {window_identifier}")
                    return False
            
            # Use wmctrl to maximize the window
            subprocess.run(
                ['wmctrl', '-i', '-r', window_id, '-b', 'add,maximized_vert,maximized_horz'],
                check=True,
                env={'DISPLAY': self.display}
            )
            logger.info(f"Maximized window: {window_id}")
            return True
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Error maximizing window: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error maximizing window: {e}")
            return False
    
    def get_active_window(self) -> Optional[Dict[str, str]]:
        """Get the currently active/focused window"""
        try:
            result = subprocess.run(
                ['xdotool', 'getactivewindow', 'getwindowname'],
                capture_output=True,
                text=True,
                check=True
            )
            
            window_title = result.stdout.strip()
            
            # Get more details
            result2 = subprocess.run(
                ['xdotool', 'getactivewindow'],
                capture_output=True,
                text=True,
                check=True
            )
            
            window_id = result2.stdout.strip()
            
            return {
                'id': window_id,
                'title': window_title
            }
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Error getting active window: {e}")
            return None
    
    def move_window(self, window_identifier: str, x: int, y: int) -> bool:
        """Move a window to specific coordinates"""
        try:
            windows = self.list_windows()
            window_id = None
            
            for window in windows:
                if window_identifier.lower() in window['title'].lower() or \
                   window_identifier.lower() in window['class'].lower():
                    window_id = window['id']
                    break
            
            if not window_id:
                print(f"⚠️  Window not found: {window_identifier}")
                return False
            
            subprocess.run(
                ['wmctrl', '-i', '-r', window_id, '-e', f'0,{x},{y},-1,-1'],
                check=True
            )
            print(f"✅ Moved window to ({x}, {y}): {window_identifier}")
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Error moving window: {e}")
            return False
    
    def resize_window(self, window_identifier: str, width: int, height: int) -> bool:
        """Resize a window to specific dimensions"""
        try:
            windows = self.list_windows()
            window_id = None
            
            for window in windows:
                if window_identifier.lower() in window['title'].lower() or \
                   window_identifier.lower() in window['class'].lower():
                    window_id = window['id']
                    break
            
            if not window_id:
                print(f"⚠️  Window not found: {window_identifier}")
                return False
            
            subprocess.run(
                ['wmctrl', '-i', '-r', window_id, '-e', f'0,-1,-1,{width},{height}'],
                check=True
            )
            print(f"✅ Resized window to {width}x{height}: {window_identifier}")
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Error resizing window: {e}")
            return False


# CLI interface for testing
if __name__ == "__main__":
    import sys
    
    controller = WindowController()
    
    if len(sys.argv) < 2:
        print("Window Controller CLI")
        print("Usage:")
        print("  list                     - List all windows")
        print("  open <command>          - Open application")
        print("  switch <window>         - Switch to window")
        print("  close <window>          - Close window")
        print("  minimize <window>       - Minimize window")
        print("  maximize <window>       - Maximize window")
        print("  active                  - Show active window")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "list":
        windows = controller.list_windows()
        print(f"\n📱 Found {len(windows)} windows:")
        print("=" * 80)
        for window in windows:
            print(f"  ID: {window['id']}")
            print(f"  Class: {window['class']}")
            print(f"  Title: {window['title']}")
            print("-" * 80)
    
    elif command == "open" and len(sys.argv) > 2:
        controller.open_application(sys.argv[2])
    
    elif command == "switch" and len(sys.argv) > 2:
        controller.switch_to_window(sys.argv[2])
    
    elif command == "close" and len(sys.argv) > 2:
        controller.close_window(sys.argv[2])
    
    elif command == "minimize" and len(sys.argv) > 2:
        controller.minimize_window(sys.argv[2])
    
    elif command == "maximize" and len(sys.argv) > 2:
        controller.maximize_window(sys.argv[2])
    
    elif command == "active":
        active = controller.get_active_window()
        if active:
            print(f"\n🎯 Active Window:")
            print(f"  ID: {active['id']}")
            print(f"  Title: {active['title']}")
        else:
            print("⚠️  No active window found")
    
    else:
        print("❌ Invalid command or missing arguments")
