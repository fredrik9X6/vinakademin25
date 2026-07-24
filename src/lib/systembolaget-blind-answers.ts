import type { Payload } from 'payload'
import { normalizeAnswer } from './blind-guess-vocab'

/**
 * Auto-derive blind-tasting answers from the Systembolaget catalog.
 *
 * Wines picked from Systembolaget become customWine snapshots carrying only a
 * `systembolagetProductNumber` — no structured country/grape data — so blind
 * sessions could only offer the price guess unless the host typed the answers
 * by hand. The catalog (`systembolaget_products`, populated by
 * `pnpm import:systembolaget`) has both, keyed by product number.
 *
 * `fillBlindAnswersFromSystembolaget` fills ONLY empty answer fields — a
 * host-set value always wins. It is wired in as a beforeChange hook on
 * TastingPlans + TastingTemplates (every future save, regardless of route or
 * UI) and reused by the one-off backfill migration.
 *
 * Consequence worth knowing: for a Systembolaget wine, blanking an answer
 * field no longer disables that guess tier — the hook refills it from the
 * catalog on save. Hosts can still override with a different value.
 */

export interface CatalogAnswers {
  country: string | null
  grapes: string[]
}

interface FillableWineEntry {
  customWine?: { systembolagetProductNumber?: string | null } | null
  blindAnswerCountry?: string | null
  blindAnswerGrapes?: string[] | null
}

function productNumberOf(w: FillableWineEntry): string | null {
  const n = w?.customWine?.systembolagetProductNumber
  return typeof n === 'string' && n.trim().length > 0 ? n.trim() : null
}

function hasCountry(w: FillableWineEntry): boolean {
  return typeof w.blindAnswerCountry === 'string' && w.blindAnswerCountry.trim().length > 0
}

function hasGrapes(w: FillableWineEntry): boolean {
  return (
    Array.isArray(w.blindAnswerGrapes) &&
    w.blindAnswerGrapes.some((g) => typeof g === 'string' && g.trim().length > 0)
  )
}

function needsFill(w: FillableWineEntry): boolean {
  if (!productNumberOf(w)) return false
  return !hasCountry(w) || !hasGrapes(w)
}

/**
 * Map raw Systembolaget grape strings to canonical curated Grapes-collection
 * names where a case-insensitive match exists; unmatched strings pass through
 * as-is (same behaviour as the pickers' client-side pre-fill).
 */
export function canonicalizeGrapes(
  raw: ReadonlyArray<string>,
  curated: ReadonlyArray<string>,
): string[] {
  const canonicalByNorm = new Map<string, string>()
  for (const c of curated) canonicalByNorm.set(normalizeAnswer(c), c)
  return Array.from(
    new Set(
      raw
        .filter((g): g is string => typeof g === 'string')
        .map((g) => g.trim())
        .filter((g) => g.length > 0)
        .map((g) => canonicalByNorm.get(normalizeAnswer(g)) ?? g),
    ),
  )
}

/** Batch-fetch country + grapes for a set of product numbers. */
export async function fetchCatalogAnswers(
  payload: Payload,
  productNumbers: ReadonlyArray<string>,
): Promise<Map<string, CatalogAnswers>> {
  const out = new Map<string, CatalogAnswers>()
  const unique = [...new Set(productNumbers)].filter((n) => n.trim().length > 0)
  if (unique.length === 0) return out

  const pool = (payload.db as unknown as {
    pool?: { query: (text: string, params: unknown[]) => Promise<{ rows: unknown[] }> }
  }).pool
  if (!pool) return out

  const { rows } = await pool.query(
    `SELECT product_number, country, grapes
     FROM systembolaget_products
     WHERE product_number = ANY($1)`,
    [unique],
  )
  for (const row of rows as Array<{
    product_number: string
    country: string | null
    grapes: unknown
  }>) {
    out.set(row.product_number, {
      country: typeof row.country === 'string' && row.country.trim() ? row.country.trim() : null,
      // jsonb string array — pg returns it already parsed.
      grapes: Array.isArray(row.grapes)
        ? (row.grapes as unknown[]).filter((g): g is string => typeof g === 'string')
        : [],
    })
  }
  return out
}

async function fetchCuratedGrapeNames(payload: Payload): Promise<string[]> {
  const res = await payload.find({
    collection: 'grapes',
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  })
  return (res.docs as Array<{ name?: string | null }>)
    .map((d) => d.name)
    .filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
}

/**
 * Fill empty blindAnswerCountry / blindAnswerGrapes on Systembolaget-backed
 * wine entries. Returns the (possibly new) wines array and whether anything
 * changed. Never throws — a missing catalog table or query failure must not
 * block saving a plan/template.
 */
export async function fillBlindAnswersFromSystembolaget<T extends FillableWineEntry>(
  payload: Payload,
  wines: ReadonlyArray<T>,
): Promise<{ changed: boolean; wines: T[] }> {
  const asArray = [...wines]
  try {
    const targets = asArray.filter(needsFill)
    if (targets.length === 0) return { changed: false, wines: asArray }

    const catalog = await fetchCatalogAnswers(
      payload,
      targets.map((w) => productNumberOf(w) as string),
    )
    if (catalog.size === 0) return { changed: false, wines: asArray }

    const anyGrapesToFill = targets.some((w) => {
      const n = productNumberOf(w)
      return !hasGrapes(w) && n != null && (catalog.get(n)?.grapes.length ?? 0) > 0
    })
    const curated = anyGrapesToFill ? await fetchCuratedGrapeNames(payload) : []

    let changed = false
    const next = asArray.map((w) => {
      const n = productNumberOf(w)
      if (!n || !needsFill(w)) return w
      const hit = catalog.get(n)
      if (!hit) return w
      const fillCountry = !hasCountry(w) && hit.country != null
      const grapes = !hasGrapes(w) ? canonicalizeGrapes(hit.grapes, curated) : []
      const fillGrapes = grapes.length > 0
      if (!fillCountry && !fillGrapes) return w
      changed = true
      return {
        ...w,
        ...(fillCountry ? { blindAnswerCountry: hit.country } : {}),
        ...(fillGrapes ? { blindAnswerGrapes: grapes } : {}),
      }
    })
    return { changed, wines: next }
  } catch (err) {
    payload.logger?.warn?.(
      { err },
      'fillBlindAnswersFromSystembolaget failed — saving without auto-fill',
    )
    return { changed: false, wines: asArray }
  }
}
