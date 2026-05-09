'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const POLL_INTERVAL_MS = 5_000

/**
 * Polls /api/sessions/lookup every 5 s. While the response status stays
 * `paused` we do nothing. As soon as it changes (typically to `active`),
 * we trigger a router.refresh() so the parent server component re-renders
 * with the new branch. The poll aborts on unmount.
 */
export function PausedWatcher({ code }: { code: string }) {
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    const tick = async () => {
      try {
        const res = await fetch(
          `/api/sessions/lookup?code=${encodeURIComponent(code)}`,
          { cache: 'no-store', signal: controller.signal },
        )
        if (cancelled) return
        const data = (await res.json()) as { status?: string }
        if (data.status && data.status !== 'paused') {
          router.refresh()
          // Stop polling — the refresh will unmount us if the new state
          // isn't paused, which clears the interval below.
        }
      } catch {
        // Network blip or aborted fetch — keep polling.
      }
    }

    const id = setInterval(tick, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      controller.abort()
      clearInterval(id)
    }
  }, [code, router])

  return null
}
