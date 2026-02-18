#!/bin/bash
# ScreenAgent startup script

set -e

echo "Starting Nelieo ScreenAgent..."

# Wait for X11 to be ready
timeout=30
while [ $timeout -gt 0 ]; do
    if xdpyinfo -display $DISPLAY >/dev/null 2>&1; then
        echo "X11 display $DISPLAY is ready"
        break
    fi
    echo "Waiting for X11 display... ($timeout seconds remaining)"
    sleep 1
    timeout=$((timeout - 1))
done

if [ $timeout -eq 0 ]; then
    echo "ERROR: X11 display failed to start"
    exit 1
fi

# Check for required API keys
if [ -z "$OPENAI_API_KEY" ] && [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "WARNING: No AI API keys configured. ScreenAgent will not function."
    echo "Set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variable."
fi

# Set working directory
cd /opt/screen-agent

# Install client requirements if present (first run only)
if [ -f "client/requirements.txt" ]; then
    echo "Installing ScreenAgent client requirements..."
    pip3 install --no-cache-dir -r client/requirements.txt || true
fi

# Patch client config to point at local VNC server and LLM
if [ -f "client/config.yml" ]; then
    echo "Patching ScreenAgent client/config.yml for local VNC..."
    sed -i "s/host:.*/host: \"localhost\"/" client/config.yml || true
    sed -i "s/port:.*/port: 5900/" client/config.yml || true
    sed -i "s/password:.*/password: \"shorya123456\"/" client/config.yml || true
    # If GPT4V present, use env OPENAI_API_KEY if set
    if [ -n "$OPENAI_API_KEY" ]; then
        sed -i "s/openai_api_key:.*/openai_api_key: \"$OPENAI_API_KEY\"/" client/config.yml || true
    fi
fi

# Run the ScreenAgent controller UI (headless Qt still needs X display; we have :100)
if [ -f "client/run_controller.py" ]; then
    echo "Starting ScreenAgent client controller..."
    exec python3 -u client/run_controller.py -c client/config.yml 2>&1 | tee /var/log/screen-agent.log
else
    echo "ERROR: client/run_controller.py not found in /opt/screen-agent"
    exit 1
fi
