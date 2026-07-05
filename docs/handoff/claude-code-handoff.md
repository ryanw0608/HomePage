# Claude Code Handoff

## Executive Summary

This repository is a working Astro 7 personal academic homepage for Yongzhe Wang. It has typed MDX content collections, static routes, RSS, sitemap, CI, and GitHub Pages deployment. The production site is live at:

```txt
https://ryanw0608.github.io/HomePage/
```

The current frontend is not accepted by the user. The next agent should not polish it incrementally. Treat the existing implementation as a stable functional foundation and rebuild the visual system and page experience to meet a much higher frontend bar.

## User Intent

The user wants a personal academic homepage that presents:

- Basic academic identity.
- Course learning notes.
- Paper reading notes.
- Future growth paths for real publications, projects, CV, and research output.

The user previously worked as a frontend engineer, so visual quality is part of credibility. A plain academic template, placeholder dashboard, or generic card grid is not acceptable.

## Current Implementation Status

Working:

- Astro project structure.
- TypeScript and Astro checks.
- MDX content collections.
- Course note list and detail routes.
- Paper reading list and detail routes.
- About page.
- 404 page.
- RSS route.
- Sitemap integration.
- Pagefind build step.
- GitHub Actions CI.
- GitHub Pages deploy workflow.
- Production deployment under `/HomePage/`.

Rejected or insufficient:

- Overall frontend taste.
- Homepage visual hierarchy.
- Article page polish.
- Index-page density and filtering experience.
- Typography and spacing sophistication.
- Motion and interaction quality.
- Visual distinctiveness as a former frontend engineer's site.

## Important Files

- `astro.config.mjs`: GitHub Pages project-site config.
- `package.json`: scripts and dependencies.
- `src/styles/global.css`: current global visual system. Likely needs major rewrite.
- `src/layouts/SiteShell.astro`: HTML shell, nav, SEO defaults, theme bootstrapping.
- `src/layouts/ArticleLayout.astro`: shared long-form article frame.
- `src/pages/index.astro`: homepage. Needs major redesign.
- `src/pages/course-notes/index.astro`: course note index.
- `src/pages/paper-reading/index.astro`: paper reading index.
- `src/components/NoteCard.astro`: repeated content card. Likely needs redesign.
- `src/components/ArticleTOC.astro`: table of contents.
- `src/components/ArticleMeta.astro`: metadata panel.
- `src/components/LearningMapPreview.astro`: lightweight topic preview.
- `src/content.config.ts`: content schemas.
- `src/content/course-notes/*.mdx`: course notes.
- `src/content/paper-reading/*.mdx`: paper readings.
- `docs/superpowers/specs/2026-07-05-homepage-design.md`: original design spec.
- `docs/deployment.md`: deployment state and Pages settings.

## Routes To Preserve

Public routes:

- `/HomePage/`
- `/HomePage/course-notes/`
- `/HomePage/course-notes/[slug]/`
- `/HomePage/paper-reading/`
- `/HomePage/paper-reading/[slug]/`
- `/HomePage/about/`
- `/HomePage/rss.xml`
- `/HomePage/sitemap-index.xml`
- `/HomePage/404.html`

Do not rename routes unless the user explicitly approves redirects and migration.

## Design Direction For The Redesign

Target: a refined academic knowledge product with visible frontend craft.

The site should feel:

- Academic and serious.
- Editorial, technical, and content-first.
- Custom, not template-derived.
- Calm enough for long reading.
- Visually sharp enough that frontend experience is credible.

Avoid:

- Fake terminal or command-center gimmicks.
- Heavy SaaS gradients.
- One-note dark blue or purple palettes.
- Decorative 3D/WebGL unless it has a clear purpose and passes performance checks.
- Generic cards floating inside bigger cards.
- Empty future sections.
- Fake publication/project density.

## Suggested Redesign Priorities

1. Build a stronger token system in `src/styles/global.css`: color, spacing, type scale, borders, focus rings, surfaces, code, article prose, and light/dark themes.
2. Redesign `SiteShell` navigation and footer so they feel deliberate under `/HomePage/`.
3. Redesign `index.astro` around academic identity, current focus, writing preview, and learning map preview without pretending there is more content than exists.
4. Redesign article pages first-class: title block, metadata rail, sticky TOC, mobile TOC, callouts, code, tables, math, figures, footnotes, print.
5. Redesign note cards and index pages for dense scanning, not marketing cards.
6. Add only justified interaction: theme polish, TOC scroll behavior, copy-code affordance, subtle view transitions, reduced-motion compliance.

## Content Constraints

Current seed content is intentionally small:

- One course note: `ml-foundations-gradient-descent`.
- One paper reading: `attention-is-all-you-need`.

Do not create fake publications, fake projects, or fake research achievements. If more visual density is needed, use richer presentation of real notes and real metadata, not invented content.

## Technical Constraints

- Keep Astro static-first.
- Keep core content readable without client-side JavaScript.
- React is available but should only be used for justified islands.
- Keep `/HomePage/` base-path compatibility.
- Preserve content collection schema unless a schema change clearly improves authoring or rendering.
- Prefer custom CSS/Tailwind-compatible token work over a generic UI kit.
- Use stable dependencies and avoid unnecessary framework churn.

## Verification Commands

Run before reporting completion:

```bash
npm run check
npm run build
git diff --check
```

For frontend redesign, also verify:

- Desktop homepage screenshot.
- Mobile homepage screenshot around 375px width.
- Desktop and mobile article page screenshots.
- No horizontal overflow.
- Keyboard focus visibility.
- Reduced-motion behavior.
- Light and dark theme contrast.
- Production base path links under `/HomePage/`.

## GitHub Pages State

Pages Source is set to GitHub Actions. The `github-pages` environment permits both `master` and `homepage-foundation`.

Last known successful deploy run:

```txt
https://github.com/ryanw0608/HomePage/actions/runs/28750281896
```

If deploy fails with an environment protection message, re-check Settings -> Environments -> `github-pages`.

## Recommended Claude Code Starting Prompt

Use the prompt in:

```txt
docs/review-prompts/claude-code-redesign-prompt.md
```

It is intentionally direct: audit current frontend, propose a concrete redesign, implement, and verify with screenshots and build checks.

## Handoff Risk Notes

- The old implementation plan has unchecked boxes even though the foundation was implemented. Treat it as historical, not as the active task list.
- The original spec describes an ideal v1; the current code is only a foundation plus a rejected visual pass.
- The user cares more about frontend credibility than fast cosmetic changes.
- A redesign that merely changes colors, shadows, and gradients will not solve the stated problem.
