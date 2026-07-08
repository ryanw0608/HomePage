/*
 * Git-style change markers for the editor gutter. Turns the line diff between
 * the last committed text and the working text into per-line marks (for the
 * raw-mode source gutter) and coarse contiguous regions (for the block-mode
 * overview strip). Display only — never touches the converter or the bytes.
 */
import { diffLines } from "@/studio/lib/diff";

/** A mark for one line of the *current* (working) text. `kind` colours the
 * bar; `del` flags a deletion that happened just before/after this line (a
 * removed region has no line of its own in the new text). */
export interface LineMark {
  text: string;
  kind: "" | "add" | "modify";
  del: "none" | "before" | "after";
}

export type RegionKind = "add" | "modify" | "delete";

/** A contiguous run of changed lines, for the block-mode overview strip. */
export interface ChangeRegion {
  kind: RegionKind;
  start: number; // first line index (0-based, inclusive)
  end: number; // last line index (inclusive)
}

/**
 * Map the diff onto the working text's lines. A replaced region (deletions
 * paired with additions) becomes "modify"; net-new lines become "add";
 * deletions with nothing to pair against attach as a `del` flag to the
 * adjacent surviving line. Returns clean marks (all "") when there is no diff
 * or the diff is too large to compute.
 */
export function computeLineMarks(oldText: string, newText: string): LineMark[] {
  const marks: LineMark[] = newText.split("\n").map((text) => ({ text, kind: "", del: "none" }));
  if (oldText === newText) return marks;
  const diff = diffLines(oldText, newText);
  if (!diff) return marks; // diff too large — no gutter rather than a freeze

  let newLine = 0;
  let pendingDel = 0;
  const flushDel = () => {
    if (pendingDel <= 0) return;
    if (newLine < marks.length) marks[newLine].del = "before";
    else if (marks.length > 0) marks[marks.length - 1].del = "after";
    pendingDel = 0;
  };

  for (const item of diff) {
    if (item.kind === "same") {
      flushDel();
      newLine++;
    } else if (item.kind === "del") {
      pendingDel++;
    } else {
      // add — pair with an outstanding deletion => a modified line
      if (newLine < marks.length) marks[newLine].kind = pendingDel > 0 ? "modify" : "add";
      if (pendingDel > 0) pendingDel--;
      newLine++;
    }
  }
  flushDel();
  return marks;
}

/** Collapse per-line marks into contiguous same-kind regions. */
export function changeRegions(marks: LineMark[]): ChangeRegion[] {
  const regions: ChangeRegion[] = [];
  let run: ChangeRegion | null = null;
  const flush = () => {
    if (run) regions.push(run);
    run = null;
  };
  marks.forEach((m, i) => {
    const kind: RegionKind | null =
      m.kind === "add" ? "add" : m.kind === "modify" ? "modify" : m.del !== "none" ? "delete" : null;
    if (kind === null) {
      flush();
      return;
    }
    if (run && run.kind === kind) run.end = i;
    else {
      flush();
      run = { kind, start: i, end: i };
    }
  });
  flush();
  return regions;
}

/** True when any line carries a change (so the gutter is worth rendering). */
export function hasChanges(marks: LineMark[]): boolean {
  return marks.some((m) => m.kind !== "" || m.del !== "none");
}
