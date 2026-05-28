#!/bin/bash

# This script sets up a SOCKS5 proxy via SSH tunnel to the remote Russian server.
# The proxy will be available at localhost:1080.

REMOTE_IP="87.103.201.73"
REMOTE_USER="user0"
REMOTE_PORT="2222"
REMOTE_PASS="1p!9-@WG"
LOCAL_PORT=1080

echo "🚀 Starting SSH tunnel to ${REMOTE_IP}..."

# Kill any existing process on this port
pkill -f "ssh.*-D ${LOCAL_PORT}" 2>/dev/null

# Start the tunnel in the background
sshpass -p "${REMOTE_PASS}" ssh -o StrictHostKeyChecking=no -p "${REMOTE_PORT}" -N -D "${LOCAL_PORT}" "${REMOTE_USER}@${REMOTE_IP}" &

# Wait for the tunnel to establish
sleep 3

if nc -zv 127.0.0.1 ${LOCAL_PORT} 2>/dev/null; then
    echo "✅ SSH tunnel established on localhost:${LOCAL_PORT}"
    echo "🌐 You can now run the automation with:"
    echo "export PROXY_SERVER=socks5://127.0.0.1:1080"
else
    echo "❌ Failed to start SSH tunnel."
fi
