#!/bin/bash
# Nelieo AI OS - Full Version Startup Script (Bulletproof Edition)
set -e

echo "🧹 Cleaning up old X11 locks..."
rm -f /tmp/.X100-lock /tmp/.X11-unix/X100 || true

# Fix for Xlib/PyAutoGUI .Xauthority error
echo "🔑 Creating X11 auth..."
touch /root/.Xauthority
export XAUTHORITY=/root/.Xauthority
export DISPLAY=:100

echo "🖥️ Starting Xpra with built-in virtual display on :100..."
# Use xpra start with --xvfb flag — this lets Xpra manage its own Xvfb
xpra start :100 \
    --bind-tcp=0.0.0.0:10005 \
    --html=on \
    --daemon=yes \
    --xvfb="Xvfb +extension Composite -screen 0 1920x1080x24+32 -nolisten tcp -noreset" \
    --exit-with-children=no

# Wait for display to be ready
echo "⏳ Waiting for display :100..."
for i in {1..20}; do
    if xdpyinfo -display :100 >/dev/null 2>&1; then
        echo "✅ Display :100 is READY!"
        break
    fi
    sleep 1
done

# Verify Xpra is serving on port 10005
echo "🕸️ Verifying Xpra web server..."
sleep 2
if ss -tlnp | grep -q 10005; then
    echo "✅ Xpra web server ACTIVE on port 10005"
else
    echo "⚠️ Xpra web server not detected on 10005, check /tmp/:100.log"
fi

echo "🧠 Starting AI OS Agent API..."
touch /var/log/agent-api.log
python3 /opt/agent-api.py 2>&1 | tee -a /var/log/agent-api.log
