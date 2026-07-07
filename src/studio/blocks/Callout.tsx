/*
 * <Callout> as a real editable block: live inline prose slot + a hover
 * control row to switch the callout type and edit the title. Styled by the
 * shared .mdx-preview component CSS — WYSIWYG with the published site.
 */
import { createReactBlockSpec } from "@blocknote/react";

const TYPES = ["note", "insight", "warning", "question", "exam", "definition"] as const;
const DEFAULT_LABELS: Record<string, string> = { exam: "exam-trap", definition: "def" };

export const CalloutBlock = createReactBlockSpec(
  {
    type: "callout",
    propSchema: {
      type: { default: "note", values: [...TYPES] },
      title: { default: "" }
    },
    content: "inline"
  },
  {
    render: ({ block, editor, contentRef }) => {
      const type = String(block.props.type ?? "note");
      const title = String(block.props.title ?? "");
      const label = (title || DEFAULT_LABELS[type] || type).toLowerCase();
      return (
        <div className="mdx-preview studio-component-block">
          <aside className={`callout callout-${type}`}>
            <div className="studio-callout-head" contentEditable={false}>
              <p className="callout-label">{`// ${label}`}</p>
              <span className="studio-callout-controls">
                <select
                  aria-label="callout type"
                  className="studio-callout-select"
                  onChange={(e) => editor.updateBlock(block, { props: { type: e.target.value as never } })}
                  value={type}
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <input
                  aria-label="callout title"
                  className="studio-callout-title"
                  onChange={(e) => editor.updateBlock(block, { props: { title: e.target.value } })}
                  placeholder="title…"
                  value={title}
                />
              </span>
            </div>
            <div className="studio-callout-body" ref={contentRef} />
          </aside>
        </div>
      );
    }
  }
);
