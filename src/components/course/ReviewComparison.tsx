'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Users } from 'lucide-react'
import { toast } from 'sonner'
import { RichTextRenderer } from '@/components/ui/rich-text-renderer'

export interface WineReview {
  id: number | string
  participantName: string
  isVerified: boolean
  rating?: number
  buyAgain?: boolean
  // WSET Appearance
  clarity?: string
  brightness?: string
  color?: string
  // WSET Nose
  noseIntensity?: string
  noseDevelopment?: string
  aromas?: string[]
  // WSET Palate
  sweetness?: string
  acidity?: string
  tannin?: string
  alcohol?: string
  body?: string
  flavors?: string[]
  finish?: string
  // WSET Conclusion
  quality?: string
  readiness?: string
  notes?: unknown
}

interface ReviewComparisonProps {
  lessonId: number
  sessionId?: string
  reviews?: WineReview[]
  onRefresh?: () => void
}

export default function ReviewComparison({
  sessionId,
  lessonId,
  reviews: externalReviews,
  onRefresh,
}: ReviewComparisonProps) {
  const isGroupMode = Boolean(sessionId)
  const [reviews, setReviews] = useState<WineReview[]>(externalReviews ?? [])
  const [loading, setLoading] = useState(isGroupMode && !externalReviews?.length)
  const [error, setError] = useState<string | null>(null)

  const fetchReviews = async (silent = false) => {
    if (!sessionId) {
      return
    }

    try {
      if (!silent) {
        setLoading(true)
      }
      setError(null)
      const response = await fetch(
        `/api/reviews/compare?sessionId=${sessionId}&lessonId=${lessonId}`,
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch reviews')
      }

      const data = await response.json()

      // Map API response to WineReview format
      const mappedReviews = (data.reviews || []).map((review: any) => {
        // Combine all aromas from primary, secondary, and tertiary
        const allAromas = [
          ...(review.wsetTasting?.nose?.primaryAromas || []),
          ...(review.wsetTasting?.nose?.secondaryAromas || []),
          ...(review.wsetTasting?.nose?.tertiaryAromas || []),
        ]

        // Combine all flavors from primary, secondary, and tertiary
        const allFlavors = [
          ...(review.wsetTasting?.palate?.primaryFlavours || []),
          ...(review.wsetTasting?.palate?.secondaryFlavours || []),
          ...(review.wsetTasting?.palate?.tertiaryFlavours || []),
        ]

        return {
          id: review.id,
          participantName: review.participantName || 'Unknown',
          isVerified: review.isVerified || review.isTrusted || false,
          rating: review.rating,
          buyAgain: review.buyAgain,
          // WSET Appearance
          clarity: review.wsetTasting?.appearance?.clarity,
          brightness: review.wsetTasting?.appearance?.intensity,
          color: review.wsetTasting?.appearance?.color,
          // WSET Nose
          noseIntensity: review.wsetTasting?.nose?.intensity,
          noseDevelopment: review.wsetTasting?.nose?.development,
          aromas: allAromas,
          // WSET Palate
          sweetness: review.wsetTasting?.palate?.sweetness,
          acidity: review.wsetTasting?.palate?.acidity,
          tannin: review.wsetTasting?.palate?.tannin,
          alcohol: review.wsetTasting?.palate?.alcohol,
          body: review.wsetTasting?.palate?.body,
          flavors: allFlavors,
          finish: review.wsetTasting?.palate?.finish,
          // WSET Conclusion
          quality: review.wsetTasting?.conclusions?.quality,
          readiness: review.wsetTasting?.conclusions?.readiness,
          notes: review.reviewText || review.wsetTasting?.conclusions?.ageingPotential,
        }
      })

      setReviews(mappedReviews)
    } catch (err) {
      console.error('Error fetching reviews:', err)
      setError(err instanceof Error ? err.message : 'Failed to load reviews')
      if (!silent) {
        toast.error('Kunde inte hämta recensioner')
      }
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }

  // Initial fetch
  useEffect(() => {
    if (sessionId) {
      fetchReviews()
    } else {
      setError(null)
      setLoading(false)
      if (externalReviews) {
        setReviews(externalReviews)
      } else {
        setReviews([])
      }
    }
  }, [sessionId, lessonId])

  // Keep reviews in sync when provided externally (solo mode)
  useEffect(() => {
    if (!sessionId) {
      setReviews(externalReviews ?? [])
    }
  }, [externalReviews, sessionId])

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (!sessionId) {
      return
    }
    const interval = setInterval(() => {
      fetchReviews(true) // Silent refresh
    }, 5000)

    return () => clearInterval(interval)
  }, [sessionId, lessonId])

  const hasReviews = reviews.length > 0

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Jämför smaknoteringar</CardTitle>
          <CardDescription>Laddar alla deltagarnas svar...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Jämför smaknoteringar</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error}</p>
          <p className="text-sm text-muted-foreground mt-2">Försöker igen automatiskt...</p>
        </CardContent>
      </Card>
    )
  }

  if (!hasReviews) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Jämför smaknoteringar</CardTitle>
          <CardDescription>
            {sessionId
              ? 'Väntar på att deltagare ska slutföra sina smaknoteringar'
              : 'Inga vinrecensioner hittades ännu'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Inga smaknoteringar har skickats in ännu</p>
            {sessionId ? (
              <p className="text-xs mt-2 opacity-70">Uppdateras automatiskt var 5:e sekund</p>
            ) : (
              <p className="text-xs mt-2 opacity-70">
                Skicka in din vinrecension för att se jämförelsen
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Separate verified review from participant reviews
  const verifiedReview = reviews.find((r) => r.isVerified)
  const participantReviews = reviews.filter((r) => !r.isVerified)

  // Calculate most common aromas and flavors from participant reviews
  const getMostCommon = (items: string[]): string => {
    if (items.length === 0) return '—'
    const counts = items.reduce(
      (acc, item) => {
        acc[item] = (acc[item] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    return sorted[0]?.[0] || '—'
  }

  const allParticipantAromas = participantReviews.flatMap((r) => r.aromas || [])
  const allParticipantFlavors = participantReviews.flatMap((r) => r.flavors || [])
  const mostCommonAroma = getMostCommon(allParticipantAromas)
  const mostCommonFlavor = getMostCommon(allParticipantFlavors)

  // Calculate average rating (only from reviews that have a rating)
  const reviewsWithRatings = participantReviews.filter((r) => r.rating)
  const averageRating =
    reviewsWithRatings.length > 0
      ? (
          reviewsWithRatings.reduce((sum, r) => sum + (r.rating || 0), 0) /
          reviewsWithRatings.length
        ).toFixed(1)
      : '—'

  const renderReviewCard = (review: WineReview) => {
    const hasNoseDetails = Boolean(
      review.noseIntensity ||
        review.noseDevelopment ||
        (Array.isArray(review.aromas) && review.aromas.length > 0),
    )
    const hasPalateDetails = Boolean(
      review.sweetness ||
        review.acidity ||
        review.tannin ||
        review.alcohol ||
        review.body ||
        (Array.isArray(review.flavors) && review.flavors.length > 0) ||
        review.finish,
    )
    const hasConclusionDetails = Boolean(
      review.quality || review.readiness || (review.notes !== undefined && review.notes !== null),
    )

    return (
      <Card
        key={review.id}
        className={review.isVerified ? 'border-[#FDBA75] dark:border-[#FB914C] border-2' : ''}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{review.participantName}</CardTitle>
          </div>
          <div className="flex flex-col gap-1">
            {review.rating && <CardDescription>Betyg: {review.rating}/5 ⭐</CardDescription>}
            {review.buyAgain !== undefined && (
              <CardDescription className="flex items-center gap-1.5">
                {review.buyAgain ? (
                  <>
                    <span className="text-green-600 dark:text-green-400 font-bold">✓</span> Skulle
                    köpa igen
                  </>
                ) : (
                  <>
                    <span className="text-red-500 font-bold">✕</span> Skulle inte köpa igen
                  </>
                )}
              </CardDescription>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {/* Appearance */}
            {(review.clarity || review.brightness || review.color) && (
              <div className="p-3">
                <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Utseende
                </h4>
                <div className="space-y-1">
                  {review.clarity && (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <span className="text-muted-foreground">Klarhet</span>
                      <span className="col-span-2">{review.clarity}</span>
                    </div>
                  )}
                  {review.brightness && (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <span className="text-muted-foreground">Ljusstyrka</span>
                      <span className="col-span-2">{review.brightness}</span>
                    </div>
                  )}
                  {review.color && (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <span className="text-muted-foreground">Färg</span>
                      <span className="col-span-2">{review.color}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Nose */}
            {hasNoseDetails && (
              <div className="p-3">
                <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Doft
                </h4>
                <div className="space-y-1">
                  {review.noseIntensity && (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <span className="text-muted-foreground">Intensitet</span>
                      <span className="col-span-2">{review.noseIntensity}</span>
                    </div>
                  )}
                  {review.noseDevelopment && (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <span className="text-muted-foreground">Utveckling</span>
                      <span className="col-span-2">{review.noseDevelopment}</span>
                    </div>
                  )}
                  {Array.isArray(review.aromas) && review.aromas.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <span className="text-muted-foreground">Aromer</span>
                      <span className="col-span-2 break-words">{review.aromas.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Palate */}
            {hasPalateDetails && (
              <div className="p-3">
                <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Smak
                </h4>
                <div className="space-y-1">
                  {review.sweetness && (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <span className="text-muted-foreground">Sötma</span>
                      <span className="col-span-2">{review.sweetness}</span>
                    </div>
                  )}
                  {review.acidity && (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <span className="text-muted-foreground">Syra</span>
                      <span className="col-span-2">{review.acidity}</span>
                    </div>
                  )}
                  {review.tannin && (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <span className="text-muted-foreground">Tannin</span>
                      <span className="col-span-2">{review.tannin}</span>
                    </div>
                  )}
                  {review.alcohol && (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <span className="text-muted-foreground">Alkohol</span>
                      <span className="col-span-2">{review.alcohol}</span>
                    </div>
                  )}
                  {review.body && (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <span className="text-muted-foreground">Fyllighet</span>
                      <span className="col-span-2">{review.body}</span>
                    </div>
                  )}
                  {Array.isArray(review.flavors) && review.flavors.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <span className="text-muted-foreground">Smaker</span>
                      <span className="col-span-2 break-words">{review.flavors.join(', ')}</span>
                    </div>
                  )}
                  {review.finish && (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <span className="text-muted-foreground">Eftersmak</span>
                      <span className="col-span-2">{review.finish}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Conclusion */}
            {hasConclusionDetails && (
              <div className="p-3">
                <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Slutsats
                </h4>
                <div className="space-y-1">
                  {review.quality && (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <span className="text-muted-foreground">Kvalitet</span>
                      <span className="col-span-2">{review.quality}</span>
                    </div>
                  )}
                  {review.readiness && (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <span className="text-muted-foreground">Mognad</span>
                      <span className="col-span-2">{review.readiness}</span>
                    </div>
                  )}
                  {review.notes !== undefined && review.notes !== null && (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <span className="text-muted-foreground">Noteringar</span>
                      <div className="col-span-2 text-muted-foreground italic">
                        {typeof review.notes === 'object' &&
                        review.notes !== null &&
                        'root' in review.notes ? (
                          <RichTextRenderer content={review.notes as any} />
                        ) : (
                          <span>{String(review.notes)}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Jämför smaknoteringar
              </CardTitle>
              <CardDescription>
                {sessionId ? (
                  <>
                    {participantReviews.length} deltagare har skickat in sina smaknoteringar
                    {verifiedReview && ' • Vinakademins smaknotering'}
                    <span className="ml-2 text-xs opacity-70">
                      • Uppdateras automatiskt var 5:e sekund
                    </span>
                  </>
                ) : (
                  <>
                    {verifiedReview
                      ? 'Dina smaknoteringar jämförs med Vinakademins referens'
                      : 'Dina smaknoteringar'}
                    {participantReviews.length > 1 && ' • tidigare inskick visas nedan'}
                  </>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary statistics - only relevant for gruppsessioner */}
      {sessionId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sammanfattning</CardTitle>
            <CardDescription>Baserat på deltagarnas smaknoteringar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{participantReviews.length}</p>
                <p className="text-sm text-muted-foreground">Deltagare</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">{averageRating}</p>
                <p className="text-sm text-muted-foreground">Genomsnitt betyg</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">{verifiedReview ? '✓' : '—'}</p>
                <p className="text-sm text-muted-foreground">Vinakademin</p>
              </div>
            </div>
            {(mostCommonAroma !== '—' || mostCommonFlavor !== '—') && (
              <>
                <Separator className="my-4" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mostCommonAroma !== '—' && (
                    <div className="text-center">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        Vanligaste doft
                      </p>
                      <p className="text-lg font-semibold">{mostCommonAroma}</p>
                    </div>
                  )}
                  {mostCommonFlavor !== '—' && (
                    <div className="text-center">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        Vanligaste smak
                      </p>
                      <p className="text-lg font-semibold">{mostCommonFlavor}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Desktop: Side-by-side comparison */}
      <div className="hidden lg:block">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {verifiedReview && renderReviewCard(verifiedReview)}
          {participantReviews.map((review) => renderReviewCard(review))}
        </div>
      </div>

      {/* Mobile: Stacked cards */}
      <div className="lg:hidden space-y-4">
        {verifiedReview && renderReviewCard(verifiedReview)}
        <Separator />
        {participantReviews.map((review) => renderReviewCard(review))}
      </div>
    </div>
  )
}
