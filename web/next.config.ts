import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',          // static SPA → GitHub Pages
  reactStrictMode: true,
  trailingSlash: true,       // emit /p/index.html so direct URLs resolve on Pages
  images: { unoptimized: true },
};

export default nextConfig;
