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

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind · shadcn/ui ·
pdfjs-dist (render) · pdf-lib (split/delete) · JSZip · Vitest

## Develop

```bash
pnpm install
pnpm dev          # → http://localhost:3000/chopdok
```

The app is mounted under the `/chopdok` base path (see `lib/basePath.ts` /
`next.config.mjs`). To run at the domain root locally instead:

```bash
NEXT_PUBLIC_BASE_PATH= pnpm dev   # → http://localhost:3000
```

### Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` | Production build |
| `pnpm start` | Run the production build |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest (pure logic + pdf-lib integration + hook guard) |

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
  pdf.worker.min.js     # pdf.js worker (served locally; copy of pdfjs-dist/build/…)
  choppr.png            # icon/logo
```

The pure, bug-prone logic (part identity, split math) lives in `lib/parts.ts` and
`lib/pdfSplit.ts` so it's unit-testable independently of the browser/PDF stack.

> When upgrading `pdfjs-dist`, re-copy the worker:
> `cp node_modules/pdfjs-dist/build/pdf.worker.min.js public/pdf.worker.min.js`
> (and note v4+ ships a `.mjs` module worker — see `issues.md`).

## Deploy

Served at `skale.dev/chopdok` by the **skalego** project, which reverse-proxies
this app (mounted under `basePath: '/chopdok'`). See [`DEPLOYMENT.md`](./DEPLOYMENT.md).
CI (`.github/workflows/ci.yml`) runs `pnpm test` + `pnpm build` on push/PR.

## Disclaimer

This software is provided "as is", without warranty. Always keep a backup of
your original documents. See the in-app [disclaimer](./app/disclaimer/page.tsx).
