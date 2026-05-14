/**
 * Import the Systembolaget product catalog into the `systembolaget_products`
 * collection.
 *
 * Source (primary):   https://susbolaget.emrik.org/v1/products   (~73 MB JSON,
 *                     C4illin's hosted instance, updated daily 03:00 SE)
 * Source (fallback):  https://raw.githubusercontent.com/AlexGustafsson/systembolaget-api-data/main/data/assortment.json
 *                     (stale since 2025-11 — last-resort if the primary is down)
 *
 * Usage:
 *   pnpm import:systembolaget                    # dry-run, summary only
 *   pnpm import:systembolaget --execute          # actually upsert into the DB
 *   pnpm import:systembolaget --execute --limit=500   # cap rows for testing
 *
 * Idempotent: upserts on (product_number). Re-running produces no duplicates;
 * only `last_imported_at` and the field values advance.
 *
 * To target staging/prod, point DATABASE_URI at the Railway connection string
 * for the run, e.g. `DATABASE_URI=postgres://... pnpm import:systembolaget --execute`.
 */

import { getPayload } from 'payload'
import config from '../src/payload.config'

const PRIMARY_URL = 'https://susbolaget.emrik.org/v1/products'
const FALLBACK_URL =
  'https://raw.githubusercontent.com/AlexGustafsson/systembolaget-api-data/main/data/assortment.json'

const BATCH_SIZE = 500

type UpstreamProduct = Record<string, unknown>

interface FetchResult {
  products: UpstreamProduct[]
  source: 'primary' | 'fallback'
  sourceUrl: string
  fetchedAt: string
}

interface CliArgs {
  execute: boolean
  limit: number | null
  source: 'auto' | 'primary' | 'fallback'
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { execute: false, limit: null, source: 'auto' }
  for (const a of argv.slice(2)) {
    if (a === '--execute') args.execute = true
    else if (a.startsWith('--limit=')) args.limit = parseInt(a.slice('--limit='.length), 10)
    else if (a === '--primary') args.source = 'primary'
    else if (a === '--fallback') args.source = 'fallback'
    else if (a === '--help' || a === '-h') {
      console.log(
        'Usage: pnpm import:systembolaget [--execute] [--limit=N] [--primary|--fallback]',
      )
      process.exit(0)
    }
  }
  return args
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'vinakademin-systembolaget-import (https://vinakademin.se)',
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${url}`)
  }
  return res.json()
}

async function fetchUpstream(source: CliArgs['source']): Promise<FetchResult> {
  const tryPrimary = source === 'auto' || source === 'primary'
  const tryFallback = source === 'auto' || source === 'fallback'

  if (tryPrimary) {
    try {
      console.log(`Fetching ${PRIMARY_URL} …`)
      const data = await fetchJson(PRIMARY_URL)
      const products = normalizeUpstream(data)
      return {
        products,
        source: 'primary',
        sourceUrl: PRIMARY_URL,
        fetchedAt: new Date().toISOString(),
      }
    } catch (err) {
      console.warn(`Primary source failed: ${(err as Error).message}`)
      if (!tryFallback) throw err
    }
  }

  console.log(`Fetching fallback ${FALLBACK_URL} …`)
  const data = await fetchJson(FALLBACK_URL)
  const products = normalizeUpstream(data)
  return {
    products,
    source: 'fallback',
    sourceUrl: FALLBACK_URL,
    fetchedAt: new Date().toISOString(),
  }
}

/**
 * Both upstream sources return either a bare array OR an object with a
 * `products`/`items` array. Normalize to a flat array.
 */
function normalizeUpstream(data: unknown): UpstreamProduct[] {
  if (Array.isArray(data)) return data as UpstreamProduct[]
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    if (Array.isArray(obj.products)) return obj.products as UpstreamProduct[]
    if (Array.isArray(obj.items)) return obj.items as UpstreamProduct[]
    if (Array.isArray(obj.data)) return obj.data as UpstreamProduct[]
  }
  throw new Error('Unrecognized upstream shape — expected array or { products: [] }')
}

function asString(v: unknown): string | null {
  if (v == null || v === '') return null
  if (typeof v === 'string') return v.trim() || null
  return String(v)
}

function asNumber(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) ? n : null
}

function asBoolean(v: unknown): boolean {
  if (typeof v === 'boolean') return v
  if (v === 'true' || v === 1) return true
  return false
}

/**
 * Build the systembolaget.se product page URL.
 *
 * Pattern: https://www.systembolaget.se/produkt/{categoryLevel1-slug}/{productNameBold-slug}-{productNumber}/
 * If categoryLevel1 is missing we fall back to "viner".
 */
function buildProductUrl(p: UpstreamProduct): string | null {
  const number = asString(p.productNumber)
  if (!number) return null
  const slug = (s: string | null) =>
    (s ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  const cat = slug(asString(p.categoryLevel1)) || 'viner'
  const namePart = [asString(p.productNameBold), asString(p.productNameThin)]
    .filter(Boolean)
    .join(' ')
  const nameSlug = slug(namePart) || 'produkt'
  return `https://www.systembolaget.se/produkt/${cat}/${nameSlug}-${number}/`
}

/**
 * Image URL. Upstream's `images` is an array of objects with `imageUrl` (full)
 * or a `fileType`/`size` variant. We pick the first usable URL.
 */
function buildImageUrl(p: UpstreamProduct): string | null {
  const images = p.images
  if (!Array.isArray(images) || images.length === 0) return null
  for (const img of images) {
    if (typeof img === 'string' && img.startsWith('http')) return img
    if (img && typeof img === 'object') {
      const url = (img as Record<string, unknown>).imageUrl
      if (typeof url === 'string' && url) return url
    }
  }
  return null
}

function buildSearchTitle(p: UpstreamProduct): string {
  const parts = [
    asString(p.productNameBold),
    asString(p.productNameThin),
    asString(p.producerName),
  ].filter(Boolean)
  const vintage = asNumber(p.vintage)
  const head = parts.join(' ')
  const tail = [vintage ? `(${vintage})` : '', `— ${asString(p.productNumber) ?? '?'}`]
    .filter(Boolean)
    .join(' ')
  return [head, tail].filter(Boolean).join(' ')
}

interface MappedRow {
  product_number: string
  product_number_short: string | null
  product_name_bold: string | null
  product_name_thin: string | null
  producer_name: string | null
  supplier_name: string | null
  category: string | null
  category_level1: string | null
  category_level2: string | null
  category_level3: string | null
  category_level4: string | null
  custom_category_title: string | null
  country: string | null
  origin_level1: string | null
  origin_level2: string | null
  vintage: number | null
  alcohol_percentage: number | null
  volume: number | null
  volume_text: string | null
  bottle_text: string | null
  packaging_level1: string | null
  seal: string | null
  color: string | null
  taste: string | null
  usage: string | null
  price: number | null
  recycle_fee: number | null
  assortment: string | null
  assortment_text: string | null
  is_discontinued: boolean
  is_completely_out_of_stock: boolean
  is_temporary_out_of_stock: boolean
  is_news: boolean
  is_organic: boolean
  is_kosher: boolean
  is_ethical: boolean
  ethical_label: string | null
  is_sustainable_choice: boolean
  is_climate_smart_packaging: boolean
  image_url: string | null
  product_url: string | null
  search_title: string
  grapes: unknown
  raw: unknown
  last_imported_at: Date
  source_commit_sha: string | null
}

function mapProduct(
  p: UpstreamProduct,
  importedAt: Date,
  sourceTag: string | null,
): MappedRow | null {
  const productNumber = asString(p.productNumber)
  if (!productNumber) return null // skip rows without a stable ID
  const grapes = Array.isArray(p.grapes) ? p.grapes : null
  return {
    product_number: productNumber,
    product_number_short: asString(p.productNumberShort),
    product_name_bold: asString(p.productNameBold),
    product_name_thin: asString(p.productNameThin),
    producer_name: asString(p.producerName),
    supplier_name: asString(p.supplierName),
    category: asString(p.category),
    category_level1: asString(p.categoryLevel1),
    category_level2: asString(p.categoryLevel2),
    category_level3: asString(p.categoryLevel3),
    category_level4: asString(p.categoryLevel4),
    custom_category_title: asString(p.customCategoryTitle),
    country: asString(p.country),
    origin_level1: asString(p.originLevel1),
    origin_level2: asString(p.originLevel2),
    vintage: asNumber(p.vintage),
    alcohol_percentage: asNumber(p.alcoholPercentage),
    volume: asNumber(p.volume),
    volume_text: asString(p.volumeText),
    bottle_text: asString(p.bottleText),
    packaging_level1: asString(p.packagingLevel1),
    seal: asString(p.seal),
    color: asString(p.color),
    taste: asString(p.taste),
    usage: asString(p.usage),
    price: asNumber(p.price),
    recycle_fee: asNumber(p.recycleFee),
    assortment: asString(p.assortment),
    assortment_text: asString(p.assortmentText),
    is_discontinued: asBoolean(p.isDiscontinued),
    is_completely_out_of_stock: asBoolean(p.isCompletelyOutOfStock),
    is_temporary_out_of_stock: asBoolean(p.isTemporaryOutOfStock),
    is_news: asBoolean(p.isNews),
    is_organic: asBoolean(p.isOrganic),
    is_kosher: asBoolean(p.isKosher),
    is_ethical: asBoolean(p.isEthical),
    ethical_label: asString(p.ethicalLabel),
    is_sustainable_choice: asBoolean(p.isSustainableChoice),
    is_climate_smart_packaging: asBoolean(p.isClimateSmartPackaging),
    image_url: buildImageUrl(p),
    product_url: buildProductUrl(p),
    search_title: buildSearchTitle(p),
    grapes,
    raw: p,
    last_imported_at: importedAt,
    source_commit_sha: sourceTag,
  }
}

const COLUMNS: (keyof MappedRow)[] = [
  'product_number',
  'product_number_short',
  'product_name_bold',
  'product_name_thin',
  'producer_name',
  'supplier_name',
  'category',
  'category_level1',
  'category_level2',
  'category_level3',
  'category_level4',
  'custom_category_title',
  'country',
  'origin_level1',
  'origin_level2',
  'vintage',
  'alcohol_percentage',
  'volume',
  'volume_text',
  'bottle_text',
  'packaging_level1',
  'seal',
  'color',
  'taste',
  'usage',
  'price',
  'recycle_fee',
  'assortment',
  'assortment_text',
  'is_discontinued',
  'is_completely_out_of_stock',
  'is_temporary_out_of_stock',
  'is_news',
  'is_organic',
  'is_kosher',
  'is_ethical',
  'ethical_label',
  'is_sustainable_choice',
  'is_climate_smart_packaging',
  'image_url',
  'product_url',
  'search_title',
  'grapes',
  'raw',
  'last_imported_at',
  'source_commit_sha',
]

interface PgPool {
  query: (text: string, params: unknown[]) => Promise<{ rowCount: number | null }>
}

/**
 * Upsert a batch via a single parameterized INSERT … ON CONFLICT statement.
 * Postgres caps params at 65535, so BATCH_SIZE × COLUMNS.length must stay
 * comfortably under that (500 × 46 ≈ 23000 — safe).
 */
async function upsertBatch(pool: PgPool, rows: MappedRow[]): Promise<void> {
  if (rows.length === 0) return

  const placeholders: string[] = []
  const params: unknown[] = []
  let p = 1
  for (const row of rows) {
    const ph: string[] = []
    for (const col of COLUMNS) {
      let v: unknown = row[col]
      // jsonb columns: pass as JSON-stringified value
      if (col === 'raw' || col === 'grapes') {
        v = v == null ? null : JSON.stringify(v)
      }
      params.push(v)
      ph.push(`$${p++}`)
    }
    placeholders.push(`(${ph.join(',')})`)
  }

  const colList = COLUMNS.map((c) => `"${c}"`).join(',')
  const updateSet = COLUMNS.filter((c) => c !== 'product_number')
    .map((c) => `"${c}" = EXCLUDED."${c}"`)
    .join(',\n      ')

  const query = `
    INSERT INTO "systembolaget_products" (${colList})
    VALUES ${placeholders.join(',\n           ')}
    ON CONFLICT ("product_number") DO UPDATE SET
      ${updateSet};
  `

  await pool.query(query, params)
}

/**
 * Try to discover the source commit SHA (for the GitHub raw fallback path).
 * Returns null when the source is the C4illin endpoint (no per-fetch SHA).
 */
async function discoverSourceTag(source: 'primary' | 'fallback'): Promise<string | null> {
  if (source === 'primary') return `c4illin@${new Date().toISOString()}`
  try {
    const res = await fetch(
      'https://api.github.com/repos/AlexGustafsson/systembolaget-api-data/commits?path=data/assortment.json&per_page=1',
      { headers: { Accept: 'application/vnd.github+json' } },
    )
    if (!res.ok) return null
    const data = (await res.json()) as Array<{ sha?: string }>
    return data[0]?.sha ?? null
  } catch {
    return null
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv)
  console.log(
    `Mode: ${args.execute ? 'EXECUTE' : 'DRY-RUN'}${args.limit ? ` (limit=${args.limit})` : ''}`,
  )

  const fetched = await fetchUpstream(args.source)
  console.log(
    `Got ${fetched.products.length} products from ${fetched.source} (${fetched.sourceUrl})`,
  )

  // Schema-drift sniff: log the keys of the first record so we notice when
  // upstream adds/removes/renames fields.
  const sample = fetched.products[0] ?? {}
  console.log(`Sample keys (${Object.keys(sample).length}):`, Object.keys(sample).sort().join(', '))

  const importedAt = new Date()
  const sourceTag = await discoverSourceTag(fetched.source)
  console.log(`Source tag: ${sourceTag ?? '(none)'}`)

  const limit = args.limit ?? Number.POSITIVE_INFINITY
  const products = fetched.products.slice(0, Math.min(limit, fetched.products.length))

  const rows: MappedRow[] = []
  let skipped = 0
  for (const p of products) {
    const row = mapProduct(p, importedAt, sourceTag)
    if (row) rows.push(row)
    else skipped++
  }
  console.log(`Mapped: ${rows.length} (skipped ${skipped} without productNumber)`)

  if (!args.execute) {
    console.log('Dry run — no DB writes. Pass --execute to upsert.')
    console.log('First mapped row:', JSON.stringify(rows[0], null, 2).slice(0, 1200))
    return
  }

  const payload = await getPayload({ config })

  // The postgres adapter exposes the underlying `pg` Pool. We use it directly
  // for parameterized batch upserts — Payload's local API would be ~100× slower.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pool: PgPool = (payload.db as any).pool
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('payload.db.pool is not available — cannot run batch upsert')
  }

  console.log(`Upserting ${rows.length} rows in batches of ${BATCH_SIZE} …`)
  const t0 = Date.now()
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    await upsertBatch(pool, batch)
    const done = Math.min(i + BATCH_SIZE, rows.length)
    if (done % (BATCH_SIZE * 5) === 0 || done === rows.length) {
      console.log(`  ${done}/${rows.length} (${((done / rows.length) * 100).toFixed(1)}%)`)
    }
  }
  const dt = ((Date.now() - t0) / 1000).toFixed(1)
  console.log(`Done in ${dt}s.`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Import failed:', err)
    process.exit(1)
  })
