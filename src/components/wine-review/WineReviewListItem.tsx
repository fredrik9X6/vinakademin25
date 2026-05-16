import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Review, Wine, Media } from '@/payload-types'

type WineType = 'red' | 'white' | 'rose' | 'sparkling' | 'dessert' | 'fortified' | 'other'

const TYPE_LABEL_SV: Record<WineType, string> = {
  red: 'Rött',
  white: 'Vitt',
  rose: 'Rosé',
  sparkling: 'Mousserande',
  dessert: 'Dessert',
  fortified: 'Fortifierat',
  other: 'Annat',
}

// Light tints + readable text colour for each wine type. Tailwind utility
// classes so dark mode flips automatically.
const TYPE_CHIP_CLASSES: Record<WineType, string> = {
  red: 'bg-rose-100 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200',
  white: 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
  rose: 'bg-pink-100 text-pink-900 dark:bg-pink-950/40 dark:text-pink-200',
  sparkling: 'bg-sky-100 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200',
  dessert: 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
  fortified: 'bg-stone-200 text-stone-900 dark:bg-stone-800 dark:text-stone-200',
  other: 'bg-muted text-muted-foreground',
}

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
      return m.sizes?.bottle?.url ?? m.sizes?.thumbnail?.url ?? m.url ?? null
    }
  }
  return (r.customWine as any)?.imageUrl ?? null
}

function reviewWineType(r: Review): WineType | null {
  if (r.wine && typeof r.wine === 'object') {
    const w = r.wine as Wine
    const t = (w as { type?: string | null }).type
    if (t && t in TYPE_LABEL_SV) return t as WineType
    return null
  }
  const t = (r.customWine as any)?.type as string | undefined
  if (t && t in TYPE_LABEL_SV) return t as WineType
  return null
}

export function WineReviewListItem({ review, href, showPublishedBadge = true }: WineReviewListItemProps) {
  const title = reviewWineTitle(review)
  const subtitle = reviewWineSubtitle(review)
  const thumb = reviewThumbnailUrl(review)
  const type = reviewWineType(review)
  const rating = (review as any).rating as number | undefined
  const date = review.createdAt ? new Date(review.createdAt).toLocaleDateString('sv-SE') : null

  const content = (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="w-14 h-14 rounded-md overflow-hidden bg-muted/40 flex-shrink-0 relative">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumb}
              alt=""
              className="absolute inset-0 w-full h-full object-contain p-1"
            />
          ) : null}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium truncate">{title}</p>
            {type && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider flex-shrink-0 ${TYPE_CHIP_CLASSES[type]}`}
              >
                {TYPE_LABEL_SV[type]}
              </span>
            )}
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
