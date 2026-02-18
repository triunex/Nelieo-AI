# 🧠 Universal General Intelligence Agent

## Overview

The Nelieo AI OS agent has been transformed from a rule-based system to a **Universal General Intelligence (UGI)** that can operate ANY software, website, or application without hardcoded rules.

## Key Transformations

### 1. 🌐 Universal Reasoning Framework

Instead of app-specific rules like "For Gmail, click Compose", the agent now uses **first-principles reasoning**:

```
STEP 1: PERCEIVE - What do I see?
STEP 2: UNDERSTAND - What does it mean?
STEP 3: PREDICT - What happens next?
STEP 4: DECIDE - What's the optimal action?
STEP 5: ACT - Execute with precision
```

The agent learns to recognize **universal UI patterns** that apply to ANY platform:
- Navigation patterns (menus, breadcrumbs, sidebars)
- Input elements (text fields, dropdowns, checkboxes)
- Action buttons (primary, secondary, destructive)
- Content patterns (lists, tables, forms, cards)

### 2. 🧬 Self-Evolution System (World's First)

The agent now **learns from every action** using Reinforcement Learning principles:

#### Q-Learning
```python
Q(s,a) = Q(s,a) + α * (r - Q(s,a))
```
- State: (platform, ui_context_hash, task_pattern)
- Action: click, type, hotkey, scroll, etc.
- Reward: +1.5 for fast success, -1.0 for errors

#### Features
- **Experience Database**: Records every action and outcome
- **Pattern Extraction**: Discovers reusable workflows automatically
- **Confidence Calibration**: Knows what it doesn't know
- **Persistent Memory**: Survives container restarts
- **Platform Expertise**: Tracks mastery level per website/app

#### Expertise Levels
| Level | Actions | Success Rate |
|-------|---------|--------------|
| Novice | 0-5 | Any |
| Learning | 5-20 | Any |
| Proficient | 20-50 | 70%+ |
| Expert | 50-100 | 85%+ |
| Master | 100+ | 95%+ |

### 3. 📊 Evolution API Endpoint

New endpoint to monitor learning progress:

```bash
GET /api/superagent/evolution
```

Response:
```json
{
  "total_actions": 1234,
  "total_successes": 1173,
  "success_rate": 0.95,
  "learning_events": 1234,
  "experiences_stored": 1000,
  "patterns_learned": 47,
  "platforms_known": 12,
  "expertise_levels": {
    "youtube.com": "expert",
    "gmail.com": "master",
    "asana.com": "proficient"
  }
}
```

## Files Modified

### `superagent/gemini_vision.py`
- Replaced hardcoded app rules with Universal Reasoning Framework
- Added evolution context injection into prompts
- Universal UI pattern recognition

### `superagent/working_memory.py`
- Added `SelfEvolution` class with Q-learning
- Added `ActionExperience` dataclass
- Added `LearnedPattern` dataclass
- Persistent state storage to `/opt/agent_evolution.json`

### `superagent/enhanced_core.py`
- Integrated self-evolution system
- Records experience after every action
- Passes evolution context to vision API
- Auto-extracts patterns every 50 actions

### `aios-xpra-app/agent-api.py`
- Added `/api/superagent/evolution` endpoint

## How It Works

### Before (Rule-Based)
```
Task: "Search for cats on YouTube"
Rules: 
  - If YouTube: Click search box at (450, 70)
  - Type query
  - Press Enter
```

### After (Universal Intelligence)
```
Task: "Search for cats on YouTube"
Reasoning:
  1. PERCEIVE: I see a video platform with a search bar at the top
  2. UNDERSTAND: The search bar has a magnifying glass icon, typical of search inputs
  3. PREDICT: Clicking the search bar will focus it for text input
  4. DECIDE: Click the search input (coordinates detected visually)
  5. ACT: Execute click
  
  [After typing]
  1. PERCEIVE: Text "cats" is now in the search field
  2. PREDICT: Pressing Enter will submit the search
  3. ACT: Press Enter
  
  [After results load]
  1. PERCEIVE: Search results are visible
  2. DECIDE: Task complete → DONE
```

### Learning Example
```
Action: type "cats" on youtube.com
Result: Success in 0.3s
Learning:
  - Q(youtube.com|search_input|search, type) += 0.1 * (1.15 - 0.5) = 0.565
  - Confidence(youtube.com, type) = 0.9 * 0.5 + 0.1 * 1.0 = 0.55
  - Expertise(youtube.com).actions += 1
  - Expertise(youtube.com).successes += 1
```

## Benefits

1. **Works on ANY Platform**
   - No need to add new rules for new websites
   - Adapts to UI changes automatically
   - Handles previously unseen applications

2. **Improves Over Time**
   - Gets faster with experience
   - Learns which actions work best
   - Discovers optimal workflows

3. **Honest About Uncertainty**
   - Knows when to explore vs exploit
   - Reports confidence levels accurately
   - Asks for help when stuck

4. **Superhuman Speed**
   - Uses keyboard shortcuts when possible
   - Doesn't waste time on unnecessary actions
   - Completes tasks in minimal steps

## Testing

Run a task on a NEW website the agent has never seen:

```bash
curl -X POST http://localhost:5123/api/superagent/execute \
  -H "Content-Type: application/json" \
  -d '{"task": "Go to reddit.com and search for AI news"}'
```

The agent should:
1. Recognize it as a website with a search function
2. Navigate to reddit.com
3. Find and use the search input
4. Complete the task without any Reddit-specific rules

## Future Enhancements

- [ ] Transfer learning between similar platforms
- [ ] Multi-agent collaboration
- [ ] Natural language feedback for learning
- [ ] Autonomous pattern discovery with clustering
- [ ] A/B testing of learned strategies
