/*
 * Browser-side MDX handling for Studio:
 *  - frontmatter split/join that round-trips untouched files byte-identically
 *  - a preview renderer: the site's own markdown pipeline (gfm + math/KaTeX)
 *    with MDX component tags rendered as framed placeholders instead of
 *    being compiled (real component rendering is the published site's job).
 */
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

export interface SplitNote {
  hasFrontmatter: boolean;
  /* Inner YAML text (no fences). */
  frontmatter: string;
  /* Everything after the closing fence, leading blank line preserved. */
  body: string;
}

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function splitFrontmatter(text: string): SplitNote {
  const match = text.match(FM_RE);
  if (!match) return { hasFrontmatter: false, frontmatter: "", body: text };
  return { hasFrontmatter: true, frontmatter: match[1], body: text.slice(match[0].length) };
}

export function joinFrontmatter(frontmatter: string, body: string): string {
  const fm = frontmatter.replace(/\n$/, "");
  return `---\n${fm}\n---\n${body}`;
}

/* ---------------------------------------------------------------- preview */

interface MdastNode {
  type: string;
  name?: string | null;
  children?: MdastNode[];
  data?: Record<string, unknown>;
}

/*
 * Preview-only mdast transform:
 *  - drop imports/exports and {expressions} (incl. comments)
 *  - capitalized JSX components -> framed .studio-jsx placeholder that still
 *    renders its children (Tldr/Callout prose stays readable)
 *  - lowercase tags (<br/>, <b>…) -> unwrap to their children
 */
function stripMdxForPreview() {
  return (tree: MdastNode) => walk(tree);
}

function walk(node: MdastNode): void {
  if (!node.children) return;
  node.children = node.children.flatMap((child): MdastNode[] => {
    if (
      child.type === "mdxjsEsm" ||
      child.type === "mdxFlowExpression" ||
      child.type === "mdxTextExpression"
    ) {
      return [];
    }
    if (child.type === "mdxJsxFlowElement" || child.type === "mdxJsxTextElement") {
      walk(child);
      const name = child.name ?? "";
      if (!/^[A-Z]/.test(name)) return child.children ?? [];
      child.data = {
        hName: child.type === "mdxJsxFlowElement" ? "div" : "span",
        hProperties: {
          className: ["studio-jsx"],
          dataName: name,
          ...((child.children?.length ?? 0) === 0 ? { dataEmpty: "" } : {})
        }
      };
      return [child];
    }
    walk(child);
    return [child];
  });
}

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

// The preview is injected via dangerouslySetInnerHTML. Raw <script> is
// already neutralized (remark-mdx parses it as JSX, stripped above), but a
// markdown link like [x](javascript:…) survives as an <a href>. Neutralize
// any href/src whose scheme isn't in the allowlist so a pasted hostile link
// can't run in the /studio/ origin (where the GitHub token lives).
function scrubUrls() {
  return (tree: HastNode) => walkHast(tree);
}

function isUnsafeUrl(url: string): boolean {
  const scheme = url.trim().match(/^([a-z][a-z0-9+.-]*):/i);
  if (!scheme) return false; // relative path or #anchor
  return !["http", "https", "mailto", "tel"].includes(scheme[1].toLowerCase());
}

function walkHast(node: HastNode): void {
  if (node.type === "element" && node.properties) {
    for (const attr of ["href", "src"]) {
      const value = node.properties[attr];
      if (typeof value === "string" && isUnsafeUrl(value)) node.properties[attr] = "#";
    }
  }
  node.children?.forEach(walkHast);
}

const processor = unified()
  .use(remarkParse)
  .use(remarkMdx)
  .use(remarkGfm)
  .use(remarkMath)
  .use(stripMdxForPreview)
  .use(remarkRehype)
  .use(scrubUrls)
  // Default options: KaTeX parse errors render as annotated source text
  // instead of throwing, which is exactly right mid-keystroke.
  .use(rehypeKatex)
  .use(rehypeStringify);

/* Renders the MDX BODY (no frontmatter) to preview HTML. Throws on MDX
 * syntax errors (mid-keystroke unclosed tags) — callers keep the last good
 * render and surface the message. */
export async function renderPreview(mdxBody: string): Promise<string> {
  const file = await processor.process(mdxBody);
  return String(file);
}
