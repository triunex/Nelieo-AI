#!/bin/bash
# Wrapper script to start agent-api with proper error logging

cd /opt
export DISPLAY=:100
export PYTHONPATH=/opt:/opt/screen-agent:/opt/lumina-search-flow-main

echo "$(date) - Starting agent-api..." >> /var/log/agent-api.log
echo "$(date) - PYTHONPATH: $PYTHONPATH" >> /var/log/agent-api.log
echo "$(date) - GEMINI_API_KEY: ${GEMINI_API_KEY:0:20}..." >> /var/log/agent-api.log

# Run with full error output
python3 -u /opt/agent-api.py 2>&1 | tee -a /var/log/agent-api.log

# If it exits, log the exit code
EXIT_CODE=$?
echo "$(date) - agent-api exited with code: $EXIT_CODE" >> /var/log/agent-api.log
exit $EXIT_CODE
