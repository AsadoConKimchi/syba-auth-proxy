import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // 기존 LNURL 콜백 하위 호환: syba-sats.vercel.app?tag=login&k1=xxx
      {
        source: '/',
        has: [{ type: 'query', key: 'tag' }],
        destination: '/api/lnurl-auth',
      },
    ];
  },
};

export default nextConfig;
