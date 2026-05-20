'use client'
import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SecretSlotPanel } from '@/components/blindkamp/SecretSlotPanel'
import { HelpExplainer } from '@/components/blindkamp/HelpExplainer'

export function ProvningClient({
  battleId: _battleId,
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
                Använd neutral hjälpare istället
              </label>
            </div>
          )}

          {!useHelper && (
            <>
              <SecretSlotPanel slot={mySlot} wineLabel={myWineLabel} />
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3 text-center">
                <p className="text-sm text-muted-foreground">
                  När din flaska är märkt med <strong>#{mySlot}</strong> och står på bordet, tryck
                  här för att gå vidare.
                </p>
                <Button onClick={() => setPhase('tasting')} className="w-full">
                  Klart — visa vinerna
                </Button>
              </div>
            </>
          )}

          {useHelper && isHost && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
              <p className="font-medium">Neutral hjälpare</p>
              <p className="text-sm text-muted-foreground">
                Be någon som inte ska smaka att blanda och numrera de inslagna flaskorna 1–
                {totalSlots}. När det är klart, klicka för att börja provningen.
              </p>
              <Button onClick={() => setPhase('tasting')} className="w-full">
                Allt klart — starta provningen
              </Button>
            </div>
          )}

          {useHelper && !isHost && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3 text-center">
              <p className="text-sm text-muted-foreground">
                Värden använder en neutral hjälpare. När hjälparen är klar, tryck för att se
                vinerna.
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
            Vinerna är märkta 1–{totalSlots}. Häll från flaska #1 till alla, sätt betyg, gå sedan
            till nästa.
          </p>
          <Button asChild className="w-full">
            <Link href={`/delta?code=${encodeURIComponent(joinCode)}`}>Gå till provningen</Link>
          </Button>
          {!useHelper && (
            <p className="text-xs text-muted-foreground">
              Du vet att flaska #{mySlot} är din. Ditt eget betyg räknas inte mot snittet.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
