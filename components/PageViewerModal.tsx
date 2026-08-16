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
import { Button } from "@/components/ui/button";
import { ZoomIn, StickyNote, Crop as CropIcon, Check } from "lucide-react";

interface PageViewerModalProps {
  item: DocumentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** current note for this page, if any */
  note?: string;
  onSaveNote: (id: string, note: string) => void;
}

export const PageViewerModal: React.FC<PageViewerModalProps> = ({
  item,
  open,
  onOpenChange,
  note,
  onSaveNote,
}) => {
  // Viewport-fitted display size (image never overflows the window).
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  // Zoom sources: preview first (instant), hi-res swap when rendered.
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [surface, setSurface] = useState<HTMLElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  // Notes active by default (user pref): read the page, note it, magnify if needed.
  const [tab, setTab] = useState<"view" | "notes">("notes");
  const [noteDraft, setNoteDraft] = useState("");

  // Reset + fit + hi-res load per item.
  useEffect(() => {
    if (!open || !item) return;
    setTab("notes"); // default tab
    setNoteDraft(note ?? "");
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
    // note is seeded at open; later external edits shouldn't clobber typing
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-1.5">
              {(["view", "notes"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors ${
                    tab === t
                      ? "bg-primary/15 border-primary/50 text-primary"
                      : "bg-secondary/50 border-border/60 text-muted-foreground hover:text-foreground"
                  }`}>
                  {t === "view" ? <ZoomIn size={12} /> : <StickyNote size={12} />}
                  {t === "view" ? "Magnifier" : "Notes"}
                </button>
              ))}
            </div>
            {tab === "view" && (
              <span className="hidden sm:block text-xs text-muted-foreground">
                lens follows the cursor · scroll to zoom · Esc closes
              </span>
            )}
          </div>
        </DialogHeader>

        {item && fitted && tab === "view" && (
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

        {item && fitted && tab === "notes" && (
          <div className="flex flex-col sm:flex-row gap-4">
            {/* the page stays visible while you write — read it, then note it */}
            <div className="flex-1 min-w-0 flex justify-center bg-background/60 rounded-none p-2 overflow-hidden">
              <Image
                src={src ?? item.thumbnailUrl}
                alt={item.label}
                width={fitted.w}
                height={fitted.h}
                unoptimized
                className="rounded-none select-none object-contain"
                draggable={false}
              />
            </div>
            <div className="sm:w-64 shrink-0 flex flex-col gap-2">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="viewer-note">
                Page note
              </label>
              <textarea
                id="viewer-note"
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                rows={7}
                autoFocus
                placeholder="e.g. p. 12 · invoice A · signed original"
                className="w-full rounded-md border border-border/60 bg-background/60 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button
                size="sm"
                className="glow-primary"
                onClick={() => item && onSaveNote(item.id, noteDraft)}>
                <Check size={14} className="mr-1.5" />
                Save note
              </Button>
            </div>
          </div>
        )}

        {item && tab === "view" && src && surface && natural && (
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
