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

/** How often each connection re-reads the roster. */
const ROSTER_POLL_INTERVAL_MS = 5_000

/** Liveness window for `online: true` in the roster. */
const ONLINE_THRESHOLD_MS = 2 * 60 * 1000

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

      // Reads BOTH the course-mode currentLesson FK and the plan-mode
      // currentWinePourOrder number; clients pick whichever they care about.
      const readHostPointer = async (): Promise<{
        currentLessonId: number | null
        currentWinePourOrder: number | null
        currentWineFocusStartedAt: string | null
        revealedPourOrders: number[]
        blindTasting: boolean
      }> => {
        try {
          const fresh = await payload.findByID({
            collection: 'course-sessions',
            id: sessionId,
            depth: 0,
          })
          if (!fresh)
            return {
              currentLessonId: null,
              currentWinePourOrder: null,
              currentWineFocusStartedAt: null,
              revealedPourOrders: [],
              blindTasting: false,
            }
          const cl = (fresh as any).currentLesson
          const wp = (fresh as any).currentWinePourOrder
          const startedAt = (fresh as any).currentWineFocusStartedAt
          const revealedRaw = (fresh as any).revealedPourOrders
          return {
            currentLessonId: cl == null ? null : typeof cl === 'object' ? cl.id : cl,
            currentWinePourOrder: typeof wp === 'number' ? wp : null,
            currentWineFocusStartedAt:
              typeof startedAt === 'string' ? startedAt : null,
            revealedPourOrders: Array.isArray(revealedRaw)
              ? (revealedRaw as number[]).filter((n) => typeof n === 'number')
              : [],
            blindTasting: Boolean((fresh as any).blindTasting),
          }
        } catch (err) {
          log.error({ err, sessionId }, 'sse_read_host_pointer_failed')
          return {
            currentLessonId: null,
            currentWinePourOrder: null,
            currentWineFocusStartedAt: null,
            revealedPourOrders: [],
            blindTasting: false,
          }
        }
      }

      // Initial lesson frame
      let lastPointer = await readHostPointer()
      send('lesson', lastPointer)

      // Lesson poller
      const lessonPoll = setInterval(async () => {
        if (closed) return
        const next = await readHostPointer()
        if (JSON.stringify(next) !== JSON.stringify(lastPointer)) {
          lastPointer = next
          send('lesson', next)
        }
      }, LESSON_POLL_INTERVAL_MS)

      type RosterEntry = {
        id: number
        nickname: string
        currentLessonId: number | null
        isHost: boolean
        online: boolean
      }

      const buildRoster = async (): Promise<RosterEntry[]> => {
        try {
          const fresh = await payload.findByID({
            collection: 'course-sessions',
            id: sessionId,
            depth: 1, // populate host
          })
          if (!fresh) return []

          const hostUser = typeof fresh.host === 'object' ? fresh.host : null
          const hostName = hostUser
            ? `${hostUser.firstName || ''} ${hostUser.lastName || ''}`.replace(/\s+/g, ' ').trim() ||
              hostUser.email ||
              'Värden'
            : 'Värden'
          const hostCurrentLessonId =
            typeof fresh.currentLesson === 'object'
              ? fresh.currentLesson?.id ?? null
              : (fresh.currentLesson as number | null) ?? null

          const hostEntry: RosterEntry = {
            id: hostUser?.id ?? -1,
            nickname: hostName,
            currentLessonId: hostCurrentLessonId,
            isHost: true,
            online: fresh.status === 'active',
          }

          const partsRes = await payload.find({
            collection: 'session-participants',
            where: { session: { equals: sessionId } },
            limit: 200,
            depth: 0,
            overrideAccess: true,
          })

          const now = Date.now()
          const partEntries: RosterEntry[] = (partsRes.docs as any[]).map((p) => {
            const last = p.lastActivityAt ? new Date(p.lastActivityAt).getTime() : 0
            const cl = p.currentLessonId
            return {
              id: p.id,
              nickname: p.nickname || 'Anonym',
              currentLessonId:
                typeof cl === 'object' && cl ? cl.id : (cl as number | null) ?? null,
              isHost: false,
              online: now - last < ONLINE_THRESHOLD_MS,
            }
          })

          // Host first, then participants by nickname asc.
          return [
            hostEntry,
            ...partEntries.sort((a, b) => a.nickname.localeCompare(b.nickname, 'sv')),
          ]
        } catch (err) {
          log.error({ err, sessionId }, 'sse_build_roster_failed')
          return []
        }
      }

      const rosterEqual = (a: RosterEntry[], b: RosterEntry[]) => {
        if (a.length !== b.length) return false
        for (let i = 0; i < a.length; i++) {
          const x = a[i],
            y = b[i]
          if (
            x.id !== y.id ||
            x.nickname !== y.nickname ||
            x.currentLessonId !== y.currentLessonId ||
            x.isHost !== y.isHost ||
            x.online !== y.online
          ) {
            return false
          }
        }
        return true
      }

      // Initial roster frame
      let lastRoster = await buildRoster()
      send('roster', { participants: lastRoster })

      const rosterPoll = setInterval(async () => {
        if (closed) return
        const next = await buildRoster()
        if (!rosterEqual(lastRoster, next)) {
          lastRoster = next
          send('roster', { participants: next })
        }
      }, ROSTER_POLL_INTERVAL_MS)

      // ───── Swarm aggregator ─────
      type SwarmEntry = {
        avgRating: number
        ratingCount: number
        aromaCounts: Array<{ label: string; count: number }>
      }
      type SwarmPayload = { byPourOrder: Record<number, SwarmEntry> }

      const buildSwarm = async (): Promise<SwarmPayload> => {
        try {
          const session = await payload.findByID({
            collection: 'course-sessions',
            id: sessionId,
            depth: 2,
            overrideAccess: true,
          })
          if (!session?.tastingPlan || typeof session.tastingPlan !== 'object') {
            return { byPourOrder: {} }
          }

          const wines = ((session.tastingPlan as any).wines ?? []) as any[]
          const wineIdToPour: Record<number, number> = {}
          const titleToPour: Record<string, number> = {}
          wines.forEach((w, idx) => {
            const pourOrder = w.pourOrder ?? idx + 1
            if (w.libraryWine) {
              const id = typeof w.libraryWine === 'object' ? w.libraryWine.id : w.libraryWine
              if (typeof id === 'number') wineIdToPour[id] = pourOrder
            } else if (w.customWine?.name) {
              titleToPour[String(w.customWine.name).toLowerCase()] = pourOrder
            }
          })

          const reviews = await payload.find({
            collection: 'reviews',
            where: { session: { equals: sessionId } },
            limit: 1000,
            depth: 0,
            overrideAccess: true,
          })

          type Acc = { ratings: number[]; aromas: Map<string, number> }
          const accs: Record<number, Acc> = {}
          for (const r of reviews.docs as any[]) {
            let pour: number | undefined
            if (r.wine) {
              const id = typeof r.wine === 'object' ? r.wine.id : r.wine
              if (typeof id === 'number') pour = wineIdToPour[id]
            } else if (r.customWine?.name) {
              pour = titleToPour[String(r.customWine.name).toLowerCase()]
            }
            if (pour == null) continue
            const acc = (accs[pour] ||= { ratings: [], aromas: new Map() })
            if (typeof r.rating === 'number') acc.ratings.push(r.rating)
            const aromas = r.wsetTasting?.nose?.primaryAromas
            if (Array.isArray(aromas)) {
              for (const a of aromas) {
                const label = typeof a === 'string' ? a.trim() : ''
                if (!label) continue
                const key = label.toLocaleLowerCase('sv')
                const prev = acc.aromas.get(key)
                acc.aromas.set(key, (prev ?? 0) + 1)
              }
            }
          }

          const byPourOrder: Record<number, SwarmEntry> = {}
          for (const [pourStr, acc] of Object.entries(accs)) {
            const pour = Number(pourStr)
            const avg =
              acc.ratings.length > 0
                ? acc.ratings.reduce((s, r) => s + r, 0) / acc.ratings.length
                : 0
            const allAromas = Array.from(acc.aromas.entries())
              .map(([key, count]) => ({ label: key, count }))
              .sort((a, b) => b.count - a.count)
            const top = allAromas.slice(0, 10)
            const rest = allAromas.slice(10).reduce((s, e) => s + e.count, 0)
            const aromaCounts = top
            if (rest > 0) aromaCounts.push({ label: 'Annat', count: rest })
            byPourOrder[pour] = {
              avgRating: Number(avg.toFixed(2)),
              ratingCount: acc.ratings.length,
              aromaCounts,
            }
          }
          return { byPourOrder }
        } catch (err) {
          log.error({ err, sessionId }, 'sse_build_swarm_failed')
          return { byPourOrder: {} }
        }
      }

      let lastSwarmJson = JSON.stringify({ byPourOrder: {} })
      const initialSwarm = await buildSwarm()
      lastSwarmJson = JSON.stringify(initialSwarm)
      send('swarm', initialSwarm)

      const swarmPoll = setInterval(async () => {
        if (closed) return
        const next = await buildSwarm()
        const nextJson = JSON.stringify(next)
        if (nextJson !== lastSwarmJson) {
          lastSwarmJson = nextJson
          send('swarm', next)
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
        clearInterval(rosterPoll)
        clearInterval(swarmPoll)
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
