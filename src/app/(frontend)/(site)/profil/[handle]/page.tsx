import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { PublicHostProfile } from '@/components/profile/PublicHostProfile'
import type { Review, TastingPlan, User } from '@/payload-types'

interface RouteParams {
  params: Promise<{ handle: string }>
}

const REVIEWS_ON_PROFILE_PREVIEW = 3

async function loadProfileData(
  handle: string,
): Promise<{
  user: User
  plans: TastingPlan[]
  reviews: Review[]
  reviewTotal: number
  publicReviewCount: number
  publicPlanCount: number
  participatedCount: number
} | null> {
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
  const reviewsRes = await payload.find({
    collection: 'reviews',
    where: {
      and: [
        { user: { equals: user.id } },
        { publishedToProfile: { equals: true } },
      ],
    },
    sort: '-createdAt',
    limit: REVIEWS_ON_PROFILE_PREVIEW,
    depth: 2, // resolve wine + media for thumbnails
    overrideAccess: true,
  })
  // Lightweight count queries for the profile totals strip.
  const [participatedRes] = await Promise.all([
    payload.find({
      collection: 'session-participants',
      where: { user: { equals: user.id } },
      limit: 0,
      depth: 0,
      overrideAccess: true,
    }),
  ])
  return {
    user,
    plans: plansRes.docs as TastingPlan[],
    reviews: reviewsRes.docs as Review[],
    reviewTotal: reviewsRes.totalDocs,
    publicReviewCount: reviewsRes.totalDocs,
    publicPlanCount: plansRes.totalDocs,
    participatedCount: participatedRes.totalDocs,
  }
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { handle } = await params
  const data = await loadProfileData(handle)
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
  const data = await loadProfileData(handle)
  if (!data) notFound()
  return (
    <PublicHostProfile
      user={data.user}
      plans={data.plans}
      reviews={data.reviews}
      reviewTotal={data.reviewTotal}
      publicReviewCount={data.publicReviewCount}
      publicPlanCount={data.publicPlanCount}
      participatedCount={data.participatedCount}
    />
  )
}
