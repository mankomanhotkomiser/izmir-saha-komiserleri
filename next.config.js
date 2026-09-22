/** @type {import('next').NextConfig} */
const nextConfig = {
  // Eski Webpack motoru için kalkan
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
  // Yeni nesil Turbopack motoru için kalkan
  turbopack: {
    resolveAlias: {
      canvas: false
    }
  }
};

// Sarı uyarıyı çözen klasik dışa aktarma yöntemi
module.exports = nextConfig;