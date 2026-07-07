import { appendFileSync, writeFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { loadDocument, serializeDocument } from "@/studio/convert/document";
import { parseBody } from "@/studio/convert/mdast";
import { parseBodyToSegments } from "@/studio/convert/parse";

const LOG = "C:/Users/wyz16/AppData/Local/Temp/claude/C--Users-wyz16-HomePage/12321060-e35e-4760-83f8-b5f33fd6ff31/scratchpad/probe.out";
writeFileSync(LOG, "");
function log(s: string) {
  appendFileSync(LOG, s + "\n");
}
function log0(...args: unknown[]) {
  appendFileSync(LOG, args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ") + "\n");
}

function rt(text: string): string {
  const doc = loadDocument(text);
  return serializeDocument(doc.blocks, doc.prov, doc.tail, doc.fmRegion);
}

function report(label: string, text: string) {
  const doc = loadDocument(text);
  const out = rt(text);
  log(
    `\n=== ${label} ===\n` +
      `INPUT   : ${JSON.stringify(text)}\n` +
      `TYPES   : ${JSON.stringify(doc.blocks.map((b) => b.type))}\n` +
      `selfCheck: ${doc.selfCheckOk}\n` +
      `OUTPUT  : ${JSON.stringify(out)}\n` +
      `IDENTICAL: ${out === text}`
  );
  return { doc, out, identical: out === text };
}

describe("probe list byte-identity", () => {
  it("(a) loose list with blank lines between items", () => {
    const text = "- a\n\n- b\n\n- c\n";
    const r = report("loose-list", text);
    // dump segment provenance
    const seg = parseBodyToSegments("- a\n\n- b\n\n- c\n");
    log0("SEGMENTS", JSON.stringify(seg.segments.map((s) => ({ t: s.block.type, gap: s.gapBefore, src: s.source })), null, 0), "TAIL", JSON.stringify(seg.tail));
    expect(r.identical).toBe(true);
  });

  it("(a2) loose list edit one item", () => {
    const text = "- a\n\n- b\n\n- c\n";
    const doc = loadDocument(text);
    (doc.blocks[1] as { content: unknown }).content = [{ type: "text", text: "EDIT", styles: {} }];
    const out = serializeDocument(doc.blocks, doc.prov, doc.tail, doc.fmRegion);
    log0("LOOSE EDIT OUT", JSON.stringify(out));
    const reparsed = parseBody(out.replace(/^---[\s\S]*?---\n/, ""));
    log0("LOOSE EDIT REPARSE TOP TYPES", JSON.stringify((reparsed.children as { type: string }[]).map((n) => n.type)));
  });

  it("(b1) ordered list starting at 3", () => {
    const text = "3. a\n4. b\n5. c\n";
    const r = report("ordered-start-3", text);
    expect(r.identical).toBe(true);
  });

  it("(b2) ordered list with 1) markers", () => {
    const text = "1) a\n2) b\n3) c\n";
    const r = report("ordered-paren", text);
    expect(r.identical).toBe(true);
  });

  it("(b3) ordered list edit item preserves marker", () => {
    const text = "3. a\n4. b\n5. c\n";
    const doc = loadDocument(text);
    (doc.blocks[1] as { content: unknown }).content = [{ type: "text", text: "EDIT", styles: {} }];
    const out = serializeDocument(doc.blocks, doc.prov, doc.tail, doc.fmRegion);
    log0("ORDERED EDIT OUT", JSON.stringify(out));
  });

  it("(c) items with continuation / soft-wrapped lines", () => {
    const text = "- first line\n  continues here\n- second\n";
    const r = report("continuation", text);
    expect(r.identical).toBe(true);
  });

  it("(c2) continuation without indent (lazy)", () => {
    const text = "- first line\ncontinues lazily\n- second\n";
    const r = report("continuation-lazy", text);
    expect(r.identical).toBe(true);
  });

  it("(d1) list immediately followed by paragraph no blank line", () => {
    const text = "- a\n- b\nparagraph after\n";
    const r = report("list-then-para", text);
    expect(r.identical).toBe(true);
  });

  it("(d2) list at EOF without trailing newline", () => {
    const text = "- a\n- b\n- c";
    const r = report("no-trailing-nl", text);
    expect(r.identical).toBe(true);
  });

  it("(d3) paragraph then list no blank line", () => {
    const text = "intro\n- a\n- b\n";
    const r = report("para-then-list", text);
    expect(r.identical).toBe(true);
  });

  it("(e1) last item has trailing spaces", () => {
    const text = "- a\n- b  \n";
    const r = report("trailing-spaces", text);
    expect(r.identical).toBe(true);
  });

  it("(e2) indented list", () => {
    const text = "  - a\n  - b\n";
    const r = report("indented-list", text);
    expect(r.identical).toBe(true);
  });

  it("(e3) list with 2-space bullet marker (multi-space after dash)", () => {
    const text = "-  a\n-  b\n";
    const r = report("multi-space-marker", text);
    expect(r.identical).toBe(true);
  });

  it("(f) star and plus bullets", () => {
    for (const text of ["* a\n* b\n", "+ a\n+ b\n"]) {
      const r = report("bullet-variant", text);
      expect(r.identical).toBe(true);
    }
  });

  it("(g) blank line inside item then edit boundary force", () => {
    const text = "- a\n\n- b\n";
    const doc = loadDocument(text);
    // edit BOTH so both go house-style; check boundary
    (doc.blocks[0] as { content: unknown }).content = [{ type: "text", text: "A", styles: {} }];
    const out = serializeDocument(doc.blocks, doc.prov, doc.tail, doc.fmRegion);
    log0("LOOSE EDIT-FIRST OUT", JSON.stringify(out));
  });
});
