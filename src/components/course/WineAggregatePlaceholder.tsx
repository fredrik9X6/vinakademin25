'use client'

import { Card, CardContent } from '../ui/card'
import { Wine as WineIcon, Lock } from 'lucide-react'

interface WineAggregatePlaceholderProps {
  count: number
  totalSek: number
}

export function WineAggregatePlaceholder({ count, totalSek }: WineAggregatePlaceholderProps) {
  if (count === 0) return null

  const formattedTotal = new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(totalSek)

  return (
    <Card className="my-6 border border-brand-300/30 bg-gradient-to-br from-brand-300/10 via-card to-brand-300/5 shadow-md">
      <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-brand-300/15 p-3">
            <WineIcon className="h-6 w-6 text-brand-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-foreground">
              {count} viner ingår i kursen
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Total kostnad ca {formattedTotal} (köps separat).
              Vilka viner det är låses upp när du köper kursen.
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground sm:flex">
          <Lock className="h-3.5 w-3.5" />
          Lås upp med köp
        </div>
      </CardContent>
    </Card>
  )
}
