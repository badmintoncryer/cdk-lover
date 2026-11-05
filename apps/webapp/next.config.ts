import type { NextConfig } from 'next';

const allowedOrigins = ['localhost:3000'];
if (process.env.ALLOWED_ORIGIN_HOST) {
  allowedOrigins.push(process.env.ALLOWED_ORIGIN_HOST);
}

const nextConfig: NextConfig = {
  output: 'standalone',
  // Required for pnpm workspace packages — Next.js standalone output does not
  // resolve symlinked workspace dependencies by default.
  transpilePackages: ['@repo/db', '@repo/event-utils'],
  experimental: {
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
    serverActions: {
      allowedOrigins,
    },
  },
  // Nothing here is meant to be framed (clickjacking on the admin page) or MIME-sniffed.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
  typescript: {
    ignoreBuildErrors: process.env.SKIP_TS_BUILD === 'true',
  },
};

export default nextConfig;
