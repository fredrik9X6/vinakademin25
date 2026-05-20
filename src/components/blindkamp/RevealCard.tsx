'use client'
import { Card, CardContent } from '@/components/ui/card'
import { Trophy } from 'lucide-react'

export function RevealCard({
  slot,
  wineTitle,
  producer,
  vintage,
  imageUrl,
  submitterName,
  averageRating,
  isWinner,
}: {
  slot: number
  wineTitle: string
  producer: string | null
  vintage: string | null
  imageUrl: string | null
  submitterName: string
  averageRating: number | null
  isWinner: boolean
}) {
  return (
    <Card className={isWinner ? 'border-amber-400/60 bg-amber-50/30 dark:bg-amber-950/10' : ''}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={wineTitle}
              className="w-16 h-20 object-contain flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Plats #{slot}</span>
              {isWinner && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-xs font-medium">
                  <Trophy className="h-3 w-3" /> Vinnare
                </span>
              )}
            </div>
            <p className="font-medium mt-1">{wineTitle}</p>
            {(producer || vintage) && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {[producer, vintage].filter(Boolean).join(' · ')}
              </p>
            )}
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-sm">
                Insänt av <span className="font-medium">{submitterName}</span>
              </p>
              <p className="text-sm">
                {averageRating !== null ? `${averageRating.toFixed(2)} ★` : '—'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
