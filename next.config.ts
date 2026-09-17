import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Server-only packages that shouldn't be bundled for client
  serverExternalPackages: ['mongoose']
};

export default nextConfig;
