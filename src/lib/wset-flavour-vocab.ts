/**
 * WSET tasting vocabulary used by `WineReviewForm`.
 *
 * Single source of truth for the four MultiSelect chip lists that used to be
 * duplicated inline in the form (primary nose, primary palate, secondary nose,
 * secondary palate). Same vocabulary is used on both nose and palate within
 * each tier per WSET convention.
 *
 * `SUGGESTED_BY_TYPE` lets us pre-rank the chips for a given wine type so the
 * most plausible options show up first in the dropdown. Unsuggested items
 * still render alphabetically beneath the suggested group.
 */

export type WineType =
  | 'red'
  | 'white'
  | 'rose'
  | 'sparkling'
  | 'dessert'
  | 'fortified'
  | 'other'

// --- Vocabularies ---------------------------------------------------------

export const PRIMARY_VOCAB: string[] = [
  'Jordgubbe', 'Päron', 'Persika', 'Apelsin', 'Citron', 'Äpple', 'Krusbär',
  'Grapefrukt', 'Druva', 'Lime', 'Aprikos', 'Banan', 'Nektarin', 'Litchi',
  'Mango', 'Passionsfrukt', 'Melon', 'Ananas', 'Tranbär', 'Röda vinbär',
  'Hallon', 'Röda körsbär', 'Svarta vinbär', 'Björnbär', 'Mörka körsbär',
  'Blåbär', 'Mörka plommon', 'Röda plommon', 'Blomma', 'Ros', 'Viol',
  'Grön paprika', 'Gräs', 'Tomatblad', 'Sparris', 'Eukalyptus', 'Mynta',
  'Fänkål', 'Dill', 'Torkade örter', 'Svart- & Vitpeppar', 'Lakrits',
  'Omogen frukt', 'Mogen frukt', 'Blöta stenar',
]

export const SECONDARY_VOCAB: string[] = [
  'Vanilj', 'Ceder', 'Kex', 'Bröd', 'Bröddeg', 'yoghurt', 'Grädde', 'Smör',
  'Ost', 'Kokosnöt', 'Förkolnat trä', 'Rök', 'Godis', 'Bakverk',
  'Rostat bröd', 'Kryddnejlika', 'Kanel', 'Muskot', 'Ingefära', 'Kokt frukt',
  'Kaffe',
]

export const TERTIARY_VOCAB: string[] = [
  'Choklad', 'Läder', 'Kola', 'Jord', 'Svamp', 'Kött', 'Tobak',
  'Blöta löv', 'Skogsbotten', 'Apelsinmarmelad', 'Bensin', 'Mandel',
  'Hasselnöt', 'Honung', 'Torkad frukt',
]

// --- Type → suggestions ---------------------------------------------------

type Tier = 'primary' | 'secondary' | 'tertiary'

const SUGGESTIONS: Record<WineType, Record<Tier, string[]>> = {
  red: {
    primary: [
      'Hallon', 'Röda körsbär', 'Mörka körsbär', 'Björnbär', 'Svarta vinbär',
      'Mörka plommon', 'Röda plommon', 'Viol', 'Lakrits', 'Svart- & Vitpeppar',
      'Mogen frukt', 'Tranbär',
    ],
    secondary: [
      'Vanilj', 'Ceder', 'Rök', 'Förkolnat trä', 'Kryddnejlika', 'Kanel',
      'Muskot', 'Rostat bröd', 'Ingefära', 'Kokt frukt',
    ],
    tertiary: [],
  },
  white: {
    primary: [
      'Citron', 'Lime', 'Grapefrukt', 'Äpple', 'Päron', 'Persika', 'Aprikos',
      'Krusbär', 'Blomma', 'Blöta stenar', 'Druva', 'Apelsin',
    ],
    secondary: [
      'Vanilj', 'Smör', 'Kex', 'Bröd', 'Bröddeg', 'Grädde', 'Kokosnöt',
      'Kokt frukt', 'Bakverk',
    ],
    tertiary: [],
  },
  rose: {
    primary: [
      'Jordgubbe', 'Hallon', 'Röda körsbär', 'Röda vinbär', 'Grapefrukt',
      'Blomma', 'Ros', 'Tranbär',
    ],
    secondary: ['Vanilj', 'Bröd', 'Grädde', 'Smör'],
    tertiary: [],
  },
  sparkling: {
    primary: [
      'Äpple', 'Päron', 'Citron', 'Lime', 'Grapefrukt', 'Blomma', 'Krusbär',
      'Mogen frukt',
    ],
    secondary: [
      'Bröd', 'Bröddeg', 'Kex', 'Bakverk', 'Grädde', 'Smör', 'yoghurt',
      'Vanilj',
    ],
    tertiary: [],
  },
  dessert: {
    primary: [
      'Aprikos', 'Persika', 'Apelsin', 'Mogen frukt', 'Mango', 'Litchi',
      'Ananas', 'Passionsfrukt',
    ],
    secondary: [
      'Vanilj', 'Bakverk', 'Kanel', 'Muskot', 'Bröd', 'Bröddeg', 'Grädde',
    ],
    tertiary: [],
  },
  fortified: {
    primary: ['Mörka plommon', 'Mogen frukt', 'Apelsin', 'Aprikos', 'Röda plommon'],
    secondary: [
      'Vanilj', 'Kanel', 'Kryddnejlika', 'Rök', 'Förkolnat trä', 'Muskot',
    ],
    tertiary: [],
  },
  other: {
    primary: [],
    secondary: [],
    tertiary: [],
  },
}

const TYPE_LABEL: Record<Exclude<WineType, 'other'>, string> = {
  red: 'rött vin',
  white: 'vitt vin',
  rose: 'rosé',
  sparkling: 'mousserande',
  dessert: 'dessertvin',
  fortified: 'fortifierat vin',
}

export interface GroupedOption {
  label: string
  value: string
  /** Optional group heading. When set, items with the same group render together. */
  group?: string
}

/**
 * Build a grouped, ordered options list for a MultiSelect.
 *
 * - When `wineType` has suggestions for the given tier, the suggested labels
 *   appear first under a "Föreslagna för {type}" heading, in the order listed
 *   in `SUGGESTIONS`. Remaining labels follow under "Alla", alphabetically.
 * - When `wineType` is `'other'`, null, or has no suggestions for the tier,
 *   the full vocabulary renders flat (no group headings).
 */
export function buildFlavourOptions(
  vocab: string[],
  tier: Tier,
  wineType: WineType | null | undefined,
): GroupedOption[] {
  if (!wineType || wineType === 'other') {
    return vocab.map((v) => ({ label: v, value: v }))
  }
  const suggested = SUGGESTIONS[wineType]?.[tier] ?? []
  if (suggested.length === 0) {
    return vocab.map((v) => ({ label: v, value: v }))
  }
  const groupLabel = `Föreslagna för ${TYPE_LABEL[wineType as Exclude<WineType, 'other'>]}`
  const suggestedSet = new Set(suggested)
  const rest = vocab
    .filter((v) => !suggestedSet.has(v))
    .sort((a, b) => a.localeCompare(b, 'sv'))

  return [
    ...suggested.map((v) => ({ label: v, value: v, group: groupLabel })),
    ...rest.map((v) => ({ label: v, value: v, group: 'Alla' })),
  ]
}
