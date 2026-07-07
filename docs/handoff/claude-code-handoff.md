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

**Done since:** P1b (live preview + properties panel + pre-commit diff), **P3.0** (BlockNote
shell + raw/blocks toggle + vitest in CI), **P3.1** (converter spine), and **P3.2a** (real
Notion blocks) are all shipped.

### CURRENT STATE — pick up here (2026-07-08, four commits landed locally, NOT pushed)

This session (2026-07-08) shipped four verified commits on `master` (local only — **not yet
pushed**, hold for owner's go-ahead since push = GitHub Pages deploy):

1. **Edit-in-place WYSIWYG leaf blocks** (`4996beb`): the 7 leaf components (Critique,
   WhenMatrix, KeyTakeaways, Recall, Figure, FormulaCard, Derivation) render their REAL markup
   with the text itself editable in place — click the rendered line and type, Enter adds an item,
   Backspace on empty removes it (no forms, no markdown). New primitives in
   `blocks/EditableField.tsx` (`AutoInput` single-line, `AutoArea` wrapping/auto-grow with
   Enter/Backspace/autofocus). `RawMdx` source box auto-grows (no fixed-height scroll). Converter
   hardened (`serialize.ts` `jsxAttr` forces JSON-escaped expression form on control chars so soft
   newlines survive; a stray raw NUL byte removed). +2 golden tests (34 total). Adversarial
   converter review run: **no corruption** across 89 cases.
2. **Custom formatting toolbar + block side menu** (`blocks/Toolbar.tsx`, `blocks/SideMenu.tsx`,
   `blocks/noteUrl.ts`): selection bubble has a "turn into" select (Text/H1-3/lists/quote/code,
   hidden for custom cards), text styles, inline-math button, inline text/bg colour (inline =
   text-only, fixes the whole-row-background complaint), link. Drag-handle "⋮⋮" menu: Copy link
   (public URL + #heading anchor), Duplicate, Convert to, Delete. NOTE: BlockNote 0.51 does NOT
   pass the hovered block to a custom side menu (sideMenu fn gets `{}`, dragHandleMenu gets
   `{children}`) — the block is tracked from the DOM (`.bn-block-outer[data-id]`) and resolved via
   `editor.getBlock()`.
3. **Collapsible sidebar folders + note context menu** (`App.tsx`, `lib/github.ts` `deleteFile`,
   `studio.css`): file-explorer-style tree — collapsible collections (chevron + count, persisted),
   right-click / hover-"⋯" context menu (Open / Copy link / Duplicate / Rename… / Delete…), with a
   rename slug dialog and a delete confirm. `NoteRow` now carries the blob sha.
4. **Drag-handle alignment** (`3add2a5`): +/⋮⋮ top-align to the block's first line (was centred).

All verified in-browser via puppeteer with a mocked GitHub API (edit-in-place typing, Enter/
Backspace, toolbar contents, all four side-menu actions firing the right PUT/DELETE, sidebar
collapse + context menu + duplicate/delete API calls). `npm run check` 0 errors, 34 tests, build green.

**Deferred, needs an owner decision:** cross-collection drag-to-reparent and arbitrary
sub-folders in the sidebar. The content model is flat — two fixed collection roots
(course-notes, paper-reading) with *different* frontmatter schemas — so "reparenting" a note
means a schema transformation, and sub-folders would break Astro's collection layout. Ask the
owner whether they want (a) just move-between-the-two-collections (with frontmatter migration),
(b) a virtual grouping layer (by area/tag/status) that doesn't touch the file layout, or (c)
leave it flat.

Both editing surfaces are live at `/studio/` and in good shape:

- **Raw mode**: draggable source|preview split (`SplitPane`) + synced scroll; the preview
  renders the REAL 11 MDX components (browser ports in `src/studio/preview/`), not placeholders,
  hardened against XSS (control-char URL scrub) + render crashes.
- **Block mode (P3.2a/P3.2b/P3.3)**: the note parses into real, editable BlockNote blocks via
  the byte-exact converter in `src/studio/convert/` (parse→segments with source-slice
  provenance; unchanged block = verbatim slice → byte-identical; edited block = minimal
  house-style diff; self-check + whole-doc rawMdx fallback). NOW real blocks:
  heading 1–6 (+ toggle headings), paragraph, quote, code, **simple lists** (per-item,
  P3.2b), inline `$…$` math, and the components **Tldr, Callout** (inline-editable prose)
  + **Critique, WhenMatrix, KeyTakeaways, Recall** (mdxLeaf: render-first + hover "edit
  fields" form; P3.3). Still render-first rawMdx cards: **Bench, Derivation, FormulaCard,
  Figure** + tables + display `$$` math + nested/loose lists. Curated slash menu
  (`blocks/slashMenu.tsx`) has a Blocks group + a Components group. Golden + edit-safety tests
  green (`convert/__tests__/`, 28 tests); each block reviewed adversarially, findings fixed.

Two adversarial reviews (component preview, converter) were run; all confirmed findings fixed
with regression tests. Converter is the highest-risk code — keep every `convert/__tests__` green.

### NEXT — remaining owner feedback (updated 2026-07-08), in priority order

1. **DONE 2026-07-08**: all 7 leaf components (Critique/WhenMatrix/KeyTakeaways/Recall/Figure/
   FormulaCard/Derivation) are now edit-in-place, plus Tldr/Callout. Custom formatting toolbar,
   block side menu, collapsible sidebar + context menu, handle alignment — all shipped (see
   CURRENT STATE). Figure edit-in-place exists but **image resize/align/caption-as-you-see-it**
   (drag handles on the image) is still TODO.
2. **Bench** is still a render-first rawMdx card — make it a real editable spreadsheet block
   (columns + "better" toggles, rows with aligned cells + baseline, number-vs-string preserved).
   Only leaf component not yet edit-in-place.
3. **P3.2b-rest**: GFM tables + display `$$` math as real editable blocks (simple lists done;
   display math renders read-only in a rawMdx card).
4. **Sidebar reparent decision** (see CURRENT STATE "Deferred") — owner must pick the model.
5. **Export** MD / PDF / HTML; **minimap** + **git-gutter** change markers (vs committed version).
6. **Raw-mode slash**: `/` in the raw textarea inserts an MDX SOURCE snippet (not a block).
7. **Colour/polish pass**: owner finds the palette "not high-end enough"; deliberate Terminal-Luxe
   refinement of editor chrome + `.article-body`.
8. Then the independent tracks (page actions/export/find, links/hover-preview, data views, git
   history, AI assist) per the master roadmap below.

---

## MASTER ROADMAP (consolidated 2026-07-07 — supersedes earlier scattered lists)

Every accumulated owner request is folded in and de-duplicated below. Design basis: the P3
design panel (SpanLock byte-identity spine + all-components ambition; spec in the wf_5faafd47
journal) + the Docmost/AFFiNE enrichment pass. Owner chose the fuller Notion-parity set.
Sequencing rule: **the block-editor converter is the backbone — most block/inline features
depend on it, so Track A comes first**; independent tracks (page actions, links, AI, polish)
follow. Every custom block ships schema + MDX (de)serializer + view + golden test or it doesn't
merge (block-registration discipline).

### Track A — Block editor + lossless MDX converter (the backbone)

- **P3.1 ✅** converter spine, verbatim-fence frontmatter, rawMdx escape hatch, golden tests.
- **P3.2 native markdown + tables + math** — paragraph; **headings H1–H6** (fixes "need H4",
  `####`+ round-trip); lists (+regrouping); **blockquote (引用)**; code block; divider; image;
  **GFM tables** with in-cell **bold/italic/inline-code + inline math**, **row/column select +
  batch ops**, and a polished table UI; inline marks; **inline `$…$` + display `$$…$$` math**
  incl. **select-text→convert-to-math**. Math = KaTeX (site standard; see LaTeX note below).
- **P3.3 containers + math editing + links** — Tldr, Callout, **toggle / collapsible blocks
  (折叠标题)**, DisplayMath/InlineMath cards (TexField + KaTeX preview, IME-safe); **link to
  page / `@`-note-link** autocomplete against notes.json (serializes to a plain relative link).
- **P3.4 leaf components I + rich blocks** — Critique, WhenMatrix, KeyTakeaways(bound+literal),
  Recall; jsxAttrs literal evaluator + printer + acorn net + `frontmatter.<field>` binding;
  Verdict read-only strip in the panel; **Tabs block (选项卡, clickable)**; **Mermaid** fenced
  block (lazy dual render). New MDX components (`<Tabs>`, `<Toggle>` if needed) get schema+test.
- **P3.5 leaf components II** — Derivation, FormulaCard, **Figure (image resize + left/center/
  right align + caption)**, Bench (spreadsheet). Images: `loading="lazy"`, intrinsic sizing.
- **P3.6 hardening + GA** — full golden suite, invariant guards, whole-doc fallback banner,
  curated **fuzzy slash menu** (title/desc/searchTerms/icon; only round-trippable blocks;
  Verdict excluded), flip block mode to default. Raw mode stays as the always-available hatch.

### Track A′ — Raw (source) editor polish

- **✅ draggable source|preview split + synced scroll** (SplitPane, proportional sync).
- **Minimap** beside the scrollbar (VSCode-style scaled overview of the long note) for
  fast navigation of long notes.
- **Git-style change gutter**: added / modified / deleted line markers vs the last committed
  version (compute a line diff against `remote.text`, render a thin gutter beside the source).
- Later: line-accurate (not just proportional) scroll sync if the proportional feel isn't
  precise enough for dense notes.

### Track B — Page actions (mostly independent of the converter)

- **Read-only ↔ edit toggle** per open note.
- **Copy page content**, **duplicate page** (new slug via contents API), **copy link** to the
  note; **copy link to a selection/block** (anchor id) that renders a preview when pasted.
- **Find in page (⌘F)** — in-editor ProseMirror find/replace + a raw-mode text find.
- **Export**: **Markdown** (source), **HTML** (self-contained, inlined CSS), **PDF** (print
  stylesheet). Clean, correct, client-only.
- **TOC / outline (目录)** panel from headings (editor + article pages already have a TOC rail).

### Track C — Links & hover previews

- **Hover a note-link → preview card (peek)** — both in the editor and on public article pages
  (build-time excerpt index; JS-enhancement only on public pages).
- Copy-link-to-block feeds this (paste a block link → inline preview).

### Track D — Data views & navigation (former "P2")

- All-notes **Table** + paper **Kanban** + **Gallery** card view over the collections (views
  over the MDX folder + frontmatter, edits commit via contents API — no DB).
- **Template picker** in `+new`; **unified ⌘K** (Pagefind search + jump-to-note + new-from-
  template + deferred Ask-AI entry).

### Track E — History (former "P4")

- In-editor **diff + one-click Restore** over git; **backlinks panel** (build-time link index).

### Track F — AI assist (former "P5"; needs the site-api `/ai/chat` GLM proxy live)

- Selection toolbar + `/ai`: **explain**, **translate (default → Simplified Chinese)**, polish,
  continue, summarize, generate tldr, expand-to-skeleton. Careful prompts ("faithful to the
  note, don't fabricate; translate to zh-CN unless told otherwise"), streamed as an
  **accept/reject suggestion diff** — never a silent rewrite.

### Track G — Annotations

- Single-user anchored **annotations/notes-to-self** (round-trip to an HTML comment or a
  sidecar), non-blocking. Lower priority.

### Cross-cutting

- **Performance NFR**: lazy images (`loading="lazy"` + intrinsic size), lazy embed/mermaid
  render (IntersectionObserver), debounced converter/preview, block virtualization for very
  long notes. Public pages stay JS-light.
- **Aesthetic polish (P-Polish)**: dedicated typography/rhythm/detail pass on `.article-body`
  (fixes the cramped author meta-rail wrap etc.); lifts both the public pages and the editor
  since they share the stylesheet. Deferred by owner behind the editor build.

### LaTeX note (decision when P3.2 math lands)

Site standard is **KaTeX** (fast, already wired, covers essentially all common math). Owner
wants "comprehensive LaTeX, correct + beautiful". KaTeX covers the vast majority; a few exotic
LaTeX packages/macros it doesn't support would need **MathJax** (more complete, heavier, slower).
Recommendation: stay on KaTeX, add any missing macros via KaTeX's `macros` option, and only
revisit MathJax if a real note hits a genuine KaTeX gap. Flag at P3.2.

### Rejected for good (architecture conflict — do not revisit)

Realtime multi-user collab (Yjs/CRDT sync server), server-side full-text/attachment search,
semantic-RAG AI Q&A, comment threads + notifications, RBAC/roles/approval, share links with
per-link perms/expiry, edgeless canvas/whiteboard, Excalidraw/Draw.io embedded-scene nodes,
Postgres/Redis/BullMQ, persistent DB "Bases", generic UI kits, paid version-retention tiers.
All need a server/DB the static+git+single-user model lacks; value re-expressed statically
(commits = versions, build-time indexes = search/backlinks, visibility frontmatter = access).

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
