import type { Payload } from 'payload'
import { scoreOne, type BlindAnswer } from '@/lib/blind-guess-scoring'
import type { PriceBucket } from '@/lib/blind-guess-vocab'

export interface LiveScoreMaps {
  /** participantId → cumulative points across revealed wines. */
  byParticipantId: Map<number, number>
  /** userId → cumulative points across revealed wines. Covers logged-in
   * guests + the host-as-user case. */
  byUserId: Map<number, number>
}

/**
 * Build a BlindAnswer per pour using the same precedence the recap aggregator
 * applies: explicit blind-answer override on the plan entry → joined library
 * wine data → customWine.priceSek (for price-bucket auto-derive).
 */
function buildAnswerByPour(wines: ReadonlyArray<unknown>): Map<number, BlindAnswer> {
  const out = new Map<number, BlindAnswer>()
  wines.forEach((entry, idx) => {
    const w = entry as {
      pourOrder?: number | null
      libraryWine?:
        | number
        | {
            id: number
            country?: { name?: string } | null
            grapes?: Array<{ name?: string } | unknown> | null
            price?: number | null
          }
        | null
      customWine?: { priceSek?: number | null } | null
      blindAnswerCountry?: string | null
      blindAnswerGrapes?: string[] | null
      blindAnswerPriceBucket?: PriceBucket | null
    }
    const pour = w.pourOrder ?? idx + 1
    const lib = w.libraryWine && typeof w.libraryWine === 'object' ? w.libraryWine : null
    const libCountry =
      lib && typeof lib.country === 'object' && lib.country
        ? (lib.country as { name?: string }).name ?? null
        : null
    const libGrape =
      lib && Array.isArray(lib.grapes) && lib.grapes.length > 0 && typeof lib.grapes[0] === 'object'
        ? ((lib.grapes[0] as { name?: string }).name ?? null)
        : null
    const libPrice = typeof lib?.price === 'number' ? lib.price : null
    const cust = !lib && w.customWine ? w.customWine : null
    const overrideGrapes = Array.isArray(w.blindAnswerGrapes)
      ? (w.blindAnswerGrapes as string[]).filter(
          (g) => typeof g === 'string' && g.trim().length > 0,
        )
      : []
    out.set(pour, {
      country: w.blindAnswerCountry ?? libCountry,
      grapes: overrideGrapes.length > 0 ? overrideGrapes : libGrape ? [libGrape] : [],
      priceBucket: w.blindAnswerPriceBucket ?? null,
      priceSek: libPrice ?? cust?.priceSek ?? null,
    })
  })
  return out
}

/**
 * Sum points per identity for ONLY the wines that have been revealed.
 *
 * Mirrors the recap aggregator's scoring but with a `revealedPourOrders`
 * filter so pre-reveal correctness doesn't leak into the live leaderboard.
 * Called once per 5s roster tick — cheap.
 */
export async function computeLivePoints(
  payload: Payload,
  sessionId: number | string,
  wines: ReadonlyArray<unknown>,
  revealedPourOrders: ReadonlyArray<number>,
): Promise<LiveScoreMaps> {
  const empty: LiveScoreMaps = {
    byParticipantId: new Map(),
    byUserId: new Map(),
  }
  if (revealedPourOrders.length === 0) return empty
  const revealedSet = new Set(revealedPourOrders)
  const answerByPour = buildAnswerByPour(wines)

  const guessRes = await payload.find({
    collection: 'session-guesses',
    where: { session: { equals: sessionId } },
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  })

  const byParticipantId = new Map<number, number>()
  const byUserId = new Map<number, number>()

  for (const g of guessRes.docs as Array<{
    sessionParticipant?: number | { id: number } | null
    user?: number | { id: number } | null
    pourOrder: number
    guessedCountry?: string | null
    guessedGrape?: string | null
    guessedPriceBucket?: PriceBucket | null
  }>) {
    if (!revealedSet.has(g.pourOrder)) continue
    const answer = answerByPour.get(g.pourOrder)
    if (!answer) continue
    const scored = scoreOne(
      {
        guessedCountry: g.guessedCountry,
        guessedGrape: g.guessedGrape,
        guessedPriceBucket: g.guessedPriceBucket ?? null,
      },
      answer,
    )
    if (scored.points === 0) continue
    const participantId =
      typeof g.sessionParticipant === 'object'
        ? g.sessionParticipant?.id
        : g.sessionParticipant
    if (typeof participantId === 'number') {
      byParticipantId.set(participantId, (byParticipantId.get(participantId) ?? 0) + scored.points)
    }
    const userId = typeof g.user === 'object' ? g.user?.id : g.user
    if (typeof userId === 'number') {
      byUserId.set(userId, (byUserId.get(userId) ?? 0) + scored.points)
    }
  }

  return { byParticipantId, byUserId }
}
