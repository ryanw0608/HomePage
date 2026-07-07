/*
 * Minimal line diff (LCS) for the pre-commit review. Notes are small; the
 * common prefix/suffix is trimmed first and pathological sizes return null
 * ("diff too large") instead of freezing the tab.
 */
export interface DiffLine {
  kind: "same" | "add" | "del";
  text: string;
}

export function diffLines(oldText: string, newText: string): DiffLine[] | null {
  const a = oldText.split("\n");
  const b = newText.split("\n");

  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }

  const ca = a.slice(start, endA);
  const cb = b.slice(start, endB);
  const m = ca.length;
  const n = cb.length;
  if (m * n > 4_000_000) return null;

  const width = n + 1;
  const dp = new Uint32Array((m + 1) * width);
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i * width + j] =
        ca[i] === cb[j]
          ? dp[(i + 1) * width + j + 1] + 1
          : Math.max(dp[(i + 1) * width + j], dp[i * width + j + 1]);
    }
  }

  const out: DiffLine[] = a.slice(0, start).map((text) => ({ kind: "same" as const, text }));
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (ca[i] === cb[j]) {
      out.push({ kind: "same", text: ca[i] });
      i++;
      j++;
    } else if (dp[(i + 1) * width + j] >= dp[i * width + j + 1]) {
      out.push({ kind: "del", text: ca[i] });
      i++;
    } else {
      out.push({ kind: "add", text: cb[j] });
      j++;
    }
  }
  while (i < m) out.push({ kind: "del", text: ca[i++] });
  while (j < n) out.push({ kind: "add", text: cb[j++] });
  out.push(...a.slice(endA).map((text) => ({ kind: "same" as const, text })));
  return out;
}

export function diffStats(lines: DiffLine[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const line of lines) {
    if (line.kind === "add") added++;
    else if (line.kind === "del") removed++;
  }
  return { added, removed };
}

/* Collapse long unchanged runs for display: keep `context` lines around
 * changes, replace the middle with a fold marker. */
export type DiffRow = DiffLine | { kind: "fold"; hidden: number };

export function foldSameRuns(lines: DiffLine[], context = 2): DiffRow[] {
  const keep = new Array<boolean>(lines.length).fill(false);
  lines.forEach((line, index) => {
    if (line.kind === "same") return;
    for (let k = Math.max(0, index - context); k <= Math.min(lines.length - 1, index + context); k++) {
      keep[k] = true;
    }
  });
  const rows: DiffRow[] = [];
  let hidden = 0;
  lines.forEach((line, index) => {
    if (keep[index]) {
      if (hidden > 0) {
        rows.push({ kind: "fold", hidden });
        hidden = 0;
      }
      rows.push(line);
    } else {
      hidden++;
    }
  });
  if (hidden > 0) rows.push({ kind: "fold", hidden });
  return rows;
}
