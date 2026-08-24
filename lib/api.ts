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

const DEFAULT_BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

export async function sendCoderRequest(
  data: CoderRequest,
  backendUrl: string = DEFAULT_BACKEND_URL
): Promise<CoderResponse> {
  const response = await fetch(`${backendUrl}/api/coder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `Backend returned status ${response.status}`);
  }

  return response.json();
}

export async function fetchWorkspaceFiles(
  userId: string,
  backendUrl: string = DEFAULT_BACKEND_URL
): Promise<WorkspaceFile[]> {
  const response = await fetch(`${backendUrl}/api/files/${encodeURIComponent(userId)}`);

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
    const response = await fetch(`${backendUrl}/api/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
