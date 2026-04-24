import type { MetadataRoute } from 'next'
import { getSiteURL } from '@/lib/site-url'

export default function robots(): MetadataRoute.Robots {
  const base = getSiteURL().replace(/\/$/, '')

  // Non-canonical hosts (Railway preview, localhost) shouldn't be indexed.
  // The canonical production host is www.vinakademin.se; anything else we serve
  // from gets a blanket disallow so preview deploys can't rank.
  const isCanonicalHost = /(^|\/\/)(www\.)?vinakademin\.se$/i.test(base)

  if (!isCanonicalHost) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/api',
          '/api/',
          '/checkout',
          '/checkout/',
          '/mina-sidor',
          '/mina-sidor/',
          '/mina-provningar',
          '/mina-provningar/',
          '/profil',
          '/profil/',
          '/installningar',
          '/installningar/',
          '/verifiera-epost',
          '/verifiera-epost-meddelande',
          '/aktivera-konto',
          '/aterstall-losenord',
          '/glomt-losenord',
          '/onboarding',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
