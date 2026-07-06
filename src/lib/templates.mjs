/*
 * Note scaffolding templates — the single source used by both the CLI
 * (scripts/new-entry.mjs) and the Studio editor's "new note" action.
 * Plain .mjs so Node can import it directly and Vite can bundle it.
 */

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function paperTemplate(title, today) {
  return `---
title: "Reading: ${title}"
description: "<one line for SEO and share cards>"
summary: "<2-3 sentence blurb shown on the index page>"
tldr: "<one-sentence English takeaway - required by site policy for zh notes>"
paperTitle: "${title}"
authors: ["TODO Author"]
year: ${Number(today.slice(0, 4))}
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
}

export function courseTemplate(title, today) {
  return `---
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
}
