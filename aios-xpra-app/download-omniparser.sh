#!/bin/bash
#
# Download Microsoft OmniParser V2 model weights from HuggingFace
#
# Models:
# 1. icon_detect (YOLOv8) - UI element detection with bounding boxes
# 2. icon_caption (Florence-2) - Element description/captioning
#
# Source: https://huggingface.co/microsoft/OmniParser-v2.0
#

set -e

WEIGHTS_DIR="${OMNIPARSER_WEIGHTS_DIR:-/opt/omniparser/weights}"

echo "=============================================="
echo "  Microsoft OmniParser V2 Model Downloader"
echo "=============================================="
echo "Target directory: $WEIGHTS_DIR"
echo ""

# Create directory
mkdir -p "$WEIGHTS_DIR"

# Check if already downloaded
if [ -f "$WEIGHTS_DIR/icon_detect/model.pt" ] && [ -f "$WEIGHTS_DIR/icon_caption_florence/model.safetensors" ]; then
    echo "OmniParser V2 weights already downloaded."
    echo ""
    echo "Files present:"
    ls -la "$WEIGHTS_DIR/icon_detect/" 2>/dev/null || true
    ls -la "$WEIGHTS_DIR/icon_caption_florence/" 2>/dev/null || true
    exit 0
fi

echo "Downloading OmniParser V2 weights from HuggingFace..."
echo ""

# Download icon_detect model (YOLOv8)
echo "[1/2] Downloading icon_detect model (YOLOv8)..."
huggingface-cli download microsoft/OmniParser-v2.0 "icon_detect/train_args.yaml" --local-dir "$WEIGHTS_DIR" --quiet
huggingface-cli download microsoft/OmniParser-v2.0 "icon_detect/model.pt" --local-dir "$WEIGHTS_DIR" --quiet
huggingface-cli download microsoft/OmniParser-v2.0 "icon_detect/model.yaml" --local-dir "$WEIGHTS_DIR" --quiet

echo "[1/2] icon_detect model downloaded."
echo ""

# Download icon_caption model (Florence-2)
echo "[2/2] Downloading icon_caption model (Florence-2)..."
huggingface-cli download microsoft/OmniParser-v2.0 "icon_caption/config.json" --local-dir "$WEIGHTS_DIR" --quiet
huggingface-cli download microsoft/OmniParser-v2.0 "icon_caption/generation_config.json" --local-dir "$WEIGHTS_DIR" --quiet
huggingface-cli download microsoft/OmniParser-v2.0 "icon_caption/model.safetensors" --local-dir "$WEIGHTS_DIR" --quiet

# Rename icon_caption to icon_caption_florence (OmniParser expects this name)
if [ -d "$WEIGHTS_DIR/icon_caption" ]; then
    mv "$WEIGHTS_DIR/icon_caption" "$WEIGHTS_DIR/icon_caption_florence"
fi

echo "[2/2] icon_caption model downloaded."
echo ""

# Verify downloads
echo "=============================================="
echo "  Download Complete!"
echo "=============================================="
echo ""
echo "Installed models:"
echo ""

if [ -f "$WEIGHTS_DIR/icon_detect/model.pt" ]; then
    SIZE=$(du -h "$WEIGHTS_DIR/icon_detect/model.pt" | cut -f1)
    echo "  [OK] icon_detect (YOLOv8): $SIZE"
else
    echo "  [ERROR] icon_detect not found!"
fi

if [ -f "$WEIGHTS_DIR/icon_caption_florence/model.safetensors" ]; then
    SIZE=$(du -h "$WEIGHTS_DIR/icon_caption_florence/model.safetensors" | cut -f1)
    echo "  [OK] icon_caption (Florence-2): $SIZE"
else
    echo "  [ERROR] icon_caption not found!"
fi

echo ""
echo "OmniParser V2 is ready to use."
echo ""
