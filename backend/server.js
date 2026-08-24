const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();

const PORT = process.env.PORT || 10000;
const WORKSPACE_ROOT = path.join(__dirname, 'workspaces');

if (!fs.existsSync(WORKSPACE_ROOT)) {
  fs.mkdirSync(WORKSPACE_ROOT, { recursive: true });
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const rawCorsOrigin = (process.env.CORS_ORIGIN || '*').trim();
const allowedOrigins = rawCorsOrigin
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// If CORS_ORIGIN is '*' (default), allow all origins without throwing.
// If specific origins are listed, only those are allowed.
const allowAll = allowedOrigins.includes('*');

const corsOptions = {
  origin(origin, cb) {
    if (allowAll || !origin || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

/* ---- Root route: simple status page so visiting the URL in a browser works ---- */
app.get('/', (_req, res) => {
  res.status(200).json({
    name: 'Aider Web Backend',
    status: 'running',
    endpoints: {
      health: 'GET /api/health',
      coder: 'POST /api/coder',
      files: 'GET /api/files/:userId',
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

function sanitizeUserId(userId) {
  if (!userId || typeof userId !== 'string') return null;
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, '');
  if (safe.length === 0 || safe.length > 128) return null;
  return safe;
}

function getWorkspacePath(userId) {
  const hashed = crypto.createHash('sha256').update(userId).digest('hex');
  return path.join(WORKSPACE_ROOT, hashed);
}

function readAllFiles(dir, baseDir = dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    if (entry.isDirectory()) {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '__pycache__') continue;
      files.push(...readAllFiles(fullPath, baseDir));
    } else {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const stat = fs.statSync(fullPath);
        files.push({
          name: entry.name,
          path: relativePath,
          content,
          size: stat.size,
        });
      } catch {
        files.push({ name: entry.name, path: relativePath, content: '[binary file]', size: 0 });
      }
    }
  }
  return files;
}

function ensureGitRepo(workspacePath) {
  if (!fs.existsSync(path.join(workspacePath, '.git'))) {
    try {
      const { execSync } = require('child_process');
      execSync('git init', { cwd: workspacePath, timeout: 10000 });
      execSync('git config user.email "aider@local"', { cwd: workspacePath, timeout: 5000 });
      execSync('git config user.name "Aider Bot"', { cwd: workspacePath, timeout: 5000 });
    } catch {
      // Git init failure is non-fatal; Aider can still run without a repo
    }
  }
}

/* ---- Provider-aware Aider runner ---- */
// provider: 'anthropic' | 'openai' | 'openrouter' | 'deepseek' | 'openrouter'
function runAider(workspacePath, prompt, apiKey, model, provider) {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      OPENAI_API_KEY: '',
      ANTHROPIC_API_KEY: '',
      OPENROUTER_API_KEY: '',
      DEEPSEEK_API_KEY: '',
    };

    // Set the right env var based on provider
    switch (provider) {
      case 'anthropic':
        env.ANTHROPIC_API_KEY = apiKey;
        break;
      case 'openai':
        env.OPENAI_API_KEY = apiKey;
        break;
      case 'openrouter':
        env.OPENROUTER_API_KEY = apiKey;
        break;
      case 'deepseek':
        env.DEEPSEEK_API_KEY = apiKey;
        break;
      default:
        // Fallback: try to detect from model name
        if (model.startsWith('claude')) {
          env.ANTHROPIC_API_KEY = apiKey;
        } else if (model.startsWith('deepseek')) {
          env.DEEPSEEK_API_KEY = apiKey;
        } else if (model.startsWith('openrouter/')) {
          env.OPENROUTER_API_KEY = apiKey;
        } else {
          env.OPENAI_API_KEY = apiKey;
        }
    }

    // Aider uses the `openrouter/` prefix to route through OpenRouter
    const aiderModel = model;

    const args = [
      '--model', aiderModel,
      '--yes',
      '--no-auto-commits',
      '--message', prompt,
    ];

    const aider = spawn('python3', ['-m', 'aider'], {
      cwd: workspacePath,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    aider.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    aider.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    aider.on('error', (err) => {
      reject(err);
    });

    aider.on('close', (code) => {
      resolve({
        exitCode: code,
        stdout,
        stderr,
      });
    });

    aider.stdin.end();
  });
}

app.post('/api/coder', async (req, res) => {
  try {
    const { prompt, apiKey, userId, model, provider } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'A prompt is required.' });
    }
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      return res.status(400).json({ error: 'An API key is required.' });
    }
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'A userId is required.' });
    }

    const safeUserId = sanitizeUserId(userId);
    if (!safeUserId) {
      return res.status(400).json({ error: 'Invalid userId.' });
    }

    const workspacePath = getWorkspacePath(safeUserId);
    if (!fs.existsSync(workspacePath)) {
      fs.mkdirSync(workspacePath, { recursive: true });
    }

    ensureGitRepo(workspacePath);

    const selectedModel = (model && typeof model === 'string') ? model : 'claude-3-5-sonnet-20241022';
    const selectedProvider = (provider && typeof provider === 'string') ? provider : null;

    const result = await runAider(workspacePath, prompt.trim(), apiKey.trim(), selectedModel, selectedProvider);

    let files = [];
    try {
      files = readAllFiles(workspacePath);
    } catch (err) {
      // workspace might be empty or have permission issues
    }

    return res.json({
      success: true,
      exitCode: result.exitCode,
      logs: result.stdout,
      errorLogs: result.stderr,
      files,
    });
  } catch (err) {
    console.error('Error in /api/coder:', err);
    return res.status(500).json({
      error: 'An unexpected error occurred while running the coding agent.',
      details: err.message,
    });
  }
});

app.get('/api/files/:userId', (req, res) => {
  const safeUserId = sanitizeUserId(req.params.userId);
  if (!safeUserId) {
    return res.status(400).json({ error: 'Invalid userId.' });
  }
  const workspacePath = getWorkspacePath(safeUserId);
  if (!fs.existsSync(workspacePath)) {
    return res.json({ files: [] });
  }
  try {
    const files = readAllFiles(workspacePath);
    return res.json({ files });
  } catch (err) {
    return res.status(500).json({ error: 'Could not read workspace files.' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Aider backend listening on port ${PORT}`);
});
