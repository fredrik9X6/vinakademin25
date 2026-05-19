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
  joinCode,
  mySlot,
  myWineLabel,
  isHost,
  totalSlots,
}: {
  battleId: number
  joinCode: string
  mySlot: number
  myWineLabel: string
  isHost: boolean
  totalSlots: number
}) {
  const [phase, setPhase] = React.useState<'placement' | 'tasting'>('placement')
  const [useHelper, setUseHelper] = React.useState(false)

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-heading">Blindkamp</h1>
        <HelpExplainer />
      </header>

      {phase === 'placement' && (
        <>
          {isHost && (
            <div className="flex justify-end">
              <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={useHelper}
                  onChange={(e) => setUseHelper(e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                Använd neutral hjälpare istället för hemlig plats
              </label>
            </div>
          )}

          {!useHelper && (
            <>
              <SecretSlotPanel slot={mySlot} wineLabel={myWineLabel} />
              {isHost ? (
                <Card>
                  <CardContent className="p-5 space-y-3 text-center">
                    <p className="text-sm text-muted-foreground">
                      När alla har slagit in sina flaskor och tittar bort, klicka för att räkna ner.
                    </p>
                    <CountdownButton onComplete={() => setPhase('tasting')} />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-5 text-center text-sm text-muted-foreground">
                    Väntar på värden att starta nedräkningen…
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {useHelper && isHost && (
            <Card>
              <CardContent className="p-5 space-y-3">
                <p className="font-medium">Neutral hjälpare</p>
                <p className="text-sm text-muted-foreground">
                  Be någon som inte ska smaka att blanda och numrera de inslagna flaskorna 1–{totalSlots}.
                  När det är klart, klicka för att börja provningen.
                </p>
                <Button onClick={() => setPhase('tasting')} className="w-full">
                  Allt klart — starta provningen
                </Button>
              </CardContent>
            </Card>
          )}

          {useHelper && !isHost && (
            <Card>
              <CardContent className="p-5 text-center text-sm text-muted-foreground">
                Värden använder en neutral hjälpare för att blanda flaskorna. Väntar på att de blir klara…
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
              <Link href={`/delta?code=${encodeURIComponent(joinCode)}`}>Gå till provningen</Link>
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
