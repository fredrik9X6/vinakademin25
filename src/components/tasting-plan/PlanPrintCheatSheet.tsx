'use client'

import * as React from 'react'
import Link from 'next/link'
import type { TastingPlan, Wine } from '@/payload-types'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Printer } from 'lucide-react'

function wineTitle(w: NonNullable<TastingPlan['wines']>[number]): string {
  if (w.libraryWine && typeof w.libraryWine === 'object') {
    const lib = w.libraryWine as Wine
    return lib.name || `Vin #${lib.id}`
  }
  return w.customWine?.name || 'Namnlöst vin'
}

function wineSubtitle(w: NonNullable<TastingPlan['wines']>[number]): string {
  if (w.libraryWine && typeof w.libraryWine === 'object') {
    const lib = w.libraryWine as Wine
    const region =
      typeof lib.region === 'object' && lib.region ? lib.region.name ?? null : null
    const price = lib.price ?? null
    return [
      lib.winery,
      lib.vintage ? String(lib.vintage) : null,
      region,
      price != null ? `${price} kr` : null,
    ]
      .filter(Boolean)
      .join(' · ')
  }
  const c = w.customWine
  return [c?.producer, c?.vintage, c?.priceSek != null ? `${c.priceSek} kr` : null]
    .filter(Boolean)
    .join(' · ')
}

export interface PlanPrintCheatSheetProps {
  plan: TastingPlan
}

export function PlanPrintCheatSheet({ plan }: PlanPrintCheatSheetProps) {
  const wines = plan.wines ?? []
  const today = new Date().toLocaleDateString('sv-SE')
  return (
    <>
      <style>{`
        @media print {
          .screen-only { display: none !important; }
          @page { margin: 16mm; }
          body { font-size: 11pt; }
          .wine-row { break-inside: avoid; }
        }
      `}</style>

      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="screen-only mb-6 flex items-center justify-between">
          <Link
            href={`/mina-provningar/planer/${plan.id}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Tillbaka till planen
          </Link>
          <Button type="button" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Skriv ut
          </Button>
        </div>

        <header className="mb-6 pb-4 border-b">
          <h1 className="text-3xl font-heading">Värdguide — {plan.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {plan.occasion || '—'} · {plan.targetParticipants ?? 4} deltagare · Utskriven {today}
          </p>
        </header>

        {plan.hostScript && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-2">Manus</h2>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{plan.hostScript}</p>
          </section>
        )}

        <section>
          <h2 className="text-lg font-semibold mb-3">Viner</h2>
          {wines.length === 0 ? (
            <p className="text-sm text-muted-foreground">Inga viner i planen.</p>
          ) : (
            <ul className="space-y-4">
              {wines.map((w, idx) => (
                <li key={w.id ?? idx} className="wine-row pb-4 border-b last:border-b-0">
                  <div className="flex gap-3 items-baseline">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full border border-foreground text-sm font-semibold flex items-center justify-center">
                      {w.pourOrder ?? idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-semibold">{wineTitle(w)}</p>
                      {wineSubtitle(w) && (
                        <p className="text-xs text-muted-foreground">{wineSubtitle(w)}</p>
                      )}
                    </div>
                  </div>
                  {w.hostNotes && (
                    <p className="mt-2 ml-10 text-sm whitespace-pre-wrap leading-relaxed">
                      {w.hostNotes}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
