import { Card } from '@/components/ui/card'
import { WineImagePlaceholder } from '@/components/wine/WineImagePlaceholder'
import {
  NO_REVIEW_PLACEHOLDER,
  ratingDiffSentence,
  uniqueFlavoursSentence,
} from '@/lib/session-recap-copy'
import type { PerWineRecap } from '@/lib/session-recap'

export interface WineRecapCardProps {
  wine: PerWineRecap
}

function renderStars(rating: number | null): string {
  if (rating == null) return '—'
  const full = Math.max(0, Math.min(5, Math.round(rating)))
  return '★'.repeat(full) + '☆'.repeat(5 - full)
}

export function WineRecapCard({ wine }: WineRecapCardProps) {
  const { myReview, ratingCount, avgRating, topFlavours } = wine
  const groupTopLabels = topFlavours.map((f) => f.label)

  // Narrative footer — only when both viewer and group have stats to compare
  const diffSentence =
    myReview?.rating != null && avgRating != null
      ? ratingDiffSentence(myReview.rating, avgRating)
      : null
  const uniqueSentence =
    myReview && myReview.flavours.length > 0
      ? uniqueFlavoursSentence(myReview.flavours, groupTopLabels)
      : null
  const narrative = [diffSentence, uniqueSentence].filter(Boolean).join(' ')

  return (
    <Card className="p-4">
      <div className="flex gap-3 sm:gap-4 items-center">
        <div className="relative flex-shrink-0 w-20 h-32 sm:w-24 sm:h-36">
          <span
            className="absolute inset-0 flex items-start justify-start font-heading leading-[0.85] text-muted-foreground/25 select-none pointer-events-none text-[110px] sm:text-[130px] -ml-2 -mt-1"
            aria-hidden="true"
          >
            {wine.pourOrder}
          </span>
          {wine.thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={wine.thumbUrl}
              alt=""
              className="relative w-full h-full object-contain"
            />
          ) : (
            <WineImagePlaceholder />
          )}
        </div>
        <div className="flex-1 min-w-0 pt-1">
          <p className="text-sm sm:text-base font-medium truncate">{wine.title}</p>
          {wine.subtitle && (
            <p className="text-xs text-muted-foreground truncate">{wine.subtitle}</p>
          )}
          {wine.priceSek != null && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {wine.priceSek.toLocaleString('sv-SE')} kr
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Gruppen
          </p>
          {ratingCount > 0 && avgRating != null ? (
            <p className="text-sm">
              <span className="text-brand-400 tracking-wider">
                {renderStars(avgRating)}
              </span>{' '}
              <span>{avgRating.toFixed(1)}</span>{' '}
              <span className="text-muted-foreground">({ratingCount} betyg)</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Inga betyg ännu</p>
          )}
          {topFlavours.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {topFlavours.map((f) => (
                <span
                  key={f.label}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
                >
                  <span className="capitalize">{f.label}</span>
                  <span className="text-muted-foreground">({f.count})</span>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Du
          </p>
          {myReview ? (
            <>
              {myReview.rating != null ? (
                <p className="text-sm">
                  <span className="text-brand-400 tracking-wider">
                    {renderStars(myReview.rating)}
                  </span>{' '}
                  <span>{myReview.rating.toFixed(1)}</span>
                </p>
              ) : null}
              {myReview.flavours.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {myReview.flavours.slice(0, 8).map((f) => (
                    <span
                      key={f}
                      className="inline-flex items-center rounded-full bg-brand-400/10 text-brand-400 px-2 py-0.5 text-xs"
                    >
                      <span className="capitalize">{f}</span>
                    </span>
                  ))}
                </div>
              )}
              {myReview.reviewText && (
                <p className="pt-2 text-xs text-muted-foreground italic line-clamp-3">
                  &quot;{myReview.reviewText}&quot;
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              {NO_REVIEW_PLACEHOLDER}
            </p>
          )}
        </div>
      </div>

      {narrative && (
        <p className="mt-3 text-xs text-muted-foreground border-t pt-3">{narrative}</p>
      )}
    </Card>
  )
}
