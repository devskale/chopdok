"use client";

// Edit modal — THE first-class page editor. Everything at once:
//   - crop selection (react-image-crop) over the page
//   - loupe magnifier (offset from cursor, live during handle drags)
//   - notes editor beside the page (read + write in place)
// Both the card's pencil and magnifier icons open this modal.

import React, { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import ReactCrop, { Crop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CropRect } from "@/lib/crop";
import { DocumentItem } from "@/lib/documents";
import { Crop as CropIcon, Check, ZoomIn } from "lucide-react";

interface EditModalProps {
  item: DocumentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyCrop: (id: string, rect: CropRect, keepOriginal: boolean) => void;
  note?: string;
  onSaveNote: (id: string, note: string) => void;
}

export const EditModal: React.FC<EditModalProps> = ({
  item,
  open,
  onOpenChange,
  onApplyCrop,
  note,
  onSaveNote,
}) => {
  const [crop, setCrop] = useState<Crop>();
  const [keep, setKeep] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Offset-style loupe state (never covers what you inspect)
  const [loupe, setLoupe] = useState<{ x: number; y: number } | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || !item) return;
    const t = setTimeout(() => {
      setKeep(false);
      setNoteDraft(note ?? "");
      setLoupe(null);
      const w = Math.min(window.innerWidth - 384, 832); // sidebar reserve
      const h = Math.max(240, window.innerHeight - 200);
      setBox({ w, h });
    }, 0);
    const fit = () => {
      const w = Math.min(window.innerWidth - 384, 832);
      const h = Math.max(240, window.innerHeight - 200);
      setBox({ w, h });
    };
    window.addEventListener("resize", fit);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", fit);
    };
    // note seeds at open; external edits shouldn't clobber typing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item]);

  const onLoad = useCallback((img: HTMLImageElement) => {
    imgRef.current = img;
    const { width, height } = img;
    setCrop(
      centerCrop(makeAspectCrop({ unit: "%", width: 90 }, width / height, width, height), width, height)
    );
  }, []);

  const close = () => onOpenChange(false);

  const applyCrop = () => {
    if (!item || !crop) return;
    onApplyCrop(
      item.id,
      { x: crop.x / 100, y: crop.y / 100, w: crop.width / 100, h: crop.height / 100 },
      keep
    );
    close();
  };

  /** Pointer relative to the surface, for the loupe. */
  const imagePoint = (e: React.PointerEvent) => {
    const el = surfaceRef.current!;
    const r = el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
  };
  const handleLoupeMove = (e: React.PointerEvent) => {
    const p = imagePoint(e);
    if (p.x < 0 || p.y < 0 || p.x > p.w || p.y > p.h) {
      setLoupe(null);
      return;
    }
    setLoupe({ x: p.x, y: p.y });
  };

  const fitted =
    item && box
      ? (() => {
          const scale = Math.min(box.w / item.width, box.h / item.height, 1.5);
          return { w: Math.round(item.width * scale), h: Math.round(item.height * scale) };
        })()
      : null;

  const px =
    crop && item
      ? {
          w: Math.max(1, Math.round((crop.width / 100) * item.width)),
          h: Math.max(1, Math.round((crop.height / 100) * item.height)),
        }
      : null;

  return (
    <Dialog open={open && !!item} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl [&>button]:top-3 [&>button]:right-3">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CropIcon className="w-4 h-4 text-primary" />
            Edit page
          </DialogTitle>
          <DialogDescription>
            Crop, magnify, and note — all at once: pull the selection handles,
            the loupe magnifies at the cursor, notes save beside the page.
          </DialogDescription>
        </DialogHeader>

        {item && fitted && (
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Edit surface: crop selection + loupe simultaneously */}
            <div
              ref={surfaceRef}
              className="relative flex-1 min-w-0 flex justify-center bg-background/60 rounded-none p-2 overflow-hidden"
              onPointerMove={handleLoupeMove}
              onPointerLeave={() => setLoupe(null)}>
              <div className="relative">
                <ReactCrop crop={crop} onChange={(_, percent) => setCrop(percent)} keepSelection>
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
                {loupe && (
                  <div
                    aria-hidden
                    className="absolute rounded-full border-2 border-primary bg-background shadow-2xl pointer-events-none z-30 overflow-hidden"
                    style={{
                      width: 170,
                      height: 170,
                      left:
                        loupe.x + 24 + 170 > fitted.w ? loupe.x - 194 : loupe.x + 24,
                      top: loupe.y - 194 < 0 ? loupe.y + 24 : loupe.y - 194,
                      backgroundImage: `url(${item.thumbnailUrl})`,
                      backgroundRepeat: "no-repeat",
                      backgroundSize: `${fitted.w * 3}px ${fitted.h * 3}px`,
                      backgroundPosition: `${85 - loupe.x * 3}px ${85 - loupe.y * 3}px`,
                    }}
                  />
                )}
              </div>
            </div>

            {/* Notes sidebar — visible and editable while editing the page */}
            <div className="lg:w-72 shrink-0 flex flex-col gap-3">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="edit-note">
                Page note
              </label>
              <textarea
                id="edit-note"
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                rows={6}
                placeholder="e.g. p. 12 · invoice A · signed original"
                className="w-full rounded-md border border-border/60 bg-background/60 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => item && onSaveNote(item.id, noteDraft)}>
                <Check size={14} className="mr-1.5" />
                Save note
              </Button>

              <div className="h-px bg-border/60" />

              <div className="text-xs text-muted-foreground font-mono">
                {px ? `${px.w} × ${px.h} px` : "no selection"}
                {item.kind === "page" && px && " · hi-res crop"}
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground">
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
            Done
          </Button>
          <Button onClick={applyCrop} disabled={!crop} className="glow-primary">
            <Check className="mr-2 h-4 w-4" />
            Crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditModal;
