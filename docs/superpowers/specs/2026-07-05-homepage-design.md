# Personal Academic Homepage Design

## 2026-07-06 Implementation Handoff Addendum

The first Astro foundation has been implemented and deployed to GitHub Pages, but the current frontend has been rejected by the user. Future implementers should treat the codebase as a working functional foundation, not as an accepted visual design.

Preserve the stable parts:

- Astro 7 static-first architecture.
- Typed MDX content collections.
- Course note and paper reading routes.
- RSS, sitemap, CI, and GitHub Pages deployment.
- `/HomePage/` project-site base path.

Redo the weak parts:

- Homepage visual hierarchy and first-viewport impact.
- Article reading design.
- Index-page scanning density.
- Typography, spacing, palette, and motion system.
- Component-level polish for metadata, TOC, note cards, code, tables, and callouts.

Next handoff document:

- `docs/handoff/claude-code-handoff.md`

## Goal

Build a long-lived personal academic homepage for **Yongzhe Wang / Wang Yongzhe**. The site is primarily for academic presentation, course learning notes, and paper reading notes. Because the owner previously worked as a frontend engineer, the site must also demonstrate visible frontend craft in typography, layout, motion, accessibility, and article detail.

The site must not feel like:

- A generic academic template.
- A fake publication-heavy senior researcher homepage.
- A thin placeholder shell.
- A terminal gimmick.
- A decorative portfolio that hides weak content.

The guiding phrase for v1 is:

> A refined academic knowledge base with visible frontend craft.

## Audience And Success Criteria

Primary audiences:

- Academic readers: potential supervisors, research collaborators, lab peers, and classmates.
- Technical readers: people who may judge whether the previous frontend background is credible.
- Future self: the site should remain easy to update after courses, papers, and research output grow.

Success criteria:

- A visitor can understand who Yongzhe is, what he is learning, and what direction he is moving toward within 30 seconds.
- A visitor who opens a course note or paper reading sees a serious long-form page, not a thin placeholder.
- The frontend quality feels deliberate in typography, layout, motion, responsiveness, and article details.
- Adding a new note requires writing one MDX file plus metadata, not touching layout code.
- The site can evolve for years without a framework rewrite.

Non-goals:

- Do not publish a `Publications` page before there are real publications.
- Do not build a backend, CMS, comments system, database, or graph database in v1.
- Do not over-customize each article page so much that long-term maintenance becomes painful.
- Do not rely on client-side JavaScript for core reading/navigation content.

## Reference Observations

Reference site: `https://www.zhongzhuzhou.org/`.

Useful patterns to borrow:

- The homepage has dense but scan-friendly academic identity, research interests, links, news, and project/publication previews.
- The blog index groups posts by year/date and shows language labels, tags, and summaries.
- Individual paper-reading pages are long technical documents with metadata, a short answer, prerequisites, problem framing, method explanation, evaluation, comparison, limitations, critique, improvement ideas, and conclusion.
- Long articles include an on-page outline.

What not to copy directly:

- The exact visual style.
- The level of publication/project density, because v1 does not yet have that content.
- Any future section that would make this site look artificially inflated.

## Design Direction

The site should feel like a premium academic knowledge product:

- Clean but distinctive.
- Editorial and technical, not marketing-like.
- Content-first, with interactions that improve navigation or comprehension.
- Modern enough to show frontend taste, but stable enough to live for years.

The earlier "command center" idea is downgraded to an optional micro-interaction:

- A compact command palette may provide fast navigation later.
- Keyboard shortcuts may open search or jump between sections later.
- A subtle status strip is not part of v1 unless it has real data and a clear purpose.

It must not dominate the site identity.

## Site Language And Identity

Interface language:

- Use English for global navigation, filters, labels, metadata, and empty states in v1.
- Individual notes may be `zh`, `en`, or `mixed`.
- Note pages must set the page-level `<html lang>` from frontmatter, not only an article-level attribute.
- `mixed` is a content classification, not a valid HTML language tag. Mixed-language notes must also declare `primaryLanguage: 'zh' | 'en'`.
- Language mapping for HTML and search: `zh -> zh-CN`, `en -> en`, `mixed -> primaryLanguage`.
- Non-article pages default to `<html lang="en">`.
- Pagefind indexing must use the same page-level language value so Chinese notes are not indexed as English pages.

Name display:

- Primary display name: `Yongzhe Wang`.
- Secondary display name: `Wang Yongzhe`.
- Do not invent Chinese characters. Add Chinese characters only after the owner supplies the exact form.

Dates:

- Use ISO dates in metadata and URLs where dates appear.
- Display dates consistently as `YYYY-MM-DD`.

## Visual System

The visual system is a foundation task, not a final polish task.

Required design artifacts before page implementation:

- Tailwind theme tokens for background, foreground, muted text, accent colors, borders, surfaces, spacing, shadows, radius, and focus rings.
- Typography scale for hero, section headings, article headings, body text, metadata, captions, and code.
- One article style sample that includes headings, paragraphs, tables, code, math, callouts, figures, footnotes, and references.
- One homepage style sample that shows the identity hero, note cards, and current focus modules.

Palette:

- Use a restrained base palette with two accent families.
- Avoid one-note palettes dominated by dark blue, purple, beige, brown, or orange.
- Avoid the overused dark-blue/purple SaaS gradient look.
- Use color to communicate structure, not random decoration.

Theme:

- Build a token-driven light/dark theme.
- Default theme follows `prefers-color-scheme`.
- Provide a visible theme toggle.
- Use a tiny pre-hydration inline script to avoid first-frame theme flash.
- Shiki/code highlighting must support both themes.
- Both themes must pass WCAG contrast requirements.

Technical motifs:

- Thin rules, grid hints, coordinate labels, status chips, and data-like dividers are allowed.
- Decorative technical motifs must support structure or orientation.
- Avoid continuous visual noise near article bodies.

## Typography And Font Loading

Typography is a core frontend credibility signal.

Font strategy:

- Use system CJK fonts in v1 unless a subset pipeline is added.
- Do not ship a full Chinese webfont.
- If webfonts are used for Latin display/body text, self-host WOFF2 files, preload only what is needed, and use `font-display: swap`.
- Use a dedicated monospace stack for code.

Recommended font stacks:

- Display/body Latin: `Inter`, `ui-sans-serif`, `system-ui`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `sans-serif`.
- CJK fallback: `PingFang SC`, `Microsoft YaHei`, `Noto Sans CJK SC`, `Source Han Sans SC`, `sans-serif`.
- Monospace: `JetBrains Mono`, `SFMono-Regular`, `Consolas`, `Liberation Mono`, `monospace`.

Reading constraints:

- English article line length: roughly 65-85 characters.
- Chinese article line length: roughly 36-44 Chinese characters.
- English body line height: about 1.6.
- Chinese/mixed body line height: at least 1.8.
- Long tokens, URLs, code identifiers, and equations must not break mobile layout.
- Use `overflow-wrap` and controlled horizontal scroll containers where needed.

## Motion System

Motion should prove craft without hurting reading.

Requirements:

- Use native cross-document CSS view transitions only as progressive enhancement.
- Do not use Astro `ClientRouter` in v1. If a future version introduces client-side routing, vanilla scripts must become re-entrant on Astro navigation events before that change ships.
- Use hover and focus states that make controls feel precise.
- Use subtle reveal animation for homepage sections.
- Disable or simplify motion with `prefers-reduced-motion`.
- Avoid continuous motion near article bodies.
- Avoid WebGL/3D/canvas hero effects in v1 unless performance targets are still met.

## Information Architecture

### Home

The home page is a polished academic profile and content gateway.

Section order:

1. Identity hero: name, academic profile, current direction, previous frontend background, key links.
2. Current focus: 3-5 areas with short explanations and optional related note counts.
3. Featured writing: latest or pinned course notes and paper readings with real summaries.
4. Learning map preview: structured topic relationship preview, not a full graph unless enough content exists.
5. About snapshot: education, skills, frontend background, contact.

The hero should be impressive through layout, typography, and interaction quality, not through a huge empty graphic.

Low-content rule:

- If there are fewer than five public notes, hide complex filters on the homepage and show "Latest writing" rather than pretending there is a large archive.
- Current-focus data lives in `src/data/profile.ts`.
- Only show a related-note count for a focus item when it has at least two related public notes. Otherwise show the focus description without a count.
- Current-focus related-note counts may derive from paper `area`, course-note `areas`, tags, and explicit related references.

### Course Notes

Course notes are a first-class content type.

Index page requirements:

- List notes by reverse chronological order, grouped by course when useful.
- Show title, course, term, date, tags, status, summary, and reading time.
- Provide filters only when there is enough content to make filtering meaningful.
- Filter state should be reflected in URL query parameters.
- Support both Chinese and English titles.

Layout-injected article requirements:

- Title, course, term, date, updated date, tags, status, summary.
- Sticky desktop table of contents.
- Collapsible mobile table of contents.
- Metadata panel.
- Back to index link.
- Next/previous navigation within the course.

Recommended author-written sections:

- Concepts section.
- Detailed notes section.
- Examples or worked problems where relevant.
- Code snippets, diagrams, tables, equations, and references where needed.
- Personal reflection / "what I still do not understand" section.

Recommended course note body structure:

```mdx
## Overview

## Key Concepts

## Detailed Notes

## Worked Examples

## Code / Derivations

## Mistakes And Confusions

## Summary

## References
```

The structure is recommended, not mandatory. The article layout must still look coherent when a note skips sections.

### Paper Reading

Paper reading is a first-class content type.

Index page requirements:

- List readings by reverse chronological order, grouped by year.
- Show paper title, authors, year, venue/status, review date, tags, status, and summary.
- Support filters for area, method, model/system, language, and reading status when enough content exists.
- Filter state should be reflected in URL query parameters.
- Support bilingual entries when useful.

Layout-injected article requirements:

- Paper title, authors, year, venue/status.
- DOI and arXiv ID when available.
- Paper link, code link, and project link when available.
- Review date, updated date, and review language.
- Structured takeaways when frontmatter provides them.
- Sticky/collapsible table of contents.
- Metadata panel.
- Back to index link.
- Related notes and backlinks.

Recommended author-written sections:

- TL;DR / short answer.
- Why this paper matters.
- Prerequisites and background.
- Problem setting.
- Core idea.
- Method breakdown.
- Key equations or algorithms.
- Experimental setup and results.
- Comparison with related work.
- Strengths.
- Limitations and hidden assumptions.
- Critical analysis.
- Possible improvements or follow-up ideas.
- Personal takeaways.
- References.

Recommended paper reading body structure:

```mdx
## Short Answer

## Why This Paper Matters

## Prerequisites

## Problem Setting

## Core Idea

## Method Breakdown

## Experiments

## Comparison With Related Work

## Strengths

## Limitations

## Critical Analysis

## Possible Improvements

## Personal Takeaways

## References
```

The layout should support both concise reviews and very long technical reviews.

### Learning Map

The learning map should be a serious navigation aid, not decoration.

V1 decision:

- Do not publish a full `/learning-map/` route in v1.
- On the homepage, show a lightweight learning-map preview.
- If there are fewer than 10 public cross-linked nodes, render the preview as a structured topic list/matrix rather than a graph.
- Promote `/learning-map/` to a public route only after there is enough content for a graph to be useful.

When promoted, the map should connect:

- Research interests.
- Course notes.
- Paper readings.
- Methods and tools.

### About

The About page has a distinct job beyond repeating the homepage.

It should include:

- Longer narrative bio.
- Education timeline.
- Previous frontend engineering background.
- Current academic identity.
- Research/learning interests.
- Technical skills.
- Contact and social links.
- CV PDF link only when a real CV file exists.

## Routing And URL Policy

V1 public routes:

- `/`
- `/course-notes/`
- `/course-notes/[slug]/`
- `/paper-reading/`
- `/paper-reading/[slug]/`
- `/about/`
- `/rss.xml`
- `/sitemap-index.xml` or equivalent Astro sitemap output.
- `/404.html`

Future routes:

- `/learning-map/`
- `/publications/`
- `/projects/`
- `/cv/`

Future routes should not appear in public navigation until there is real content.

Slug policy:

- Use explicit ASCII kebab-case slugs.
- Prefer file names as slugs.
- Chinese titles must still have ASCII slugs.
- Published slugs are stable and should not change casually.
- Course note slugs should include a course/topic prefix when needed to prevent collisions.
- Slug uniqueness must be validated at build time.
- Heading anchors should use a stable slugger and allow explicit custom IDs for important sections.

Astro URL settings:

- Use `trailingSlash: 'always'`.
- Use directory-style static output.
- All internal links must be base-aware.

GitHub Pages base path:

- If deployed as a project site from repository `HomePage`, configure Astro `base: '/HomePage/'`.
- If deployed as a user site or custom domain, remove that base path and configure `site` accordingly.
- The deployment instructions must state which mode is active.

## Content Model

Use Astro content collections and build-time schema validation.

Recommended structure:

- `src/content/course-notes/*.mdx`
- `src/content/paper-reading/*.mdx`
- `src/data/profile.ts`
- `src/data/taxonomy.ts`
- `src/data/learning-map.ts`

Do not add `src/content/pages/*.mdx` in v1 unless there is a defined schema and a concrete use case.

### Shared Field Rules

- `description` is the SEO/meta description, one concise sentence.
- `summary` is the index-card summary, usually longer than `description`.
- `readingTime` is computed at build time, not handwritten.
- `related` uses typed cross-collection references and must fail the build if broken.
- `heroImage` is optional and must use the project image pipeline.
- `draft: true` completely excludes content from production builds: no detail route is generated, and the entry is excluded from index pages, search, RSS, sitemap, related-note lists, and learning-map public refs. Draft content may be visible in local development only.
- `language: 'mixed'` requires `primaryLanguage`.

### Course Note Schema

Required fields:

- `title: string`
- `description: string`
- `summary: string`
- `course: CourseId`
- `date: Date`
- `language: 'zh' | 'en' | 'mixed'`
- `status: 'active' | 'complete' | 'evergreen'`
- `tags: TagId[]`

Optional fields:

- `updated: Date`
- `term: string`
- `order: number`
- `areas: AreaId[]`
- `primaryLanguage: 'zh' | 'en'`
- `featured: boolean`
- `related: ContentRef[]`
- `heroImage: ImageRef`
- `math: boolean`
- `draft: boolean`

Course note sorting:

- Within a course, sort by `order` when present.
- Fall back to `date`.
- Next/previous navigation uses this same order.

### Paper Reading Schema

Required fields:

- `title: string`
- `description: string`
- `summary: string`
- `paperTitle: string`
- `authors: string[]`
- `year: number`
- `date: Date`
- `language: 'zh' | 'en' | 'mixed'`
- `status: 'queued' | 'reading' | 'skimmed' | 'reviewed' | 'revisit'`
- `area: AreaId`
- `tags: TagId[]`

Optional fields:

- `updated: Date`
- `venue: string`
- `doi: string`
- `arxivId: string`
- `primaryLanguage: 'zh' | 'en'`
- `paperUrl: URL`
- `codeUrl: URL`
- `projectUrl: URL`
- `takeaways: string[]`
- `featured: boolean`
- `related: ContentRef[]`
- `heroImage: ImageRef`
- `math: boolean`
- `draft: boolean`

Takeaway source of truth:

- Use frontmatter `takeaways` as the structured source.
- The `KeyTakeaways` MDX component may render these takeaways.
- Do not duplicate a separate free-form "Personal Takeaways" section unless the article needs additional prose.

Publishing rules:

- `status: 'queued'` must also set `draft: true`; queued papers must not publish detail pages in v1.
- `status: 'skimmed'` may be public only when the body includes at least `Short Answer` and `Core Idea` sections.
- `reading`, `reviewed`, and `revisit` entries may publish when required metadata and body-content checks pass.

### Taxonomy

Use `src/data/taxonomy.ts` for controlled IDs:

- `CourseId`
- `AreaId`
- `TagId`
- Optional display labels and descriptions.

Build-time validation:

- Unregistered courses, areas, or tags fail the build.
- Broken `related` references fail the build.
- Broken learning-map refs fail the build.
- Invalid URLs fail the build when a URL is present.
- Required summaries must be non-empty.

### Learning Map Data

Use curated local data:

```ts
type LearningMapNode = {
  id: string;
  label: string;
  type: 'area' | 'course' | 'paper' | 'note' | 'method' | 'tool';
  summary?: string;
  ref?: ContentRef;
};

type LearningMapEdge = {
  from: string;
  to: string;
  kind?: 'prerequisite' | 'related' | 'applies-to' | 'extends';
};
```

Validation:

- Node IDs must be unique.
- Edge endpoints must exist.
- `ref` values must resolve to public content unless the node is explicitly marked future/internal.

## Technical Approach

Use a modern static-first stack with selective interactivity.

Target stack, checked on 2026-07-05:

- Astro 7.x for routing, static generation, content collections, and deployment.
- React 19.x only for carefully scoped interactive islands.
- TypeScript 6.x for data and component reliability.
- MDX through the Astro MDX integration for rich note pages.
- Tailwind CSS 4.x through `@tailwindcss/vite` for modern styling primitives and maintainable design tokens.
- Pagefind 1.x for static search.
- `remark-math` + `rehype-katex` for build-time math rendering.
- Astro's Shiki-powered code highlighting for high-quality code blocks with light/dark themes.
- `@astrojs/sitemap`, `@astrojs/rss`, and `@astrojs/check`.

Why Astro:

- It is content-first and static-first, which fits academic notes.
- It supports typed content collections for Markdown/MDX content.
- It allows interactive islands without turning the whole site into a heavy SPA.
- It deploys cleanly to GitHub Pages, Cloudflare Pages, or any static host.

Avoid Next.js unless the site later needs server features.

### Dependency Policy

- Prefer official Astro integrations where possible.
- Keep interactive islands small and isolated.
- Avoid UI kits that make the site look generic.
- Use copied/customized accessible primitives only when they improve quality and speed.
- Avoid large visualization libraries in v1.
- Keep all core content readable without client-side JavaScript.

### Math And Wide Content

Math:

- Render math at build time with `remark-math` + `rehype-katex`.
- Do not use client-side MathJax in v1.
- Load KaTeX CSS/font assets only on pages that need math.
- Prefer deriving `hasMath` at build time from parsed MDX. The optional `math` frontmatter flag may force-enable math assets, but detected math without loaded assets is a build error.

Wide content:

- Tables, code blocks, and equations must be wrapped in horizontal scroll containers on narrow screens.
- Scroll containers should be keyboard focusable when horizontal scrolling is required.
- Scroll containers should use `role="region"` and an accessible label when the surrounding heading does not already provide a clear name.
- Long URLs and identifiers must wrap without breaking the layout.

### Search And Filtering

V1 search decision:

- Use Pagefind for static search.
- Search must work for both English and Chinese query snippets used in sample content.
- Use metadata filters for content type, tag, language, status, course, and area.
- Filter state must be stored in URL query parameters.
- Provide a useful zero-results state with a reset action.
- If Pagefind cannot satisfy Chinese search reliably in verification, add a small supplemental metadata index or adjust tokenization before public deployment.

Progressive enhancement:

- Index pages must render full static lists without JavaScript.
- Search and filtering enhance those lists, not replace them.

### Islands Inventory

Use React only where it is justified.

No-framework Astro/vanilla script:

- Theme toggle.
- Copy code buttons.
- Mobile navigation.
- Table of contents enhancements.
- Skip links and focus helpers.

React islands:

- Search/filter interface, hydrated with `client:idle`.
- Learning map preview, hydrated with `client:visible`.
- Future command palette, if added, hydrated with `client:idle`.

Article pages without React islands should not load the React runtime.

## Components

Core layout components:

- `SiteShell`: metadata, nav, footer, page frame, skip link, theme script.
- `HomeHero`: refined identity section with subtle technical visual treatment.
- `ProfilePanel`: academic identity, frontend background, links, current focus.
- `LearningMapPreview`: static-first topic matrix with optional interaction.
- `ContentIndex`: reusable index for course notes and paper readings.
- `ContentFilters`: progressive-enhancement filters.
- `ArticleLayout`: shared long-form reading layout.
- `ArticleMeta`: metadata panel for date, tags, status, links, and reading time.
- `ArticleTOC`: sticky/collapsible table of contents.
- `MDXComponents`: typography, callouts, figures, equations, code, tables, footnotes, references.
- `RelatedNotes`: backlinks and next/previous links.

Special MDX components:

- `Callout`
- `Figure`
- `EquationBlock`
- `Algorithm`
- `ComparisonTable`
- `PaperMeta`
- `KeyTakeaways`
- `OpenQuestion`
- `ReadingStatus`

Component boundaries:

- Layout components own page structure and SEO.
- Content components own article rendering.
- Interactive components own client-side behavior and receive typed data as props.
- Data files own profile, taxonomy, and learning-map content.
- MDX files own long-form writing.
- `ArticleLayout` owns `PaperMeta`, `ReadingStatus`, `ArticleMeta`, and structured takeaways rendered from frontmatter. Authors should not manually insert duplicate paper/status metadata blocks inside MDX.

Split large components when they combine layout, data mapping, and interaction state in one file.

## Article Reading Experience

Long-form article pages are the credibility core of the site.

Required:

- Sticky desktop table of contents.
- Mobile-friendly collapsible outline.
- Metadata panel.
- Back to index link.
- Previous/next navigation where possible.
- Copyable code blocks.
- Styled tables that do not overflow mobile.
- Figure captions.
- Figure alt text distinct from captions.
- Figure source/attribution when the image is not original.
- Callouts for definitions, warnings, insights, and open questions.
- Footnote support using GFM-style footnotes.
- Reasonable anchor links for headings.
- Print stylesheet that hides interactive controls and preserves readable long-form content.

## SEO, Metadata, And Feeds

Site metadata:

- Configure Astro `site`.
- Use a consistent title template.
- Use frontmatter `description` for page descriptions.
- Generate canonical URLs.
- Generate Open Graph and Twitter card metadata.
- Provide a default OG image and allow article-specific `heroImage` overrides.

Structured data:

- Add `Person` JSON-LD on the homepage/About page.
- Add `Article` JSON-LD on course note and paper reading pages.

Feeds and discovery:

- Generate sitemap with `@astrojs/sitemap`.
- Generate RSS with `@astrojs/rss`.
- Add `robots.txt`.
- Add `favicon` and app icons.
- Add a designed `404.html`.

## Accessibility Requirements

Target WCAG 2.2 AA.

Requirements:

- Body text and muted text contrast at least 4.5:1.
- Focus indicators at least 3:1 against adjacent colors.
- First focusable element is a skip link.
- Use visible `:focus-visible` states.
- All icon buttons need accessible names.
- Search, filters, navigation, and TOC must be keyboard usable.
- Learning map nodes must be focusable and have an equivalent static HTML list.
- Any command palette/dialog must use dialog semantics, focus trapping, Escape close, and focus restoration.
- Copy buttons need accessible labels and `aria-live` success feedback.
- Article `lang` must match frontmatter language.
- Figures require alt text; captions are not a substitute for alt text.

## Progressive Enhancement Contract

Core content must work without client-side JavaScript:

- Home identity and links.
- Full course note index list.
- Full paper reading index list.
- Full article bodies.
- Basic table of contents links.
- Related notes and previous/next links.

JavaScript enhancements:

- Search.
- Filters.
- TOC scroll highlighting.
- Copy buttons.
- Theme persistence.
- Learning map interaction.

Verification must include opening index and article pages with JavaScript disabled.

## Empty States

Because the site is early-stage, empty states should feel intentional:

- No `Publications` section until there are actual publications.
- Paper reading is framed as reading notes, not published papers.
- Course notes can start with a few detailed notes.
- If there are fewer than five notes, hide complex filter controls and show simple latest-writing lists.
- Future sections should be hidden from public navigation rather than shown as filler.

## Licensing And Attribution

Content credibility includes attribution hygiene:

- Add source attribution for non-original figures.
- `Figure` should accept `source` and `sourceUrl`.
- Note pages should clearly distinguish personal explanation from quoted or adapted material.
- Pick a content license before public launch, or explicitly state all rights reserved.
- Do not copy long copyrighted passages from papers into notes.

## Deployment

The site should build to static output.

Supported hosting:

- GitHub Pages.
- Cloudflare Pages.

GitHub Pages modes:

- User site: repository named `<username>.github.io`; no project base path.
- Project site: repository named `HomePage`; use `base: '/HomePage/'`.
- Custom domain: configure `site` to the custom domain and remove project base when appropriate.
- Default implementation assumption: GitHub Pages project site from repository `HomePage` until the owner explicitly chooses user-site or custom-domain deployment.

Deployment requirements:

- All internal links and assets must work under the configured base path.
- Local production preview should serve the built `dist` output before deployment.
- Deployment instructions must state the active hosting mode.

CI:

- On every push, run production build.
- Run `astro check`.
- Run internal link checks.
- Run Lighthouse/axe checks on key pages when feasible.
- External link checks can run on a scheduled workflow to avoid flaky CI.

## Measurable Quality Targets

Targets for public v1:

- Lighthouse mobile Performance >= 90 on homepage, one index page, and one long article page.
- Lighthouse Accessibility >= 95.
- Lighthouse SEO >= 95.
- No axe serious or critical issues on homepage, one index page, and one long article page.
- LCP < 2.5s on local production preview for key pages.
- CLS < 0.1.
- Article pages without React islands should not load React runtime.
- Client-side JS per article page should stay under 75 KB gzip unless justified.
- Search index size should stay under 100 KB initially; if it exceeds that later, revisit indexing scope.

Performance language in other sections ("small", "excellent", "lightweight") refers to these targets.

## Quality Bar For V1

The first public version must include:

- A polished homepage.
- A real course notes index.
- A real paper reading index.
- At least one detailed course note page.
- At least one detailed paper reading page.
- Shared article layout with TOC, metadata, code/table/callout/math styling, responsive typography, and print styles.
- Working static search and filters when content volume justifies filters.
- RSS, sitemap, canonical URLs, OG metadata, favicon, robots.txt, and 404 page.

This prevents the site from looking like a shell.

## Implementation Phases

### Phase 0: Design Foundation

- Define Tailwind theme tokens.
- Decide font stacks and typography scale.
- Build static visual samples for homepage and article content.
- Confirm light/dark theme tokens pass contrast checks.

### Phase 1: Project Foundation

- Create Astro project with TypeScript, React, MDX, Tailwind, sitemap, RSS, check, Pagefind, math, and code highlighting.
- Configure `site`, `base`, `trailingSlash`, and static output.
- Define content collections and schemas.
- Add profile data, taxonomy data, and initial learning-map data.
- Build `SiteShell`, navigation, footer, SEO defaults, skip link, theme support, and 404 page.

### Phase 2: Content Experience

- Build course note index and detail pages.
- Build paper reading index and detail pages.
- Implement article layout, TOC, metadata panel, MDX components, code styling, tables, math, callouts, footnotes, references, and navigation.
- Add one real course note sample and one real paper reading sample.
- Add print styles.

### Phase 3: Homepage And Search

- Build homepage sections.
- Add learning-map preview with low-content fallback.
- Add Pagefind search and progressive filters.
- Add RSS and sitemap routes.

### Phase 4: Verification And Deployment Prep

- Run production build.
- Run `astro check`.
- Add GitHub Actions workflow for production build, `astro check`, and internal link checks on every push.
- Add scheduled external link-check workflow or document why it is deferred.
- Run local static preview under the configured base path.
- Check desktop, mobile, and reduced-motion behavior.
- Check JavaScript-disabled article/index pages.
- Run Lighthouse and axe checks.
- Run internal link checks.
- Add deployment instructions.

## Testing And Verification

Before considering v1 complete:

- Production build passes.
- `astro check` passes.
- Internal links pass.
- Homepage first viewport communicates identity clearly.
- Course notes index looks meaningful with few notes.
- Paper reading index looks meaningful with few readings.
- Long article page remains readable for 2,000+ words.
- Long Chinese and English text render with appropriate line-height and width.
- Tables, code blocks, and long equations do not break 375px mobile layout.
- Search works for at least one English query and one Chinese query.
- Search verifies Chinese notes are indexed with the intended page-level language.
- Zero-results search state has a reset action.
- Filter state survives reload through URL query parameters.
- Copy buttons, previous/next links, heading anchors, and table of contents work.
- Theme toggle persists, follows first-visit system preference, and does not flash the wrong theme on first paint.
- Reduced-motion preference is respected.
- Light and dark themes both pass contrast checks.
- KaTeX CSS/assets load only for pages that contain math.
- Draft entries do not generate production detail routes.
- Queued paper readings are draft-only and do not publish empty detail pages.
- Article pages without React islands do not load React runtime.
- Homepage, index pages, and article pages still expose their core content with JavaScript disabled.
- JavaScript-disabled index pages still show full content lists.
- JavaScript-disabled article pages still show complete article content.
- Search, filters, mobile navigation, theme toggle, copy buttons, and TOC controls are keyboard usable.
- Sitemap, RSS, canonical URLs, OG metadata, favicon, robots.txt, and 404 page exist.
- GitHub Pages project-site base path works if deploying `HomePage`.
- Content license is chosen or the site explicitly states all rights reserved before public launch.
- Print preview for a long article is readable.

Browser/device matrix:

- Chrome desktop.
- Edge desktop.
- Firefox desktop for progressive degradation of view transitions.
- Safari/WebKit if available.
- One real mobile or mobile-sized viewport around 375px width.

## Out Of Scope For V1

- Publications page.
- Full project portfolio.
- Comment system.
- Authentication.
- Backend database.
- CMS.
- Automated knowledge graph extraction.
- Full `/learning-map/` page.
- Complex 3D scenes.
- Analytics dashboard.
- Playwright end-to-end suite beyond optional smoke checks.
