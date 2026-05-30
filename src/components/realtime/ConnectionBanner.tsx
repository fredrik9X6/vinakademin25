'use client'

import * as React from 'react'
import { useActiveSession } from '@/context/SessionContext'
import { WifiOff, Wifi } from 'lucide-react'

/**
 * Displays a sticky banner when the SSE connection is degraded.
 * - Shows "Ingen anslutning — återförsöker…" when reconnecting.
 * - Briefly shows "Återansluten" when the connection recovers, then hides.
 * - Renders nothing when the connection is open and stable.
 */
export function ConnectionBanner() {
  const { connectionState } = useActiveSession()
  // Track the previous state so we can flash a "recovered" message.
  const prevStateRef = React.useRef(connectionState)
  const [showRecovered, setShowRecovered] = React.useState(false)
  const recoveredTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    const prev = prevStateRef.current
    prevStateRef.current = connectionState

    if (prev === 'reconnecting' && connectionState === 'open') {
      // Connection just recovered — flash the success message briefly.
      setShowRecovered(true)
      if (recoveredTimerRef.current) clearTimeout(recoveredTimerRef.current)
      recoveredTimerRef.current = setTimeout(() => {
        setShowRecovered(false)
      }, 3000)
    }

    return () => {
      if (recoveredTimerRef.current) clearTimeout(recoveredTimerRef.current)
    }
  }, [connectionState])

  if (connectionState === 'reconnecting') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive"
      >
        <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Ingen anslutning — återförsöker…</span>
      </div>
    )
  }

  if (showRecovered) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-2 rounded-md bg-green-500/10 border border-green-500/30 px-3 py-2 text-sm text-green-700 dark:text-green-400"
      >
        <Wifi className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Återansluten</span>
      </div>
    )
  }

  return null
}
