import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { PlanDetailView } from '@/components/tasting-plan/PlanDetailView'
import { PlanSessionShell } from '@/components/tasting-plan/PlanSessionShell'
import type { TastingPlan, CourseSession } from '@/payload-types'

export default async function PlanDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ session?: string; host?: string }>
}) {
  const { id } = await params
  const planId = Number(id)
  if (!Number.isInteger(planId)) notFound()

  const payload = await getPayload({ config })
  let plan: TastingPlan | null = null
  try {
    plan = (await payload.findByID({
      collection: 'tasting-plans',
      id: planId,
      depth: 2,
      overrideAccess: true,
    })) as TastingPlan
  } catch {
    notFound()
  }
  if (!plan) notFound()

  // Session-mode rendering: when ?session=<id> is present and points to an
  // active session for this plan, render the session shell. This path is
  // accessible to unauthenticated guests because session participants may
  // not have an account — their identity is carried by the participant
  // cookie set on /api/sessions/join.
  const sp = await searchParams
  if (sp.session) {
    let session: CourseSession | null = null
    try {
      session = (await payload.findByID({
        collection: 'course-sessions',
        id: sp.session,
        depth: 2,
        overrideAccess: true,
      })) as CourseSession
    } catch {
      session = null
    }
    const sessionPlanId =
      session && typeof session.tastingPlan === 'object'
        ? session.tastingPlan?.id
        : session?.tastingPlan
    if (session && sessionPlanId === plan.id && session.status === 'active') {
      const isHost = sp.host === 'true'
      return (
        <PlanSessionShell
          plan={plan}
          session={session}
          isHost={isHost}
          sessionId={String(session.id)}
        />
      )
    }
  }

  // Detail-page mode requires auth + owner.
  const user = await getUser()
  if (!user) {
    redirect(`/logga-in?from=/mina-provningar/planer/${id}`)
  }
  const ownerId = typeof plan.owner === 'object' ? plan.owner?.id : plan.owner
  const isAdmin = user.role === 'admin'
  if (!isAdmin && ownerId !== user.id) notFound()

  return <PlanDetailView plan={plan} />
}
