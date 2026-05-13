import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { PublicHostProfile } from '@/components/profile/PublicHostProfile'
import type { TastingPlan, User } from '@/payload-types'

interface RouteParams {
  params: Promise<{ handle: string }>
}

async function loadHostAndPlans(handle: string): Promise<{ user: User; plans: TastingPlan[] } | null> {
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
  // Honor the public/private toggle. Default true for users created before
  // the profilePublic field existed.
  if ((user as any).profilePublic === false) return null
  const plansRes = await payload.find({
    collection: 'tasting-plans',
    where: {
      and: [
        { owner: { equals: user.id } },
        { publishedToProfile: { equals: true } },
      ],
    },
    sort: '-updatedAt',
    limit: 50,
    depth: 0,
    overrideAccess: true,
  })
  return { user, plans: plansRes.docs as TastingPlan[] }
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { handle } = await params
  const data = await loadHostAndPlans(handle)
  if (!data) return { title: 'Profil — Vinakademin' }
  const name =
    `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim() ||
    `@${data.user.handle}`
  return {
    title: `${name} — Vinakademin`,
    description: data.user.bio ?? undefined,
  }
}

export const dynamic = 'force-dynamic'

export default async function PublicProfilePage({ params }: RouteParams) {
  const { handle } = await params
  const data = await loadHostAndPlans(handle)
  if (!data) notFound()
  return <PublicHostProfile user={data.user} plans={data.plans} />
}
