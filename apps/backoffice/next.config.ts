import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const backendApiUrl = (process.env.BACKEND_API_URL ?? 'http://127.0.0.1:4001').replace(/\/$/, '');

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  output: 'standalone',
  outputFileTracingRoot: fileURLToPath(new URL('../../', import.meta.url)),
  rewrites() {
    return Promise.resolve([
      {
        destination: `${backendApiUrl}/admin/:path*`,
        source: '/api/admin/:path*',
      },
    ]);
  },
};

export default nextConfig;
