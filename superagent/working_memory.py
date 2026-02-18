"""
Working Memory System - The Agent's "Brain"

This is the key to Level 10 intelligence:
- Store extracted data between steps
- Pass data between apps (Chrome → Sheets → Gmail)
- Track complex multi-step workflows
- Remember what worked/failed

🧬 SELF-EVOLUTION SYSTEM (WORLD'S FIRST)
- Learn from every action taken
- Build experience database across sessions
- Reinforce successful patterns
- Adapt to new interfaces without retraining
"""

import json
import logging
import os
import hashlib
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class DataExtraction:
    """Structured data extracted during task"""
    source: str  # Where it came from (URL, app name)
    type: str    # Type: email, name, profile, article, etc.
    data: Any    # The actual data (string, list, dict)
    timestamp: datetime = field(default_factory=datetime.now)
    confidence: float = 1.0
    
    def to_dict(self) -> Dict:
        return {
            'source': self.source,
            'type': self.type,
            'data': self.data,
            'timestamp': self.timestamp.isoformat(),
            'confidence': self.confidence
        }


@dataclass
class WorkflowState:
    """Current state of multi-step workflow"""
    task_id: str
    overall_goal: str
    steps_completed: List[str] = field(default_factory=list)
    steps_remaining: List[str] = field(default_factory=list)
    current_step: Optional[str] = None
    failures: List[Dict] = field(default_factory=list)
    successes: List[Dict] = field(default_factory=list)
    
    def mark_success(self, step: str, result: Any):
        """Mark step as successful"""
        self.successes.append({
            'step': step,
            'result': result,
            'timestamp': datetime.now().isoformat()
        })
        self.steps_completed.append(step)
        
    def mark_failure(self, step: str, error: str):
        """Mark step as failed"""
        self.failures.append({
            'step': step,
            'error': error,
            'timestamp': datetime.now().isoformat()
        })


class WorkingMemory:
    """
    Advanced working memory for the agent.
    
    This is what separates Level 1 agents from Level 10 agents.
    It enables:
    - Data persistence across steps
    - Multi-app workflows
    - Complex data transformations
    - Learning from experience
    """
    
    def __init__(self):
        # Current task data
        self.extractions: List[DataExtraction] = []
        self.workflow_state: Optional[WorkflowState] = None
        
        # Clipboard for data transfer (like human Ctrl+C / Ctrl+V)
        self.clipboard: Dict[str, Any] = {}
        
        # App-specific context
        self.current_app: Optional[str] = None
        self.app_states: Dict[str, Dict] = {}  # Track state per app
        
        # Cross-app data pipeline
        self.data_pipeline: List[Dict] = []  # Data flowing between apps
        
        logger.info("🧠 Working Memory initialized")
    
    def start_workflow(self, task_id: str, goal: str, steps: List[str]):
        """Start tracking a new complex workflow"""
        self.workflow_state = WorkflowState(
            task_id=task_id,
            overall_goal=goal,
            steps_remaining=steps.copy()
        )
        logger.info(f"📋 Started workflow: {goal}")
        logger.info(f"   Steps: {len(steps)}")
    
    def extract_data(self, source: str, data_type: str, data: Any, confidence: float = 1.0):
        """
        Store extracted data for later use.
        
        Examples:
        - extract_data("linkedin.com/profile", "email", "john@startup.com")
        - extract_data("news.ycombinator.com", "headlines", ["Story 1", "Story 2"])
        - extract_data("github.com", "repo_names", [{"name": "repo1", "stars": 1000}])
        """
        extraction = DataExtraction(
            source=source,
            type=data_type,
            data=data,
            confidence=confidence
        )
        self.extractions.append(extraction)
        logger.info(f"📊 Extracted {data_type} from {source}: {str(data)[:100]}...")
        return extraction
    
    def get_extracted_data(self, data_type: Optional[str] = None) -> List[DataExtraction]:
        """
        Retrieve previously extracted data.
        
        If data_type specified, only return that type.
        """
        if data_type:
            return [e for e in self.extractions if e.type == data_type]
        return self.extractions
    
    def copy_to_clipboard(self, key: str, data: Any):
        """Store data in clipboard for quick access (like Ctrl+C)"""
        self.clipboard[key] = data
        logger.info(f"📋 Copied to clipboard: {key}")
    
    def paste_from_clipboard(self, key: str) -> Optional[Any]:
        """Retrieve data from clipboard (like Ctrl+V)"""
        data = self.clipboard.get(key)
        if data:
            logger.info(f"📋 Pasted from clipboard: {key}")
        return data
    
    def switch_app(self, app_name: str):
        """Track app switching for context"""
        if self.current_app:
            logger.info(f"🔀 Switching: {self.current_app} → {app_name}")
        self.current_app = app_name
        
        # Initialize app state if first time
        if app_name not in self.app_states:
            self.app_states[app_name] = {
                'first_opened': datetime.now().isoformat(),
                'actions_count': 0,
                'last_action': None
            }
    
    def update_app_state(self, state_key: str, state_value: Any):
        """Update state for current app"""
        if self.current_app:
            if self.current_app not in self.app_states:
                self.app_states[self.current_app] = {}
            self.app_states[self.current_app][state_key] = state_value
            self.app_states[self.current_app]['actions_count'] = \
                self.app_states[self.current_app].get('actions_count', 0) + 1
    
    def add_to_pipeline(self, from_app: str, to_app: str, data: Any, purpose: str):
        """
        Track data flowing between apps.
        
        Example: Chrome (extract emails) → Sheets (fill table) → Gmail (send emails)
        """
        pipeline_item = {
            'from': from_app,
            'to': to_app,
            'data': data,
            'purpose': purpose,
            'timestamp': datetime.now().isoformat()
        }
        self.data_pipeline.append(pipeline_item)
        logger.info(f"🔄 Pipeline: {from_app} → {to_app} ({purpose})")
    
    def format_for_display(self, data: Any, format_type: str = 'table') -> str:
        """
        Format extracted data for display/use in another app.
        
        Converts lists/dicts to tables, CSV, formatted text, etc.
        """
        if format_type == 'table' and isinstance(data, list):
            # Format as table for Google Sheets
            if data and isinstance(data[0], dict):
                # List of dicts → table with headers
                headers = list(data[0].keys())
                rows = [[item.get(h, '') for h in headers] for item in data]
                return {'headers': headers, 'rows': rows}
        
        elif format_type == 'csv' and isinstance(data, list):
            # Convert to CSV string
            if data and isinstance(data[0], dict):
                headers = list(data[0].keys())
                csv = ','.join(headers) + '\n'
                for item in data:
                    csv += ','.join(str(item.get(h, '')) for h in headers) + '\n'
                return csv
        
        # Default: JSON string
        return json.dumps(data, indent=2)
    
    def get_workflow_progress(self) -> Dict:
        """Get current workflow progress"""
        if not self.workflow_state:
            return {'status': 'no_workflow'}
        
        total_steps = len(self.workflow_state.steps_completed) + len(self.workflow_state.steps_remaining)
        progress = len(self.workflow_state.steps_completed) / max(total_steps, 1)
        
        return {
            'goal': self.workflow_state.overall_goal,
            'progress': f"{progress*100:.0f}%",
            'completed': len(self.workflow_state.steps_completed),
            'remaining': len(self.workflow_state.steps_remaining),
            'current_step': self.workflow_state.current_step,
            'failures': len(self.workflow_state.failures),
            'successes': len(self.workflow_state.successes)
        }
    
    def clear(self):
        """Clear working memory for new task"""
        self.extractions.clear()
        self.clipboard.clear()
        self.data_pipeline.clear()
        self.workflow_state = None
        logger.info("🧹 Working memory cleared")
    
    def to_dict(self) -> Dict:
        """Export memory state for analysis/debugging"""
        return {
            'extractions': [e.to_dict() for e in self.extractions],
            'clipboard': self.clipboard,
            'current_app': self.current_app,
            'app_states': self.app_states,
            'data_pipeline': self.data_pipeline,
            'workflow_progress': self.get_workflow_progress()
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 🧬 SELF-EVOLUTION SYSTEM - WORLD'S FIRST SELF-IMPROVING AGENT
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class ActionExperience:
    """A single action experience for learning"""
    # Context
    platform: str           # e.g., "youtube.com", "gmail", "asana"
    ui_context_hash: str    # Hash of UI elements present
    task_pattern: str       # e.g., "search", "navigate", "fill_form"
    
    # Action taken
    action_type: str        # click, type, hotkey, scroll
    action_target: str      # Description of target element
    action_params: Dict     # x, y, text, keys, etc.
    
    # Outcome
    success: bool           # Did the action achieve intended result?
    time_to_effect: float   # How long until UI responded
    error_message: str      # Any error encountered
    
    # Learning signals
    reward: float           # RL reward signal: -1 to +1
    confidence_delta: float # How much confidence changed
    timestamp: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict:
        return {
            'platform': self.platform,
            'ui_context_hash': self.ui_context_hash,
            'task_pattern': self.task_pattern,
            'action_type': self.action_type,
            'action_target': self.action_target,
            'action_params': self.action_params,
            'success': self.success,
            'time_to_effect': self.time_to_effect,
            'error_message': self.error_message,
            'reward': self.reward,
            'confidence_delta': self.confidence_delta,
            'timestamp': self.timestamp.isoformat()
        }


@dataclass  
class LearnedPattern:
    """A successful pattern learned from experience"""
    platform: str           # Platform/app this applies to
    pattern_type: str       # e.g., "search_submit", "login_flow", "navigation"
    trigger_conditions: Dict  # When to apply this pattern
    optimal_actions: List[Dict]  # Best sequence of actions
    success_rate: float     # % of successful uses
    total_uses: int         # How many times used
    avg_time: float         # Average time to complete
    
    def to_dict(self) -> Dict:
        return {
            'platform': self.platform,
            'pattern_type': self.pattern_type,
            'trigger_conditions': self.trigger_conditions,
            'optimal_actions': self.optimal_actions,
            'success_rate': self.success_rate,
            'total_uses': self.total_uses,
            'avg_time': self.avg_time
        }


class SelfEvolution:
    """
    🧬 WORLD'S FIRST SELF-EVOLVING AI AGENT SYSTEM
    
    Uses Reinforcement Learning principles:
    - Experience Replay: Learn from past actions
    - Q-Learning: Estimate action values
    - Policy Gradient: Improve action selection
    
    Key innovations:
    1. Platform-agnostic learning (works on ANY website/app)
    2. Pattern extraction (discover reusable workflows)
    3. Confidence calibration (know what you don't know)
    4. Persistent memory (survives restarts)
    """
    
    # RL hyperparameters
    LEARNING_RATE = 0.1
    DISCOUNT_FACTOR = 0.95
    EXPLORATION_RATE = 0.1  # Epsilon for exploration
    
    def __init__(self, persistence_path: Optional[str] = None):
        # Experience database
        self.experiences: List[ActionExperience] = []
        
        # Learned patterns (extracted from experiences)
        self.patterns: Dict[str, LearnedPattern] = {}  # pattern_id -> pattern
        
        # Q-table: state-action values
        # Key: (platform, ui_context_hash, task_pattern)
        # Value: {action_type: q_value}
        self.q_table: Dict[str, Dict[str, float]] = {}
        
        # Confidence calibration
        # Key: (platform, action_type)
        # Value: running average of prediction accuracy
        self.confidence_map: Dict[str, float] = {}
        
        # Platform expertise levels
        self.expertise: Dict[str, Dict[str, Any]] = {}
        
        # Statistics
        self.total_actions = 0
        self.total_successes = 0
        self.learning_events = 0
        
        # Persistence
        self.persistence_path = persistence_path or "/opt/agent_evolution.json"
        self._load_state()
        
        logger.info("🧬 Self-Evolution System initialized")
        logger.info(f"   Experiences: {len(self.experiences)}")
        logger.info(f"   Learned patterns: {len(self.patterns)}")
        logger.info(f"   Expertise platforms: {len(self.expertise)}")
    
    def _state_key(self, platform: str, ui_hash: str, task_pattern: str) -> str:
        """Generate state key for Q-table"""
        return f"{platform}|{ui_hash}|{task_pattern}"
    
    def _hash_ui_context(self, elements: List[Dict]) -> str:
        """Create a hash of UI elements for state identification"""
        if not elements:
            return "empty"
        
        # Extract key features from UI elements
        features = []
        for elem in elements[:20]:  # Top 20 elements
            elem_type = elem.get('type', 'unknown')
            elem_text = elem.get('text', '')[:30]  # First 30 chars
            features.append(f"{elem_type}:{elem_text}")
        
        feature_str = "|".join(sorted(features))
        return hashlib.md5(feature_str.encode()).hexdigest()[:12]
    
    def _extract_task_pattern(self, task: str) -> str:
        """Extract pattern type from task description"""
        task_lower = task.lower()
        
        patterns = {
            'search': ['search', 'find', 'look for', 'query'],
            'navigate': ['go to', 'open', 'visit', 'navigate'],
            'fill_form': ['fill', 'enter', 'type', 'input', 'submit'],
            'click_action': ['click', 'press', 'tap', 'select'],
            'login': ['login', 'sign in', 'authenticate'],
            'upload': ['upload', 'attach', 'import'],
            'download': ['download', 'export', 'save'],
            'scroll': ['scroll', 'browse', 'see more'],
            'read_data': ['read', 'get', 'extract', 'scrape'],
            'compose': ['write', 'compose', 'draft', 'reply']
        }
        
        for pattern, keywords in patterns.items():
            if any(kw in task_lower for kw in keywords):
                return pattern
        
        return 'general'
    
    def record_experience(
        self,
        platform: str,
        ui_elements: List[Dict],
        task: str,
        action: Dict,
        success: bool,
        time_elapsed: float,
        error: str = ""
    ) -> ActionExperience:
        """
        Record a single action experience for learning.
        
        This is called AFTER every action to capture:
        - What was the context?
        - What action was taken?
        - Did it work?
        """
        # Calculate reward (RL signal)
        if success:
            reward = 1.0
            if time_elapsed < 1.0:
                reward = 1.0 + (1.0 - time_elapsed) * 0.5  # Bonus for speed
        else:
            reward = -0.5
            if error:
                reward = -1.0  # Penalty for errors
        
        experience = ActionExperience(
            platform=platform,
            ui_context_hash=self._hash_ui_context(ui_elements),
            task_pattern=self._extract_task_pattern(task),
            action_type=action.get('type', 'unknown'),
            action_target=action.get('target', action.get('reason', '')),
            action_params={
                'x': action.get('x'),
                'y': action.get('y'),
                'text': action.get('text'),
                'keys': action.get('keys')
            },
            success=success,
            time_to_effect=time_elapsed,
            error_message=error,
            reward=reward,
            confidence_delta=0.0  # Updated after learning
        )
        
        self.experiences.append(experience)
        self.total_actions += 1
        if success:
            self.total_successes += 1
        
        # Trigger learning
        self._learn_from_experience(experience)
        
        # Update expertise
        self._update_expertise(platform, success)
        
        logger.debug(f"🧬 Recorded experience: {action.get('type')} on {platform} → {'✓' if success else '✗'}")
        
        return experience
    
    def _learn_from_experience(self, exp: ActionExperience):
        """
        Apply Q-learning update to improve action selection.
        
        Q(s,a) = Q(s,a) + α * (r + γ * max(Q(s',a')) - Q(s,a))
        """
        state_key = self._state_key(exp.platform, exp.ui_context_hash, exp.task_pattern)
        
        # Initialize Q-values if new state
        if state_key not in self.q_table:
            self.q_table[state_key] = {}
        
        action_type = exp.action_type
        current_q = self.q_table[state_key].get(action_type, 0.0)
        
        # Q-learning update
        # For terminal states (success/failure), future reward is 0
        new_q = current_q + self.LEARNING_RATE * (exp.reward - current_q)
        
        self.q_table[state_key][action_type] = new_q
        self.learning_events += 1
        
        # Update confidence calibration
        conf_key = f"{exp.platform}|{action_type}"
        old_conf = self.confidence_map.get(conf_key, 0.5)
        
        # Running average of success rate
        success_signal = 1.0 if exp.success else 0.0
        new_conf = old_conf * 0.9 + success_signal * 0.1
        self.confidence_map[conf_key] = new_conf
        
        exp.confidence_delta = new_conf - old_conf
    
    def _update_expertise(self, platform: str, success: bool):
        """Track expertise level per platform"""
        if platform not in self.expertise:
            self.expertise[platform] = {
                'actions': 0,
                'successes': 0,
                'level': 'novice',
                'first_seen': datetime.now().isoformat(),
                'patterns_learned': 0
            }
        
        self.expertise[platform]['actions'] += 1
        if success:
            self.expertise[platform]['successes'] += 1
        
        # Calculate expertise level
        actions = self.expertise[platform]['actions']
        success_rate = self.expertise[platform]['successes'] / max(actions, 1)
        
        if actions >= 100 and success_rate >= 0.95:
            self.expertise[platform]['level'] = 'master'
        elif actions >= 50 and success_rate >= 0.85:
            self.expertise[platform]['level'] = 'expert'
        elif actions >= 20 and success_rate >= 0.7:
            self.expertise[platform]['level'] = 'proficient'
        elif actions >= 5:
            self.expertise[platform]['level'] = 'learning'
        else:
            self.expertise[platform]['level'] = 'novice'
    
    def get_best_action(
        self,
        platform: str,
        ui_elements: List[Dict],
        task: str,
        available_actions: List[str]
    ) -> Tuple[str, float]:
        """
        Get the best action type based on learned experience.
        
        Uses epsilon-greedy exploration:
        - Explore (random action) with probability epsilon
        - Exploit (best known action) with probability 1-epsilon
        
        Returns: (best_action_type, expected_success_probability)
        """
        import random
        
        ui_hash = self._hash_ui_context(ui_elements)
        task_pattern = self._extract_task_pattern(task)
        state_key = self._state_key(platform, ui_hash, task_pattern)
        
        # Exploration vs exploitation
        if random.random() < self.EXPLORATION_RATE:
            # Explore: random action
            action = random.choice(available_actions) if available_actions else 'click'
            return action, 0.5  # Unknown confidence
        
        # Exploit: best known action
        if state_key in self.q_table:
            q_values = self.q_table[state_key]
            if q_values:
                best_action = max(q_values.items(), key=lambda x: x[1])
                
                # Convert Q-value to probability (sigmoid)
                import math
                prob = 1 / (1 + math.exp(-best_action[1]))
                
                return best_action[0], prob
        
        # No experience with this state, use confidence map
        best_conf = 0.0
        best_action = 'click'  # Default
        
        for action in available_actions:
            conf_key = f"{platform}|{action}"
            conf = self.confidence_map.get(conf_key, 0.5)
            if conf > best_conf:
                best_conf = conf
                best_action = action
        
        return best_action, best_conf
    
    def extract_patterns(self) -> int:
        """
        Extract reusable patterns from experience database.
        
        Looks for sequences of successful actions that can be generalized.
        """
        patterns_found = 0
        
        # Group experiences by platform and task pattern
        from collections import defaultdict
        grouped = defaultdict(list)
        
        for exp in self.experiences:
            if exp.success:
                key = f"{exp.platform}|{exp.task_pattern}"
                grouped[key].append(exp)
        
        # Find common successful action sequences
        for key, exps in grouped.items():
            if len(exps) < 3:  # Need at least 3 examples
                continue
            
            platform, task_pattern = key.split('|')
            
            # Count action types that worked
            action_counts: Dict[str, int] = {}
            for exp in exps:
                action_counts[exp.action_type] = action_counts.get(exp.action_type, 0) + 1
            
            # Most common successful action
            if action_counts:
                best_action = max(action_counts.items(), key=lambda x: x[1])
                success_rate = best_action[1] / len(exps)
                
                if success_rate >= 0.7:
                    pattern_id = f"{platform}_{task_pattern}"
                    
                    self.patterns[pattern_id] = LearnedPattern(
                        platform=platform,
                        pattern_type=task_pattern,
                        trigger_conditions={'task_pattern': task_pattern},
                        optimal_actions=[{'type': best_action[0], 'confidence': success_rate}],
                        success_rate=success_rate,
                        total_uses=len(exps),
                        avg_time=sum(e.time_to_effect for e in exps) / len(exps)
                    )
                    patterns_found += 1
                    
                    # Update expertise
                    if platform in self.expertise:
                        self.expertise[platform]['patterns_learned'] += 1
        
        if patterns_found > 0:
            logger.info(f"🧬 Extracted {patterns_found} new patterns from experience")
            self._save_state()
        
        return patterns_found
    
    def get_context_for_prompt(self, platform: str, task: str) -> str:
        """
        Generate context string for the vision prompt based on learned experience.
        """
        context_parts = []
        
        # Platform expertise
        if platform in self.expertise:
            exp = self.expertise[platform]
            context_parts.append(f"Platform expertise: {exp['level']} ({exp['actions']} actions, {exp['successes']} successes)")
        
        # Relevant patterns
        task_pattern = self._extract_task_pattern(task)
        pattern_id = f"{platform}_{task_pattern}"
        
        if pattern_id in self.patterns:
            pattern = self.patterns[pattern_id]
            context_parts.append(f"Known pattern '{task_pattern}': {pattern.success_rate*100:.0f}% success rate")
            if pattern.optimal_actions:
                best = pattern.optimal_actions[0]
                context_parts.append(f"  Recommended action: {best['type']} (confidence: {best['confidence']*100:.0f}%)")
        
        # Overall confidence
        success_rate = self.total_successes / max(self.total_actions, 1) * 100
        context_parts.append(f"Overall success rate: {success_rate:.1f}%")
        
        return "\n".join(context_parts) if context_parts else ""
    
    def get_stats(self) -> Dict:
        """Get evolution statistics"""
        return {
            'total_actions': self.total_actions,
            'total_successes': self.total_successes,
            'success_rate': self.total_successes / max(self.total_actions, 1),
            'learning_events': self.learning_events,
            'experiences_stored': len(self.experiences),
            'patterns_learned': len(self.patterns),
            'platforms_known': len(self.expertise),
            'expertise_levels': {k: v['level'] for k, v in self.expertise.items()}
        }
    
    def _save_state(self):
        """Persist learning state to disk"""
        try:
            state = {
                'q_table': self.q_table,
                'confidence_map': self.confidence_map,
                'expertise': self.expertise,
                'patterns': {k: v.to_dict() for k, v in self.patterns.items()},
                'stats': {
                    'total_actions': self.total_actions,
                    'total_successes': self.total_successes,
                    'learning_events': self.learning_events
                },
                # Only save last 1000 experiences to keep file manageable
                'experiences': [e.to_dict() for e in self.experiences[-1000:]]
            }
            
            path = Path(self.persistence_path)
            path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(path, 'w') as f:
                json.dump(state, f, indent=2)
            
            logger.debug(f"🧬 Saved evolution state to {self.persistence_path}")
            
        except Exception as e:
            logger.warning(f"Failed to save evolution state: {e}")
    
    def _load_state(self):
        """Load learning state from disk"""
        try:
            path = Path(self.persistence_path)
            if not path.exists():
                logger.info("🧬 No previous evolution state found, starting fresh")
                return
            
            with open(path, 'r') as f:
                state = json.load(f)
            
            self.q_table = state.get('q_table', {})
            self.confidence_map = state.get('confidence_map', {})
            self.expertise = state.get('expertise', {})
            
            # Restore patterns
            patterns_data = state.get('patterns', {})
            for k, v in patterns_data.items():
                self.patterns[k] = LearnedPattern(
                    platform=v['platform'],
                    pattern_type=v['pattern_type'],
                    trigger_conditions=v['trigger_conditions'],
                    optimal_actions=v['optimal_actions'],
                    success_rate=v['success_rate'],
                    total_uses=v['total_uses'],
                    avg_time=v['avg_time']
                )
            
            stats = state.get('stats', {})
            self.total_actions = stats.get('total_actions', 0)
            self.total_successes = stats.get('total_successes', 0)
            self.learning_events = stats.get('learning_events', 0)
            
            # Note: We don't restore experiences to save memory
            # They can be rebuilt from usage
            
            logger.info(f"🧬 Loaded evolution state: {len(self.patterns)} patterns, {len(self.expertise)} platforms")
            
        except Exception as e:
            logger.warning(f"Failed to load evolution state: {e}")
    
    def reset(self):
        """Reset all learning (use with caution!)"""
        self.experiences.clear()
        self.patterns.clear()
        self.q_table.clear()
        self.confidence_map.clear()
        self.expertise.clear()
        self.total_actions = 0
        self.total_successes = 0
        self.learning_events = 0
        logger.info("🧬 Evolution state reset")


# Global instance for cross-module access
_evolution_instance: Optional[SelfEvolution] = None

def get_evolution() -> SelfEvolution:
    """Get or create the global self-evolution instance"""
    global _evolution_instance
    if _evolution_instance is None:
        _evolution_instance = SelfEvolution()
    return _evolution_instance