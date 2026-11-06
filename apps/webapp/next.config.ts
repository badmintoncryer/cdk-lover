import type { NextConfig } from 'next';

// Hosts allowed to call Server Actions (comma-separated). The Lambda sees the Function URL as its
// Host, so the browser-facing hosts (CloudFront and the custom domain) must be listed here.
const allowedOrigins = [
  'localhost:3000',
  ...(process.env.ALLOWED_ORIGIN_HOST ?? '')
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean),
];

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
