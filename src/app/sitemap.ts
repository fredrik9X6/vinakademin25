import type { MetadataRoute } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getSiteURL } from '@/lib/site-url'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('sitemap')

// Cache the generated sitemap for 1 hour in production so frequent crawls
// don't hammer Payload.
export const revalidate = 3600

type SitemapEntry = MetadataRoute.Sitemap[number]

const toAbsolute = (base: string, path: string) => `${base}${path.startsWith('/') ? path : `/${path}`}`

const STATIC_ROUTES: Array<{ path: string; changeFrequency: SitemapEntry['changeFrequency']; priority: number }> = [
  { path: '/', changeFrequency: 'daily', priority: 1.0 },
  { path: '/vinprovningar', changeFrequency: 'daily', priority: 0.9 },
  { path: '/vinlistan', changeFrequency: 'daily', priority: 0.9 },
  { path: '/artiklar', changeFrequency: 'daily', priority: 0.8 },
  { path: '/vinkompass', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/regioner', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/lander', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/om-oss', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/kontakt', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/nyhetsbrev', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/villkor', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/integritetspolicy', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/cookies', changeFrequency: 'yearly', priority: 0.2 },
]

async function fetchSlugs(
  payload: Awaited<ReturnType<typeof getPayload>>,
  collection: 'vinprovningar' | 'blog-posts' | 'wines' | 'regions' | 'countries' | 'grapes',
  opts: { requirePublished?: boolean } = {},
) {
  try {
    const where = opts.requirePublished ? { _status: { equals: 'published' as const } } : undefined
    const result = await payload.find({
      collection,
      where,
      depth: 0,
      limit: 5000,
      pagination: false,
      select: { slug: true, updatedAt: true },
      overrideAccess: true,
    })
    return result.docs as Array<{ slug?: string | null; updatedAt?: string }>
  } catch (err) {
    log.error({ err, collection }, 'Failed to fetch slugs for sitemap')
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteURL().replace(/\/$/, '')
  const payload = await getPayload({ config })
  const now = new Date()

  const [courses, posts, wines, regions, countries, grapes] = await Promise.all([
    fetchSlugs(payload, 'vinprovningar', { requirePublished: true }),
    fetchSlugs(payload, 'blog-posts', { requirePublished: true }),
    fetchSlugs(payload, 'wines'),
    fetchSlugs(payload, 'regions'),
    fetchSlugs(payload, 'countries'),
    fetchSlugs(payload, 'grapes'),
  ])

  const staticEntries: SitemapEntry[] = STATIC_ROUTES.map((r) => ({
    url: toAbsolute(base, r.path),
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }))

  const toDocEntry = (
    prefix: string,
    priority: number,
    changeFrequency: SitemapEntry['changeFrequency'],
  ) =>
    (doc: { slug?: string | null; updatedAt?: string }): SitemapEntry | null => {
      if (!doc.slug) return null
      return {
        url: toAbsolute(base, `${prefix}/${doc.slug}`),
        lastModified: doc.updatedAt ? new Date(doc.updatedAt) : now,
        changeFrequency,
        priority,
      }
    }

  const dynamicEntries: SitemapEntry[] = [
    ...courses.map(toDocEntry('/vinprovningar', 0.9, 'weekly')),
    ...posts.map(toDocEntry('/artiklar', 0.7, 'weekly')),
    ...wines.map(toDocEntry('/vinlistan', 0.6, 'monthly')),
    ...regions.map(toDocEntry('/regioner', 0.5, 'monthly')),
    ...countries.map(toDocEntry('/lander', 0.5, 'monthly')),
    // Grapes don't have dedicated pages yet — leave out until routes exist.
  ].filter((entry): entry is SitemapEntry => entry !== null)

  void grapes

  return [...staticEntries, ...dynamicEntries]
}
