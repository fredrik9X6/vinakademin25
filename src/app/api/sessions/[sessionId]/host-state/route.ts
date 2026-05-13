import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('api-sessions-host-state')

/**
 * POST /api/sessions/[sessionId]/host-state
 *
 * Body: { currentLessonId: number } (course mode — writes course-sessions.currentLesson)
 *   OR  { currentWinePourOrder: number } (plan mode — writes course-sessions.currentWinePourOrder)
 *
 * Auth: Payload session, must be the session's host (or admin). Triggers
 * downstream SSE broadcasts within the stream's 2s poll tick.
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
    const rawLesson = (body as any)?.currentLessonId
    const rawWine = (body as any)?.currentWinePourOrder
    const currentLessonId = typeof rawLesson === 'number' ? rawLesson : null
    const currentWinePourOrder = typeof rawWine === 'number' ? rawWine : null

    if (currentLessonId === null && currentWinePourOrder === null) {
      return NextResponse.json(
        { error: 'currentLessonId or currentWinePourOrder must be a number' },
        { status: 400 },
      )
    }

    const data: Record<string, unknown> = {}
    if (currentLessonId !== null) data.currentLesson = currentLessonId
    if (currentWinePourOrder !== null) data.currentWinePourOrder = currentWinePourOrder

    await payload.update({
      collection: 'course-sessions',
      id: sessionId,
      data,
      overrideAccess: true,
      depth: 0,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    log.error({ err }, 'host_state_failed')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
