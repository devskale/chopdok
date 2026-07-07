import { PDFDocument } from "pdf-lib";
import { computePartRanges } from "./parts";

/**
 * Split a PDF's bytes into parts.
 *  - splitPoints: 0-based page indices where a new part begins
 *  - shadedPages: 0-based page indices to drop
 * Returns the saved bytes of each part, in order.
 */
export async function splitPdfDocument(
  pdfBytes: ArrayBuffer | Uint8Array,
  splitPoints: number[],
  shadedPages: number[]
): Promise<Uint8Array[]> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const totalPages = pdfDoc.getPageCount();
  const ranges = computePartRanges(splitPoints, shadedPages, totalPages);

  const parts: Uint8Array[] = [];
  for (const pagesToCopy of ranges) {
    const newDoc = await PDFDocument.create();
    const copied = await newDoc.copyPages(pdfDoc, pagesToCopy);
    copied.forEach((page) => newDoc.addPage(page));
    parts.push(await newDoc.save());
  }
  return parts;
}
