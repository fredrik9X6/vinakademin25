'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { TastingPlan, Wine, CourseSession } from '@/payload-types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { WineInfoReadout } from '@/components/tasting-shared/WineInfoReadout'
import { resolveWinePurchase } from '@/lib/wine-purchase-info'
import { WinePurchaseMeta } from '@/components/tasting-shared/WinePurchaseMeta'
import { Wine as WineIcon, LogOut, CheckCircle, Info } from 'lucide-react'
import { WineReviewForm } from '@/components/course/WineReviewForm'
import { WineImagePlaceholder } from '@/components/wine/WineImagePlaceholder'
import { BlindGuessCard } from '@/components/tasting-plan/BlindGuessCard'
import type { BlindAnswer } from '@/lib/blind-guess-scoring'
import type { PriceBucket } from '@/lib/blind-guess-vocab'
import { useActiveSession, type RosterEntry } from '@/context/SessionContext'
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
  abv: number | null
  servingTemp: string | null
  guestDescription: string | null
  foodPairing: string | null
  priceSek: number | null
  articleNumber: string | null
  systembolagetUrl: string | null
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
  /** Which guess tiers the host actually configured for this wine. Baked onto
   * unrevealed guest entries by the page's redaction logic. Absent (null) for
   * revealed wines and the host path → BlindGuessCard defaults to showing all. */
  blindTiers?: {
    country: boolean
    grape: boolean
    price: boolean
  } | null
}

function rowFromEntry(
  w: NonNullable<TastingPlan['wines']>[number],
  idx: number,
): WineRow {
  const pourOrder = w.pourOrder ?? idx + 1
  const abv = typeof (w as { abv?: number | null }).abv === 'number'
    ? ((w as { abv?: number | null }).abv as number)
    : null
  const servingTemp = (w as { servingTemp?: string | null }).servingTemp ?? null
  const guestDescription = (w as { guestDescription?: string | null }).guestDescription ?? null
  const foodPairing = (w as { foodPairing?: string | null }).foodPairing ?? null
  const purchase = resolveWinePurchase(w)
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
  // Per-tier visibility flags baked by the page redaction logic for unrevealed
  // guest entries. Absent for revealed wines and the host path — BlindGuessCard
  // defaults to showing all tiers when this is null/undefined.
  const blindTiers =
    (w as {
      blindTiers?: { country: boolean; grape: boolean; price: boolean } | null
    }).blindTiers ?? null
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
    // ALL grape names — a blend accepts any of its grapes as a correct guess.
    const libGrapes = (Array.isArray(lib.grapes) ? lib.grapes : [])
      .map((g) => (g && typeof g === 'object' ? ((g as { name?: string }).name ?? null) : null))
      .filter((g): g is string => typeof g === 'string' && g.trim().length > 0)
    const libPriceSek = typeof (lib as { price?: number }).price === 'number'
      ? ((lib as { price?: number }).price as number)
      : null
    return {
      key: w.id ?? `lib-${lib.id}-${idx}`,
      pourOrder,
      title: lib.name || `Vin #${lib.id}`,
      subtitle: [lib.winery, lib.vintage, region].filter(Boolean).join(' · '),
      hostNotes: w.hostNotes ?? null,
      abv,
      servingTemp,
      guestDescription,
      foodPairing,
      priceSek: purchase.priceSek,
      articleNumber: purchase.articleNumber,
      systembolagetUrl: purchase.systembolagetUrl,
      libraryWineId: lib.id,
      imageUrl,
      customWineSnapshot: null,
      blindAnswer: {
        country: overrideCountry ?? libCountry,
        grapes: overrideGrapes.length > 0 ? overrideGrapes : libGrapes,
        priceBucket: overridePriceBucket,
        priceSek: libPriceSek,
      },
      easyModeOptions,
      blindTiers,
    }
  }
  const c = w.customWine
  return {
    key: w.id ?? `cust-${idx}`,
    pourOrder,
    title: c?.name || 'Namnlöst vin',
    subtitle: [c?.producer, c?.vintage].filter(Boolean).join(' · '),
    hostNotes: w.hostNotes ?? null,
    abv,
    servingTemp,
    guestDescription,
    foodPairing,
    priceSek: purchase.priceSek,
    articleNumber: purchase.articleNumber,
    systembolagetUrl: purchase.systembolagetUrl,
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
    blindTiers,
  }
}

/**
 * Plan-driven session content.
 *
 * Renders the flat ordered wine list from a TastingPlan (no modules/lessons),
 * with host pacing controls and a per-wine inline tasting-note disclosure that
 * renders WineReviewForm in either library-wine or custom-wine snapshot mode.
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
  const [infoWine, setInfoWine] = React.useState<WineRow | null>(null)
  // Which pour's tasting-note disclosure is open. null = "follow the host"
  // (the wine currently in focus is open by default); a pour number = the
  // participant deliberately opened that one; -1 = deliberately collapsed
  // everything (distinct from null so the collapse action doesn't just snap
  // back to following the host).
  const [expandedPour, setExpandedPour] = React.useState<number | null>(null)
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
  const dismissRestoredBanner = React.useCallback(() => setRestoredBanner(false), [])
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
    submissionsByPour,
    roster,
    leaveSession,
    clearActiveSession,
  } = useActiveSession()
  const [endDialog, setEndDialog] = React.useState(false)
  const [leaveDialog, setLeaveDialog] = React.useState(false)
  const [endingOrLeaving, setEndingOrLeaving] = React.useState(false)
  // Pour order whose reveal is awaiting host confirmation because online
  // participants are still missing an entry. null = no pending guard.
  const [revealGuardPour, setRevealGuardPour] = React.useState<number | null>(null)

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

  // Blind reveal hydration (guests only). The SSE reveal event carries only
  // pour-order integers, and the initial server payload stripped every
  // unrevealed wine's identity/image/guest-text for guests. Flipping the local
  // `effectiveRevealed` flag therefore exposes a row that still holds the
  // load-time redacted nulls — no image, no text, "Namnlöst vin". When a NEW
  // pour is revealed, re-fetch the server component so the page's redaction
  // re-runs with the updated reveal set and the now-revealed wine's real data
  // (image, name, price/art.nr, any guest text) reaches the guest. Seeded from
  // the server's load-time revealed set so the first SSE sync doesn't refetch.
  const seenRevealedRef = React.useRef<Set<number>>(
    new Set<number>(
      Array.isArray((session as { revealedPourOrders?: number[] }).revealedPourOrders)
        ? ((session as { revealedPourOrders?: number[] }).revealedPourOrders as number[])
        : [],
    ),
  )
  React.useEffect(() => {
    if (isHost || !isBlind) return
    let hasNew = false
    for (const p of revealedPourOrders ?? []) {
      if (!seenRevealedRef.current.has(p)) {
        hasNew = true
        seenRevealedRef.current.add(p)
      }
    }
    if (hasNew) router.refresh()
  }, [revealedPourOrders, isHost, isBlind, router])

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

  // Online non-host participants who have NO content yet for this pour.
  function missingCountForPour(pourOrder: number): { missing: number; total: number } {
    const guests = roster.filter((r) => !r.isHost && r.online)
    const entry = submissionsByPour[pourOrder]
    const withContent = new Set(entry?.withContent ?? [])
    const missing = guests.filter((g) => !withContent.has(g.id)).length
    return { missing, total: guests.length }
  }

  // Reveal entry point used by the UI: confirm first if anyone online is
  // still missing an entry, otherwise reveal immediately.
  function attemptReveal(pourOrder: number) {
    const { missing } = missingCountForPour(pourOrder)
    if (missing > 0) {
      setRevealGuardPour(pourOrder)
      return
    }
    void revealWine(pourOrder)
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

      {restoredBanner && (
        <RestoredBanner onDismiss={dismissRestoredBanner} />
      )}

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
                    abv: null as number | null,
                    servingTemp: null as string | null,
                    guestDescription: null as string | null,
                    foodPairing: null as string | null,
                    priceSek: null as number | null,
                    articleNumber: null as string | null,
                    systembolagetUrl: null as string | null,
                  }
                : row
              const isActive = activePour === row.pourOrder
              const isExpanded = (expandedPour ?? activePour) === row.pourOrder
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
                        <WinePurchaseMeta
                          priceSek={displayRow.priceSek}
                          articleNumber={displayRow.articleNumber}
                          systembolagetUrl={displayRow.systembolagetUrl}
                        />
                        {isHost &&
                          (row.hostNotes ||
                            row.abv != null ||
                            (row.servingTemp && row.servingTemp.trim()) ||
                            row.guestDescription ||
                            row.foodPairing) && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="mt-2 h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => setInfoWine(row)}
                            >
                              <Info className="h-3 w-3 mr-1" />
                              Manus &amp; fakta
                            </Button>
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
                          {showRevealButton && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => attemptReveal(row.pourOrder)}
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
                            blindTiers={row.blindTiers}
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

                        {!isHost &&
                          (displayRow.guestDescription ||
                            displayRow.foodPairing ||
                            displayRow.abv != null ||
                            (displayRow.servingTemp && displayRow.servingTemp.trim())) && (
                            <div className="mt-3 rounded-md border bg-muted/30 p-3">
                              <WineInfoReadout
                                abv={displayRow.abv}
                                servingTemp={displayRow.servingTemp}
                                guestDescription={displayRow.guestDescription}
                                foodPairing={displayRow.foodPairing}
                              />
                            </div>
                          )}

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedPour(isExpanded ? -1 : row.pourOrder)
                          }
                          aria-expanded={isExpanded}
                          className="mt-3 flex min-h-11 w-full items-center justify-between rounded-md border border-input px-3 text-sm hover:bg-accent"
                        >
                          <span className="font-medium">Din smaknotering</span>
                          <span className="text-xs text-muted-foreground">
                            {submittedPourOrders.has(row.pourOrder) ? 'Klar' : 'Ej klar'}
                          </span>
                        </button>

                        {isExpanded && (
                          <div className="mt-3 rounded-md border bg-card p-3">
                            {isBlind && (
                              <p className="mb-3 text-xs text-muted-foreground">
                                Din smaknotering ger inga poäng — bara blindgissningen räknas.
                              </p>
                            )}
                            <WineReviewForm
                              key={`review-${row.pourOrder}`}
                              lessonId={0}
                              sessionId={String(session.id)}
                              pourOrder={row.pourOrder}
                              {...(displayRow.libraryWineId
                                ? { wineIdProp: displayRow.libraryWineId }
                                : {})}
                              {...(displayRow.customWineSnapshot
                                ? { customWineSnapshot: displayRow.customWineSnapshot }
                                : {})}
                              onRestored={() => setRestoredBanner(true)}
                              onSubmit={() => {
                                setSubmittedPourOrders((prev) =>
                                  new Set([...prev, row.pourOrder]),
                                )
                              }}
                            />
                          </div>
                        )}

                        {isHost && isActive && (
                          <HostSubmissionTracker
                            roster={roster}
                            entry={submissionsByPour[row.pourOrder]}
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

      <Sheet open={!!infoWine} onOpenChange={(o) => !o && setInfoWine(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="truncate">{infoWine?.title}</SheetTitle>
            {infoWine?.subtitle && (
              <p className="text-xs text-muted-foreground truncate">{infoWine.subtitle}</p>
            )}
          </SheetHeader>
          <div className="mt-4">
            {infoWine && (
              <WineInfoReadout
                hostNotes={infoWine.hostNotes}
                abv={infoWine.abv}
                servingTemp={infoWine.servingTemp}
                guestDescription={infoWine.guestDescription}
                foodPairing={infoWine.foodPairing}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

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

      <AlertDialog
        open={revealGuardPour !== null}
        onOpenChange={(o) => !o && setRevealGuardPour(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Avslöja redan nu?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                if (revealGuardPour === null) return null
                const { missing, total } = missingCountForPour(revealGuardPour)
                return `${missing} av ${total} har inte svarat än — avslöja ändå?`
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                const pour = revealGuardPour
                setRevealGuardPour(null)
                if (pour !== null) void revealWine(pour)
              }}
            >
              Avslöja ändå
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/** One-time banner shown when the session finds prior answers to restore. */
function RestoredBanner({ onDismiss }: { onDismiss: () => void }) {
  React.useEffect(() => {
    const id = setTimeout(onDismiss, 5000)
    return () => clearTimeout(id)
  }, [onDismiss])

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 rounded-md bg-green-500/10 border border-green-500/30 px-3 py-2 text-sm text-green-700 dark:text-green-400 mb-4"
    >
      <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1">Vi har sparat dina tidigare svar.</span>
      <Button
        size="sm"
        variant="ghost"
        onClick={onDismiss}
        className="h-auto py-0 px-1.5 text-green-700 dark:text-green-400 hover:bg-green-500/20 hover:text-green-800 dark:hover:text-green-300"
      >
        Stäng
      </Button>
    </div>
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

/**
 * Host-only per-participant submission tracker for the focused wine.
 * Status only — never shows guess/answer content. Renders against the live
 * roster (online, non-host participants).
 */
function HostSubmissionTracker({
  roster,
  entry,
}: {
  roster: RosterEntry[]
  entry: { withContent: number[]; locked: number[] } | undefined
}) {
  const withContent = new Set(entry?.withContent ?? [])
  const locked = new Set(entry?.locked ?? [])
  const guests = roster.filter((r) => !r.isHost && r.online)
  if (guests.length === 0) {
    return (
      <div className="mt-3 rounded-md border bg-muted/40 p-3">
        <p className="text-xs text-muted-foreground">Inga anslutna deltagare ännu.</p>
      </div>
    )
  }
  return (
    <div className="mt-3 rounded-md border bg-muted/40 p-3" data-tour="session-tracker">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Vem har svarat</p>
      <ul className="space-y-1">
        {guests.map((g) => {
          const isLockedIn = locked.has(g.id)
          const hasDraft = !isLockedIn && withContent.has(g.id)
          const { symbol, label, cls } = isLockedIn
            ? { symbol: '✓', label: 'klar', cls: 'text-green-600' }
            : hasDraft
              ? { symbol: '✎', label: 'utkast', cls: 'text-amber-600' }
              : { symbol: '—', label: 'inget', cls: 'text-muted-foreground' }
          return (
            <li key={g.id} className="flex items-center justify-between text-xs">
              <span className="truncate">{g.nickname}</span>
              <span className={`ml-2 flex-shrink-0 tabular-nums ${cls}`}>
                {symbol} {label}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
