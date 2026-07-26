'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import type { RosterEntry } from '@/context/SessionContext'

/**
 * Host-only per-wine controls: set-focus, reveal (undo lives in the toast
 * `revealWine`/`unrevealWine` fire, not here — see PlanSessionContent), and
 * the "Vem har svarat" submission tracker.
 *
 * These render as siblings inside PlanSessionContent's per-row action bar
 * rather than as one combined element, because that bar also holds
 * `WineFocusTimer` — shown to hosts AND guests — interleaved between the
 * reveal button and the "next wine" nudge. Splitting host-only pieces into
 * small named exports keeps that shared layout intact without threading it
 * through a single component boundary it doesn't belong to.
 */

export function HostFocusButton({
  pourOrder,
  isFirst,
  isActive,
  disabled,
  onClick,
}: {
  pourOrder: number
  isFirst: boolean
  isActive: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={isActive ? 'default' : 'outline'}
      disabled={disabled}
      onClick={onClick}
      className="min-h-11"
      {...(isFirst ? { 'data-tour': 'session-set-focus' } : {})}
    >
      {isActive ? 'I fokus' : 'Sätt fokus'}
    </Button>
  )
}

export function HostRevealButton({
  pourOrder,
  isFirst,
  onClick,
}: {
  pourOrder: number
  isFirst: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="btn-brand min-h-11"
      onClick={onClick}
      {...(isFirst ? { 'data-tour': 'session-reveal' } : {})}
    >
      Avslöja vin #{pourOrder}
    </button>
  )
}

/** Host-only nudge once a wine's timer has run out — advances focus to the
 * next pour. Renders nothing until `startedAt` + `minutesPerWine` elapses. */
export function HostNextWineButton({
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
      className="min-h-11 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
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
export function HostSubmissionTracker({
  roster,
  entry,
}: {
  roster: RosterEntry[]
  entry: { withContent: number[]; locked: number[] } | undefined
}) {
  const withContent = new Set(entry?.withContent ?? [])
  const locked = new Set(entry?.locked ?? [])
  const guests = roster.filter((r) => !r.isHost && r.online)
  return (
    <div className="mt-3 rounded-md border bg-muted/40 p-3" data-tour="session-tracker">
      <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
        Vem har svarat
      </p>
      {guests.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">Inga anslutna deltagare ännu.</p>
      ) : (
        <ul className="mt-2 space-y-1">
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
      )}
    </div>
  )
}
