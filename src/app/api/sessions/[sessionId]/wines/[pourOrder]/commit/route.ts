import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { PARTICIPANT_COOKIE } from '@/lib/sessions'
import { loggerFor } from '@/lib/logger'
import { draftHasContent } from '@/lib/session-draft-queue'
import { summariseCommit, type CommitPartResult } from '@/lib/session-commit'
import {
  PRICE_BUCKETS,
  commitSessionGuess,
  type SessionGuessIdentity,
} from '@/lib/session-guess-commit'
import {
  commitSessionReview,
  type SessionReviewIdentity,
} from '@/lib/session-review-commit'
import type { PriceBucket } from '@/lib/blind-guess-vocab'

const log = loggerFor('api-session-commit')

/**
 * POST /api/sessions/[sessionId]/wines/[pourOrder]/commit
 * Body: { guess?: object, review?: object }
 *
 * The single "Klar med vin #N" lock-in. Replaces the two separate explicit
 * lock-ins (BlindGuessCard's "Lås in" against /api/session-guesses, and
 * WineReviewForm's "Klar / Lås in" against /api/reviews) with one write.
 *
 * Both parts are optional and independent: a participant who guessed but
 * wrote no note (or vice versa) has still legitimately finished the wine —
 * an absent or content-free part is reported 'skipped', never 'failed'. Each
 * present part is upserted via the SAME shared helpers the original two
 * endpoints use (commitSessionGuess / commitSessionReview), so this endpoint
 * never reimplements — and can never fork — the blindness hardening those
 * write paths carry (server-side wine-identity resolution, participant-or-
 * host authorization, depth:0, suppressed validation-error field detail).
 *
 * Response never includes wine identity on any path, including errors — only
 * per-part status strings.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; pourOrder: string }> },
) {
  try {
    const { sessionId: sessionIdRaw, pourOrder: pourOrderRaw } = await params
    const sessionId = Number(sessionIdRaw)
    const pourOrder = Number(pourOrderRaw)
    if (!Number.isInteger(sessionId) || !Number.isInteger(pourOrder) || pourOrder < 1) {
      return NextResponse.json({ error: 'Invalid sessionId / pourOrder' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const guessBody = (body as { guess?: unknown }).guess
    const reviewBody = (body as { review?: unknown }).review

    const payload = await getPayload({ config })

    // Identity: participant cookie first, then the authenticated user's own
    // session-participants row. Mirrors
    // src/app/api/sessions/[sessionId]/my-submissions/route.ts exactly — do
    // not invent a third identity scheme.
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
            { session: { equals: sessionId } },
            { participantToken: { equals: participantToken } },
          ],
        },
        limit: 1,
        overrideAccess: true,
      })
      if (found.docs.length > 0) participantId = (found.docs[0] as { id: number }).id
    }
    if (participantId === null && user) {
      const found = await payload.find({
        collection: 'session-participants',
        where: { and: [{ session: { equals: sessionId } }, { user: { equals: user.id } }] },
        limit: 1,
        overrideAccess: true,
      })
      if (found.docs.length > 0) participantId = (found.docs[0] as { id: number }).id
    }

    const sessionDoc = await payload.findByID({
      collection: 'course-sessions',
      id: sessionId,
      depth: 2,
      overrideAccess: true,
      disableErrors: true,
    })
    if (!sessionDoc) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Host determination (mirrors my-submissions.ts / reviews.ts): a host may
    // have no session-participants row of their own, but is still allowed to
    // write. Guarded against `host` being a bare id vs a populated object,
    // and never `typeof host === 'object'` before confirming it's truthy.
    const hostField = (sessionDoc as unknown as { host?: unknown }).host
    const hostId = hostField
      ? typeof hostField === 'object'
        ? (hostField as { id: number }).id
        : (hostField as number)
      : null
    const isHost = Boolean(user && hostId != null && Number(hostId) === Number(user.id))

    if (participantId === null && !isHost) {
      if (!user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      log.warn(
        { userId: user.id, sessionId },
        'Forbidden: caller is neither a participant nor the host of this session',
      )
      return NextResponse.json(
        { error: 'Forbidden', details: 'You are not a participant or host of this session' },
        { status: 403 },
      )
    }

    const guessIdentity: SessionGuessIdentity = {
      userId: user ? user.id : null,
      participantId,
    }
    const reviewIdentity: SessionReviewIdentity = {
      // Full authenticated user doc (or null for a guest) — required so
      // Reviews' beforeChange hook can read `.role`, not just `.id`.
      user,
      participantId,
    }

    let guessStatus: CommitPartResult = 'skipped'
    if (
      guessBody &&
      typeof guessBody === 'object' &&
      draftHasContent(guessBody as Record<string, unknown>)
    ) {
      const g = guessBody as Record<string, unknown>
      const guessedCountry =
        typeof g.guessedCountry === 'string' && g.guessedCountry.trim().length > 0
          ? g.guessedCountry.trim()
          : null
      const guessedGrape =
        typeof g.guessedGrape === 'string' && g.guessedGrape.trim().length > 0
          ? g.guessedGrape.trim()
          : null
      const guessedPriceBucket =
        typeof g.guessedPriceBucket === 'string' &&
        (PRICE_BUCKETS as ReadonlyArray<string>).includes(g.guessedPriceBucket)
          ? (g.guessedPriceBucket as PriceBucket)
          : null

      const result = await commitSessionGuess(payload, {
        sessionDoc,
        sessionId,
        pourOrder,
        identity: guessIdentity,
        guessedCountry,
        guessedGrape,
        guessedPriceBucket,
        stampSubmittedAt: true,
      })
      guessStatus = result.ok ? 'ok' : 'failed'
      if (!result.ok) {
        log.warn({ sessionId, pourOrder, error: result.error }, 'commit_guess_part_failed')
      }
    }

    let reviewStatus: CommitPartResult = 'skipped'
    if (
      reviewBody &&
      typeof reviewBody === 'object' &&
      draftHasContent(reviewBody as Record<string, unknown>)
    ) {
      const r = reviewBody as Record<string, unknown>
      const result = await commitSessionReview(payload, request, {
        sessionDoc,
        sessionId,
        pourOrder,
        identity: reviewIdentity,
        rating: r.rating,
        buyAgain: r.buyAgain,
        reviewText: r.reviewText,
        wsetTasting: r.wsetTasting,
        publishedToProfile: r.publishedToProfile,
        stampSubmittedAt: true,
      })
      reviewStatus = result.ok ? 'ok' : 'failed'
      if (!result.ok) {
        log.warn({ sessionId, pourOrder, error: result.error }, 'commit_review_part_failed')
      }
    }

    const { ok } = summariseCommit({ guess: guessStatus, review: reviewStatus })
    return NextResponse.json({ guess: guessStatus, review: reviewStatus, ok })
  } catch (err) {
    log.error({ err }, 'session_commit_failed')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
