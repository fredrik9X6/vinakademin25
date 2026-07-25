/**
 * Runnable assertion suite for the session-draft offline queue reducer.
 * No test runner in this repo — run with: npx tsx scripts/verify-session-draft-queue.ts
 * Exits non-zero on the first failed assertion.
 */
import assert from 'node:assert/strict'
import {
  backoffMs,
  draftHasContent,
  initialQueueState,
  MAX_AUTOSAVE_ATTEMPTS,
  queueReducer,
  type QueueState,
} from '../src/lib/session-draft-queue'

function run(name: string, fn: () => void) {
  fn()
  console.log(`ok - ${name}`)
}

// enqueue replaces the pending payload (last-write-wins, one slot)
run('enqueue keeps only the latest payload', () => {
  let s: QueueState = initialQueueState
  s = queueReducer(s, { type: 'enqueue', payload: { a: 1 } })
  s = queueReducer(s, { type: 'enqueue', payload: { a: 2 } })
  assert.deepEqual(s.pending, { a: 2 })
  assert.equal(s.inFlight, false)
  assert.equal(s.attempt, 0)
})

// start moves pending → inFlight; pending cleared
run('start consumes pending into flight', () => {
  let s: QueueState = initialQueueState
  s = queueReducer(s, { type: 'enqueue', payload: { a: 1 } })
  s = queueReducer(s, { type: 'start' })
  assert.equal(s.inFlight, true)
  assert.deepEqual(s.flightPayload, { a: 1 })
  assert.equal(s.pending, null)
})

// start is a no-op when nothing pending or already in flight
run('start is a no-op without pending', () => {
  const s = queueReducer(initialQueueState, { type: 'start' })
  assert.equal(s.inFlight, false)
  assert.equal(s.flightPayload, null)
})
run('start is a no-op while in flight', () => {
  let s: QueueState = initialQueueState
  s = queueReducer(s, { type: 'enqueue', payload: { a: 1 } })
  s = queueReducer(s, { type: 'start' })
  s = queueReducer(s, { type: 'enqueue', payload: { a: 2 } })
  const before = s
  s = queueReducer(s, { type: 'start' })
  assert.equal(s.inFlight, true)
  assert.deepEqual(s.flightPayload, { a: 1 }) // unchanged; { a: 2 } still pending
  assert.deepEqual(s.pending, { a: 2 })
  assert.deepEqual(s, before)
})

// success clears flight + attempt
run('success clears flight and resets attempt', () => {
  let s: QueueState = initialQueueState
  s = queueReducer(s, { type: 'enqueue', payload: { a: 1 } })
  s = queueReducer(s, { type: 'start' })
  s = queueReducer(s, { type: 'failure' }) // attempt → 1
  s = queueReducer(s, { type: 'success' })
  assert.equal(s.inFlight, false)
  assert.equal(s.flightPayload, null)
  assert.equal(s.attempt, 0)
})

// failure re-queues the in-flight payload IF nothing newer is pending, bumps attempt
run('failure requeues flight payload when no newer pending', () => {
  let s: QueueState = initialQueueState
  s = queueReducer(s, { type: 'enqueue', payload: { a: 1 } })
  s = queueReducer(s, { type: 'start' })
  s = queueReducer(s, { type: 'failure' })
  assert.equal(s.inFlight, false)
  assert.equal(s.flightPayload, null)
  assert.deepEqual(s.pending, { a: 1 }) // requeued for retry
  assert.equal(s.attempt, 1)
})

// failure does NOT clobber a newer pending payload
run('failure keeps newer pending over stale flight', () => {
  let s: QueueState = initialQueueState
  s = queueReducer(s, { type: 'enqueue', payload: { a: 1 } })
  s = queueReducer(s, { type: 'start' }) // flight = {a:1}
  s = queueReducer(s, { type: 'enqueue', payload: { a: 2 } }) // pending = {a:2}
  s = queueReducer(s, { type: 'failure' })
  assert.deepEqual(s.pending, { a: 2 }) // newer wins
  assert.equal(s.attempt, 1)
})

// backoff delay grows with attempt and is capped
run('backoffMs grows and caps', () => {
  // exposed for the hook + asserted here so the curve can't silently change
  assert.equal(backoffMs(0), 0)
  assert.equal(backoffMs(1), 1000)
  assert.equal(backoffMs(2), 2000)
  assert.equal(backoffMs(3), 4000)
  assert.equal(backoffMs(99), 15000) // capped at 15s
})

// ---------------------------------------------------------------------------
// draftHasContent assertions
// ---------------------------------------------------------------------------

run('draftHasContent: empty object → false', () => {
  assert.equal(draftHasContent({}), false)
})

run('draftHasContent: only submittedAt → false (ignored key)', () => {
  assert.equal(draftHasContent({ submittedAt: '2026-01-01T00:00:00.000Z' }), false)
})

run('draftHasContent: all-empty wsetTasting nested objects → false', () => {
  assert.equal(
    draftHasContent({
      wsetTasting: { appearance: {}, nose: {}, palate: {}, conclusion: {} },
    }),
    false,
  )
})

run('draftHasContent: falsy scalars + all-empty wsetTasting → false', () => {
  assert.equal(
    draftHasContent({
      rating: 0,
      buyAgain: false,
      notes: '',
      publishedToProfile: false,
      wsetTasting: { appearance: {}, nose: {}, palate: {}, conclusion: {} },
    }),
    false,
  )
})

run('draftHasContent: non-empty string → true', () => {
  assert.equal(draftHasContent({ notes: 'hi' }), true)
})

run('draftHasContent: all-null object values → false', () => {
  assert.equal(draftHasContent({ country: null, grape: null, priceBucket: null }), false)
})

run('draftHasContent: one non-null string field → true', () => {
  assert.equal(draftHasContent({ country: 'Frankrike' }), true)
})

run('draftHasContent: nested array with a real item → true', () => {
  assert.equal(
    draftHasContent({ wsetTasting: { nose: { primaryAromas: ['Citrus'] } } }),
    true,
  )
})

// BlindGuessCard-style guesses
run('draftHasContent: guess with one real field → true', () => {
  assert.equal(draftHasContent({ grape: 'Pinot Noir', country: null, vintage: null }), true)
})

run('draftHasContent: all-null guess → false', () => {
  assert.equal(draftHasContent({ grape: null, country: null, vintage: null }), false)
})

// Edge cases
run('draftHasContent: whitespace-only string → false', () => {
  assert.equal(draftHasContent({ notes: '   ' }), false)
})

run('draftHasContent: empty array → false', () => {
  assert.equal(draftHasContent({ aromas: [] }), false)
})

run('draftHasContent: array of nulls → false', () => {
  assert.equal(draftHasContent({ aromas: [null, null] }), false)
})

run('draftHasContent: true boolean → true', () => {
  assert.equal(draftHasContent({ buyAgain: true }), true)
})

run('draftHasContent: non-zero number → true', () => {
  assert.equal(draftHasContent({ rating: 3 }), true)
})

run('draftHasContent: ignoreKeys param excludes custom key', () => {
  assert.equal(draftHasContent({ _internal: 'x', notes: '' }, ['_internal', 'submittedAt']), false)
})

// ── Retry ceiling / permanent failure ────────────────────────────────────────

run('gaveUp is false on a fresh state', () => {
  assert.equal(initialQueueState.gaveUp, false)
})

run('gaveUp flips after MAX_AUTOSAVE_ATTEMPTS consecutive failures', () => {
  let s: QueueState = initialQueueState
  s = queueReducer(s, { type: 'enqueue', payload: { a: 1 } })
  for (let i = 0; i < MAX_AUTOSAVE_ATTEMPTS; i++) {
    s = queueReducer(s, { type: 'start' })
    s = queueReducer(s, { type: 'failure' })
  }
  assert.equal(s.attempt, MAX_AUTOSAVE_ATTEMPTS)
  assert.equal(s.gaveUp, true)
  // The payload is NOT dropped — the user's data must survive.
  assert.deepEqual(s.pending, { a: 1 })
})

run('a permanent failure gives up immediately, on the first attempt', () => {
  let s: QueueState = initialQueueState
  s = queueReducer(s, { type: 'enqueue', payload: { a: 1 } })
  s = queueReducer(s, { type: 'start' })
  s = queueReducer(s, { type: 'failure', permanent: true })
  assert.equal(s.attempt, 1)
  assert.equal(s.gaveUp, true)
  assert.deepEqual(s.pending, { a: 1 })
})

run('success clears gaveUp', () => {
  let s: QueueState = initialQueueState
  s = queueReducer(s, { type: 'enqueue', payload: { a: 1 } })
  s = queueReducer(s, { type: 'start' })
  s = queueReducer(s, { type: 'failure', permanent: true })
  s = queueReducer(s, { type: 'start' })
  s = queueReducer(s, { type: 'success' })
  assert.equal(s.gaveUp, false)
  assert.equal(s.attempt, 0)
})

run('fresh input after give-up restarts the retry budget', () => {
  let s: QueueState = initialQueueState
  s = queueReducer(s, { type: 'enqueue', payload: { a: 1 } })
  s = queueReducer(s, { type: 'start' })
  s = queueReducer(s, { type: 'failure', permanent: true })
  assert.equal(s.gaveUp, true)
  s = queueReducer(s, { type: 'enqueue', payload: { a: 2 } })
  assert.equal(s.gaveUp, false)
  assert.equal(s.attempt, 0)
  assert.deepEqual(s.pending, { a: 2 })
})

run('input during an ongoing backoff does NOT reset the attempt counter', () => {
  // A fast typist must not be able to defeat exponential backoff.
  let s: QueueState = initialQueueState
  s = queueReducer(s, { type: 'enqueue', payload: { a: 1 } })
  s = queueReducer(s, { type: 'start' })
  s = queueReducer(s, { type: 'failure' })
  s = queueReducer(s, { type: 'start' })
  s = queueReducer(s, { type: 'failure' })
  assert.equal(s.attempt, 2)
  s = queueReducer(s, { type: 'enqueue', payload: { a: 2 } })
  assert.equal(s.attempt, 2)
  assert.equal(s.gaveUp, false)
})

console.log('OK')
