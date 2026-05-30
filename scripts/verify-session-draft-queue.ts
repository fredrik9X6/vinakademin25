/**
 * Runnable assertion suite for the session-draft offline queue reducer.
 * No test runner in this repo — run with: npx tsx scripts/verify-session-draft-queue.ts
 * Exits non-zero on the first failed assertion.
 */
import assert from 'node:assert/strict'
import {
  backoffMs,
  initialQueueState,
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

console.log('OK')
