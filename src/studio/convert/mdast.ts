/*
 * The frozen parser. The exact plugin set that byte-exact source-slicing
 * depends on lives here and nowhere else, so it can never drift between the
 * initial parse and any later reparse. Parse-only: no stringify/rehype.
 *
 * remark-parse tracks node positions by default; remark-mdx/gfm/math register
 * the micromark extensions that make JSX, tables/footnotes, and `$…$` parse.
 */
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import { unified } from "unified";
import type { Root } from "mdast";

export function createParser() {
  return unified().use(remarkParse).use(remarkMdx).use(remarkGfm).use(remarkMath);
}

export function parseBody(body: string): Root {
  return createParser().parse(body) as Root;
}
