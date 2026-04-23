import type { Media } from '@/payload-types'
import { getSiteURL } from './site-url'

/**
 * Shape-loose helper for documents that carry the shared `seoFields`.
 * We accept `unknown`-ish inputs so the same helper works across Payload's
 * auto-generated collection types without generic gymnastics.
 */
type SeoSource = {
  seoTitle?: string | null
  seoDescription?: string | null
  seoImage?: number | Media | null
  noindex?: boolean | null
}

export type ResolvedSeo = {
  title: string
  description: string
  imageUrl: string | null
  noindex: boolean
}

const toAbsolute = (url: string | null | undefined): string | null => {
  if (!url) return null
  if (/^https?:\/\//i.test(url)) return url
  return `${getSiteURL()}${url.startsWith('/') ? url : `/${url}`}`
}

const mediaURL = (image: SeoSource['seoImage']): string | null => {
  if (!image || typeof image !== 'object') return null
  return toAbsolute(image.url || null)
}

/**
 * Resolve SEO fields for a document, with CMS-override-then-fallback semantics.
 *
 * @param doc      The Payload document (expected to carry seoFields).
 * @param fallback Auto-generated defaults used when the CMS fields are empty.
 */
export const resolveSeo = (
  doc: SeoSource | null | undefined,
  fallback: { title: string; description: string; imageUrl?: string | null },
): ResolvedSeo => {
  const seoTitle = (doc?.seoTitle || '').trim()
  const seoDescription = (doc?.seoDescription || '').trim()
  return {
    title: seoTitle || fallback.title,
    description: seoDescription || fallback.description,
    imageUrl: mediaURL(doc?.seoImage) || toAbsolute(fallback.imageUrl || null),
    noindex: Boolean(doc?.noindex),
  }
}
