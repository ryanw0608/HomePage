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
import { useMemo, useState } from "react";

import { AutoArea, AutoInput } from "@/studio/blocks/EditableField";
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

/* --------------------------------------------------------- per-component UI */

function LeafEditor({ name, data, set }: { name: string; data: Record<string, unknown>; set: (key: string, value: unknown) => void }) {
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
    return (
      <figure className="studio-figure-edit">
        <div className="studio-figure-src">
          <span className="studio-field-tag">src</span>
          <AutoInput onChange={(v) => set("src", v)} placeholder="media/…" value={String(data.src ?? "")} />
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
  const set = (key: string, value: unknown) => {
    const next = { ...data };
    if (value === undefined || (Array.isArray(value) && value.length === 0)) delete next[key];
    else next[key] = value;
    onData(JSON.stringify(next));
  };
  return (
    <div className="mdx-preview studio-component-block studio-leaf" contentEditable={false}>
      <LeafEditor data={data} name={name} set={set} />
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
