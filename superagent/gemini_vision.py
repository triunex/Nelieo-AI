"""
Gemini Vision API Adapter for SuperAgent
Supports both AI Studio (free tier) and Vertex AI (paid with credits)
"""

import os
import time
import base64
import json
import logging
from io import BytesIO
from typing import Dict, Any, Optional, List

import requests
from PIL import Image

logger = logging.getLogger(__name__)

# Try to import Vertex AI SDK (optional)
try:
    import vertexai
    from vertexai.generative_models import GenerativeModel, Part, GenerationConfig
    VERTEX_AI_AVAILABLE = True
except ImportError:
    VERTEX_AI_AVAILABLE = False
    logger.info("Vertex AI SDK not installed. Using AI Studio API only.")


class RateLimitError(Exception):
    """Raised when Gemini rate limits persist after retries."""


class GeminiVisionAPI:
    """
    Gemini Vision API - FREE tier with great vision capabilities
    
    Features:
    - Free tier: 15 requests/minute
    - Excellent vision understanding
    - Fast responses (~2-4s)
    """
    
    def __init__(
        self,
        api_key: str,
        model: str = "gemini-2.5-flash",  # Correct model name
        timeout: int = 30,
        fallback_api: Optional[Any] = None,
        min_call_interval: Optional[float] = None,
        use_vertex_ai: bool = None,  # Auto-detect if None
        vertex_project: str = None,
        vertex_location: str = "us-central1",
        **kwargs: Any
    ):
        self.api_key = api_key
        self.model = model
        self.timeout = timeout
        self.base_url = f"https://generativelanguage.googleapis.com/v1/models/{model}:generateContent"
        self.fallback_api = fallback_api
        # 🚀 RATE LIMIT FIX: 1 second is enough - we're using Vertex AI (higher quota)
        self.min_call_interval = max(min_call_interval or 1.0, 1.0)  # Reduced from 2 to 1 second
        self._last_call_time = 0.0
        
        # Vertex AI configuration
        self.vertex_project = vertex_project or os.getenv('GCP_PROJECT_ID') or os.getenv('GOOGLE_CLOUD_PROJECT')
        self.vertex_location = vertex_location
        
        # Auto-detect: Use Vertex AI if credentials available and project set
        if use_vertex_ai is None:
            # Check for Vertex AI credentials
            has_vertex_creds = (
                os.getenv('GOOGLE_APPLICATION_CREDENTIALS') or 
                os.getenv('GOOGLE_CLOUD_PROJECT') or
                self.vertex_project
            )
            self.use_vertex_ai = VERTEX_AI_AVAILABLE and has_vertex_creds and bool(self.vertex_project)
        else:
            self.use_vertex_ai = use_vertex_ai and VERTEX_AI_AVAILABLE
        
        # Initialize Vertex AI if enabled
        self.vertex_model = None
        if self.use_vertex_ai:
            if not self.vertex_project:
                logger.error("Vertex AI enabled but no GCP project ID provided. Falling back to AI Studio.")
                self.use_vertex_ai = False
            else:
                try:
                    vertexai.init(project=self.vertex_project, location=self.vertex_location)
                    self.vertex_model = GenerativeModel(self.model)
                    logger.info(f"✅ Vertex AI initialized (project: {self.vertex_project}, model: {model})")
                except Exception as e:
                    logger.error(f"Failed to initialize Vertex AI: {e}. Falling back to AI Studio.")
                    self.use_vertex_ai = False
        
        if not self.use_vertex_ai:
            logger.info(f"Using AI Studio API (model: {model})")

        if kwargs:
            logger.warning(
                "Ignored unsupported GeminiVisionAPI kwargs: %s",
                ", ".join(sorted(map(str, kwargs.keys())))
            )
        
        # Stats
        self.total_calls = 0
        self.success_count = 0
        self.total_time = 0.0
        self.avg_response_time = 0.0
        
        # 🚀 Context Caching: Cache static prompt parts (saves 60% tokens)
        self._cached_system_prompt = None
        self._cache_created_at = 0
        self._cache_ttl = 3600  # 1 hour cache lifetime
    
    def analyze_screen(
        self,
        screenshot: Image.Image,
        task: str,
        context: Dict[str, Any],
        mode: str = "action"
    ) -> Dict[str, Any]:
        """Main entry point for screen analysis"""
        
        start_time = time.time()
        
        try:
            # Build prompt
            prompt = self._build_prompt(task, context, mode)
            
            # Encode image
            img_base64 = self._encode_image(screenshot)
            
            # Call Gemini API
            response = self._call_gemini_api(prompt, img_base64)
            
            # Parse response
            result = self._parse_response(response)
            
            # Update stats
            duration = time.time() - start_time
            self.total_calls += 1
            self.total_time += duration
            self.avg_response_time = self.total_time / self.total_calls
            self.success_count += 1
            
            logger.info(f"Gemini API: {duration:.2f}s, avg: {self.avg_response_time:.2f}s")
            
            return result
            
        except RateLimitError as rate_err:
            logger.warning("Gemini rate limit exhausted - delegating to fallback if available")
            duration = time.time() - start_time
            self.total_calls += 1
            self.total_time += duration

            if self.fallback_api:
                return self.fallback_api.analyze_screen(screenshot, task, context, mode)

            return self._create_fallback_response(task, str(rate_err))

        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            duration = time.time() - start_time
            self.total_calls += 1
            self.total_time += duration

            if self.fallback_api:
                logger.warning("Delegating to fallback vision API after Gemini failure")
                return self.fallback_api.analyze_screen(screenshot, task, context, mode)
            
            # Return safe fallback
            return self._create_fallback_response(task, str(e))
    
    def _build_prompt(self, task: str, context: Dict[str, Any], mode: str) -> str:
        """Build UNIVERSAL GENERAL INTELLIGENCE prompt - works on ANY platform"""
        
        last_action = context.get('last_action', 'None')
        steps = context.get('steps', 0)
        max_steps = context.get('max_steps', 20)
        history = context.get('history', [])
        
        history_str = "None"
        if history:
            history_str = "\n".join(f"  {i+1}. {h}" for i, h in enumerate(history[-5:]))
        
        # 🚫 Anti-repetition warning
        last_action_warning = context.get('last_action_warning', '')
        
        # State tracking
        last_typed_url = context.get('last_typed_url')
        url_was_typed_recently = context.get('url_was_typed_recently', False)
        last_typed_search = context.get('last_typed_search')
        search_was_typed_recently = context.get('search_was_typed_recently', False)
        
        state_warnings = []
        if last_action_warning and "STOP REPEATING" in last_action_warning:
            state_warnings.append(last_action_warning)
        if url_was_typed_recently and last_typed_url:
            state_warnings.append(f"⚠️ URL '{last_typed_url}' was JUST typed - DO NOT retype it!")
        if search_was_typed_recently and last_typed_search:
            state_warnings.append(f"⚠️ Search '{last_typed_search}' was JUST submitted - click results, don't retype!")
        state_msg = "\n".join(state_warnings) if state_warnings else ""
        
        # 🧬 Self-Evolution learned context
        evolution_context = context.get('evolution_context', '')
        evolution_section = ""
        if evolution_context:
            evolution_section = f"""
🧬 LEARNED EXPERIENCE:
{evolution_context}
"""
        
        # Accessibility tree
        accessibility_tree = context.get('accessibility_tree', [])
        ui_tree_str = ""
        if accessibility_tree:
            ui_tree_lines = []
            for elem in accessibility_tree[:30]:
                elem_type = elem.get('type', 'unknown')
                elem_text = elem.get('text', '').strip()
                center = elem.get('center', [0, 0])
                if elem_text:
                    ui_tree_lines.append(f"  {elem_type}: \"{elem_text[:50]}\" at ({center[0]}, {center[1]})")
            if ui_tree_lines:
                ui_tree_str = "UI ELEMENTS DETECTED:\n" + "\n".join(ui_tree_lines)
        
        # 🧠 UNIVERSAL GENERAL INTELLIGENCE PROMPT
        return f"""You are a UNIVERSAL INTELLIGENT AGENT with superhuman computer vision and reasoning.
You can operate ANY software, website, or application - not just predefined ones.
You understand interfaces by REASONING about what you see, not by memorizing rules.

═══════════════════════════════════════════════════════════════════════════════
🎯 TASK: {task}
═══════════════════════════════════════════════════════════════════════════════

📊 STATE:
- Progress: Step {steps}/{max_steps}
- Last Action: {last_action}
- History: {history_str}
{state_msg}
{evolution_section}
{ui_tree_str}

═══════════════════════════════════════════════════════════════════════════════
🧠 UNIVERSAL REASONING FRAMEWORK
═══════════════════════════════════════════════════════════════════════════════

STEP 1: PERCEIVE - What do I see?
- Identify the application/website (browser, desktop app, terminal, etc.)
- Read ALL visible text carefully
- Locate interactive elements: buttons, links, inputs, icons, menus
- Note the current state (logged in? form filled? page loaded?)

STEP 2: UNDERSTAND - What does it mean?
- Map visual elements to their PURPOSE (not just appearance)
- A text box near "Search" → search input
- A colored rectangle with text → button
- Underlined/colored text → clickable link
- Icon + text row → list item / menu option
- Text in a field → current input value

STEP 3: PREDICT - What happens next?
- Before acting, mentally simulate: "If I click X, what will happen?"
- Navigation: URL → new page loads
- Button click: Form submits / action triggers
- Text input: Characters appear in focused field
- Anticipate loading times, popups, confirmations

STEP 4: DECIDE - What's the optimal action?
- Choose the action that makes MAXIMUM PROGRESS toward goal
- Prefer: Keyboard shortcuts > Direct clicks > Navigation
- Avoid: Repetition, unnecessary verification, perfectionism

STEP 5: ACT - Execute with precision
- Click: Target the CENTER of elements
- Type: Ensure input field is focused first
- Navigate: Use address bar or links appropriately

═══════════════════════════════════════════════════════════════════════════════
🌐 UNIVERSAL INTERFACE PATTERNS (Apply to ANY Platform)
═══════════════════════════════════════════════════════════════════════════════

NAVIGATION:
- Address bar / URL bar: Usually top of browser, shows current URL
- Search box: Input field with magnifying glass icon or "Search" placeholder
- Menu: Horizontal items at top, or hamburger (≡) icon
- Sidebar: Vertical navigation on left or right
- Breadcrumbs: Path showing current location (Home > Category > Item)

INPUT ELEMENTS:
- Text field: Rectangular area, often with border, placeholder text
- Dropdown: Field with arrow (▼) - click to expand options
- Checkbox: Small square, click to toggle ✓
- Radio button: Small circle, select one of many
- Date picker: Calendar icon, click to select date
- File upload: "Browse" or "Choose file" button

ACTION BUTTONS:
- Primary action: Usually colored (blue, green) - "Submit", "Save", "Send"
- Secondary action: Usually gray/outlined - "Cancel", "Back", "Reset"
- Destructive action: Usually red - "Delete", "Remove"
- Icons: Common patterns - ✏️ edit, 🗑️ delete, ➕ add, 🔍 search, ⬇️ download

CONTENT PATTERNS:
- Lists: Repeating rows/cards with similar structure
- Tables: Grid of data with headers
- Forms: Collection of labeled inputs
- Cards: Boxed content with title, image, or details
- Modals/Dialogs: Overlay window requiring action

═══════════════════════════════════════════════════════════════════════════════
⚡ SUPERHUMAN SPEED RULES
═══════════════════════════════════════════════════════════════════════════════

1. ONE ACTION per response - choose the SINGLE most impactful action
2. NEVER repeat an action that was just performed
3. If goal is achieved → IMMEDIATELY return "done"
4. Keyboard shortcuts are FASTER than clicking (Ctrl+S, Ctrl+Enter, Tab, Enter)
5. Don't verify success - trust the action and proceed
6. Ignore cosmetic issues (notifications, popups, styling)
7. If stuck after 2 tries → try a DIFFERENT approach

🔥 ADVANCED TECHNIQUES:
- To open link in NEW TAB: Use Ctrl+Click or Middle-click or right-click → "Open in new tab"
- To scroll page: Use scroll action with amount (positive=down, negative=up)
- If links not clicking: Try Ctrl+Click to force new tab, or scroll to find better target
- If page not loading: Wait 3-5 seconds, then proceed
- If search results: Scroll down to see more results if needed

═══════════════════════════════════════════════════════════════════════════════
📝 RESPONSE FORMAT (COMPACT JSON - Use abbreviated keys for speed)
═══════════════════════════════════════════════════════════════════════════════

{{
  "o": "What I see (1 sentence)",
  "u": "What it means (1 sentence)", 
  "p": "What happens next (1 sentence)",
  "c": 0.0-1.0,
  "a": {{
    "t": "click|type|hotkey|scroll|wait|done|open_app",
    "x": <pixel_x>,
    "y": <pixel_y>,
    "text": "text to type",
    "keys": ["key1", "key2"],
    "amt": <scroll pixels>,
    "app": "app name",
    "r": "why"
  }}
}}

KEY MAPPING:
o=observation, u=understanding, p=prediction, c=confidence, a=action
t=type, r=reason, amt=amount

ACTION TYPES:
- click: Click (x,y) | type: Type text | hotkey: Keys ["ctrl","c"]
- scroll: amt pixels (negative=up, positive=down) | wait: Page load | done: Complete
- open_app: Launch by name

ADVANCED EXAMPLES:
- Open link in new tab: {{"t":"hotkey","keys":["ctrl"],"x":200,"y":300,"r":"Ctrl+Click to open in new tab"}}
- Scroll down to see more: {{"t":"scroll","amt":500,"r":"Scroll to see more results"}}
- Scroll up: {{"t":"scroll","amt":-300,"r":"Scroll back up"}}

RESPOND WITH COMPACT JSON ONLY:"""
    
    def _encode_image(self, screenshot: Image.Image) -> str:
        """Encode image for Gemini API"""
        
        # Resize if too large
        max_size = 1920
        if screenshot.width > max_size or screenshot.height > max_size:
            ratio = max_size / max(screenshot.width, screenshot.height)
            new_size = (int(screenshot.width * ratio), int(screenshot.height * ratio))
            screenshot = screenshot.resize(new_size, Image.Resampling.LANCZOS)
        
        # Convert to JPEG (Gemini prefers JPEG)
        buffer = BytesIO()
        screenshot.save(buffer, format='JPEG', quality=85)
        img_bytes = buffer.getvalue()
        
        return base64.b64encode(img_bytes).decode('utf-8')
    
    def _call_gemini_api(self, prompt: str, img_base64: str, max_retries: int = 3) -> Dict:
        """Call Gemini API with retry logic - supports both Vertex AI and AI Studio"""
        
        # Use Vertex AI if enabled (no rate limits with paid credits)
        if self.use_vertex_ai and self.vertex_model:
            return self._call_vertex_ai(prompt, img_base64, max_retries)
        
        # Otherwise use AI Studio (free tier with rate limits)
        for attempt in range(max_retries):
            try:
                if self.min_call_interval:
                    elapsed = time.time() - self._last_call_time
                    if elapsed < self.min_call_interval:
                        wait_remaining = self.min_call_interval - elapsed
                        if wait_remaining > 0:
                            logger.debug(
                                "Respecting Gemini min_call_interval %.2fs (sleep %.2fs)",
                                self.min_call_interval,
                                wait_remaining
                            )
                            time.sleep(wait_remaining)

                response = requests.post(
                    f"{self.base_url}?key={self.api_key}",
                    headers={"Content-Type": "application/json"},
                    json={
                        "contents": [{
                            "parts": [
                                {"text": prompt},
                                {
                                    "inline_data": {
                                        "mime_type": "image/jpeg",
                                        "data": img_base64
                                    }
                                }
                            ]
                        }],
                        "generationConfig": {
                            "temperature": 0.1,  # Lower = more focused, less hallucination
                            "maxOutputTokens": 2048,
                            "topP": 0.8,  # Focus on most likely tokens
                            "topK": 40    # Limit token choices for consistency
                        }
                    },
                    timeout=self.timeout
                )

                self._last_call_time = time.time()
                
                # FIX #4: Handle 429 rate limiting specifically
                if response.status_code == 429:
                    wait_time = (2 ** attempt) * 5  # 5s, 10s, 20s
                    logger.warning(f"⏳ Rate limited (429). Waiting {wait_time}s...")
                    time.sleep(wait_time)

                    if attempt == max_retries - 1:
                        logger.error("Rate limit persists after retries")
                        raise RateLimitError("Gemini rate limit persisted after retries")
                    continue
                
                response.raise_for_status()
                return response.json()
                
            except requests.exceptions.Timeout:
                if attempt < max_retries - 1:
                    wait = 2 ** attempt
                    logger.warning(f"Timeout, retry {attempt+1}/{max_retries} after {wait}s")
                    time.sleep(wait)
                else:
                    raise
                    
            except requests.exceptions.RequestException as e:
                logger.error(f"Gemini API call failed: {e}")
                if attempt < max_retries - 1:
                    time.sleep(1)
                else:
                    raise
    
    def _call_vertex_ai(self, prompt: str, img_base64: str, max_retries: int = 3) -> Dict:
        """Call Vertex AI (uses GCP credits, has higher quotas - minimal rate limiting)"""
        # Adaptive rate limiting parameters
        # `self.min_call_interval` is used as the CURRENT interval (can be adjusted on 429)
        # We'll keep a baseline and a max to prevent runaway backoffs
        baseline = getattr(self, '_min_call_interval_baseline', 1.0)
        max_interval = getattr(self, '_max_call_interval', 6.0)
        # initialize helpers
        if not hasattr(self, '_consecutive_successes'):
            self._consecutive_successes = 0
        if not hasattr(self, '_min_call_interval_baseline'):
            self._min_call_interval_baseline = baseline
        if not hasattr(self, '_max_call_interval'):
            self._max_call_interval = max_interval

        for attempt in range(max_retries):
            try:
                # Enforce adaptive minimum interval between calls
                elapsed = time.time() - self._last_call_time
                wait_for = max(0.0, self.min_call_interval - elapsed)
                if wait_for > 0:
                    logger.info(f"⏳ Waiting {wait_for:.2f}s to respect adaptive rate limit ({self.min_call_interval:.2f}s)")
                    time.sleep(wait_for)

                # Decode base64 image for Vertex AI
                img_bytes = base64.b64decode(img_base64)

                # Create parts for Vertex AI
                image_part = Part.from_data(data=img_bytes, mime_type="image/jpeg")
                text_part = Part.from_text(prompt)

                # Generate content
                generation_config = GenerationConfig(
                    temperature=0.1,
                    max_output_tokens=2048,
                    top_p=0.8,
                    top_k=40
                )

                response = self.vertex_model.generate_content(
                    [text_part, image_part],
                    generation_config=generation_config
                )

                # Success - update last call time and success counter
                self._last_call_time = time.time()
                self._consecutive_successes = getattr(self, '_consecutive_successes', 0) + 1

                # Gradually decay interval back to baseline after several successes
                if self._consecutive_successes >= 5 and self.min_call_interval > self._min_call_interval_baseline:
                    old = self.min_call_interval
                    self.min_call_interval = max(self._min_call_interval_baseline, self.min_call_interval * 0.9)
                    logger.info(f"⬇️ Reducing adaptive interval from {old:.2f}s to {self.min_call_interval:.2f}s after successes")
                    self._consecutive_successes = 0

                # Convert Vertex AI response to AI Studio format
                return {
                    'candidates': [{
                        'content': {
                            'parts': [{'text': response.text}]
                        },
                        'finishReason': 'STOP'
                    }]
                }

            except Exception as e:
                # Detect rate limit style errors from Vertex API
                err_msg = str(e)
                logger.error(f"Vertex AI call failed (attempt {attempt+1}/{max_retries}): {e}")

                if '429' in err_msg or 'Resource exhausted' in err_msg or 'rate limit' in err_msg.lower():
                    # Increase adaptive interval to avoid further 429s
                    old_interval = self.min_call_interval
                    new_interval = min(self._max_call_interval, max(self.min_call_interval * 1.5, self.min_call_interval + 1.0))
                    self.min_call_interval = new_interval
                    self._consecutive_successes = 0
                    backoff = min(2 ** attempt, 16)
                    logger.warning(f"⏳ Vertex AI rate limited (429). Increasing adaptive interval {old_interval:.2f}s -> {self.min_call_interval:.2f}s and sleeping {backoff}s before retry")
                    time.sleep(backoff)
                    continue

                # Other transient errors: exponential backoff
                if attempt < max_retries - 1:
                    wait = min(2 ** attempt, 8)
                    logger.warning(f"Transient error, retrying after {wait}s")
                    time.sleep(wait)
                    continue
                else:
                    raise
    
    def _parse_response(self, api_response: Dict) -> Dict[str, Any]:
        """Parse Gemini response into structured action"""

        try:
            candidate = api_response.get('candidates', [{}])[0]
            finish_reason = candidate.get('finishReason', '')

            if finish_reason == 'MAX_TOKENS':
                logger.warning("Response truncated due to MAX_TOKENS - using fallback")
                return self._create_fallback_response("", "MAX_TOKENS")

            content = candidate.get('content', {})
            parts = content.get('parts', [])

            text = self._collect_response_text(parts)
            if not text:
                raise ValueError("Missing text in response")

            cleaned = self._strip_code_fences(text)
            json_objects = self._extract_json_objects(cleaned)

            if not json_objects:
                raise ValueError("No JSON objects found in response")

            primary: Optional[Dict[str, Any]] = None
            extras: List[Dict[str, Any]] = []

            for obj in json_objects:
                if not isinstance(obj, dict):
                    continue

                # Handle both compact ('a') and full ('action') keys
                if not primary and (obj.get('action') or obj.get('a')):
                    primary = obj
                    continue

                extras.append(obj)

            if not primary:
                raise ValueError("Missing 'action' or 'a' field in response")

            if extras:
                primary['_extra'] = extras

            return primary

        except (json.JSONDecodeError, KeyError, ValueError, IndexError) as e:
            logger.error(f"Failed to parse Gemini response: {e}")
            logger.error(f"Response: {str(api_response)[:500]}")
            raise

    def _collect_response_text(self, parts: List[Dict[str, Any]]) -> str:
        """Concatenate textual parts from Gemini response"""
        if not parts:
            return ""

        texts: List[str] = []
        for part in parts:
            if isinstance(part, dict):
                value = part.get('text')
                if value:
                    texts.append(str(value))

        return "\n".join(texts).strip()

    def _strip_code_fences(self, text: str) -> str:
        """Remove markdown code fences surrounding JSON"""
        stripped = text.strip()

        if stripped.startswith('```'):
            stripped = stripped[3:]
            if stripped.startswith('json'):
                stripped = stripped[4:]
            stripped = stripped.lstrip('\n')
        if stripped.endswith('```'):
            stripped = stripped[:-3]

        if '```json' in stripped:
            stripped = stripped.split('```json', 1)[1]
        if '```' in stripped:
            stripped = stripped.split('```', 1)[0]

        return stripped.strip()

    def _extract_json_objects(self, text: str) -> List[Dict[str, Any]]:
        """Extract all JSON objects from the raw text"""
        objects: List[Dict[str, Any]] = []
        if not text:
            return objects

        depth = 0
        start = None
        for idx, char in enumerate(text):
            if char == '{':
                if depth == 0:
                    start = idx
                depth += 1
            elif char == '}':
                if depth == 0:
                    continue
                depth -= 1
                if depth == 0 and start is not None:
                    snippet = text[start:idx + 1]
                    try:
                        objects.append(json.loads(snippet))
                    except json.JSONDecodeError:
                        logger.debug("Skipping invalid JSON snippet from Gemini response")
                    start = None

        if not objects:
            try:
                objects.append(json.loads(text))
            except json.JSONDecodeError:
                pass

        return objects

    def extract_text(self, screenshot: Image.Image) -> str:
        """Lightweight OCR fallback powered by Gemini"""

        prompt = (
            "Extract every readable word from the screenshot. "
            "Respond ONLY with JSON: {\"text\": \"exact text with original spacing\"}."
        )

        img_base64 = self._encode_image(screenshot)

        try:
            response = self._call_gemini_api(prompt, img_base64)
            candidate = response.get('candidates', [{}])[0]
            content = candidate.get('content', {})
            parts = content.get('parts', [])
            raw_text = self._collect_response_text(parts)
            cleaned = self._strip_code_fences(raw_text)
            for obj in self._extract_json_objects(cleaned):
                if isinstance(obj, dict) and 'text' in obj:
                    return str(obj.get('text', '')).strip()

            logger.warning("Gemini OCR fallback returned no text field")
        except Exception as exc:
            logger.warning(f"Gemini OCR fallback failed: {exc}")
            if self.fallback_api and hasattr(self.fallback_api, 'extract_text'):
                logger.info("Using fallback API to extract text")
                try:
                    return self.fallback_api.extract_text(screenshot)
                except Exception as fallback_exc:
                    logger.warning(f"Fallback OCR also failed: {fallback_exc}")
            elif self.fallback_api and hasattr(self.fallback_api, 'analyze_screen'):
                logger.info("Using fallback API vision response to extract text")
                try:
                    fallback_result = self.fallback_api.analyze_screen(
                        screenshot,
                        "Extract text",
                        {'mode': 'ocr'},
                        mode="action"
                    )
                    if isinstance(fallback_result, dict):
                        text = fallback_result.get('ocr_data', {}).get('text_content')
                        if text:
                            return str(text)
                except Exception as fallback_exc:
                    logger.warning(f"Fallback analyze_screen failed: {fallback_exc}")

        return ""
    
    def _create_fallback_response(self, task: str, error: str) -> Dict[str, Any]:
        """Create safe fallback when API fails"""
        
        logger.warning(f"Using fallback response due to: {error}")
        
        return {
            'observation': 'API error occurred',
            'current_app': 'unknown',
            'last_success': False,
            'next_step': 'Wait and retry',
            'confidence': 0.0,
            'action': {
                'type': 'wait',
                'amount': 2,
                'target': 'system',
                'reason': f'API error: {error}',
                'expected_outcome': 'System recovers'
            }
        }
    
    def get_stats(self) -> Dict[str, Any]:
        """Get performance statistics"""
        return {
            'total_calls': self.total_calls,
            'success_count': self.success_count,
            'success_rate': self.success_count / max(self.total_calls, 1),
            'avg_response_time': self.avg_response_time,
            'total_time': self.total_time
        }
    
    def get_action(
        self,
        screenshot: Image.Image,
        task: str,
        context: Dict[str, Any],
        mode: str = "action"
    ) -> Optional['Action']:
        """
        Get next action from vision API (wrapper for analyze_screen)
        Returns Action object or None
        """
        from .actions import Action, ActionType
        
        # Analyze screen using vision API
        result = self.analyze_screen(screenshot, task, context, mode)
        
        if not result or 'action' not in result:
            return None
        
        # Convert result to Action object
        try:
            # Extract action dict
            action_data = result['action']
            action_type = ActionType[action_data['type'].upper()]
            
            return Action(
                type=action_type,
                x=action_data.get('x'),
                y=action_data.get('y'),
                text=action_data.get('text'),
                keys=action_data.get('keys'),
                amount=action_data.get('amount'),
                target=action_data.get('target'),
                reason=action_data.get('reason', ''),
                confidence=result.get('confidence', 0.0),
                expected_outcome=action_data.get('expected_outcome')
            )
        except Exception as e:
            logger.error(f"Failed to create Action from result: {e}")
            logger.error(f"Result structure: {result}")
            return None
    
    def verify_action(
        self,
        screenshot_before: Image.Image,
        screenshot_after: Image.Image,
        expected_outcome: str
    ) -> bool:
        """
        Verify if action achieved expected outcome
        """
        # Use verify mode to check outcome
        context = {
            'expected_outcome': expected_outcome,
            'verification': True
        }
        
        result = self.analyze_screen(
            screenshot_after,
            f"Verify: {expected_outcome}",
            context,
            mode="verify"
        )
        
        return result.get('success', False)
