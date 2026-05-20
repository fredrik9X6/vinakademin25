'use client'
import * as React from 'react'
import Link from 'next/link'
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
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div className="space-y-0.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Provning
          </span>
          <h1 className="font-heading tracking-[-0.015em] leading-[1.05] text-2xl">Blindkamp</h1>
        </div>
        <HelpExplainer />
      </header>

      {phase === 'placement' && (
        <>
          {isHost && (
            <div className="flex justify-end">
              <label className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
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
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3 text-center">
                  <p className="text-sm text-muted-foreground">
                    När alla har slagit in sina flaskor och tittar bort, klicka för att räkna ner.
                  </p>
                  <CountdownButton onComplete={() => setPhase('tasting')} />
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3 text-center">
                  <p className="text-sm text-muted-foreground">
                    När värden räknar ner, ställ din inslagna flaska på din hemliga plats.
                    Tryck sedan på knappen för att se vinerna och börja smaka.
                  </p>
                  <Button onClick={() => setPhase('tasting')} className="w-full">
                    Jag är klar — visa vinerna
                  </Button>
                </div>
              )}
            </>
          )}

          {useHelper && isHost && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
              <p className="font-medium">Neutral hjälpare</p>
              <p className="text-sm text-muted-foreground">
                Be någon som inte ska smaka att blanda och numrera de inslagna flaskorna 1–{totalSlots}.
                När det är klart, klicka för att börja provningen.
              </p>
              <Button onClick={() => setPhase('tasting')} className="w-full">
                Allt klart — starta provningen
              </Button>
            </div>
          )}

          {useHelper && !isHost && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3 text-center">
              <p className="text-sm text-muted-foreground">
                Värden använder en neutral hjälpare för att blanda flaskorna. När hjälparen är
                klar, tryck för att se vinerna.
              </p>
              <Button onClick={() => setPhase('tasting')} className="w-full">
                Visa vinerna
              </Button>
            </div>
          )}
        </>
      )}

      {phase === 'tasting' && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3 text-center">
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
        </div>
      )}
    </div>
  )
}
