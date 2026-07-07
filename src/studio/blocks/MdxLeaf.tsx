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

type Field =
  | { key: string; label: string; kind: "list" }
  | { key: string; label: string; kind: "text" }
  | { key: string; label: string; kind: "pairs"; a: string; b: string };

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
  Recall: [{ key: "items", label: "q / a pairs", kind: "pairs", a: "q", b: "a" }]
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
