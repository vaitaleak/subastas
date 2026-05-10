/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: '/subastas',
  trailingSlash: true,
};

module.exports = nextConfig;
