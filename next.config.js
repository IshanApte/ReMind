/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Increase function timeout and memory for RAG processing
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Webpack configuration to exclude native Node.js modules from bundling
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mark native Node.js modules and @xenova/transformers as external
      const makeExternal = ({ request }, callback) => {
        // Ensure request is a string before checking
        if (typeof request !== 'string') {
          return callback();
        }
        
        // Mark @xenova/transformers and its dependencies as external
        if (
          request.startsWith('@xenova/transformers') ||
          request.startsWith('onnxruntime-node') ||
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
    }
    return config;
  },
}

module.exports = nextConfig

