"""
Optimized Prompt System - Compact, High-Performance LLM Prompts

This module provides streamlined, focused prompts for the SuperAgent
that replace the original 365-line prompts with compact, effective
alternatives that reduce latency and improve accuracy.

Design Principles:
1. Minimal token usage - faster processing, lower cost
2. Clear structure - reduces parsing errors
3. Action-focused - direct mapping to executable actions
4. Context-aware - adapts to current state
5. Template-based - consistent, maintainable

Performance Targets:
- Prompt size: <2000 tokens (vs 5000+ original)
- Response parsing: <10ms
- Action clarity: 99%+ parseable responses
"""

import json
import logging
import re
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple, Union
from enum import Enum, auto

logger = logging.getLogger(__name__)


class PromptMode(Enum):
    """Different prompt modes for different contexts."""
    ACTION = auto()          # Standard action selection
    PLANNING = auto()        # Strategic/tactical planning
    VERIFICATION = auto()    # Verify action success
    RECOVERY = auto()        # Error recovery
    COMPLETION = auto()      # Task completion check


@dataclass
class ActionContext:
    """Context for action prompt generation."""
    task: str
    current_step: str = ""
    recent_actions: List[str] = field(default_factory=list)
    error_message: str = ""
    iteration: int = 0
    max_iterations: int = 50
    detected_app: str = ""
    recommended_apps: List[str] = field(default_factory=list)
    primary_app: str = ""
    element_list: str = ""
    screen_description: str = ""
    search_performed: str = ""
    url_typed: str = ""


class OptimizedPrompts:
    """
    Production-grade prompt templates optimized for speed and accuracy.
    
    These prompts are designed to be:
    - Compact: Minimal tokens for fast processing
    - Clear: Unambiguous action format
    - Reliable: Consistent JSON output
    """
    
    # Core action prompt - the main workhorse
    # Approximately 50 lines vs 365 original
    ACTION_PROMPT = """You are a screen automation agent. Execute the given task by taking actions.

TASK: {task}
STEP: {current_step}
APP: {detected_app}
ITERATION: {iteration}/{max_iterations}

{context_section}

{element_section}

AVAILABLE ACTIONS:
- click: Click at coordinates or element
- type: Type text (in focused input)
- hotkey: Press key combination
- scroll: Scroll up/down
- wait: Wait for page load
- done: Task complete

RESPOND WITH JSON ONLY:
{{
    "action": "click|type|hotkey|scroll|wait|done",
    "x": <x coordinate if click>,
    "y": <y coordinate if click>,
    "element": <element number if using SoM>,
    "text": "<text if type>",
    "keys": ["key1", "key2"] if hotkey,
    "direction": "up|down" if scroll,
    "reason": "<brief explanation>"
}}"""

    # Planning prompt - for creating task plans
    PLANNING_PROMPT = """Break down this task into steps.

TASK: {task}
RECOMMENDED APPS: {recommended_apps}

Create 2-5 high-level steps. Each step should be achievable.

RESPOND WITH JSON:
{{
    "thinking": "<analysis>",
    "steps": ["step 1", "step 2", ...],
    "estimated_actions": <number>,
    "confidence": <0.0-1.0>
}}"""

    # Verification prompt - check if action succeeded
    VERIFICATION_PROMPT = """Did the action succeed?

TASK: {task}
ACTION TAKEN: {action_taken}
EXPECTED: {expected_result}

Look at the current screen state.

RESPOND WITH JSON:
{{
    "succeeded": true|false,
    "observation": "<what you see>",
    "confidence": <0.0-1.0>
}}"""

    # Recovery prompt - when things go wrong
    RECOVERY_PROMPT = """The previous action failed. Find alternative.

TASK: {task}
FAILED ACTION: {failed_action}
ERROR: {error_message}

{element_section}

Suggest a different approach.

RESPOND WITH JSON:
{{
    "analysis": "<why it failed>",
    "alternative_action": {{
        "action": "click|type|hotkey|scroll|wait",
        "x": <x>, "y": <y>,
        "text": "<text>",
        "reason": "<explanation>"
    }}
}}"""

    # Completion check prompt
    COMPLETION_PROMPT = """Is the task complete?

TASK: {task}
ACTIONS TAKEN: {action_count}
LAST ACTION: {last_action}

Evaluate if the task goal has been achieved.

RESPOND WITH JSON:
{{
    "is_complete": true|false,
    "confidence": <0.0-1.0>,
    "observation": "<what indicates completion or what's missing>"
}}"""

    # Context templates
    CONTEXT_WITH_HISTORY = """RECENT ACTIONS:
{recent_actions}

CURRENT STATE:
{screen_description}"""

    CONTEXT_MINIMAL = """STATE: {screen_description}"""

    ELEMENT_SECTION_SOM = """ELEMENTS ON SCREEN (select by number):
{element_list}"""

    ELEMENT_SECTION_BASIC = """SCREEN: {screen_description}"""


class PromptBuilder:
    """
    Build optimized prompts for different scenarios.
    
    This class generates the actual prompt text based on context
    and mode, keeping prompts as compact as possible while
    maintaining effectiveness.
    """
    
    def __init__(self, 
                 max_history: int = 5,
                 include_coordinates: bool = True,
                 use_som: bool = True):
        """
        Initialize prompt builder.
        
        Args:
            max_history: Maximum recent actions to include
            include_coordinates: Include coordinate guidance
            use_som: Use Set-of-Mark element references
        """
        self.max_history = max_history
        self.include_coordinates = include_coordinates
        self.use_som = use_som
        self.prompts = OptimizedPrompts()
    
    def build_action_prompt(self, context: ActionContext) -> str:
        """
        Build action prompt from context.
        
        Args:
            context: Action context with task and state info
            
        Returns:
            Formatted prompt string
        """
        # Build context section
        if context.recent_actions:
            recent = context.recent_actions[-self.max_history:]
            actions_str = "\n".join(f"- {a}" for a in recent)
            context_section = self.prompts.CONTEXT_WITH_HISTORY.format(
                recent_actions=actions_str,
                screen_description=context.screen_description or "Loading..."
            )
        else:
            context_section = self.prompts.CONTEXT_MINIMAL.format(
                screen_description=context.screen_description or "Initial state"
            )
        
        # Build element section
        if self.use_som and context.element_list:
            element_section = self.prompts.ELEMENT_SECTION_SOM.format(
                element_list=context.element_list
            )
        elif context.screen_description:
            element_section = self.prompts.ELEMENT_SECTION_BASIC.format(
                screen_description=context.screen_description
            )
        else:
            element_section = ""
        
        # Add search/URL context if present
        if context.search_performed:
            context_section += f"\nSEARCH PERFORMED: '{context.search_performed}'"
        if context.url_typed:
            context_section += f"\nURL NAVIGATED: {context.url_typed}"
        
        return self.prompts.ACTION_PROMPT.format(
            task=context.task,
            current_step=context.current_step or context.task,
            detected_app=context.detected_app or "Unknown",
            iteration=context.iteration,
            max_iterations=context.max_iterations,
            context_section=context_section,
            element_section=element_section
        )
    
    def build_planning_prompt(self, task: str, 
                             recommended_apps: List[str] = None) -> str:
        """Build strategic planning prompt."""
        apps_str = ", ".join(recommended_apps) if recommended_apps else "Chrome, Gmail"
        return self.prompts.PLANNING_PROMPT.format(
            task=task,
            recommended_apps=apps_str
        )
    
    def build_verification_prompt(self, task: str, 
                                  action_taken: str,
                                  expected_result: str) -> str:
        """Build action verification prompt."""
        return self.prompts.VERIFICATION_PROMPT.format(
            task=task,
            action_taken=action_taken,
            expected_result=expected_result
        )
    
    def build_recovery_prompt(self, context: ActionContext,
                             failed_action: str) -> str:
        """Build error recovery prompt."""
        element_section = ""
        if self.use_som and context.element_list:
            element_section = self.prompts.ELEMENT_SECTION_SOM.format(
                element_list=context.element_list
            )
        
        return self.prompts.RECOVERY_PROMPT.format(
            task=context.task,
            failed_action=failed_action,
            error_message=context.error_message or "Action did not produce expected result",
            element_section=element_section
        )
    
    def build_completion_prompt(self, task: str,
                               action_count: int,
                               last_action: str) -> str:
        """Build task completion check prompt."""
        return self.prompts.COMPLETION_PROMPT.format(
            task=task,
            action_count=action_count,
            last_action=last_action
        )


class ResponseParser:
    """
    Fast, reliable parsing of LLM responses.
    
    Handles various response formats and extracts
    structured action data.
    """
    
    # Action type mapping
    ACTION_TYPES = {
        'click': 'click',
        'type': 'type',
        'hotkey': 'hotkey',
        'key': 'hotkey',
        'scroll': 'scroll',
        'wait': 'wait',
        'done': 'done',
        'complete': 'done',
        'finished': 'done'
    }
    
    def parse(self, response: str) -> Dict[str, Any]:
        """
        Parse LLM response into structured action.
        
        Args:
            response: Raw LLM response text
            
        Returns:
            Parsed action dictionary
        """
        # Clean response
        response = response.strip()
        
        # Extract JSON
        json_str = self._extract_json(response)
        
        if not json_str:
            logger.warning("No JSON in response, attempting fallback parse")
            return self._fallback_parse(response)
        
        try:
            parsed = json.loads(json_str)
        except json.JSONDecodeError as e:
            logger.warning("JSON parse error: %s", e)
            return self._fallback_parse(response)
        
        # Normalize action
        return self._normalize_action(parsed)
    
    def _extract_json(self, text: str) -> Optional[str]:
        """Extract JSON from text, handling markdown code blocks."""
        # Remove markdown code blocks
        text = text.strip()
        if text.startswith('```'):
            lines = text.split('\n')
            if lines[0].startswith('```'):
                lines = lines[1:]
            if lines and lines[-1].strip() == '```':
                lines = lines[:-1]
            text = '\n'.join(lines)
        
        # Find JSON object
        brace_count = 0
        start_idx = None
        
        for i, char in enumerate(text):
            if char == '{':
                if brace_count == 0:
                    start_idx = i
                brace_count += 1
            elif char == '}':
                brace_count -= 1
                if brace_count == 0 and start_idx is not None:
                    return text[start_idx:i+1]
        
        return None
    
    def _normalize_action(self, parsed: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize parsed action to standard format."""
        action_type = parsed.get('action', parsed.get('type', 'wait'))
        action_type = self.ACTION_TYPES.get(action_type.lower(), action_type.lower())
        
        result = {
            'type': action_type,
            'reason': parsed.get('reason', ''),
            'raw': parsed
        }
        
        # Handle coordinates
        if 'x' in parsed and 'y' in parsed:
            result['x'] = int(parsed['x'])
            result['y'] = int(parsed['y'])
        elif 'coordinates' in parsed:
            coords = parsed['coordinates']
            if isinstance(coords, dict):
                result['x'] = int(coords.get('x', 0))
                result['y'] = int(coords.get('y', 0))
            elif isinstance(coords, (list, tuple)) and len(coords) >= 2:
                result['x'] = int(coords[0])
                result['y'] = int(coords[1])
        
        # Handle element reference (SoM)
        if 'element' in parsed:
            result['element'] = int(parsed['element'])
        
        # Handle text for typing
        if 'text' in parsed:
            result['text'] = str(parsed['text'])
        elif 't' in parsed:  # Short form
            result['text'] = str(parsed['t'])
        
        # Handle keys for hotkey
        if 'keys' in parsed:
            keys = parsed['keys']
            if isinstance(keys, str):
                result['keys'] = [k.strip().lower() for k in keys.split('+')]
            elif isinstance(keys, list):
                result['keys'] = [str(k).lower() for k in keys]
        
        # Handle scroll direction
        if 'direction' in parsed:
            result['direction'] = parsed['direction']
        elif 'amount' in parsed:
            result['amount'] = parsed['amount']
        
        # Handle thinking/observation
        if 'thinking' in parsed:
            result['thinking'] = parsed['thinking']
        if 'observation' in parsed:
            result['observation'] = parsed['observation']
        
        # Handle confidence
        if 'confidence' in parsed:
            result['confidence'] = float(parsed['confidence'])
        
        return result
    
    def _fallback_parse(self, text: str) -> Dict[str, Any]:
        """Fallback parsing when JSON extraction fails."""
        text_lower = text.lower()
        
        # Try to detect action type from text
        if 'click' in text_lower:
            # Try to extract coordinates
            coord_match = re.search(r'\((\d+),\s*(\d+)\)', text)
            if coord_match:
                return {
                    'type': 'click',
                    'x': int(coord_match.group(1)),
                    'y': int(coord_match.group(2)),
                    'reason': 'Fallback parse'
                }
            return {'type': 'click', 'reason': 'Fallback - coordinates missing'}
        
        elif 'type' in text_lower or 'enter' in text_lower:
            # Try to extract text
            text_match = re.search(r'["\']([^"\']+)["\']', text)
            if text_match:
                return {
                    'type': 'type',
                    'text': text_match.group(1),
                    'reason': 'Fallback parse'
                }
        
        elif 'done' in text_lower or 'complete' in text_lower:
            return {'type': 'done', 'reason': 'Task appears complete'}
        
        elif 'scroll' in text_lower:
            direction = 'down' if 'down' in text_lower else 'up'
            return {'type': 'scroll', 'direction': direction, 'reason': 'Fallback parse'}
        
        # Default to wait
        return {'type': 'wait', 'amount': 2, 'reason': 'Could not parse response'}


class PromptOptimizer:
    """
    Dynamically optimize prompts based on performance metrics.
    
    Tracks which prompt variations produce better results
    and adjusts accordingly.
    """
    
    def __init__(self):
        self.prompt_stats: Dict[str, Dict[str, Any]] = {}
        self.total_prompts = 0
        self.successful_parses = 0
        self.action_success_rate: Dict[str, float] = {}
    
    def record_prompt_result(self, prompt_type: str, 
                            parsed_successfully: bool,
                            action_succeeded: bool):
        """Record result of a prompt for optimization."""
        if prompt_type not in self.prompt_stats:
            self.prompt_stats[prompt_type] = {
                'total': 0,
                'parsed': 0,
                'succeeded': 0
            }
        
        self.prompt_stats[prompt_type]['total'] += 1
        if parsed_successfully:
            self.prompt_stats[prompt_type]['parsed'] += 1
        if action_succeeded:
            self.prompt_stats[prompt_type]['succeeded'] += 1
        
        self.total_prompts += 1
        if parsed_successfully:
            self.successful_parses += 1
    
    def get_parse_rate(self) -> float:
        """Get overall parse success rate."""
        if self.total_prompts == 0:
            return 1.0
        return self.successful_parses / self.total_prompts
    
    def get_stats(self) -> Dict[str, Any]:
        """Get optimization statistics."""
        return {
            'total_prompts': self.total_prompts,
            'parse_rate': self.get_parse_rate(),
            'by_type': self.prompt_stats
        }


class CompactVisionPrompt:
    """
    Specialized compact prompt for vision API calls.
    
    Minimizes token usage while maintaining action clarity.
    This is the direct replacement for the 365-line prompt.
    """
    
    # System message - sets up behavior
    SYSTEM = """You are a precise screen automation agent. 
Analyze screenshots and output JSON actions.
Be concise. Select one action per response."""

    # Main action template - approximately 40 lines
    ACTION = """TASK: {task}
STEP: {step}

SCREEN INFO:
- App: {app}
- Size: {screen_size}
{element_info}

HISTORY: {history}

ACTIONS:
- click: {{"action":"click","x":X,"y":Y,"reason":"..."}}
- type: {{"action":"type","text":"...","reason":"..."}}
- hotkey: {{"action":"hotkey","keys":["ctrl","t"],"reason":"..."}}
- scroll: {{"action":"scroll","direction":"down","reason":"..."}}
- done: {{"action":"done","reason":"task complete"}}

Output JSON only:"""

    @classmethod
    def build(cls, 
             task: str,
             step: str = "",
             app: str = "Unknown",
             screen_size: str = "1920x1080",
             elements: str = "",
             history: str = "None") -> Tuple[str, str]:
        """
        Build system and user prompts.
        
        Returns:
            Tuple of (system_prompt, user_prompt)
        """
        element_info = f"- Elements:\n{elements}" if elements else ""
        
        user_prompt = cls.ACTION.format(
            task=task,
            step=step or task,
            app=app,
            screen_size=screen_size,
            element_info=element_info,
            history=history[:500] if history else "None"  # Truncate history
        )
        
        return cls.SYSTEM, user_prompt
    
    @classmethod
    def estimate_tokens(cls, prompt: str) -> int:
        """Estimate token count for prompt."""
        # Rough estimate: ~4 chars per token for English
        return len(prompt) // 4


# Pre-configured prompt builders for common use cases
def create_action_prompt_builder() -> PromptBuilder:
    """Create standard action prompt builder."""
    return PromptBuilder(
        max_history=5,
        include_coordinates=True,
        use_som=True
    )


def create_fast_prompt_builder() -> PromptBuilder:
    """Create fast prompt builder with minimal context."""
    return PromptBuilder(
        max_history=2,
        include_coordinates=True,
        use_som=False
    )


def create_som_prompt_builder() -> PromptBuilder:
    """Create SoM-focused prompt builder."""
    return PromptBuilder(
        max_history=3,
        include_coordinates=False,
        use_som=True
    )


# Response parser singleton
_response_parser = None

def get_response_parser() -> ResponseParser:
    """Get shared response parser instance."""
    global _response_parser
    if _response_parser is None:
        _response_parser = ResponseParser()
    return _response_parser


def parse_llm_response(response: str) -> Dict[str, Any]:
    """Convenience function to parse LLM response."""
    return get_response_parser().parse(response)
