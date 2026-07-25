'use client'

import * as React from 'react'
import { posthog } from '@/components/analytics'
import {
  backoffMs,
  draftHasContent,
  initialQueueState,
  queueReducer,
  type DraftPayload,
  type QueueState,
} from './session-draft-queue'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'retrying' | 'error' | 'failed'

export type DraftKind = 'guess' | 'review'

export interface UseSessionDraftOptions {
  kind: DraftKind
  sessionId: number | string
  /** Pour order for the wine this draft belongs to. Used for the localStorage
   * key scope and PostHog properties. */
  pourOrder: number
  /** Endpoint that upserts the draft. '/api/session-guesses' | '/api/reviews'. */
  endpoint: string
  /** Builds the request body from a partial. The hook merges partials before
   * calling this so the body always carries the full current draft. */
  buildBody: (draft: DraftPayload) => DraftPayload
  /** Debounce window before the autosave fires. Default 800ms. */
  debounceMs?: number
}

export interface UseSessionDraft {
  status: SaveStatus
  /** Merge a partial into the draft and schedule a debounced save. */
  queueSave: (partial: DraftPayload) => void
  /** Force an immediate save with `submittedAt` set (the "lock in" action).
   * Resolves `true` when the stamped payload was confirmed delivered to the
   * server; `false` when delivery could not be confirmed (offline, repeated
   * failures, unmount) — the localStorage mirror + retry queue still cover
   * eventual delivery, but callers MUST NOT show a success state on false. */
  lockIn: () => Promise<boolean>
  /** Clear a terminal failure and attempt delivery again. No-op unless the
   *  queue has given up. */
  retry: () => void
  /** True when mount-time localStorage held a non-empty draft. */
  restoredFromDraft: boolean
  /** The parsed localStorage draft found at mount, or null if none existed.
   * Consumers can use this to seed visible state so recovered answers render
   * even when the server hasn't yet persisted them (e.g. offline autosave). */
  restoredDraft: DraftPayload | null
}

const DEBOUNCE_DEFAULT = 800

function lsKey(sessionId: number | string, scope: string) {
  return `vk_draft_${sessionId}_${scope}`
}

function readMirror(key: string): DraftPayload | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as DraftPayload) : null
  } catch {
    return null
  }
}


export function useSessionDraft(options: UseSessionDraftOptions): UseSessionDraft {
  const {
    kind,
    sessionId,
    pourOrder,
    endpoint,
    buildBody,
    debounceMs = DEBOUNCE_DEFAULT,
  } = options
  const scope = `${kind}_${pourOrder}`
  const key = lsKey(sessionId, scope)

  const [status, setStatus] = React.useState<SaveStatus>('idle')
  // The full merged draft (everything the user has entered). Synchronously
  // mirrored to localStorage on every change.
  const draftRef = React.useRef<DraftPayload>({})
  const queueRef = React.useRef<QueueState>(initialQueueState)
  const debounceTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = React.useRef(true)
  React.useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])
  const safeSetStatus = React.useCallback((next: SaveStatus) => {
    if (mountedRef.current) setStatus(next)
  }, [])

  // Restore the localStorage mirror once on mount (before any network read).
  const [restoredDraft] = React.useState<DraftPayload | null>(() => {
    if (typeof window === 'undefined') return null
    const mirror = readMirror(key)
    if (mirror && draftHasContent(mirror)) {
      draftRef.current = mirror
      return mirror
    }
    return null
  })
  const restoredFromDraft = restoredDraft !== null

  const track = React.useCallback(
    (
      event:
        | 'vk_session_save_attempt'
        | 'vk_session_save_success'
        | 'vk_session_save_failure'
        | 'vk_session_save_retry',
    ) => {
      try {
        posthog.capture(event, { kind, sessionId: String(sessionId), pourOrder })
      } catch {
        // analytics must never break saving
      }
    },
    [kind, sessionId, pourOrder],
  )

  const dispatch = React.useCallback((action: Parameters<typeof queueReducer>[1]) => {
    queueRef.current = queueReducer(queueRef.current, action)
  }, [])

  // Core send loop. Pulls the pending payload into flight, POSTs it, and on
  // failure schedules a backed-off retry (which also runs on regaining
  // connectivity via the 'online' listener below).
  const flush = React.useCallback(
    async (useBeacon = false): Promise<void> => {
      // Re-entrancy guard: if a request is already in flight, do nothing.
      // `start` is a no-op while in flight (it would leave the STALE
      // flightPayload in place), so a second concurrent flush would otherwise
      // re-POST the stale payload and strand the freshly-enqueued one. The
      // newer payload sits in `pending` and is drained by the post-success
      // drainer below (or the retry/online paths).
      if (queueRef.current.inFlight) return

      dispatch({ type: 'start' })
      const flight = queueRef.current.flightPayload
      if (!flight) return

      const body = buildBody(flight)
      track('vk_session_save_attempt')
      safeSetStatus('saving')

      // Unload path: fire-and-forget, can't await or retry.
      if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        try {
          const blob = new Blob([JSON.stringify(body)], { type: 'application/json' })
          // sendBeacon returns false if the agent refused to queue the
          // transfer; don't record a false success when it does.
          if (navigator.sendBeacon(endpoint, blob)) {
            dispatch({ type: 'success' })
          } else {
            dispatch({ type: 'failure' })
          }
        } catch {
          dispatch({ type: 'failure' })
        }
        return
      }

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          // 4xx means this exact body will never be accepted. Retrying it is
          // what produced 49 consecutive failures over 10 minutes. 408 and 429
          // are the transient exceptions.
          const permanent = res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429
          const err = new Error(String(res.status)) as Error & { permanent?: boolean }
          err.permanent = permanent
          throw err
        }
        dispatch({ type: 'success' })
        track('vk_session_save_success')
        safeSetStatus('saved')
        // Post-success drainer: a payload may have been enqueued while this
        // request was in flight (a keystroke during the await window, or a
        // lockIn). Nothing else would send it until a later keystroke/online/
        // beforeunload, so drain it now.
        if (queueRef.current.pending != null) {
          setTimeout(() => {
            void flush()
          }, 0)
        }
      } catch (caught) {
        const permanent = (caught as { permanent?: boolean })?.permanent === true
        dispatch({ type: 'failure', permanent })
        track('vk_session_save_failure')
        const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false
        if (isOffline) {
          // Queued; the 'online' listener will flush. Surface "retrying".
          safeSetStatus('retrying')
          return
        }
        if (queueRef.current.gaveUp) {
          // Terminal. The payload is still in `pending` and in localStorage —
          // nothing is lost — but we stop hammering and tell the user.
          safeSetStatus('failed')
          return
        }
        safeSetStatus('retrying')
        track('vk_session_save_retry')
        if (retryTimer.current) clearTimeout(retryTimer.current)
        retryTimer.current = setTimeout(() => {
          void flush()
        }, backoffMs(queueRef.current.attempt))
      }
    },
    [buildBody, dispatch, endpoint, safeSetStatus, track],
  )

  const queueSave = React.useCallback(
    (partial: DraftPayload) => {
      draftRef.current = { ...draftRef.current, ...partial }
      // Synchronous mirror — survives a refresh even before the debounce fires.
      try {
        localStorage.setItem(key, JSON.stringify(draftRef.current))
      } catch {
        // localStorage may be blocked; in-memory + server save still apply.
      }
      // Row-creation floor: don't POST an empty draft.
      if (!draftHasContent(draftRef.current)) return
      dispatch({ type: 'enqueue', payload: { ...draftRef.current } })
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      debounceTimer.current = setTimeout(() => {
        void flush()
      }, debounceMs)
    },
    [debounceMs, dispatch, flush, key],
  )

  const lockIn = React.useCallback(async (): Promise<boolean> => {
    const stamped = { ...draftRef.current, submittedAt: new Date().toISOString() }
    draftRef.current = stamped
    try {
      localStorage.setItem(key, JSON.stringify(stamped))
    } catch {
      // ignore
    }
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    // Enqueue the stamped (submittedAt) payload. localStorage mirror + queue
    // now hold it regardless of what happens with the network.
    dispatch({ type: 'enqueue', payload: { ...stamped } })

    const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, ms)
      })

    // Drive the queue until the stamped payload is actually delivered:
    // pending drained AND nothing in flight. A bare `await flush()` can no-op
    // (when a debounced save is already in flight, the re-entrancy guard
    // returns immediately) or resolve before the post-success drainer has sent
    // the payload we just enqueued — so loop, re-flushing as needed.
    const MAX_LOCKIN_ATTEMPTS = 5
    let attempts = 0
    while (queueRef.current.pending != null || queueRef.current.inFlight) {
      // Bail on unmount or offline — the localStorage mirror + retry timer +
      // 'online' listener still cover eventual delivery; don't hang or hammer.
      // Unconfirmed: callers must not show success.
      if (isOffline() || !mountedRef.current) return false
      // The queue has given up (4xx or exhausted retries). Report failure so
      // the caller does not show a success state.
      if (queueRef.current.gaveUp) return false
      if (!queueRef.current.inFlight) {
        if (attempts >= MAX_LOCKIN_ATTEMPTS) return false
        const delay = backoffMs(queueRef.current.attempt)
        if (delay > 0) await wait(delay)
        attempts++
        await flush()
      } else {
        await wait(50)
      }
    }
    return true
  }, [dispatch, flush, key])

  // Flush queued writes when connectivity returns; final beacon on unload.
  React.useEffect(() => {
    const onOnline = () => {
      // After a terminal give-up, pending is deliberately retained to preserve
      // the user's unsaved notes. Its presence alone must not trigger a send —
      // the payload was already permanently rejected (4xx or exhausted retries).
      if (queueRef.current.pending != null && !queueRef.current.gaveUp) {
        track('vk_session_save_retry')
        void flush()
      }
    }
    const onBeforeUnload = () => {
      // After a terminal give-up, pending is deliberately retained to preserve
      // the user's unsaved notes. Do not beacon a permanently-rejected payload
      // on page close — the server already rejected it, and the notes survive
      // in localStorage for recovery on next visit.
      if (!queueRef.current.gaveUp && (queueRef.current.pending != null || queueRef.current.flightPayload != null)) {
        // Promote any pending into a final beacon flush.
        if (queueRef.current.pending == null && queueRef.current.flightPayload != null) {
          dispatch({ type: 'enqueue', payload: { ...queueRef.current.flightPayload } })
        }
        void flush(true)
      }
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('beforeunload', onBeforeUnload)
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      if (retryTimer.current) clearTimeout(retryTimer.current)
    }
  }, [dispatch, flush, track])

  const retry = React.useCallback(() => {
    if (!queueRef.current.gaveUp) return
    // Re-enqueue the retained payload; `enqueue` clears gaveUp and resets the
    // attempt budget.
    const payload = queueRef.current.pending
    if (payload == null) return
    dispatch({ type: 'enqueue', payload: { ...payload } })
    void flush()
  }, [dispatch, flush])

  return { status, queueSave, lockIn, retry, restoredFromDraft, restoredDraft }
}
