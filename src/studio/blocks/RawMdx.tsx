/*
 * The escape-hatch block. Holds raw MDX source verbatim (so it always
 * round-trips byte-exact) with a live rendered preview beside the source,
 * and a reason chip explaining why the region stayed raw. In P3.1 the whole
 * note body is one of these; from P3.2 it's the fallback for anything the
 * structured converter can't safely represent.
 */
import { createReactBlockSpec } from "@blocknote/react";
import { useEffect, useState } from "react";

import { renderPreview } from "@/studio/lib/mdx";
import "@/studio/preview/components.css";

const REASON_LABEL: Record<string, string> = {
  "whole-doc": "whole note",
  "unknown-component": "unknown component",
  "non-literal-expr": "expression",
  "container-multiblock": "multi-block content",
  "rich-table": "table",
  "raw-html": "raw html",
  footnote: "footnote",
  "import-export": "import/export",
  "parse-error": "parse error"
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

  useEffect(() => {
    let alive = true;
    // NOTE: no frontmatter passed here, so `items={frontmatter.takeaways}`-
    // bound components fall back to a placeholder in the block-mode card. The
    // split-pane Preview resolves them; block mode is reworked in P3.2.
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
      <div className="studio-rawmdx-head">
        <span className="studio-rawmdx-chip">raw mdx · {REASON_LABEL[reason] ?? reason}</span>
        <span className="studio-rawmdx-hint">edited here, rendered below</span>
      </div>
      <textarea
        aria-label="raw mdx source"
        className="studio-rawmdx-src"
        onChange={(event) => onEdit(event.target.value)}
        spellCheck={false}
        value={source}
      />
      {error ? (
        <p className="studio-rawmdx-error">mdx: {error}</p>
      ) : (
        <div className="studio-rawmdx-preview mdx-preview article-body" dangerouslySetInnerHTML={{ __html: html }} />
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
