/*
 * The converter orchestrator — the ONLY module BlockEditor imports from the
 * convert layer. Deliberately free of React/BlockNote so the golden
 * round-trip suite can exercise it in plain node.
 *
 * P3.1 (this file's current scope): the whole note body loads as a single
 * rawMdx block whose source IS the verbatim body, so round-trip is
 * byte-identical by construction. P3.2 replaces loadDocument's body handling
 * with real per-node block parsing + provenance-based source slicing; the
 * serializer's per-block dispatch and the no-op short-circuit stay.
 */
import { joinDocument, splitDocument } from "./frontmatter";
import { rawMdxBlock, type ConvBlock } from "./rawmdx";

export interface LoadedDoc {
  blocks: ConvBlock[];
  /** Verbatim frontmatter fence region (re-prepended on save). */
  fmRegion: string;
  originalText: string;
  /** loadDocument(text) then serialize === text. When false the caller must
   *  keep the whole-doc rawMdx fallback rather than offer structured editing. */
  selfCheckOk: boolean;
}

function isEmptyContent(content: unknown): boolean {
  if (content == null) return true;
  if (Array.isArray(content)) {
    return content.every((node) => {
      const text = (node as { text?: unknown })?.text;
      return typeof text !== "string" || text.length === 0;
    });
  }
  return false;
}

/** One block -> its exact MDX source. */
export function blockToSource(block: ConvBlock): string {
  if (block.type === "rawMdx") return String(block.props?.source ?? "");
  // BlockNote always keeps a trailing empty paragraph; it must contribute no
  // bytes so a no-op save stays byte-identical.
  if (block.type === "paragraph" && isEmptyContent(block.content)) return "";
  // A block with no P3.1 serializer (e.g. the user typed fresh content in
  // block mode before P3.2). Throw so the caller keeps the last-good text
  // instead of silently dropping or corrupting bytes.
  throw new Error(`no serializer for block type "${block.type}" yet`);
}

export function serializeBody(blocks: ConvBlock[]): string {
  return blocks.map(blockToSource).join("");
}

export function serializeDocument(blocks: ConvBlock[], fmRegion: string): string {
  return joinDocument(fmRegion, serializeBody(blocks));
}

export function loadDocument(text: string): LoadedDoc {
  const { fmRegion, body } = splitDocument(text);
  const blocks: ConvBlock[] = [rawMdxBlock(body, "whole-doc")];
  let selfCheckOk = false;
  try {
    selfCheckOk = serializeDocument(blocks, fmRegion) === text;
  } catch {
    selfCheckOk = false;
  }
  return { blocks, fmRegion, originalText: text, selfCheckOk };
}
