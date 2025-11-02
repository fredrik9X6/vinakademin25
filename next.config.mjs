import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your Next.js config here
  // Temporarily disabled turbopack - may cause require() errors
  // turbopack: {},
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/api/media/**',
      },
      {
        protocol: 'https',
        hostname: 'localhost',
        port: '3000',
        pathname: '/api/media/**',
      },
    ],
    // Allow localhost in development
    ...(process.env.NODE_ENV === 'development' && {
      domains: ['localhost'],
    }),
  },
  async redirects() {
    return [
      {
        source: '/kurser',
        destination: '/vinprovningar',
        permanent: true,
      },
      {
        source: '/kurser/:slug*',
        destination: '/vinprovningar/:slug*',
        permanent: true,
      },
    ]
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
