#!/bin/bash
# Nelieo AI OS - Full Version Startup Script
set -e

echo "🖥️ Starting Xpra Display Server on :100..."
# Start Xpra and put it in the background
xpra start :100 --bind-tcp=0.0.0.0:10005 --html=on --exit-with-children=no --daemon=yes

# Wait for the X11 socket to be ready (up to 30 seconds)
echo "⏳ Waiting for display :100 to initialize..."
for i in {1..30}; do
    if xdpyinfo -display :100 >/dev/null 2>&1; then
        echo "✅ Display :100 is READY!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ ERROR: Display :100 failed to start after 30 seconds."
        exit 1
    fi
    sleep 1
done

echo "🧠 Starting AI OS Agent API..."
touch /var/log/agent-api.log
python3 /opt/agent-api.py 2>&1 | tee -a /var/log/agent-api.log
