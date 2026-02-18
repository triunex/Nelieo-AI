**AI OS — Nelieo**

Purpose
- A concise, practical guide for developers and operators to understand, run, maintain and improve the Nelieo AI OS. This document separates the AI OS components from the search-engine project bits, summarizes current failures and bottlenecks, and provides commands, logs and troubleshooting steps.

1) High-level overview
- Nelieo AI OS is a multi-platform screen automation and agent orchestration system. It uses:
  - An Enhanced SuperAgent engine (strategic → tactical → operational planning).
  - Advanced Vision layer (OCR + UI detection) to understand screens.
  - Action Executor to perform OS-level interactions (click, type, hotkeys, scroll).
  - Containerized runtime for reproducibility (Docker compose files included).

2) Goals for production-ready AI OS
- High accuracy (95%+ success) across hours-long workflows.
- Low-latency actions — target 5–10s per action average for complex tasks.
- Robust multi-goal task completion (detect and complete multiple sequential goals).
- Semantic bridge to control apps without relying on pixel-vision whenever possible.

3) Known failures and bottlenecks (current state)
- Global fixed-rate waiting: earlier logic enforced a 5s wait between every LLM/vision call. This eliminated 429s but slowed the system drastically.
- Click/typing loops: agent sometimes repeated clicks or typing when page didn't change. Root cause: unreliable page-change detection and inadequate URL/HTML checks.
- Multi-goal planning regressions: strategic planner sometimes returned a single step fallback instead of splitting on "then"/"and then". This caused workflows to stop early.
- Vertex AI 429 errors: burst usage can exhaust quota; naive fixed intervals either cause 429s or slow the agent.
- Vision cost and latency: heavy vision/LLM usage for every step increases cost and latency.

4) What we changed (recent fixes - summary)
- Compact JSON communication format reduced token usage ~67%.
- Smart verification skipping when confidence > 0.9.
- Ctrl+Click and scroll unstuck strategies implemented in executor.
- Adaptive rate-limiter added: starts at 1s and increases on 429s, decays back after successful calls.
- Strategic planner: added direct parsing for "then/and then" to produce multiple strategic steps for multi-goal tasks.
- Added URL-change detection, screenshot diffs and longer wait-after-click logic (tunable) to reduce click-loops.

5) Current issues still to address (priority)
- Make adaptive rate-limiter more conservative under burst load and add token usage monitoring.
- Improve page-change detection: combine URL/title checks, DOM/title diff, and screenshot diffs.
- Replace vision-heavy steps with platform-specific adapters (ADB for Android, UIA for Windows, Accessibility/AppleScript for macOS, AT-SPI for Linux).
- Create accurate, low-latency verification checks that avoid full LLM roundtrips.

6) Docker containers and how to run
- Primary compose files:
  - docker-compose.aios.yml — AI OS runtime (main container: aios_nelieo_phase1)
  - docker-compose.demo.yml — demo services (chrome_xpra etc.)

- Build & run (AI OS production-like):
```powershell
docker compose -f docker-compose.aios.yml up -d --build
```

- Demo (Chrome/Xpra):
```powershell
docker compose -f docker-compose.demo.yml up -d --build chrome_xpra
```

- Check containers:
```powershell
docker ps -a
docker logs -f aios_nelieo_phase1
```

7) Important logs and locations
- Agent stdout/stderr (supervisor logs): /var/log/supervisor/agent_api_stdout.log
- Agent memory & evolution: /var/log/superagent_memory.json
- App-level logs in repo: check /var/log and /var/log/superagent_*.log inside container

8) Key folders and files (AI OS vs Search Engine)
- AI OS (core agent + UI automation + deployments):
  - superagent/ — core agent engine, vision adapters, executor, workflows (primary focus)
    - superagent/enhanced_core.py — main EnhancedSuperAgent loop (planning + execution)
    - superagent/executor.py — action execution (click, type, hotkey, scroll, android adapters later)
    - superagent/advanced_vision.py — OCR + UI detection orchestration
    - superagent/gemini_vision.py — Gemini / Vertex AI integration + adaptive rate limiter
    - superagent/openai_vision.py — fallback vision provider
    - superagent/workflows.py — multi-app workflow engine
    - superagent/memory.py / working_memory.py — self-evolution and experience storage

- Android-native (planned):
  - superagent/android/adb_bridge.py (proposed) — ADB actions & UI tree extraction
  - superagent/executor.py modifications: android_* handlers

- Search Engine / Other Project files (separate, do not modify for AI OS core unless integrating):
  - public/, src/, frontend/ etc. (UI search engine assets)
  - Examples/, test-frontend.html — search-demo pages
  - README_INTEGRATION.md, quick-start scripts for web-search functionality

9) Maintenance & daily operations checklist
- Start agents: run compose as shown above.
- Monitor logs for 429s and long waits: grep for "Waiting .*s" and "429" in agent_api_stdout.log.
- Check evolution stats: HTTP API endpoint `/api/superagent/evolution` on agent port (default 10000).
- Restart agent if unresponsive:
```powershell
docker restart aios_nelieo_phase1
```
- Back up memory and learned patterns regularly: /var/log/superagent_memory.json

10) Developer onboarding (quick path)
- Code to focus on first (in order):
  1. `superagent/enhanced_core.py` — OODA loop, planners, stuck recovery
  2. `superagent/executor.py` — low-level actions; add platform adapters here
  3. `superagent/advanced_vision.py` and `superagent/gemini_vision.py` — tuning vision + rate limits
  4. `superagent/working_memory.py` — self-evolution patterns and telemetry

- Quick tests to run locally:
  - Start container, call API endpoint `/api/superagent/execute` with a small task JSON
  - Watch logs and the `Task completed` messages to verify behavior

11) Recommended immediate roadmap (next 4 weeks)
- Week 1: Implement Android ADB bridge prototype and `android_*` executor handlers (reduce vision dependency)
- Week 2: Improve adaptive rate-limiter + metrics (token counts, per-minute calls) and implement exponential decay logic
- Week 3: Implement fast verification shortcuts (URL/title checks, DOM hashes) to skip LLM when confident
- Week 4: Add telemetry dashboards for action latency, 429 counts, success rate; prioritize top 10 flaky workflows for tool-mastery

12) Security, privacy and compliance notes
- Sensitive apps (banking, payments) must be gated behind explicit user consent and human-in-loop confirmations.
- Store audit logs for every sensitive action with timestamps and reasons.
- Minimize data sent to cloud LLMs; prefer local LLMs or compact JSON and selective screenshots.

13) Troubleshooting quick guide
- If tasks are too slow: check for frequent "Waiting Xs" messages and 429s. Tune `superagent/gemini_vision.py` min_call_interval and adaptive logic.
- If agent repeats clicks/typing: verify page-change detection (URL checks and screenshot diffs), increase post-click wait slightly, or use Ctrl+Click fallback.
- If multi-goal tasks stop early: inspect strategic planner logs in `enhanced_core.py` and test planner prompt. Add direct keyword splitting if necessary.

14) Where to contribute changes (code pointers)
- Make small PRs focused on one subsystem at a time (Executor, Vision, Planner, Memory). Use `test-complex-workflows.py` to add regression tests.
- Follow existing code style. Run quick smoke tests in container before opening PR.

15) Useful commands summary
- Build & run AI OS:
```powershell
docker compose -f docker-compose.aios.yml up -d --build
```
- Run demo Chrome/Xpra:
```powershell
docker compose -f docker-compose.demo.yml up -d --build chrome_xpra
```
- Tail agent logs:
```powershell
docker exec aios_nelieo_phase1 bash -c "tail -f /var/log/supervisor/agent_api_stdout.log"
```
- Restart agent:
```powershell
docker restart aios_nelieo_phase1
```

Appendix A — Useful file links
- Core agent: [superagent](superagent/)
- Agent API: [aios-xpra-app/agent-api.py](aios-xpra-app/agent-api.py)
- Executor: [superagent/executor.py](superagent/executor.py)
- Vision (Gemini/Vertex): [superagent/gemini_vision.py](superagent/gemini_vision.py)
- Enhanced agent loop: [superagent/enhanced_core.py](superagent/enhanced_core.py)

Appendix B — Contact & context
- For urgent production issues, inspect Docker container logs and restart the agent container.
- Developer questions: create an issue in the repo with logs and a short reproducible task description.

---
End of guide.
