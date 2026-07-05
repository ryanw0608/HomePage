# Claude Code Handoff

Read this file first, then read:

1. `AGENTS.md`
2. `docs/handoff/claude-code-handoff.md`
3. `docs/superpowers/specs/2026-07-05-homepage-design.md`
4. `docs/deployment.md`

## Current Mandate

The project is already implemented and deployed, but the user rejected the frontend quality. Do not treat the current visual design as acceptable. Treat the existing code as a functional Astro foundation that needs a serious frontend redesign.

Primary goal for the next Claude Code session:

- Preserve the stable content model, routes, MDX authoring workflow, CI, and GitHub Pages deployment.
- Rework the visual system, homepage, index pages, and article pages until the site credibly reflects a former frontend engineer.
- Keep the site academic, content-first, and static-first.

## Non-Negotiables

- Do not add fake Publications, Projects, CV, or research-output sections.
- Do not turn the site into a terminal gimmick or generic command-center dashboard.
- Do not use a generic UI kit.
- Do not break `/HomePage/` base-path deployment.
- Do not rely on client-side JavaScript for core content.
- Do not hide weak content behind decorative graphics.

## Current Production State

Production URL:

```txt
https://ryanw0608.github.io/HomePage/
```

The latest deployment succeeded after enabling GitHub Pages Source = GitHub Actions and allowing `master` in the `github-pages` environment branch rules.

## Suggested First Action

Open `docs/review-prompts/claude-code-redesign-prompt.md` and use it as the starting prompt for the next session. It is written to make Claude audit the current frontend, propose a better direction, implement, and verify.

## Model Policy

Do not use Fable for sub-agents or Workflow sub-agents. Prefer Opus 4.8 (`claude-opus-4-8`) for design/frontend judgment and a cheaper non-Fable tier for mechanical checks.
