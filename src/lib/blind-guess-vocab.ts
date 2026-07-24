/**
 * Constants for the blind-tasting guess card.
 *
 * Hosts and guests both pick from these enums (or hosts can hand-type and we
 * normalize on compare). Keeping the lists in code lets us tune them in PRs
 * without admin work.
 */

// Alphabetical (sv collation) — dropdowns render this verbatim.
export const COUNTRIES: ReadonlyArray<string> = [
  'Argentina', 'Australien', 'Bulgarien', 'Chile', 'Frankrike', 'Georgien',
  'Grekland', 'Indien', 'Israel', 'Italien', 'Japan', 'Kanada', 'Kina',
  'Libanon', 'Mexiko', 'Nya Zeeland', 'Portugal', 'Schweiz', 'Spanien',
  'Sverige', 'Sydafrika', 'Turkiet', 'Tyskland', 'Ungern', 'Uruguay', 'USA',
  'Österrike',
]

export const GRAPES: ReadonlyArray<string> = [
  'Cabernet Sauvignon', 'Merlot', 'Pinot Noir', 'Syrah', 'Grenache',
  'Tempranillo', 'Sangiovese', 'Nebbiolo', 'Barbera', 'Montepulciano',
  'Malbec', 'Carmenère', 'Zinfandel', 'Cabernet Franc', 'Mourvèdre',
  'Chardonnay', 'Sauvignon Blanc', 'Riesling', 'Pinot Grigio', 'Pinot Gris',
  'Gewürztraminer', 'Viognier', 'Chenin Blanc', 'Sémillon', 'Albariño',
  'Verdejo', 'Vermentino', 'Trebbiano', 'Glera', 'Grüner Veltliner',
  'Furmint', 'Assyrtiko', 'Xinomavro', 'Touriga Nacional', 'Tinta Roriz',
  'Aglianico', 'Negroamaro', 'Primitivo', 'Corvina', 'Garganega',
]

export type PriceBucket =
  | '0_99'
  | '100_149'
  | '150_199'
  | '200_249'
  | '250_299'
  | '300_plus'

export const PRICE_BUCKETS: ReadonlyArray<{ value: PriceBucket; label: string }> = [
  { value: '0_99',    label: 'Under 100 kr' },
  { value: '100_149', label: '100–149 kr' },
  { value: '150_199', label: '150–199 kr' },
  { value: '200_249', label: '200–249 kr' },
  { value: '250_299', label: '250–299 kr' },
  { value: '300_plus', label: '300+ kr' },
]

/**
 * Map a raw SEK price to its bucket. Returns `null` for missing / negative prices.
 */
export function priceToBucket(priceSek: number | null | undefined): PriceBucket | null {
  if (priceSek == null || !Number.isFinite(priceSek) || priceSek < 0) return null
  if (priceSek < 100) return '0_99'
  if (priceSek < 150) return '100_149'
  if (priceSek < 200) return '150_199'
  if (priceSek < 250) return '200_249'
  if (priceSek < 300) return '250_299'
  return '300_plus'
}

/**
 * Remap a legacy (5-bucket) price-bucket value to the current (6-bucket) scheme.
 * Used in data-migration scripts; pure function with no DB side-effects.
 */
export function remapLegacyPriceBucket(
  old: 'under_100' | '100_200' | '200_300' | '300_500' | '500_plus',
): PriceBucket {
  switch (old) {
    case 'under_100': return '0_99'
    case '100_200':   return '100_149'
    case '200_300':   return '200_249'
    case '300_500':   return '300_plus'
    case '500_plus':  return '300_plus'
  }
}

/**
 * Look up the Swedish label for a bucket value. Returns `null` for unknown
 * values so callers can choose how to render the absence.
 */
export function priceBucketLabel(bucket: PriceBucket | null | undefined): string | null {
  if (!bucket) return null
  return PRICE_BUCKETS.find((b) => b.value === bucket)?.label ?? null
}

/**
 * Case-insensitive normalize used for matching guesses against answers.
 * `'Frankrike'` and `'frankrike '` collapse to the same key.
 */
export function normalizeAnswer(s: string | null | undefined): string {
  if (!s) return ''
  return String(s).trim().toLocaleLowerCase('sv')
}
