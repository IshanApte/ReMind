/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Increase function timeout and memory for RAG processing
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Mark packages that should not be bundled
  serverExternalPackages: ['@xenova/transformers'],
  // Handle native modules for Transformers.js
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude native Node.js modules that transformers.js might use
      config.externals = [
        ...(config.externals || []),
        'canvas',
        'jsdom',
      ];
      // Ignore warnings about missing optional dependencies
      config.ignoreWarnings = [
        { module: /@xenova\/transformers/ },
      ];
    }
    return config;
  },
}

module.exports = nextConfig

