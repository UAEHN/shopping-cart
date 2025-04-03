/** @type {import('next').NextConfig} */
const nextConfig = {
  // ...existing config
  output: 'export',
  serverOptions: {
    hostname: '0.0.0.0',
    port: 3000,
  },
  basePath: process.env.NODE_ENV === 'production' ? '/shopping-cart' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/shopping-cart/' : '',
  images: {
    unoptimized: true,
  },
};

export default nextConfig; 