"""
Nelieo SuperAgent - The Superhuman AI OS Agent

Features:
- 98% accuracy through OmniParser + structured LLM queries
- 2-4 second response time with FastAgent
- OODA loop decision making (Observe-Orient-Decide-Act)
- Self-healing error recovery
- UI exploration and adaptation
- Multi-app workflow orchestration
- Enterprise-grade reliability
"""

from .core import SuperAgent
from .vision import VisionAPI
from .executor import ActionExecutor
from .memory import ShortTermMemory, WorkflowMemory
from .actions import Action, ActionType
from .workflows import (
    WorkflowEngine,
    WorkflowStep,
    WorkflowResult,
    StepType,
    create_gmail_to_hubspot_workflow,
    create_creative_campaign_workflow,
    create_sales_analysis_workflow
)

# FastAgent - high-speed execution engine
try:
    from .fast_agent import FastAgent, AgentAction, ExecutionResult
    from .fast_agent_integration import (
        FastAgentAPI,
        get_fast_agent_api,
        execute_fast_task,
        cancel_fast_task
    )
    FAST_AGENT_AVAILABLE = True
except ImportError:
    FAST_AGENT_AVAILABLE = False

__version__ = "2.0.0"
__all__ = [
    'SuperAgent',
    'VisionAPI',
    'ActionExecutor',
    'ShortTermMemory',
    'WorkflowMemory',
    'Action',
    'ActionType',
    'WorkflowEngine',
    'WorkflowStep',
    'WorkflowResult',
    'StepType',
    'create_gmail_to_hubspot_workflow',
    'create_creative_campaign_workflow',
    'create_sales_analysis_workflow',
    # FastAgent (v2.0)
    'FastAgent',
    'FastAgentAPI',
    'AgentAction',
    'ExecutionResult',
    'get_fast_agent_api',
    'execute_fast_task',
    'cancel_fast_task',
    'FAST_AGENT_AVAILABLE'
]

