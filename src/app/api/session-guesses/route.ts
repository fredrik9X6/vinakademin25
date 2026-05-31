import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { PARTICIPANT_COOKIE } from '@/lib/sessions'
import { loggerFor } from '@/lib/logger'
import type { PriceBucket } from '@/lib/blind-guess-vocab'

const log = loggerFor('api-session-guesses')

const PRICE_BUCKETS: ReadonlyArray<PriceBucket> = [
  '0_99',
  '100_149',
  '150_199',
  '200_249',
  '250_299',
  '300_plus',
]

interface ResolvedIdentity {
  userId: number | null
  participantId: number | null
}

async function resolveIdentity(
  payload: Awaited<ReturnType<typeof getPayload>>,
  request: NextRequest,
  sessionId: number,
): Promise<ResolvedIdentity> {
  const cookieString = request.headers.get('cookie') || ''
  const { user } = await payload.auth({ headers: new Headers({ Cookie: cookieString }) })

  if (user) {
    // Authed user: confirm they're either the host or have a participant row.
    const participantRes = await payload.find({
      collection: 'session-participants',
      where: {
        and: [{ session: { equals: sessionId } }, { user: { equals: user.id } }],
      },
      limit: 1,
      overrideAccess: true,
    })
    const participantId =
      participantRes.docs.length > 0 ? (participantRes.docs[0] as { id: number }).id : null
    return { userId: user.id, participantId }
  }

  // Guest: look up by participant cookie
  const cookieStore = await cookies()
  const token = cookieStore.get(PARTICIPANT_COOKIE)?.value
  if (!token) return { userId: null, participantId: null }
  const tokenRes = await payload.find({
    collection: 'session-participants',
    where: {
      and: [
        { session: { equals: sessionId } },
        { participantToken: { equals: token } },
      ],
    },
    limit: 1,
    overrideAccess: true,
  })
  if (tokenRes.docs.length === 0) return { userId: null, participantId: null }
  return { userId: null, participantId: (tokenRes.docs[0] as { id: number }).id }
}

function getRevealedPourOrders(session: unknown): number[] {
  const raw = (session as { revealedPourOrders?: unknown }).revealedPourOrders
  if (!Array.isArray(raw)) return []
  return raw.filter((n): n is number => typeof n === 'number')
}

function getPourOrders(session: unknown): number[] {
  const plan = (session as { tastingPlan?: unknown }).tastingPlan
  if (!plan || typeof plan !== 'object') return []
  const wines = (plan as { wines?: unknown[] }).wines ?? []
  return wines.map((w, idx) => {
    const p = (w as { pourOrder?: number }).pourOrder
    return p ?? idx + 1
  })
}

/**
 * POST /api/session-guesses
 * Body: { sessionId, pourOrder, guessedCountry?, guessedGrape?, guessedPriceBucket? }
 *
 * Upserts one guess per (session, pour, identity). Identity is either an
 * authed user OR a guest with a valid participant cookie. Rejects when the
 * wine has already been revealed or the session isn't active.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const sessionId = Number((body as { sessionId?: unknown }).sessionId)
    const pourOrder = Number((body as { pourOrder?: unknown }).pourOrder)
    if (!Number.isInteger(sessionId) || !Number.isInteger(pourOrder) || pourOrder < 1) {
      return NextResponse.json({ error: 'Invalid sessionId / pourOrder' }, { status: 400 })
    }

    const guessedCountryRaw = (body as { guessedCountry?: unknown }).guessedCountry
    const guessedGrapeRaw = (body as { guessedGrape?: unknown }).guessedGrape
    const guessedPriceBucketRaw = (body as { guessedPriceBucket?: unknown }).guessedPriceBucket
    const submittedAtRaw = (body as { submittedAt?: unknown }).submittedAt
    const submittedAt =
      typeof submittedAtRaw === 'string' && submittedAtRaw.length > 0 ? submittedAtRaw : undefined

    const guessedCountry =
      typeof guessedCountryRaw === 'string' && guessedCountryRaw.trim().length > 0
        ? guessedCountryRaw.trim()
        : null
    const guessedGrape =
      typeof guessedGrapeRaw === 'string' && guessedGrapeRaw.trim().length > 0
        ? guessedGrapeRaw.trim()
        : null
    const guessedPriceBucket =
      typeof guessedPriceBucketRaw === 'string' &&
      (PRICE_BUCKETS as ReadonlyArray<string>).includes(guessedPriceBucketRaw)
        ? (guessedPriceBucketRaw as PriceBucket)
        : null

    if (!guessedCountry && !guessedGrape && !guessedPriceBucket) {
      return NextResponse.json(
        { error: 'At least one of guessedCountry / guessedGrape / guessedPriceBucket required' },
        { status: 400 },
      )
    }

    const payload = await getPayload({ config })

    const session = await payload
      .findByID({ collection: 'course-sessions', id: sessionId, depth: 2, overrideAccess: true })
      .catch(() => null)
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    if (session.status !== 'active') {
      return NextResponse.json({ error: 'Session is not active' }, { status: 400 })
    }

    const validPours = new Set(getPourOrders(session))
    if (!validPours.has(pourOrder)) {
      return NextResponse.json({ error: 'Pour order not in session plan' }, { status: 400 })
    }

    const revealed = new Set(getRevealedPourOrders(session))
    if (revealed.has(pourOrder)) {
      return NextResponse.json({ error: 'Vinet är redan avslöjat' }, { status: 400 })
    }

    const identity = await resolveIdentity(payload, request, sessionId)
    if (identity.userId == null && identity.participantId == null) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Find existing row by identity + pour
    const existingWhere: any = {
      and: [
        { session: { equals: sessionId } },
        { pourOrder: { equals: pourOrder } },
      ],
    }
    if (identity.participantId != null) {
      existingWhere.and.push({ sessionParticipant: { equals: identity.participantId } })
    } else if (identity.userId != null) {
      existingWhere.and.push({ user: { equals: identity.userId } })
    }
    const existing = await payload.find({
      collection: 'session-guesses',
      where: existingWhere,
      limit: 1,
      overrideAccess: true,
    })

    const data = {
      session: sessionId,
      sessionParticipant: identity.participantId,
      user: identity.userId,
      pourOrder,
      guessedCountry,
      guessedGrape,
      guessedPriceBucket,
      ...(submittedAt ? { submittedAt: new Date().toISOString() } : {}),
    }

    if (existing.docs.length > 0) {
      const id = (existing.docs[0] as { id: number }).id
      const updated = await payload.update({
        collection: 'session-guesses',
        id,
        data,
        overrideAccess: true,
      })
      return NextResponse.json({ doc: updated })
    }

    const created = await payload.create({
      collection: 'session-guesses',
      data,
      overrideAccess: true,
    })
    return NextResponse.json({ doc: created })
  } catch (err) {
    log.error({ err }, 'session_guess_post_failed')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * GET /api/session-guesses?session=<id>
 *
 * Returns the calling identity's own guesses for the given session, keyed by
 * pourOrder. Used by the live guest UI to hydrate after page refresh.
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const sessionId = Number(url.searchParams.get('session'))
    if (!Number.isInteger(sessionId)) {
      return NextResponse.json({ error: 'Invalid session id' }, { status: 400 })
    }
    const payload = await getPayload({ config })
    const identity = await resolveIdentity(payload, request, sessionId)
    if (identity.userId == null && identity.participantId == null) {
      return NextResponse.json({ guesses: [] })
    }

    const where: any = {
      and: [{ session: { equals: sessionId } }],
    }
    if (identity.participantId != null) {
      where.and.push({ sessionParticipant: { equals: identity.participantId } })
    } else if (identity.userId != null) {
      where.and.push({ user: { equals: identity.userId } })
    }

    const res = await payload.find({
      collection: 'session-guesses',
      where,
      limit: 100,
      overrideAccess: true,
    })

    return NextResponse.json({
      guesses: res.docs.map((d) => {
        const doc = d as {
          pourOrder: number
          guessedCountry?: string | null
          guessedGrape?: string | null
          guessedPriceBucket?: PriceBucket | null
          submittedAt?: string | null
        }
        return {
          pourOrder: doc.pourOrder,
          guessedCountry: doc.guessedCountry ?? null,
          guessedGrape: doc.guessedGrape ?? null,
          guessedPriceBucket: doc.guessedPriceBucket ?? null,
          submittedAt: doc.submittedAt ?? null,
        }
      }),
    })
  } catch (err) {
    log.error({ err }, 'session_guess_get_failed')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
