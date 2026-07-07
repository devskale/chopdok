/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/chopdok",
  async redirects() {
    return [
      // bare-root visitors (e.g. chopdok.vercel.app/) -> the app, so chopdok's
      // own domain behaves as before despite basePath mounting it under /chopdok.
      { source: "/", destination: "/chopdok", permanent: false, basePath: false },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "skale.io" },
      { protocol: "https", hostname: "skale.dev" },
    ],
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: false,
    };
    return config;
  },
};

export default nextConfig;
