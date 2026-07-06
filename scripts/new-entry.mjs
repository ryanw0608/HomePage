#!/usr/bin/env node
/*
 * Scaffold a new note with valid frontmatter.
 *
 *   npm run new:paper <slug> "<title>"
 *   npm run new:note  <slug> "<title>"
 *
 * Stamps today's date, draft: true, and enum defaults that pass astro check.
 * Refuses to overwrite existing files. Zero dependencies.
 */
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const [kind, slug, ...titleParts] = process.argv.slice(2);
const title = titleParts.join(" ");

if (!["paper", "course"].includes(kind ?? "") || !slug || !title) {
  console.error('usage: node scripts/new-entry.mjs <paper|course> <slug> "<title>"');
  process.exit(1);
}

if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
  console.error(`slug must be ascii kebab-case, got: ${slug}`);
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const collection = kind === "paper" ? "paper-reading" : "course-notes";
const target = path.join("src", "content", collection, `${slug}.mdx`);

if (existsSync(target)) {
  console.error(`refusing to overwrite existing ${target}`);
  process.exit(1);
}

const paperTemplate = `---
title: "Reading: ${title}"
description: "<one line for SEO and share cards>"
summary: "<2-3 sentence blurb shown on the index page>"
tldr: "<one-sentence English takeaway - required by site policy for zh notes>"
paperTitle: "${title}"
authors: ["TODO Author"]
year: ${new Date().getFullYear()}
venue: ""
date: "${today}"
language: "zh"
status: "reading"
area: "efficient-inference"
tags: ["speculative-decoding"]
rating: 3
recommendation: "read"
reproducible: "partial"
# paperUrl: "https://arxiv.org/abs/XXXX.XXXXX"
# arxivId: "XXXX.XXXXX"
math: true
draft: true
---

<Tldr>
  <!-- 一句话总结：这篇论文做了什么、为什么值得读 -->
</Tldr>

## Background

<!-- 前置知识，### 分小节 -->

## Problem

<!-- 没有这篇论文时哪里会坏 -->

## Core Idea

<!-- 核心设计，### 分小节；公式用 $$...$$ -->

## Experiments

{/* <Bench columns={["speedup"]} better={["max"]} rows={[{ name: "method", cells: ["6.0x"] }]} /> */}

## Verdict

<Critique
  weaknesses={[
    "<明确的缺陷 1>"
  ]}
  improvements={[
    "<对应的改进方向 1>"
  ]}
/>

<WhenMatrix
  helps={["<什么时候适用>"]}
  hurts={["<什么时候不适用>"]}
/>

## References

- <!-- 引用 -->
`;

const courseTemplate = `---
title: "${title}"
description: "<one line for SEO and share cards>"
summary: "<2-3 sentence blurb shown on the index page>"
tldr: "<one-sentence takeaway>"
course: "ml-foundations"
date: "${today}"
# revisit: "YYYY-MM-DD"
language: "en"
status: "active"
order: 1
tags: ["optimization"]
areas: ["machine-learning"]
math: true
draft: true
---

<Tldr>
  <!-- one-sentence takeaway -->
</Tldr>

## Overview

## Key Concepts

{/* <Callout type="definition" title="def · term">...</Callout> */}

## Detailed Notes

{/* <Derivation title="derivation · ..." steps={[{ text: "...", math: "..." }]} /> */}

## Mistakes And Confusions

{/* <Callout type="exam" title="exam-trap · ...">...</Callout> */}

## Active Recall

{/* <Recall items={[{ q: "...", a: "..." }]} /> */}

## Summary

<KeyTakeaways items={["<takeaway 1>"]} />

## References
`;

const body = kind === "paper" ? paperTemplate : courseTemplate;

await mkdir(path.dirname(target), { recursive: true });
await writeFile(target, body, "utf8");
console.log(`created ${target}`);
console.log("next: edit the frontmatter placeholders, then run: npm run check");
