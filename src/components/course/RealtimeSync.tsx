'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useActiveSession, type RosterEntry } from '@/context/SessionContext'
import type { SubmissionsByPour } from '@/lib/session-submission-status'

/**
 * Mounts an EventSource to the session's SSE stream and dispatches incoming
 * events into SessionContext. Renders nothing.
 *
 * Lives inside the SessionView (or any other surface that wants the live
 * stream); only one instance per page is needed.
 */
export function RealtimeSync({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const {
    setHostCurrentLessonId,
    setHostCurrentWinePourOrder,
    setHostFocusStartedAt,
    setRevealedPourOrders,
    setRoster,
    setSwarm,
    setSubmissionsByPour,
    setSessionStatus,
    clearActiveSession,
    setConnectionState,
  } = useActiveSession()
  // Guard so we only fire the post-end navigation once even if multiple
  // `lesson` events arrive with status='completed' before the redirect lands.
  const endedRef = useRef(false)

  useEffect(() => {
    const url = `/api/sessions/${encodeURIComponent(sessionId)}/stream`
    const es = new EventSource(url, { withCredentials: true })
    // Reset immediately so the banner reflects the new connection attempt —
    // without this, a remount or sessionId change would keep the previous
    // connection's final state until onopen fires.
    setConnectionState('connecting')

    es.onopen = () => {
      setConnectionState('open')
    }

    es.onerror = () => {
      // EventSource auto-reconnects; onerror fires on drop OR before reconnect.
      // readyState CLOSED (2) means the browser gave up entirely (rare — only
      // happens with withCredentials cross-origin issues); CONNECTING (0) is the
      // normal transient drop-and-reconnect path. Either way, surface 'reconnecting'
      // so the UI can inform the user.
      setConnectionState('reconnecting')
    }

    es.addEventListener('lesson', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as {
          currentLessonId: number | null
          currentWinePourOrder?: number | null
          currentWineFocusStartedAt?: string | null
          revealedPourOrders?: number[]
          blindTasting?: boolean
          status?: string | null
        }
        setHostCurrentLessonId(data.currentLessonId)
        if ('currentWinePourOrder' in data) {
          setHostCurrentWinePourOrder(data.currentWinePourOrder ?? null)
        }
        if ('currentWineFocusStartedAt' in data) {
          setHostFocusStartedAt(data.currentWineFocusStartedAt ?? null)
        }
        if (Array.isArray(data.revealedPourOrders)) {
          setRevealedPourOrders(data.revealedPourOrders)
        }
        if ('status' in data) {
          setSessionStatus(data.status ?? null)
          // The host explicitly ends the session by setting status to
          // 'completed'. Every connected client (host + guests) navigates to
          // the recap and clears its in-memory active-session state so the
          // ActiveSessionBanner does not reappear on subsequent navigations.
          if (data.status === 'completed' && !endedRef.current) {
            endedRef.current = true
            clearActiveSession()
            router.push(`/mina-provningar/historik/${sessionId}`)
          }
        }
      } catch {
        // Malformed payload — ignore. EventSource will keep streaming.
      }
    })

    es.addEventListener('roster', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as { participants: RosterEntry[] }
        if (Array.isArray(data?.participants)) setRoster(data.participants)
      } catch {
        // ignore
      }
    })

    es.addEventListener('swarm', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as {
          byPourOrder: Record<
            number,
            { avgRating: number; ratingCount: number; aromaCounts: Array<{ label: string; count: number }> }
          >
        }
        if (data?.byPourOrder) setSwarm(data.byPourOrder)
      } catch {
        // ignore
      }
    })

    es.addEventListener('submissions', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as { byPourOrder: SubmissionsByPour }
        if (data?.byPourOrder) setSubmissionsByPour(data.byPourOrder)
      } catch {
        // ignore
      }
    })

    es.addEventListener('heartbeat', () => {
      // No-op; the connection is alive. EventSource handles reconnection on drop.
    })

    return () => {
      es.close()
    }
  }, [
    sessionId,
    setHostCurrentLessonId,
    setHostCurrentWinePourOrder,
    setHostFocusStartedAt,
    setRevealedPourOrders,
    setRoster,
    setSwarm,
    setSubmissionsByPour,
    setSessionStatus,
    clearActiveSession,
    setConnectionState,
    router,
  ])

  return null
}
