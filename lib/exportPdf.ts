// Export engine: build PDFs from an ordered list of items.
//
// - "pdf" items   -> copied from their source PDF (pdf-lib copyPages, one
//                    load per unique source file). Page size is preserved;
//                    the pageSize option does not apply to copied pages.
// - "image" items -> embedded (PNG/JPEG directly; webp/gif/avif/bmp are
//                    re-encoded to PNG via canvas first, since PDFs can only
//                    embed PNG/JPEG natively). Page size honors the setting.
//
// Node-safe: the canvas re-encode path only runs when `document` exists.

import {
  PDFDocument,
  PDFName,
  PDFDict,
  PDFArray,
  PDFNumber,
  PDFHexString,
} from "pdf-lib";
import { DocumentItem } from "./documents";

/** Export page-size setting for image items. */
export type PageSizeOption = "fit" | "a4";

export const PAGE_SIZES: Record<PageSizeOption, { label: string }> = {
  fit: { label: "Fit to image" },
  a4: { label: "A4 (letterboxed)" },
};

/** A4 portrait in PDF points (72 dpi). */
const A4_PT = { width: 595.28, height: 841.89 };

/** One bookmark: jump to pageIndex (0-based in the OUTPUT pdf). */
export interface OutlineEntry {
  title: string;
  pageIndex: number;
}

export interface ExportOptions {
  pageSize?: PageSizeOption;
  /** Write a PDF outline (bookmarks) — the segment index readers display. */
  outline?: OutlineEntry[];
  /** Set the document Title metadata. */
  title?: string;
}

/** Is this file embeddable by pdf-lib without conversion? */
const isPng = (file: File) =>
  file.type === "image/png" || /\.png$/i.test(file.name);
const isJpg = (file: File) =>
  file.type === "image/jpeg" || /\.jpe?g$/i.test(file.name);

async function fileBytes(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

/** Re-encode any raster image to PNG via canvas (browser only). */
async function reencodeToPng(file: File): Promise<Uint8Array> {
  if (typeof document === "undefined") {
    throw new Error("Canvas re-encode is browser-only");
  }
  const blob = await new Promise<Blob>((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode image"));
    };
    img.src = url;
  });
  return new Uint8Array(await blob.arrayBuffer());
}

async function embedImage(doc: PDFDocument, file: File) {
  if (isPng(file)) return doc.embedPng(await fileBytes(file));
  if (isJpg(file)) return doc.embedJpg(await fileBytes(file));
  return doc.embedPng(await reencodeToPng(file)); // webp/gif/avif/bmp -> PNG
}

/** Letterbox-scale an image onto a fixed page, centered. */
function letterbox(
  imgW: number,
  imgH: number,
  pageW: number,
  pageH: number
): { x: number; y: number; width: number; height: number } {
  const scale = Math.min(pageW / imgW, pageH / imgH);
  const width = imgW * scale;
  const height = imgH * scale;
  return { x: (pageW - width) / 2, y: (pageH - height) / 2, width, height };
}

/**
 * Write a flat /Outlines tree into the catalog (pdf-lib has no outline API,
 * so this is hand-rolled with its low-level object model). Also sets
 * PageMode /UseOutlines so readers open the bookmark sidebar.
 */
function writeOutline(doc: PDFDocument, entries: OutlineEntry[]): void {
  const valid = entries.filter(
    (e) => e.title && e.pageIndex >= 0 && e.pageIndex < doc.getPageCount()
  );
  if (!valid.length) return;
  const ctx = doc.context;

  const outlinesRef = ctx.nextRef();
  const itemRefs = valid.map(() => ctx.nextRef());

  valid.forEach((entry, i) => {
    const dict = PDFDict.withContext(ctx);
    dict.set(PDFName.of("Title"), PDFHexString.fromText(entry.title));
    dict.set(PDFName.of("Parent"), outlinesRef);
    const dest = PDFArray.withContext(ctx);
    dest.push(doc.getPage(entry.pageIndex).ref);
    dest.push(PDFName.of("Fit"));
    dict.set(PDFName.of("Dest"), dest);
    if (i > 0) dict.set(PDFName.of("Prev"), itemRefs[i - 1]);
    if (i < valid.length - 1) dict.set(PDFName.of("Next"), itemRefs[i + 1]);
    ctx.assign(itemRefs[i], dict);
  });

  const outlines = PDFDict.withContext(ctx);
  outlines.set(PDFName.of("Type"), PDFName.of("Outlines"));
  outlines.set(PDFName.of("First"), itemRefs[0]);
  outlines.set(PDFName.of("Last"), itemRefs[itemRefs.length - 1]);
  outlines.set(PDFName.of("Count"), PDFNumber.of(valid.length));
  ctx.assign(outlinesRef, outlines);

  doc.catalog.set(PDFName.of("Outlines"), outlinesRef);
  // Open the bookmark panel — the index IS the feature.
  doc.catalog.set(PDFName.of("PageMode"), PDFName.of("UseOutlines"));
}

/**
 * Build one PDF from the ordered items. This is the single export engine:
 * "assemble" is items = all live items; "split" is exportPdf called per part.
 */
export async function exportPdf(
  items: DocumentItem[],
  opts: ExportOptions = {}
): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  const pdfCache = new Map<File, PDFDocument>(); // one load per source file

  for (const item of items) {
    if (item.source.type === "pdf") {
      let src = pdfCache.get(item.source.file);
      if (!src) {
        src = await PDFDocument.load(await item.source.file.arrayBuffer());
        pdfCache.set(item.source.file, src);
      }
      const [page] = await out.copyPages(src, [item.source.pageIndex]);
      out.addPage(page); // copied pages keep their original size
    } else {
      const image = await embedImage(out, item.source.file);
      const { width: imgW, height: imgH } = image; // PDF pt at 1:1
      if (opts.pageSize === "a4") {
        const page = out.addPage([A4_PT.width, A4_PT.height]);
        page.drawImage(image, letterbox(imgW, imgH, A4_PT.width, A4_PT.height));
      } else {
        // fit (default): the page IS the image, full bleed.
        const page = out.addPage([imgW, imgH]);
        page.drawImage(image, { x: 0, y: 0, width: imgW, height: imgH });
      }
    }
  }
  if (opts.outline?.length) writeOutline(out, opts.outline);
  if (opts.title) out.setTitle(opts.title);
  return out.save();
}
