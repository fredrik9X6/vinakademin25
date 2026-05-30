'use client'

import * as React from 'react'
import { posthog } from '@/components/analytics'
import {
  backoffMs,
  initialQueueState,
  queueReducer,
  type DraftPayload,
  type QueueState,
} from './session-draft-queue'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'retrying' | 'error'

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
  /** Force an immediate save with `submittedAt` set (the "lock in" action). */
  lockIn: () => Promise<void>
  /** True when mount-time localStorage held a non-empty draft. */
  restoredFromDraft: boolean
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

function hasContent(draft: DraftPayload): boolean {
  return Object.entries(draft).some(([k, v]) => {
    if (k === 'submittedAt') return false
    if (v == null) return false
    if (typeof v === 'string') return v.trim().length > 0
    if (Array.isArray(v)) return v.length > 0
    if (typeof v === 'object') return Object.keys(v as object).length > 0
    return true
  })
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

  // Restore the localStorage mirror once on mount (before any network read).
  const [restoredFromDraft] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    const mirror = readMirror(key)
    if (mirror && hasContent(mirror)) {
      draftRef.current = mirror
      return true
    }
    return false
  })

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
      dispatch({ type: 'start' })
      const flight = queueRef.current.flightPayload
      if (!flight) return

      const body = buildBody(flight)
      track('vk_session_save_attempt')
      setStatus('saving')

      // Unload path: fire-and-forget, can't await or retry.
      if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        try {
          const blob = new Blob([JSON.stringify(body)], { type: 'application/json' })
          navigator.sendBeacon(endpoint, blob)
          dispatch({ type: 'success' })
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
        if (!res.ok) throw new Error(String(res.status))
        dispatch({ type: 'success' })
        track('vk_session_save_success')
        setStatus('saved')
      } catch {
        dispatch({ type: 'failure' })
        track('vk_session_save_failure')
        const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false
        if (isOffline) {
          // Queued; the 'online' listener will flush. Surface "retrying".
          setStatus('retrying')
          return
        }
        setStatus('retrying')
        track('vk_session_save_retry')
        if (retryTimer.current) clearTimeout(retryTimer.current)
        retryTimer.current = setTimeout(() => {
          void flush()
        }, backoffMs(queueRef.current.attempt))
      }
    },
    [buildBody, dispatch, endpoint, track],
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
      if (!hasContent(draftRef.current)) return
      dispatch({ type: 'enqueue', payload: { ...draftRef.current } })
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      debounceTimer.current = setTimeout(() => {
        void flush()
      }, debounceMs)
    },
    [debounceMs, dispatch, flush, key],
  )

  const lockIn = React.useCallback(async () => {
    const stamped = { ...draftRef.current, submittedAt: new Date().toISOString() }
    draftRef.current = stamped
    try {
      localStorage.setItem(key, JSON.stringify(stamped))
    } catch {
      // ignore
    }
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    dispatch({ type: 'enqueue', payload: { ...stamped } })
    await flush()
  }, [dispatch, flush, key])

  // Flush queued writes when connectivity returns; final beacon on unload.
  React.useEffect(() => {
    const onOnline = () => {
      if (queueRef.current.pending != null) {
        track('vk_session_save_retry')
        void flush()
      }
    }
    const onBeforeUnload = () => {
      if (queueRef.current.pending != null || queueRef.current.flightPayload != null) {
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

  return { status, queueSave, lockIn, restoredFromDraft }
}
