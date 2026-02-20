#!/usr/bin/env python3
"""
AI OS Agent API
Provides REST API for frontend to communicate with ScreenAgent
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import sys
import os
import logging
import json
from pathlib import Path

# Add to Python path
sys.path.insert(0, '/opt')
sys.path.insert(0, '/opt/screen-agent')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/agent-api.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", logger=False, engineio_logger=False, ping_timeout=60, ping_interval=25)

# Import our components
try:
    from app_launcher import AppLauncher
    from window_controller import WindowController
    launcher = AppLauncher()
    window_controller = WindowController(display=':100')
    logger.info("Successfully loaded app launcher and window controller")
except Exception as e:
    logger.error(f"Failed to load components: {e}")
    launcher = None
    window_controller = None

# Import SuperAgent - ENHANCED VERSION
super_agent = None
enhanced_super_agent = None
use_enhanced = os.getenv('USE_ENHANCED_AGENT', 'true').lower() == 'true'

# Vertex AI configuration (for using GCP credits instead of free tier)
USE_VERTEX_AI = os.getenv('USE_VERTEX_AI', 'false').lower() == 'true'
GCP_PROJECT_ID = os.getenv('GCP_PROJECT_ID') or os.getenv('GOOGLE_CLOUD_PROJECT')
VERTEX_LOCATION = os.getenv('VERTEX_LOCATION', 'us-central1')

try:
    sys.path.insert(0, '/opt/lumina-search-flow-main')
    from superagent.core import SuperAgent
    from superagent.enhanced_core import EnhancedSuperAgent  # NEW: Advanced agent
    from superagent.advanced_vision import AdvancedVisionAnalyzer  # NEW: OCR + UI detection
    from superagent.workflows import WorkflowEngine, WorkflowStep, StepType  # NEW: Multi-app workflows
    # Vision APIs - removed Ollama, using only cloud providers
    from superagent.openai_vision import OpenAIVisionAPI
    from superagent.gemini_vision import GeminiVisionAPI
    from superagent.vision import VisionAPI
    
    # API Keys - OpenRouter, OpenAI, Gemini
    OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY', '')
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', 'AIzaSyDyzE-XpLGRzQPDdtD8I25f7Yg8itVODCk')  # $300 Google Cloud credit key

    # Vision configuration
    try:
        GEMINI_MIN_CALL_INTERVAL = float(os.getenv('GEMINI_MIN_CALL_INTERVAL', '6'))
    except ValueError:
        GEMINI_MIN_CALL_INTERVAL = 6.0
        logger.warning("Invalid GEMINI_MIN_CALL_INTERVAL value; defaulting to 6s")
    OPENAI_VISION_FALLBACK_MODEL = os.getenv('OPENAI_VISION_FALLBACK_MODEL', 'gpt-4o-mini')

    fallback_vision_api = None
    if OPENAI_API_KEY:
        try:
            fallback_vision_api = OpenAIVisionAPI(
                api_key=OPENAI_API_KEY,
                model=OPENAI_VISION_FALLBACK_MODEL,
                timeout=30
            )
            logger.info(f"🔁 Configured OpenAI Vision as fallback for Gemini ({OPENAI_VISION_FALLBACK_MODEL})")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI fallback vision API: {e}")
            fallback_vision_api = None
    
    logger.info(f"🚀 Agent mode: {'ENHANCED (multi-level planning + advanced vision + workflows)' if use_enhanced else 'STANDARD (OODA loop)'}")
    
    # Try Gemini FIRST (supports both AI Studio and Vertex AI)
    if GEMINI_API_KEY:
        try:
            if USE_VERTEX_AI:
                logger.info(f"🤖 Trying Vertex AI (project: {GCP_PROJECT_ID}, model: gemini-2.0-flash)...")
            else:
                logger.info("🤖 Trying Gemini AI Studio (gemini-2.0-flash - STABLE)...")
            
            from superagent.gemini_vision import GeminiVisionAPI
            vision_api = GeminiVisionAPI(
                api_key=GEMINI_API_KEY,
                model="gemini-2.0-flash",  # Stable production model
                timeout=30,
                fallback_api=None,  # NO FALLBACK - don't use rate-limited OpenAI
                min_call_interval=GEMINI_MIN_CALL_INTERVAL if not USE_VERTEX_AI else 0.0,  # No rate limit with Vertex AI
                use_vertex_ai=USE_VERTEX_AI,  # Use Vertex AI if enabled
                vertex_project=GCP_PROJECT_ID,  # GCP project ID
                vertex_location=VERTEX_LOCATION  # GCP region
            )
            
            if use_enhanced:
                enhanced_super_agent = EnhancedSuperAgent(
                    vision_api=vision_api,
                    max_iterations=50,  # 🔥 CAPABLE: 50 iterations for complex multi-step tasks (Gmail, Slack workflows)
                    memory_path="/var/log/superagent_memory.json",
                    enable_parallel=False,
                    enable_reflection=False,
                    enable_verification=False,
                    app_launcher=launcher,  # NEW: Pass launcher for direct app opening
                    socketio=socketio  # NEW: Pass socketio for frontend events
                )
                super_agent = enhanced_super_agent
                logger.info("✅ EnhancedSuperAgent with Advanced Vision + Workflows initialized (Gemini)")
            else:
                super_agent = SuperAgent(
                    vision_api=vision_api,
                    max_iterations=30,
                    memory_path="/var/log/superagent_memory.json"
                )
                logger.info("✅ SuperAgent initialized with Gemini")
        except Exception as e:
            logger.error(f"❌ Gemini failed: {e}")
            super_agent = None
            enhanced_super_agent = None
    else:
        logger.warning("⚠️  No GEMINI_API_KEY found")
        super_agent = None
        enhanced_super_agent = None
    
    # Fallback to OpenAI if Gemini fails
    if not super_agent and OPENAI_API_KEY:
        try:
            logger.info("🤖 Trying OpenAI GPT-4o Vision API...")
            vision_api = OpenAIVisionAPI(
                api_key=OPENAI_API_KEY,
                model="gpt-4o",
                timeout=15  # 🔥 SPEED OPTIMIZATION: Reduced from 30
            )
            
            if use_enhanced:
                enhanced_super_agent = EnhancedSuperAgent(
                    vision_api=vision_api,
                    max_iterations=15,  # 🔥 SPEED OPTIMIZATION: Reduced from 30
                    memory_path="/var/log/superagent_memory.json",
                    enable_parallel=False,
                    enable_reflection=False,
                    enable_verification=False,  # 🔥 Already disabled
                    app_launcher=launcher,  # NEW: Pass launcher for direct app opening
                    socketio=socketio  # NEW: Pass socketio for frontend events
                )
                super_agent = enhanced_super_agent
                logger.info("✅ EnhancedSuperAgent with Advanced Vision + Workflows initialized (OpenAI)")
            else:
                super_agent = SuperAgent(
                    vision_api=vision_api,
                    max_iterations=30,
                    memory_path="/var/log/superagent_memory.json"
                )
                logger.info("✅ SuperAgent initialized with OpenAI")
        except Exception as e:
            logger.error(f"❌ OpenAI failed: {e}")
            super_agent = None
            enhanced_super_agent = None
    
    # Final fallback to Gemini
    if not super_agent and GEMINI_API_KEY:
        try:
            if USE_VERTEX_AI:
                logger.info(f"🤖 Trying Vertex AI fallback (project: {GCP_PROJECT_ID})...")
            else:
                logger.info("🤖 Trying Gemini Vision API fallback...")
            
            vision_api = GeminiVisionAPI(
                api_key=GEMINI_API_KEY,
                model="gemini-pro-vision",
                timeout=15,  # 🔥 SPEED OPTIMIZATION: Reduced from 30
                fallback_api=fallback_vision_api,
                min_call_interval=0.2 if not USE_VERTEX_AI else 0.0,  # No rate limit with Vertex AI
                use_vertex_ai=USE_VERTEX_AI,
                vertex_project=GCP_PROJECT_ID,
                vertex_location=VERTEX_LOCATION
            )
            
            if use_enhanced:
                enhanced_super_agent = EnhancedSuperAgent(
                    vision_api=vision_api,
                    max_iterations=15,  # 🔥 SPEED OPTIMIZATION: Reduced from 30
                    memory_path="/var/log/superagent_memory.json",
                    enable_parallel=False,
                    enable_reflection=False,
                    enable_verification=False  # 🔥 Already disabled
                )
                super_agent = enhanced_super_agent
                logger.info("✅ EnhancedSuperAgent with Advanced Vision + Workflows initialized (Gemini)")
            else:
                super_agent = SuperAgent(
                    vision_api=vision_api,
                    max_iterations=30,
                    memory_path="/var/log/superagent_memory.json"
                )
                logger.info("✅ SuperAgent initialized with Gemini")
        except Exception as e:
            logger.error(f"❌ Gemini failed: {e}")
            super_agent = None
            enhanced_super_agent = None
    
    if not super_agent and OPENROUTER_API_KEY:
        try:
            logger.info("🤖 Trying OpenRouter Claude API...")
            
            if use_enhanced:
                enhanced_super_agent = EnhancedSuperAgent(
                    api_key=OPENROUTER_API_KEY,
                    base_url="https://openrouter.ai/api/v1",
                    model="anthropic/claude-3.5-sonnet",
                    max_iterations=15,  # 🔥 SPEED OPTIMIZATION: Reduced from 30
                    memory_path="/var/log/superagent_memory.json",
                    enable_parallel=False,
                    enable_reflection=False,
                    enable_verification=False  # 🔥 Already disabled
                )
                super_agent = enhanced_super_agent
                logger.info("✅ EnhancedSuperAgent initialized with OpenRouter (BEST PERFORMANCE)")
            else:
                super_agent = SuperAgent(
                    api_key=OPENROUTER_API_KEY,
                    base_url="https://openrouter.ai/api/v1",
                    model="anthropic/claude-3.5-sonnet",
                    max_iterations=15,  # 🔥 SPEED OPTIMIZATION: Reduced from 30
                    memory_path="/var/log/superagent_memory.json"
                )
                logger.info("✅ SuperAgent initialized with OpenRouter")
        except Exception as e:
            logger.error(f"❌ OpenRouter failed: {e}")
            super_agent = None
            enhanced_super_agent = None
    
    if not super_agent:
        logger.error("❌ NO API KEYS AVAILABLE - SuperAgent disabled")
        logger.error(f"   OpenAI: {'✓' if OPENAI_API_KEY else '✗'}")
        logger.error(f"   Gemini: {'✓' if GEMINI_API_KEY else '✗'}")
        logger.error(f"   OpenRouter: {'✓' if OPENROUTER_API_KEY else '✗'}")
        
except Exception as e:
    logger.error(f"❌ CRITICAL: Failed to load SuperAgent: {e}")
    import traceback
    logger.error(traceback.format_exc())
    super_agent = None

# Track active agent sessions
active_sessions = {}
cancel_requested = False

# ====================== FastAgent Initialization ======================
# FastAgent: High-speed execution engine (2-4 seconds per action)
fast_agent = None
fast_agent_api = None

try:
    from superagent.fast_agent import FastAgent
    from superagent.fast_agent_integration import FastAgentAPI, get_fast_agent_api
    from superagent.omniparser import OmniParserV2
    from superagent.executor import ActionExecutor
    
    # Initialize FastAgent components
    if GEMINI_API_KEY:
        try:
            from superagent.gemini_vision import GeminiVisionAPI
            from superagent.kimi_vision import KimiVisionAPI
            
            # Kimi fallback (optional)
            KIMI_API_KEY = os.getenv('KIMI_API_KEY')
            fa_kimi_api = None
            if KIMI_API_KEY:
                fa_kimi_api = KimiVisionAPI(api_key=KIMI_API_KEY)
                logger.info("Kimi Vision API initialized as fallback")

            fa_vision_api = GeminiVisionAPI(
                api_key=GEMINI_API_KEY,
                model="gemini-2.5-flash",
                timeout=30,
                fallback_api=fa_kimi_api, # Set Kimi as fallback
                use_vertex_ai=USE_VERTEX_AI,
                vertex_project=GCP_PROJECT_ID,
                vertex_location=VERTEX_LOCATION
            )
            
            fa_omniparser = OmniParserV2(
                cache_enabled=True,
                min_confidence=0.25,
                max_elements=50,
                generate_captions=True   # Enable Florence-2 for high-accuracy icon reasoning
            )
            
            fa_executor = ActionExecutor()
            
            fast_agent = FastAgent(
                vision_api=fa_vision_api,
                omniparser=fa_omniparser,
                executor=fa_executor,
                max_iterations=30,
                action_timeout=5.0,
                enable_cache=True
            )
            
            logger.info("FastAgent initialized - high-speed execution engine ready")
        except Exception as e:
            logger.error(f"Failed to initialize FastAgent: {e}")
            fast_agent = None
    else:
        logger.warning("FastAgent disabled - no GEMINI_API_KEY")
        
except ImportError as e:
    logger.warning(f"FastAgent not available: {e}")
    fast_agent = None
except Exception as e:
    logger.error(f"FastAgent initialization error: {e}")
    fast_agent = None



@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'services': {
            'app_launcher': launcher is not None,
            'window_controller': window_controller is not None,
        }
    })


@app.route('/api/agent/execute', methods=['POST'])
def execute_agent_query():
    """
    Execute an agent query
    
    Request body:
    {
        "userId": "user123",
        "prompt": "Open Gmail and check my inbox",
        "context": {}
    }
    """
    try:
        data = request.json
        user_id = data.get('userId', 'anonymous')
        prompt = data.get('prompt', '')
        context = data.get('context', {})
        
        logger.info(f"Received query from {user_id}: {prompt}")
        
        if not prompt:
            return jsonify({
                'status': 'error',
                'error': 'No prompt provided'
            }), 400
        
        # Parse simple commands
        prompt_lower = prompt.lower()
        steps = []
        
        # CRITICAL: For simple "open X" commands (from dock clicks), 
        # do NOT emit 'executing' status to prevent agent panel from appearing
        is_simple_open = 'open' in prompt_lower and len(prompt_lower.split()) <= 3
        
        if not is_simple_open:
            # Only emit executing status for complex tasks
            socketio.emit('agent_update', {
                'userId': user_id,
                'message': f'Processing: {prompt}',
                'status': 'executing'
            })
        
        # Handle "open" commands
        if 'open' in prompt_lower:
            app_opened = handle_open_command(prompt_lower, steps)
            if app_opened:
                socketio.emit('agent_update', {
                    'userId': user_id,
                    'message': f'Opened {app_opened}',
                    'status': 'step_completed'
                })
        
        # Handle "list" commands
        elif 'list' in prompt_lower and ('window' in prompt_lower or 'app' in prompt_lower):
            windows = window_controller.list_windows()
            steps.append({
                'action': 'list_windows',
                'app': 'window_manager',
                'result': f'Found {len(windows)} windows: {[w["title"] for w in windows]}'
            })
        
        # Handle "switch" commands
        elif 'switch' in prompt_lower or 'focus' in prompt_lower:
            target = extract_app_name(prompt_lower)
            if target:
                success = window_controller.switch_to_window(target)
                steps.append({
                    'action': 'switch_window',
                    'app': target,
                    'result': 'Success' if success else 'Failed'
                })
        
        # Handle "close" commands
        elif 'close' in prompt_lower:
            target = extract_app_name(prompt_lower)
            if target:
                success = window_controller.close_window(target)
                steps.append({
                    'action': 'close_window',
                    'app': target,
                    'result': 'Closed' if success else 'Failed'
                })
        
        # Complex queries - send to ScreenAgent (TODO: integrate actual ScreenAgent)
        else:
            steps.append({
                'action': 'complex_query',
                'app': 'screen_agent',
                'result': 'ScreenAgent is analyzing your request...'
            })
            # TODO: Call actual ScreenAgent here
            # result = screen_agent.execute(prompt, context)
        
        if not steps:
            steps.append({
                'action': 'understood',
                'app': 'agent',
                'result': 'I understood your request. Processing...'
            })
        
        response = {
            'status': 'completed',
            'steps': steps,
            'prompt': prompt
        }
        
        socketio.emit('agent_update', {
            'userId': user_id,
            'message': 'Task completed',
            'status': 'completed',
            'result': response
        })
        
        logger.info(f"Completed query for {user_id}: {len(steps)} steps")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error executing agent query: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500


def handle_open_command(prompt_lower, steps):
    """Handle 'open <app>' commands and return window_id for app-only view"""
    app_map = {
        'gmail': 'Gmail',
        'chrome': 'Chrome',
        'notion': 'Notion',
        'instagram': 'Instagram',
        'facebook': 'Facebook',
        'salesforce': 'Salesforce',
        'quickbooks': 'QuickBooks',
        'slack': 'Slack',
        'linkedin': 'LinkedIn',
        'sheets': 'Google Sheets',
        'zoom': 'Zoom',
        'asana': 'Asana'
    }
    
    for keyword, app_name in app_map.items():
        if keyword in prompt_lower:
            if launcher:
                success = launcher.launch_app(app_name)
                
                window_id = None
                if success and window_controller:
                    try:
                        import time
                        
                        # Define app_lower for pattern matching
                        app_lower = app_name.lower()
                        
                        # Chrome apps need more time to initialize
                        wait_time = 8 if app_lower in ['chrome', 'gmail', 'notion', 'instagram', 'facebook', 'salesforce', 'quickbooks', 'asana', 'google sheets'] else 3
                        logger.info(f"Waiting {wait_time}s for {app_name} window to appear...")
                        time.sleep(wait_time)
                        
                        # Get window list and find the new app window
                        windows = window_controller.list_windows()
                        logger.info(f"Looking for {app_name} in {len(windows)} windows")
                        
                        # Log all windows for debugging
                        for w in windows:
                            logger.info(f"Available window: id={w.get('id')}, title='{w.get('title')}', class='{w.get('class')}'")
                        
                        # Define better matching patterns for each app
                        # Format: app_name -> [(pattern, search_location)]
                        # search_location can be 'title', 'class', or 'both'
                        match_patterns = {
                            'chrome': [('google-chrome', 'class'), ('chrome', 'both')],
                            'gmail': [('google-chrome', 'class'), ('gmail', 'title')],
                            'notion': [('google-chrome', 'class'), ('notion', 'title')],
                            'instagram': [('google-chrome', 'class'), ('instagram', 'title')],
                            'facebook': [('google-chrome', 'class'), ('facebook', 'title')],
                            'salesforce': [('google-chrome', 'class'), ('salesforce', 'title')],
                            'quickbooks': [('google-chrome', 'class'), ('quickbooks', 'title'), ('intuit', 'title')],
                            'slack': [('slack', 'class')],
                            'linkedin': [('microsoft-edge', 'class'), ('edge', 'class')],
                            'google sheets': [('google-chrome', 'class'), ('sheets', 'title')],
                            'zoom': [('zoom', 'class')],
                            'asana': [('google-chrome', 'class'), ('asana', 'title')]
                        }
                        
                        app_patterns = match_patterns.get(app_lower, [(app_lower, 'both')])
                        
                        for w in windows:
                            title = w.get('title', '').lower()
                            wclass = w.get('class', '').lower()
                            
                            logger.info(f"Checking window: title='{title}', class='{wclass}'")
                            
                            # Skip xmessage and system windows
                            if 'xmessage' in wclass or 'chromium clipboard' in title or 'corralwindow' in title.lower():
                                continue
                            
                            # Match window by app-specific patterns
                            matched = False
                            for pattern, search_in in app_patterns:
                                if search_in == 'title' and pattern in title:
                                    matched = True
                                    logger.info(f"Matched '{pattern}' in title")
                                    break
                                elif search_in == 'class' and pattern in wclass:
                                    matched = True
                                    logger.info(f"Matched '{pattern}' in class")
                                    break
                                elif search_in == 'both' and (pattern in title or pattern in wclass):
                                    matched = True
                                    logger.info(f"Matched '{pattern}' in title or class")
                                    break
                            
                            if matched:
                                window_id = w.get('id')
                                logger.info(f"Found window ID {window_id} for {app_name} (title: {title})")
                                
                                # Focus and maximize this window
                                try:
                                    window_controller.switch_to_window(app_name)
                                    window_controller.maximize_window(window_id)
                                    logger.info(f"Maximized window {window_id}")
                                except Exception as max_err:
                                    logger.warning(f"Could not maximize window: {max_err}")
                                
                                break
                        
                        if not window_id:
                            logger.warning(f"No window found for {app_name} after 3s wait")
                        
                    except Exception as e:
                        logger.error(f"Error getting window ID: {e}")
                
                # Build clean Xpra URL with window filtering and no chrome
                xpra_url = None
                if window_id:
                    xpra_url = f"http://localhost:10005/?window={window_id}&toolbar=no&border=no&headerbar=no&notifications=no"
                
                steps.append({
                    'action': 'open_app',
                    'app': app_name,
                    'result': 'Opened successfully' if success else 'Failed to open',
                    'window_id': window_id,  # Return window_id to frontend
                    'xpra_url': xpra_url  # Return clean URL without Xpra chrome
                })
                
                return app_name if success else None
    
    return None


def extract_app_name(prompt):
    """Extract app name from prompt"""
    app_keywords = ['gmail', 'chrome', 'notion', 'instagram', 'facebook', 
                    'salesforce', 'quickbooks', 'slack', 'linkedin', 
                    'sheets', 'zoom', 'asana']
    
    for keyword in app_keywords:
        if keyword in prompt:
            return keyword.title()
    return None


@app.route('/api/windows', methods=['GET'])
def list_windows():
    """List all open windows"""
    try:
        if not window_controller:
            return jsonify({'error': 'Window controller not available'}), 503
        
        windows = window_controller.list_windows()
        return jsonify({
            'windows': windows,
            'count': len(windows)
        })
    except Exception as e:
        logger.error(f"Error listing windows: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/apps', methods=['GET'])
def list_apps():
    """List all available apps"""
    try:
        if not launcher:
            return jsonify({'error': 'App launcher not available'}), 503
        
        apps = launcher.list_apps()
        return jsonify({
            'apps': apps,
            'count': len(apps)
        })
    except Exception as e:
        logger.error(f"Error listing apps: {e}")
        return jsonify({'error': str(e)}), 500


# ====================== ScreenAgent Controls ======================
def _is_screenagent_running():
    try:
        import subprocess
        p = subprocess.run(['bash', '-lc', "pgrep -f 'client/run_controller.py'"], capture_output=True, text=True)
        return p.returncode == 0
    except Exception:
        return False

@app.route('/api/screenagent/status', methods=['GET'])
def screenagent_status():
    running = _is_screenagent_running()
    return jsonify({'running': running})

@app.route('/api/screenagent/start', methods=['POST'])
def screenagent_start():
    try:
        if _is_screenagent_running():
            return jsonify({'status': 'already-running'})
        import subprocess, os
        env = os.environ.copy()
        env['DISPLAY'] = env.get('DISPLAY', ':100')
        # Launch via script in background
        subprocess.Popen(['bash', '-lc', 'nohup /opt/run-screen-agent.sh >/var/log/screen-agent.out 2>&1 &'], env=env)
        return jsonify({'status': 'started'})
    except Exception as e:
        logger.error(f"Failed to start ScreenAgent: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/screenagent/stop', methods=['POST'])
def screenagent_stop():
    try:
        import subprocess
        subprocess.run(['bash', '-lc', "pkill -f 'client/run_controller.py' || true"], check=False)
        return jsonify({'status': 'stopped'})
    except Exception as e:
        logger.error(f"Failed to stop ScreenAgent: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/screenagent/execute', methods=['POST'])
def execute_screenagent_task():
    """Execute a complex task using the real ScreenAgent"""
    try:
        data = request.json
        task = data.get('task')
        max_steps = data.get('max_steps', 20)
        
        if not task:
            return jsonify({'error': 'Task is required'}), 400
        
        logger.info(f"ScreenAgent: Executing task: {task}")
        
        # Import headless ScreenAgent
        import sys
        sys.path.insert(0, '/opt')
        from screen_agent_headless import HeadlessScreenAgent
        
        # Initialize and execute
        config_path = '/opt/screenagent-config.yml'
        display = os.environ.get('DISPLAY', ':100')
        
        agent = HeadlessScreenAgent(config_path, display)
        result = agent.execute_task_sync(task, max_steps=max_steps)
        
        logger.info(f"ScreenAgent: Task completed with status: {result['status']}")
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"ScreenAgent error: {e}")
        import traceback
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc(),
            'status': 'error'
        }), 500


@app.route('/api/vision/execute', methods=['POST'])
def execute_vision_task():
    """Execute a complex task using the simple Vision Agent (fallback)"""
    try:
        data = request.json
        task = data.get('task')
        max_steps = data.get('max_steps', 20)
        
        if not task:
            return jsonify({'error': 'Task is required'}), 400
        
        logger.info(f"Vision Agent: Executing task: {task}")
        
        # Import vision agent
        import sys
        sys.path.insert(0, '/opt')
        from vision_agent import VisionAgent
        
        # Execute task
        agent = VisionAgent(display=os.environ.get('DISPLAY', ':100'))
        result = agent.execute_task(task, max_steps=max_steps)
        
        logger.info(f"Vision Agent: Task completed with status: {result['status']}")
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Vision Agent error: {e}")
        return jsonify({'error': str(e), 'status': 'error'}), 500


@app.route('/api/vision/status', methods=['GET'])
def vision_status():
    """Check if vision agent dependencies are available"""
    try:
        status = {
            'scrot_available': False,
            'pyautogui_available': False,
            'pil_available': False,
            'openai_configured': False
        }
        
        # Check scrot
        import subprocess
        result = subprocess.run(['which', 'scrot'], capture_output=True)
        status['scrot_available'] = result.returncode == 0
        
        # Check pyautogui
        try:
            import pyautogui
            status['pyautogui_available'] = True
        except ImportError:
            pass
        
        # Check PIL
        try:
            from PIL import Image
            status['pil_available'] = True
        except ImportError:
            pass
        
        # Check OpenAI API key
        import os
        status['openai_configured'] = bool(os.environ.get('OPENAI_API_KEY'))
        
        status['ready'] = all(status.values())
        return jsonify(status)
        
    except Exception as e:
        logger.error(f"Vision status check error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/superagent/execute', methods=['POST'])
def execute_superagent():
    """
    Execute task with SuperAgent (NEW - Production-Ready Agent)
    
    Request body:
    {
        "task": "Open Gmail and find emails from john@example.com",
        "timeout": 120,
        "userId": "user123"
    }
    
    Response:
    {
        "success": true,
        "task": "...",
        "actions_taken": 15,
        "duration": 12.5,
        "error": null
    }
    """
    try:
        if not super_agent:
            return jsonify({
                'status': 'error',
                'error': 'SuperAgent not available (check OPENROUTER_API_KEY)'
            }), 503
        
        data = request.get_json(force=True)
        if not data:
            return jsonify({'status': 'error', 'error': 'Invalid JSON in request body'}), 400
            
        task = data.get('task', '')
        timeout = data.get('timeout', 600.0)  # 🔥 EXTENDED: 10 minutes for complex multi-step tasks (Gmail replies, Slack workflows)
        user_id = data.get('userId', 'anonymous')
        
        if not task:
            return jsonify({'status': 'error', 'error': 'No task provided'}), 400
        
        logger.info(f"SuperAgent: Executing task for {user_id}: {task}")
        
        # Emit WebSocket update
        socketio.emit('agent_update', {
            'userId': user_id,
            'message': f'SuperAgent started: {task}',
            'status': 'executing',
            'agent': 'superagent'
        })
        
        # Execute task
        # Clear any previous cancellation
        global cancel_requested
        cancel_requested = False
        # If agent supports cancellation, reset flag
        if hasattr(super_agent, 'force_stop'):
            super_agent.force_stop = False

        result = super_agent.execute_task(task, timeout=timeout)
        
        # Emit completion
        socketio.emit('agent_update', {
            'userId': user_id,
            'message': f'Task {"completed" if result.get("success") else "failed"}',
            'status': 'completed' if result.get("success") else 'error',
            'agent': 'superagent'
        })
        
        return jsonify({
            'success': result.get('success', False),
            'task': result.get('task', task),
            'actions_taken': result.get('actions_taken', 0),
            'duration': result.get('duration', 0),
            'error': result.get('error'),
            'final_state': result.get('final_state')
        })
        
    except Exception as e:
        logger.error(f"SuperAgent error: {e}", exc_info=True)
        return jsonify({'error': str(e), 'status': 'error'}), 500


@app.route('/api/superagent/cancel', methods=['POST'])
def cancel_superagent():
    """Cancel a running SuperAgent task immediately."""
    try:
        global cancel_requested
        cancel_requested = True
        if super_agent and hasattr(super_agent, 'request_cancel'):
            super_agent.request_cancel()
        # Inform clients
        try:
            socketio.emit('agent_update', {
                'status': 'cancelled',
                'message': 'Task cancelled by user'
            })
        except Exception:
            pass
        return jsonify({'status': 'ok', 'cancelled': True})
    except Exception as e:
        logger.error(f"Cancel error: {e}")
        return jsonify({'status': 'error', 'error': str(e)}), 500


@app.route('/api/superagent/stats', methods=['GET'])
def superagent_stats():
    """Get SuperAgent performance statistics"""
    try:
        if not super_agent:
            return jsonify({'error': 'SuperAgent not available'}), 503
        
        stats = super_agent.get_stats()
        return jsonify(stats)
        
    except Exception as e:
        logger.error(f"SuperAgent stats error: {e}")
        return jsonify({'error': str(e)}), 500


# ====================== FastAgent Endpoints ======================
# FastAgent: High-speed execution engine (2-4 seconds per action)

@app.route('/api/fastagent/execute', methods=['POST'])
def execute_fastagent():
    """
    Execute task with FastAgent (HIGH-SPEED - 2-4 seconds per action)
    
    This is the primary endpoint for fast task execution.
    Uses OmniParser + structured Gemini queries for speed.
    
    Request body:
    {
        "task": "Open YouTube and search for Python tutorial",
        "timeout": 120,
        "userId": "user123"
    }
    
    Response:
    {
        "success": true,
        "task": "...",
        "actions_taken": 4,
        "duration": 12.5,
        "error": null,
        "stats": {...}
    }
    """
    try:
        if not fast_agent:
            return jsonify({
                'status': 'error',
                'error': 'FastAgent not available (check GEMINI_API_KEY and OmniParser)'
            }), 503
        
        data = request.get_json(force=True)
        if not data:
            return jsonify({'status': 'error', 'error': 'Invalid JSON in request body'}), 400
            
        task = data.get('task', '')
        timeout = data.get('timeout', 120.0)
        user_id = data.get('userId', 'anonymous')
        
        if not task:
            return jsonify({'status': 'error', 'error': 'No task provided'}), 400
        
        logger.info(f"FastAgent: Executing task for {user_id}: {task}")
        
        # Emit WebSocket update
        socketio.emit('agent_update', {
            'userId': user_id,
            'message': f'FastAgent started: {task}',
            'status': 'executing',
            'agent': 'fastagent'
        })
        
        # Screenshot function
        def get_screenshot():
            try:
                from superagent.executor import ActionExecutor
                executor = ActionExecutor()
                return executor.capture_screen()
            except Exception as e:
                logger.error(f"Screenshot capture failed: {e}")
                return None
        
        # Execute task
        result = fast_agent.execute_task(
            task=task,
            screenshot_func=get_screenshot,
            timeout=timeout
        )
        
        # Get stats
        stats = fast_agent.get_stats()
        
        # Emit completion
        socketio.emit('agent_update', {
            'userId': user_id,
            'message': f'Task {"completed" if result.success else "failed"}',
            'status': 'completed' if result.success else 'error',
            'agent': 'fastagent'
        })
        
        return jsonify({
            'success': result.success,
            'task': task,
            'actions_taken': result.actions_taken,
            'duration': result.duration_seconds,
            'error': result.error,
            'final_state': result.final_state,
            'stats': stats
        })
        
    except Exception as e:
        logger.error(f"FastAgent error: {e}", exc_info=True)
        return jsonify({'error': str(e), 'status': 'error'}), 500


@app.route('/api/fastagent/cancel', methods=['POST'])
def cancel_fastagent():
    """Cancel a running FastAgent task."""
    try:
        if fast_agent:
            fast_agent.cancel()
        socketio.emit('agent_update', {
            'status': 'cancelled',
            'message': 'Task cancelled by user',
            'agent': 'fastagent'
        })
        return jsonify({'status': 'ok', 'cancelled': True})
    except Exception as e:
        logger.error(f"FastAgent cancel error: {e}")
        return jsonify({'status': 'error', 'error': str(e)}), 500


@app.route('/api/fastagent/stats', methods=['GET'])
def fastagent_stats():
    """Get FastAgent performance statistics."""
    try:
        if not fast_agent:
            return jsonify({'error': 'FastAgent not available'}), 503
        
        stats = fast_agent.get_stats()
        stats['agent'] = 'fastagent'
        stats['description'] = 'High-speed execution engine (2-4s per action)'
        return jsonify(stats)
        
    except Exception as e:
        logger.error(f"FastAgent stats error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/fastagent/status', methods=['GET'])
def fastagent_status():
    """Check FastAgent availability and capabilities."""
    try:
        status = {
            'available': fast_agent is not None,
            'omniparser_available': False,
            'gemini_available': False,
            'executor_available': False
        }
        
        if fast_agent:
            status['omniparser_available'] = fast_agent.omniparser is not None
            status['gemini_available'] = fast_agent.vision_api is not None
            status['executor_available'] = fast_agent.executor is not None
            status['max_iterations'] = fast_agent.max_iterations
            status['cache_enabled'] = fast_agent.element_cache is not None
        
        return jsonify(status)
        
    except Exception as e:
        logger.error(f"FastAgent status error: {e}")
        return jsonify({'error': str(e)}), 500



@app.route('/api/superagent/evolution', methods=['GET'])
def superagent_evolution():
    """Get Self-Evolution learning statistics (WORLD'S FIRST)"""
    try:
        if not super_agent:
            return jsonify({'error': 'SuperAgent not available'}), 503
        
        if hasattr(super_agent, 'evolution'):
            stats = super_agent.evolution.get_stats()
            stats['description'] = 'Self-evolving AI agent with reinforcement learning'
            stats['features'] = [
                'Q-learning for action selection',
                'Platform-agnostic learning',
                'Pattern extraction from experience',
                'Persistent memory across sessions',
                'Confidence calibration'
            ]
            return jsonify(stats)
        else:
            return jsonify({'error': 'Evolution system not initialized'}), 503
        
    except Exception as e:
        logger.error(f"Evolution stats error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/superagent/workflow', methods=['POST'])
def execute_workflow():
    """
    Execute complex multi-app workflow (YC DEMO ENDPOINT)
    
    Request body:
    {
        "workflow_type": "gmail_to_hubspot" | "creative_campaign" | "sales_analysis" | "custom",
        "custom_steps": [...],  // For custom workflows
        "userId": "user123"
    }
    
    Response:
    {
        "success": true,
        "steps_completed": 25,
        "total_steps": 30,
        "duration": 45.2,
        "extracted_data": {...}
    }
    """
    try:
        if not super_agent:
            return jsonify({
                'status': 'error',
                'error': 'SuperAgent not available'
            }), 503
        
        from superagent.workflows import (
            WorkflowEngine,
            create_gmail_to_hubspot_workflow,
            create_creative_campaign_workflow,
            create_sales_analysis_workflow
        )
        
        data = request.json
        workflow_type = data.get('workflow_type', 'custom')
        user_id = data.get('userId', 'anonymous')
        
        logger.info(f"SuperAgent Workflow: {workflow_type} for {user_id}")
        
        # Create workflow engine
        engine = WorkflowEngine(super_agent)
        
        # Select workflow
        if workflow_type == 'gmail_to_hubspot':
            steps = create_gmail_to_hubspot_workflow()
            description = "Gmail → HubSpot → Notion lead processing"
        elif workflow_type == 'creative_campaign':
            steps = create_creative_campaign_workflow()
            description = "Uplane → Meta Ads creative campaign"
        elif workflow_type == 'sales_analysis':
            steps = create_sales_analysis_workflow()
            description = "Sales data analysis → Recovery plan"
        elif workflow_type == 'custom':
            # TODO: Parse custom_steps from request
            return jsonify({
                'status': 'error',
                'error': 'Custom workflows not yet implemented'
            }), 400
        else:
            return jsonify({
                'status': 'error',
                'error': f'Unknown workflow type: {workflow_type}'
            }), 400
        
        # Emit start
        socketio.emit('agent_update', {
            'userId': user_id,
            'message': f'Workflow started: {description}',
            'status': 'executing',
            'agent': 'superagent_workflow'
        })
        
        # Execute workflow
        result = engine.execute(steps)
        
        # Emit completion
        socketio.emit('agent_update', {
            'userId': user_id,
            'message': f'Workflow {"completed" if result.success else "failed"}',
            'status': 'completed' if result.success else 'error',
            'agent': 'superagent_workflow'
        })
        
        return jsonify({
            'success': result.success,
            'steps_completed': result.steps_completed,
            'total_steps': result.total_steps,
            'duration': result.duration,
            'extracted_data': result.extracted_data,
            'error': result.error
        })
        
    except Exception as e:
        logger.error(f"Workflow error: {e}", exc_info=True)
        return jsonify({'error': str(e), 'status': 'error'}), 500


@socketio.on('connect')
def handle_connect():
    """Handle WebSocket connection"""
    logger.info(f"Client connected: {request.sid}")
    emit('connected', {'message': 'Connected to AI OS Agent'})


@socketio.on('disconnect')
def handle_disconnect():
    """Handle WebSocket disconnection"""
    logger.info(f"Client disconnected: {request.sid}")


@socketio.on('subscribe')
def handle_subscribe(data):
    """Subscribe to agent updates for a user"""
    user_id = data.get('userId')
    logger.info(f"User {user_id} subscribed to updates")
    emit('subscribed', {'userId': user_id, 'message': 'Subscribed to updates'})


if __name__ == '__main__':
    try:
        logger.info("Starting AI OS Agent API server...")
        print("[agent-api] main block executing")
        logger.info(f"Super agent initialized: {super_agent is not None}")
        logger.info(f"Enhanced super agent initialized: {enhanced_super_agent is not None}")
        socketio.run(app, host='0.0.0.0', port=10000, debug=False, allow_unsafe_werkzeug=True)
    except Exception as e:
        logger.error(f"FATAL ERROR starting server: {e}", exc_info=True)
        import traceback
        traceback.print_exc()
        raise
