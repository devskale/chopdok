# ChopDok — Issue Tracker

Live: https://www.skale.dev/chopdok · Repo: `devskale/chopdok` (public)
All gates green locally: `tsc --noEmit` · `npm test` (17/17) · `npm run build` · `npm run lint`.

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
