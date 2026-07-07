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

/** House-style Markdown for an EDITED block. */
function houseStyle(block: ConvBlock): string {
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
      return `- ${inline()}`;
    case "numberedListItem":
      return `1. ${inline()}`;
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
  const ambiguous = value.includes("&") || value.includes("<");
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

export function serializeBody(blocks: ConvBlock[], prov: ProvMap, tail: string): string {
  let out = "";
  for (const block of blocks) {
    const entry = block.id ? prov.get(block.id) : undefined;
    let piece: string;
    if (entry && blockKey(block) === entry.pristineKey) {
      piece = entry.gapBefore + entry.source; // unchanged → verbatim
    } else if (entry) {
      piece = entry.gapBefore + houseStyle(block); // edited → reuse glue, house style
    } else if (isEmptyParagraph(block)) {
      continue; // BlockNote's trailing empty paragraph (or a user blank line)
    } else {
      piece = houseStyle(block); // brand-new block
    }
    // Guarantee a blank-line boundary between blocks whenever neither side
    // provides one — otherwise an inserted/edited block (whose stored glue is
    // "" or a relative gap) would jam into its neighbour and merge on reparse.
    if (out !== "" && !/\n\s*$/.test(out) && !/^\n/.test(piece)) {
      out += "\n\n";
    }
    out += piece;
  }
  return out + tail;
}
