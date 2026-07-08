# Deployment — serving this app at `skale.dev/chopdok`

This app runs in its **own Vercel project** (`chopdok.vercel.app`,
auto-deployed from `main`) but is served **transparently** at
`skale.dev/chopdok` by the **skalego** project, which reverse-proxies the
request via a `vercel.json` rewrite. The visitor's address bar stays on
`skale.dev/chopdok`.

For the full, framework-agnostic guide see **`skalego/APPS.md`**.

## What makes it work in *this* repo (Next.js)

### 1. `basePath` = the subpath (`next.config.mjs`)
```js
const nextConfig = {
  basePath: '/chopdok',
  async redirects() {
    // keep chopdok.vercel.app/ (bare root) working → /chopdok
    return [{ source: '/', destination: '/chopdok', permanent: false, basePath: false }];
  },
  images: { /* remotePatterns */ },
  // ...
};
```
Next.js mounts the whole app under `/chopdok` (routes, `/_next/...`, links,
router). `next/link` and `next/router` auto-apply it.

### 2. Routes live at the root, NOT under `app/chopdok/`
```
app/page.tsx            ← main page (served at /chopdok via basePath)
app/disclaimer/page.tsx ← /chopdok/disclaimer
```
If the routes were under `app/chopdok/`, `basePath` would double-prefix to
`/chopdok/chopdok`. Internal `next/link` hrefs are written **without** the
prefix (`href="/disclaimer"`, `href="/"`) — `basePath` adds it back.

### 3. Fix references that DON'T auto-apply `basePath` (the 404 traps)
- **`next/image` static `src`** → write the prefix manually:
  `<Image src="/chopdok/choppr.png" />`.
- **`metadata.icons`** (`app/layout.tsx` and page `metadata`) → same:
  `icon: "/chopdok/choppr.png"`.
- Audit any plain `<img src="/...">`, `fetch('/...')`, or hardcoded redirects.

## The proxy side (skalego repo — not here)
`skalego/vercel.json` **keeps** the prefix (Next.js serves everything under
`/chopdok`):
```jsonc
{ "source": "/chopdok",        "destination": "https://chopdok.vercel.app/chopdok" },
{ "source": "/chopdok/:path*", "destination": "https://chopdok.vercel.app/chopdok/:path*" }
```

## Package manager
This repo uses **npm** (`package-lock.json`). Vercel auto-detects npm — **no
`packageManager` field, no env var, no special config needed.** (The old
pnpm-11 `ERR_PNPM_IGNORED_BUILDS` / `ENABLE_EXPERIMENTAL_COREPACK` pain is
gone.) Build scripts (sharp, unrs-resolver) run automatically under npm.

## Deploy order
1. Push **this** repo (`basePath` + bare-root redirect + icon prefixes) → wait Ready.
2. Push **skalego** (rewrite points at the app).

## Verify (URL must stay `skale.dev/chopdok` — that's the proxy)
```bash
curl -sI https://www.skale.dev/chopdok | grep -iE 'HTTP|content-type'
# a _next chunk proxies through:
asset=$(curl -s https://www.skale.dev/chopdok | grep -oE '/chopdok/_next/[^"]*\.js' | head -1)
curl -sI "https://www.skale.dev${asset}" | grep -i content-type
# own domain + bare root still work:
curl -sIL https://chopdok.vercel.app/   # → /chopdok
```

## TL;DR gotchas
- `basePath:'/chopdok'` is mandatory — no basePath ⇒ `/_next` asset 404s.
- Don't keep routes under `app/chopdok/` (double-prefix).
- `next/image` static `src` and `metadata.icons` need a **manual** `/chopdok/` prefix.
- Use `/:path*`; Next.js normalizes trailing slashes, so point destinations at the no-slash form.
- Deploy the app before the skalego rewrite.
