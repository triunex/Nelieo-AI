# NELIEO AI OS - 98% ACCURACY IMPLEMENTATION ROADMAP

**Goal**: Build the greatest AI OS product that beats WarmWind OS and Clawdbot
**Timeline**: 3 Weeks
**Target Accuracy**: 98%+
**Target Latency**: 3-5 seconds per action

---

## WEEK 1: CORE ACCURACY IMPROVEMENTS (Days 1-5)

### Day 1-2: OmniParser V2 Integration - MOST CRITICAL
**Impact: +40% accuracy improvement**

| Task | File | Status |
|------|------|--------|
| Create OmniParser module | `superagent/omniparser.py` | DONE |
| Create vision pipeline integration | `superagent/vision_pipeline.py` | DONE |
| Add bounding box detection | `superagent/omniparser.py` | DONE |
| Test on YouTube, Gmail, LinkedIn | - | PENDING |

**Technical Approach:**
```python
# OmniParser detects ALL UI elements with exact coordinates
elements = omniparser.parse(screenshot)
# Returns: [{"text": "Search", "type": "button", "bbox": [640, 120, 720, 145]}, ...]
```

### Day 3-4: Set-of-Mark (SoM) Prompting - SECOND MOST CRITICAL
**Impact: +30% accuracy improvement**

| Task | File | Status |
|------|------|--------|
| Create SoM overlay function | `superagent/som_prompting.py` | DONE |
| Draw numbered boxes on elements | `superagent/som_prompting.py` | DONE |
| Create prompt generator | `superagent/som_prompting.py` | DONE |
| Create response parser | `superagent/som_prompting.py` | DONE |

**Visual Result:**
```
+-------------------------------------------+
| [1] =  [2] Search YouTube...        [3]   |
|-------------------------------------------|
| [4] Trending  [5] Music  [6] Gaming       |
+-------------------------------------------+
LLM Response: {"element": 2, "action": "click", "reason": "Click search box"}
```

### Day 5: Simplified Prompt + Latency Optimization
**Impact: +10% accuracy, -50% latency**

| Task | File | Status |
|------|------|--------|
| Create optimized prompts module | `superagent/optimized_prompts.py` | DONE |
| Replace 365-line prompt with 50-line | `superagent/optimized_prompts.py` | DONE |
| Add adaptive wait times | `superagent/executor.py` | DONE |
| Reduce click wait from 2.5s to 0.3-1.5s | `superagent/executor.py` | DONE |


---

## 📅 WEEK 2: INTELLIGENCE & RELIABILITY (Days 6-10)

### Day 6-7: Reflection Loop
**Impact: +20% accuracy through self-correction**

| Task | File | Status |
|------|------|--------|
| Add post-action reflection | `superagent/enhanced_core.py` | ⬜ |
| Implement error detection | `superagent/enhanced_core.py` | ⬜ |
| Add alternative action suggestions | `superagent/enhanced_core.py` | ⬜ |
| Test recovery from wrong clicks | - | ⬜ |

### Day 8-9: Multi-Agent Review System
**Impact: +15% accuracy through verification**

| Task | File | Status |
|------|------|--------|
| Create Reviewer agent | `superagent/reviewer_agent.py` | ⬜ |
| Actor proposes → Reviewer verifies | `superagent/enhanced_core.py` | ⬜ |
| Add confidence thresholds | `superagent/enhanced_core.py` | ⬜ |

### Day 10: Skills System (like Clawdbot)
**Impact: Modular, reusable automation packages**

| Task | File | Status |
|------|------|--------|
| Create skills architecture | `superagent/skills/` | ⬜ |
| Add Gmail skill | `superagent/skills/gmail.py` | ⬜ |
| Add YouTube skill | `superagent/skills/youtube.py` | ⬜ |
| Add Google Sheets skill | `superagent/skills/sheets.py` | ⬜ |
| Skill discovery & loading | `superagent/skill_manager.py` | ⬜ |

---

## 📅 WEEK 3: COMPETITIVE FEATURES (Days 11-15)

### Day 11-12: WhatsApp/Telegram Channel Integration
**Impact: Users can control Nelieo via messaging apps**

| Task | File | Status |
|------|------|--------|
| Create messaging gateway | `nelieo-gateway/` | ⬜ |
| WhatsApp integration (Baileys) | `nelieo-gateway/whatsapp.py` | ⬜ |
| Telegram integration (python-telegram-bot) | `nelieo-gateway/telegram.py` | ⬜ |
| Connect to SuperAgent API | `nelieo-gateway/bridge.py` | ⬜ |

**User Experience:**
```
User (WhatsApp): "Open YouTube and search for Tiki Tiki song"
Nelieo: "🎬 Opening YouTube..."
Nelieo: "🔍 Searching for 'Tiki Tiki song'..."
Nelieo: "✅ Found it! Playing now."
[Sends screenshot of YouTube playing the song]
```

### Day 13-14: Teaching Mode (like WarmWind)
**Impact: Users demonstrate tasks → AI learns**

| Task | File | Status |
|------|------|--------|
| Create recording module | `superagent/teaching_mode.py` | ⬜ |
| Capture mouse/keyboard events | `superagent/teaching_mode.py` | ⬜ |
| Convert recordings to workflows | `superagent/workflow_learner.py` | ⬜ |
| Store learned workflows | `superagent/workflow_db.py` | ⬜ |

**User Experience:**
```
User: "Teach mode: Show me how to send email in Gmail"
Nelieo: "🎓 Teaching mode ON. I'm watching your actions..."
[User demonstrates: Click Compose → Type → Click Send]
Nelieo: "✅ Learned! I now know how to send emails in Gmail."
```

### Day 15: Proprietary Memory System
**Impact: Agent remembers across sessions, learns from mistakes**

| Task | File | Status |
|------|------|--------|
| Create unified memory hub | `superagent/memory/memory_hub.py` | ⬜ |
| Implement episodic memory | `superagent/memory/episodic.py` | ⬜ |
| Implement semantic memory | `superagent/memory/semantic.py` | ⬜ |
| Add intelligent forgetting | `superagent/memory/forgetting.py` | ⬜ |
| Cross-session memory persistence | `superagent/memory/persistence.py` | ⬜ |

**Memory Types:**
1. **Episodic**: "Last time on YouTube, I clicked here and it worked"
2. **Semantic**: "YouTube search box is always at top center"
3. **Procedural**: "To play a song: Search → Click result → Click play"
4. **Emotional**: "User prefers quick responses over thorough ones"

---

## 🎯 SUCCESS METRICS

| Metric | Current | After Week 1 | After Week 2 | After Week 3 |
|--------|---------|--------------|--------------|--------------|
| **Accuracy** | ~60% | 88% | 95% | **98%** |
| **Latency** | 15-20s | 5-8s | 4-6s | **3-5s** |
| **Apps Supported** | 12 | 12 | 12+ | **Unlimited** |
| **Channels** | Web only | Web only | Web only | **Web + WhatsApp + Telegram** |
| **Learning** | None | None | Skills | **Teaching Mode + Memory** |

---

## 📁 NEW FILE STRUCTURE

```
superagent/
├── enhanced_core.py          # Main agent loop (MODIFIED)
├── advanced_vision.py        # Vision layer (MODIFIED)
├── gemini_vision.py          # Gemini API (MODIFIED)
├── executor.py               # Action executor (MODIFIED)
├── omniparser.py             # NEW: UI element detection
├── som_prompting.py          # NEW: Set-of-Mark overlay
├── reflection.py             # NEW: Self-reflection loop
├── reviewer_agent.py         # NEW: Multi-agent review
├── skill_manager.py          # NEW: Skills loader
├── teaching_mode.py          # NEW: Learn from demonstration
├── workflow_learner.py       # NEW: Convert demos to workflows
├── skills/                   # NEW: Modular skill packages
│   ├── __init__.py
│   ├── gmail.py
│   ├── youtube.py
│   ├── sheets.py
│   └── linkedin.py
└── memory/                   # NEW: Proprietary memory system
    ├── __init__.py
    ├── memory_hub.py
    ├── episodic.py
    ├── semantic.py
    └── persistence.py

nelieo-gateway/               # NEW: Messaging integration
├── __init__.py
├── gateway.py                # Main gateway server
├── whatsapp.py               # WhatsApp channel
├── telegram.py               # Telegram channel
└── bridge.py                 # Connect to SuperAgent
```

---

## 🚀 LET'S START!

**First Task (Starting Now)**: Create OmniParser V2 integration

This is the #1 most impactful change. Once we have accurate element detection,
everything else becomes much easier:
- No more guessing coordinates
- No more clicking wrong places
- No more hallucinations

---

**Last Updated**: 2026-01-27
**Status**: 🟢 IN PROGRESS
