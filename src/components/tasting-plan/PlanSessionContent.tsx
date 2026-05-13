'use client'

import * as React from 'react'
import { toast } from 'sonner'
import type { TastingPlan, Wine, CourseSession } from '@/payload-types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Wine as WineIcon, Crown } from 'lucide-react'
import { WineReviewForm } from '@/components/course/WineReviewForm'
import { WineImagePlaceholder } from '@/components/wine/WineImagePlaceholder'
import { useActiveSession } from '@/context/SessionContext'

interface PlanSessionContentProps {
  session: CourseSession
  plan: TastingPlan
  isHost: boolean
  followingHost: boolean
  sidebarExtra?: React.ReactNode
}

type WineRow = {
  key: string
  pourOrder: number
  title: string
  subtitle: string
  hostNotes: string | null
  libraryWineId: number | null
  imageUrl: string | null
  customWineSnapshot: {
    name: string
    producer?: string
    vintage?: string
    type?: 'red' | 'white' | 'rose' | 'sparkling' | 'dessert' | 'fortified' | 'other'
    systembolagetUrl?: string
    priceSek?: number
  } | null
}

function rowFromEntry(
  w: NonNullable<TastingPlan['wines']>[number],
  idx: number,
): WineRow {
  const pourOrder = w.pourOrder ?? idx + 1
  if (w.libraryWine && typeof w.libraryWine === 'object') {
    const lib = w.libraryWine as Wine
    const region =
      typeof lib.region === 'object' && lib.region ? lib.region.name ?? null : null
    const image = typeof lib.image === 'object' && lib.image ? lib.image : null
    const imageUrl = image ? image.sizes?.thumbnail?.url ?? image.url ?? null : null
    return {
      key: w.id ?? `lib-${lib.id}-${idx}`,
      pourOrder,
      title: lib.name || `Vin #${lib.id}`,
      subtitle: [lib.winery, lib.vintage, region].filter(Boolean).join(' · '),
      hostNotes: w.hostNotes ?? null,
      libraryWineId: lib.id,
      imageUrl,
      customWineSnapshot: null,
    }
  }
  const c = w.customWine
  return {
    key: w.id ?? `cust-${idx}`,
    pourOrder,
    title: c?.name || 'Namnlöst vin',
    subtitle: [c?.producer, c?.vintage].filter(Boolean).join(' · '),
    hostNotes: w.hostNotes ?? null,
    libraryWineId: null,
    imageUrl: null,
    customWineSnapshot: c?.name
      ? {
          name: c.name,
          producer: c.producer || undefined,
          vintage: c.vintage || undefined,
          type: (c.type || undefined) as
            | 'red'
            | 'white'
            | 'rose'
            | 'sparkling'
            | 'dessert'
            | 'fortified'
            | 'other'
            | undefined,
          systembolagetUrl: c.systembolagetUrl || undefined,
          priceSek: c.priceSek ?? undefined,
        }
      : null,
  }
}

/**
 * Plan-driven session content.
 *
 * Renders the flat ordered wine list from a TastingPlan (no modules/lessons),
 * with host pacing controls and a per-wine "Betygsätt" dialog that opens
 * WineReviewForm in either library-wine or custom-wine snapshot mode.
 *


 * Note: plan mode uses the dedicated numeric field `currentWinePourOrder`
 * on course-sessions (separate from course-mode's `currentLesson` content-item
 * FK). The host-state route accepts either field name.
 */
export function PlanSessionContent({
  session,
  plan,
  isHost,
  followingHost,
  sidebarExtra,
}: PlanSessionContentProps) {
  const rows: WineRow[] = (plan.wines ?? []).map(rowFromEntry)
  const [reviewing, setReviewing] = React.useState<WineRow | null>(null)
  const [settingFocus, setSettingFocus] = React.useState(false)
  // Optimistic local focus — fires immediately when the host taps a wine so
  // their own UI doesn't wait for the SSE round-trip.
  const [localFocus, setLocalFocus] = React.useState<number | null>(null)
  const { hostCurrentWinePourOrder } = useActiveSession()
  // Realtime takes precedence; fall back to the server-side prop (initial render
  // before SSE has connected); finally fall back to the host's optimistic local
  // pick. `null` only when nothing has been set.
  const activePour =
    hostCurrentWinePourOrder ??
    (typeof session.currentWinePourOrder === 'number' ? session.currentWinePourOrder : null) ??
    localFocus

  const scrollRefs = React.useRef<Record<string, HTMLLIElement | null>>({})
  React.useEffect(() => {
    if (!followingHost || activePour == null) return
    const row = rows.find((r) => r.pourOrder === activePour)
    if (!row) return
    const node = scrollRefs.current[row.key]
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [activePour, followingHost, rows])

  async function setFocus(pourOrder: number) {
    setSettingFocus(true)
    setLocalFocus(pourOrder) // optimistic — host sees the change immediately
    try {
      const res = await fetch(`/api/sessions/${session.id}/host-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentWinePourOrder: pourOrder }),
      })
      if (!res.ok) {
        toast.error('Kunde inte sätta fokus.')
      }
    } catch {
      toast.error('Nätverksfel — försök igen.')
    } finally {
      setSettingFocus(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4 min-w-0">
        <header className="space-y-1">
          <h2 className="text-xl font-heading">{plan.title}</h2>
          {plan.occasion && (
            <p className="text-sm text-muted-foreground">{plan.occasion}</p>
          )}
        </header>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Inga viner i planen.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => {
              const isActive = activePour === row.pourOrder
              return (
                <li
                  key={row.key}
                  ref={(el) => {
                    scrollRefs.current[row.key] = el
                  }}
                >
                  <Card
                    className={`p-4 transition-shadow ${
                      isActive ? 'border-brand-400 ring-2 ring-brand-400/40' : ''
                    }`}
                  >
                    <div className="flex gap-3 items-start">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-400/10 text-brand-400 text-sm font-semibold flex items-center justify-center">
                        {row.pourOrder}
                      </div>
                      <div className="flex-shrink-0 w-14 h-14 rounded-md overflow-hidden bg-gradient-to-br from-muted/40 to-muted/10 relative">
                        {row.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.imageUrl}
                            alt=""
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <WineImagePlaceholder size="sm" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate">{row.title}</p>
                          {isActive && (
                            <Badge variant="brand">
                              <WineIcon className="h-3 w-3 mr-1" />
                              Värden pratar om detta
                            </Badge>
                          )}
                        </div>
                        {row.subtitle && (
                          <p className="text-xs text-muted-foreground truncate">
                            {row.subtitle}
                          </p>
                        )}
                        {isHost && row.hostNotes && (
                          <p className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">
                            <Crown className="inline h-3 w-3 mr-1" />
                            {row.hostNotes}
                          </p>
                        )}
                        <div className="mt-3 flex gap-2 flex-wrap">
                          {isHost && (
                            <Button
                              type="button"
                              size="sm"
                              variant={isActive ? 'default' : 'outline'}
                              disabled={settingFocus}
                              onClick={() => setFocus(row.pourOrder)}
                            >
                              {isActive ? 'I fokus' : 'Sätt fokus'}
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setReviewing(row)}
                          >
                            Betygsätt
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {sidebarExtra && (
        <aside className="lg:sticky lg:top-20 lg:self-start space-y-3">{sidebarExtra}</aside>
      )}

      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Betygsätt: {reviewing?.title}</DialogTitle>
          </DialogHeader>
          {reviewing &&
            (reviewing.libraryWineId ? (
              <WineReviewForm
                lessonId={0}
                sessionId={String(session.id)}
                wineIdProp={reviewing.libraryWineId}
                insideDialog
                onSubmit={() => setReviewing(null)}
              />
            ) : reviewing.customWineSnapshot ? (
              <WineReviewForm
                lessonId={0}
                sessionId={String(session.id)}
                customWineSnapshot={reviewing.customWineSnapshot}
                insideDialog
                onSubmit={() => setReviewing(null)}
              />
            ) : null)}
        </DialogContent>
      </Dialog>
    </div>
  )
}
