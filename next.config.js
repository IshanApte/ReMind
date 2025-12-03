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
      const makeExternal = (context, request, callback) => {
        // Ensure request is a string before checking
        if (typeof request !== 'string') {
          return callback();
        }
        
        // Use regex to match all @xenova/transformers imports (including sub-paths)
        if (/^@xenova\/transformers/.test(request)) {
          // For ES modules with dynamic imports, return the module name as-is
          // This allows Node.js to handle it as an ES module at runtime
          return callback(null, request);
        }
        
        // Mark other native dependencies as external
        if (
          /^onnxruntime-node/.test(request) ||
          request === 'canvas' ||
          request === 'jsdom' ||
          /\.node$/.test(request) // Mark .node files as external
        ) {
          return callback(null, `commonjs ${request}`);
        }
        callback();
      };
      
      // Combine with existing externals - put our function first to catch these modules
      const existingExternals = config.externals;
      if (Array.isArray(existingExternals)) {
        config.externals = [makeExternal, ...existingExternals];
      } else if (typeof existingExternals === 'function') {
        config.externals = [makeExternal, existingExternals];
      } else {
        config.externals = [makeExternal, existingExternals].filter(Boolean);
      }
      
      // Prevent webpack from trying to resolve these modules
      config.resolve = config.resolve || {};
      config.resolve.alias = {
        ...config.resolve.alias,
      };
      
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

