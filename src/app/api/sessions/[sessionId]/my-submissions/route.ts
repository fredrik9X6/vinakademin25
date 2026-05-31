import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { cookies } from 'next/headers'
import { PARTICIPANT_COOKIE } from '@/lib/sessions'
import { buildPourMaps, resolvePourForReview } from '@/lib/session-pour-mapping'

/**
 * GET /api/sessions/[sessionId]/my-submissions
 *
 * Returns the calling participant's identity (participantId), all their
 * review rows (incl. custom-wine), all their blind-guess rows, and the set
 * of pour orders that have at least one review. Used by PlanSessionContent /
 * useSessionDraft to rehydrate state after page refresh or re-join.
 *
 * Identity is the participant cookie (vk_participant_token) OR the
 * authenticated user's session-participant row.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params
  const sid = Number(sessionId)
  if (!Number.isInteger(sid)) {
    return NextResponse.json({ error: 'Invalid session id' }, { status: 400 })
  }

  const payload = await getPayload({ config })

  // Identify caller: cookie first, then payload-token user
  const cookieStore = await cookies()
  const participantToken = cookieStore.get(PARTICIPANT_COOKIE)?.value ?? null

  let participantId: number | null = null
  if (participantToken) {
    const found = await payload.find({
      collection: 'session-participants',
      where: {
        and: [
          { session: { equals: sid } },
          { participantToken: { equals: participantToken } },
        ],
      },
      limit: 1,
      overrideAccess: true,
    })
    if (found.docs.length > 0) participantId = (found.docs[0] as any).id
  }

  // Fall back to authed user → participant lookup
  if (participantId === null) {
    const cookieString = request.headers.get('cookie') || ''
    const { user } = await payload.auth({ headers: new Headers({ Cookie: cookieString }) })
    if (user) {
      const found = await payload.find({
        collection: 'session-participants',
        where: {
          and: [
            { session: { equals: sid } },
            { user: { equals: user.id } },
          ],
        },
        limit: 1,
        overrideAccess: true,
      })
      if (found.docs.length > 0) participantId = (found.docs[0] as any).id
    }
  }

  if (participantId === null) {
    return NextResponse.json({
      participantId: null,
      submittedPourOrders: [],
      reviews: [],
      guesses: [],
    })
  }

  // Find this participant's reviews in this session. depth: 0 keeps wine as an
  // id; we resolve pour order ourselves below.
  const reviewRes = await payload.find({
    collection: 'reviews',
    where: { sessionParticipant: { equals: participantId } },
    limit: 100,
    depth: 0,
    overrideAccess: true,
  })

  // This participant's guesses (blind tasting). Identity already resolved.
  const guessRes = await payload.find({
    collection: 'session-guesses',
    where: { sessionParticipant: { equals: participantId } },
    limit: 100,
    depth: 0,
    overrideAccess: true,
  })

  // Map reviews to pour orders via the session's plan wines.
  const session = await payload.findByID({
    collection: 'course-sessions',
    id: sid,
    depth: 2,
    overrideAccess: true,
  })

  const wines =
    session?.tastingPlan && typeof session.tastingPlan === 'object'
      ? (((session.tastingPlan as any).wines ?? []) as unknown[])
      : []

  const pourMaps = buildPourMaps(wines)

  const submittedPourOrders = new Set<number>()
  const reviews = (reviewRes.docs as any[]).map((r) => {
    const pourOrder = resolvePourForReview(r, pourMaps)
    if (pourOrder != null) submittedPourOrders.add(pourOrder)
    return {
      id: r.id,
      pourOrder,
      wine: r.wine ? (typeof r.wine === 'object' ? r.wine.id : r.wine) : null,
      customWine: r.customWine ?? null,
      rating: r.rating ?? null,
      buyAgain: r.buyAgain ?? false,
      reviewText: r.reviewText ?? null,
      wsetTasting: r.wsetTasting ?? null,
      publishedToProfile: r.publishedToProfile ?? false,
      submittedAt: r.submittedAt ?? null,
    }
  })

  const guesses = (guessRes.docs as any[]).map((g) => ({
    pourOrder: g.pourOrder,
    guessedCountry: g.guessedCountry ?? null,
    guessedGrape: g.guessedGrape ?? null,
    guessedPriceBucket: g.guessedPriceBucket ?? null,
    submittedAt: g.submittedAt ?? null,
  }))

  return NextResponse.json({
    participantId,
    submittedPourOrders: Array.from(submittedPourOrders).sort(),
    reviews,
    guesses,
  })
}
