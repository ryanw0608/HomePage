import { appendFileSync, writeFileSync } from "node:fs";

import { describe, it } from "vitest";

import { loadDocument, serializeDocument } from "@/studio/convert/document";
import { parseBody } from "@/studio/convert/mdast";

const LOG = "C:/Users/wyz16/AppData/Local/Temp/claude/C--Users-wyz16-HomePage/12321060-e35e-4760-83f8-b5f33fd6ff31/scratchpad/probe2.out";
writeFileSync(LOG, "");
function log(...a: unknown[]) {
  appendFileSync(LOG, a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" ") + "\n");
}

function editMiddle(text: string) {
  const doc = loadDocument(text);
  const mid = Math.floor(doc.blocks.length / 2);
  (doc.blocks[mid] as { content: unknown }).content = [{ type: "text", text: "EDIT", styles: {} }];
  return serializeDocument(doc.blocks, doc.prov, doc.tail, doc.fmRegion);
}

function reparseStructure(body: string) {
  const root = parseBody(body) as { children: { type: string; ordered?: boolean; children?: unknown[] }[] };
  return root.children.map((n) => ({ type: n.type, ordered: n.ordered, items: (n.children ?? []).length }));
}

describe("probe2 delimiter-change corruption on edit", () => {
  it("runs", () => {
    const cases: Record<string, string> = {
      "star-bullets": "* a\n* b\n* c\n",
      "plus-bullets": "+ a\n+ b\n+ c\n",
      "paren-ordered": "1) a\n2) b\n3) c\n",
      "dot-ordered-start3": "3. a\n4. b\n5. c\n",
      "dot-ordered-start1": "1. a\n2. b\n3. c\n"
    };
    for (const [name, text] of Object.entries(cases)) {
      const out = editMiddle(text);
      log(`\n=== ${name} ===`);
      log("IN  ", JSON.stringify(text));
      log("OUT ", JSON.stringify(out));
      log("ORIG STRUCT ", JSON.stringify(reparseStructure(text)));
      log("EDIT STRUCT ", JSON.stringify(reparseStructure(out)));
      // Now round-trip the edited output through the converter again and see block types
      const doc2 = loadDocument(out);
      log("REOPEN TYPES", JSON.stringify(doc2.blocks.map((b) => b.type)), "selfCheck", doc2.selfCheckOk);
    }
  });
});
