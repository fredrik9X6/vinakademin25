import type { Payload } from 'payload'
import { scoreOne } from '@/lib/blind-guess-scoring'
import { buildBlindAnswersByPour } from '@/lib/blind-answers'
import type { PriceBucket } from '@/lib/blind-guess-vocab'

export interface LiveScoreMaps {
  /** participantId → cumulative points across revealed wines. */
  byParticipantId: Map<number, number>
  /** userId → cumulative points across revealed wines. Covers logged-in
   * guests + the host-as-user case. */
  byUserId: Map<number, number>
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
  const answerByPour = await buildBlindAnswersByPour(payload, wines)

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
