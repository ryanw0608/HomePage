/*
 * Live preview pane: renders the MDX body through the site's own markdown
 * pipeline (gfm + KaTeX math), with MDX components shown as framed blocks.
 * Debounced ~250ms; on a mid-keystroke syntax error the last good render
 * stays visible and the error is shown in a slim banner.
 */
import { useEffect, useRef, useState } from "react";

import { renderPreview, splitFrontmatter } from "@/studio/lib/mdx";

export default function Preview({ text }: { text: string }) {
  const [html, setHtml] = useState("");
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    const ticket = ++seq.current;
    const timer = window.setTimeout(() => {
      const { body } = splitFrontmatter(text);
      renderPreview(body)
        .then((rendered) => {
          if (seq.current !== ticket) return;
          setHtml(rendered);
          setError(null);
        })
        .catch((err) => {
          if (seq.current !== ticket) return;
          setError(String((err as Error)?.message ?? err));
        });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [text]);

  return (
    <div className="studio-preview-pane">
      {error && (
        <p className="studio-preview-error" title={error}>
          preview paused — mdx syntax: {error}
        </p>
      )}
      {/* .article-body: same typography the published page uses */}
      <div className="studio-preview article-body" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
