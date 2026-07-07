/*
 * The converter orchestrator — the ONLY module BlockEditor imports from the
 * convert layer. Free of React/BlockNote so the golden suite runs in node.
 *
 * loadDocument parses the body into real blocks with byte-exact provenance;
 * serializeDocument reconstructs the note, emitting each unchanged block's
 * verbatim slice (byte-identical round-trip) and house-styling only edits.
 * If the parse can't reproduce the body exactly, it degrades to a single
 * whole-doc rawMdx block — never lossy structured editing.
 */
import { joinDocument, splitDocument } from "./frontmatter";
import { parseBodyToSegments } from "./parse";
import { rawMdxBlock, type ConvBlock } from "./rawmdx";
import { blockKey, serializeBody, type ProvMap } from "./serialize";

export interface LoadedDoc {
  blocks: ConvBlock[];
  prov: ProvMap;
  tail: string;
  fmRegion: string;
  originalText: string;
  selfCheckOk: boolean;
}

export function serializeDocument(blocks: ConvBlock[], prov: ProvMap, tail: string, fmRegion: string): string {
  return joinDocument(fmRegion, serializeBody(blocks, prov, tail));
}

export function wholeDocFallback(text: string): LoadedDoc {
  const { fmRegion, body } = splitDocument(text);
  const id = "seg-0";
  const block: ConvBlock = { id, ...rawMdxBlock(body, "whole-doc") };
  const prov: ProvMap = new Map([[id, { gapBefore: "", source: body, pristineKey: blockKey(block) }]]);
  return { blocks: [block], prov, tail: "", fmRegion, originalText: text, selfCheckOk: true };
}

export function loadDocument(text: string): LoadedDoc {
  const { fmRegion, body } = splitDocument(text);
  try {
    const { segments, tail } = parseBodyToSegments(body);
    const blocks = segments.map((s) => s.block);
    const prov: ProvMap = new Map(
      segments.map((s) => [s.id, { gapBefore: s.gapBefore, source: s.source, pristineKey: blockKey(s.pristine) }])
    );
    const selfCheckOk = serializeBody(blocks, prov, tail) === body;
    if (!selfCheckOk) return wholeDocFallback(text);
    return { blocks, prov, tail, fmRegion, originalText: text, selfCheckOk: true };
  } catch {
    return wholeDocFallback(text);
  }
}
