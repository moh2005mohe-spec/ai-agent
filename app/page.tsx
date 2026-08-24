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
  FolderGit2,
  GitBranch,
  UploadCloud,
  Download,
} from 'lucide-react';
import {
  sendCoderRequest,
  fetchWorkspaceFiles,
  checkBackendHealth,
  fetchGitStatus,
  type WorkspaceFile,
  type GitStatusResponse,
} from '@/lib/api';
import {
  MODEL_GROUPS,
  DEFAULT_MODEL,
  PROVIDER_KEY_PLACEHOLDERS,
  getProviderForModel,
  isFreeModel,
  type ModelProvider,
} from '@/lib/models';
import { GitManagerModal } from '@/components/GitManagerModal';

const SAMPLE_PROMPTS = [
  'Inspect repository structure, detect bugs or missing dependencies, and fix them',
  'Add unit tests and create a comprehensive README documentation file',
  'Optimize code performance, add error boundary handlers, and refactor main modules',
  'Create a simple HTML/CSS landing page for a coffee shop',
];

interface LogEntry {
  id: string;
  type: 'user' | 'system' | 'error' | 'success';
  text: string;
}

function generateUserId(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('aider-user-id');
    if (stored) return stored;
    const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem('aider-user-id', id);
    return id;
  }
  return 'user-default';
}

function languageFromPath(filePath: string): string {
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
  const [isGitModalOpen, setIsGitModalOpen] = useState(false);
  const [gitStatus, setGitStatus] = useState<GitStatusResponse | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  const refreshGitStatus = useCallback(async (currentUserId = userId, currentBackend = backendUrl) => {
    if (!currentUserId) return;
    try {
      const status = await fetchGitStatus(currentUserId, currentBackend.trim() || undefined);
      setGitStatus(status);
    } catch {
      // Non-fatal
    }
  }, [userId, backendUrl]);

  useEffect(() => {
    const uid = generateUserId();
    setUserId(uid);

    const storedKey = localStorage.getItem('aider-api-key');
    if (storedKey) {
      setApiKey(storedKey);
      setApiKeySaved(true);
    }
    const storedUrl = localStorage.getItem('aider-backend-url');
    if (storedUrl) {
      setBackendUrl(storedUrl);
    }
    const storedModel = localStorage.getItem('aider-model');
    if (storedModel) {
      setModel(storedModel);
    }

    checkBackendHealth(storedUrl || '').then((healthy) => {
      setBackendHealthy(healthy);
      if (healthy) {
        fetchWorkspaceFiles(uid, storedUrl || '').then((wsFiles) => {
          if (wsFiles && wsFiles.length > 0) {
            setFiles(wsFiles);
            setSelectedFile(wsFiles[0]);
          }
        });
        refreshGitStatus(uid, storedUrl || '');
      }
    });
  }, [refreshGitStatus]);

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
    } else {
      localStorage.removeItem('aider-backend-url');
    }
  };

  const handleCheckBackend = async () => {
    handleSaveBackendUrl();
    const healthy = await checkBackendHealth(backendUrl.trim() || undefined);
    setBackendHealthy(healthy);
    if (healthy) {
      refreshGitStatus();
    }
  };

  const handleModelChange = (newModel: string) => {
    setModel(newModel);
    localStorage.setItem('aider-model', newModel);
  };

  const addLog = (type: LogEntry['type'], text: string) => {
    setLogs((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, type, text }]);
  };

  const handleSubmit = async () => {
    if (!prompt.trim() || isLoading) return;
    setIsLoading(true);
    setActiveTab('terminal');
    addLog('user', prompt.trim());

    try {
      const result = await sendCoderRequest(
        {
          prompt: prompt.trim(),
          apiKey: apiKey.trim(),
          userId,
          model,
          provider: getProviderForModel(model),
        },
        backendUrl.trim() || undefined
      );

      if (result.logs) {
        addLog('system', result.logs);
      }
      if (result.errorLogs) {
        addLog('error', result.errorLogs);
      }
      if (result.success) {
        addLog('success', `Generation complete! ${result.files.length} workspace file(s) available.`);
        setFiles(result.files);
        if (result.files.length > 0) {
          setSelectedFile(result.files[0]);
        }
        await refreshGitStatus();
      } else {
        addLog('error', `Agent reported exit code ${result.exitCode}`);
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
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

  const handleClearWorkspace = () => {
    setLogs([]);
    setFiles([]);
    setSelectedFile(null);
  };

  const handleSamplePrompt = (sample: string) => {
    setPrompt(sample);
  };

  const provider = getProviderForModel(model);

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100 font-sans selection:bg-sky-500/30">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-2.5 shrink-0 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-600 to-cyan-400 text-white shadow-sm">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-tight text-white">Aider Web UI</h1>
              <span className="rounded bg-sky-500/20 px-1.5 py-0.2 text-[10px] font-medium text-sky-300">
                AI Coding Agent
              </span>
            </div>
            <p className="text-[11px] text-slate-400">GitHub Import &bull; Automated Refactor &bull; Git Push</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* GitHub Sync Button */}
          <button
            id="open-github-modal-btn"
            onClick={() => setIsGitModalOpen(true)}
            className="flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200 transition-colors cursor-pointer shadow-sm"
          >
            <Github className="h-4 w-4 text-emerald-400" />
            <span>GitHub Sync</span>
            {gitStatus?.modifiedFiles && gitStatus.modifiedFiles.length > 0 && (
              <span className="ml-1 rounded-full bg-emerald-500 px-1.5 py-0.2 text-[9px] font-bold text-slate-950">
                {gitStatus.modifiedFiles.length}
              </span>
            )}
          </button>

          {/* Backend status indicator */}
          <div
            id="backend-status-pill"
            className="flex items-center gap-1.5 rounded-full border border-slate-700/60 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-300"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                backendHealthy === true
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                  : backendHealthy === false
                    ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                    : 'bg-amber-400'
              }`}
            />
            <span className="text-[11px]">
              {backendHealthy === true
                ? 'Backend connected'
                : backendHealthy === false
                  ? 'Backend disconnected'
                  : 'Checking backend...'}
            </span>
          </div>

          <a
            id="github-repo-link"
            href="https://github.com/moh2005mohe-spec/ai-agent"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-md border border-slate-700/70 bg-slate-800/60 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <Github className="h-4 w-4" />
            <span className="hidden sm:inline">Repository</span>
          </a>
        </div>
      </header>

      {/* Main layout container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="flex w-80 shrink-0 flex-col border-r border-slate-800 bg-slate-900/40">
          {/* Quick GitHub Action Card */}
          <div className="p-3 border-b border-slate-800 bg-emerald-950/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <FolderGit2 className="w-3.5 h-3.5" />
                Repository Actions
              </span>
              {gitStatus?.currentBranch && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 flex items-center gap-1">
                  <GitBranch className="w-2.5 h-2.5" />
                  {gitStatus.currentBranch}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                id="sidebar-clone-btn"
                onClick={() => setIsGitModalOpen(true)}
                className="flex items-center justify-center gap-1 py-1.5 px-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-medium transition-colors cursor-pointer"
              >
                <Download className="w-3 h-3 text-emerald-400" />
                Import Repo
              </button>
              <button
                id="sidebar-push-btn"
                onClick={() => setIsGitModalOpen(true)}
                className="flex items-center justify-center gap-1 py-1.5 px-2 rounded bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium transition-colors cursor-pointer"
              >
                <UploadCloud className="w-3 h-3" />
                Push to Git
              </button>
            </div>
          </div>

          {/* Model selection */}
          <div className="border-b border-slate-800 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="model-select" className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
                <span>AI Model</span>
              </label>
              {isFreeModel(model) && (
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                  FREE
                </span>
              )}
            </div>
            <select
              id="model-select"
              value={model}
              onChange={(e) => handleModelChange(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-800/90 px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
            >
              {MODEL_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label} className="bg-slate-900 text-slate-300">
                  {group.models.map((m) => (
                    <option key={m.value} value={m.value} className="bg-slate-900 text-slate-200">
                      {m.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* API Key Input */}
          <div className="border-b border-slate-800 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="api-key-input" className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
                <Key className="h-3.5 w-3.5 text-sky-400" />
                <span>API Key</span>
                {apiKeySaved && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                )}
              </label>
            </div>
            <div className="relative">
              <input
                id="api-key-input"
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setApiKeySaved(false);
                }}
                onBlur={handleSaveApiKey}
                placeholder={provider ? PROVIDER_KEY_PLACEHOLDERS[provider] : 'API Key...'}
                className="w-full rounded-md border border-slate-700 bg-slate-800/90 px-2.5 py-1.5 pr-8 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
              />
              <button
                type="button"
                id="toggle-api-key-visibility"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="text-[10px] leading-tight text-slate-400">
              Stored securely in your browser local storage.
            </p>
          </div>

          {/* Backend URL config (optional) */}
          <div className="border-b border-slate-800 p-3.5 space-y-2">
            <label htmlFor="backend-url-input" className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
              <Server className="h-3.5 w-3.5 text-sky-400" />
              <span>Backend Endpoint</span>
            </label>
            <div className="flex gap-1.5">
              <input
                id="backend-url-input"
                type="text"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                placeholder="Same-origin (/api) or custom URL"
                className="w-full rounded-md border border-slate-700 bg-slate-800/90 px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
              />
              <button
                id="check-backend-btn"
                onClick={handleCheckBackend}
                className="shrink-0 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Check
              </button>
            </div>
          </div>

          {/* Workspace Files Explorer */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800 bg-slate-900/60">
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
                <FolderTree className="h-3.5 w-3.5 text-sky-400" />
                <span>Workspace Files</span>
                {files.length > 0 && (
                  <span className="rounded-full bg-sky-500/20 px-1.5 py-0.2 text-[10px] font-mono text-sky-300">
                    {files.length}
                  </span>
                )}
              </span>
              <div className="flex items-center gap-1">
                {files.length > 0 && (
                  <button
                    id="clear-workspace-btn"
                    onClick={handleClearWorkspace}
                    className="p-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer rounded"
                    title="Clear UI workspace"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin p-2" id="file-list-container">
              {files.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
                  <FileCode className="h-8 w-8 text-slate-600 mb-2" />
                  <p className="text-xs text-slate-400">
                    No files in workspace
                  </p>
                  <button
                    onClick={() => setIsGitModalOpen(true)}
                    className="mt-2 text-[11px] text-emerald-400 hover:underline cursor-pointer"
                  >
                    Import GitHub Repo →
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  {files.map((file) => (
                    <button
                      key={file.path}
                      id={`file-item-${file.name.replace(/[^a-zA-Z0-9]/g, '-')}`}
                      onClick={() => {
                        setSelectedFile(file);
                        setActiveTab('preview');
                      }}
                      className={`flex w-full items-center justify-between gap-1.5 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                        selectedFile?.path === file.path
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          : 'hover:bg-slate-800/70 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate min-w-0">
                        <FileCode className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="truncate font-mono">{file.path}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                        {file.size} B
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content (Terminal / Code Viewer + Prompt Box) */}
        <main className="flex flex-1 flex-col overflow-hidden bg-slate-950">
          {/* Tabs bar */}
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-1.5 bg-slate-900/30 shrink-0">
            <div className="flex items-center gap-2">
              <button
                id="tab-terminal-btn"
                onClick={() => setActiveTab('terminal')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  activeTab === 'terminal'
                    ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Terminal className="h-3.5 w-3.5" />
                <span>Terminal & AI Agent</span>
              </button>
              <button
                id="tab-code-viewer-btn"
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <FileCode className="h-3.5 w-3.5" />
                <span>Code Viewer</span>
                {selectedFile && (
                  <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[10px] font-mono text-slate-300">
                    {selectedFile.name}
                  </span>
                )}
              </button>
            </div>

            {gitStatus?.isRepo && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 hidden md:inline">Current Repo:</span>
                <span className="font-mono text-[11px] text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {gitStatus.remoteUrl ? gitStatus.remoteUrl.split('/').slice(-2).join('/') : 'Local Workspace'}
                </span>
                <button
                  onClick={() => setIsGitModalOpen(true)}
                  className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[11px] hover:bg-emerald-500/30 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <UploadCloud className="w-3 h-3" />
                  Push
                </button>
              </div>
            )}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'terminal' ? (
              <div className="flex h-full flex-col bg-slate-950 font-mono text-xs overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12">
                      <div className="h-12 w-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-sky-400 mb-4 shadow-inner">
                        <Terminal className="h-6 w-6" />
                      </div>
                      <h3 className="text-sm font-semibold text-slate-200 mb-1 font-sans">
                        Start an AI Coding Session
                      </h3>
                      <p className="text-xs text-slate-400 max-w-md font-sans mb-6">
                        Describe what you want to build or import an existing GitHub repository to inspect, fix, or optimize.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl w-full text-left font-sans">
                        {SAMPLE_PROMPTS.map((sample, i) => (
                          <button
                            key={i}
                            onClick={() => handleSamplePrompt(sample)}
                            className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 hover:border-slate-700 text-slate-300 text-xs transition-colors text-left flex items-start gap-2 group cursor-pointer"
                          >
                            <ChevronRight className="h-3.5 w-3.5 text-sky-400 shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform" />
                            <span className="line-clamp-2">{sample}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    logs.map((log) => (
                      <div
                        key={log.id}
                        className={`rounded-lg p-3 leading-relaxed whitespace-pre-wrap break-words border ${
                          log.type === 'user'
                            ? 'bg-sky-950/30 border-sky-800/50 text-sky-200'
                            : log.type === 'error'
                              ? 'bg-rose-950/30 border-rose-800/50 text-rose-300'
                              : log.type === 'success'
                                ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
                                : 'bg-slate-900/80 border-slate-800 text-slate-300'
                        }`}
                      >
                        {log.type === 'user' && (
                          <span className="text-sky-400 font-bold mr-2">&gt; User:</span>
                        )}
                        {log.text}
                      </div>
                    ))
                  )}
                  {isLoading && (
                    <div className="flex items-center gap-2 text-sky-400 p-3 bg-slate-900/60 rounded-lg border border-slate-800 animate-pulse">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>AI Agent is inspecting workspace and running tasks...</span>
                    </div>
                  )}
                  <div ref={logEndRef} />
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col bg-slate-950">
                {selectedFile ? (
                  <div className="flex h-full flex-col">
                    <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-4 py-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-300 font-mono">
                        <FileText className="h-4 w-4 text-sky-400" />
                        <span>{selectedFile.path}</span>
                        <span className="text-slate-500">({selectedFile.size} bytes)</span>
                      </div>
                      <button
                        onClick={handleCopyCode}
                        className="flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-slate-300 hover:text-white transition-colors cursor-pointer text-xs"
                      >
                        {copied ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="flex-1 overflow-auto p-4 font-mono text-xs text-slate-200 bg-slate-950">
                      <pre className="whitespace-pre">
                        <code>{selectedFile.content}</code>
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center px-4">
                    <FileCode className="h-10 w-10 text-slate-700 mb-2" />
                    <p className="text-xs text-slate-400">Select a file from the left sidebar to view its code</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Prompt input footer */}
          <div className="border-t border-slate-800 bg-slate-900/50 p-3 shrink-0" id="prompt-input-area">
            <div className="relative">
              <textarea
                id="agent-prompt-textarea"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Instruct the AI Agent to inspect, refactor, fix errors, or add new features... (Ctrl + Enter to execute)"
                rows={3}
                disabled={isLoading}
                className="w-full resize-none rounded-lg border border-slate-700/80 bg-slate-900 px-3.5 py-2.5 pr-14 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 font-sans scrollbar-thin disabled:opacity-50"
              />
              <button
                id="submit-prompt-btn"
                onClick={handleSubmit}
                disabled={!prompt.trim() || isLoading}
                className="absolute bottom-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-white shadow-sm transition-all hover:bg-sky-400 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Send Prompt (Ctrl+Enter)"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>Press <kbd className="rounded bg-slate-800 px-1 py-0.5 font-mono text-[10px] text-slate-300">Ctrl+Enter</kbd> to execute changes</span>
              {!apiKey.trim() && !isFreeModel(model) && provider !== 'google' && (
                <span className="text-amber-400">
                  Tip: Provide an API key in the sidebar or pick a free model.
                </span>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* GitHub Integration Modal */}
      <GitManagerModal
        isOpen={isGitModalOpen}
        onClose={() => setIsGitModalOpen(false)}
        userId={userId}
        backendUrl={backendUrl}
        gitStatus={gitStatus}
        onRefreshGitStatus={refreshGitStatus}
        onFilesUpdated={(newFiles) => {
          setFiles(newFiles);
          if (newFiles.length > 0) {
            setSelectedFile(newFiles[0]);
          }
        }}
        onAddLog={addLog}
      />
    </div>
  );
}
