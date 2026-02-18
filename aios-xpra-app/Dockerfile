FROM ubuntu:22.04

# Prevent interactive prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# ==================== SYSTEM SETUP ====================
# Install basic dependencies
RUN apt-get update && apt-get install -y \
    wget gnupg apt-transport-https ca-certificates curl \
    git python3 python3-pip python3-venv nodejs npm supervisor \
    # Window Manager & Display Server
    xvfb \
    x11vnc \
    xpra \
    openbox \
    obconf \
    # Window control utilities
    wmctrl \
    xdotool \
    x11-utils \
    # Additional utilities
    dbus-x11 \
    fonts-liberation \
    pulseaudio \
    # Networking tools
    net-tools \
    iputils-ping \
    && mkdir -p /usr/share/keyrings \
    && rm -rf /var/lib/apt/lists/*

# Install Xpra and X11 dependencies from Ubuntu repos (more reliable)
RUN apt-get update && apt-get install -y \
    xpra \
    xvfb \
    x11-utils \
    x11-xserver-utils \
    fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 \
    libatk1.0-0 libcups2 libdbus-1-3 libgdk-pixbuf-xlib-2.0-0 libnspr4 \
    libnss3 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libxss1 libxtst6 xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Install Google Chrome (download .deb directly to avoid GPG issues)
RUN wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -O /tmp/chrome.deb \
    && apt-get update \
    && apt-get install -y /tmp/chrome.deb \
    && rm /tmp/chrome.deb \
    && rm -rf /var/lib/apt/lists/*

# Install Slack
RUN wget -q https://downloads.slack-edge.com/releases/linux/4.38.125/prod/x64/slack-desktop-4.38.125-amd64.deb -O /tmp/slack.deb \
    && apt-get update \
    && apt-get install -y /tmp/slack.deb \
    && rm /tmp/slack.deb \
    && rm -rf /var/lib/apt/lists/*

# Install Zoom
RUN wget -q https://zoom.us/client/latest/zoom_amd64.deb -O /tmp/zoom.deb \
    && apt-get update \
    && apt-get install -y /tmp/zoom.deb || true \
    && rm /tmp/zoom.deb \
    && rm -rf /var/lib/apt/lists/*

# Install Microsoft Edge (download .deb directly)
RUN wget -q https://packages.microsoft.com/repos/edge/pool/main/m/microsoft-edge-stable/microsoft-edge-stable_130.0.2849.56-1_amd64.deb -O /tmp/edge.deb \
    && apt-get update \
    && apt-get install -y /tmp/edge.deb || true \
    && rm /tmp/edge.deb \
    && rm -rf /var/lib/apt/lists/*

# Create workspace directories
RUN mkdir -p /opt/screen-agent /opt/apps /opt/apps/configs /root/.config/openbox

# Install scrot for screenshots (needed by vision agent)
RUN apt-get update && apt-get install -y \
    scrot \
    python3-tk \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages for window management and vision agent (split to avoid timeout)
RUN pip3 install --no-cache-dir \
    pyautogui \
    python-xlib \
    pillow \
    opencv-python-headless \
    openai \
    anthropic \
    pyyaml \
    requests \
    websocket-client \
    flask \
    flask-cors \
    flask-socketio \
    python-socketio[client] \
    eventlet \
    transitions \
    jinja2 \
    asyncvnc \
    google-cloud-aiplatform

# Install Microsoft OmniParser V2 dependencies - LIGHTWEIGHT CPU-ONLY
# IMPORTANT: Install torch FIRST with CPU index, then constrain ultralytics
ENV PIP_EXTRA_INDEX_URL=https://download.pytorch.org/whl/cpu

# Install PyTorch CPU-only (~300MB instead of 4GB)
RUN pip3 install --no-cache-dir \
    torch==2.2.0+cpu \
    torchvision==0.17.0+cpu \
    --index-url https://download.pytorch.org/whl/cpu

# Install ultralytics with --no-deps to prevent it from pulling CUDA torch
# Then install its other dependencies manually
RUN pip3 install --no-cache-dir --no-deps ultralytics

# Install ultralytics dependencies (excluding torch which we already have)
# IMPORTANT: numpy must be <2 for PyTorch/YOLO compatibility
# Added retries for network resilience
RUN pip3 install --no-cache-dir --retries 5 --timeout 60 \
    "numpy<2,>=1.22.2" \
    pillow>=7.1.2 \
    pyyaml>=5.3.1 \
    requests>=2.23.0 \
    tqdm>=4.64.0 \
    psutil

# Install heavy packages separately for better error handling
RUN pip3 install --no-cache-dir --retries 5 --timeout 120 \
    opencv-python-headless>=4.6.0

RUN pip3 install --no-cache-dir --retries 5 --timeout 120 \
    scipy>=1.4.1 \
    pandas>=1.1.4 \
    seaborn>=0.11.0 \
    matplotlib>=3.3.0

# Install transformers (Florence-2) - lightweight
RUN pip3 install --no-cache-dir \
    transformers \
    huggingface_hub \
    safetensors \
    accelerate \
    sentencepiece \
    einops \
    timm

# Create OmniParser weights directory
RUN mkdir -p /opt/omniparser/weights

# Set environment variable for OmniParser
ENV OMNIPARSER_WEIGHTS_DIR=/opt/omniparser/weights

WORKDIR /opt/screen-agent

# Chrome/Gmail/Google Sheets config (all use Chrome)
RUN echo '{"name":"Chrome","url":"https://www.google.com","cmd":"google-chrome"}' > /opt/apps/configs/chrome.json \
    && echo '{"name":"Gmail","url":"https://mail.google.com","cmd":"google-chrome"}' > /opt/apps/configs/gmail.json \
    && echo '{"name":"Google Sheets","url":"https://sheets.google.com","cmd":"google-chrome"}' > /opt/apps/configs/sheets.json

# Notion config
RUN echo '{"name":"Notion","url":"https://www.notion.so","cmd":"google-chrome"}' > /opt/apps/configs/notion.json

# Instagram config
RUN echo '{"name":"Instagram","url":"https://www.instagram.com","cmd":"google-chrome"}' > /opt/apps/configs/instagram.json

# Facebook config
RUN echo '{"name":"Facebook","url":"https://www.facebook.com","cmd":"google-chrome"}' > /opt/apps/configs/facebook.json

# Salesforce config
RUN echo '{"name":"Salesforce","url":"https://login.salesforce.com","cmd":"google-chrome"}' > /opt/apps/configs/salesforce.json

# QuickBooks config
RUN echo '{"name":"QuickBooks","url":"https://quickbooks.intuit.com","cmd":"google-chrome"}' > /opt/apps/configs/quickbooks.json

# Slack config
RUN echo '{"name":"Slack","url":"https://slack.com","cmd":"slack"}' > /opt/apps/configs/slack.json

# LinkedIn config
RUN echo '{"name":"LinkedIn","url":"https://www.linkedin.com","cmd":"microsoft-edge"}' > /opt/apps/configs/linkedin.json

# Zoom config
RUN echo '{"name":"Zoom","url":"https://zoom.us","cmd":"zoom"}' > /opt/apps/configs/zoom.json

# Asana config
RUN echo '{"name":"Asana","url":"https://app.asana.com","cmd":"google-chrome"}' > /opt/apps/configs/asana.json

# Copy startup scripts and supervisor config
COPY start.sh /start.sh
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY app_launcher.py /opt/app-launcher.py
# Also copy as importable module name for Python imports
COPY app_launcher.py /opt/app_launcher.py
COPY window_controller.py /opt/window_controller.py
COPY run-screen-agent.sh /opt/run-screen-agent.sh
COPY agent-api.py /opt/agent-api.py
COPY start-agent-api.sh /opt/start-agent-api.sh
COPY openbox-rc.xml /root/.config/openbox/rc.xml
COPY xpra-hide-ui.js /usr/share/xpra/www/js/xpra-hide-ui.js

# Copy vision agents
COPY vision_agent.py /opt/vision_agent.py
COPY screen_agent_headless.py /opt/screen_agent_headless.py
COPY screenagent-config.yml /opt/screenagent-config.yml
COPY pyqt5_mock.py /opt/pyqt5_mock.py

# Copy OmniParser V2 download script
COPY download-omniparser.sh /opt/download-omniparser.sh

# Copy SuperAgent module (enhanced vision with OmniParser V2 integration)
# NOTE: Before building, copy superagent folder into this directory:
#   cp -r ../superagent ./superagent
# Or build from parent directory with: docker build -f aios-xpra-app/Dockerfile .
COPY superagent /opt/lumina-search-flow-main/superagent

# Fix line endings and set permissions
RUN sed -i 's/\r$//' /start.sh && chmod +x /start.sh \
    && sed -i 's/\r$//' /opt/app-launcher.py && chmod +x /opt/app-launcher.py \
    && sed -i 's/\r$//' /opt/app_launcher.py && chmod +x /opt/app_launcher.py \
    && sed -i 's/\r$//' /opt/window_controller.py && chmod +x /opt/window_controller.py \
    && sed -i 's/\r$//' /opt/run-screen-agent.sh && chmod +x /opt/run-screen-agent.sh \
    && sed -i 's/\r$//' /opt/agent-api.py && chmod +x /opt/agent-api.py \
    && sed -i 's/\r$//' /opt/start-agent-api.sh && chmod +x /opt/start-agent-api.sh \
    && sed -i 's/\r$//' /opt/vision_agent.py && chmod +x /opt/vision_agent.py \
    && sed -i 's/\r$//' /opt/screen_agent_headless.py && chmod +x /opt/screen_agent_headless.py \
    && sed -i 's/\r$//' /opt/pyqt5_mock.py && chmod +x /opt/pyqt5_mock.py \
    && sed -i 's/\r$//' /opt/download-omniparser.sh && chmod +x /opt/download-omniparser.sh \
    && find /opt/lumina-search-flow-main/superagent -name "*.py" -exec sed -i 's/\r$//' {} \; \
    && echo "<script type=\"text/javascript\" src=\"js/xpra-hide-ui.js\"></script>" >> /usr/share/xpra/www/index.html \
    && mkdir -p /root/.config/openbox

# Prepare VNC password for x11vnc (used by ScreenAgent config.yml)
RUN mkdir -p /root/.vnc \
        && x11vnc -storepasswd 'shorya123456' /root/.vnc/passwd

# Create log directories
RUN mkdir -p /var/log/supervisor /var/log

# Expose ports: 10005 for Xpra, 8081 for Agent API
EXPOSE 10005 8081

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:10005/ || exit 1

CMD ["/start.sh"]
