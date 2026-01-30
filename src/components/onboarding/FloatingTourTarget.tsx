import { ReactNode, RefObject, useEffect, useLayoutEffect, useState } from "react";

type Rect = { left: number; top: number; width: number; height: number };

interface FloatingTourTargetProps {
  active: boolean;
  targetRef: RefObject<HTMLElement>;
  children: ReactNode;
  /** Passed through so Joyride can target this element (e.g. data-tour="nav-rank") */
  dataTour?: string;
  className?: string;
}

/**
 * Renders a fixed-position clone of an existing element so Joyride can spotlight a target
 * that’s visually separated / layered above other UI (e.g. the glass nav pill).
 */
export default function FloatingTourTarget({
  active,
  targetRef,
  children,
  dataTour,
  className,
}: FloatingTourTargetProps) {
  const [rect, setRect] = useState<Rect | null>(null);

  const measure = () => {
    const el = targetRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ left: r.left, top: r.top, width: r.width, height: r.height });
  };

  useLayoutEffect(() => {
    if (!active) return;
    // Measure immediately and again next frame in case layout is still settling.
    measure();
    const raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!active || !rect) return null;

  return (
    <div
      {...(dataTour ? { ["data-tour" as const]: dataTour } : {})}
      className={className}
      style={{
        position: "fixed",
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        zIndex: 10002, // above Joyride overlay (10000)
        pointerEvents: "none",
        display: "grid",
        placeItems: "center",
      }}
    >
      {children}
    </div>
  );
}
