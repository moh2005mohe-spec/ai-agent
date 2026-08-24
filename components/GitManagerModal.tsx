'use client';

import React, { useState } from 'react';
import {
  Github,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  GitBranch,
  Key,
  FolderGit2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { cloneGitRepo, pushGitChanges } from '@/lib/api';
import type { GitStatusResponse, WorkspaceFile } from '@/lib/api';

interface GitManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  backendUrl: string;
  gitStatus: GitStatusResponse | null;
  onRefreshGitStatus: () => Promise<void>;
  onFilesUpdated: (files: WorkspaceFile[]) => void;
  onAddLog: (type: 'user' | 'system' | 'error' | 'success', text: string) => void;
}

export function GitManagerModal({
  isOpen,
  onClose,
  userId,
  backendUrl,
  gitStatus,
  onRefreshGitStatus,
  onFilesUpdated,
  onAddLog,
}: GitManagerModalProps) {
  const [activeTab, setActiveTab] = useState<'clone' | 'push'>('clone');

  // Clone fields
  const [repoUrl, setRepoUrl] = useState('');
  const [cloneToken, setCloneToken] = useState(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('aider-github-token')) || '';
  });
  const [cloneBranch, setCloneBranch] = useState('');
  const [isCloning, setIsCloning] = useState(false);
  const [cloneStatus, setCloneStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Push fields
  const [commitMessage, setCommitMessage] = useState('feat: improve and fix repository codebase with AI');
  const [pushToken, setPushToken] = useState(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('aider-github-token')) || '';
  });
  const [pushBranch, setPushBranch] = useState('');
  const [userEmail, setUserEmail] = useState(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('aider-github-email')) || 'moh2005mohe@gmail.com';
  });
  const [userName, setUserName] = useState(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('aider-github-name')) || 'moh2005mohe-spec';
  });
  const [isPushing, setIsPushing] = useState(false);
  const [pushStatus, setPushStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const handleClone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;

    setIsCloning(true);
    setCloneStatus(null);

    if (cloneToken.trim()) {
      localStorage.setItem('aider-github-token', cloneToken.trim());
    }

    try {
      onAddLog('system', `Cloning GitHub repository: ${repoUrl.trim()} ...`);
      const res = await cloneGitRepo(
        {
          userId,
          repoUrl: repoUrl.trim(),
          token: cloneToken.trim() || undefined,
          branch: cloneBranch.trim() || undefined,
        },
        backendUrl
      );

      setCloneStatus({
        type: 'success',
        message: `Successfully cloned! Loaded ${res.filesCount} files from branch '${res.branch}'.`,
      });
      onFilesUpdated(res.files);
      onAddLog('success', `Repository imported successfully with ${res.filesCount} file(s).`);
      await onRefreshGitStatus();
    } catch (err: any) {
      setCloneStatus({
        type: 'error',
        message: err.message || 'Failed to clone repository.',
      });
      onAddLog('error', `GitHub clone failed: ${err.message}`);
    } finally {
      setIsCloning(false);
    }
  };

  const handlePush = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPushing(true);
    setPushStatus(null);

    if (pushToken.trim()) {
      localStorage.setItem('aider-github-token', pushToken.trim());
    }
    if (userEmail.trim()) {
      localStorage.setItem('aider-github-email', userEmail.trim());
    }
    if (userName.trim()) {
      localStorage.setItem('aider-github-name', userName.trim());
    }

    try {
      onAddLog('system', `Pushing changes to GitHub: "${commitMessage}" ...`);
      const res = await pushGitChanges(
        {
          userId,
          commitMessage: commitMessage.trim(),
          token: pushToken.trim() || undefined,
          branch: pushBranch.trim() || undefined,
          email: userEmail.trim() || undefined,
          name: userName.trim() || undefined,
        },
        backendUrl
      );

      setPushStatus({
        type: 'success',
        message: res.message || 'Changes pushed to GitHub successfully!',
      });
      onAddLog('success', `Changes pushed to GitHub successfully.`);
      await onRefreshGitStatus();
    } catch (err: any) {
      setPushStatus({
        type: 'error',
        message: err.message || 'Failed to push to GitHub.',
      });
      onAddLog('error', `GitHub push failed: ${err.message}`);
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div
      id="git-manager-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div
        id="git-manager-modal"
        className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">GitHub Integration</h2>
              <p className="text-xs text-slate-400">Import projects, let AI modify & fix code, then push to GitHub</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-5 pt-2 gap-2">
          <button
            id="tab-git-clone"
            type="button"
            onClick={() => setActiveTab('clone')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'clone'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5 rounded-t-md'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Clone Repository
          </button>
          <button
            id="tab-git-push"
            type="button"
            onClick={() => setActiveTab('push')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'push'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5 rounded-t-md'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Push Changes
            {gitStatus?.modifiedFiles && gitStatus.modifiedFiles.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                {gitStatus.modifiedFiles.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Active Repo Status Banner */}
          {gitStatus?.isRepo && (
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300">
                <FolderGit2 className="w-4 h-4 text-emerald-400" />
                <span className="font-mono text-[11px] truncate max-w-[280px]">
                  {gitStatus.remoteUrl || 'Local Workspace Repo'}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                  <GitBranch className="w-3 h-3 text-cyan-400" />
                  {gitStatus.currentBranch || 'main'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onRefreshGitStatus()}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                title="Refresh Status"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {activeTab === 'clone' ? (
            <form onSubmit={handleClone} className="space-y-3.5">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  GitHub Repository URL <span className="text-rose-400">*</span>
                </label>
                <input
                  id="clone-repo-url-input"
                  type="url"
                  required
                  placeholder="https://github.com/username/repository.git"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Branch (Optional)</label>
                  <input
                    id="clone-branch-input"
                    type="text"
                    placeholder="main / master"
                    value={cloneBranch}
                    onChange={(e) => setCloneBranch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    GitHub Token (For Private Repos)
                  </label>
                  <div className="relative">
                    <input
                      id="clone-token-input"
                      type="password"
                      placeholder="ghp_xxxx..."
                      value={cloneToken}
                      onChange={(e) => setCloneToken(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-mono"
                    />
                    <Key className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  </div>
                </div>
              </div>

              {cloneStatus && (
                <div
                  className={`p-3 rounded-lg flex items-start gap-2.5 ${
                    cloneStatus.type === 'success'
                      ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-300'
                      : 'bg-rose-950/40 border border-rose-800 text-rose-300'
                  }`}
                >
                  {cloneStatus.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  )}
                  <p className="leading-relaxed">{cloneStatus.message}</p>
                </div>
              )}

              <button
                id="btn-confirm-clone"
                type="submit"
                disabled={isCloning || !repoUrl.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md mt-2 cursor-pointer"
              >
                {isCloning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Cloning & Loading Workspace...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Clone and Open in Workspace
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePush} className="space-y-3.5">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Commit Message <span className="text-rose-400">*</span>
                </label>
                <input
                  id="push-commit-message-input"
                  type="text"
                  required
                  placeholder="feat: fix bug and update modules"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Git Name</label>
                  <input
                    id="push-git-name-input"
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Git Email</label>
                  <input
                    id="push-git-email-input"
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Branch (Optional)</label>
                  <input
                    id="push-branch-input"
                    type="text"
                    placeholder={gitStatus?.currentBranch || 'main'}
                    value={pushBranch}
                    onChange={(e) => setPushBranch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    GitHub Personal Access Token <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="push-token-input"
                      type="password"
                      required
                      placeholder="ghp_xxxx..."
                      value={pushToken}
                      onChange={(e) => setPushToken(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-mono"
                    />
                    <Key className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  </div>
                </div>
              </div>

              {/* Modified Files Overview */}
              {gitStatus?.modifiedFiles && gitStatus.modifiedFiles.length > 0 && (
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg">
                  <div className="text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>Changed Files ({gitStatus.modifiedFiles.length}):</span>
                  </div>
                  <div className="max-h-24 overflow-y-auto font-mono text-[10px] text-emerald-400 space-y-0.5">
                    {gitStatus.modifiedFiles.map((f, i) => (
                      <div key={i} className="truncate">
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pushStatus && (
                <div
                  className={`p-3 rounded-lg flex items-start gap-2.5 ${
                    pushStatus.type === 'success'
                      ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-300'
                      : 'bg-rose-950/40 border border-rose-800 text-rose-300'
                  }`}
                >
                  {pushStatus.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  )}
                  <p className="leading-relaxed">{pushStatus.message}</p>
                </div>
              )}

              <button
                id="btn-confirm-push"
                type="submit"
                disabled={isPushing || !pushToken.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md mt-2 cursor-pointer"
              >
                {isPushing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Committing & Pushing to GitHub...
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    Commit and Push to GitHub
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Tokens are stored securely in local browser storage</span>
          <a
            href="https://github.com/settings/tokens"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:underline flex items-center gap-1"
          >
            Create GitHub Token <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
