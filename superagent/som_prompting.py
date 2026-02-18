"""
Set-of-Mark (SoM) Prompting - Visual Grounding System

This module implements Set-of-Mark prompting technique for precise
visual grounding of UI elements. Instead of asking the LLM to guess
pixel coordinates, we overlay numbered marks on detected elements
and ask the LLM to select element numbers.

Research basis: Microsoft Research "Set-of-Mark" paper (2023)
which demonstrates 2-3x improvement in visual grounding accuracy.

Architecture:
- Mark Generation: Create visual markers for each detected element
- Image Overlay: Draw numbered boxes/circles on screenshot
- Prompt Generation: Create structured prompt with element references
- Response Parsing: Map selected element IDs to coordinates

Performance Targets:
- Grounding accuracy: 95%+
- Overlay generation: <100ms
- Zero coordinate guessing errors
"""

import os
import math
import logging
from io import BytesIO
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple, Union
from enum import Enum, auto
import colorsys

from PIL import Image, ImageDraw, ImageFont

from .omniparser import (
    OmniParser, ParseResult, UIElement, BoundingBox,
    ElementType, InteractionType
)

logger = logging.getLogger(__name__)


class MarkStyle(Enum):
    """Visual style for element markers."""
    BOX = auto()           # Rectangle around element
    CIRCLE = auto()        # Circle at element center
    UNDERLINE = auto()     # Line under element
    CORNER = auto()        # Brackets at corners
    BADGE = auto()         # Numbered badge at corner
    MINIMAL = auto()       # Just the number near element


class ColorScheme(Enum):
    """Color schemes for markers."""
    RAINBOW = auto()       # Different color per element
    CATEGORICAL = auto()   # Color by element type
    MONOCHROME = auto()    # Single color (adjusts to background)
    HIGH_CONTRAST = auto() # Maximum contrast colors


@dataclass
class MarkConfig:
    """Configuration for mark rendering."""
    style: MarkStyle = MarkStyle.BOX
    color_scheme: ColorScheme = ColorScheme.CATEGORICAL
    line_width: int = 2
    font_size: int = 14
    badge_radius: int = 12
    opacity: float = 0.9
    show_type_label: bool = False
    show_confidence: bool = False
    max_marks: int = 50
    prioritize_interactive: bool = True


@dataclass
class MarkedImage:
    """Result of applying marks to an image."""
    image: Image.Image
    element_map: Dict[int, UIElement]
    mark_positions: Dict[int, Tuple[int, int]]
    parse_result: ParseResult
    config: MarkConfig
    
    def get_element(self, mark_id: int) -> Optional[UIElement]:
        """Get element by mark ID."""
        return self.element_map.get(mark_id)
    
    def get_click_position(self, mark_id: int) -> Optional[Tuple[int, int]]:
        """Get center coordinates for clicking an element."""
        element = self.element_map.get(mark_id)
        if element:
            return element.bbox.center_int
        return None
    
    def to_bytes(self, format: str = 'JPEG', quality: int = 85) -> bytes:
        """Convert marked image to bytes."""
        buffer = BytesIO()
        self.image.save(buffer, format=format, quality=quality)
        return buffer.getvalue()


class ColorGenerator:
    """Generate colors for element markers."""
    
    # Category colors (element type -> RGB)
    CATEGORY_COLORS = {
        ElementType.BUTTON: (66, 133, 244),      # Blue
        ElementType.LINK: (52, 168, 83),          # Green
        ElementType.INPUT_TEXT: (251, 188, 4),    # Yellow
        ElementType.INPUT_SEARCH: (234, 67, 53),  # Red
        ElementType.CHECKBOX: (168, 52, 235),     # Purple
        ElementType.DROPDOWN: (255, 136, 0),      # Orange
        ElementType.ICON: (0, 172, 193),          # Cyan
        ElementType.TAB: (121, 85, 72),           # Brown
        ElementType.MENU_ITEM: (96, 125, 139),    # Gray Blue
    }
    
    # High contrast colors
    HIGH_CONTRAST_COLORS = [
        (255, 0, 0),      # Red
        (0, 255, 0),      # Green
        (0, 0, 255),      # Blue
        (255, 255, 0),    # Yellow
        (255, 0, 255),    # Magenta
        (0, 255, 255),    # Cyan
        (255, 128, 0),    # Orange
        (128, 0, 255),    # Purple
        (0, 255, 128),    # Spring Green
        (255, 0, 128),    # Rose
    ]
    
    @classmethod
    def get_rainbow_color(cls, index: int, total: int) -> Tuple[int, int, int]:
        """Generate rainbow color based on position."""
        if total <= 0:
            total = 1
        hue = index / total
        r, g, b = colorsys.hsv_to_rgb(hue, 0.8, 0.9)
        return (int(r * 255), int(g * 255), int(b * 255))
    
    @classmethod
    def get_category_color(cls, element_type: ElementType) -> Tuple[int, int, int]:
        """Get color based on element type."""
        return cls.CATEGORY_COLORS.get(element_type, (128, 128, 128))
    
    @classmethod
    def get_high_contrast_color(cls, index: int) -> Tuple[int, int, int]:
        """Get high contrast color."""
        return cls.HIGH_CONTRAST_COLORS[index % len(cls.HIGH_CONTRAST_COLORS)]
    
    @classmethod
    def adjust_for_background(cls, color: Tuple[int, int, int], 
                             background_brightness: float) -> Tuple[int, int, int]:
        """Adjust color for visibility against background."""
        r, g, b = color
        color_brightness = (r * 299 + g * 587 + b * 114) / 1000
        
        # If color and background are similar brightness, adjust
        if abs(color_brightness - background_brightness) < 128:
            if background_brightness > 128:
                # Darken the color
                factor = 0.6
            else:
                # Lighten the color
                factor = 1.5
            r = min(255, int(r * factor))
            g = min(255, int(g * factor))
            b = min(255, int(b * factor))
        
        return (r, g, b)


class FontManager:
    """Manage fonts for mark rendering."""
    
    _font_cache: Dict[int, ImageFont.FreeTypeFont] = {}
    _default_font: Optional[ImageFont.FreeTypeFont] = None
    
    # Common font paths
    FONT_PATHS = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
        '/usr/share/fonts/truetype/ubuntu/Ubuntu-B.ttf',
        '/System/Library/Fonts/Helvetica.ttc',
        'C:/Windows/Fonts/arial.ttf',
        'C:/Windows/Fonts/arialbd.ttf',
    ]
    
    @classmethod
    def get_font(cls, size: int) -> ImageFont.FreeTypeFont:
        """Get font of specified size."""
        if size in cls._font_cache:
            return cls._font_cache[size]
        
        font = None
        
        # Try to load a TrueType font
        for font_path in cls.FONT_PATHS:
            if os.path.exists(font_path):
                try:
                    font = ImageFont.truetype(font_path, size)
                    break
                except Exception:
                    continue
        
        # Fallback to default font
        if font is None:
            try:
                font = ImageFont.load_default()
            except Exception:
                font = None
        
        if font:
            cls._font_cache[size] = font
        
        return font


class MarkRenderer:
    """
    Render visual marks on images.
    
    Handles the actual drawing of numbered markers on screenshots.
    """
    
    def __init__(self, config: MarkConfig = None):
        self.config = config or MarkConfig()
    
    def render(self, image: Image.Image, 
              elements: List[UIElement],
              parse_result: ParseResult) -> MarkedImage:
        """
        Render marks on an image.
        
        Args:
            image: Source image
            elements: Elements to mark
            parse_result: Full parse result for context
            
        Returns:
            MarkedImage with overlaid marks
        """
        # Create a copy to draw on
        marked = image.copy()
        if marked.mode != 'RGBA':
            marked = marked.convert('RGBA')
        
        # Create overlay for transparency
        overlay = Image.new('RGBA', marked.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        
        # Get font
        font = FontManager.get_font(self.config.font_size)
        badge_font = FontManager.get_font(self.config.font_size - 2)
        
        # Prioritize elements if needed
        if self.config.prioritize_interactive:
            elements = self._prioritize_elements(elements)
        
        # Limit number of marks
        elements = elements[:self.config.max_marks]
        
        # Track element map and positions
        element_map = {}
        mark_positions = {}
        
        # Calculate average background brightness
        avg_brightness = self._calculate_brightness(image)
        
        # Draw marks for each element
        for i, element in enumerate(elements):
            mark_id = i + 1  # 1-indexed for user friendliness
            element_map[mark_id] = element
            
            # Get color for this element
            color = self._get_element_color(element, i, len(elements), avg_brightness)
            
            # Draw the mark based on style
            mark_pos = self._draw_mark(
                draw, element, mark_id, color, font, badge_font
            )
            mark_positions[mark_id] = mark_pos
        
        # Composite overlay onto image
        marked = Image.alpha_composite(marked, overlay)
        
        # Convert back to RGB
        marked = marked.convert('RGB')
        
        return MarkedImage(
            image=marked,
            element_map=element_map,
            mark_positions=mark_positions,
            parse_result=parse_result,
            config=self.config
        )
    
    def _prioritize_elements(self, elements: List[UIElement]) -> List[UIElement]:
        """Sort elements by interaction priority."""
        def priority_key(element: UIElement) -> Tuple[int, float]:
            # Lower priority value = higher priority
            if InteractionType.TYPEABLE in element.interaction_types:
                type_priority = 0
            elif InteractionType.CLICKABLE in element.interaction_types:
                type_priority = 1
            else:
                type_priority = 2
            
            # Higher confidence = higher priority (negate for sorting)
            return (type_priority, -element.confidence)
        
        return sorted(elements, key=priority_key)
    
    def _get_element_color(self, element: UIElement, index: int, 
                          total: int, background_brightness: float) -> Tuple[int, int, int]:
        """Get color for element based on config."""
        if self.config.color_scheme == ColorScheme.RAINBOW:
            color = ColorGenerator.get_rainbow_color(index, total)
        elif self.config.color_scheme == ColorScheme.CATEGORICAL:
            color = ColorGenerator.get_category_color(element.element_type)
        elif self.config.color_scheme == ColorScheme.HIGH_CONTRAST:
            color = ColorGenerator.get_high_contrast_color(index)
        else:  # MONOCHROME
            color = (255, 0, 0) if background_brightness > 128 else (255, 255, 0)
        
        return ColorGenerator.adjust_for_background(color, background_brightness)
    
    def _draw_mark(self, draw: ImageDraw.ImageDraw, element: UIElement,
                  mark_id: int, color: Tuple[int, int, int],
                  font: ImageFont.FreeTypeFont,
                  badge_font: ImageFont.FreeTypeFont) -> Tuple[int, int]:
        """Draw a mark for an element and return mark position."""
        bbox = element.bbox
        x1, y1, x2, y2 = int(bbox.x1), int(bbox.y1), int(bbox.x2), int(bbox.y2)
        cx, cy = bbox.center_int
        
        # Create RGBA color with opacity
        opacity = int(self.config.opacity * 255)
        rgba = (*color, opacity)
        
        if self.config.style == MarkStyle.BOX:
            return self._draw_box_mark(draw, x1, y1, x2, y2, mark_id, 
                                       color, rgba, font)
        elif self.config.style == MarkStyle.CIRCLE:
            return self._draw_circle_mark(draw, cx, cy, mark_id, 
                                         color, rgba, font)
        elif self.config.style == MarkStyle.BADGE:
            return self._draw_badge_mark(draw, x1, y1, mark_id, 
                                        color, rgba, badge_font)
        elif self.config.style == MarkStyle.CORNER:
            return self._draw_corner_mark(draw, x1, y1, x2, y2, mark_id,
                                         color, rgba, font)
        elif self.config.style == MarkStyle.UNDERLINE:
            return self._draw_underline_mark(draw, x1, y2, x2, mark_id,
                                            color, rgba, font)
        else:  # MINIMAL
            return self._draw_minimal_mark(draw, x1, y1, mark_id, 
                                          color, rgba, font)
    
    def _draw_box_mark(self, draw: ImageDraw.ImageDraw,
                       x1: int, y1: int, x2: int, y2: int,
                       mark_id: int, color: Tuple[int, int, int],
                       rgba: Tuple[int, int, int, int],
                       font: ImageFont.FreeTypeFont) -> Tuple[int, int]:
        """Draw box style mark."""
        lw = self.config.line_width
        
        # Draw rectangle
        draw.rectangle([x1, y1, x2, y2], outline=rgba, width=lw)
        
        # Draw number badge in top-left corner
        text = str(mark_id)
        text_bbox = draw.textbbox((0, 0), text, font=font)
        text_w = text_bbox[2] - text_bbox[0]
        text_h = text_bbox[3] - text_bbox[1]
        
        badge_padding = 3
        badge_x = x1
        badge_y = y1 - text_h - badge_padding * 2
        
        # Ensure badge stays on screen
        if badge_y < 0:
            badge_y = y2 + 2
        
        # Draw badge background
        badge_rect = [
            badge_x, badge_y,
            badge_x + text_w + badge_padding * 2,
            badge_y + text_h + badge_padding * 2
        ]
        draw.rectangle(badge_rect, fill=(*color, 255))
        
        # Draw text
        text_color = (255, 255, 255, 255)  # White text
        draw.text((badge_x + badge_padding, badge_y + badge_padding), 
                 text, fill=text_color, font=font)
        
        return (badge_x, badge_y)
    
    def _draw_circle_mark(self, draw: ImageDraw.ImageDraw,
                         cx: int, cy: int, mark_id: int,
                         color: Tuple[int, int, int],
                         rgba: Tuple[int, int, int, int],
                         font: ImageFont.FreeTypeFont) -> Tuple[int, int]:
        """Draw circle style mark at element center."""
        radius = self.config.badge_radius
        
        # Draw filled circle
        draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius],
                    fill=(*color, 255), outline=(255, 255, 255, 255))
        
        # Draw number
        text = str(mark_id)
        text_bbox = draw.textbbox((0, 0), text, font=font)
        text_w = text_bbox[2] - text_bbox[0]
        text_h = text_bbox[3] - text_bbox[1]
        
        text_x = cx - text_w // 2
        text_y = cy - text_h // 2
        
        draw.text((text_x, text_y), text, fill=(255, 255, 255, 255), font=font)
        
        return (cx, cy)
    
    def _draw_badge_mark(self, draw: ImageDraw.ImageDraw,
                        x1: int, y1: int, mark_id: int,
                        color: Tuple[int, int, int],
                        rgba: Tuple[int, int, int, int],
                        font: ImageFont.FreeTypeFont) -> Tuple[int, int]:
        """Draw badge style mark in corner."""
        radius = self.config.badge_radius
        
        # Position badge in top-left
        badge_x = x1 - radius // 2
        badge_y = y1 - radius // 2
        
        # Ensure on screen
        badge_x = max(radius, badge_x)
        badge_y = max(radius, badge_y)
        
        # Draw circle badge
        draw.ellipse([badge_x - radius, badge_y - radius,
                     badge_x + radius, badge_y + radius],
                    fill=(*color, 255), outline=(255, 255, 255, 255))
        
        # Draw number
        text = str(mark_id)
        text_bbox = draw.textbbox((0, 0), text, font=font)
        text_w = text_bbox[2] - text_bbox[0]
        text_h = text_bbox[3] - text_bbox[1]
        
        draw.text((badge_x - text_w // 2, badge_y - text_h // 2), 
                 text, fill=(255, 255, 255, 255), font=font)
        
        return (badge_x, badge_y)
    
    def _draw_corner_mark(self, draw: ImageDraw.ImageDraw,
                         x1: int, y1: int, x2: int, y2: int,
                         mark_id: int, color: Tuple[int, int, int],
                         rgba: Tuple[int, int, int, int],
                         font: ImageFont.FreeTypeFont) -> Tuple[int, int]:
        """Draw corner brackets style mark."""
        lw = self.config.line_width
        corner_len = 10
        
        # Top-left corner
        draw.line([(x1, y1 + corner_len), (x1, y1), (x1 + corner_len, y1)], 
                 fill=rgba, width=lw)
        # Top-right corner
        draw.line([(x2 - corner_len, y1), (x2, y1), (x2, y1 + corner_len)], 
                 fill=rgba, width=lw)
        # Bottom-left corner
        draw.line([(x1, y2 - corner_len), (x1, y2), (x1 + corner_len, y2)], 
                 fill=rgba, width=lw)
        # Bottom-right corner
        draw.line([(x2 - corner_len, y2), (x2, y2), (x2, y2 - corner_len)], 
                 fill=rgba, width=lw)
        
        # Draw number above top-left
        text = str(mark_id)
        draw.text((x1, y1 - 16), text, fill=(*color, 255), font=font)
        
        return (x1, y1 - 16)
    
    def _draw_underline_mark(self, draw: ImageDraw.ImageDraw,
                            x1: int, y2: int, x2: int,
                            mark_id: int, color: Tuple[int, int, int],
                            rgba: Tuple[int, int, int, int],
                            font: ImageFont.FreeTypeFont) -> Tuple[int, int]:
        """Draw underline style mark."""
        lw = self.config.line_width
        
        # Draw underline
        draw.line([(x1, y2 + 2), (x2, y2 + 2)], fill=rgba, width=lw)
        
        # Draw number at start
        text = str(mark_id)
        draw.text((x1, y2 + 4), text, fill=(*color, 255), font=font)
        
        return (x1, y2 + 4)
    
    def _draw_minimal_mark(self, draw: ImageDraw.ImageDraw,
                          x1: int, y1: int, mark_id: int,
                          color: Tuple[int, int, int],
                          rgba: Tuple[int, int, int, int],
                          font: ImageFont.FreeTypeFont) -> Tuple[int, int]:
        """Draw minimal style mark (just number)."""
        text = f"[{mark_id}]"
        
        # Draw with background for visibility
        text_bbox = draw.textbbox((0, 0), text, font=font)
        text_w = text_bbox[2] - text_bbox[0]
        text_h = text_bbox[3] - text_bbox[1]
        
        bg_rect = [x1 - 2, y1 - 2, x1 + text_w + 2, y1 + text_h + 2]
        draw.rectangle(bg_rect, fill=(0, 0, 0, 180))
        draw.text((x1, y1), text, fill=(*color, 255), font=font)
        
        return (x1, y1)
    
    def _calculate_brightness(self, image: Image.Image) -> float:
        """Calculate average brightness of image."""
        # Sample pixels for speed
        small = image.resize((50, 50), Image.Resampling.LANCZOS)
        if small.mode != 'RGB':
            small = small.convert('RGB')
        
        pixels = list(small.getdata())
        total_brightness = sum(
            (p[0] * 299 + p[1] * 587 + p[2] * 114) / 1000
            for p in pixels
        )
        
        return total_brightness / len(pixels) if pixels else 128


class SoMPromptGenerator:
    """
    Generate structured prompts for Set-of-Mark visual grounding.
    
    Creates prompts that reference marked elements by ID rather
    than requiring coordinate guessing.
    """
    
    # Prompt templates
    SYSTEM_PROMPT = """You are a precise UI automation agent. You analyze screenshots 
with numbered element markers and select which element to interact with.

IMPORTANT RULES:
- Elements are marked with numbers in colored boxes/badges
- Always refer to elements by their number, not coordinates
- Select exactly ONE element per response
- If no suitable element exists, respond with action "wait" or "scroll"
"""
    
    ACTION_PROMPT_TEMPLATE = """TASK: {task}

CURRENT STATE:
{state_context}

MARKED ELEMENTS ON SCREEN:
{element_list}

Select ONE element to interact with.

RESPONSE FORMAT (JSON only):
{{
    "thinking": "Brief analysis of what I see and need to do",
    "element": <element_number>,
    "action": "click" | "type" | "scroll" | "wait" | "done",
    "text": "text to type (if action is type)",
    "reason": "Why this action achieves the goal"
}}

RESPOND WITH JSON ONLY:"""
    
    VERIFICATION_PROMPT_TEMPLATE = """VERIFICATION: Did the previous action succeed?

TASK: {task}
PREVIOUS ACTION: {previous_action}
EXPECTED RESULT: {expected_result}

CURRENT SCREEN ELEMENTS:
{element_list}

Evaluate if the action succeeded and what to do next.

RESPONSE FORMAT (JSON only):
{{
    "action_succeeded": true | false,
    "observation": "What I see on screen now",
    "next_action": "continue" | "retry" | "alternative" | "done",
    "element": <element_number for next action, if applicable>
}}"""
    
    def __init__(self, 
                 max_elements_in_prompt: int = 30,
                 include_element_types: bool = True,
                 include_confidence: bool = False):
        """
        Initialize prompt generator.
        
        Args:
            max_elements_in_prompt: Maximum elements to include
            include_element_types: Include element type labels
            include_confidence: Include confidence scores
        """
        self.max_elements = max_elements_in_prompt
        self.include_types = include_element_types
        self.include_confidence = include_confidence
    
    def generate_action_prompt(self, 
                              marked_image: MarkedImage,
                              task: str,
                              state_context: str = "") -> str:
        """
        Generate prompt for action selection.
        
        Args:
            marked_image: Image with marks applied
            task: Current task description
            state_context: Additional context (history, etc.)
            
        Returns:
            Formatted prompt string
        """
        element_list = self._format_element_list(marked_image)
        
        return self.ACTION_PROMPT_TEMPLATE.format(
            task=task,
            state_context=state_context or "Starting state",
            element_list=element_list
        )
    
    def generate_verification_prompt(self,
                                    marked_image: MarkedImage,
                                    task: str,
                                    previous_action: str,
                                    expected_result: str) -> str:
        """
        Generate prompt for action verification.
        
        Args:
            marked_image: Current screen with marks
            task: Original task
            previous_action: Description of last action
            expected_result: What was expected to happen
            
        Returns:
            Formatted verification prompt
        """
        element_list = self._format_element_list(marked_image)
        
        return self.VERIFICATION_PROMPT_TEMPLATE.format(
            task=task,
            previous_action=previous_action,
            expected_result=expected_result,
            element_list=element_list
        )
    
    def _format_element_list(self, marked_image: MarkedImage) -> str:
        """Format element list for prompt."""
        lines = []
        
        # Sort by ID
        elements = list(marked_image.element_map.items())
        elements.sort(key=lambda x: x[0])
        
        for mark_id, element in elements[:self.max_elements]:
            line = self._format_element(mark_id, element)
            lines.append(line)
        
        if len(marked_image.element_map) > self.max_elements:
            remaining = len(marked_image.element_map) - self.max_elements
            lines.append(f"... and {remaining} more elements")
        
        return "\n".join(lines)
    
    def _format_element(self, mark_id: int, element: UIElement) -> str:
        """Format single element for prompt."""
        parts = [f"[{mark_id}]"]
        
        # Element type
        if self.include_types:
            type_name = element.element_type.name.lower().replace('_', ' ')
            parts.append(type_name)
        
        # Interaction info
        if InteractionType.TYPEABLE in element.interaction_types:
            parts.append("(input)")
        elif InteractionType.CLICKABLE in element.interaction_types:
            parts.append("(clickable)")
        
        # Text content
        if element.text:
            text_preview = element.text[:50]
            if len(element.text) > 50:
                text_preview += "..."
            parts.append(f'"{text_preview}"')
        elif element.semantic_label:
            parts.append(f'[{element.semantic_label}]')
        
        # Confidence
        if self.include_confidence:
            parts.append(f"({element.confidence:.0%})")
        
        return " ".join(parts)
    
    def get_system_prompt(self) -> str:
        """Get system prompt for LLM."""
        return self.SYSTEM_PROMPT


class SoMResponseParser:
    """
    Parse LLM responses that reference marked elements.
    
    Handles extraction of element IDs and action types from
    JSON responses.
    """
    
    def parse_action_response(self, response: str, 
                             marked_image: MarkedImage) -> Dict[str, Any]:
        """
        Parse action response from LLM.
        
        Args:
            response: Raw LLM response text
            marked_image: Marked image for element lookup
            
        Returns:
            Parsed action dict with coordinates
        """
        import json
        import re
        
        # Extract JSON from response
        json_str = self._extract_json(response)
        
        if not json_str:
            logger.error("No JSON found in response: %s", response[:200])
            return self._create_fallback_response()
        
        try:
            parsed = json.loads(json_str)
        except json.JSONDecodeError as e:
            logger.error("JSON parse error: %s", e)
            return self._create_fallback_response()
        
        # Extract element number and get coordinates
        element_num = parsed.get('element')
        action_type = parsed.get('action', 'wait')
        
        result = {
            'action': {
                'type': action_type,
                'reason': parsed.get('reason', ''),
            },
            'thinking': parsed.get('thinking', ''),
            'raw_response': parsed
        }
        
        # Get coordinates for element if applicable
        if element_num is not None and action_type in ['click', 'type', 'double_click']:
            element = marked_image.get_element(element_num)
            
            if element:
                cx, cy = element.bbox.center_int
                result['action']['x'] = cx
                result['action']['y'] = cy
                result['action']['element_id'] = element_num
                result['action']['element_type'] = element.element_type.name
                
                if action_type == 'type':
                    result['action']['text'] = parsed.get('text', '')
                
                logger.info("Resolved element %d to coordinates (%d, %d)", 
                           element_num, cx, cy)
            else:
                logger.warning("Element %d not found in marked image", element_num)
                result['action']['error'] = f'Element {element_num} not found'
        
        return result
    
    def _extract_json(self, text: str) -> Optional[str]:
        """Extract JSON object from text."""
        # Remove markdown code blocks if present
        text = text.strip()
        if text.startswith('```'):
            lines = text.split('\n')
            # Remove first and last lines (code block markers)
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
    
    def _create_fallback_response(self) -> Dict[str, Any]:
        """Create fallback response when parsing fails."""
        return {
            'action': {
                'type': 'wait',
                'reason': 'Failed to parse response',
                'amount': 2
            },
            'thinking': 'Error occurred',
            'error': 'Failed to parse LLM response'
        }


class SetOfMarkPrompter:
    """
    Main Set-of-Mark prompting interface.
    
    Combines OmniParser, mark rendering, and prompt generation
    into a unified pipeline for visual grounding.
    
    This is the primary class to use for SoM-based agent interactions.
    """
    
    def __init__(self,
                 parser: OmniParser = None,
                 mark_config: MarkConfig = None,
                 prompt_max_elements: int = 30):
        """
        Initialize Set-of-Mark prompter.
        
        Args:
            parser: OmniParser instance (creates new if None)
            mark_config: Mark rendering configuration
            prompt_max_elements: Max elements in prompts
        """
        self.parser = parser or OmniParser()
        self.mark_config = mark_config or MarkConfig()
        self.renderer = MarkRenderer(self.mark_config)
        self.prompt_generator = SoMPromptGenerator(
            max_elements_in_prompt=prompt_max_elements
        )
        self.response_parser = SoMResponseParser()
        
        # Statistics
        self.total_prompts = 0
        self.successful_groundings = 0
    
    def prepare_prompt(self, 
                      image: Union[Image.Image, str, bytes],
                      task: str,
                      state_context: str = "") -> Tuple[MarkedImage, str]:
        """
        Prepare marked image and prompt for LLM.
        
        This is the main method to call before sending to LLM.
        
        Args:
            image: Screenshot to analyze
            task: Current task description
            state_context: Additional context
            
        Returns:
            Tuple of (marked_image, prompt_text)
        """
        # Load image if needed
        if isinstance(image, str):
            image = Image.open(image)
        elif isinstance(image, bytes):
            image = Image.open(BytesIO(image))
        
        # Parse screenshot for elements
        parse_result = self.parser.parse(image)
        
        # Get elements to mark (prioritize interactive)
        elements = self._select_elements_to_mark(parse_result)
        
        # Render marks
        marked_image = self.renderer.render(image, elements, parse_result)
        
        # Generate prompt
        prompt = self.prompt_generator.generate_action_prompt(
            marked_image, task, state_context
        )
        
        self.total_prompts += 1
        
        return marked_image, prompt
    
    def parse_response(self, 
                      response: str,
                      marked_image: MarkedImage) -> Dict[str, Any]:
        """
        Parse LLM response and resolve element references to coordinates.
        
        Args:
            response: Raw LLM response
            marked_image: The marked image that was sent
            
        Returns:
            Parsed action with coordinates
        """
        result = self.response_parser.parse_action_response(response, marked_image)
        
        if 'error' not in result.get('action', {}):
            self.successful_groundings += 1
        
        return result
    
    def _select_elements_to_mark(self, parse_result: ParseResult) -> List[UIElement]:
        """Select which elements to mark based on priority."""
        elements = []
        
        # First: all input elements
        for elem in parse_result.elements:
            if InteractionType.TYPEABLE in elem.interaction_types:
                elements.append(elem)
        
        # Second: all clickable elements
        for elem in parse_result.elements:
            if (InteractionType.CLICKABLE in elem.interaction_types and
                elem not in elements):
                elements.append(elem)
        
        # Third: other elements with good confidence
        for elem in parse_result.elements:
            if elem not in elements and elem.confidence >= 0.5:
                elements.append(elem)
        
        return elements
    
    def get_system_prompt(self) -> str:
        """Get system prompt for LLM."""
        return self.prompt_generator.get_system_prompt()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get prompting statistics."""
        return {
            'total_prompts': self.total_prompts,
            'successful_groundings': self.successful_groundings,
            'grounding_rate': (self.successful_groundings / 
                              max(self.total_prompts, 1)),
            'parser_stats': self.parser.get_stats()
        }


# Factory function for easy instantiation
def create_som_prompter(mark_style: str = 'box',
                       color_scheme: str = 'categorical',
                       max_elements: int = 50,
                       **kwargs) -> SetOfMarkPrompter:
    """
    Factory function to create SetOfMarkPrompter.
    
    Args:
        mark_style: 'box', 'circle', 'badge', 'corner', 'underline', 'minimal'
        color_scheme: 'rainbow', 'categorical', 'high_contrast', 'monochrome'
        max_elements: Maximum elements to mark
        **kwargs: Additional arguments
        
    Returns:
        Configured SetOfMarkPrompter instance
    """
    style_map = {
        'box': MarkStyle.BOX,
        'circle': MarkStyle.CIRCLE,
        'badge': MarkStyle.BADGE,
        'corner': MarkStyle.CORNER,
        'underline': MarkStyle.UNDERLINE,
        'minimal': MarkStyle.MINIMAL
    }
    
    scheme_map = {
        'rainbow': ColorScheme.RAINBOW,
        'categorical': ColorScheme.CATEGORICAL,
        'high_contrast': ColorScheme.HIGH_CONTRAST,
        'monochrome': ColorScheme.MONOCHROME
    }
    
    config = MarkConfig(
        style=style_map.get(mark_style, MarkStyle.BOX),
        color_scheme=scheme_map.get(color_scheme, ColorScheme.CATEGORICAL),
        max_marks=max_elements
    )
    
    return SetOfMarkPrompter(mark_config=config, **kwargs)
