'use client'

import { Card, CardContent } from '../ui/card'
import { Wine as WineIcon } from 'lucide-react'

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
      <CardContent className="flex items-start gap-4 p-6">
        <div className="rounded-xl bg-brand-300/15 p-3 flex-shrink-0">
          <WineIcon className="h-6 w-6 text-brand-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-foreground">
            Vi guidar dig genom {count} viner
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            <strong className="text-foreground">Vinerna ingår inte i kursen</strong> —
            du köper dem själv på Systembolaget. Vi har valt ut dem och guidar dig genom
            dofter, smaker och tekniker. Total inköpskostnad ca {formattedTotal}.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Vilka viner det är ser du när du köper vinkvällen.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
