"""
Enhanced SuperAgent with Advanced OODA Loop

Improvements over Claude Computer Use & OpenAI Operator:
1. Multi-level planning (strategic → tactical → operational)
2. Self-reflection and error correction
3. Parallel action execution
4. Adaptive learning from failures
5. Visual grounding and verification
6. Semantic understanding of UI context
7. Predictive action sequencing
8. Dynamic timeout adaptation
"""

import os
import time
import subprocess
import logging
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass, field
from enum import Enum

from .actions import Action, ActionType, ActionResult, ActionResult as TaskResult
from .executor import ActionExecutor
from .memory import ShortTermMemory, WorkflowMemory
from .vision import VisionAPI
from .advanced_vision import AdvancedVisionAnalyzer
from .workflows import WorkflowEngine, WorkflowStep, StepType
from .accessibility_bridge import AccessibilityBridge

logger = logging.getLogger(__name__)


class PlanLevel(Enum):
    """Multi-level planning hierarchy"""
    STRATEGIC = "strategic"    # Overall goal decomposition
    TACTICAL = "tactical"      # Step-by-step approach
    OPERATIONAL = "operational" # Individual actions


@dataclass
class Plan:
    """Hierarchical plan with verification"""
    goal: str
    level: PlanLevel
    steps: List[str]
    current_step: int = 0
    confidence: float = 0.0
    estimated_actions: int = 0
    verification_points: List[str] = field(default_factory=list)
    
    def next_step(self) -> Optional[str]:
        if self.current_step < len(self.steps):
            step = self.steps[self.current_step]
            self.current_step += 1
            return step
        return None
    
    def is_complete(self) -> bool:
        return self.current_step >= len(self.steps)


@dataclass
class ReflectionResult:
    """Result of self-reflection analysis"""
    is_stuck: bool
    issue_detected: str
    recommended_action: str
    confidence: float
    should_replan: bool


@dataclass
class VerificationResult:
    """Visual verification of action success"""
    action_succeeded: bool
    visual_evidence: str
    confidence: float
    suggested_correction: Optional[str] = None


class EnhancedSuperAgent:
    """
    World's most advanced screen agent with:
    - Multi-level planning (3 levels: strategic → tactical → operational)
    - Self-reflection and error correction
    - Visual grounding and verification
    - Parallel action execution
    - Adaptive learning
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = "https://openrouter.ai/api/v1",
        model: str = "anthropic/claude-3.5-sonnet",
        max_iterations: int = 50,  # Increased for complex tasks
        memory_path: Optional[str] = None,
        vision_api: Optional[Any] = None,
        enable_parallel: bool = True,
        enable_reflection: bool = True,
        enable_verification: bool = True,
        app_launcher: Optional[Any] = None,  # NEW: Direct app launcher
        socketio: Optional[Any] = None  # NEW: SocketIO for frontend events
    ):
        # Use provided vision API or create default
        if vision_api:
            self.vision = vision_api
        elif api_key:
            self.vision = VisionAPI(api_key=api_key, base_url=base_url, model=model)
        else:
            raise ValueError("Either vision_api or api_key must be provided")
            
        self.executor = ActionExecutor()
        self.short_memory = ShortTermMemory(max_size=20)  # Larger memory
        self.long_memory = WorkflowMemory(persistence_path=memory_path)
        
        # 🧠 GOD-LEVEL INTELLIGENCE: Working Memory + Tool Mastery
        from .working_memory import WorkingMemory, get_evolution
        from .tool_mastery import ToolMastery
        self.working_memory = WorkingMemory()
        self.tool_mastery = ToolMastery()
        self.evolution = get_evolution()  # 🧬 Self-Evolution System
        logger.info("🧠 God-level intelligence modules loaded")
        logger.info(f"🧬 Self-Evolution: {self.evolution.get_stats()['platforms_known']} platforms learned")
        
        # NEW: Store app launcher for direct app opening
        self.app_launcher = app_launcher
        
        # NEW: Store socketio for emitting events to frontend
        self.socketio = socketio
        
        # Initialize advanced vision analyzer
        self.advanced_vision = AdvancedVisionAnalyzer(vision_api=self.vision)
        
        # Initialize workflow engine
        self.workflow_engine = WorkflowEngine(agent=self)
        
        # Initialize accessibility bridge (THE MATRIX BRIDGE)
        self.accessibility = AccessibilityBridge()
        if self.accessibility.enabled:
            logger.info("🔌 Accessibility Bridge ONLINE - X-Ray Vision Activated")
        else:
            logger.warning("⚠️ Accessibility Bridge offline - falling back to pure vision")
        
        self.max_iterations = max_iterations
        self.current_task = None
        self.current_plan = None
        self.current_task_apps: List[str] = []
        self.primary_app: Optional[str] = None
        
        # State tracking for URL navigation
        self.last_typed_url = None
        self.url_typed_iteration = None
        self.current_url = None  # Track current page to avoid redundant navigation
        
        # 🔥 State tracking for search queries (prevent repeat typing)
        self.last_typed_search = None
        self.search_typed_iteration = None
        
        # Data extraction storage - stores findings from tasks
        self.extracted_data: Dict[str, Any] = {}
        self.task_results: List[str] = []  # Text findings during task
        
        # Advanced features
        self.enable_parallel = enable_parallel
        self.enable_reflection = enable_reflection
        self.enable_verification = enable_verification
        
        # Performance tracking
        self.reflection_count = 0
        self.replan_count = 0
        self.parallel_executions = 0
        
        model_name = getattr(self.vision, 'model', model)
        logger.info(f"🚀 EnhancedSuperAgent initialized")
        logger.info(f"   Model: {model_name}")
        logger.info(f"   Max iterations: {max_iterations}")
        logger.info(f"   Parallel execution: {enable_parallel}")
        logger.info(f"   Self-reflection: {enable_reflection}")
        logger.info(f"   Visual verification: {enable_verification}")
        logger.info(f"   Advanced vision: OCR + UI detection enabled")
        logger.info(f"   Workflow engine: Multi-app orchestration enabled")
        # Cancellation flag
        self.force_stop = False

    def request_cancel(self):
        """Signal cancellation of current task."""
        self.force_stop = True
        logger.info("🛑 Cancellation requested by user")
    
    def _cleanup_chrome_windows(self):
        """Close all Chrome windows before starting task"""
        try:
            if os.getenv('AIOS_SKIP_CHROME_CLEANUP', '1') == '1':
                logger.info("🧹 Skipping Chrome cleanup (AIOS_SKIP_CHROME_CLEANUP=1)")
                return

            logger.info("🧹 Cleaning up old Chrome windows...")
            
            # Get all Chrome windows
            result = subprocess.run(
                ['wmctrl', '-l'],
                capture_output=True,
                text=True,
                env={'DISPLAY': self.executor.display}
            )
            
            chrome_count = 0
            protected_keywords = [
                'gmail', 'inbox', 'mail', 'linkedin', 'google sheets', 'sheet',
                'notion', 'slack', 'zoom', 'facebook', 'instagram', 'salesforce',
                'quickbooks', 'asana', 'calendar', 'drive'
            ]
            for line in result.stdout.split('\n'):
                if 'Chrome' in line or 'Google Chrome' in line:
                    title_lower = line.lower()
                    if any(keyword in title_lower for keyword in protected_keywords):
                        logger.debug(f"   Preserving app window: {line.strip()}")
                        continue
                    window_id = line.split()[0]
                    subprocess.run(
                        ['wmctrl', '-ic', window_id],
                        env={'DISPLAY': self.executor.display},
                        stderr=subprocess.DEVNULL
                    )
                    chrome_count += 1
            
            if chrome_count > 0:
                logger.info(f"   Closed {chrome_count} old Chrome window(s)")
                time.sleep(1)  # Wait for windows to close
            else:
                logger.info("   No old Chrome windows found")
                
        except Exception as e:
            logger.warning(f"Failed to cleanup Chrome windows: {e}")

    def _cleanup_after_task(self):
        """
        Cleanup after task completion to prevent resource accumulation.
        - Close extra Chrome tabs (keep max 3)
        - Clear state tracking
        - Free memory
        """
        try:
            logger.info("🧹 Post-task cleanup starting...")
            
            # Reset state tracking
            self.last_typed_url = None
            self.url_typed_iteration = None
            self.current_url = None
            
            # Reset search tracking
            self.last_typed_search = None
            self.search_typed_iteration = None
            
            # Clear task-specific data (keep extracted_data for response)
            self.current_task = None
            self.current_plan = None
            
            # Close excess Chrome tabs (keep max 3) using xdotool
            try:
                # Get Chrome window count
                result = subprocess.run(
                    ['wmctrl', '-l'],
                    capture_output=True,
                    text=True,
                    env={'DISPLAY': self.executor.display}
                )
                
                chrome_windows = []
                for line in result.stdout.split('\n'):
                    if 'Chrome' in line or 'Google Chrome' in line:
                        parts = line.split()
                        if parts:
                            chrome_windows.append(parts[0])  # Window ID
                
                # Keep only last 3 Chrome windows
                if len(chrome_windows) > 3:
                    to_close = chrome_windows[:-3]  # Close all but last 3
                    logger.info(f"🧹 Closing {len(to_close)} excess Chrome windows...")
                    for window_id in to_close:
                        subprocess.run(
                            ['wmctrl', '-ic', window_id],
                            env={'DISPLAY': self.executor.display},
                            stderr=subprocess.DEVNULL
                        )
                    logger.info(f"✅ Closed {len(to_close)} excess Chrome windows")
                else:
                    logger.info(f"✅ Chrome window count OK ({len(chrome_windows)} windows)")
                    
            except Exception as e:
                logger.warning(f"Could not cleanup Chrome windows: {e}")
            
            # Force Python garbage collection
            import gc
            gc.collect()
            
            logger.info("✅ Post-task cleanup complete")
            
        except Exception as e:
            logger.warning(f"Post-task cleanup failed: {e}")

    def _extract_and_store_findings(self, screenshot: bytes, step: str, task: str):
        """
        Extract and store text/data findings from the current screen.
        Called when a step completes to capture what the agent found.
        """
        try:
            # Use vision API to extract key findings
            extract_prompt = f"""You are extracting key findings from the screen.

COMPLETED STEP: {step}
OVERALL TASK: {task}

Look at the screen and extract the KEY INFORMATION that was found:
- If searching: What are the main search results? (titles, snippets)
- If on a profile page: What are the key details? (name, email, company)
- If on an article: What is the headline and key points?
- If on a data page: What are the main data items?

Return a JSON with:
{{
    "extracted_text": "The main text/content visible on screen (max 500 chars)",
    "key_items": ["item1", "item2", ...],  // List of key findings (names, emails, titles, etc.)
    "page_type": "search_results|profile|article|data|other",
    "summary": "One sentence summary of what was found"
}}

Be concise. Focus on extractable data, not UI descriptions."""

            result = self.advanced_vision.analyze_with_vision_api(
                screenshot=screenshot,
                task=extract_prompt,
                context={'mode': 'extraction'}
            )
            
            if result:
                # Store in extracted_data
                step_key = step[:50].replace(' ', '_').lower()  # Sanitize key
                
                if 'extracted_text' in result:
                    self.task_results.append(result.get('extracted_text', ''))
                    # 🧠 GOD-LEVEL: Store in working memory
                    self.working_memory.extract_data(
                        source=self.primary_app or 'Chrome',
                        data_type='text',
                        data=result.get('extracted_text', ''),
                        confidence=0.9
                    )
                
                if 'key_items' in result:
                    items = result.get('key_items', [])
                    if items:
                        self.extracted_data[step_key] = items
                        logger.info(f"📊 Extracted {len(items)} items for '{step_key}'")
                        # 🧠 GOD-LEVEL: Store in working memory
                        self.working_memory.extract_data(
                            source=self.primary_app or 'Chrome',
                            data_type='key_items',
                            data=items,
                            confidence=0.9
                        )
                        logger.info(f"🧠 Stored {len(items)} items in working memory")
                
                if 'summary' in result:
                    summary = result.get('summary', '')
                    if summary:
                        self.task_results.append(f"[{step}]: {summary}")
                        logger.info(f"📝 Summary: {summary}")
                        # 🧠 GOD-LEVEL: Store summary in working memory
                        self.working_memory.extract_data(
                            source=self.primary_app or 'Chrome',
                            data_type='summary',
                            data=summary,
                            confidence=0.95
                        )
                        
        except Exception as e:
            logger.warning(f"Extraction failed: {e}")

    def _infer_task_apps(self, task: str) -> List[str]:
        """Infer which apps are needed for the task based on intent."""
        task_lower = task.lower()
        inferred: List[str] = []

        def add_app(name: str):
            if name not in inferred:
                inferred.append(name)

        # CRITICAL: Check social media FIRST (before generic keywords like "inbox")
        # Social channels - detect from keywords AND URLs
        if 'instagram' in task_lower or 'instagram.com' in task_lower:
            add_app('Instagram')
        elif 'facebook' in task_lower or 'facebook.com' in task_lower or 'social media' in task_lower:
            add_app('Facebook')

        # Email support / inbox management - detect from keywords AND URLs
        # IMPORTANT: Only add Gmail if Instagram wasn't already detected (avoid "instagram.com/direct/inbox" triggering Gmail)
        if ('Gmail' not in inferred) and (any(keyword in task_lower for keyword in ['email', 'mail', 'gmail', 'reply', 'respond', 'support ticket']) or 'mail.google.com' in task_lower or ('inbox' in task_lower and 'instagram' not in task_lower)):
            add_app('Gmail')

        # Professional networking / recruiting - detect from keywords AND URLs
        if any(keyword in task_lower for keyword in ['linkedin', 'candidate', 'recruit', 'engineer', 'talent', 'profile']) or 'linkedin.com' in task_lower:
            add_app('LinkedIn')

        # Spreadsheets / structured data entry - detect from keywords AND URLs
        if any(keyword in task_lower for keyword in ['spreadsheet', 'sheet', 'google sheet', 'excel', 'table', 'csv']) or 'docs.google.com/spreadsheets' in task_lower:
            add_app('Google Sheets')

        # Documentation / planning - detect from keywords AND URLs
        if any(keyword in task_lower for keyword in ['notion', 'document', 'doc', 'wiki', 'plan outline']) or 'notion.so' in task_lower:
            add_app('Notion')

        # Meetings / calls - detect from keywords AND URLs  
        if any(keyword in task_lower for keyword in ['zoom', 'meeting', 'video call', 'conference']) or 'zoom.us' in task_lower:
            add_app('Zoom')

        # Sales pipelines / crm - detect from keywords AND URLs
        if any(keyword in task_lower for keyword in ['salesforce', 'crm', 'deal pipeline']) or 'salesforce.com' in task_lower:
            add_app('Salesforce')

        # Financial workflows
        if any(keyword in task_lower for keyword in ['invoice', 'accounting', 'books', 'quickbooks']):
            add_app('QuickBooks')

        # Project management
        if any(keyword in task_lower for keyword in ['asana', 'task board', 'project plan']):
            add_app('Asana')

        # Default to Chrome for general browsing/search
        if not inferred:
            add_app('Chrome')
        elif any(
            app in inferred for app in ['LinkedIn', 'Google Sheets', 'Gmail', 'Notion', 'Facebook', 'Instagram', 'Salesforce']
        ) and 'Chrome' not in inferred:
            inferred.append('Chrome')

        # Log for debugging
        logger.info(f"📱 Task app inference: {inferred} (primary will be selected from this list)")
        
        return inferred

    def _prepare_task_environment(self, apps: List[str]):
        """Make sure the right app windows are running and focused."""
        if not apps:
            return
        if not self.app_launcher:
            logger.info("No app launcher available - relying on existing windows")
            return
        if not hasattr(self.app_launcher, 'window_controller') or not hasattr(self.app_launcher, 'switch_app'):
            logger.info("App launcher missing window controller capabilities")
            return

        windows = []
        try:
            windows = self.app_launcher.window_controller.list_windows()
        except Exception as exc:
            logger.warning(f"Unable to list windows: {exc}")

        for app in apps:
            if not self._is_app_window_open(app, windows):
                logger.info(f"🔧 Ensuring {app} is running for this task")
                self.app_launcher.launch_app(app)
                time.sleep(2)
                windows = self.app_launcher.window_controller.list_windows()
            
            # 🎓 Track app in working memory
            self.working_memory.switch_app(app)

        # Focus primary app window
        primary = apps[0]
        self.primary_app = primary
        if not self.app_launcher.switch_app(primary):
            logger.info(f"Retrying focus for {primary} by relaunching")
            self.app_launcher.launch_app(primary)
            time.sleep(2)
            self.app_launcher.switch_app(primary)
        self.executor.set_focus_hint(primary)

    def _is_app_window_open(self, app: str, windows: List[Dict[str, str]]) -> bool:
        """Check if an app window already exists."""
        if not windows:
            return False
        app_lower = app.lower()
        for window in windows:
            title = window.get('title', '').lower()
            klass = window.get('class', '').lower()
            if app_lower in title or app_lower in klass:
                return True
            # Handle Google Sheets & Gmail special cases (Chrome titles)
            if app_lower == 'google sheets' and 'sheets' in title:
                return True
            if app_lower == 'gmail' and ('gmail' in title or 'mail' in title):
                return True
        return False
    
    def execute_task(self, task: str, timeout: float = 180.0) -> Dict[str, Any]:
        """
        Execute task with advanced multi-level planning
        
        Timeout: 180s for complex multi-step workflows
        
        Workflow:
        1. Strategic planning: Break down goal
        2. Tactical planning: Identify steps
        3. Operational execution: Perform actions with verification
        4. Continuous reflection: Detect and correct errors
        """
        logger.info(f"=== 🎯 Starting Enhanced Task: {task} ===")
        
        # Reset data extraction for new task
        self.extracted_data = {}
        self.task_results = []
        
        # 🧠 Clear and prepare working memory
        self.working_memory.clear()
        
        # Clean up old Chrome windows before starting (optional)
        self._cleanup_chrome_windows()

        # Determine which apps this task will need and prepare them
        self.current_task_apps = self._infer_task_apps(task)
        
        # CRITICAL FIX: Always prioritize specific apps over generic Chrome
        # Priority order: Instagram > Gmail > LinkedIn > Others > Chrome
        priority_apps = ['Instagram', 'Facebook', 'LinkedIn', 'Gmail', 'Google Sheets', 'Notion', 'Slack', 'Zoom', 'Salesforce', 'QuickBooks', 'Asana']
        self.primary_app = next((app for app in self.current_task_apps if app in priority_apps), None)
        
        # Fallback: Any non-Chrome app
        if self.primary_app is None:
            self.primary_app = next((app for app in self.current_task_apps if app != 'Chrome'), None)
        
        # Final fallback: Use first app (even if Chrome)
        if self.primary_app is None and self.current_task_apps:
            self.primary_app = self.current_task_apps[0]
        
        # Critical logging for debugging window selection
        logger.info(f"🎯 PRIMARY APP SELECTED: {self.primary_app} (from apps: {self.current_task_apps})")

        if self.primary_app and self.primary_app in self.current_task_apps:
            self.current_task_apps = [self.primary_app] + [
                app for app in self.current_task_apps if app != self.primary_app
            ]
        if self.primary_app:
            self.executor.set_focus_hint(self.primary_app)
        else:
            self.executor.set_focus_hint(None)
        self._prepare_task_environment(self.current_task_apps)
        
        self.current_task = task
        self.short_memory.start_task(task)
        start_time = time.time()
        
        # Check for similar successful workflows
        similar = self.long_memory.get_similar_workflow(task)
        if similar:
            logger.info(f"📚 Found similar workflow (used {similar['success_count']} times)")
            logger.info(f"   Avg duration: {similar.get('avg_duration', 0):.1f}s")
        
        # 🔥 FAST MODE: Skip strategic planning for simple tasks
        task_lower = task.lower()
        
        # 🔥 SPEED: Pattern-based simple task detection
        # Common patterns that are "simple" even with "and":
        simple_patterns = [
            # Navigation + action patterns
            'go to youtube and play',
            'go to youtube and search',
            'open google and search',
            'go to google and search',
            'open youtube and play',
            'go to amazon and search',
            'open website',
            'go to website',
            # Single site tasks
            'search on google',
            'search on youtube',
            'play on youtube',
            # Direct navigation
            'open gmail',
            'go to facebook',
        ]
        is_pattern_simple = any(pattern in task_lower for pattern in simple_patterns)
        
        # Multi-step indicators (but NOT if matches simple pattern)
        has_multiple_steps = not is_pattern_simple and any(sep in task_lower for sep in [' and ', ' then ', '→', ', '])
        
        # Count action verbs
        action_verbs = ['go', 'open', 'click', 'type', 'search', 'find', 'create', 'extract', 'draft', 'put', 'fill']
        verb_count = sum(1 for verb in action_verbs if verb in task_lower)
        
        # Simple task = pattern match OR (single action verb, no conjunctions, short)
        is_simple_task = is_pattern_simple or (not has_multiple_steps and verb_count <= 1 and len(task.split()) <= 8)
        
        if is_simple_task:
            logger.info("🚀 FAST MODE: Detected simple single-action task, skipping multi-level planning")
            strategic_plan = Plan(
                goal=task,
                level=PlanLevel.STRATEGIC,
                steps=[task],  # Single step
                confidence=1.0,
                estimated_actions=3
            )
        else:
            # PHASE 1: Strategic Planning (for complex multi-step tasks)
            logger.info("🧠 COMPLEX TASK: Using multi-level planning (strategic → tactical → operational)")
            strategic_plan = self._create_strategic_plan(task)
            if not strategic_plan:
                return self._failure_result(task, start_time, [], "Failed to create strategic plan")
        
        logger.info(f"📋 Strategic Plan ({len(strategic_plan.steps)} major steps):")
        for i, step in enumerate(strategic_plan.steps, 1):
            logger.info(f"   {i}. {step}")
        
        iteration = 0
        actions_taken = []
        
        try:
            # Execute strategic plan step by step
            while not strategic_plan.is_complete() and iteration < self.max_iterations:
                # Cancellation check
                if self.force_stop:
                    logger.info("🛑 Task cancelled mid strategic loop")
                    return self._failure_result(task, start_time, actions_taken, "Cancelled")
                # Check timeout
                if time.time() - start_time > timeout:
                    return self._failure_result(task, start_time, actions_taken, "Timeout")
                
                current_goal = strategic_plan.next_step()
                if not current_goal:
                    break
                
                logger.info(f"\n🎯 Step {strategic_plan.current_step}/{len(strategic_plan.steps)}: {current_goal}")
                
                # PHASE 2: Tactical Planning for current step
                # 🔥 FAST MODE: Skip tactical planning for simple tasks (saves 1 Gemini call = 9s!)
                if is_simple_task:
                    logger.info("🚀 FAST MODE: Skipping tactical planning, executing directly")
                    tactical_plan = Plan(
                        goal=current_goal,
                        level=PlanLevel.TACTICAL,
                        steps=[current_goal],  # Single step
                        confidence=1.0,
                        estimated_actions=3
                    )
                else:
                    tactical_plan = self._create_tactical_plan(current_goal, task)
                
                # PHASE 3: Execute tactical plan with OODA loop
                step_result = self._execute_tactical_plan(
                    tactical_plan,
                    task,
                    actions_taken,
                    start_time,
                    timeout,
                    iteration
                )
                
                iteration = step_result['iteration']
                actions_taken = step_result['actions_taken']
                
                if not step_result['success']:
                    # Self-reflection: Why did we fail?
                    if self.enable_reflection:
                        reflection = self._self_reflect(task, current_goal, actions_taken)
                        logger.info(f"🤔 Reflection: {reflection.issue_detected}")
                        
                        if reflection.should_replan:
                            logger.info(f"🔄 Replanning strategy...")
                            self.replan_count += 1
                            strategic_plan = self._create_strategic_plan(task)
                            continue
                    
                    return self._failure_result(task, start_time, actions_taken, step_result['error'])
            
            # Task completed successfully
            duration = time.time() - start_time
            self.long_memory.record_successful_workflow(task, actions_taken, duration)
            
            # 🧠 Get working memory state
            memory_state = self.working_memory.to_dict()
            
            logger.info(f"✅ Task completed successfully!")
            logger.info(f"   Duration: {duration:.1f}s")
            logger.info(f"   Actions: {len(actions_taken)}")
            logger.info(f"   Reflections: {self.reflection_count}")
            logger.info(f"   Replans: {self.replan_count}")
            logger.info(f"   Data extracted: {len(memory_state['extractions'])} items")
            
            # Cleanup after task completion to prevent resource accumulation
            self._cleanup_after_task()
            
            # Return dict with extracted data from BOTH systems
            return {
                'success': True,
                'task': task,
                'actions_taken': len(actions_taken),
                'duration': duration,
                'final_state': "Task completed successfully",
                'extracted_data': self.extracted_data.copy(),
                'results': self.task_results.copy(),
                'working_memory': memory_state  # 🧠 NEW: Full memory state
            }
            
        except Exception as e:
            logger.error(f"❌ Unexpected error: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return self._failure_result(task, start_time, actions_taken, str(e))
    
    def _create_strategic_plan(self, task: str) -> Optional[Plan]:
        """
        Create high-level strategic plan
        Uses vision AI to break down complex task into major steps
        """
        logger.info("🧠 Creating strategic plan...")
        
        try:
            # FIRST: Check for multi-goal keywords DIRECTLY in code
            task_lower = task.lower()
            multi_goal_keywords = [' then ', ' and then ', ' after that ', ' afterwards ', ' next ']
            
            has_multiple_goals = any(keyword in task_lower for keyword in multi_goal_keywords)
            
            if has_multiple_goals:
                # Split task into separate goals
                steps = []
                remaining = task
                
                for keyword in [' then ', ' and then ', ' after that ', ' afterwards ', ' next ']:
                    if keyword in remaining.lower():
                        parts = remaining.split(keyword, 1)
                        if parts[0].strip():
                            steps.append(parts[0].strip())
                        if len(parts) > 1:
                            remaining = parts[1].strip()
                        else:
                            remaining = ""
                
                if remaining:
                    steps.append(remaining)
                
                if len(steps) >= 2:
                    logger.info(f"✅ Detected multi-goal task with {len(steps)} goals:")
                    for i, step in enumerate(steps, 1):
                        logger.info(f"   Goal {i}: {step}")
                    
                    return Plan(
                        goal=task,
                        level=PlanLevel.STRATEGIC,
                        steps=steps,
                        confidence=0.9,
                        estimated_actions=len(steps) * 8
                    )
            
            screenshot = self.executor._capture_screen()
            
            recommended_apps = self.current_task_apps or ['Chrome', 'Gmail', 'Google Sheets', 'LinkedIn', 'Slack', 'Zoom']
            recommended_apps_str = ", ".join(recommended_apps)
            primary_app = self.primary_app or 'Chrome'
            
            prompt = f"""You are an AI agent that UNDERSTANDS USER INTENT. Users describe WHAT they want, not HOW to do it.

TASK: {task}
PRIMARY APP TO START WITH: {primary_app}
OTHER RECOMMENDED APPS: {recommended_apps_str}

🔍 ANALYZE THE TASK:
Look for keywords like "then", "and then", "after that", "next" - these indicate MULTIPLE separate goals!

Example: "go to google, search for AI, then open wikipedia and search for neural networks"
This is TWO separate goals:
1. Go to Google and search for AI
2. Open Wikipedia and search for neural networks

Break complex tasks into SEPARATE, INDEPENDENT strategic steps!

THINK ABOUT INTENT:
1. What is the user trying to achieve? (research, communication, data entry, analysis)
2. Which apps do I need? (DON'T wait for user to say "open X" - YOU decide!)
3. What's the end result they want to see?
4. Are there MULTIPLE tasks separated by "then" or "and"?

AUTO-SELECT APPS BASED ON INTENT:
- Research/search/find information → Chrome
- Send email/respond to messages → Gmail
- Team communication → Slack
- Video calls/meetings → Zoom
- CRM/customer data → Salesforce
- Documents/notes → Notion
- Spreadsheets/data → Google Sheets

EXAMPLES:
User: "find information about OpenAI" → ["Open Chrome and search for OpenAI", "Read first result"]
User: "search for AI then go to wikipedia" → ["Search Google for AI", "Navigate to Wikipedia", "Search Wikipedia"]
User: "respond to customer email about order 12345" → ["Open Gmail and find email", "Draft response", "Send email"]

Create a high-level plan with 3-7 major steps. Each step should be a COMPLETE goal that can succeed independently.

RESPOND WITH JSON:
{{
    "thinking": "User wants to [intent]. This has X separate tasks. I need to use [apps] to achieve this.",
    "steps": ["Complete goal 1", "Complete goal 2", "Complete goal 3", ...],
    "estimated_actions": 15,
    "confidence": 0.85,
    "verification_points": ["Check 1", "Check 2", ...]
}}"""
            
            planning_context = {
                'mode': 'planning',
                'recommended_apps': self.current_task_apps,
                'preferred_app': self.primary_app
            }
            result = self.advanced_vision.analyze_with_vision_api(
                screenshot=screenshot,
                task=prompt,
                context=planning_context
            )
            
            if result and 'steps' in result:
                plan = Plan(
                    goal=task,
                    level=PlanLevel.STRATEGIC,
                    steps=result['steps'],
                    confidence=result.get('confidence', 0.7),
                    estimated_actions=result.get('estimated_actions', 20),
                    verification_points=result.get('verification_points', [])
                )
                logger.info(f"✓ Strategic plan created (confidence: {plan.confidence:.2f})")
                return plan
            
            # Fallback: simple single-step plan
            logger.warning("Failed to get detailed plan, using simple approach")
            return Plan(
                goal=task,
                level=PlanLevel.STRATEGIC,
                steps=[task],
                confidence=0.5,
                estimated_actions=10
            )
            
        except Exception as e:
            logger.error(f"Strategic planning failed: {e}")
            return None
    
    def _create_tactical_plan(self, goal: str, overall_task: str) -> Plan:
        """
        Create tactical plan for a specific strategic step
        More detailed than strategic, but not individual actions yet
        """
        logger.info(f"⚙️ Creating tactical plan for: {goal}")
        
        try:
            screenshot = self.executor._capture_screen()
            
            # Get context from memory
            recent_actions = [entry.action for entry in list(self.short_memory.memory)[-5:]] if self.short_memory.memory else []
            action_summary = ", ".join([a.get('type', 'unknown') for a in recent_actions])

            recommended_apps = self.current_task_apps or ['Chrome', 'Gmail', 'Google Sheets', 'LinkedIn']
            recommended_apps_str = ", ".join(recommended_apps)
            primary_app = self.primary_app or (recommended_apps[0] if recommended_apps else 'Chrome')
            
            prompt = f"""Create a DETAILED tactical plan with MULTIPLE steps.

OVERALL TASK: {overall_task}
CURRENT GOAL: {goal}
RECENT ACTIONS: {action_summary if action_summary else "None yet"}
PRIMARY APP IN FOCUS: {primary_app}
RELEVANT APPS AVAILABLE: {recommended_apps_str}

You MUST break this into 3-7 SPECIFIC action steps. Do NOT just repeat the goal.

EXAMPLES:
- Goal: "search for OpenAI" → Steps: ["Open Chrome", "Click address bar", "Type 'OpenAI'", "Press Enter", "Read results"]
- Goal: "send email" → Steps: ["Open Gmail", "Click Compose", "Type recipient", "Type message", "Click Send"]

RESPOND WITH JSON - steps array MUST have at least 3 items:
{{
    "thinking": "Breaking down into executable steps",
    "steps": ["Step 1 action", "Step 2 action", "Step 3 action", ...],
    "estimated_actions": 6,
    "confidence": 0.9
}}"""
            
            tactical_context = {
                'mode': 'tactical_planning',
                'recommended_apps': self.current_task_apps,
                'preferred_app': self.primary_app
            }
            result = self.advanced_vision.analyze_with_vision_api(
                screenshot=screenshot,
                task=prompt,
                context=tactical_context
            )
            
            if result and 'steps' in result:
                return Plan(
                    goal=goal,
                    level=PlanLevel.TACTICAL,
                    steps=result['steps'],
                    confidence=result.get('confidence', 0.7),
                    estimated_actions=result.get('estimated_actions', 5)
                )
            
        except Exception as e:
            logger.warning(f"Tactical planning failed: {e}")
        
        # Fallback
        return Plan(
            goal=goal,
            level=PlanLevel.TACTICAL,
            steps=[goal],
            confidence=0.5,
            estimated_actions=5
        )
    
    def _execute_tactical_plan(
        self,
        plan: Plan,
        overall_task: str,
        actions_taken: List[Action],
        start_time: float,
        timeout: float,
        iteration: int
    ) -> Dict[str, Any]:
        """
        Execute tactical plan using enhanced OODA loop
        """
        # FIX #5: Track step completion for each tactical step
        for step_index, step in enumerate(plan.steps):
            logger.info(f"  → Tactical Step {step_index + 1}/{len(plan.steps)}: {step}")
            
            sub_iteration = 0
            max_sub_iterations = 25  # Increased from 15 to allow more complex steps
            step_completed = False  # Track if this step succeeded
            
            while sub_iteration < max_sub_iterations and not step_completed:
                if getattr(self, 'force_stop', False):
                    logger.info("🛑 Cancellation detected during tactical execution")
                    return {
                        'success': False,
                        'error': 'Cancelled',
                        'iteration': iteration,
                        'actions_taken': actions_taken
                    }
                iteration += 1
                sub_iteration += 1
                
                if time.time() - start_time > timeout:
                    return {
                        'success': False,
                        'error': 'Timeout',
                        'iteration': iteration,
                        'actions_taken': actions_taken
                    }
                
                logger.info(f"\n--- Iteration {iteration} (sub: {sub_iteration}) ---")
                
                # Enhanced OODA cycle
                action = self._enhanced_ooda_cycle(step, overall_task)
                
                # Store the last OODA context for evolution tracking
                ooda_context = getattr(self, '_last_ooda_context', {})
                
                if not action:
                    logger.error("Failed to get action from vision API")
                    return {
                        'success': False,
                        'error': 'Vision API failure',
                        'iteration': iteration,
                        'actions_taken': actions_taken
                    }
                
                # 🧠 GOD-LEVEL: Check if keyboard shortcut exists for this action
                if self.primary_app and action.type == ActionType.CLICK:
                    # Infer intent from action reason
                    reason_lower = action.reason.lower() if action.reason else ''
                    
                    # Map common click intents to shortcuts
                    intent_map = {
                        'compose': 'compose',
                        'new message': 'compose',
                        'write': 'compose',
                        'reply': 'reply',
                        'send': 'send',
                        'search': 'search',
                        'new task': 'new_task',
                        'create task': 'new_task',
                        'address bar': 'address_bar',
                        'new tab': 'new_tab'
                    }
                    
                    detected_intent = None
                    for intent_keyword, intent_name in intent_map.items():
                        if intent_keyword in reason_lower:
                            detected_intent = intent_name
                            break
                    
                    if detected_intent:
                        shortcut = self.tool_mastery.get_shortcut(self.primary_app, detected_intent)
                        if shortcut:
                            # Convert shortcut string to keys list (e.g., "Ctrl+C" -> ['ctrl', 'c'])
                            keys = [k.strip().lower() for k in shortcut.replace('+', ' ').split()]
                            logger.info(f"🚀 GOD-LEVEL: Using shortcut {shortcut} instead of clicking for '{detected_intent}'")
                            action = Action(
                                type=ActionType.HOTKEY,
                                keys=keys,
                                reason=f"[Shortcut: {shortcut}] {action.reason}"
                            )
                
                # Check for completion - VERIFY before accepting (SKIP IF HIGH CONFIDENCE)
                if action.type == ActionType.DONE:
                    logger.info(f"🔍 Agent claims task done: {action.reason}")
                    
                    # ⚡ OPTIMIZATION: Skip verification for high-confidence actions (>0.9)
                    last_confidence = getattr(self, '_last_action_confidence', 0.0)
                    if last_confidence > 0.9:
                        logger.info(f"⚡ FAST PATH: Skipping verification (confidence {last_confidence:.2f} > 0.9)")
                        verify_result = {'confidence': last_confidence, 'observation': 'High confidence - skipped verification'}
                        is_verified = True
                    else:
                        # Verify the claim with another vision check
                        screenshot = self.executor._capture_screen()
                        verify_prompt = f"""VERIFICATION CHECK:
Original task: {overall_task}
Current step being verified: {step}

Look at the screenshot carefully. Has this step been FULLY completed?
- For "open email": Do you see an email opened and readable?
- For "reply to email": Do you see a sent confirmation or reply compose box?
- For "click button": Do you see the result of clicking (new page, form, popup)?

Answer honestly: Is this specific step complete based on what you see on screen?"""
                        
                        verify_result = self.advanced_vision.analyze_with_vision_api(
                            screenshot=screenshot,
                            task=verify_prompt,
                            context={'mode': 'verification'}
                        )
                        is_verified = False
                    
                    # Check both confidence and observation (only if not already verified)
                    if not is_verified and verify_result:
                        confidence = verify_result.get('confidence', 0)
                        observation = verify_result.get('observation', '').lower()
                        # Accept if high confidence (agent says it's done)
                        # Relax keyword matching - look for ANY success indicator
                        success_keywords = ['complete', 'success', 'done', 'fulfill', 'achieve', 'ready', 'loaded', 'display', 'showing', 'visible', 'open', 'navigated']
                        has_success_keyword = any(kw in observation for kw in success_keywords)
                        
                        if confidence >= 0.8:  # High confidence = trust the agent
                            is_verified = True
                        elif confidence >= 0.7 and has_success_keyword:  # Good confidence + success words
                            is_verified = True
                    
                    if is_verified:
                        logger.info(f"✓ Verification passed - Sub-goal completed: {action.reason}")
                        
                        # 🔥 EXTRACT DATA: Capture visible text/findings when step completes
                        try:
                            self._extract_and_store_findings(screenshot, step, overall_task)
                        except Exception as e:
                            logger.warning(f"Data extraction failed: {e}")
                        
                        # 🧠 GOD-LEVEL: Mark step as successful in workflow state
                        try:
                            self.working_memory.workflow_state.mark_success(
                                step_name=step,
                                result={'confidence': verify_result.get('confidence', 0.8) if verify_result else 0.8}
                            )
                            logger.info(f"🧠 Workflow progress: {len(self.working_memory.workflow_state.completed_steps)} steps completed")
                        except Exception as e:
                            logger.debug(f"Workflow tracking failed: {e}")
                        
                        step_completed = True
                        break
                    else:
                        logger.warning(f"⚠️ Verification FAILED - task not actually complete")
                        logger.warning(f"   Confidence: {verify_result.get('confidence', 0) if verify_result else 0}")
                        logger.warning(f"   Observation: {verify_result.get('observation', 'none') if verify_result else 'none'}")
                        logger.info("   Continuing to work on task...")
                        continue
                
                # Execute action
                logger.info(f"Executing: {action}")
                
                # 🧬 Track action start time for evolution learning
                self._action_start_time = time.time()
                
                # Initialize URL prevention flag (used later in AUTO-FIX)
                url_was_prevented = False
                
                # NEW: Handle open_app action specially
                if action.type == ActionType.OPEN_APP and self.app_launcher:
                    app_name = action.app or action.reason.lower()
                    # Map app names (lowercase input -> capitalized app names)
                    app_map = {
                        'chrome': 'Chrome',
                        'gmail': 'Gmail', 
                        'slack': 'Slack',
                        'notion': 'Notion',
                        'zoom': 'Zoom',
                        'facebook': 'Facebook',
                        'instagram': 'Instagram',
                        'salesforce': 'Salesforce',
                        'linkedin': 'LinkedIn'
                    }
                    
                    # Find app in name
                    app_to_launch = None
                    for app_key in app_map.keys():
                        if app_key in app_name.lower():
                            app_to_launch = app_map[app_key]
                            break
                    
                    if app_to_launch:
                        logger.info(f"🚀 Opening app directly: {app_to_launch}")
                        try:
                            self.app_launcher.launch_app(app_to_launch)
                            self.primary_app = app_to_launch
                            if app_to_launch not in self.current_task_apps:
                                self.current_task_apps.append(app_to_launch)
                            self.current_task_apps = [app_to_launch] + [
                                app for app in self.current_task_apps if app != app_to_launch
                            ]
                            self.executor.set_focus_hint(app_to_launch)
                            result = ActionResult(success=True, action=action, error=None)
                            logger.info(f"✅ App {app_to_launch} launched successfully")
                            
                            # FIX #3: Emit socketio event (Flask-SocketIO doesn't use broadcast param)
                            if self.socketio:
                                logger.info(f"📡 Emitting app_opened event to frontend: {app_to_launch}")
                                try:
                                    self.socketio.emit('app_opened', {
                                        'app': app_to_launch.lower(),
                                        'appName': app_to_launch,
                                        'url': 'http://localhost:10005/',
                                        'message': f'Opening {app_to_launch}...',
                                        'timestamp': time.time()
                                    })
                                    
                                    # Also emit as agent_update for compatibility
                                    self.socketio.emit('agent_update', {
                                        'userId': 'anonymous',
                                        'action': 'app_opened',
                                        'app_name': app_to_launch,
                                        'status': 'opened',
                                        'agent': 'superagent'
                                    })
                                    
                                    logger.info("✅ SocketIO events emitted successfully")
                                except Exception as e:
                                    logger.error(f"❌ Failed to emit SocketIO event: {e}")
                            
                            # FIX #1: Wait for app to render (optimized for speed)
                            if app_to_launch.lower() == 'chrome':
                                logger.info("⏳ Waiting 5s for Chrome to render...")
                                time.sleep(5)  # Reduced from 15s
                            else:
                                time.sleep(3)  # Reduced from 8s
                            
                            # Simple additional wait - skip complex image check
                            logger.info("✅ Chrome should be ready after 15s wait")
                        except Exception as e:
                            logger.error(f"❌ Failed to launch app: {e}")
                            result = ActionResult(success=False, action=action, error=str(e))
                    else:
                        logger.warning(f"⚠️ Unknown app: {app_name}, trying executor")
                        result = self.executor.execute(action, verify=True)
                else:
                    # 🚀 SMART URL PREVENTION: Don't type the same URL twice
                    if action.type == ActionType.TYPE and action.text:
                        logger.info(f"🔍 URL CHECK: current='{action.text}', last='{self.last_typed_url}', iter={self.url_typed_iteration}, current_iter={iteration}")
                    
                    if (action.type == ActionType.TYPE and action.text and 
                        self.last_typed_url and 
                        action.text.lower() in self.last_typed_url.lower() and
                        self.url_typed_iteration and 
                        iteration - self.url_typed_iteration < 5):  # Within last 5 iterations
                        
                        logger.warning(f"⚠️ PREVENTED: Already typed URL '{action.text}' at iteration {self.url_typed_iteration}")
                        logger.info("💡 Skipping duplicate URL typing, waiting for page load instead...")
                        
                        # Create a fake success result to prevent executing
                        result = ActionResult(
                            success=True,
                            action=action
                        )
                        url_was_prevented = True
                        time.sleep(2)  # Wait for prevented URL
                    
                    # 🔥 SEARCH QUERY PREVENTION: Don't type same search twice
                    elif (action.type == ActionType.TYPE and action.text and 
                          self.last_typed_search and 
                          action.text.lower().strip() == self.last_typed_search.lower().strip() and
                          self.search_typed_iteration and 
                          iteration - self.search_typed_iteration < 8):  # Within last 8 iterations
                        
                        logger.warning(f"⚠️ PREVENTED: Already typed search '{action.text}' at iteration {self.search_typed_iteration}")
                        logger.info("💡 Search already submitted! Look at results on screen instead of re-typing.")
                        
                        # Create a fake success result to prevent executing
                        result = ActionResult(
                            success=True,
                            action=action
                        )
                        url_was_prevented = True  # Reuse this flag for search too
                        time.sleep(1)  # Brief wait
                        
                        # 🔥 IMPORTANT: After preventing duplicate search, mark step as potentially complete
                        # The search results should be visible, agent should click on them
                        logger.info("🎯 Hint to agent: Search results should be visible - click on a result!")
                    
                    else:
                        # 🔥 AUTO-FIX: If about to type a URL, check if redundant navigation first
                        if (action.type == ActionType.TYPE and action.text and 
                            ('.com' in action.text.lower() or '.org' in action.text.lower() or 
                             '.net' in action.text.lower() or 'http' in action.text.lower())):
                            
                            # Extract domain from URL being typed
                            url_to_type = action.text.lower()
                            domain = None
                            for part in url_to_type.replace('http://', '').replace('https://', '').replace('www.', '').split('/'):
                                if part and '.' in part:
                                    domain = part.split('.')[0]  # e.g., 'google' from google.com
                                    break
                            
                            # Check if already on this domain
                            if self.current_url and domain and domain in self.current_url.lower():
                                logger.info(f"⚡ SMART SKIP: Already on {domain}, skipping redundant navigation")
                                result = ActionResult(success=True, action=action)
                                self.last_typed_url = action.text
                                self.url_typed_iteration = iteration
                                # Don't execute - skip to next iteration
                                self.short_memory.add(action, result, context={'iteration': iteration, 'sub_goal': step, 'skipped': True})
                                actions_taken.append(action)
                                continue
                            
                            logger.info("🔥 AUTO-FIX: Detected URL typing, focusing address bar with Ctrl+L first...")
                            focus_action = Action(
                                type=ActionType.HOTKEY,
                                keys=['ctrl', 'l'],
                                reason="Focus address bar before typing URL"
                            )
                            focus_result = self.executor.execute(focus_action, verify=False)
                            if focus_result.success:
                                logger.info("✅ Address bar focused")
                                time.sleep(0.3)  # Brief pause for focus to take effect
                        
                        result = self.executor.execute(action, verify=True)
                
                # 🔥 AUTO-FIX: Automatically press Enter after typing URLs or search queries
                should_auto_enter = False
                wait_time = 3
                
                logger.info(f"🔍 AUTO-FIX CHECK: prevented={url_was_prevented}, success={result.success}, type={action.type}, text='{action.text if action.text else 'None'}'")
                
                if not url_was_prevented and result.success and action.type == ActionType.TYPE and action.text:
                    # Check if it's a URL
                    is_url = any(tld in action.text.lower() for tld in ['.com', '.org', '.net', '.io', 'http'])
                    
                    # Check if it's a search query (contains search keywords in reason or is multi-word)
                    reason_lower = action.reason.lower() if action.reason else ''
                    is_search = any(kw in reason_lower for kw in ['search', 'query', 'look for', 'find'])
                    is_multi_word = len(action.text.split()) >= 2  # Likely a search phrase
                    
                    if is_url:
                        # Track URL to prevent duplicates
                        self.last_typed_url = action.text
                        self.url_typed_iteration = iteration
                        logger.info(f"📌 TRACKED URL: '{self.last_typed_url}' at iteration {self.url_typed_iteration}")
                        should_auto_enter = True
                        wait_time = 5  # URLs need more time to load
                        logger.info("🔥 AUTO-FIX: Detected URL typing, automatically pressing Enter...")
                    elif is_search and is_multi_word:
                        # 🔥 Track search query to prevent repeats
                        self.last_typed_search = action.text
                        self.search_typed_iteration = iteration
                        logger.info(f"📌 TRACKED SEARCH: '{self.last_typed_search}' at iteration {self.search_typed_iteration}")
                        should_auto_enter = True
                        wait_time = 3  # Search results load faster
                        logger.info("🔥 AUTO-FIX: Detected search query, automatically pressing Enter...")
                
                if should_auto_enter:
                    enter_action = Action(
                        type=ActionType.HOTKEY,
                        keys=['enter'],
                        reason="Auto-press Enter after typing"
                    )
                    time.sleep(0.2)  # 🔥 SPEED: Reduced from 0.3s
                    enter_result = self.executor.execute(enter_action, verify=False)
                    if enter_result.success:
                        logger.info("✅ Auto-pressed Enter")
                        self.short_memory.add(enter_action, enter_result, context={'iteration': iteration, 'sub_goal': step, 'auto_fix': True})
                        actions_taken.append(enter_action)
                    # 🔥 SPEED: Reduced wait times - URLs: 2s (was 3s), searches: 1.5s (was 2s)
                    reduced_wait = 2 if wait_time >= 5 else 1.5
                    logger.info(f"⏳ Waiting {reduced_wait}s for page/results to load...")
                    time.sleep(reduced_wait)
                    
                    # Update current_url after navigation
                    if is_url:
                        self.current_url = action.text
                        logger.info(f"📍 Updated current URL: {self.current_url}")
                
                # Visual verification if enabled (SKIP for open_app - it works!)
                if self.enable_verification and result.success and action.type != ActionType.OPEN_APP:
                    verification = self._verify_action(action, step)
                    if not verification.action_succeeded:
                        logger.warning(f"⚠️ Visual verification failed: {verification.visual_evidence}")
                        if verification.suggested_correction:
                            logger.info(f"💡 Suggested correction: {verification.suggested_correction}")
                        # Mark as failed so we retry
                        result = ActionResult(success=False, action=action, error="Visual verification failed")
                        logger.info("🔄 Retrying due to verification failure...")
                
                # Remember it
                self.short_memory.add(action, result, context={'iteration': iteration, 'sub_goal': step})
                actions_taken.append(action)
                
                # 🧬 SELF-EVOLUTION: Record experience for learning
                try:
                    action_start_time = getattr(self, '_action_start_time', time.time())
                    action_duration = time.time() - action_start_time
                    
                    # Determine platform from URL or app
                    platform = 'unknown'
                    if self.current_url:
                        # Extract domain from URL
                        from urllib.parse import urlparse
                        try:
                            parsed = urlparse(self.current_url if '://' in self.current_url else f'https://{self.current_url}')
                            platform = parsed.netloc or self.current_url.split('/')[0]
                        except:
                            platform = self.current_url.split('/')[0] if '/' in self.current_url else self.current_url
                    elif self.primary_app:
                        platform = self.primary_app.lower()
                    
                    # Get UI elements from OODA context (not the short_memory context)
                    ui_elements = ooda_context.get('accessibility_tree', [])
                    
                    # Record experience
                    self.evolution.record_experience(
                        platform=platform,
                        ui_elements=ui_elements,
                        task=step,
                        action={
                            'type': action.type.value if hasattr(action.type, 'value') else str(action.type),
                            'x': action.x,
                            'y': action.y,
                            'text': action.text,
                            'keys': action.keys,
                            'target': action.target,
                            'reason': action.reason
                        },
                        success=result.success,
                        time_elapsed=action_duration,
                        error=result.error or ""
                    )
                    
                    # Every 50 actions, extract patterns
                    if self.evolution.total_actions % 50 == 0:
                        patterns = self.evolution.extract_patterns()
                        if patterns > 0:
                            logger.info(f"🧬 Auto-extracted {patterns} new patterns from experience")
                    
                except Exception as e:
                    logger.debug(f"Evolution recording failed: {e}")
                
                # 🧠 GOD-LEVEL: Extract data after successful actions
                if result.success and action.type in [ActionType.CLICK, ActionType.TYPE, ActionType.HOTKEY]:
                    try:
                        screenshot = self.executor._capture_screen()
                        # Auto-extract data and store in working memory
                        extract_result = self.advanced_vision.analyze_with_vision_api(
                            screenshot=screenshot,
                            task=f"Extract any visible structured data from this screen. Look for: headlines, names, emails, titles, lists, tables. Task context: {step}",
                            context={'mode': 'extraction', 'step': step}
                        )
                        
                        if extract_result:
                            # Store in working memory with proper typing
                            if 'key_items' in extract_result and extract_result['key_items']:
                                items = extract_result['key_items']
                                self.working_memory.extract_data(
                                    source=self.primary_app or 'Chrome',
                                    data_type='structured_list',
                                    data=items,
                                    confidence=extract_result.get('confidence', 0.8)
                                )
                                logger.info(f"🧠 Extracted {len(items)} items into working memory")
                            
                            if 'extracted_text' in extract_result and extract_result['extracted_text']:
                                self.working_memory.extract_data(
                                    source=self.primary_app or 'Chrome',
                                    data_type='text',
                                    data=extract_result['extracted_text'],
                                    confidence=extract_result.get('confidence', 0.8)
                                )
                                logger.info(f"🧠 Extracted text into working memory")
                    except Exception as e:
                        logger.debug(f"Data extraction failed: {e}")
                
                if not result.success:
                    logger.warning(f"Action failed: {result.error}")
                    
                    # Self-reflection on failure
                    if self.enable_reflection and sub_iteration % 3 == 0:
                        self.reflection_count += 1
                        reflection = self._self_reflect(overall_task, step, actions_taken[-5:])
                        
                        if reflection.is_stuck:
                            logger.warning(f"🤔 Agent appears stuck: {reflection.issue_detected}")
                            logger.info(f"💡 Recommendation: {reflection.recommended_action}")
                            
                            if reflection.should_replan:
                                return {
                                    'success': False,
                                    'error': 'Stuck, need to replan',
                                    'iteration': iteration,
                                    'actions_taken': actions_taken
                                }
                
                # FIX #2: Loop detection with forced progress
                if self.short_memory.detect_loop(threshold=3):
                    logger.warning("⚠️ Loop detected - pausing 1.5s to avoid rate limits")
                    time.sleep(1.5)  # Brief pause to respect rate limits
                    recent_actions = list(self.short_memory.memory)[-3:]
                    # Check if looping on open_app
                    if recent_actions and all(
                        (entry.action.get('type') == 'open_app' if isinstance(entry.action, dict) 
                         else entry.action.type == ActionType.OPEN_APP)
                        for entry in recent_actions
                    ):
                        logger.warning("🔄 Loop detected on OPEN_APP - ASSUMING SUCCESS!")
                        logger.info("💡 App is open, marking step complete and moving forward")
                        
                        # Mark this step as completed
                        step_completed = True
                        
                        # Reset loop detection
                        self.short_memory.memory.clear()
                        
                        # Break to move to next tactical step
                        break
                    
                    # 🔥 Check for click loop - but VERIFY page changed before assuming success
                    elif recent_actions and all(
                        (entry.action.get('type') == 'click' if isinstance(entry.action, dict) 
                         else entry.action.type == ActionType.CLICK)
                        for entry in recent_actions
                    ):
                        logger.warning("🔄 Click loop detected - checking if page actually changed...")
                        
                        # Take screenshot and compare to see if something changed
                        try:
                            screenshot = self.executor._capture_screen()
                            # Quick check: ask vision if we're on a new/different page
                            verify_prompt = f"""Quick check: Has something meaningful changed on screen?
Task goal: {overall_task}
Current step: {step}

Look at the screen. Did a click succeed? Signs of success:
- New page loaded
- New content appeared  
- Modal/popup opened
- Different URL visible
- New tab opened

Answer YES if page changed meaningfully, NO if still same state.
Return JSON: {{"changed": true/false, "evidence": "what changed"}}"""
                            
                            change_result = self.advanced_vision.analyze_with_vision_api(
                                screenshot=screenshot,
                                task=verify_prompt,
                                context={'mode': 'change_detection'}
                            )
                            
                            page_changed = change_result and change_result.get('changed', False)
                            
                            if page_changed:
                                logger.info(f"✅ Page changed: {change_result.get('evidence', 'detected')}")
                                logger.info("💡 Click succeeded, marking step complete")
                                
                                # Extract data
                                self._extract_and_store_findings(screenshot, step, overall_task)
                                step_completed = True
                                self.short_memory.memory.clear()
                                break
                            else:
                                logger.warning("⚠️ Page didn't change - trying alternative approach")
                                # 🔥 UNSTUCK STRATEGY: Try different approach
                                if sub_iteration >= 4:
                                    logger.info("💡 Trying Ctrl+Click to open in new tab instead")
                                    # Clear memory and let next iteration try Ctrl+Click
                                    self.short_memory.memory.clear()
                                elif sub_iteration >= 6:
                                    logger.info("💡 Trying scroll down to find better target")
                                    self.short_memory.memory.clear()
                                
                        except Exception as e:
                            logger.warning(f"Change detection failed: {e}")
                        
                        # If we get here, page didn't change - try alternative
                        logger.error("🔄 Click loop but no page change, trying alternative approach")
                        
                        # Try intelligent alternative based on context
                        alt_action = self._explore_alternative(step, overall_task)
                        if alt_action:
                            logger.info(f"🎯 Alternative approach: {alt_action}")
                            result = self.executor.execute(alt_action, verify=False)
                            if result.success:
                                actions_taken.append(alt_action)
                                # Reset loop detection
                                self.short_memory.memory.clear()
                                logger.info("✅ Alternative approach executed, continuing...")
                        else:
                            # Final fallback: wait and observe
                            logger.info("⏸️ No alternative found, waiting 3s for UI to settle...")
                            time.sleep(3)
                    
                    # 🔥 FIX #3: TYPE loop detection - if typing same text 3x, it's already typed!
                    elif recent_actions and all(
                        (entry.action.get('type') == 'type' if isinstance(entry.action, dict) 
                         else entry.action.type == ActionType.TYPE)
                        for entry in recent_actions
                    ):
                        # Check if typing the same text repeatedly
                        typed_texts = []
                        for entry in recent_actions:
                            if isinstance(entry.action, dict):
                                typed_texts.append(entry.action.get('text', ''))
                            else:
                                typed_texts.append(entry.action.text or '')
                        
                        # If same text typed multiple times, it's already there!
                        if len(set(typed_texts)) == 1 and typed_texts[0]:
                            logger.warning(f"🔄 TYPE loop detected - same text '{typed_texts[0][:30]}...' typed {len(typed_texts)}x")
                            logger.info("💡 Text already entered, assuming search/navigation succeeded")
                            
                            # The auto-enter should have already submitted - mark step complete
                            step_completed = True
                            self.short_memory.memory.clear()
                            logger.info("✅ TYPE loop resolved - moving to next step")
                            break
                        else:
                            logger.warning(f"⚠️ TYPE loop but different texts, trying alternative...")
                            alt_action = self._explore_alternative(step, overall_task)
                            if alt_action:
                                result = self.executor.execute(alt_action, verify=False)
                                if result.success:
                                    actions_taken.append(alt_action)
                                    self.short_memory.memory.clear()
            
            # Check if step failed after max iterations
            if not step_completed and sub_iteration >= max_sub_iterations:
                logger.error(f"❌ Step {step_index + 1} timed out after {max_sub_iterations} iterations")
                
                # 🧠 GOD-LEVEL: Mark step as failed in workflow state
                try:
                    self.working_memory.workflow_state.mark_failure(
                        step_name=step,
                        error=f'Timed out after {max_sub_iterations} iterations'
                    )
                    logger.info(f"🧠 Workflow failures: {len(self.working_memory.workflow_state.failed_steps)} steps failed")
                except Exception as e:
                    logger.debug(f"Workflow tracking failed: {e}")
                
                return {
                    'success': False,
                    'error': f'Step {step_index + 1} timed out: {step}',
                    'iteration': iteration,
                    'actions_taken': actions_taken
                }
        
        return {
            'success': True,  # All steps completed successfully
            'error': None,
            'iteration': iteration,
            'actions_taken': actions_taken
        }
    
    def _enhanced_ooda_cycle(self, current_goal: str, overall_task: str) -> Optional[Action]:
        """
        Enhanced OODA loop with better context and reasoning
        
        OBSERVE: Capture screen + memory state + Advanced Vision Analysis
        ORIENT: Analyze with full context (task, goal, history, patterns)
        DECIDE: Choose optimal action with confidence
        ACT: (executed by caller)
        """
        try:
            # OBSERVE - Enhanced with Advanced Vision + Accessibility
            screenshot = self.executor._capture_screen()
            if not screenshot:
                logger.error("Failed to capture screenshot")
                return None
            
            # 🔥 THE CYBORG ENHANCEMENT: Extract UI tree (THE MATRIX)
            ui_tree = []
            if self.accessibility.enabled:
                logger.info("🔌 Extracting accessibility tree (X-Ray Vision)...")
                try:
                    ui_tree = self.accessibility.get_flat_interactive_elements(
                        screenshot_path=screenshot,
                        use_ocr_fallback=True
                    )
                    logger.info(f"   📊 Found {len(ui_tree)} interactive elements via AT-SPI/OCR")
                except Exception as e:
                    logger.warning(f"   ⚠️ Accessibility extraction failed: {e}")
                    ui_tree = []
            
            # Use Advanced Vision Analyzer for rich screen understanding
            logger.info("🔍 Running advanced vision analysis (OCR + UI detection)...")
            screen_analysis = self.advanced_vision.analyze_screen(screenshot)
            
            # Extract valuable information
            detected_text = screen_analysis.text_content if screen_analysis.text_content else ""
            ui_elements = screen_analysis.elements if hasattr(screen_analysis, 'elements') else []
            clickable_elements = self.advanced_vision.find_clickable_elements(screenshot) if hasattr(self.advanced_vision, 'find_clickable_elements') else []
            text_elements = [elem for elem in ui_elements if getattr(elem, 'text', None)]
            
            logger.info(f"   Found {len(detected_text)} chars of text")
            logger.info(f"   Found {len(ui_elements)} UI elements")
            logger.info(f"   Found {len(clickable_elements)} clickable elements")
            
            # Get rich context
            recent_actions = [entry.action for entry in list(self.short_memory.memory)[-10:]] if self.short_memory.memory else []
            similar_workflows = self.long_memory.get_similar_workflow(overall_task)
            
            # 🚫 ANTI-REPETITION: Check last 3 actions
            last_action_str = ""
            if recent_actions and len(recent_actions) >= 1:
                last_action_str = str(recent_actions[-1])
                # Check for repeated actions
                if len(recent_actions) >= 3:
                    last_3 = [str(a) for a in recent_actions[-3:]]
                    if len(set(last_3)) == 1:  # All 3 are identical
                        logger.warning(f"⚠️ LOOP DETECTED: Same action repeated 3 times: {last_action_str}")
                        last_action_str = f"⚠️ STOP REPEATING: {last_action_str} - TRY SOMETHING DIFFERENT!"
            
            context = {
                'overall_task': overall_task,
                'current_goal': current_goal,
                'recent_actions': recent_actions,
                'last_action_warning': last_action_str,
                'similar_workflows': similar_workflows,
                'iteration_count': len(recent_actions),
                'mode': 'enhanced',
                'recommended_apps': self.current_task_apps,
                'preferred_app': self.primary_app,
                # Advanced vision data
                'detected_text': [
                    {'text': elem.text, 'bbox': elem.bbox, 'confidence': elem.confidence}
                    for elem in text_elements[:10]
                ],  # Top 10 text regions
                'ui_elements': [{'type': el.element_type, 'bbox': el.bbox, 'text': el.text} 
                               for el in ui_elements[:10]],  # Top 10 UI elements
                'clickable_count': len(clickable_elements),
                'screen_confidence': screen_analysis.confidence,
                # 🔥 THE MATRIX: Inject accessibility tree
                'accessibility_tree': ui_tree[:50] if ui_tree else [],  # Top 50 interactive elements
                # 🚀 STATE TRACKING: URL navigation state
                'last_typed_url': self.last_typed_url,
                'url_was_typed_recently': bool(self.url_typed_iteration and len(recent_actions) - self.url_typed_iteration < 3),
                # 🔥 STATE TRACKING: Search query state (prevent re-typing)
                'last_typed_search': self.last_typed_search,
                'search_was_typed_recently': bool(self.search_typed_iteration and len(recent_actions) - self.search_typed_iteration < 5),
                # 🧬 SELF-EVOLUTION: Learned experience context
                'evolution_context': self.evolution.get_context_for_prompt(
                    platform=self.current_url or self.primary_app or 'unknown',
                    task=current_goal
                ) if hasattr(self, 'evolution') else ""
            }
            
            # 🧬 Store context for evolution tracking
            self._last_ooda_context = context
            
            # 🚀 FAST PATH: Try to solve without Gemini if simple click task
            if ui_tree and self._is_simple_click_task(current_goal):
                fast_action = self._try_fast_path(current_goal, ui_tree, overall_task)
                if fast_action:
                    logger.info("⚡ FAST PATH SUCCESS - Skipping Gemini call!")
                    return fast_action
            
            # ORIENT + DECIDE (using enhanced vision with OCR + UI detection + AI)
            logger.info("🔍 Using Advanced Vision (OCR + UI + AI)...")
            result = self.advanced_vision.analyze_with_vision_api(
                screenshot=screenshot,
                task=current_goal,
                context=context
            )
            
            # Handle both compact and full JSON keys for backward compatibility
            action_key = 'a' if 'a' in result else 'action'
            if not result or action_key not in result:
                logger.error("No action in vision response")
                return None
            
            # Parse action with compact key support
            action_data = result[action_key]
            type_key = 't' if 't' in action_data else 'type'
            action_type_str = action_data.get(type_key, '').upper()
            
            try:
                action_type = ActionType[action_type_str]
            except (KeyError, ValueError):
                logger.error(f"Invalid action type: {action_type_str}")
                return None
            
            # Log reasoning with compact key support
            observation = result.get('o', result.get('observation', result.get('thinking', '')))
            understanding = result.get('u', result.get('understanding', ''))
            prediction = result.get('p', result.get('prediction', ''))
            next_step = result.get('next_step', '')
            confidence = result.get('c', result.get('confidence', 0.5))
            logger.info(f"💭 Observation: {observation}")
            if understanding:
                logger.info(f"🧠 Understanding: {understanding}")
            if prediction:
                logger.info(f"🔮 Prediction: {prediction}")
            if next_step:
                logger.info(f"📋 Next step: {next_step}")
            logger.info(f"🎯 Confidence: {confidence:.2f}")
            
            # Store confidence for smart call skipping
            self._last_action_confidence = confidence
            
            # Normalize compact keys to full keys for Action object
            key_mapping = {'t': 'type', 'r': 'reason', 'amt': 'amount'}
            normalized_data = {}
            for k, v in action_data.items():
                # Skip 't' and 'type' since we already extracted action_type
                if k in ['t', 'type']:
                    continue
                # Map compact keys to full keys
                if k in key_mapping:
                    normalized_data[key_mapping[k]] = v
                else:
                    normalized_data[k] = v
            
            # Create action object
            action = Action(
                type=action_type,
                **normalized_data
            )
            
            return action
            
        except Exception as e:
            logger.error(f"OODA cycle error: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return None
    
    def _self_reflect(
        self,
        task: str,
        current_goal: str,
        recent_actions: List[Action]
    ) -> ReflectionResult:
        """
        Self-reflection: Analyze if agent is stuck or making progress
        
        This is a key advantage over Claude Computer Use / OpenAI Operator
        """
        try:
            screenshot = self.executor._capture_screen()
            
            action_summary = "\n".join([
                f"  {i+1}. {a.type.value}: {getattr(a, 'reason', 'no reason')}"
                for i, a in enumerate(recent_actions[-10:])
            ])
            
            prompt = f"""Analyze if the agent is making progress or stuck.

TASK: {task}
CURRENT GOAL: {current_goal}

RECENT ACTIONS:
{action_summary}

Questions to consider:
1. Are actions repetitive?
2. Is progress being made toward goal?
3. Are we stuck in a loop?
4. Should we try a different approach?

RESPOND WITH JSON:
{{
    "is_stuck": false,
    "issue_detected": "Description of any issue or 'Making progress'",
    "recommended_action": "What to do next",
    "confidence": 0.8,
    "should_replan": false
}}"""
            
            result = self.advanced_vision.analyze_with_vision_api(
                screenshot=screenshot,
                task=prompt,
                context={'mode': 'reflection'}
            )
            
            if result:
                return ReflectionResult(
                    is_stuck=result.get('is_stuck', False),
                    issue_detected=result.get('issue_detected', 'Unknown'),
                    recommended_action=result.get('recommended_action', 'Continue'),
                    confidence=result.get('confidence', 0.5),
                    should_replan=result.get('should_replan', False)
                )
                
        except Exception as e:
            logger.error(f"Reflection failed: {e}")
        
        # Fallback: simple loop detection
        if len(recent_actions) >= 5:
            last_5_types = [a.type for a in recent_actions[-5:]]
            if len(set(last_5_types)) == 1:
                return ReflectionResult(
                    is_stuck=True,
                    issue_detected="Repeating same action type",
                    recommended_action="Try different approach",
                    confidence=0.9,
                    should_replan=True
                )
        
        return ReflectionResult(
            is_stuck=False,
            issue_detected="Making progress",
            recommended_action="Continue",
            confidence=0.7,
            should_replan=False
        )
    
    def _verify_action(self, action: Action, goal: str) -> VerificationResult:
        """
        Visual verification: Did the action actually succeed?
        
        Key advantage: Don't just trust executor, verify visually with Advanced Vision
        """
        try:
            # Wait for UI to update
            time.sleep(0.3)
            
            recent_entries = list(self.short_memory.memory)[-1:] if self.short_memory.memory else []
            screenshot_before = recent_entries[0].action.get('screenshot') if recent_entries else None
            screenshot_after = self.executor._capture_screen()
            
            # Use Advanced Vision to detect changes
            if screenshot_before:
                logger.info("🔍 Detecting screen changes after action...")
                changes = self.advanced_vision.detect_changes(
                    screenshot_before,
                    screenshot_after
                )
                logger.info(f"   Detected {len(changes)} visual changes")
            
            # Also get text and UI elements for verification
            screen_analysis = self.advanced_vision.analyze_screen(screenshot_after)
            
            prompt = f"""Verify if this action succeeded by analyzing the screen.

GOAL: {goal}
ACTION TAKEN: {action.type.value} - {getattr(action, 'reason', 'no reason')}

VISUAL CHANGES DETECTED: {len(changes) if screenshot_before else 'N/A'}
TEXT ON SCREEN: {screen_analysis.text_content[:200] if screen_analysis.text_content else 'No text detected'}
UI ELEMENTS: {[el.element_type for el in screen_analysis.elements[:5]]}

Look at the screen and determine:
1. Did the action have the intended visual effect?
2. Are there any error messages?
3. Did the UI change as expected?

RESPOND WITH JSON:
{{
    "action_succeeded": true,
    "visual_evidence": "What you see that confirms success or failure",
    "confidence": 0.9,
    "suggested_correction": "What to do if it failed (or null if succeeded)"
}}"""
            
            result = self.advanced_vision.analyze_with_vision_api(
                screenshot=screenshot_after,
                task=prompt,
                context={'mode': 'verification'}
            )
            
            if result:
                return VerificationResult(
                    action_succeeded=result.get('action_succeeded', True),
                    visual_evidence=result.get('visual_evidence', 'No evidence'),
                    confidence=result.get('confidence', 0.5),
                    suggested_correction=result.get('suggested_correction')
                )
                
        except Exception as e:
            logger.error(f"Verification failed: {e}")
        
        # Fallback: assume success
        return VerificationResult(
            action_succeeded=True,
            visual_evidence="Verification unavailable",
            confidence=0.3
        )
    
    def _explore_alternative(self, goal: str, overall_task: str = "") -> Optional[Action]:
        """Try intelligent alternative approach when stuck"""
        logger.info("🔍 Exploring alternative approach...")
        
        # Check recent actions to understand context
        recent_actions = list(self.short_memory.memory)[-5:] if self.short_memory.memory else []
        recent_types = [e.action.get('type') for e in recent_actions]
        
        # Strategy 0: Gmail Send button - if typed message but stuck, use Ctrl+Enter
        if 'gmail' in overall_task.lower() or 'email' in overall_task.lower():
            # Check if we just typed something
            has_typed = any(t == 'type' for t in recent_types[-3:])
            if has_typed and ('send' in goal.lower() or 'reply' in goal.lower()):
                logger.info("💡 Strategy: Use Ctrl+Enter to send email (keyboard shortcut)")
                return Action(
                    type=ActionType.HOTKEY,
                    keys=['ctrl', 'enter'],
                    reason="Send email using keyboard shortcut (faster than finding button)"
                )
        
        # Strategy 1: Try scrolling (element might be below fold)
        if 'click' in goal.lower() or 'button' in goal.lower() or 'find' in goal.lower():
            logger.info("💡 Strategy: Scroll down to find element")
            return Action(
                type=ActionType.SCROLL,
                amount=3,
                reason="Scroll to find element that wasn't visible"
            )
        
        # Strategy 2: Try keyboard navigation (Tab to cycle through elements)
        if 'apply' in goal.lower() or 'submit' in goal.lower() or 'button' in goal.lower():
            logger.info("💡 Strategy: Use Tab key to navigate to button")
            return Action(
                type=ActionType.HOTKEY,
                keys=['tab'],
                reason="Use keyboard navigation to find button"
            )
        
        # Strategy 3: Try Ctrl+F to search for text
        if 'find' in goal.lower() or 'search' in goal.lower():
            logger.info("💡 Strategy: Use Ctrl+F to search page")
            return Action(
                type=ActionType.HOTKEY,
                keys=['ctrl', 'f'],
                reason="Open find dialog to search for element"
            )
        
        # Strategy 4: Just wait for UI to settle
        logger.info("💡 Strategy: Wait for UI state to change")
        return Action(
            type=ActionType.WAIT,
            amount=3,
            reason="Wait for page to fully load or UI to settle"
        )
        
        return None
    
    def _failure_result(
        self,
        task: str,
        start_time: float,
        actions_taken: List[Action],
        error: str
    ) -> Dict[str, Any]:
        """Create failure result with diagnostics"""
        duration = time.time() - start_time
        
        logger.error(f"❌ Task failed: {error}")
        logger.error(f"   Duration: {duration:.1f}s")
        logger.error(f"   Actions taken: {len(actions_taken)}")
        
        # Cleanup even on failure
        self._cleanup_after_task()
        
        # Return dict with any partial extracted data
        return {
            'success': False,
            'task': task,
            'actions_taken': len(actions_taken),
            'duration': duration,
            'error': error,
            'extracted_data': self.extracted_data.copy() if self.extracted_data else {},
            'results': self.task_results.copy() if self.task_results else []
        }
    
    def get_stats(self) -> Dict[str, Any]:
        """Get performance statistics"""
        vision_stats = {
            'total_calls': self.vision.total_calls,
            'avg_response_time': self.vision.avg_response_time,
            'success_rate': self.vision.success_count / max(self.vision.total_calls, 1)
        }
        
        return {
            'vision': vision_stats,
            'memory': {
                'short_term_size': len(self.short_memory.actions),
                'workflows_learned': len(self.long_memory.workflows)
            },
            'advanced_features': {
                'reflections_performed': self.reflection_count,
                'replans_triggered': self.replan_count,
                'parallel_executions': self.parallel_executions
            }
        }
    
    def execute_workflow(self, workflow_steps: List[WorkflowStep]) -> Dict[str, Any]:
        """
        Execute multi-app workflow using WorkflowEngine
        
        Example:
            steps = [
                WorkflowStep(type=StepType.TASK, task="Open Gmail"),
                WorkflowStep(type=StepType.EXTRACT, extract="email_subject", save_as="subject"),
                WorkflowStep(type=StepType.TASK, task="Open Notion"),
                WorkflowStep(type=StepType.TASK, task="Create note with subject: {subject}"),
            ]
            result = agent.execute_workflow(steps)
        """
        logger.info(f"🔄 Executing workflow with {len(workflow_steps)} steps")
        result = self.workflow_engine.execute(workflow_steps)
        
        return {
            'success': result.success,
            'steps_completed': result.steps_completed,
            'total_steps': result.total_steps,
            'duration': result.duration,
            'extracted_data': result.extracted_data,
            'error': result.error
        }
    
    def _is_simple_click_task(self, goal: str) -> bool:
        """Check if goal is a simple click task we can solve without LLM."""
        goal_lower = goal.lower()
        
        # Patterns that indicate simple click/type tasks
        simple_patterns = [
            'click', 'press', 'select', 'tap', 'hit',
            'type', 'enter', 'input', 'write',
            'open', 'close', 'scroll'
        ]
        
        # But NOT if it's complex reasoning
        complex_patterns = [
            'analyze', 'understand', 'decide', 'choose between',
            'evaluate', 'assess', 'compare', 'find best'
        ]
        
        has_simple = any(pattern in goal_lower for pattern in simple_patterns)
        has_complex = any(pattern in goal_lower for pattern in complex_patterns)
        
        return has_simple and not has_complex
    
    def _try_fast_path(self, goal: str, ui_tree: List[Dict], overall_task: str) -> Optional[Action]:
        """
        Try to solve task using only the UI tree, without calling Gemini.
        This is 100x faster when it works.
        """
        goal_lower = goal.lower()
        
        # Extract target text from goal
        # e.g., "Click the Apply button" → search for "apply"
        # e.g., "Type 'hello' in search box" → search for "search"
        
        import re
        
        # Pattern 1: "click the X button" or "click on X" or "click X"
        # Improved regex to handle "click on the first X" patterns
        click_patterns = [
            r'click\s+(?:on\s+)?(?:the\s+)?first\s+(.+?)(?:\s+link|\s+button|\s+title)?$',  # "click on the first article"
            r'click\s+(?:on\s+)?(?:the\s+)?(.+?)(?:\s+button|\s+link)?$',  # "click the Apply button"
        ]
        
        for pattern in click_patterns:
            click_match = re.search(pattern, goal_lower, re.IGNORECASE)
            if click_match:
                target_text = click_match.group(1).strip()
                
                # Clean up common words that aren't helpful for matching
                skip_words = ['first', 'second', 'third', 'a', 'an', 'the', 'item', 'result', 'one']
                target_words = [w for w in target_text.split() if w not in skip_words]
                
                if not target_words:
                    continue  # Can't match with empty target
                    
                target_text = ' '.join(target_words)
                logger.info(f"⚡ Fast path: Looking for clickable element with text '{target_text}'")
                
                # Search UI tree for matching element
                element = self.accessibility.find_element_by_text(target_text)
                
                if element:
                    logger.info(f"⚡ Found element: {element['text']} at {element['center']}")
                    return Action(
                        type=ActionType.CLICK,
                        x=element['center'][0],
                        y=element['center'][1],
                        target=element['text'],
                        reason=f"Fast path: Found '{target_text}' in UI tree"
                    )
                break  # Don't try other patterns if this one matched
        
        # Pattern 2: "open X app"
        app_match = re.search(r'open\s+(\w+)', goal_lower, re.IGNORECASE)
        if app_match:
            app_name = app_match.group(1).strip()
            logger.info(f"⚡ Fast path: Opening app '{app_name}'")
            return Action(
                type=ActionType.OPEN_APP,
                app=app_name.lower(),
                reason=f"Fast path: Open {app_name}"
            )
        
        # Pattern 3: Simple navigation (press key, scroll)
        if 'scroll down' in goal_lower:
            return Action(
                type=ActionType.SCROLL,
                amount=3,
                reason="Fast path: Scroll down"
            )
        
        if 'press enter' in goal_lower or 'hit enter' in goal_lower:
            return Action(
                type=ActionType.HOTKEY,
                keys=['enter'],
                reason="Fast path: Press Enter"
            )
        
        # No fast path found
        return None

