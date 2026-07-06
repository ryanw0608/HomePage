# Claude Code Handoff

Current as of 2026-07-06 (post Terminal Luxe redesign + content system v2).

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
- `src/content.config.ts` — strict zod schemas; taxonomy enums from `src/data/taxonomy.ts` fail the
  build on unknown keys (intended).
- `scripts/new-entry.mjs` — `npm run new:paper` / `new:note` scaffolds.

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
