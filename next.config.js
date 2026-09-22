/** @type {import('next').NextConfig} */
const nextConfig = {
  // Eski motor (Webpack) için Canvas kalkanı
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
  // Yeni motor (Turbopack) uyarılarını susturan boş kural
  turbopack: {}
};

// Sarı uyarıyı yok eden standart dışa aktarma komutu
module.exports = nextConfig;