/*
 * Minimap — a slim, VS-Code-style document overview rail pinned to the right
 * edge of the block editor pane. It draws one thin bar per top-level block
 * (height proportional to the block's rendered height, brightness keyed to the
 * block type) plus a translucent viewport rectangle tracking the scroll
 * position. Click or drag anywhere on the rail to scroll the editor there.
 *
 * Pure enhancement: it observes the editor's own scroll container + DOM and
 * never touches the converter. It stays inert (renders nothing) when the
 * document is empty, and CSS hides it on narrow screens. Reduced-motion users
 * get instant (non-animated) jumps.
 */
import { useCallback, useEffect, useRef, useState } from "react";

interface Row {
  /** top offset within the scroll content, in px */
  top: number;
  /** rendered block height, in px */
  height: number;
  /** BlockNote data-content-type (paragraph/heading/quote/codeBlock/…) */
  type: string;
  /** heading level 1–6 when type === "heading" */
  level: number;
}

interface Geometry {
  rows: Row[];
  /** total scrollable content height (scrollHeight) */
  content: number;
  /** visible viewport height (clientHeight) */
  view: number;
  /** current scrollTop */
  scroll: number;
}

const EMPTY: Geometry = { rows: [], content: 0, view: 0, scroll: 0 };

function readGeometry(scroller: HTMLElement): Geometry {
  const containerTop = scroller.getBoundingClientRect().top;
  // Top-level blocks only: the first block-group directly under the editor.
  const group = scroller.querySelector(".bn-editor > .bn-block-group");
  const rows: Row[] = [];
  if (group) {
    const outers = group.querySelectorAll(":scope > .bn-block-outer");
    for (const el of Array.from(outers)) {
      const rect = el.getBoundingClientRect();
      if (rect.height <= 0) continue;
      const content = el.querySelector(".bn-block-content");
      const type = content?.getAttribute("data-content-type") ?? "paragraph";
      const level = Number(content?.getAttribute("data-level") ?? "0") || 0;
      rows.push({
        top: rect.top - containerTop + scroller.scrollTop,
        height: rect.height,
        type,
        level
      });
    }
  }
  return {
    rows,
    content: scroller.scrollHeight,
    view: scroller.clientHeight,
    scroll: scroller.scrollTop
  };
}

export default function Minimap({ scrollRef }: { scrollRef: React.RefObject<HTMLElement | null> }) {
  const [geo, setGeo] = useState<Geometry>(EMPTY);
  const railRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const draggingRef = useRef(false);

  // rAF-batched refresh: cheap to call from scroll / resize / mutation.
  const refresh = useCallback(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    if (rafRef.current) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = 0;
      const s = scrollRef.current;
      if (s) setGeo(readGeometry(s));
    });
  }, [scrollRef]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return undefined;
    refresh();

    scroller.addEventListener("scroll", refresh, { passive: true });
    const ro = new ResizeObserver(refresh);
    ro.observe(scroller);
    const editor = scroller.querySelector(".bn-editor");
    if (editor) ro.observe(editor);
    // Block add/remove/type changes: watch the editor subtree.
    const mo = new MutationObserver(refresh);
    mo.observe(editor ?? scroller, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-content-type", "data-level"]
    });

    return () => {
      scroller.removeEventListener("scroll", refresh);
      ro.disconnect();
      mo.disconnect();
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [scrollRef, refresh]);

  // Map a pointer Y (client coords) onto a scrollTop that centres the viewport
  // on that point, then scroll the editor there.
  const scrollToPointer = useCallback(
    (clientY: number) => {
      const rail = railRef.current;
      const scroller = scrollRef.current;
      if (!rail || !scroller) return;
      const rect = rail.getBoundingClientRect();
      const railH = rect.height || 1;
      const frac = Math.min(1, Math.max(0, (clientY - rect.top) / railH));
      const maxScroll = scroller.scrollHeight - scroller.clientHeight;
      const target = frac * scroller.scrollHeight - scroller.clientHeight / 2;
      const reduce =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      scroller.scrollTo({
        top: Math.min(maxScroll, Math.max(0, target)),
        behavior: reduce || draggingRef.current ? "auto" : "smooth"
      });
    },
    [scrollRef]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      draggingRef.current = true;
      railRef.current?.setPointerCapture(e.pointerId);
      scrollToPointer(e.clientY);
    },
    [scrollToPointer]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      scrollToPointer(e.clientY);
    },
    [scrollToPointer]
  );

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    if (railRef.current?.hasPointerCapture(e.pointerId)) {
      railRef.current.releasePointerCapture(e.pointerId);
    }
  }, []);

  // Nothing to show for an empty / unscrollable-and-blank document.
  if (geo.rows.length === 0 || geo.content <= 0) return null;

  // Scale the whole document into the rail's own height. Never magnify past 1:1
  // (a short doc shouldn't stretch to fill), and cap the viewport box to the
  // rail so a non-scrolling doc doesn't overflow it.
  const railH = railRef.current?.clientHeight ?? geo.view;
  const scale = Math.min(1, railH > 0 ? railH / geo.content : 0);
  const vpTop = geo.scroll * scale;
  const vpHeight = Math.max(12, Math.min(railH, geo.view * scale));

  return (
    <div
      aria-hidden="true"
      className="studio-minimap"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      ref={railRef}
    >
      <div className="studio-minimap-blocks">
        {geo.rows.map((r, i) => (
          <div
            className={`studio-minimap-row is-${r.type}${r.level ? ` is-h${r.level}` : ""}`}
            key={i}
            style={{ top: `${r.top * scale}px`, height: `${Math.max(1.5, r.height * scale)}px` }}
          />
        ))}
      </div>
      <div className="studio-minimap-viewport" style={{ top: `${vpTop}px`, height: `${vpHeight}px` }} />
    </div>
  );
}
