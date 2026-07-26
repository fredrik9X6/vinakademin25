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

/**
 * The wine identity a review row needs, resolved from the session's plan.
 * Exactly one of `wine` / `customWine` is non-null, mirroring the shape
 * `POST /api/reviews` and the Reviews collection's beforeValidate hook expect.
 */
export interface ResolvedWineIdentity {
  wine: number | null
  customWine: {
    name: string
    producer?: string
    vintage?: string
    type?: string
    systembolagetUrl?: string
    priceSek?: number
    systembolagetProductNumber?: string
    imageUrl?: string
  } | null
}

/**
 * Inverse of `resolvePourForReview`: given a session's plan wines and a pour
 * order, return the wine identity to persist on a review.
 *
 * This exists so a guest in a blind tasting can write a tasting note for a wine
 * whose identity was deliberately withheld from their client. The server holds
 * the un-redacted plan, so it resolves identity itself and never sends it down.
 *
 * Returns `null` when the pour order has no entry, or the entry carries no
 * usable identity (no library wine and no non-blank custom-wine name).
 */
export function resolveWineIdentityForPour(
  wines: ReadonlyArray<unknown>,
  pourOrder: number,
): ResolvedWineIdentity | null {
  for (let idx = 0; idx < wines.length; idx++) {
    const w = wines[idx] as {
      pourOrder?: number | null
      libraryWine?: number | { id: number } | null
      customWine?: Record<string, unknown> | null
    }
    const entryPour = w.pourOrder ?? idx + 1
    if (entryPour !== pourOrder) continue

    // Library wine wins when both are somehow present — it is the stronger
    // identity and matches rowFromEntry's precedence in PlanSessionContent.
    if (w.libraryWine != null) {
      const id =
        typeof w.libraryWine === 'object'
          ? (w.libraryWine as { id: number }).id
          : (w.libraryWine as number)
      if (typeof id === 'number' && !Number.isNaN(id)) {
        return { wine: id, customWine: null }
      }
    }

    const c = w.customWine
    const name = typeof c?.name === 'string' ? c.name.trim() : ''
    if (!name) return null

    // Copy only the fields the Reviews.customWine group persists, and only
    // when present — an explicit undefined key would overwrite a stored value.
    const snapshot: NonNullable<ResolvedWineIdentity['customWine']> = { name }
    const text = (key: 'producer' | 'vintage' | 'type' | 'systembolagetUrl' | 'imageUrl') => {
      const v = c?.[key]
      if (typeof v === 'string' && v.trim() !== '') snapshot[key] = v
    }
    text('producer')
    text('vintage')
    text('type')
    text('systembolagetUrl')
    text('imageUrl')
    if (typeof c?.priceSek === 'number' && !Number.isNaN(c.priceSek)) {
      snapshot.priceSek = c.priceSek
    }
    const pn = c?.systembolagetProductNumber
    if (pn != null && String(pn).trim() !== '') {
      snapshot.systembolagetProductNumber = String(pn)
    }
    return { wine: null, customWine: snapshot }
  }
  return null
}
