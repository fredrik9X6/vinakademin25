'use client'

import * as React from 'react'

export interface WineFocusTimerProps {
  /** ISO timestamp of when this wine got focus. */
  startedAt: string | null
  /** Total countdown duration in minutes. */
  minutesPerWine: number
}

/**
 * Countdown chip for the currently-focused wine. Renders nothing if either
 * `startedAt` or `minutesPerWine` is missing/invalid.
 *
 * Color states:
 *   > 30s remaining: muted
 *   ≤ 30s and > 0: amber
 *   ≤ 0: red "Dags att gå vidare?"
 *
 * Recomputes once per second via a setInterval.
 */
export function WineFocusTimer({ startedAt, minutesPerWine }: WineFocusTimerProps) {
  const totalSeconds = React.useMemo(() => {
    if (!minutesPerWine || minutesPerWine <= 0) return 0
    return Math.floor(minutesPerWine * 60)
  }, [minutesPerWine])

  const [now, setNow] = React.useState<number>(() => Date.now())
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!startedAt || totalSeconds <= 0) return null

  const startMs = new Date(startedAt).getTime()
  if (Number.isNaN(startMs)) return null

  const elapsedSec = Math.max(0, Math.floor((now - startMs) / 1000))
  const remainingSec = totalSeconds - elapsedSec

  const mm = Math.floor(Math.abs(remainingSec) / 60)
  const ss = Math.abs(remainingSec) % 60
  const mmss = `${mm}:${String(ss).padStart(2, '0')}`

  if (remainingSec <= 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive px-2.5 py-0.5 text-xs font-medium">
        Dags att gå vidare?
      </span>
    )
  }

  const isWarn = remainingSec <= 30
  const tone = isWarn
    ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200'
    : 'bg-muted text-muted-foreground'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums ${tone}`}
    >
      {mmss}
    </span>
  )
}
