/*
 * The Studio BlockNote schema. Grows one entry per custom block as P3
 * progresses; each block registers here AND ships a converter (de)serializer
 * + golden test, or it doesn't merge (the block-registration discipline).
 */
import { BlockNoteSchema, defaultBlockSpecs, defaultInlineContentSpecs } from "@blocknote/core";

import { CalloutBlock } from "./Callout";
import { InlineMath } from "./InlineMath";
import { RawMdxBlock } from "./RawMdx";
import { TldrBlock } from "./Tldr";

// The default heading block already supports levels 1–6 and toggle headings.
export const studioSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    // createReactBlockSpec returns a factory in BlockNote 0.51 — call it.
    rawMdx: RawMdxBlock(),
    tldr: TldrBlock(),
    callout: CalloutBlock()
  },
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    inlineMath: InlineMath
  }
});

export type StudioSchema = typeof studioSchema;
