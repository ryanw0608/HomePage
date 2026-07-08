/*
 * displayMath — a block-level `$$…$$` equation. The stored TeX is the source of
 * truth; it renders with KaTeX (display mode) and is edited in place: click the
 * rendered equation to reveal a TeX field with a live preview, blur to return.
 * The converter round-trips an unchanged block from its verbatim source slice;
 * an edited one serializes as `$$\n<tex>\n$$`.
 */
import { createReactBlockSpec } from "@blocknote/react";
import katex from "katex";
import { useEffect, useMemo, useRef, useState } from "react";

import "katex/dist/katex.min.css";

function render(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex || "\\;", { displayMode, throwOnError: false });
  } catch {
    return tex;
  }
}

function DisplayMathCard({ tex, onTex }: { tex: string; onTex: (next: string) => void }) {
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const html = useMemo(() => render(tex, true), [tex]);
  const preview = useMemo(() => render(tex, false), [tex]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !editing) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [editing, tex]);

  return (
    <div className="studio-displaymath" contentEditable={false}>
      {editing ? (
        <div className="studio-displaymath-edit">
          <textarea
            aria-label="display math TeX"
            className="studio-displaymath-src"
            onBlur={() => setEditing(false)}
            onChange={(e) => onTex(e.target.value)}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }}
            placeholder="\\int_a^b f(x)\\,dx"
            ref={ref}
            rows={1}
            spellCheck={false}
            value={tex}
          />
          <div className="studio-displaymath-preview" dangerouslySetInnerHTML={{ __html: preview }} />
        </div>
      ) : (
        <div
          className="studio-displaymath-render"
          dangerouslySetInnerHTML={{ __html: html }}
          onClick={() => setEditing(true)}
          role="button"
          tabIndex={0}
          title="click to edit"
        />
      )}
    </div>
  );
}

export const DisplayMathBlock = createReactBlockSpec(
  {
    type: "displayMath",
    propSchema: { tex: { default: "" } },
    content: "none"
  },
  {
    render: ({ block, editor }) => (
      <DisplayMathCard
        onTex={(next) => editor.updateBlock(block, { props: { tex: next } })}
        tex={String(block.props.tex ?? "")}
      />
    )
  }
);
