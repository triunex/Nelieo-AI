FROM mcr.microsoft.com/devcontainers/base:debian

# Install dependencies for xpra + Chrome
RUN apt-get update && apt-get install -y \
    xpra xvfb pulseaudio dbus-x11 x11-xserver-utils \
    wget gnupg apt-transport-https \
    fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 \
    libatk1.0-0 libcups2 libdbus-1-3 libgdk-pixbuf2.0-0 libnspr4 \
    libnss3 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libxss1 libxtst6 xdg-utils ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Google Chrome Stable
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" \
        > /etc/apt/sources.list.d/google-chrome.list && \
    apt-get update && apt-get install -y google-chrome-stable && \
    rm -rf /var/lib/apt/lists/*

# Copy start script and normalize line endings (in case of CRLF on Windows)
COPY start.sh /start.sh
RUN sed -i 's/\r$//' /start.sh && chmod +x /start.sh

EXPOSE 10005

CMD ["/start.sh"]
