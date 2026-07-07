/*
 * Serialize ordered blocks back to a note body. The contract:
 *   - a block that is byte-identical to its parsed pristine emits its VERBATIM
 *     source slice + original glue → an unchanged note is byte-identical.
 *   - an edited block re-serializes in canonical house style (a minimal, local
 *     diff), reusing its original glue where known.
 *   - a brand-new block gets a blank-line gap + house style.
 * The rawMdx block always emits its source prop verbatim (its own escape hatch).
 */
import { inlineToMarkdown, type Inline } from "./inline";
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
      return inline();
    case "quote":
      return `> ${inline()}`;
    case "bulletListItem":
      return `- ${inline()}`;
    case "numberedListItem":
      return `1. ${inline()}`;
    case "codeBlock": {
      const lang = String((block.props as { language?: string })?.language ?? "");
      return `\`\`\`${lang === "text" ? "" : lang}\n${contentText(block.content)}\n\`\`\``;
    }
    case "rawMdx":
      return String((block.props as { source?: string })?.source ?? "");
    default:
      throw new Error(`no house-style serializer for block "${block.type}"`);
  }
}

function isEmptyParagraph(block: ConvBlock): boolean {
  return block.type === "paragraph" && contentText(block.content).length === 0;
}

export function serializeBody(blocks: ConvBlock[], prov: ProvMap, tail: string): string {
  let out = "";
  for (const block of blocks) {
    const entry = block.id ? prov.get(block.id) : undefined;
    if (entry && blockKey(block) === entry.pristineKey) {
      out += entry.gapBefore + entry.source; // unchanged → verbatim
    } else if (entry) {
      out += entry.gapBefore + houseStyle(block); // edited → reuse glue, house style
    } else if (isEmptyParagraph(block)) {
      // BlockNote's trailing empty paragraph (or a user blank line): no bytes.
    } else {
      out += (out === "" ? "" : "\n\n") + houseStyle(block); // brand-new block
    }
  }
  return out + tail;
}
