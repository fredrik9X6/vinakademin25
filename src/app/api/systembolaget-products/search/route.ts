import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'

export interface SystembolagetSearchHit {
  productNumber: string
  productNameBold: string | null
  productNameThin: string | null
  producerName: string | null
  vintage: number | null
  country: string | null
  categoryLevel1: string | null
  categoryLevel2: string | null
  price: number | null
  volume: number | null
  alcoholPercentage: number | null
  imageUrl: string | null
  productUrl: string | null
}

// In Systembolaget's taxonomy, categoryLevel1 buckets the whole catalog into:
// 'Vin' (15788), 'Sprit' (5808), 'Öl' (4904), 'Cider & blanddrycker' (493),
// 'Alkoholfritt' (212). Wine subtypes (red/white/rosé/sparkling) live in
// categoryLevel2 — exposed separately via the `subtype` query param.
const WINE_CATEGORY = 'Vin'

export async function GET(request: NextRequest) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').trim()
  if (q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  // Default = wine-only. Pass `?all=1` to include beer/spirits/cider/alcohol-free.
  // Pass `?subtype=Rött%20vin` to narrow to a specific categoryLevel2 (e.g.
  // "Rött vin", "Vitt vin", "Mousserande vin", "Rosévin").
  const includeAll = searchParams.get('all') === '1'
  const subtype = (searchParams.get('subtype') || '').trim()

  const payload = await getPayload({ config })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pool: { query: (text: string, params: unknown[]) => Promise<{ rows: any[] }> } = (
    payload.db as any
  ).pool

  // Trigram similarity match. `search_title` is the denormalized field we
  // index with pg_trgm in the migration; products are ranked by similarity to
  // the query.
  //
  // The `%` operator is the trigram-similarity filter (uses the GIN index).
  // similarity() returns the actual score for ranking.
  //
  // We accept matches against searchTitle OR productNameBold OR producerName
  // so a producer-only query (e.g. "Tariquet") still returns hits.
  const params: unknown[] = [q]
  let categoryFilter = ''
  if (!includeAll) {
    params.push(WINE_CATEGORY)
    categoryFilter += `AND category_level1 = $${params.length}`
  }
  if (subtype) {
    params.push(subtype)
    categoryFilter += ` AND category_level2 = $${params.length}`
  }

  const query = `
    SELECT
      product_number,
      product_name_bold,
      product_name_thin,
      producer_name,
      vintage,
      country,
      category_level1,
      category_level2,
      price,
      volume,
      alcohol_percentage,
      image_url,
      product_url,
      GREATEST(
        similarity(COALESCE(search_title, ''), $1),
        similarity(COALESCE(product_name_bold, ''), $1),
        similarity(COALESCE(producer_name, ''), $1)
      ) AS score
    FROM systembolaget_products
    WHERE (
      search_title % $1
      OR product_name_bold % $1
      OR producer_name % $1
    )
    ${categoryFilter}
    ORDER BY score DESC, product_name_bold ASC
    LIMIT 20;
  `

  const { rows } = await pool.query(query, params)

  const results: SystembolagetSearchHit[] = rows.map((r) => ({
    productNumber: r.product_number,
    productNameBold: r.product_name_bold,
    productNameThin: r.product_name_thin,
    producerName: r.producer_name,
    vintage: r.vintage != null ? Number(r.vintage) : null,
    country: r.country,
    categoryLevel1: r.category_level1,
    categoryLevel2: r.category_level2,
    price: r.price != null ? Number(r.price) : null,
    volume: r.volume != null ? Number(r.volume) : null,
    alcoholPercentage: r.alcohol_percentage != null ? Number(r.alcohol_percentage) : null,
    imageUrl: r.image_url,
    productUrl: r.product_url,
  }))

  return NextResponse.json({ results })
}
