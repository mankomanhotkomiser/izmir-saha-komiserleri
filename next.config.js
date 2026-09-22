/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
  turbopack: {},
};

export default nextConfig; 
// (Eğer dosyanın adı next.config.js ise en alt satır module.exports = nextConfig; olmalı)