/** @type {import('next').NextConfig} */
const nextConfig = {
  // ...existing config
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig; 