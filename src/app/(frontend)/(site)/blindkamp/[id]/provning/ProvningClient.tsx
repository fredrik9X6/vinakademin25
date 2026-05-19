'use client'
import * as React from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SecretSlotPanel } from '@/components/blindkamp/SecretSlotPanel'
import { CountdownButton } from '@/components/blindkamp/CountdownButton'
import { HelpExplainer } from '@/components/blindkamp/HelpExplainer'

export function ProvningClient({
  battleId,
  sessionId,
  mySlot,
  myWineLabel,
  isHost,
  totalSlots,
}: {
  battleId: number
  sessionId: number
  mySlot: number
  myWineLabel: string
  isHost: boolean
  totalSlots: number
}) {
  const [phase, setPhase] = React.useState<'placement' | 'tasting'>('placement')

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-heading">Blindkamp</h1>
        <HelpExplainer />
      </header>

      {phase === 'placement' && (
        <>
          <SecretSlotPanel slot={mySlot} wineLabel={myWineLabel} />
          {isHost && (
            <Card>
              <CardContent className="p-5 space-y-3 text-center">
                <p className="text-sm text-muted-foreground">
                  När alla har slagit in sina flaskor och tittar bort, klicka för att räkna ner.
                </p>
                <CountdownButton onComplete={() => setPhase('tasting')} />
              </CardContent>
            </Card>
          )}
          {!isHost && (
            <Card>
              <CardContent className="p-5 text-center text-sm text-muted-foreground">
                Väntar på värden att starta nedräkningen…
              </CardContent>
            </Card>
          )}
        </>
      )}

      {phase === 'tasting' && (
        <Card>
          <CardContent className="p-5 space-y-3 text-center">
            <p className="font-medium">Provningen är igång</p>
            <p className="text-sm text-muted-foreground">
              Vinerna är på plats 1–{totalSlots}. Häll från plats 1 till alla, sätt betyg, gå sedan
              till nästa plats.
            </p>
            <Button asChild className="w-full">
              <Link href={`/mina-provningar/historik/${sessionId}`}>Gå till provningen</Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Du ser ditt eget vin på plats {mySlot} när det är dags att smaka. Ditt eget betyg
              räknas inte mot snittet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
