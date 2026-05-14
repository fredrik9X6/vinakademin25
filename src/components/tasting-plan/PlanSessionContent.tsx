'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Wine as WineIcon, Crown, LogOut } from 'lucide-react'
import { WineReviewForm } from '@/components/course/WineReviewForm'
import { WineImagePlaceholder } from '@/components/wine/WineImagePlaceholder'
import { useActiveSession } from '@/context/SessionContext'
import { WineFocusTimer } from './WineFocusTimer'
import { SwarmPanel } from './SwarmPanel'
import { HostSessionTour } from '@/components/onboarding/HostSessionTour'

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
    systembolagetProductNumber?: string
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
          systembolagetProductNumber: c.systembolagetProductNumber || undefined,
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
  // their own UI doesn't wait for the SSE round-trip. Only the host ever sets
  // this; guests fall through to the SSE/prop chain below.
  const [localFocus, setLocalFocus] = React.useState<number | null>(null)
  // Track which wines THIS participant has already submitted reviews for.
  // Seeded from /my-submissions on mount; appended locally on each submit.
  const [submittedPourOrders, setSubmittedPourOrders] = React.useState<Set<number>>(new Set())
  React.useEffect(() => {
    let aborted = false
    fetch(`/api/sessions/${session.id}/my-submissions`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (aborted) return
        if (data && Array.isArray(data.submittedPourOrders)) {
          setSubmittedPourOrders(new Set(data.submittedPourOrders))
        }
      })
      .catch(() => {})
    return () => {
      aborted = true
    }
  }, [session.id])
  // Optimistic local reveal set so the host sees the change instantly
  // before SSE catches up.
  const [localRevealed, setLocalRevealed] = React.useState<Set<number>>(new Set())
  const router = useRouter()
  const {
    hostCurrentWinePourOrder,
    hostFocusStartedAt,
    revealedPourOrders,
    swarm,
    leaveSession,
  } = useActiveSession()
  const [endDialog, setEndDialog] = React.useState(false)
  const [leaveDialog, setLeaveDialog] = React.useState(false)
  const [endingOrLeaving, setEndingOrLeaving] = React.useState(false)

  async function handleHostEnd() {
    setEndingOrLeaving(true)
    try {
      // Try the dedicated complete endpoint first; fall back to direct Payload REST.
      let res = await fetch(`/api/sessions/${session.id}/complete`, { method: 'POST' })
      if (!res.ok && res.status === 404) {
        res = await fetch(`/api/course-sessions/${session.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'completed',
            completedAt: new Date().toISOString(),
          }),
          credentials: 'include',
        })
      }
      if (!res.ok) {
        toast.error('Kunde inte avsluta sessionen.')
        return
      }
      toast.success('Sessionen avslutad.')
      router.push(`/mina-provningar/planer/${plan.id}`)
    } catch {
      toast.error('Nätverksfel — försök igen.')
    } finally {
      setEndingOrLeaving(false)
      setEndDialog(false)
    }
  }

  async function handleGuestLeave() {
    setEndingOrLeaving(true)
    try {
      await leaveSession()
    } catch {
      // leaveSession() shows its own toast on failure
    } finally {
      setEndingOrLeaving(false)
      setLeaveDialog(false)
      router.push('/')
    }
  }
  const effectiveRevealed = React.useMemo(() => {
    const s = new Set<number>(revealedPourOrders ?? [])
    localRevealed.forEach((p) => s.add(p))
    return s
  }, [revealedPourOrders, localRevealed])

  const isBlind = Boolean((session as any).blindTasting)
  // Local optimistic value wins (only set on the host's own tap), then
  // realtime SSE, then the initial server-rendered prop. `null` only when
  // nothing has been set.
  const activePour =
    localFocus ??
    hostCurrentWinePourOrder ??
    (typeof session.currentWinePourOrder === 'number' ? session.currentWinePourOrder : null)

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

  async function revealWine(pourOrder: number) {
    setLocalRevealed((prev) => new Set([...prev, pourOrder]))
    try {
      const res = await fetch(`/api/sessions/${session.id}/host-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revealPourOrder: pourOrder }),
      })
      if (!res.ok) toast.error('Kunde inte avslöja vinet.')
    } catch {
      toast.error('Nätverksfel — försök igen.')
    }
  }

  return (
    <>
      <header className="flex items-center justify-between mb-4">
        <div className="min-w-0">
          <h1 className="text-xl font-heading truncate">{plan.title}</h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => (isHost ? setEndDialog(true) : setLeaveDialog(true))}
          disabled={endingOrLeaving}
        >
          <LogOut className="h-4 w-4 mr-1.5" />
          {isHost ? 'Avsluta session' : 'Lämna session'}
        </Button>
      </header>
      {isHost && (
        <HostSessionTour blind={isBlind} hasTimer={!!plan.defaultMinutesPerWine} />
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4 min-w-0">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Inga viner i planen.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row, idx) => {
              const isHiddenForGuest =
                isBlind && !isHost && !effectiveRevealed.has(row.pourOrder)
              const displayRow = isHiddenForGuest
                ? {
                    ...row,
                    title: `Vin #${row.pourOrder}`,
                    subtitle: '',
                    hostNotes: null as string | null,
                    imageUrl: null as string | null,
                  }
                : row
              const isActive = activePour === row.pourOrder
              const showRevealButton = isHost && isBlind && !effectiveRevealed.has(row.pourOrder)
              const swarmEntry = swarm[row.pourOrder]
              const shouldShowSwarm = isHost || submittedPourOrders.has(row.pourOrder)
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
                        {displayRow.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={displayRow.imageUrl}
                            alt=""
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <WineImagePlaceholder size="sm" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate">{displayRow.title}</p>
                          {isActive && (
                            <Badge variant="brand">
                              <WineIcon className="h-3 w-3 mr-1" />
                              Värden pratar om detta
                            </Badge>
                          )}
                        </div>
                        {displayRow.subtitle && (
                          <p className="text-xs text-muted-foreground truncate">
                            {displayRow.subtitle}
                          </p>
                        )}
                        {isHost && displayRow.hostNotes && (
                          <p className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">
                            <Crown className="inline h-3 w-3 mr-1" />
                            {displayRow.hostNotes}
                          </p>
                        )}
                        <div className="mt-3 flex gap-2 flex-wrap items-center">
                          {isHost && (
                            <Button
                              type="button"
                              size="sm"
                              variant={isActive ? 'default' : 'outline'}
                              disabled={settingFocus}
                              onClick={() => setFocus(row.pourOrder)}
                              {...(idx === 0 ? { 'data-tour': 'session-set-focus' } : {})}
                            >
                              {isActive ? 'I fokus' : 'Sätt fokus'}
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setReviewing(displayRow)}
                          >
                            Betygsätt
                          </Button>
                          {showRevealButton && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => revealWine(row.pourOrder)}
                              {...(idx === 0 ? { 'data-tour': 'session-reveal' } : {})}
                            >
                              Avslöja vin #{row.pourOrder}
                            </Button>
                          )}
                          {isActive && plan.defaultMinutesPerWine ? (
                            <div {...(idx === 0 ? { 'data-tour': 'session-timer' } : {})}>
                              <WineFocusTimer
                                startedAt={hostFocusStartedAt}
                                minutesPerWine={plan.defaultMinutesPerWine}
                              />
                            </div>
                          ) : null}
                          {isActive &&
                          isHost &&
                          plan.defaultMinutesPerWine &&
                          hostFocusStartedAt &&
                          row.pourOrder < rows.length ? (
                            <NextWineButton
                              startedAt={hostFocusStartedAt}
                              minutesPerWine={plan.defaultMinutesPerWine}
                              onNext={() => setFocus(row.pourOrder + 1)}
                              disabled={settingFocus}
                            />
                          ) : null}
                        </div>

                        {shouldShowSwarm && <SwarmPanel entry={swarmEntry ?? null} />}
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
                onSubmit={() => {
                  setSubmittedPourOrders((prev) => new Set([...prev, reviewing!.pourOrder]))
                  setReviewing(null)
                }}
              />
            ) : reviewing.customWineSnapshot ? (
              <WineReviewForm
                lessonId={0}
                sessionId={String(session.id)}
                customWineSnapshot={reviewing.customWineSnapshot}
                insideDialog
                onSubmit={() => {
                  setSubmittedPourOrders((prev) => new Set([...prev, reviewing!.pourOrder]))
                  setReviewing(null)
                }}
              />
            ) : null)}
        </DialogContent>
      </Dialog>
      </div>

      <AlertDialog open={endDialog} onOpenChange={setEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Avsluta sessionen?</AlertDialogTitle>
            <AlertDialogDescription>
              Alla deltagare kopplas bort och sessionen markeras som klar. Du kan inte återuppta
              den.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={endingOrLeaving}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              disabled={endingOrLeaving}
              onClick={(e) => {
                e.preventDefault()
                void handleHostEnd()
              }}
            >
              {endingOrLeaving ? 'Avslutar…' : 'Avsluta'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={leaveDialog} onOpenChange={setLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lämna provningen?</AlertDialogTitle>
            <AlertDialogDescription>
              Du kan ansluta igen med samma kod om sessionen fortfarande är aktiv.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={endingOrLeaving}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              disabled={endingOrLeaving}
              onClick={(e) => {
                e.preventDefault()
                void handleGuestLeave()
              }}
            >
              {endingOrLeaving ? 'Lämnar…' : 'Lämna'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function NextWineButton({
  startedAt,
  minutesPerWine,
  onNext,
  disabled,
}: {
  startedAt: string
  minutesPerWine: number
  onNext: () => void
  disabled?: boolean
}) {
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const elapsedSec = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000))
  if (elapsedSec < minutesPerWine * 60) return null
  return (
    <Button
      type="button"
      size="sm"
      variant="default"
      disabled={disabled}
      onClick={onNext}
      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
    >
      → Nästa vin
    </Button>
  )
}
