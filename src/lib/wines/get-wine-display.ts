import type { Wine } from '@/payload-types'

/**
 * A wine reference that may be either:
 *   - a populated `Wines` document (depth ≥ 1),
 *   - a numeric `wines` id (depth = 0),
 *   - null/undefined when the parent has a `customWine` snapshot instead.
 */
export type WineRef = Wine | number | null | undefined

/**
 * A custom-wine snapshot stored on UserWines/Reviews/TastingPlans-wines when
 * the wine isn't in the library. All fields are independently optional.
 */
export interface CustomWine {
  name?: string | null
  producer?: string | null
  vintage?: string | null
  type?: string | null
  systembolagetUrl?: string | null
  priceSek?: number | null
}

/** Narrow a WineRef to a populated Wine, or null. */
export function getWineDoc(ref: WineRef): Wine | null {
  if (ref && typeof ref === 'object') return ref
  return null
}

/**
 * Display title for a wine, falling back to the customWine snapshot when
 * the library wine isn't set. Returns a non-empty string or null.
 */
export function getWineTitle(
  ref: WineRef,
  custom?: CustomWine | null,
): string | null {
  const doc = getWineDoc(ref)
  if (doc?.name) return doc.name
  const customName = custom?.name?.trim()
  if (customName) return customName
  return null
}

/** Slug for routing to a wine detail page. Null when the wine is custom. */
export function getWineSlug(ref: WineRef): string | null {
  const doc = getWineDoc(ref)
  return doc?.slug ?? null
}

/**
 * Systembolaget URL — prefers the library wine's URL, falls back to the
 * customWine snapshot. Null when neither is set.
 */
export function getWineSystembolagetUrl(
  ref: WineRef,
  custom?: CustomWine | null,
): string | null {
  const doc = getWineDoc(ref)
  if (doc?.systembolagetUrl) return doc.systembolagetUrl
  const customUrl = custom?.systembolagetUrl?.trim()
  if (customUrl) return customUrl
  return null
}

/** Producer / winery — prefers library winery, falls back to customWine.producer. */
export function getWineProducer(
  ref: WineRef,
  custom?: CustomWine | null,
): string | null {
  const doc = getWineDoc(ref)
  if (doc?.winery) return doc.winery
  const customProducer = custom?.producer?.trim()
  if (customProducer) return customProducer
  return null
}
