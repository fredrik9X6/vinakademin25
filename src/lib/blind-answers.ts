import type { Payload } from 'payload'
import type { BlindAnswer } from './blind-guess-scoring'
import type { PriceBucket } from './blind-guess-vocab'

/**
 * Server-side resolver: plan wine entries → pour-order → BlindAnswer map.
 *
 * Precedence per tier (identical to the guest reveal card): explicit host
 * override on the plan entry → joined library-wine data → customWine.priceSek
 * (price auto-derive only). Blends keep ALL grape names as acceptable answers
 * — scoreOne treats any of them as correct.
 *
 * The one thing this fixes over the old inline builders: callers load the
 * session at depth 2, which populates `wines[].libraryWine` but leaves its
 * `country` / `grapes` relations as bare id numbers. A `typeof x === 'object'`
 * check on those silently disabled country/grape scoring for every library
 * wine without explicit overrides. This resolver batch-fetches the referenced
 * names (one find per collection) so scoring works at ANY load depth.
 */

interface ParsedEntry {
  pour: number
  overrideCountry: string | null
  overrideGrapes: string[]
  overridePriceBucket: PriceBucket | null
  libCountryName: string | null
  libCountryId: number | null
  libGrapeNames: string[]
  libGrapeIds: number[]
  libPrice: number | null
  custPrice: number | null
}

function parseEntry(entry: unknown, idx: number): ParsedEntry {
  const w = entry as {
    pourOrder?: number | null
    libraryWine?:
      | number
      | {
          country?: { name?: string } | number | null
          grapes?: Array<{ name?: string } | number> | null
          price?: number | null
        }
      | null
    customWine?: { priceSek?: number | null } | null
    blindAnswerCountry?: string | null
    blindAnswerGrapes?: string[] | null
    blindAnswerPriceBucket?: PriceBucket | null
  }
  const lib = w.libraryWine && typeof w.libraryWine === 'object' ? w.libraryWine : null

  let libCountryName: string | null = null
  let libCountryId: number | null = null
  if (lib?.country != null) {
    if (typeof lib.country === 'object') {
      libCountryName = lib.country.name ?? null
    } else if (typeof lib.country === 'number') {
      libCountryId = lib.country
    }
  }

  const libGrapeNames: string[] = []
  const libGrapeIds: number[] = []
  for (const g of Array.isArray(lib?.grapes) ? lib.grapes : []) {
    if (g && typeof g === 'object') {
      if (typeof g.name === 'string' && g.name.trim()) libGrapeNames.push(g.name)
    } else if (typeof g === 'number') {
      libGrapeIds.push(g)
    }
  }

  return {
    pour: w.pourOrder ?? idx + 1,
    overrideCountry:
      typeof w.blindAnswerCountry === 'string' && w.blindAnswerCountry.trim().length > 0
        ? w.blindAnswerCountry
        : null,
    overrideGrapes: Array.isArray(w.blindAnswerGrapes)
      ? w.blindAnswerGrapes.filter((g) => typeof g === 'string' && g.trim().length > 0)
      : [],
    overridePriceBucket: w.blindAnswerPriceBucket ?? null,
    libCountryName,
    libCountryId,
    libGrapeNames,
    libGrapeIds,
    libPrice: typeof lib?.price === 'number' ? lib.price : null,
    custPrice: !lib && typeof w.customWine?.priceSek === 'number' ? w.customWine.priceSek : null,
  }
}

/** Batch-fetch id → name for a name-bearing collection. */
async function resolveNames(
  payload: Payload,
  collection: 'countries' | 'grapes',
  ids: ReadonlyArray<number>,
): Promise<Map<number, string>> {
  const out = new Map<number, string>()
  const unique = [...new Set(ids)]
  if (unique.length === 0) return out
  const res = await payload.find({
    collection,
    where: { id: { in: unique } },
    limit: unique.length,
    depth: 0,
    overrideAccess: true,
  })
  for (const doc of res.docs as Array<{ id: number; name?: string | null }>) {
    if (typeof doc.name === 'string' && doc.name.trim()) out.set(doc.id, doc.name)
  }
  return out
}

export async function buildBlindAnswersByPour(
  payload: Payload,
  wines: ReadonlyArray<unknown>,
): Promise<Map<number, BlindAnswer>> {
  const parsed = wines.map(parseEntry)

  // Only ids that can actually decide a tier need resolving (no override set).
  const countryIds = parsed
    .filter((p) => !p.overrideCountry && p.libCountryId != null)
    .map((p) => p.libCountryId as number)
  const grapeIds = parsed
    .filter((p) => p.overrideGrapes.length === 0)
    .flatMap((p) => p.libGrapeIds)

  const [countryNames, grapeNames] = await Promise.all([
    resolveNames(payload, 'countries', countryIds),
    resolveNames(payload, 'grapes', grapeIds),
  ])

  const out = new Map<number, BlindAnswer>()
  for (const p of parsed) {
    const libCountry =
      p.libCountryName ??
      (p.libCountryId != null ? (countryNames.get(p.libCountryId) ?? null) : null)
    const libGrapes = [
      ...p.libGrapeNames,
      ...p.libGrapeIds.map((id) => grapeNames.get(id)).filter((n): n is string => !!n),
    ]
    out.set(p.pour, {
      country: p.overrideCountry ?? libCountry,
      grapes: p.overrideGrapes.length > 0 ? p.overrideGrapes : libGrapes,
      priceBucket: p.overridePriceBucket,
      priceSek: p.libPrice ?? p.custPrice,
    })
  }
  return out
}
