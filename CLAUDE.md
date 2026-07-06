# Claude Code Handoff

Read this file first, then read:

1. `AGENTS.md`
2. `docs/handoff/claude-code-handoff.md`
3. `docs/authoring.md` (content workflow — most day-to-day work starts here)
4. `docs/deployment.md`

## Current Mandate

On 2026-07-06 the user explicitly chose a **Terminal Luxe** visual direction (overriding the earlier
anti-terminal guidance in older docs): dark-first, all-monospace (JetBrains Mono), boot sequence on the
homepage, prompt-path breadcrumb, status-bar footer, `⌘K` command palette with Pagefind search, and a
speculative-decoding token-stream hero. Quality bar is Warp/Ghostty/Linear-grade modern terminal — sharp
and matte, no CRT/scanline/glow kitsch, no typewriter-everything, `$` prompts only where a real
command→output metaphor holds (homepage sections, `ls` indexes, code frames, 404).

Preserve:

- The stable content model, routes, MDX authoring workflow, CI, and GitHub Pages deployment.
- Long-form article readability (mono 1rem/1.75, 68ch measure; KaTeX keeps its own faces).
- Research focus data in `src/data/profile.ts` (efficient LLM inference, agentic systems, AI for
  condensed matter physics) — user-provided, keep truthful.

## Non-Negotiables

- Do not add fake Publications, Projects, CV, or research-output sections.
- Do not degrade the terminal aesthetic into CRT cosplay (scanlines, glow, ASCII banners, green-on-black
  body text, per-character typing everywhere).
- Do not use a generic UI kit.
- Do not break `/HomePage/` base-path deployment.
- Do not rely on client-side JavaScript for core content (boot/hero/palette are enhancements only).
- Do not hide weak content behind decorative graphics.
- Keep WCAG AA contrast and `prefers-reduced-motion` compliance (static final states, not sped-up motion).

## Current Production State

Production URL:

```txt
https://ryanw0608.github.io/HomePage/
```

The latest deployment succeeded after enabling GitHub Pages Source = GitHub Actions and allowing `master` in the `github-pages` environment branch rules.

## Suggested First Action

**Active project: Studio (Notion-grade editor at `/studio/`).** P0 + P1a are live; the "Where
work paused" section of `docs/handoff/claude-code-handoff.md` says exactly what is done, what
is next (P1b: live preview, diff review, properties panel), and which owner-side setup steps
are still pending. For content sessions instead, open `docs/authoring.md`.

## Authoring & Automation Surfaces

- Web editor: **Studio** at `/studio/` (Notion-grade block editor, in progress; plan in
  `~/.claude/plans/bright-bouncing-aurora.md`). Sveltia `/admin` retired 2026-07-07 (P0) —
  shared schemas now live in `src/lib/schema/frontmatter.ts`, templates in
  `src/lib/templates.mjs`, note index endpoint at `/studio/notes.json`.
- Site agent: `agent` job in `.github/workflows/ci.yml` + `scripts/agent/` — GLM (Zhipu API) refreshes
  `src/data/overview.json` daily and writes `/digest/` weekly, always via reviewed PRs, always
  derived from committed notes only. Requires `ZHIPU_API_KEY` Actions secret.
- Analytics: fully first-party + live visitor world map at `/stats/` (terminal dot-matrix,
  real-time online count). An inline beacon in `SiteShell.astro` (gated on `site.siteApi`) posts
  to the `site-api` Cloudflare Worker (`workers/site-api/`), which stores events in Cloudflare
  Analytics Engine and serves the map's queries; the same Worker hosts the Studio AI proxy.
  No cookies; daily-salted visitor hash. Owner setup: `docs/admin-setup.md` Part B.

## Content System Rules

- MDX components are injected globally via `src/components/mdx/index.ts` — notes never import them.
- Taxonomy keys (`src/data/taxonomy.ts`) are strict enums; register new tags/areas/courses there
  first or the build fails (intended).
- Frontmatter schemas are shared: edit `src/lib/schema/frontmatter.ts` (consumed by
  content.config.ts and Studio) — never fork field definitions.
- Visibility: `draft: true` = WIP never built; `visibility: unlisted` = URL-only (excluded from
  indexes/RSS/Pagefind/robots); `visibility: private` = never built. Agent summarizes public only.
- Language policy: paper deep-dives zh with a mandatory English `tldr`; course notes en.
- Paper verdict fields (`rating`/`recommendation`/`reproducible`) live in frontmatter and render
  automatically — never hand-write a `<Verdict>` in a paper note.
- Scaffold new notes with `npm run new:paper` / `npm run new:note`.

## Model Policy

Do not use Fable for sub-agents or Workflow sub-agents. Prefer Opus 4.8 (`claude-opus-4-8`) for design/frontend judgment and a cheaper non-Fable tier for mechanical checks.
