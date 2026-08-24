#!/bin/sh
set -eu

PORT=10001 node backend/server.js &
BACKEND_PID=$!
npm run start -- --hostname 0.0.0.0 --port 3000 &
NEXT_PID=$!

cleanup() {
  kill "$BACKEND_PID" "$NEXT_PID" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

nginx -g 'daemon off;' &
NGINX_PID=$!

wait -n "$BACKEND_PID" "$NEXT_PID" "$NGINX_PID"
exit $?
