# Repository Guidelines

## Current Project State

This repository contains a working Astro academic homepage for Yongzhe Wang (master's student in computer science at the University of Sydney, FutureMLS Lab). It builds, deploys to GitHub Pages, and has typed MDX content routes. The active visual direction is the user-chosen Terminal Luxe system described in the Frontend Quality Bar section below.

Canonical handoff for the next agent: `docs/handoff/claude-code-handoff.md`.

## Project Structure & Module Organization

- `src/pages/` contains Astro routes: home, about, 404, RSS, course notes, and paper reading.
- `src/content/course-notes/*.mdx` and `src/content/paper-reading/*.mdx` contain long-form authored content.
- `src/content.config.ts` defines Astro content collection schemas.
- `src/data/` stores profile, taxonomy, and learning-map data.
- `src/layouts/` owns page shells and article layout.
- `src/components/` owns reusable Astro components and MDX components.
- `src/styles/global.css` owns global tokens, typography, and responsive styling.
- `.github/workflows/ci.yml` runs checks/builds; `.github/workflows/deploy.yml` publishes `dist/` to Pages.
- `docs/` contains design specs, implementation plan history, deployment notes, handoff notes, and review prompts.

## Build, Test, and Development Commands

- `npm ci` installs locked dependencies.
- `npm run dev` starts local Astro development.
- `npm run check` runs Astro and TypeScript validation.
- `npm run build` runs `astro check`, builds static output, then runs Pagefind over `dist/`.
- `npm run preview` serves the built site locally.
- `git diff --check` catches whitespace and patch formatting errors before commit.

Use Node 24 for parity with GitHub Actions.

## Coding Style & Naming Conventions

Use TypeScript, Astro, and MDX. Keep route names and public slugs ASCII kebab-case. Content titles may be English, Chinese, or mixed, but URLs stay stable and ASCII. Prefer small components with clear ownership: layouts own structure, components own UI pieces, data files own typed site data, and MDX owns prose.

Do not add a generic UI kit. The visual system must be custom enough to signal serious engineering craft.

## Frontend Quality Bar

The active visual direction (user-chosen on 2026-07-06) is **Terminal Luxe**: a dark-first, all-monospace
"researcher's terminal" at Warp/Ghostty/Linear quality. JetBrains Mono, spring-green/amber accents on
near-black, ANSI-inspired token colors for chrome, homepage boot sequence, prompt-path breadcrumb,
status-bar footer, `⌘K` palette with Pagefind, speculative-decoding canvas hero.

What keeps it premium instead of gimmicky: no scanlines/CRT/glow, no ASCII banners, no per-character
typing outside the boot overlay, `$` prompts only where a command→output metaphor is truthful, warm-white
body text (green reserved for accents), a deliberate mono weight/size ladder, and untouched long-form
readability (68ch measure, KaTeX in its own faces, code frames with copy buttons).

Core content must render without JavaScript; all motion respects `prefers-reduced-motion` with static
final states; both themes pass WCAG AA.

## Testing Guidelines

Before reporting completion, run:

```bash
npm run check
npm run build
git diff --check
```

For visual work, also verify desktop and mobile screenshots, main routes under `/HomePage/`, keyboard focus states, reduced motion, and JavaScript-disabled readability for index and article pages.

## Deployment Notes

Production URL: `https://ryanw0608.github.io/HomePage/`.

Astro is configured as a GitHub Pages project site with `site: "https://ryanw0608.github.io"`, `base: "/HomePage/"`, and `trailingSlash: "always"`. Pages Source is GitHub Actions. The `github-pages` environment allows deployments from `master` and `homepage-foundation`.

## Commit & Pull Request Guidelines

Use concise imperative commits such as `Improve homepage visual design` or `Document Claude handoff`. Keep commits focused. PRs or handoffs should include summary, verification commands, screenshots for visual changes, and any remaining risks.

## Agent-Specific Instructions

Claude Code should read `CLAUDE.md` and `docs/handoff/claude-code-handoff.md` before changing files. Do not use Fable for sub-agents or large workflow fan-out in this project. Prefer Opus 4.8 or a cheaper non-Fable tier for mechanical review tasks. Keep sub-agent fan-out small unless the user explicitly approves a larger run.
