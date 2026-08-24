FROM node:20-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv git curl ca-certificates nginx \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m pip install --no-cache-dir aider-chat --break-system-packages

WORKDIR /app

COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/

RUN npm install && (cd backend && npm install)

COPY . .

RUN npm run build && chmod +x start.sh

COPY deploy/nginx.conf /etc/nginx/nginx.conf

EXPOSE 10000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl --fail http://127.0.0.1:10000/api/health || exit 1

CMD ["./start.sh"]
