"""
Tool Mastery System - App-Specific Intelligence

This is what makes the agent EXPERT at each app.
Instead of fumbling around, it KNOWS:
- Google Sheets: Keyboard shortcuts, cell navigation, formulas
- Gmail: Compose shortcuts, filters, send workflows
- Asana: Task creation, project nav, assignment
- SAP: Complex form workflows, validation, multi-step processes

This is the difference between a beginner and a master.
"""

import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class AppKnowledge:
    """Knowledge about a specific app"""
    name: str
    shortcuts: Dict[str, str]  # Action → keyboard shortcut
    common_workflows: Dict[str, List[str]]  # Task → steps
    ui_patterns: Dict[str, str]  # Element type → location pattern
    error_recovery: Dict[str, List[str]]  # Error → recovery steps


class ToolMastery:
    """
    Master-level knowledge of how to use each app efficiently.
    
    This is trained knowledge that makes the agent 10x faster.
    """
    
    def __init__(self):
        self.app_knowledge: Dict[str, AppKnowledge] = {}
        self._load_knowledge()
        logger.info("🎓 Tool Mastery System initialized")
    
    def _load_knowledge(self):
        """Load expert knowledge for each app"""
        
        # GOOGLE SHEETS - Master Level
        self.app_knowledge['Google Sheets'] = AppKnowledge(
            name='Google Sheets',
            shortcuts={
                'new_row': 'Ctrl+Alt+= (below)',
                'new_column': 'Ctrl+Alt+= (right)',
                'bold': 'Ctrl+B',
                'copy': 'Ctrl+C',
                'paste': 'Ctrl+V',
                'undo': 'Ctrl+Z',
                'find': 'Ctrl+F',
                'move_to_end': 'Ctrl+End',
                'move_to_start': 'Ctrl+Home',
                'select_all': 'Ctrl+A',
                'insert_link': 'Ctrl+K'
            },
            common_workflows={
                'fill_table': [
                    'Click cell A1',
                    'Type header text',
                    'Press Tab to move right',
                    'Repeat for all headers',
                    'Press Enter to move to next row',
                    'Type data in each cell',
                    'Press Tab to move between cells'
                ],
                'format_as_table': [
                    'Select data range (Ctrl+A or drag)',
                    'Click Format menu',
                    'Choose "Alternating colors"',
                    'Select color scheme'
                ],
                'add_formula': [
                    'Click target cell',
                    'Type = to start formula',
                    'Type formula (e.g., =SUM(A1:A10))',
                    'Press Enter to confirm'
                ]
            },
            ui_patterns={
                'first_cell': 'Top-left corner, usually (100, 150)',
                'formula_bar': 'Top center, around (500, 80)',
                'menu_bar': 'Top-left, around (50, 50)',
                'share_button': 'Top-right, around (1300, 50)'
            },
            error_recovery={
                'cell_not_selected': ['Click directly on cell', 'Verify selection highlight'],
                'formula_error': ['Check syntax', 'Verify cell references', 'Use Ctrl+Z to undo'],
                'permission_denied': ['Check Share settings', 'Request edit access']
            }
        )
        
        # GMAIL - Master Level
        self.app_knowledge['Gmail'] = AppKnowledge(
            name='Gmail',
            shortcuts={
                'compose': 'c',
                'reply': 'r',
                'reply_all': 'a',
                'forward': 'f',
                'send': 'Ctrl+Enter or Tab+Enter',
                'search': '/',
                'go_to_inbox': 'g then i',
                'archive': 'e',
                'delete': '#',
                'star': 's',
                'mark_as_read': 'Shift+i',
                'next_message': 'j',
                'previous_message': 'k'
            },
            common_workflows={
                'send_email': [
                    'Press c to compose',
                    'Type recipient email',
                    'Press Tab to move to subject',
                    'Type subject',
                    'Press Tab to move to body',
                    'Type message',
                    'Press Ctrl+Enter to send'
                ],
                'reply_to_email': [
                    'Open email (click on it)',
                    'Press r for reply',
                    'Type response',
                    'Press Ctrl+Enter to send'
                ],
                'search_emails': [
                    'Press / to focus search',
                    'Type search query',
                    'Press Enter',
                    'Click on result to open'
                ]
            },
            ui_patterns={
                'compose_button': 'Top-left, around (50, 100)',
                'send_button': 'Bottom-left of compose window, (100, 600)',
                'recipient_field': 'Top of compose window, (200, 150)',
                'subject_field': 'Below recipient, (200, 200)',
                'body_field': 'Below subject, (200, 300)'
            },
            error_recovery={
                'email_not_sent': ['Check internet', 'Verify recipient address', 'Try Send again'],
                'attachment_too_large': ['Use Google Drive link', 'Compress file'],
                'recipient_not_found': ['Check spelling', 'Try different email format']
            }
        )
        
        # ASANA - Master Level
        self.app_knowledge['Asana'] = AppKnowledge(
            name='Asana',
            shortcuts={
                'new_task': 'Tab+Q',
                'search': 'Tab+/',
                'quick_add': 'Tab+N',
                'complete_task': 'Ctrl+Enter',
                'assign_to_me': 'Tab+M',
                'due_today': 'Tab+Y',
                'add_comment': 'Ctrl+Enter (in comment field)'
            },
            common_workflows={
                'create_task': [
                    'Click + button or Tab+Q',
                    'Type task name',
                    'Press Tab to add description',
                    'Type description',
                    'Press Tab to assign',
                    'Type assignee name',
                    'Press Tab to set due date',
                    'Type or select date',
                    'Press Enter to create'
                ],
                'update_task_status': [
                    'Click on task',
                    'Click status dropdown',
                    'Select new status',
                    'Add comment if needed',
                    'Click outside to save'
                ]
            },
            ui_patterns={
                'add_task_button': 'Top or bottom of list, varies by view',
                'task_list': 'Center of screen',
                'task_details': 'Right panel when task selected',
                'project_menu': 'Left sidebar'
            },
            error_recovery={
                'task_not_created': ['Refresh page', 'Check required fields', 'Try again'],
                'permission_error': ['Check project access', 'Request permissions'],
                'sync_issue': ['Refresh browser', 'Check connection']
            }
        )
        
        # SAP - Master Level (Complex enterprise software)
        self.app_knowledge['SAP'] = AppKnowledge(
            name='SAP',
            shortcuts={
                'enter': 'Enter (confirm/execute)',
                'back': 'F3',
                'save': 'Ctrl+S',
                'help': 'F1',
                'search': 'F4 (value help)',
                'cancel': 'F12',
                'first_page': 'Ctrl+PgUp',
                'last_page': 'Ctrl+PgDown'
            },
            common_workflows={
                'create_purchase_order': [
                    'Enter transaction code ME21N',
                    'Press Enter',
                    'Select vendor (F4 for help)',
                    'Enter purchase org',
                    'Enter purchase group',
                    'Tab to line items',
                    'Enter material number',
                    'Enter quantity',
                    'Enter delivery date',
                    'Press Enter to validate',
                    'Click Save (Ctrl+S)'
                ],
                'check_stock': [
                    'Enter transaction code MMBE',
                    'Press Enter',
                    'Enter material number',
                    'Enter plant',
                    'Press F8 (Execute)',
                    'Review stock levels'
                ]
            },
            ui_patterns={
                'transaction_code_field': 'Top-left, command field',
                'message_bar': 'Bottom of screen (green=success, red=error)',
                'main_data_area': 'Center of screen',
                'menu_bar': 'Top of screen'
            },
            error_recovery={
                'field_validation_error': ['Check required fields', 'F1 for field help', 'F4 for value help'],
                'authorization_missing': ['Contact admin', 'Request specific authorization'],
                'lock_error': ['Wait for other user', 'Contact them', 'Try /nex to end session']
            }
        )
        
        # QUICKBOOKS - Master Level
        self.app_knowledge['QuickBooks'] = AppKnowledge(
            name='QuickBooks',
            shortcuts={
                'new_invoice': 'Ctrl+I',
                'new_expense': 'Ctrl+W',
                'find': 'Ctrl+F',
                'save': 'Ctrl+S',
                'save_and_close': 'Alt+S',
                'next_field': 'Tab',
                'previous_field': 'Shift+Tab'
            },
            common_workflows={
                'create_invoice': [
                    'Press Ctrl+I for new invoice',
                    'Select customer from dropdown',
                    'Tab to invoice date (auto-fills)',
                    'Tab to product/service',
                    'Enter item',
                    'Tab to enter quantity',
                    'Tab to rate (auto-fills if set)',
                    'Verify amount',
                    'Alt+S to save and close'
                ],
                'record_expense': [
                    'Press Ctrl+W for new expense',
                    'Select payee',
                    'Tab to payment account',
                    'Select account',
                    'Tab to date',
                    'Tab to category',
                    'Select expense category',
                    'Tab to amount',
                    'Enter amount',
                    'Alt+S to save'
                ]
            },
            ui_patterns={
                'customer_dropdown': 'Top of invoice form',
                'line_items': 'Middle table section',
                'total': 'Bottom right',
                'save_button': 'Bottom left or top right'
            },
            error_recovery={
                'customer_not_found': ['Click + New Customer', 'Add customer details', 'Retry'],
                'amount_mismatch': ['Recalculate', 'Check qty * rate', 'Verify tax settings'],
                'duplicate_invoice': ['Check invoice number', 'Search existing', 'Increment number']
            }
        )
        
        # CHROME / WEB BROWSING - Universal
        self.app_knowledge['Chrome'] = AppKnowledge(
            name='Chrome',
            shortcuts={
                'address_bar': 'Ctrl+L',
                'new_tab': 'Ctrl+T',
                'close_tab': 'Ctrl+W',
                'reopen_tab': 'Ctrl+Shift+T',
                'refresh': 'F5 or Ctrl+R',
                'back': 'Alt+Left or Backspace',
                'forward': 'Alt+Right',
                'find': 'Ctrl+F',
                'save_page': 'Ctrl+S',
                'zoom_in': 'Ctrl++',
                'zoom_out': 'Ctrl+-'
            },
            common_workflows={
                'navigate_to_site': [
                    'Press Ctrl+L to focus address bar',
                    'Type URL',
                    'Press Enter',
                    'Wait for page load'
                ],
                'search_google': [
                    'Press Ctrl+L',
                    'Type search query',
                    'Press Enter',
                    'Wait for results'
                ],
                'extract_text': [
                    'Ctrl+A to select all',
                    'Ctrl+C to copy',
                    'Store in memory'
                ]
            },
            ui_patterns={
                'address_bar': 'Top center, (960, 60)',
                'back_button': 'Top left, (50, 60)',
                'refresh': 'Near address bar, (100, 60)',
                'search_box': 'Center of Google, (960, 400)'
            },
            error_recovery={
                'page_not_loading': ['Wait 5s', 'Press F5 to refresh', 'Check URL'],
                'connection_error': ['Check internet', 'Retry', 'Try different site'],
                'popup_blocking': ['Close popup', 'Continue with main page', 'Click X button']
            }
        )
    
    def get_shortcut(self, app_name: str, action: str) -> Optional[str]:
        """Get keyboard shortcut for action in specific app"""
        knowledge = self.app_knowledge.get(app_name)
        if knowledge:
            shortcut = knowledge.shortcuts.get(action)
            if shortcut:
                logger.info(f"⌨️ {app_name}.{action} → {shortcut}")
                return shortcut
        return None
    
    def get_workflow(self, app_name: str, task_name: str) -> Optional[List[str]]:
        """Get expert workflow steps for a task"""
        knowledge = self.app_knowledge.get(app_name)
        if knowledge:
            workflow = knowledge.common_workflows.get(task_name)
            if workflow:
                logger.info(f"📋 {app_name}.{task_name} workflow: {len(workflow)} steps")
                return workflow
        return None
    
    def get_ui_pattern(self, app_name: str, element_type: str) -> Optional[str]:
        """Get typical UI location pattern"""
        knowledge = self.app_knowledge.get(app_name)
        if knowledge:
            return knowledge.ui_patterns.get(element_type)
        return None
    
    def get_error_recovery(self, app_name: str, error_type: str) -> Optional[List[str]]:
        """Get recovery steps for specific error"""
        knowledge = self.app_knowledge.get(app_name)
        if knowledge:
            recovery = knowledge.error_recovery.get(error_type)
            if recovery:
                logger.info(f"🔧 {app_name} error '{error_type}' recovery: {recovery}")
                return recovery
        return None
    
    def suggest_approach(self, app_name: str, goal: str) -> Dict[str, Any]:
        """
        Given an app and goal, suggest the expert approach.
        
        This is THE intelligence that makes the agent 10x better.
        """
        knowledge = self.app_knowledge.get(app_name)
        if not knowledge:
            return {'approach': 'unknown_app', 'steps': []}
        
        goal_lower = goal.lower()
        
        # Match goal to known workflows
        for workflow_name, steps in knowledge.common_workflows.items():
            if any(word in goal_lower for word in workflow_name.split('_')):
                logger.info(f"🎯 Matched '{goal}' to workflow '{workflow_name}'")
                return {
                    'approach': 'known_workflow',
                    'workflow_name': workflow_name,
                    'steps': steps,
                    'shortcuts': {
                        action: knowledge.shortcuts.get(action)
                        for action in ['save', 'copy', 'paste', 'undo']
                        if action in knowledge.shortcuts
                    }
                }
        
        # No exact match - suggest general approach
        return {
            'approach': 'general',
            'available_workflows': list(knowledge.common_workflows.keys()),
            'shortcuts': knowledge.shortcuts,
            'tip': f"Consider using keyboard shortcuts for speed"
        }
    
    def validate_approach(self, app_name: str, planned_steps: List[str]) -> Dict:
        """
        Validate if planned steps are efficient.
        Suggest improvements based on expert knowledge.
        """
        knowledge = self.app_knowledge.get(app_name)
        if not knowledge:
            return {'valid': True, 'suggestions': []}
        
        suggestions = []
        
        # Check if shortcuts could be used
        for step in planned_steps:
            step_lower = step.lower()
            if 'click save button' in step_lower and 'save' in knowledge.shortcuts:
                suggestions.append(f"Use {knowledge.shortcuts['save']} instead of clicking Save")
            if 'click compose' in step_lower and 'compose' in knowledge.shortcuts:
                suggestions.append(f"Use {knowledge.shortcuts['compose']} instead of clicking")
        
        return {
            'valid': True,
            'efficiency_score': max(0.5, 1.0 - (len(suggestions) * 0.1)),
            'suggestions': suggestions
        }
