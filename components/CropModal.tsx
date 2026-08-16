"use client";

// Crop modal: draw a region over the page (drag), or pick a half-page preset,
// then apply — in place or as a copy kept after the original.

import React, { useState, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  CropRect,
  PRESET_RECTS,
  CropPreset,
  rectFromDrag,
} from "@/lib/crop";
import { DocumentItem } from "@/lib/documents";
import { Crop, Check, X } from "lucide-react";

interface CropModalProps {
  item: DocumentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (id: string, rect: CropRect, keepOriginal: boolean) => void;
}

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);
/** too-small drags count as clicks and clear the selection */
const MIN_AREA = 0.0015;

export const CropModal: React.FC<CropModalProps> = ({
  item,
  open,
  onOpenChange,
  onApply,
}) => {
  const [rect, setRect] = useState<CropRect | null>(null);
  const [keep, setKeep] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  const point = useCallback((e: React.PointerEvent): { x: number; y: number } => {
    const r = boxRef.current!.getBoundingClientRect();
    return { x: clamp01((e.clientX - r.left) / r.width), y: clamp01((e.clientY - r.top) / r.height) };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!boxRef.current) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragStart.current = point(e);
    setRect(null);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current) return;
    setRect(rectFromDrag(dragStart.current, point(e)));
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const final = rectFromDrag(dragStart.current, point(e));
    dragStart.current = null;
    // Keep it only if it's a real selection, not a click.
    setRect(final.w * final.h >= MIN_AREA ? final : null);
  };

  const close = () => onOpenChange(false);

  const apply = () => {
    if (!item || !rect) return;
    onApply(item.id, rect, keep);
    close();
  };

  const preset = (p: CropPreset) => setRect(PRESET_RECTS[p]);

  const px = rect && item
    ? {
        w: Math.max(1, Math.round(rect.w * item.width)),
        h: Math.max(1, Math.round(rect.h * item.height)),
      }
    : null;

  return (
    <Dialog open={open && !!item} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="w-4 h-4 text-primary" />
            Crop page
          </DialogTitle>
          <DialogDescription>
            Drag over the page to select a region, or use a half-page preset.
          </DialogDescription>
        </DialogHeader>

        {item && (
          <div className="flex flex-col gap-4">
            {/* Crop surface */}
            <div className="relative mx-auto select-none touch-none" ref={boxRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={() => { dragStart.current = null; }}
            >
              <Image
                src={item.thumbnailUrl}
                alt={item.label}
                width={item.width}
                height={item.height}
                unoptimized
                className="max-h-[55vh] w-auto rounded-lg"
                draggable={false}
              />
              {/* dim outside the selection */}
              {rect && (
                <div
                  className="absolute rounded-sm border-2 border-primary bg-primary/10 pointer-events-none"
                  style={{
                    left: `${rect.x * 100}%`,
                    top: `${rect.y * 100}%`,
                    width: `${rect.w * 100}%`,
                    height: `${rect.h * 100}%`,
                    boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
                  }}
                />
              )}
              {!rect && (
                <div className="absolute inset-0 grid place-items-center pointer-events-none">
                  <span className="glass border border-white/15 rounded-full px-3 py-1.5 text-xs text-muted-foreground">
                    drag to select
                  </span>
                </div>
              )}
            </div>

            {/* Presets */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {(["left", "right", "top", "bottom"] as CropPreset[]).map((p) => (
                <Button key={p} size="sm" variant="outline" onClick={() => preset(p)}>
                  {p === "left" ? "◀ Left half" : p === "right" ? "Right half ▶" : p === "top" ? "▲ Top half" : "▼ Bottom half"}
                </Button>
              ))}
              {rect && (
                <Button size="sm" variant="ghost" onClick={() => setRect(null)}>
                  <X size={13} className="mr-1" />
                  Clear
                </Button>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <span className="font-mono">
                {px ? `${px.w} × ${px.h} px` : "no selection"}
                {item.kind === "page" && " · cropped from preview resolution"}
              </span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={keep}
                  onChange={(e) => setKeep(e.target.checked)}
                  className="accent-primary"
                />
                Keep original page (crop as copy)
              </label>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button onClick={apply} disabled={!rect} className="glow-primary">
            <Check className="mr-2 h-4 w-4" />
            {keep ? "Crop as copy" : "Crop"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CropModal;
