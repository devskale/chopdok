"use client";

// Page viewer modal — the card's magnifier opens the page LARGE, with a
// loupe lens (hi-res source, wheel zoom) for inspection: page numbers,
// small print, verifying edges. No crop chrome — pure viewing.

import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoupeLens } from "@/components/Loupe";
import { hiResSource } from "@/lib/crop";
import { DocumentItem } from "@/lib/documents";
import { ZoomIn } from "lucide-react";

interface PageViewerModalProps {
  item: DocumentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PageViewerModal: React.FC<PageViewerModalProps> = ({
  item,
  open,
  onOpenChange,
}) => {
  // Viewport-fitted display size (image never overflows the window).
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  // Zoom sources: preview first (instant), hi-res swap when rendered.
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [surface, setSurface] = useState<HTMLElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);

  // Reset + fit + hi-res load per item.
  useEffect(() => {
    if (!open || !item) return;
    const fit = () => {
      const w = Math.min(window.innerWidth - 64, 896);
      const h = Math.max(240, window.innerHeight - 160);
      setBox({ w, h });
    };
    fit();
    window.addEventListener("resize", fit);

    setSrc(item.thumbnailUrl);
    setNatural({ w: item.width, h: item.height });
    let alive = true;
    void hiResSource(item).then((hi) => {
      if (!alive) return;
      setSrc((cur) => (cur === item.thumbnailUrl ? hi : cur));
      const img = new window.Image();
      img.onload = () => alive && setNatural({ w: img.naturalWidth, h: img.naturalHeight });
      img.src = hi;
    });
    return () => {
      alive = false;
      window.removeEventListener("resize", fit);
    };
  }, [open, item]);

  /** Fit the bitmap into the computed box, preserving aspect (max 1.5x). */
  const fitted =
    item && box
      ? (() => {
          const scale = Math.min(box.w / item.width, box.h / item.height, 1.5);
          return { w: Math.round(item.width * scale), h: Math.round(item.height * scale) };
        })()
      : null;

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  return (
    <Dialog open={open && !!item} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl [&>button]:top-3 [&>button]:right-3">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ZoomIn className="w-4 h-4 text-primary" />
            View page
          </DialogTitle>
          <DialogDescription>
            The lens follows your cursor · scroll to change magnification · Esc to close
          </DialogDescription>
        </DialogHeader>

        {item && fitted && (
          <div className="flex justify-center bg-background/60 rounded-none p-2 overflow-hidden">
            <div
              ref={(el) => {
                // capture when the fitted surface actually mounts (box may
                // arrive after the first render — effect timing isn't enough)
                surfaceRef.current = el;
                setSurface(el);
              }}
              className="relative"
              style={{ cursor: "none" }}>
              <Image
                src={src ?? item.thumbnailUrl}
                alt={item.label}
                width={fitted.w}
                height={fitted.h}
                unoptimized
                className="rounded-none select-none"
                draggable={false}
              />
            </div>
          </div>
        )}

        {item && src && surface && natural && (
          <LoupeLens
            key={`${item.id}-${natural.w}`}
            src={src}
            surface={surface}
            naturalW={natural.w}
            naturalH={natural.h}
            size={200}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PageViewerModal;
