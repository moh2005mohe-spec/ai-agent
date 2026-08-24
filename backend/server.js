const express = require('express');
const cors = require('cors');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 10000;
const WORKSPACE_ROOT = path.join(__dirname, 'workspaces');

if (!fs.existsSync(WORKSPACE_ROOT)) {
  fs.mkdirSync(WORKSPACE_ROOT, { recursive: true });
}

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true }));

const rawCorsOrigin = (process.env.CORS_ORIGIN || '*').trim();
const allowedOrigins = rawCorsOrigin
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

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

app.get('/', (_req, res) => {
  res.status(200).json({
    name: 'Aider Web Backend',
    status: 'running',
    endpoints: {
      health: 'GET /api/health',
      coder: 'POST /api/coder',
      files: 'GET /api/files/:userId',
      gitClone: 'POST /api/git/clone',
      gitStatus: 'GET /api/git/status/:userId',
      gitPush: 'POST /api/git/push',
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
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    if (entry.isDirectory()) {
      if (
        entry.name === '.git' ||
        entry.name === 'node_modules' ||
        entry.name === '__pycache__' ||
        entry.name === '.next' ||
        entry.name === 'dist' ||
        entry.name === '.cache'
      ) {
        continue;
      }
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
      execSync('git init', { cwd: workspacePath, timeout: 10000 });
      execSync('git config user.email "agent@aider-web.local"', { cwd: workspacePath, timeout: 5000 });
      execSync('git config user.name "AI Coding Agent"', { cwd: workspacePath, timeout: 5000 });
    } catch {
      // Non-fatal
    }
  }
}

// Git Endpoints
app.post('/api/git/clone', async (req, res) => {
  try {
    const { userId, repoUrl, token, branch } = req.body;
    if (!repoUrl || typeof repoUrl !== 'string') {
      return res.status(400).json({ error: 'GitHub repository URL is required.' });
    }
    const safeUserId = sanitizeUserId(userId) || 'user-default';
    const workspacePath = getWorkspacePath(safeUserId);

    let authenticatedUrl = repoUrl.trim();
    if (token && token.trim()) {
      const cleanToken = token.trim();
      if (authenticatedUrl.startsWith('https://')) {
        authenticatedUrl = authenticatedUrl.replace('https://', `https://${cleanToken}@`);
      }
    }

    if (fs.existsSync(workspacePath)) {
      fs.rmSync(workspacePath, { recursive: true, force: true });
    }
    fs.mkdirSync(workspacePath, { recursive: true });

    const branchArg = branch ? `--branch ${branch.trim()}` : '';
    const cloneCommand = `git clone --depth 1 ${branchArg} "${authenticatedUrl}" .`;

    execSync(cloneCommand, {
      cwd: workspacePath,
      timeout: 60000,
      stdio: 'pipe',
    });

    try {
      execSync('git config user.email "agent@aider-web.local"', { cwd: workspacePath, timeout: 5000 });
      execSync('git config user.name "AI Coding Agent"', { cwd: workspacePath, timeout: 5000 });
    } catch {
      // Non-fatal
    }

    const files = readAllFiles(workspacePath);
    let currentBranch = 'main';
    try {
      currentBranch = execSync('git branch --show-current', { cwd: workspacePath, encoding: 'utf-8' }).trim();
    } catch {
      // Non-fatal
    }

    return res.json({
      success: true,
      message: `Successfully cloned ${repoUrl}`,
      branch: currentBranch,
      filesCount: files.length,
      files,
    });
  } catch (err) {
    console.error('Git clone error:', err);
    return res.status(500).json({
      error: 'Failed to clone repository from GitHub.',
      details: err.stderr ? err.stderr.toString() : err.message,
    });
  }
});

app.get('/api/git/status/:userId', (req, res) => {
  const safeUserId = sanitizeUserId(req.params.userId) || 'user-default';
  const workspacePath = getWorkspacePath(safeUserId);

  if (!fs.existsSync(workspacePath) || !fs.existsSync(path.join(workspacePath, '.git'))) {
    return res.json({ isRepo: false });
  }

  try {
    const statusOutput = execSync('git status --porcelain', { cwd: workspacePath, encoding: 'utf-8' });
    let currentBranch = 'main';
    try {
      currentBranch = execSync('git branch --show-current', { cwd: workspacePath, encoding: 'utf-8' }).trim();
    } catch {}

    let remoteUrl = '';
    try {
      remoteUrl = execSync('git config --get remote.origin.url', { cwd: workspacePath, encoding: 'utf-8' }).trim();
      remoteUrl = remoteUrl.replace(/https:\/\/[^@]+@/, 'https://');
    } catch {}

    const lines = statusOutput.split('\n').filter(Boolean);
    const modifiedFiles = lines.map((l) => l.trim());

    return res.json({
      isRepo: true,
      currentBranch,
      remoteUrl,
      modifiedFiles,
      hasChanges: modifiedFiles.length > 0,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get git status', details: err.message });
  }
});

app.post('/api/git/push', async (req, res) => {
  try {
    const { userId, commitMessage, token, branch, email, name, repoUrl } = req.body;
    const safeUserId = sanitizeUserId(userId) || 'user-default';
    const workspacePath = getWorkspacePath(safeUserId);

    if (!fs.existsSync(workspacePath) || !fs.existsSync(path.join(workspacePath, '.git'))) {
      return res.status(400).json({ error: 'Workspace is not a git repository.' });
    }

    const authorEmail = email || 'agent@aider-web.local';
    const authorName = name || 'AI Coding Agent';
    const msg = commitMessage || 'feat: automated changes by AI Coding Agent';

    execSync(`git config user.email "${authorEmail}"`, { cwd: workspacePath, timeout: 5000 });
    execSync(`git config user.name "${authorName}"`, { cwd: workspacePath, timeout: 5000 });

    execSync('git add -A', { cwd: workspacePath, timeout: 10000 });

    try {
      execSync(`git commit -m "${msg.replace(/"/g, "'")}"`, { cwd: workspacePath, timeout: 10000 });
    } catch {
      // Nothing to commit
    }

    let targetBranch = branch;
    if (!targetBranch) {
      try {
        targetBranch = execSync('git branch --show-current', { cwd: workspacePath, encoding: 'utf-8' }).trim();
      } catch {
        targetBranch = 'main';
      }
    }

    if (token && token.trim()) {
      let remote = repoUrl;
      if (!remote) {
        try {
          remote = execSync('git config --get remote.origin.url', { cwd: workspacePath, encoding: 'utf-8' }).trim();
        } catch {}
      }
      if (remote) {
        let authRemote = remote.trim();
        if (authRemote.startsWith('https://')) {
          authRemote = authRemote.replace(/https:\/\/[^@]*@?/, `https://${token.trim()}@`);
        }
        execSync(`git remote set-url origin "${authRemote}"`, { cwd: workspacePath, timeout: 5000 });
      }
    }

    const pushOutput = execSync(`git push origin ${targetBranch}`, {
      cwd: workspacePath,
      encoding: 'utf-8',
      timeout: 45000,
    });

    return res.json({
      success: true,
      message: `Successfully pushed changes to branch '${targetBranch}' on GitHub.`,
      details: pushOutput,
    });
  } catch (err) {
    console.error('Git push error:', err);
    return res.status(500).json({
      error: 'Failed to push changes to GitHub.',
      details: err.stderr ? err.stderr.toString() : err.message,
    });
  }
});

function runAider(workspacePath, prompt, apiKey, model, provider) {
  return new Promise((resolve, reject) => {
    const timeoutMs = Number(process.env.AIDER_TIMEOUT_MS || 300000);
    const env = {
      ...process.env,
      OPENAI_API_KEY: '',
      ANTHROPIC_API_KEY: '',
      OPENROUTER_API_KEY: '',
      DEEPSEEK_API_KEY: '',
    };

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

    const aiderModel = model;
    const args = [
      '--model', aiderModel,
      '--yes',
      '--no-auto-commits',
      '--message', prompt,
    ];

    const aider = spawn('python3', ['-m', 'aider', ...args], {
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
      clearTimeout(timeout);
      resolve({
        exitCode: code,
        stdout,
        stderr,
      });
    });

    const timeout = setTimeout(() => {
      aider.kill('SIGTERM');
      reject(new Error(`Aider timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    aider.stdin.end();
  });
}

app.post('/api/coder', async (req, res) => {
  try {
    const { prompt, apiKey, userId, model, provider } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'A prompt is required.' });
    }

    const safeUserId = sanitizeUserId(userId) || 'user-default';
    const workspacePath = getWorkspacePath(safeUserId);

    if (!fs.existsSync(workspacePath)) {
      fs.mkdirSync(workspacePath, { recursive: true });
    }
    ensureGitRepo(workspacePath);

    const selectedModel = (model && typeof model === 'string') ? model : 'openrouter/deepseek/deepseek-r1:free';
    const selectedProvider = (provider && typeof provider === 'string') ? provider : 'openrouter';

    const result = await runAider(workspacePath, prompt.trim(), (apiKey || '').trim(), selectedModel, selectedProvider);

    let files = [];
    try {
      files = readAllFiles(workspacePath);
    } catch (err) {}

    const succeeded = result.exitCode === 0;
    return res.status(succeeded ? 200 : 502).json({
      success: succeeded,
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
