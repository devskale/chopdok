// Ingest layer: turn uploaded File(s) into an ordered list of DocumentItems.
//
// - PDF  -> one item per page (thumbnails rendered via pdf.js)
// - Image -> one item (thumbnail = the image itself, loaded via <img>/canvas)
//
// Everything here is browser-only; guard for `window` like simplePdfUploader did.

import { DocumentItem, ItemSource, makeItemId } from "./documents";
import { BASE_PATH } from "./basePath";

export type IngestResult = {
  items: DocumentItem[];
  /** True if any item was produced (a file was actually understood). */
  ok: boolean;
  /** Human-readable reason when `ok` is false. */
  error?: string;
};

// ---- pdf.js bootstrap (moved from simplePdfUploader) ----

type Viewport = { height: number; width: number };
type RenderTask = { promise: Promise<void> };
type PdfPageLike = {
  getViewport: (params: { scale: number }) => Viewport;
  render: (args: {
    canvasContext: CanvasRenderingContext2D;
    viewport: Viewport;
  }) => RenderTask;
};
type PdfDocumentLike = { numPages: number; getPage: (n: number) => Promise<PdfPageLike> };
type PdfjsLike = {
  version: string;
  GlobalWorkerOptions: { workerPort?: Worker };
  getDocument: (src: { data: ArrayBuffer | Uint8Array }) => { promise: PdfDocumentLike };
};

let _pdfjs: PdfjsLike | null = null;
const ensurePdfjs = async (): Promise<PdfjsLike | null> => {
  if (typeof window === "undefined") return null;
  if (_pdfjs) return _pdfjs;
  const mod = await import("pdfjs-dist");
  const maybeDefault = (mod as unknown as Record<string, unknown>).default ?? mod;
  const candidate = maybeDefault as unknown;
  const isPdfjs = (obj: unknown): obj is PdfjsLike => {
    if (!obj || typeof obj !== "object") return false;
    const o = obj as { GlobalWorkerOptions?: unknown; getDocument?: unknown; version?: unknown };
    return (
      typeof o.version === "string" &&
      o.GlobalWorkerOptions !== undefined &&
      typeof o.getDocument === "function"
    );
  };
  if (!isPdfjs(candidate)) return null;
  const pdfjs = candidate;
  pdfjs.GlobalWorkerOptions.workerPort = new Worker(
    `${BASE_PATH}/pdf.worker.min.mjs`,
    { type: "module" }
  );
  _pdfjs = pdfjs;
  return _pdfjs;
};

// ---- helpers ----

const isPdf = (file: File) =>
  file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

const isImage = (file: File) =>
  file.type.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|avif)$/i.test(file.name);

function thumbnailFromImageFile(file: File): Promise<{ url: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => resolve({ url, width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

async function ingestPdf(file: File): Promise<DocumentItem[]> {
  const pdfjs = await ensurePdfjs();
  if (!pdfjs) throw new Error("Couldn't start the PDF engine");

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const items: DocumentItem[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: context, viewport }).promise;
    const thumbnailUrl = canvas.toDataURL();

    const source: ItemSource = { type: "pdf", file, pageIndex: pageNum - 1 };
    items.push({
      id: makeItemId(),
      kind: "page",
      label: `${file.name.replace(/\.pdf$/i, "")} p${pageNum}`,
      thumbnailUrl,
      width: canvas.width,
      height: canvas.height,
      source,
    });
  }
  return items;
}

async function ingestImage(file: File): Promise<DocumentItem[]> {
  const { url, width, height } = await thumbnailFromImageFile(file);
  const source: ItemSource = { type: "image", file };
  return [
    {
      id: makeItemId(),
      kind: "image",
      label: file.name.replace(/\.[^.]+$/, ""),
      thumbnailUrl: url,
      width,
      height,
      source,
    },
  ];
}

/**
 * Turn one File into items. Returns { ok:false, error } for unsupported files
 * so the caller can toast without throwing.
 */
export async function ingestFile(file: File): Promise<IngestResult> {
  if (isPdf(file)) {
    try {
      return { items: await ingestPdf(file), ok: true };
    } catch (err) {
      console.error("Failed to ingest PDF:", err);
      return { items: [], ok: false, error: `Couldn't open "${file.name}". The file may be corrupt or password-protected.` };
    }
  }
  if (isImage(file)) {
    try {
      return { items: await ingestImage(file), ok: true };
    } catch (err) {
      console.error("Failed to ingest image:", err);
      return { items: [], ok: false, error: `Couldn't read "${file.name}" as an image.` };
    }
  }
  return { items: [], ok: false, error: `"${file.name}" isn't a supported PDF or image.` };
}
