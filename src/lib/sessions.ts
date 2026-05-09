import type { Payload } from 'payload'
import type { CourseSession, SessionParticipant, Vinprovningar } from '@/payload-types'
import { loggerFor } from './logger'

const log = loggerFor('lib-sessions')

/**
 * httpOnly cookie set on `/api/sessions/join` so subsequent reads can identify
 * the participant — including unauthenticated guests — without requiring a
 * `?session=<id>` query param on every URL.
 */
export const PARTICIPANT_COOKIE = 'vk_participant_token'
export const PARTICIPANT_COOKIE_MAX_AGE_SECONDS = 24 * 60 * 60

interface GetActiveParticipantInput {
  payload: Payload
  participantToken: string | undefined | null
  /** When provided, only returns a participant whose session targets this course. */
  forCourseId?: number
}

export interface ActiveParticipantSession {
  participant: SessionParticipant
  session: CourseSession
}

/**
 * Resolves a guest's `vk_participant_token` cookie to an active session
 * participant. Returns null when the token is missing, unknown, the session is
 * no longer active or has expired, or (when `forCourseId` is given) the
 * session's course doesn't match.
 *
 * Used by lesson/quiz pages to recognize unauthenticated guests as session
 * participants even when navigation drops the `?session=…` query param.
 */
export async function getActiveParticipantSession({
  payload,
  participantToken,
  forCourseId,
}: GetActiveParticipantInput): Promise<ActiveParticipantSession | null> {
  if (!participantToken) return null

  try {
    const partRes = await payload.find({
      collection: 'session-participants',
      where: { participantToken: { equals: participantToken } },
      limit: 1,
      depth: 2,
    })
    const participant = partRes.docs[0]
    if (!participant || !participant.isActive) return null

    const session = (typeof participant.session === 'object' ? participant.session : null) as
      | CourseSession
      | null
    if (!session || session.status !== 'active') return null

    if (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now()) return null

    if (forCourseId !== undefined) {
      const sessionCourseId =
        typeof session.course === 'object' ? (session.course as Vinprovningar).id : session.course
      if (sessionCourseId !== forCourseId) return null
    }

    return { participant, session }
  } catch (err) {
    log.error({ err }, 'getActiveParticipantSession_failed')
    return null
  }
}

export type LookupStatus =
  | 'active'
  | 'paused'
  | 'completed'
  | 'expired'
  | 'full'
  | 'not_found'

export interface LookupSessionResult {
  status: LookupStatus
  course?: { title: string; slug: string }
  sessionName?: string | null
  participantCount?: number
  maxParticipants?: number | null
}

const JOIN_CODE_RE = /^[A-Z0-9]{6}$/

/**
 * Resolves a 6-char join code to a status flag the /delta landing page can
 * branch on. Mirrors the entry-condition checks in /api/sessions/join but
 * has no side effects — it's a read-only twin so the page can render the
 * right UI before asking the user for a nickname.
 *
 * Malformed codes (wrong length, non-alphanumeric) collapse into 'not_found'
 * — same UX, less branching at call sites.
 *
 * Note: `/api/sessions/join` performs the same eligibility checks inline
 * for its mutation phase. Keep both in sync when changing join semantics.
 */
export async function lookupSessionByCode(
  payload: Payload,
  code: string | null | undefined,
): Promise<LookupSessionResult> {
  const normalized = (code ?? '').trim().toUpperCase()
  if (!JOIN_CODE_RE.test(normalized)) {
    return { status: 'not_found' }
  }

  try {
    const res = await payload.find({
      collection: 'course-sessions',
      where: { joinCode: { equals: normalized } },
      limit: 1,
      depth: 1, // populate `course`
    })
    const session = res.docs[0]
    if (!session) return { status: 'not_found' }

    const courseRef = session.course
    const course =
      typeof courseRef === 'object' && courseRef
        ? { title: courseRef.title, slug: courseRef.slug || String(courseRef.id) }
        : undefined

    const baseFields: Pick<LookupSessionResult, 'course' | 'sessionName' | 'participantCount' | 'maxParticipants'> = {
      course,
      sessionName: session.sessionName ?? null,
      participantCount: Number(session.participantCount ?? 0),
      maxParticipants:
        session.maxParticipants !== null && session.maxParticipants !== undefined
          ? Number(session.maxParticipants)
          : null,
    }

    if (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now()) {
      return { status: 'expired', ...baseFields }
    }
    if (session.status === 'completed') {
      return { status: 'completed', ...baseFields }
    }
    if (session.status === 'paused') {
      return { status: 'paused', ...baseFields }
    }
    if (
      baseFields.maxParticipants != null &&
      (baseFields.participantCount ?? 0) >= baseFields.maxParticipants
    ) {
      return { status: 'full', ...baseFields }
    }
    return { status: 'active', ...baseFields }
  } catch (err) {
    log.error({ err, code: normalized }, 'lookupSessionByCode_failed')
    // Treat infrastructure errors as not_found — the UI can already handle that
    // state and we don't want to leak a 500 to a public landing page.
    return { status: 'not_found' }
  }
}
