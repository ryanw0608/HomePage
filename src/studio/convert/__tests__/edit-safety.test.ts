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
