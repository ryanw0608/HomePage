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

## Reference Observations

The reference site uses an academic homepage plus a substantial blog/reading system:

- The blog index groups entries by year and date, shows language labels, tags, and one-paragraph summaries.
- Individual paper-reading pages are long-form technical documents, not placeholders.
- Reading pages include metadata, a short answer, prerequisites, problem framing, method explanation, evaluation, comparison with related work, limitations, critical analysis, improvement ideas, and a conclusion.
- The site also uses an on-page outline, which is important for long technical articles.

Our site should borrow the information discipline, not copy the exact visual style.

## Design Direction

The homepage should feel like a premium academic knowledge product:

- Clean but distinctive, with high craft in spacing, typography, motion, and interaction.
- Strong first-screen identity, but not overloaded with fake terminal interactions.
- A modern visual language influenced by research dashboards, technical editorial design, and high-end developer tools.
- Interactions should be purposeful: reveal context, help navigation, make reading smoother, or show relationships between notes.

The "command center" idea remains only as a small optional motif:

- A compact command palette can provide fast navigation.
- Keyboard shortcuts can open search or jump between sections.
- A subtle status strip can show current focus, latest note, or reading queue.

It should not dominate the whole identity.

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

## Information Architecture

### Home

The home page is a polished academic profile and content gateway:

- Hero section with name, identity, short academic direction, previous frontend background, and key links.
- Current focus section for research or learning interests.
- Featured course notes and paper readings.
- Learning map that connects topics, courses, and readings.
- About snapshot with education, skills, frontend background, and contact links.

The homepage should make the visitor believe the site is actively maintained even before there are publications.

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

MDX is required so notes can contain custom components such as callouts, equations, diagrams, comparison cards, figure captions, and interactive explainers.

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

## Testing And Verification

Before considering v1 complete:

- Run the production build.
- Check desktop and mobile layouts.
- Inspect article pages with long Chinese and English text.
- Confirm MDX components render correctly.
- Confirm filters/search work.
- Confirm page transitions and animations respect reduced-motion preferences.
- Confirm generated static output can deploy to GitHub Pages or Cloudflare Pages.

## Out Of Scope For V1

- Publications page.
- Full project portfolio.
- Comment system.
- Authentication.
- Backend database.
- Automated knowledge graph extraction.
- Complex 3D scenes.
- Analytics dashboard.
