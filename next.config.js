/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Increase function timeout and memory for RAG processing
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Webpack configuration (simplified - no longer need to exclude native modules)
  // All dependencies now work in serverless environments
}

module.exports = nextConfig

