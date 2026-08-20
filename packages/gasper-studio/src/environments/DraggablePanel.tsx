import { useCallback, useLayoutEffect, useRef, useState, type ReactNode, type PointerEvent as RE } from "react";

type Pos = { x: number; y: number };

const EDGE = 40;

function readPos(id: string, fallback: Pos): Pos {
  try {
    const raw = localStorage.getItem(`gasper.panel.${id}`);
    if (!raw) return fallback;
    const p = JSON.parse(raw) as Pos;
    if (Number.isFinite(p.x) && Number.isFinite(p.y)) return p;
  } catch {
    /* */
  }
  return fallback;
}

function writePos(id: string, p: Pos) {
  try {
    localStorage.setItem(`gasper.panel.${id}`, JSON.stringify(p));
  } catch {
    /* */
  }
}

function clampPos(x: number, y: number, panel: HTMLElement | null): Pos {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const w = panel?.offsetWidth ?? 0;
  const h = panel?.offsetHeight ?? 0;
  const minX = Math.min(0, EDGE - w);
  const maxX = Math.max(minX, vw - Math.min(w || EDGE, EDGE));
  const minY = Math.min(0, EDGE - h);
  const maxY = Math.max(minY, vh - Math.min(h || EDGE, EDGE));
  return {
    x: Math.min(Math.max(x, minX), maxX),
    y: Math.min(Math.max(y, minY), maxY),
  };
}

let zTop = 200;

export function DraggablePanel({
  id,
  title,
  defaultX,
  defaultY,
  testId,
  children,
  headerExtra,
  variant = "panel",
}: {
  id: string;
  title?: string;
  defaultX: number;
  defaultY: number;
  testId?: string;
  children: ReactNode;
  headerExtra?: ReactNode;
  variant?: "panel" | "rail";
}) {
  const [pos, setPos] = useState<Pos>(() => readPos(id, { x: defaultX, y: defaultY }));
  const [z, setZ] = useState(200);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const panelRef = useRef<HTMLElement>(null);

  const bring = useCallback(() => {
    zTop += 1;
    setZ(zTop);
  }, []);

  const applyClamp = useCallback((next: Pos) => clampPos(next.x, next.y, panelRef.current), []);

  useLayoutEffect(() => {
    setPos((p) => {
      const next = clampPos(p.x, p.y, panelRef.current);
      if (next.x === p.x && next.y === p.y) return p;
      writePos(id, next);
      return next;
    });
  }, [id]);

  const onDown = (e: RE<HTMLElement>) => {
    if ((e.target as HTMLElement).closest("button, input, label, select")) return;
    bring();
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: RE<HTMLElement>) => {
    if (!drag.current) return;
    setPos(applyClamp({
      x: e.clientX - drag.current.dx,
      y: e.clientY - drag.current.dy,
    }));
  };
  const onUp = () => {
    if (!drag.current) return;
    drag.current = null;
    setPos((p) => {
      const next = clampPos(p.x, p.y, panelRef.current);
      writePos(id, next);
      return next;
    });
  };

  return (
    <aside
      ref={panelRef}
      className={`gasper-float gasper-float--${variant}`}
      data-testid={testId}
      data-panel={id}
      style={{ left: pos.x, top: pos.y, zIndex: z }}
      onPointerDown={bring}
    >
      <div
        className="gasper-float__head"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {title ? <span className="gasper-float__title">{title}</span> : null}
        {headerExtra}
      </div>
      {variant === "panel" ? <div className="gasper-float__body">{children}</div> : children}
    </aside>
  );
}
