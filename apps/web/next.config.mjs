/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@collabarch/shared-types'],
  output: 'standalone',
};

export default nextConfig;

