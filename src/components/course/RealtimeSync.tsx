'use client'

import { useEffect } from 'react'
import { useActiveSession, type RosterEntry } from '@/context/SessionContext'

/**
 * Mounts an EventSource to the session's SSE stream and dispatches incoming
 * events into SessionContext. Renders nothing.
 *
 * Lives inside the SessionView (or any other surface that wants the live
 * stream); only one instance per page is needed.
 */
export function RealtimeSync({ sessionId }: { sessionId: string }) {
  const { setHostCurrentLessonId, setRoster } = useActiveSession()

  useEffect(() => {
    const url = `/api/sessions/${encodeURIComponent(sessionId)}/stream`
    const es = new EventSource(url, { withCredentials: true })

    es.addEventListener('lesson', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as { currentLessonId: number | null }
        setHostCurrentLessonId(data.currentLessonId)
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

    es.addEventListener('heartbeat', () => {
      // No-op; the connection is alive. EventSource handles reconnection on drop.
    })

    return () => {
      es.close()
    }
  }, [sessionId, setHostCurrentLessonId, setRoster])

  return null
}
