/*
 * Public-URL helpers for the block "copy link" action. A Studio note path is
 * `src/content/<collection>/<slug>.mdx`; the published page is
 * `<site><base>/<collection>/<slug>/`. Heading blocks get a `#anchor` matching
 * the site's rehype-slug (github-slugger) output so the link scrolls to it.
 */
import { STUDIO } from "@/studio/config";

const SITE = "https://ryanw0608.github.io";
const BASE = "/HomePage";

/** Public page URL for a note path, or null if the path isn't a content note. */
export function noteUrl(path: string | undefined): string | null {
  if (!path) return null;
  const rel = path.replace(new RegExp(`^${STUDIO.contentRoot}/`), "").replace(/\.mdx$/, "");
  if (!rel || rel === path) return null;
  return `${SITE}${BASE}/${rel}/`;
}

/** github-slugger-compatible anchor for heading text (matches rehype-slug). */
export function headingSlug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-");
}
