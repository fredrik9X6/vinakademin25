'use client'
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
  if (isWinner) {
    return (
      <div className="rounded-[20px] p-0.5 bg-gradient-to-r from-[#FB914C] to-[#FDBA75] shadow-[0_0_40px_-16px_rgba(251,145,76,0.25)]">
        <div className="rounded-[18px] bg-card p-6">
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
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Plats #{slot}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(251,145,76,0.15)] text-[#FB914C] px-2.5 py-0.5 text-[11px] font-semibold">
                  <Trophy className="h-3 w-3" /> Vinnare
                </span>
              </div>
              <p className="font-heading tracking-[-0.015em] text-lg mt-1">{wineTitle}</p>
              {(producer || vintage) && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {[producer, vintage].filter(Boolean).join(' · ')}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-sm">
                  Insänt av <span className="font-medium">{submitterName}</span>
                </p>
                <p className="text-sm tabular-nums">
                  {averageRating !== null ? `${averageRating.toFixed(2)} ★` : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
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
            <p className="text-sm tabular-nums">
              {averageRating !== null ? `${averageRating.toFixed(2)} ★` : '—'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
