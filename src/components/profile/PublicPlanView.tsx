import Link from 'next/link'
import type { TastingPlan, Wine } from '@/payload-types'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Users } from 'lucide-react'

function wineTitle(w: NonNullable<TastingPlan['wines']>[number]): string {
  if (w.libraryWine && typeof w.libraryWine === 'object') {
    const lib = w.libraryWine as Wine
    return lib.name || `Vin #${lib.id}`
  }
  return w.customWine?.name || 'Vin'
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

export interface PublicPlanViewProps {
  plan: TastingPlan
  handle: string
  hostDisplayName: string
}

export function PublicPlanView({ plan, handle, hostDisplayName }: PublicPlanViewProps) {
  const wines = plan.wines ?? []
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <Link
        href={`/v/${handle}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Tillbaka till {hostDisplayName}
      </Link>
      <header>
        <h1 className="text-3xl font-heading">{plan.title}</h1>
        {plan.description && (
          <p className="text-base text-muted-foreground mt-2 whitespace-pre-wrap">
            {plan.description}
          </p>
        )}
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
          <span>{plan.occasion || '—'}</span>
          <span>·</span>
          <span>{wines.length} viner</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            ~{plan.targetParticipants ?? 4} deltagare
          </span>
          <span>·</span>
          <span>Av <Link href={`/v/${handle}`} className="hover:underline">@{handle}</Link></span>
        </div>
      </header>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Viner</h2>
        {wines.length === 0 ? (
          <p className="text-sm text-muted-foreground">Inga viner i planen.</p>
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
  )
}
