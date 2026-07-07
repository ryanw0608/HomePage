import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { loadDocument, serializeDocument } from "@/studio/convert/document";

/*
 * The golden gate for the CLAUDE.md "unchanged notes save byte-identical"
 * non-negotiable. Every future block type must keep these green (and add its
 * own fixture) or it doesn't merge — the block-registration discipline the
 * reference-mining pass flagged as the #1 enrichment.
 */
const SEEDS = [
  "src/content/course-notes/ml-foundations-gradient-descent.mdx",
  "src/content/paper-reading/attention-is-all-you-need.mdx"
];

describe("whole-doc round-trip (P3.1 byte-clean floor)", () => {
  for (const seed of SEEDS) {
    it(`round-trips ${seed} byte-identically (LF + CRLF)`, () => {
      const raw = readFileSync(seed, "utf8");
      // Deterministic regardless of the working tree's autocrlf state.
      const lf = raw.replace(/\r\n/g, "\n");
      const crlf = lf.replace(/\n/g, "\r\n");
      for (const text of [lf, crlf]) {
        const loaded = loadDocument(text);
        expect(loaded.selfCheckOk).toBe(true);
        expect(serializeDocument(loaded.blocks, loaded.fmRegion)).toBe(text);
      }
    });
  }

  it("round-trips a note with no frontmatter", () => {
    const text = "# Just a body\n\nno frontmatter.\n";
    const loaded = loadDocument(text);
    expect(serializeDocument(loaded.blocks, loaded.fmRegion)).toBe(text);
  });

  it("round-trips a frontmatter-only note (empty body)", () => {
    const text = '---\ntitle: "x"\n---\n';
    const loaded = loadDocument(text);
    expect(serializeDocument(loaded.blocks, loaded.fmRegion)).toBe(text);
  });
});
