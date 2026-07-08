/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/chopdok";

const nextConfig = {
  basePath,
  async redirects() {
    // When mounted under a base path, redirect the bare root to it so the app's
    // own domain behaves as before. Skip when running at the domain root.
    if (basePath === "") return [];
    return [
      { source: "/", destination: basePath, permanent: false, basePath: false },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "skale.io" },
      { protocol: "https", hostname: "skale.dev" },
    ],
  },
};

export default nextConfig;
