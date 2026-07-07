/*
 * inlineMath — a custom BlockNote inline content node for `$…$`. The stored
 * value is the exact TeX (source of truth); it renders via KaTeX. Atomic
 * (content: "none"); click-to-edit the TeX lands in a later step.
 */
import { createReactInlineContentSpec } from "@blocknote/react";
import katex from "katex";

export const InlineMath = createReactInlineContentSpec(
  {
    type: "inlineMath",
    propSchema: { tex: { default: "" } },
    content: "none"
  },
  {
    render: ({ inlineContent }) => {
      const tex = String(inlineContent.props.tex ?? "");
      let html = "";
      try {
        html = katex.renderToString(tex, { throwOnError: false });
      } catch {
        html = tex;
      }
      return (
        <span
          className="studio-inline-math"
          contentEditable={false}
          dangerouslySetInnerHTML={{ __html: html }}
          title={tex}
        />
      );
    }
  }
);
