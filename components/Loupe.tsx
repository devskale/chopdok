"use client";

// Imperative, render-free loupe (best practice for per-mousemove UI):
// - mounted ONCE per inspected card; position/content updated by direct DOM
//   mutation inside requestAnimationFrame — zero React re-renders while moving
// - zoom source is the item's FULL-RESOLUTION bitmap (images: the original
//   file; PDF pages: a hi-res re-render) — the preview is never magnified,
//   which is what made it pixelated
//
// The element is portaled to <body> (position:fixed) so card overflow
// can never clip it.

import React, { useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface LoupeLensProps {
  /** hi-res bitmap for magnification */
  src: string;
  /** the displayed surface element (zoom anchor + bounds) */
  surface: HTMLElement;
  /** bitmap's natural size (needed before <img> loads for correct math) */
  naturalW: number;
  naturalH: number;
  initialZoom?: number;
  size?: number;
  onExit?: () => void;
}

export const LoupeLens: React.FC<LoupeLensProps> = ({
  src,
  surface,
  naturalW,
  naturalH,
  initialZoom = 3,
  size = 160,
  onExit,
}) => {
  const elRef = useRef<HTMLDivElement | null>(null);
  const state = useRef({ zoom: initialZoom, raf: 0, clientX: 0, clientY: 0, active: false });

  useEffect(() => {
    const s = state.current;
    const lens = elRef.current!;
    s.zoom = initialZoom;

    const place = () => {
      s.raf = 0;
      if (!s.active) return;
      const r = surface.getBoundingClientRect();
      // pointer relative to the displayed surface
      const x = s.clientX - r.left;
      const y = s.clientY - r.top;
      const inside = x >= 0 && y >= 0 && x <= r.width && y <= r.height;
      lens.style.opacity = inside ? "1" : "0";
      if (!inside) return;
      // lens placement (viewport coords)
      lens.style.left = `${s.clientX - size / 2}px`;
      lens.style.top = `${s.clientY - size / 2}px`;
      // zoom math: the bitmap at `zoom`x natural size; the fraction of the
      // surface under the cursor maps to the same fraction of the bitmap,
      // offset so that point sits at the lens center
      const bgW = naturalW * s.zoom;
      const bgH = naturalH * s.zoom;
      lens.style.backgroundSize = `${naturalW * s.zoom}px ${bgH}px`;
      // fraction of the bitmap under the cursor -> offset inside the lens
      const fx = x / r.width;
      const fy = y / r.height;
      lens.style.backgroundPosition = `${size / 2 - fx * bgW}px ${size / 2 - fy * bgH}px`;
    };

    const onMove = (e: PointerEvent) => {
      s.clientX = e.clientX;
      s.clientY = e.clientY;
      s.active = true;
      if (!s.raf) s.raf = requestAnimationFrame(place);
    };
    const onLeave = () => {
      s.active = false;
      lens.style.opacity = "0";
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      s.zoom = Math.min(8, Math.max(1.5, s.zoom * (e.deltaY < 0 ? 1.2 : 1 / 1.2)));
      if (!s.raf) s.raf = requestAnimationFrame(place);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit?.();
    };

    surface.addEventListener("pointermove", onMove);
    surface.addEventListener("pointerleave", onLeave);
    surface.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      if (s.raf) cancelAnimationFrame(s.raf);
      surface.removeEventListener("pointermove", onMove);
      surface.removeEventListener("pointerleave", onLeave);
      surface.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [surface, naturalW, naturalH, initialZoom, size, onExit]);

  return createPortal(
    <div
      ref={elRef}
      aria-hidden
      className="fixed rounded-full border-2 border-primary bg-background shadow-2xl pointer-events-none z-[9999] overflow-hidden opacity-0"
      style={{
        width: size,
        height: size,
        backgroundRepeat: "no-repeat",
        backgroundImage: `url(${src})`,
      }}
    />,
    document.body
  );
};
