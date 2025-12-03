/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Increase function timeout and memory for RAG processing
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Handle native modules for Transformers.js
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Create a function to handle externals for packages with native dependencies
      const makeExternal = (request, callback) => {
        // Mark packages and their sub-imports as external
        if (
          request === '@xenova/transformers' ||
          request.startsWith('@xenova/transformers/') ||
          request === 'onnxruntime-node' ||
          request.startsWith('onnxruntime-node/') ||
          request === 'canvas' ||
          request === 'jsdom' ||
          /\.node$/.test(request) // Mark .node files as external
        ) {
          return callback(null, `commonjs ${request}`);
        }
        callback();
      };
      
      // Combine with existing externals
      const existingExternals = config.externals;
      if (Array.isArray(existingExternals)) {
        config.externals = [makeExternal, ...existingExternals];
      } else if (typeof existingExternals === 'function') {
        config.externals = [makeExternal, existingExternals];
      } else {
        config.externals = [makeExternal, existingExternals].filter(Boolean);
      }
      
      // Ignore warnings about missing optional dependencies
      config.ignoreWarnings = [
        ...(config.ignoreWarnings || []),
        { module: /@xenova\/transformers/ },
        { module: /onnxruntime-node/ },
        { file: /\.node$/ },
      ];
    }
    return config;
  },
}

module.exports = nextConfig

