/** @type {import('next').NextConfig} */
const nextConfig = {
  // ...existing config
  output: 'export',
  basePath: process.env.NODE_ENV === 'production' ? '/shopping-cart' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/shopping-cart/' : '',
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig; 