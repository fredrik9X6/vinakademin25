import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { VinlistanToolbar } from '@/components/vinlistan/VinlistanToolbar'
import { VinlistanPagination } from '@/components/vinlistan/VinlistanPagination'
import { WineImagePlaceholder } from '@/components/wine/WineImagePlaceholder'
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

  // Helper: classify wine type
  const classifyWine = (w: any): 'sparkling' | 'red' | 'white' | null => {
    const name: string = String(w?.name || '').toLowerCase()
    const regionName: string = String(w?.region?.name || '').toLowerCase()
    const winery: string = String(w?.winery || '').toLowerCase()
    const grapes: string[] = Array.isArray(w?.grapes)
      ? (w.grapes as any[]).map((g) => (typeof g === 'object' ? String(g.name) : String(g)))
      : []
    const gLower = grapes.map((g) => g.toLowerCase())

    const isSparkling =
      name.includes('brut') ||
      name.includes('cava') ||
      name.includes('prosecco') ||
      regionName.includes('champagne') ||
      winery.includes('prosecco')
    if (isSparkling) return 'sparkling'

    const redHints = [
      'pinot noir',
      'cabernet',
      'merlot',
      'syrah',
      'tempranillo',
      'nebbiolo',
      'sangiovese',
    ]
    const whiteHints = ['chardonnay', 'sauvignon', 'riesling', 'pinot gris', 'grüner', 'chenin']
    if (gLower.some((g) => redHints.some((h) => g.includes(h)))) return 'red'
    if (gLower.some((g) => whiteHints.some((h) => g.includes(h)))) return 'white'
    return null
  }

  // Filtering
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
      const t = classifyWine(w)
      if (!t || !filterTypes.includes(t)) return false
    }

    if (filterPriceMax != null) {
      const price = Number(w?.price) || 0
      if (!(price > 0 && price <= filterPriceMax)) return false
    }

    if (filterCountry) {
      const c = String(w?.country?.name || '').toLowerCase()
      if (!c.includes(filterCountry)) return false
    }

    if (filterRegion) {
      const rn = String(w?.region?.name || '').toLowerCase()
      if (!rn.includes(filterRegion)) return false
    }

    if (filterGrape) {
      const grapes: string[] = Array.isArray(w?.grapes)
        ? (w.grapes as any[]).map((g) => (typeof g === 'object' ? String(g.name) : String(g)))
        : []
      const hit = grapes.some((g) => String(g).toLowerCase().includes(filterGrape))
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

  return { items, total, page, pageCount }
}

function WineCard({ item }: { item: any }) {
  const wine = item?.wine || null
  const review = item?.review || null
  if (!wine) return null
  const href = `/vinlistan/${wine.slug || wine.id}`
  const formatPrice = (price: number) =>
    new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(price)

  const getWineType = (w: any): string | null => {
    const name: string = String(w?.name || '').toLowerCase()
    const region: string = String(w?.region?.name || '').toLowerCase()
    const winery: string = String(w?.winery || '').toLowerCase()
    const grapes: string[] = Array.isArray(w?.grapes)
      ? (w.grapes as any[]).map((g) => (typeof g === 'object' ? String(g.name) : String(g)))
      : []
    const gLower = grapes.map((g) => g.toLowerCase())
    const isSparkling =
      name.includes('brut') ||
      name.includes('cava') ||
      name.includes('prosecco') ||
      region.includes('champagne') ||
      winery.includes('prosecco')
    if (isSparkling) return 'Mousserande'
    const redHints = [
      'pinot noir',
      'cabernet',
      'merlot',
      'syrah',
      'tempranillo',
      'nebbiolo',
      'sangiovese',
    ]
    const whiteHints = ['chardonnay', 'sauvignon', 'riesling', 'pinot gris', 'grüner', 'chenin']
    if (gLower.some((g) => redHints.some((h) => g.includes(h)))) return 'Rött'
    if (gLower.some((g) => whiteHints.some((h) => g.includes(h)))) return 'Vitt'
    return null
  }
  const typeLabel = getWineType(wine)

  return (
    <Link href={href} className="block">
      <Card className="h-full hover:shadow-md transition-shadow">
        <CardHeader className="p-3">
          <div className="flex items-start justify-between mb-1">
            {typeLabel ? (
              <Badge variant="secondary" className="bg-muted text-muted-foreground font-normal">
                {typeLabel}
              </Badge>
            ) : (
              <span />
            )}
            <div className="text-sm font-medium text-brand-gradient">
              {Number(wine.price) ? formatPrice(Number(wine.price)) : ''}
            </div>
          </div>
          <CardTitle className="text-base font-medium line-clamp-2 break-words">
            {wine.name} {wine.vintage ? `· ${wine.vintage}` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="flex items-center gap-3">
            <div className="relative h-28 w-16 flex-shrink-0 rounded-md overflow-hidden bg-transparent">
              {wine.image?.url ? (
                <Image src={wine.image.url} alt={wine.name} fill className="object-contain" />
              ) : (
                <WineImagePlaceholder size="sm" />
              )}
            </div>
            <div className="min-w-0 text-sm">
              <div className="text-muted-foreground truncate">{wine.winery}</div>
              <div className="truncate">
                {wine.region?.name || ''}
                {wine.country?.name ? `, ${wine.country.name}` : ''}
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground truncate">
                  {Array.isArray(wine.grapes)
                    ? (wine.grapes as any[])
                        .slice(0, 2)
                        .map((g: any) => (typeof g === 'object' ? g.name : g))
                        .join(', ')
                    : ''}
                </span>
              </div>
              <div className="mt-1 text-xs">Betyg: {review?.rating ?? '-'}/5</div>
            </div>
          </div>
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
  const { items, total, page, pageCount } = await fetchWinesForVinlistan(sp || {})
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
        <VinlistanToolbar q={q} sort={sort} />
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
