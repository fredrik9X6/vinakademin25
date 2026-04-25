import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { headers } from 'next/headers'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RichTextRenderer } from '@/components/ui/rich-text-renderer'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { ExternalLink, Clock, ArrowRight, CalendarDays, Sparkles } from 'lucide-react'
import type { Metadata } from 'next'
import { BlogPostCard } from '@/components/blog'
import { getSiteURL } from '@/lib/site-url'
import { resolveSeo } from '@/lib/seo'
import { BreadcrumbJsonLd, WineProductJsonLd } from '@/components/seo/JsonLd'

type PageProps = {
  params: Promise<{ slug: string }>
}

const decodeSlug = (value: string): string => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const normalizeSlug = (value: string): string =>
  decodeSlug(String(value || ''))
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

async function fetchWineBySlug(slug: string) {
  const payload = await getPayload({ config })
  const decodedSlug = decodeSlug(slug)
  const numericSlug = Number(decodedSlug)
  const hasNumericSlug = Number.isFinite(numericSlug) && !Number.isNaN(numericSlug)
  const slugCandidates = Array.from(
    new Set(
      [slug, decodedSlug, slug.toLowerCase(), decodedSlug.toLowerCase()].filter(
        (candidate) => Boolean(candidate && candidate.trim()),
      ),
    ),
  )
  const res = await payload.find({
    collection: 'wines',
    where: {
      or: [
        ...slugCandidates.map((candidate) => ({ slug: { equals: candidate } })),
        ...(hasNumericSlug ? [{ id: { equals: numericSlug } }] : []),
      ],
    },
    depth: 2 as any,
    limit: 1,
  } as any)
  let wine: any | null = res.docs?.[0] ?? null
  if (!wine && !hasNumericSlug) {
    const normalizedRequestedSlug = normalizeSlug(decodedSlug)
    const fallbackRes = await payload.find({
      collection: 'wines',
      depth: 2 as any,
      limit: 2000,
    } as any)
    wine =
      (fallbackRes.docs || []).find(
        (doc: any) => doc?.slug && normalizeSlug(String(doc.slug)) === normalizedRequestedSlug,
      ) || null
  }
  if (!wine) return null

  // Load a trusted review if exists for rating display
  const reviews = await payload.find({
    collection: 'reviews',
    where: {
      and: [{ isTrusted: { equals: true } }, { wine: { equals: wine.id } }],
    },
    depth: 1 as any,
    limit: 1,
    sort: '-rating',
    overrideAccess: false,
  } as any)
  const review = reviews.docs?.[0] || null
  return { wine, review }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const data = await fetchWineBySlug(slug)
  const baseUrl = getSiteURL()
  if (!data) {
    return {
      title: `Vin | Vinakademin`,
      description: 'Vin i Vinlistan på Vinakademin',
      robots: 'noindex, follow',
      alternates: { canonical: `${baseUrl}/vinlistan/${slug}` },
    }
  }
  const { wine } = data as any
  const fallbackTitle = `${wine.name}${wine.vintage ? ` · ${wine.vintage}` : ''} | Vinakademin`
  const fallbackDescription = [
    wine.winery,
    wine.region?.name,
    wine.country?.name,
  ]
    .filter(Boolean)
    .join(' · ') || `${wine.name} — vin i Vinakademins vinlista`
  const canonicalUrl = `${baseUrl}/vinlistan/${wine.slug || wine.id}`

  const seo = resolveSeo(wine, {
    title: fallbackTitle,
    description: fallbackDescription,
    imageUrl: wine.image?.url || null,
  })

  return {
    title: seo.title,
    description: seo.description,
    robots: seo.noindex
      ? 'noindex, follow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: 'article',
      title: seo.title,
      description: seo.description,
      url: canonicalUrl,
      siteName: 'Vinakademin',
      locale: 'sv_SE',
      images: seo.imageUrl ? [{ url: seo.imageUrl }] : undefined,
    },
    twitter: {
      card: seo.imageUrl ? 'summary_large_image' : 'summary',
      title: seo.title,
      description: seo.description,
      ...(seo.imageUrl && { images: [seo.imageUrl] }),
    },
  }
}

export default async function WineDetailPage({ params }: PageProps) {
  const { slug } = await params
  const data = await fetchWineBySlug(slug)
  if (!data) return notFound()
  const { wine, review } = data as any

  const payload = await getPayload({ config })

  // Fetch only:
  // - Vinakademins verifierade (trusted) recensioner
  // - Den inloggade användarens egna recensioner
  const headersList = await headers()
  const cookieString = headersList.get('cookie') || ''
  const { user } = await payload.auth({
    headers: new Headers({
      Cookie: cookieString,
    }),
  })

  const trustedReviewsRes = await payload.find({
    collection: 'reviews',
    where: {
      and: [{ isTrusted: { equals: true } }, { wine: { equals: wine.id } }],
    },
    sort: '-createdAt',
    depth: 1 as any,
    limit: 10,
    overrideAccess: false,
    req: {
      headers: new Headers({
        Cookie: cookieString,
      }),
      user,
      payload,
    } as any,
  } as any)

  const myReviewsRes = user?.id
    ? await payload.find({
        collection: 'reviews',
        where: {
          and: [{ wine: { equals: wine.id } }, { user: { equals: Number(user.id) } }],
        },
        sort: '-createdAt',
        depth: 1 as any,
        limit: 10,
        overrideAccess: false,
        req: {
          headers: new Headers({
            Cookie: cookieString,
          }),
          user,
          payload,
        } as any,
      } as any)
    : { docs: [] }

  const visibleReviewsRaw = [
    ...(trustedReviewsRes.docs || []),
    ...((myReviewsRes as any).docs || []),
  ]
  const seen = new Set<string>()
  const visibleReviews = visibleReviewsRaw
    .filter((r: any) => {
      const id = String(r?.id)
      if (!id || seen.has(id)) return false
      seen.add(id)
      return true
    })
    .slice()
    .sort((a: any, b: any) => {
      const ta = a.isTrusted ? 1 : 0
      const tb = b.isTrusted ? 1 : 0
      if (tb - ta !== 0) return tb - ta
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    })

  const wineIdStr = String(wine.id)
  const wineSlugStr = String(wine.slug || '')

  // Fetch related wines by region or grapes
  const grapeIds: number[] = Array.isArray(wine.grapes)
    ? (wine.grapes as any[])
        .map((g: any) => (typeof g === 'object' ? Number(g.id) : Number(g)))
        .filter(Boolean)
    : []
  const relatedRes = await payload.find({
    collection: 'wines',
    where: {
      and: [
        { id: { not_equals: wine.id } },
        {
          or: [
            ...(wine.region?.id ? [{ region: { equals: wine.region.id } }] : []),
            ...(grapeIds.length > 0 ? [{ grapes: { in: grapeIds } }] : []),
          ],
        },
      ],
    },
    depth: 1 as any,
    limit: 8,
  } as any)
  const relatedWines = relatedRes.docs || []

  // Fetch vinprovningar that reference this wine
  const vinRes = await payload.find({
    collection: 'vinprovningar',
    where: { _status: { equals: 'published' } },
    depth: 2 as any,
    limit: 100,
  } as any)
  const allVinprovningar = vinRes.docs || []
  const relatedVinprovningar = allVinprovningar.filter((v: any) => {
    const json = JSON.stringify(v.fullDescription || {})
    return json.includes(wineIdStr) || json.includes(wineSlugStr)
  })

  // Fetch blog posts where this wine is referenced in content blocks
  const postsRes = await payload.find({
    collection: 'blog-posts',
    where: { _status: { equals: 'published' } },
    sort: '-publishedDate',
    depth: 2 as any,
    limit: 100,
  } as any)
  const blogPostsAll = postsRes.docs || []
  const referencesWine = (content: any): boolean => {
    if (!content || typeof content !== 'object') return false
    const stack: any[] = [content]

    const getRelId = (w: any): string | null => {
      if (!w) return null
      if (typeof w === 'string' || typeof w === 'number') return String(w)
      // Payload relationship shapes
      if (typeof w === 'object') {
        if (w.id) return String(w.id)
        if (w.value) return String(typeof w.value === 'object' ? (w.value.id ?? w.value) : w.value)
        if (w.doc && w.doc.id) return String(w.doc.id)
      }
      return null
    }

    while (stack.length) {
      const node = stack.pop()
      if (!node || typeof node !== 'object') continue

      // Detect wine-reference blocks in various shapes
      const blockType =
        node.blockType || node.blockName || node?.fields?.blockType || node?.fields?.blockName
      const isWineBlock = blockType === 'wine-reference' || blockType === 'WineReference'
      if (
        isWineBlock ||
        node.type === 'wine-reference' ||
        (node.type === 'block' && node.fields?.blockType === 'wine-reference')
      ) {
        const wRaw =
          node.fields?.wine ?? node.wine ?? node.fields?.data?.wine ?? node.fields?.fields?.wine
        const wid = getRelId(wRaw)
        if (wid && wid === wineIdStr) return true
        // Also compare by slug when full doc is embedded
        if (wRaw && typeof wRaw === 'object') {
          const wslug = String((wRaw as any).slug || '')
          if (wslug && wslug === wineSlugStr) return true
        }
      }

      // Detect link nodes pointing to this wine
      const url: string | undefined =
        (node.url || node.href || node?.fields?.url) &&
        String(node.url || node.href || node?.fields?.url)
      if (
        url &&
        (url.includes(`/vinlistan/${wineSlugStr}`) || url.includes(`/vinlistan/${wineIdStr}`))
      ) {
        return true
      }

      // Detect internal link nodes with doc relation to wines
      const doc = (node as any).doc || (node as any)?.fields?.doc
      if (doc && (doc.relationTo === 'wines' || doc.relationTo === 'wine')) {
        const docVal = doc.value || doc.id
        const wid = getRelId(docVal)
        if (wid && wid === wineIdStr) return true
      }

      for (const key of Object.keys(node)) {
        const val = (node as any)[key]
        if (val && typeof val === 'object') stack.push(val)
        if (Array.isArray(val)) val.forEach((v) => stack.push(v))
      }
    }
    // Fallback: string search in serialized content
    try {
      const json = JSON.stringify(content)
      if (
        json.includes(`/vinlistan/${wineSlugStr}`) ||
        json.includes(`/vinlistan/${wineIdStr}`) ||
        (json.includes('"wine"') && json.includes(`"${wineIdStr}"`))
      ) {
        return true
      }
    } catch {}
    return false
  }
  const blogPosts = blogPostsAll.filter((p: any) => referencesWine(p.content))

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(price)

  const lastUpdated = wine.updatedAt
    ? new Date(wine.updatedAt).toLocaleDateString('sv-SE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  const siteURL = getSiteURL()
  const wineSlug = wine.slug || String(wine.id)
  const trustedReviewRatings = (trustedReviewsRes.docs || [])
    .map((r: any) => Number(r.rating))
    .filter((n: number) => Number.isFinite(n) && n > 0)
  const aggregateRating =
    trustedReviewRatings.length > 0
      ? {
          value: trustedReviewRatings.reduce((a: number, b: number) => a + b, 0) /
            trustedReviewRatings.length,
          count: trustedReviewRatings.length,
        }
      : null
  const productDescription = [
    wine.winery,
    wine.region?.name,
    wine.country?.name,
    Array.isArray(wine.grapes) && wine.grapes.length > 0
      ? wine.grapes.map((g: any) => (typeof g === 'object' ? g.name : g)).join(', ')
      : null,
    wine.vintage ? `Årgång ${wine.vintage}` : null,
  ]
    .filter(Boolean)
    .join(' · ') || `${wine.name} — vin i Vinakademins vinlista`

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {!wine.noindex && (
        <WineProductJsonLd
          siteURL={siteURL}
          name={wine.name}
          slug={wineSlug}
          description={productDescription}
          imageUrl={
            wine.image?.url
              ? wine.image.url.startsWith('http')
                ? wine.image.url
                : `${siteURL}${wine.image.url}`
              : null
          }
          producer={wine.winery || null}
          countryName={wine.country?.name || null}
          vintage={wine.vintage ? Number(wine.vintage) : null}
          price={typeof wine.price === 'number' && wine.price > 0 ? wine.price : null}
          aggregateRating={aggregateRating}
        />
      )}
      <BreadcrumbJsonLd
        items={[
          { name: 'Hem', url: `${siteURL}/` },
          { name: 'Vinlistan', url: `${siteURL}/vinlistan` },
          { name: wine.name, url: `${siteURL}/vinlistan/${wineSlug}` },
        ]}
      />
      <div className="mb-6 flex items-center justify-between">
        <Link href="/vinlistan" className="text-sm text-muted-foreground hover:underline">
          ← Tillbaka till Vinlistan
        </Link>
        {lastUpdated ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>Senaste uppdaterad: {lastUpdated}</span>
          </div>
        ) : null}
      </div>

      <Card className="mb-8 overflow-hidden">
        <CardContent className="p-0">
          {/* Mobile: stacked. Tablet (md): image left, content right side-by-side. */}
          <div className="flex flex-col md:flex-row">
            {/* Wine bottle image */}
            <div className="flex items-center justify-center bg-gradient-to-br from-muted/40 to-muted/20 md:w-52 lg:w-60 flex-shrink-0 py-8 px-6">
              <div className="relative h-56 w-24 sm:h-64 sm:w-28 md:h-72 md:w-32">
                {wine.image?.url ? (
                  <Image src={wine.image.url} alt={wine.name} fill className="object-contain" />
                ) : null}
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1 p-5 sm:p-6 md:p-8 flex flex-col gap-5 min-w-0">
              {/* Header */}
              <div>
                <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                  <h1 className="text-2xl sm:text-3xl text-foreground break-words">
                    {wine.name}{wine.vintage ? <span className="text-muted-foreground font-normal"> · {wine.vintage}</span> : ''}
                  </h1>
                  {Number(wine.price) ? (
                    <div className="text-brand-gradient text-xl font-bold">
                      {formatPrice(Number(wine.price))}
                    </div>
                  ) : null}
                </div>
                <div className="text-sm text-muted-foreground">
                  {wine.winery}
                  {wine.region?.name ? (
                    <>
                      {' · '}
                      <Link href={`/regioner/${wine.region.slug}`} className="hover:text-orange-500 transition-colors underline-offset-2 hover:underline">
                        {wine.region.name}
                      </Link>
                    </>
                  ) : null}
                  {wine.country?.name ? (
                    <>
                      {', '}
                      <Link href={`/lander/${wine.country.slug}`} className="hover:text-orange-500 transition-colors underline-offset-2 hover:underline">
                        {wine.country.name}
                      </Link>
                    </>
                  ) : null}
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {review ? (
                  <Badge className="bg-brand-300/10 text-brand-400 border-brand-300/30">
                    Verifierad recension
                  </Badge>
                ) : null}
                {review?.rating ? (
                  <Badge variant="secondary">
                    Betyg: {review.rating}/5
                  </Badge>
                ) : null}
              </div>

              {/* Details grid — 2 cols on mobile/tablet, 3 on desktop */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Druvor</div>
                  <div className="text-sm font-medium">
                    {Array.isArray(wine.grapes) && (wine.grapes as any[]).length > 0
                      ? (wine.grapes as any[])
                          .map((g: any) => (typeof g === 'object' ? g.name : g))
                          .join(', ')
                      : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Alkohol</div>
                  <div className="text-sm font-medium">{wine.alcohol ? `${wine.alcohol}%` : '—'}</div>
                </div>
                {wine.region?.name ? (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Region</div>
                    <div className="text-sm font-medium">
                      <Link href={`/regioner/${wine.region.slug}`} className="hover:text-orange-500 transition-colors hover:underline underline-offset-2">
                        {wine.region.name}
                      </Link>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Description */}
              {wine.description?.root ? (
                <div className="border-t border-border/50 pt-4">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Beskrivning</div>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <RichTextRenderer content={wine.description} />
                  </div>
                </div>
              ) : null}

                {/* Systembolaget link */}
                {wine.systembolagetUrl && wine.systembolagetUrl.trim() ? (
                  <div>
                    <a
                      href={
                        wine.systembolagetUrl.startsWith('http')
                          ? wine.systembolagetUrl
                          : `https://${wine.systembolagetUrl}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-400 hover:underline underline-offset-2"
                    >
                      Köp på Systembolaget
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

      {/* Reviews */}
      <div className="mt-8">
        <h2 className="text-xl font-medium mb-4">Recensioner</h2>
        {visibleReviews.length === 0 ? (
          <div className="text-sm text-muted-foreground">Inga recensioner ännu.</div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {visibleReviews.map((r: any) => {
              const wset = r.wsetTasting || {}
              const appearance = wset.appearance || {}
              const nose = wset.nose || {}
              const palate = wset.palate || {}
              const conclusion = wset.conclusion || {}
              const reviewer = r.user && typeof r.user === 'object' ? r.user : null
              const isOwn = Boolean(
                user?.id && reviewer?.id && String(reviewer.id) === String(user.id),
              )
              const reviewerName = r.isTrusted
                ? 'Vinakademin'
                : isOwn
                  ? 'Du'
                  : reviewer
                    ? [reviewer.firstName, reviewer.lastName].filter(Boolean).join(' ') ||
                      reviewer.email ||
                      'Okänd'
                    : 'Okänd'
              return (
                <AccordionItem key={r.id} value={String(r.id)}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      {r.isTrusted ? <Badge variant="secondary">Verifierad</Badge> : null}
                      {isOwn && !r.isTrusted ? <Badge variant="outline">Du</Badge> : null}
                      <span className="font-medium">{reviewerName}</span>
                      <span className="text-muted-foreground">• {r.rating ?? '—'}/5</span>
                      <span className="text-muted-foreground">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString('sv-SE') : ''}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="rounded-md border p-4 text-sm">
                      {/* Section: Utseende */}
                      <div className="rounded-md border mb-3">
                        <div className="bg-secondary text-secondary-foreground px-3 py-2 text-xs font-medium uppercase tracking-wide">
                          Utseende
                        </div>
                        <div className="divide-y">
                          {[
                            ['Klarhet', appearance.clarity],
                            ['Intensitet', appearance.intensity],
                            ['Färg', appearance.color],
                          ].map(([label, val]) => (
                            <div
                              key={String(label)}
                              className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 md:px-4 md:py-3 even:bg-muted/40"
                            >
                              <div className="text-sm font-medium text-muted-foreground">
                                {label}
                              </div>
                              <div className="md:col-span-2 text-sm">{val || '—'}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Section: Doft */}
                      <div className="rounded-md border mb-3">
                        <div className="bg-secondary text-secondary-foreground px-3 py-2 text-xs font-medium uppercase tracking-wide">
                          Doft
                        </div>
                        <div className="divide-y">
                          {[
                            ['Intensitet', nose.intensity],
                            ['Primära aromer', (nose.primaryAromas || []).join(', ')],
                            ['Sekundära aromer', (nose.secondaryAromas || []).join(', ')],
                            ['Tertiära aromer', (nose.tertiaryAromas || []).join(', ')],
                          ].map(([label, val]) => (
                            <div
                              key={String(label)}
                              className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 md:px-4 md:py-3 even:bg-muted/40"
                            >
                              <div className="text-sm font-medium text-muted-foreground">
                                {label}
                              </div>
                              <div className="md:col-span-2 text-sm">{val || '—'}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Section: Smak */}
                      <div className="rounded-md border mb-3">
                        <div className="bg-secondary text-secondary-foreground px-3 py-2 text-xs font-medium uppercase tracking-wide">
                          Smak
                        </div>
                        <div className="divide-y">
                          {[
                            ['Sötma', palate.sweetness],
                            ['Syra', palate.acidity],
                            ['Tannin', palate.tannin],
                            ['Alkohol', palate.alcohol],
                            ['Fyllighet', palate.body],
                            ['Smakintensitet', palate.flavourIntensity],
                            ['Primära smaker', (palate.primaryFlavours || []).join(', ')],
                            ['Sekundära smaker', (palate.secondaryFlavours || []).join(', ')],
                            ['Tertiära smaker', (palate.tertiaryFlavours || []).join(', ')],
                            ['Eftersmak', palate.finish],
                          ].map(([label, val]) => (
                            <div
                              key={String(label)}
                              className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 md:px-4 md:py-3 even:bg-muted/40"
                            >
                              <div className="text-sm font-medium text-muted-foreground">
                                {label}
                              </div>
                              <div className="md:col-span-2 text-sm">{val || '—'}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Section: Slutsats */}
                      <div className="rounded-md border">
                        <div className="bg-secondary text-secondary-foreground px-3 py-2 text-xs font-medium uppercase tracking-wide">
                          Slutsats
                        </div>
                        <div className="divide-y">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 md:px-4 md:py-3">
                            <div className="text-sm font-medium text-muted-foreground">
                              Kvalitet
                            </div>
                            <div className="md:col-span-2 text-sm">{conclusion.quality || '—'}</div>
                          </div>
                          {r.reviewText?.root ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 md:px-4 md:py-3">
                              <div className="text-sm font-medium text-muted-foreground">
                                Noteringar
                              </div>
                              <div className="md:col-span-2 text-sm">
                                <RichTextRenderer content={r.reviewText} />
                              </div>
                            </div>
                          ) : null}
                          {conclusion.summary ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 md:px-4 md:py-3">
                              <div className="text-sm font-medium text-muted-foreground">
                                Sammanfattning
                              </div>
                              <div className="md:col-span-2 text-sm whitespace-pre-wrap">
                                {conclusion.summary}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        )}
      </div>

      {/* Vinprovningar referencing this wine */}
      {relatedVinprovningar.length > 0 ? (
        <div className="mt-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-300/10 border border-brand-300/30 mb-4">
              <Sparkles className="h-4 w-4 text-brand-400" />
              <span className="text-sm font-medium text-brand-400">Vinprovningar med detta vin</span>
            </div>
          </div>
          <div className="space-y-4">
            {relatedVinprovningar.map((v: any) => (
              <div
                key={v.id}
                className="bg-brand-gradient-tri group rounded-2xl p-0.5 shadow-brand-glow transition-shadow duration-500 hover:shadow-brand-glow-lg"
              >
                <div className="bg-card rounded-[14px] overflow-hidden">
                  <div className="flex flex-col sm:flex-row gap-0">
                    {v.featuredImage?.url ? (
                      <div className="relative h-48 sm:h-auto sm:w-56 flex-shrink-0">
                        <Image
                          src={v.featuredImage.url}
                          alt={v.title}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent sm:bg-gradient-to-r" />
                      </div>
                    ) : null}
                    <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          {v.level ? (
                            <Badge className="bg-brand-300/10 text-brand-400 border-brand-300/30">
                              {v.level === 'beginner'
                                ? 'Nybörjare'
                                : v.level === 'intermediate'
                                  ? 'Fortsättning'
                                  : 'Avancerad'}
                            </Badge>
                          ) : null}
                        </div>
                        <h3 className="text-xl sm:text-2xl font-medium text-foreground">
                          {v.title}
                        </h3>
                        {v.description ? (
                          <p className="text-muted-foreground leading-relaxed line-clamp-3">
                            {v.description}
                          </p>
                        ) : null}
                        {v.duration ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>{v.duration}h</span>
                          </div>
                        ) : null}
                      </div>
                      <div className="pt-2 border-t border-border flex items-center justify-between gap-4">
                        {Number(v.price) > 0 ? (
                          <span className="text-brand-gradient text-2xl font-bold">
                            {formatPrice(Number(v.price))}
                          </span>
                        ) : null}
                        <Link href={`/vinprovningar/${v.slug}`} className="btn-brand">
                          Läs mer
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Blog posts referencing this wine */}
      {blogPosts.length > 0 ? (
        <div className="mt-10">
          <h2 className="text-xl font-medium mb-4">Artiklar där vinet nämns</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {blogPosts.map((post: any) => (
              <BlogPostCard key={post.id} post={post} size="medium" showAuthor={true} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
