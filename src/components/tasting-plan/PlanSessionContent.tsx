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
import { BlindGuessCard } from '@/components/tasting-plan/BlindGuessCard'
import type { BlindAnswer } from '@/lib/blind-guess-scoring'
import type { PriceBucket } from '@/lib/blind-guess-vocab'
import { useActiveSession } from '@/context/SessionContext'
import { WineFocusTimer } from './WineFocusTimer'
import { SwarmPanel } from './SwarmPanel'
import { HostSessionTour } from '@/components/onboarding/HostSessionTour'
import { trackEvent } from '@/components/analytics'

interface PlanSessionContentProps {
  session: CourseSession
  plan: TastingPlan
  isHost: boolean
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
    imageUrl?: string
  } | null
  /** Blind-tasting answer for the BlindGuessCard. Resolved from host overrides
   * with fallback to joined library wine data + raw price. Null fields mean
   * that scoring tier is disabled for this wine. */
  blindAnswer: BlindAnswer
  /** Server-baked easy-mode dropdown options. Present only when the session
   * has `blindGuessEasyMode: true` AND the wine isn't yet revealed AND the
   * viewer is a guest. Null tiers fall back to the full enum. */
  easyModeOptions: {
    countries: string[] | null
    grapes: string[] | null
  } | null
}

function rowFromEntry(
  w: NonNullable<TastingPlan['wines']>[number],
  idx: number,
): WineRow {
  const pourOrder = w.pourOrder ?? idx + 1
  const overrideCountry =
    typeof (w as { blindAnswerCountry?: string | null }).blindAnswerCountry === 'string'
      ? ((w as { blindAnswerCountry?: string | null }).blindAnswerCountry as string)
      : null
  const overrideGrapes = Array.isArray(
    (w as { blindAnswerGrapes?: string[] | null }).blindAnswerGrapes,
  )
    ? ((w as { blindAnswerGrapes?: string[] | null }).blindAnswerGrapes as string[]).filter(
        (g) => typeof g === 'string' && g.trim().length > 0,
      )
    : []
  // Easy-mode decoy set + flag are baked onto the wine entry by the page's
  // redaction logic when session.blindGuessEasyMode is true and the wine
  // isn't revealed yet. Pre-revealed wines pass through with no field, so
  // both undefined and null collapse to "render the full enum".
  const easyModeOptions =
    (w as {
      easyModeOptions?: {
        countries: string[] | null
        grapes: string[] | null
      } | null
    }).easyModeOptions ?? null
  const overridePriceBucket =
    ((w as { blindAnswerPriceBucket?: PriceBucket | null }).blindAnswerPriceBucket ?? null) as
      | PriceBucket
      | null

  if (w.libraryWine && typeof w.libraryWine === 'object') {
    const lib = w.libraryWine as Wine
    const region =
      typeof lib.region === 'object' && lib.region ? lib.region.name ?? null : null
    const image = typeof lib.image === 'object' && lib.image ? lib.image : null
    const imageUrl = image
      ? image.sizes?.bottle?.url ?? image.sizes?.thumbnail?.url ?? image.url ?? null
      : null
    const libCountry =
      typeof lib.country === 'object' && lib.country
        ? (lib.country as { name?: string }).name ?? null
        : null
    const libGrape =
      Array.isArray(lib.grapes) && lib.grapes.length > 0 && typeof lib.grapes[0] === 'object'
        ? ((lib.grapes[0] as { name?: string }).name ?? null)
        : null
    const libPriceSek = typeof (lib as { price?: number }).price === 'number'
      ? ((lib as { price?: number }).price as number)
      : null
    return {
      key: w.id ?? `lib-${lib.id}-${idx}`,
      pourOrder,
      title: lib.name || `Vin #${lib.id}`,
      subtitle: [lib.winery, lib.vintage, region].filter(Boolean).join(' · '),
      hostNotes: w.hostNotes ?? null,
      libraryWineId: lib.id,
      imageUrl,
      customWineSnapshot: null,
      blindAnswer: {
        country: overrideCountry ?? libCountry,
        grapes: overrideGrapes.length > 0 ? overrideGrapes : libGrape ? [libGrape] : [],
        priceBucket: overridePriceBucket,
        priceSek: libPriceSek,
      },
      easyModeOptions,
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
    imageUrl: c?.imageUrl || null,
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
          imageUrl: c.imageUrl || undefined,
        }
      : null,
    blindAnswer: {
      country: overrideCountry,
      grapes: overrideGrapes,
      priceBucket: overridePriceBucket,
      priceSek: c?.priceSek ?? null,
    },
    easyModeOptions,
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
  // Viewer's own blind guesses keyed by pourOrder. Hydrated on mount; updated
  // locally when the BlindGuessCard saves. `null` value means "not yet
  // submitted for this wine".
  type LocalGuess = {
    country: string | null
    grape: string | null
    priceBucket: PriceBucket | null
    submittedAt: string | null
  }
  const [myGuesses, setMyGuesses] = React.useState<Map<number, LocalGuess>>(new Map())
  // One-time "answers restored" banner trigger.
  const [restoredBanner, setRestoredBanner] = React.useState(false)
  React.useEffect(() => {
    let aborted = false
    fetch(`/api/sessions/${session.id}/my-submissions`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (aborted || !data) return
        if (Array.isArray(data.submittedPourOrders)) {
          setSubmittedPourOrders(new Set(data.submittedPourOrders))
        }
        const guesses = Array.isArray(data.guesses)
          ? (data.guesses as Array<{
              pourOrder: number
              guessedCountry: string | null
              guessedGrape: string | null
              guessedPriceBucket: PriceBucket | null
              submittedAt: string | null
            }>)
          : []
        const map = new Map<number, LocalGuess>()
        for (const g of guesses) {
          map.set(g.pourOrder, {
            country: g.guessedCountry ?? null,
            grape: g.guessedGrape ?? null,
            priceBucket: g.guessedPriceBucket ?? null,
            submittedAt: g.submittedAt ?? null,
          })
        }
        setMyGuesses(map)
        // If the server returned any content at all, the "restored" banner is
        // warranted. BlindGuessCard / WineReviewForm also fire onRestored from
        // their local mirror; this covers the durable-server case.
        const reviewsCount = Array.isArray(data.reviews) ? data.reviews.length : 0
        if (guesses.length > 0 || reviewsCount > 0) setRestoredBanner(true)
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
    clearActiveSession,
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
      trackEvent('session_ended', {
        session_id: String(session.id),
        plan_id: plan.id,
        revealed_count: localRevealed.size,
        total_wines: rows.length,
      })
      toast.success('Sessionen avslutad.')
      // Clear the local active-session state BEFORE navigating so the
      // ActiveSessionBanner doesn't reappear on the recap (or survive a
      // hard refresh via localStorage rehydration). RealtimeSync also
      // calls clearActiveSession on the SSE 'completed' event, but the
      // host's router.push unmounts the SSE stream before that event
      // typically lands — this is the belt to the SSE handler's suspenders.
      clearActiveSession()
      router.push(`/mina-provningar/historik/${session.id}`)
    } catch {
      toast.error('Nätverksfel — försök igen.')
    } finally {
      setEndingOrLeaving(false)
      setEndDialog(false)
    }
  }

  async function handleGuestLeave() {
    setEndingOrLeaving(true)
    trackEvent('session_left', {
      session_id: String(session.id),
      plan_id: plan.id,
    })
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

  async function setFocus(pourOrder: number) {
    setSettingFocus(true)
    setLocalFocus(pourOrder) // optimistic — host sees the change immediately
    trackEvent('session_focus_set', {
      session_id: String(session.id),
      plan_id: plan.id,
      pour_order: pourOrder,
      total_wines: rows.length,
    })
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
    trackEvent('session_wine_revealed', {
      session_id: String(session.id),
      plan_id: plan.id,
      pour_order: pourOrder,
    })
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
                <li key={row.key}>
                  <Card
                    className={`p-4 transition-shadow ${
                      isActive ? 'border-brand-400 ring-2 ring-brand-400/40' : ''
                    }`}
                  >
                    <div className="flex gap-3 sm:gap-4 items-center">
                      <div className="relative flex-shrink-0 w-20 h-32 sm:w-24 sm:h-36">
                        <span
                          className="absolute inset-0 flex items-start justify-start font-heading leading-[0.85] text-muted-foreground/25 select-none pointer-events-none text-[110px] sm:text-[130px] -ml-2 -mt-1"
                          aria-hidden="true"
                        >
                          {row.pourOrder}
                        </span>
                        {displayRow.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={displayRow.imageUrl}
                            alt=""
                            className="relative w-full h-full object-contain"
                          />
                        ) : (
                          <WineImagePlaceholder />
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

                        {isBlind && !isHost && (
                          <BlindGuessCard
                            sessionId={Number(session.id)}
                            pourOrder={row.pourOrder}
                            isRevealed={effectiveRevealed.has(row.pourOrder)}
                            answer={row.blindAnswer}
                            easyModeOptions={row.easyModeOptions}
                            initialGuess={(() => {
                              const g = myGuesses.get(row.pourOrder)
                              return g ?? null
                            })()}
                            initialSubmittedAt={
                              myGuesses.get(row.pourOrder)?.submittedAt ?? null
                            }
                            onRestored={() => setRestoredBanner(true)}
                          />
                        )}

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
                key={`review-${reviewing.pourOrder}`}
                lessonId={0}
                sessionId={String(session.id)}
                pourOrder={reviewing.pourOrder}
                wineIdProp={reviewing.libraryWineId}
                insideDialog
                onRestored={() => setRestoredBanner(true)}
                onSubmit={() => {
                  setSubmittedPourOrders((prev) => new Set([...prev, reviewing!.pourOrder]))
                  setReviewing(null)
                }}
              />
            ) : reviewing.customWineSnapshot ? (
              <WineReviewForm
                key={`review-${reviewing.pourOrder}`}
                lessonId={0}
                sessionId={String(session.id)}
                pourOrder={reviewing.pourOrder}
                customWineSnapshot={reviewing.customWineSnapshot}
                insideDialog
                onRestored={() => setRestoredBanner(true)}
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
