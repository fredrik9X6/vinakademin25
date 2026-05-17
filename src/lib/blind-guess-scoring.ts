import {
  normalizeAnswer,
  priceToBucket,
  type PriceBucket,
} from './blind-guess-vocab'

/**
 * Each scored tier is worth one point. Max 3 per wine (country + grape + price).
 * Kept symmetric so a single number on the leaderboard is comparable at a glance.
 */
export const COUNTRY_POINTS = 1
export const GRAPE_POINTS = 1
export const PRICE_POINTS = 1

export interface BlindAnswer {
  country: string | null | undefined
  /**
   * Acceptable grapes. Single-grape wines have a 1-item array; blends have
   * multiple. Any match scores. Empty / missing array = grape tier disabled.
   */
  grapes: ReadonlyArray<string> | null | undefined
  /** Either a pre-set bucket, OR a raw SEK price the helper will bucket itself. */
  priceBucket?: PriceBucket | null
  priceSek?: number | null
}

export interface BlindGuess {
  guessedCountry?: string | null
  guessedGrape?: string | null
  guessedPriceBucket?: PriceBucket | null
}

export interface ScoredGuess {
  countryCorrect: boolean
  grapeCorrect: boolean
  priceCorrect: boolean
  points: number
  /** True when the answer field exists for that tier — guests can see whether their guess was scored at all. */
  countryScored: boolean
  grapeScored: boolean
  priceScored: boolean
}

/**
 * Resolve an answer's price bucket. Prefer the explicit override on the wine
 * entry; fall back to the auto-derived bucket from the raw price.
 */
export function resolveAnswerPriceBucket(answer: BlindAnswer): PriceBucket | null {
  if (answer.priceBucket) return answer.priceBucket
  return priceToBucket(answer.priceSek ?? null)
}

export function scoreOne(guess: BlindGuess, answer: BlindAnswer): ScoredGuess {
  const countryScored = !!answer.country
  const grapesArr = Array.isArray(answer.grapes) ? answer.grapes : []
  const grapeScored = grapesArr.length > 0
  const answerBucket = resolveAnswerPriceBucket(answer)
  const priceScored = answerBucket != null

  const countryCorrect =
    countryScored &&
    !!guess.guessedCountry &&
    normalizeAnswer(answer.country) === normalizeAnswer(guess.guessedCountry)
  const grapeCorrect =
    grapeScored &&
    !!guess.guessedGrape &&
    grapesArr.some(
      (g) => normalizeAnswer(g) === normalizeAnswer(guess.guessedGrape),
    )
  const priceCorrect =
    priceScored && !!guess.guessedPriceBucket && answerBucket === guess.guessedPriceBucket

  const points =
    (countryCorrect ? COUNTRY_POINTS : 0) +
    (grapeCorrect ? GRAPE_POINTS : 0) +
    (priceCorrect ? PRICE_POINTS : 0)

  return {
    countryCorrect,
    grapeCorrect,
    priceCorrect,
    points,
    countryScored,
    grapeScored,
    priceScored,
  }
}
