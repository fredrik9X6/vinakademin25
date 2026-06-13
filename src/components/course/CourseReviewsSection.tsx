'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star, CheckCircle, MessageSquare } from 'lucide-react'
import { StarsDisplay, formatRatingText } from '@/components/ui/stars-display'

interface Review {
  id: number
  rating: number
  content: string
  isVerifiedPurchase: boolean
  createdAt: string
  author: {
    firstName?: string
    lastName?: string
  } | null
}

interface CourseReviewsSectionProps {
  courseId: number
}

// Local StarDisplay removed — use the shared StarsDisplay which handles
// fractional values correctly (drop-in replacement, supports half-stars).

function RatingBar({ stars, count, total }: { stars: number; count: number; total: number }) {
  const percentage = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-3 text-right text-muted-foreground">{stars}</span>
      <Star className="h-3 w-3 fill-brand-400 text-brand-400" />
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-gradient rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-6 text-right text-xs text-muted-foreground">{count}</span>
    </div>
  )
}

export function CourseReviewsSection({ courseId }: CourseReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [averageRating, setAverageRating] = useState(0)
  const [totalReviews, setTotalReviews] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchReviews() {
      try {
        const res = await fetch(`/api/reviews/course?courseId=${courseId}`)
        if (res.ok) {
          const data = await res.json()
          setReviews(data.reviews)
          setAverageRating(data.averageRating)
          setTotalReviews(data.totalReviews)
        }
      } catch {
        // Silently fail - reviews are not critical
      } finally {
        setLoading(false)
      }
    }

    fetchReviews()
  }, [courseId])

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 w-48 bg-muted rounded" />
        <div className="h-32 bg-muted rounded-lg" />
      </div>
    )
  }

  if (totalReviews === 0) {
    return null // Don't show the section if there are no reviews
  }

  // Distribution: group half-stars into the nearest whole bucket so the
  // histogram doesn't fragment into ten rows that everyone has to read.
  // 4.5 counts toward the "5" bucket (rounded up via Math.round).
  const ratingDistribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((r) => Math.round(r.rating) === stars).length,
  }))

  return (
    <div className="space-y-6" id="recensioner">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-brand-400" />
        <h2 className="text-xl font-medium">Recensioner</h2>
      </div>

      {/* Summary Card */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8">
            {/* Average Rating */}
            <div className="flex flex-col items-center justify-center text-center md:pr-8 md:border-r border-border">
              <div className="text-4xl font-bold text-foreground mb-1">
                {formatRatingText(averageRating)}
              </div>
              <StarsDisplay value={averageRating} size="lg" />
              <p className="text-sm text-muted-foreground mt-2">
                {totalReviews} {totalReviews === 1 ? 'recension' : 'recensioner'}
              </p>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-2">
              {ratingDistribution.map(({ stars, count }) => (
                <RatingBar key={stars} stars={stars} count={count} total={totalReviews} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Reviews */}
      <div className="space-y-4">
        {reviews.map((review) => {
          const authorName = review.author
            ? `${review.author.firstName || ''} ${review.author.lastName?.charAt(0) || ''}.`.trim()
            : 'Anonym'

          const formattedDate = new Date(review.createdAt).toLocaleDateString('sv-SE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })

          return (
            <Card key={review.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{authorName}</span>
                      {review.isVerifiedPurchase && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verifierat köp
                        </Badge>
                      )}
                    </div>
                    <StarsDisplay value={review.rating} size="sm" />
                  </div>
                  <span className="text-xs text-muted-foreground">{formattedDate}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{review.content}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
