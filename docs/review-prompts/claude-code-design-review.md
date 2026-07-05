# Claude Code Design Review Prompt

Use this prompt in Claude Code from the repository root:

```text
You are reviewing the design specification for a personal academic homepage.

Repository root:
C:\Users\wyz16\HomePage

Primary file to review:
docs/superpowers/specs/2026-07-05-homepage-design.md

Related review-disposition file:
docs/superpowers/specs/2026-07-05-claude-review-disposition.md

Context:
The site is for Yongzhe Wang / Wang Yongzhe. It is primarily an academic personal homepage, but the owner previously worked as a frontend engineer, so the frontend design quality must be high. The site should not look like a generic academic template, a placeholder shell, or a terminal gimmick. It should be a refined academic knowledge product with strong long-form course-note and paper-reading pages.

Important user intent:
- Academic credibility matters.
- Frontend craft matters because visitors may judge the owner's previous frontend background.
- Course notes and paper reading pages must be detailed, polished, and maintainable.
- Each article may have a different structure, but the presentation should feel coherent.
- The stack should be modern, stable, static-first, and suitable for a homepage that may live for many years.
- Do not propose fake Publications/Projects sections before there is real content.

Please review the design spec only. Do not implement code yet. This is a follow-up review after earlier reviews found "implementation would need to guess" gaps. Focus especially on whether the current spec now makes the necessary v1 product, visual, content-model, deployment, accessibility, and verification decisions explicit.

What to check:

1. Product direction
- Does the spec correctly avoid the earlier overemphasis on "command center" or terminal gimmicks?
- Does it clearly define the site as a premium academic knowledge product?
- Is the v1 scope realistic for a first public version?
- Are the success criteria specific enough to guide implementation?

2. Information architecture
- Are Home, Course Notes, Paper Reading, Learning Map, and About well separated?
- Are future sections handled honestly without making the public site look empty?
- Are the route choices clear and scalable?
- Is anything missing for an academic homepage at this stage?

3. Course note and paper reading detail pages
- Are the article templates detailed enough to avoid placeholder pages?
- Are the required metadata fields sufficient?
- Do the templates allow different article structures while preserving consistent presentation?
- Are long Chinese and English technical notes considered properly?

4. Frontend and visual design
- Does the visual standard set a high enough bar for someone with frontend background?
- Are the constraints specific enough to prevent generic template output?
- Are motion, typography, layout, responsiveness, and accessibility covered well?
- Are there any visual requirements that are too vague or too risky?

5. Technical architecture
- Is Astro + React islands + TypeScript + MDX + Tailwind a good fit?
- Are any dependencies unnecessary, risky, or missing?
- Does the dependency policy balance "modern" and "stable" well?
- Is the site still static-first and deployable to GitHub Pages or Cloudflare Pages?

6. Content model and maintainability
- Are Astro content collections and frontmatter schemas sufficient?
- Is the authoring workflow simple enough for long-term use?
- Are related notes, tags, reading status, bilingual content, and learning-map data modeled well?
- Are build-time validations strong enough?

7. Accessibility, performance, and SEO
- Are reduced motion, keyboard access, mobile reading, and contrast considered?
- Are long articles, code blocks, and tables handled safely on mobile?
- Are metadata, canonical URLs, Open Graph, and article SEO requirements missing?
- Are there bundle-size or performance risks in search, learning map, or animation?

8. Testing and acceptance criteria
- Are the verification steps concrete enough?
- Are there missing checks before public deployment?
- Should the spec require screenshots, Lighthouse checks, or Playwright smoke tests?

9. Review-disposition accuracy
- Does the disposition file accurately represent the changes in the revised spec?
- Are any previously important issues still unresolved despite being marked accepted?
- Are any deferred decisions actually necessary before implementation?
- Are the second-review local fixes reflected in the spec without introducing new contradictions?

Output format:

### Strengths
List specific strengths of the spec.

### Critical Issues
Only issues that would make the design fail its stated goal.

### Important Issues
Gaps, ambiguities, scope risks, missing requirements, or architecture problems that should be fixed before implementation.

### Minor Issues
Polish, wording, organization, or nice-to-have improvements.

### Recommended Spec Changes
Give concrete edits or sections to add. Be specific enough that another coding agent can patch the Markdown.

### Implementation Readiness
Answer one of:
- Ready for implementation
- Ready with minor edits
- Needs revision before implementation

Include a short technical reason for the verdict.

Rules:
- Be direct and critical. Do not just say it looks good.
- Ground feedback in the actual spec file.
- If something is vague, say exactly why it could cause bad implementation.
- Do not implement code or change files during this review.
- Do not suggest adding backend/CMS/database features unless absolutely necessary.
```
