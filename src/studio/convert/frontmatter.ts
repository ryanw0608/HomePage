/*
 * Frontmatter split for the block converter. Unlike src/studio/lib/mdx.ts
 * (which returns the inner YAML for the raw-mode textarea), this stores the
 * VERBATIM fence region — the `---` delimiters, their exact line endings, and
 * the trailing newline — so reconstruction is `fmRegion + body`, byte-exact,
 * with no LF/CRLF reconstruction. This is the CRLF fix the design panel flagged.
 */

// Capture group 1 is the whole fence region incl. delimiters and the trailing
// newline(s) after the closing `---`.
const FENCE_RE = /^(---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$))/;

export interface DocSplit {
  hasFrontmatter: boolean;
  /** Verbatim `---\n…\n---\n` region (empty when absent). */
  fmRegion: string;
  /** Everything after the fence region, verbatim. */
  body: string;
}

export function splitDocument(text: string): DocSplit {
  const match = text.match(FENCE_RE);
  if (!match) return { hasFrontmatter: false, fmRegion: "", body: text };
  return { hasFrontmatter: true, fmRegion: match[1], body: text.slice(match[1].length) };
}

export function joinDocument(fmRegion: string, body: string): string {
  return fmRegion + body;
}

/** Inner YAML text of a fence region (delimiters stripped) — for the panel. */
export function fmRegionInner(fmRegion: string): string {
  return fmRegion.replace(/^---\r?\n/, "").replace(/\r?\n---(?:\r?\n|$)$/, "");
}
