import { normalizeAnswer } from './blind-guess-vocab'

/**
 * Easy-mode decoy generator for the blind-tasting guess card.
 *
 * Given a pool (e.g. all COUNTRIES) and the host-set correct answers, return
 * `count` options to render in the guest's dropdown. All correct answers are
 * always included; the remaining slots are filled with random decoys drawn
 * from the pool minus the correct answers.
 *
 * Deterministic per `seed` — passing the same seed always yields the same
 * options in the same order. Use a seed like `sessionId:pourOrder:tier` so
 * every guest sees identical dropdowns across devices and survives hard
 * refreshes.
 */
export interface PickEasyModeOptionsArgs {
  pool: ReadonlyArray<string>
  answers: ReadonlyArray<string>
  count: number
  seed: string
}

/**
 * Returns null when there's nothing to score (host didn't set any correct
 * answer for this tier) — callers should fall back to the full enum or hide
 * the tier.
 */
export function pickEasyModeOptions(args: PickEasyModeOptionsArgs): string[] | null {
  const { pool, answers, count, seed } = args
  if (!answers || answers.length === 0) return null
  if (count <= 0) return []

  // Deduplicate and sanitize the answers; keep host's casing for display.
  const seen = new Set<string>()
  const cleanAnswers: string[] = []
  for (const a of answers) {
    const trimmed = typeof a === 'string' ? a.trim() : ''
    if (!trimmed) continue
    const key = normalizeAnswer(trimmed)
    if (seen.has(key)) continue
    seen.add(key)
    cleanAnswers.push(trimmed)
  }
  if (cleanAnswers.length === 0) return null

  const rng = mulberry32(hashSeed(seed))

  // If the host has supplied more correct answers than `count`, take a
  // deterministic subset that still includes some of them rather than crashing.
  if (cleanAnswers.length >= count) {
    return shuffle([...cleanAnswers], rng).slice(0, count)
  }

  // Build a decoy pool: everything in `pool` not in `answers` (case-insensitive).
  const decoyPool = pool.filter((p) => !seen.has(normalizeAnswer(p)))
  const decoysNeeded = count - cleanAnswers.length
  const decoys = shuffle([...decoyPool], rng).slice(0, decoysNeeded)

  // Shuffle the combined set with the SAME rng so order is deterministic.
  return shuffle([...cleanAnswers, ...decoys], rng)
}

/**
 * Tiny string-to-uint32 hash for seeding the PRNG. djb2 — fine for non-crypto
 * shuffles.
 */
function hashSeed(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i)
  }
  return h >>> 0
}

/**
 * Mulberry32 PRNG — 32-bit, fast, deterministic. Good enough for shuffling.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fisher-Yates with a provided PRNG. Mutates + returns the array. */
function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}
