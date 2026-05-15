import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Review, Wine, Media } from '@/payload-types'

export interface WineReviewListItemProps {
  review: Review
  /** When set, the card is a link to this href. Otherwise rendered as a static card. */
  href?: string
  /** Show the "Publicerad" badge. Defaults to true. */
  showPublishedBadge?: boolean
}

function reviewWineTitle(r: Review): string {
  if (r.wine && typeof r.wine === 'object') {
    return (r.wine as Wine).name || `Vin #${(r.wine as Wine).id}`
  }
  return (r.customWine as any)?.name || 'Vin'
}

function reviewWineSubtitle(r: Review): string {
  if (r.wine && typeof r.wine === 'object') {
    const w = r.wine as Wine
    const parts = [w.winery, w.vintage].filter(Boolean)
    return parts.join(' · ')
  }
  const c = (r.customWine as any) || {}
  const parts = [c.producer, c.vintage].filter(Boolean)
  return parts.join(' · ')
}

function reviewThumbnailUrl(r: Review): string | null {
  if (r.wine && typeof r.wine === 'object') {
    const img = (r.wine as Wine).image
    if (typeof img === 'object' && img) {
      const m = img as Media
      return m.sizes?.thumbnail?.url ?? m.url ?? null
    }
  }
  return (r.customWine as any)?.imageUrl ?? null
}

export function WineReviewListItem({ review, href, showPublishedBadge = true }: WineReviewListItemProps) {
  const title = reviewWineTitle(review)
  const subtitle = reviewWineSubtitle(review)
  const thumb = reviewThumbnailUrl(review)
  const rating = (review as any).rating as number | undefined
  const date = review.createdAt ? new Date(review.createdAt).toLocaleDateString('sv-SE') : null

  const content = (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="w-14 h-14 rounded-md overflow-hidden bg-muted/40 flex-shrink-0">
          {thumb ? (
            <Image src={thumb} alt="" width={56} height={56} className="object-contain w-full h-full p-1" />
          ) : null}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{title}</p>
            {showPublishedBadge && review.publishedToProfile && (
              <Badge variant="secondary">Publicerad</Badge>
            )}
          </div>
          {subtitle && <p className="text-sm text-muted-foreground truncate">{subtitle}</p>}
          <div className="flex items-center gap-3 mt-1">
            {typeof rating === 'number' && (
              <span className="text-brand-400 text-sm tracking-wider">
                {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}
              </span>
            )}
            {date && <span className="text-xs text-muted-foreground">{date}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return href ? <Link href={href}>{content}</Link> : content
}
