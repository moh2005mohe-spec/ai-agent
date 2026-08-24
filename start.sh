#!/bin/bash
set -e

# Start Backend on port 10001
PORT=10001 node backend/server.js &
BACKEND_PID=$!

# Start Next.js on port 3000
npm run start -- -H 0.0.0.0 -p 3000 &
NEXT_PID=$!

# Wait for both services to open their ports before starting Nginx
echo "Waiting for Backend (10001) and Next.js (3000) to be ready..."
for i in {1..40}; do
  BACKEND_UP=0
  NEXT_UP=0

  if curl -s -f http://127.0.0.1:10001/api/health >/dev/null 2>&1; then
    BACKEND_UP=1
  fi

  if curl -s -f -I http://127.0.0.1:3000 >/dev/null 2>&1; then
    NEXT_UP=1
  fi

  if [ "$BACKEND_UP" -eq 1 ] && [ "$NEXT_UP" -eq 1 ]; then
    echo "Both services are up and healthy!"
    break
  fi

  sleep 1
done

cleanup() {
  echo "Stopping services..."
  kill "$BACKEND_PID" "$NEXT_PID" "${NGINX_PID:-}" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

# Start Nginx in foreground on port 10000
nginx -g 'daemon off;' &
NGINX_PID=$!

wait -n "$BACKEND_PID" "$NEXT_PID" "$NGINX_PID"
exit $?
