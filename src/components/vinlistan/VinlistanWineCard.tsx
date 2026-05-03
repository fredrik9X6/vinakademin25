import Image from 'next/image'
import Link from 'next/link'
import { Star } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { WineImagePlaceholder } from '@/components/wine/WineImagePlaceholder'
import { cn } from '@/lib/utils'

const TYPE_LABEL: Record<string, string> = {
  red: 'Rött',
  white: 'Vitt',
  rose: 'Rosé',
  sparkling: 'Mousserande',
  orange: 'Orange',
  fortified: 'Starkvin',
  dessert: 'Dessert',
}

export function StarsRow({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} av ${max} stjärnor`}>
      {Array.from({ length: max }, (_, i) => {
        const filled = i < value
        return (
          <Star
            key={i}
            className={cn(
              'h-3.5 w-3.5',
              filled ? 'fill-brand-400 text-brand-400' : 'fill-transparent text-muted-foreground/30',
            )}
            strokeWidth={filled ? 0 : 1.5}
            aria-hidden
          />
        )
      })}
    </div>
  )
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(price)

interface VinlistanWineCardProps {
  wine: any
  review?: any
}

export function VinlistanWineCard({ wine, review = null }: VinlistanWineCardProps) {
  if (!wine) return null
  const href = `/vinlistan/${wine.slug || wine.id}`
  const typeLabel = wine.type ? TYPE_LABEL[String(wine.type)] || null : null
  const reviewerName: string | null =
    (review?.authorDisplayName as string) ||
    (typeof review?.user === 'object' && review?.user
      ? [review.user.firstName, review.user.lastName].filter(Boolean).join(' ').trim() || null
      : null)
  const grapeNames: string[] = Array.isArray(wine.grapes)
    ? (wine.grapes as any[]).map((g: any) => (typeof g === 'object' ? g?.name : g)).filter(Boolean)
    : []

  return (
    <Link href={href} className="group block">
      <Card className="h-full overflow-hidden border-border/60 transition-all duration-200 group-hover:border-brand-400/40 group-hover:shadow-lg">
        <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-muted/40 to-muted/10">
          {wine.image?.url ? (
            <Image
              src={wine.image.url}
              alt={wine.name}
              fill
              className="object-contain p-4 transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <WineImagePlaceholder size="md" />
          )}
          {Number(wine.price) ? (
            <div className="absolute right-2 top-2 rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold text-foreground backdrop-blur-sm shadow-sm">
              {formatPrice(Number(wine.price))}
            </div>
          ) : null}
        </div>

        <CardContent className="space-y-2 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {typeLabel ? (
              <Badge
                variant="outline"
                className="border-brand-300/40 bg-brand-300/10 px-2 py-0 text-[10px] font-semibold uppercase tracking-wide text-brand-400"
              >
                {typeLabel}
              </Badge>
            ) : null}
            {wine.vintage ? <span>· {wine.vintage}</span> : null}
          </div>

          <h3 className="text-base font-medium leading-tight line-clamp-2 break-words text-foreground group-hover:text-brand-400 transition-colors">
            {wine.name}
          </h3>

          {wine.winery ? (
            <p className="text-xs text-muted-foreground truncate">{wine.winery}</p>
          ) : null}

          {(wine.region?.name || wine.country?.name) && (
            <p className="text-xs text-muted-foreground truncate">
              {[wine.region?.name, wine.country?.name].filter(Boolean).join(' · ')}
            </p>
          )}

          {grapeNames.length ? (
            <p className="text-xs text-muted-foreground/80 truncate">
              {grapeNames.slice(0, 3).join(', ')}
            </p>
          ) : null}

          {review?.rating ? (
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
              <StarsRow value={Number(review.rating)} />
              {reviewerName ? (
                <span className="text-[11px] text-muted-foreground truncate">av {reviewerName}</span>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  )
}
