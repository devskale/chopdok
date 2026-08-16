"use client";

// Crop modal — react-image-crop pattern: draggable/resizable selection with
// corner handles over the page; dimmed outside; apply via Crop button.

import React, { useState, useRef, useCallback } from "react";
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
import { Crop as CropIcon, Check } from "lucide-react";

interface CropModalProps {
  item: DocumentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (id: string, rect: CropRect, keepOriginal: boolean) => void;
}

export const CropModal: React.FC<CropModalProps> = ({
  item,
  open,
  onOpenChange,
  onApply,
}) => {
  const [crop, setCrop] = useState<Crop>();
  const [keep, setKeep] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

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
            Crop page
          </DialogTitle>
          <DialogDescription>
            Drag the selection to move it, pull the corner handles to resize.
          </DialogDescription>
        </DialogHeader>

        {item && (
          <div className="flex flex-col gap-4">
            {/* Crop surface — large, sharp-cornered */}
            <div className="flex justify-center bg-background/60 rounded-none p-2">
              <ReactCrop
                crop={crop}
                onChange={(_, percent) => setCrop(percent)}
                keepSelection
              >
                <Image
                  src={item.thumbnailUrl}
                  alt={item.label}
                  width={item.width}
                  height={item.height}
                  unoptimized
                  className="max-h-[70vh] w-auto object-contain rounded-none"
                  draggable={false}
                  onLoad={(e) => onLoad(e.currentTarget as HTMLImageElement)}
                />
              </ReactCrop>
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
          <Button onClick={apply} disabled={!crop} className="glow-primary">
            <Check className="mr-2 h-4 w-4" />
            Crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CropModal;
