export interface WorkspaceFile {
  name: string;
  path: string;
  content: string;
  size: number;
}

export interface CoderResponse {
  success: boolean;
  exitCode: number;
  logs: string;
  errorLogs: string;
  files: WorkspaceFile[];
}

export interface CoderRequest {
  prompt: string;
  apiKey: string;
  userId: string;
  model?: string;
  provider?: string;
}

export interface GitCloneRequest {
  userId: string;
  repoUrl: string;
  token?: string;
  branch?: string;
}

export interface GitPushRequest {
  userId: string;
  commitMessage: string;
  token?: string;
  branch?: string;
  email?: string;
  name?: string;
  repoUrl?: string;
}

export interface GitStatusResponse {
  isRepo: boolean;
  currentBranch?: string;
  remoteUrl?: string;
  modifiedFiles?: string[];
  untrackedFiles?: string[];
  aheadCount?: number;
  behindCount?: number;
}

const DEFAULT_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

function cleanUrl(backendUrl: string, endpoint: string): string {
  const base = (backendUrl || DEFAULT_BACKEND_URL).replace(/\/$/, '');
  return `${base}${endpoint}`;
}

export async function sendCoderRequest(
  data: CoderRequest,
  backendUrl: string = DEFAULT_BACKEND_URL
): Promise<CoderResponse> {
  const url = cleanUrl(backendUrl, '/api/coder');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || errorBody.details || `Backend returned status ${response.status}`);
  }
  return response.json();
}

export async function fetchWorkspaceFiles(
  userId: string,
  backendUrl: string = DEFAULT_BACKEND_URL
): Promise<WorkspaceFile[]> {
  const url = cleanUrl(backendUrl, `/api/files/${encodeURIComponent(userId)}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch files: ${response.status}`);
  }
  const data = await response.json();
  return data.files || [];
}

export async function checkBackendHealth(
  backendUrl: string = DEFAULT_BACKEND_URL
): Promise<boolean> {
  try {
    const url = cleanUrl(backendUrl, '/api/health');
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function cloneGitRepo(
  data: GitCloneRequest,
  backendUrl: string = DEFAULT_BACKEND_URL
): Promise<{ success: boolean; message: string; branch: string; filesCount: number; files: WorkspaceFile[] }> {
  const url = cleanUrl(backendUrl, '/api/git/clone');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || errorBody.details || 'Failed to clone repository from GitHub');
  }
  return response.json();
}

export async function fetchGitStatus(
  userId: string,
  backendUrl: string = DEFAULT_BACKEND_URL
): Promise<GitStatusResponse> {
  const url = cleanUrl(backendUrl, `/api/git/status/${encodeURIComponent(userId)}`);
  const response = await fetch(url);
  if (!response.ok) {
    return { isRepo: false };
  }
  return response.json();
}

export async function pushGitChanges(
  data: GitPushRequest,
  backendUrl: string = DEFAULT_BACKEND_URL
): Promise<{ success: boolean; message: string; details?: string }> {
  const url = cleanUrl(backendUrl, '/api/git/push');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || errorBody.details || 'Failed to push changes to GitHub');
  }
  return response.json();
}
