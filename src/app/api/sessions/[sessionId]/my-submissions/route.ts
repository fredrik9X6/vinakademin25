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

  // Identify caller: cookie first, then payload-token user. Resolved once up
  // front (rather than only inside the fallback branch) because the
  // authenticated user is also needed below to determine host-ness for blind
  // redaction — a cookie-carrying participant may still be logged in.
  const cookieStore = await cookies()
  const participantToken = cookieStore.get(PARTICIPANT_COOKIE)?.value ?? null
  const cookieString = request.headers.get('cookie') || ''
  const { user } = await payload.auth({ headers: new Headers({ Cookie: cookieString }) })

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
  if (participantId === null && user) {
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

  // Blind-redaction inputs. Mirrors the host-determination in
  // mina-provningar/planer/[id]/page.tsx: compare the authenticated user's id
  // against the session's host, guarding against `host` being a bare id vs a
  // populated object (and never doing `typeof host === 'object'` before
  // confirming `host` is truthy — `typeof null === 'object'` in JS).
  const isBlind = Boolean((session as any)?.blindTasting)
  const revealedPourOrders = new Set<number>(
    Array.isArray((session as any)?.revealedPourOrders)
      ? ((session as any).revealedPourOrders as number[])
      : [],
  )
  const hostField = (session as any)?.host
  const hostId = hostField ? (typeof hostField === 'object' ? hostField.id : hostField) : null
  const isHost = Boolean(user && hostId != null && Number(hostId) === Number(user.id))

  const submittedPourOrders = new Set<number>()
  const reviews = (reviewRes.docs as any[]).map((r) => {
    // Resolve pour order from the un-redacted row FIRST — submittedPourOrders
    // must reflect what was actually submitted regardless of redaction below.
    const pourOrder = resolvePourForReview(r, pourMaps)
    if (pourOrder != null) submittedPourOrders.add(pourOrder)

    // Finding 1: this endpoint must never hand a guest the identity of a wine
    // the host hasn't revealed yet. Redact wine/customWine when the session
    // is blind, the caller isn't the host, and this pour isn't revealed
    // (including when the pour couldn't be resolved at all — fail closed).
    const shouldRedact = isBlind && !isHost && !(pourOrder != null && revealedPourOrders.has(pourOrder))

    return {
      id: r.id,
      pourOrder,
      wine: shouldRedact ? null : r.wine ? (typeof r.wine === 'object' ? r.wine.id : r.wine) : null,
      customWine: shouldRedact ? null : (r.customWine ?? null),
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
