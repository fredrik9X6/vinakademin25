import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { cookies } from 'next/headers'
import { PARTICIPANT_COOKIE } from '@/lib/sessions'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('api-sessions-participant-state')

/**
 * POST /api/sessions/[sessionId]/participant-state
 *
 * Body (all optional): { currentLessonId?: number }
 *
 * Updates the calling participant's currentLessonId (if provided) and bumps
 * lastActivityAt. Empty-body calls are valid heartbeats.
 *
 * Auth: vk_participant_token cookie (guests) OR Payload session for an authed
 * user who is a participant of this session.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params
    const payload = await getPayload({ config })

    const cookieStore = await cookies()
    const participantToken = cookieStore.get(PARTICIPANT_COOKIE)?.value
    const cookieString = request.headers.get('cookie') || ''
    const { user } = await payload.auth({ headers: new Headers({ Cookie: cookieString }) })

    let participant
    if (participantToken) {
      const res = await payload.find({
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
      participant = res.docs[0]
    } else if (user) {
      const res = await payload.find({
        collection: 'session-participants',
        where: {
          and: [{ session: { equals: sessionId } }, { user: { equals: user.id } }],
        },
        limit: 1,
        overrideAccess: true,
      })
      participant = res.docs[0]
    }

    if (!participant) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const raw = (body as any)?.currentLessonId
    const currentLessonId =
      typeof raw === 'number' ? raw : raw === null ? null : undefined

    const data: Record<string, unknown> = {
      lastActivityAt: new Date().toISOString(),
    }
    if (currentLessonId !== undefined) {
      data.currentLessonId = currentLessonId
    }

    await payload.update({
      collection: 'session-participants',
      id: participant.id,
      data,
      overrideAccess: true,
      depth: 0,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    log.error({ err }, 'participant_state_failed')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
