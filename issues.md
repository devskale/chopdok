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
- [ ] **(deferred · breaking migration)** Upgrade `pdfjs-dist` 3.11.174 → v4/5. v4+ ships the worker as `.mjs` (module worker): migrate `ensurePdfjs` to `GlobalWorkerOptions.workerPort = new Worker(new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url), { type: 'module' })` and drop `public/pdf.worker.min.js`. Defer to a focused session — app works and is already on latest v3. (Also `pdf-lib` 1.17.1, stale but stable.)
- [ ] **Tests / CI** — none today. Add a framework and cover the `useSimplePdfUploader` hook (the bulk of the logic surface).
- [ ] **(minor)** `basePath: '/chopdok'` is hardcoded in `next.config.mjs`; consider an env-driven value for local ergonomics.

## Notes
- History-rewrite backups: `/tmp/chopdok-backup-20260707-232522.bundle`, `/tmp/chopdok-rescued-20260707-232522/`.
- Per-issue detail lives in the commit messages (`git log`); this file is the index.
