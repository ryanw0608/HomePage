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
import { readProps } from "@/studio/preview/jsxProps";

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
  /** GFM table column alignment, one entry per column. */
  align?: (string | null)[];
  children?: MdastNode[];
  position?: { start: { offset: number }; end: { offset: number } };
}

const FALLBACK_REASON: Record<string, RawReason> = {
  list: "container-multiblock",
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
      case "math":
        // Block-level `$$…$$` (remark-math). TeX is the source of truth.
        return { type: "displayMath", props: { tex: node.value ?? "" }, content: undefined } as ConvBlock;
      case "table":
        return mapTable(node);
      case "mdxJsxFlowElement":
        return mapComponent(node);
      default:
        return null;
    }
  } catch {
    return null; // unsupported inline etc. → rawMdx
  }
}

/* GFM `table` (remark-gfm). The first mdast row is the header; `node.align`
 * carries per-column alignment. We build BlockNote's native `table` block
 * content (tableContent → rows → tableCell), storing column alignment on each
 * cell's `textAlignment` prop (BlockNote's per-cell model, which round-trips
 * through the editor). An UNCHANGED table still saves byte-identically via its
 * verbatim source slice — only an edited table uses the house-style printer. */
function alignToBlockNote(a: string | null | undefined): "left" | "center" | "right" {
  // BlockNote table cells have no "none"; its default is "left", so an
  // unaligned GFM column and an explicit-left one both map to "left".
  return a === "center" ? "center" : a === "right" ? "right" : "left";
}

function mapTable(node: MdastNode): ConvBlock {
  const align = node.align ?? [];
  const rows = (node.children ?? []).map((row) => ({
    cells: (row.children ?? []).map((cell, col) => ({
      type: "tableCell",
      props: { textAlignment: alignToBlockNote(align[col]) },
      content: inlineFromMdast((cell.children ?? []) as never)
    }))
  }));
  const numCols = rows[0]?.cells.length ?? 0;
  return {
    type: "table",
    content: {
      type: "tableContent",
      columnWidths: new Array(numCols).fill(undefined),
      headerRows: 1,
      rows
    }
  } as ConvBlock;
}

const CALLOUT_TYPES = new Set(["note", "insight", "warning", "question", "exam", "definition"]);

/*
 * Container components with a SINGLE inline paragraph become real editable
 * blocks (Tldr, Callout). Anything else (multi-paragraph children, other
 * components, non-literal props) stays a render-first rawMdx card for now —
 * leaf-component form blocks land in P3.4/P3.5.
 */
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.map((s) => String(s)) : []);

function mapComponent(node: MdastNode & { name?: string | null }): ConvBlock | null {
  const name = (node as { name?: string | null }).name ?? "";

  // Container components: single inline paragraph → editable prose block.
  if (name === "Tldr" || name === "Callout") {
    const kids = node.children ?? [];
    const singlePara = kids.length === 1 && kids[0].type === "paragraph";
    const empty = kids.length === 0;
    if (!singlePara && !empty) return null;
    const props = readProps(node as never, {}); // throws on non-literal → rawMdx
    const content = singlePara ? inlineFromMdast(kids[0].children ?? []) : [];
    if (name === "Tldr") {
      const label = typeof props.label === "string" ? props.label : "tldr";
      return { type: "tldr", props: { label }, content };
    }
    const type = typeof props.type === "string" && CALLOUT_TYPES.has(props.type) ? props.type : "note";
    const title = typeof props.title === "string" ? props.title : "";
    return { type: "callout", props: { type, title }, content };
  }

  // Leaf list-form components → a dataJson block (no children slot). The
  // structured prop object round-trips through JSON; the printer re-emits it.
  if (LEAF_COMPONENTS.has(name)) {
    if ((node.children ?? []).length > 0) return null; // leaf has no children
    const props = readProps(node as never, {}); // throws on non-literal → rawMdx
    return { type: "mdxLeaf", props: { name, dataJson: JSON.stringify(props) }, content: undefined };
  }

  return null;
}

const LEAF_COMPONENTS = new Set([
  "Critique",
  "WhenMatrix",
  "KeyTakeaways",
  "Recall",
  "Figure",
  "FormulaCard",
  "Derivation",
  "Bench"
]);

export { LEAF_COMPONENTS, strList };

function reasonFor(type: string): RawReason {
  if (type.startsWith("mdxJsx")) return "unknown-component";
  if (type.startsWith("mdxTextExpression") || type.startsWith("mdxFlowExpression")) return "non-literal-expr";
  return FALLBACK_REASON[type] ?? "parse-error";
}

/* A simple list = every item is one paragraph (no nesting, no loose blocks).
 * Only then do we split it into per-item blocks (each with its own source
 * slice for byte-identity); otherwise the whole list stays one rawMdx card. */
function simpleListItems(node: MdastNode): MdastNode[] | null {
  if (node.type !== "list") return null;
  const items = node.children ?? [];
  if (items.length === 0) return null;
  const ok = items.every(
    (it) => it.type === "listItem" && (it.children ?? []).length === 1 && (it.children ?? [])[0].type === "paragraph"
  );
  return ok ? items : null;
}

export function parseBodyToSegments(body: string): ParsedBody {
  const root = parseBody(body) as MdastNode;
  const children = root.children ?? [];
  const segments: Segment[] = [];
  let cursor = 0;
  let counter = 0;

  const push = (block: ConvBlock, gapBefore: string, source: string) => {
    const id = `seg-${counter++}`;
    segments.push({ id, block: { id, ...block }, pristine: clone({ id, ...block }), gapBefore, source });
  };

  for (const node of children) {
    const items = simpleListItems(node);
    if (items) {
      const ordered = Boolean((node as { ordered?: boolean }).ordered);
      const listType = ordered ? "numberedListItem" : "bulletListItem";
      for (const item of items) {
        const start = item.position?.start.offset ?? cursor;
        const end = item.position?.end.offset ?? cursor;
        const para = (item.children ?? [])[0];
        let block: ConvBlock;
        try {
          block = { type: listType, content: inlineFromMdast(para.children ?? []) };
        } catch {
          block = rawMdxBlock(body.slice(start, end), "container-multiblock");
        }
        push(block, body.slice(cursor, start), body.slice(start, end));
        cursor = end;
      }
      continue;
    }

    const start = node.position?.start.offset ?? cursor;
    const end = node.position?.end.offset ?? cursor;
    const source = body.slice(start, end);
    push(mapNode(node) ?? rawMdxBlock(source, reasonFor(node.type)), body.slice(cursor, start), source);
    cursor = end;
  }

  return { segments, tail: body.slice(cursor) };
}
