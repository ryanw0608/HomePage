/*
 * The escape hatch. Anything the structured converter can't safely represent
 * becomes a rawMdx block that carries its exact source bytes plus a reason, so
 * it always round-trips verbatim and never silently drops (which the current
 * preview pipeline does to imports/expressions). Reasons drive an author-facing
 * chip so it's clear WHY a region stayed raw.
 */
export type RawReason =
  | "whole-doc"
  | "unknown-component"
  | "non-literal-expr"
  | "container-multiblock"
  | "rich-table"
  | "raw-html"
  | "footnote"
  | "import-export"
  | "parse-error";

export interface RawMdxProps {
  source: string;
  reason: RawReason;
}

export interface ConvBlock {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  content?: unknown;
  children?: ConvBlock[];
}

export function rawMdxBlock(source: string, reason: RawReason): ConvBlock {
  return { type: "rawMdx", props: { source, reason } };
}
