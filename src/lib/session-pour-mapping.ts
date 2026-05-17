/**
 * Shared logic for mapping a session's reviews back to the pour order they
 * belong to. Used by both:
 *
 *  - the live swarm aggregator (`src/app/api/sessions/[sessionId]/stream/route.ts`)
 *  - the post-session recap aggregator (`src/lib/session-recap.ts`)
 *
 * Reviews can identify a wine via either a library `wine` relationship or a
 * `customWine` snapshot. Custom wines are matched by Systembolaget product
 * number first (stable), falling back to a case-insensitive name match
 * (covers hand-typed wines and legacy reviews from before productNumber was
 * wired into the customWine group).
 */

export interface PourMaps {
  /** Wine doc id → pour order, for library-wine entries. */
  wineIdToPour: Record<number, number>
  /** Lower-cased customWine name → pour order. */
  titleToPour: Record<string, number>
  /** Systembolaget productNumber → pour order, for customWine entries. */
  productNumberToPour: Record<string, number>
}

export function buildPourMaps(wines: ReadonlyArray<unknown>): PourMaps {
  const wineIdToPour: Record<number, number> = {}
  const titleToPour: Record<string, number> = {}
  const productNumberToPour: Record<string, number> = {}

  wines.forEach((entry, idx) => {
    const w = entry as {
      pourOrder?: number | null
      libraryWine?: number | { id: number } | null
      customWine?: {
        name?: string | null
        systembolagetProductNumber?: string | null
      } | null
    }
    const pourOrder = w.pourOrder ?? idx + 1
    if (w.libraryWine != null) {
      const id =
        typeof w.libraryWine === 'object'
          ? (w.libraryWine as { id: number }).id
          : (w.libraryWine as number)
      if (typeof id === 'number') wineIdToPour[id] = pourOrder
    } else if (w.customWine?.name) {
      titleToPour[String(w.customWine.name).toLowerCase()] = pourOrder
      if (w.customWine.systembolagetProductNumber) {
        productNumberToPour[String(w.customWine.systembolagetProductNumber)] = pourOrder
      }
    }
  })

  return { wineIdToPour, titleToPour, productNumberToPour }
}

/**
 * Resolve a single review to its pour order using the maps from
 * `buildPourMaps`. Returns `null` when no match is found (the review's wine
 * doesn't belong to this session's plan, or the customWine has no usable
 * identifier).
 */
export function resolvePourForReview(
  review: {
    wine?: number | { id: number } | null
    customWine?: {
      name?: string | null
      systembolagetProductNumber?: string | null
    } | null
  },
  maps: PourMaps,
): number | null {
  if (review.wine != null) {
    const id =
      typeof review.wine === 'object'
        ? (review.wine as { id: number }).id
        : (review.wine as number)
    if (typeof id === 'number') {
      const pour = maps.wineIdToPour[id]
      return pour ?? null
    }
  }
  if (review.customWine?.systembolagetProductNumber) {
    const pour = maps.productNumberToPour[String(review.customWine.systembolagetProductNumber)]
    if (pour != null) return pour
    if (review.customWine.name) {
      const pourByName = maps.titleToPour[String(review.customWine.name).toLowerCase()]
      if (pourByName != null) return pourByName
    }
  }
  if (review.customWine?.name) {
    const pour = maps.titleToPour[String(review.customWine.name).toLowerCase()]
    return pour ?? null
  }
  return null
}
