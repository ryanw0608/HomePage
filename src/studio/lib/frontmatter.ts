/*
 * Frontmatter document layer for the Properties panel.
 *
 * Uses the `yaml` Document API so edits PRESERVE comments, key order, and
 * quoting of untouched fields — the panel must never reformat what it did
 * not change. Validation runs the same shared zod schemas the site build
 * uses (src/lib/schema/frontmatter.ts), so the panel flags exactly what
 * `astro check` would reject.
 */
import jsYaml from "js-yaml";
import { parseDocument, Scalar, YAMLSeq, type Document } from "yaml";

import {
  courseNoteFields,
  paperReadingFields,
  refineLanguage,
  refinePaperVisibility
} from "@/lib/schema/frontmatter";
import { areas, courses, tags } from "@/data/taxonomy";
import type { StudioCollection } from "@/studio/config";

export interface FmDoc {
  doc: Document;
}

export function parseFrontmatter(yamlText: string): FmDoc {
  return { doc: parseDocument(yamlText) };
}

export function frontmatterToText(fm: FmDoc): string {
  // Match the hand-written house style: ["a", "b"] without bracket padding,
  // no line wrapping — keeps untouched fields byte-identical in diffs.
  return fm.doc.toString({ flowCollectionPadding: false, lineWidth: 0 }).replace(/\n$/, "");
}

export function fmValues(fm: FmDoc): Record<string, unknown> {
  const js = fm.doc.toJS();
  return js && typeof js === "object" ? (js as Record<string, unknown>) : {};
}

/* Validate exactly what the BUILD will parse: the serialized bytes, through
 * js-yaml (the parser @astrojs uses) — not eemeli's toJS. The two engines
 * disagree on bare date/bool-shaped scalars, so validating through the same
 * parser is what makes "✓ schema ok" a true build-parity promise. */
export function fmBuildValues(fm: FmDoc): Record<string, unknown> {
  try {
    const parsed = jsYaml.load(frontmatterToText(fm));
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/* Set / delete a top-level key. Deleting keeps the file clean of empty
 * optional fields (an empty string would fail min(1) checks). */
export function fmSet(fm: FmDoc, key: string, value: unknown): void {
  if (value === undefined) {
    if (fm.doc.has(key)) fm.doc.delete(key);
    return;
  }
  if (typeof value === "string") {
    // Double-quote string scalars so js-yaml never reinterprets a bare
    // date/bool/number-shaped value as a non-string (house style also
    // quotes all string fields).
    const node = fm.doc.createNode(value) as Scalar;
    node.type = Scalar.QUOTE_DOUBLE;
    fm.doc.set(key, node);
    return;
  }
  if (Array.isArray(value)) {
    // Preserve the hand-written flow style: tags: ["a", "b"] — not a
    // multi-line block sequence (keeps pre-commit diffs minimal).
    const seq = fm.doc.createNode(value) as YAMLSeq;
    seq.flow = true;
    for (const item of seq.items) {
      if (item instanceof Scalar && typeof item.value === "string") {
        item.type = Scalar.QUOTE_DOUBLE;
      }
    }
    fm.doc.set(key, seq);
    return;
  }
  fm.doc.set(key, value);
}

/* -------------------------------------------------------- field metadata */

export type FieldSpec =
  | { key: string; label: string; kind: "text" | "textarea" | "date" | "number" }
  | { key: string; label: string; kind: "boolean" }
  | { key: string; label: string; kind: "select"; options: Option[]; allowEmpty?: boolean }
  | { key: string; label: string; kind: "multi"; options: Option[] }
  | { key: string; label: string; kind: "list" };

export interface Option {
  value: string;
  label: string;
}

const opt = (entries: Record<string, { label: string }>): Option[] =>
  Object.entries(entries).map(([value, v]) => ({ value, label: v.label }));

const plain = (...values: string[]): Option[] => values.map((value) => ({ value, label: value }));

const SHARED_TOP: FieldSpec[] = [
  { key: "title", label: "title", kind: "text" },
  { key: "description", label: "description", kind: "textarea" },
  { key: "summary", label: "summary", kind: "textarea" },
  { key: "tldr", label: "tldr (en)", kind: "textarea" }
];

const SHARED_BOTTOM: FieldSpec[] = [
  { key: "date", label: "date", kind: "date" },
  { key: "updated", label: "updated", kind: "date" },
  { key: "revisit", label: "revisit", kind: "date" },
  { key: "language", label: "language", kind: "select", options: plain("zh", "en", "mixed") },
  {
    key: "primaryLanguage",
    label: "primary language (mixed)",
    kind: "select",
    options: plain("zh", "en"),
    allowEmpty: true
  },
  { key: "tags", label: "tags", kind: "multi", options: opt(tags) },
  {
    key: "visibility",
    label: "visibility",
    kind: "select",
    options: plain("public", "unlisted", "private")
  },
  { key: "draft", label: "draft (wip, not built)", kind: "boolean" },
  { key: "featured", label: "featured", kind: "boolean" },
  { key: "math", label: "math (katex)", kind: "boolean" }
];

const COURSE_FIELDS: FieldSpec[] = [
  { key: "course", label: "course", kind: "select", options: opt(courses) },
  {
    key: "status",
    label: "status",
    kind: "select",
    options: plain("active", "complete", "evergreen")
  },
  { key: "term", label: "term", kind: "text" },
  { key: "order", label: "order", kind: "number" },
  { key: "areas", label: "areas", kind: "multi", options: opt(areas) }
];

const PAPER_FIELDS: FieldSpec[] = [
  { key: "paperTitle", label: "paper title", kind: "text" },
  { key: "authors", label: "authors", kind: "list" },
  { key: "year", label: "year", kind: "number" },
  {
    key: "status",
    label: "status",
    kind: "select",
    options: plain("queued", "reading", "skimmed", "reviewed", "revisit")
  },
  { key: "area", label: "area", kind: "select", options: opt(areas) },
  { key: "venue", label: "venue", kind: "text" },
  { key: "arxivId", label: "arXiv id", kind: "text" },
  { key: "doi", label: "doi", kind: "text" },
  { key: "paperUrl", label: "paper url", kind: "text" },
  { key: "codeUrl", label: "code url", kind: "text" },
  { key: "projectUrl", label: "project url", kind: "text" },
  { key: "rating", label: "rating (1-5)", kind: "number" },
  {
    key: "recommendation",
    label: "recommendation",
    kind: "select",
    options: plain("skip", "skim", "read", "must-read"),
    allowEmpty: true
  },
  {
    key: "reproducible",
    label: "reproducible",
    kind: "select",
    options: plain("code+weights", "code-only", "partial", "none"),
    allowEmpty: true
  },
  { key: "takeaways", label: "takeaways", kind: "list" }
];

export function fieldsFor(collection: StudioCollection): FieldSpec[] {
  return collection === "course-notes"
    ? [...SHARED_TOP, ...COURSE_FIELDS, ...SHARED_BOTTOM]
    : [...SHARED_TOP, ...PAPER_FIELDS, ...SHARED_BOTTOM];
}

/* ------------------------------------------------------------ validation */

// The same superRefine rules content.config.ts applies at build time.
const courseSchema = courseNoteFields.superRefine(refineLanguage);
const paperSchema = paperReadingFields.superRefine((entry, ctx) => {
  refineLanguage(entry, ctx);
  refinePaperVisibility(entry, ctx);
});

export function validateFrontmatter(
  collection: StudioCollection,
  values: Record<string, unknown>
): Map<string, string> {
  const schema = collection === "course-notes" ? courseSchema : paperSchema;
  const result = schema.safeParse(values);
  const issues = new Map<string, string>();
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (!issues.has(key)) issues.set(key, issue.message);
    }
  }
  return issues;
}
