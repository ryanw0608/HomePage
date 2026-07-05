# Claude Design Review Disposition

This note records how the Claude Code design review feedback was handled.

## Summary

The review found no critical issues, but it identified 23 important gaps where implementation would have required guessing. The revised design spec accepts most of the feedback and turns it into explicit product and technical decisions.

Updated spec:

- `docs/superpowers/specs/2026-07-05-homepage-design.md`

## Accepted Changes

### Learning Map Scope

Accepted with scope reduction.

The full `/learning-map/` page is no longer part of v1. V1 keeps a homepage learning-map preview with a low-content fallback. The full route becomes a future route until there are enough nodes for a graph to be useful.

### Visual System Before Implementation

Accepted.

The spec now includes Phase 0 for theme tokens, font stacks, typography scale, and visual samples before component implementation.

### Theme Decision

Accepted.

The spec now requires token-driven light/dark themes, `prefers-color-scheme`, a theme toggle, first-frame flash prevention, and dual-theme code highlighting.

### Math Rendering

Accepted.

The spec now selects build-time math rendering with `remark-math` and `rehype-katex`, and explicitly rejects client-side MathJax for v1.

### Search

Accepted.

The spec now selects Pagefind for v1 static search and requires both English and Chinese query verification. Index pages must remain useful without JavaScript.

### Typography And CJK Handling

Accepted.

The spec now defines font stacks, system CJK font policy, line-height targets, line-length targets, and mobile overflow handling.

### React Islands

Accepted.

The spec now includes an islands inventory and limits React to search/filter UI, learning-map preview, and a future command palette.

### Content Model Precision

Accepted.

The spec now defines required and optional fields for course notes and paper readings, clarifies `description` vs `summary`, makes reading time computed, defines `related` as typed references, and adds controlled taxonomy.

### URL And Slug Policy

Accepted.

The spec now requires ASCII kebab-case slugs, stable published slugs, build-time uniqueness checks, base-aware internal links, and GitHub Pages project-site base handling.

### SEO And Discovery

Accepted.

The spec now requires sitemap, RSS, canonical URLs, OG/Twitter metadata, JSON-LD, robots.txt, favicon, and a designed 404 page.

### Accessibility And Progressive Enhancement

Accepted.

The spec now targets WCAG 2.2 AA, defines contrast and focus requirements, adds skip links, JS-disabled behavior, and accessible learning-map fallback requirements.

### Quality Targets And Verification

Accepted.

The spec now includes Lighthouse, axe, LCP, CLS, JS-size, search-index, JavaScript-disabled, mobile, print, and GitHub Pages base-path checks.

### Deployment And CI

Accepted.

The spec now requires static deployment, explicit GitHub Pages mode, configured `site` and `base`, production preview under the active base path, and CI for build/check/link verification.

## Adjusted Changes

### UI Language

Adjusted.

The review suggested deciding Chinese/English UI language. The spec now chooses English UI chrome for v1 while allowing individual notes to be `zh`, `en`, or `mixed`.

### Chinese Name

Adjusted.

The review suggested a concrete Chinese-character display. The spec intentionally does not invent Chinese characters. It uses `Yongzhe Wang` as primary display and `Wang Yongzhe` as secondary until the owner supplies exact Chinese characters.

### Search Implementation

Adjusted.

The review mentioned Pagefind or other indexing choices. The spec selects Pagefind but keeps a fallback requirement: if Chinese search verification fails, add a supplemental metadata index or tokenization adjustment before public deployment.

### Playwright

Adjusted.

The review asked whether screenshots, Lighthouse, or Playwright should be required. The spec requires Lighthouse and axe. Playwright remains out of scope for v1 except optional smoke checks because the site is static and the immediate priority is content quality and accessibility.

## Deferred Or Rejected Changes

### Full `/learning-map/` Route In V1

Deferred.

A full public graph page would be visually impressive but risks violating the no-placeholder principle with only a few notes. It becomes a future route.

### Full CMS Or Backend Features

Rejected.

The site remains static-first. Backend/CMS/database work conflicts with the long-term simple authoring goal for v1.

### Heavy 3D Or Canvas Hero

Rejected for v1.

The spec keeps visual ambition, but long-form reading quality, performance, and maintainability take priority.

## Remaining Human Decisions

- Exact Chinese characters for the name, if they should appear publicly.
- Final hosting mode: default implementation assumes GitHub Pages project site from repository `HomePage`; the owner can switch to user-site, Cloudflare Pages, or a custom domain before deployment.
- Content license before public launch, now tracked as a v1 verification gate.
- Real first course note and first paper reading content.

## Second Review Disposition

The second review concluded that the spec was ready with local edits. It found no critical issues and identified eight important issues. The spec now handles them as follows.

### Current Focus Counts

Accepted.

Course notes now support optional `areas: AreaId[]`, and current-focus counts may derive from paper areas, course-note areas, tags, and explicit related references. The homepage hides counts unless a focus item has at least two related public notes.

### Draft Detail Routes

Accepted.

`draft: true` now completely excludes content from production builds, including detail route generation. Testing now requires a draft entry not to generate a production route.

### Language Mapping

Accepted.

The spec now maps content language values to valid HTML language tags. `mixed` requires `primaryLanguage`, note pages must set page-level `<html lang>`, and Pagefind indexing must use the same language value.

### CI Ownership

Accepted.

Phase 4 now explicitly includes adding GitHub Actions workflows for production build, `astro check`, and internal link checks, plus a scheduled or documented external link-check workflow.

### Verification Coverage

Accepted.

The verification checklist now covers theme persistence and flash prevention, filter URL persistence, conditional KaTeX loading, draft exclusion, queued-paper exclusion, no-React article pages, homepage/index/article no-JavaScript checks, and keyboard usability.

### View Transitions

Accepted.

The spec now requires native cross-document CSS view transitions only and explicitly excludes Astro `ClientRouter` in v1.

### Queued Paper Readings

Accepted.

`queued` paper readings must be draft-only and may not publish detail pages. `skimmed` readings require at least `Short Answer` and `Core Idea` sections before publication.

### Article Metadata Ownership

Accepted.

Course and paper article requirements are split into layout-injected requirements and author-written sections. `ArticleLayout` owns paper/status metadata and structured takeaways so authors do not insert duplicate metadata blocks manually.

## Second Review Minor Fixes Applied

- Code highlighting is now Astro Shiki-powered rather than an unresolved Shiki/rehype-pretty-code choice.
- Tailwind 4 integration is now specified through `@tailwindcss/vite`.
- Wide scroll containers now require keyboard focusability and accessible region naming when needed.

## Second Review Minor Issues Deferred

These are noted for implementation but do not block planning:

- Authoring starter templates for notes.
- Full navigation/footer breakpoint design details.
- Exact image pipeline and icon source.
- More granular homepage/index JavaScript budgets.
- More detailed RSS content contract.
- A full finding-by-finding traceability table for the first review.
