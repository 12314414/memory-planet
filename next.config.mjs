/** @type {import('next').NextConfig} */
const ghPages = process.env.GH_PAGES === '1';

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
    unoptimized: ghPages,
  },
  ...(ghPages
    ? {
        output: 'export',
        basePath: '/memory-planet',
        trailingSlash: true,
        env: {
          NEXT_PUBLIC_DEMO_MODE: '1',
          NEXT_PUBLIC_BASE_PATH: '/memory-planet',
        },
      }
    : {}),
};

export default nextConfig;
