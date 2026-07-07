/*
 * The Studio BlockNote schema. Grows one entry per custom block as P3
 * progresses; each block registers here AND ships a converter (de)serializer
 * + golden test, or it doesn't merge (the block-registration discipline).
 */
import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";

import { RawMdxBlock } from "./RawMdx";

export const studioSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    // createReactBlockSpec returns a factory in BlockNote 0.51 — call it.
    rawMdx: RawMdxBlock()
  }
});

export type StudioSchema = typeof studioSchema;
