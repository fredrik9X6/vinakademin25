import type { Payload } from 'payload'
import type { CourseSession } from '@/payload-types'
import { loggerFor } from '@/lib/logger'
import type { PriceBucket } from '@/lib/blind-guess-vocab'

const log = loggerFor('session-guess-commit')

export const PRICE_BUCKETS: ReadonlyArray<PriceBucket> = [
  '0_99',
  '100_149',
  '150_199',
  '200_249',
  '250_299',
  '300_plus',
]

export interface SessionGuessIdentity {
  userId: number | null
  participantId: number | null
}

export interface SessionGuessCommitInput {
  /** Already-fetched session doc (depth 2, overrideAccess true) — callers
   *  fetch this themselves for their own 404 handling, so this helper never
   *  re-fetches it. */
  sessionDoc: CourseSession
  sessionId: number
  pourOrder: number
  identity: SessionGuessIdentity
  guessedCountry: string | null
  guessedGrape: string | null
  guessedPriceBucket: PriceBucket | null
  /** When true, stamps submittedAt with a fresh server-generated timestamp
   *  (the "lock in" case). When false/omitted, the field is left untouched —
   *  matches autosave, which must not clobber a prior lock-in timestamp. */
  stampSubmittedAt?: boolean
}

export type SessionGuessCommitResult =
  | { ok: true; doc: Record<string, unknown> }
  | { ok: false; httpStatus: number; error: string }

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
 * Upserts one blind-guess row for (session, pour, identity). Shared by
 * POST /api/session-guesses (autosave + its own "Lås in") and
 * POST /api/sessions/[sessionId]/wines/[pourOrder]/commit, so both write
 * paths carry the exact same validation (active session, pour in plan, not
 * yet revealed) and upsert semantics. Do not duplicate this logic — extend it.
 */
export async function commitSessionGuess(
  payload: Payload,
  input: SessionGuessCommitInput,
): Promise<SessionGuessCommitResult> {
  const {
    sessionDoc,
    sessionId,
    pourOrder,
    identity,
    guessedCountry,
    guessedGrape,
    guessedPriceBucket,
    stampSubmittedAt,
  } = input

  if (!guessedCountry && !guessedGrape && !guessedPriceBucket) {
    return {
      ok: false,
      httpStatus: 400,
      error: 'At least one of guessedCountry / guessedGrape / guessedPriceBucket required',
    }
  }

  if (sessionDoc.status !== 'active') {
    return { ok: false, httpStatus: 400, error: 'Session is not active' }
  }

  const validPours = new Set(getPourOrders(sessionDoc))
  if (!validPours.has(pourOrder)) {
    return { ok: false, httpStatus: 400, error: 'Pour order not in session plan' }
  }

  const revealed = new Set(getRevealedPourOrders(sessionDoc))
  if (revealed.has(pourOrder)) {
    return { ok: false, httpStatus: 400, error: 'Vinet är redan avslöjat' }
  }

  if (identity.userId == null && identity.participantId == null) {
    return { ok: false, httpStatus: 401, error: 'Authentication required' }
  }

  const existingWhere: any = {
    and: [{ session: { equals: sessionId } }, { pourOrder: { equals: pourOrder } }],
  }
  if (identity.participantId != null) {
    existingWhere.and.push({ sessionParticipant: { equals: identity.participantId } })
  } else if (identity.userId != null) {
    existingWhere.and.push({ user: { equals: identity.userId } })
  }

  try {
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
      ...(stampSubmittedAt ? { submittedAt: new Date().toISOString() } : {}),
    }

    let doc: unknown
    if (existing.docs.length > 0) {
      doc = await payload.update({
        collection: 'session-guesses',
        id: (existing.docs[0] as { id: number }).id,
        data,
        overrideAccess: true,
      })
    } else {
      doc = await payload.create({
        collection: 'session-guesses',
        data,
        overrideAccess: true,
      })
    }
    return { ok: true, doc: doc as Record<string, unknown> }
  } catch (err) {
    log.error({ err }, 'session_guess_commit_failed')
    return { ok: false, httpStatus: 500, error: 'Internal error' }
  }
}
