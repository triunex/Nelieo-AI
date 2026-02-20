# Nelieo AI OS - Full Version Startup Script (Xvfb + Xpra Edition)
set -e

echo "🧹 Cleaning up old X11 locks..."
rm -f /tmp/.X100-lock /tmp/.X11-unix/X100 || true

# Fix for Xlib/PyAutoGUI .Xauthority error
echo "🔑 Creating dummy .Xauthority..."
touch /root/.Xauthority
export XAUTHORITY=/root/.Xauthority

echo "🖥️ Starting Virtual Framebuffer (Xvfb) on :100..."
Xvfb :100 -screen 0 1920x1080x24 &

# Wait for Xvfb
sleep 2

echo "🕸️ Attaching Xpra to :100 for web streaming..."
xpra upgrade :100 --bind-tcp=0.0.0.0:10005 --html=on --exit-with-children=no --daemon=yes

# Verify display
echo "⏳ Verifying display :100..."
for i in {1..15}; do
    if xdpyinfo -display :100 >/dev/null 2>&1; then
        echo "✅ Display :100 is READY!"
        break
    fi
    sleep 1
done

echo "🧠 Starting AI OS Agent API..."
touch /var/log/agent-api.log
# Ensure DISPLAY is set
export DISPLAY=:100
python3 /opt/agent-api.py 2>&1 | tee -a /var/log/agent-api.log
