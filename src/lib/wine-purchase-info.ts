import type { Wine } from '@/payload-types'

export type WinePurchaseInfo = {
  priceSek: number | null
  articleNumber: string | null
  systembolagetUrl: string | null
}

/**
 * Trailing Systembolaget product number from a systembolaget.se product URL,
 * e.g. `…/loxarel-a-pel-rose-795901/` → "795901". Null when none is found.
 * Mirrors scripts/backfill-wine-images.ts `extractProductNumber`.
 */
export function articleNumberFromSystembolagetUrl(
  url: string | null | undefined,
): string | null {
  if (!url) return null
  const m = url.match(/-(\d+)\/?$/)
  return m ? m[1] : null
}

type LooseWineEntry = {
  libraryWine?: number | Wine | null
  customWine?: {
    priceSek?: number | null
    systembolagetProductNumber?: string | null
    systembolagetUrl?: string | null
  } | null
}

/**
 * Resolve price + Systembolaget article number + URL for a wine entry,
 * handling both library wines (price/systembolagetUrl on the joined Wine) and
 * custom-wine snapshots. Returns all-null when neither is resolvable (e.g. a
 * redacted blind-tasting wine where libraryWine/customWine were stripped).
 */
export function resolveWinePurchase(w: LooseWineEntry): WinePurchaseInfo {
  const lib =
    w.libraryWine && typeof w.libraryWine === 'object' ? (w.libraryWine as Wine) : null
  if (lib) {
    const sbUrl = lib.systembolagetUrl ?? null
    return {
      priceSek: typeof lib.price === 'number' ? lib.price : null,
      articleNumber: articleNumberFromSystembolagetUrl(sbUrl),
      systembolagetUrl: sbUrl,
    }
  }
  const c = w.customWine ?? null
  if (c) {
    const sbUrl = c.systembolagetUrl ?? null
    return {
      priceSek: typeof c.priceSek === 'number' ? c.priceSek : null,
      articleNumber:
        (c.systembolagetProductNumber?.trim() || null) ??
        articleNumberFromSystembolagetUrl(sbUrl),
      systembolagetUrl: sbUrl,
    }
  }
  return { priceSek: null, articleNumber: null, systembolagetUrl: null }
}
