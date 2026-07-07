/*
 * Properties panel — Notion-style frontmatter form. The raw text stays the
 * single source of truth: every change re-emits the full note text through
 * onChange (comment/order-preserving YAML document edits). Validation is
 * the shared build schema, so red here = red in CI.
 */
import { useMemo } from "react";

import type { StudioCollection } from "@/studio/config";
import {
  fieldsFor,
  fmBuildValues,
  fmSet,
  fmValues,
  frontmatterToText,
  parseFrontmatter,
  validateFrontmatter,
  type FieldSpec
} from "@/studio/lib/frontmatter";
import { joinFrontmatter, splitFrontmatter } from "@/studio/lib/mdx";

interface Props {
  collection: StudioCollection;
  text: string;
  onChange: (nextText: string) => void;
}

export default function PropertiesPanel({ collection, text, onChange }: Props) {
  const split = useMemo(() => splitFrontmatter(text), [text]);
  const fm = useMemo(() => parseFrontmatter(split.frontmatter), [split.frontmatter]);
  const values = useMemo(() => fmValues(fm), [fm]);
  // Validate through js-yaml on the serialized text — the exact bytes + parser
  // the site build uses — so "✓ schema ok" here guarantees the build passes.
  const buildValues = useMemo(() => fmBuildValues(fm), [fm]);
  const issues = useMemo(() => validateFrontmatter(collection, buildValues), [collection, buildValues]);
  const fields = useMemo(() => fieldsFor(collection), [collection]);

  if (!split.hasFrontmatter) {
    return (
      <aside className="studio-props">
        <p className="studio-label">properties</p>
        <p className="studio-muted">this file has no frontmatter block.</p>
      </aside>
    );
  }

  function commitField(key: string, value: unknown) {
    fmSet(fm, key, value);
    onChange(joinFrontmatter(frontmatterToText(fm), split.body));
  }

  return (
    <aside aria-label="note properties" className="studio-props">
      <p className="studio-label">
        properties{" "}
        {issues.size > 0 ? (
          <span className="studio-props-bad">✗ {issues.size} invalid</span>
        ) : (
          <span className="studio-props-ok">✓ schema ok</span>
        )}
      </p>
      {fields.map((field) => (
        <Field
          error={issues.get(field.key)}
          field={field}
          key={field.key}
          onCommit={commitField}
          value={values[field.key]}
        />
      ))}
    </aside>
  );
}

function Field(props: {
  field: FieldSpec;
  value: unknown;
  error?: string;
  onCommit: (key: string, value: unknown) => void;
}) {
  const { field, value, error, onCommit } = props;

  return (
    <label className={`studio-field${error ? " has-error" : ""}`}>
      <span className="studio-field-label">
        {field.label}
        {error && <span className="studio-field-error">{error}</span>}
      </span>
      <FieldInput field={field} onCommit={onCommit} value={value} />
    </label>
  );
}

function FieldInput({
  field,
  value,
  onCommit
}: {
  field: FieldSpec;
  value: unknown;
  onCommit: (key: string, value: unknown) => void;
}) {
  switch (field.kind) {
    case "text":
      return (
        <input
          className="studio-input"
          defaultValue={typeof value === "string" ? value : ""}
          key={String(value ?? "")}
          onBlur={(e) => onCommit(field.key, e.target.value.trim() || undefined)}
          type="text"
        />
      );
    case "textarea":
      return (
        <textarea
          className="studio-input studio-input-area"
          defaultValue={typeof value === "string" ? value : ""}
          key={String(value ?? "")}
          onBlur={(e) => onCommit(field.key, e.target.value.trim() || undefined)}
          rows={2}
        />
      );
    case "date": {
      const iso =
        value instanceof Date
          ? value.toISOString().slice(0, 10)
          : typeof value === "string"
            ? value.slice(0, 10)
            : "";
      return (
        <input
          className="studio-input"
          defaultValue={iso}
          key={iso}
          onChange={(e) => onCommit(field.key, e.target.value || undefined)}
          type="date"
        />
      );
    }
    case "number":
      return (
        <input
          className="studio-input"
          defaultValue={typeof value === "number" ? String(value) : ""}
          key={String(value ?? "")}
          onBlur={(e) => {
            const raw = e.target.value.trim();
            onCommit(field.key, raw === "" ? undefined : Number(raw));
          }}
          type="number"
        />
      );
    case "boolean":
      return (
        <span className="studio-switch">
          <input
            checked={value === true}
            onChange={(e) => onCommit(field.key, e.target.checked ? true : value === true ? false : undefined)}
            type="checkbox"
          />
          <span className="faint">{value === true ? "yes" : "no"}</span>
        </span>
      );
    case "select":
      return (
        <select
          className="studio-input"
          onChange={(e) => onCommit(field.key, e.target.value || undefined)}
          value={typeof value === "string" ? value : ""}
        >
          {(field.allowEmpty || typeof value !== "string" || !value) && <option value="">—</option>}
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label === o.value ? o.value : `${o.value} · ${o.label}`}
            </option>
          ))}
        </select>
      );
    case "multi": {
      const selected = Array.isArray(value) ? value.map(String) : [];
      return (
        <span className="studio-chiprow">
          {field.options.map((o) => {
            const on = selected.includes(o.value);
            return (
              <button
                className={`studio-chip${on ? " is-on" : ""}`}
                key={o.value}
                onClick={() => {
                  const next = on ? selected.filter((v) => v !== o.value) : [...selected, o.value];
                  onCommit(field.key, next);
                }}
                title={o.label}
                type="button"
              >
                {o.value}
              </button>
            );
          })}
        </span>
      );
    }
    case "list": {
      const items = Array.isArray(value) ? value.map(String) : [];
      return (
        <textarea
          className="studio-input studio-input-area"
          defaultValue={items.join("\n")}
          key={items.join("\n")}
          onBlur={(e) => {
            const next = e.target.value
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean);
            onCommit(field.key, next.length ? next : undefined);
          }}
          placeholder="one per line"
          rows={Math.max(2, Math.min(5, items.length + 1))}
        />
      );
    }
  }
}
