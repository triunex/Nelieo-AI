#!/bin/bash

echo "🚀 Starting AI OS with Phase 1 Apps + Nelieo Screen Agent"
echo "============================================================"

# Set environment variables
export DISPLAY=:100
export PORT="${PORT:-10005}"
export PYTHONUNBUFFERED=1
export USER_ID="${USER_ID:-default}"

# Create necessary directories
mkdir -p /var/log/supervisor
mkdir -p /root/.config
mkdir -p /tmp/.X11-unix
mkdir -p /var/run

# Clean up any stale X11 locks
rm -rf /tmp/.X11-unix/*
rm -rf /tmp/.X*-lock

echo "✅ Environment configured"
echo "🖥️  Display: $DISPLAY"
echo "🌐 Port: $PORT"
echo "👤 User: $USER_ID"
echo ""

# Start Xvfb (Virtual Display Server)
echo "🖥️  Starting Xvfb..."
Xvfb $DISPLAY -screen 0 1920x1080x24 -ac +extension GLX +render -noreset &
XVFB_PID=$!
sleep 2

# Verify Xvfb is running
if ! ps -p $XVFB_PID > /dev/null; then
    echo "❌ Failed to start Xvfb"
    exit 1
fi
echo "✅ Xvfb started (PID: $XVFB_PID)"

# Start D-Bus (required for some apps)
echo "🔌 Starting D-Bus..."
eval $(dbus-launch --sh-syntax)
export DBUS_SESSION_BUS_ADDRESS
export DBUS_SESSION_BUS_PID
echo "✅ D-Bus started"

# Start Window Manager (Openbox)
echo "🪟 Starting Openbox window manager..."
openbox --config-file /root/.config/openbox/rc.xml &
OPENBOX_PID=$!
sleep 2

if ! ps -p $OPENBOX_PID > /dev/null; then
    echo "❌ Failed to start Openbox"
    exit 1
fi
echo "✅ Openbox started (PID: $OPENBOX_PID)"

# Start PulseAudio (for audio support)
echo "🔊 Starting PulseAudio..."
pulseaudio --start --exit-idle-time=-1 &
sleep 1
echo "✅ PulseAudio started"

echo ""
echo "📱 Phase 1 Apps will launch:"
echo "   1. Chrome"
echo "   2. Gmail"
echo "   3. Notion"
echo "   4. Instagram"
echo "   5. Facebook"
echo "   6. Salesforce"
echo "   7. QuickBooks"
echo "   8. Slack"
echo "   9. LinkedIn"
echo "   10. Google Sheets"
echo "   11. Zoom"
echo "   12. Asana"
echo ""
echo "🤖 Nelieo Screen Agent will control all apps"
echo "🌐 Access via: http://localhost:${PORT}"
echo "============================================================"

# Start supervisord which manages all processes
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
