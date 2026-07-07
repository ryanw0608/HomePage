/*
 * mdxLeaf — an editable block for the site's leaf (props-only) MDX components
 * that are string-list shaped: Critique, WhenMatrix, KeyTakeaways, Recall.
 * The rendered component is the primary surface (WYSIWYG, via the same faithful
 * renderers the preview uses); a hover "fields" panel exposes structured
 * editors (one item per line) that write back to the block's dataJson prop.
 * dataJson is the source of truth; the converter prints deterministic JSX.
 */
import { createReactBlockSpec } from "@blocknote/react";
import { useMemo, useState } from "react";

import { renderComponent } from "@/studio/preview/components";
import "@/studio/preview/components.css";

interface Col {
  key: string;
  label: string;
}
type Field =
  | { key: string; label: string; kind: "list" }
  | { key: string; label: string; kind: "text" }
  | { key: string; label: string; kind: "bool" }
  | { key: string; label: string; kind: "pairs"; a: string; b: string }
  | { key: string; label: string; kind: "records"; cols: Col[] };

const FIELDS: Record<string, Field[]> = {
  Critique: [
    { key: "weaknesses", label: "weaknesses", kind: "list" },
    { key: "improvements", label: "improvements", kind: "list" }
  ],
  WhenMatrix: [
    { key: "helps", label: "helps when", kind: "list" },
    { key: "hurts", label: "hurts when", kind: "list" },
    { key: "helpsLabel", label: "helps label", kind: "text" },
    { key: "hurtsLabel", label: "hurts label", kind: "text" }
  ],
  KeyTakeaways: [{ key: "items", label: "items", kind: "list" }],
  Recall: [{ key: "items", label: "q / a pairs", kind: "pairs", a: "q", b: "a" }],
  Figure: [
    { key: "src", label: "image src", kind: "text" },
    { key: "alt", label: "alt text", kind: "text" },
    { key: "caption", label: "caption", kind: "text" },
    { key: "source", label: "source", kind: "text" },
    { key: "sourceUrl", label: "source url", kind: "text" }
  ],
  FormulaCard: [
    { key: "title", label: "title", kind: "text" },
    {
      key: "formulas",
      label: "formulas",
      kind: "records",
      cols: [
        { key: "name", label: "name" },
        { key: "tex", label: "TeX" },
        { key: "note", label: "note" }
      ]
    }
  ],
  Derivation: [
    { key: "title", label: "title", kind: "text" },
    { key: "open", label: "open by default", kind: "bool" },
    {
      key: "steps",
      label: "steps",
      kind: "records",
      cols: [
        { key: "text", label: "text" },
        { key: "math", label: "TeX (optional)" }
      ]
    }
  ]
};

function parseData(dataJson: string): Record<string, unknown> {
  try {
    const v = JSON.parse(dataJson);
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

function MdxLeafCard({
  name,
  dataJson,
  onData
}: {
  name: string;
  dataJson: string;
  onData: (next: string) => void;
}) {
  const data = useMemo(() => parseData(dataJson), [dataJson]);
  const [editing, setEditing] = useState(false);

  const html = useMemo(() => renderComponent(name, data, "") ?? `<p>&lt;${name} …&gt;</p>`, [name, data]);

  function setField(key: string, value: unknown) {
    const next = { ...data };
    if (value === undefined || (Array.isArray(value) && value.length === 0)) delete next[key];
    else next[key] = value;
    onData(JSON.stringify(next));
  }

  return (
    <div className="mdx-preview studio-component-block studio-leaf" contentEditable={false}>
      <div className="studio-leaf-bar">
        <span className="studio-rawmdx-chip">{name.toLowerCase()}</span>
        <button className="studio-rawmdx-toggle" onClick={() => setEditing((v) => !v)} type="button">
          {editing ? "done" : "edit fields"}
        </button>
      </div>
      {editing && (
        <div className="studio-leaf-fields">
          {(FIELDS[name] ?? []).map((field) => (
            <LeafField data={data} field={field} key={field.key} onChange={setField} />
          ))}
        </div>
      )}
      <div className="studio-leaf-render" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

function LeafField({
  field,
  data,
  onChange
}: {
  field: Field;
  data: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  if (field.kind === "text") {
    return (
      <label className="studio-leaf-field">
        <span>{field.label}</span>
        <input
          className="studio-input"
          defaultValue={typeof data[field.key] === "string" ? (data[field.key] as string) : ""}
          onBlur={(e) => onChange(field.key, e.target.value.trim() || undefined)}
        />
      </label>
    );
  }
  if (field.kind === "bool") {
    return (
      <label className="studio-leaf-field studio-leaf-bool">
        <input
          checked={data[field.key] === true}
          onChange={(e) => onChange(field.key, e.target.checked)}
          type="checkbox"
        />
        <span>{field.label}</span>
      </label>
    );
  }
  if (field.kind === "records") {
    const rows = Array.isArray(data[field.key]) ? (data[field.key] as Record<string, unknown>[]) : [];
    const update = (next: Record<string, unknown>[]) =>
      onChange(field.key, next.filter((r) => Object.values(r).some((v) => String(v ?? "").trim())));
    return (
      <div className="studio-leaf-field">
        <span>{field.label}</span>
        <div className="studio-leaf-records">
          {rows.map((row, i) => (
            <div className="studio-leaf-record" key={i}>
              {field.cols.map((col) => (
                <input
                  className="studio-input"
                  defaultValue={String(row[col.key] ?? "")}
                  key={col.key}
                  onBlur={(e) => {
                    const next = rows.map((r, j) => (j === i ? { ...r, [col.key]: e.target.value } : r));
                    update(next);
                  }}
                  placeholder={col.label}
                />
              ))}
              <button
                className="studio-rawmdx-toggle"
                onClick={() => update(rows.filter((_, j) => j !== i))}
                type="button"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            className="studio-rawmdx-toggle"
            onClick={() => update([...rows, Object.fromEntries(field.cols.map((c) => [c.key, ""]))])}
            type="button"
          >
            + row
          </button>
        </div>
      </div>
    );
  }
  if (field.kind === "list") {
    const items = Array.isArray(data[field.key]) ? (data[field.key] as unknown[]).map(String) : [];
    return (
      <label className="studio-leaf-field">
        <span>{field.label} (one per line)</span>
        <textarea
          className="studio-input studio-input-area"
          defaultValue={items.join("\n")}
          onBlur={(e) =>
            onChange(
              field.key,
              e.target.value.split("\n").map((s) => s.trim()).filter(Boolean)
            )
          }
          rows={Math.max(2, items.length + 1)}
        />
      </label>
    );
  }
  // pairs: "q :: a" per line
  const pairs = Array.isArray(data[field.key]) ? (data[field.key] as Record<string, unknown>[]) : [];
  const text = pairs.map((p) => `${p[field.a] ?? ""} :: ${p[field.b] ?? ""}`).join("\n");
  return (
    <label className="studio-leaf-field">
      <span>{field.label} (one "q :: a" per line)</span>
      <textarea
        className="studio-input studio-input-area"
        defaultValue={text}
        onBlur={(e) =>
          onChange(
            field.key,
            e.target.value
              .split("\n")
              .map((line) => line.split("::"))
              .filter((parts) => parts[0]?.trim())
              .map((parts) => ({ [field.a]: parts[0].trim(), [field.b]: (parts[1] ?? "").trim() }))
          )
        }
        rows={Math.max(2, pairs.length + 1)}
      />
    </label>
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
