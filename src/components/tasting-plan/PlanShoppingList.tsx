import Link from 'next/link'
import type { TastingPlan, Wine } from '@/payload-types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ExternalLink, Search } from 'lucide-react'

export interface PlanShoppingListProps {
  plan: TastingPlan
}

export function PlanShoppingList({ plan }: PlanShoppingListProps) {
  const wines = plan.wines ?? []
  const prices = wines
    .map((w) => {
      if (w.libraryWine && typeof w.libraryWine === 'object') {
        return (w.libraryWine as Wine).price ?? null
      }
      return w.customWine?.priceSek ?? null
    })
    .filter((p): p is number => typeof p === 'number')
  const sum = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) : null

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href={`/mina-provningar/planer/${plan.id}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Tillbaka till planen
      </Link>

      <header className="mb-6">
        <h1 className="text-2xl font-heading">Handlingslista — {plan.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {wines.length} viner
          {sum != null && (
            <>
              {' '}
              · totalt ~{sum} kr{' '}
              {prices.length < wines.length && (
                <span>(saknar pris på {wines.length - prices.length})</span>
              )}
            </>
          )}
        </p>
      </header>

      {wines.length === 0 ? (
        <p className="text-sm text-muted-foreground">Inga viner i planen.</p>
      ) : (
        <ul className="space-y-3">
          {wines.map((w, idx) => {
            const pourOrder = w.pourOrder ?? idx + 1
            const isLibrary = w.libraryWine && typeof w.libraryWine === 'object'
            const lib = isLibrary ? (w.libraryWine as Wine) : null
            const c = w.customWine

            const title = lib ? lib.name || `Vin #${lib.id}` : c?.name || 'Namnlöst vin'
            const subtitle = lib
              ? [
                  lib.winery,
                  lib.vintage,
                  typeof lib.region === 'object' && lib.region ? lib.region.name ?? null : null,
                ]
                  .filter(Boolean)
                  .join(' · ')
              : [c?.producer, c?.vintage].filter(Boolean).join(' · ')
            const thumb =
              lib && typeof lib.image === 'object' && lib.image
                ? lib.image.sizes?.bottle?.url ??
                  lib.image.sizes?.thumbnail?.url ??
                  lib.image.url ??
                  null
                : null
            const price = lib ? lib.price ?? null : c?.priceSek ?? null
            const url = lib ? lib.systembolagetUrl ?? null : c?.systembolagetUrl ?? null
            const searchUrl = `https://www.systembolaget.se/sok/?varuNr=&sok=${encodeURIComponent(
              title,
            )}`

            return (
              <li key={w.id ?? idx}>
                <Card className="p-4 flex gap-3 items-start">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-400/10 text-brand-400 text-sm font-semibold flex items-center justify-center">
                    {pourOrder}
                  </div>
                  {thumb ? (
                    <img
                      src={thumb}
                      alt=""
                      className="h-12 w-12 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded bg-muted flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{title}</p>
                    {subtitle && (
                      <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
                    )}
                    {price != null && (
                      <p className="text-xs text-muted-foreground mt-1">{price} kr</p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {url ? (
                      <Button asChild size="sm" variant="outline">
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Köp hos Systembolaget
                        </a>
                      </Button>
                    ) : (
                      <Button asChild size="sm" variant="ghost">
                        <a href={searchUrl} target="_blank" rel="noopener noreferrer">
                          <Search className="h-3 w-3 mr-1" />
                          Hitta hos Systembolaget
                        </a>
                      </Button>
                    )}
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      {sum != null && wines.length > 0 && (
        <Card className="mt-6 p-4">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Totalt</p>
              <p className="text-2xl font-heading tabular-nums">
                ~{sum.toLocaleString('sv-SE')} kr
              </p>
            </div>
            {(plan.targetParticipants ?? 0) > 0 && (
              <div className="text-right">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Per person
                </p>
                <p className="text-base tabular-nums">
                  ~{Math.round(sum / (plan.targetParticipants ?? 1)).toLocaleString('sv-SE')} kr
                  <span className="text-muted-foreground">
                    {' '}
                    × {plan.targetParticipants} st
                  </span>
                </p>
              </div>
            )}
          </div>
          {prices.length < wines.length && (
            <p className="text-xs text-muted-foreground mt-3">
              Saknar pris på {wines.length - prices.length}{' '}
              {wines.length - prices.length === 1 ? 'vin' : 'viner'} — totalen är ett minimum.
            </p>
          )}
        </Card>
      )}
    </div>
  )
}
