import type { TastingTemplate, Wine } from '@/payload-types'

export interface LockedTemplatePreview {
  /** Total wines in the tasting. Always shown. */
  wineCount: number
  /** Sum of library wine prices (skipping unpriced wines). Null when no wine
   *  has a usable price. */
  totalPriceSek: number | null
  /** Pour orders 1..N for rendering placeholder cards in the locked view. */
  pourOrders: number[]
}

/**
 * Aggregate wine count + total price from a TastingTemplate WITHOUT exposing
 * any wine names, producers, regions, grapes, or host notes. Called server-
 * side; the redacted payload sent to the client doesn't carry the wines
 * array at all in locked mode.
 */
export function getLockedTemplatePreview(template: TastingTemplate): LockedTemplatePreview {
  const wines = template.wines ?? []
  const pourOrders = wines.map((w, idx) => w.pourOrder ?? idx + 1)

  let total = 0
  let hasAnyPrice = false
  for (const w of wines) {
    if (w.libraryWine && typeof w.libraryWine === 'object') {
      const lib = w.libraryWine as Wine
      const price = typeof (lib as { price?: number }).price === 'number'
        ? ((lib as { price?: number }).price as number)
        : null
      if (price != null && price >= 0) {
        total += price
        hasAnyPrice = true
      }
      continue
    }
    const cust = (w as { customWine?: { priceSek?: number | null } }).customWine
    const custPrice = typeof cust?.priceSek === 'number' ? cust.priceSek : null
    if (custPrice != null && custPrice >= 0) {
      total += custPrice
      hasAnyPrice = true
    }
  }

  return {
    wineCount: wines.length,
    totalPriceSek: hasAnyPrice ? total : null,
    pourOrders,
  }
}
