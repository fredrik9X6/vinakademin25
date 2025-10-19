import Link from 'next/link'
import Image from 'next/image'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { VinlistanToolbar } from '@/components/vinlistan/VinlistanToolbar'
import { VinlistanPagination } from '@/components/vinlistan/VinlistanPagination'

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

async function fetchTrustedReviewsAndWines(params: SearchParams) {
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

  // Optional pre-filter by wines matching q (name, winery, grapes)
  let wineIds: number[] | null = null
  if (q) {
    const wines = await payload.find({
      collection: 'wines',
      where: {
        or: [{ name: { like: q } }, { winery: { like: q } }],
      },
      limit: 200, // cap prefilter to keep fast
    })
    wineIds = (wines.docs || []).map((w: any) => Number(w.id))
    if (wineIds.length === 0) {
      return { items: [], total: 0, page, pageCount: 0 }
    }
  }

  // Fetch trusted reviews with wine populated (depth-like via follow-up)
  const reviews = await payload.find({
    collection: 'reviews',
    where: {
      and: [{ isTrusted: { equals: true } }, ...(wineIds ? [{ wine: { in: wineIds } }] : [])],
    },
    limit: 500, // we will dedupe by wine, then paginate
    sort: '-createdAt',
    depth: 2 as any,
  } as any)

  // Dedupe by wine id, keep highest rating per wine
  const byWine = new Map<number, any>()
  for (const r of reviews.docs || []) {
    const wine = typeof r.wine === 'object' ? r.wine : null
    if (!wine) continue
    const wid = Number(wine.id)
    const prev = byWine.get(wid)
    if (!prev || (Number(r.rating) || 0) > (Number(prev.rating) || 0)) {
      byWine.set(wid, r)
    }
  }

  let items = Array.from(byWine.values())

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
  items = items.filter((r: any) => {
    const w = typeof r.wine === 'object' ? r.wine : null
    if (!w) return false

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
      const rating = Number(r.rating) || 0
      if (rating < filterRatingMin) return false
    }

    return true
  })

  // Sorting
  items.sort((a: any, b: any) => {
    const wa = typeof a.wine === 'object' ? a.wine : null
    const wb = typeof b.wine === 'object' ? b.wine : null
    const ra = Number(a.rating) || 0
    const rb = Number(b.rating) || 0
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

function WineCard({ review }: { review: any }) {
  const wine = typeof review.wine === 'object' ? review.wine : null
  if (!wine) return null
  const href = `/vinlistan/${wine.slug || wine.id}`
  const formatPrice = (price: number) =>
    new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(price)

  const getWineType = (w: any): { label: string; className: string } | null => {
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
    if (isSparkling)
      return {
        label: 'Mousserande',
        className: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
      }
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
    if (gLower.some((g) => redHints.some((h) => g.includes(h))))
      return {
        label: 'Rött',
        className: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
      }
    if (gLower.some((g) => whiteHints.some((h) => g.includes(h))))
      return {
        label: 'Vitt',
        className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      }
    return null
  }
  const typeBadge = getWineType(wine)

  return (
    <Link href={href} className="block">
      <Card className="h-full hover:shadow-md transition-shadow">
        <CardHeader className="p-3">
          <div className="flex items-start justify-between mb-1">
            {typeBadge ? (
              <Badge className={typeBadge.className}>{typeBadge.label}</Badge>
            ) : (
              <span />
            )}
            <div className="text-sm font-semibold text-primary">
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
              ) : null}
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
              <div className="mt-1 text-xs">Betyg: {review.rating ?? '-'}/5</div>
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
  const { items, total, page, pageCount } = await fetchTrustedReviewsAndWines(sp || {})
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
          {items.map((r: any) => (
            <WineCard key={String(typeof r.wine === 'object' ? r.wine.id : r.id)} review={r} />
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
