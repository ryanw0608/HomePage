/*
 * Browser-side MDX handling for Studio:
 *  - frontmatter split/join that round-trips untouched files byte-identically
 *  - a preview renderer: the site's own markdown pipeline (gfm + math/KaTeX)
 *    that renders the REAL 11 MDX components (faithful browser ports in
 *    src/studio/preview/), falling back to a framed placeholder only for
 *    unknown components or non-literal props.
 */
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

import { isContainer, isKnownComponent, renderComponent } from "@/studio/preview/components";
import { readProps } from "@/studio/preview/jsxProps";

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
  value?: string;
  children?: MdastNode[];
  data?: Record<string, unknown>;
}

/*
 * Preview mdast transform (recursive):
 *  - drop imports/exports and {expressions} (incl. comments)
 *  - a capitalized JSX component whose props are literal-evaluable is rendered
 *    to the REAL component HTML (container children rendered first); unknown
 *    components or non-literal props fall back to a framed placeholder
 *  - lowercase tags (<br/>, <b>…) -> unwrap to their children
 */
function renderComponents(frontmatter: Record<string, unknown>) {
  return (tree: MdastNode) => transform(tree, frontmatter);
}

function placeholder(child: MdastNode, name: string): MdastNode {
  transform(child, {});
  child.data = {
    hName: child.type === "mdxJsxFlowElement" ? "div" : "span",
    hProperties: {
      className: ["studio-jsx"],
      dataName: name,
      ...((child.children?.length ?? 0) === 0 ? { dataEmpty: "" } : {})
    }
  };
  return child;
}

function transform(node: MdastNode, frontmatter: Record<string, unknown>): void {
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
      const name = child.name ?? "";
      if (!/^[A-Z]/.test(name)) {
        transform(child, frontmatter);
        return child.children ?? [];
      }
      let props: Record<string, unknown> | null = null;
      try {
        props = readProps(child, frontmatter);
      } catch {
        props = null;
      }
      if (props && isKnownComponent(name)) {
        try {
          const childrenHtml = isContainer(name) ? renderChildrenHtml(child.children ?? [], frontmatter) : "";
          const html = renderComponent(name, props, childrenHtml);
          if (html != null) return [{ type: "html", value: html } as MdastNode];
        } catch {
          // A renderer crashed on malformed props (e.g. a null array hole) —
          // fall through to the placeholder instead of blanking the preview.
        }
      }
      return [placeholder(child, name)];
    }
    transform(child, frontmatter);
    return [child];
  });
}

/* Render a container's children (mdast) to HTML via a synchronous sub-pipeline
 * that itself renders nested components. Cloned so the main tree is untouched. */
function renderChildrenHtml(children: MdastNode[], frontmatter: Record<string, unknown>): string {
  try {
    const clone = structuredClone(children);
    const proc = unified()
      .use(renderComponents, frontmatter)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(scrubUrls)
      .use(rehypeKatex)
      .use(rehypeStringify);
    const hast = proc.runSync({ type: "root", children: clone } as never);
    return proc.stringify(hast as never);
  } catch {
    return "";
  }
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
  // Browsers strip ASCII tab/newline/CR (and trim leading controls) from an
  // href BEFORE resolving the scheme, so `java\tscript:` runs as javascript:.
  // Strip all C0 controls + space before scheme-testing to match that.
  const normalized = url.replace(/[\u0000-\u0020]/g, "");
  const scheme = normalized.match(/^([a-z][a-z0-9+.-]*):/i);
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

function buildProcessor(frontmatter: Record<string, unknown>) {
  return unified()
    .use(remarkParse)
    .use(remarkMdx)
    .use(remarkGfm)
    .use(remarkMath)
    .use(renderComponents, frontmatter)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(scrubUrls)
    // Default options: KaTeX parse errors render as annotated source text
    // instead of throwing, which is exactly right mid-keystroke.
    .use(rehypeKatex)
    .use(rehypeStringify);
}

/* Renders the MDX BODY (no frontmatter) to preview HTML. `frontmatter` lets
 * `items={frontmatter.takeaways}`-style bindings resolve. Throws on MDX
 * syntax errors (mid-keystroke unclosed tags) — callers keep the last good
 * render and surface the message. */
export async function renderPreview(
  mdxBody: string,
  frontmatter: Record<string, unknown> = {}
): Promise<string> {
  const file = await buildProcessor(frontmatter).process(mdxBody);
  return String(file);
}
