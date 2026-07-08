// Centralised base path. Defaults to "/chopdok" (the deployed/proxied mount).
// Run locally at the domain root with: NEXT_PUBLIC_BASE_PATH= npm run dev
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/chopdok";
