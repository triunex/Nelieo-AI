FROM mcr.microsoft.com/devcontainers/base:debian

# Add Xpra repository and install dependencies for xpra + Chrome
# Xpra packages are provided by the xpra project; add their repo and signing key.
RUN apt-get update && apt-get install -y wget gnupg apt-transport-https ca-certificates curl \
    && mkdir -p /usr/share/keyrings \
    && wget -qO /usr/share/keyrings/xpra-archive-keyring.gpg https://xpra.org/gpg.asc \
    && echo "deb [signed-by=/usr/share/keyrings/xpra-archive-keyring.gpg] https://xpra.org/ trixie main" > /etc/apt/sources.list.d/xpra.list \
    # Update and install required packages. Some package names differ between Debian releases
    && apt-get update \
    && apt-get install -y \
       xpra xvfb pulseaudio dbus-x11 x11-xserver-utils \
       fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 \
       libatk1.0-0 libcups2 libdbus-1-3 libgdk-pixbuf-xlib-2.0-0 libnspr4 \
       libnss3 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
       libxss1 libxtst6 xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Install Google Chrome Stable
RUN mkdir -p /usr/share/keyrings \
    && wget -qO /usr/share/keyrings/google-linux-signing-keyring.gpg https://dl.google.com/linux/linux_signing_key.pub \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-linux-signing-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Copy start script and normalize line endings (in case of CRLF on Windows)
COPY start.sh /start.sh
RUN sed -i 's/\r$//' /start.sh && chmod +x /start.sh

EXPOSE 10005

CMD ["/start.sh"]
