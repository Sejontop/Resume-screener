import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Prevents Next.js webpack bundler from failing on mammoth's native Node.js dependencies
  serverExternalPackages: ['mammoth'],
};

export default nextConfig;