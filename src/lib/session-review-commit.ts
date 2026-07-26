import type { NextRequest } from 'next/server'
import { ValidationError, type Payload } from 'payload'
import type { CourseSession, User } from '@/payload-types'
import { loggerFor } from '@/lib/logger'
import { resolveWineIdentityForPour } from '@/lib/session-pour-mapping'

const log = loggerFor('session-review-commit')

export interface SessionReviewIdentity {
  /** Full authenticated user doc (from payload.auth()), or null for a guest
   *  (participant-cookie only). Threaded through to `req.user` on the
   *  Payload write exactly as the original inline code did, so any
   *  access-control/hook that inspects more than `.id` keeps working — e.g.
   *  Reviews' beforeChange hook reads `req.user.role` (admin/instructor
   *  bypass) in addition to `.id` (ownership check). Callers must pass the
   *  real user doc, not a reconstructed `{ id }` stub, or that role check is
   *  silently dead on this path. */
  user: User | null
  /** session-participants row id for this identity — the guest's own row, or
   *  the authenticated caller's row if they have one (null for a host with no
   *  participant row of their own). */
  participantId: number | null
}

export interface SessionReviewCommitInput {
  /** Already-fetched session doc (depth 2, overrideAccess true) — callers
   *  fetch this themselves for their own 404/422 handling, so this helper
   *  never re-fetches it. */
  sessionDoc: CourseSession
  sessionId: number
  pourOrder: number
  identity: SessionReviewIdentity
  rating?: unknown
  buyAgain?: unknown
  reviewText?: unknown
  wsetTasting?: unknown
  publishedToProfile?: unknown
  /** When true, stamps submittedAt with a fresh server-generated timestamp
   *  (an explicit lock-in). When false/omitted, the key is still present on
   *  the write payload but with value `undefined` — matching the original
   *  inline behaviour exactly, so a bare autosave tick from WineReviewForm's
   *  per-keystroke queueSave (which never sends submittedAt) does not
   *  prematurely flip a draft into "locked in". */
  stampSubmittedAt?: boolean
}

export type SessionReviewCommitResult =
  | { ok: true; doc: Record<string, unknown> }
  | { ok: false; httpStatus: number; error: string; details?: string }

/**
 * Resolves a session review's wine identity server-side from (session,
 * pourOrder) and upserts it — the blind-tasting write path Phase 1 hardened
 * (see POST /api/reviews history: identity is never sent back to a guest
 * client, depth:0, participant-or-host authorization gate, suppressed
 * validation-error field detail). Shared by POST /api/reviews (its
 * session+pourOrder branch, when the caller sent no wine/customWine) and
 * POST /api/sessions/[sessionId]/wines/[pourOrder]/commit, so both write
 * paths carry the SAME guarantees. Do not duplicate this logic — extend it.
 *
 * `submittedAt` is stamped only when the caller passes `stampSubmittedAt`
 * (an explicit lock-in) — POST /api/reviews' autosave ticks route through
 * here too (same session+pourOrder branch) and must not flip a draft into
 * "locked in" on every keystroke.
 */
export async function commitSessionReview(
  payload: Payload,
  request: NextRequest,
  input: SessionReviewCommitInput,
): Promise<SessionReviewCommitResult> {
  const { sessionDoc, sessionId, pourOrder, identity } = input
  const isGuest = identity.user == null

  // Authorization for authenticated (non-guest) callers only. Guests are
  // exempt: their sessionId is already tied to their own participant-cookie
  // token by the caller, so there's nothing to authorize here.
  if (!isGuest) {
    const hostField = (sessionDoc as unknown as { host?: unknown }).host
    const hostId = hostField
      ? typeof hostField === 'object'
        ? (hostField as { id: number }).id
        : (hostField as number)
      : null
    const isHost = hostId != null && Number(hostId) === Number(identity.user!.id)
    if (identity.participantId == null && !isHost) {
      log.warn(
        { userId: identity.user!.id, session: sessionId },
        'Forbidden: caller is neither a participant nor the host of this session',
      )
      return {
        ok: false,
        httpStatus: 403,
        error: 'Forbidden',
        details: 'You are not a participant or host of this session',
      }
    }
  }

  const planWines =
    sessionDoc.tastingPlan && typeof sessionDoc.tastingPlan === 'object'
      ? (((sessionDoc.tastingPlan as { wines?: unknown[] }).wines ?? []) as unknown[])
      : []
  const resolved = resolveWineIdentityForPour(planWines, pourOrder)
  if (!resolved) {
    log.warn({ session: sessionId, pourOrder }, 'Could not resolve wine identity for pour')
    return {
      ok: false,
      httpStatus: 422,
      error: 'Unknown wine',
      details: `No wine at pour order ${pourOrder} in this session's plan`,
    }
  }

  const wineId = resolved.wine
  const customWine = resolved.customWine

  const rating = typeof input.rating === 'number' && input.rating > 0 ? input.rating : null
  const buyAgain = Boolean(input.buyAgain)
  const reviewText = typeof input.reviewText === 'string' ? input.reviewText : ''
  const wsetTasting =
    input.wsetTasting && typeof input.wsetTasting === 'object'
      ? (input.wsetTasting as Record<string, unknown>)
      : {}
  const publishedToProfile = Boolean(input.publishedToProfile)

  const reviewData: Record<string, unknown> = {
    // Resolved identity is authoritative — exactly one of wine/customWine.
    wine: wineId ?? null,
    customWine: customWine ?? null,
    session: sessionId,
    user: isGuest ? null : identity.user!.id,
    sessionParticipant: identity.participantId,
    rating,
    buyAgain,
    reviewText,
    wsetTasting,
    publishedToProfile,
    submittedAt: input.stampSubmittedAt ? new Date().toISOString() : undefined,
  }

  // Dedup mirrors POST /api/reviews exactly: a guest keys on their
  // sessionParticipant row; an authenticated caller (participant or host)
  // keys on `user`, even though sessionParticipant is also persisted (so
  // /my-submissions, which filters strictly on sessionParticipant, can still
  // find it).
  const buildBaseWhere = () =>
    isGuest
      ? ({ and: [{ sessionParticipant: { equals: identity.participantId } }] } as {
          and: unknown[]
        })
      : ({ and: [{ user: { equals: identity.user!.id } }] } as { and: unknown[] })

  let whereConditions: { and: unknown[] }
  if (wineId != null) {
    whereConditions = buildBaseWhere()
    whereConditions.and.push({ wine: { equals: wineId } })
    whereConditions.and.push({ session: { equals: sessionId } })
  } else {
    whereConditions = buildBaseWhere()
    whereConditions.and.push({ session: { equals: sessionId } })
    const productNumber = customWine?.systembolagetProductNumber
    if (productNumber) {
      whereConditions.and.push({
        'customWine.systembolagetProductNumber': { equals: String(productNumber) },
      })
    } else {
      whereConditions.and.push({
        'customWine.name': { equals: String(customWine?.name ?? '').trim() },
      })
    }
  }

  try {
    const existing = await payload.find({
      collection: 'reviews',
      where: whereConditions as any,
      limit: 1,
      // overrideAccess MUST be true here, for guests AND authenticated callers.
      //
      // This is an internal dedup lookup whose `where` is already scoped to the
      // caller's own identity (user.id or participantId) plus session and wine,
      // so it can only ever match a row the caller owns — access control adds
      // nothing and actively breaks it: no `req` is passed, so Reviews.access
      // .read sees `req.user === undefined` and falls to its unauthenticated
      // branch (isTrusted / publishedToProfile only). An authenticated host's
      // own unpublished draft matches neither, the find returned 0, and every
      // autosave CREATEd a new row instead of updating.
      //
      // That produced 55 duplicate rows in one session on 2026-07-26. Guests
      // were unaffected only because they already passed true here.
      overrideAccess: true,
    })

    const reqBase = isGuest
      ? ({ ...request, payload } as any)
      : ({ ...request, user: identity.user, payload } as any)

    let review: unknown
    if (existing.totalDocs > 0) {
      review = await payload.update({
        collection: 'reviews',
        id: existing.docs[0].id,
        data: reviewData,
        // depth:0 — the response must not populate the wine relationship.
        depth: 0,
        overrideAccess: isGuest,
        req: reqBase,
      })
    } else {
      review = await payload.create({
        collection: 'reviews',
        data: reviewData,
        depth: 0,
        overrideAccess: isGuest,
        req: reqBase,
      })
    }

    // Never hand wine identity back — this path always resolved it
    // server-side, so the caller never sent it and must not receive it either.
    const { wine: _omittedWine, customWine: _omittedCustomWine, ...rest } = review as Record<
      string,
      unknown
    >
    return { ok: true, doc: rest }
  } catch (err) {
    if (err instanceof ValidationError) {
      // Field detail is suppressed unconditionally on this path (unlike the
      // generic /api/reviews branches) — the caller never sent wine identity,
      // so it must never be able to read it back out of a validation error.
      log.warn({ err }, 'session_review_commit_validation_failed')
      return { ok: false, httpStatus: 422, error: 'Validation failed', details: err.message }
    }
    log.error({ err }, 'session_review_commit_failed')
    return { ok: false, httpStatus: 500, error: 'Internal error' }
  }
}
