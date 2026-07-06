#!/usr/bin/env node
/*
 * Scaffold a new note with valid frontmatter.
 *
 *   npm run new:paper <slug> "<title>"
 *   npm run new:note  <slug> "<title>"
 *
 * Stamps today's date, draft: true, and enum defaults that pass astro check.
 * Refuses to overwrite existing files. Templates are shared with the Studio
 * editor — edit src/lib/templates.mjs, not this file.
 */
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { SLUG_RE, courseTemplate, paperTemplate } from "../src/lib/templates.mjs";

const [kind, slug, ...titleParts] = process.argv.slice(2);
const title = titleParts.join(" ");

if (!["paper", "course"].includes(kind ?? "") || !slug || !title) {
  console.error('usage: node scripts/new-entry.mjs <paper|course> <slug> "<title>"');
  process.exit(1);
}

if (!SLUG_RE.test(slug)) {
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

const body = kind === "paper" ? paperTemplate(title, today) : courseTemplate(title, today);

await mkdir(path.dirname(target), { recursive: true });
await writeFile(target, body, "utf8");
console.log(`created ${target}`);
console.log("next: edit the frontmatter placeholders, then run: npm run check");
