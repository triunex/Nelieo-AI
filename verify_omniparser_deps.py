
import sys

def check_deps():
    print("Checking OmniParser V2 dependencies...")
    
    has_error = False
    
    try:
        import torch
        print(f"✅ PyTorch: {torch.__version__}")
    except ImportError as e:
        print(f"❌ PyTorch missing: {e}")
        has_error = True
        
    try:
        import ultralytics
        print(f"✅ Ultralytics: {ultralytics.__version__}")
    except ImportError as e:
        print(f"❌ Ultralytics missing: {e}")
        has_error = True
        
    try:
        import transformers
        print(f"✅ Transformers: {transformers.__version__}")
    except ImportError as e:
        print(f"❌ Transformers missing: {e}")
        has_error = True
        
    try:
        import huggingface_hub
        print(f"✅ HuggingFace Hub: {huggingface_hub.__version__}")
    except ImportError as e:
        print(f"❌ HuggingFace Hub missing: {e}")
        has_error = True
        
    try:
        from superagent.omniparser import OmniParserV2
        print("✅ OmniParser module importable")
    except ImportError as e:
        print(f"❌ OmniParser module error: {e}")
        has_error = True
        
    if has_error:
        print("⚠️  Some dependencies are missing!")
        sys.exit(1)
    else:
        print("🎉 All OmniParser V2 dependencies are installed!")
        sys.exit(0)

if __name__ == "__main__":
    check_deps()
