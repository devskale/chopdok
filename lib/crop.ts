// Crop: turn a rectangular region of an item's bitmap into a NEW image item.
// Pure geometry is unit-testable; the canvas work is browser-only.
//
// Quality note: image items crop at FULL resolution (their thumbnail is an
// object URL of the original file); PDF page items crop at preview resolution
// (the scale-1.0 render used for the grid).

import { DocumentItem, makeItemId } from "./documents";

/** Normalized crop rectangle — every value 0..1, relative to the bitmap. */
export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const FULL_RECT: CropRect = { x: 0, y: 0, w: 1, h: 1 };

export function clampRect(r: CropRect): CropRect {
  const x = Math.min(Math.max(r.x, 0), 1);
  const y = Math.min(Math.max(r.y, 0), 1);
  return {
    x,
    y,
    w: Math.min(Math.max(r.w, 0), 1 - x),
    h: Math.min(Math.max(r.h, 0), 1 - y),
  };
}

export type CropPreset = "left" | "right" | "top" | "bottom";

/** Half-page presets — the two-up-scan workflow. */
export const PRESET_RECTS: Record<CropPreset, CropRect> = {
  left: { x: 0, y: 0, w: 0.5, h: 1 },
  right: { x: 0.5, y: 0, w: 0.5, h: 1 },
  top: { x: 0, y: 0, w: 1, h: 0.5 },
  bottom: { x: 0, y: 0.5, w: 1, h: 0.5 },
};

/** Rectangle from two normalized points (drag start + current). */
export function rectFromDrag(
  a: { x: number; y: number },
  b: { x: number; y: number }
): CropRect {
  return clampRect({
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y),
  });
}

/** Normalized rect → integer pixel region on a W×H bitmap (min 1px). */
export function rectToPixels(
  r: CropRect,
  W: number,
  H: number
): { sx: number; sy: number; sw: number; sh: number } {
  const c = clampRect(r);
  const sx = Math.round(c.x * W);
  const sy = Math.round(c.y * H);
  const sw = Math.max(1, Math.min(Math.round(c.w * W), W - sx));
  const sh = Math.max(1, Math.min(Math.round(c.h * H), H - sy));
  return { sx, sy, sw, sh };
}

// ---- browser-only: render the region into a new image item ----

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image for crop"));
    img.src = src;
  });
}

const safeName = (s: string) => s.replace(/[^\w\- ]+/g, "_").slice(0, 40) || "crop";

/**
 * Crop an item's bitmap to `rect` and return a NEW image-kind item
 * (PNG, full bleed at the region's resolution). The original is untouched.
 */
export async function croppedItemFrom(
  item: DocumentItem,
  rect: CropRect
): Promise<DocumentItem> {
  if (typeof document === "undefined") throw new Error("crop is browser-only");
  const img = await loadImage(item.thumbnailUrl);
  const { sx, sy, sw, sh } = rectToPixels(rect, img.naturalWidth, img.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  canvas.getContext("2d")!.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png")
  );
  const file = new File([blob], `${safeName(item.label)}.png`, { type: "image/png" });
  return {
    id: makeItemId(),
    kind: "image",
    label: `${item.label} (crop)`,
    thumbnailUrl: URL.createObjectURL(blob),
    width: sw,
    height: sh,
    source: { type: "image", file },
  };
}
