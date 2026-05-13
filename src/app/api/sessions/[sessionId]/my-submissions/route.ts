import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { cookies } from 'next/headers'
import { PARTICIPANT_COOKIE } from '@/lib/sessions'

/**
 * GET /api/sessions/[sessionId]/my-submissions
 *
 * Returns the pour orders the calling participant has already submitted
 * reviews for. Used by PlanSessionContent to seed the swarm-gate Set on
 * mount. Identity is the participant cookie (vk_participant_token) OR the
 * authenticated user.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params
  const sid = Number(sessionId)
  if (!Number.isInteger(sid)) {
    return NextResponse.json({ error: 'Invalid session id' }, { status: 400 })
  }

  const payload = await getPayload({ config })

  // Identify caller: cookie first, then payload-token user
  const cookieStore = await cookies()
  const participantToken = cookieStore.get(PARTICIPANT_COOKIE)?.value ?? null

  let participantId: number | null = null
  if (participantToken) {
    const found = await payload.find({
      collection: 'session-participants',
      where: {
        and: [
          { session: { equals: sid } },
          { participantToken: { equals: participantToken } },
        ],
      },
      limit: 1,
      overrideAccess: true,
    })
    if (found.docs.length > 0) participantId = (found.docs[0] as any).id
  }

  // Fall back to authed user → participant lookup
  if (participantId === null) {
    const cookieString = request.headers.get('cookie') || ''
    const { user } = await payload.auth({ headers: new Headers({ Cookie: cookieString }) })
    if (user) {
      const found = await payload.find({
        collection: 'session-participants',
        where: {
          and: [
            { session: { equals: sid } },
            { user: { equals: user.id } },
          ],
        },
        limit: 1,
        overrideAccess: true,
      })
      if (found.docs.length > 0) participantId = (found.docs[0] as any).id
    }
  }

  if (participantId === null) {
    return NextResponse.json({ submittedPourOrders: [] })
  }

  // Find this participant's reviews in this session
  const reviewRes = await payload.find({
    collection: 'reviews',
    where: { sessionParticipant: { equals: participantId } },
    limit: 100,
    depth: 0,
    overrideAccess: true,
  })

  // Map reviews to pour orders via session's plan wines
  const session = await payload.findByID({
    collection: 'course-sessions',
    id: sid,
    depth: 2,
    overrideAccess: true,
  })

  const wineIdToPour: Record<number, number> = {}
  const titleToPour: Record<string, number> = {}
  if (session?.tastingPlan && typeof session.tastingPlan === 'object') {
    const wines = ((session.tastingPlan as any).wines ?? []) as any[]
    wines.forEach((w, idx) => {
      const pourOrder = w.pourOrder ?? idx + 1
      if (w.libraryWine) {
        const id = typeof w.libraryWine === 'object' ? w.libraryWine.id : w.libraryWine
        if (typeof id === 'number') wineIdToPour[id] = pourOrder
      } else if (w.customWine?.name) {
        titleToPour[String(w.customWine.name).toLowerCase()] = pourOrder
      }
    })
  }

  const submittedPourOrders = new Set<number>()
  for (const r of reviewRes.docs as any[]) {
    if (r.wine) {
      const id = typeof r.wine === 'object' ? r.wine.id : r.wine
      if (typeof id === 'number' && wineIdToPour[id] != null) {
        submittedPourOrders.add(wineIdToPour[id])
      }
    } else if (r.customWine?.name) {
      const pour = titleToPour[String(r.customWine.name).toLowerCase()]
      if (pour != null) submittedPourOrders.add(pour)
    }
  }

  return NextResponse.json({ submittedPourOrders: Array.from(submittedPourOrders).sort() })
}
