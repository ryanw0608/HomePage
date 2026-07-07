import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { loadDocument, serializeDocument } from "@/studio/convert/document";

/*
 * The golden gate for the CLAUDE.md "unchanged notes save byte-identical"
 * non-negotiable. Every future block type must keep these green (and add its
 * own fixture) or it doesn't merge — the block-registration discipline.
 */
const SEEDS = [
  "src/content/course-notes/ml-foundations-gradient-descent.mdx",
  "src/content/paper-reading/attention-is-all-you-need.mdx"
];

function roundTrip(text: string): string {
  const doc = loadDocument(text);
  return serializeDocument(doc.blocks, doc.prov, doc.tail, doc.fmRegion);
}

describe("byte-clean round-trip (P3.2 real-block converter)", () => {
  for (const seed of SEEDS) {
    it(`round-trips ${seed} byte-identically (LF + CRLF)`, () => {
      const raw = readFileSync(seed, "utf8");
      const lf = raw.replace(/\r\n/g, "\n");
      const crlf = lf.replace(/\n/g, "\r\n");
      for (const text of [lf, crlf]) {
        const doc = loadDocument(text);
        expect(doc.selfCheckOk).toBe(true);
        expect(roundTrip(text)).toBe(text);
      }
    });
  }

  it("parses headings/paragraphs/quote/code as real blocks (not one rawMdx)", () => {
    const text = [
      "---",
      'title: "x"',
      "---",
      "",
      "# Title",
      "",
      "A paragraph with **bold** and `code` and $E=mc^2$.",
      "",
      "> a quote",
      "",
      "```js",
      "const a = 1;",
      "```",
      ""
    ].join("\n");
    const doc = loadDocument(text);
    const types = doc.blocks.map((b) => b.type);
    expect(types).toContain("heading");
    expect(types).toContain("paragraph");
    expect(types).toContain("quote");
    expect(types).toContain("codeBlock");
    expect(types).not.toContain("rawMdx"); // all mapped to real blocks
    expect(roundTrip(text)).toBe(text); // and still byte-identical
  });

  it("falls back to rawMdx for a list/table but stays byte-identical", () => {
    const text = "- one\n- two\n\n| a | b |\n| - | - |\n| 1 | 2 |\n";
    const doc = loadDocument(text);
    expect(doc.blocks.some((b) => b.type === "rawMdx")).toBe(true);
    expect(roundTrip(text)).toBe(text);
  });

  it("round-trips a frontmatter-only note", () => {
    const text = '---\ntitle: "x"\n---\n';
    expect(roundTrip(text)).toBe(text);
  });

  it("house-styles an edited paragraph while keeping siblings verbatim", () => {
    const text = "# Keep\n\nEdit me.\n\nKeep this too.\n";
    const doc = loadDocument(text);
    const para = doc.blocks.find((b) => b.type === "paragraph");
    // edit the paragraph's text
    (para as { content: { text: string }[] }).content = [{ type: "text", text: "Edited!", styles: {} } as never];
    const out = serializeDocument(doc.blocks, doc.prov, doc.tail, doc.fmRegion);
    expect(out).toContain("# Keep"); // heading verbatim
    expect(out).toContain("Edited!"); // paragraph house-styled
    expect(out).toContain("Keep this too."); // sibling verbatim
    expect(out).not.toContain("Edit me."); // old text gone
  });
});
