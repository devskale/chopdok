// Flat config (ESLint 9+). eslint-config-next@16 already exports an array of
// flat-config objects, so we spread it directly — no FlatCompat shim needed.
import nextConfig from "eslint-config-next";

const next = Array.isArray(nextConfig)
  ? nextConfig
  : nextConfig.default ?? [nextConfig];

const eslintConfig = [...next];

export default eslintConfig;
