# ChopDok

Painless PDF chopping — split, delete, and rename pages **entirely in your browser**. Free, no uploads, no ads, no data collection.

Live: **https://www.skale.dev/chopdok**

## Why

Most "PDF split" tools upload your documents to a server. ChopDok does all
processing client-side with [pdf.js](https://github.com/mozilla/pdf.js) +
[pdf-lib](https://github.com/Hopding/pdf-lib). Your files never leave the
browser — not even the pdf.js worker (it's bundled locally, not loaded from a CDN).

## Features

- 📑 Split a PDF at any page boundary into multiple parts
- 🗑️ Delete individual pages (shade them out before processing)
- ✏️ Rename each part (labels stay anchored to their section when splits move)
- 📦 Download parts individually or as a ZIP
- 🔍 Zoomable page preview
- 🔒 100% client-side — nothing is uploaded

## Tech

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 · shadcn/ui ·
pdfjs-dist v6 (render) · pdf-lib (split/delete) · JSZip · Vitest

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
| `npm test` | Vitest (pure logic + pdf-lib integration + hook guard) |

## Architecture

```
app/
  page.tsx            # landing page (header, footer, mounts <PdfUploader/>)
  disclaimer/page.tsx # privacy/disclaimer page
  layout.tsx          # root layout, fonts, <Toaster/>
components/
  PdfUploader.tsx     # the whole UI: dropzone, grid, summary, downloads, rename dialog
  ui/                 # shadcn/ui primitives (button, dialog, progress, toast, …)
lib/
  simplePdfUploader.ts  # the hook: file loading, thumbnails, splitting (state + side-effects)
  parts.ts              # pure: getPartInfo, computePartRanges  (unit-tested)
  pdfSplit.ts           # pdf-lib: splitPdfDocument             (integration-tested)
  basePath.ts           # BASE_PATH constant
hooks/
  use-toast.ts          # shadcn store-based toast
public/
  pdf.worker.min.mjs   # pdf.js v4+ ESM module worker (served locally; copy of pdfjs-dist/build/…)
  choppr.png            # icon/logo
```

The pure, bug-prone logic (part identity, split math) lives in `lib/parts.ts` and
`lib/pdfSplit.ts` so it's unit-testable independently of the browser/PDF stack.

> When upgrading `pdfjs-dist`, re-copy the ESM module worker:
> `cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdf.worker.min.mjs`

## Deploy

Served at `skale.dev/chopdok` by the **skalego** project, which reverse-proxies
this app (mounted under `basePath: '/chopdok'`). See [`DEPLOYMENT.md`](./DEPLOYMENT.md).
CI (`.github/workflows/ci.yml`) runs `npm test` + `npm run build` on push/PR.

## Disclaimer

This software is provided "as is", without warranty. Always keep a backup of
your original documents. See the in-app [disclaimer](./app/disclaimer/page.tsx).
