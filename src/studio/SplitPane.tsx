/*
 * Draggable horizontal split for raw mode: source on the left, live preview
 * on the right, a divider you can drag to any ratio (clamped so neither pane
 * collapses below a readable width). The ratio persists per browser; double-
 * click the divider to reset to 50/50. Pointer capture makes the drag smooth
 * and keeps working if the cursor leaves the divider.
 */
import { useCallback, useRef, useState, type ReactNode } from "react";

const KEY = "studio:split";
const MIN = 22;
const MAX = 78;

function loadRatio(): number {
  try {
    const v = Number(window.localStorage.getItem(KEY));
    if (v >= MIN && v <= MAX) return v;
  } catch {
    /* default */
  }
  return 50;
}

export default function SplitPane({ left, right }: { left: ReactNode; right: ReactNode }) {
  const [ratio, setRatio] = useState(loadRatio);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const applyFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setRatio(Math.max(MIN, Math.min(MAX, pct)));
  }, []);

  const onPointerDown = useCallback((event: React.PointerEvent) => {
    draggingRef.current = true;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }, []);

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (draggingRef.current) applyFromClientX(event.clientX);
    },
    [applyFromClientX]
  );

  const endDrag = useCallback(
    (event: React.PointerEvent) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setDragging(false);
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        /* capture already gone */
      }
      setRatio((current) => {
        try {
          window.localStorage.setItem(KEY, String(Math.round(current)));
        } catch {
          /* session-only */
        }
        return current;
      });
    },
    []
  );

  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    const step = event.shiftKey ? 10 : 3;
    if (event.key === "ArrowLeft") setRatio((r) => Math.max(MIN, r - step));
    else if (event.key === "ArrowRight") setRatio((r) => Math.min(MAX, r + step));
    else return;
    event.preventDefault();
  }, []);

  return (
    <div className={`studio-split${dragging ? " is-dragging" : ""}`} ref={containerRef}>
      <div className="studio-split-pane" style={{ flexBasis: `${ratio}%` }}>
        {left}
      </div>
      <div
        aria-label="Resize editor and preview"
        aria-orientation="vertical"
        aria-valuemax={MAX}
        aria-valuemin={MIN}
        aria-valuenow={Math.round(ratio)}
        className="studio-split-divider"
        onDoubleClick={() => setRatio(50)}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        role="separator"
        tabIndex={0}
      >
        <span className="studio-split-grip" aria-hidden="true" />
      </div>
      <div className="studio-split-pane studio-split-grow">{right}</div>
    </div>
  );
}
