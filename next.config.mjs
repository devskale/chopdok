/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/chopdok",
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
