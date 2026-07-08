# ChopDok — Issue Tracker

Live: https://www.skale.dev/chopdok · Repo: `devskale/chopdok` (public)
All fixes browser-validated with rodney against `localhost:3000/chopdok`; `tsc --noEmit` clean throughout.

---

## 🔴 BLOCKER — CI is red: `pnpm install` fails (handoff for next dev)

**Status:** GitHub Actions CI on `main` is **failing at the install step**. Local dev / build / test are all green — only CI's fresh install fails. The app code is fine; this is a pnpm-11-in-CI config issue I could not fully resolve. **Start here.**

**Error** (`.github/workflows/ci.yml` → `Run pnpm install --frozen-lockfile`):
```
[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: canvas@2.11.2, unrs-resolver@1.12.2
Process completed with exit code 1.
```

**Why only CI (not local `pnpm dev`):** pnpm 11 hard-errors when deps have un-approved `postinstall` build scripts. `pnpm dev` / an existing `node_modules` never trigger it (no fresh install). CI does a cold `--frozen-lockfile` install → the check fires.
- `canvas@2.11.2` — optional dep of `pdfjs-dist` (Node-side canvas; **unused** — this app renders in the browser).
- `unrs-resolver@1.12.2` — native binary for `eslint-import-resolver` (only needed for `pnpm lint`, which CI doesn't run).

**What I tried (all pushed to `main`):**
1. Node `20` → `22` in the workflow — pnpm 11.7 needs Node ≥22.13 (`node:sqlite`). Fixed a *different* error; this one remained. **(kept)**
2. `package.json` → `pnpm.ignoredBuiltDependencies: [canvas, unrs-resolver]` — **not honored** by pnpm 11.7 (it reads build-script policy from `pnpm-workspace.yaml`).
3. `pnpm-workspace.yaml` → `ignoredBuiltDependencies` + `onlyBuiltDependencies: []` — **still failed in CI** (identical error).
4. `pnpm-workspace.yaml` → `onlyBuiltDependencies: [canvas, unrs-resolver]` (approve) — **passes a local cold-store repro** but **still fails in CI**. ← current state on `main`.

**The unresolved discrepancy (key clue):** a local cold-store install honors `onlyBuiltDependencies`; CI's pnpm does not. Same pnpm `11.7.0` (via `packageManager`), same files. Suspects: Corepack-via-`pnpm/action-setup` vs local global pnpm, linux-vs-mac, or pnpm 11.7 not reading `pnpm-workspace.yaml` in the runner env.

**Suggested next steps (most → least likely to be quick):**
1. **Pin pnpm to v9** in `package.json` `packageManager` (e.g. `pnpm@9.15.4`) + matching `pnpm/action-setup`. pnpm v9 only *warns* on ignored builds (no hard error) → CI install should pass. (Re-gen `pnpm-lock.yaml`.)
2. Debug what CI's pnpm reads: add a step `pnpm config list && cat pnpm-workspace.yaml` to confirm `onlyBuiltDependencies` is seen.
3. Find the pnpm-11.7 setting that downgrades the error to a warning (`.npmrc` `strict-dep-builds=false`? or a `--config.` flag) — verify the exact name in pnpm 11.7 docs.
4. Drop the offenders: `pnpm install --frozen-lockfile --no-optional` removes `canvas` (optional); `unrs-resolver` is a regular dep, so it needs an `pnpm.overrides`/exclusion or a different approach.

**Reproduce locally (cold store, like CI):**
```
mkdir /tmp/repro && cd /tmp/repro
cp /path/to/chopdok/{package.json,pnpm-lock.yaml,pnpm-workspace.yaml} .
pnpm install --frozen-lockfile --store-dir /tmp/cold-store   # passed for me on macOS; fails in CI
```

**Files:** `.github/workflows/ci.yml`, `package.json` (`packageManager`), `pnpm-workspace.yaml`, `pnpm-lock.yaml`.

---

## ✅ Done (4 commits, 20 issues)

- **P0 hygiene** (`dd97339`) — purged leaked/junk files from git history (`git filter-repo`), committed `.gitignore`, force-pushed clean `main`, deleted the `vercel/*` bot branch + all 25 stale deployments. **Confirmed non-security:** `vergabepilot.sqlite` is an empty 16 KB schema; `Integritaetsvereinbarung.pdf` is the blank, public City of Vienna procurement template. No breach / no notification needed.
- **P1 bugs (8/8)** (`6256cbb`) — zoom resolution+label; keyboard-zoom input guard; object-URL leaks; part names anchored to start page; removed dead `modifiedPDF`/`deletePages` path; error handling + toasts (non-PDF / corrupt / encrypted); chunked render + progress bar; thumbnail race cancellation.
- **P2 quality (7/7)** (`6256cbb`) — `lang=en`; unified favicon; real meta description; DOM-mutation → React state; `loadFile` extraction (no fake `ChangeEvent`); keyboard-accessible split scissors.
- **P3 deps** (`0aed28f`, `4a381f1`) — **34 → 17 direct deps**; pdf.js worker bundled locally (no cdnjs, "local-only" claim holds); pnpm only; pruned 7 unused shadcn components + their radix deps.
- **P4** — pruned 8 unused `public/` images; `*.tsbuildinfo` gitignored.

## 🔲 Open — priority order

- [ ] **(optional · non-security)** Old commit SHAs (`32d674a`, `df77c98`) are still served via the read-only `refs/pull/1/head` (a closed bot PR GitHub won't let users delete). Optional tidy-up only — contents are non-sensitive. Options: GitHub Support (https://support.github.com/contact → *Remove cached views*), or delete + recreate the repo (needs `delete_repo` scope).
- [ ] **(investigated · currently blocked)** Upgrade `pdfjs-dist` past v3. Tried v6 (6.1.200): blocked — it requires `Promise.try` (Chrome ~143+, mid-2025), too new a baseline for a public app, and not polyfillable inside the prebuilt worker. Staying on `3.11.174` (latest v3, broadly compatible). Revisit once `Promise.try` is universal; the migration also needs the module-worker change (`GlobalWorkerOptions.workerPort = new Worker(url, { type: 'module' })`). Reverted + re-validated on a clean build (6 thumbnails). (Also `pdf-lib` 1.17.1, stale but stable.)
- [~] **Tests** — vitest added (`pnpm test`), **17 tests** over 4 files: `getPartInfo` (part identity / #4 anchor), `computePartRanges`, `splitPdfDocument` (real pdf-lib integration), `useSimplePdfUploader.loadFile` non-PDF guard (hook, jsdom), and a `<PdfUploader/>` render smoke test (component). Still uncovered: the hook's pdf.js success path (needs pdf.js + canvas mocking) and interactive component tests.
- [ ] **CI — BLOCKED (red on `main`)**: workflow runs `pnpm test` + `pnpm build`, but the `pnpm install --frozen-lockfile` step fails with `ERR_PNPM_IGNORED_BUILDS`. See the 🔴 BLOCKER section at the top. Local test/build are green; only CI install fails.
- [x] **(minor)** `basePath` — done: centralised the `/chopdok` prefix into `lib/basePath.ts` (`BASE_PATH`); default unchanged (production-safe), overridable via `NEXT_PUBLIC_BASE_PATH=` for local-root dev. Default behaviour validated (favicon + worker + thumbnails all serve from `/chopdok/`).

## Notes
- History-rewrite backups: `/tmp/chopdok-backup-20260707-232522.bundle`, `/tmp/chopdok-rescued-20260707-232522/`.
- Per-issue detail lives in the commit messages (`git log`); this file is the index.
