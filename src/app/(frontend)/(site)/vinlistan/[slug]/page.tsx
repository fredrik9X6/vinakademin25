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
import {
  ExternalLink,
  Clock,
  ArrowRight,
  CalendarDays,
  Sparkles,
  ShoppingBag,
  BadgeCheck,
} from 'lucide-react'
import type { Metadata } from 'next'
import { BlogPostCard } from '@/components/blog'
import { getSiteURL } from '@/lib/site-url'
import { resolveSeo } from '@/lib/seo'
import { BreadcrumbJsonLd, WineProductJsonLd } from '@/components/seo/JsonLd'
import { WineImagePlaceholder } from '@/components/wine/WineImagePlaceholder'
import { WineTastingsLink } from '@/components/wine/WineTastingsLink'
import { VinlistanWineCard, StarsRow } from '@/components/vinlistan/VinlistanWineCard'
import { contentReferencesWine } from '@/lib/wine-references'
import { cn } from '@/lib/utils'

const SCALE_DEFS: Array<{
  key: 'sweetness' | 'acidity' | 'tannin' | 'alcohol' | 'body' | 'flavourIntensity'
  label: string
  steps: string[]
}> = [
  { key: 'sweetness', label: 'Sötma', steps: ['Torr', 'Halvtorr', 'Mellan', 'Söt'] },
  { key: 'acidity', label: 'Syra', steps: ['Låg', 'Mellan', 'Hög'] },
  { key: 'tannin', label: 'Tannin', steps: ['Låg', 'Mellan', 'Hög'] },
  { key: 'alcohol', label: 'Alkohol', steps: ['Låg', 'Mellan', 'Hög'] },
  { key: 'body', label: 'Fyllighet', steps: ['Lätt', 'Mellan', 'Fyllig'] },
  { key: 'flavourIntensity', label: 'Smakintensitet', steps: ['Låg', 'Medium', 'Uttalad'] },
]

function Scale({ label, value, steps }: { label: string; value?: string | null; steps: string[] }) {
  const idx = value ? steps.findIndex((s) => s.toLowerCase() === String(value).toLowerCase()) : -1
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="text-xs font-medium text-foreground">{value || '—'}</span>
      </div>
      <div className="relative flex h-3 items-center">
        <div className="absolute inset-x-0 h-1 rounded-full bg-muted" />
        {steps.map((_, i) => {
          const left = (i / (steps.length - 1)) * 100
          const isActive = i === idx
          const isPrev = idx > -1 && i < idx
          return (
            <div
              key={i}
              className={cn(
                'absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all',
                isActive
                  ? 'h-3 w-3 bg-brand-400 ring-2 ring-brand-300/40'
                  : isPrev
                    ? 'h-2 w-2 bg-brand-300/60'
                    : 'h-1.5 w-1.5 bg-muted-foreground/30',
              )}
              style={{ left: `${left}%` }}
            />
          )
        })}
      </div>
    </div>
  )
}

function AromaChips({ items, tone = 'neutral' }: { items?: string[] | null; tone?: 'neutral' | 'oak' | 'aging' }) {
  if (!items || !items.length) return null
  const toneClass =
    tone === 'oak'
      ? 'border-amber-300/40 bg-amber-100/40 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
      : tone === 'aging'
        ? 'border-stone-300/40 bg-stone-100/40 text-stone-900 dark:bg-stone-900/40 dark:text-stone-200'
        : 'border-brand-300/40 bg-brand-300/10 text-brand-400'
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((a, i) => (
        <span
          key={`${a}-${i}`}
          className={cn(
            'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
            toneClass,
          )}
        >
          {a}
        </span>
      ))}
    </div>
  )
}

function AromaSection({
  heading,
  primary,
  secondary,
  tertiary,
}: {
  heading: string
  primary?: string[] | null
  secondary?: string[] | null
  tertiary?: string[] | null
}) {
  if (!primary?.length && !secondary?.length && !tertiary?.length) return null
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {heading}
      </div>
      <div className="space-y-1.5">
        {primary?.length ? (
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1.5">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
              Primära
            </span>
            <AromaChips items={primary} tone="neutral" />
          </div>
        ) : null}
        {secondary?.length ? (
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1.5">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
              Sekundära
            </span>
            <AromaChips items={secondary} tone="oak" />
          </div>
        ) : null}
        {tertiary?.length ? (
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1.5">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
              Tertiära
            </span>
            <AromaChips items={tertiary} tone="aging" />
          </div>
        ) : null}
      </div>
    </div>
  )
}

const TYPE_LABEL: Record<string, string> = {
  red: 'Rött',
  white: 'Vitt',
  rose: 'Rosé',
  sparkling: 'Mousserande',
  orange: 'Orange',
  fortified: 'Starkvin',
  dessert: 'Dessert',
}

function reviewerDisplayName(review: any): string | null {
  if (!review) return null
  if (review.authorDisplayName) return String(review.authorDisplayName)
  const u = typeof review.user === 'object' ? review.user : null
  if (u) {
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim()
    return name || u.email || null
  }
  return null
}

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

  // Fetch related wines that share a grape OR the country with this one
  const grapeIds: number[] = Array.isArray(wine.grapes)
    ? (wine.grapes as any[])
        .map((g: any) => (typeof g === 'object' ? Number(g.id) : Number(g)))
        .filter(Boolean)
    : []
  const relatedRes =
    grapeIds.length > 0 || wine.country?.id
      ? await payload.find({
          collection: 'wines',
          where: {
            and: [
              { id: { not_equals: wine.id } },
              {
                or: [
                  ...(grapeIds.length > 0 ? [{ grapes: { in: grapeIds } }] : []),
                  ...(wine.country?.id ? [{ country: { equals: wine.country.id } }] : []),
                ],
              },
            ],
          },
          depth: 2 as any,
          limit: 30,
        } as any)
      : { docs: [] }
  // Rank: same grape > same country, prefer those with trusted reviews, cap at 6
  const candidateWines = (relatedRes.docs || []) as any[]
  const candidateIds = candidateWines.map((w: any) => Number(w.id)).filter(Boolean)
  const candidateReviewMap = new Map<number, any>()
  if (candidateIds.length > 0) {
    const reviewsRes = await payload.find({
      collection: 'reviews',
      where: {
        and: [{ isTrusted: { equals: true } }, { wine: { in: candidateIds } }],
      },
      depth: 1 as any,
      limit: 200,
      sort: '-rating',
    } as any)
    for (const r of (reviewsRes.docs || []) as any[]) {
      const wid = Number(typeof r.wine === 'object' ? r.wine?.id : r.wine)
      if (!wid) continue
      const prev = candidateReviewMap.get(wid)
      if (!prev || (Number(r.rating) || 0) > (Number(prev.rating) || 0)) {
        candidateReviewMap.set(wid, r)
      }
    }
  }
  const grapeIdSet = new Set(grapeIds)
  const scored = candidateWines.map((w: any) => {
    const wGrapeIds = Array.isArray(w.grapes)
      ? w.grapes.map((g: any) => Number(typeof g === 'object' ? g.id : g)).filter(Boolean)
      : []
    const sharesGrape = wGrapeIds.some((id: number) => grapeIdSet.has(id))
    const sharesCountry =
      wine.country?.id &&
      Number(typeof w.country === 'object' ? w.country?.id : w.country) === Number(wine.country.id)
    const review = candidateReviewMap.get(Number(w.id)) || null
    const score =
      (sharesGrape ? 100 : 0) + (sharesCountry ? 10 : 0) + (review ? Number(review.rating) || 0 : 0)
    return { wine: w, review, score }
  })
  scored.sort((a, b) => b.score - a.score)
  const relatedWines = scored.slice(0, 6)

  // Fetch vinprovningar that reference this wine via wine-reference or wine-list blocks
  const vinRes = await payload.find({
    collection: 'vinprovningar',
    where: { _status: { equals: 'published' } },
    depth: 2 as any,
    limit: 100,
  } as any)
  const relatedVinprovningar = (vinRes.docs || []).filter((v: any) =>
    contentReferencesWine(v.fullDescription, wine.id, wine.slug),
  )

  // Fetch blog posts where this wine is referenced in content blocks
  const postsRes = await payload.find({
    collection: 'blog-posts',
    where: { _status: { equals: 'published' } },
    sort: '-publishedDate',
    depth: 2 as any,
    limit: 100,
  } as any)
  const blogPosts = (postsRes.docs || []).filter((p: any) =>
    contentReferencesWine(p.content, wine.id, wine.slug),
  )

  // Public tasting plans that reference this wine (via wines[].libraryWine)
  const plansRes = await payload.find({
    collection: 'tasting-plans',
    where: {
      and: [
        { 'wines.libraryWine': { equals: wine.id } },
        { publishedToProfile: { equals: true } },
      ],
    } as any,
    limit: 10,
    depth: 1, // populate owner for handle
  })
  const publicPlans = (plansRes.docs as any[])
    .map((p) => {
      const owner = typeof p.owner === 'object' ? p.owner : null
      return {
        id: p.id,
        title: p.title,
        handle: owner?.handle ?? null,
      }
    })
    .filter((p): p is { id: number; title: string; handle: string } => !!p.handle)
  const tastingCount = plansRes.totalDocs

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

      <Card className="mb-8 overflow-hidden border-border/60">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row">
            {/* Wine bottle image — bigger, gradient backdrop, brand-tinted */}
            <div className="relative flex items-center justify-center bg-gradient-to-br from-brand-300/10 via-muted/40 to-muted/20 md:w-72 lg:w-80 flex-shrink-0 py-10 px-8">
              <div className="relative h-64 w-32 sm:h-80 sm:w-36 md:h-96 md:w-40">
                {wine.image?.url ? (
                  <Image
                    src={wine.image.url}
                    alt={wine.name}
                    fill
                    className="object-contain drop-shadow-md"
                    sizes="(max-width: 768px) 60vw, 320px"
                    priority
                  />
                ) : (
                  <WineImagePlaceholder size="lg" />
                )}
              </div>
              {wine.type && TYPE_LABEL[String(wine.type)] ? (
                <Badge
                  variant="outline"
                  className="absolute left-4 top-4 border-brand-300/40 bg-background/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-brand-400 backdrop-blur-sm"
                >
                  {TYPE_LABEL[String(wine.type)]}
                </Badge>
              ) : null}
            </div>

            {/* Main content */}
            <div className="flex-1 p-5 sm:p-6 md:p-8 flex flex-col gap-5 min-w-0">
              {/* Type chip + vintage */}
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                {wine.winery ? <span className="font-semibold">{wine.winery}</span> : null}
                {wine.vintage ? <span>· Årgång {wine.vintage}</span> : null}
              </div>

              {/* Wine name */}
              <h1 className="text-3xl sm:text-4xl font-medium leading-tight text-foreground break-words">
                {wine.name}
              </h1>

              {/* Region · Country (linked) */}
              {(wine.region?.name || wine.country?.name) && (
                <div className="text-sm text-muted-foreground">
                  {wine.region?.name && wine.region?.slug ? (
                    <Link
                      href={`/regioner/${wine.region.slug}`}
                      className="hover:text-brand-400 transition-colors underline-offset-2 hover:underline"
                    >
                      {wine.region.name}
                    </Link>
                  ) : (
                    wine.region?.name
                  )}
                  {wine.region?.name && wine.country?.name ? ', ' : null}
                  {wine.country?.name && wine.country?.slug ? (
                    <Link
                      href={`/lander/${wine.country.slug}`}
                      className="hover:text-brand-400 transition-colors underline-offset-2 hover:underline"
                    >
                      {wine.country.name}
                    </Link>
                  ) : (
                    wine.country?.name
                  )}
                </div>
              )}

              {/* Big star rating row + reviewer attribution + price */}
              {review?.rating || Number(wine.price) ? (
                <div className="flex flex-wrap items-center justify-between gap-4 border-y border-border/50 py-4">
                  {review?.rating ? (
                    <div className="flex items-center gap-3">
                      <StarsRow value={Number(review.rating)} max={5} />
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-semibold text-brand-400">{review.rating}</span>
                        <span className="text-sm text-muted-foreground">/ 5</span>
                      </div>
                      {reviewerDisplayName(review) ? (
                        <span className="text-sm text-muted-foreground">
                          · av {reviewerDisplayName(review)}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Ingen recension ännu</span>
                  )}
                  {Number(wine.price) ? (
                    <div className="text-2xl font-bold text-brand-gradient">
                      {formatPrice(Number(wine.price))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Vinakademins omdöme — pulled-up review summary */}
              {review?.wsetTasting?.conclusion?.summary ? (
                <div className="rounded-lg border border-brand-300/30 bg-brand-300/5 p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-brand-400 mb-1">
                    Vinakademins omdöme
                  </div>
                  <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">
                    {String(review.wsetTasting.conclusion.summary)
                      .split('\n\n— ')
                      .slice(0, 2)
                      .join(' — ')}
                  </p>
                </div>
              ) : null}

              {/* Systembolaget CTA — prominent */}
              {wine.systembolagetUrl && wine.systembolagetUrl.trim() ? (
                <div className="flex flex-wrap items-center gap-3">
                  <Button asChild size="lg" className="btn-brand">
                    <a
                      href={
                        wine.systembolagetUrl.startsWith('http')
                          ? wine.systembolagetUrl
                          : `https://${wine.systembolagetUrl}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      Köp på Systembolaget
                      <ExternalLink className="ml-2 h-3.5 w-3.5" />
                    </a>
                  </Button>
                </div>
              ) : null}

              {/* Public tasting plans cross-link */}
              <WineTastingsLink count={tastingCount} plans={publicPlans} />

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Druvor
                  </div>
                  <div className="text-sm font-medium">
                    {Array.isArray(wine.grapes) && (wine.grapes as any[]).length > 0
                      ? (wine.grapes as any[])
                          .map((g: any) => (typeof g === 'object' ? g.name : g))
                          .join(', ')
                      : '—'}
                  </div>
                </div>
                {wine.alcohol ? (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Alkohol
                    </div>
                    <div className="text-sm font-medium">{wine.alcohol}%</div>
                  </div>
                ) : null}
              </div>

              {/* Description (editor-curated long-form) */}
              {wine.description?.root ? (
                <div className="border-t border-border/50 pt-4">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Beskrivning
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <RichTextRenderer content={wine.description} />
                  </div>
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
          <Accordion type="single" collapsible className="w-full space-y-3">
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
              const reviewerInitial = reviewerName.trim().charAt(0).toUpperCase() || '?'
              return (
                <AccordionItem
                  key={r.id}
                  value={String(r.id)}
                  className="group/item overflow-hidden rounded-xl border border-border/60 bg-card transition-colors data-[state=open]:border-brand-300/40 hover:border-brand-300/40"
                >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline sm:px-5 sm:py-4">
                    <div className="flex w-full items-center gap-3 text-left">
                      {/* Avatar — BadgeCheck for trusted, initial otherwise */}
                      <div
                        className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                          r.isTrusted
                            ? 'bg-brand-300/15 text-brand-400'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {r.isTrusted ? (
                          <BadgeCheck className="h-5 w-5" />
                        ) : (
                          <span>{reviewerInitial}</span>
                        )}
                      </div>

                      {/* Name + meta */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">{reviewerName}</span>
                          {r.isTrusted ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-brand-300/30 bg-brand-300/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-400">
                              <BadgeCheck className="h-3 w-3" />
                              Verifierad
                            </span>
                          ) : null}
                          {isOwn && !r.isTrusted ? (
                            <span className="inline-flex items-center rounded-md border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              Du
                            </span>
                          ) : null}
                        </div>
                        {r.createdAt ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {new Date(r.createdAt).toLocaleDateString('sv-SE', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </span>
                        ) : null}
                      </div>

                      {/* Stars on right */}
                      {r.rating ? (
                        <div className="hidden shrink-0 sm:flex sm:items-center sm:gap-2">
                          <StarsRow value={Number(r.rating)} />
                          <span className="text-sm font-semibold text-brand-400">{r.rating}</span>
                          <span className="text-xs text-muted-foreground">/ 5</span>
                        </div>
                      ) : null}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {/* Mobile-only star row inside the open state (since trigger hides them <sm) */}
                    {r.rating ? (
                      <div className="mb-4 flex items-center gap-2 px-4 sm:hidden sm:px-5">
                        <StarsRow value={Number(r.rating)} />
                        <span className="text-sm font-semibold text-brand-400">{r.rating}</span>
                        <span className="text-xs text-muted-foreground">/ 5</span>
                      </div>
                    ) : null}
                    <div className="space-y-5 border-t border-border/40 px-4 py-5 sm:px-5">
                      {/* 1. Review prose — the headline content */}
                      {r.reviewText?.root ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <RichTextRenderer content={r.reviewText} />
                        </div>
                      ) : conclusion.summary ? (
                        <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                          {conclusion.summary}
                        </p>
                      ) : null}

                      {/* 2. Structural attributes — visual sliders */}
                      {SCALE_DEFS.some((d) => palate[d.key]) ? (
                        <div className="grid grid-cols-1 gap-x-6 gap-y-4 border-t border-border/40 pt-4 sm:grid-cols-2">
                          {SCALE_DEFS.map((d) =>
                            palate[d.key] ? (
                              <Scale
                                key={d.key}
                                label={d.label}
                                value={palate[d.key]}
                                steps={d.steps}
                              />
                            ) : null,
                          )}
                        </div>
                      ) : null}

                      {/* 3. Aromas + flavours — chips grouped by tier */}
                      <div className="grid grid-cols-1 gap-5 border-t border-border/40 pt-4 md:grid-cols-2">
                        <AromaSection
                          heading="Doft"
                          primary={nose.primaryAromas}
                          secondary={nose.secondaryAromas}
                          tertiary={nose.tertiaryAromas}
                        />
                        <AromaSection
                          heading="Smak"
                          primary={palate.primaryFlavours}
                          secondary={palate.secondaryFlavours}
                          tertiary={palate.tertiaryFlavours}
                        />
                      </div>

                      {/* 4. Color, finish, quality — small fact pills */}
                      {(appearance.color ||
                        appearance.intensity ||
                        appearance.clarity ||
                        palate.finish ||
                        conclusion.quality) && (
                        <div className="flex flex-wrap gap-2 border-t border-border/40 pt-4">
                          {appearance.color ? (
                            <Badge variant="outline" className="font-normal">
                              Färg: <span className="ml-1 font-medium">{appearance.color}</span>
                            </Badge>
                          ) : null}
                          {palate.finish ? (
                            <Badge variant="outline" className="font-normal">
                              Eftersmak: <span className="ml-1 font-medium">{palate.finish}</span>
                            </Badge>
                          ) : null}
                          {conclusion.quality ? (
                            <Badge variant="outline" className="font-normal">
                              Kvalitet: <span className="ml-1 font-medium">{conclusion.quality}</span>
                            </Badge>
                          ) : null}
                        </div>
                      )}

                      {/* 5. Disclosure: full WSET breakdown for the WSET-curious */}
                      <details className="group rounded-md border border-border/40 text-sm">
                        <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground">
                          Visa fullständig WSET-provning
                        </summary>
                        <div className="space-y-4 border-t border-border/40 p-3">
                          {/* Utseende */}
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                              Utseende
                            </div>
                            <dl className="grid grid-cols-3 gap-2 text-xs">
                              <dt className="text-muted-foreground">Klarhet</dt>
                              <dd className="col-span-2">{appearance.clarity || '—'}</dd>
                              <dt className="text-muted-foreground">Intensitet</dt>
                              <dd className="col-span-2">{appearance.intensity || '—'}</dd>
                              <dt className="text-muted-foreground">Färg</dt>
                              <dd className="col-span-2">{appearance.color || '—'}</dd>
                            </dl>
                          </div>
                          {/* Doft */}
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                              Doft
                            </div>
                            <dl className="grid grid-cols-3 gap-2 text-xs">
                              <dt className="text-muted-foreground">Intensitet</dt>
                              <dd className="col-span-2">{nose.intensity || '—'}</dd>
                            </dl>
                          </div>
                          {/* Smak */}
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                              Smak — strukturella egenskaper
                            </div>
                            <dl className="grid grid-cols-3 gap-2 text-xs">
                              <dt className="text-muted-foreground">Sötma</dt>
                              <dd className="col-span-2">{palate.sweetness || '—'}</dd>
                              <dt className="text-muted-foreground">Syra</dt>
                              <dd className="col-span-2">{palate.acidity || '—'}</dd>
                              <dt className="text-muted-foreground">Tannin</dt>
                              <dd className="col-span-2">{palate.tannin || '—'}</dd>
                              <dt className="text-muted-foreground">Alkohol</dt>
                              <dd className="col-span-2">{palate.alcohol || '—'}</dd>
                              <dt className="text-muted-foreground">Fyllighet</dt>
                              <dd className="col-span-2">{palate.body || '—'}</dd>
                              <dt className="text-muted-foreground">Smakintensitet</dt>
                              <dd className="col-span-2">{palate.flavourIntensity || '—'}</dd>
                              <dt className="text-muted-foreground">Eftersmak</dt>
                              <dd className="col-span-2">{palate.finish || '—'}</dd>
                            </dl>
                          </div>
                          {/* Slutsats */}
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                              Slutsats
                            </div>
                            <dl className="grid grid-cols-3 gap-2 text-xs">
                              <dt className="text-muted-foreground">Kvalitet</dt>
                              <dd className="col-span-2">{conclusion.quality || '—'}</dd>
                              {conclusion.summary ? (
                                <>
                                  <dt className="text-muted-foreground">Sammanfattning</dt>
                                  <dd className="col-span-2 whitespace-pre-line">
                                    {conclusion.summary}
                                  </dd>
                                </>
                              ) : null}
                            </dl>
                          </div>
                        </div>
                      </details>
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

      {/* Liknande viner — same grape or country */}
      {relatedWines.length > 0 ? (
        <div className="mt-12">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="text-xl font-medium">Liknande viner</h2>
            <Link
              href="/vinlistan"
              className="text-sm text-muted-foreground hover:text-brand-400 hover:underline underline-offset-2"
            >
              Se hela vinlistan →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
            {relatedWines.map(({ wine: rw, review: rwReview }: any) => (
              <VinlistanWineCard key={rw.id} wine={rw} review={rwReview} />
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
