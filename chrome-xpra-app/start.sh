#!/bin/bash

# Configuration (can be overridden via environment)
PORT="${PORT:-10005}"
APP_URL="${APP_URL:-https://www.google.com}"
# CHROME_MODE: "app" (default) launches Chrome as an app for APP_URL; "window" launches a normal browser window
CHROME_MODE="${CHROME_MODE:-app}"

# Common Chrome flags suitable for containerized X11 sessions
CHROME_BASE="google-chrome --no-sandbox --disable-dev-shm-usage --start-maximized"
if [[ -n "${CHROME_EXTRA_FLAGS}" ]]; then
    CHROME_BASE="${CHROME_BASE} ${CHROME_EXTRA_FLAGS}"
fi

# Determine how to start Chrome
START_CHILD="${CHROME_BASE}"
if [[ "${CHROME_MODE}" == "app" && -n "${APP_URL}" ]]; then
    START_CHILD="${CHROME_BASE} --app=${APP_URL}"
fi

# Start xpra HTML5 server
xpra start \
        --bind-tcp=0.0.0.0:${PORT} \
        --html=on \
        --daemon=no \
        --exit-with-children=yes \
        --start-child="${START_CHILD}"
