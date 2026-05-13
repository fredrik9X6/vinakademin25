'use client'

import * as React from 'react'
import Link from 'next/link'
import type { TastingPlan, Wine } from '@/payload-types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Pencil, ShoppingBag, Printer } from 'lucide-react'
import StartSessionButton from '@/components/course/StartSessionButton'

const STATUS_LABEL: Record<TastingPlan['status'], string> = {
  draft: 'Utkast',
  ready: 'Klar',
  archived: 'Arkiverad',
}
const STATUS_VARIANT: Record<TastingPlan['status'], 'brand' | 'default' | 'secondary'> = {
  draft: 'brand',
  ready: 'default',
  archived: 'secondary',
}

function formatRelative(iso: string): string {
  const ts = new Date(iso).getTime()
  if (Number.isNaN(ts)) return ''
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (diffSec < 60) return 'just nu'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min sedan`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} tim sedan`
  if (diffSec < 86400 * 30) return `${Math.floor(diffSec / 86400)} d sedan`
  return new Date(iso).toLocaleDateString('sv-SE')
}

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
    return [lib.winery, lib.vintage, region].filter(Boolean).join(' · ')
  }
  const c = w.customWine
  return [c?.producer, c?.vintage].filter(Boolean).join(' · ')
}

export interface PlanDetailViewProps {
  plan: TastingPlan
}

export function PlanDetailView({ plan }: PlanDetailViewProps) {
  const wines = plan.wines ?? []
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-32 grid gap-8 md:grid-cols-[1fr_280px]">
      <div className="space-y-6 min-w-0">
        <header>
          <h1 className="text-3xl font-heading">{plan.title}</h1>
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <Badge variant={STATUS_VARIANT[plan.status]}>{STATUS_LABEL[plan.status]}</Badge>
            <span>{plan.occasion || '—'}</span>
            <span>·</span>
            <span>Senast uppdaterad {formatRelative(plan.updatedAt)}</span>
          </div>
        </header>

        {plan.description && (
          <Card className="p-4">
            <p className="text-sm whitespace-pre-wrap">{plan.description}</p>
          </Card>
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Viner ({wines.length})</h2>
          {wines.length === 0 ? (
            <p className="text-sm text-muted-foreground">Inga viner tillagda.</p>
          ) : (
            <ul className="space-y-2">
              {wines.map((w, idx) => (
                <li key={w.id ?? idx} className="flex gap-3 rounded-md border bg-card p-3 items-start">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-400/10 text-brand-400 text-sm font-medium flex items-center justify-center">
                    {w.pourOrder ?? idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{wineTitle(w)}</p>
                    {wineSubtitle(w) && (
                      <p className="text-xs text-muted-foreground truncate">{wineSubtitle(w)}</p>
                    )}
                    {w.hostNotes && (
                      <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">
                        {w.hostNotes}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {plan.hostScript && (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Manus för värden</h2>
            <Card className="p-4">
              <p className="text-sm whitespace-pre-wrap">{plan.hostScript}</p>
            </Card>
          </section>
        )}
      </div>

      <aside className="md:sticky md:top-20 md:self-start space-y-2">
        <StartSessionButton
          tastingPlanId={plan.id}
          planTitle={plan.title}
          defaultBlindTasting={plan.blindTastingByDefault ?? false}
        />
        <Button asChild variant="outline" className="w-full">
          <Link href={`/mina-provningar/planer/${plan.id}/handlingslista`}>
            <ShoppingBag className="h-4 w-4 mr-2" />
            Visa handlingslista
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href={`/varguide/${plan.id}`}>
            <Printer className="h-4 w-4 mr-2" />
            Skriv ut värdguide
          </Link>
        </Button>
        <Button asChild variant="ghost" className="w-full">
          <Link href={`/skapa-provning/${plan.id}`}>
            <Pencil className="h-4 w-4 mr-2" />
            Redigera
          </Link>
        </Button>
      </aside>
    </div>
  )
}
