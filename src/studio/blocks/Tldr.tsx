/*
 * <Tldr> as a real editable block: the prose slot is live BlockNote inline
 * content (type directly, bold/math/links all work). Wrapped in .mdx-preview
 * so it reuses the exact component styles the preview/site use — WYSIWYG.
 */
import { createReactBlockSpec } from "@blocknote/react";

export const TldrBlock = createReactBlockSpec(
  {
    type: "tldr",
    propSchema: { label: { default: "tldr" } },
    content: "inline"
  },
  {
    render: ({ block, contentRef }) => (
      <div className="mdx-preview studio-component-block">
        <aside className="tldr">
          <p aria-hidden="true" className="tldr-prompt" contentEditable={false}>
            <span className="prompt">$</span> {String(block.props.label ?? "tldr")}
          </p>
          <div className="tldr-body" ref={contentRef} />
        </aside>
      </div>
    )
  }
);
