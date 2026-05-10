import { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { cookies } from 'next/headers'
import { PARTICIPANT_COOKIE } from '@/lib/sessions'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('api-sessions-stream')

/** How often each connection re-reads `course-sessions.currentLesson`. */
const LESSON_POLL_INTERVAL_MS = 2_000

/** Heartbeat to keep proxies / browsers from idling-out the connection. */
const HEARTBEAT_INTERVAL_MS = 30_000

// Force dynamic — this route streams; never cache.
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params
  const payload = await getPayload({ config })

  // ── Auth ────────────────────────────────────────────────────────────────
  // Accept either an authed Payload session whose user is the session host or
  // a member, or a guest with a valid vk_participant_token cookie matching a
  // SessionParticipant row in this session.
  const cookieStore = await cookies()
  const participantToken = cookieStore.get(PARTICIPANT_COOKIE)?.value
  const cookieString = request.headers.get('cookie') || ''
  const { user } = await payload.auth({ headers: new Headers({ Cookie: cookieString }) })

  let session
  try {
    session = await payload.findByID({
      collection: 'course-sessions',
      id: sessionId,
      depth: 1, // populate host
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
  if (!session) return new Response('Not found', { status: 404 })

  const hostId = typeof session.host === 'object' ? session.host?.id : session.host
  let authorized = false

  if (user && user.id === hostId) {
    authorized = true
  } else if (user) {
    const memberRes = await payload.find({
      collection: 'session-participants',
      where: { and: [{ session: { equals: sessionId } }, { user: { equals: user.id } }] },
      limit: 1,
      overrideAccess: true,
    })
    if (memberRes.totalDocs > 0) authorized = true
  }
  if (!authorized && participantToken) {
    const tokenRes = await payload.find({
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
    if (tokenRes.totalDocs > 0) authorized = true
  }

  if (!authorized) return new Response('Unauthorized', { status: 401 })

  // ── Stream ──────────────────────────────────────────────────────────────
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      const send = (event: string, data: unknown) => {
        if (closed) return
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          )
        } catch {
          closed = true
        }
      }

      const readCurrentLessonId = async (): Promise<number | null> => {
        try {
          const fresh = await payload.findByID({
            collection: 'course-sessions',
            id: sessionId,
            depth: 0,
          })
          if (!fresh) return null
          const cl = (fresh as any).currentLesson
          if (cl == null) return null
          return typeof cl === 'object' ? cl.id : cl
        } catch (err) {
          log.error({ err, sessionId }, 'sse_read_current_lesson_failed')
          return null
        }
      }

      // Initial lesson frame
      let lastLessonId = await readCurrentLessonId()
      send('lesson', { currentLessonId: lastLessonId })

      // Lesson poller
      const lessonPoll = setInterval(async () => {
        if (closed) return
        const next = await readCurrentLessonId()
        if (next !== lastLessonId) {
          lastLessonId = next
          send('lesson', { currentLessonId: next })
        }
      }, LESSON_POLL_INTERVAL_MS)

      // Heartbeat
      const heartbeat = setInterval(() => {
        send('heartbeat', { ts: Date.now() })
      }, HEARTBEAT_INTERVAL_MS)

      // Cleanup on client disconnect
      const onAbort = () => {
        closed = true
        clearInterval(lessonPoll)
        clearInterval(heartbeat)
        try {
          controller.close()
        } catch {
          // already closed
        }
      }
      request.signal.addEventListener('abort', onAbort)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Disable buffering for any reverse proxy that respects this.
      'X-Accel-Buffering': 'no',
    },
  })
}
