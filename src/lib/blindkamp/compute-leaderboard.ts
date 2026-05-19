import type { Payload } from 'payload'

export interface LeaderboardEntry {
  userId: number
  displayName: string
  wins: number
  averageRating: number | null
  submissionsCount: number
  bestWine: {
    title: string
    averageRating: number
    imageUrl: string | null
  } | null
  /** True if member has fewer than 3 completed battles — listed but unranked. */
  isRookie: boolean
}

export async function computeClubLeaderboard(
  payload: Payload,
  clubId: number,
  range: 'all' | 'year' | '6m' = 'all',
): Promise<LeaderboardEntry[]> {
  const dateFloor =
    range === 'year'
      ? new Date(new Date().getFullYear(), 0, 1)
      : range === '6m'
        ? new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 * 6)
        : null

  const battlesRes = await payload.find({
    collection: 'blind-battles',
    where: {
      and: [
        { club: { equals: clubId } },
        { status: { equals: 'completed' } },
        ...(dateFloor ? [{ updatedAt: { greater_than: dateFloor.toISOString() } }] : []),
      ],
    },
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  })

  if (battlesRes.docs.length === 0) return []
  const battleIds = battlesRes.docs.map((b: any) => b.id)

  const submissionsRes = await payload.find({
    collection: 'blind-battle-submissions',
    where: { battle: { in: battleIds } },
    limit: 5000,
    depth: 1,
    overrideAccess: true,
  })
  const submissions = submissionsRes.docs as any[]

  const sessionIds = battlesRes.docs
    .map((b: any) => (typeof b.currentSession === 'object' ? b.currentSession?.id : b.currentSession))
    .filter((x): x is number => typeof x === 'number')
  const reviewsRes = sessionIds.length
    ? await payload.find({
        collection: 'reviews',
        where: { session: { in: sessionIds } },
        limit: 5000,
        depth: 0,
        overrideAccess: true,
      })
    : { docs: [] as any[] }
  const reviews = reviewsRes.docs as any[]

  // Group ratings per submission, excluding submitter's self-ratings
  type SubAgg = { sub: any; submitterId: number | null; ratings: number[] }
  const byId = new Map<number, SubAgg>()
  for (const s of submissions) {
    const submitterId = typeof s.user === 'object' ? s.user?.id : s.user
    byId.set(s.id, { sub: s, submitterId: submitterId ?? null, ratings: [] })
  }
  for (const r of reviews) {
    if (typeof r.rating !== 'number') continue
    const subId = (r.metadata as any)?.submissionId
    if (typeof subId !== 'number') continue
    const agg = byId.get(subId)
    if (!agg) continue
    const reviewerId = typeof r.user === 'object' ? r.user?.id : r.user
    if (reviewerId && reviewerId === agg.submitterId) continue // self-rating excluded
    agg.ratings.push(r.rating)
  }

  // Wins per user: per battle, top average wins (ties → all get +1)
  const winsByUser = new Map<number, number>()
  const byBattle = new Map<number, SubAgg[]>()
  for (const agg of byId.values()) {
    const bid = typeof agg.sub.battle === 'object' ? agg.sub.battle?.id : agg.sub.battle
    if (typeof bid !== 'number') continue
    if (!byBattle.has(bid)) byBattle.set(bid, [])
    byBattle.get(bid)!.push(agg)
  }
  for (const [, aggs] of byBattle) {
    const withAvg = aggs
      .filter((a) => a.ratings.length > 0 && a.submitterId)
      .map((a) => ({ a, avg: a.ratings.reduce((s, r) => s + r, 0) / a.ratings.length }))
    if (withAvg.length === 0) continue
    const max = Math.max(...withAvg.map((x) => x.avg))
    for (const { a, avg } of withAvg) {
      if (avg === max && a.submitterId != null) {
        winsByUser.set(a.submitterId, (winsByUser.get(a.submitterId) ?? 0) + 1)
      }
    }
  }

  // Per-user aggregates
  type UserAgg = {
    userId: number
    displayName: string
    submissionsCount: number
    allRatings: number[]
    bestWine: { title: string; averageRating: number; imageUrl: string | null } | null
    battlesCount: Set<number>
  }
  const byUser = new Map<number, UserAgg>()
  for (const agg of byId.values()) {
    if (agg.submitterId == null) continue
    const submitter = agg.sub.user
    const displayName =
      (typeof submitter === 'object' && (submitter?.firstName || submitter?.email)) || 'Medlem'
    if (!byUser.has(agg.submitterId)) {
      byUser.set(agg.submitterId, {
        userId: agg.submitterId,
        displayName: String(displayName),
        submissionsCount: 0,
        allRatings: [],
        bestWine: null,
        battlesCount: new Set(),
      })
    }
    const u = byUser.get(agg.submitterId)!
    u.submissionsCount += 1
    u.allRatings.push(...agg.ratings)
    const bid = typeof agg.sub.battle === 'object' ? agg.sub.battle?.id : agg.sub.battle
    if (typeof bid === 'number') u.battlesCount.add(bid)
    const avg = agg.ratings.length > 0 ? agg.ratings.reduce((s, r) => s + r, 0) / agg.ratings.length : null
    if (avg !== null) {
      const title = agg.sub.systembolagetProduct?.productNameBold || agg.sub.customWine?.name || 'Vin'
      const imageUrl = agg.sub.systembolagetProduct?.imageUrl || agg.sub.customWine?.imageUrl || null
      if (!u.bestWine || avg > u.bestWine.averageRating) {
        u.bestWine = { title, averageRating: avg, imageUrl }
      }
    }
  }

  const entries: LeaderboardEntry[] = []
  for (const u of byUser.values()) {
    const avg =
      u.allRatings.length > 0
        ? u.allRatings.reduce((s, r) => s + r, 0) / u.allRatings.length
        : null
    entries.push({
      userId: u.userId,
      displayName: u.displayName,
      wins: winsByUser.get(u.userId) ?? 0,
      averageRating: avg,
      submissionsCount: u.submissionsCount,
      bestWine: u.bestWine,
      isRookie: u.battlesCount.size < 3,
    })
  }

  entries.sort((a, b) => {
    if (a.isRookie !== b.isRookie) return a.isRookie ? 1 : -1
    if (a.wins !== b.wins) return b.wins - a.wins
    const aAvg = a.averageRating ?? 0
    const bAvg = b.averageRating ?? 0
    return bAvg - aAvg
  })
  return entries
}
