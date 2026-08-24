# Aider Web UI — BYOK AI Coding Agent

A self-hosted web interface for the [Aider](https://aider.chat) AI coding agent using a **Bring Your Own Key (BYOK)** model. Users supply their own Anthropic or OpenAI API key, which stays in their browser — the server never stores or pays for AI tokens.

## Architecture

```
┌─────────────────────────────┐     ┌──────────────────────────────────┐
│  FRONTEND (Vercel)          │     │  BACKEND (Render.com)            │
│  Next.js + Tailwind CSS     │────▶│  Node.js/Express + Docker        │
│  Dark-mode developer UI     │     │  Python3 + Git + aider-chat      │
│  API key stored in browser  │     │  Per-user workspace sandboxes    │
└─────────────────────────────┘     └──────────────────────────────────┘
```

### Frontend
- **Sidebar**: API key input (stored in LocalStorage only), backend URL config, model selector, and a file tree of generated files.
- **Terminal panel**: Shows your prompt and Aider's execution logs.
- **Code viewer**: Click any generated file to view its source code with syntax highlighting badges and copy-to-clipboard.

### Backend
- Express server with a `POST /api/coder` endpoint that spawns Aider via `child_process`.
- Each user gets an isolated workspace directory (SHA-256 hashed by userId).
- Aider runs with `--model`, `--yes`, and `--message` flags inside the user's workspace.
- After execution, all generated files are read and returned alongside the logs.
- CORS enabled for the frontend domain.

---

## Deployment Guide

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Aider Web UI"
git branch -M main
git remote add origin https://github.com/moh2005mohe-spec/ai-agent.git
git push -u origin main
```

### Step 2 — Deploy the Backend to Render.com

1. Go to [render.com](https://render.com) and sign in.
2. Click **New** → **Web Service**.
3. Connect your GitHub repo and select it.
4. Configure the service:
   - **Name**: `aider-web-backend`
   - **Region**: Oregon (or closest to US users)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: **Docker**
   - **Dockerfile Path**: `./Dockerfile`
5. Add environment variables:
   - `CORS_ORIGIN` = your Vercel frontend URL (e.g. `https://your-app.vercel.app`) — set this after deploying the frontend, then update it.
   - `PORT` = `10000` (Render sets this automatically, but the Dockerfile defaults to it)
6. Click **Create Web Service**. Render will build the Docker image (installs Node, Python, pip, git, and aider-chat) and start the server.
7. Note the backend URL: `https://aider-web-backend.onrender.com`

### Step 3 — Deploy the Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in.
2. Click **Add New** → **Project**.
3. Import your GitHub repo.
4. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `.` (project root — the Next.js app lives at the repo root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next` (auto-detected)
5. Add environment variable:
   - `NEXT_PUBLIC_BACKEND_URL` = your Render backend URL (e.g. `https://aider-web-backend.onrender.com`)
6. Click **Deploy**. Vercel will build and deploy the frontend.
7. Note the frontend URL: `https://your-app.vercel.app`

### Step 4 — Link Frontend and Backend

1. Go back to your Render backend service → **Environment** tab.
2. Set `CORS_ORIGIN` to your Vercel frontend URL: `https://your-app.vercel.app`
3. Save — Render will auto-redeploy.
4. In the frontend UI, the backend URL field in the sidebar also lets users verify the connection (click "Check").

### Step 5 — Test

1. Open your Vercel frontend URL.
2. Enter your Anthropic or OpenAI API key in the sidebar (it stays in your browser only).
3. Confirm the backend URL is set to your Render URL and click "Check" — you should see "Backend online".
4. Type a coding prompt and hit Cmd/Ctrl+Enter.
5. Watch the terminal logs, then click generated files in the sidebar to view the code.

---

## Local Development

### Backend
```bash
cd backend
npm install
npm start
# Server runs on http://localhost:10000
```
Requires Python 3, pip, git, and `aider-chat` installed globally:
```bash
pip install aider-chat
```

### Frontend
```bash
npm install
npm run dev
# Runs on http://localhost:3000
```
Set `NEXT_PUBLIC_BACKEND_URL=http://localhost:10000` in `.env.local` for local dev.

---

## API Reference

### `POST /api/coder`
```json
{
  "prompt": "Create a Python Flask todo API",
  "apiKey": "sk-ant-...",
  "userId": "user-abc123",
  "model": "claude-3-5-sonnet-20241022"
}
```
Response:
```json
{
  "success": true,
  "exitCode": 0,
  "logs": "...aider output...",
  "errorLogs": "",
  "files": [
    { "name": "app.py", "path": "app.py", "content": "...", "size": 1234 }
  ]
}
```

### `GET /api/files/:userId`
Returns all files in a user's workspace.

### `GET /api/health`
Health check endpoint.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 13.5 (App Router), TypeScript, Tailwind CSS, lucide-react |
| Backend | Node.js, Express, child_process |
| AI Agent | [Aider](https://aider.chat) (aider-chat PyPI package) |
| Frontend Host | Vercel |
| Backend Host | Render.com (Docker) |
| API Key Storage | Browser LocalStorage only |
