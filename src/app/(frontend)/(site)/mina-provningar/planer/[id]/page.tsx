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
  const user = await getUser()
  if (!user) {
    const { id } = await params
    redirect(`/logga-in?from=/mina-provningar/planer/${id}`)
  }

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

  const ownerId = typeof plan.owner === 'object' ? plan.owner?.id : plan.owner
  const isAdmin = user.role === 'admin'
  if (!isAdmin && ownerId !== user.id) notFound()

  // Session-mode rendering if ?session=<id> is present and points to a session
  // for this plan. Without this branch, the SessionView plan-mode path added
  // in Task 5 is unreachable from the host's redirect target.
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

  return <PlanDetailView plan={plan} />
}
