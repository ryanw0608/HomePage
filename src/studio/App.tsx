/*
 * Studio — personal Notion-grade editor for the site's MDX notes.
 * P1: auth + note tree + raw MDX editor + drafts + commit-on-save.
 * Static client-only app: all writes go through the GitHub contents API
 * with the logged-in user's token (collaborator gate = write permission).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { SLUG_RE, courseTemplate, paperTemplate } from "@/lib/templates.mjs";
import { REPO_SLUG, STUDIO, type StudioCollection } from "@/studio/config";
import { getStoredToken, loginWithPopup, storeToken } from "@/studio/lib/auth";
import {
  GhConflictError,
  GhError,
  fetchChecks,
  fetchViewer,
  listDir,
  readFile,
  saveFile,
  type CheckSummary,
  type FileContent,
  type RepoEntry,
  type Viewer
} from "@/studio/lib/github";

import "@/studio/studio.css";

/* ------------------------------------------------------------------ hash */

function currentHashPath(): string | null {
  const match = window.location.hash.match(/^#\/edit\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function navigateTo(path: string | null): void {
  window.location.hash = path ? `#/edit/${encodeURIComponent(path).replace(/%2F/g, "/")}` : "#/";
}

/* ---------------------------------------------------------------- drafts */

interface Draft {
  text: string;
  savedAt: number;
  baseSha: string;
}

function draftKey(path: string): string {
  return `${STUDIO.draftKeyPrefix}${path}`;
}

function loadDraft(path: string): Draft | null {
  try {
    const raw = window.localStorage.getItem(draftKey(path));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function saveDraft(path: string, draft: Draft): void {
  try {
    window.localStorage.setItem(draftKey(path), JSON.stringify(draft));
  } catch {
    /* storage full/blocked: editing still works, just no crash safety */
  }
}

function clearDraft(path: string): void {
  try {
    window.localStorage.removeItem(draftKey(path));
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------- app */

export default function App() {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [viewerRetry, setViewerRetry] = useState(0);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      setViewer(null);
      return;
    }
    let cancelled = false;
    setViewerError(null);
    fetchViewer(token)
      .then((v) => {
        if (!cancelled) setViewer(v);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof GhError && err.status === 401) {
          // Genuinely invalid/expired token: back to the login screen.
          storeToken(null);
          setToken(null);
          setAuthError("session expired — log in again");
        } else {
          // Rate limit / network hiccup: keep the token, offer a retry.
          setViewerError(String((err as Error)?.message ?? err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, viewerRetry]);

  const login = useCallback(async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const fresh = await loginWithPopup();
      storeToken(fresh);
      setToken(fresh);
    } catch (err) {
      setAuthError(String((err as Error)?.message ?? err));
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const logout = useCallback(() => {
    storeToken(null);
    setToken(null);
    setViewer(null);
  }, []);

  if (!token) {
    return <LoginScreen busy={authBusy} error={authError} onLogin={login} onToken={(t) => { storeToken(t); setToken(t); }} />;
  }
  if (!viewer) {
    if (viewerError) {
      return (
        <div className="studio-center">
          <p className="studio-error">github unreachable: {viewerError}</p>
          <div className="studio-modal-actions">
            <button className="studio-btn studio-btn-primary" onClick={() => setViewerRetry((n) => n + 1)} type="button">
              retry
            </button>
            <button className="studio-btn studio-btn-ghost" onClick={logout} type="button">
              log out
            </button>
          </div>
        </div>
      );
    }
    return <CenteredNote text="authenticating…" />;
  }
  if (!viewer.canPush) {
    return (
      <div className="studio-center">
        <p className="studio-prompt">$ studio --whoami</p>
        <p>
          logged in as <strong>{viewer.login}</strong>, but this account has no write access to{" "}
          <code>{REPO_SLUG}</code>. Studio is read-only for non-collaborators by design.
        </p>
        <button className="studio-btn" onClick={logout} type="button">
          log out
        </button>
      </div>
    );
  }
  return <Workbench token={token} viewer={viewer} onLogout={logout} />;
}

function CenteredNote({ text }: { text: string }) {
  return (
    <div className="studio-center">
      <p className="studio-muted">{text}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ login */

function LoginScreen(props: {
  busy: boolean;
  error: string | null;
  onLogin: () => void;
  onToken: (token: string) => void;
}) {
  const [pat, setPat] = useState("");
  return (
    <div className="studio-center">
      <p className="studio-prompt">
        <span className="accent">$</span> studio --login
      </p>
      <h1 className="studio-login-title"># Studio</h1>
      <p className="studio-muted">
        the site&apos;s writing desk · every save is a git commit on <code>{REPO_SLUG}</code>
      </p>
      <button className="studio-btn studio-btn-primary" disabled={props.busy} onClick={props.onLogin} type="button">
        {props.busy ? "waiting for GitHub…" : "log in with GitHub"}
      </button>
      {props.error && <p className="studio-error">{props.error}</p>}
      <details className="studio-pat">
        <summary>use a personal access token instead</summary>
        <p className="studio-muted">
          fine-grained PAT with <code>Contents: Read and write</code> on {REPO_SLUG} (useful on localhost,
          where the OAuth popup only allows the production domain).
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (pat.trim()) props.onToken(pat.trim());
          }}
        >
          <input
            aria-label="personal access token"
            autoComplete="off"
            className="studio-input"
            onChange={(event) => setPat(event.target.value)}
            placeholder="github_pat_…"
            type="password"
            value={pat}
          />
          <button className="studio-btn" type="submit">
            use token
          </button>
        </form>
      </details>
    </div>
  );
}

/* -------------------------------------------------------------- workbench */

interface NoteRow {
  collection: StudioCollection;
  name: string;
  path: string;
}

function Workbench({ token, viewer, onLogout }: { token: string; viewer: Viewer; onLogout: () => void }) {
  const [notes, setNotes] = useState<NoteRow[] | null>(null);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [activePath, setActivePath] = useState<string | null>(() => currentHashPath());
  const [lastCommit, setLastCommit] = useState<{ sha: string; checks: CheckSummary | null } | null>(null);

  const refreshTree = useCallback(async () => {
    setTreeError(null);
    try {
      const lists = await Promise.all(
        STUDIO.collections.map(async (collection) => {
          const rows = await listDir(token, `${STUDIO.contentRoot}/${collection}`);
          return rows
            .filter((row: RepoEntry) => row.type === "file" && /\.(md|mdx)$/.test(row.name))
            .map((row) => ({ collection, name: row.name, path: row.path }));
        })
      );
      setNotes(lists.flat());
    } catch (err) {
      setTreeError(String((err as Error)?.message ?? err));
      setNotes([]);
    }
  }, [token]);

  useEffect(() => {
    refreshTree();
  }, [refreshTree]);

  useEffect(() => {
    const onHash = () => setActivePath(currentHashPath());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Poll CI after a commit until it settles.
  useEffect(() => {
    if (!lastCommit || lastCommit.checks?.status === "completed") return;
    const timer = window.setInterval(async () => {
      try {
        const checks = await fetchChecks(token, lastCommit.sha);
        setLastCommit((prev) => (prev && prev.sha === lastCommit.sha ? { ...prev, checks } : prev));
      } catch {
        /* transient — keep polling */
      }
    }, 15000);
    return () => window.clearInterval(timer);
  }, [lastCommit, token]);

  const onCommitted = useCallback((commitSha: string) => {
    setLastCommit({ sha: commitSha, checks: { status: "queued", conclusion: null, total: 0 } });
  }, []);

  return (
    <div className="studio-frame">
      <header className="studio-topbar">
        <p className="studio-crumb">
          <span className="accent">{viewer.login}</span>
          <span className="faint">@studio:</span>
          <span>~/{activePath ? activePath.replace(`${STUDIO.contentRoot}/`, "") : ""}</span>
        </p>
        <div className="studio-topbar-right">
          <a className="studio-link" href={import.meta.env.BASE_URL} rel="noopener" target="_blank">
            view site
          </a>
          <button className="studio-btn studio-btn-ghost" onClick={onLogout} type="button">
            log out
          </button>
        </div>
      </header>
      <div className="studio-main">
        <Sidebar activePath={activePath} error={treeError} notes={notes} onNew={refreshTree} token={token} />
        {activePath ? (
          <Editor key={activePath} onCommitted={onCommitted} path={activePath} token={token} />
        ) : (
          <Welcome notes={notes} />
        )}
      </div>
      <footer className="studio-statusbar">
        <span>
          <span className="accent">●</span> {REPO_SLUG} · {STUDIO.branch}
        </span>
        <CiPill commit={lastCommit} />
      </footer>
    </div>
  );
}

function CiPill({ commit }: { commit: { sha: string; checks: CheckSummary | null } | null }) {
  if (!commit) return <span className="faint">no commits this session</span>;
  const checks = commit.checks;
  const short = commit.sha.slice(0, 7);
  if (!checks || checks.status !== "completed") {
    return (
      <span className="studio-pill studio-pill-busy" title="CI running">
        ⟳ ci · {short}
      </span>
    );
  }
  if (checks.conclusion === "success" || checks.conclusion === null) {
    return (
      <span className="studio-pill studio-pill-ok" title="CI green — deployed shortly">
        ✓ ci · {short}
      </span>
    );
  }
  return (
    <span className="studio-pill studio-pill-bad" title={`CI ${checks.conclusion}`}>
      ✗ ci {checks.conclusion} · {short}
    </span>
  );
}

function Welcome({ notes }: { notes: NoteRow[] | null }) {
  return (
    <section className="studio-editor studio-welcome">
      <p className="studio-prompt">
        <span className="accent">$</span> studio --help
      </p>
      <ul className="studio-muted studio-help">
        <li>pick a note on the left, or create one with <code>+ new</code></li>
        <li><kbd>⌘S</kbd> / <kbd>Ctrl+S</kbd> commits your changes (that IS the save button)</li>
        <li>unsaved edits auto-persist to this browser as drafts every 2s</li>
        <li>{notes ? `${notes.length} notes in the repo` : "loading note tree…"}</li>
      </ul>
    </section>
  );
}

/* --------------------------------------------------------------- sidebar */

function Sidebar(props: {
  token: string;
  notes: NoteRow[] | null;
  error: string | null;
  activePath: string | null;
  onNew: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const grouped = useMemo(() => {
    const map = new Map<StudioCollection, NoteRow[]>();
    for (const collection of STUDIO.collections) map.set(collection, []);
    for (const note of props.notes ?? []) map.get(note.collection)?.push(note);
    return map;
  }, [props.notes]);

  return (
    <nav aria-label="notes" className="studio-sidebar">
      <div className="studio-sidebar-head">
        <span className="studio-label">notes</span>
        <button className="studio-btn studio-btn-ghost" onClick={() => setCreating(true)} type="button">
          + new
        </button>
      </div>
      {props.error && <p className="studio-error">tree: {props.error}</p>}
      {!props.notes && !props.error && <p className="studio-muted">loading…</p>}
      {[...grouped.entries()].map(([collection, rows]) => (
        <section key={collection}>
          <p className="studio-label">{collection}/</p>
          <ul className="studio-tree">
            {rows.map((note) => (
              <li key={note.path}>
                <button
                  className={note.path === props.activePath ? "is-active" : undefined}
                  onClick={() => navigateTo(note.path)}
                  type="button"
                >
                  {note.name}
                </button>
              </li>
            ))}
            {rows.length === 0 && <li className="studio-muted studio-tree-empty">(empty)</li>}
          </ul>
        </section>
      ))}
      {creating && (
        <NewNoteDialog
          onClose={() => setCreating(false)}
          onCreated={(path) => {
            setCreating(false);
            props.onNew();
            navigateTo(path);
          }}
          token={props.token}
        />
      )}
    </nav>
  );
}

function NewNoteDialog(props: { token: string; onClose: () => void; onCreated: (path: string) => void }) {
  const [kind, setKind] = useState<"course" | "paper">("paper");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!SLUG_RE.test(slug)) {
      setError("slug must be ascii kebab-case (e.g. eagle-3-deep-dive)");
      return;
    }
    if (!title.trim()) {
      setError("title is required");
      return;
    }
    setBusy(true);
    setError(null);
    const today = new Date().toISOString().slice(0, 10);
    const collection = kind === "paper" ? "paper-reading" : "course-notes";
    const path = `${STUDIO.contentRoot}/${collection}/${slug}.mdx`;
    const body = kind === "paper" ? paperTemplate(title.trim(), today) : courseTemplate(title.trim(), today);
    try {
      await saveFile(props.token, path, body, `studio: scaffold ${collection}/${slug}`);
      props.onCreated(path);
    } catch (err) {
      setError(String((err as Error)?.message ?? err));
      setBusy(false);
    }
  }

  return (
    <div aria-modal className="studio-modal-backdrop" role="dialog">
      <div className="studio-modal">
        <p className="studio-prompt">
          <span className="accent">$</span> studio new
        </p>
        <label className="studio-field">
          kind
          <select className="studio-input" onChange={(e) => setKind(e.target.value as "course" | "paper")} value={kind}>
            <option value="paper">paper-reading</option>
            <option value="course">course-notes</option>
          </select>
        </label>
        <label className="studio-field">
          slug
          <input
            autoFocus
            className="studio-input"
            onChange={(e) => setSlug(e.target.value)}
            placeholder="eagle-3-deep-dive"
            value={slug}
          />
        </label>
        <label className="studio-field">
          title
          <input className="studio-input" onChange={(e) => setTitle(e.target.value)} placeholder="EAGLE-3: …" value={title} />
        </label>
        {error && <p className="studio-error">{error}</p>}
        <div className="studio-modal-actions">
          <button className="studio-btn" disabled={busy} onClick={props.onClose} type="button">
            cancel
          </button>
          <button className="studio-btn studio-btn-primary" disabled={busy} onClick={create} type="button">
            {busy ? "creating…" : "create (commits scaffold)"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- editor */

type ConflictState = null | { remote: FileContent };

function Editor(props: { token: string; path: string; onCommitted: (commitSha: string) => void }) {
  const { token, path } = props;
  const [remote, setRemote] = useState<FileContent | null>(null);
  const [text, setText] = useState<string>("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingDraft, setPendingDraft] = useState<Draft | null>(null);
  const [committing, setCommitting] = useState(false);
  const [commitOpen, setCommitOpen] = useState(false);
  const [conflict, setConflict] = useState<ConflictState>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const lastDraftAt = useRef(0);

  const dirty = remote !== null && text !== remote.text;

  // Always-fresh snapshot so unmount/pagehide flushes never see stale state.
  const latest = useRef({ path, text, baseSha: "", dirty });
  useEffect(() => {
    latest.current = { path, text, baseSha: remote?.sha ?? "", dirty };
  });

  useEffect(() => {
    let cancelled = false;
    readFile(token, path)
      .then((file) => {
        if (cancelled) return;
        setRemote(file);
        const draft = loadDraft(path);
        if (draft && draft.text !== file.text) {
          setPendingDraft(draft);
          setText(file.text);
        } else {
          if (draft) clearDraft(path);
          setText(file.text);
        }
      })
      .catch((err) => {
        if (!cancelled) setLoadError(String((err as Error)?.message ?? err));
      });
    return () => {
      cancelled = true;
    };
  }, [token, path]);

  // Local draft persistence: 2s debounce with a 5s max-wait, so continuous
  // typing still checkpoints instead of resetting the timer forever.
  useEffect(() => {
    if (!remote || !dirty) return;
    const write = () => {
      saveDraft(path, { text, savedAt: Date.now(), baseSha: remote.sha });
      lastDraftAt.current = Date.now();
      setSavedAt(Date.now());
    };
    if (Date.now() - lastDraftAt.current > 5000) {
      write();
      return;
    }
    const timer = window.setTimeout(write, 2000);
    return () => window.clearTimeout(timer);
  }, [text, dirty, remote, path]);

  // Flush the draft on unmount (note switch) and page close — a pending
  // debounce must never be the only copy of typed text.
  useEffect(() => {
    const flush = () => {
      const s = latest.current;
      if (s.dirty) saveDraft(s.path, { text: s.text, savedAt: Date.now(), baseSha: s.baseSha });
    };
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
      flush();
    };
  }, []);

  // ⌘S / Ctrl+S = commit.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (dirty && !committing) setCommitOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, committing]);

  const commit = useCallback(
    async (message: string) => {
      if (!remote) return;
      setCommitting(true);
      try {
        const result = await saveFile(token, path, text, message, remote.sha);
        setRemote({ path, sha: result.sha, text });
        clearDraft(path);
        setCommitOpen(false);
        setConflict(null);
        props.onCommitted(result.commitSha);
      } catch (err) {
        if (err instanceof GhConflictError) {
          // Someone (desktop git? the agent?) changed the file meanwhile.
          try {
            const fresh = await readFile(token, path);
            setConflict({ remote: fresh });
          } catch {
            setConflict(null);
          }
          setCommitOpen(false);
        } else {
          alert(`commit failed: ${String((err as Error)?.message ?? err)}`);
        }
      } finally {
        setCommitting(false);
      }
    },
    [remote, token, path, text, props]
  );

  if (loadError) {
    return (
      <section className="studio-editor">
        <p className="studio-error">failed to load {path}: {loadError}</p>
      </section>
    );
  }
  if (!remote) return <CenteredNote text={`loading ${path}…`} />;

  const filename = path.split("/").pop() ?? path;

  return (
    <section className="studio-editor">
      <div className="studio-editor-head">
        <p className="studio-filename">
          {filename}
          {dirty && <span className="studio-dirty" title="unsaved changes">●</span>}
        </p>
        <div className="studio-editor-actions">
          {savedAt && dirty && <span className="faint">draft saved {new Date(savedAt).toLocaleTimeString()}</span>}
          <button
            className="studio-btn studio-btn-primary"
            disabled={!dirty || committing}
            onClick={() => setCommitOpen(true)}
            type="button"
          >
            commit ⌘S
          </button>
        </div>
      </div>

      {pendingDraft && (
        <div className="studio-banner">
          <span>
            a local draft from {new Date(pendingDraft.savedAt).toLocaleString()} exists for this note.
          </span>
          <button
            className="studio-btn"
            onClick={() => {
              setText(pendingDraft.text);
              setPendingDraft(null);
            }}
            type="button"
          >
            restore draft
          </button>
          <button
            className="studio-btn studio-btn-ghost"
            onClick={() => {
              clearDraft(path);
              setPendingDraft(null);
            }}
            type="button"
          >
            discard
          </button>
        </div>
      )}

      {conflict && (
        <div className="studio-banner studio-banner-warn">
          <span>
            the file changed on GitHub while you were editing (your text is untouched; local draft kept).
          </span>
          <button
            className="studio-btn"
            onClick={() => {
              setRemote(conflict.remote);
              setConflict(null);
            }}
            type="button"
          >
            rebase onto remote (keep my text)
          </button>
          <button
            className="studio-btn studio-btn-ghost"
            onClick={() => {
              setText(conflict.remote.text);
              setRemote(conflict.remote);
              setConflict(null);
              clearDraft(path);
            }}
            type="button"
          >
            take remote version
          </button>
        </div>
      )}

      <textarea
        aria-label={`MDX source of ${filename}`}
        className="studio-textarea"
        onChange={(event) => setText(event.target.value)}
        spellCheck={false}
        value={text}
      />

      {commitOpen && (
        <CommitDialog
          busy={committing}
          defaultMessage={`studio: update ${filename.replace(/\.(md|mdx)$/, "")}`}
          onCancel={() => setCommitOpen(false)}
          onCommit={commit}
        />
      )}
    </section>
  );
}

function CommitDialog(props: {
  defaultMessage: string;
  busy: boolean;
  onCommit: (message: string) => void;
  onCancel: () => void;
}) {
  const [message, setMessage] = useState(props.defaultMessage);
  return (
    <div aria-modal className="studio-modal-backdrop" role="dialog">
      <div className="studio-modal">
        <p className="studio-prompt">
          <span className="accent">$</span> git commit -m
        </p>
        <input
          autoFocus
          className="studio-input"
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && message.trim() && !props.busy) props.onCommit(message.trim());
            if (event.key === "Escape") props.onCancel();
          }}
          value={message}
        />
        <div className="studio-modal-actions">
          <button className="studio-btn" disabled={props.busy} onClick={props.onCancel} type="button">
            cancel
          </button>
          <button
            className="studio-btn studio-btn-primary"
            disabled={props.busy || !message.trim()}
            onClick={() => props.onCommit(message.trim())}
            type="button"
          >
            {props.busy ? "committing…" : "commit & deploy"}
          </button>
        </div>
      </div>
    </div>
  );
}
