/** @type {import('next').NextConfig} */
const nextConfig = {
  // ...existing config
  output: 'export',
  trailingSlash: true,
  basePath: process.env.NODE_ENV === 'production' ? '/shopping-cart' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/shopping-cart/' : '',
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig; 