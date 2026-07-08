import { describe, expect, it } from "vitest";

import { addTaxonomy, hasTaxonomyId, removeTaxonomy, renameTaxonomyLabel } from "@/studio/lib/taxonomyEdit";

const SAMPLE = `export const areas = {
  "machine-learning": { label: "Machine Learning" },
  "systems": { label: "Systems" },
  "frontend-engineering": { label: "Frontend Engineering" }
} as const;

export const courses = {
  "ml-foundations": {
    label: "Machine Learning Foundations",
    area: "machine-learning"
  }
} as const satisfies Record<string, { label: string; area: keyof typeof areas }>;
`;

/* A parse that mirrors what the build cares about: eval the areas/courses object
 * literals and assert they are well-formed after each edit. */
function evalBlock(text: string, kind: "areas" | "courses"): Record<string, { label: string; area?: string }> {
  const m = text.match(new RegExp(`export const ${kind} = (\\{[\\s\\S]*?\\n\\})`));
  if (!m) throw new Error("block not found");
  // eslint-disable-next-line no-new-func
  return Function(`"use strict"; return (${m[1]});`)() as Record<string, { label: string; area?: string }>;
}

describe("taxonomy folder edits", () => {
  it("adds an area as a valid, parseable entry and preserves the rest", () => {
    const out = addTaxonomy(SAMPLE, "areas", "efficient-inference", "Efficient Inference");
    const areas = evalBlock(out, "areas");
    expect(areas["efficient-inference"]).toEqual({ label: "Efficient Inference" });
    expect(areas["machine-learning"]).toEqual({ label: "Machine Learning" });
    expect(Object.keys(areas)).toHaveLength(4);
  });

  it("adds a course with its parent area", () => {
    const out = addTaxonomy(SAMPLE, "courses", "algorithms", "Algorithms 101", "systems");
    const courses = evalBlock(out, "courses");
    expect(courses["algorithms"]).toEqual({ label: "Algorithms 101", area: "systems" });
    expect(courses["ml-foundations"].area).toBe("machine-learning");
  });

  it("rejects a duplicate id and a bad id", () => {
    expect(() => addTaxonomy(SAMPLE, "areas", "systems", "Dup")).toThrow(/already exists/);
    expect(() => addTaxonomy(SAMPLE, "areas", "Bad Id", "x")).toThrow(/kebab-case/);
  });

  it("renames only the target label, leaving the id and siblings intact", () => {
    const out = renameTaxonomyLabel(SAMPLE, "areas", "systems", "Computer Systems");
    const areas = evalBlock(out, "areas");
    expect(areas["systems"]).toEqual({ label: "Computer Systems" });
    expect(areas["machine-learning"].label).toBe("Machine Learning");
    expect(hasTaxonomyId(out, "areas", "systems")).toBe(true);
  });

  it("escapes quotes in a label", () => {
    const out = renameTaxonomyLabel(SAMPLE, "areas", "systems", 'A "quoted" name');
    expect(evalBlock(out, "areas")["systems"].label).toBe('A "quoted" name');
  });

  it("removes an entry (including the last one) leaving valid syntax", () => {
    let out = removeTaxonomy(SAMPLE, "areas", "systems");
    expect(hasTaxonomyId(out, "areas", "systems")).toBe(false);
    expect(Object.keys(evalBlock(out, "areas"))).toHaveLength(2);
    out = removeTaxonomy(SAMPLE, "areas", "frontend-engineering"); // last entry, no trailing comma
    expect(Object.keys(evalBlock(out, "areas"))).toEqual(["machine-learning", "systems"]);
  });

  it("round-trips an add then remove back to the original key set", () => {
    const added = addTaxonomy(SAMPLE, "areas", "new-area", "New Area");
    const removed = removeTaxonomy(added, "areas", "new-area");
    expect(Object.keys(evalBlock(removed, "areas"))).toEqual(Object.keys(evalBlock(SAMPLE, "areas")));
  });
});
