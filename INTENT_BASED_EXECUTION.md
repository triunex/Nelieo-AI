# Intent-Based Execution System

## The Problem
Current: "open chrome and search for openai" ❌
Users want: "find information about OpenAI" ✅

**Users describe WHAT they want, not HOW to do it.**

## Real-World Examples

### Customer Support
```
User says: "Respond to customer email about order #12345"

Agent should:
1. Understand: Need to reply to a specific email
2. Plan: Open Gmail → Find email → Draft response → Send
3. Execute: Do it all automatically
4. Report: "Sent response to John Doe about order #12345"
```

### Research
```
User says: "Find competitor pricing for our product"

Agent should:
1. Understand: Need competitive analysis
2. Plan: Open multiple competitor websites → Extract prices → Compare
3. Execute: Navigate, screenshot, analyze
4. Report: "Competitor A: $99, Competitor B: $149, Competitor C: $79"
```

### Data Entry
```
User says: "Add these 10 contacts to Salesforce"

Agent should:
1. Understand: Need to create records
2. Plan: Open Salesforce → Navigate to contacts → Fill forms → Save
3. Execute: Repeat for all 10
4. Report: "Added 10 contacts to Salesforce successfully"
```

## Required Changes

### 1. Intent Understanding Layer
**File:** `superagent/intent_parser.py`
```python
class IntentParser:
    def parse(self, user_request: str) -> Intent:
        """Convert natural language to structured intent"""
        # Use Gemini to understand:
        # - What is the goal? (respond to email, research, data entry)
        # - What entities are involved? (order #12345, contact name)
        # - What's the expected output? (email sent, data found, records created)
```

### 2. Task Decomposition
**File:** `superagent/task_planner.py`
```python
class TaskPlanner:
    def plan(self, intent: Intent) -> List[Step]:
        """Break down intent into executable steps"""
        # Example: "respond to email" becomes:
        # 1. open_app(Gmail)
        # 2. search_email(order_id="12345")
        # 3. read_email()
        # 4. draft_response(template="order_status")
        # 5. send_email()
```

### 3. Smart App Selection
**Current:** User says "open chrome"
**Better:** Agent figures out which app is needed

```python
INTENT_TO_APPS = {
    "email": ["Gmail"],
    "research": ["Chrome"],
    "crm": ["Salesforce"],
    "messaging": ["Slack"],
    "video_call": ["Zoom"],
    "documents": ["Notion", "Google Sheets"]
}
```

## Implementation Priority

### Phase 1: Intent Recognition (URGENT - Next 2 hours)
1. Add Gemini prompt to extract intent from user request
2. Map intent to required apps
3. Auto-open apps without user mentioning them

### Phase 2: Task Templates (Tomorrow)
1. Pre-built workflows for common tasks:
   - "respond to email" template
   - "find information" template
   - "update crm" template
2. Users just fill in variables

### Phase 3: Learning (After launch)
1. Remember successful task patterns
2. Suggest automations: "I noticed you do this every day, want me to automate it?"

## Success Metrics

**Before:**
- User: "open chrome and search for openai"
- Agent: Opens Chrome ✅
- Agent: Searches ❌ (gets stuck)

**After:**
- User: "find information about OpenAI"
- Agent: Opens Chrome → Searches → Extracts info → Reports back ✅
- User never thinks about Chrome

**YC-Ready:**
- User: "respond to all urgent customer emails"
- Agent: Analyzes inbox → Drafts 10 responses → Shows for approval → Sends ✅
- **THIS is what gets users excited!**

## Quick Win - Add This NOW

Update Gemini prompt to auto-detect apps:

```python
# In superagent/enhanced_core.py - strategic planning prompt
prompt = f"""You are analyzing a task. The user doesn't care HOW you do it, 
they just want RESULTS.

USER TASK: {task}

THINK:
1. What is the user's INTENT? (research, communication, data entry, etc.)
2. Which apps do I need? (Don't wait for user to say "open X")
3. What's the END RESULT they want to see?

AUTO-SELECT APPS:
- Need to search/research? → Use Chrome
- Need to email? → Use Gmail  
- Need to message? → Use Slack
- Need to schedule? → Use Zoom
- Need to update data? → Use Salesforce

RESPOND WITH PLAN:
Step 1: open_app("Chrome")  # You decided this, not the user
Step 2: search("OpenAI")
Step 3: extract_information()
...
"""
```

## The Vision

**Current state:**
- User is the pilot 🎮
- Agent is the plane ✈️
- User must give detailed instructions

**Target state:**
- User is the passenger 🧳
- Agent is the autopilot 🤖
- User just says destination, agent figures out the route

**This is what YC wants to see!**
