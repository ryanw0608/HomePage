import { describe, expect, it } from "vitest";

import { loadDocument, serializeDocument } from "@/studio/convert/document";
import { parseBody } from "@/studio/convert/mdast";
import type { ConvBlock } from "@/studio/convert/rawmdx";

/*
 * Regression locks for the adversarial-review corruption findings on the
 * edited-block house-style path. Each reproduces the reported break and asserts
 * the fixed behaviour by re-parsing the serialized output.
 */
function topTypes(body: string): string[] {
  return (parseBody(body).children as { type: string }[]).map((n) => n.type);
}

function editParagraph(text: string, newText: string) {
  const doc = loadDocument(text);
  const para = doc.blocks.find((b) => b.type === "paragraph") as ConvBlock;
  para.content = [{ type: "text", text: newText, styles: {} }] as never;
  return serializeDocument(doc.blocks, doc.prov, doc.tail, doc.fmRegion);
}

describe("edited-block serialization safety", () => {
  it("inserting a new block at the top keeps the following block separate", () => {
    const doc = loadDocument("Intro para.\n\nSecond.\n");
    doc.blocks.unshift({ id: "new-top", type: "paragraph", content: [{ type: "text", text: "TOP", styles: {} }] } as never);
    const out = serializeDocument(doc.blocks, doc.prov, doc.tail, doc.fmRegion);
    // must NOT merge: TOP / Intro para. / Second. stay 3 separate paragraphs
    const body = out.replace(/^---[\s\S]*?---\n?/, "");
    expect(topTypes(body).filter((t) => t === "paragraph").length).toBe(3);
    expect(out).not.toContain("TOPIntro");
  });

  it("a paragraph edited to start with a block marker stays a paragraph", () => {
    for (const marker of ["> quote-ish", "- list-ish", "+ plus", "# not heading", "1. num", "1) num"]) {
      const out = editParagraph("# Keep\n\nEdit me.\n", marker);
      const body = out.replace(/^#[^\n]*\n\n/, "");
      expect(topTypes(body)).toEqual(["paragraph"]);
    }
  });

  it("inline code containing backticks re-fences safely", () => {
    const doc = loadDocument("code here\n");
    const p = doc.blocks[0] as ConvBlock;
    p.content = [{ type: "text", text: "a ` b", styles: { code: true } }] as never;
    const out = serializeDocument(doc.blocks, doc.prov, doc.tail, doc.fmRegion);
    const node = parseBody(out).children[0] as { children?: { type: string; value?: string }[] };
    const code = node.children?.find((c) => c.type === "inlineCode");
    expect(code?.value).toBe("a ` b");
  });

  it("a code block whose content contains a fence re-fences safely", () => {
    const doc = loadDocument("```\nx\n```\n");
    const cb = doc.blocks[0] as ConvBlock;
    cb.content = [{ type: "text", text: "line\n```\nmore", styles: {} }] as never;
    const out = serializeDocument(doc.blocks, doc.prov, doc.tail, doc.fmRegion);
    const nodes = parseBody(out).children as { type: string }[];
    expect(nodes.length).toBe(1);
    expect(nodes[0].type).toBe("code");
  });

  it("an edited Callout body starting with a block marker stays a callout", () => {
    for (const body of ["- dash note", "1. first step", "> 90% of cases", "# top", "+ plus"]) {
      const doc = loadDocument('<Callout type="note">\n  original\n</Callout>\n');
      expect(doc.blocks[0].type).toBe("callout");
      doc.blocks[0].content = [{ type: "text", text: body, styles: {} }] as never;
      const out = serializeDocument(doc.blocks, doc.prov, doc.tail, doc.fmRegion);
      const doc2 = loadDocument(out);
      expect(doc2.blocks[0].type).toBe("callout"); // did NOT downgrade to rawMdx
    }
  });

  it("an edited Callout title with an HTML entity survives verbatim", () => {
    for (const title of ["Q&amp;A", "R&D copy &copy; x", "a &lt; b"]) {
      const doc = loadDocument("<Callout>\n  body\n</Callout>\n");
      doc.blocks[0].props = { type: "note", title };
      const out = serializeDocument(doc.blocks, doc.prov, doc.tail, doc.fmRegion);
      const doc2 = loadDocument(out);
      expect((doc2.blocks[0].props as { title: string }).title).toBe(title);
    }
  });

  it("editing a *-bullet or 1)-ordered list item keeps the list's marker", () => {
    for (const [text, expect1] of [
      ["* a\n* b\n* c\n", "* a\n* EDIT\n* c\n"],
      ["+ a\n+ b\n+ c\n", "+ EDIT\n+ b\n+ c\n"],
      ["1) a\n2) b\n3) c\n", "1) a\n2) EDIT\n3) c\n"]
    ] as const) {
      const doc = loadDocument(text);
      const idx = expect1.indexOf("EDIT") === 0 || /^[-*+]\sEDIT/.test(expect1) ? 0 : expect1.split("\n").findIndex((l) => l.includes("EDIT"));
      (doc.blocks[idx] as { content: unknown }).content = [{ type: "text", text: "EDIT", styles: {} }] as never;
      expect(serializeDocument(doc.blocks, doc.prov, doc.tail, doc.fmRegion)).toBe(expect1);
    }
  });

  it("editing the first item of a list starting at 3 keeps the ordinal", () => {
    const doc = loadDocument("3. a\n4. b\n5. c\n");
    (doc.blocks[0] as { content: unknown }).content = [{ type: "text", text: "EDIT", styles: {} }] as never;
    expect(serializeDocument(doc.blocks, doc.prov, doc.tail, doc.fmRegion)).toBe("3. EDIT\n4. b\n5. c\n");
  });

  it("converting a middle list item to a paragraph does not merge it upward", () => {
    const doc = loadDocument("- item1\n- item2\n- item3\n");
    (doc.blocks[1] as { type: string }).type = "paragraph";
    const out = serializeDocument(doc.blocks, doc.prov, doc.tail, doc.fmRegion);
    // reparse: item2 must be its own paragraph, NOT swallowed into item1
    const nodes = parseBody(out).children as { type: string }[];
    expect(nodes.some((n) => n.type === "paragraph")).toBe(true);
    expect(out).not.toMatch(/item1\nitem2/);
  });

  it("a link href with a space survives round-trip", () => {
    const doc = loadDocument("link me\n");
    const p = doc.blocks[0] as ConvBlock;
    p.content = [{ type: "link", href: "/a b c", content: [{ type: "text", text: "x", styles: {} }] }] as never;
    const out = serializeDocument(doc.blocks, doc.prov, doc.tail, doc.fmRegion);
    const node = parseBody(out).children[0] as { children?: { type: string; url?: string }[] };
    const link = node.children?.find((c) => c.type === "link");
    expect(link?.url).toBe("/a b c");
  });
});
