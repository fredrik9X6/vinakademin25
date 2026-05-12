import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { PlanShoppingList } from '@/components/tasting-plan/PlanShoppingList'
import type { TastingPlan } from '@/payload-types'

export const metadata: Metadata = {
  title: 'Handlingslista — Vinakademin',
}

export default async function HandlingslistaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getUser()
  if (!user) {
    const { id } = await params
    redirect(`/logga-in?from=/mina-provningar/planer/${id}/handlingslista`)
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

  return <PlanShoppingList plan={plan} />
}
