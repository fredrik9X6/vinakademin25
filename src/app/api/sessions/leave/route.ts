import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { cookies } from 'next/headers'
import { loggerFor } from '@/lib/logger'
import { PARTICIPANT_COOKIE } from '@/lib/sessions'

const log = loggerFor('api-sessions-leave')

/**
 * POST /api/sessions/leave
 *
 * Marks the caller's participant inactive in the given session. Works for
 * both authenticated users (looked up by `user`) and anonymous guests
 * (looked up by the `vk_participant_token` cookie).
 *
 * Body:
 * - sessionId: string | number (required)
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const cookieString = request.headers.get('cookie') || ''
    const { user } = await payload.auth({
      headers: new Headers({ Cookie: cookieString }),
    })

    const cookieStore = await cookies()
    const participantToken = cookieStore.get(PARTICIPANT_COOKIE)?.value

    const body = await request.json().catch(() => ({}))
    const { sessionId } = body as { sessionId?: string | number }

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    if (!user && !participantToken) {
      return NextResponse.json(
        { error: 'No identity to leave with (need cookie or login)' },
        { status: 401 },
      )
    }

    const where = user
      ? {
          and: [{ session: { equals: Number(sessionId) } }, { user: { equals: user.id } }],
        }
      : {
          and: [
            { session: { equals: Number(sessionId) } },
            { participantToken: { equals: participantToken } },
          ],
        }

    const participants = await payload.find({
      collection: 'session-participants',
      where: where as any,
      limit: 1,
    })

    if (participants.totalDocs === 0) {
      // Nothing to do — clear the cookie regardless and succeed quietly
      const ok = NextResponse.json(
        { success: true, message: 'Nothing to leave' },
        { status: 200 },
      )
      ok.cookies.delete(PARTICIPANT_COOKIE)
      return ok
    }

    const participant = participants.docs[0]

    if (participant.isActive) {
      await payload.update({
        collection: 'session-participants',
        id: participant.id,
        data: { isActive: false },
      })

      // Decrement participant count (best-effort; will be replaced with
      // derived counts in a later phase)
      const session = await payload.findByID({
        collection: 'course-sessions',
        id: Number(sessionId),
      })
      if (session) {
        const newCount = Math.max(0, (session.participantCount || 1) - 1)
        await payload.update({
          collection: 'course-sessions',
          id: Number(sessionId),
          data: { participantCount: newCount },
        })
      }
    }

    const response = NextResponse.json(
      { success: true, message: 'Successfully left session' },
      { status: 200 },
    )
    response.cookies.delete(PARTICIPANT_COOKIE)
    return response
  } catch (error) {
    log.error('Error leaving session:', error)
    return NextResponse.json(
      {
        error: 'Failed to leave session',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
