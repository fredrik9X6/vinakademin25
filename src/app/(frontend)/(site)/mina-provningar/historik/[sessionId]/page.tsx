import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { PARTICIPANT_COOKIE } from '@/lib/sessions'
import { SessionHistoryDetail } from '@/components/session-history/SessionHistoryDetail'
import { getSessionRecap } from '@/lib/session-recap'
import type { CourseSession } from '@/payload-types'

interface RouteParams {
  params: Promise<{ sessionId: string }>
}

export const dynamic = 'force-dynamic'

export default async function HistorikDetailPage({ params }: RouteParams) {
  const { sessionId } = await params
  const sid = Number(sessionId)
  if (!Number.isInteger(sid)) notFound()

  const payload = await getPayload({ config })
  let session: CourseSession | null = null
  try {
    session = (await payload.findByID({
      collection: 'course-sessions',
      id: sid,
      depth: 2,
      overrideAccess: true,
    })) as CourseSession
  } catch {
    notFound()
  }
  if (!session) notFound()

  const user = await getUser()
  let isHost = false
  let participantId: number | null = null
  let viewerIsGuest = false

  if (user) {
    // Logged-in viewer — host or member participant
    const hostId =
      typeof session.host === 'object' ? (session.host as { id: number }).id : session.host
    isHost = hostId === user.id
    if (!isHost) {
      const partsRes = await payload.find({
        collection: 'session-participants',
        where: { and: [{ session: { equals: sid } }, { user: { equals: user.id } }] },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      if (partsRes.docs.length === 0) {
        // Logged-in user with no participation in this session — block.
        notFound()
      }
      participantId = (partsRes.docs[0] as { id: number }).id
    }
  } else {
    // Guest path — accept a valid vk_participant_token cookie pointing to a
    // participant in this session. Lets unauthenticated guests reach their own
    // recap after the host ends the tasting.
    const cookieStore = await cookies()
    const token = cookieStore.get(PARTICIPANT_COOKIE)?.value ?? null
    if (!token) {
      redirect(`/logga-in?from=/mina-provningar/historik/${sessionId}`)
    }
    const partsRes = await payload.find({
      collection: 'session-participants',
      where: {
        and: [
          { session: { equals: sid } },
          { participantToken: { equals: token } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (partsRes.docs.length === 0) {
      redirect(`/logga-in?from=/mina-provningar/historik/${sessionId}`)
    }
    participantId = (partsRes.docs[0] as { id: number }).id
    viewerIsGuest = true
  }

  const recap = await getSessionRecap(payload, session, user?.id ?? 0, participantId)

  return (
    <SessionHistoryDetail
      session={session}
      isHost={isHost}
      recap={recap}
      viewerIsGuest={viewerIsGuest}
    />
  )
}
