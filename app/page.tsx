'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Key,
  FolderTree,
  FileCode,
  Terminal,
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Server,
  ChevronRight,
  FileText,
  Copy,
  Check,
  RotateCcw,
  Github,
  Zap,
} from 'lucide-react';
import {
  sendCoderRequest,
  fetchWorkspaceFiles,
  checkBackendHealth,
  type WorkspaceFile,
} from '@/lib/api';
import {
  MODEL_GROUPS,
  DEFAULT_MODEL,
  PROVIDER_KEY_PLACEHOLDERS,
  getProviderForModel,
  isFreeModel,
  type ModelProvider,
} from '@/lib/models';

const SAMPLE_PROMPTS = [
  'Create a Python Flask REST API for a todo app with CRUD endpoints',
  'Build a React calculator component with full keyboard support',
  'Write a Node.js script that converts CSV to JSON',
  'Create a simple HTML/CSS landing page for a coffee shop',
];

interface LogEntry {
  id: string;
  type: 'user' | 'system' | 'error' | 'success';
  text: string;
}

function generateUserId() {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('aider-user-id');
    if (stored) return stored;
    const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem('aider-user-id', id);
    return id;
  }
  return 'user-default';
}

export default function Home() {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [backendUrl, setBackendUrl] = useState('');
  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<WorkspaceFile | null>(null);
  const [userId, setUserId] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'terminal' | 'preview'>('terminal');
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUserId(generateUserId());
  }, []);

  useEffect(() => {
    const storedKey = localStorage.getItem('aider-api-key');
    if (storedKey) {
      setApiKey(storedKey);
      setApiKeySaved(true);
    }
    const storedUrl = localStorage.getItem('aider-backend-url');
    if (storedUrl) {
      setBackendUrl(storedUrl);
    }
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('aider-api-key', apiKey.trim());
      setApiKeySaved(true);
    }
  };

  const handleSaveBackendUrl = () => {
    if (backendUrl.trim()) {
      localStorage.setItem('aider-backend-url', backendUrl.trim());
    }
  };

  const handleCheckBackend = async () => {
    handleSaveBackendUrl();
    const healthy = await checkBackendHealth(backendUrl.trim() || undefined);
    setBackendHealthy(healthy);
  };

  const addLog = (type: LogEntry['type'], text: string) => {
    setLogs((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, type, text }]);
  };

  const handleSubmit = async () => {
    if (!prompt.trim() || !apiKey.trim() || isLoading) return;

    setIsLoading(true);
    setActiveTab('terminal');
    addLog('user', prompt.trim());

    try {
      const result = await sendCoderRequest(
        { prompt: prompt.trim(), apiKey: apiKey.trim(), userId, model, provider: getProviderForModel(model) },
        backendUrl.trim() || undefined
      );

      if (result.logs) {
        addLog('system', result.logs);
      }
      if (result.errorLogs) {
        addLog('error', result.errorLogs);
      }

      if (result.success) {
        addLog('success', `Execution complete (exit code: ${result.exitCode}). ${result.files.length} file(s) generated.`);
        setFiles(result.files);
      } else {
        addLog('error', `Execution failed with exit code ${result.exitCode}`);
        if (result.files.length > 0) {
          setFiles(result.files);
        }
      }
    } catch (err) {
      addLog('error', err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
      setPrompt('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  const handleCopyCode = () => {
    if (selectedFile) {
      navigator.clipboard.writeText(selectedFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClearWorkspace = useCallback(async () => {
    setLogs([]);
    setFiles([]);
    setSelectedFile(null);
  }, []);

  const handleSamplePrompt = (sample: string) => {
    setPrompt(sample);
  };

  const languageFromPath = (filePath: string): string => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      html: 'html',
      css: 'css',
      json: 'json',
      md: 'markdown',
      sh: 'bash',
      yml: 'yaml',
      yaml: 'yaml',
      go: 'go',
      rs: 'rust',
      java: 'java',
      c: 'c',
      cpp: 'cpp',
      rb: 'ruby',
      php: 'php',
      sql: 'sql',
    };
    return map[ext || ''] || 'text';
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">Aider Web UI</h1>
            <p className="text-xs text-muted-foreground">BYOK AI Coding Agent</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                backendHealthy === true
                  ? 'bg-green-500'
                  : backendHealthy === false
                    ? 'bg-red-500'
                    : 'bg-muted-foreground'
              }`}
            />
            <span className="text-muted-foreground">
              {backendHealthy === true ? 'Backend online' : backendHealthy === false ? 'Backend offline' : 'Not checked'}
            </span>
          </div>
          <a
            href="https://github.com/moh2005mohe-spec/ai-agent"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Github className="h-5 w-5" />
          </a>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-card/50">
          {/* Backend URL */}
          <div className="border-b border-border p-4 space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Server className="h-3.5 w-3.5" />
              Backend URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                placeholder="https://your-app.onrender.com"
                className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                onClick={handleCheckBackend}
                className="shrink-0 rounded-md border border-border bg-secondary px-2.5 py-1.5 text-xs hover:bg-secondary/80 transition-colors"
              >
                Check
              </button>
            </div>
          </div>

          {/* API Key */}
          <div className="border-b border-border p-4 space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Key className="h-3.5 w-3.5" />
              API Key
              {apiKeySaved && (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              )}
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setApiKeySaved(false);
                }}
                onBlur={handleSaveApiKey}
                placeholder={PROVIDER_KEY_PLACEHOLDERS[getProviderForModel(model) || 'openrouter']}
                className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 pr-9 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="text-[10px] leading-tight text-muted-foreground">
              Stored only in your browser. Never sent to our database.
            </p>
          </div>

          {/* Model selector */}
          <div className="border-b border-border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Model</label>
              {isFreeModel(model) && (
                <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-medium text-green-400">
                  FREE
                </span>
              )}
            </div>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring max-h-40"
            >
              {MODEL_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.models.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* File Tree */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <FolderTree className="h-3.5 w-3.5" />
                Files
                {files.length > 0 && (
                  <span className="rounded-full bg-primary/15 px-1.5 text-[10px] text-primary">
                    {files.length}
                  </span>
                )}
              </span>
              {files.length > 0 && (
                <button
                  onClick={handleClearWorkspace}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Clear workspace"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
              {files.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <FileCode className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-xs text-muted-foreground/60">
                    Generated files will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {files.map((file) => (
                    <button
                      key={file.path}
                      onClick={() => {
                        setSelectedFile(file);
                        setActiveTab('preview');
                      }}
                      className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                        selectedFile?.path === file.path
                          ? 'bg-primary/15 text-primary'
                          : 'hover:bg-secondary text-foreground/80'
                      }`}
                    >
                      <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="truncate">{file.path}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main content area */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-border px-3 shrink-0">
            <button
              onClick={() => setActiveTab('terminal')}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                activeTab === 'terminal'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              Terminal
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                activeTab === 'preview'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileCode className="h-3.5 w-3.5" />
              Code Viewer
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'terminal' ? (
              <TerminalPanel
                logs={logs}
                isLoading={isLoading}
                logEndRef={logEndRef}
                hasFiles={files.length > 0}
                onSamplePrompt={handleSamplePrompt}
              />
            ) : (
              <CodeViewer
                file={selectedFile}
                onCopy={handleCopyCode}
                copied={copied}
                language={selectedFile ? languageFromPath(selectedFile.path) : 'text'}
              />
            )}
          </div>

          {/* Prompt input */}
          <div className="border-t border-border p-3 shrink-0">
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe what you want to build... (Cmd/Ctrl+Enter to send)"
                rows={3}
                disabled={isLoading}
                className="w-full resize-none rounded-lg border border-input bg-card px-3.5 py-2.5 pr-14 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring scrollbar-thin disabled:opacity-50"
              />
              <button
                onClick={handleSubmit}
                disabled={!prompt.trim() || !apiKey.trim() || isLoading}
                className="absolute bottom-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            {!apiKey.trim() && (
              <p className="mt-1.5 text-xs text-amber-500/80">
                Enter your API key in the sidebar to start coding.
              </p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function TerminalPanel({
  logs,
  isLoading,
  logEndRef,
  hasFiles,
  onSamplePrompt,
}: {
  logs: LogEntry[];
  isLoading: boolean;
  logEndRef: React.RefObject<HTMLDivElement>;
  hasFiles: boolean;
  onSamplePrompt: (prompt: string) => void;
}) {
  if (logs.length === 0 && !isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Terminal className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-semibold">Start a coding session</h2>
        <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
          Describe what you want to build and Aider will generate the code for you. Your API key stays in your browser.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-lg">
          {SAMPLE_PROMPTS.map((sample) => (
            <button
              key={sample}
              onClick={() => onSamplePrompt(sample)}
              className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all"
            >
              {sample}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin bg-[hsl(220_13%_6%)] p-4 font-mono text-xs leading-relaxed">
      {logs.map((log) => (
        <div
          key={log.id}
          className="mb-2 animate-fade-in-up"
        >
          {log.type === 'user' && (
            <div className="rounded-md bg-primary/10 border border-primary/20 px-3 py-2">
              <span className="text-primary font-semibold">$ </span>
              <span className="text-foreground/90">{log.text}</span>
            </div>
          )}
          {log.type === 'system' && (
            <pre className="whitespace-pre-wrap break-words text-foreground/70 px-1">
              {log.text}
            </pre>
          )}
          {log.type === 'error' && (
            <div className="flex items-start gap-2 text-red-400 px-1">
              <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <pre className="whitespace-pre-wrap break-words">{log.text}</pre>
            </div>
          )}
          {log.type === 'success' && (
            <div className="flex items-center gap-2 text-green-400 px-1">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>{log.text}</span>
            </div>
          )}
        </div>
      ))}
      {isLoading && (
        <div className="flex items-center gap-2 text-primary px-1 py-1">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Aider is working...</span>
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-dot" />
        </div>
      )}
      <div ref={logEndRef} />
    </div>
  );
}

function CodeViewer({
  file,
  onCopy,
  copied,
  language,
}: {
  file: WorkspaceFile | null;
  onCopy: () => void;
  copied: boolean;
  language: string;
}) {
  if (!file) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <FileCode className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-semibold">No file selected</h2>
        <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
          Generate code and click on a file in the sidebar to view its contents.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm font-medium">{file.path}</span>
          <span className="shrink-0 rounded-md bg-secondary px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
            {language}
          </span>
        </div>
        <button
          onClick={onCopy}
          className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs hover:bg-secondary transition-colors shrink-0"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-500" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
      <div className="flex-1 overflow-auto scrollbar-thin bg-[hsl(220_13%_6%)]">
        <pre className="p-4 text-xs leading-relaxed">
          <code className="font-mono text-foreground/85">{file.content}</code>
        </pre>
      </div>
    </div>
  );
}
