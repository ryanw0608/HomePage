# Claude Code Redesign Prompt

Use this prompt in Claude Code from the repository root:

```text
You are taking over an Astro personal academic homepage for Yongzhe Wang.

Repository root:
C:\Users\wyz16\HomePage

Read first:
- AGENTS.md
- CLAUDE.md
- docs/handoff/claude-code-handoff.md
- docs/superpowers/specs/2026-07-05-homepage-design.md
- docs/deployment.md

Context:
The site already builds and deploys to GitHub Pages:
https://ryanw0608.github.io/HomePage/

The current frontend has been rejected by the user. Treat the existing code as a functional foundation, not as an acceptable design baseline. The user previously worked as a frontend engineer, so the visual and interaction quality must be high enough that the site does not damage credibility.

Goal:
Redesign the frontend into a refined academic knowledge product. Preserve the Astro content model, routes, MDX workflow, CI, and GitHub Pages deployment. Rebuild the visual system, homepage, index pages, and article reading experience.

Non-negotiables:
- Do not add fake Publications, Projects, CV, or research-output sections.
- Do not make a terminal gimmick or generic command-center dashboard.
- Do not use a generic UI kit.
- Do not break the /HomePage/ base path.
- Do not rely on client-side JavaScript for core content.
- Do not hide weak content behind decorative graphics.
- Do not ship a one-note dark-blue, purple, beige, brown, or SaaS-gradient palette.

Work plan:
1. Audit the current implementation and take desktop/mobile screenshots of the homepage and one article page.
2. State the concrete visual problems before changing code.
3. Propose a concise redesign direction: layout, typography, palette, article page model, motion, and mobile behavior.
4. Implement the redesign in small, reviewable commits.
5. Verify with npm run check, npm run build, git diff --check, and browser screenshots.
6. Re-check key production/base-path routes:
   - /HomePage/
   - /HomePage/course-notes/
   - /HomePage/paper-reading/
   - /HomePage/about/
   - one course-note detail page
   - one paper-reading detail page

Frontend bar:
The homepage should communicate identity, academic direction, current focus, and writing within the first viewport. Article pages should feel like serious long-form technical documents with strong typography, metadata, TOC, callouts, code/table handling, and print/mobile behavior. The result should be visibly custom and polished, not just a color tweak.

Deliverable:
Implement the redesign, verify it, and summarize exact files changed plus remaining risks.
```

