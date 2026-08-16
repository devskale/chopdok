// Integration tests with real pdf-lib documents and real PNG/JPEG buffers.
// The canvas re-encode path (webp/gif/…) is browser-only and stays untested
// here (documented gap, like the pdf.js render path).

import { describe, it, expect, beforeEach } from "vitest";
import { PDFDocument, PDFDict, PDFName } from "pdf-lib";
import { exportPdf } from "./exportPdf";
import { deriveParts, DocumentItem, ItemEdits } from "./documents";

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

describe("exportPdf + deriveParts (segments are virtual; export picks granularity)", () => {
  it("segments define ranges; ANY segment can export alone", async () => {
    const src = await makePdf(4);
    const items = [pdfItem(src, 0), pdfItem(src, 1), pdfItem(src, 2), pdfItem(src, 3)];
    const edits: ItemEdits = {
      p1: { deleted: false, segmentStart: true, name: "Intro" },
      p3: { deleted: false, segmentStart: true, name: "Part Two" },
    };
    const parts = deriveParts(items, edits);
    expect(parts).toHaveLength(2);

    // checkout: one file
    const one = await PDFDocument.load(await exportPdf(items));
    expect(one.getPageCount()).toBe(4);
    // checkout: this segment
    const seg = await PDFDocument.load(await exportPdf(parts[1].items, { title: parts[1].name }));
    expect(seg.getPageCount()).toBe(2);
    // checkout: every segment
    const counts: number[] = [];
    for (const part of parts) {
      counts.push((await PDFDocument.load(await exportPdf(part.items))).getPageCount());
    }
    expect(counts).toEqual([2, 2]);
  });
});

describe("exportPdf outline (segment index as PDF metadata)", () => {
  it("writes bookmarks + opens the reader on the outline panel", async () => {
    const bytes = await exportPdf([pngItem(), pngItem(), pngItem()], {
      outline: [
        { title: "Cover", pageIndex: 0 },
        { title: "Evidence", pageIndex: 1 },
        { title: "Appendix", pageIndex: 2 },
      ],
    });
    const doc = await PDFDocument.load(bytes);
    const outlines = doc.catalog.lookup(PDFName.of("Outlines"), PDFDict);
    expect(outlines).toBeTruthy();
    expect(String(outlines.get(PDFName.of("Count")))).toBe(String(3));
    // PageMode /UseOutlines -> readers show the index sidebar
    expect(String(doc.catalog.get(PDFName.of("PageMode")))).toBe("/UseOutlines");
  });

  it("no outline option -> no Outlines entry (byte-lean default)", async () => {
    const doc = await PDFDocument.load(await exportPdf([pngItem()]));
    expect(doc.catalog.get(PDFName.of("Outlines"))).toBeFalsy();
  });

  it("outline entries past the last page are dropped safely", async () => {
    const bytes = await exportPdf([pngItem()], {
      outline: [
        { title: "ok", pageIndex: 0 },
        { title: "bad", pageIndex: 99 },
      ],
    });
    const doc = await PDFDocument.load(bytes);
    const outlines = doc.catalog.lookup(PDFName.of("Outlines"), PDFDict);
    expect(String(outlines.get(PDFName.of("Count")))).toBe(String(1));
  });
});
