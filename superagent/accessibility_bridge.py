import json
import sys
import time
import traceback
import subprocess
import re

# Try to import pyatspi - this is the standard Linux accessibility bridge
try:
    import pyatspi
except ImportError:
    pyatspi = None

# Try to import pytesseract for OCR fallback
try:
    import pytesseract
    from PIL import Image
    HAS_OCR = True
except ImportError:
    HAS_OCR = False

class AccessibilityBridge:
    def __init__(self):
        self.enabled = False
        if pyatspi:
            try:
                self.registry = pyatspi.Registry
                self.enabled = True
            except Exception as e:
                print(f"Failed to initialize AT-SPI registry: {e}")
        else:
            print("pyatspi module not found. Accessibility features disabled.")

    def _is_visible(self, component):
        """Check if an element is visible on screen."""
        try:
            # getExtents returns (x, y, width, height, coords_type)
            # DESKTOP_COORDS is usually 0 or 1 depending on version, we assume screen coords
            extents = component.getExtents(pyatspi.DESKTOP_COORDS)
            return extents.width > 0 and extents.height > 0 and component.isVisible()
        except:
            return False

    def _get_role_name(self, role):
        """Convert role enum to string."""
        try:
            return role.name
        except:
            return str(role)

    def _process_node(self, accessible, depth=0, max_depth=10):
        """Recursively process an accessible node."""
        if depth > max_depth:
            return None

        try:
            # Basic info
            name = accessible.name
            role = accessible.getRole()
            role_name = self._get_role_name(role)
            
            # Filter out uninteresting nodes to keep payload small
            # We want buttons, inputs, links, text, windows, etc.
            interesting_roles = [
                'ROLE_FRAME', 'ROLE_WINDOW', 'ROLE_PANEL', 'ROLE_PUSH_BUTTON', 
                'ROLE_TOGGLE_BUTTON', 'ROLE_CHECK_BOX', 'ROLE_RADIO_BUTTON',
                'ROLE_TEXT', 'ROLE_ENTRY', 'ROLE_PASSWORD_TEXT', 'ROLE_LINK',
                'ROLE_MENU_ITEM', 'ROLE_COMBO_BOX', 'ROLE_LIST_ITEM', 
                'ROLE_HEADING', 'ROLE_DOCUMENT_WEB', 'ROLE_SECTION'
            ]
            
            # If it's not interesting and has no name, we might skip it unless it has children
            # But for now, let's try to get everything that has a component interface (has coordinates)
            
            node_data = {
                "role": role_name,
                "name": name,
                "children": []
            }

            # Get coordinates if available
            try:
                component = accessible.queryComponent()
                if component:
                    if not self._is_visible(component):
                        return None # Skip invisible elements
                    
                    extents = component.getExtents(pyatspi.DESKTOP_COORDS)
                    node_data["bbox"] = {
                        "x": extents.x,
                        "y": extents.y,
                        "w": extents.width,
                        "h": extents.height
                    }
            except:
                # Node doesn't have component interface (maybe just a container without geometry)
                pass

            # Recurse children
            child_count = accessible.childCount
            for i in range(child_count):
                try:
                    child = accessible.getChildAtIndex(i)
                    if child:
                        child_data = self._process_node(child, depth + 1, max_depth)
                        if child_data:
                            node_data["children"].append(child_data)
                except:
                    continue

            # Pruning: If node has no name, no bbox, and no children, it's useless
            if not node_data.get("name") and "bbox" not in node_data and not node_data["children"]:
                return None
                
            # Flattening optimization: If a node is just a container for one child, maybe we don't need it?
            # For now, let's keep the structure but maybe limit what we return to Gemini
            
            return node_data

        except Exception as e:
            # print(f"Error processing node: {e}")
            return None

    def get_full_tree(self):
        """Get the full accessibility tree of the desktop."""
        if not self.enabled:
            return {"error": "AT-SPI not enabled"}

        desktop_count = self.registry.getDesktopCount()
        desktops = []

        for i in range(desktop_count):
            desktop = self.registry.getDesktop(i)
            desktop_data = self._process_node(desktop, max_depth=15)
            if desktop_data:
                desktops.append(desktop_data)

        return {"desktops": desktops}

    def _ocr_fallback(self, screenshot_path=None):
        """
        Use OCR to find text elements when AT-SPI misses them.
        This catches canvas-based UIs, custom widgets, etc.
        """
        if not HAS_OCR or not screenshot_path:
            return []
        
        try:
            # Run pytesseract to get bounding boxes
            # Handle both file paths and PIL Image objects
            if isinstance(screenshot_path, str):
                img = Image.open(screenshot_path)
            elif hasattr(screenshot_path, 'convert'):  # Already a PIL Image
                img = screenshot_path
            else:
                return []
            data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
            
            ocr_elements = []
            for i in range(len(data['text'])):
                text = data['text'][i].strip()
                if text and data['conf'][i] > 30:  # Confidence threshold
                    x, y, w, h = data['left'][i], data['top'][i], data['width'][i], data['height'][i]
                    ocr_elements.append({
                        "id": f"ocr_{i}",
                        "type": "text_ocr",
                        "text": text,
                        "box": [x, y, x + w, y + h],
                        "center": [x + w//2, y + h//2],
                        "confidence": data['conf'][i]
                    })
            return ocr_elements
        except Exception as e:
            print(f"OCR fallback failed: {e}")
            return []

    def get_flat_interactive_elements(self, screenshot_path=None, use_ocr_fallback=True):
        """
        Returns a flat list of interactive elements with their coordinates.
        This is optimized for Gemini: 'Here is a list of buttons you can click'.
        
        Args:
            screenshot_path: Path to screenshot for OCR fallback
            use_ocr_fallback: Whether to use OCR when AT-SPI misses elements
        """
        if not self.enabled:
            # If AT-SPI is disabled, try pure OCR
            if use_ocr_fallback and screenshot_path:
                return self._ocr_fallback(screenshot_path)
            return []

        elements = []
        
        def traverse(node):
            if not node:
                return
            
            # Check if this is an interactive element
            role = node.get("role", "")
            name = node.get("name", "")
            bbox = node.get("bbox", None)
            
            is_interactive = role in [
                'ROLE_PUSH_BUTTON', 'ROLE_TOGGLE_BUTTON', 'ROLE_CHECK_BOX', 
                'ROLE_RADIO_BUTTON', 'ROLE_ENTRY', 'ROLE_LINK', 'ROLE_MENU_ITEM',
                'ROLE_COMBO_BOX', 'ROLE_LIST_ITEM'
            ]
            
            # Also include text if it has a name (for reading)
            is_text = role in ['ROLE_TEXT', 'ROLE_HEADING', 'ROLE_LABEL'] and name.strip()
            
            if bbox and (is_interactive or is_text):
                elements.append({
                    "id": len(elements),
                    "type": role.replace("ROLE_", "").lower(),
                    "text": name,
                    "box": [bbox["x"], bbox["y"], bbox["x"] + bbox["w"], bbox["y"] + bbox["h"]],
                    "center": [bbox["x"] + bbox["w"]//2, bbox["y"] + bbox["h"]//2]
                })
            
            for child in node.get("children", []):
                traverse(child)

        tree = self.get_full_tree()
        if "desktops" in tree:
            for desktop in tree["desktops"]:
                traverse(desktop)
        
        # Merge with OCR fallback if requested
        if use_ocr_fallback and screenshot_path:
            ocr_elements = self._ocr_fallback(screenshot_path)
            # Deduplicate: if OCR text overlaps with AT-SPI element, keep AT-SPI
            for ocr_elem in ocr_elements:
                overlap = False
                for existing in elements:
                    if self._boxes_overlap(ocr_elem['box'], existing['box']):
                        overlap = True
                        break
                if not overlap:
                    elements.append(ocr_elem)
        
        # Sort by Y position (top to bottom), then X (left to right)
        # This makes the list more intuitive for the LLM
        elements.sort(key=lambda e: (e['box'][1], e['box'][0]))
        
        # Re-number IDs after sorting
        for idx, elem in enumerate(elements):
            elem['id'] = idx
                
        return elements
    
    def _boxes_overlap(self, box1, box2):
        """Check if two bounding boxes overlap significantly."""
        x1, y1, x2, y2 = box1
        x3, y3, x4, y4 = box2
        
        # Calculate overlap area
        x_overlap = max(0, min(x2, x4) - max(x1, x3))
        y_overlap = max(0, min(y2, y4) - max(y1, y3))
        overlap_area = x_overlap * y_overlap
        
        # Calculate individual areas
        area1 = (x2 - x1) * (y2 - y1)
        area2 = (x4 - x3) * (y4 - y3)
        
        # If overlap is > 50% of either box, consider them the same
        return overlap_area > 0.5 * min(area1, area2)
    
    def find_element_by_text(self, text, screenshot_path=None):
        """Fast search: find element by text without asking Gemini."""
        elements = self.get_flat_interactive_elements(screenshot_path)
        text_lower = text.lower()
        
        # Exact match first
        for elem in elements:
            if elem['text'].lower() == text_lower:
                return elem
        
        # Partial match
        for elem in elements:
            if text_lower in elem['text'].lower():
                return elem
        
        return None

if __name__ == "__main__":
    bridge = AccessibilityBridge()
    if bridge.enabled:
        print("Scanning accessibility tree...")
        start_time = time.time()
        elements = bridge.get_flat_interactive_elements()
        end_time = time.time()
        
        print(f"Found {len(elements)} elements in {end_time - start_time:.2f}s")
        
        # Print first 10 elements as sample
        print(json.dumps(elements[:10], indent=2))
        
        # Save to file for inspection
        with open("ui_dump.json", "w") as f:
            json.dump(elements, f, indent=2)
        print("Full dump saved to ui_dump.json")
    else:
        print("Could not initialize bridge.")
