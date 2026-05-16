import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { VinlistanToolbar } from '@/components/vinlistan/VinlistanToolbar'
import { VinlistanPagination } from '@/components/vinlistan/VinlistanPagination'
import { VinlistanWineCard } from '@/components/vinlistan/VinlistanWineCard'
import { getSiteURL } from '@/lib/site-url'
import { getWineDoc } from '@/lib/wines/get-wine-display'

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
  sort?:
    | 'rating-desc'
    | 'rating-asc'
    | 'price-asc'
    | 'price-desc'
    | 'newest'
    | 'name-asc'
    | 'name-desc'
  page?: string
  type?: string | string[] // support multi values
  priceMin?: string
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
  const filterPriceMin = Number(params.priceMin || '') || null
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
    const wine = getWineDoc(review?.wine)
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
    const w = getWineDoc(item.wine) as any
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
    const w = getWineDoc(item.wine) as any
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

    if (filterPriceMin != null || filterPriceMax != null) {
      const price = Number(w?.price) || 0
      if (filterPriceMin != null && price < filterPriceMin) return false
      if (filterPriceMax != null && !(price > 0 && price <= filterPriceMax)) return false
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
    const wa = getWineDoc(a.wine)
    const wb = getWineDoc(b.wine)
    const ra = Number(a.review?.rating) || 0
    const rb = Number(b.review?.rating) || 0
    const pa = Number(wa?.price) || 0
    const pb = Number(wb?.price) || 0
    if (sort === 'rating-desc') return rb - ra
    if (sort === 'rating-asc') return ra - rb
    if (sort === 'price-asc') return pa - pb
    if (sort === 'price-desc') return pb - pa
    if (sort === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    if (sort === 'name-asc')
      return String(wa?.name || '').localeCompare(String(wb?.name || ''), 'sv')
    if (sort === 'name-desc')
      return String(wb?.name || '').localeCompare(String(wa?.name || ''), 'sv')
    return rb - ra
  })

  const total = items.length
  const pageCount = Math.max(1, Math.ceil(total / limit))
  const start = (page - 1) * limit
  const end = start + limit
  items = items.slice(start, end)

  return { items, total, page, pageCount, countryOptions, regionOptions, grapeOptions }
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
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-base font-medium">Inga viner matchade dina filter.</p>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Prova att ta bort några filter, eller sök på producent / druva.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item: any) => (
            <VinlistanWineCard
              key={String(getWineDoc(item.wine)?.id ?? item.id)}
              wine={item.wine}
              review={item.review}
            />
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
