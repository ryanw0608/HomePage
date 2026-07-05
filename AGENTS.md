# Repository Guidelines

## Project Structure & Module Organization

This repository is currently in the pre-implementation/specification stage.

- `docs/superpowers/specs/` contains the homepage design spec and review disposition notes.
- `docs/review-prompts/` contains prompts for external design/spec review.
- `AGENTS.md` is the canonical contributor and agent guide.
- `CLAUDE.md` is a thin Claude Code wrapper that points back here.

Primary design spec: `docs/superpowers/specs/2026-07-05-homepage-design.md`. The planned site is a personal academic homepage for Yongzhe Wang using Astro, React islands, TypeScript, MDX, Tailwind, and static-first deployment.

When implementation begins, follow the design spec’s planned Astro structure:

- `src/content/course-notes/*.mdx` for course notes.
- `src/content/paper-reading/*.mdx` for paper reading notes.
- `src/data/profile.ts`, `taxonomy.ts`, and `learning-map.ts` for typed site data.
- `src/components/` for Astro/React components.
- `public/` or Astro assets for static images and icons.

## Build, Test, and Development Commands

There is no `package.json` yet. After the Astro project is scaffolded, expected commands are:

- `npm install` installs dependencies.
- `npm run dev` starts the local development server.
- `npm run build` creates the production static output.
- `npm run preview` serves the built site locally.
- `npm run astro check` or `npm run check` runs Astro/TypeScript validation.

Until then, validate documentation changes with:

- `git diff --check` to catch whitespace errors.
- `rg` over docs and guidance files to catch unfinished markers before committing.

## Coding Style & Naming Conventions

Use TypeScript for site code and MDX for long-form notes. Prefer small, typed components with clear ownership: layouts own page structure, data files own profile/taxonomy content, and MDX owns article prose. Use ASCII kebab-case slugs for public URLs, even for Chinese-titled notes.

## Testing Guidelines

Before public launch, verify production build, Astro checks, internal links, Lighthouse, axe, JavaScript-disabled reading/index pages, Pagefind English and Chinese queries, and GitHub Pages base-path behavior.

## Commit & Pull Request Guidelines

Existing commits use concise imperative messages, for example `Address second design review feedback`. Keep commits focused and descriptive. PRs should include a summary, verification commands run, screenshots for visual changes, and links to the relevant spec section or issue.

## Agent-Specific Instructions

Do not use Fable for sub-agents or workflow fan-out in this project; it burns quota too fast. Prefer Opus 4.8 (`claude-opus-4-8`) or a cheaper tier such as Haiku for large mechanical review tasks. When launching agents or workflows, inherit a non-Fable main model or pass an explicit non-Fable model override. Keep multi-agent fan-outs small unless explicitly approved.
