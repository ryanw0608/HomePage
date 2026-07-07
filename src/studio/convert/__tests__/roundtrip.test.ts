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

  it("parses Tldr/Callout as real editable container blocks (seeds)", () => {
    const raw = readFileSync(SEEDS[0], "utf8").replace(/\r\n/g, "\n");
    const doc = loadDocument(raw);
    const types = doc.blocks.map((b) => b.type);
    expect(types).toContain("tldr");
    expect(types).toContain("callout");
    expect(doc.selfCheckOk).toBe(true);
  });

  it("round-trips an edited Callout as valid JSX with math intact", () => {
    const text = '<Callout type="definition" title="def · x">\n  Original body.\n</Callout>\n';
    const doc = loadDocument(text);
    expect(doc.blocks[0].type).toBe("callout");
    doc.blocks[0].content = [
      { type: "text", text: "Edited with ", styles: {} },
      { type: "inlineMath", props: { tex: "E=mc^2" } },
      { type: "text", text: " and ", styles: {} },
      { type: "text", text: "bold", styles: { bold: true } }
    ] as never;
    const out = serializeDocument(doc.blocks, doc.prov, doc.tail, doc.fmRegion);
    // reparse: still one callout block with the same props + edited content
    const doc2 = loadDocument(out);
    expect(doc2.blocks[0].type).toBe("callout");
    expect((doc2.blocks[0].props as { type: string }).type).toBe("definition");
    expect((doc2.blocks[0].props as { title: string }).title).toBe("def · x");
    const texts = (doc2.blocks[0].content as { text?: string; type: string }[]).map((c) => c.type);
    expect(texts).toContain("inlineMath");
  });

  it("parses leaf components (Critique/WhenMatrix) as mdxLeaf blocks (seed)", () => {
    const raw = readFileSync(SEEDS[1], "utf8").replace(/\r\n/g, "\n");
    const doc = loadDocument(raw);
    const leaves = doc.blocks.filter((b) => b.type === "mdxLeaf");
    const names = leaves.map((b) => (b.props as { name?: string }).name);
    expect(names).toContain("Critique");
    expect(names).toContain("WhenMatrix");
    expect(doc.selfCheckOk).toBe(true);
  });

  it("parses Figure/FormulaCard/Derivation as mdxLeaf and round-trips edits", () => {
    const cases = [
      '<Figure src="/m/a.png" alt="a" caption="cap" />\n',
      '<FormulaCard formulas={[{ name: "attn", tex: "QK^T" }]} />\n',
      '<Derivation title="d" steps={[{ text: "step", math: "x=1" }]} />\n'
    ];
    for (const text of cases) {
      const doc = loadDocument(text);
      expect(doc.blocks[0].type).toBe("mdxLeaf");
      expect(roundTrip(text)).toBe(text); // unchanged → byte-identical
    }
    // edit a FormulaCard's records
    const doc = loadDocument('<FormulaCard formulas={[{ name: "a", tex: "x" }]} />\n');
    doc.blocks[0].props = {
      name: "FormulaCard",
      dataJson: JSON.stringify({ formulas: [{ name: "a", tex: "x" }, { name: "b", tex: "y" }] })
    };
    const out = serializeDocument(doc.blocks, doc.prov, doc.tail, doc.fmRegion);
    const data = JSON.parse((loadDocument(out).blocks[0].props as { dataJson: string }).dataJson);
    expect(data.formulas).toHaveLength(2);
    expect(data.formulas[1]).toEqual({ name: "b", tex: "y" });
  });

  it("round-trips an edited Critique to valid JSX", () => {
    const text = '<Critique weaknesses={["a", "b"]} improvements={["c"]} />\n';
    const doc = loadDocument(text);
    expect(doc.blocks[0].type).toBe("mdxLeaf");
    doc.blocks[0].props = {
      name: "Critique",
      dataJson: JSON.stringify({ weaknesses: ["a", "b", "new"], improvements: ["c"] })
    };
    const out = serializeDocument(doc.blocks, doc.prov, doc.tail, doc.fmRegion);
    const doc2 = loadDocument(out);
    expect(doc2.blocks[0].type).toBe("mdxLeaf");
    const data = JSON.parse((doc2.blocks[0].props as { dataJson: string }).dataJson);
    expect(data.weaknesses).toEqual(["a", "b", "new"]);
    expect(data.improvements).toEqual(["c"]);
  });

  it("round-trips a leaf list item that carries a soft newline (Shift+Enter)", () => {
    // edit-in-place fields are auto-grow textareas: an item can now contain \n.
    const doc = loadDocument('<Critique weaknesses={["a"]} improvements={["c"]} />\n');
    doc.blocks[0].props = {
      name: "Critique",
      dataJson: JSON.stringify({ weaknesses: ["line one\nline two"], improvements: ["c"] })
    };
    const out = serializeDocument(doc.blocks, doc.prov, doc.tail, doc.fmRegion);
    const data = JSON.parse((loadDocument(out).blocks[0].props as { dataJson: string }).dataJson);
    expect(data.weaknesses).toEqual(["line one\nline two"]);
  });

  it("round-trips a leaf scalar string prop containing a newline via expression form", () => {
    // jsxAttr must not emit a raw newline inside a quoted attribute (lossy on
    // reparse) — it falls back to the JSON-escaped {"…"} form.
    const doc = loadDocument("<Figure src=\"a.png\" />\n");
    expect(doc.blocks[0].type).toBe("mdxLeaf");
    doc.blocks[0].props = { name: "Figure", dataJson: JSON.stringify({ src: "a.png", caption: "top\nbottom" }) };
    const out = serializeDocument(doc.blocks, doc.prov, doc.tail, doc.fmRegion);
    expect(out).not.toMatch(/caption="top\nbottom"/);
    const data = JSON.parse((loadDocument(out).blocks[0].props as { dataJson: string }).dataJson);
    expect(data.caption).toBe("top\nbottom");
  });

  it("keeps a multi-paragraph Callout as rawMdx (not silently flattened)", () => {
    const text = "<Callout>\n  First para.\n\n  Second para.\n</Callout>\n";
    const doc = loadDocument(text);
    expect(doc.blocks[0].type).toBe("rawMdx");
    const out = serializeDocument(doc.blocks, doc.prov, doc.tail, doc.fmRegion);
    expect(out).toBe(text);
  });

  it("parses a simple list as per-item blocks, byte-identical", () => {
    const text = "- one\n- two\n- three\n";
    const doc = loadDocument(text);
    expect(doc.blocks.map((b) => b.type)).toEqual(["bulletListItem", "bulletListItem", "bulletListItem"]);
    expect(roundTrip(text)).toBe(text);
  });

  it("keeps a table as rawMdx but stays byte-identical", () => {
    const text = "| a | b |\n| - | - |\n| 1 | 2 |\n";
    const doc = loadDocument(text);
    expect(doc.blocks.some((b) => b.type === "rawMdx")).toBe(true);
    expect(roundTrip(text)).toBe(text);
  });

  it("keeps a nested/loose list as one rawMdx card", () => {
    const text = "- one\n  - nested\n- two\n";
    const doc = loadDocument(text);
    expect(doc.blocks.every((b) => b.type !== "bulletListItem")).toBe(true);
    expect(roundTrip(text)).toBe(text);
  });

  it("edits one list item as a minimal diff, siblings verbatim", () => {
    const text = "- keep one\n- edit me\n- keep three\n";
    const doc = loadDocument(text);
    (doc.blocks[1] as { content: unknown }).content = [{ type: "text", text: "edited", styles: {} }] as never;
    const out = serializeDocument(doc.blocks, doc.prov, doc.tail, doc.fmRegion);
    expect(out).toBe("- keep one\n- edited\n- keep three\n");
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
