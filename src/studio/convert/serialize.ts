/*
 * Serialize ordered blocks back to a note body. The contract:
 *   - a block that is byte-identical to its parsed pristine emits its VERBATIM
 *     source slice + original glue → an unchanged note is byte-identical.
 *   - an edited block re-serializes in canonical house style (a minimal, local
 *     diff), reusing its original glue where known.
 *   - a brand-new block gets a blank-line gap + house style.
 * The rawMdx block always emits its source prop verbatim (its own escape hatch).
 */
import { escapeBlockStart, inlineToMarkdown, type Inline } from "./inline";
import type { ConvBlock } from "./rawmdx";

export interface Provenance {
  gapBefore: string;
  source: string;
  pristineKey: string;
}

export type ProvMap = Map<string, Provenance>;

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function blockKey(block: ConvBlock): string {
  return stableStringify(block);
}

function contentText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return (content as { text?: string }[]).map((c) => c.text ?? "").join("");
  }
  return "";
}

/* Reuse the source item's exact marker (bullet char / ordered delimiter +
 * ordinal) so an edited item doesn't re-group the list or reset numbering. */
function listMarker(source: string | undefined, fallback: string): string {
  const m = source?.match(/^(\s*(?:[-*+]|\d+[.)])[ \t]+)/);
  return m ? m[1] : fallback;
}

/** House-style Markdown for an EDITED block. `entry` (its provenance) carries
 * the original source so list markers/ordinals can be preserved. */
function houseStyle(block: ConvBlock, entry?: Provenance): string {
  const inline = () => inlineToMarkdown((block.content as Inline[]) ?? []);
  switch (block.type) {
    case "heading": {
      const level = Number((block.props as { level?: number })?.level ?? 1);
      return `${"#".repeat(Math.min(6, Math.max(1, level)))} ${inline()}`;
    }
    case "paragraph":
      // A bare paragraph is at column 0 — escape a leading block marker so it
      // can't reparse as a heading/quote/list.
      return escapeBlockStart(inline());
    case "quote":
      return `> ${inline()}`;
    case "bulletListItem":
      return `${listMarker(entry?.source, "- ")}${inline()}`;
    case "numberedListItem":
      return `${listMarker(entry?.source, "1. ")}${inline()}`;
    case "codeBlock": {
      const lang = String((block.props as { language?: string })?.language ?? "");
      const code = contentText(block.content);
      // Fence long enough to contain any backtick run inside the code.
      const longest = (code.match(/`+/g) ?? []).reduce((m, r) => Math.max(m, r.length), 0);
      const fence = "`".repeat(Math.max(3, longest + 1));
      return `${fence}${lang === "text" ? "" : lang}\n${code}\n${fence}`;
    }
    case "rawMdx":
      return String((block.props as { source?: string })?.source ?? "");
    case "displayMath":
      return `$$\n${String((block.props as { tex?: string })?.tex ?? "").trim()}\n$$`;
    case "tldr": {
      const label = String((block.props as { label?: string })?.label ?? "tldr");
      const attrs = label && label !== "tldr" ? ` label=${jsxAttr(label)}` : "";
      return `<Tldr${attrs}>\n  ${componentBody(inline())}\n</Tldr>`;
    }
    case "callout": {
      const props = (block.props ?? {}) as { type?: string; title?: string };
      const type = props.type && props.type !== "note" ? ` type=${jsxAttr(props.type)}` : "";
      const title = props.title ? ` title=${jsxAttr(props.title)}` : "";
      return `<Callout${type}${title}>\n  ${componentBody(inline())}\n</Callout>`;
    }
    case "mdxLeaf": {
      const p = (block.props ?? {}) as { name?: string; dataJson?: string };
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(String(p.dataJson ?? "{}")) as Record<string, unknown>;
      } catch {
        /* corrupt json → empty props */
      }
      return printLeafComponent(String(p.name ?? ""), data);
    }
    default:
      throw new Error(`no house-style serializer for block "${block.type}"`);
  }
}

/* Deterministic JS-literal printer for a leaf component's props. Only runs on
 * an EDITED instance (unchanged ones re-emit their verbatim source slice). */
function printJsValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(printJsValue).join(", ")}]`;
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([k, v]) => `${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${printJsValue(v)}`
    );
    return `{ ${entries.join(", ")} }`;
  }
  return "null";
}

function printLeafComponent(name: string, props: Record<string, unknown>): string {
  const attrs = Object.entries(props)
    .filter(([, v]) => v !== undefined)
    .map(([key, v]) => (typeof v === "string" ? `${key}=${jsxAttr(v)}` : `${key}={${printJsValue(v)}}`));
  return `<${name}${attrs.length ? " " + attrs.join(" ") : ""} />`;
}

/* Quote a JSX string attribute. JSX string literals have no escapes and MDX
 * decodes character references inside them, so use an expression attribute
 * {"…"} (JSON-escaped, lossless) whenever the value has both quote kinds OR an
 * & or < that would otherwise be decoded as an entity on reparse. */
function jsxAttr(value: string): string {
  // A raw newline in a quoted JSX attribute reparses lossily (whitespace
  // collapses), so any control char also forces the JSON-escaped expression
  // form. Edit-in-place fields can now carry soft newlines (Shift+Enter).
  const ambiguous = value.includes("&") || value.includes("<") || /[\u0000-\u001F]/.test(value);
  if (!ambiguous && !value.includes('"')) return `"${value}"`;
  if (!ambiguous && !value.includes("'")) return `'${value}'`;
  return `{${JSON.stringify(value)}}`;
}

/* House-style a component's inline body so it reparses as ONE paragraph:
 * escape a leading block marker (#, -, >, …) and indent soft-wrap lines to the
 * content column. A genuine blank line (multi-paragraph) still can't be a
 * single-inline component and correctly falls back to a rawMdx card. */
function componentBody(inlineMd: string): string {
  return escapeBlockStart(inlineMd).replace(/\n(?!\n)/g, "\n  ");
}

function isEmptyParagraph(block: ConvBlock): boolean {
  return block.type === "paragraph" && contentText(block.content).length === 0;
}

function isListItem(block: ConvBlock): boolean {
  return block.type === "bulletListItem" || block.type === "numberedListItem";
}

const leadingNewlines = (s: string): number => s.match(/^\n*/)?.[0].length ?? 0;
const trailingNewlines = (s: string): number => s.match(/\n*$/)?.[0].length ?? 0;

/* Minimum blank between two adjacent blocks: one newline keeps consecutive
 * list items in the same list; everything else needs a blank line, so a
 * list-item→paragraph (or any→any) transition can't lazily merge. */
function requiredNewlines(prev: ConvBlock | null, cur: ConvBlock): number {
  if (prev && isListItem(prev) && isListItem(cur)) return 1;
  return 2;
}

export function serializeBody(blocks: ConvBlock[], prov: ProvMap, tail: string): string {
  let out = "";
  let prev: ConvBlock | null = null;
  for (const block of blocks) {
    const entry = block.id ? prov.get(block.id) : undefined;
    const unchanged = Boolean(entry && blockKey(block) === entry.pristineKey);
    let sep: string;
    let text: string;
    if (unchanged) {
      sep = entry!.gapBefore;
      text = entry!.source;
    } else if (entry) {
      sep = entry.gapBefore;
      text = houseStyle(block, entry);
    } else if (isEmptyParagraph(block)) {
      continue; // BlockNote's trailing empty paragraph (or a user blank line)
    } else {
      sep = "";
      text = houseStyle(block);
    }

    if (out === "") {
      out += sep + text;
    } else {
      // Ensure the boundary provides at least the separation the two block
      // types require — upgrading only when the stored glue is short (an edit
      // changed a type). All-unchanged notes keep their exact glue → byte-safe.
      const have = trailingNewlines(out) + leadingNewlines(sep);
      const need = requiredNewlines(prev, block);
      out += have >= need ? sep + text : "\n".repeat(need) + text;
    }
    prev = block;
  }
  return out + tail;
}
