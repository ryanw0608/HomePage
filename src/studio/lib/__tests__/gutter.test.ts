import { describe, expect, it } from "vitest";

import { changeRegions, computeLineMarks, hasChanges } from "@/studio/lib/gutter";

describe("computeLineMarks", () => {
  it("marks nothing when the text is unchanged", () => {
    const marks = computeLineMarks("a\nb\nc", "a\nb\nc");
    expect(hasChanges(marks)).toBe(false);
    expect(marks.map((m) => m.kind)).toEqual(["", "", ""]);
  });

  it("flags a replaced line as modify", () => {
    const marks = computeLineMarks("a\nb\nc", "a\nB\nc");
    expect(marks[1]).toMatchObject({ kind: "modify", del: "none" });
    expect(marks[0].kind).toBe("");
    expect(marks[2].kind).toBe("");
  });

  it("flags a net-new line as add", () => {
    const marks = computeLineMarks("a\nc", "a\nb\nc");
    expect(marks[1]).toMatchObject({ kind: "add" });
    expect(marks[0].kind).toBe("");
    expect(marks[2].kind).toBe("");
  });

  it("attaches a deletion to the surviving line via del=before", () => {
    const marks = computeLineMarks("a\nb\nc", "a\nc");
    expect(marks.map((m) => m.kind)).toEqual(["", ""]);
    expect(marks[1].del).toBe("before");
    expect(hasChanges(marks)).toBe(true);
  });

  it("marks a trailing deletion with del=after on the last line", () => {
    const marks = computeLineMarks("a\nb", "a");
    expect(marks).toHaveLength(1);
    expect(marks[0].del).toBe("after");
  });

  it("aligns marks to the working text's line count", () => {
    const newText = "one\ntwo\nthree\nfour";
    const marks = computeLineMarks("one\ntwo\nthree\nfour", newText);
    expect(marks).toHaveLength(4);
    expect(marks.map((m) => m.text)).toEqual(["one", "two", "three", "four"]);
  });
});

describe("changeRegions", () => {
  it("collapses adjacent same-kind lines into one region", () => {
    const marks = computeLineMarks("a\nb\nc\nd", "a\nX\nY\nd");
    const regions = changeRegions(marks);
    expect(regions).toEqual([{ kind: "modify", start: 1, end: 2 }]);
  });

  it("separates regions of different kinds and a pure deletion", () => {
    // add "N" after line 1, and delete original line "d"
    const marks = computeLineMarks("a\nb\nc\nd\ne", "a\nN\nb\nc\ne");
    const regions = changeRegions(marks);
    expect(regions.some((r) => r.kind === "add")).toBe(true);
    expect(regions.some((r) => r.kind === "delete")).toBe(true);
  });

  it("returns no regions for unchanged text", () => {
    expect(changeRegions(computeLineMarks("x\ny", "x\ny"))).toEqual([]);
  });
});
