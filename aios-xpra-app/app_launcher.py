#!/usr/bin/env python3
"""
AI OS App Launcher
Manages launching and controlling Phase 1 apps with Screen Agent integration
"""

import json
import os
import subprocess
import time
import sys
import logging
from pathlib import Path
from window_controller import WindowController

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/app-launcher.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class AppLauncher:
    def __init__(self):
        self.config_dir = Path("/opt/apps/configs")
        self.apps = self.load_apps()
        self.screen_agent_dir = Path("/opt/screen-agent")
        self.window_controller = WindowController(display=":100")
        logger.info(f"AppLauncher initialized with {len(self.apps)} apps")
        
    def load_apps(self):
        """Load all app configurations"""
        apps = {}
        if self.config_dir.exists():
            for config_file in self.config_dir.glob("*.json"):
                try:
                    with open(config_file) as f:
                        app = json.load(f)
                        apps[app['name']] = app
                    logger.debug(f"Loaded app config: {app['name']}")
                except Exception as e:
                    logger.error(f"Failed to load {config_file}: {e}")
        else:
            logger.warning(f"Config directory not found: {self.config_dir}")
        return apps
    
    def launch_app(self, app_name, wait_time=2):
        """Launch a specific app"""
        if app_name not in self.apps:
            logger.error(f"App '{app_name}' not found")
            print(f"❌ App '{app_name}' not found")
            return False
        
        app = self.apps[app_name]
        cmd = app['cmd']
        url = app.get('url', '')
        
        logger.info(f"Launching {app_name} (cmd={cmd}, url={url})")
        print(f"🚀 Launching {app_name}...")
        
        try:
            # Use window controller for better app management
            if cmd == "google-chrome":
                # Use separate user data directory for each app to avoid profile lock
                # Use --new-window instead of --app for faster, more reliable windows
                # Add flags to disable prompts and restore dialogs
                user_data_dir = f"/tmp/chrome-{app_name.lower().replace(' ', '-')}"
                
                # Ensure GTK modules are loaded for accessibility
                # We set these in os.environ so they are picked up by window_controller
                os.environ['GTK_MODULES'] = 'gail:atk-bridge'
                os.environ['ACCESSIBILITY_ENABLED'] = '1'
                os.environ['GNOME_ACCESSIBILITY'] = '1'
                
                full_cmd = (
                    f"google-chrome --no-sandbox --disable-dev-shm-usage "
                    f"--user-data-dir={user_data_dir} "
                    f"--disable-session-crashed-bubble "
                    f"--disable-infobars "
                    f"--no-first-run "
                    f"--no-default-browser-check "
                    f"--disable-default-apps "
                    f"--disable-popup-blocking "
                    f"--password-store=basic "
                    f"--force-renderer-accessibility "
                    f"--enable-caret-browsing "
                    f"--new-window {url}"
                )
                self.window_controller.open_application(full_cmd, wait_time=wait_time)
            elif cmd == "microsoft-edge":
                # Use separate user data directory for each app to avoid profile lock
                # Add flags to disable prompts and restore dialogs
                user_data_dir = f"/tmp/edge-{app_name.lower().replace(' ', '-')}"
                full_cmd = (
                    f"microsoft-edge --no-sandbox --disable-dev-shm-usage "
                    f"--user-data-dir={user_data_dir} "
                    f"--disable-session-crashed-bubble "
                    f"--disable-infobars "
                    f"--no-first-run "
                    f"--no-default-browser-check "
                    f"--disable-default-apps "
                    f"--disable-popup-blocking "
                    f"--password-store=basic "
                    f"--force-renderer-accessibility "
                    f"--new-window {url}"
                )
                self.window_controller.open_application(full_cmd, wait_time=wait_time)
            elif cmd == "slack":
                self.window_controller.open_application("slack --no-sandbox", wait_time=wait_time)
            elif cmd == "zoom":
                self.window_controller.open_application("zoom", wait_time=wait_time)
            else:
                self.window_controller.open_application(cmd, wait_time=wait_time)
            
            logger.info(f"{app_name} launched successfully")
            print(f"✅ {app_name} launched successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to launch {app_name}: {e}", exc_info=True)
            print(f"❌ Failed to launch {app_name}: {e}")
            return False
    
    def launch_all_phase1(self):
        """Launch all Phase 1 apps in optimal order"""
        phase1_apps = [
            "Chrome",
            "Gmail",
            "Notion",
            "Instagram",
            "Facebook",
            "Salesforce",
            "QuickBooks",
            "Slack",
            "LinkedIn",
            "Google Sheets",
            "Zoom",
            "Asana"
        ]
        
        print("🌟 Launching All Phase 1 Apps...")
        print("=" * 60)
        
        for app in phase1_apps:
            self.launch_app(app, wait_time=1.5)
        
        print("=" * 60)
        print("✅ All Phase 1 apps launched!")
    
    def start_screen_agent(self):
        """Start the Nelieo Screen Agent"""
        print("🤖 Starting Nelieo Screen Agent...")
        
        if not self.screen_agent_dir.exists():
            print("⚠️  Screen Agent directory not found")
            return False
        
        os.chdir(self.screen_agent_dir)
        
        # Try to find and run the main script
        possible_mains = ["main.py", "server.py", "app.py", "run.py"]
        
        for main_file in possible_mains:
            if (self.screen_agent_dir / main_file).exists():
                print(f"✅ Found {main_file}, starting Screen Agent...")
                try:
                    subprocess.Popen([
                        "python3", main_file
                    ], env=dict(os.environ, DISPLAY=":100"))
                    time.sleep(2)
                    return True
                except Exception as e:
                    print(f"❌ Failed to start Screen Agent: {e}")
                    return False
        
        print("⚠️  No main script found for Screen Agent")
        return False
    
    def list_apps(self):
        """List all available apps"""
        print("\n📱 Available Phase 1 Apps:")
        print("=" * 60)
        for name, app in self.apps.items():
            print(f"  • {name}: {app.get('url', 'N/A')}")
        print("=" * 60)
    
    def list_running_apps(self):
        """List all currently running app windows"""
        print("\n🪟 Running Applications:")
        print("=" * 60)
        windows = self.window_controller.list_windows()
        for window in windows:
            print(f"  • {window['title']} ({window['class']})")
        print("=" * 60)
        return windows
    
    def switch_app(self, app_name: str):
        """Switch to a running application"""
        print(f"🔄 Switching to: {app_name}")
        return self.window_controller.switch_to_window(app_name)
    
    def close_app(self, app_name: str):
        """Close a running application"""
        print(f"❌ Closing: {app_name}")
        return self.window_controller.close_window(app_name)

def main():
    launcher = AppLauncher()
    
    if len(sys.argv) < 2:
        print("Usage: app-launcher.py [all|list|running|switch|close|agent|<app-name>]")
        launcher.list_apps()
        return
    
    command = sys.argv[1]
    
    if command == "all":
        launcher.launch_all_phase1()
        time.sleep(3)
        launcher.start_screen_agent()
    elif command == "list":
        launcher.list_apps()
    elif command == "running":
        launcher.list_running_apps()
    elif command == "switch" and len(sys.argv) > 2:
        launcher.switch_app(sys.argv[2])
    elif command == "close" and len(sys.argv) > 2:
        launcher.close_app(sys.argv[2])
    elif command == "agent":
        launcher.start_screen_agent()
    else:
        launcher.launch_app(command)

if __name__ == "__main__":
    main()
