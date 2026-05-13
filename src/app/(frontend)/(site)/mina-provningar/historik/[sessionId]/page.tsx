import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { SessionHistoryDetail } from '@/components/session-history/SessionHistoryDetail'
import type { CourseSession, Review } from '@/payload-types'

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

  const hostId = typeof session.host === 'object' ? (session.host as any).id : session.host
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
      participantId = (partsRes.docs[0] as any).id
    }
  }

  let myReviews: Review[] = []
  if (participantId !== null) {
    const reviewsRes = await payload.find({
      collection: 'reviews',
      where: { sessionParticipant: { equals: participantId } },
      limit: 100,
      depth: 1,
      overrideAccess: true,
    })
    myReviews = reviewsRes.docs as Review[]
  } else if (isHost) {
    // Host's own reviews tagged to this session, if they happened to submit any
    const myReviewsRes = await payload.find({
      collection: 'reviews',
      where: {
        and: [{ session: { equals: sid } }, { user: { equals: user.id } }],
      },
      limit: 100,
      depth: 1,
      overrideAccess: true,
    })
    myReviews = myReviewsRes.docs as Review[]
  }

  return <SessionHistoryDetail session={session} isHost={isHost} myReviews={myReviews} />
}
