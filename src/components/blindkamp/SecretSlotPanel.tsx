'use client'
import { Card, CardContent } from '@/components/ui/card'

export function SecretSlotPanel({ slot, wineLabel }: { slot: number; wineLabel: string }) {
  return (
    <Card className="border-brand-400/50 bg-brand-400/5">
      <CardContent className="p-6 text-center space-y-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Din hemliga plats
        </p>
        <p className="font-heading text-5xl text-brand-400">#{slot}</p>
        <p className="text-sm">
          Ställ din inslagna flaska (<span className="font-medium">{wineLabel}</span>) på plats{' '}
          <strong>#{slot}</strong> när värden räknar ner.
        </p>
        <p className="text-xs text-muted-foreground">Visa inte denna skärm för andra deltagare.</p>
      </CardContent>
    </Card>
  )
}
