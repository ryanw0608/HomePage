# Authoring Handbook

How to write and publish course notes and paper-reading notes on this site.

Three authoring surfaces, one source of truth (git-versioned MDX):

1. **Web editor** — `https://ryanw0608.github.io/HomePage/admin/` (Sveltia CMS, GitHub login,
   works on the phone). Best for: creating entries with correct frontmatter, flipping paper
   status, fixing a tldr, uploading images. Body editing is raw MDX. Setup: `docs/admin-setup.md`.
2. **Editor + git** — VS Code/Obsidian with the `npm run new:*` scaffolds. Best for: the long,
   math-heavy deep dives.
3. **Notion** — capture inbox only, never authoritative. Promote captures via the scaffold
   (checklist below).

## Quickstart

```bash
npm run new:paper lynx-kv-transfer "Lynx: Progressive Speculative Quantization"
# or
npm run new:note ml-foundations-backprop "Backpropagation"

# edit src/content/<collection>/<slug>.mdx, then:
npm run check     # schema + types
npm run dev       # live preview at localhost:4321/HomePage/
# publish: set draft: false, commit, push (Pages deploys automatically)
```

The scaffold stamps today's date, `draft: true`, and enum defaults that pass validation. Slugs are
ASCII kebab-case and permanent once published.

## Language policy

- **Paper-reading deep notes: Chinese** (`language: "zh"`). The deep-dive audience is the lab; the
  format follows the FutureMLS reading-note tradition.
- **Every zh note must fill the English `tldr` field** — it feeds the index, RSS, and share cards so
  international readers always get the one-line takeaway.
- **Course notes: English** (`language: "en"`) unless the course itself was taught in Chinese.
- `language: "mixed"` requires `primaryLanguage: "zh" | "en"`.

## Frontmatter reference

Shared fields (both collections):

| Field | Required | Notes |
|---|---|---|
| `title` | yes | Display title. Papers use `Reading: <short name>` |
| `description` | yes | One sentence, SEO/share |
| `summary` | yes | 2-3 sentences, shown on index rows |
| `tldr` | policy | One English sentence; required for zh notes |
| `date` | yes | ISO `YYYY-MM-DD` |
| `updated` | no | ISO date |
| `revisit` | no | Spaced-repetition due date |
| `language` | yes | `zh` / `en` / `mixed` |
| `tags` | yes | Keys from `src/data/taxonomy.ts` |
| `related` | no | Slugs of other notes in the same collection (build-verified) |
| `featured`, `draft`, `math` | no | Booleans |

Course notes add: `course` (taxonomy key), `status` (`active|complete|evergreen`), `term`, `order`
(position within the course — drives prev/next navigation), `areas`.

Paper reading adds: `paperTitle`, `authors[]`, `year`, `venue`, `status`
(`queued|reading|skimmed|reviewed|revisit`; `queued` must stay `draft`), `area`, `doi`, `arxivId`,
`paperUrl`, `codeUrl`, `projectUrl`, `takeaways[]`, and the verdict trio:

- `rating`: 1-5 — renders as `●●●●○`
- `recommendation`: `skip | skim | read | must-read`
- `reproducible`: `code+weights | code-only | partial | none`

The verdict strip renders automatically at the top of the article from these fields — never write a
`<Verdict>` manually in a paper note.

## Adding a tag / area / course

Edit `src/data/taxonomy.ts` first. Unknown keys **fail the build on purpose** — this keeps the tag
space curated. Keys are kebab-case; labels are display text.

## MDX component catalog

Components need **no imports** — write them directly in any `.mdx` file.

```mdx
<Tldr>One-sentence takeaway, bolded, green-flagged. Open every note with this.</Tldr>

<Callout type="note" title="...">     // note | insight | warning | question | exam | definition
  Prose callout. `exam` renders as // exam-trap (orange), `definition` as // def (blue).
</Callout>

<Critique
  weaknesses={["Flaw one.", "Flaw two."]}
  improvements={["Fix one.", "Fix two."]}
/>  {/* renders as a unified diff: red - lines, green + lines */}

<WhenMatrix
  helps={["Situations where the method wins."]}
  hurts={["Situations where it loses."]}
/>

<Bench
  caption="Optional caption."
  columns={["speedup", "BLEU"]}
  better={["max", "max"]}          // "max" | "min" | null per column; winner cell highlighted
  rows={[
    { name: "This paper", cells: ["6.1x", 28.4] },
    { name: "EAGLE-3", cells: ["2.5x", 27.3], baseline: true }
  ]}
/>

<FormulaCard formulas={[{ name: "attention", tex: "\\text{softmax}(QK^T/\\sqrt{d_k})V", note: "..." }]} />

<Derivation title="derivation · ..." steps={[{ text: "Step text.", math: "a = b" }]} open />

<Recall items={[{ q: "Question?", a: "Answer." }]} />

<KeyTakeaways items={frontmatter.takeaways} />   {/* or an inline array */}

<Figure src="media/paper-reading/<slug>/fig1.png" alt="..." caption="..." source="paper" sourceUrl="..." />
```

## Note skeletons

**Paper reading** (required rows make a 400-word skim look finished; optional rows carry a
15k-word deep dive):

1. `<Tldr>` — required (verdict strip renders itself from frontmatter)
2. `## Why This Paper Matters` — recommended
3. `## Background` — optional, `###` per prerequisite
4. `## Problem` — required
5. `## Core Idea` — required, `###` per design part
6. `## Walkthrough` (numeric example / timing) — optional
7. `## Experiments` + `<Bench>` — optional
8. `## Verdict` + `<Critique>` + `<WhenMatrix>` — required
9. `## Significance` / related work — optional
10. `## Implementation Notes` — optional
11. `## Appendix` + `<FormulaCard>` — optional
12. `## References` — recommended

**Course note:**

1. `<Tldr>` — required
2. `## Overview` — required
3. `## Key Concepts` (+ `definition` callouts) — required
4. `## Detailed Notes` (+ `<Derivation>`) — optional
5. `## Worked Examples` — optional
6. `## Mistakes And Confusions` (+ `exam` callouts) — optional
7. `## Active Recall` + `<Recall>` — recommended (pairs with `revisit` date)
8. `## Summary` + `<KeyTakeaways>` — required
9. `## References` — optional

Multi-part courses: set `order: 1, 2, …` — prev/next navigation and "part N of M" render
automatically.

## Notion export checklist

Notion → Export → **Markdown & CSV** → unzip, then:

1. Rename the `.md` to your kebab-case slug and change extension to `.mdx`.
2. Paste frontmatter (scaffold a twin file with `npm run new:*` and copy its header).
3. Move images from the export folder to `public/media/<collection>/<slug>/` and replace
   `![](...)` with `<Figure src="media/<collection>/<slug>/name.png" alt="..." caption="..." />`.
4. Convert Notion callouts (`> 💡 ...`) to `<Callout type="insight">...</Callout>`.
5. Check equations: `$...$` and `$$...$$` work as-is (`math: true`); fix any stray escapes.
6. Tables pass through as Markdown; use `<Bench>` instead when a winner should be highlighted.
7. Register any new tags/areas in `src/data/taxonomy.ts`, then `npm run check`.

## Math

Inline `$e = mc^2$`, display `$$...$$`, rendered at build time by KaTeX. Math keeps its own
proportional typeface inside the mono page — intended contrast. Set `math: true` in frontmatter.

## Index behavior

Rows show language (`EN`/`中`), status chip, `#tags`, reading time (computed, CJK-aware), and
`●●●●○` rating for papers. Thresholds documented for future work: at ≥6 entries per collection add a
URL-param filter bar (progressive enhancement); at ≥12 papers add a year jump list.

## Publish & verify

```bash
npm run check && npm run build && git diff --check
```

Set `draft: false` (queued papers must stay draft), commit with a concise imperative message, push
to `master` — GitHub Pages deploys automatically. Production: https://ryanw0608.github.io/HomePage/
