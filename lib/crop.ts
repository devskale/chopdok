// Crop: turn a rectangular region of an item's bitmap into a NEW image item.
// Pure geometry is unit-testable; the canvas work is browser-only.
//
// Quality note: image items crop at FULL resolution (their thumbnail is an
// object URL of the original file); PDF page items crop at preview resolution
// (the scale-1.0 render used for the grid).

import { DocumentItem, makeItemId } from "./documents";
import { ensurePdfjs } from "./ingest";

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

/** Rendered-region target width in px — sharp on screen AND in print. */
const HIGHRES_TARGET_PX = 2200;

async function canvasToItem(canvas: HTMLCanvasElement, label: string): Promise<DocumentItem> {
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png")
  );
  const file = new File([blob], `${safeName(label)}.png`, { type: "image/png" });
  return {
    id: makeItemId(),
    kind: "image",
    label: `${label} (crop)`,
    thumbnailUrl: URL.createObjectURL(blob),
    width: canvas.width,
    height: canvas.height,
    source: { type: "image", file },
  };
}

/**
 * Hi-res data URL of an item's full bitmap (for the loupe):
 * images -> the original file; PDF pages -> a ~2200px pdf.js re-render.
 * Falls back to the preview if anything fails.
 */
export async function hiResSource(item: DocumentItem): Promise<string> {
  if (item.source.type !== "pdf") return item.thumbnailUrl;
  try {
    const pdfjs = await ensurePdfjs();
    if (!pdfjs) return item.thumbnailUrl;
    const data = new Uint8Array(await item.source.file.arrayBuffer());
    const pdf = await pdfjs.getDocument({ data }).promise;
    const page = await pdf.getPage(item.source.pageIndex + 1);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(8, Math.max(1, HIGHRES_TARGET_PX / base.width));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
    return canvas.toDataURL("image/png");
  } catch {
    return item.thumbnailUrl;
  }
}

/**
 * Crop a PDF PAGE at high resolution: re-render the source page via pdf.js
 * at a scale chosen so the CROP REGION lands at ~HIGHRES_TARGET_PX wide
 * (capped 8x), then cut the region from that canvas. Cropping the preview
 * (72 DPI) is exactly what degraded assembled docs before.
 */
export async function croppedItemFromPdf(
  item: DocumentItem,
  rect: CropRect
): Promise<DocumentItem> {
  if (item.source.type !== "pdf") throw new Error("not a pdf item");
  const pdfjs = await ensurePdfjs();
  if (!pdfjs) throw new Error("pdf engine unavailable");
  const data = new Uint8Array(await item.source.file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const page = await pdf.getPage(item.source.pageIndex + 1);
  const base = page.getViewport({ scale: 1 });
  const c = clampRect(rect);
  const regionWpt = Math.max(c.w * base.width, 1);
  const scale = Math.min(8, Math.max(1, HIGHRES_TARGET_PX / regionWpt));
  const viewport = page.getViewport({ scale });
  const render = document.createElement("canvas");
  render.width = viewport.width;
  render.height = viewport.height;
  const ctx = render.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport }).promise;
  const { sx, sy, sw, sh } = rectToPixels(rect, render.width, render.height);
  const out = document.createElement("canvas");
  out.width = sw;
  out.height = sh;
  out.getContext("2d")!.drawImage(render, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvasToItem(out, item.label);
}

/**
 * Crop an item's bitmap to `rect` and return a NEW image-kind item
 * (PNG, full bleed at the region's resolution). The original is untouched.
 */
export async function croppedItemFrom(
  item: DocumentItem,
  rect: CropRect
): Promise<DocumentItem> {
  if (typeof document === "undefined") throw new Error("crop is browser-only");
  // PDF pages: crop from a high-res re-render, never the 72-DPI preview.
  if (item.source.type === "pdf") return croppedItemFromPdf(item, rect);
  const img = await loadImage(item.thumbnailUrl);
  const { sx, sy, sw, sh } = rectToPixels(rect, img.naturalWidth, img.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  canvas.getContext("2d")!.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvasToItem(canvas, item.label);
}
