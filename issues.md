# ChopDok — Issue Tracker

Live: https://www.skale.dev/chopdok · Repo: `devskale/chopdok` (public)
All fixes browser-validated with rodney against `localhost:3000/chopdok`; `tsc --noEmit` clean throughout.

## ✅ Done (4 commits, 20 issues)

- **P0 hygiene** (`dd97339`) — purged leaked/junk files from git history (`git filter-repo`), committed `.gitignore`, force-pushed clean `main`, deleted the `vercel/*` bot branch + all 25 stale deployments. **Confirmed non-security:** `vergabepilot.sqlite` is an empty 16 KB schema; `Integritaetsvereinbarung.pdf` is the blank, public City of Vienna procurement template. No breach / no notification needed.
- **P1 bugs (8/8)** (`6256cbb`) — zoom resolution+label; keyboard-zoom input guard; object-URL leaks; part names anchored to start page; removed dead `modifiedPDF`/`deletePages` path; error handling + toasts (non-PDF / corrupt / encrypted); chunked render + progress bar; thumbnail race cancellation.
- **P2 quality (7/7)** (`6256cbb`) — `lang=en`; unified favicon; real meta description; DOM-mutation → React state; `loadFile` extraction (no fake `ChangeEvent`); keyboard-accessible split scissors.
- **P3 deps** (`0aed28f`, `4a381f1`) — **34 → 17 direct deps**; pdf.js worker bundled locally (no cdnjs, "local-only" claim holds); pnpm only; pruned 7 unused shadcn components + their radix deps.
- **P4** — pruned 8 unused `public/` images; `*.tsbuildinfo` gitignored.

## 🔲 Open — priority order

- [ ] **(optional · non-security)** Old commit SHAs (`32d674a`, `df77c98`) are still served via the read-only `refs/pull/1/head` (a closed bot PR GitHub won't let users delete). Optional tidy-up only — contents are non-sensitive. Options: GitHub Support (https://support.github.com/contact → *Remove cached views*), or delete + recreate the repo (needs `delete_repo` scope).
- [ ] **(investigated · currently blocked)** Upgrade `pdfjs-dist` past v3. Tried v6 (6.1.200): blocked — it requires `Promise.try` (Chrome ~143+, mid-2025), too new a baseline for a public app, and not polyfillable inside the prebuilt worker. Staying on `3.11.174` (latest v3, broadly compatible). Revisit once `Promise.try` is universal; the migration also needs the module-worker change (`GlobalWorkerOptions.workerPort = new Worker(url, { type: 'module' })`). Reverted + re-validated on a clean build (6 thumbnails). (Also `pdf-lib` 1.17.1, stale but stable.)
- [~] **Tests** — vitest added (`pnpm test`), **15 tests** over 3 files: `getPartInfo` (part identity / #4 anchor), `computePartRanges`, `splitPdfDocument` (real pdf-lib integration), and `useSimplePdfUploader.loadFile` non-PDF guard (hook test, jsdom). Still uncovered: the hook's pdf.js success path (needs pdf.js + canvas mocking) and component/UI tests.
- [x] **CI** — done: `.github/workflows/ci.yml` runs `pnpm test` + `pnpm build` on push/PR (production build verified green locally).
- [x] **(minor)** `basePath` — done: centralised the `/chopdok` prefix into `lib/basePath.ts` (`BASE_PATH`); default unchanged (production-safe), overridable via `NEXT_PUBLIC_BASE_PATH=` for local-root dev. Default behaviour validated (favicon + worker + thumbnails all serve from `/chopdok/`).

## Notes
- History-rewrite backups: `/tmp/chopdok-backup-20260707-232522.bundle`, `/tmp/chopdok-rescued-20260707-232522/`.
- Per-issue detail lives in the commit messages (`git log`); this file is the index.
