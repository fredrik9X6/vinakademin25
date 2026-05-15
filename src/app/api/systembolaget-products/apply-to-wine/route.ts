import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('api-systembolaget-apply-to-wine')

/**
 * Maps Systembolaget's `categoryLevel2` strings to the `wines.type` enum.
 * Anything unmapped returns undefined so the admin can pick manually.
 */
const TYPE_MAP: Record<string, 'red' | 'white' | 'rose' | 'sparkling' | 'orange' | 'fortified' | 'dessert'> = {
  'Rött vin': 'red',
  'Vitt vin': 'white',
  'Rosévin': 'rose',
  'Mousserande vin': 'sparkling',
  Orangevin: 'orange',
  Starkvin: 'fortified',
  'Sött vin / dessertvin': 'dessert',
}

export interface ApplyToWineResult {
  name: string
  winery: string | null
  vintage: number | null
  nonVintage: boolean
  type: string | null
  price: number | null
  systembolagetUrl: string | null
  image: number | null
  country: number | null
  region: number | null
  grapes: number[]
  diagnostics: {
    countryName: string | null
    regionName: string | null
    grapeNames: string[]
    countryCreated: boolean
    regionCreated: boolean
    grapesCreated: string[]
    imageSource: 'reused' | 'downloaded' | 'skipped-no-url' | 'skipped-fetch-failed'
  }
}

/**
 * Look up a row by case-insensitive `name`. Creates a new row when not found.
 * Returns the id and a flag indicating whether it was created.
 */
async function upsertByName(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any,
  collection: 'countries' | 'regions' | 'grapes',
  name: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extraData: Record<string, unknown> = {},
): Promise<{ id: number; created: boolean }> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error(`upsertByName: empty name for ${collection}`)

  // Exact match attempt first (uses unique index)
  const exact = await payload.find({
    collection,
    where: { name: { equals: trimmed } },
    limit: 1,
    overrideAccess: true,
  })
  if (exact.totalDocs > 0) return { id: exact.docs[0].id as number, created: false }

  // Case-insensitive fallback
  const like = await payload.find({
    collection,
    where: { name: { like: trimmed } },
    limit: 5,
    overrideAccess: true,
  })
  const ci = like.docs.find(
    (d: { name?: string }) => (d.name ?? '').toLowerCase() === trimmed.toLowerCase(),
  )
  if (ci) return { id: ci.id as number, created: false }

  const created = await payload.create({
    collection,
    data: { name: trimmed, ...extraData },
    overrideAccess: true,
  })
  return { id: created.id as number, created: true }
}

export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  let body: { productNumber?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const productNumber = (body.productNumber || '').trim()
  if (!productNumber) {
    return NextResponse.json({ error: 'productNumber required' }, { status: 400 })
  }

  const payload = await getPayload({ config })

  const products = await payload.find({
    collection: 'systembolaget-products',
    where: { productNumber: { equals: productNumber } },
    limit: 1,
    overrideAccess: true,
  })
  if (products.totalDocs === 0) {
    return NextResponse.json({ error: `Product ${productNumber} not found` }, { status: 404 })
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p: any = products.docs[0]

  // Country
  let countryId: number | null = null
  let countryCreated = false
  if (p.country) {
    const r = await upsertByName(payload, 'countries', p.country)
    countryId = r.id
    countryCreated = r.created
  }

  // Region (requires country relationship — only attempt if country resolved)
  let regionId: number | null = null
  let regionCreated = false
  const regionName = (p.originLevel1 || p.originLevel2 || '').trim()
  if (regionName && countryId) {
    const r = await upsertByName(payload, 'regions', regionName, { country: countryId })
    regionId = r.id
    regionCreated = r.created
  }

  // Grapes
  const grapeIds: number[] = []
  const grapesCreated: string[] = []
  const grapeNames: string[] = []
  if (Array.isArray(p.grapes)) {
    for (const g of p.grapes) {
      const name = typeof g === 'string' ? g.trim() : ''
      if (!name) continue
      grapeNames.push(name)
      const r = await upsertByName(payload, 'grapes', name)
      grapeIds.push(r.id)
      if (r.created) grapesCreated.push(name)
    }
  }

  // Image — reuse the systembolaget-<productNumber>.png Media row if it exists
  // (the backfill script creates rows with this filename), otherwise download
  // the full-size PNG and create a new Media record.
  let imageId: number | null = null
  let imageSource: ApplyToWineResult['diagnostics']['imageSource'] = 'skipped-no-url'
  if (p.imageUrl) {
    const expectedFilename = `systembolaget-${productNumber}.png`
    const existing = await payload.find({
      collection: 'media',
      where: { filename: { equals: expectedFilename } },
      limit: 1,
      overrideAccess: true,
    })
    if (existing.totalDocs > 0) {
      imageId = existing.docs[0].id as number
      imageSource = 'reused'
    } else {
      const fullUrl = `${p.imageUrl}.png`
      try {
        const res = await fetch(fullUrl, {
          headers: {
            'User-Agent': 'vinakademin-systembolaget-apply (https://vinakademin.se)',
          },
        })
        if (!res.ok) {
          log.warn({ status: res.status, fullUrl }, 'image fetch failed')
          imageSource = 'skipped-fetch-failed'
        } else {
          const buffer = Buffer.from(await res.arrayBuffer())
          const created = await payload.create({
            collection: 'media',
            data: {
              alt: `${p.productNameBold || ''} ${p.productNameThin || ''}`.trim() || expectedFilename,
            },
            file: {
              data: buffer,
              mimetype: 'image/png',
              name: expectedFilename,
              size: buffer.byteLength,
            },
            overrideAccess: true,
          })
          imageId = created.id as number
          imageSource = 'downloaded'
        }
      } catch (err) {
        log.warn({ err: (err as Error).message, fullUrl }, 'image download error')
        imageSource = 'skipped-fetch-failed'
      }
    }
  }

  // Wine name — combine bold + thin for the full Systembolaget naming
  const fullName = [p.productNameBold, p.productNameThin].filter(Boolean).join(' ').trim()
  const wineType = p.categoryLevel2 ? TYPE_MAP[p.categoryLevel2] ?? null : null
  const vintage = typeof p.vintage === 'number' && Number.isFinite(p.vintage) ? p.vintage : null

  const result: ApplyToWineResult = {
    name: fullName || `Produkt ${productNumber}`,
    winery: p.producerName || null,
    vintage,
    nonVintage: vintage === null,
    type: wineType,
    price: typeof p.price === 'number' ? p.price : null,
    systembolagetUrl: p.productUrl || null,
    image: imageId,
    country: countryId,
    region: regionId,
    grapes: grapeIds,
    diagnostics: {
      countryName: p.country || null,
      regionName: regionName || null,
      grapeNames,
      countryCreated,
      regionCreated,
      grapesCreated,
      imageSource,
    },
  }

  return NextResponse.json(result)
}
