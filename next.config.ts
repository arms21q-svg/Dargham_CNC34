import type { NextConfig } from 'next'
import { buildContentSecurityPolicy } from './csp'

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(), geolocation=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
  { key: 'Origin-Agent-Cluster', value: '?1' },
  {
    key: 'Content-Security-Policy',
    value: buildContentSecurityPolicy(),
  },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  env: {
    NEXT_PUBLIC_BUILD_ID:
      process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev',
  },
  generateBuildId: async () => {
    return process.env.VERCEL_GIT_COMMIT_SHA ?? `build-${Date.now()}`
  },
  experimental: {
    viewTransition: true,
  },
  images: {
    loader: 'custom',
    loaderFile: './src/lib/imageLoader.ts',
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  async redirects() {
    return [
      { source: '/about', destination: '/', permanent: true },
      { source: '/faq', destination: '/', permanent: true },
      { source: '/works/all', destination: '/works', permanent: true },
      { source: '/admin/works', destination: '/admin/categories', permanent: false },
      { source: '/portfolio/:slug', destination: '/categories/:slug', permanent: true },
      { source: '/admin/managers', destination: '/admin', permanent: false },
      { source: '/admin/employees', destination: '/admin/account', permanent: false },
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/api/site-data',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=300',
          },
          {
            key: 'Vary',
            value: 'Authorization',
          },
        ],
      },
      {
        source: '/api/products/:id/image',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      {
        source: '/api/categories/:id/image',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      {
        source: '/api/site/slides/:index/image',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ]
  },
}

export default nextConfig
