'use client'

import * as React from 'react'
import { useActiveSession } from '@/context/SessionContext'

/**
 * When the recap page mounts and the in-memory / localStorage `activeSession`
 * still references this same session, forget it. Prevents the
 * ActiveSessionBanner from showing a "Återgå till session" CTA pointing back
 * at a session that has actually ended. Survives hard refreshes because the
 * cleanup also wipes the localStorage entry.
 *
 * The host's `handleHostEnd` and RealtimeSync's SSE 'completed' handler both
 * call `clearActiveSession` already; this is the catch-all for any other
 * path that lands a viewer on /historik/<id> with a stale local state
 * (deep-link, wrap-up email click, etc.).
 */
export function ClearActiveSessionOnMount({ sessionId }: { sessionId: number | string }) {
  const { activeSession, clearActiveSession } = useActiveSession()
  React.useEffect(() => {
    if (!activeSession) return
    if (String(activeSession.sessionId) !== String(sessionId)) return
    clearActiveSession()
  }, [activeSession, sessionId, clearActiveSession])
  return null
}
