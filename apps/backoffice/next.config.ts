import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const backendApiUrl = (process.env.BACKEND_API_URL ?? 'http://127.0.0.1:4001').replace(/\/$/, '');

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  output: 'standalone',
  outputFileTracingRoot: fileURLToPath(new URL('../../', import.meta.url)),
  // 서비스 이름을 끼루에서 굿플레이스로 바꿨다(ADR-0010). 예전 북마크 주소를 새 주소로 넘긴다.
  redirects() {
    return Promise.resolve([
      {
        destination: '/goodplace/:path*',
        permanent: true,
        source: '/kkiru/:path*',
      },
    ]);
  },
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
