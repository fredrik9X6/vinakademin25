import type { Payload } from 'payload'
import type { Wine } from '@/payload-types'

export interface RecommendByGrapeInput {
  payload: Payload
  /** Wines the user rated highly in this session — recommend by their grape overlap. */
  anchorWines: Pick<Wine, 'id' | 'grapes'>[]
  /** Wine ids already reviewed by the user (any session) — excluded from results. */
  excludeWineIds: number[]
  /** Wine ids in the current session — excluded from results. */
  sessionWineIds: number[]
  /** Max results. Default 5. */
  limit?: number
}

/**
 * Find wines in the library that share at least one grape variety with any of
 * the anchor wines. Returns lean Wine docs; caller renders them.
 *
 * Used by the wrap-up email's "Vinakademins rekommendationer" block. The
 * caller is responsible for the ≥3-hits-or-omit gate.
 */
export async function recommendByGrape({
  payload,
  anchorWines,
  excludeWineIds,
  sessionWineIds,
  limit = 5,
}: RecommendByGrapeInput): Promise<Wine[]> {
  if (anchorWines.length === 0) return []

  // Collect all grape ids the anchor wines share
  const grapeIds = new Set<number>()
  for (const w of anchorWines) {
    for (const g of w.grapes ?? []) {
      const id = typeof g === 'object' ? g.id : g
      if (typeof id === 'number') grapeIds.add(id)
    }
  }
  if (grapeIds.size === 0) return []

  const excludeIds = new Set<number>([...excludeWineIds, ...sessionWineIds])

  const result = await payload.find({
    collection: 'wines',
    where: {
      and: [
        { grapes: { in: Array.from(grapeIds) } },
        ...(excludeIds.size > 0
          ? [{ id: { not_in: Array.from(excludeIds) } }]
          : []),
      ],
    },
    limit: limit * 3, // over-fetch to allow dedupe; dedupe below
    depth: 1,
    overrideAccess: true,
  })

  // Deduplicate by id (Payload + Postgres should already dedupe, but defensive)
  const seen = new Set<number>()
  const out: Wine[] = []
  for (const w of result.docs as Wine[]) {
    if (seen.has(w.id)) continue
    seen.add(w.id)
    out.push(w)
    if (out.length >= limit) break
  }
  return out
}
