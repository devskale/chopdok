import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { splitPdfDocument } from "./pdfSplit";

async function makePdf(pages: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage();
  return doc.save();
}

describe("splitPdfDocument (integration with pdf-lib)", () => {
  it("returns one part with all pages when there are no splits", async () => {
    const parts = await splitPdfDocument(await makePdf(4), [], []);
    expect(parts).toHaveLength(1);
    expect((await PDFDocument.load(parts[0])).getPageCount()).toBe(4);
  });

  it("splits at a boundary and excludes shaded pages", async () => {
    // 6 pages; split before index 3 (page 4), drop index 1 (page 2)
    const parts = await splitPdfDocument(await makePdf(6), [3], [1]);
    expect(parts).toHaveLength(2);
    expect((await PDFDocument.load(parts[0])).getPageCount()).toBe(2); // indices 0,2
    expect((await PDFDocument.load(parts[1])).getPageCount()).toBe(3); // indices 3,4,5
  });

  it("drops pages from both parts", async () => {
    // 4 pages; split at 2; shade indices 1 and 2 -> each part keeps 1 page
    const parts = await splitPdfDocument(await makePdf(4), [2], [1, 2]);
    expect(parts).toHaveLength(2);
    expect((await PDFDocument.load(parts[0])).getPageCount()).toBe(1); // index 0
    expect((await PDFDocument.load(parts[1])).getPageCount()).toBe(1); // index 3
  });

  it("produces valid PDF bytes for each part", async () => {
    const parts = await splitPdfDocument(await makePdf(3), [1], []);
    for (const bytes of parts) {
      // %PDF header = a valid PDF
      expect(Buffer.from(bytes.slice(0, 4)).toString()).toBe("%PDF");
    }
  });
});
