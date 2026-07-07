/*
 * Live preview pane: renders the MDX body through the site's own markdown
 * pipeline (gfm + KaTeX math), with MDX components shown as framed blocks.
 * Debounced ~250ms; on a mid-keystroke syntax error the last good render
 * stays visible and the error is shown in a slim banner.
 */
import jsYaml from "js-yaml";
import { useEffect, useRef, useState, type Ref, type UIEventHandler } from "react";

import { renderPreview, splitFrontmatter } from "@/studio/lib/mdx";
import "@/studio/preview/components.css";

interface Props {
  text: string;
  /** Attached to the scroll container so raw mode can sync-scroll source↔preview. */
  scrollRef?: Ref<HTMLDivElement>;
  onScroll?: UIEventHandler<HTMLDivElement>;
}

export default function Preview({ text, scrollRef, onScroll }: Props) {
  const [html, setHtml] = useState("");
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    const ticket = ++seq.current;
    const timer = window.setTimeout(() => {
      const { frontmatter, body } = splitFrontmatter(text);
      let fm: Record<string, unknown> = {};
      try {
        const parsed = jsYaml.load(frontmatter);
        if (parsed && typeof parsed === "object") fm = parsed as Record<string, unknown>;
      } catch {
        /* mid-edit frontmatter — bindings just won't resolve */
      }
      renderPreview(body, fm)
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
    <div className="studio-preview-pane" onScroll={onScroll} ref={scrollRef}>
      {error && (
        <p className="studio-preview-error" title={error}>
          preview paused — mdx syntax: {error}
        </p>
      )}
      {/* .article-body: same typography the published page uses; mdx-preview
          scopes the ported component styles */}
      <div className="studio-preview mdx-preview article-body" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
