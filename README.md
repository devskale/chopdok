# ChopDok

Assemble documents from PDFs and images — reorder, split, and export as PDF
**entirely in your browser**. Free, no uploads, no ads, no data collection.

Live: **https://www.skale.dev/chopdok**

## Why

Most document tools upload your files to a server. ChopDok does all processing
client-side with [pdf.js](https://github.com/mozilla/pdf.js) +
[pdf-lib](https://github.com/Hopding/pdf-lib). Your files never leave the
browser — not even the pdf.js worker (it's bundled locally, not loaded from a CDN).

## What it does

Drop **PDFs, images, or both** — every PDF page and every image becomes the
same thing: a card in one ordered document. Then:

- 🔀 **Rearrange** — drag cards (or arrow buttons) into the right order
- 📎 **Assemble to PDF** — merge everything into one PDF; images become pages
- ✂️ **Split** — cut the document at any boundary into named segments
- 🗑️ **Delete** — shade out any page/image (keeps its place, excluded from export)
- ✏️ **Rename segments** — names are anchored to the segment, so they survive reordering
- 📐 **Page size** — images export as *Fit to image* or *A4* (letterboxed)
- 📦 Download results individually or as a ZIP
- 🔒 100% client-side — nothing is uploaded

WebP/GIF/AVIF images are silently re-encoded to PNG before embedding
(PDFs can only embed PNG/JPEG natively).

## Tech

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 · shadcn/ui ·
pdfjs-dist v6 (render) · pdf-lib (copy/embed/export) · JSZip · Vitest

## Develop

```bash
npm install
npm run dev          # → http://localhost:3000/chopdok
```

The app is mounted under the `/chopdok` base path (see `lib/basePath.ts` /
`next.config.mjs`). To run at the domain root locally instead:

```bash
NEXT_PUBLIC_BASE_PATH= npm run dev   # → http://localhost:3000
```

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | ESLint (flat config) |
| `npm test` | Vitest (pure logic + export integration + hook + component smoke) |

## Architecture

```
app/
  page.tsx            # landing page (header, footer, mounts <DocumentAssembler/>)
  disclaimer/page.tsx # privacy/disclaimer page
  layout.tsx          # root layout, fonts, <Toaster/>
components/
  DocumentAssembler.tsx  # the whole UI: dropzone, item grid, reorder, split, exports
  ui/                    # shadcn/ui primitives (button, dialog, progress, toast, …)
lib/
  documents.ts            # pure: item model + item-anchored segments (deriveParts)
  ingest.ts               # File → items: PDF → page items (pdf.js), image → item
  exportPdf.ts            # ONE export engine: items → PDF (copyPages / embed, fit|a4)
  useDocumentAssembler.ts # the hook: state + side-effects (ingest, edits, exports)
  utils.ts / basePath.ts
hooks/
  use-toast.ts            # shadcn store-based toast
public/
  pdf.worker.min.mjs   # pdf.js v4+ ESM module worker (served locally)
  choppr.png           # icon/logo
```

**Design notes:**

- A document is an **ordered list of items** — a PDF page or an image are the
  same thing. All operations (reorder, split, delete, rename) act on the list.
- A split is a `partStart` marker **on an item**, and a segment's identity is
  the id of its first live item — so **names survive reordering**, and deleting
  a boundary item carries the cut (and name) to the next live item.
- `exportPdf()` is the single export engine: *assemble* is one call with all
  live items, *split* is one call per segment. PDF pages are copied (original
  size preserved), images are embedded.
- The pure, bug-prone logic lives in `documents.ts` and `exportPdf.ts` so it's
  unit-testable independently of the browser.

> When upgrading `pdfjs-dist`, re-copy the ESM module worker:
> `cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdf.worker.min.mjs`

## Roadmap

- ✂️ **Crop** — cut a region out of any item (two-up scans → two pages, margin
  trim, sprite-sheet slicing). See `issues.md` for the design note.

## Deploy

Served at `skale.dev/chopdok` by the **skalego** project, which reverse-proxies
this app (mounted under `basePath: '/chopdok'`). See [`DEPLOYMENT.md`](./DEPLOYMENT.md).
CI (`.github/workflows/ci.yml`) runs `npm test` + `npm run build` on push/PR.

## Disclaimer

This software is provided "as is", without warranty. Always keep a backup of
your original documents. See the in-app [disclaimer](./app/disclaimer/page.tsx).
