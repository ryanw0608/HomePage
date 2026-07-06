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

**Next up (P1b, then P2+):** markdown live preview styled like `.article-body`; pre-commit
diff review; properties panel (frontmatter form validated by the shared zod schema);
then P2 database views (table/kanban) + ⌘K, P3 BlockNote block editor + MDX⇄block converter
(golden round-trip tests in ci.yml), P4 version history UI + Pagefind, P5 AI assist via the
site-api Worker `/ai/chat` (already deployed code-side; Notion-style Space-to-summon).

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
