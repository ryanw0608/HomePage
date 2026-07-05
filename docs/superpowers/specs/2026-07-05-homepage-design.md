# Personal Academic Homepage Design

## Goal

Build a long-lived personal academic homepage for Yongzhe Wang / Wang Yongzhe. The site is primarily for academic presentation, learning notes, and paper reading, but it must also demonstrate strong frontend taste because the owner previously worked as a frontend engineer.

The site must not feel like a generic academic template or a terminal gimmick. The desired impression is:

- Academically credible.
- Visually refined and technically current.
- Content-rich once a reader opens a note.
- Easy to maintain for many years.

The first version focuses on:

- Personal identity and basic academic profile.
- Course learning notes with detailed article pages.
- Paper reading notes with structured but flexible review pages.
- Current learning and research interests.

Publications, formal research projects, awards, teaching, and full CV sections are future extensions and should not be faked in v1.

## Audience And Success Criteria

Primary audiences:

- Academic readers: potential supervisors, research collaborators, lab peers, and classmates.
- Technical readers: people who care whether the previous frontend background is real.
- Future self: the site should remain pleasant to update after courses, papers, and research output grow.

Success criteria:

- A visitor can understand who Yongzhe is, what he is learning, and what direction he is moving toward within 30 seconds.
- A visitor who opens a course note or paper reading sees a serious long-form page, not a thin placeholder.
- The frontend quality feels deliberate in typography, layout, motion, and article details.
- Adding a new note requires writing one MDX file plus metadata, not touching layout code.
- The site can evolve for years without a framework rewrite.

Non-goals:

- Do not imitate a publication-heavy senior researcher homepage before there are publications.
- Do not use visual effects to compensate for missing content.
- Do not build a backend, CMS, or graph database in v1.
- Do not make the site hard to update by over-customizing every page.

## Reference Observations

The reference site uses an academic homepage plus a substantial blog/reading system:

- The blog index groups entries by year and date, shows language labels, tags, and one-paragraph summaries.
- Individual paper-reading pages are long-form technical documents, not placeholders.
- Reading pages include metadata, a short answer, prerequisites, problem framing, method explanation, evaluation, comparison with related work, limitations, critical analysis, improvement ideas, and a conclusion.
- The site also uses an on-page outline, which is important for long technical articles.

Our site should borrow the information discipline, not copy the exact visual style.

## Design Direction

The site should feel like a premium academic knowledge product:

- Clean but distinctive, with high craft in spacing, typography, motion, and interaction.
- Strong first-screen identity, but not overloaded with fake terminal interactions.
- A modern visual language influenced by research dashboards, technical editorial design, and high-end developer tools.
- Interactions should be purposeful: reveal context, help navigation, make reading smoother, or show relationships between notes.

The "command center" idea remains only as a small optional motif:

- A compact command palette can provide fast navigation.
- Keyboard shortcuts can open search or jump between sections.
- A subtle status strip can show current focus, latest note, or reading queue.

It should not dominate the whole identity.

The guiding phrase for v1 is:

> A refined academic knowledge base with visible frontend craft.

## Visual Standard

The frontend quality bar is intentionally high:

- No generic template look.
- No empty decorative hero that hides weak content.
- No single-color theme that feels flat.
- No overused dark-blue/purple SaaS gradient as the entire visual identity.
- No fragile animation that harms readability or mobile performance.

The site should use:

- Editorial typography with strong hierarchy for long reading.
- Polished article pages with side metadata, sticky outline, footnote/reference styling, code blocks, callouts, equations, figures, and comparison tables.
- Thoughtful motion: page transitions, hover intent, section reveals, and interactive diagrams where useful.
- Responsive layout that keeps long Chinese and English technical text readable on desktop and mobile.

### Visual System

The visual system should be designed before component implementation:

- Use a small set of design tokens for background, foreground, muted text, accent colors, borders, surfaces, spacing, and shadows.
- Prefer a restrained base palette with two accent families rather than a one-note theme. Avoid making the entire site dark blue, purple, beige, brown, or orange.
- Support a dark-first interface if it improves the technical editorial feel, but article pages must keep high contrast and comfortable reading.
- Use one display type treatment for identity/hero sections and one highly readable text treatment for long-form writing.
- Keep line length controlled: long-form articles should target roughly 65-85 English characters or a comfortable Chinese reading width.
- Use subtle technical motifs such as grids, coordinate labels, thin rules, status chips, and data-like dividers. These should support structure, not decorate randomly.
- Use icons only where they reduce reading effort: external links, filters, status, search, copy, previous/next, and table of contents controls.

### Motion System

Motion should prove craft without hurting reading:

- Use view transitions for page continuity.
- Use hover and focus states that make controls feel precise.
- Use subtle reveal animation for homepage sections.
- Use `prefers-reduced-motion` to disable or simplify motion.
- Avoid continuous motion near article bodies.
- Avoid heavy canvas/WebGL in v1 unless measured performance is excellent.

## Information Architecture

### Home

The home page is a polished academic profile and content gateway:

- Hero section with name, identity, short academic direction, previous frontend background, and key links.
- Current focus section for learning/research interests.
- Featured course notes and paper readings with real summaries.
- Learning map that connects topics, courses, and readings.
- About snapshot with education, skills, frontend background, and contact links.

The homepage should make the visitor believe the site is actively maintained even before there are publications.

Home page section order:

1. Identity hero: name, short profile, current focus, links.
2. Current focus: 3-5 areas with short explanations and related note counts.
3. Featured writing: latest or pinned course notes and paper readings.
4. Learning map preview: interactive but lightweight.
5. About snapshot: education, frontend background, skills, contact.

The hero should be impressive through layout, typography, and interaction quality, not through a huge empty graphic.

### Course Notes

The course notes section must be real and detailed, not a placeholder list.

Index page requirements:

- List notes by course, topic, date, and tags.
- Provide filters by course/topic/status.
- Show concise summaries and reading time.
- Support both Chinese and English titles.

Article page requirements:

- Title, course, date, tags, status, and summary.
- Sticky or collapsible table of contents.
- Concepts section.
- Detailed notes section.
- Examples or worked problems where relevant.
- Code snippets, diagrams, tables, equations, and references when needed.
- Personal reflection / "what I still do not understand" section.
- Next/previous navigation within the course.

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

- List readings by date, topic, status, venue/year, and tags.
- Show a one-paragraph technical summary for each entry.
- Support filters for area, method, model/system, and reading status.
- Allow bilingual entries when useful.

Article page requirements:

- Paper title, authors, year, venue/status, paper link, code/project links if available.
- Review date and review language.
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
- References and backlinks to related notes.

Each reading note may omit sections that do not apply, but the layout system should make different structures look coherent.

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

The paper reading layout should support both concise reviews and very long technical reviews.

### Learning Map

The learning map should be a serious navigation tool, not only decoration.

It should connect:

- Research interests.
- Course notes.
- Paper readings.
- Methods and tools.

The first implementation can use curated local data. A graph database is out of scope.

### About

The about section should present:

- Name: Yongzhe Wang / Wang Yongzhe, with Chinese name if desired.
- Current academic identity.
- Former frontend engineering background.
- Research/learning interests.
- Technical skills.
- Contact and social links.

## Routing

Recommended public routes:

- `/`
- `/course-notes/`
- `/course-notes/[slug]/`
- `/paper-reading/`
- `/paper-reading/[slug]/`
- `/learning-map/`
- `/about/`

Future routes:

- `/publications/`
- `/projects/`
- `/cv/`

Future routes should not appear in public navigation until there is real content.

## Content Model

Use local typed content so the site remains durable and portable.

Recommended structure:

- `src/content/course-notes/*.mdx`
- `src/content/paper-reading/*.mdx`
- `src/content/pages/*.mdx`
- `src/data/profile.ts`
- `src/data/learning-map.ts`

Course note frontmatter:

- `title`
- `description`
- `course`
- `date`
- `updated`
- `language`
- `status`
- `tags`
- `summary`
- `readingTime`
- `featured`
- `related`

Paper reading frontmatter:

- `title`
- `description`
- `paperTitle`
- `authors`
- `year`
- `venue`
- `paperUrl`
- `codeUrl`
- `projectUrl`
- `date`
- `language`
- `status`
- `area`
- `tags`
- `summary`
- `takeaways`
- `featured`
- `related`

MDX is required so notes can contain custom components such as callouts, equations, diagrams, comparison cards, figure captions, and interactive explainers.

### Data Validation

Astro content collections should validate required metadata at build time:

- Dates must be parseable.
- `language` should be constrained to known values such as `zh`, `en`, or `mixed`.
- `status` should be constrained to known values such as `draft`, `reading`, `complete`, or `evergreen`.
- Tags should be arrays.
- External URLs should be optional but valid when present.
- Required summaries should be non-empty for index pages.

Broken content metadata should fail the build rather than silently degrading the site.

## Technical Approach

Use a modern static-first stack with selective interactivity.

Target stack, checked on 2026-07-05:

- Astro 7.x for routing, static generation, content collections, and deployment.
- React 19.x for carefully scoped interactive islands.
- TypeScript 6.x for data and component reliability.
- MDX through the Astro MDX integration for rich note pages.
- Tailwind CSS 4.x for modern styling primitives and maintainable design tokens.
- Shiki or rehype-pretty-code for high-quality code blocks.
- Fuse.js or a small client-side index for local search and filtering.
- Motion may be used sparingly for transitions and micro-interactions.

Why Astro:

- It is content-first and static-first, which fits academic notes.
- It supports typed content collections for Markdown/MDX content.
- It allows interactive islands without turning the whole site into a heavy SPA.
- It deploys cleanly to GitHub Pages, Cloudflare Pages, or any static host.

Avoid using Next.js unless the site later needs server features. For the current scope, Next.js adds complexity without improving the academic content workflow.

### Dependency Policy

Use modern dependencies, but avoid novelty for its own sake:

- Prefer official Astro integrations where possible.
- Keep interactive islands small and isolated.
- Avoid UI kits that make the site look generic.
- Use copied/customized primitives only when they improve accessibility and speed up development.
- Avoid large visualization libraries for the learning map unless the curated graph becomes complex.
- Keep all core content readable without client-side JavaScript.

### Deployment

The site should build to static output.

Preferred deployment options:

- GitHub Pages for simple hosting.
- Cloudflare Pages if custom domains, previews, and deployment workflow become important.

The implementation should avoid server-only features so either hosting path remains available.

## Components

Core layout components:

- `SiteShell`: metadata, nav, footer, page frame.
- `HomeHero`: refined identity section with subtle technical visual treatment.
- `ProfilePanel`: academic identity, frontend background, links, current focus.
- `LearningMap`: interactive topic/note map.
- `ContentIndex`: reusable index for course notes and paper readings.
- `ContentFilters`: tag, topic, status, and language filtering.
- `ArticleLayout`: shared long-form reading layout.
- `ArticleMeta`: metadata panel for date, tags, status, links, and reading time.
- `ArticleTOC`: sticky/collapsible table of contents.
- `MDXComponents`: typography, callouts, figures, equations, code, tables, references.
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
- Interactive components own client-side behavior and should receive typed data as props.
- Data files own profile and learning-map content.
- MDX files own long-form writing.

Large components should be split when they combine layout, data mapping, and interaction state in one file.

## Interaction

Interactions must serve content quality.

V1 interactions:

- Fast search/filter across notes.
- Sticky outline for long articles.
- Smooth view transitions between index and article pages.
- Learning map node hover/click details.
- Copy buttons for code blocks.
- Optional command palette for navigation.

Avoid over-building:

- No full CMS in v1.
- No backend database in v1.
- No heavy 3D hero in v1 unless performance remains excellent.
- No decorative animation that competes with article reading.

### Search And Filtering

V1 search/filter behavior:

- Filter by content type, tag, language, status, and area/course.
- Search title, summary, tags, course, area, paper title, and authors.
- Keep filters client-side using a generated static index.
- Show a useful empty state with a reset action.
- Do not index entire article bodies in v1 unless bundle size remains small.

### Article Reading Experience

Long-form article pages must include:

- Sticky desktop table of contents.
- Mobile-friendly collapsible outline.
- Metadata panel.
- Back to index link.
- Previous/next navigation where possible.
- Copyable code blocks.
- Styled tables that do not overflow mobile.
- Figure captions.
- Callouts for definitions, warnings, insights, and open questions.
- Reasonable anchor links for headings.

Article pages are the credibility core of the site.

## Empty States

Because the site is early-stage, empty states should feel intentional:

- No "Publications" section until there are actual publications.
- Paper reading is framed as reading notes, not published papers.
- Course notes can start with a few detailed sample notes.
- Future sections should be hidden or marked as "planned" only in admin/development notes, not as public filler.

## Quality Bar For V1

The first public version must include:

- A polished homepage.
- A real course notes index.
- A real paper reading index.
- At least one detailed course note page.
- At least one detailed paper reading page.
- Shared article layout with table of contents, metadata, code/table/callout styling, and responsive typography.

This prevents the site from looking like a shell.

## Implementation Phases

### Phase 1: Foundation

- Create Astro project with TypeScript, React, MDX, and Tailwind.
- Define content collections and schemas.
- Add profile data and learning map data.
- Build `SiteShell`, navigation, footer, and metadata defaults.

### Phase 2: Content Experience

- Build course note index and detail pages.
- Build paper reading index and detail pages.
- Implement article layout, TOC, metadata panel, MDX components, code styling, tables, callouts, and navigation.
- Add one real course note sample and one real paper reading sample.

### Phase 3: Homepage And Visual Polish

- Build homepage sections.
- Add learning map preview.
- Add refined visual system, responsive layout, motion, and transitions.
- Add search/filter behavior.

### Phase 4: Verification And Deployment Prep

- Run production build.
- Check desktop and mobile.
- Check reduced-motion behavior.
- Check static deployment output.
- Add deployment instructions.

## Testing And Verification

Before considering v1 complete:

- Run the production build.
- Run type checking or Astro checking.
- Check desktop and mobile layouts.
- Inspect article pages with long Chinese and English text.
- Confirm MDX components render correctly.
- Confirm filters/search work.
- Confirm page transitions and animations respect reduced-motion preferences.
- Confirm generated static output can deploy to GitHub Pages or Cloudflare Pages.

Manual QA checklist:

- Home page first viewport communicates identity clearly.
- Course notes index looks meaningful with few notes.
- Paper reading index looks meaningful with few readings.
- Long article page remains readable for 2,000+ words.
- Tables and code blocks do not break mobile layout.
- Links, tags, filters, and table of contents are keyboard accessible.
- No hidden future section makes the site look unfinished.

## Out Of Scope For V1

- Publications page.
- Full project portfolio.
- Comment system.
- Authentication.
- Backend database.
- Automated knowledge graph extraction.
- Complex 3D scenes.
- Analytics dashboard.
