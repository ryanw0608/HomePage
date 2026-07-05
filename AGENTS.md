# Repository Guidelines

## Current Project State

This repository contains a working Astro academic homepage for Yongzhe Wang. It builds, deploys to GitHub Pages, and has typed MDX content routes. The current frontend is functional but explicitly not accepted as the final visual direction. Treat it as an implementation foundation, not as a design baseline.

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

Do not add a generic UI kit. The visual system must be custom enough to support the user's frontend-background credibility.

## Frontend Quality Bar

The next frontend pass should be a redesign, not small cosmetic edits. The site must feel like a refined academic knowledge product with strong long-form reading pages. Avoid generic academic templates, fake publication sections, empty dashboard chrome, terminal gimmicks, one-note palettes, and decorative effects that do not improve comprehension.

Prioritize typography, spatial rhythm, article metadata, table of contents, code/table overflow, dark/light theme quality, mobile reading, and subtle purposeful motion.

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
