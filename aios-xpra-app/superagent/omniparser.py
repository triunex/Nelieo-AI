"""
Microsoft OmniParser V2 Integration - Official Implementation

This module integrates the official Microsoft OmniParser V2 model for
state-of-the-art UI element detection and grounding.

OmniParser V2 achieves 39.6% accuracy on ScreenSpot Pro benchmark,
which is the current state-of-the-art for screen parsing.

Components:
1. Icon Detection Model (YOLOv8-based) - Detects UI elements with bounding boxes
2. Icon Caption Model (Florence-2-based) - Describes element functionality

Performance:
- Latency: 0.6s/frame on A100, 0.8s on 4090
- Accuracy: 39.6% on ScreenSpot Pro (SOTA)

Model Source: https://huggingface.co/microsoft/OmniParser-v2.0
GitHub: https://github.com/microsoft/OmniParser
"""

import os
import sys
import time
import json
import hashlib
import logging
import threading
import subprocess
from io import BytesIO
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple, Union
from enum import Enum, auto

from PIL import Image, ImageDraw, ImageFont

logger = logging.getLogger(__name__)


# Configuration
OMNIPARSER_WEIGHTS_DIR = os.environ.get(
    'OMNIPARSER_WEIGHTS_DIR', 
    '/opt/omniparser/weights'
)
OMNIPARSER_CACHE_DIR = os.environ.get(
    'OMNIPARSER_CACHE_DIR',
    '/tmp/omniparser_cache'
)


class ElementType(Enum):
    """Classification of UI element types."""
    BUTTON = auto()
    LINK = auto()
    INPUT_TEXT = auto()
    INPUT_SEARCH = auto()
    INPUT_PASSWORD = auto()
    CHECKBOX = auto()
    RADIO = auto()
    DROPDOWN = auto()
    TAB = auto()
    MENU_ITEM = auto()
    ICON = auto()
    IMAGE = auto()
    VIDEO = auto()
    TEXT = auto()
    HEADING = auto()
    LABEL = auto()
    LIST_ITEM = auto()
    CARD = auto()
    MODAL = auto()
    TOOLTIP = auto()
    NAVIGATION = auto()
    SIDEBAR = auto()
    HEADER = auto()
    FOOTER = auto()
    INTERACTABLE = auto()
    NON_INTERACTABLE = auto()
    UNKNOWN = auto()


class InteractionType(Enum):
    """Types of interactions possible with an element."""
    CLICKABLE = auto()
    TYPEABLE = auto()
    SCROLLABLE = auto()
    HOVERABLE = auto()
    DRAGGABLE = auto()
    SELECTABLE = auto()
    TOGGLEABLE = auto()
    READ_ONLY = auto()


@dataclass
class BoundingBox:
    """Precise bounding box with coordinates."""
    x1: float
    y1: float
    x2: float
    y2: float
    
    @property
    def width(self) -> float:
        return self.x2 - self.x1
    
    @property
    def height(self) -> float:
        return self.y2 - self.y1
    
    @property
    def center(self) -> Tuple[float, float]:
        return ((self.x1 + self.x2) / 2, (self.y1 + self.y2) / 2)
    
    @property
    def center_int(self) -> Tuple[int, int]:
        cx, cy = self.center
        return (int(cx), int(cy))
    
    @property
    def area(self) -> float:
        return self.width * self.height
    
    def contains_point(self, x: float, y: float) -> bool:
        return self.x1 <= x <= self.x2 and self.y1 <= y <= self.y2
    
    def to_tuple(self) -> Tuple[int, int, int, int]:
        return (int(self.x1), int(self.y1), int(self.x2), int(self.y2))
    
    def to_dict(self) -> Dict[str, float]:
        return {'x1': self.x1, 'y1': self.y1, 'x2': self.x2, 'y2': self.y2}
    
    def to_list(self) -> List[float]:
        return [self.x1, self.y1, self.x2, self.y2]


@dataclass
class UIElement:
    """
    Represents a detected UI element from OmniParser.
    """
    id: int
    element_type: ElementType
    bbox: BoundingBox
    text: str = ""
    description: str = ""
    confidence: float = 0.0
    is_interactable: bool = True
    interaction_types: List[InteractionType] = field(default_factory=list)
    ocr_text: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'type': self.element_type.name.lower(),
            'bbox': self.bbox.to_dict(),
            'center': self.bbox.center_int,
            'text': self.text[:100] if self.text else "",
            'description': self.description[:100] if self.description else "",
            'confidence': round(self.confidence, 3),
            'is_interactable': self.is_interactable,
            'is_clickable': InteractionType.CLICKABLE in self.interaction_types,
        }
    
    def to_prompt_string(self) -> str:
        """Generate concise string representation for LLM prompt."""
        interactable_str = "[clickable]" if self.is_interactable else "[static]"
        
        # Use description if available, else text
        label = self.description or self.text or self.ocr_text or "element"
        label = label[:50] + "..." if len(label) > 50 else label
        
        cx, cy = self.bbox.center_int
        
        return f"[{self.id}] {interactable_str} \"{label}\" at ({cx}, {cy})"


@dataclass
class ParseResult:
    """Complete result of parsing a screenshot with OmniParser."""
    elements: List[UIElement]
    screen_size: Tuple[int, int]
    parse_time_ms: float
    element_count: int
    interactable_count: int
    model_version: str = "v2.0"
    raw_detections: List[Dict] = field(default_factory=list)
    
    def get_interactable_elements(self) -> List[UIElement]:
        return [e for e in self.elements if e.is_interactable]
    
    def get_element_by_id(self, element_id: int) -> Optional[UIElement]:
        for element in self.elements:
            if element.id == element_id:
                return element
        return None
    
    def find_elements_by_text(self, text: str, partial: bool = True) -> List[UIElement]:
        text_lower = text.lower()
        results = []
        for element in self.elements:
            search_text = (element.text + element.description + element.ocr_text).lower()
            if partial:
                if text_lower in search_text:
                    results.append(element)
            else:
                if text_lower == search_text:
                    results.append(element)
        return results
    
    def to_prompt_context(self, max_elements: int = 30) -> str:
        """Generate structured context for LLM prompt."""
        lines = []
        lines.append(f"Screen: {self.screen_size[0]}x{self.screen_size[1]}")
        lines.append(f"Elements: {self.element_count} total, {self.interactable_count} interactable")
        lines.append("")
        lines.append("UI Elements (select by number):")
        
        # Priority: interactable first
        interactable = [e for e in self.elements if e.is_interactable]
        non_interactable = [e for e in self.elements if not e.is_interactable]
        
        prioritized = interactable + non_interactable
        
        for element in prioritized[:max_elements]:
            lines.append(element.to_prompt_string())
        
        if len(self.elements) > max_elements:
            lines.append(f"... and {len(self.elements) - max_elements} more elements")
        
        return "\n".join(lines)


class OmniParserModelLoader:
    """
    Handles loading of Microsoft OmniParser V2 models.
    
    Models required:
    1. icon_detect/ - YOLOv8 model for element detection
    2. icon_caption_florence/ - Florence-2 model for element description
    """
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        """Singleton pattern for model loading."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self.weights_dir = Path(OMNIPARSER_WEIGHTS_DIR)
        self.icon_detect_model = None
        self.icon_caption_model = None
        self.icon_caption_processor = None
        self._models_loaded = False
        self._load_error = None
        
        self._initialized = True
    
    def ensure_weights_downloaded(self) -> bool:
        """Download model weights from HuggingFace if not present."""
        if not self.weights_dir.exists():
            self.weights_dir.mkdir(parents=True, exist_ok=True)
        
        icon_detect_path = self.weights_dir / "icon_detect" / "model.pt"
        icon_caption_path = self.weights_dir / "icon_caption_florence" / "model.safetensors"
        
        if icon_detect_path.exists() and icon_caption_path.exists():
            logger.info("OmniParser V2 weights already downloaded")
            return True
        
        logger.info("Downloading OmniParser V2 weights from HuggingFace...")
        
        try:
            # Download using huggingface-cli
            download_cmd = f'''
            for f in icon_detect/train_args.yaml icon_detect/model.pt icon_detect/model.yaml \
                      icon_caption/config.json icon_caption/generation_config.json icon_caption/model.safetensors; do
                huggingface-cli download microsoft/OmniParser-v2.0 "$f" --local-dir {self.weights_dir}
            done
            mv {self.weights_dir}/icon_caption {self.weights_dir}/icon_caption_florence 2>/dev/null || true
            '''
            
            result = subprocess.run(
                download_cmd,
                shell=True,
                capture_output=True,
                text=True,
                timeout=600
            )
            
            if result.returncode != 0:
                logger.error("Failed to download weights: %s", result.stderr)
                return False
            
            logger.info("OmniParser V2 weights downloaded successfully")
            return True
            
        except Exception as e:
            logger.error("Error downloading OmniParser weights: %s", e)
            return False
    
    def load_models(self) -> bool:
        """Load OmniParser V2 models into memory."""
        if self._models_loaded:
            return True
        
        if self._load_error:
            logger.warning("Previous load error, skipping: %s", self._load_error)
            return False
        
        try:
            # Import required libraries
            from ultralytics import YOLO
            import torch
            
            # Determine device
            if torch.cuda.is_available():
                self.device = "cuda"
                logger.info("Using CUDA for OmniParser inference")
            else:
                self.device = "cpu"
                logger.info("Using CPU for OmniParser inference (slower)")
            
            # Load icon detection model (YOLOv8) - REQUIRED
            icon_detect_path = self.weights_dir / "icon_detect" / "model.pt"
            if icon_detect_path.exists():
                self.icon_detect_model = YOLO(str(icon_detect_path))
                logger.info("✅ Loaded icon detection model (YOLOv8)")
            else:
                logger.error("Icon detection model not found at %s", icon_detect_path)
                return False
            
            # Load icon caption model (Florence-2) - OPTIONAL
            # This can fail due to version mismatches, but YOLO alone is still useful
            icon_caption_path = self.weights_dir / "icon_caption_florence"
            if icon_caption_path.exists():
                try:
                    from transformers import AutoProcessor, AutoModelForCausalLM
                    self.icon_caption_processor = AutoProcessor.from_pretrained(
                        str(icon_caption_path),
                        trust_remote_code=True
                    )
                    self.icon_caption_model = AutoModelForCausalLM.from_pretrained(
                        str(icon_caption_path),
                        trust_remote_code=True,
                        torch_dtype=torch.float16 if self.device == "cuda" else torch.float32
                    ).to(self.device)
                    logger.info("✅ Loaded icon caption model (Florence-2)")
                except Exception as e:
                    logger.warning("⚠️  Florence-2 caption model failed to load: %s", e)
                    logger.warning("   Continuing with YOLO detection only (no element descriptions)")
                    self.icon_caption_model = None
                    self.icon_caption_processor = None
            else:
                logger.warning("Icon caption model not found at %s", icon_caption_path)
                self.icon_caption_model = None
                self.icon_caption_processor = None
            
            # Mark as loaded if YOLO works (Florence-2 is optional)
            self._models_loaded = self.icon_detect_model is not None
            return self._models_loaded
            
        except ImportError as e:
            self._load_error = f"Missing dependencies: {e}"
            logger.error("OmniParser requires: pip install ultralytics torch")
            return False
            
        except Exception as e:
            self._load_error = str(e)
            logger.error("Failed to load OmniParser models: %s", e)
            return False
    
    @property
    def is_loaded(self) -> bool:
        return self._models_loaded
    
    @property
    def has_detection(self) -> bool:
        return self.icon_detect_model is not None
    
    @property
    def has_caption(self) -> bool:
        return self.icon_caption_model is not None


class OmniParserV2:
    """
    Microsoft OmniParser V2 - Production-Grade UI Element Detection.
    
    This is the main class for parsing screenshots using the official
    Microsoft OmniParser V2 model.
    
    Usage:
        parser = OmniParserV2()
        result = parser.parse(screenshot)
        for element in result.elements:
            print(f"{element.id}: {element.description} at {element.bbox.center_int}")
    """
    
    def __init__(self,
                 cache_enabled: bool = True,
                 cache_max_size: int = 50,
                 min_confidence: float = 0.3,
                 max_elements: int = 100,
                 generate_captions: bool = True,
                 auto_download: bool = True):
        """
        Initialize OmniParser V2.
        
        Args:
            cache_enabled: Enable result caching
            cache_max_size: Maximum cached results
            min_confidence: Minimum confidence threshold
            max_elements: Maximum elements to return
            generate_captions: Generate descriptions for elements
            auto_download: Auto-download weights if not present
        """
        self.cache_enabled = cache_enabled
        self.cache_max_size = cache_max_size
        self.min_confidence = min_confidence
        self.max_elements = max_elements
        self.generate_captions = generate_captions
        self.auto_download = auto_download
        
        # Model loader (singleton)
        self.model_loader = OmniParserModelLoader()
        
        # Result cache
        self._cache: Dict[str, ParseResult] = {}
        self._cache_lock = threading.Lock()
        
        # Statistics
        self.total_parses = 0
        self.cache_hits = 0
        self.total_parse_time = 0.0
        
        # Try to load models
        self._init_models()
        
        logger.info("OmniParserV2 initialized (cache=%s, captions=%s)",
                   cache_enabled, generate_captions)
    
    def _init_models(self):
        """Initialize models on first use."""
        if self.auto_download:
            if not self.model_loader.ensure_weights_downloaded():
                logger.warning("Could not download OmniParser weights")
        
        if not self.model_loader.load_models():
            logger.warning("OmniParser models not loaded, will use fallback")
    
    def parse(self, image: Union[Image.Image, str, bytes],
             force_refresh: bool = False) -> ParseResult:
        """
        Parse a screenshot and detect all UI elements.
        
        Args:
            image: PIL Image, file path, or bytes
            force_refresh: Bypass cache
            
        Returns:
            ParseResult with all detected elements
        """
        start_time = time.time()
        self.total_parses += 1
        
        # Load image if needed
        if isinstance(image, str):
            image = Image.open(image)
        elif isinstance(image, bytes):
            image = Image.open(BytesIO(image))
        
        # Ensure RGB mode
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Check cache
        if self.cache_enabled and not force_refresh:
            cache_key = self._compute_image_hash(image)
            cached = self._get_cached(cache_key)
            if cached is not None:
                self.cache_hits += 1
                logger.debug("Cache hit for image hash %s", cache_key[:16])
                return cached
        
        # Check if detection model is loaded (YOLO is required, Florence-2 is optional)
        if not self.model_loader.has_detection:
            logger.warning("OmniParser YOLO model not loaded, using fallback detection")
            result = self._fallback_parse(image)
        else:
            result = self._run_omniparser(image)
        
        # Filter by confidence
        result.elements = [e for e in result.elements 
                          if e.confidence >= self.min_confidence]
        
        # Limit elements
        if len(result.elements) > self.max_elements:
            result.elements.sort(key=lambda e: (-int(e.is_interactable), -e.confidence))
            result.elements = result.elements[:self.max_elements]
        
        # Reassign IDs
        for i, element in enumerate(result.elements):
            element.id = i + 1
        
        # Update counts
        result.element_count = len(result.elements)
        result.interactable_count = len(result.get_interactable_elements())
        
        # Record parse time
        result.parse_time_ms = (time.time() - start_time) * 1000
        self.total_parse_time += result.parse_time_ms
        
        # Cache result
        if self.cache_enabled:
            cache_key = self._compute_image_hash(image)
            self._cache_result(cache_key, result)
        
        logger.info("OmniParser V2: Parsed %d elements (%d interactable) in %.1fms",
                   result.element_count, result.interactable_count, result.parse_time_ms)
        
        return result
    
    def _run_omniparser(self, image: Image.Image) -> ParseResult:
        """Run actual OmniParser V2 inference."""
        import torch
        
        elements = []
        raw_detections = []
        
        # Step 1: Run YOLO icon detection
        if self.model_loader.has_detection:
            results = self.model_loader.icon_detect_model.predict(
                source=image,
                conf=self.min_confidence,
                verbose=False
            )
            
            if results and len(results) > 0:
                result = results[0]
                boxes = result.boxes
                
                for i, box in enumerate(boxes):
                    # Get bounding box coordinates
                    xyxy = box.xyxy[0].cpu().numpy()
                    conf = float(box.conf[0].cpu().numpy())
                    cls = int(box.cls[0].cpu().numpy()) if hasattr(box, 'cls') else 0
                    
                    bbox = BoundingBox(
                        x1=float(xyxy[0]),
                        y1=float(xyxy[1]),
                        x2=float(xyxy[2]),
                        y2=float(xyxy[3])
                    )
                    
                    # Determine if interactable (class 0 = interactable in OmniParser)
                    is_interactable = (cls == 0)
                    
                    element = UIElement(
                        id=i + 1,
                        element_type=ElementType.INTERACTABLE if is_interactable else ElementType.NON_INTERACTABLE,
                        bbox=bbox,
                        confidence=conf,
                        is_interactable=is_interactable,
                        interaction_types=[InteractionType.CLICKABLE] if is_interactable else []
                    )
                    
                    elements.append(element)
                    raw_detections.append({
                        'bbox': bbox.to_list(),
                        'conf': conf,
                        'class': cls
                    })
        
        # Step 2: Generate captions for each element
        if self.generate_captions and self.model_loader.has_caption:
            for element in elements:
                try:
                    # Crop element region
                    x1, y1, x2, y2 = element.bbox.to_tuple()
                    # Add small padding
                    pad = 5
                    x1 = max(0, x1 - pad)
                    y1 = max(0, y1 - pad)
                    x2 = min(image.width, x2 + pad)
                    y2 = min(image.height, y2 + pad)
                    
                    crop = image.crop((x1, y1, x2, y2))
                    
                    # Generate caption
                    description = self._generate_caption(crop)
                    element.description = description
                    
                    # Infer element type from description
                    element.element_type = self._infer_element_type(description)
                    
                except Exception as e:
                    logger.debug("Caption generation failed for element %d: %s", element.id, e)
        
        return ParseResult(
            elements=elements,
            screen_size=(image.width, image.height),
            parse_time_ms=0,
            element_count=len(elements),
            interactable_count=len([e for e in elements if e.is_interactable]),
            model_version="v2.0",
            raw_detections=raw_detections
        )
    
    def _generate_caption(self, image_crop: Image.Image) -> str:
        """Generate caption for an element using Florence-2."""
        import torch
        
        processor = self.model_loader.icon_caption_processor
        model = self.model_loader.icon_caption_model
        device = self.model_loader.device
        
        # Prepare input
        prompt = "<CAPTION>"
        inputs = processor(
            text=prompt,
            images=image_crop,
            return_tensors="pt"
        ).to(device)
        
        # Generate
        with torch.no_grad():
            generated_ids = model.generate(
                input_ids=inputs["input_ids"],
                pixel_values=inputs["pixel_values"],
                max_new_tokens=50,
                num_beams=3,
                early_stopping=True
            )
        
        # Decode
        generated_text = processor.batch_decode(
            generated_ids, 
            skip_special_tokens=True
        )[0]
        
        # Clean up
        caption = generated_text.replace("<CAPTION>", "").strip()
        
        return caption
    
    def _infer_element_type(self, description: str) -> ElementType:
        """Infer element type from description."""
        desc_lower = description.lower()
        
        if any(w in desc_lower for w in ['button', 'btn', 'submit', 'click']):
            return ElementType.BUTTON
        elif any(w in desc_lower for w in ['search', 'find', 'input', 'text box', 'text field']):
            return ElementType.INPUT_SEARCH
        elif any(w in desc_lower for w in ['link', 'url', 'navigate']):
            return ElementType.LINK
        elif any(w in desc_lower for w in ['icon', 'logo', 'symbol']):
            return ElementType.ICON
        elif any(w in desc_lower for w in ['menu', 'dropdown', 'select']):
            return ElementType.DROPDOWN
        elif any(w in desc_lower for w in ['tab', 'switch']):
            return ElementType.TAB
        elif any(w in desc_lower for w in ['checkbox', 'check']):
            return ElementType.CHECKBOX
        elif any(w in desc_lower for w in ['image', 'photo', 'picture']):
            return ElementType.IMAGE
        elif any(w in desc_lower for w in ['video', 'play']):
            return ElementType.VIDEO
        else:
            return ElementType.INTERACTABLE
    
    def _fallback_parse(self, image: Image.Image) -> ParseResult:
        """
        Fallback parsing when OmniParser models are not available.
        Uses basic image processing for element detection.
        """
        logger.info("Using fallback detection (OmniParser models not available)")
        
        # Simple edge-based detection
        elements = []
        
        # Convert to grayscale for processing
        gray = image.convert('L')
        width, height = image.size
        
        # Grid-based region detection
        grid_size = 50
        element_id = 0
        
        for y in range(0, height - grid_size, grid_size):
            for x in range(0, width - grid_size, grid_size):
                region = gray.crop((x, y, x + grid_size, y + grid_size))
                pixels = list(region.getdata())
                
                if len(pixels) < 100:
                    continue
                
                # Check for high contrast (potential UI element)
                min_val = min(pixels)
                max_val = max(pixels)
                contrast = max_val - min_val
                
                if contrast > 100:
                    element_id += 1
                    elements.append(UIElement(
                        id=element_id,
                        element_type=ElementType.UNKNOWN,
                        bbox=BoundingBox(
                            x1=float(x),
                            y1=float(y),
                            x2=float(x + grid_size),
                            y2=float(y + grid_size)
                        ),
                        confidence=0.5,
                        is_interactable=True,
                        interaction_types=[InteractionType.CLICKABLE]
                    ))
        
        return ParseResult(
            elements=elements,
            screen_size=(image.width, image.height),
            parse_time_ms=0,
            element_count=len(elements),
            interactable_count=len(elements),
            model_version="fallback"
        )
    
    def _compute_image_hash(self, image: Image.Image) -> str:
        """Compute hash of image for caching."""
        small = image.resize((64, 64), Image.Resampling.LANCZOS)
        pixels = list(small.getdata())
        pixel_str = str(pixels)
        return hashlib.md5(pixel_str.encode()).hexdigest()
    
    def _get_cached(self, cache_key: str) -> Optional[ParseResult]:
        """Get cached result if exists."""
        with self._cache_lock:
            return self._cache.get(cache_key)
    
    def _cache_result(self, cache_key: str, result: ParseResult):
        """Cache a parse result."""
        with self._cache_lock:
            if len(self._cache) >= self.cache_max_size:
                oldest_key = next(iter(self._cache))
                del self._cache[oldest_key]
            self._cache[cache_key] = result
    
    def clear_cache(self):
        """Clear the result cache."""
        with self._cache_lock:
            self._cache.clear()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get parser statistics."""
        return {
            'total_parses': self.total_parses,
            'cache_hits': self.cache_hits,
            'cache_hit_rate': self.cache_hits / max(self.total_parses, 1),
            'avg_parse_time_ms': self.total_parse_time / max(self.total_parses, 1),
            'cache_size': len(self._cache),
            'models_loaded': self.model_loader.is_loaded,
            'has_detection': self.model_loader.has_detection,
            'has_caption': self.model_loader.has_caption
        }


# Aliases for backward compatibility
OmniParser = OmniParserV2
OmniParserWithOCR = OmniParserV2


def create_omniparser(use_ocr: bool = False,
                     cache_enabled: bool = True,
                     **kwargs) -> OmniParserV2:
    """
    Factory function to create OmniParser instance.
    
    Args:
        use_ocr: Ignored (OmniParser V2 uses Florence-2 for captions)
        cache_enabled: Enable result caching
        **kwargs: Additional arguments
    
    Returns:
        Configured OmniParserV2 instance
    """
    return OmniParserV2(
        cache_enabled=cache_enabled,
        generate_captions=True,
        **kwargs
    )


def check_omniparser_available() -> Dict[str, Any]:
    """
    Check if OmniParser V2 dependencies are available.
    
    Returns:
        Dictionary with availability status
    """
    status = {
        'ultralytics': False,
        'transformers': False,
        'torch': False,
        'weights_downloaded': False,
        'ready': False
    }
    
    try:
        import ultralytics
        status['ultralytics'] = True
    except ImportError:
        pass
    
    try:
        import transformers
        status['transformers'] = True
    except ImportError:
        pass
    
    try:
        import torch
        status['torch'] = True
        status['cuda_available'] = torch.cuda.is_available()
    except ImportError:
        pass
    
    weights_dir = Path(OMNIPARSER_WEIGHTS_DIR)
    if (weights_dir / "icon_detect" / "model.pt").exists():
        status['weights_downloaded'] = True
    
    status['ready'] = all([
        status['ultralytics'],
        status['transformers'],
        status['torch'],
        status['weights_downloaded']
    ])
    
    return status
