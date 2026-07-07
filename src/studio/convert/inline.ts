/*
 * mdast phrasing content  <->  BlockNote inline content.
 *
 * The ONE shared inline layer, used by paragraph / heading / quote (and later
 * the container components). Inline math ($..$) becomes a custom `inlineMath`
 * inline-content node whose stored value is the exact TeX. The house-style
 * serializer here only runs on EDITED blocks — unchanged blocks re-emit their
 * verbatim source slice, so round-trip fidelity never depends on it.
 */

export interface InlineStyles {
  bold?: true;
  italic?: true;
  code?: true;
  strike?: true;
}

export type Inline =
  | { type: "text"; text: string; styles: InlineStyles }
  | { type: "link"; href: string; content: Inline[] }
  | { type: "inlineMath"; props: { tex: string } };

interface MdastInline {
  type: string;
  value?: string;
  url?: string;
  children?: MdastInline[];
}

/* ---------------------------------------------------------- mdast -> block */

export function inlineFromMdast(nodes: MdastInline[]): Inline[] {
  const out: Inline[] = [];
  walkInline(nodes, {}, out);
  return mergeAdjacent(out);
}

function walkInline(nodes: MdastInline[], styles: InlineStyles, out: Inline[]): void {
  for (const node of nodes) {
    switch (node.type) {
      case "text":
        out.push({ type: "text", text: node.value ?? "", styles: { ...styles } });
        break;
      case "strong":
        walkInline(node.children ?? [], { ...styles, bold: true }, out);
        break;
      case "emphasis":
        walkInline(node.children ?? [], { ...styles, italic: true }, out);
        break;
      case "delete":
        walkInline(node.children ?? [], { ...styles, strike: true }, out);
        break;
      case "inlineCode":
        out.push({ type: "text", text: node.value ?? "", styles: { ...styles, code: true } });
        break;
      case "break":
        out.push({ type: "text", text: "\n", styles: { ...styles } });
        break;
      case "inlineMath":
        out.push({ type: "inlineMath", props: { tex: node.value ?? "" } });
        break;
      case "link": {
        const content: Inline[] = [];
        walkInline(node.children ?? [], styles, content);
        out.push({ type: "link", href: node.url ?? "", content });
        break;
      }
      default:
        // Unknown inline (e.g. an inline JSX/expression island) — signal so the
        // whole block falls back to rawMdx rather than dropping content.
        throw new Error(`unsupported inline ${node.type}`);
    }
  }
}

function sameStyles(a: InlineStyles, b: InlineStyles): boolean {
  return a.bold === b.bold && a.italic === b.italic && a.code === b.code && a.strike === b.strike;
}

function mergeAdjacent(items: Inline[]): Inline[] {
  const out: Inline[] = [];
  for (const item of items) {
    const prev = out[out.length - 1];
    if (prev && prev.type === "text" && item.type === "text" && sameStyles(prev.styles, item.styles)) {
      prev.text += item.text;
    } else {
      out.push(item);
    }
  }
  return out;
}

/* --------------------------------------------------- block -> house-style md */

function escapeText(text: string): string {
  // Minimal escaping for the edited-block house-style path: only the chars
  // that begin inline markup mid-text. Over-escaping (., !, parens…) would
  // make edited-block diffs noisy for no correctness gain.
  return text.replace(/([\\`*_[\]<])/g, "\\$1");
}

/* Escape a leading block-level marker so an edited paragraph beginning with
 * #, >, -, +, =, or `1.`/`1)` doesn't reparse as a heading/quote/list/code. */
export function escapeBlockStart(md: string): string {
  return md
    .replace(/^(\s*)([#>+=-])/, "$1\\$2")
    .replace(/^(\s*)(\d+)([.)])/, "$1$2\\$3");
}

/* Inline code fence long enough to contain any backtick run inside, padded
 * per CommonMark when the content edge-touches a backtick. */
function inlineCode(text: string): string {
  const longest = (text.match(/`+/g) ?? []).reduce((m, r) => Math.max(m, r.length), 0);
  const fence = "`".repeat(longest + 1);
  const pad = text.startsWith("`") || text.endsWith("`") ? " " : "";
  return `${fence}${pad}${text}${pad}${fence}`;
}

function linkHref(href: string): string {
  // Wrap in <> when the href has spaces or parens that would break []() form.
  return /[\s()]/.test(href) && !href.includes(">") ? `<${href}>` : href;
}

export function inlineToMarkdown(items: Inline[]): string {
  return items
    .map((item) => {
      if (item.type === "inlineMath") return `$${item.props.tex}$`;
      if (item.type === "link") return `[${inlineToMarkdown(item.content)}](${linkHref(item.href)})`;
      let text = item.styles.code ? inlineCode(item.text) : escapeText(item.text);
      if (item.styles.bold) text = `**${text}**`;
      if (item.styles.italic) text = `_${text}_`;
      if (item.styles.strike) text = `~~${text}~~`;
      return text;
    })
    .join("");
}
