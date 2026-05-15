'use client'

import { useRouter } from 'next/navigation'
import type { Review, Wine } from '@/payload-types'
import { WineReviewForm } from '@/components/course/WineReviewForm'

interface EditReviewClientProps {
  review: Review
}

export function EditReviewClient({ review }: EditReviewClientProps) {
  const router = useRouter()

  const wine = review.wine
  // typeof null === 'object', so guard truthiness first. For customWine reviews
  // wine is null and we want wineId to fall through to the customWineSnapshot
  // branch.
  const wineId: number | null =
    wine && typeof wine === 'object'
      ? (wine as Wine).id
      : typeof wine === 'number'
        ? wine
        : null
  const customWine = (review as any).customWine

  return (
    <WineReviewForm
      lessonId={0}
      standalone
      initialReview={review as any}
      {...(wineId
        ? { wineIdProp: wineId as number }
        : customWine?.name
          ? {
              customWineSnapshot: {
                name: customWine.name,
                producer: customWine.producer,
                vintage: customWine.vintage,
                type: customWine.type,
                systembolagetUrl: customWine.systembolagetUrl,
                priceSek: customWine.priceSek,
                systembolagetProductNumber: customWine.systembolagetProductNumber,
                imageUrl: customWine.imageUrl,
              },
            }
          : {})}
      onSubmit={() => router.push('/mina-recensioner')}
    />
  )
}
