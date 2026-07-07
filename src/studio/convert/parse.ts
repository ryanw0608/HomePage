/*
 * Parse a note body into an ordered list of segments — one per top-level
 * mdast node — capturing each node's verbatim source slice and the glue
 * before it, so the whole body is a total partition (glue + source, …, tail).
 * That partition is what makes an unchanged note round-trip byte-identically
 * regardless of how rich the block's editing UI is.
 *
 * P3.2a maps heading / paragraph / blockquote(single-para) / code to real
 * BlockNote blocks; everything else (lists, tables, display math, components,
 * raw html, footnotes) becomes a rawMdx block whose source is that node's
 * slice — visible and editable, upgraded to real blocks in later steps.
 */
import { inlineFromMdast } from "./inline";
import { parseBody } from "./mdast";
import { rawMdxBlock, type ConvBlock, type RawReason } from "./rawmdx";

export interface Segment {
  id: string;
  block: ConvBlock;
  /** Deep clone captured at parse time, for dirty comparison in the node path. */
  pristine: ConvBlock;
  gapBefore: string;
  source: string;
}

export interface ParsedBody {
  segments: Segment[];
  /** Glue after the last node (trailing newlines etc.). */
  tail: string;
}

interface MdastNode {
  type: string;
  depth?: number;
  lang?: string | null;
  value?: string;
  children?: MdastNode[];
  position?: { start: { offset: number }; end: { offset: number } };
}

const FALLBACK_REASON: Record<string, RawReason> = {
  list: "container-multiblock",
  table: "rich-table",
  math: "container-multiblock",
  html: "raw-html",
  footnoteDefinition: "footnote",
  mdxjsEsm: "import-export",
  mdxFlowExpression: "non-literal-expr"
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

/** Map a top-level mdast node to a real block, or null to fall back to rawMdx. */
function mapNode(node: MdastNode): ConvBlock | null {
  try {
    switch (node.type) {
      case "heading":
        return {
          type: "heading",
          props: { level: node.depth ?? 1 },
          content: inlineFromMdast(node.children ?? [])
        };
      case "paragraph":
        return { type: "paragraph", content: inlineFromMdast(node.children ?? []) };
      case "blockquote": {
        const kids = node.children ?? [];
        if (kids.length === 1 && kids[0].type === "paragraph") {
          return { type: "quote", content: inlineFromMdast(kids[0].children ?? []) };
        }
        return null;
      }
      case "code":
        return {
          type: "codeBlock",
          props: { language: node.lang || "text" },
          content: [{ type: "text", text: node.value ?? "", styles: {} }]
        };
      default:
        return null;
    }
  } catch {
    return null; // unsupported inline etc. → rawMdx
  }
}

function reasonFor(type: string): RawReason {
  if (type.startsWith("mdxJsx")) return "unknown-component";
  if (type.startsWith("mdxTextExpression") || type.startsWith("mdxFlowExpression")) return "non-literal-expr";
  return FALLBACK_REASON[type] ?? "parse-error";
}

export function parseBodyToSegments(body: string): ParsedBody {
  const root = parseBody(body) as MdastNode;
  const children = root.children ?? [];
  const segments: Segment[] = [];
  let cursor = 0;

  children.forEach((node, index) => {
    const start = node.position?.start.offset ?? cursor;
    const end = node.position?.end.offset ?? cursor;
    const gapBefore = body.slice(cursor, start);
    const source = body.slice(start, end);
    cursor = end;

    const block = mapNode(node) ?? rawMdxBlock(source, reasonFor(node.type));
    const id = `seg-${index}`;
    segments.push({ id, block: { id, ...block }, pristine: clone({ id, ...block }), gapBefore, source });
  });

  return { segments, tail: body.slice(cursor) };
}
