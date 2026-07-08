/*
 * mdxLeaf — edit-in-place blocks for the site's leaf MDX components. The
 * rendered component IS the editing surface: click any line and type, Enter
 * adds an item, Backspace on an empty item removes it. No forms, no markdown —
 * the Notion way. dataJson stays the source of truth; the converter prints
 * deterministic JSX. Components without a bespoke editor (FormulaCard,
 * Derivation) fall back to a simple field panel.
 */
import { createReactBlockSpec } from "@blocknote/react";
import katex from "katex";
import { useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";

import { AutoArea, AutoInput } from "@/studio/blocks/EditableField";
import { figureAlign, safeFigureWidth } from "@/studio/preview/components";
// AutoArea = wrapping/auto-grow field for long lines; AutoInput = short single-line labels.
import "@/studio/preview/components.css";

function parseData(dataJson: string): Record<string, unknown> {
  try {
    const v = JSON.parse(dataJson);
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

const strList = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

/* A directly-editable list of strings rendered as the component's own markup. */
function EditList({
  items,
  liClass,
  sign,
  onChange
}: {
  items: string[];
  liClass?: string;
  sign?: string;
  onChange: (next: string[]) => void;
}) {
  const [focus, setFocus] = useState(-1);
  const list = items.length ? items : [""];
  return (
    <>
      {list.map((item, i) => (
        <li className={liClass} key={i}>
          {sign && <span className="diff-sign mark" aria-hidden="true">{sign}</span>}
          <AutoArea
            autoFocus={focus === i}
            onBackspaceEmpty={() => {
              if (list.length > 1) {
                onChange(list.filter((_, j) => j !== i));
                setFocus(Math.max(0, i - 1));
              }
            }}
            onChange={(v) => onChange(list.map((x, j) => (j === i ? v : x)))}
            onEnter={() => {
              onChange([...list.slice(0, i + 1), "", ...list.slice(i + 1)]);
              setFocus(i + 1);
            }}
            placeholder="…"
            value={item}
          />
        </li>
      ))}
    </>
  );
}

function TexInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const preview = useMemo(() => {
    try {
      return katex.renderToString(value || "\\;", { throwOnError: false });
    } catch {
      return value;
    }
  }, [value]);
  return (
    <span className="studio-tex-field">
      <AutoInput className="studio-tex-src" onChange={onChange} placeholder={placeholder} value={value} />
      {value && <span className="studio-tex-preview" dangerouslySetInnerHTML={{ __html: preview }} />}
    </span>
  );
}

/* -------------------------------------------------------------- Figure block
 * WYSIWYG: the rendered <figure> IS the editing surface. The real image shows
 * at its live width/alignment; hovering reveals a toolbar (align L/C/R, width
 * S/M/Full + %), and a right-edge handle drag-resizes it. Caption, alt and src
 * edit in place. width/align are plain props that round-trip through dataJson.
 */
const ALIGNS = ["left", "center", "right"] as const;
const ALIGN_GLYPH: Record<(typeof ALIGNS)[number], string> = { left: "⬅", center: "↔", right: "➡" };
const WIDTH_PRESETS = [
  { label: "S", value: "33%" },
  { label: "M", value: "66%" },
  { label: "Full", value: undefined }
] as const;

function resolveFigureSrc(src: string): string {
  if (!src) return "";
  const base = import.meta.env.BASE_URL || "/";
  return /^(https?:)?\/\//.test(src) || src.startsWith("/") ? src : `${base}${src}`;
}

function FigureEditor({
  data,
  set
}: {
  data: Record<string, unknown>;
  set: (key: string, value: unknown) => void;
}) {
  const figRef = useRef<HTMLElement>(null);
  const src = String(data.src ?? "");
  const resolved = resolveFigureSrc(src);
  const width = safeFigureWidth(data.width);
  const align = figureAlign(data.align) ?? "left";
  const widthPct = width && width.endsWith("%") ? Number.parseInt(width, 10) : undefined;

  const figStyle: CSSProperties = {};
  if (width) figStyle.width = width;
  if (align === "center") figStyle.marginInline = "auto";
  else if (align === "right") {
    figStyle.marginLeft = "auto";
    figStyle.marginRight = "0";
  }

  // Drag the right-edge handle → width becomes a % of the block column, live.
  function startResize(e: ReactPointerEvent) {
    e.preventDefault();
    const fig = figRef.current;
    const parent = fig?.parentElement;
    if (!fig || !parent) return;
    const move = (ev: PointerEvent) => {
      const parentW = parent.clientWidth || 1;
      const left = fig.getBoundingClientRect().left;
      let pct = Math.round(((ev.clientX - left) / parentW) * 100);
      pct = Math.max(15, Math.min(100, pct));
      set("width", pct >= 100 ? undefined : `${pct}%`);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <figure className="studio-figure" ref={figRef} style={figStyle}>
      <div className="studio-figure-toolbar" contentEditable={false}>
        <div className="studio-fig-group" role="group" aria-label="align">
          {ALIGNS.map((a) => (
            <button
              aria-label={`align ${a}`}
              aria-pressed={align === a}
              className={`studio-fig-btn${align === a ? " on" : ""}`}
              key={a}
              onClick={() => set("align", a === "left" ? undefined : a)}
              type="button"
            >
              {ALIGN_GLYPH[a]}
            </button>
          ))}
        </div>
        <div className="studio-fig-group" role="group" aria-label="width">
          {WIDTH_PRESETS.map((p) => (
            <button
              aria-pressed={p.value === width || (!p.value && !width)}
              className={`studio-fig-btn${p.value === width || (!p.value && !width) ? " on" : ""}`}
              key={p.label}
              onClick={() => set("width", p.value)}
              type="button"
            >
              {p.label}
            </button>
          ))}
          <span className="studio-fig-pct">
            <input
              aria-label="width percent"
              className="studio-edit-input"
              max={100}
              min={15}
              onChange={(e) => {
                const n = Number.parseInt(e.target.value, 10);
                set("width", Number.isFinite(n) ? `${Math.max(15, Math.min(100, n))}%` : undefined);
              }}
              placeholder="—"
              type="number"
              value={widthPct ?? ""}
            />
            %
          </span>
        </div>
      </div>
      <div className="studio-figure-frame">
        {resolved ? (
          <img alt={String(data.alt ?? "")} src={resolved} />
        ) : (
          <div className="studio-figure-empty">no image — set a src below</div>
        )}
        <span
          aria-hidden="true"
          className="studio-figure-handle"
          onPointerDown={startResize}
          title="drag to resize"
        />
      </div>
      <div className="studio-figure-src">
        <span className="studio-field-tag">src</span>
        <AutoInput onChange={(v) => set("src", v)} placeholder="media/…" value={src} />
      </div>
      <figcaption>
        <AutoInput onChange={(v) => set("caption", v)} placeholder="caption…" value={String(data.caption ?? "")} />
        <span className="studio-figure-meta">
          <span className="studio-field-tag">alt</span>
          <AutoInput onChange={(v) => set("alt", v)} placeholder="alt text" value={String(data.alt ?? "")} />
        </span>
      </figcaption>
    </figure>
  );
}

/* --------------------------------------------------------------- Bench edit */

type BetterRule = "max" | "min" | null;
interface BenchRow {
  name: string;
  cells: (string | number)[];
  baseline?: boolean;
}

const cellText = (v: unknown): string => (v === undefined || v === null ? "" : String(v));

/* Keep a cell a NUMBER only when its canonical string equals the typed text,
 * otherwise a STRING — so 28.4 stays numeric while "28.40", "N/A", "1e3" stay
 * verbatim. This is what makes number-vs-string cells survive the reparse. */
const coerceCell = (text: string): string | number =>
  text !== "" && Number.isFinite(Number(text)) && String(Number(text)) === text ? Number(text) : text;

const benchNumeric = (v: unknown): number | undefined => {
  const n = typeof v === "number" ? v : Number.parseFloat(String(v ?? "").replace(/[^\d.eE+-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
};

/* Per-column winning row (mirrors Bench.astro) so the editor highlights the
 * exact cell the published component would. */
function benchWinners(columns: string[], rows: BenchRow[], better: BetterRule[]): number[] {
  return columns.map((_, c) => {
    const rule = better[c];
    if (!rule) return -1;
    let bestRow = -1;
    let best: number | undefined;
    rows.forEach((row, r) => {
      const value = benchNumeric(row.cells?.[c]);
      if (value === undefined) return;
      if (best === undefined || (rule === "max" ? value > best : value < best)) {
        best = value;
        bestRow = r;
      }
    });
    return bestRow;
  });
}

/* Emit `better` only when a rule is set, normalised to null holes; all-null → drop. */
const packBetter = (arr: BetterRule[]): BetterRule[] | undefined =>
  arr.some((b) => b === "max" || b === "min") ? arr.map((b) => b ?? null) : undefined;

/*
 * The comparison table, rendered as its REAL bench markup with every field
 * edit-in-place: click a header/cell and type, pick the winner rule per column,
 * toggle a baseline row, add/remove rows and columns. `setMany` writes several
 * keys from one snapshot so a compound edit (e.g. add column ⇒ columns + rows +
 * better) can't clobber itself with stale closures.
 */
function BenchEditor({ data, setMany }: { data: Record<string, unknown>; setMany: (patch: Record<string, unknown>) => void }) {
  const columns = strList(data.columns);
  const rows: BenchRow[] = Array.isArray(data.rows) ? (data.rows as BenchRow[]) : [];
  const better: BetterRule[] = Array.isArray(data.better) ? (data.better as BetterRule[]) : [];
  const caption = typeof data.caption === "string" ? data.caption : "";
  const winners = benchWinners(columns, rows, better);

  const setColumn = (c: number, name: string) => setMany({ columns: columns.map((x, i) => (i === c ? name : x)) });
  const setBetter = (c: number, rule: BetterRule) =>
    setMany({ better: packBetter(columns.map((_, i) => (i === c ? rule : better[i] ?? null))) });
  const addColumn = () =>
    setMany({
      columns: [...columns, ""],
      better: packBetter([...columns.map((_, i) => better[i] ?? null), null]),
      rows: rows.map((row) => ({ ...row, cells: [...(row.cells ?? []), ""] }))
    });
  const removeColumn = (c: number) =>
    setMany({
      columns: columns.filter((_, i) => i !== c),
      better: packBetter(columns.map((_, i) => better[i] ?? null).filter((_, i) => i !== c)),
      rows: rows.map((row) => ({ ...row, cells: (row.cells ?? []).filter((_, i) => i !== c) }))
    });
  const setRowName = (r: number, name: string) =>
    setMany({ rows: rows.map((row, i) => (i === r ? { ...row, name } : row)) });
  const setCell = (r: number, c: number, text: string) =>
    setMany({
      rows: rows.map((row, i) =>
        i === r ? { ...row, cells: (row.cells ?? []).map((v, j) => (j === c ? coerceCell(text) : v)) } : row
      )
    });
  const toggleBaseline = (r: number) =>
    setMany({
      rows: rows.map((row, i) => {
        if (i !== r) return row;
        if (row.baseline) return { name: row.name, cells: row.cells };
        return { ...row, baseline: true };
      })
    });
  const addRow = () => setMany({ rows: [...rows, { name: "", cells: columns.map(() => "") }] });
  const removeRow = (r: number) => setMany({ rows: rows.filter((_, i) => i !== r) });

  return (
    <figure className="bench studio-bench">
      <table>
        <thead>
          <tr>
            <th scope="col">method</th>
            {columns.map((col, c) => (
              <th className="studio-bench-col" key={c} scope="col">
                <span className="studio-bench-colhead">
                  <AutoInput className="studio-bench-input" onChange={(v) => setColumn(c, v)} placeholder="column" value={col} />
                  <button className="studio-bench-colx" onClick={() => removeColumn(c)} title="remove column" type="button">
                    ✕
                  </button>
                </span>
                <select
                  className="studio-bench-better"
                  onChange={(e) => setBetter(c, e.target.value === "max" || e.target.value === "min" ? e.target.value : null)}
                  title="which value wins the column"
                  value={better[c] ?? ""}
                >
                  <option value="">— no winner</option>
                  <option value="max">▲ higher wins</option>
                  <option value="min">▼ lower wins</option>
                </select>
              </th>
            ))}
            <th className="studio-bench-gutter" scope="col">
              <button className="studio-leaf-add" onClick={addColumn} type="button">
                + col
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr className={row.baseline ? "baseline" : undefined} key={r}>
              <th className="studio-bench-rowhead" scope="row">
                <AutoInput className="studio-bench-input" onChange={(v) => setRowName(r, v)} placeholder="method" value={cellText(row.name)} />
                <span className="studio-bench-rowctl">
                  <button
                    className={`studio-bench-base${row.baseline ? " is-on" : ""}`}
                    onClick={() => toggleBaseline(r)}
                    title="mark as a dimmed baseline row"
                    type="button"
                  >
                    base
                  </button>
                  <button className="studio-leaf-x" onClick={() => removeRow(r)} title="remove row" type="button">
                    ✕
                  </button>
                </span>
              </th>
              {columns.map((_, c) => (
                <td className={winners[c] === r ? "winner" : undefined} key={c}>
                  <AutoInput
                    className="studio-bench-input studio-bench-cell"
                    onChange={(v) => setCell(r, c, v)}
                    placeholder="–"
                    value={cellText(row.cells?.[c])}
                  />
                </td>
              ))}
              <td className="studio-bench-gutter" />
            </tr>
          ))}
        </tbody>
      </table>
      <div className="studio-bench-actions">
        <button className="studio-leaf-add" onClick={addRow} type="button">
          + row
        </button>
      </div>
      <figcaption>
        <AutoInput
          className="studio-bench-input studio-bench-caption"
          onChange={(v) => setMany({ caption: v || undefined })}
          placeholder="caption…"
          value={caption}
        />
      </figcaption>
    </figure>
  );
}

/* --------------------------------------------------------- per-component UI */

function LeafEditor({
  name,
  data,
  set,
  setMany
}: {
  name: string;
  data: Record<string, unknown>;
  set: (key: string, value: unknown) => void;
  setMany: (patch: Record<string, unknown>) => void;
}) {
  if (name === "Bench") {
    return <BenchEditor data={data} setMany={setMany} />;
  }
  if (name === "Critique") {
    return (
      <div className="critique">
        <section>
          <p className="critique-label">weaknesses</p>
          <ul className="diff-list">
            <EditList items={strList(data.weaknesses)} liClass="diff-minus" onChange={(v) => set("weaknesses", v)} sign="-" />
          </ul>
        </section>
        <section>
          <p className="critique-label">improvements</p>
          <ul className="diff-list">
            <EditList items={strList(data.improvements)} liClass="diff-plus" onChange={(v) => set("improvements", v)} sign="+" />
          </ul>
        </section>
      </div>
    );
  }
  if (name === "WhenMatrix") {
    const helpsLabel = typeof data.helpsLabel === "string" ? data.helpsLabel : "helps when";
    const hurtsLabel = typeof data.hurtsLabel === "string" ? data.hurtsLabel : "hurts when";
    return (
      <div className="when-matrix">
        <section>
          <p className="matrix-label label-helps">
            <AutoInput onChange={(v) => set("helpsLabel", v || undefined)} value={helpsLabel} />
          </p>
          <ul>
            <EditList items={strList(data.helps)} onChange={(v) => set("helps", v)} sign="✓" />
          </ul>
        </section>
        <section>
          <p className="matrix-label label-hurts">
            <AutoInput onChange={(v) => set("hurtsLabel", v || undefined)} value={hurtsLabel} />
          </p>
          <ul>
            <EditList items={strList(data.hurts)} onChange={(v) => set("hurts", v)} sign="✗" />
          </ul>
        </section>
      </div>
    );
  }
  if (name === "KeyTakeaways") {
    return (
      <section className="takeaways">
        <h2>Key Takeaways</h2>
        <ul>
          <EditList items={strList(data.items)} onChange={(v) => set("items", v)} />
        </ul>
      </section>
    );
  }
  if (name === "Recall") {
    const items = Array.isArray(data.items) ? (data.items as Record<string, unknown>[]) : [];
    const list = items.length ? items : [{ q: "", a: "" }];
    const update = (next: Record<string, unknown>[]) => set("items", next);
    return (
      <section className="recall">
        <p className="recall-label">active recall</p>
        {list.map((item, i) => (
          <div className="studio-recall-item" key={i}>
            <AutoArea
              className="studio-recall-q"
              onChange={(v) => update(list.map((x, j) => (j === i ? { ...x, q: v } : x)))}
              onEnter={() => update([...list.slice(0, i + 1), { q: "", a: "" }, ...list.slice(i + 1)])}
              placeholder="question…"
              value={String(item.q ?? "")}
            />
            <AutoArea
              className="studio-recall-a"
              onChange={(v) => update(list.map((x, j) => (j === i ? { ...x, a: v } : x)))}
              placeholder="answer…"
              value={String(item.a ?? "")}
            />
            {list.length > 1 && (
              <button className="studio-leaf-x" onClick={() => update(list.filter((_, j) => j !== i))} type="button">
                ✕
              </button>
            )}
          </div>
        ))}
      </section>
    );
  }
  if (name === "Figure") {
    return <FigureEditor data={data} set={set} />;
  }
  if (name === "FormulaCard") {
    const rows = Array.isArray(data.formulas) ? (data.formulas as Record<string, unknown>[]) : [];
    const list = rows.length ? rows : [{ name: "", tex: "" }];
    const update = (next: Record<string, unknown>[]) => set("formulas", next);
    return (
      <aside className="formula-card">
        <p className="card-label">
          <AutoInput onChange={(v) => set("title", v || undefined)} placeholder="formula reference" value={String(data.title ?? "")} />
        </p>
        <dl>
          {list.map((row, i) => (
            <div className="formula-row" key={i}>
              <dt>
                <AutoInput onChange={(v) => update(list.map((x, j) => (j === i ? { ...x, name: v } : x)))} placeholder="name" value={String(row.name ?? "")} />
              </dt>
              <dd>
                <TexInput onChange={(v) => update(list.map((x, j) => (j === i ? { ...x, tex: v } : x)))} placeholder="TeX" value={String(row.tex ?? "")} />
                {list.length > 1 && (
                  <button className="studio-leaf-x" onClick={() => update(list.filter((_, j) => j !== i))} type="button">✕</button>
                )}
              </dd>
            </div>
          ))}
        </dl>
        <button className="studio-leaf-add" onClick={() => update([...list, { name: "", tex: "" }])} type="button">+ formula</button>
      </aside>
    );
  }
  if (name === "Derivation") {
    const steps = Array.isArray(data.steps) ? (data.steps as Record<string, unknown>[]) : [];
    const list = steps.length ? steps : [{ text: "" }];
    const update = (next: Record<string, unknown>[]) => set("steps", next);
    return (
      <div className="derivation" style={{ padding: "0.85rem 1.15rem", border: "1px solid var(--line)", borderRadius: 6 }}>
        <p className="recall-label">
          <AutoInput onChange={(v) => set("title", v || undefined)} placeholder="derivation" value={String(data.title ?? "")} />
        </p>
        <ol>
          {list.map((step, i) => (
            <li key={i}>
              <AutoArea
                onChange={(v) => update(list.map((x, j) => (j === i ? { ...x, text: v } : x)))}
                onEnter={() => update([...list.slice(0, i + 1), { text: "" }, ...list.slice(i + 1)])}
                placeholder="step…"
                value={String(step.text ?? "")}
              />
              <TexInput onChange={(v) => update(list.map((x, j) => (j === i ? { ...x, math: v || undefined } : x)))} placeholder="TeX (optional)" value={String(step.math ?? "")} />
              {list.length > 1 && (
                <button className="studio-leaf-x" onClick={() => update(list.filter((_, j) => j !== i))} type="button">✕</button>
              )}
            </li>
          ))}
        </ol>
        <button className="studio-leaf-add" onClick={() => update([...list, { text: "" }])} type="button">+ step</button>
      </div>
    );
  }
  return <p className="studio-muted">unsupported component: {name}</p>;
}

function MdxLeafCard({ name, dataJson, onData }: { name: string; dataJson: string; onData: (next: string) => void }) {
  const data = useMemo(() => parseData(dataJson), [dataJson]);
  // Apply several key updates from ONE base snapshot (compound block edits);
  // an empty array or undefined value deletes the key (house-style stays clean).
  const setMany = (patch: Record<string, unknown>) => {
    const next = { ...data };
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || (Array.isArray(value) && value.length === 0)) delete next[key];
      else next[key] = value;
    }
    onData(JSON.stringify(next));
  };
  const set = (key: string, value: unknown) => setMany({ [key]: value });
  return (
    <div className="mdx-preview studio-component-block studio-leaf" contentEditable={false}>
      <LeafEditor data={data} name={name} set={set} setMany={setMany} />
    </div>
  );
}

export const MdxLeafBlock = createReactBlockSpec(
  {
    type: "mdxLeaf",
    propSchema: { name: { default: "" }, dataJson: { default: "{}" } },
    content: "none"
  },
  {
    render: ({ block, editor }) => (
      <MdxLeafCard
        dataJson={String(block.props.dataJson ?? "{}")}
        name={String(block.props.name ?? "")}
        onData={(next) => editor.updateBlock(block, { props: { dataJson: next } })}
      />
    )
  }
);
