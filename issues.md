# ChopDok — Issue Tracker

Source: code review of `devskale/chopdok` (live at https://www.skale.dev/chopdok).

> **Status note (2026-07-07):** P0 hygiene **complete**. History rewritten (`git filter-repo`, 27 commits verified clean), `.gitignore` committed, force-pushed to `origin/main` (`dd97339`), residual `vercel/...` bot branch deleted, all 25 stale deployments purged. 0 forks, no open PRs.
>
> ✅ **Not a security incident.** Inspecting the actual contents: `vergabepilot.sqlite` is an **empty** 16 KB schema (0 rows, nothing recoverable), and `Integritaetsvereinbarung.pdf` is the **blank, publicly-published City of Vienna procurement template** (WD 307/313/314, Wiener Wohnen) — no signatures/names/emails/dates. **No data breach, no GDPR/DSG notification needed.** The only residual (old SHAs still served via the read-only `refs/pull/1/head`) is now **optional tidiness, not security** — the repo can stay public. Backups: `/tmp/chopdok-backup-20260707-232522.bundle`, `/tmp/chopdok-rescued-20260707-232522/`, `/tmp/chopdok-preserve-*`.

---

## 🔴 P0 — Repo hygiene / leaked data

- [x] Rewrite git history to purge all banned files from every commit (`git filter-repo`, 27 commits, verified clean)
- [x] Commit updated `.gitignore` (`.DS_Store`, `**/.DS_Store`, `*.tsbuildinfo`, `*.sqlite`, `*.sqlite3`, `*.bak`, `.env*`)
- [x] Re-add `origin` (filter-repo removed it) and `git push --force-with-lease origin main` — remote `main` verified clean (`dd97339`)
- [x] Delete `vercel/react-server-components-cve-vu-gellkt` — bot branch was based on old history and re-exposed **all** purged files incl. the confidentiality doc
- [x] Confirm no forks (`forks_count: 0`), no open PRs, and old commit `32d674a` unreachable from any branch
- [x] Purge all stale GitHub deployments pinning pre-rewrite SHAs (25 deleted via `gh`; only current prod `dd97339` remains)
- [x] Attempt to delete anchoring ref — **blocked by GitHub**: `refs/pull/1/head` (PR #1, closed Vercel bot PR → `df77c98` → parent `32d674a`) returns `refs/pull/* is read-only` (422). GitHub keeps closed-PR refs forever and they are not user-deletable.
- [ ] **The old commit SHAs are still publicly served (HTTP 200)** at `https://raw.githubusercontent.com/devskale/chopdok/32d674a/Integritaetsvereinbarung.pdf` and `…/df77c98/…` — reachable only via the read-only PR ref above. Two ways to finish:
  - **(A) GitHub Support** — non-destructive, canonical. Request removal of unreachable objects reachable only via `refs/pull/1/head` + cached views of `32d674a`/`df77c98`. Draft message is in `issues.md` below / can be pasted at https://support.github.com/contact.
  - **(B) Delete + recreate repo** (`gh`-native full purge) — needs `delete_repo` scope (`gh auth refresh -h github.com -s delete_repo`), then `gh repo delete devskale/chopdok --yes`, recreate, re-push clean `main`, and re-link Vercel. Fully purges the PR ref; loses repo metadata (only the bot PR #1 exists, so minimal loss).
  - **Stopgap:** `gh repo edit devskale/chopdok --visibility private` makes the raw URLs 404 publicly *immediately* (Vercel keeps working via its GitHub App); reversible.
- [ ] *(Optional tidiness, not security)* Old commit SHAs (`32d674a`, `df77c98`) are still served via the read-only `refs/pull/1/head`. If you want them gone: GitHub Support request (draft below) or delete+recreate the repo. Not required since contents are non-sensitive.
- [x] `vergabepilot.sqlite` — SQLite DB from a different project (Vergabepilot)
- [x] `Integritaetsvereinbarung.pdf` — **confirmed non-sensitive**: blank City of Vienna public procurement template (not a filled/signed doc)
- [x] Vergabepilot leftovers: `lib/types.ts`, `db_schema.dbml`, `newdb.dbml`, `db-schema-diagram.mermaid.md`
- [x] Dead components: `components/FileContextMenu.tsx`, `components/ImageWithOverlay.tsx`
- [x] Junk: `input.jpg`, `temp_preview.png`, `markerhelp.md`
- [x] Build/OS noise: all `.DS_Store` (incl. `scripts/.DS_Store`), `tsconfig.tsbuildinfo`, `components.json.bak`, `.env.example` (`ROOT_FOLDER="../vDaten"`)

---

## 🟠 P1 — Bugs

- [x] **Fake zoom** — fixed: render thumbnails once at `scale 1.0` (`lib/simplePdfUploader.ts:152`, was `0.5`) so the bitmap is ≥ the largest display size; every zoom level is now a crisp CSS *downscale* (no re-render, no freeze on big PDFs). Label corrected to `thumbnailSize * 50`% (`components/PdfUploader.tsx:360`, default = 100%).
- [x] **Keyboard zoom fires while typing** — fixed: added an input/textarea/select/contentEditable guard at the top of the global keydown handler (`components/PdfUploader.tsx:252`); typing `-`/`+` in the rename dialog (or any field) no longer zooms.
- [x] **Object URL memory leaks** — fixed (`lib/simplePdfUploader.ts`): removed the unused `localPath` object URL + `FileInfo.localPath` field entirely (it was never read); `splitPDF`/`deletePages` now revoke previous result URLs in the state updater before replacing (idempotent, StrictMode-safe); `clearAll` already revoked split/modified URLs. Cross-validated in-browser: upload→6 thumbnails renders cleanly, re-process flow intact.
- [x] **Renamed parts mislabel when splits move** — fixed (`components/PdfUploader.tsx`): `partNames` is now keyed by each part's **start page** (stable identity) via new `getPartInfo()`, not its positional index; updated all 6 usages (thumbnail render, summary `getPartStatus`, ZIP, download buttons) and renamed `renamingPartIndex`→`renamingPartKey`. Cross-validated via rodney: rename→add earlier split→label stays anchored on its original pages.
- [x] **Dead `modifiedPDF` / `deletePages` path** — removed entirely (never called; the split+shade flow already covers deletion): dropped `modifiedPDF` state, `deletePages`, the "Modified PDF Ready" panel, and all interface/return/clearAll refs. Smoke-verified via rodney.
- [x] **No error handling** — fixed (`lib/simplePdfUploader.ts`): non-PDF guard (type/extension) toasts "Not a PDF"; `handleFileChange` wraps load+thumbnails in try/catch (toasts "Couldn't open this PDF" + resets state on corrupt/encrypted files); `splitPDF` wrapped in try/catch (toasts on failure); `ensurePdfjs` failure handled. Cross-validated via rodney: non-PDF, corrupt PDF, and valid PDF all behave correctly.
- [x] **No progress + UI freezes on large PDFs** — fixed (`lib/simplePdfUploader.ts`): `generateThumbnails` now yields to the event loop between pages (`setTimeout(0)`), reports `thumbnailProgress`/`isGeneratingThumbnails`, and `PdfUploader` renders a `Progress` bar ("Rendering pages… N%"). Cross-validated: 90-page PDF shows progress climbing (63% mid-render) with the tab staying responsive.
- [x] **Thumbnail race** — fixed (`lib/simplePdfUploader.ts`): a `renderTokenRef` cancellation guard — each `generateThumbnails` call increments a token; stale renders bail at every await point and never call `setThumbnails`, so the newest upload always wins. Cross-validated: uploading a 2-page PDF mid-render of a 90-page PDF deterministically yields 2 thumbnails (90-page render cancelled), no errors.

---

## 🟡 P2 — Code quality / anti-patterns

- [x] **Imperative DOM mutation in React** — fixed: removed the buggy `resetButtonStyles()` (it queried `.download-button` but toggled gray classes they never had) and the per-button `e.currentTarget.classList` poking; per-part "downloaded" state is now a `downloadedParts: Set<number>` with classes derived from it (`PdfUploader.tsx`). Cross-validated via rodney: button is white before click, `bg-green-600` after.
- [x] **`parseInt(partName.replace("part",""))`** — resolved by the #4 fix: `getPartName` was removed entirely (replaced by `getPartInfo` returning `{ startPage, partIndex }`); no more string round-trip.
- [x] **Drag-drop fakes a `ChangeEvent`** — fixed: extracted `loadFile(file: File)` in the hook; `handleFileChange` now just extracts the file and calls it, and `handleDrop` calls `loadFile(files[0])` directly. No more `{ target: { files } } as unknown as ChangeEvent` cast.
- [x] **Split-point scissors are `<div onClick>`** — fixed: added `role="button"`, `tabIndex={0}`, `aria-label`, `onKeyDown` (Enter/Space), and focus-visible styles so they're keyboard reachable. Cross-validated via rodney (`role=button tabIndex=0`, 5 elements).
- [x] **`<html lang="de">`** but the entire UI is English (`app/layout.tsx`). — fixed: changed to `lang="en"`. Cross-validated via rodney.
- [x] **Two different favicons** — fixed: `app/layout.tsx` icons now use `choppr.png` (matching `app/page.tsx` + the header branding). Cross-validated.
- [x] **`metadata.description = "Generated by skale.dev"`** — fixed: now the real tagline ("Painless PDF chopping — split, delete, and rename pages, free and entirely in your browser. No uploads, no ads, no data collection."). Cross-validated.

---

## 🟡 P3 — Dependencies

- [x] **Remove unused** — done (`0aed28f`): removed 14 zero-import deps (react-pdf, @react-pdf-viewer/*, react-beautiful-dnd, docx, file-saver, react-dropzone, zustand, react-hot-toast, react-markdown, shadcn-ui, fs, @headlessui/react) → 34 direct deps down to 20. Validated: app still uploads/renders.
- [ ] *(deferred — deliberate migration)* **Upgrade `pdfjs-dist` to v4/5** — now on latest v3 (`3.11.174`). v4+ is a breaking change: the worker ships as `.mjs` (module worker), so migrate `ensurePdfjs` to `GlobalWorkerOptions.workerPort = new Worker(new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url), { type: 'module' })` and drop the `public/` copy. Deferred to avoid destabilising the working app; lower urgency now that we're on the latest v3. (`pdf-lib` 1.17.1 is also stale but stable — upgrade separately.)
- [x] **Bundle the pdf.js worker locally** — done (`0aed28f`): worker copied to `public/pdf.worker.min.js`, `workerSrc` re-pointed to `/chopdok/pdf.worker.min.js`; no cdnjs runtime dependency (confirmed via the Resource Timing API). The "local processing only" claim now fully holds.
- [x] **Pick one package manager** — done: removed `package-lock.json`; pnpm (`pnpm-lock.yaml`) is the single manager.

---

## ⚪ P4 — Minor / optional

- [ ] No tests, no CI config.
- [x] Optional: prune unused shadcn ui components — done: removed `card`, `checkbox`, `scroll-area`, `select`, `table`, `textarea`, `badge` (all 0 uses) + their 3 radix deps (`react-checkbox`, `react-scroll-area`, `react-select`). Kept `progress` (used by #7) and `toast`/`toaster` (used by #6). Now 17 direct deps.
- [x] Optional: prune unused `public/` images — done: removed `chop.png` (unused after the favicon fix), `skale.dev.logo.png`, `skale300x200.logo.png`, `wko.png`, `wko.svg`, `wwhb_logo*.png` (all 0 refs). Only `choppr.png` remains; app still serves (200).
- [ ] `tsconfig` `incremental: true` → keep `*.tsbuildinfo` gitignored.
- [ ] `basePath: '/chopdok'` is hardcoded (`next.config.mjs`); dev requires `localhost:3000/chopdok`. Documented in `DEPLOYMENT.md`, but consider an env-driven value for local ergonomics.

---

## 📨 Support request draft (for path A)

Paste at **https://support.github.com/contact** (topic: *Attach, request, or unattend data* → *Remove cached views*):

> **Repository:** devskale/chopdok (public)
>
> I force-pushed rewritten history to remove sensitive files committed by mistake — notably a confidentiality agreement (`Integritaetsvereinbarung.pdf`) and a database (`vergabepilot.sqlite`). The current default branch `main` (HEAD `dd97339`) is clean and verified; the only remaining branch is `main`, and all stale deployments have been deleted.
>
> A closed bot pull request (#1, ref `refs/pull/1/head` → commit `df77c98`, whose ancestry includes the secret commit `32d674a`) is read-only and cannot be deleted by me. Its objects — and GitHub's cached views of them — are still publicly served:
>
> - https://raw.githubusercontent.com/devskale/chopdok/32d674a/Integritaetsvereinbarung.pdf  → HTTP 200
> - https://raw.githubusercontent.com/devskale/chopdok/df77c98/Integritaetsvereinbarung.pdf  → HTTP 200
>
> Could you please purge the unreachable objects reachable only via `refs/pull/1/head`, and clear the cached views of commits `32d674a` and `df77c98` (and their tree/blob objects), so these files are no longer accessible? Thank you.
