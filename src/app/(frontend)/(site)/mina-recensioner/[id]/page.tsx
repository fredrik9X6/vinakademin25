import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { Card, CardContent } from '@/components/ui/card'
import type { Review } from '@/payload-types'
import { EditReviewClient } from './EditReviewClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  return { title: `Recension #${id} — Vinakademin` }
}

export default async function EditReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getUser()
  if (!user) {
    const { id } = await params
    redirect(`/logga-in?from=/mina-recensioner/${id}`)
  }

  const { id } = await params
  const reviewId = Number(id)
  if (!Number.isInteger(reviewId)) notFound()

  const payload = await getPayload({ config })
  let review: Review | null = null
  try {
    review = (await payload.findByID({
      collection: 'reviews',
      id: reviewId,
      depth: 2,
      overrideAccess: false,
      user,
    })) as Review
  } catch {
    notFound()
  }

  // Defense in depth — payload's access already filters, but double-check owner
  const ownerId = typeof review.user === 'object' ? (review.user as any)?.id : review.user
  if (ownerId !== user.id && user.role !== 'admin') notFound()

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
      <Link
        href="/mina-recensioner"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Mina recensioner
      </Link>
      <Card>
        <CardContent className="p-6">
          <EditReviewClient review={review} />
        </CardContent>
      </Card>
    </div>
  )
}
