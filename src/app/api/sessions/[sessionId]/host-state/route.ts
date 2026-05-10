import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('api-sessions-host-state')

/**
 * POST /api/sessions/[sessionId]/host-state
 *
 * Body: { currentLessonId: number }
 *
 * Updates course-sessions.currentLesson. Auth: Payload session, must be the
 * session's host (or admin). Triggers downstream SSE broadcasts within the
 * stream's 2s poll tick.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params
    const payload = await getPayload({ config })
    const cookieString = request.headers.get('cookie') || ''
    const { user } = await payload.auth({ headers: new Headers({ Cookie: cookieString }) })

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const session = await payload.findByID({
      collection: 'course-sessions',
      id: sessionId,
      depth: 0,
    })
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const hostId = typeof session.host === 'object' ? (session.host as any)?.id : session.host
    const isHost = hostId === user.id
    const isAdmin = user.role === 'admin'
    if (!isHost && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const raw = (body as any)?.currentLessonId
    const currentLessonId = typeof raw === 'number' ? raw : null
    if (currentLessonId === null) {
      return NextResponse.json({ error: 'currentLessonId must be a number' }, { status: 400 })
    }

    await payload.update({
      collection: 'course-sessions',
      id: sessionId,
      data: { currentLesson: currentLessonId },
      overrideAccess: true,
      depth: 0,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    log.error({ err }, 'host_state_failed')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
