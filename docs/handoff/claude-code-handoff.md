# Claude Code Handoff

Current as of 2026-07-07 (post Studio P0/P1a; earlier: Terminal Luxe redesign + content system v2).

## Where work paused (2026-07-07, resume here)

Owner said "先暂存，明天继续". The active project is **Studio** — the Notion-grade personal
editor at `/studio/` (approved plan: `~/.claude/plans/bright-bouncing-aurora.md`).

Done and pushed:

- **P0**: shared frontmatter schema (`src/lib/schema/frontmatter.ts`) with 3-level
  `visibility` (public / unlisted / private; sitemap+RSS+Pagefind+robots+notes.json all
  leak-checked), shared templates (`src/lib/templates.mjs`), `/studio/notes.json` endpoint,
  Sveltia `/admin` deleted.
- **P1a**: working Studio MVP — GitHub popup login (cms-auth Worker, Decap protocol; PAT
  fallback), sidebar note tree, raw-MDX editor, localStorage drafts (2s debounce, restore
  banner), ⌘S commit dialog (contents API, sha-based, 409 conflict banner with
  rebase/take-remote), CI pill polling, `+ new` scaffolding. Code: `src/studio/`
  (App.tsx, config.ts, lib/auth.ts, lib/github.ts, studio.css) + `src/pages/studio/index.astro`.
  Verified by an offline puppeteer smoke test with a mocked GitHub API
  (login→tree→edit→⌘S→PUT sha/content→CI pill all pass).

**Done since:** P1b (live preview + properties panel + pre-commit diff, all review-fixed)
and **P3.0** (BlockNote editor shell + raw/blocks toggle + vitest wired into CI) are shipped.

**Enriched Studio roadmap (2026-07-07)** — after a design panel (SpanLock round-trip spine +
all-11-components ambition; spec in the wf_5faafd47 journal) and a Docmost/AFFiNE reference-
mining pass. Owner chose the fuller feature set over the scope-guardian's cut list. Order:

- **P3.1 converter spine**: `src/studio/convert/` (frozen mdast parser, verbatim-fence
  frontmatter split, `document.ts` no-op short-circuit + load-time self-check + whole-doc
  rawMdx fallback), `blocks/RawMdx.tsx`, `blocks/schema.ts`, and the **golden round-trip test
  harness in CI** (the #1 enrichment: block-registration discipline — every block = typed
  schema + MDX (de)serializer + view + golden test, or it doesn't merge). Byte-clean floor.
- **P3.2 native markdown + inline**: parse/serialize/provenance for paragraph/heading(1–6)/
  list(+regrouping)/quote/code/divider/image/**table**/inline-marks/inlineMath/displayMath.
- **P3.3 container components + math**: Tldr, Callout, DisplayMath, InlineMath (+ TexField,
  composition-safe inputs); **@-internal-note-link autocomplete** against notes.json.
- **P3.4 leaf components I**: jsxAttrs literal evaluator + printer + acorn net +
  `frontmatter.<field>` binding; Critique, WhenMatrix, KeyTakeaways (bound+literal), Recall;
  Verdict read-only strip in the panel. **Mermaid** fenced-code block (dual render: Studio
  preview + a lazy client-only renderer on public article pages).
- **P3.5 leaf components II**: Derivation, FormulaCard, Figure, Bench (spreadsheet).
- **P3.6 hardening + GA**: full 10-fixture golden suite, invariant guards, whole-doc fallback
  banner, curated **metadata-rich fuzzy slash menu** (title/desc/searchTerms/icon, `hd1`→
  Heading 1; only round-trippable blocks; Verdict excluded), then flip block mode to default.
- **P2 database views**: Table + Kanban + **Gallery** card view over the collections;
  **⌘F find/replace** (in-editor, ProseMirror); **+new template picker**; **unified ⌘K**
  (Pagefind search + jump-to-note + new-from-template + a deferred Ask-AI entry).
- **P4 history**: in-editor **diff + one-click Restore** over git (listCommits/getFileAtCommit;
  restore = a new sha-based commit, never force-push); **backlinks panel** (build-time index
  scanning MDX internal links) shown in the editor and optionally on public pages; Pagefind
  in ⌘K.
- **P5 AI assist**: selection/`/ai` toolbar → site-api `/ai/chat` GLM proxy; polish / continue
  / zh↔en translate / summarize / generate tldr / expand-to-skeleton, rendered as an
  accept/reject **suggestion diff** (never silent rewrite), "faithful, don't fabricate" prompt.

**Later owner requests (2026-07-07, folded in):**
- **Export** (P-Export): per-note export to **Markdown / HTML / PDF**, output must be clean and
  correct. MD = the committed source (or a rendered variant); HTML = the built article HTML
  (self-contained, inlined CSS); PDF = print-stylesheet via the browser. Client-only, no server.
- **Insert page / page embed** (P3.3-adjacent): a "link to note" block + an inline `@`-note-link
  (both serialize to a plain relative markdown link, lossless). "Subpages" in our flat file
  model = a build-time child/index block listing related notes. No nested-page DB.
- **Heading levels 1–6** (P3.2): the heading block supports H1–H6 (the design already specced
  "extend level to 1–6, style 1–3"); H4–H6 round-trip as `####`/`#####`/`######` and get a
  small styled treatment. Fixes "need an H4".
- **Performance** (cross-cutting NFR): notes with many images / multiple page-embeds / long
  bodies must stay smooth. Rules threaded through P3: lazy-load images (`loading="lazy"`,
  intrinsic sizing), lazy-render embeds/mermaid (IntersectionObserver, only when scrolled into
  view), debounce the converter/preview, and consider block virtualization if a note exceeds a
  large block count. Public pages stay JS-light (enhancement-only).
- **Note-page aesthetic refinement** (P-Polish): the published article pages (and the shared
  `.article-body` the block editor reuses) get a dedicated typography/rhythm/detail pass —
  higher-craft within Terminal-Luxe (fix the cramped author meta-rail wrap, refine vertical
  rhythm, hierarchy, and component detailing). Since the editor shares `.article-body`, this
  lifts both surfaces at once.

**Rejected for good (architecture conflict — do not revisit):** realtime multi-user collab
(Yjs/CRDT sync server), server-side full-text/attachment search, semantic-RAG AI Q&A, comment
threads + notifications, RBAC/roles/approval workflow, share links with per-link perms/expiry,
edgeless canvas/whiteboard, Excalidraw/Draw.io embedded-scene nodes, Postgres/Redis/BullMQ,
persistent DB "Bases", generic UI kits, paid version-retention tiers. All need a server/DB the
static+git+single-user model doesn't have; their value is re-expressed statically (commits =
versions, build-time indexes = search/backlinks, visibility frontmatter = access).

Owner-side actions pending (any order, docs/admin-setup.md):

- Part B: deploy `site-api` Worker (root dir `workers/site-api`) + Cloudflare API token
  (Account Analytics: Read) + fill `CF_ACCOUNT_ID`/`CF_API_TOKEN`/`HASH_SALT`/`ZHIPU_API_KEY`,
  then give Claude the Worker URL to put in `src/lib/site.ts` `siteApi` — turns on the
  first-party analytics beacon AND the live visitor map at `/stats/`. NOTE: `site.ts`
  currently holds a placeholder (`site-api.example.workers.dev`) — replace with the real URL.
- Part D: GitHub Student Pack → **after Pro is active** flip the repo private (order matters:
  Pages on a private repo needs Pro). Local mirror backup task is already installed
  ("HomePage git backup", daily 12:00, fetch --all + pull --ff-only).

## State

Production: https://ryanw0608.github.io/HomePage/ — GitHub Pages project site, base `/HomePage/`,
deploys on push to `master` via `.github/workflows/deploy.yml`.

The site is a dark-first, all-monospace "researcher's terminal" (user-chosen direction; see
`CLAUDE.md` for the quality bar). Owner: Yongzhe Wang — MSc computer science, University of Sydney,
FutureMLS Lab, advised by Zhongzhu Zhou and Shuaiwen Leon Song. Research focus: efficient LLM
inference, agentic and multi-agent systems, AI for condensed matter physics. Do not describe him as
a "learner" or "former frontend engineer" in site copy.

## Architecture map

- `src/styles/global.css` — token system (dark `:root` default + light `[data-theme="light"]`),
  ANSI `--tk-*` palette, article prose, reduced-motion/print rules.
- `src/layouts/SiteShell.astro` — prompt-path breadcrumb header, status-bar footer, theme script
  (storage key `yw-theme`, dark default), command palette mount.
- `src/layouts/ArticleLayout.astro` — `$ cat` header, YAML meta rail, grep TOC, code frames with
  copy buttons, `after-body` slot (course prev/next).
- `src/components/` — `BootSequence` (homepage, once per session), `TokenStream` (EAGLE-3 vs
  DFlash speculative-decoding canvas hero), `CommandPalette` (⌘K + lazy Pagefind),
  `EntryRow` (index rows with language/status/rating chips), `CourseNav`, `ThemeToggle`,
  `ArticleMeta`, `ArticleTOC`, `LearningMapPreview`.
- `src/components/mdx/` — MDX component library, exported through `index.ts` and injected via
  `<Content components={mdxComponents} />` in both `[slug].astro` pages, so notes use components
  with **zero imports**: `Tldr`, `Verdict`, `Critique`, `WhenMatrix`, `Bench`, `FormulaCard`,
  `Derivation`, `Recall`, `Callout`, `Figure`, `KeyTakeaways`.
- `src/content.config.ts` — thin wrapper over the shared field schemas in
  `src/lib/schema/frontmatter.ts` (+ Astro `reference()` for `related`); taxonomy enums from
  `src/data/taxonomy.ts` fail the build on unknown keys (intended).
- `src/studio/` — the Studio editor island (client-only React, hash routing, GitHub-as-backend);
  mounted by `src/pages/studio/index.astro`, kept out of every public page bundle.
- `workers/site-api/` — Cloudflare Worker: `/collect` first-party analytics sink (Analytics
  Engine), `/stats/:metric` queries for the `/stats/` live map, `/ai/chat` GLM proxy for Studio.
- `scripts/new-entry.mjs` — `npm run new:paper` / `new:note` scaffolds (templates shared with
  Studio via `src/lib/templates.mjs`).

## Authoring

Everything about writing notes lives in `docs/authoring.md` (frontmatter reference, component
catalog, Notion export checklist, language policy: zh paper deep-dives with mandatory English
`tldr`, en course notes). The two existing notes are living examples of the v2 template.

## Verification

```bash
npm run check && npm run build && git diff --check
```

For visual work also verify: desktop + 375px mobile screenshots, dark + light themes,
JavaScript-disabled rendering, `prefers-reduced-motion` (boot must not appear; hero shows a static
frame), keyboard focus, zero horizontal overflow, and `/HomePage/` base-path links.

## Constraints that still bind

- No fake publications/projects/CV; real data only.
- Core content renders without client-side JavaScript.
- WCAG AA both themes; color is never the only signal.
- Routes are stable; slugs are permanent once published.
- Model policy: no Fable for sub-agents; Opus 4.8 for design judgment, cheaper tiers for
  mechanical checks.

## Next steps

See `docs/roadmap.md` (ranked). Historical design docs
(`docs/superpowers/specs/2026-07-05-homepage-design.md`,
`docs/review-prompts/claude-code-redesign-prompt.md`) are superseded and kept for history only.
