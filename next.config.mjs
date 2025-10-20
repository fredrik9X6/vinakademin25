import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your Next.js config here
  turbopack: {},
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
