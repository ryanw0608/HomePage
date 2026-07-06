# Roadmap

> 2026-07-06: shipped since the list below was written — Sveltia CMS `/admin` (repo side),
> GoatCounter hook (fill `site.goatcounter`), GLM site agent (overview + weekly digest via PR),
> `/digest/` routes. Owner-side activation steps: `docs/admin-setup.md`.
> Next custom build on the analytics track: `/stats/` terminal dot-matrix world map from
> GoatCounter's public API (replaces the idea of a mapmyvisitors widget).

Next optimizations, ranked by value ÷ effort for an MSc student building research credibility.
Content comes first — none of these matter as much as writing real notes.

1. **Per-note OG share images** — static SVG template stamped with title + English `tldr` at build
   time. Every link shared to a lab group or timeline looks intentional. (medium effort)
2. **Related-notes block** — the `related` frontmatter field is already schema-validated; render a
   "see also" strip on article pages. (low)
3. **RSS full content** — `rss.xml.ts` currently ships descriptions only; include rendered body or
   at least `tldr`. (low-medium)
4. **Lighthouse + axe CI gate** — protect the WCAG AA / no-JS constraints as content grows; add to
   `.github/workflows/ci.yml`. (low)
5. **Print styles pass** — notes double as shareable PDF handouts; hide chips/nav, keep math. (low)
6. **⌘K palette upgrades** — group Pagefind results by collection, show status/language chips,
   "recent notes" section. (medium)
7. **Revisit queue** — a view listing notes whose `revisit` date has passed; turns the
   spaced-repetition field into a habit loop. (low-medium)
8. **Cookie-free analytics** — GoatCounter or similar; know what gets read without tracking. (low)
9. **`/publications` route** — only when a real publication exists; never before. (low, high signal
   at the right time)
10. **Learning-map promotion** — promote the homepage topics list to a full `/learning-map/` route
    once ≥10 cross-linked public nodes exist (spec threshold). (medium)
11. **`astro:assets` image pipeline** — optimize figures once notes actually carry many images.
    (medium, defer)
12. **Filter bar + year jump list** — auto-appear at ≥6 entries / ≥12 papers per the thresholds in
    `docs/authoring.md`. (medium, defer until content volume justifies)
