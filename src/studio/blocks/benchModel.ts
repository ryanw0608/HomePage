/*
 * Pure data transforms for the Bench editor, kept React-free so the
 * corruption-sensitive logic is unit-testable (adversarial-review lock).
 */
export type BetterRule = "max" | "min" | null;

export interface BenchRow {
  name: string;
  cells: (string | number)[];
  baseline?: boolean;
  /** Existing notes may carry extra row fields (note, ref, …) — edits must
   * never drop them. */
  [key: string]: unknown;
}

/* Toggle a row's baseline flag. Turning it OFF strips ONLY the baseline key —
 * every other field on the row object survives the edit (the review found the
 * old rebuild-{name,cells} form silently destroyed unknown row metadata). */
export function toggleBaselineRow(rows: BenchRow[], r: number): BenchRow[] {
  return rows.map((row, i) => {
    if (i !== r) return row;
    if (row.baseline) {
      const { baseline: _off, ...rest } = row;
      return rest as BenchRow;
    }
    return { ...row, baseline: true };
  });
}
