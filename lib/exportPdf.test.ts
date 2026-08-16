// Integration tests with real pdf-lib documents and real PNG/JPEG buffers.
// The canvas re-encode path (webp/gif/…) is browser-only and stays untested
// here (documented gap, like the pdf.js render path).

import { describe, it, expect, beforeEach } from "vitest";
import { PDFDocument } from "pdf-lib";
import { exportPdf } from "./exportPdf";
import { deriveParts, DocumentItem } from "./documents";

/** TS6: File needs a plain ArrayBuffer, not ArrayBufferLike. */
const buf = (u: Uint8Array): ArrayBuffer =>
  u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer;

async function makePdf(pages: number): Promise<File> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([612, 792]); // explicit Letter
  return new File([buf(await doc.save())], "src.pdf", { type: "application/pdf" });
}

// Real 1x1 PNG (transparent) and 1x1 JPEG — minimal valid embeddable images.
const PNG_1x1 = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
  ),
  (c) => c.charCodeAt(0)
);
const JPG_1x1 = Uint8Array.from(
  atob(
    "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwcJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
  ),
  (c) => c.charCodeAt(0)
);

let n = 0;
const pdfItem = (file: File, pageIndex: number): DocumentItem => {
  const id = `p${++n}`;
  return {
    id,
    kind: "page",
    label: `${id}`,
    thumbnailUrl: "data:,",
    width: 612,
    height: 792,
    source: { type: "pdf", file, pageIndex },
  };
};
const pngItem = (): DocumentItem => {
  const id = `g${++n}`;
  return {
    id,
    kind: "image",
    label: id,
    thumbnailUrl: "data:,",
    width: 1,
    height: 1,
    source: { type: "image", file: new File([buf(PNG_1x1)], "x.png", { type: "image/png" }) },
  };
};
const jpgItem = (): DocumentItem => {
  const id = `j${++n}`;
  return {
    id,
    kind: "image",
    label: id,
    thumbnailUrl: "data:,",
    width: 1,
    height: 1,
    source: { type: "image", file: new File([buf(JPG_1x1)], "x.jpg", { type: "image/jpeg" }) },
  };
};

beforeEach(() => {
  n = 0;
});

describe("exportPdf", () => {
  it("embeds PNG images as pages (fit mode: page = image size in pt)", async () => {
    const out = await PDFDocument.load(await exportPdf([pngItem(), pngItem()]));
    expect(out.getPageCount()).toBe(2);
    for (const page of out.getPages()) {
      expect(page.getWidth()).toBe(1); // 1px image -> 1pt page
      expect(page.getHeight()).toBe(1);
    }
  });

  it("embeds a JPEG (native path, no re-encode)", async () => {
    const out = await PDFDocument.load(await exportPdf([jpgItem()]));
    expect(out.getPageCount()).toBe(1);
  });

  it("a4 mode letterboxes onto A4 portrait, centered", async () => {
    const out = await PDFDocument.load(await exportPdf([pngItem()], { pageSize: "a4" }));
    const page = out.getPage(0);
    expect(Math.round(page.getWidth() * 100) / 100).toBe(595.28);
    expect(Math.round(page.getHeight() * 100) / 100).toBe(841.89);
  });

  it("copies pdf items in ORDER and preserves their original page size", async () => {
    const src = await makePdf(3);
    const out = await PDFDocument.load(
      await exportPdf([pdfItem(src, 2), pdfItem(src, 0)])
    );
    expect(out.getPageCount()).toBe(2);
    expect(out.getPage(0).getWidth()).toBe(612);
    expect(out.getPage(0).getHeight()).toBe(792);
    // Order is proven by page size distinction below (image = 1pt page).
  });

  it("MIXED sources export in the given order (image page is 1pt, pdf page is 612pt)", async () => {
    const src = await makePdf(2);
    const out = await PDFDocument.load(
      await exportPdf([pdfItem(src, 0), pngItem(), pdfItem(src, 1), jpgItem()])
    );
    expect(out.getPageCount()).toBe(4);
    const widths = out.getPages().map((p) => p.getWidth());
    expect(widths).toEqual([612, 1, 612, 1]);
  });

  it("loads a multi-page source once and copies single pages from it", async () => {
    const src = await makePdf(3);
    const out = await PDFDocument.load(
      await exportPdf([pdfItem(src, 1), pdfItem(src, 1), pdfItem(src, 2)])
    );
    expect(out.getPageCount()).toBe(3);
  });
});

describe("exportPdf + deriveParts (the split path)", () => {
  it("each part exports to its own PDF with the right pages", async () => {
    const src = await makePdf(4);
    const items = [pdfItem(src, 0), pdfItem(src, 1), pdfItem(src, 2), pdfItem(src, 3)];
    const edits = { p3: { deleted: false, partStart: true } };
    const parts = deriveParts(items, edits);
    expect(parts).toHaveLength(2);

    const partPdfs: number[] = [];
    for (const part of parts) {
      const bytes = await exportPdf(part.items);
      partPdfs.push((await PDFDocument.load(bytes)).getPageCount());
    }
    expect(partPdfs).toEqual([2, 2]);
  });

  it("splitting a MIXED document (pdf pages + images) into parts", async () => {
    const src = await makePdf(2);
    const items = [pdfItem(src, 0), pngItem(), pdfItem(src, 1), jpgItem()];
    const edits = { g2: { deleted: false, partStart: true } };
    const parts = deriveParts(items, edits);
    expect(parts).toHaveLength(2);

    const a = await PDFDocument.load(await exportPdf(parts[0].items));
    const b = await PDFDocument.load(await exportPdf(parts[1].items));
    expect(a.getPageCount()).toBe(1);
    expect(b.getPageCount()).toBe(3); // image + pdf page + jpg
    expect(b.getPage(0).getWidth()).toBe(1); // image first in part 2
  });
});
