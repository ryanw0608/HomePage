/*
 * Studio edits src/data/taxonomy.ts to add / rename / remove "folders" — areas
 * (paper-reading groups) and courses (course-notes groups). The file has a very
 * regular shape:
 *
 *   export const areas = {
 *     "machine-learning": { label: "Machine Learning" },
 *     …
 *   } as const;
 *
 * We insert a new entry as the FIRST line of the object (leading position keeps
 * the trailing-comma bookkeeping trivial), rename a single label in place, or
 * delete one entry — and never touch anything else, so untouched entries stay
 * byte-identical. A malformed edit would fail CI (astro check), never the live
 * site, and is git-revertible; validate() guards the obvious cases first.
 */
export type TaxKind = "areas" | "courses";

export const TAX_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface Taxonomy {
  areas: Record<string, string>; // id -> label
  courses: Record<string, { label: string; area?: string }>;
}

/* Parse the current (possibly newly-committed) taxonomy.ts so the sidebar/move
 * dialogs reflect folders added since the last deploy, not the stale bundled
 * import. The object literals are evaluated in a sandboxed Function — this is
 * our own committed file, and a malformed one just falls back to the import. */
export function parseTaxonomy(text: string): Taxonomy | null {
  try {
    const areasSrc = text.match(/export const areas = (\{[\s\S]*?\n\}) as const/)?.[1];
    const coursesSrc = text.match(/export const courses = (\{[\s\S]*?\n\}) as const/)?.[1];
    if (!areasSrc || !coursesSrc) return null;
    // eslint-disable-next-line no-new-func
    const areasObj = Function(`"use strict"; return (${areasSrc});`)() as Record<string, { label: string }>;
    // eslint-disable-next-line no-new-func
    const coursesObj = Function(`"use strict"; return (${coursesSrc});`)() as Record<string, { label: string; area?: string }>;
    const areas: Record<string, string> = {};
    for (const [id, v] of Object.entries(areasObj)) areas[id] = v.label;
    return { areas, courses: coursesObj };
  } catch {
    return null;
  }
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** True if `id` is already a key in the given taxonomy object. */
export function hasTaxonomyId(text: string, kind: TaxKind, id: string): boolean {
  return new RegExp(`\\n\\s*"${escapeRe(id)}"\\s*:`).test(blockOf(text, kind) ?? "");
}

function blockOf(text: string, kind: TaxKind): string | null {
  const m = text.match(new RegExp(`export const ${kind} = \\{([\\s\\S]*?)\\n\\} as const`));
  return m ? m[1] : null;
}

/** Add a folder. For courses, `area` is required (its parent area id). */
export function addTaxonomy(text: string, kind: TaxKind, id: string, label: string, area?: string): string {
  if (!TAX_ID_RE.test(id)) throw new Error("id must be ascii kebab-case (e.g. efficient-inference)");
  if (!label.trim()) throw new Error("label is required");
  if (hasTaxonomyId(text, kind, id)) throw new Error(`"${id}" already exists`);
  const value =
    kind === "courses"
      ? `{ label: ${JSON.stringify(label)}, area: ${JSON.stringify(area ?? "")} }`
      : `{ label: ${JSON.stringify(label)} }`;
  const anchor = new RegExp(`(export const ${kind} = \\{\\n)`);
  if (!anchor.test(text)) throw new Error(`could not locate the ${kind} object`);
  return text.replace(anchor, `$1  ${JSON.stringify(id)}: ${value},\n`);
}

/** Rename a folder's display label (keeps its id, so notes keep referencing it). */
export function renameTaxonomyLabel(text: string, kind: TaxKind, id: string, label: string): string {
  if (!label.trim()) throw new Error("label is required");
  if (!hasTaxonomyId(text, kind, id)) throw new Error(`"${id}" not found`);
  const re = new RegExp(`("${escapeRe(id)}":\\s*\\{[^{}]*?label:\\s*)"(?:[^"\\\\]|\\\\.)*"`);
  if (!re.test(text)) throw new Error(`could not find label for "${id}"`);
  return text.replace(re, `$1${JSON.stringify(label)}`);
}

/** Remove a folder entry entirely (caller ensures it holds no notes). A trailing
 * comma left before `}` is valid, so removing the last entry is safe too. */
export function removeTaxonomy(text: string, kind: TaxKind, id: string): string {
  if (!hasTaxonomyId(text, kind, id)) throw new Error(`"${id}" not found`);
  const re = new RegExp(`\\n[ \\t]*"${escapeRe(id)}":\\s*\\{[^{}]*\\},?`);
  return text.replace(re, "");
}
