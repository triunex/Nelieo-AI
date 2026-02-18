"""
Advanced Vision Analysis Module

Enhancements over basic vision:
1. OCR text extraction
2. UI element detection and classification
3. Layout analysis
4. Semantic understanding of UI context
5. Change detection between screenshots
6. Confidence scoring for all detections
"""

import os
import time
import logging
import hashlib
from typing import Dict, Any, Optional, List, Tuple
from PIL import Image, ImageDraw, ImageFont
import base64
from io import BytesIO
import json

logger = logging.getLogger(__name__)

# Optional: pytesseract for OCR (install separately)
try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    logger.warning("pytesseract not available - OCR features disabled")

# OmniParser V2 - Microsoft's SOTA UI element detection
OMNIPARSER_AVAILABLE = False
omniparser_instance = None
try:
    from .omniparser import OmniParserV2, check_omniparser_available
    status = check_omniparser_available()
    if status.get('ultralytics') and status.get('torch'):
        OMNIPARSER_AVAILABLE = True
        logger.info("OmniParser V2 available - SOTA UI detection enabled")
    else:
        logger.warning(f"OmniParser V2 dependencies missing: {status}")
except ImportError as e:
    logger.warning(f"OmniParser V2 not available: {e}")


class UIElement:
    """Detected UI element with metadata"""
    def __init__(
        self,
        element_type: str,
        bbox: Tuple[int, int, int, int],
        text: Optional[str] = None,
        confidence: float = 0.0,
        attributes: Optional[Dict] = None
    ):
        self.element_type = element_type  # button, textbox, menu, etc.
        self.bbox = bbox  # (x, y, width, height)
        self.text = text
        self.confidence = confidence
        self.attributes = attributes or {}
    
    @property
    def center(self) -> Tuple[int, int]:
        """Get center point of element"""
        x, y, w, h = self.bbox
        return (x + w // 2, y + h // 2)
    
    def to_dict(self) -> Dict:
        return {
            'type': self.element_type,
            'bbox': self.bbox,
            'center': self.center,
            'text': self.text,
            'confidence': self.confidence,
            'attributes': self.attributes
        }


class ScreenAnalysis:
    """Complete screen analysis result"""
    def __init__(self):
        self.elements: List[UIElement] = []
        self.text_content: str = ""
        self.layout: Dict[str, Any] = {}
        self.regions: Dict[str, Tuple[int, int, int, int]] = {}
        self.confidence: float = 0.0
        
    def add_element(self, element: UIElement):
        self.elements.append(element)
    
    def find_element_by_text(self, text: str, fuzzy: bool = True) -> Optional[UIElement]:
        """Find UI element containing specific text"""
        text_lower = text.lower()
        for elem in self.elements:
            if elem.text:
                elem_text_lower = elem.text.lower()
                if fuzzy:
                    if text_lower in elem_text_lower or elem_text_lower in text_lower:
                        return elem
                else:
                    if text_lower == elem_text_lower:
                        return elem
        return None
    
    def find_elements_by_type(self, element_type: str) -> List[UIElement]:
        """Find all elements of specific type"""
        return [e for e in self.elements if e.element_type == element_type]
    
    def to_dict(self) -> Dict:
        return {
            'elements': [e.to_dict() for e in self.elements],
            'text_content': self.text_content,
            'layout': self.layout,
            'regions': self.regions,
            'confidence': self.confidence
        }


class AdvancedVisionAnalyzer:
    """
    Advanced vision analyzer with OCR and UI understanding
    
    This goes beyond Claude Computer Use and OpenAI Operator by:
    - Extracting all text via OCR
    - Detecting UI element types and positions
    - Understanding screen layout semantics
    - Providing structured data for decision making
    - THEN sending enhanced context to OpenAI/Gemini for final analysis
    """
    
    def __init__(self, vision_api=None, enable_ocr: bool = True, enable_ui_detection: bool = True, enable_omniparser: bool = True):
        self.vision_api = vision_api  # OpenAI or Gemini API
        self.enable_ocr = enable_ocr and TESSERACT_AVAILABLE
        self.enable_ui_detection = enable_ui_detection
        self.enable_omniparser = enable_omniparser and OMNIPARSER_AVAILABLE
        
        self.last_screenshot = None
        self.last_analysis = None
        self._ai_ocr_signature: Optional[str] = None
        self._ai_ocr_cache: List[UIElement] = []
        
        # 🔥 SPEED: Cache OCR results by screenshot hash to avoid redundant processing
        self._screen_cache: Dict[str, ScreenAnalysis] = {}
        self._cache_max_size = 5  # Keep last 5 screenshots
        
        # Initialize OmniParser V2 if available
        self.omniparser = None
        if self.enable_omniparser:
            try:
                self.omniparser = OmniParserV2(
                    cache_enabled=True,
                    min_confidence=0.25,
                    max_elements=50,
                    generate_captions=True
                )
                logger.info("🎯 OmniParser V2 initialized - SOTA UI detection active")
            except Exception as e:
                logger.error(f"Failed to initialize OmniParser V2: {e}")
                self.omniparser = None
        
        logger.info("AdvancedVisionAnalyzer initialized")
        logger.info(f"  Vision API: {type(vision_api).__name__ if vision_api else 'None'}")
        logger.info(f"  OCR: {'enabled' if self.enable_ocr else 'disabled'}")
        logger.info(f"  UI detection: {'enabled' if self.enable_ui_detection else 'disabled'}")
        logger.info(f"  OmniParser V2: {'ACTIVE 🎯' if self.omniparser else 'disabled'}")
    
    def analyze_screen(self, screenshot: Image.Image) -> ScreenAnalysis:
        """
        Perform comprehensive screen analysis
        
        Returns rich structured data about screen content
        """
        # 🔥 SPEED: Check cache first to avoid redundant OCR
        screenshot_hash = hashlib.md5(screenshot.tobytes()).hexdigest()
        if screenshot_hash in self._screen_cache:
            logger.info(f"✅ Using cached screen analysis (hash: {screenshot_hash[:8]}...)")
            return self._screen_cache[screenshot_hash]
        
        analysis = ScreenAnalysis()
        
        # 1. OCR text extraction
        text_elements: List[UIElement] = []

        if self.enable_ocr:
            text_elements = self._extract_text_ocr(screenshot)
        elif self.vision_api and hasattr(self.vision_api, 'extract_text'):
            text_elements = self._extract_text_ai(screenshot)

        for elem in text_elements:
            analysis.add_element(elem)

        if text_elements:
            analysis.text_content = "\n".join([
                e.text for e in text_elements if e.text
            ])
        
        # 2. UI element detection (vision AI-based)
        if self.enable_ui_detection:
            ui_elements = self._detect_ui_elements(screenshot)
            for elem in ui_elements:
                analysis.add_element(elem)
        
        # 3. Layout analysis
        analysis.layout = self._analyze_layout(screenshot, analysis.elements)
        
        # 4. Region detection (header, sidebar, main, etc.)
        analysis.regions = self._detect_regions(screenshot, analysis.elements)
        
        # Store for change detection
        self.last_screenshot = screenshot
        self.last_analysis = analysis
        
        analysis.confidence = self._calculate_confidence(analysis)
        
        # 🔥 SPEED: Cache this analysis
        self._screen_cache[screenshot_hash] = analysis
        # Limit cache size
        if len(self._screen_cache) > self._cache_max_size:
            # Remove oldest entry
            oldest_key = next(iter(self._screen_cache))
            del self._screen_cache[oldest_key]
        
        logger.info(f"Screen analysis complete:")
        logger.info(f"  Elements detected: {len(analysis.elements)}")
        logger.info(f"  Text characters: {len(analysis.text_content)}")
        logger.info(f"  Regions: {list(analysis.regions.keys())}")
        logger.info(f"  Confidence: {analysis.confidence:.2f}")
        
        return analysis
    
    def _extract_text_ocr(self, screenshot: Image.Image) -> List[UIElement]:
        """Extract all text using OCR"""
        if not TESSERACT_AVAILABLE:
            return []
        
        try:
            # Get detailed OCR data with bounding boxes
            ocr_data = pytesseract.image_to_data(
                screenshot,
                output_type=pytesseract.Output.DICT
            )
            
            elements = []
            n_boxes = len(ocr_data['text'])
            
            for i in range(n_boxes):
                text = ocr_data['text'][i].strip()
                conf = float(ocr_data['conf'][i])
                
                # Filter out low confidence and empty text
                if conf < 30 or not text:
                    continue
                
                x = ocr_data['left'][i]
                y = ocr_data['top'][i]
                w = ocr_data['width'][i]
                h = ocr_data['height'][i]
                
                element = UIElement(
                    element_type='text',
                    bbox=(x, y, w, h),
                    text=text,
                    confidence=conf / 100.0,
                    attributes={'ocr_conf': conf}
                )
                elements.append(element)
            
            logger.info(f"OCR extracted {len(elements)} text elements")
            return elements
            
        except Exception as e:
            logger.error(f"OCR failed: {e}")
            return []

    def _extract_text_ai(self, screenshot: Image.Image) -> List[UIElement]:
        """Fallback OCR using the connected vision API when local OCR is unavailable."""

        try:
            signature = hashlib.sha1(screenshot.tobytes()).hexdigest()
        except Exception:
            signature = None

        if signature and signature == self._ai_ocr_signature:
            return list(self._ai_ocr_cache)

        elements: List[UIElement] = []

        if not self.vision_api or not hasattr(self.vision_api, 'extract_text'):
            return elements

        try:
            extracted_text = self.vision_api.extract_text(screenshot)
            if extracted_text:
                width, height = screenshot.size
                elements.append(UIElement(
                    element_type='ai_text',
                    bbox=(0, 0, width, height),
                    text=extracted_text,
                    confidence=0.65,
                    attributes={'source': 'gemini_ocr'}
                ))
                logger.info(f"AI OCR extracted {len(extracted_text)} characters of text")
        except Exception as exc:
            logger.warning(f"AI OCR fallback failed: {exc}")

        if signature is not None:
            self._ai_ocr_signature = signature
            self._ai_ocr_cache = list(elements)

        return elements
    
    def _detect_ui_elements(self, screenshot: Image.Image) -> List[UIElement]:
        """
        Detect UI elements using OmniParser V2 (Microsoft SOTA model)
        
        OmniParser V2 achieves 39.6% on ScreenSpot Pro benchmark.
        Uses YOLOv8 for detection + Florence-2 for element captioning.
        """
        elements = []
        width, height = screenshot.size
        
        # 🎯 USE OMNIPARSER V2 IF AVAILABLE (SOTA UI detection)
        if self.omniparser is not None:
            try:
                logger.info("🎯 Running OmniParser V2 detection (YOLO + Florence-2)...")
                omni_result = self.omniparser.parse(screenshot)
                
                logger.info(f"  OmniParser detected {omni_result.element_count} elements ({omni_result.interactable_count} interactable)")
                logger.info(f"  Parse time: {omni_result.parse_time_ms:.1f}ms")
                
                # Convert OmniParser elements to our UIElement format
                for omni_elem in omni_result.elements:
                    bbox = omni_elem.bbox
                    elem = UIElement(
                        element_type=omni_elem.element_type.name.lower() if hasattr(omni_elem.element_type, 'name') else 'interactable',
                        bbox=(int(bbox.x1), int(bbox.y1), int(bbox.width), int(bbox.height)),
                        text=omni_elem.description or omni_elem.text or omni_elem.ocr_text,
                        confidence=omni_elem.confidence,
                        attributes={
                            'is_interactable': omni_elem.is_interactable,
                            'omniparser_id': omni_elem.id,
                            'center': omni_elem.bbox.center_int
                        }
                    )
                    elements.append(elem)
                
                # Log clickable elements for debugging
                clickable = [e for e in elements if e.attributes.get('is_interactable', False)]
                logger.info(f"  Clickable elements: {len(clickable)}")
                for e in clickable[:5]:
                    logger.debug(f"    [{e.attributes.get('omniparser_id')}] {e.text or 'unknown'} at {e.center}")
                
                return elements
                
            except Exception as e:
                logger.error(f"OmniParser V2 failed: {e}")
                logger.info("Falling back to heuristic detection...")
        
        # FALLBACK: Basic heuristic detection if OmniParser not available
        logger.warning("⚠️  Using fallback heuristic detection (OmniParser not available)")
        
        # Just detect title bar region as before
        elements.append(UIElement(
            element_type='titlebar',
            bbox=(0, 0, width, 40),
            confidence=0.8,
            attributes={'position': 'top'}
        ))
        
        return elements
    
    def _analyze_layout(self, screenshot: Image.Image, elements: List[UIElement]) -> Dict[str, Any]:
        """Analyze screen layout and structure"""
        width, height = screenshot.size
        
        layout = {
            'screen_size': (width, height),
            'aspect_ratio': width / height,
            'element_density': len(elements) / (width * height / 10000),  # per 100x100 block
            'text_regions': []
        }
        
        # Group elements by vertical position
        if elements:
            # Sort by Y position
            sorted_elements = sorted(elements, key=lambda e: e.bbox[1])
            
            # Detect horizontal bands of elements (rows)
            rows = []
            current_row = []
            current_y = -100
            
            for elem in sorted_elements:
                elem_y = elem.bbox[1]
                if abs(elem_y - current_y) < 50:  # Same row threshold
                    current_row.append(elem)
                else:
                    if current_row:
                        rows.append(current_row)
                    current_row = [elem]
                    current_y = elem_y
            
            if current_row:
                rows.append(current_row)
            
            layout['horizontal_bands'] = len(rows)
            layout['elements_per_band'] = len(elements) / max(len(rows), 1)
        
        return layout
    
    def _detect_regions(
        self,
        screenshot: Image.Image,
        elements: List[UIElement]
    ) -> Dict[str, Tuple[int, int, int, int]]:
        """Detect semantic regions (header, sidebar, main content, etc.)"""
        width, height = screenshot.size
        regions = {}
        
        # Header region (top ~10% or until first major element cluster)
        header_height = min(int(height * 0.1), 80)
        regions['header'] = (0, 0, width, header_height)
        
        # Footer region (bottom ~5%)
        footer_height = int(height * 0.05)
        regions['footer'] = (0, height - footer_height, width, footer_height)
        
        # Main content (middle)
        regions['main'] = (0, header_height, width, height - header_height - footer_height)
        
        # Detect sidebar based on element clustering
        # (simplified - production would analyze actual content)
        left_elements = [e for e in elements if e.bbox[0] < width * 0.2]
        right_elements = [e for e in elements if e.bbox[0] > width * 0.8]
        
        if len(left_elements) > len(elements) * 0.3:
            regions['left_sidebar'] = (0, header_height, int(width * 0.2), height - header_height)
        
        if len(right_elements) > len(elements) * 0.3:
            regions['right_sidebar'] = (int(width * 0.8), header_height, int(width * 0.2), height - header_height)
        
        return regions
    
    def _calculate_confidence(self, analysis: ScreenAnalysis) -> float:
        """Calculate overall confidence in analysis"""
        if not analysis.elements:
            return 0.3
        
        avg_elem_confidence = sum(e.confidence for e in analysis.elements) / len(analysis.elements)
        
        # Penalize if too few elements detected
        element_factor = min(len(analysis.elements) / 10.0, 1.0)
        
        # Boost if we have good text content
        text_factor = min(len(analysis.text_content) / 500.0, 1.0)
        
        confidence = (avg_elem_confidence * 0.5 + element_factor * 0.3 + text_factor * 0.2)
        return min(confidence, 0.95)
    
    def detect_changes(self, new_screenshot: Image.Image) -> Dict[str, Any]:
        """
        Detect what changed between last screenshot and new one
        
        Key advantage: Helps agent understand if actions had effect
        """
        if self.last_screenshot is None:
            return {'changed': False, 'reason': 'No previous screenshot'}
        
        # Simple pixel difference for now
        # Production would use perceptual hashing or feature matching
        
        try:
            # Ensure same size
            if new_screenshot.size != self.last_screenshot.size:
                return {
                    'changed': True,
                    'reason': 'Screen size changed',
                    'magnitude': 1.0
                }
            
            # Convert to arrays and compare
            import numpy as np
            
            new_array = np.array(new_screenshot)
            old_array = np.array(self.last_screenshot)
            
            # Calculate difference
            diff = np.abs(new_array.astype(float) - old_array.astype(float))
            total_diff = np.sum(diff)
            max_diff = diff.size * 255 * 3  # RGB
            
            change_magnitude = total_diff / max_diff
            
            # Detect which regions changed most
            h, w = new_array.shape[:2]
            grid_size = 10
            
            changed_regions = []
            for i in range(grid_size):
                for j in range(grid_size):
                    y1 = i * h // grid_size
                    y2 = (i + 1) * h // grid_size
                    x1 = j * w // grid_size
                    x2 = (j + 1) * w // grid_size
                    
                    region_diff = np.sum(diff[y1:y2, x1:x2])
                    region_max = (y2 - y1) * (x2 - x1) * 255 * 3
                    region_change = region_diff / region_max
                    
                    if region_change > 0.1:  # 10% threshold
                        changed_regions.append({
                            'grid_pos': (i, j),
                            'bbox': (x1, y1, x2 - x1, y2 - y1),
                            'change_magnitude': region_change
                        })
            
            return {
                'changed': change_magnitude > 0.01,  # 1% threshold
                'magnitude': change_magnitude,
                'changed_regions': changed_regions,
                'num_regions_changed': len(changed_regions)
            }
            
        except Exception as e:
            logger.error(f"Change detection failed: {e}")
            return {
                'changed': True,
                'reason': f'Detection error: {e}',
                'magnitude': 0.5
            }
    
    def find_clickable_elements(self, screenshot: Image.Image) -> List[UIElement]:
        """
        Find likely clickable elements
        
        Uses heuristics + vision AI to identify buttons, links, etc.
        """
        analysis = self.analyze_screen(screenshot)
        
        clickable = []
        
        # Filter for likely clickable types
        for elem in analysis.elements:
            if elem.element_type in ['button', 'link', 'icon', 'menu_item']:
                clickable.append(elem)
            # Also check for text that looks like buttons/links
            elif elem.element_type == 'text' and elem.text:
                text = elem.text.strip()
                # Common button text patterns
                if any(keyword in text.lower() for keyword in [
                    'click', 'submit', 'send', 'save', 'cancel', 'ok',
                    'yes', 'no', 'continue', 'next', 'back', 'close'
                ]):
                    elem.element_type = 'button_text'
                    clickable.append(elem)
        
        return clickable
    
    def create_annotated_screenshot(
        self,
        screenshot: Image.Image,
        analysis: ScreenAnalysis,
        output_path: Optional[str] = None
    ) -> Image.Image:
        """
        Create annotated screenshot showing detected elements
        
        Useful for debugging and visualization
        """
        annotated = screenshot.copy()
        draw = ImageDraw.Draw(annotated)
        
        # Draw bounding boxes for elements
        for elem in analysis.elements:
            x, y, w, h = elem.bbox
            
            # Color code by type
            color_map = {
                'text': 'blue',
                'button': 'green',
                'textbox': 'orange',
                'icon': 'purple',
                'menu': 'red'
            }
            color = color_map.get(elem.element_type, 'gray')
            
            # Draw box
            draw.rectangle([x, y, x + w, y + h], outline=color, width=2)
            
            # Draw label
            if elem.text:
                label = f"{elem.element_type}: {elem.text[:20]}"
            else:
                label = elem.element_type
            
            draw.text((x, y - 15), label, fill=color)
        
        # Draw region boundaries
        for region_name, (x, y, w, h) in analysis.regions.items():
            draw.rectangle([x, y, x + w, y + h], outline='yellow', width=1)
            draw.text((x + 5, y + 5), region_name, fill='yellow')
        
        if output_path:
            annotated.save(output_path)
            logger.info(f"Saved annotated screenshot to {output_path}")
        
        return annotated


    def analyze_with_vision_api(
        self,
        screenshot: Image.Image,
        task: str,
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Enhanced analysis: OCR + UI detection + Vision API
        
        This is the MAIN method that combines everything:
        1. Extract text via OCR (local, fast)
        2. Detect UI elements (local, fast)  
        3. Send enhanced context to OpenAI/Gemini for reasoning
        
        This gives the best of both worlds:
        - Fast local processing for structure
        - Smart AI reasoning for understanding
        """
        if context is None:
            context = {}
        
        # Step 1: Do local OCR and UI detection
        logger.info("🔍 Step 1: Local OCR and UI detection...")
        analysis = self.analyze_screen(screenshot)
        
        # Step 2: Build enhanced context with OCR data
        enhanced_context = context.copy()
        enhanced_context['ocr_text'] = analysis.text_content
        enhanced_context['ui_elements'] = [
            {
                'type': elem.element_type,
                'text': elem.text,
                'position': elem.center,
                'confidence': elem.confidence
            }
            for elem in analysis.elements[:20]  # Top 20 elements
        ]
        enhanced_context['regions'] = analysis.regions
        enhanced_context['layout'] = analysis.layout
        
        logger.info(f"  Found {len(analysis.elements)} UI elements")
        logger.info(f"  Extracted {len(analysis.text_content)} chars of text")
        
        # Step 3: Send to Vision API if available
        if self.vision_api:
            logger.info("🤖 Step 2: Sending enhanced context to Vision API...")
            
            # Add OCR data to the prompt context
            enhanced_context['enhanced_prompt'] = self._build_enhanced_prompt(
                task, analysis
            )
            
            result = self.vision_api.analyze_screen(
                screenshot,
                task,
                enhanced_context
            )
            
            # Merge OCR data into result
            result['ocr_data'] = {
                'text_content': analysis.text_content,
                'elements': len(analysis.elements),
                'confidence': analysis.confidence
            }
            
            logger.info("✅ Enhanced vision analysis complete")
            return result
        else:
            logger.warning("⚠️  No vision API - returning OCR-only analysis")
            # Return OCR-only analysis
            return {
                'action': 'observe',
                'params': {},
                'reasoning': f"OCR detected: {analysis.text_content[:200]}...",
                'confidence': analysis.confidence,
                'ocr_data': {
                    'text_content': analysis.text_content,
                    'elements': len(analysis.elements)
                }
            }
    
    def _build_enhanced_prompt(self, task: str, analysis: ScreenAnalysis) -> str:
        """Build enhanced prompt with OCR data and OmniParser elements for vision API"""
        
        # Extract interactable elements (from OmniParser)
        interactable_elements = []
        for elem in analysis.elements:
            if elem.attributes.get('is_interactable', False):
                center = elem.attributes.get('center', elem.center)
                interactable_elements.append({
                    'id': elem.attributes.get('omniparser_id', 0),
                    'type': elem.element_type,
                    'text': elem.text or 'unknown',
                    'center': center,
                    'confidence': elem.confidence
                })
        
        # Extract clickable items by type
        clickable_items = [
            f"[{e['id']}] \"{e['text']}\" at ({e['center'][0]}, {e['center'][1]})"
            for e in interactable_elements[:15]
        ]
        
        # Extract text inputs
        text_inputs = [
            elem.text for elem in analysis.elements
            if elem.element_type in ['textbox', 'input_text', 'input_search'] and elem.text
        ][:5]
        
        # Build structured prompt with OmniParser data
        prompt = f"""
TASK: {task}

=== UI ELEMENT DETECTION (OmniParser V2 - SOTA) ===
Detected {len(analysis.elements)} UI elements total
Interactable elements: {len(interactable_elements)}
Detection confidence: {analysis.confidence:.1%}

CLICKABLE ELEMENTS (click by coordinates):
{chr(10).join(f"  {item}" for item in clickable_items) if clickable_items else "  (none detected - use image to find targets)"}

TEXT INPUTS FOUND:
{chr(10).join(f"  • {item}" for item in text_inputs) if text_inputs else "  (none detected)"}

SCREEN REGIONS:
{chr(10).join(f"  • {name}: {coords}" for name, coords in analysis.regions.items())}

DETECTED TEXT (OCR):
{analysis.text_content[:400] if analysis.text_content else "(no text detected)"}

=== INSTRUCTIONS ===
1. Look at the screenshot image and the detected UI elements above
2. Find the element that matches your task (e.g., search bar, button, link)
3. Use the exact coordinates from the CLICKABLE ELEMENTS list when possible
4. If you need to click something not in the list, identify it visually and estimate coordinates
5. For typing: first click on the input field, then type the text
"""
        return prompt


def test_advanced_vision():
    """Test the advanced vision analyzer"""
    from .executor import ActionExecutor
    
    executor = ActionExecutor()
    screenshot = executor._capture_screen()
    
    if not screenshot:
        print("Failed to capture screenshot")
        return
    
    analyzer = AdvancedVisionAnalyzer(enable_ocr=True, enable_ui_detection=True)
    
    print("\n=== Running Advanced Vision Analysis ===")
    analysis = analyzer.analyze_screen(screenshot)
    
    print(f"\nResults:")
    print(f"  Elements: {len(analysis.elements)}")
    print(f"  Text content length: {len(analysis.text_content)}")
    print(f"  Layout bands: {analysis.layout.get('horizontal_bands', 0)}")
    print(f"  Regions: {list(analysis.regions.keys())}")
    print(f"  Confidence: {analysis.confidence:.2%}")
    
    # Save annotated screenshot
    annotated = analyzer.create_annotated_screenshot(
        screenshot,
        analysis,
        '/tmp/annotated_screenshot.png'
    )
    
    print("\nAnnotated screenshot saved to /tmp/annotated_screenshot.png")
    
    # Test text search
    if analysis.text_content:
        print(f"\nFirst 200 chars of detected text:")
        print(analysis.text_content[:200])
    
    # Test clickable detection
    clickable = analyzer.find_clickable_elements(screenshot)
    print(f"\nClickable elements found: {len(clickable)}")
    for elem in clickable[:5]:
        print(f"  - {elem.element_type}: {elem.text}")


if __name__ == '__main__':
    test_advanced_vision()
