'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Skeleton } from '@/components/ui/skeleton'
import { RichTextRenderer } from '@/components/ui/rich-text-renderer'
import { LayoutGrid, List, Star } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import type { Review } from '@/payload-types'

type ViewMode = 'grid' | 'list'

type ReviewWithWine = Review & {
  wine?: any
  createdAt?: string
}

function formatDate(dateString?: string | null) {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatRichText(value: unknown) {
  if (typeof value === 'string') return <span>{value}</span>
  if (value && typeof value === 'object' && 'root' in (value as any)) {
    return <RichTextRenderer content={value as any} />
  }
  return null
}

function WineGridCard({ review }: { review: ReviewWithWine }) {
  const wine = typeof review.wine === 'object' ? review.wine : null
  if (!wine) return null

  const href = `/vinlistan/${wine.slug || wine.id}`

  return (
    <Link href={href} className="block">
      <Card className="h-full hover:shadow-md transition-shadow">
        <CardHeader className="p-3">
          <CardTitle className="text-base font-medium line-clamp-2 break-words">
            {wine.name} {wine.vintage ? `· ${wine.vintage}` : ''}
          </CardTitle>
          <div className="text-xs text-muted-foreground truncate">{wine.winery || ''}</div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="flex items-center gap-3">
            <div className="relative h-28 w-16 flex-shrink-0 rounded-md overflow-hidden bg-transparent">
              {wine.image?.url ? (
                <Image src={wine.image.url} alt={wine.name} fill className="object-contain" />
              ) : null}
            </div>
            <div className="min-w-0 text-sm">
              <div className="truncate">
                {wine.region?.name || ''}
                {wine.country?.name ? `, ${wine.country.name}` : ''}
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3 w-3" />
                <span>Betyg: {review.rating ?? '-'}/5</span>
              </div>
              {typeof review.buyAgain === 'boolean' && (
                <div className="mt-1 text-xs text-muted-foreground">
                  {review.buyAgain ? 'Hade köpt igen' : 'Hade inte köpt igen'}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function ReviewListItem({ review }: { review: ReviewWithWine }) {
  const wine = typeof review.wine === 'object' ? review.wine : null
  const href = wine ? `/vinlistan/${wine.slug || wine.id}` : undefined

  const sweetness = review.wsetTasting?.palate?.sweetness
  const acidity = review.wsetTasting?.palate?.acidity
  const body = review.wsetTasting?.palate?.body

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {href ? (
              <Link href={href} className="hover:underline">
                <CardTitle className="text-base break-words">{wine?.name || 'Vin'}</CardTitle>
              </Link>
            ) : (
              <CardTitle className="text-base break-words">{wine?.name || 'Vin'}</CardTitle>
            )}
            <div className="text-xs text-muted-foreground">
              {formatDate(review.createdAt)}
              {review.session ? ' • Gruppsession' : ''}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <Badge variant="secondary">Betyg: {review.rating ?? '-'}/5</Badge>
            {typeof review.buyAgain === 'boolean' && (
              <span className="text-xs text-muted-foreground">
                {review.buyAgain ? 'Hade köpt igen' : 'Hade inte köpt igen'}
              </span>
            )}
          </div>
        </div>

        {(sweetness || acidity || body) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {sweetness && <Badge variant="outline">Sötma: {sweetness}</Badge>}
            {acidity && <Badge variant="outline">Syra: {acidity}</Badge>}
            {body && <Badge variant="outline">Fyllighet: {body}</Badge>}
          </div>
        )}
      </CardHeader>

      {(review.reviewText || review.wsetTasting?.conclusion?.summary) && (
        <CardContent className="pt-0">
          <div className="text-sm text-muted-foreground">
            {formatRichText(review.reviewText ?? review.wsetTasting?.conclusion?.summary)}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export function UserReviewsPanel() {
  const { user } = useAuth()
  const [viewMode, setViewMode] = React.useState<ViewMode>('grid')
  const [loading, setLoading] = React.useState(true)
  const [reviews, setReviews] = React.useState<ReviewWithWine[]>([])

  React.useEffect(() => {
    const run = async () => {
      if (!user?.id) return
      setLoading(true)
      try {
        const res = await fetch('/api/reviews?limit=200&depth=2&sort=-createdAt', {
          credentials: 'include',
        })
        if (!res.ok) {
          setReviews([])
          return
        }
        const json = await res.json()
        setReviews((json?.docs || []) as ReviewWithWine[])
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [user?.id])

  const gridItems = React.useMemo(() => {
    // Grid view should behave like a wine gallery: one card per wine.
    const byWine = new Map<string, ReviewWithWine>()
    for (const r of reviews) {
      const wine = typeof r.wine === 'object' ? r.wine : null
      if (!wine) continue
      const key = String(wine.id)
      const prev = byWine.get(key)
      if (!prev) {
        byWine.set(key, r)
        continue
      }
      const prevTime = prev.createdAt ? new Date(prev.createdAt).getTime() : 0
      const nextTime = r.createdAt ? new Date(r.createdAt).getTime() : 0
      if (nextTime >= prevTime) byWine.set(key, r)
    }
    return Array.from(byWine.values())
  }, [reviews])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h4 className="text-sm font-medium">Dina vinrecensioner</h4>
          <p className="text-xs text-muted-foreground">
            {reviews.length === 0
              ? 'Du har inte skrivit några recensioner ännu.'
              : `${reviews.length} recensioner`}
          </p>
        </div>

        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(v) => v && setViewMode(v as ViewMode)}
          variant="outline"
          size="sm"
          className="justify-start"
        >
          <ToggleGroupItem value="grid" aria-label="Rutnät">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="Lista">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {reviews.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Inga recensioner hittades.
            <div className="mt-4">
              <Button asChild variant="secondary">
                <Link href="/vinprovningar">Gå till vinprovningar</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {gridItems.map((r) => (
            <WineGridCard
              key={String((typeof r.wine === 'object' && r.wine?.id) || r.id)}
              review={r}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <ReviewListItem key={String(r.id)} review={r} />
          ))}
        </div>
      )}
    </div>
  )
}
