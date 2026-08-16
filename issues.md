# ChopDok — Issue Tracker

Live: https://www.skale.dev/chopdok · Repo: `devskale/chopdok` (public)
All gates green locally: `tsc --noEmit` · `npm test` (17/17) · `npm run build` · `npm run lint`.

---

## 🎯 Repurpose — from PDF splitter to document assembler

**One-liner:** Assemble what you have — PDFs, images, or both — into what you need: reorder, split, delete, and export as PDF. **Still 100% client-side.**

**The shift:**

| | Before (PDF splitter) | After (document assembler) |
|---|---|---|
| Input | one PDF | PDF(s) **and/or** image(s) — whatever the starting point |
| Model | pages of one file | one ordered list of **items** (pages + images) |
| Operations | split, delete, rename | + **rearrange/reorder**, + **merge** |
| Output | N split PDFs | one assembled **PDF** (images become pages); split PDFs stay |

**Jobs the app does after the repurpose:**
1. **Start anywhere** — drop a PDF, a scan, a photo, or a mixed pile; each becomes the same thing: items in a list.
2. **Rearrange** — drag/move items to build the right order (the core new capability).
3. **Assemble to PDF** — images + pages in one ordered document, exported as a single PDF.
4. **Still splits** — the existing split/delete/rename flow keeps working unchanged.

**🔌 Later addons (not in the first repurpose cut):**
- [ ] **Crop** — cut a region out of any item (page *or* image) into a new item. Killer use cases: split a two-up scan into two pages, trim margins, slice a sprite sheet into tiles. Design note: introduces a *derived* item source (`{ type: "crop", fromItemId, region }`) — export renders the region via canvas rather than copying original bytes, so it composes cleanly with reorder/split/assemble. Pure region math (`grid/strip slices`, `px → pdf pt` mapping) goes in `lib/` with unit tests, mirroring `parts.ts`.

**Non-negotiables (unchanged):** everything stays in the browser — no uploads, no CDN worker, no data collection. The privacy pitch is the product.

**Decisions (locked):**
1. **Page size** — setting in export UI: `fit` (default, page = image aspect) | `a4` (letterboxed, centered). Extensible list later.
2. **Reorder UX** — drag *and* arrow buttons (native HTML5 DnD, zero new deps).
3. **Segments are nameable** — scissors creates a segment; name it at cut time or later. Name anchors to the segment (first item's id) and survives reorder/splits moving (generalizes the #4 fix).
4. **webp/gif/avif** — auto re-encode to PNG via canvas before embedding (PDFs only embed PNG/JPEG natively); seamless to the user.

---

## 📋 Repurpose implementation plan (`feat/merge-split-images`)

Each phase lands shippable with all gates green (`tsc --noEmit` · `npm test` · `npm run build` · `npm run lint`). The old PDF flow stays mounted until Phase 4 swaps the UI.

### Phase 1 — Model & pure logic ✅ (started)
- [x] `lib/documents.ts` — `DocumentItem`, `ItemSource`, `moveItem` / `insertItems` / `removeItems`
- [ ] `documents.test.ts` — reorder edge cases (first/last/clamp/out-of-bounds, insert at ends, remove multi)
- [ ] **Item-anchored parts**: store splits as a `partStart` marker *on items* (scissors = "this item starts a new part"), not a separate index array. Derive `splitPoints` for `parts.ts` from markers; part identity = id of its first item → **rename anchors survive reorder** (generalizes the #4 fix). New pure fn `deriveParts(items)` + tests.

### Phase 2 — Ingest & export adapters
- [x] `lib/ingest.ts` — `ingestFile(file)`: PDF → item/page (pdf.js render, token-cancelled), image → 1 item (object-URL thumb). Keep unsupported-type soft-fail (`ok:false,error`) for toasts.
- [ ] `ingest.test.ts` — dispatch table (PDF/image/other) at minimum; pdf.js render path stays a documented test gap (needs canvas mock)
- [ ] `lib/exportPdf.ts` — **one export engine**: `exportPdf(items, { pageSize }): Promise<Uint8Array>`
  - group `pdf` items by source file → load each once (pdf-lib) → `copyPages`
  - `image` items → `embedPng`/`embedJpg`; webp/gif/avif → canvas re-encode to PNG first (PDFs can only embed PNG/JPEG directly — conversion is automatic, user does nothing)
  - **page-size setting**: `fit` (default, page matches image aspect) | `a4` (letterbox image onto A4 portrait, centered) — exposed in export UI, extensible list
- [ ] `splitItemsIntoPdfs(items, …)` — thin: `computePartRanges` over live items → `exportPdf` per range → replaces `pdfSplit.ts` (old fn stays green behind a wrapper until Phase 4)
- [ ] `exportPdf.test.ts` — integration (real pdf-lib docs + PNG/JPEG buffers): page count, **order**, mixed sources, image page dims, `a4` mode dims

### Phase 3 — Hook
- [ ] `lib/useDocumentAssembler.ts` — state: `items[]`, per-item `{ deleted, partStart, name }`; actions: `addFiles(multi)`, `move`, `remove`, `togglePartStart`, `rename`, `exportAssembledPdf()`, `exportSplitParts()`, `clearAll` (revokes object URLs); ingest progress + render-token cancellation carried over
- [ ] hook tests: unsupported-file guard (port of #6 test), clearAll reset, addFiles appends

### Phase 4 — UI
- [ ] `components/DocumentAssembler.tsx` (replaces `PdfUploader`): multi-file dropzone (`accept="application/pdf,image/*" multiple`), mixed item grid, **drag-to-reorder (native HTML5 DnD, no new dep) + arrow buttons for a11y**, scissors/split stays, shade-to-delete stays, **segment naming stays** (dialog now also shown when creating a split — name the new segment right where you cut), export settings (page size) + two actions: **Assemble PDF** / **Split & download parts** (+ ZIP)
- [ ] `app/page.tsx` + landing copy: "splitter" → "assembler" positioning; `PdfUploader.test.tsx` smoke ports over

### Phase 5 — Polish & ship
- [ ] README/issues.md refresh; manual browser smoke (mixed PDF+images → reorder → assemble; split flow regression)
- [ ] All gates + commit per phase

---

## ✅ Modernization complete (Jul 2026)

Full upgrade to latest everywhere, switched from pnpm → **npm** (kills the old pnpm-11 build-approval blocker). All four gates green.

**Stack now:**
- **Next.js 16** (App Router, **Turbopack** default bundler) · **React 19**
- **TypeScript 6** · **Tailwind v4** (CSS-based `@theme`, `tw-animate-css`, no `tailwind.config.ts`)
- **eslint 9** + flat config (`eslint-config-next@16` spread natively, no `FlatCompat` legacy shim)
- **pdfjs-dist v6** (ESM module worker via `workerPort` + `{ data }` getDocument)
- **lucide-react 1.23** · **tailwind-merge 3** · **@types/node 26** · everything latest
- **npm** (lockfile + install) — Vercel's default, no special config needed

**Migration notes (what changed):**
- **Turbopack**: removed the old `webpack: { alias: { canvas: false } }` block. Next 16 uses Turbopack by default; pdfjs v6's browser bundle doesn't pull the Node `canvas` dep, so the alias was unnecessary.
- **Tailwind 4**: rewrote `app/globals.css` (`@import "tailwindcss"`, `@import "tw-animate-css"`, `@custom-variant dark`, colors via `@theme inline`); `tailwind.config.ts` deleted; `postcss.config.mjs` → `@tailwindcss/postcss`; `tailwindcss-animate` → `tw-animate-css`.
- **ESLint flat config**: `eslint-config-next@16` exports a native flat-config array — spread directly in `eslint.config.mjs`. **eslint 10 is incompatible** (FlatCompat circular-structure crash + peer mismatches), so eslint is pinned to **9.39.4** (latest compatible with next's plugin chain).
- **Scripts modernized**: `next lint` was removed in Next 16, so `lint` now runs `eslint .` directly; `dev`/`build`/`start` use plain `next` (was `node node_modules/next/dist/bin/next`).
- **pdfjs v6 runtime fix**: `getDocument()` no longer accepts a raw `ArrayBuffer` — calls now pass `{ data: new Uint8Array(buf) }` (also avoids the v6 ArrayBuffer-neutering pitfall).
- **CI**: `.github/workflows/ci.yml` switched to npm (`npm ci` / `npm test` / `npm run build`). The pnpm `ERR_PNPM_IGNORED_BUILDS` blocker is gone — npm doesn't hard-error on build scripts.
- Removed redundant `jsconfig.json` (duplicate of `tsconfig.json`, with a stale wrong path map).

---

## ✅ Earlier work (4 commits, 20 issues)

- **P0 hygiene** (`dd97339`) — purged leaked/junk files from git history (`git filter-repo`), committed `.gitignore`, force-pushed clean `main`, deleted the `vercel/*` bot branch + all 25 stale deployments. **Confirmed non-security:** `vergabepilot.sqlite` is an empty 16 KB schema; `Integritaetsvereinbarung.pdf` is the blank, public City of Vienna procurement template. No breach / no notification needed.
- **P1 bugs (8/8)** (`6256cbb`) — zoom resolution+label; keyboard-zoom input guard; object-URL leaks; part names anchored to start page; removed dead `modifiedPDF`/`deletePages` path; error handling + toasts (non-PDF / corrupt / encrypted); chunked render + progress bar; thumbnail race cancellation.
- **P2 quality (7/7)** (`6256cbb`) — `lang=en`; unified favicon; real meta description; DOM-mutation → React state; `loadFile` extraction (no fake `ChangeEvent`); keyboard-accessible split scissors.
- **P3 deps** (`0aed28f`, `4a381f1`) — **34 → 17 direct deps**; pdf.js worker bundled locally (no cdnjs, "local-only" claim holds); pruned 7 unused shadcn components + their radix deps.
- **P4** — pruned 8 unused `public/` images; `*.tsbuildinfo` gitignored.

## 🔲 Open — priority order

- [x] **Vercel deploy verified** — pushed to `main`, Vercel built clean with Next 16 + Turbopack + npm. Live at `skale.dev/chopdok`: app `200`, Turbopack chunk serves, ESM module worker (`pdf.worker.min.mjs`) `200` as `application/javascript`. (Worker flip `.js→.mjs` + new chunk hash confirmed the new build.)
- [ ] **Tests** — vitest (**17 tests** over 4 files: `getPartInfo`, `computePartRanges`, `splitPdfDocument`, `useSimplePdfUploader.loadFile` non-PDF guard, `<PdfUploader/>` render smoke). Still uncovered: the hook's pdf.js success path (needs pdf.js + canvas mocking) and interactive component tests.
- [ ] **(optional · non-security)** Old commit SHAs (`32d674a`, `df77c98`) still served via read-only `refs/pull/1/head` (a closed bot PR GitHub won't let users delete). Optional tidy-up only. Options: GitHub Support (https://support.github.com/contact → *Remove cached views*), or delete + recreate the repo (needs `delete_repo` scope).
- [x] **`basePath`** — centralised the `/chopdok` prefix into `lib/basePath.ts` (`BASE_PATH`); default unchanged (production-safe), overridable via `NEXT_PUBLIC_BASE_PATH=`.

## Notes
- History-rewrite backups: `/tmp/chopdok-backup-20260707-232522.bundle`, `/tmp/chopdok-rescued-20260707-232522/`.
- Per-issue detail lives in the commit messages (`git log`); this file is the index.
