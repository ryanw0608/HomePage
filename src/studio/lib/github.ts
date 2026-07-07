import { REPO_SLUG, STUDIO } from "@/studio/config";

const API = "https://api.github.com";

export class GhError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/* Save conflicts (stale sha) get their own type so the UI can reconcile. */
export class GhConflictError extends GhError {}

async function gh<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers
    }
  });
  if (!res.ok) {
    let message = `${res.status}`;
    try {
      const body = await res.json();
      message = body?.message ? `${res.status}: ${body.message}` : message;
    } catch {
      /* non-JSON error body */
    }
    if (res.status === 409 || (res.status === 422 && /sha/i.test(message))) {
      throw new GhConflictError(res.status, message);
    }
    throw new GhError(res.status, message);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

/* Contents-API paths: encode per segment ('#', '?', '%' would break the URL). */
function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

/* UTF-8-safe base64 (atob/btoa alone corrupt CJK text). */
export function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export function fromBase64(b64: string): string {
  const bin = atob(b64.replace(/\s/g, ""));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export interface Viewer {
  login: string;
  name: string | null;
  avatar_url: string;
  canPush: boolean;
}

export async function fetchViewer(token: string): Promise<Viewer> {
  const user = await gh<{ login: string; name: string | null; avatar_url: string }>(token, "/user");
  const repo = await gh<{ permissions?: { push?: boolean } }>(token, `/repos/${REPO_SLUG}`);
  return { ...user, canPush: repo.permissions?.push === true };
}

export interface RepoEntry {
  name: string;
  path: string;
  sha: string;
  type: "file" | "dir";
}

export async function listDir(token: string, path: string): Promise<RepoEntry[]> {
  const rows = await gh<RepoEntry[]>(
    token,
    `/repos/${REPO_SLUG}/contents/${encodePath(path)}?ref=${STUDIO.branch}`
  );
  return Array.isArray(rows) ? rows : [];
}

export interface FileContent {
  path: string;
  sha: string;
  text: string;
}

export async function readFile(token: string, path: string): Promise<FileContent> {
  const url = `/repos/${REPO_SLUG}/contents/${encodePath(path)}?ref=${STUDIO.branch}`;
  const file = await gh<{ sha: string; content: string; encoding: string }>(token, url);
  if (file.encoding === "base64") {
    return { path, sha: file.sha, text: fromBase64(file.content) };
  }
  // Files over 1 MB come back with encoding "none" and empty content —
  // re-request the raw media type instead.
  const res = await fetch(`${API}${url}`, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github.raw+json",
      "x-github-api-version": "2022-11-28"
    }
  });
  if (!res.ok) throw new GhError(res.status, `raw read failed: ${res.status}`);
  return { path, sha: file.sha, text: await res.text() };
}

export interface SaveResult {
  sha: string;
  commitSha: string;
  htmlUrl: string;
}

export async function saveFile(
  token: string,
  path: string,
  text: string,
  message: string,
  sha?: string
): Promise<SaveResult> {
  const out = await gh<{ content: { sha: string }; commit: { sha: string; html_url: string } }>(
    token,
    `/repos/${REPO_SLUG}/contents/${encodePath(path)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        message,
        content: toBase64(text),
        branch: STUDIO.branch,
        ...(sha ? { sha } : {})
      })
    }
  );
  return { sha: out.content.sha, commitSha: out.commit.sha, htmlUrl: out.commit.html_url };
}

/** Delete a file (git rm on `branch`). The blob sha is required by the API. */
export async function deleteFile(token: string, path: string, sha: string, message: string): Promise<string> {
  const out = await gh<{ commit: { sha: string } }>(
    token,
    `/repos/${REPO_SLUG}/contents/${encodePath(path)}`,
    {
      method: "DELETE",
      body: JSON.stringify({ message, sha, branch: STUDIO.branch })
    }
  );
  return out.commit.sha;
}

export interface CheckSummary {
  status: "queued" | "in_progress" | "completed";
  conclusion: string | null;
  total: number;
}

const NON_FAILING = new Set(["success", "skipped", "neutral"]);

export async function fetchChecks(token: string, ref: string): Promise<CheckSummary> {
  const out = await gh<{
    total_count: number;
    check_runs: { status: CheckSummary["status"]; conclusion: string | null }[];
  }>(token, `/repos/${REPO_SLUG}/commits/${ref}/check-runs?per_page=100`);
  const runs = out.check_runs ?? [];
  // Right after a push GitHub briefly reports zero check runs; that means
  // "CI not registered yet", never "CI passed" — keep the pill busy.
  if (runs.length === 0) {
    return { status: "queued", conclusion: null, total: 0 };
  }
  const running = runs.some((r) => r.status !== "completed");
  const failed = runs.find((r) => r.conclusion && !NON_FAILING.has(r.conclusion));
  return {
    status: running ? "in_progress" : "completed",
    conclusion: failed ? failed.conclusion : "success",
    total: out.total_count ?? runs.length
  };
}
