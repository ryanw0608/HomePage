/*
 * The escape-hatch block. Renders the component/region WYSIWYG-first: the
 * rendered output is the primary surface, with the raw MDX source tucked
 * behind a "source" toggle. Holds the source verbatim so it always round-
 * trips byte-exact. Real editable component blocks (Tldr/Callout/… inline
 * editing) replace this for the common components in P3.3.
 */
import { createReactBlockSpec } from "@blocknote/react";
import { useEffect, useState } from "react";

import { renderPreview } from "@/studio/lib/mdx";
import "@/studio/preview/components.css";

const REASON_LABEL: Record<string, string> = {
  "whole-doc": "whole note",
  "unknown-component": "component",
  "non-literal-expr": "expression",
  "container-multiblock": "content",
  "rich-table": "table",
  "raw-html": "raw html",
  footnote: "footnote",
  "import-export": "import",
  "parse-error": "raw"
};

function RawMdxCard({
  source,
  reason,
  onEdit
}: {
  source: string;
  reason: string;
  onEdit: (next: string) => void;
}) {
  const [html, setHtml] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(false);

  useEffect(() => {
    let alive = true;
    // NOTE: no frontmatter here, so items={frontmatter.takeaways}-bound
    // components fall back to a placeholder in block mode (the split-pane
    // Preview resolves them). Block mode is reworked further in P3.3.
    renderPreview(source)
      .then((rendered) => {
        if (!alive) return;
        setHtml(rendered);
        setError(null);
      })
      .catch((err) => {
        if (alive) setError(String((err as Error)?.message ?? err));
      });
    return () => {
      alive = false;
    };
  }, [source]);

  return (
    <div className="studio-rawmdx" contentEditable={false}>
      <div className="studio-rawmdx-bar">
        <span className="studio-rawmdx-chip">{REASON_LABEL[reason] ?? reason}</span>
        <button
          className="studio-rawmdx-toggle"
          onClick={() => setShowSource((v) => !v)}
          type="button"
        >
          {showSource ? "hide source" : "‹ › source"}
        </button>
      </div>
      {showSource && (
        <textarea
          aria-label="raw mdx source"
          className="studio-rawmdx-src"
          onChange={(event) => onEdit(event.target.value)}
          spellCheck={false}
          value={source}
        />
      )}
      {error ? (
        <p className="studio-rawmdx-error">mdx: {error}</p>
      ) : (
        <div className="studio-rawmdx-render mdx-preview article-body" dangerouslySetInnerHTML={{ __html: html }} />
      )}
    </div>
  );
}

export const RawMdxBlock = createReactBlockSpec(
  {
    type: "rawMdx",
    propSchema: {
      source: { default: "" },
      reason: { default: "whole-doc" }
    },
    content: "none"
  },
  {
    render: ({ block, editor }) => (
      <RawMdxCard
        onEdit={(next) => editor.updateBlock(block, { props: { source: next } })}
        reason={block.props.reason as string}
        source={block.props.source as string}
      />
    )
  }
);
