
from superagent.omniparser import OmniParserV2
from PIL import Image, ImageDraw
import time

def test_inference():
    print("Testing OmniParser V2 inference...")
    
    # Create dummy image with a simulated button
    img = Image.new('RGB', (800, 600), color='white')
    draw = ImageDraw.Draw(img)
    # Draw a button
    draw.rectangle([100, 100, 300, 150], fill='blue', outline='black')
    draw.rectangle([100, 200, 300, 250], fill='red', outline='black')
    
    start_time = time.time()
    
    # Init parser
    try:
        parser = OmniParserV2()
        print("Model loaded successfully.")
    except Exception as e:
        print(f"FAILED to load model: {e}")
        return
        
    # Parse
    try:
        result = parser.parse(img)
        duration = time.time() - start_time
        
        print(f"Parse successful in {duration:.2f}s!")
        print(f"Found {len(result.elements)} elements.")
        print("Inference test PASSED.")
    except Exception as e:
        print(f"FAILED to run inference: {e}")

if __name__ == "__main__":
    test_inference()
