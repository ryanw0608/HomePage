# Homepage Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working Astro vertical slice for Yongzhe Wang's academic homepage: static shell, typed content collections, one course note, one paper reading, article layouts, homepage, search hooks, and verification scaffolding.

**Architecture:** Astro owns routing, static generation, MDX, SEO, RSS, and sitemap. React is reserved for future interactive islands; this first pass keeps core pages readable without client-side JavaScript. Content metadata is validated through Astro content collections and shared helper modules.

**Tech Stack:** Astro 7, TypeScript, MDX, React 19 islands, Tailwind CSS 4 via `@tailwindcss/vite`, Pagefind, remark-math, rehype-katex, Astro sitemap/RSS/check, Shiki highlighting.

---

## Scope

This plan implements the first runnable foundation, not the entire polished public v1. It creates enough site code to validate routing, content schemas, article pages, homepage structure, base-path behavior, and build checks.

## Planned File Structure

- Create `package.json`: scripts and dependencies.
- Create `astro.config.mjs`: Astro integrations, GitHub Pages project base, Tailwind Vite plugin.
- Create `tsconfig.json`: strict TypeScript settings.
- Create `.gitignore`: Node, Astro, Pagefind, and build outputs.
- Create `src/styles/global.css`: Tailwind import, tokens, typography, responsive article defaults.
- Create `src/content/config.ts`: course note and paper reading schemas.
- Create `src/data/profile.ts`: profile, links, current focus.
- Create `src/data/taxonomy.ts`: controlled courses, areas, and tags.
- Create `src/data/learning-map.ts`: lightweight learning map preview data.
- Create `src/lib/site.ts`: site metadata, language mapping, base-aware helpers.
- Create `src/lib/content.ts`: sorting, filtering, draft exclusion, reading-time helpers.
- Create `src/layouts/SiteShell.astro`: HTML shell, SEO defaults, nav, footer, theme script.
- Create `src/layouts/ArticleLayout.astro`: article frame, metadata, table of contents, related links.
- Create `src/components/NoteCard.astro`, `ArticleMeta.astro`, `ArticleTOC.astro`, `LearningMapPreview.astro`, `ThemeToggle.astro`.
- Create `src/components/mdx/Callout.astro`, `Figure.astro`, `KeyTakeaways.astro`.
- Create `src/pages/index.astro`, `about.astro`, `404.astro`, `rss.xml.ts`, `course-notes/index.astro`, `course-notes/[slug].astro`, `paper-reading/index.astro`, `paper-reading/[slug].astro`.
- Create `src/content/course-notes/ml-foundations-gradient-descent.mdx`.
- Create `src/content/paper-reading/attention-is-all-you-need.mdx`.
- Create `.github/workflows/ci.yml`.
- Create `docs/deployment.md`.

---

### Task 1: Project Scaffolding And Dependencies

**Files:**
- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `.gitignore`

- [ ] **Step 1: Create `package.json`**

Write this file:

```json
{
  "name": "homepage",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro check && astro build && pagefind --site dist",
    "preview": "astro preview",
    "check": "astro check",
    "verify": "npm run build"
  },
  "dependencies": {
    "@astrojs/check": "^0.9.9",
    "@astrojs/mdx": "^7.0.2",
    "@astrojs/react": "^6.0.1",
    "@astrojs/rss": "^4.0.19",
    "@astrojs/sitemap": "^3.7.3",
    "@tailwindcss/vite": "^4.3.2",
    "astro": "^7.0.6",
    "pagefind": "^1.5.2",
    "react": "^19.2.7",
    "react-dom": "^19.2.7",
    "rehype-katex": "^7.0.1",
    "remark-math": "^6.0.0",
    "tailwindcss": "^4.3.2",
    "typescript": "^6.0.3"
  }
}
```

- [ ] **Step 2: Create `astro.config.mjs`**

```js
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

export default defineConfig({
  site: "https://ryanw0608.github.io",
  base: "/HomePage/",
  trailingSlash: "always",
  output: "static",
  integrations: [
    mdx({
      syntaxHighlight: "shiki",
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex]
    }),
    react(),
    sitemap()
  ],
  vite: {
    plugins: [tailwindcss()]
  }
});
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

- [ ] **Step 4: Create `.gitignore`**

```gitignore
node_modules/
dist/
.astro/
.pagefind/
pagefind/
.env
.env.*
!.env.example
```

- [ ] **Step 5: Install dependencies**

Run: `npm install`

Expected: dependencies install and `package-lock.json` is created.

- [ ] **Step 6: Verify Astro is callable**

Run: `npm run check`

Expected: Astro runs. It may fail until `src/` exists; if it fails only because no source files exist, continue to Task 2.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json astro.config.mjs tsconfig.json .gitignore
git commit -m "Set up Astro project foundation"
```

---

### Task 2: Design Tokens, Global Styles, And Site Shell

**Files:**
- Create: `src/styles/global.css`
- Create: `src/lib/site.ts`
- Create: `src/layouts/SiteShell.astro`
- Create: `src/components/ThemeToggle.astro`

- [ ] **Step 1: Create directories**

Run: `mkdir src src\styles src\lib src\layouts src\components`

Expected: directories exist.

- [ ] **Step 2: Create `src/lib/site.ts`**

```ts
export const site = {
  name: "Yongzhe Wang",
  secondaryName: "Wang Yongzhe",
  title: "Yongzhe Wang",
  description: "Academic homepage, course notes, and paper reading notes by Yongzhe Wang.",
  url: "https://ryanw0608.github.io/HomePage/"
};

export type ContentLanguage = "zh" | "en" | "mixed";
export type PrimaryLanguage = "zh" | "en";

export function htmlLang(language: ContentLanguage, primaryLanguage?: PrimaryLanguage): "zh-CN" | "en" {
  if (language === "zh") return "zh-CN";
  if (language === "en") return "en";
  return primaryLanguage === "zh" ? "zh-CN" : "en";
}

export function absoluteUrl(pathname: string): string {
  return new URL(pathname.replace(/^\//, ""), site.url).toString();
}
```

- [ ] **Step 3: Create `src/styles/global.css`**

```css
@import "tailwindcss";

:root {
  color-scheme: light;
  --bg: #f7f3ea;
  --surface: #fffaf0;
  --surface-strong: #ffffff;
  --text: #171717;
  --muted: #5f6368;
  --border: #d8d2c4;
  --accent: #0f766e;
  --accent-2: #b45309;
  --focus: #2563eb;
}

:root[data-theme="dark"] {
  color-scheme: dark;
  --bg: #101214;
  --surface: #171a1f;
  --surface-strong: #20242b;
  --text: #f4f1e8;
  --muted: #b7b3a8;
  --border: #343941;
  --accent: #5eead4;
  --accent-2: #fbbf24;
  --focus: #93c5fd;
}

html {
  background: var(--bg);
  color: var(--text);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

body {
  margin: 0;
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
}

a {
  color: inherit;
}

:focus-visible {
  outline: 3px solid var(--focus);
  outline-offset: 3px;
}

.container {
  width: min(1120px, calc(100% - 32px));
  margin-inline: auto;
}

.article-body {
  font-size: 1.0625rem;
  line-height: 1.72;
  overflow-wrap: anywhere;
}

.article-body :where(p, ul, ol, blockquote, pre, table) {
  margin-block: 1rem;
}

.article-body :where(h2, h3) {
  scroll-margin-top: 6rem;
  line-height: 1.2;
}

.wide-scroll {
  overflow-x: auto;
  max-width: 100%;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}

@media print {
  nav, footer, .no-print {
    display: none !important;
  }
  body {
    background: white;
    color: black;
  }
}
```

- [ ] **Step 4: Create `src/components/ThemeToggle.astro`**

```astro
<button class="theme-toggle no-print" type="button" data-theme-toggle aria-label="Toggle theme">
  Theme
</button>

<script>
  const button = document.querySelector("[data-theme-toggle]");
  button?.addEventListener("click", () => {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    localStorage.setItem("theme", next);
  });
</script>

<style>
  .theme-toggle {
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--surface);
    color: var(--text);
    padding: 0.45rem 0.75rem;
    font: inherit;
    cursor: pointer;
  }
</style>
```

- [ ] **Step 5: Create `src/layouts/SiteShell.astro`**

```astro
---
import "../styles/global.css";
import ThemeToggle from "@/components/ThemeToggle.astro";
import { site } from "@/lib/site";

interface Props {
  title?: string;
  description?: string;
  lang?: "en" | "zh-CN";
}

const { title = site.title, description = site.description, lang = "en" } = Astro.props;
const pageTitle = title === site.title ? title : `${title} | ${site.title}`;
---

<!doctype html>
<html lang={lang}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{pageTitle}</title>
    <meta name="description" content={description} />
    <meta name="generator" content={Astro.generator} />
    <script is:inline>
      const stored = localStorage.getItem("theme");
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.dataset.theme = stored || (systemDark ? "dark" : "light");
    </script>
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to content</a>
    <header class="site-header">
      <nav class="container nav" aria-label="Primary navigation">
        <a class="brand" href={Astro.site ? new URL(Astro.url.pathname === "/" ? "." : "/", Astro.site).pathname : "/"}>{site.name}</a>
        <div class="nav-links">
          <a href={Astro.site ? `${import.meta.env.BASE_URL}course-notes/` : "/course-notes/"}>Course Notes</a>
          <a href={Astro.site ? `${import.meta.env.BASE_URL}paper-reading/` : "/paper-reading/"}>Paper Reading</a>
          <a href={Astro.site ? `${import.meta.env.BASE_URL}about/` : "/about/"}>About</a>
          <ThemeToggle />
        </div>
      </nav>
    </header>
    <main id="main">
      <slot />
    </main>
    <footer class="container footer">
      <p>© {new Date().getFullYear()} {site.name}. Academic notes and reading logs.</p>
    </footer>
  </body>
</html>

<style>
  .skip-link {
    position: absolute;
    left: 1rem;
    top: 1rem;
    transform: translateY(-200%);
    background: var(--surface-strong);
    border: 1px solid var(--border);
    padding: 0.5rem 0.75rem;
    z-index: 20;
  }
  .skip-link:focus {
    transform: translateY(0);
  }
  .site-header {
    border-bottom: 1px solid var(--border);
    background: color-mix(in oklab, var(--bg) 88%, transparent);
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 64px;
    gap: 1rem;
  }
  .brand {
    font-weight: 750;
    text-decoration: none;
  }
  .nav-links {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .nav-links a {
    color: var(--muted);
    text-decoration: none;
  }
  .footer {
    border-top: 1px solid var(--border);
    color: var(--muted);
    margin-top: 4rem;
    padding-block: 2rem;
  }
</style>
```

- [ ] **Step 6: Run check**

Run: `npm run check`

Expected: source imports resolve. If failures point to files created in Task 3, continue after fixing only path/import mistakes from this task.

- [ ] **Step 7: Commit**

```bash
git add src package.json package-lock.json astro.config.mjs tsconfig.json
git commit -m "Add site shell and design tokens"
```

---

### Task 3: Typed Content Model And Seed Data

**Files:**
- Create: `src/content/config.ts`
- Create: `src/data/taxonomy.ts`
- Create: `src/data/profile.ts`
- Create: `src/data/learning-map.ts`
- Create: `src/lib/content.ts`

- [ ] **Step 1: Create `src/data/taxonomy.ts`**

```ts
export const courses = {
  "ml-foundations": {
    label: "Machine Learning Foundations",
    area: "machine-learning"
  }
} as const;

export const areas = {
  "machine-learning": { label: "Machine Learning" },
  "deep-learning": { label: "Deep Learning" },
  "systems": { label: "Systems" },
  "frontend-engineering": { label: "Frontend Engineering" }
} as const;

export const tags = {
  optimization: { label: "Optimization" },
  gradients: { label: "Gradients" },
  transformers: { label: "Transformers" },
  attention: { label: "Attention" },
  reading: { label: "Reading" }
} as const;

export type CourseId = keyof typeof courses;
export type AreaId = keyof typeof areas;
export type TagId = keyof typeof tags;
```

- [ ] **Step 2: Create `src/data/profile.ts`**

```ts
export const profile = {
  name: "Yongzhe Wang",
  secondaryName: "Wang Yongzhe",
  role: "Computer science learner and former frontend engineer",
  location: "Australia",
  summary:
    "I am building a public record of course notes, paper reading, and research interests while transitioning from frontend engineering toward academic work.",
  links: [
    { label: "GitHub", href: "https://github.com/ryanw0608" }
  ],
  currentFocus: [
    {
      id: "machine-learning",
      label: "Machine Learning Foundations",
      description: "Optimization, gradients, representation learning, and core model families."
    },
    {
      id: "paper-reading",
      label: "Paper Reading",
      description: "Structured reviews that capture ideas, assumptions, limitations, and follow-up questions."
    },
    {
      id: "frontend-engineering",
      label: "Frontend Craft",
      description: "High-quality reading interfaces, typography, accessibility, and long-lived static sites."
    }
  ]
} as const;
```

- [ ] **Step 3: Create `src/content/config.ts`**

```ts
import { defineCollection, z } from "astro:content";
import { courses, areas, tags } from "@/data/taxonomy";

const language = z.enum(["zh", "en", "mixed"]);
const primaryLanguage = z.enum(["zh", "en"]).optional();
const courseIds = Object.keys(courses) as [keyof typeof courses, ...Array<keyof typeof courses>];
const areaIds = Object.keys(areas) as [keyof typeof areas, ...Array<keyof typeof areas>];
const tagIds = Object.keys(tags) as [keyof typeof tags, ...Array<keyof typeof tags>];

const shared = {
  title: z.string().min(1),
  description: z.string().min(1),
  summary: z.string().min(1),
  date: z.coerce.date(),
  updated: z.coerce.date().optional(),
  language,
  primaryLanguage,
  tags: z.array(z.enum(tagIds)),
  featured: z.boolean().default(false),
  draft: z.boolean().default(false),
  math: z.boolean().default(false)
};

const courseNotes = defineCollection({
  type: "content",
  schema: z.object({
    ...shared,
    course: z.enum(courseIds),
    status: z.enum(["active", "complete", "evergreen"]),
    term: z.string().optional(),
    order: z.number().optional(),
    areas: z.array(z.enum(areaIds)).default([])
  }).superRefine((value, ctx) => {
    if (value.language === "mixed" && !value.primaryLanguage) {
      ctx.addIssue({ code: "custom", message: "mixed language entries require primaryLanguage" });
    }
  })
});

const paperReading = defineCollection({
  type: "content",
  schema: z.object({
    ...shared,
    paperTitle: z.string().min(1),
    authors: z.array(z.string().min(1)).min(1),
    year: z.number().int(),
    status: z.enum(["queued", "reading", "skimmed", "reviewed", "revisit"]),
    area: z.enum(areaIds),
    venue: z.string().optional(),
    doi: z.string().optional(),
    arxivId: z.string().optional(),
    paperUrl: z.string().url().optional(),
    codeUrl: z.string().url().optional(),
    projectUrl: z.string().url().optional(),
    takeaways: z.array(z.string()).default([])
  }).superRefine((value, ctx) => {
    if (value.language === "mixed" && !value.primaryLanguage) {
      ctx.addIssue({ code: "custom", message: "mixed language entries require primaryLanguage" });
    }
    if (value.status === "queued" && !value.draft) {
      ctx.addIssue({ code: "custom", message: "queued paper readings must be draft-only" });
    }
  })
});

export const collections = {
  "course-notes": courseNotes,
  "paper-reading": paperReading
};
```

- [ ] **Step 4: Create `src/lib/content.ts`**

```ts
import type { CollectionEntry } from "astro:content";

export function publicEntries<T extends { data: { draft?: boolean } }>(entries: T[]): T[] {
  return import.meta.env.PROD ? entries.filter((entry) => !entry.data.draft) : entries;
}

export function byDateDesc<T extends { data: { date: Date } }>(a: T, b: T): number {
  return b.data.date.getTime() - a.data.date.getTime();
}

export function readingTime(text: string): number {
  const cjk = Array.from(text.matchAll(/[\u4e00-\u9fff]/g)).length;
  const words = text.replace(/[\u4e00-\u9fff]/g, " ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(cjk / 450 + words / 220));
}

export type CourseNote = CollectionEntry<"course-notes">;
export type PaperReading = CollectionEntry<"paper-reading">;
```

- [ ] **Step 5: Create `src/data/learning-map.ts`**

```ts
export const learningMapNodes = [
  {
    id: "machine-learning",
    label: "Machine Learning",
    type: "area",
    summary: "Optimization, gradients, model families, and reading foundations."
  },
  {
    id: "attention",
    label: "Attention",
    type: "method",
    summary: "A core neural network mechanism explored through paper reading."
  }
] as const;

export const learningMapEdges = [
  { from: "machine-learning", to: "attention", kind: "related" }
] as const;
```

- [ ] **Step 6: Run check**

Run: `npm run check`

Expected: collections and imports type-check.

- [ ] **Step 7: Commit**

```bash
git add src/content/config.ts src/data src/lib/content.ts
git commit -m "Define typed content model"
```

---

### Task 4: Seed MDX Content And MDX Components

**Files:**
- Create: `src/components/mdx/Callout.astro`
- Create: `src/components/mdx/Figure.astro`
- Create: `src/components/mdx/KeyTakeaways.astro`
- Create: `src/content/course-notes/ml-foundations-gradient-descent.mdx`
- Create: `src/content/paper-reading/attention-is-all-you-need.mdx`

- [ ] **Step 1: Create MDX component directory**

Run: `mkdir src\components\mdx`

Expected: directory exists.

- [ ] **Step 2: Create `src/components/mdx/Callout.astro`**

```astro
---
interface Props {
  type?: "note" | "insight" | "warning" | "question";
  title?: string;
}
const { type = "note", title = "Note" } = Astro.props;
---

<aside class={`callout callout-${type}`}>
  <strong>{title}</strong>
  <slot />
</aside>

<style>
  .callout {
    border: 1px solid var(--border);
    border-left: 4px solid var(--accent);
    border-radius: 0.75rem;
    background: var(--surface);
    padding: 1rem;
  }
  .callout-warning {
    border-left-color: var(--accent-2);
  }
</style>
```

- [ ] **Step 3: Create `src/components/mdx/Figure.astro`**

```astro
---
interface Props {
  src: string;
  alt: string;
  caption: string;
  source?: string;
  sourceUrl?: string;
}
const { src, alt, caption, source, sourceUrl } = Astro.props;
---

<figure>
  <img src={src} alt={alt} loading="lazy" />
  <figcaption>
    {caption}
    {source && sourceUrl && <span> Source: <a href={sourceUrl}>{source}</a>.</span>}
    {source && !sourceUrl && <span> Source: {source}.</span>}
  </figcaption>
</figure>
```

- [ ] **Step 4: Create `src/components/mdx/KeyTakeaways.astro`**

```astro
---
interface Props {
  items: string[];
}
const { items } = Astro.props;
---

<section class="takeaways" aria-labelledby="key-takeaways">
  <h2 id="key-takeaways">Key Takeaways</h2>
  <ul>
    {items.map((item) => <li>{item}</li>)}
  </ul>
</section>
```

- [ ] **Step 5: Create course note MDX**

Write `src/content/course-notes/ml-foundations-gradient-descent.mdx`:

```mdx
---
title: "Gradient Descent as an Optimization Baseline"
description: "A compact course note on gradient descent, loss landscapes, and learning-rate intuition."
summary: "Gradient descent updates parameters in the direction that most rapidly decreases a differentiable objective. This note records the core idea, a small worked example, and common confusions around learning rates."
course: "ml-foundations"
date: "2026-07-06"
language: "en"
status: "active"
tags: ["optimization", "gradients"]
areas: ["machine-learning"]
featured: true
math: true
---

## Overview

Gradient descent is the baseline optimization method behind many machine-learning training loops. Given a differentiable loss function, it repeatedly moves parameters in the negative gradient direction.

## Key Concepts

- The gradient points in the direction of steepest local increase.
- The negative gradient is a local descent direction.
- The learning rate controls the update size.

## Detailed Notes

For parameters \( \theta \), objective \( J(\theta) \), and learning rate \( \eta \), the basic update is:

\[
\theta_{t+1} = \theta_t - \eta \nabla_\theta J(\theta_t)
\]

## Worked Examples

For \( J(w) = (w - 3)^2 \), the derivative is \( 2(w - 3) \). Starting from \( w = 0 \) and using \( \eta = 0.1 \), the first update moves to \( w = 0.6 \).

## Mistakes And Confusions

A learning rate that is too large can jump over a minimum. A learning rate that is too small can make useful progress hard to observe.

## Summary

Gradient descent is simple, local, and sensitive to scale. It is a useful anchor for understanding more advanced optimizers.

## References

- Standard optimization notes from machine learning coursework.
```

- [ ] **Step 6: Create paper reading MDX**

Write `src/content/paper-reading/attention-is-all-you-need.mdx`:

```mdx
---
title: "Reading: Attention Is All You Need"
description: "A structured reading note on the Transformer architecture and its attention-first design."
summary: "The paper replaces recurrence and convolution with stacked self-attention and feed-forward blocks, making sequence modeling more parallelizable while preserving contextual token interactions."
paperTitle: "Attention Is All You Need"
authors: ["Ashish Vaswani", "Noam Shazeer", "Niki Parmar", "Jakob Uszkoreit", "Llion Jones", "Aidan N. Gomez", "Lukasz Kaiser", "Illia Polosukhin"]
year: 2017
venue: "NeurIPS"
date: "2026-07-06"
language: "en"
status: "reviewed"
area: "deep-learning"
tags: ["transformers", "attention", "reading"]
paperUrl: "https://arxiv.org/abs/1706.03762"
takeaways:
  - "Self-attention gives every token a direct path to every other token in a sequence."
  - "The architecture improves parallelism compared with recurrent sequence models."
  - "Positional encodings are needed because attention alone has no built-in token order."
featured: true
math: true
---

## Short Answer

The Transformer is a sequence model built around self-attention rather than recurrence. Its central move is to make token-to-token interaction explicit and highly parallelizable.

## Why This Paper Matters

The paper introduced an architecture that became a foundation for modern language models. It is worth reading carefully because many later systems inherit its vocabulary and design constraints.

## Prerequisites

Useful background includes embeddings, softmax, matrix multiplication, sequence-to-sequence learning, and basic neural-network optimization.

## Problem Setting

The original experiments focus on machine translation, where the model maps an input token sequence to an output token sequence.

## Core Idea

Scaled dot-product attention computes weights between queries and keys, then uses those weights to mix values:

\[
\text{Attention}(Q, K, V) = \text{softmax}(QK^T / \sqrt{d_k})V
\]

## Method Breakdown

The model stacks encoder and decoder blocks. Each block combines multi-head attention, feed-forward layers, residual connections, and normalization.

## Experiments

The paper evaluates translation quality and training cost, showing strong results with better parallel training behavior than recurrent baselines.

## Strengths

The architecture is clean, parallel, and modular. Multi-head attention also gives the model multiple representation subspaces.

## Limitations

Self-attention has quadratic sequence-length cost in the standard form. The paper also relies on positional encodings to represent order.

## Critical Analysis

The design trades recurrence for dense pairwise token interaction. That trade works extremely well for many tasks, but it makes long-context efficiency a central systems problem.

## Possible Improvements

Later work can be read as improving efficiency, positional modeling, training stability, and scaling behavior.

## Personal Takeaways

The paper is not only an architecture proposal; it is a shift in what sequence-model computation should look like.

## References

- Vaswani et al., "Attention Is All You Need", 2017.
```

- [ ] **Step 7: Run check**

Run: `npm run check`

Expected: MDX frontmatter validates.

- [ ] **Step 8: Commit**

```bash
git add src/components/mdx src/content
git commit -m "Add seed academic notes"
```

---

### Task 5: Article Layouts And Content Routes

**Files:**
- Create: `src/components/ArticleMeta.astro`
- Create: `src/components/ArticleTOC.astro`
- Create: `src/components/NoteCard.astro`
- Create: `src/layouts/ArticleLayout.astro`
- Create: `src/pages/course-notes/index.astro`
- Create: `src/pages/course-notes/[slug].astro`
- Create: `src/pages/paper-reading/index.astro`
- Create: `src/pages/paper-reading/[slug].astro`

- [ ] **Step 1: Create route directories**

Run: `mkdir src\pages src\pages\course-notes src\pages\paper-reading`

Expected: directories exist.

- [ ] **Step 2: Create `src/components/NoteCard.astro`**

```astro
---
interface Props {
  href: string;
  title: string;
  summary: string;
  meta: string;
  tags: string[];
}
const { href, title, summary, meta, tags } = Astro.props;
---

<article class="note-card">
  <a href={href}>
    <span class="meta">{meta}</span>
    <h2>{title}</h2>
    <p>{summary}</p>
    <ul aria-label="Tags">
      {tags.map((tag) => <li>{tag}</li>)}
    </ul>
  </a>
</article>

<style>
  .note-card {
    border: 1px solid var(--border);
    border-radius: 0.9rem;
    background: var(--surface);
    padding: 1rem;
  }
  .note-card a {
    text-decoration: none;
  }
  .meta {
    color: var(--muted);
    font-size: 0.875rem;
  }
  ul {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    list-style: none;
    padding: 0;
  }
  li {
    border: 1px solid var(--border);
    border-radius: 999px;
    color: var(--muted);
    padding: 0.2rem 0.55rem;
    font-size: 0.8rem;
  }
</style>
```

- [ ] **Step 3: Create `src/components/ArticleMeta.astro`**

```astro
---
interface Props {
  items: Array<{ label: string; value: string }>;
}
const { items } = Astro.props;
---

<aside class="article-meta" aria-label="Article metadata">
  {items.map((item) => (
    <div>
      <dt>{item.label}</dt>
      <dd>{item.value}</dd>
    </div>
  ))}
</aside>

<style>
  .article-meta {
    border: 1px solid var(--border);
    border-radius: 0.9rem;
    background: var(--surface);
    display: grid;
    gap: 0.75rem;
    padding: 1rem;
  }
  dt {
    color: var(--muted);
    font-size: 0.78rem;
    text-transform: uppercase;
  }
  dd {
    margin: 0.15rem 0 0;
  }
</style>
```

- [ ] **Step 4: Create `src/components/ArticleTOC.astro`**

```astro
---
interface Props {
  headings: Array<{ depth: number; slug: string; text: string }>;
}
const { headings } = Astro.props;
const visibleHeadings = headings.filter((heading) => heading.depth === 2 || heading.depth === 3);
---

{visibleHeadings.length > 0 && (
  <nav class="toc no-print" aria-label="Table of contents">
    <strong>On this page</strong>
    <ol>
      {visibleHeadings.map((heading) => (
        <li class={`depth-${heading.depth}`}>
          <a href={`#${heading.slug}`}>{heading.text}</a>
        </li>
      ))}
    </ol>
  </nav>
)}

<style>
  .toc {
    border-left: 1px solid var(--border);
    color: var(--muted);
    font-size: 0.9rem;
    padding-left: 1rem;
    position: sticky;
    top: 88px;
  }
  ol {
    list-style: none;
    padding: 0;
  }
  .depth-3 {
    padding-left: 1rem;
  }
  a {
    text-decoration: none;
  }
</style>
```

- [ ] **Step 5: Create `src/layouts/ArticleLayout.astro`**

```astro
---
import SiteShell from "@/layouts/SiteShell.astro";
import ArticleMeta from "@/components/ArticleMeta.astro";
import ArticleTOC from "@/components/ArticleTOC.astro";

interface Props {
  title: string;
  description: string;
  lang?: "en" | "zh-CN";
  headings: Array<{ depth: number; slug: string; text: string }>;
  meta: Array<{ label: string; value: string }>;
}

const { title, description, lang = "en", headings, meta } = Astro.props;
---

<SiteShell title={title} description={description} lang={lang}>
  <article class="container article-shell">
    <header class="article-header">
      <a class="back-link" href="javascript:history.length > 1 ? history.back() : '/'">Back</a>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
    <div class="article-grid">
      <ArticleMeta items={meta} />
      <div class="article-body">
        <slot />
      </div>
      <ArticleTOC headings={headings} />
    </div>
  </article>
</SiteShell>

<style>
  .article-shell {
    padding-block: 3rem;
  }
  .article-header {
    max-width: 780px;
    margin-bottom: 2rem;
  }
  .article-header h1 {
    font-size: clamp(2rem, 5vw, 4rem);
    line-height: 1.02;
    margin: 0.5rem 0;
  }
  .back-link {
    color: var(--muted);
  }
  .article-grid {
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr) 220px;
    gap: 2rem;
    align-items: start;
  }
  @media (max-width: 980px) {
    .article-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
```

- [ ] **Step 6: Create course index and detail routes**

Write `src/pages/course-notes/index.astro`:

```astro
---
import { getCollection } from "astro:content";
import SiteShell from "@/layouts/SiteShell.astro";
import NoteCard from "@/components/NoteCard.astro";
import { byDateDesc, publicEntries } from "@/lib/content";
import { courses } from "@/data/taxonomy";

const notes = publicEntries(await getCollection("course-notes")).sort(byDateDesc);
---

<SiteShell title="Course Notes" description="Course learning notes by Yongzhe Wang.">
  <section class="container">
    <h1>Course Notes</h1>
    <div class="note-list">
      {notes.map((note) => (
        <NoteCard
          href={`${import.meta.env.BASE_URL}course-notes/${note.slug}/`}
          title={note.data.title}
          summary={note.data.summary}
          meta={`${courses[note.data.course].label} · ${note.data.date.toISOString().slice(0, 10)}`}
          tags={note.data.tags}
        />
      ))}
    </div>
  </section>
</SiteShell>
```

Write `src/pages/course-notes/[slug].astro`:

```astro
---
import { getCollection, render } from "astro:content";
import ArticleLayout from "@/layouts/ArticleLayout.astro";
import { htmlLang } from "@/lib/site";
import { publicEntries } from "@/lib/content";
import { courses } from "@/data/taxonomy";

export async function getStaticPaths() {
  const notes = publicEntries(await getCollection("course-notes"));
  return notes.map((note) => ({ params: { slug: note.slug }, props: { note } }));
}

const { note } = Astro.props;
const { Content, headings } = await render(note);
const lang = htmlLang(note.data.language, note.data.primaryLanguage);
---

<ArticleLayout
  title={note.data.title}
  description={note.data.description}
  lang={lang}
  headings={headings}
  meta={[
    { label: "Course", value: courses[note.data.course].label },
    { label: "Date", value: note.data.date.toISOString().slice(0, 10) },
    { label: "Status", value: note.data.status }
  ]}
>
  <Content />
</ArticleLayout>
```

- [ ] **Step 7: Create paper index route**

Write `src/pages/paper-reading/index.astro`:

```astro
---
import { getCollection } from "astro:content";
import SiteShell from "@/layouts/SiteShell.astro";
import NoteCard from "@/components/NoteCard.astro";
import { byDateDesc, publicEntries } from "@/lib/content";

const readings = publicEntries(await getCollection("paper-reading")).sort(byDateDesc);
---

<SiteShell title="Paper Reading" description="Structured paper reading notes by Yongzhe Wang.">
  <section class="container">
    <h1>Paper Reading</h1>
    <div class="note-list">
      {readings.map((paper) => (
        <NoteCard
          href={`${import.meta.env.BASE_URL}paper-reading/${paper.slug}/`}
          title={paper.data.title}
          summary={paper.data.summary}
          meta={`${paper.data.paperTitle} · ${paper.data.year} · ${paper.data.status}`}
          tags={paper.data.tags}
        />
      ))}
    </div>
  </section>
</SiteShell>
```

- [ ] **Step 8: Create paper detail route**

Write `src/pages/paper-reading/[slug].astro`:

```astro
---
import { getCollection, render } from "astro:content";
import ArticleLayout from "@/layouts/ArticleLayout.astro";
import { htmlLang } from "@/lib/site";
import { publicEntries } from "@/lib/content";

export async function getStaticPaths() {
  const readings = publicEntries(await getCollection("paper-reading"));
  return readings.map((paper) => ({ params: { slug: paper.slug }, props: { paper } }));
}

const { paper } = Astro.props;
const { Content, headings } = await render(paper);
const lang = htmlLang(paper.data.language, paper.data.primaryLanguage);
---

<ArticleLayout
  title={paper.data.title}
  description={paper.data.description}
  lang={lang}
  headings={headings}
  meta={[
    { label: "Paper", value: paper.data.paperTitle },
    { label: "Year", value: String(paper.data.year) },
    { label: "Status", value: paper.data.status }
  ]}
>
  <Content />
</ArticleLayout>
```

- [ ] **Step 9: Run build**

Run: `npm run build`

Expected: routes build and Pagefind indexes `dist`.

- [ ] **Step 10: Commit**

```bash
git add src/components src/layouts src/pages
git commit -m "Add article routes and indexes"
```

---

### Task 6: Homepage, About, Feeds, 404, And CI

**Files:**
- Create: `src/components/LearningMapPreview.astro`
- Create: `src/pages/index.astro`
- Create: `src/pages/about.astro`
- Create: `src/pages/404.astro`
- Create: `src/pages/rss.xml.ts`
- Create: `.github/workflows/ci.yml`
- Create: `docs/deployment.md`

- [ ] **Step 1: Create `src/components/LearningMapPreview.astro`**

```astro
---
import { learningMapNodes, learningMapEdges } from "@/data/learning-map";
---

<section class="learning-map" aria-labelledby="learning-map-title">
  <h2 id="learning-map-title">Learning Map</h2>
  <p>A lightweight view of current topics and connections.</p>
  <ul>
    {learningMapNodes.map((node) => (
      <li>
        <strong>{node.label}</strong>
        {node.summary && <span>{node.summary}</span>}
      </li>
    ))}
  </ul>
  <p class="meta">{learningMapEdges.length} connection recorded.</p>
</section>
```

- [ ] **Step 2: Create homepage**

Write `src/pages/index.astro`:

```astro
---
import { getCollection } from "astro:content";
import SiteShell from "@/layouts/SiteShell.astro";
import NoteCard from "@/components/NoteCard.astro";
import LearningMapPreview from "@/components/LearningMapPreview.astro";
import { profile } from "@/data/profile";
import { byDateDesc, publicEntries } from "@/lib/content";

const courseNotes = publicEntries(await getCollection("course-notes")).sort(byDateDesc).slice(0, 2);
const paperReadings = publicEntries(await getCollection("paper-reading")).sort(byDateDesc).slice(0, 2);
---

<SiteShell title="Yongzhe Wang" description="Academic homepage, course notes, and paper reading notes by Yongzhe Wang.">
  <section class="container hero">
    <p class="eyebrow">{profile.secondaryName}</p>
    <h1>{profile.name}</h1>
    <p>{profile.summary}</p>
    <p>Former frontend engineer building a long-lived academic knowledge base with course notes and paper reading.</p>
  </section>

  <section class="container">
    <h2>Current Focus</h2>
    <div class="focus-grid">
      {profile.currentFocus.map((focus) => (
        <article>
          <h3>{focus.label}</h3>
          <p>{focus.description}</p>
        </article>
      ))}
    </div>
  </section>

  <section class="container">
    <h2>Latest Writing</h2>
    <div class="note-list">
      {[...courseNotes, ...paperReadings].map((entry) => (
        <NoteCard
          href={`${import.meta.env.BASE_URL}${entry.collection === "course-notes" ? "course-notes" : "paper-reading"}/${entry.slug}/`}
          title={entry.data.title}
          summary={entry.data.summary}
          meta={`${entry.collection} · ${entry.data.date.toISOString().slice(0, 10)}`}
          tags={entry.data.tags}
        />
      ))}
    </div>
  </section>

  <section class="container">
    <LearningMapPreview />
  </section>
</SiteShell>

<style>
  .hero {
    padding-block: 5rem 3rem;
  }
  .eyebrow {
    color: var(--accent);
    font-weight: 700;
  }
  h1 {
    font-size: clamp(2.5rem, 8vw, 6rem);
    line-height: 0.96;
    margin: 0;
  }
  .focus-grid,
  .note-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1rem;
  }
  .focus-grid article {
    border: 1px solid var(--border);
    border-radius: 0.9rem;
    background: var(--surface);
    padding: 1rem;
  }
</style>
```

- [ ] **Step 3: Create About page**

Write `src/pages/about.astro`:

```astro
---
import SiteShell from "@/layouts/SiteShell.astro";
import { profile } from "@/data/profile";
---

<SiteShell title="About" description="About Yongzhe Wang.">
  <section class="container">
    <h1>About</h1>
    <p>{profile.name} ({profile.secondaryName}) is documenting a transition from frontend engineering toward academic study and research practice.</p>
    <p>The site focuses on durable course notes, structured paper reading, and a clear record of current learning interests.</p>
    <h2>Links</h2>
    <ul>
      {profile.links.map((link) => (
        <li><a href={link.href}>{link.label}</a></li>
      ))}
    </ul>
  </section>
</SiteShell>
```

- [ ] **Step 4: Create 404 page**

Write `src/pages/404.astro`:

```astro
---
import SiteShell from "@/layouts/SiteShell.astro";
---

<SiteShell title="Page not found" description="The requested page could not be found.">
  <section class="container">
    <h1>Page not found</h1>
    <p>This page does not exist or has moved.</p>
    <ul>
      <li><a href={import.meta.env.BASE_URL}>Home</a></li>
      <li><a href={`${import.meta.env.BASE_URL}course-notes/`}>Course Notes</a></li>
      <li><a href={`${import.meta.env.BASE_URL}paper-reading/`}>Paper Reading</a></li>
    </ul>
  </section>
</SiteShell>
```

- [ ] **Step 5: Create RSS route**

```ts
import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { publicEntries } from "@/lib/content";
import { site } from "@/lib/site";

export async function GET() {
  const courseNotes = publicEntries(await getCollection("course-notes"));
  const paperReadings = publicEntries(await getCollection("paper-reading"));
  const items = [...courseNotes, ...paperReadings]
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
    .map((entry) => ({
      title: entry.data.title,
      pubDate: entry.data.date,
      description: entry.data.summary,
      link: entry.collection === "course-notes"
        ? `/course-notes/${entry.slug}/`
        : `/paper-reading/${entry.slug}/`
    }));

  return rss({
    title: site.title,
    description: site.description,
    site: site.url,
    items
  });
}
```

- [ ] **Step 6: Create CI workflow**

Write `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run check
      - run: npm run build
```

- [ ] **Step 7: Create `docs/deployment.md`**

Write `docs/deployment.md`:

````markdown
# Deployment

The default deployment target is GitHub Pages as a project site from repository `HomePage`.

Required Astro settings:

- `site: "https://ryanw0608.github.io"`
- `base: "/HomePage/"`
- `trailingSlash: "always"`

Local verification:

```bash
npm ci
npm run build
npm run preview
```

Before switching to a user site or custom domain, update `astro.config.mjs` and re-check all internal links and assets under the new base URL.
````

- [ ] **Step 8: Run full verification**

Run: `npm run build`

Expected: build succeeds, `dist/` exists, Pagefind output exists.

- [ ] **Step 9: Commit**

```bash
git add src/pages src/components/LearningMapPreview.astro .github/workflows/ci.yml docs/deployment.md
git commit -m "Add homepage and deployment checks"
```

---

## Self-Review Checklist

- [ ] Spec coverage: first vertical slice covers static Astro project, content schemas, homepage, indexes, article pages, MDX content, RSS, sitemap, base path, and CI.
- [ ] Deferred spec items are deliberate: Lighthouse/axe automation, full search UI polish, full visual refinement, command palette, and full learning-map route are outside this first vertical slice.
- [ ] Marker scan: run `rg` over docs, source files, and config files for unfinished markers before committing.
- [ ] Type consistency: ensure `AreaId`, `CourseId`, `TagId`, `primaryLanguage`, `draft`, and `status` names match across schema, data, and routes.
- [ ] Verification: run `npm run build` after Task 6.

## Execution Handoff

Plan complete when this document is saved and committed. Execution options:

1. **Subagent-Driven (recommended)** - dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - execute tasks in this session using executing-plans, with checkpoints for review.
