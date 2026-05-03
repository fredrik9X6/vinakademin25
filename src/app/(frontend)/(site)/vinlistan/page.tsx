import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Star } from 'lucide-react'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { VinlistanToolbar } from '@/components/vinlistan/VinlistanToolbar'
import { VinlistanPagination } from '@/components/vinlistan/VinlistanPagination'
import { WineImagePlaceholder } from '@/components/wine/WineImagePlaceholder'
import { cn } from '@/lib/utils'
import { getSiteURL } from '@/lib/site-url'

export const metadata: Metadata = {
  title: 'Vinlistan — hitta ditt nästa vin',
  description:
    'Bläddra bland viner recenserade och rekommenderade av Vinakademin. Sök på druva, region eller land och hitta ditt nästa vin — både vardagsviner och fynd.',
  alternates: { canonical: `${getSiteURL()}/vinlistan` },
  openGraph: {
    title: 'Vinlistan — hitta ditt nästa vin | Vinakademin',
    description:
      'Bläddra bland viner recenserade och rekommenderade av Vinakademin. Sök på druva, region eller land.',
    url: `${getSiteURL()}/vinlistan`,
    type: 'website',
  },
}

type SearchParams = {
  q?: string
  sort?: 'rating-desc' | 'rating-asc' | 'price-asc' | 'price-desc' | 'newest'
  page?: string
  type?: string | string[] // support multi values
  priceMax?: string
  country?: string
  region?: string
  grape?: string
  ratingMin?: string
}

async function fetchWinesForVinlistan(params: SearchParams) {
  const payload = await getPayload({ config })

  const limit = 24
  const page = Math.max(1, Number(params.page || '1'))
  const sort = params.sort || 'rating-desc'
  const q = (params.q || '').trim()
  const filterTypes: string[] = Array.isArray(params.type)
    ? (params.type as string[]).map((t) => String(t).toLowerCase())
    : (params.type || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => t.toLowerCase())
  const filterPriceMax = Number(params.priceMax || '') || null
  const filterCountry = (params.country || '').trim().toLowerCase()
  const filterRegion = (params.region || '').trim().toLowerCase()
  const filterGrape = (params.grape || '').trim().toLowerCase()
  const filterRatingMin = Number(params.ratingMin || '') || null

  // Fetch all wines (vinlistan should contain the full wine collection)
  const winesRes = await payload.find({
    collection: 'wines',
    depth: 2 as any,
    limit: 2000,
  } as any)
  const wines = winesRes.docs || []

  if (wines.length === 0) {
    return { items: [], total: 0, page, pageCount: 0 }
  }

  // Fetch trusted reviews and map highest rating per wine
  const reviews = await payload.find({
    collection: 'reviews',
    where: {
      and: [{ isTrusted: { equals: true } }],
    },
    limit: 500, // we will dedupe by wine, then paginate
    sort: '-createdAt',
    depth: 2 as any,
  } as any)

  const trustedReviewByWine = new Map<number, any>()
  for (const reviewDoc of reviews.docs || []) {
    const review = reviewDoc as any
    const wine = typeof review?.wine === 'object' ? review.wine : null
    if (!wine) continue
    const wid = Number((wine as any).id)
    const prev = trustedReviewByWine.get(wid)
    if (!prev || (Number(review.rating) || 0) > (Number(prev.rating) || 0)) {
      trustedReviewByWine.set(wid, review)
    }
  }

  let items = wines.map((wine: any) => ({
    wine,
    review: trustedReviewByWine.get(Number(wine.id)) || null,
  }))

  // Build distinct filter dimensions from the wines actually present
  const countrySet = new Set<string>()
  const regionSet = new Set<string>()
  const grapeSet = new Set<string>()
  for (const item of items) {
    const w: any = item.wine
    if (w?.country?.name) countrySet.add(String(w.country.name))
    if (w?.region?.name) regionSet.add(String(w.region.name))
    if (Array.isArray(w?.grapes)) {
      for (const g of w.grapes) {
        const name = typeof g === 'object' ? g?.name : g
        if (name) grapeSet.add(String(name))
      }
    }
  }
  const countryOptions = [...countrySet].sort((a, b) => a.localeCompare(b, 'sv'))
  const regionOptions = [...regionSet].sort((a, b) => a.localeCompare(b, 'sv'))
  const grapeOptions = [...grapeSet].sort((a, b) => a.localeCompare(b, 'sv'))

  // Filtering — uses authoritative wine.type field and exact-match country/region/grape
  items = items.filter((item: any) => {
    const w = item.wine
    if (!w) return false

    if (q) {
      const name = String(w?.name || '').toLowerCase()
      const winery = String(w?.winery || '').toLowerCase()
      const grapes: string[] = Array.isArray(w?.grapes)
        ? (w.grapes as any[]).map((g) => (typeof g === 'object' ? String(g.name) : String(g)))
        : []
      const hit =
        name.includes(q.toLowerCase()) ||
        winery.includes(q.toLowerCase()) ||
        grapes.some((g) => String(g).toLowerCase().includes(q.toLowerCase()))
      if (!hit) return false
    }

    if (filterTypes.length > 0) {
      if (!w?.type || !filterTypes.includes(String(w.type))) return false
    }

    if (filterPriceMax != null) {
      const price = Number(w?.price) || 0
      if (!(price > 0 && price <= filterPriceMax)) return false
    }

    if (filterCountry) {
      const c = String(w?.country?.name || '').toLowerCase()
      if (c !== filterCountry) return false
    }

    if (filterRegion) {
      const rn = String(w?.region?.name || '').toLowerCase()
      if (rn !== filterRegion) return false
    }

    if (filterGrape) {
      const grapes: string[] = Array.isArray(w?.grapes)
        ? (w.grapes as any[]).map((g) => (typeof g === 'object' ? String(g.name) : String(g)))
        : []
      const hit = grapes.some((g) => String(g).toLowerCase() === filterGrape)
      if (!hit) return false
    }

    if (filterRatingMin != null) {
      const rating = Number(item.review?.rating) || 0
      if (rating < filterRatingMin) return false
    }

    return true
  })

  // Sorting
  items.sort((a: any, b: any) => {
    const wa = a.wine || null
    const wb = b.wine || null
    const ra = Number(a.review?.rating) || 0
    const rb = Number(b.review?.rating) || 0
    const pa = Number(wa?.price) || 0
    const pb = Number(wb?.price) || 0
    if (sort === 'rating-desc') return rb - ra
    if (sort === 'rating-asc') return ra - rb
    if (sort === 'price-asc') return pa - pb
    if (sort === 'price-desc') return pb - pa
    if (sort === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    return rb - ra
  })

  const total = items.length
  const pageCount = Math.max(1, Math.ceil(total / limit))
  const start = (page - 1) * limit
  const end = start + limit
  items = items.slice(start, end)

  return { items, total, page, pageCount, countryOptions, regionOptions, grapeOptions }
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

function StarsRow({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} av ${max} stjärnor`}>
      {Array.from({ length: max }, (_, i) => {
        const filled = i < value
        return (
          <Star
            key={i}
            className={cn(
              'h-3.5 w-3.5',
              filled ? 'fill-brand-400 text-brand-400' : 'fill-transparent text-muted-foreground/30',
            )}
            strokeWidth={filled ? 0 : 1.5}
            aria-hidden
          />
        )
      })}
    </div>
  )
}

function WineCard({ item }: { item: any }) {
  const wine = item?.wine || null
  const review = item?.review || null
  if (!wine) return null
  const href = `/vinlistan/${wine.slug || wine.id}`
  const formatPrice = (price: number) =>
    new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(price)

  const typeLabel = wine.type ? TYPE_LABEL[String(wine.type)] || null : null
  const reviewerName: string | null =
    (review?.authorDisplayName as string) ||
    (typeof review?.user === 'object' && review?.user
      ? [review.user.firstName, review.user.lastName].filter(Boolean).join(' ').trim() || null
      : null)
  const grapeNames: string[] = Array.isArray(wine.grapes)
    ? (wine.grapes as any[]).map((g: any) => (typeof g === 'object' ? g?.name : g)).filter(Boolean)
    : []

  return (
    <Link href={href} className="group block">
      <Card className="h-full overflow-hidden border-border/60 transition-all duration-200 group-hover:border-brand-400/40 group-hover:shadow-lg">
        {/* Bottle image — full width at top */}
        <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-muted/40 to-muted/10">
          {wine.image?.url ? (
            <Image
              src={wine.image.url}
              alt={wine.name}
              fill
              className="object-contain p-4 transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <WineImagePlaceholder size="md" />
          )}
          {Number(wine.price) ? (
            <div className="absolute right-2 top-2 rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold text-foreground backdrop-blur-sm shadow-sm">
              {formatPrice(Number(wine.price))}
            </div>
          ) : null}
        </div>

        <CardContent className="space-y-2 p-4">
          {/* Type + vintage */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {typeLabel ? (
              <Badge
                variant="outline"
                className="border-brand-300/40 bg-brand-300/10 px-2 py-0 text-[10px] font-semibold uppercase tracking-wide text-brand-400"
              >
                {typeLabel}
              </Badge>
            ) : null}
            {wine.vintage ? <span>· {wine.vintage}</span> : null}
          </div>

          {/* Wine name */}
          <h3 className="text-base font-medium leading-tight line-clamp-2 break-words text-foreground group-hover:text-brand-400 transition-colors">
            {wine.name}
          </h3>

          {/* Winery */}
          {wine.winery ? (
            <p className="text-xs text-muted-foreground truncate">{wine.winery}</p>
          ) : null}

          {/* Region · Country */}
          {(wine.region?.name || wine.country?.name) && (
            <p className="text-xs text-muted-foreground truncate">
              {[wine.region?.name, wine.country?.name].filter(Boolean).join(' · ')}
            </p>
          )}

          {/* Grapes */}
          {grapeNames.length ? (
            <p className="text-xs text-muted-foreground/80 truncate">
              {grapeNames.slice(0, 3).join(', ')}
            </p>
          ) : null}

          {/* Rating + reviewer attribution */}
          {review?.rating ? (
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
              <StarsRow value={Number(review.rating)} />
              {reviewerName ? (
                <span className="text-[11px] text-muted-foreground truncate">av {reviewerName}</span>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  )
}

export default async function VinlistanPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const { items, page, pageCount, countryOptions, regionOptions, grapeOptions } =
    await fetchWinesForVinlistan(sp || {})
  const q = sp?.q || ''
  const sort = sp?.sort || 'rating-desc'

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-medium mb-4 text-foreground">Vinlistan</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Sök och filtrera bland våra granskade viner.
        </p>
      </div>

      {/* Toolbar */}
      <div className="mb-8">
        <VinlistanToolbar
          q={q}
          sort={sort}
          countryOptions={countryOptions}
          regionOptions={regionOptions}
          grapeOptions={grapeOptions}
        />
      </div>

      {/* Gallery */}
      {items.length === 0 ? (
        <div className="rounded-lg border p-8 text-sm text-muted-foreground">
          Inga viner matchade din sökning.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item: any) => (
            <WineCard key={String(item.wine?.id || item.id)} item={item} />
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="mt-12">
        <VinlistanPagination page={page} pageCount={pageCount} />
      </div>
    </div>
  )
}
