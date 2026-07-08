/*
 * ChangeGutter — git-style change markers in the editor's left margin, diffed
 * against the last committed version. Two flavours:
 *
 *  - RawChangeGutter: a transparent, scroll-synced mirror of the textarea that
 *    draws a coloured bar (green add / orange modify / red delete) aligned to
 *    each changed source line. It mirrors the textarea's exact typography and
 *    wrapping so the bars line up even across wrapped lines.
 *  - BlockChangeGutter: a coarse overview strip (block mode has no source
 *    lines), one tick per changed region positioned by its line fraction.
 *
 * Display only; cleared by the parent when the note is committed (not dirty).
 */
import { useLayoutEffect, useRef, type RefObject } from "react";

import type { ChangeRegion, LineMark } from "@/studio/lib/gutter";

function lineClass(m: LineMark): string {
  const parts = ["cg-ln"];
  if (m.kind === "add") parts.push("cg-add");
  else if (m.kind === "modify") parts.push("cg-modify");
  if (m.del === "before") parts.push("cg-del-before");
  else if (m.del === "after") parts.push("cg-del-after");
  return parts.join(" ");
}

export function RawChangeGutter({
  marks,
  textareaRef
}: {
  marks: LineMark[];
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const mirrorRef = useRef<HTMLDivElement>(null);

  // Keep the mirror's scroll pinned to the textarea. Re-runs on every marks
  // change so a height shift (typing) re-syncs after the DOM updates.
  useLayoutEffect(() => {
    const ta = textareaRef.current;
    const mirror = mirrorRef.current;
    if (!ta || !mirror) return;
    const sync = () => {
      mirror.scrollTop = ta.scrollTop;
      mirror.scrollLeft = ta.scrollLeft;
    };
    sync();
    ta.addEventListener("scroll", sync, { passive: true });
    return () => ta.removeEventListener("scroll", sync);
  }, [textareaRef, marks]);

  return (
    <div aria-hidden="true" className="cg-mirror" ref={mirrorRef}>
      {marks.map((m, i) => (
        <div className={lineClass(m)} key={i}>
          {m.text}
        </div>
      ))}
    </div>
  );
}

export function BlockChangeGutter({ regions, totalLines }: { regions: ChangeRegion[]; totalLines: number }) {
  if (regions.length === 0 || totalLines <= 0) return null;
  return (
    <div aria-hidden="true" className="cg-strip">
      {regions.map((r, i) => {
        const mid = (r.start + r.end) / 2 + 0.5;
        const top = Math.max(0, Math.min(100, (mid / totalLines) * 100));
        return <span className={`cg-tick cg-tick-${r.kind}`} key={i} style={{ top: `${top}%` }} />;
      })}
    </div>
  );
}
