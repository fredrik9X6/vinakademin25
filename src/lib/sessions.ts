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
