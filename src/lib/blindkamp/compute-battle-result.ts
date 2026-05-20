import type { Payload } from 'payload'

export interface BattleResultRow {
  submissionId: number
  slot: number
  submitterId: number | null
  submitterName: string
  wineTitle: string
  producer: string | null
  vintage: string | null
  imageUrl: string | null
  averageRating: number | null
  isWinner: boolean
}

export interface BattleResultSummary {
  rows: BattleResultRow[]
  winner: BattleResultRow | null
}

/**
 * Computes the final ranking for a blindkamp. Self-ratings are excluded.
 * Ties → all top wines have isWinner=true.
 */
export async function computeBattleResult(
  payload: Payload,
  battleId: number,
): Promise<BattleResultSummary> {
  const battle = (await payload.findByID({
    collection: 'blind-battles',
    id: battleId,
    depth: 1,
    overrideAccess: true,
  })) as any

  const subs = await payload.find({
    collection: 'blind-battle-submissions',
    where: { battle: { equals: battleId } },
    limit: 100,
    depth: 2,
    overrideAccess: true,
  })

  const sessionId =
    typeof battle.currentSession === 'object'
      ? battle.currentSession?.id
      : battle.currentSession
  const reviewsRes = sessionId
    ? await payload.find({
        collection: 'reviews',
        where: { session: { equals: sessionId } },
        limit: 1000,
        depth: 0,
        overrideAccess: true,
      })
    : { docs: [] as any[] }

  // Group ratings by submission, excluding self-ratings
  const ratingsBySub = new Map<number, number[]>()
  for (const r of reviewsRes.docs as any[]) {
    if (typeof r.rating !== 'number') continue
    const subId = (r.metadata as any)?.submissionId
    if (typeof subId !== 'number') continue
    const sub = (subs.docs as any[]).find((s) => s.id === subId)
    if (!sub) continue
    const submitterId = typeof sub.user === 'object' ? sub.user?.id : sub.user
    const reviewerId = typeof r.user === 'object' ? r.user?.id : r.user
    if (reviewerId === submitterId) continue
    if (!ratingsBySub.has(subId)) ratingsBySub.set(subId, [])
    ratingsBySub.get(subId)!.push(r.rating)
  }

  const rows: BattleResultRow[] = (subs.docs as any[]).map((s) => {
    const ratings = ratingsBySub.get(s.id) ?? []
    const avg =
      ratings.length > 0 ? ratings.reduce((sum, x) => sum + x, 0) / ratings.length : null
    const u = typeof s.user === 'object' ? s.user : null
    const submitterId = u?.id ?? (typeof s.user === 'number' ? s.user : null)
    const submitterName = (u?.firstName || u?.email || s.guestName || 'Anonym') as string
    const wineTitle = s.systembolagetProduct?.productNameBold || s.customWine?.name || 'Vin'
    const producer = s.systembolagetProduct?.producerName || s.customWine?.producer || null
    const vintage = s.systembolagetProduct?.vintage || s.customWine?.vintage || null
    const imageUrl = s.systembolagetProduct?.imageUrl || s.customWine?.imageUrl || null
    return {
      submissionId: s.id,
      slot: s.pourOrder,
      submitterId,
      submitterName,
      wineTitle,
      producer,
      vintage,
      imageUrl,
      averageRating: avg,
      isWinner: false,
    }
  })

  rows.sort((a, b) => (b.averageRating ?? -1) - (a.averageRating ?? -1))
  const topAvg = rows[0]?.averageRating ?? null
  for (const r of rows) {
    r.isWinner = topAvg !== null && r.averageRating === topAvg
  }
  const winner = rows.find((r) => r.isWinner) ?? null
  return { rows, winner }
}
