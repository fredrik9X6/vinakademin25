import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { SessionHistoryDetail } from '@/components/session-history/SessionHistoryDetail'
import { getSessionRecap } from '@/lib/session-recap'
import type { CourseSession } from '@/payload-types'

interface RouteParams {
  params: Promise<{ sessionId: string }>
}

export const dynamic = 'force-dynamic'

export default async function HistorikDetailPage({ params }: RouteParams) {
  const user = await getUser()
  if (!user) {
    const { sessionId } = await params
    redirect(`/logga-in?from=/mina-provningar/historik/${sessionId}`)
  }
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

  const hostId = typeof session.host === 'object' ? (session.host as { id: number }).id : session.host
  const isHost = hostId === user.id

  let participantId: number | null = null
  if (!isHost) {
    const partsRes = await payload.find({
      collection: 'session-participants',
      where: { and: [{ session: { equals: sid } }, { user: { equals: user.id } }] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (partsRes.docs.length === 0) {
      notFound()
    } else {
      participantId = (partsRes.docs[0] as { id: number }).id
    }
  }

  const recap = await getSessionRecap(payload, session, user.id, participantId)

  return <SessionHistoryDetail session={session} isHost={isHost} recap={recap} />
}
