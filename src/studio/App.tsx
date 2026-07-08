/*
 * Studio — personal Notion-grade editor for the site's MDX notes.
 * P1: auth + note tree + raw MDX editor + drafts + commit-on-save.
 * Static client-only app: all writes go through the GitHub contents API
 * with the logged-in user's token (collaborator gate = write permission).
 */
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { SLUG_RE, courseTemplate, paperTemplate } from "@/lib/templates.mjs";
import Preview from "@/studio/Preview";
import PropertiesPanel from "@/studio/PropertiesPanel";
import SplitPane from "@/studio/SplitPane";

// BlockNote is heavy (ProseMirror + Mantine); load it only when a note is
// opened in block mode so the login/tree paint stays instant.
const BlockEditor = lazy(() => import("@/studio/BlockEditor"));
import { REPO_SLUG, STUDIO, type StudioCollection } from "@/studio/config";
import { getStoredToken, loginWithPopup, storeToken } from "@/studio/lib/auth";
import { diffLines, diffStats, foldSameRuns } from "@/studio/lib/diff";
import {
  GhConflictError,
  GhError,
  deleteFile,
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
import { noteUrl } from "@/studio/blocks/noteUrl";
import { fmSet, fmValues, frontmatterToText, parseFrontmatter } from "@/studio/lib/frontmatter";
import { joinFrontmatter, renderPreview, splitFrontmatter } from "@/studio/lib/mdx";
import {
  addTaxonomy,
  parseTaxonomy,
  removeTaxonomy,
  renameTaxonomyLabel,
  TAX_ID_RE,
  type Taxonomy
} from "@/studio/lib/taxonomyEdit";
import { areas as bundledAreas, courses as bundledCourses } from "@/data/taxonomy";

const TAXONOMY_PATH = "src/data/taxonomy.ts";

/** Live taxonomy folders for a collection: id -> label. Falls back to the
 * build-time import until the fetched taxonomy.ts is parsed. */
function foldersFor(collection: StudioCollection, tax: Taxonomy | null): Record<string, string> {
  if (collection === "paper-reading") {
    return tax?.areas ?? Object.fromEntries(Object.entries(bundledAreas).map(([k, v]) => [k, v.label]));
  }
  const courses = tax?.courses ?? bundledCourses;
  return Object.fromEntries(Object.entries(courses).map(([k, v]) => [k, (v as { label: string }).label]));
}

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
  sha: string;
}

/* Per-note metadata read from frontmatter for the sidebar's virtual grouping
 * (group = area for papers / course for course-notes) and nicer titles. Keyed
 * by path; `sha` lets us skip re-reading unchanged notes. */
interface NoteMeta {
  sha: string;
  group: string | null;
  title: string;
}

function groupKeyFor(collection: StudioCollection): "area" | "course" {
  return collection === "paper-reading" ? "area" : "course";
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
            .map((row) => ({ collection, name: row.name, path: row.path, sha: row.sha }));
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

  // Enrich the flat file list with per-note frontmatter (group + title) for the
  // sidebar's virtual grouping. Runs after the tree loads, reads only notes
  // whose sha changed, and updates progressively so the tree paints instantly.
  const [noteMeta, setNoteMeta] = useState<Record<string, NoteMeta>>({});
  const metaRef = useRef<Record<string, NoteMeta>>({});
  useEffect(() => {
    if (!notes || notes.length === 0) return undefined;
    const missing = notes.filter((n) => metaRef.current[n.path]?.sha !== n.sha);
    if (missing.length === 0) return undefined;
    let cancelled = false;
    void (async () => {
      const entries = await Promise.all(
        missing.map(async (n): Promise<[string, NoteMeta]> => {
          try {
            const file = await readFile(token, n.path);
            const split = splitFrontmatter(file.text);
            const values = fmValues(parseFrontmatter(split.frontmatter));
            const raw = values[groupKeyFor(n.collection)];
            const title = typeof values.title === "string" && values.title ? values.title : n.name;
            return [n.path, { sha: n.sha, group: typeof raw === "string" ? raw : null, title }];
          } catch {
            return [n.path, { sha: n.sha, group: null, title: n.name }];
          }
        })
      );
      if (cancelled) return;
      metaRef.current = { ...metaRef.current, ...Object.fromEntries(entries) };
      setNoteMeta(metaRef.current);
    })();
    return () => {
      cancelled = true;
    };
  }, [notes, token]);

  // Live taxonomy (folders). Read from the committed taxonomy.ts so folders
  // added this session are usable before the next deploy; falls back to the
  // bundled import until fetched.
  const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null);
  const refreshTaxonomy = useCallback(async () => {
    try {
      const file = await readFile(token, TAXONOMY_PATH);
      setTaxonomy(parseTaxonomy(file.text));
    } catch {
      /* keep the bundled fallback */
    }
  }, [token]);
  useEffect(() => {
    void refreshTaxonomy();
  }, [refreshTaxonomy]);

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
          <a className="studio-crumb-home" href={import.meta.env.BASE_URL} title="back to homepage">
            <span className="accent">{viewer.login}</span>
            <span className="faint">@studio:</span>
          </a>
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
        <Sidebar
          activePath={activePath}
          error={treeError}
          meta={noteMeta}
          notes={notes}
          onNew={refreshTree}
          onTaxonomyChange={refreshTaxonomy}
          taxonomy={taxonomy}
          token={token}
        />
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

const COLLAPSE_KEY = "studio:sidebar-collapsed";

function loadCollapsed(): Record<string, boolean> {
  try {
    return JSON.parse(window.localStorage.getItem(COLLAPSE_KEY) ?? "{}") as Record<string, boolean>;
  } catch {
    return {};
  }
}

type NoteAction = "open" | "copy-link" | "duplicate" | "move" | "rename" | "delete";

function ContextMenu(props: {
  x: number;
  y: number;
  onClose: () => void;
  onPick: (action: NoteAction) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) props.onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && props.onClose();
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [props]);
  // Keep the menu on-screen near the cursor.
  const style = { left: Math.min(props.x, window.innerWidth - 190), top: Math.min(props.y, window.innerHeight - 210) };
  const items: { action: NoteAction; label: string; glyph: string; danger?: boolean }[] = [
    { action: "open", label: "Open", glyph: "↵" },
    { action: "copy-link", label: "Copy link", glyph: "⌘" },
    { action: "move", label: "Move to…", glyph: "⇄" },
    { action: "duplicate", label: "Duplicate", glyph: "⧉" },
    { action: "rename", label: "Rename…", glyph: "✎" },
    { action: "delete", label: "Delete…", glyph: "✕", danger: true }
  ];
  return (
    <div className="studio-ctx" ref={ref} role="menu" style={style}>
      {items.map((it) => (
        <button
          className={`studio-ctx-item${it.danger ? " is-danger" : ""}`}
          key={it.action}
          onClick={() => props.onPick(it.action)}
          role="menuitem"
          type="button"
        >
          <span aria-hidden="true" className="studio-ctx-glyph">
            {it.glyph}
          </span>
          {it.label}
        </button>
      ))}
    </div>
  );
}

interface NoteGroup {
  id: string | null;
  label: string;
  notes: NoteRow[];
}

function Sidebar(props: {
  token: string;
  notes: NoteRow[] | null;
  meta: Record<string, NoteMeta>;
  taxonomy: Taxonomy | null;
  error: string | null;
  activePath: string | null;
  onNew: () => void;
  onTaxonomyChange: () => void;
}) {
  const [creating, setCreating] = useState<{ collection?: StudioCollection; group?: string } | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(loadCollapsed);
  const [menu, setMenu] = useState<{ note: NoteRow; x: number; y: number } | null>(null);
  const [folderMenu, setFolderMenu] = useState<{ collection: StudioCollection; group: NoteGroup | null; x: number; y: number } | null>(null);
  const [dialog, setDialog] = useState<{ mode: "rename" | "delete" | "move"; note: NoteRow } | null>(null);
  const [folderDialog, setFolderDialog] = useState<{ mode: "new" | "rename"; collection: StudioCollection; group?: NoteGroup } | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [dragPath, setDragPath] = useState<string | null>(null);
  const [dropKey, setDropKey] = useState<string | null>(null);

  const { meta, taxonomy } = props;
  const titleOf = (note: NoteRow) => meta[note.path]?.title ?? note.name;

  // collection -> ordered groups. Every folder from the live taxonomy is shown
  // (empty or not, so folders can be created and dragged into), non-empty A→Z
  // first, then empty folders, then an "ungrouped" bucket for notes whose group
  // is missing/unknown.
  const grouped = useMemo(() => {
    const map = new Map<StudioCollection, NoteGroup[]>();
    for (const collection of STUDIO.collections) {
      const folders = foldersFor(collection, taxonomy);
      const byGroup = new Map<string | null, NoteRow[]>();
      for (const id of Object.keys(folders)) byGroup.set(id, []);
      for (const note of (props.notes ?? []).filter((n) => n.collection === collection)) {
        const id = meta[note.path]?.group ?? null;
        const key = id != null && folders[id] ? id : null;
        (byGroup.get(key) ?? byGroup.set(key, []).get(key)!).push(note);
      }
      const groups: NoteGroup[] = [...byGroup.entries()]
        .map(([id, notes]) => ({ id, label: id ? folders[id] ?? id : "· ungrouped", notes }))
        // drop an empty ungrouped bucket; keep empty real folders
        .filter((g) => g.id !== null || g.notes.length > 0)
        .sort((a, b) => {
          if (a.id === null) return 1;
          if (b.id === null) return -1;
          if ((a.notes.length > 0) !== (b.notes.length > 0)) return a.notes.length > 0 ? -1 : 1;
          return a.label.localeCompare(b.label);
        });
      for (const g of groups) g.notes.sort((a, b) => titleOf(a).localeCompare(titleOf(b)));
      map.set(collection, groups);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.notes, meta, taxonomy]);

  const toggle = (c: string) =>
    setCollapsed((prev) => {
      const next = { ...prev, [c]: !prev[c] };
      window.localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next));
      return next;
    });

  const copyLink = (note: NoteRow) => {
    const url = noteUrl(note.path);
    if (url) navigator.clipboard?.writeText(url).catch(() => undefined);
  };

  // A free "<slug>-copy[-n].mdx" path in the same collection.
  const freeCopyPath = (note: NoteRow): string => {
    const dir = note.path.slice(0, note.path.lastIndexOf("/"));
    const base = note.name.replace(/\.mdx?$/, "");
    const ext = note.name.slice(base.length);
    const taken = new Set((props.notes ?? []).map((n) => n.path));
    let candidate = `${dir}/${base}-copy${ext}`;
    let n = 2;
    while (taken.has(candidate)) candidate = `${dir}/${base}-copy-${n++}${ext}`;
    return candidate;
  };

  const duplicate = async (note: NoteRow) => {
    setPending(note.path);
    setActionError(null);
    try {
      const src = await readFile(props.token, note.path);
      const dest = freeCopyPath(note);
      await saveFile(props.token, dest, src.text, `studio: duplicate ${note.collection}/${note.name}`);
      props.onNew();
      navigateTo(dest);
    } catch (err) {
      setActionError(String((err as Error)?.message ?? err));
    } finally {
      setPending(null);
    }
  };

  const rename = async (note: NoteRow, newSlug: string) => {
    const dir = note.path.slice(0, note.path.lastIndexOf("/"));
    const ext = note.name.slice(note.name.replace(/\.mdx?$/, "").length);
    const dest = `${dir}/${newSlug}${ext}`;
    if (dest === note.path) return setDialog(null);
    setPending(note.path);
    setActionError(null);
    try {
      const src = await readFile(props.token, note.path);
      await saveFile(props.token, dest, src.text, `studio: rename ${note.name} -> ${newSlug}${ext}`);
      await deleteFile(props.token, note.path, note.sha, `studio: rename ${note.name} -> ${newSlug}${ext} (remove old)`);
      setDialog(null);
      props.onNew();
      if (props.activePath === note.path) navigateTo(dest);
    } catch (err) {
      setActionError(String((err as Error)?.message ?? err));
    } finally {
      setPending(null);
    }
  };

  const remove = async (note: NoteRow) => {
    setPending(note.path);
    setActionError(null);
    try {
      await deleteFile(props.token, note.path, note.sha, `studio: delete ${note.collection}/${note.name}`);
      setDialog(null);
      props.onNew();
      if (props.activePath === note.path) navigateTo(null);
    } catch (err) {
      setActionError(String((err as Error)?.message ?? err));
    } finally {
      setPending(null);
    }
  };

  // Reassign the note's group (area/course) — a frontmatter edit, not a file
  // move; the file stays put and the sidebar regroups it.
  const move = async (note: NoteRow, groupId: string) => {
    setPending(note.path);
    setActionError(null);
    try {
      const src = await readFile(props.token, note.path);
      const split = splitFrontmatter(src.text);
      if (!split.hasFrontmatter) throw new Error("note has no frontmatter to group by");
      const fm = parseFrontmatter(split.frontmatter);
      fmSet(fm, groupKeyFor(note.collection), groupId);
      const next = joinFrontmatter(frontmatterToText(fm), split.body);
      await saveFile(props.token, note.path, next, `studio: move ${note.name} -> ${groupId}`, note.sha);
      setDialog(null);
      props.onNew();
    } catch (err) {
      setActionError(String((err as Error)?.message ?? err));
    } finally {
      setPending(null);
    }
  };

  const onPick = (action: NoteAction, note: NoteRow) => {
    setMenu(null);
    if (action === "open") navigateTo(note.path);
    else if (action === "copy-link") copyLink(note);
    else if (action === "duplicate") void duplicate(note);
    else if (action === "move") setDialog({ mode: "move", note });
    else if (action === "rename") setDialog({ mode: "rename", note });
    else if (action === "delete") setDialog({ mode: "delete", note });
  };

  // Drag a note onto a group header to reassign its area/course. Only within
  // the same collection and onto a real (non-ungrouped) group.
  const canDropOn = (collection: StudioCollection, groupId: string | null): boolean => {
    if (!dragPath || groupId === null) return false;
    const dragged = (props.notes ?? []).find((n) => n.path === dragPath);
    return !!dragged && dragged.collection === collection && (meta[dragPath]?.group ?? null) !== groupId;
  };

  const dropOnGroup = (collection: StudioCollection, groupId: string | null) => {
    const dragged = (props.notes ?? []).find((n) => n.path === dragPath);
    setDropKey(null);
    setDragPath(null);
    if (dragged && groupId && canDropOn(collection, groupId)) void move(dragged, groupId);
  };

  // ---- folder (taxonomy) operations: add / rename / remove ---------------
  const editTaxonomy = async (fn: (text: string) => string, message: string) => {
    setActionError(null);
    setPending("taxonomy");
    try {
      const file = await readFile(props.token, TAXONOMY_PATH);
      await saveFile(props.token, TAXONOMY_PATH, fn(file.text), message, file.sha);
      props.onTaxonomyChange();
      setFolderDialog(null);
    } catch (err) {
      setActionError(String((err as Error)?.message ?? err));
    } finally {
      setPending(null);
    }
  };

  const newFolder = (collection: StudioCollection, id: string, label: string) => {
    const kind = collection === "paper-reading" ? "areas" : "courses";
    const area = collection === "course-notes" ? Object.keys(bundledAreas)[0] : undefined;
    void editTaxonomy((t) => addTaxonomy(t, kind, id, label, area), `studio: add folder ${id}`);
  };

  const renameFolder = (collection: StudioCollection, id: string, label: string) => {
    const kind = collection === "paper-reading" ? "areas" : "courses";
    void editTaxonomy((t) => renameTaxonomyLabel(t, kind, id, label), `studio: rename folder ${id} label`);
  };

  const deleteFolder = (collection: StudioCollection, group: NoteGroup) => {
    if (!group.id || group.notes.length > 0) return; // only empty folders
    const kind = collection === "paper-reading" ? "areas" : "courses";
    void editTaxonomy((t) => removeTaxonomy(t, kind, group.id as string), `studio: remove folder ${group.id}`);
  };

  return (
    <nav aria-label="notes" className="studio-sidebar">
      <div className="studio-sidebar-head">
        <span className="studio-label">notes</span>
        <button className="studio-btn studio-btn-ghost" onClick={() => setCreating({})} type="button">
          + new
        </button>
      </div>
      {props.error && <p className="studio-error">tree: {props.error}</p>}
      {!props.notes && !props.error && <p className="studio-muted">loading…</p>}
      {actionError && <p className="studio-error">{actionError}</p>}
      {[...grouped.entries()].map(([collection, groups]) => {
        const colKey = `col:${collection}`;
        const isCollapsed = !!collapsed[colKey];
        const total = groups.reduce((n, g) => n + g.notes.length, 0);
        return (
          <section className="studio-folder" key={collection}>
            <button
              aria-expanded={!isCollapsed}
              className="studio-folder-head"
              onClick={() => toggle(colKey)}
              onContextMenu={(e) => {
                e.preventDefault();
                setFolderMenu({ collection, group: null, x: e.clientX, y: e.clientY });
              }}
              type="button"
            >
              <span className={`studio-chevron${isCollapsed ? " is-collapsed" : ""}`} aria-hidden="true">
                ▾
              </span>
              <span className="studio-folder-name">{collection}/</span>
              <span className="studio-folder-count">{total || ""}</span>
              <span
                aria-label={`${collection} actions`}
                className="studio-tree-more"
                onClick={(e) => {
                  e.stopPropagation();
                  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setFolderMenu({ collection, group: null, x: r.right, y: r.bottom });
                }}
                role="button"
                tabIndex={-1}
              >
                ⋯
              </span>
            </button>
            <div className={`studio-tree-wrap${isCollapsed ? " is-collapsed" : ""}`}>
              <div className="studio-collapse-inner">
              {total === 0 && <p className="studio-muted studio-tree-empty">(empty)</p>}
              {groups.map((group) => {
                const gKey = `grp:${collection}:${group.id ?? ""}`;
                const gCollapsed = !!collapsed[gKey];
                return (
                  <div className="studio-group" key={gKey}>
                    <button
                      aria-expanded={!gCollapsed}
                      className={`studio-group-head${dropKey === gKey ? " is-drop" : ""}${group.notes.length === 0 ? " is-empty" : ""}`}
                      onClick={() => toggle(gKey)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setFolderMenu({ collection, group, x: e.clientX, y: e.clientY });
                      }}
                      onDragLeave={() => setDropKey((k) => (k === gKey ? null : k))}
                      onDragOver={(e) => {
                        if (canDropOn(collection, group.id)) {
                          e.preventDefault();
                          setDropKey(gKey);
                        }
                      }}
                      onDrop={() => dropOnGroup(collection, group.id)}
                      type="button"
                    >
                      <span className={`studio-chevron is-sub${gCollapsed ? " is-collapsed" : ""}`} aria-hidden="true">
                        ▾
                      </span>
                      <span className="studio-group-name">{group.label}</span>
                      <span className="studio-folder-count">{group.notes.length}</span>
                      {group.id && (
                        <span
                          aria-label={`${group.label} actions`}
                          className="studio-tree-more"
                          onClick={(e) => {
                            e.stopPropagation();
                            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            setFolderMenu({ collection, group, x: r.right, y: r.bottom });
                          }}
                          role="button"
                          tabIndex={-1}
                        >
                          ⋯
                        </span>
                      )}
                    </button>
                    <div className={`studio-tree-wrap${gCollapsed ? " is-collapsed" : ""}`}>
                      <ul className="studio-tree">
                        {group.notes.map((note) => (
                          <li key={note.path}>
                            <button
                              className={`studio-tree-row${note.path === props.activePath ? " is-active" : ""}${pending === note.path ? " is-pending" : ""}${dragPath === note.path ? " is-dragging" : ""}`}
                              draggable
                              onClick={() => navigateTo(note.path)}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setMenu({ note, x: e.clientX, y: e.clientY });
                              }}
                              onDragEnd={() => {
                                setDragPath(null);
                                setDropKey(null);
                              }}
                              onDragStart={(e) => {
                                setDragPath(note.path);
                                e.dataTransfer.effectAllowed = "move";
                              }}
                              title={note.name}
                              type="button"
                            >
                              <span className="studio-tree-name">{titleOf(note)}</span>
                              <span
                                aria-label={`actions for ${note.name}`}
                                className="studio-tree-more"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                  setMenu({ note, x: r.right, y: r.bottom });
                                }}
                                role="button"
                                tabIndex={-1}
                              >
                                ⋯
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          </section>
        );
      })}
      {menu && <ContextMenu onClose={() => setMenu(null)} onPick={(a) => onPick(a, menu.note)} x={menu.x} y={menu.y} />}
      {dialog?.mode === "rename" && (
        <RenameDialog
          busy={pending === dialog.note.path}
          note={dialog.note}
          onClose={() => setDialog(null)}
          onSubmit={(slug) => void rename(dialog.note, slug)}
        />
      )}
      {dialog?.mode === "move" && (
        <MoveDialog
          busy={pending === dialog.note.path}
          current={meta[dialog.note.path]?.group ?? null}
          folders={foldersFor(dialog.note.collection, taxonomy)}
          note={dialog.note}
          onClose={() => setDialog(null)}
          onSubmit={(groupId) => void move(dialog.note, groupId)}
        />
      )}
      {dialog?.mode === "delete" && (
        <ConfirmDialog
          busy={pending === dialog.note.path}
          message={`Delete ${dialog.note.collection}/${dialog.note.name}? This removes the file on ${STUDIO.branch} (recoverable from git history).`}
          onCancel={() => setDialog(null)}
          onConfirm={() => void remove(dialog.note)}
          title="delete note"
        />
      )}
      {folderMenu && (
        <FolderMenu
          canDelete={!!folderMenu.group?.id && folderMenu.group.notes.length === 0}
          isGroup={!!folderMenu.group}
          onClose={() => setFolderMenu(null)}
          onPick={(action) => {
            const { collection, group } = folderMenu;
            setFolderMenu(null);
            if (action === "new-note") setCreating({ collection, group: group?.id ?? undefined });
            else if (action === "new-folder") setFolderDialog({ mode: "new", collection });
            else if (action === "rename-folder" && group) setFolderDialog({ mode: "rename", collection, group });
            else if (action === "delete-folder" && group) deleteFolder(collection, group);
          }}
          x={folderMenu.x}
          y={folderMenu.y}
        />
      )}
      {folderDialog?.mode === "new" && (
        <FolderDialog
          busy={pending === "taxonomy"}
          collection={folderDialog.collection}
          onClose={() => setFolderDialog(null)}
          onSubmit={(id, label) => newFolder(folderDialog.collection, id, label)}
        />
      )}
      {folderDialog?.mode === "rename" && folderDialog.group?.id && (
        <FolderDialog
          busy={pending === "taxonomy"}
          collection={folderDialog.collection}
          current={{ id: folderDialog.group.id, label: folderDialog.group.label }}
          onClose={() => setFolderDialog(null)}
          onSubmit={(_id, label) => renameFolder(folderDialog.collection, folderDialog.group!.id as string, label)}
        />
      )}
      {creating && (
        <NewNoteDialog
          preset={creating}
          onClose={() => setCreating(null)}
          onCreated={(path) => {
            setCreating(null);
            props.onNew();
            navigateTo(path);
          }}
          token={props.token}
        />
      )}
    </nav>
  );
}

type FolderAction = "new-note" | "new-folder" | "rename-folder" | "delete-folder";

function FolderMenu(props: {
  isGroup: boolean;
  canDelete: boolean;
  x: number;
  y: number;
  onClose: () => void;
  onPick: (action: FolderAction) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) props.onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && props.onClose();
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [props]);
  const items: { action: FolderAction; label: string; glyph: string; show: boolean; danger?: boolean }[] = [
    { action: "new-note", label: props.isGroup ? "New note here" : "New note", glyph: "✚", show: true },
    { action: "new-folder", label: "New folder…", glyph: "⊞", show: !props.isGroup },
    { action: "rename-folder", label: "Rename folder…", glyph: "✎", show: props.isGroup },
    { action: "delete-folder", label: "Delete folder", glyph: "✕", show: props.isGroup, danger: true }
  ];
  const style = { left: Math.min(props.x, window.innerWidth - 190), top: Math.min(props.y, window.innerHeight - 170) };
  return (
    <div className="studio-ctx" ref={ref} role="menu" style={style}>
      {items
        .filter((it) => it.show)
        .map((it) => (
          <button
            className={`studio-ctx-item${it.danger ? " is-danger" : ""}`}
            disabled={it.action === "delete-folder" && !props.canDelete}
            key={it.action}
            onClick={() => props.onPick(it.action)}
            role="menuitem"
            type="button"
          >
            <span aria-hidden="true" className="studio-ctx-glyph">
              {it.glyph}
            </span>
            {it.label}
            {it.action === "delete-folder" && !props.canDelete && <span className="studio-ctx-hint">(empty only)</span>}
          </button>
        ))}
    </div>
  );
}

function FolderDialog(props: {
  collection: StudioCollection;
  current?: { id: string; label: string };
  busy: boolean;
  onClose: () => void;
  onSubmit: (id: string, label: string) => void;
}) {
  const isRename = !!props.current;
  const [label, setLabel] = useState(props.current?.label ?? "");
  const [id, setId] = useState(props.current?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const noun = props.collection === "paper-reading" ? "area" : "course";
  const submit = () => {
    if (!label.trim()) return setError("label is required");
    const finalId = isRename ? props.current!.id : id.trim() || slugify(label);
    if (!isRename && !TAX_ID_RE.test(finalId)) return setError("id must be ascii kebab-case (e.g. efficient-inference)");
    props.onSubmit(finalId, label.trim());
  };
  return (
    <div aria-modal className="studio-modal-backdrop" role="dialog">
      <div className="studio-modal">
        <p className="studio-prompt">
          <span className="accent">$</span> studio {isRename ? "rename" : "new"} folder
        </p>
        <label className="studio-field">
          {noun} label
          <input
            autoFocus
            className="studio-input"
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Efficient Inference"
            value={label}
          />
        </label>
        {!isRename && (
          <label className="studio-field">
            id
            <input
              className="studio-input"
              onChange={(e) => setId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder={slugify(label) || "efficient-inference"}
              value={id}
            />
          </label>
        )}
        {error && <p className="studio-error">{error}</p>}
        <div className="studio-modal-actions">
          <button className="studio-btn studio-btn-ghost" disabled={props.busy} onClick={props.onClose} type="button">
            cancel
          </button>
          <button className="studio-btn" disabled={props.busy} onClick={submit} type="button">
            {props.busy ? "saving…" : isRename ? "rename" : "create"}
          </button>
        </div>
      </div>
    </div>
  );
}

function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

function RenameDialog(props: { note: NoteRow; busy: boolean; onClose: () => void; onSubmit: (slug: string) => void }) {
  const [slug, setSlug] = useState(props.note.name.replace(/\.mdx?$/, ""));
  const [error, setError] = useState<string | null>(null);
  const submit = () => {
    if (!SLUG_RE.test(slug)) return setError("slug must be ascii kebab-case (e.g. eagle-3-deep-dive)");
    props.onSubmit(slug);
  };
  return (
    <div aria-modal className="studio-modal-backdrop" role="dialog">
      <div className="studio-modal">
        <p className="studio-prompt">
          <span className="accent">$</span> studio rename
        </p>
        <label className="studio-field">
          new slug
          <input
            autoFocus
            className="studio-input"
            onChange={(e) => setSlug(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            value={slug}
          />
        </label>
        {error && <p className="studio-error">{error}</p>}
        <div className="studio-modal-actions">
          <button className="studio-btn studio-btn-ghost" disabled={props.busy} onClick={props.onClose} type="button">
            cancel
          </button>
          <button className="studio-btn" disabled={props.busy} onClick={submit} type="button">
            {props.busy ? "renaming…" : "rename"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MoveDialog(props: {
  note: NoteRow;
  current: string | null;
  folders: Record<string, string>;
  busy: boolean;
  onClose: () => void;
  onSubmit: (groupId: string) => void;
}) {
  const options = Object.entries(props.folders);
  const [groupId, setGroupId] = useState(props.current ?? options[0]?.[0] ?? "");
  const dimension = props.note.collection === "paper-reading" ? "area" : "course";
  return (
    <div aria-modal className="studio-modal-backdrop" role="dialog">
      <div className="studio-modal">
        <p className="studio-prompt">
          <span className="accent">$</span> studio move
        </p>
        <label className="studio-field">
          {dimension}
          <select className="studio-input" onChange={(e) => setGroupId(e.target.value)} value={groupId}>
            {options.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="studio-modal-actions">
          <button className="studio-btn studio-btn-ghost" disabled={props.busy} onClick={props.onClose} type="button">
            cancel
          </button>
          <button className="studio-btn" disabled={props.busy || !groupId} onClick={() => props.onSubmit(groupId)} type="button">
            {props.busy ? "moving…" : "move"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog(props: {
  title: string;
  message: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div aria-modal className="studio-modal-backdrop" role="dialog">
      <div className="studio-modal">
        <p className="studio-prompt">
          <span className="accent">$</span> {props.title}
        </p>
        <p className="studio-muted">{props.message}</p>
        <div className="studio-modal-actions">
          <button className="studio-btn studio-btn-ghost" disabled={props.busy} onClick={props.onCancel} type="button">
            cancel
          </button>
          <button className="studio-btn studio-btn-danger" disabled={props.busy} onClick={props.onConfirm} type="button">
            {props.busy ? "deleting…" : "delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const EXPORT_CSS = `
  :root { color-scheme: light; }
  body { max-width: 46rem; margin: 2.5rem auto; padding: 0 1.25rem; background: #fff; color: #1a1a1a;
    font-family: ui-monospace, "JetBrains Mono", "SFMono-Regular", Menlo, monospace; line-height: 1.7; }
  h1,h2,h3,h4 { line-height: 1.25; margin: 2rem 0 0.6rem; }
  p, li { margin: 0.5rem 0; }
  a { color: #3b5bdb; }
  code { background: #f0f0f3; padding: 0.1em 0.35em; border-radius: 4px; font-size: 0.9em; }
  pre { background: #f6f6f8; padding: 0.9rem 1.1rem; border-radius: 8px; overflow-x: auto; }
  pre code { background: none; padding: 0; }
  blockquote { margin: 1rem 0; padding-left: 1rem; border-left: 3px solid #d0d0d8; color: #555; }
  table { border-collapse: collapse; width: 100%; margin: 1.2rem 0; font-size: 0.92em; }
  th, td { border-bottom: 1px solid #e2e2e8; padding: 0.45rem 0.8rem; text-align: left; }
  th { color: #666; font-size: 0.82em; text-transform: uppercase; letter-spacing: 0.05em; }
  img { max-width: 100%; height: auto; }
  .mdx-preview > * { border: 1px solid #e6e6ec; border-radius: 8px; padding: 0.8rem 1rem; margin: 1rem 0; }
  .katex-display { overflow-x: auto; }
`;

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));
}

async function renderHtmlDoc(text: string, title: string): Promise<string> {
  const split = splitFrontmatter(text);
  const fm = fmValues(parseFrontmatter(split.frontmatter));
  const body = await renderPreview(split.body, fm);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
<style>${EXPORT_CSS}</style>
</head>
<body>
<article class="article-body mdx-preview">
<h1>${escapeHtml(title)}</h1>
${body}
</article>
</body>
</html>
`;
}

function ExportMenu({ text, filename }: { text: string; filename: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const slug = filename.replace(/\.(md|mdx)$/, "");
  const title = fmValues(parseFrontmatter(splitFrontmatter(text).frontmatter)).title;
  const docTitle = typeof title === "string" && title ? title : slug;

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
  }, []);

  const exportMd = () => {
    downloadFile(`${slug}.md`, text, "text/markdown;charset=utf-8");
    setOpen(false);
  };
  const exportHtml = async () => {
    setBusy(true);
    try {
      downloadFile(`${slug}.html`, await renderHtmlDoc(text, docTitle), "text/html;charset=utf-8");
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };
  const exportPdf = async () => {
    setBusy(true);
    try {
      const html = await renderHtmlDoc(text, docTitle);
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(html);
        w.document.close();
        w.addEventListener("load", () => {
          w.focus();
          w.print();
        });
      }
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  return (
    <div className="studio-export" ref={ref}>
      <button className="studio-btn studio-btn-ghost" onClick={() => setOpen((v) => !v)} type="button">
        {busy ? "…" : "export"}
      </button>
      {open && (
        <div className="studio-export-menu">
          <button onClick={exportMd} type="button">
            Markdown <span className="faint">.md</span>
          </button>
          <button onClick={() => void exportHtml()} type="button">
            HTML <span className="faint">.html</span>
          </button>
          <button onClick={() => void exportPdf()} type="button">
            PDF <span className="faint">print</span>
          </button>
        </div>
      )}
    </div>
  );
}

function NewNoteDialog(props: {
  token: string;
  preset?: { collection?: StudioCollection; group?: string } | null;
  onClose: () => void;
  onCreated: (path: string) => void;
}) {
  const presetKind = props.preset?.collection === "course-notes" ? "course" : props.preset?.collection === "paper-reading" ? "paper" : null;
  const [kind, setKind] = useState<"course" | "paper">(presetKind ?? "paper");
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
    const collection: StudioCollection = kind === "paper" ? "paper-reading" : "course-notes";
    const path = `${STUDIO.contentRoot}/${collection}/${slug}.mdx`;
    let body = kind === "paper" ? paperTemplate(title.trim(), today) : courseTemplate(title.trim(), today);
    // "New note here" preset: put the note straight into the chosen folder.
    if (props.preset?.group) {
      const split = splitFrontmatter(body);
      if (split.hasFrontmatter) {
        const fm = parseFrontmatter(split.frontmatter);
        fmSet(fm, groupKeyFor(collection), props.preset.group);
        body = joinFrontmatter(frontmatterToText(fm), split.body);
      }
    }
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
          <select
            className="studio-input"
            disabled={!!presetKind}
            onChange={(e) => setKind(e.target.value as "course" | "paper")}
            value={kind}
          >
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

interface ViewPrefs {
  mode: "raw" | "blocks";
  preview: boolean;
  props: boolean;
}

function loadViewPrefs(): ViewPrefs {
  try {
    const raw = window.localStorage.getItem("studio:view");
    if (raw) return { mode: "raw", preview: true, props: true, ...JSON.parse(raw) };
  } catch {
    /* defaults below */
  }
  // Live preview and properties on by default on wide screens. Raw is the
  // default editing surface until the block converter reaches GA (P3.6).
  const wide = window.matchMedia("(min-width: 1100px)").matches;
  return { mode: "raw", preview: wide, props: wide };
}

function collectionOf(path: string): StudioCollection {
  return path.includes("/paper-reading/") ? "paper-reading" : "course-notes";
}

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
  const [view, setView] = useState<ViewPrefs>(() => loadViewPrefs());
  const lastDraftAt = useRef(0);
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const scrollLock = useRef(0);

  // Proportional source↔preview sync. The short time lock swallows the echo
  // scroll event fired by programmatically setting the other pane's scrollTop.
  const syncScroll = useCallback((from: HTMLElement | null, to: HTMLElement | null) => {
    if (!from || !to) return;
    const now = Date.now();
    if (now - scrollLock.current < 50) return;
    scrollLock.current = now;
    const fromMax = from.scrollHeight - from.clientHeight;
    const toMax = to.scrollHeight - to.clientHeight;
    to.scrollTop = fromMax > 0 ? (from.scrollTop / fromMax) * toMax : 0;
  }, []);

  const dirty = remote !== null && text !== remote.text;
  const collection = collectionOf(path);

  const updateView = useCallback(
    (patch: Partial<ViewPrefs>) =>
      setView((prev) => {
        const next = { ...prev, ...patch };
        try {
          window.localStorage.setItem("studio:view", JSON.stringify(next));
        } catch {
          /* session-only prefs */
        }
        return next;
      }),
    []
  );

  // Always-fresh snapshot (written during render, so a macrotask scheduled
  // right after a state update reads the new value) — used by the unmount/
  // pagehide flush and by ⌘S after it blurs a focused field.
  const latest = useRef({ path, text, baseSha: "", dirty });
  latest.current = { path, text, baseSha: remote?.sha ?? "", dirty };

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

  // ⌘S / Ctrl+S = commit. Blur the active element first so a focused
  // Properties-panel field (which commits on blur) is flushed into `text`
  // before the diff dialog reads it; the timeout lets that state settle.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (committing) return;
        const active = document.activeElement as HTMLElement | null;
        active?.blur?.();
        window.setTimeout(() => {
          if (latest.current.dirty) setCommitOpen(true);
        }, 0);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [committing]);

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
          <span className="studio-segment" role="group" aria-label="editor mode">
            <button
              aria-pressed={view.mode === "raw"}
              className={`studio-seg-btn${view.mode === "raw" ? " is-on" : ""}`}
              onClick={() => updateView({ mode: "raw" })}
              type="button"
            >
              raw
            </button>
            <button
              aria-pressed={view.mode === "blocks"}
              className={`studio-seg-btn${view.mode === "blocks" ? " is-on" : ""}`}
              onClick={() => updateView({ mode: "blocks" })}
              type="button"
            >
              blocks
            </button>
          </span>
          {view.mode === "raw" && (
            <button
              aria-pressed={view.preview}
              className={`studio-btn studio-btn-ghost${view.preview ? " is-on" : ""}`}
              onClick={() => updateView({ preview: !view.preview })}
              type="button"
            >
              preview
            </button>
          )}
          <ExportMenu filename={filename} text={text} />
          <button
            aria-pressed={view.props}
            className={`studio-btn studio-btn-ghost${view.props ? " is-on" : ""}`}
            onClick={() => updateView({ props: !view.props })}
            type="button"
          >
            properties
          </button>
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

      <div className="studio-editor-body">
        {view.mode === "blocks" ? (
          <Suspense fallback={<CenteredNote text="loading block editor…" />}>
            <BlockEditor notePath={path} onChange={setText} text={text} />
          </Suspense>
        ) : view.preview ? (
          <SplitPane
            left={
              <textarea
                aria-label={`MDX source of ${filename}`}
                className="studio-textarea"
                onChange={(event) => setText(event.target.value)}
                onScroll={() => syncScroll(sourceRef.current, previewRef.current)}
                ref={sourceRef}
                spellCheck={false}
                value={text}
              />
            }
            right={
              <Preview
                onScroll={() => syncScroll(previewRef.current, sourceRef.current)}
                scrollRef={previewRef}
                text={text}
              />
            }
          />
        ) : (
          <textarea
            aria-label={`MDX source of ${filename}`}
            className="studio-textarea"
            onChange={(event) => setText(event.target.value)}
            spellCheck={false}
            value={text}
          />
        )}
        {view.props && <PropertiesPanel collection={collection} onChange={setText} text={text} />}
      </div>

      {commitOpen && (
        <CommitDialog
          busy={committing}
          defaultMessage={`studio: update ${filename.replace(/\.(md|mdx)$/, "")}`}
          newText={text}
          oldText={remote.text}
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
  oldText: string;
  newText: string;
  onCommit: (message: string) => void;
  onCancel: () => void;
}) {
  const [message, setMessage] = useState(props.defaultMessage);
  const diff = useMemo(() => diffLines(props.oldText, props.newText), [props.oldText, props.newText]);
  const stats = diff ? diffStats(diff) : null;
  const rows = useMemo(() => (diff ? foldSameRuns(diff) : []), [diff]);
  return (
    <div aria-modal className="studio-modal-backdrop" role="dialog">
      <div className="studio-modal studio-modal-wide">
        <p className="studio-prompt">
          <span className="accent">$</span> git diff · review before commit
          {stats && (
            <span className="studio-diff-stats">
              <span className="diff-add">+{stats.added}</span> <span className="diff-del">−{stats.removed}</span>
            </span>
          )}
        </p>
        <div className="studio-diff" tabIndex={0}>
          {diff === null ? (
            <p className="studio-muted">diff too large to render — committing is still safe.</p>
          ) : (
            <pre>
              {rows.map((row, index) =>
                row.kind === "fold" ? (
                  <span className="diff-fold" key={index}>{`  ··· ${row.hidden} unchanged lines ···\n`}</span>
                ) : (
                  <span className={`diff-${row.kind}`} key={index}>
                    {row.kind === "add" ? "+ " : row.kind === "del" ? "- " : "  "}
                    {row.text}
                    {"\n"}
                  </span>
                )
              )}
            </pre>
          )}
        </div>
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
