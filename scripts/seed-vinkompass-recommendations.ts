/**
 * Seed `recommendedWines` on each vinkompass-archetype, drawn from the
 * Wines collection (i.e. what powers /vinlistan), using the Body × Comfort
 * heuristic.
 *
 * Dry-run by default — prints the proposed bottle list per archetype.
 * Pass `--apply` to write to the DB.
 *
 *   pnpm tsx --env-file=.env scripts/seed-vinkompass-recommendations.ts
 *   pnpm tsx --env-file=.env scripts/seed-vinkompass-recommendations.ts --apply
 *
 * Heuristic — only the *category fit* is automatic; the editor still has
 * the last word in admin. We:
 *   1. Bucket every library wine by archetype score (body × comfort).
 *   2. Within each archetype, prefer highest-rated wines (mean review
 *      rating; falls back to 0 if no reviews).
 *   3. Cap at 6 per archetype. No wine is picked into two archetypes —
 *      we pick the archetype with the strongest body+comfort match for
 *      each wine first, then take the top 6 within each bucket.
 *   4. Prefer a price spread within each bucket: at least one ≤200 kr
 *      slot, otherwise top-rated wins.
 *
 * Output: prints proposed picks + writes when --apply.
 */

import { getPayload } from 'payload'
import config from '../src/payload.config'
import type { Wine, VinkompassArchetype, Review } from '../src/payload-types'

type Body = 'light' | 'bold'
type Comfort = 'classic' | 'adventurous'
type ArchetypeKey = `${Body}-${Comfort}`

const ALL_KEYS: ArchetypeKey[] = [
  'light-classic',
  'light-adventurous',
  'bold-classic',
  'bold-adventurous',
]

// ─────────────────────────────────────────────────────────────────────────────
// Body classification by wine.type
// ─────────────────────────────────────────────────────────────────────────────

const LIGHT_TYPES = new Set(['sparkling', 'rose', 'white'])
const BOLD_TYPES = new Set(['red', 'orange', 'fortified'])
// dessert is body-ambiguous; we route it to fortified-adjacent (bold) by default.

function classifyBody(wineType: string | null | undefined): Body | null {
  if (!wineType) return null
  if (LIGHT_TYPES.has(wineType)) return 'light'
  if (BOLD_TYPES.has(wineType) || wineType === 'dessert') return 'bold'
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Comfort classification — country + grape "well-known-ness"
// ─────────────────────────────────────────────────────────────────────────────

// Countries that anchor the "classic / safe" end of the comfort axis.
const CLASSIC_COUNTRIES = new Set([
  'Frankrike',
  'Italien',
  'Spanien',
  'Tyskland',
  'Portugal',
  'USA',
])

// "Adventurous" countries — less mainstream for the Swedish wine consumer.
const ADVENTUROUS_COUNTRIES = new Set([
  'Grekland',
  'Österrike',
  'Ungern',
  'Slovenien',
  'Sydafrika',
  'Chile',
  'Argentina',
  'Australien',
  'Georgien',
  'Kroatien',
  'Libanon',
  'Sverige',
  'Slovakien',
  'Tjeckien',
])

// Mainstream grapes that signal "klassisk" within a country.
const CLASSIC_GRAPES = new Set(
  [
    'Cabernet Sauvignon',
    'Merlot',
    'Pinot Noir',
    'Chardonnay',
    'Sauvignon Blanc',
    'Riesling',
    'Sangiovese',
    'Nebbiolo',
    'Tempranillo',
    'Pinot Grigio',
    'Pinot Gris',
    'Syrah',
    'Shiraz',
    'Grenache',
    'Garnacha',
    'Gamay',
  ].map((s) => s.toLowerCase()),
)

// Off-beat grapes that pull a wine toward "adventurous" regardless of country.
const ADVENTUROUS_GRAPES = new Set(
  [
    'Assyrtiko',
    'Grüner Veltliner',
    'Gruner Veltliner',
    'Furmint',
    'Pinotage',
    'Carménère',
    'Carmenere',
    'Bobal',
    'Mencía',
    'Mencia',
    'Xinomavro',
    'Touriga Nacional',
    'Touriga Franca',
    'Aglianico',
    'Trousseau',
    'Poulsard',
    'Schiava',
    'Vernaccia',
    'Verdejo',
    'Albariño',
    'Albarino',
    'Godello',
    'Vermentino',
    'Mondeuse',
    'Cabernet Franc',
    'Malbec',
    'Tannat',
    'Pais',
    'País',
  ].map((s) => s.toLowerCase()),
)

function classifyComfort(
  countryName: string | null,
  grapeNames: string[],
): { comfort: Comfort; strength: number } {
  let score = 0 // positive = classic, negative = adventurous

  if (countryName) {
    if (CLASSIC_COUNTRIES.has(countryName)) score += 2
    else if (ADVENTUROUS_COUNTRIES.has(countryName)) score -= 2
  }

  for (const g of grapeNames) {
    const lower = g.toLowerCase()
    if (CLASSIC_GRAPES.has(lower)) score += 1
    if (ADVENTUROUS_GRAPES.has(lower)) score -= 1
  }

  return {
    comfort: score >= 0 ? 'classic' : 'adventurous',
    strength: Math.abs(score),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Wine → archetype scoring
// ─────────────────────────────────────────────────────────────────────────────

interface WineWithMeta {
  id: number
  name: string
  type: string | null
  countryName: string | null
  grapeNames: string[]
  price: number | null
  meanRating: number
  archetype: ArchetypeKey | null
  fitStrength: number
}

function bucketWines(wines: Wine[], reviewsByWine: Map<number, number[]>): WineWithMeta[] {
  return wines.map((wine): WineWithMeta => {
    const type = (wine.type as string | null | undefined) ?? null
    const countryName =
      typeof wine.country === 'object' && wine.country
        ? (wine.country.name as string | null) ?? null
        : null
    const grapeNames =
      Array.isArray(wine.grapes)
        ? wine.grapes
            .map((g) =>
              typeof g === 'object' && g
                ? (g as { name?: string | null }).name ?? null
                : null,
            )
            .filter((n): n is string => !!n)
        : []
    const ratings = reviewsByWine.get(wine.id) || []
    const meanRating =
      ratings.length > 0 ? ratings.reduce((s, n) => s + n, 0) / ratings.length : 0

    const body = classifyBody(type)
    const { comfort, strength } = classifyComfort(countryName, grapeNames)

    return {
      id: wine.id,
      name: wine.name || `Vin #${wine.id}`,
      type,
      countryName,
      grapeNames,
      price: typeof wine.price === 'number' ? wine.price : null,
      meanRating,
      archetype: body ? (`${body}-${comfort}` as ArchetypeKey) : null,
      fitStrength: strength,
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Selection: top 6 per archetype with a tilt toward price spread
// ─────────────────────────────────────────────────────────────────────────────

// Diversity caps. Without these, an archetype can end up 6 bottles all the
// same type (e.g. all Champagne) or all the same grape (e.g. 3 Pinotages).
const MAX_PER_TYPE = 3
const MAX_PER_GRAPE = 2
const TARGET_PER_ARCHETYPE = 6

function pickForArchetype(
  candidates: WineWithMeta[],
  archetype: ArchetypeKey,
): WineWithMeta[] {
  const pool = candidates
    .filter((w) => w.archetype === archetype)
    .sort((a, b) => {
      if (b.fitStrength !== a.fitStrength) return b.fitStrength - a.fitStrength
      if (b.meanRating !== a.meanRating) return b.meanRating - a.meanRating
      return a.name.localeCompare(b.name, 'sv')
    })

  const picks: WineWithMeta[] = []
  const typeCounts = new Map<string, number>()
  const grapeCounts = new Map<string, number>()

  function passesDiversity(w: WineWithMeta): boolean {
    if (w.type && (typeCounts.get(w.type) ?? 0) >= MAX_PER_TYPE) return false
    // Use the first listed grape as "primary" for the cap.
    const primary = w.grapeNames[0]?.toLowerCase()
    if (primary && (grapeCounts.get(primary) ?? 0) >= MAX_PER_GRAPE) return false
    return true
  }

  function record(w: WineWithMeta) {
    if (w.type) typeCounts.set(w.type, (typeCounts.get(w.type) ?? 0) + 1)
    const primary = w.grapeNames[0]?.toLowerCase()
    if (primary) grapeCounts.set(primary, (grapeCounts.get(primary) ?? 0) + 1)
    picks.push(w)
  }

  // Seed slot 1 with the cheapest bottle that passes diversity (≤200 kr).
  // This anchors an affordable entry-level pick in every archetype.
  const cheapest = pool
    .filter((w) => w.price != null && w.price <= 200 && passesDiversity(w))
    .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))[0]
  if (cheapest) record(cheapest)

  // Fill remaining slots by walking the sorted pool with diversity caps.
  for (const w of pool) {
    if (picks.length >= TARGET_PER_ARCHETYPE) break
    if (picks.some((p) => p.id === w.id)) continue
    if (!passesDiversity(w)) continue
    record(w)
  }

  // If diversity caps left us short, relax them as a fallback so the bucket
  // still hits 6 — better to repeat a grape than ship 4 bottles.
  if (picks.length < TARGET_PER_ARCHETYPE) {
    for (const w of pool) {
      if (picks.length >= TARGET_PER_ARCHETYPE) break
      if (picks.some((p) => p.id === w.id)) continue
      record(w)
    }
  }

  return picks.slice(0, TARGET_PER_ARCHETYPE)
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply')

  console.log('→ Loading payload local API…')
  const payload = await getPayload({ config })

  console.log('→ Fetching wines + reviews + archetypes…')
  const [winesRes, reviewsRes, archetypesRes] = await Promise.all([
    payload.find({
      collection: 'wines',
      limit: 5000,
      depth: 1,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'reviews',
      where: { isTrusted: { equals: true } },
      limit: 5000,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'vinkompass-archetypes',
      limit: 10,
      depth: 0,
      overrideAccess: true,
    }),
  ])

  console.log(
    `   ${winesRes.docs.length} wines · ${reviewsRes.docs.length} trusted reviews · ${archetypesRes.docs.length} archetypes`,
  )

  // Build wineId → ratings[] map for mean rating.
  const reviewsByWine = new Map<number, number[]>()
  for (const r of reviewsRes.docs as Review[]) {
    const wineId =
      typeof r.wine === 'object' && r.wine
        ? (r.wine as { id: number }).id
        : typeof r.wine === 'number'
          ? r.wine
          : null
    if (wineId == null) continue
    const rating = typeof r.rating === 'number' ? r.rating : null
    if (rating == null) continue
    const arr = reviewsByWine.get(wineId) ?? []
    arr.push(rating)
    reviewsByWine.set(wineId, arr)
  }

  const candidates = bucketWines(winesRes.docs as Wine[], reviewsByWine)
  const unbucketed = candidates.filter((c) => c.archetype === null)
  if (unbucketed.length > 0) {
    console.log(`   (${unbucketed.length} wines couldn't be bucketed — likely missing wine.type)`)
  }

  // Pick per archetype.
  const picks = new Map<ArchetypeKey, WineWithMeta[]>()
  for (const key of ALL_KEYS) {
    picks.set(key, pickForArchetype(candidates, key))
  }

  // Pretty-print preview.
  console.log('')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  PROPOSED PICKS  ' + (apply ? '(applying)' : '(dry-run)'))
  console.log('═══════════════════════════════════════════════════════════════')
  for (const key of ALL_KEYS) {
    const list = picks.get(key)!
    console.log('')
    console.log(`▸ ${key}  (${list.length} bottles)`)
    if (list.length === 0) {
      console.log('   (no library wines match this archetype yet)')
      continue
    }
    for (const w of list) {
      const priceStr = w.price != null ? `${w.price} kr` : '— kr'
      const grapesStr = w.grapeNames.slice(0, 3).join('/') || '—'
      console.log(
        `   ${String(w.id).padStart(4)}  ${priceStr.padStart(7)}  ${(w.type ?? '—').padEnd(9)}  ${(w.countryName ?? '—').padEnd(12)}  ${grapesStr.padEnd(28)}  ${w.name}`,
      )
    }
  }
  console.log('')

  if (!apply) {
    console.log('Dry-run only. Re-run with --apply to write recommendedWines.')
    return
  }

  // Write to DB. Build archetypeKey → archetypeDoc.id map.
  const archetypeIdByKey = new Map<string, number>()
  for (const a of archetypesRes.docs as VinkompassArchetype[]) {
    if (a.key) archetypeIdByKey.set(a.key as string, a.id)
  }

  for (const key of ALL_KEYS) {
    const archetypeId = archetypeIdByKey.get(key)
    if (!archetypeId) {
      console.log(`  ✗ Archetype ${key} not found in DB — skipped.`)
      continue
    }
    const list = picks.get(key)!
    const wineIds = list.map((w) => w.id)
    try {
      await payload.update({
        collection: 'vinkompass-archetypes',
        id: archetypeId,
        data: { recommendedWines: wineIds },
        overrideAccess: true,
      })
      console.log(`  ✓ ${key}: wrote ${wineIds.length} wine refs`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown error'
      console.log(`  ✗ ${key}: ${msg}`)
    }
  }

  console.log('')
  console.log('Done.')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
