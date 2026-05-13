import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { PublicPlanView } from '@/components/profile/PublicPlanView'
import type { TastingPlan, User } from '@/payload-types'

interface RouteParams {
  params: Promise<{ handle: string; planId: string }>
}

async function loadHostAndPlan(
  handle: string,
  planId: string,
): Promise<{ user: User; plan: TastingPlan } | null> {
  const payload = await getPayload({ config })
  const lowered = handle.toLowerCase()
  const userRes = await payload.find({
    collection: 'users',
    where: { handle: { equals: lowered } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const user = (userRes.docs[0] as User) ?? null
  if (!user) return null
  if ((user as any).profilePublic === false) return null
  const pid = Number(planId)
  if (!Number.isInteger(pid)) return null
  const plan = (await payload
    .findByID({ collection: 'tasting-plans', id: pid, depth: 2, overrideAccess: true })
    .catch(() => null)) as TastingPlan | null
  if (!plan) return null
  const ownerId = typeof plan.owner === 'object' ? plan.owner?.id : plan.owner
  if (ownerId !== user.id) return null
  if (!plan.publishedToProfile) return null
  return { user, plan }
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { handle, planId } = await params
  const data = await loadHostAndPlan(handle, planId)
  if (!data) return { title: 'Provning — Vinakademin' }
  return {
    title: `${data.plan.title} — @${data.user.handle} | Vinakademin`,
    description: data.plan.description ?? undefined,
  }
}

export const dynamic = 'force-dynamic'

export default async function PublicPlanPage({ params }: RouteParams) {
  const { handle, planId } = await params
  const data = await loadHostAndPlan(handle, planId)
  if (!data) notFound()
  const hostDisplayName =
    `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim() ||
    `@${data.user.handle}`
  return (
    <PublicPlanView plan={data.plan} handle={data.user.handle!} hostDisplayName={hostDisplayName} />
  )
}
