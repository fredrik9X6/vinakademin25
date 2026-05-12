import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { PlanDetailView } from '@/components/tasting-plan/PlanDetailView'
import type { TastingPlan } from '@/payload-types'

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
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

  return <PlanDetailView plan={plan} />
}
