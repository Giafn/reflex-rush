/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Socket.IO custom server
  // When using `node server.ts`, Next.js runs in standalone mode
  experimental: {
    serverComponentsExternalPackages: ["socket.io", "@prisma/client"],
  },
  // Webpack config to handle Socket.IO properly
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
