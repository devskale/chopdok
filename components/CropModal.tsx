"use client";

// Crop modal — react-image-crop pattern: draggable/resizable selection with
// corner handles over the page; dimmed outside; apply via Crop button.

import React, { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import ReactCrop, { Crop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CropRect } from "@/lib/crop";
import { DocumentItem } from "@/lib/documents";
import { Crop as CropIcon, Check, ZoomIn, StickyNote, FileText } from "lucide-react";

interface CropModalProps {
  item: DocumentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (id: string, rect: CropRect, keepOriginal: boolean) => void;
  /** current note, if any */
  note?: string;
  onSaveNote: (id: string, note: string) => void;
}

export const CropModal: React.FC<CropModalProps> = ({
  item,
  open,
  onOpenChange,
  onApply,
  note,
  onSaveNote,
}) => {
  // Notes active by default (user pref): usually you look, note, then crop if needed.
  const [tab, setTab] = useState<"crop" | "notes">("notes");
  const [noteDraft, setNoteDraft] = useState("");
  const [crop, setCrop] = useState<Crop>();
  const [keep, setKeep] = useState(false);
  const [loupe, setLoupe] = useState<{ x: number; y: number } | null>(null);
  // seed the note draft whenever a different page opens
  useEffect(() => {
    if (open) setNoteDraft(note ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id]);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  // Display size fitted to the available viewport (image never overflows).
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);

  // Per-item reset — runs only when the item changes (not on every render).
  useEffect(() => {
    if (!open || !item) return;
    // schedule outside the render pass to avoid cascading renders
    const reset = () => {
      setLoupe(null);
    };
    const fit = () => {
      const w = Math.min(window.innerWidth - 64, 896);
      const h = Math.max(240, window.innerHeight - 190);
      setBox({ w, h });
    };
    const t = setTimeout(() => {
      reset();
      fit();
    }, 0);
    window.addEventListener("resize", fit);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", fit);
    };
  }, [open, item]);

  const close = () => onOpenChange(false);

  const apply = () => {
    if (!item || !crop) return;
    // ReactCrop % -> our normalized CropRect (same 0..1 semantics)
    const rect: CropRect = {
      x: crop.x / 100,
      y: crop.y / 100,
      w: crop.width / 100,
      h: crop.height / 100,
    };
    onApply(item.id, rect, keep);
    close();
  };

  const onLoad = useCallback((img: HTMLImageElement) => {
    imgRef.current = img;
    const { width, height } = img;
    setCrop(
      centerCrop(makeAspectCrop({ unit: "%", width: 90 }, width / height, width, height), width, height)
    );
  }, []);

  /** Pointer position relative to the fitted image (px). */
  const imagePoint = (e: React.PointerEvent) => {
    const img = imgRef.current!;
    const r = img.getBoundingClientRect();
    return {
      x: e.clientX - r.left,
      y: e.clientY - r.top,
      r, // surface rect for loupe placement
    };
  };
  const handleLoupeMove = (e: React.PointerEvent) => {
    const p = imagePoint(e);
    if (p.x < 0 || p.y < 0 || p.x > p.r.width || p.y > p.r.height) {
      setLoupe(null);
      return;
    }
    setLoupe({ x: p.x, y: p.y });
  };

  /** Fit the bitmap into the computed box, preserving aspect. */
  const fitted =
    item && box
      ? (() => {
          const scale = Math.min(box.w / item.width, box.h / item.height, 1.5);
          return { w: Math.round(item.width * scale), h: Math.round(item.height * scale) };
        })()
      : null;

  const px =
    crop && item && crop.unit === "%"
      ? {
          w: Math.max(1, Math.round((crop.width / 100) * item.width)),
          h: Math.max(1, Math.round((crop.height / 100) * item.height)),
        }
      : null;

  return (
    <Dialog open={open && !!item} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl [&>button]:top-3 [&>button]:right-3">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CropIcon className="w-4 h-4 text-primary" />
            Edit page
          </DialogTitle>
          <div className="flex gap-1.5 mt-1">
            {(["crop", "notes"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors ${
                  tab === t
                    ? "bg-primary/15 border-primary/50 text-primary"
                    : "bg-secondary/50 border-border/60 text-muted-foreground hover:text-foreground"
                }`}>
                {t === "crop" ? <CropIcon size={12} /> : <StickyNote size={12} />}
                {t === "crop" ? "Crop" : "Notes"}
              </button>
            ))}
          </div>
        </DialogHeader>

        {item && tab === "notes" && (
          <div className="flex flex-col gap-4 py-2">
            <div className="grid gap-2">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="page-note">
                Page note (shown on the card — e.g. page number or special info)
              </label>
              <textarea
                id="page-note"
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                rows={3}
                autoFocus
                placeholder="e.g. p. 12 · invoice A · signed original"
                className="w-full rounded-md border border-border/60 bg-background/60 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <FileText size={12} />
              Notes are working metadata in the app (card label + summary).
            </p>
          </div>
        )}

        {item && tab === "crop" && (
          <div className="flex flex-col gap-4">
            {/* Surface — fitted to viewport, sharp corners.
                Crop mode: selection handles. Inspect mode: loupe. */}
            <div
              ref={surfaceRef}
              className="flex justify-center bg-background/60 rounded-none p-2 overflow-hidden relative"
              onPointerMove={handleLoupeMove}
              onPointerLeave={() => setLoupe(null)}>
              {fitted && (
                <div className="relative">
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percent) => setCrop(percent)}
                    keepSelection
                  >
                    <Image
                      src={item.thumbnailUrl}
                      alt={item.label}
                      width={fitted.w}
                      height={fitted.h}
                      unoptimized
                      className="rounded-none"
                      draggable={false}
                      onLoad={(e) => onLoad(e.currentTarget as HTMLImageElement)}
                    />
                  </ReactCrop>
                  {/* Loupe: 3x magnifier offset from the cursor (never covers
                      what you inspect) — live during selection drags too. */}
                  {loupe && (
                    <div
                      className="absolute rounded-full border-2 border-primary pointer-events-none shadow-2xl z-30 overflow-hidden"
                      style={{
                        width: 180,
                        height: 180,
                        left: loupe.x + 24 + 180 > fitted.w ? loupe.x - 204 : loupe.x + 24,
                        top: loupe.y - 204 < 0 ? loupe.y + 24 : loupe.y - 204,
                        backgroundImage: `url(${item.thumbnailUrl})`,
                        backgroundRepeat: "no-repeat",
                        backgroundSize: `${fitted.w * 3}px ${fitted.h * 3}px`,
                        backgroundPosition: `-${loupe.x * 3 - 90}px -${loupe.y * 3 - 90}px`,
                      }}
                    />
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <span className="font-mono">
                {px ? `${px.w} × ${px.h} px` : "no selection"}
                {item.kind === "page" && px && " · page crops render at high resolution"}
              </span>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <ZoomIn size={13} />
                  loupe follows the cursor
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
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          {tab === "crop" ? (
            <Button onClick={apply} disabled={!crop} className="glow-primary">
              <Check className="mr-2 h-4 w-4" />
              Crop
            </Button>
          ) : (
            <Button
              onClick={() => {
                if (item) onSaveNote(item.id, noteDraft);
                close();
              }}
              className="glow-primary">
              <Check className="mr-2 h-4 w-4" />
              Save note
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CropModal;
