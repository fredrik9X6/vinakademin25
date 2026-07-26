/**
 * Pure, framework-free offline-queue reducer for useSessionDraft.
 *
 * One pending "slot" (last-write-wins) plus one in-flight payload. The hook
 * drives I/O; this module only models the state machine so it can be verified
 * by scripts/verify-session-draft-queue.ts.
 */
export type DraftPayload = Record<string, unknown>

/** Consecutive autosave failures before the queue stops retrying on its own. */
export const MAX_AUTOSAVE_ATTEMPTS = 5

export interface QueueState {
  /** Latest unsent payload; null when nothing is queued. */
  pending: DraftPayload | null
  /** True while a request is in flight. */
  inFlight: boolean
  /** Payload currently being sent; null when idle. */
  flightPayload: DraftPayload | null
  /** Consecutive failures of the current/last flight. Resets on success. */
  attempt: number
  /**
   * True once retries are exhausted or the server rejected the body outright
   * (4xx). The payload STAYS in `pending` so nothing is lost — the hook simply
   * stops retrying and surfaces an error until fresh input arrives.
   */
  gaveUp: boolean
}

export type QueueAction =
  | { type: 'enqueue'; payload: DraftPayload }
  | { type: 'start' }
  | { type: 'success' }
  | { type: 'failure'; permanent?: boolean }

export const initialQueueState: QueueState = {
  pending: null,
  inFlight: false,
  flightPayload: null,
  attempt: 0,
  gaveUp: false,
}

export function queueReducer(state: QueueState, action: QueueAction): QueueState {
  switch (action.type) {
    case 'enqueue':
      // Last-write-wins: collapse to a single pending payload.
      return {
        ...state,
        pending: action.payload,
        // Fresh input after a give-up earns a clean retry budget — the body
        // changed, so it may now be valid. Input during an ongoing backoff must
        // NOT reset `attempt`, or a fast typist would defeat backoff entirely.
        ...(state.gaveUp ? { gaveUp: false, attempt: 0 } : {}),
      }
    case 'start':
      // Only promote pending → flight when idle and something is queued.
      if (state.inFlight || state.pending == null) return state
      return {
        ...state,
        inFlight: true,
        flightPayload: state.pending,
        pending: null,
      }
    case 'success':
      return {
        ...state,
        inFlight: false,
        flightPayload: null,
        attempt: 0,
        gaveUp: false,
      }
    case 'failure': {
      // Re-queue the flight payload for retry, but never clobber a newer
      // pending payload that arrived while the request was in flight.
      const attempt = state.attempt + 1
      return {
        ...state,
        inFlight: false,
        pending: state.pending ?? state.flightPayload,
        flightPayload: null,
        attempt,
        gaveUp: action.permanent === true || attempt >= MAX_AUTOSAVE_ATTEMPTS,
      }
    }
    default:
      return state
  }
}

/** Exponential backoff in ms: 0, 1s, 2s, 4s, 8s, … capped at 15s. */
export function backoffMs(attempt: number): number {
  if (attempt <= 0) return 0
  return Math.min(15000, 1000 * 2 ** (attempt - 1))
}

/**
 * Deep value-equality for two drafts.
 *
 * Exists to make an autosave write-storm structurally impossible. On
 * 2026-07-26 an unstable React callback identity caused the review form's
 * autosave effect to re-fire on every render — and the session polls every 2s,
 * so an identical body was POSTed every 2s for as long as the tab was open.
 * Comparing content before enqueueing means render churn alone can never
 * produce a write, no matter which component forgets to memoize a prop.
 */
export function draftsEqual(a: DraftPayload, b: DraftPayload): boolean {
  return deepEqual(a, b)
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a == null || b == null) return a === b
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((item, i) => deepEqual(item, b[i]))
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const ak = Object.keys(a as object)
    const bk = Object.keys(b as object)
    if (ak.length !== bk.length) return false
    return ak.every(
      (k) =>
        Object.prototype.hasOwnProperty.call(b, k) &&
        deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
    )
  }
  return false
}

/**
 * Returns true when `draft` contains at least one leaf value that is
 * meaningfully non-empty. Keys listed in `ignoreKeys` (default: `submittedAt`)
 * are skipped entirely. Empty is defined as: null, undefined, empty/whitespace
 * string, 0, false, an empty array, an array whose every item is empty, or an
 * object whose every own value is empty (recursive). Everything else is content.
 */
export function draftHasContent(
  draft: DraftPayload,
  ignoreKeys: string[] = ['submittedAt'],
): boolean {
  function isEmpty(value: unknown): boolean {
    if (value === null || value === undefined) return true
    if (typeof value === 'string') return value.trim().length === 0
    if (typeof value === 'number') return value === 0
    if (typeof value === 'boolean') return value === false
    if (Array.isArray(value)) return value.every((item) => isEmpty(item))
    if (typeof value === 'object') {
      return Object.keys(value as object).every((k) => isEmpty((value as Record<string, unknown>)[k]))
    }
    return false
  }

  return Object.entries(draft).some(([k, v]) => {
    if (ignoreKeys.includes(k)) return false
    return !isEmpty(v)
  })
}
