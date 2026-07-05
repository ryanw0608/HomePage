# Personal Academic Homepage Design

## Goal

Build a personal academic homepage for an early-stage researcher with a former frontend engineering background. The site should feel like an interactive academic command center: credible enough for academic readers, but visually distinctive enough to show frontend taste and craft.

The first version focuses on:

- Personal identity and basic academic profile.
- Course learning notes.
- Paper reading notes.
- Current learning and research interests.

Publications, formal projects, awards, teaching, and full CV sections will be added later when there is real content.

## Visual Direction

The homepage will use a "command center" first screen:

- A dark, high-contrast interface inspired by terminals, developer tools, and research dashboards.
- A command palette / terminal area that introduces the person through commands such as `whoami`, `open notes`, `current focus`, and `reading queue`.
- A restrained animated background using grid lines, scan highlights, constellation-like nodes, or subtle data-flow motion.
- Clear navigation for `About`, `Course Notes`, `Paper Reading`, `Learning Map`, and `Contact`.

The tone should be ambitious and technical, but not noisy. The page can be dramatic, but the academic content must remain easy to scan.

## Information Architecture

### Home

The home page is the primary experience. It contains:

- Hero command center with name, identity, research interests, and key links.
- Learning / research map showing current areas of exploration.
- Latest notes section combining recent course notes and paper reading notes.
- About snapshot with education, previous frontend experience, skills, and contact links.

### Course Notes

This page lists course learning notes. Each note has:

- Title.
- Course or topic.
- Date.
- Tags.
- Short summary.
- Markdown or MDX body.

### Paper Reading

This page lists paper reading notes. Each note has:

- Paper title.
- Authors.
- Year.
- Venue if known.
- Tags.
- Reading status.
- Personal summary and takeaways.
- Link to paper when available.

### Learning Map

This page or home module visualizes current interests as connected nodes. The first version can use curated static data rather than a full graph database.

Initial node types:

- Research direction.
- Course topic.
- Paper note.
- Tool or method.

## Content Model

Use simple local content files so updates stay easy:

- `src/content/course-notes/*.mdx`
- `src/content/paper-reading/*.mdx`
- `src/data/profile.ts`
- `src/data/learning-map.ts`

The site should work even with only a few sample entries.

## Technical Approach

Use Astro for the static site foundation, with interactive islands for visual components.

Recommended stack:

- Astro for routing, static generation, content collections, and deployment.
- React for interactive components such as the command panel and learning map.
- MDX for notes and reading entries.
- CSS modules or scoped component styles for custom visual polish.

The site should be deployable as a static site to GitHub Pages or Cloudflare Pages.

## Components

Core components:

- `SiteShell`: page layout, nav, footer, SEO metadata.
- `CommandHero`: interactive first screen with typed command suggestions and profile output.
- `LearningMap`: visual map of topics, notes, and reading areas.
- `NoteCard`: shared card for course notes and paper reading.
- `NoteList`: filterable list of notes.
- `ProfilePanel`: compact identity, links, and current focus.

## Interaction

First version interactions:

- Command hero supports clicking suggested commands.
- Command output updates in place without page reload.
- Learning map nodes can be hovered or clicked to reveal short descriptions.
- Notes can be filtered by tag or type.

Avoid building a full search engine in v1. A simple client-side filter is enough.

## Error And Empty States

The site should handle early-stage content gracefully:

- If there are no papers, show "Paper reading notes" rather than "Publications".
- If a section has no entries, show a small "Coming soon" or "Currently organizing notes" state.
- Broken external links should be easy to update from data files.

## Testing And Verification

Before considering the first version complete:

- Run the production build.
- Check desktop and mobile layouts in browser.
- Confirm the hero, navigation, command interactions, learning map, and note lists render correctly.
- Confirm the site still looks intentional with only sample content.

## Out Of Scope For V1

- Publications page.
- Full blog system beyond course and paper notes.
- Authentication, comments, backend database, analytics dashboard.
- Complex graph database or automated knowledge extraction.
- Heavy 3D scene unless performance remains excellent.
