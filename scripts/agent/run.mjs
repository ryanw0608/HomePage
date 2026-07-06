#!/usr/bin/env node
/*
 * Site agent: derives overview/digest content from the real notes in
 * src/content/. It never invents facts — everything it writes is a summary
 * of committed notes, and its output lands via pull request for review.
 *
 *   node scripts/agent/run.mjs --overview   # refresh src/data/overview.json
 *   node scripts/agent/run.mjs --digest     # write src/content/digest/<year>-w<week>.md
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { chat, parseJsonReply } from "./glm.mjs";

const mode = process.argv.includes("--digest") ? "digest" : "overview";

function loadNotes() {
  const notes = [];
  for (const collection of ["course-notes", "paper-reading"]) {
    const dir = path.join("src", "content", collection);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      if (!/\.(md|mdx)$/.test(file)) continue;
      const raw = readFileSync(path.join(dir, file), "utf8");
      if (/^draft:\s*true\s*$/m.test(raw)) continue;
      // The agent only ever summarizes fully public notes.
      if (/^visibility:\s*["']?(private|unlisted)["']?\s*$/m.test(raw)) continue;
      notes.push({ collection, slug: file.replace(/\.(md|mdx)$/, ""), raw });
    }
  }
  return notes;
}

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

const notes = loadNotes();
if (notes.length === 0) {
  console.log("no public notes found; nothing to do");
  process.exit(0);
}

const areasSource = readFileSync("src/data/taxonomy.ts", "utf8");
// glm-5.2 has a 1M-token context window — feed notes whole (cap only as a
// pathological-file guard).
const notesBlob = notes
  .map((note) => `=== ${note.collection}/${note.slug} ===\n${note.raw.slice(0, 200000)}`)
  .join("\n\n");

if (mode === "overview") {
  const { content, model } = await chat(
    [
      {
        role: "system",
        content:
          "You maintain the notes-overview panel of an academic homepage. You summarize ONLY what the provided notes actually contain. Never invent papers, results, or notes that are not in the input. Respond with strict JSON only."
      },
      {
        role: "user",
        content: `Here are all published notes on the site (MDX with frontmatter):\n\n${notesBlob}\n\nTaxonomy source (research areas):\n${areasSource}\n\nProduce JSON with exactly this shape:\n{\n  "summary": "<one English sentence describing the current state of the notebook>",\n  "areas": [\n    { "id": "<taxonomy area id>", "label": "<label>", "coverage": "<one short English sentence: what the notes already cover here>", "gap": "<one short English sentence: what is missing or planned next; empty string if unclear>" }\n  ]\n}\nOnly include areas that at least one note genuinely touches. Keep every sentence under 120 characters.`
      }
    ],
    { temperature: 0.3 }
  );

  const parsed = parseJsonReply(content);
  const overview = {
    updatedAt: new Date().toISOString().slice(0, 10),
    model,
    summary: String(parsed.summary ?? ""),
    areas: (Array.isArray(parsed.areas) ? parsed.areas : []).slice(0, 6).map((area) => ({
      id: String(area.id ?? ""),
      label: String(area.label ?? ""),
      coverage: String(area.coverage ?? ""),
      gap: String(area.gap ?? "")
    }))
  };

  writeFileSync("src/data/overview.json", JSON.stringify(overview, null, 2) + "\n", "utf8");
  console.log(`overview.json updated (${overview.areas.length} areas, model ${model})`);
} else {
  const now = new Date();
  const { year, week } = isoWeek(now);
  const slug = `${year}-w${String(week).padStart(2, "0")}`;
  const target = path.join("src", "content", "digest", `${slug}.md`);

  const { content, model } = await chat(
    [
      {
        role: "system",
        content:
          "You write a weekly digest for an academic notes site. Summarize ONLY the provided notes. Never invent content. Write in English, terminal-calm tone, markdown body only (no h1 — start at ##). Note any 'revisit' frontmatter dates that have passed."
      },
      {
        role: "user",
        content: `Today is ${now.toISOString().slice(0, 10)} (ISO week ${slug}). All published notes:\n\n${notesBlob}\n\nWrite the digest body with sections: "## This week in the notebook" (what exists / changed recently, judged from dates), "## Reading state" (paper statuses), "## Due for revisit" (notes whose revisit date has passed; say 'nothing due' if none). Keep it under 300 words. Also output, as the FIRST line before the body, a single-line summary prefixed with "SUMMARY: ".`
      }
    ],
    { temperature: 0.4 }
  );

  const summaryMatch = content.match(/^SUMMARY:\s*(.+)$/m);
  const summary = (summaryMatch ? summaryMatch[1] : `Weekly digest for ${slug}.`).replace(/"/g, "'");
  const body = content.replace(/^SUMMARY:.*$/m, "").trim();

  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(
    target,
    `---\ntitle: "Digest ${slug}"\ndate: "${now.toISOString().slice(0, 10)}"\nsummary: "${summary}"\nmodel: "${model}"\n---\n\n${body}\n`,
    "utf8"
  );
  console.log(`digest written: ${target} (model ${model})`);
}
