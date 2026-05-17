/**
 * Constants for the blind-tasting guess card.
 *
 * Hosts and guests both pick from these enums (or hosts can hand-type and we
 * normalize on compare). Keeping the lists in code lets us tune them in PRs
 * without admin work.
 */

export const COUNTRIES: ReadonlyArray<string> = [
  'Frankrike', 'Italien', 'Spanien', 'Portugal', 'Tyskland', 'Österrike',
  'Ungern', 'Grekland', 'Bulgarien', 'Schweiz', 'Sverige',
  'USA', 'Kanada', 'Chile', 'Argentina', 'Uruguay', 'Mexiko',
  'Sydafrika', 'Australien', 'Nya Zeeland',
  'Georgien', 'Israel', 'Libanon', 'Turkiet',
  'Japan', 'Kina', 'Indien',
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
  | 'under_100'
  | '100_200'
  | '200_300'
  | '300_500'
  | '500_plus'

export const PRICE_BUCKETS: ReadonlyArray<{ value: PriceBucket; label: string }> = [
  { value: 'under_100', label: 'Under 100 kr' },
  { value: '100_200', label: '100–200 kr' },
  { value: '200_300', label: '200–300 kr' },
  { value: '300_500', label: '300–500 kr' },
  { value: '500_plus', label: '500+ kr' },
]

/**
 * Map a raw SEK price to its bucket. Returns `null` for missing / negative prices.
 */
export function priceToBucket(priceSek: number | null | undefined): PriceBucket | null {
  if (priceSek == null || !Number.isFinite(priceSek) || priceSek < 0) return null
  if (priceSek < 100) return 'under_100'
  if (priceSek < 200) return '100_200'
  if (priceSek < 300) return '200_300'
  if (priceSek < 500) return '300_500'
  return '500_plus'
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
