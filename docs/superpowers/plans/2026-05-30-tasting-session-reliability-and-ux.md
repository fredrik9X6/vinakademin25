# Live Tasting Session — Reliability & UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make live-tasting submissions impossible to lose, make the tasting-note form approachable for amateurs, surface the real price at reveal, and give hosts a who-submitted tracker — without breaking the existing live/reveal/recap flow.

**Architecture:** A shared `useSessionDraft` hook gives both the blind-guess card and the tasting-note form continuous autosave (debounce + localStorage mirror + retry/offline queue + sendBeacon) with a non-gating "Lås in" action; identity is rehydrated from the httpOnly cookie (not localStorage); price buckets move to a finer six-bucket scheme via a remapping migration and the exact price is shown at reveal; the existing SSE stream gains a per-pour `submissions` event powering a host tracker + reveal guard.

**Tech Stack:** Next.js 15 App Router, Payload CMS 3.33, Postgres (migration-driven), Server-Sent Events, PostHog. No automated test runner — verification uses `pnpm generate:types` / `pnpm lint` / `pnpm build`, runnable `tsx` assertion scripts for pure logic, and manual QA.

**Spec:** `docs/superpowers/specs/2026-05-30-tasting-session-reliability-and-ux-design.md`

**Implementation order:** A → B → C → D (A and B independently shippable; C self-contained; D depends on A's `submittedAt` + the `submissions` stream event). Suggest one PR per workstream.

---

## Cross-Workstream Reconciliations (READ BEFORE EXECUTING)

These resolve real conflicts found in plan review. Because the workstreams land **A → B → C → D**, a later workstream must quote the *post-edit* text of any shared region an earlier one already changed, and exact-match `old_string` anchors between A and D must be disjoint. Apply these overrides wherever they conflict with a task body below.

**R1 — (BUILD-BREAKER) Unify the `PriceBucket` type. Run as the last task of Workstream C.**
The spec named three duplicate bucket definitions, but four more files hard-code the old union and will fail `pnpm build` once the canonical type changes (e.g. `TastingPlanForm`'s local `BlindAnswersState.priceBucket` diverges from `BlindAnswerInputs`'s imported `PriceBucket`). Add this task:

> ### Task 38: Repoint all local `PriceBucket` aliases to the single source
> **Files:** Modify `src/components/tasting-plan/TastingPlanForm.tsx:50`, `src/app/api/tasting-plans/route.ts:20`, `src/app/api/tasting-plans/[id]/route.ts:20`, `src/app/api/tasting-plans/[id]/duplicate/route.ts:83-87`
> - [ ] **Step 1:** In each file, delete the local `type PriceBucket = 'under_100' | '100_200' | '200_300' | '300_500' | '500_plus'` declaration (and the inline union in `duplicate/route.ts`) and import the canonical type instead: `import { type PriceBucket } from '@/lib/blind-guess-vocab'` (merge into an existing import from that module if present).
> - [ ] **Step 2:** Run `pnpm build`. Expected: compiles with no `PriceBucket` type-incompatibility error on `<BlindAnswerInputs value={blindAnswers} … />` in `TastingPlanForm.tsx`.
> - [ ] **Step 3:** Commit: `git commit -am "otter: price — unify PriceBucket type to blind-guess-vocab"`

**R2 — BlindGuessCard reveal price row (Workstream C Task 35 lands after A).** A removes the `submitted` state and makes `editing` the single source of truth. C's price `<Row>` must therefore read `editing.priceBucket`, not `submitted.priceBucket`, and resolve the answer with `resolveAnswerPriceBucket(answer)`. Quote A's post-edit reveal block (guarded by the post-A condition using `editing`) as the "current" code.

**R3 — `SessionContext.tsx` (A adds `connectionState`; D adds `submissionsByPour`).** Use disjoint anchors so neither Edit collides: in the `value` object, **A** appends `connectionState, setConnectionState,` immediately after `clearActiveSession,`; **D** inserts `submissionsByPour, setSubmissionsByPour,` immediately after `setRoster,`. Place the `useState` hooks and interface fields on distinct anchor lines the same way (A near the `sessionStatus` state ~:96; D near the `roster` state ~:95).

**R4 — `RealtimeSync.tsx` (D lands after A).** D must quote the **post-A** `useActiveSession()` destructure and effect deps array (which already contain `setConnectionState`) when adding `setSubmissionsByPour` and the `submissions` event listener. Equivalently: A appends `setConnectionState,` after `clearActiveSession,`; D inserts `setSubmissionsByPour,` after `setSwarm,`.

**R5 — `PlanSessionContent.tsx` BlindGuessCard render (D Task 44 lands after A Task 8).** D must quote the **post-A** `<BlindGuessCard … initialSubmittedAt={…} onRestored={…} />` JSX as its "current" block, then insert `{isHost && isActive && <HostSubmissionTracker … />}` between BlindGuessCard's closing `)}` and the `{shouldShowSwarm && <SwarmPanel … />}` line.

**R6 — Unify pour resolution.** A's `my-submissions` rewrite (Task 5) must resolve review→pour with `buildPourMaps` / `resolvePourForReview` from `@/lib/session-pour-mapping` — the same helper D's stream aggregator (Task 41) uses — instead of bespoke `wineIdToPour` / `titleToPour` maps, so custom-wine pour matching can't diverge between rehydration, host tracker, swarm, and recap.

**R7 — (placeholder fix) A Task 7 ordering is mandatory, not conditional.** `fetchLatestSubmission` (currently `:202`) calls `populateFormWithReview` (currently `:279`). Relocate the entire `fetchLatestSubmission` `useCallback` to immediately **after** the `populateFormWithReview` `useCallback` (after ~:319) and add `populateFormWithReview` to its dependency array. This is required (use-before-declaration), not "if lint flags it."

**R8 — (placeholder fix) Migration dry-run uses a Neon branch, never prod.** For A Task 1 Step 6 and C Task 34 Step 4: `neonctl branches create --name price-buckets-dryrun --parent <staging-branch>`, then set `DATABASE_URI="$(neonctl connection-string price-buckets-dryrun)"` for the `pnpm payload migrate` dry-run. Staging is `ep-purple-night`; **never** target prod (`ep-super-poetry` / `.env`). Delete the branch after.

**R9 — (copy consistency) A Task 7.** Update the WineReviewForm session success-card heading (`:684`, "Din smaknotering är inskickad!") to the locked-in wording ("Din smaknotering är inlåst") to match the lock-in model and the toast/BlindGuessCard copy.

**R10 — (guardrail) Recap inclusion is by row presence, never `submittedAt`.** `submittedAt` drives the swarm/host-tracker/"Klar" UX only. Do **not** add a `submittedAt` filter to `src/lib/session-recap.ts` — a forgotten lock-in must still count at reveal.

---

## Workstream A — Reliable persistence (the data-loss fix)

Continuous autosave + a non-gating "Lås in" action so nothing typed in a live tasting is ever lost. Adds a `submittedAt` column to both submission collections, a shared `useSessionDraft` hook (debounce + localStorage mirror + retry/backoff + offline queue + `sendBeacon`), cookie-based identity rehydration (including custom-wine reviews), re-join recovery by token, a connection-state banner, an "answers restored" banner, and PostHog save instrumentation.

**Files**
- Modify `src/collections/SessionGuesses.ts` (add `submittedAt` after the fields array, ~:68)
- Modify `src/collections/Reviews.ts` (add `submittedAt` to the fields array, ~:773)
- Create `src/migrations/<generated>_add_submitted_at.ts` (+ register in `src/migrations/index.ts`)
- Create `src/lib/session-draft-queue.ts` (pure reducer)
- Create `scripts/verify-session-draft-queue.ts` (TDD verification)
- Create `src/lib/use-session-draft.ts` (the hook)
- Modify `src/app/api/session-guesses/route.ts` (accept + persist `submittedAt`)
- Modify `src/app/api/reviews/route.ts` (accept + persist `submittedAt`)
- Modify `src/components/tasting-plan/BlindGuessCard.tsx` (autosave + status UI + Lås in; :66-115, :180-294)
- Modify `src/components/course/WineReviewForm.tsx` (autosave + identity rehydration + custom-wine rehydration + Klar/Lås in; :142-147, :202-276, :450-604, :1155-1157)
- Create `src/app/api/sessions/[sessionId]/my-submissions/route.ts` rewrite (return reviews + guesses + identity)
- Modify `src/components/tasting-plan/PlanSessionContent.tsx` (rehydrate via my-submissions; :222-263)
- Modify `src/app/api/sessions/join/route.ts` (token-based re-join recovery; :145-188)
- Modify `src/context/SessionContext.tsx` (add `connectionState`)
- Modify `src/components/course/RealtimeSync.tsx` (onopen/onerror → connectionState; :14-115)
- Create `src/components/realtime/ConnectionBanner.tsx` (offline/reconnect banner)

> Shared-file notes: Workstream C owns the BlindGuessCard reveal-block price rendering (~:149-158) and the price `<Select>` options (~:262-266); A leaves those untouched. Workstream B owns WineReviewForm default mode (:98), Enkel labels (:797-873), and validation relaxation (:454-496); A's edits to `handleSubmit` here are limited to making "Skicka in" set `submittedAt` and wiring autosave — A and B must reconcile the single `handleSubmit` rewrite (A lands first per the phasing). D consumes A's `submittedAt` and the new `submissions` stream event (not built here).

---

### Task 1: Add `submittedAt` to SessionGuesses and Reviews + types + migration

- [ ] **Step 1: Add `submittedAt` to `SessionGuesses`.** Open `src/collections/SessionGuesses.ts`. The current `fields` array ends at the price-bucket select (`:56-68`):

```ts
    { name: 'guessedCountry', type: 'text' },
    { name: 'guessedGrape', type: 'text' },
    {
      name: 'guessedPriceBucket',
      type: 'select',
      options: [
        { label: 'Under 100 kr', value: 'under_100' },
        { label: '100–200 kr', value: '100_200' },
        { label: '200–300 kr', value: '200_300' },
        { label: '300–500 kr', value: '300_500' },
        { label: '500+ kr', value: '500_plus' },
      ],
    },
  ],
  timestamps: true,
}
```

Replace with (add `submittedAt` after the price bucket; leave the price-bucket options exactly as-is so Workstream C's migration owns the enum change):

```ts
    { name: 'guessedCountry', type: 'text' },
    { name: 'guessedGrape', type: 'text' },
    {
      name: 'guessedPriceBucket',
      type: 'select',
      options: [
        { label: 'Under 100 kr', value: 'under_100' },
        { label: '100–200 kr', value: '100_200' },
        { label: '200–300 kr', value: '200_300' },
        { label: '300–500 kr', value: '300_500' },
        { label: '500+ kr', value: '500_plus' },
      ],
    },
    {
      // NULL = draft / autosaved; set = "locked in" (Lås in). MUST NOT gate
      // recap inclusion — drives the swarm/host tracker and the social
      // "I'm done" moment only.
      name: 'submittedAt',
      type: 'date',
      index: true,
      admin: { readOnly: true },
    },
  ],
  timestamps: true,
}
```

- [ ] **Step 2: Add `submittedAt` to `Reviews`.** Open `src/collections/Reviews.ts`. The `fields` array ends with the `wsetTasting` group, then closes (`:772-776`):

```ts
        },
      ],
    },
  ],
  timestamps: true,
}
```

Replace with (add `submittedAt` as the last field, after the `wsetTasting` group's closing `]`/`}`):

```ts
        },
      ],
    },
    {
      // NULL = draft / autosaved; set = "locked in" (Klar/Lås in). MUST NOT
      // gate recap inclusion — drives the swarm/host tracker only.
      name: 'submittedAt',
      type: 'date',
      index: true,
      admin: { readOnly: true, position: 'sidebar' },
    },
  ],
  timestamps: true,
}
```

- [ ] **Step 3: Regenerate types.** Run:

```bash
pnpm generate:types
```

Expected: `src/payload-types.ts` rewritten; `git diff src/payload-types.ts` shows `submittedAt?: string | null` added to both the `SessionGuess` and `Review` interfaces. No errors.

- [ ] **Step 4: Create the additive migration.** Run:

```bash
pnpm migrate:create -- "add_submitted_at"
```

This writes a timestamped file under `src/migrations/` and appends its import + entry to `src/migrations/index.ts`. Open the generated `.ts` and replace its `up`/`down` bodies with explicit SQL so the migration is deterministic regardless of what the autogenerator emitted (both columns are `timestamp(3) with time zone` to match every other date column in this DB, e.g. `reviews.created_at`):

```ts
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Additive: add nullable `submitted_at` to session_guesses and reviews.
 * NULL = draft / autosaved; set = "locked in". Does NOT gate recap inclusion.
 * (The price-enum change lives in a separate Workstream C migration.)
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "session_guesses" ADD COLUMN IF NOT EXISTS "submitted_at" timestamp(3) with time zone;
    ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "submitted_at" timestamp(3) with time zone;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "session_guesses" DROP COLUMN IF EXISTS "submitted_at";
    ALTER TABLE "reviews" DROP COLUMN IF EXISTS "submitted_at";
  `)
}
```

- [ ] **Step 5: Verify the migration registered.** Run:

```bash
grep -n "add_submitted_at" src/migrations/index.ts
```

Expected: two matches (the `import * as ...` line and the `{ up, down, name }` entry). If `migrate:create` did not append them, add them manually mirroring the surrounding entries.

- [ ] **Step 6: Dry-run against a DB copy.** Point `DATABASE_URI` at a throwaway clone of staging (`ep-purple-night`) — never prod — and run:

```bash
DATABASE_URI="<staging-copy-uri>" pnpm payload migrate
```

Expected: log shows `add_submitted_at` applied with no error; `\d session_guesses` and `\d reviews` in `psql` both show a nullable `submitted_at` column. Then verify rollback: `DATABASE_URI="<staging-copy-uri>" pnpm payload migrate:down` drops both columns cleanly.

- [ ] **Step 7: Commit.**

```bash
git add src/collections/SessionGuesses.ts src/collections/Reviews.ts src/payload-types.ts src/migrations/
git commit -m "otter: persistence — add submittedAt to SessionGuesses + Reviews (additive migration)"
```

---

### Task 2: Pure queue reducer + verification script (TDD)

- [ ] **Step 1: Write the verification script FIRST (it must fail).** Create `scripts/verify-session-draft-queue.ts`:

```ts
/**
 * Runnable assertion suite for the session-draft offline queue reducer.
 * No test runner in this repo — run with: npx tsx scripts/verify-session-draft-queue.ts
 * Exits non-zero on the first failed assertion.
 */
import assert from 'node:assert/strict'
import {
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
  const { backoffMs } = require('../src/lib/session-draft-queue')
  assert.equal(backoffMs(0), 0)
  assert.equal(backoffMs(1), 1000)
  assert.equal(backoffMs(2), 2000)
  assert.equal(backoffMs(3), 4000)
  assert.equal(backoffMs(99), 15000) // capped at 15s
})

console.log('OK')
```

Run it now — it must fail because the module doesn't exist yet:

```bash
npx tsx scripts/verify-session-draft-queue.ts
```

Expected: error `Cannot find module '../src/lib/session-draft-queue'`.

- [ ] **Step 2: Implement the reducer.** Create `src/lib/session-draft-queue.ts`:

```ts
/**
 * Pure, framework-free offline-queue reducer for useSessionDraft.
 *
 * One pending "slot" (last-write-wins) plus one in-flight payload. The hook
 * drives I/O; this module only models the state machine so it can be verified
 * by scripts/verify-session-draft-queue.ts.
 */
export type DraftPayload = Record<string, unknown>

export interface QueueState {
  /** Latest unsent payload; null when nothing is queued. */
  pending: DraftPayload | null
  /** True while a request is in flight. */
  inFlight: boolean
  /** Payload currently being sent; null when idle. */
  flightPayload: DraftPayload | null
  /** Consecutive failures of the current/last flight. Resets on success. */
  attempt: number
}

export type QueueAction =
  | { type: 'enqueue'; payload: DraftPayload }
  | { type: 'start' }
  | { type: 'success' }
  | { type: 'failure' }

export const initialQueueState: QueueState = {
  pending: null,
  inFlight: false,
  flightPayload: null,
  attempt: 0,
}

export function queueReducer(state: QueueState, action: QueueAction): QueueState {
  switch (action.type) {
    case 'enqueue':
      // Last-write-wins: collapse to a single pending payload.
      return { ...state, pending: action.payload }
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
      return { ...state, inFlight: false, flightPayload: null, attempt: 0 }
    case 'failure':
      // Re-queue the flight payload for retry, but never clobber a newer
      // pending payload that arrived while the request was in flight.
      return {
        ...state,
        inFlight: false,
        pending: state.pending ?? state.flightPayload,
        flightPayload: null,
        attempt: state.attempt + 1,
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
```

- [ ] **Step 3: Re-run the verification (must pass).**

```bash
npx tsx scripts/verify-session-draft-queue.ts
```

Expected: prints `ok - ...` for each case then `OK`, exit code 0.

- [ ] **Step 4: Commit.**

```bash
git add src/lib/session-draft-queue.ts scripts/verify-session-draft-queue.ts
git commit -m "otter: persistence — pure offline-queue reducer + verify script"
```

---

### Task 3: The `useSessionDraft` hook

- [ ] **Step 1: Create the hook.** Create `src/lib/use-session-draft.ts`:

```ts
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
    const parsed = JSON.parse(raw)
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
```

- [ ] **Step 2: Lint the new module.** Run:

```bash
pnpm lint
```

Expected: no new errors in `src/lib/use-session-draft.ts`. (Pre-existing warnings elsewhere are out of scope.)

- [ ] **Step 3: Commit.**

```bash
git add src/lib/use-session-draft.ts
git commit -m "otter: persistence — useSessionDraft hook (debounce, mirror, retry, offline queue, beacon)"
```

---

### Task 4: Persist `submittedAt` on the server routes

- [ ] **Step 1: Accept `submittedAt` in the session-guesses route.** Open `src/app/api/session-guesses/route.ts`. The body-parse block at `:99-101` reads three fields:

```ts
    const guessedCountryRaw = (body as { guessedCountry?: unknown }).guessedCountry
    const guessedGrapeRaw = (body as { guessedGrape?: unknown }).guessedGrape
    const guessedPriceBucketRaw = (body as { guessedPriceBucket?: unknown }).guessedPriceBucket
```

Replace with (also read `submittedAt`):

```ts
    const guessedCountryRaw = (body as { guessedCountry?: unknown }).guessedCountry
    const guessedGrapeRaw = (body as { guessedGrape?: unknown }).guessedGrape
    const guessedPriceBucketRaw = (body as { guessedPriceBucket?: unknown }).guessedPriceBucket
    const submittedAtRaw = (body as { submittedAt?: unknown }).submittedAt
    const submittedAt =
      typeof submittedAtRaw === 'string' && submittedAtRaw.length > 0 ? submittedAtRaw : undefined
```

- [ ] **Step 2: Persist it in the upsert `data`.** The `data` object at `:170-178`:

```ts
    const data = {
      session: sessionId,
      sessionParticipant: identity.participantId,
      user: identity.userId,
      pourOrder,
      guessedCountry,
      guessedGrape,
      guessedPriceBucket,
    }
```

Replace with (spread `submittedAt` only when present, so an autosave never clears a previously-set lock-in):

```ts
    const data = {
      session: sessionId,
      sessionParticipant: identity.participantId,
      user: identity.userId,
      pourOrder,
      guessedCountry,
      guessedGrape,
      guessedPriceBucket,
      ...(submittedAt ? { submittedAt } : {}),
    }
```

- [ ] **Step 3: Return `submittedAt` from the GET (so the client knows the lock-in state).** The GET mapper at `:239-252` returns three fields per guess. Replace:

```ts
      guesses: res.docs.map((d) => {
        const doc = d as {
          pourOrder: number
          guessedCountry?: string | null
          guessedGrape?: string | null
          guessedPriceBucket?: PriceBucket | null
        }
        return {
          pourOrder: doc.pourOrder,
          guessedCountry: doc.guessedCountry ?? null,
          guessedGrape: doc.guessedGrape ?? null,
          guessedPriceBucket: doc.guessedPriceBucket ?? null,
        }
      }),
```

with:

```ts
      guesses: res.docs.map((d) => {
        const doc = d as {
          pourOrder: number
          guessedCountry?: string | null
          guessedGrape?: string | null
          guessedPriceBucket?: PriceBucket | null
          submittedAt?: string | null
        }
        return {
          pourOrder: doc.pourOrder,
          guessedCountry: doc.guessedCountry ?? null,
          guessedGrape: doc.guessedGrape ?? null,
          guessedPriceBucket: doc.guessedPriceBucket ?? null,
          submittedAt: doc.submittedAt ?? null,
        }
      }),
```

- [ ] **Step 4: Pass `submittedAt` through the reviews route's `reviewData`.** Open `src/app/api/reviews/route.ts`. `reviewData` is built by spreading the raw `body` (`:398`: `const reviewData: any = { ...body, ... }`). Because the client sends `submittedAt` as an ISO string in the body, the spread already includes it — but the client also sends drafts WITHOUT `submittedAt`, and a draft must never clear a prior lock-in. After the `reviewData` object literal closes (right after the `sessionParticipant:` ternary at `:417`, before the closing `}` at `:418`), the value is `...body`, which means absent → `undefined` → Payload leaves it unchanged on update. That is the desired behavior; confirm no extra handling is needed by reading the existing block:

```ts
    const reviewData: any = {
      ...body,
      wine: wineId ?? null,
      user: guestParticipant ? null : user!.id,
      session: guestParticipant
        ? guestParticipant.sessionId
        : body.session
          ? Number(body.session)
          : body.session === null
            ? null
            : undefined,
      sessionParticipant: guestParticipant
        ? guestParticipant.id
        : body.sessionParticipant
          ? Number(body.sessionParticipant)
          : body.sessionParticipant === null
            ? null
            : undefined,
    }
```

Replace with (normalize `submittedAt` explicitly so a string lands and an absent field stays `undefined` = "don't touch"):

```ts
    const submittedAt =
      typeof body.submittedAt === 'string' && body.submittedAt.length > 0
        ? body.submittedAt
        : undefined
    const reviewData: any = {
      ...body,
      wine: wineId ?? null,
      user: guestParticipant ? null : user!.id,
      submittedAt,
      session: guestParticipant
        ? guestParticipant.sessionId
        : body.session
          ? Number(body.session)
          : body.session === null
            ? null
            : undefined,
      sessionParticipant: guestParticipant
        ? guestParticipant.id
        : body.sessionParticipant
          ? Number(body.sessionParticipant)
          : body.sessionParticipant === null
            ? null
            : undefined,
    }
```

- [ ] **Step 5: Lint + commit.**

```bash
pnpm lint
git add src/app/api/session-guesses/route.ts src/app/api/reviews/route.ts
git commit -m "otter: persistence — accept and persist submittedAt on guess/review upserts"
```

---

### Task 5: Identity rehydration endpoint (`my-submissions` returns reviews + guesses)

- [ ] **Step 1: Rewrite the endpoint to return full submissions.** Replace the body of `src/app/api/sessions/[sessionId]/my-submissions/route.ts` (everything after the `cookies`/`PARTICIPANT_COOKIE` imports stays) with a version that returns the participant id, the full review rows (incl. custom-wine), and the full guess rows. The existing identity-resolution block (`:28-69`) is kept; only the projection at the end changes. Replace the section from the `// Find this participant's reviews` comment (`:71`) through the final `return` (`:116`):

```ts
  // Find this participant's reviews in this session
  const reviewRes = await payload.find({
    collection: 'reviews',
    where: { sessionParticipant: { equals: participantId } },
    limit: 100,
    depth: 0,
    overrideAccess: true,
  })

  // Map reviews to pour orders via session's plan wines
  const session = await payload.findByID({
    collection: 'course-sessions',
    id: sid,
    depth: 2,
    overrideAccess: true,
  })

  const wineIdToPour: Record<number, number> = {}
  const titleToPour: Record<string, number> = {}
  if (session?.tastingPlan && typeof session.tastingPlan === 'object') {
    const wines = ((session.tastingPlan as any).wines ?? []) as any[]
    wines.forEach((w, idx) => {
      const pourOrder = w.pourOrder ?? idx + 1
      if (w.libraryWine) {
        const id = typeof w.libraryWine === 'object' ? w.libraryWine.id : w.libraryWine
        if (typeof id === 'number') wineIdToPour[id] = pourOrder
      } else if (w.customWine?.name) {
        titleToPour[String(w.customWine.name).toLowerCase()] = pourOrder
      }
    })
  }

  const submittedPourOrders = new Set<number>()
  for (const r of reviewRes.docs as any[]) {
    if (r.wine) {
      const id = typeof r.wine === 'object' ? r.wine.id : r.wine
      if (typeof id === 'number' && wineIdToPour[id] != null) {
        submittedPourOrders.add(wineIdToPour[id])
      }
    } else if (r.customWine?.name) {
      const pour = titleToPour[String(r.customWine.name).toLowerCase()]
      if (pour != null) submittedPourOrders.add(pour)
    }
  }

  return NextResponse.json({ submittedPourOrders: Array.from(submittedPourOrders).sort() })
}
```

with:

```ts
  // Find this participant's reviews in this session. depth: 0 keeps wine as an
  // id; we resolve pour order ourselves below.
  const reviewRes = await payload.find({
    collection: 'reviews',
    where: { sessionParticipant: { equals: participantId } },
    limit: 100,
    depth: 0,
    overrideAccess: true,
  })

  // This participant's guesses (blind tasting). Identity already resolved.
  const guessRes = await payload.find({
    collection: 'session-guesses',
    where: { sessionParticipant: { equals: participantId } },
    limit: 100,
    depth: 0,
    overrideAccess: true,
  })

  // Map reviews to pour orders via the session's plan wines.
  const session = await payload.findByID({
    collection: 'course-sessions',
    id: sid,
    depth: 2,
    overrideAccess: true,
  })

  const wineIdToPour: Record<number, number> = {}
  const titleToPour: Record<string, number> = {}
  if (session?.tastingPlan && typeof session.tastingPlan === 'object') {
    const wines = ((session.tastingPlan as any).wines ?? []) as any[]
    wines.forEach((w, idx) => {
      const pourOrder = w.pourOrder ?? idx + 1
      if (w.libraryWine) {
        const id = typeof w.libraryWine === 'object' ? w.libraryWine.id : w.libraryWine
        if (typeof id === 'number') wineIdToPour[id] = pourOrder
      } else if (w.customWine?.name) {
        titleToPour[String(w.customWine.name).toLowerCase()] = pourOrder
      }
    })
  }

  const resolveReviewPour = (r: any): number | null => {
    if (r.wine) {
      const id = typeof r.wine === 'object' ? r.wine.id : r.wine
      if (typeof id === 'number' && wineIdToPour[id] != null) return wineIdToPour[id]
    } else if (r.customWine?.name) {
      const pour = titleToPour[String(r.customWine.name).toLowerCase()]
      if (pour != null) return pour
    }
    return null
  }

  const submittedPourOrders = new Set<number>()
  const reviews = (reviewRes.docs as any[]).map((r) => {
    const pourOrder = resolveReviewPour(r)
    if (pourOrder != null) submittedPourOrders.add(pourOrder)
    return {
      id: r.id,
      pourOrder,
      wine: r.wine ? (typeof r.wine === 'object' ? r.wine.id : r.wine) : null,
      customWine: r.customWine ?? null,
      rating: r.rating ?? null,
      buyAgain: r.buyAgain ?? false,
      reviewText: r.reviewText ?? null,
      wsetTasting: r.wsetTasting ?? null,
      publishedToProfile: r.publishedToProfile ?? false,
      submittedAt: r.submittedAt ?? null,
    }
  })

  const guesses = (guessRes.docs as any[]).map((g) => ({
    pourOrder: g.pourOrder,
    guessedCountry: g.guessedCountry ?? null,
    guessedGrape: g.guessedGrape ?? null,
    guessedPriceBucket: g.guessedPriceBucket ?? null,
    submittedAt: g.submittedAt ?? null,
  }))

  return NextResponse.json({
    participantId,
    submittedPourOrders: Array.from(submittedPourOrders).sort(),
    reviews,
    guesses,
  })
}
```

- [ ] **Step 2: Update the no-identity early return (`:67-69`).** Currently:

```ts
  if (participantId === null) {
    return NextResponse.json({ submittedPourOrders: [] })
  }
```

Replace with (keep the new shape so callers can destructure consistently):

```ts
  if (participantId === null) {
    return NextResponse.json({
      participantId: null,
      submittedPourOrders: [],
      reviews: [],
      guesses: [],
    })
  }
```

- [ ] **Step 3: Lint + commit.**

```bash
pnpm lint
git add src/app/api/sessions/[sessionId]/my-submissions/route.ts
git commit -m "otter: persistence — my-submissions returns reviews (incl custom-wine) + guesses + identity"
```

---

### Task 6: Wire autosave + Lås in into `BlindGuessCard`

- [ ] **Step 1: Import the hook and add status icons.** In `src/components/tasting-plan/BlindGuessCard.tsx`, the import block (`:4-21`) currently ends:

```ts
import { Check, X, Pencil } from 'lucide-react'
import {
  COUNTRIES,
  PRICE_BUCKETS,
  priceBucketLabel,
  type PriceBucket,
} from '@/lib/blind-guess-vocab'
import { useGrapes } from '@/lib/use-grapes'
import { scoreOne, type BlindAnswer } from '@/lib/blind-guess-scoring'
```

Replace with (add `Loader2`/`CloudOff`, `useSessionDraft`, drop the now-unused `toast`):

```ts
import { Check, X, Pencil, Loader2, CloudOff } from 'lucide-react'
import {
  COUNTRIES,
  PRICE_BUCKETS,
  priceBucketLabel,
  type PriceBucket,
} from '@/lib/blind-guess-vocab'
import { useGrapes } from '@/lib/use-grapes'
import { scoreOne, type BlindAnswer } from '@/lib/blind-guess-scoring'
import { useSessionDraft } from '@/lib/use-session-draft'
```

Then remove the now-unused `import { toast } from 'sonner'` at `:4`:

```ts
import { toast } from 'sonner'
```

Delete that line entirely.

- [ ] **Step 2: Extend the props with `initialSubmittedAt` and an `onRestored` callback.** The `BlindGuessCardProps` interface ends (`:39-43`):

```ts
  easyModeOptions?: {
    countries: string[] | null
    grapes: string[] | null
  } | null
}
```

Replace with:

```ts
  easyModeOptions?: {
    countries: string[] | null
    grapes: string[] | null
  } | null
  /** ISO timestamp when the guess was locked in; null = draft / autosaved. */
  initialSubmittedAt?: string | null
  /** Fired once on mount when a localStorage draft was restored. */
  onRestored?: () => void
}
```

- [ ] **Step 3: Replace state + `handleSubmit` with autosave-driven state.** The block from the component signature destructuring through the end of `handleSubmit` (`:51-115`) currently is:

```ts
export function BlindGuessCard({
  sessionId,
  pourOrder,
  isRevealed,
  answer,
  initialGuess,
  easyModeOptions = null,
}: BlindGuessCardProps) {
  const { grapes: dynamicGrapes } = useGrapes()
  const countryOptions = easyModeOptions?.countries ?? (COUNTRIES as ReadonlyArray<string>)
  const grapeOptions = easyModeOptions?.grapes ?? dynamicGrapes
  const isEasyMode = easyModeOptions != null
  // First acceptable grape for the "rätt:" hint in the post-reveal scored row.
  const firstAnswerGrape =
    Array.isArray(answer.grapes) && answer.grapes.length > 0 ? answer.grapes[0] : null
  const [submitted, setSubmitted] = React.useState<FormState | null>(
    initialGuess
      ? {
          country: initialGuess.country,
          grape: initialGuess.grape,
          priceBucket: initialGuess.priceBucket,
        }
      : null,
  )
  const [editing, setEditing] = React.useState<FormState>({
    country: initialGuess?.country ?? null,
    grape: initialGuess?.grape ?? null,
    priceBucket: initialGuess?.priceBucket ?? null,
  })
  const [isEditMode, setIsEditMode] = React.useState<boolean>(!initialGuess)
  const [busy, setBusy] = React.useState(false)

  async function handleSubmit() {
    if (!editing.country && !editing.grape && !editing.priceBucket) {
      toast.error('Välj minst ett svar.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/session-guesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sessionId,
          pourOrder,
          guessedCountry: editing.country,
          guessedGrape: editing.grape,
          guessedPriceBucket: editing.priceBucket,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err?.error || 'Kunde inte spara gissningen.')
        return
      }
      setSubmitted({ ...editing })
      setIsEditMode(false)
      toast.success('Gissning sparad.')
    } catch {
      toast.error('Nätverksfel — försök igen.')
    } finally {
      setBusy(false)
    }
  }
```

Replace with:

```ts
export function BlindGuessCard({
  sessionId,
  pourOrder,
  isRevealed,
  answer,
  initialGuess,
  easyModeOptions = null,
  initialSubmittedAt = null,
  onRestored,
}: BlindGuessCardProps) {
  const { grapes: dynamicGrapes } = useGrapes()
  const countryOptions = easyModeOptions?.countries ?? (COUNTRIES as ReadonlyArray<string>)
  const grapeOptions = easyModeOptions?.grapes ?? dynamicGrapes
  const isEasyMode = easyModeOptions != null
  // First acceptable grape for the "rätt:" hint in the post-reveal scored row.
  const firstAnswerGrape =
    Array.isArray(answer.grapes) && answer.grapes.length > 0 ? answer.grapes[0] : null

  const [editing, setEditing] = React.useState<FormState>({
    country: initialGuess?.country ?? null,
    grape: initialGuess?.grape ?? null,
    priceBucket: initialGuess?.priceBucket ?? null,
  })
  // "Locked in" once submittedAt is set (server-hydrated or via Lås in).
  const [lockedIn, setLockedIn] = React.useState<boolean>(Boolean(initialSubmittedAt))
  const [isEditMode, setIsEditMode] = React.useState<boolean>(!initialSubmittedAt)

  const { status, queueSave, lockIn, restoredFromDraft } = useSessionDraft({
    kind: 'guess',
    sessionId,
    pourOrder,
    endpoint: '/api/session-guesses',
    buildBody: (draft) => ({
      sessionId,
      pourOrder,
      guessedCountry: (draft.country as string | null) ?? null,
      guessedGrape: (draft.grape as string | null) ?? null,
      guessedPriceBucket: (draft.priceBucket as PriceBucket | null) ?? null,
      ...(draft.submittedAt ? { submittedAt: draft.submittedAt } : {}),
    }),
  })

  // Tell the parent (once) that we restored a local draft, for the banner.
  const restoredFiredRef = React.useRef(false)
  React.useEffect(() => {
    if (restoredFromDraft && !restoredFiredRef.current) {
      restoredFiredRef.current = true
      onRestored?.()
    }
  }, [restoredFromDraft, onRestored])

  // Any field change autosaves immediately (debounced inside the hook).
  function updateField(partial: Partial<FormState>) {
    setEditing((s) => {
      const next = { ...s, ...partial }
      queueSave({
        country: next.country,
        grape: next.grape,
        priceBucket: next.priceBucket,
      })
      return next
    })
  }

  async function handleLockIn() {
    await lockIn()
    setLockedIn(true)
    setIsEditMode(false)
  }
```

- [ ] **Step 4: Update the reveal-mode scored block to read `editing`.** The `submitted` state no longer exists; the reveal block (`:117-126`) reads `submitted`. Replace:

```ts
  // Reveal mode: show scored results
  if (isRevealed && submitted) {
    const scored = scoreOne(
      {
        guessedCountry: submitted.country,
        guessedGrape: submitted.grape,
        guessedPriceBucket: submitted.priceBucket,
      },
      answer,
    )
```

with (use `editing`, and treat "has any content" as having a guess):

```ts
  const hasGuess = Boolean(editing.country || editing.grape || editing.priceBucket)

  // Reveal mode: show scored results
  if (isRevealed && hasGuess) {
    const scored = scoreOne(
      {
        guessedCountry: editing.country,
        guessedGrape: editing.grape,
        guessedPriceBucket: editing.priceBucket,
      },
      answer,
    )
```

Then in that same block, the three `<Row>` `guess={submitted.X}` props (`:135-156`) must read `editing` instead. Note: Workstream C owns the price `<Row>` rendering (~:149-158); coordinate so that after C's edit the price row reads `editing.priceBucket`. Update the country and grape rows here:

```ts
          {scored.countryScored && (
            <Row
              correct={scored.countryCorrect}
              label="Land"
              guess={submitted.country}
              answer={answer.country ?? null}
            />
          )}
          {scored.grapeScored && (
            <Row
              correct={scored.grapeCorrect}
              label="Druva"
              guess={submitted.grape}
              answer={firstAnswerGrape}
            />
          )}
```

becomes:

```ts
          {scored.countryScored && (
            <Row
              correct={scored.countryCorrect}
              label="Land"
              guess={editing.country}
              answer={answer.country ?? null}
            />
          )}
          {scored.grapeScored && (
            <Row
              correct={scored.grapeCorrect}
              label="Druva"
              guess={editing.grape}
              answer={firstAnswerGrape}
            />
          )}
```

- [ ] **Step 5: Update the "no submission at reveal" branch.** Currently (`:170-178`):

```ts
  // Reveal mode but no submission: a soft note
  if (isRevealed && !submitted) {
    return (
      <div className="mt-3 rounded-md border border-dashed bg-card/50 p-3">
        <p className="text-xs text-muted-foreground">
          Du gissade inte på det här vinet.
        </p>
      </div>
    )
  }
```

Replace with (uses `hasGuess`):

```ts
  // Reveal mode but no content at all: a soft note.
  if (isRevealed && !hasGuess) {
    return (
      <div className="mt-3 rounded-md border border-dashed bg-card/50 p-3">
        <p className="text-xs text-muted-foreground">
          Du gissade inte på det här vinet.
        </p>
      </div>
    )
  }
```

- [ ] **Step 6: Repurpose the read-only summary as the locked-in state.** Currently (`:180-206`):

```ts
  // Pre-reveal: read-only summary if submitted (with Ändra)
  if (submitted && !isEditMode) {
    const summary = [
      submitted.country,
      submitted.grape,
      priceBucketLabel(submitted.priceBucket),
    ]
      .filter(Boolean)
      .join(' · ')
    return (
      <div className="mt-3 rounded-md border bg-card p-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Din gissning</p>
          <p className="text-sm truncate">{summary || '—'}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setIsEditMode(true)}
        >
          <Pencil className="h-3.5 w-3.5 mr-1" />
          Ändra
        </Button>
      </div>
    )
  }
```

Replace with (locked-in summary; `editing` is the source of truth):

```ts
  // Pre-reveal locked-in summary (with Ändra to re-open editing).
  if (lockedIn && !isEditMode) {
    const summary = [
      editing.country,
      editing.grape,
      priceBucketLabel(editing.priceBucket),
    ]
      .filter(Boolean)
      .join(' · ')
    return (
      <div className="mt-3 rounded-md border bg-card p-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Check className="h-3 w-3 text-green-600" /> Inlåst gissning
          </p>
          <p className="text-sm truncate">{summary || '—'}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setIsEditMode(true)}
        >
          <Pencil className="h-3.5 w-3.5 mr-1" />
          Ändra
        </Button>
      </div>
    )
  }
```

- [ ] **Step 7: Rewrite the edit-mode footer with status UI + Lås in.** The edit-mode body (`:208-293`) keeps its three `<Select>`s but its `onValueChange` handlers and the footer buttons change. First, swap the three `onValueChange` to call `updateField`. Country select (`:223-224`):

```tsx
        <Select
          value={editing.country ?? ''}
          onValueChange={(v) => setEditing((s) => ({ ...s, country: v || null }))}
        >
```

→

```tsx
        <Select
          value={editing.country ?? ''}
          onValueChange={(v) => updateField({ country: v || null })}
        >
```

Grape select (`:238-239`):

```tsx
        <Select
          value={editing.grape ?? ''}
          onValueChange={(v) => setEditing((s) => ({ ...s, grape: v || null }))}
        >
```

→

```tsx
        <Select
          value={editing.grape ?? ''}
          onValueChange={(v) => updateField({ grape: v || null })}
        >
```

Price select (`:252-256`) — Workstream C owns the price options, but the handler is A's:

```tsx
        <Select
          value={editing.priceBucket ?? ''}
          onValueChange={(v) =>
            setEditing((s) => ({ ...s, priceBucket: (v || null) as PriceBucket | null }))
          }
        >
```

→

```tsx
        <Select
          value={editing.priceBucket ?? ''}
          onValueChange={(v) => updateField({ priceBucket: (v || null) as PriceBucket | null })}
        >
```

- [ ] **Step 8: Replace the footer buttons (`:270-291`).** Currently:

```tsx
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={handleSubmit} disabled={busy}>
          {busy ? 'Sparar…' : submitted ? 'Spara ändring' : 'Skicka gissning'}
        </Button>
        {submitted && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditing({
                country: submitted.country,
                grape: submitted.grape,
                priceBucket: submitted.priceBucket,
              })
              setIsEditMode(false)
            }}
          >
            Avbryt
          </Button>
        )}
      </div>
    </div>
  )
}
```

Replace with (autosave status text + a non-gating "Lås in"):

```tsx
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          size="sm"
          onClick={handleLockIn}
          disabled={!editing.country && !editing.grape && !editing.priceBucket}
        >
          {lockedIn ? 'Uppdatera & lås in' : 'Lås in'}
        </Button>
        <SaveStatusLabel status={status} />
      </div>
    </div>
  )
}

function SaveStatusLabel({ status }: { status: SaveStatus }) {
  if (status === 'saving') {
    return (
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Loader2 className="h-3 w-3 animate-spin" /> Sparar…
      </span>
    )
  }
  if (status === 'saved') {
    return (
      <span className="text-xs text-green-600 flex items-center gap-1">
        <Check className="h-3 w-3" /> Sparat
      </span>
    )
  }
  if (status === 'retrying') {
    return (
      <span className="text-xs text-amber-600 flex items-center gap-1">
        <CloudOff className="h-3 w-3" /> Återförsöker…
      </span>
    )
  }
  if (status === 'error') {
    return <span className="text-xs text-red-600">Kunde inte spara</span>
  }
  return null
}
```

Add the `SaveStatus` type import at the top alongside the hook import (Step 1):

```ts
import { useSessionDraft, type SaveStatus } from '@/lib/use-session-draft'
```

- [ ] **Step 9: Lint.**

```bash
pnpm lint
```

Expected: no `submitted`/`busy`/`handleSubmit`/`toast` "unused" errors remain in this file.

- [ ] **Step 10: Commit.**

```bash
git add src/components/tasting-plan/BlindGuessCard.tsx
git commit -m "otter: persistence — BlindGuessCard autosaves; 'Lås in' sets submittedAt; save-status UI"
```

---

### Task 7: Wire autosave + cookie rehydration + custom-wine rehydration into `WineReviewForm`

- [ ] **Step 1: Import the hook.** In `src/components/course/WineReviewForm.tsx`, after the `wset-flavour-vocab` import block (`:24-30`), add:

```ts
import {
  PRIMARY_VOCAB,
  SECONDARY_VOCAB,
  TERTIARY_VOCAB,
  buildFlavourOptions,
  type WineType,
} from '@/lib/wset-flavour-vocab'
import { useSessionDraft } from '@/lib/use-session-draft'
```

- [ ] **Step 2: Add an `onRestored` prop + a `pourOrder` prop.** The `WineReviewFormProps` interface ends with `standalone?: boolean` (`:66-67`):

```ts
  /**
   * Standalone mode (no session, no lesson). Skips the answer-key fetch,
   * the participant-cookie logic, and the post-submit comparison view.
   * Caller is responsible for redirecting via `onSubmit`.
   */
  standalone?: boolean
}
```

Replace with:

```ts
  /**
   * Standalone mode (no session, no lesson). Skips the answer-key fetch,
   * the participant-cookie logic, and the post-submit comparison view.
   * Caller is responsible for redirecting via `onSubmit`.
   */
  standalone?: boolean
  /** Pour order for this wine in the session — scopes the autosave draft. */
  pourOrder?: number
  /** Fired once when mount-time rehydration restored saved content. */
  onRestored?: () => void
}
```

And add them to the destructured signature (`:83-93`):

```ts
export function WineReviewForm({
  lessonId,
  courseId,
  sessionId,
  onSubmit,
  wineIdProp,
  customWineSnapshot,
  insideDialog = false,
  initialReview,
  standalone = false,
}: WineReviewFormProps) {
```

→

```ts
export function WineReviewForm({
  lessonId,
  courseId,
  sessionId,
  onSubmit,
  wineIdProp,
  customWineSnapshot,
  insideDialog = false,
  initialReview,
  standalone = false,
  pourOrder,
  onRestored,
}: WineReviewFormProps) {
```

- [ ] **Step 3: Replace the localStorage `participantId` with cookie-based rehydration.** The `participantId` memo (`:141-147`):

```ts
  // Get participant ID from localStorage if in a session
  const participantId = React.useMemo(() => {
    if (typeof window !== 'undefined' && sessionId) {
      return localStorage.getItem('participantId')
    }
    return null
  }, [sessionId])
```

Replace with (no longer read localStorage; identity is resolved server-side via the cookie in `/my-submissions`. Keep a state slot for the resolved id so the submit path can still pass it):

```ts
  // Identity is resolved server-side from the httpOnly participant cookie via
  // /api/sessions/[id]/my-submissions — never from localStorage. This holds
  // the resolved participant id (for the submit path) once rehydration runs.
  const [participantId, setParticipantId] = React.useState<string | null>(null)
```

- [ ] **Step 4: Replace `fetchLatestSubmission` with a cookie-based session rehydrator.** The `fetchLatestSubmission` callback (`:202-264`) reads `/api/reviews` filtered by `participantId`. In session mode we instead read `/api/sessions/[id]/my-submissions` (which already resolves the cookie identity and returns custom-wine reviews). Replace the entire `fetchLatestSubmission` definition (`:202-264`):

```ts
  const fetchLatestSubmission = React.useCallback(async () => {
    if (standalone) return
    if (!wineId) return // Can't fetch without wine ID

    // Only fetch if we have a user (authenticated) or participant ID (guest)
    if (!user?.id && !participantId) return

    try {
      const params = new URLSearchParams()
      // Query by wine ID
      params.set('wine', String(wineId))

      // Explicitly filter by current user ID if authenticated
      if (user?.id) {
        params.set('user', String(user.id))
      }

      // If we have a session participant ID, also filter by that
      // Note: The API route will need to handle sessionParticipant filtering
      if (participantId && !user?.id) {
        params.set('sessionParticipant', participantId)
      }

      params.set('sort', '-createdAt')
      params.set('limit', '5')
      params.set('depth', '1') // Include wine relationship

      const res = await fetch(`/api/reviews?${params.toString()}`, { credentials: 'include' })
      if (!res.ok) return
      const json = await res.json()
      const docs = json?.docs || []

      // Additional client-side filtering for safety:
      // Filter to only current user's reviews or current participant's reviews
      const filteredDocs = docs.filter((doc: ReviewDoc) => {
        // Check if review belongs to current user
        if (user?.id) {
          const reviewUserId = typeof doc.user === 'object' ? doc.user.id : doc.user
          if (reviewUserId === user.id) return true
        }

        // Check if review belongs to current session participant
        if (participantId) {
          const reviewParticipantId =
            typeof doc.sessionParticipant === 'object'
              ? doc.sessionParticipant.id
              : doc.sessionParticipant
          if (String(reviewParticipantId) === participantId) return true
        }

        return false
      })

      setHistory(filteredDocs)
      const latest = filteredDocs[0]
      if (latest) {
        setSubmittedReview(latest)
      } else {
        // Clear submitted review if no matching review found
        setSubmittedReview(null)
      }
    } catch {}
  }, [wineId, user?.id, participantId, standalone])
```

with a session-aware rehydrator that matches by pour order (incl. custom wines) and a standalone/non-session fallback that keeps the old library-wine query:

```ts
  const fetchLatestSubmission = React.useCallback(async () => {
    if (standalone) return

    // Session mode: resolve identity + saved entries via the cookie endpoint.
    // This rehydrates BOTH library-wine and custom-wine reviews (the old skip
    // is gone) and never reads localStorage participantId.
    if (sessionId) {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/my-submissions`, {
          credentials: 'include',
        })
        if (!res.ok) return
        const data = (await res.json()) as {
          participantId: number | null
          reviews: Array<ReviewDoc & { pourOrder: number | null }>
        }
        if (data.participantId != null) setParticipantId(String(data.participantId))
        const reviews = Array.isArray(data.reviews) ? data.reviews : []
        // Pick this wine's review by pour order when known; else by wine id /
        // custom-wine name snapshot.
        const mine = reviews.find((r) => {
          if (typeof pourOrder === 'number' && r.pourOrder != null) {
            return r.pourOrder === pourOrder
          }
          if (wineId && r.wine != null) {
            const rid = typeof r.wine === 'object' ? (r.wine as any).id : r.wine
            return String(rid) === String(wineId)
          }
          if (customWineSnapshot?.name && (r as any).customWine?.name) {
            return (
              String((r as any).customWine.name).toLowerCase() ===
              customWineSnapshot.name.toLowerCase()
            )
          }
          return false
        })
        setHistory(reviews as ReviewDoc[])
        if (mine) {
          populateFormWithReview(mine as ReviewDoc)
          // submittedAt set = locked in → show the "submitted" state; null =
          // draft → keep the editable form populated.
          setSubmittedReview((mine as any).submittedAt ? (mine as ReviewDoc) : null)
        } else {
          setSubmittedReview(null)
        }
      } catch {}
      return
    }

    // Non-session (e.g. lesson-only / /mina-recensioner) library-wine path.
    if (!wineId) return
    if (!user?.id) return
    try {
      const params = new URLSearchParams()
      params.set('wine', String(wineId))
      params.set('user', String(user.id))
      params.set('sort', '-createdAt')
      params.set('limit', '5')
      params.set('depth', '1')
      const res = await fetch(`/api/reviews?${params.toString()}`, { credentials: 'include' })
      if (!res.ok) return
      const json = await res.json()
      const docs: ReviewDoc[] = json?.docs || []
      const filtered = docs.filter((doc) => {
        const reviewUserId = typeof doc.user === 'object' ? doc.user?.id : doc.user
        return reviewUserId === user.id
      })
      setHistory(filtered)
      setSubmittedReview(filtered[0] ?? null)
    } catch {}
  }, [
    standalone,
    sessionId,
    wineId,
    user?.id,
    pourOrder,
    customWineSnapshot,
    populateFormWithReview,
  ])
```

> Note: `populateFormWithReview` is declared at `:279` (a `useCallback`); referencing it inside `fetchLatestSubmission` means `fetchLatestSubmission`'s declaration must move below `populateFormWithReview`, OR `populateFormWithReview` must be hoisted above. In the next step we move the rehydration effect; keep `populateFormWithReview` declared above `fetchLatestSubmission` by relocating the `fetchLatestSubmission` `useCallback` to just after `populateFormWithReview` (`:279-319`). If lint flags use-before-declaration, that is the fix.

- [ ] **Step 5: Remove the custom-wine skip in the rehydration effect.** The effect (`:271-276`):

```ts
  // Fetch latest submission when wineId is available
  React.useEffect(() => {
    // Custom-wine reviews have no stable id to query against — skip the fetch.
    if (wineId && !customWineSnapshot) {
      fetchLatestSubmission()
    }
  }, [wineId, customWineSnapshot, fetchLatestSubmission])
```

Replace with (run for session mode regardless of custom-wine; run for non-session only when a library wine exists):

```ts
  // Rehydrate on mount. In session mode the cookie endpoint resolves identity
  // and returns BOTH library and custom-wine reviews, so run it as soon as we
  // know the session — no library wineId required. Non-session keeps the
  // library-wine query.
  React.useEffect(() => {
    if (sessionId || (wineId && !standalone)) {
      void fetchLatestSubmission()
    }
  }, [sessionId, wineId, standalone, fetchLatestSubmission])
```

- [ ] **Step 6: Add the autosave hook + draft wiring.** Immediately after the `participantId` state declaration (from Step 3), add the hook + a body-builder. Place this right before the WSET field state block (`:149`):

```ts
  // Continuous autosave of the in-progress review. Only active in a session
  // (lessonId=0 plan sessions included). Standalone / lesson-only reviews keep
  // the explicit-submit flow.
  const isSessionDraft = Boolean(sessionId) && !standalone
  const buildReviewBody = React.useCallback(
    (draft: Record<string, unknown>) => {
      const wineIdentity = customWineSnapshot
        ? { customWine: customWineSnapshot }
        : { wine: wineId ? Number(wineId) : undefined }
      const sessionIdNum = sessionId ? Number(sessionId) : undefined
      return {
        ...wineIdentity,
        rating: (draft.rating as number) || 0,
        buyAgain: Boolean(draft.buyAgain),
        reviewText: (draft.notes as string) ?? '',
        publishedToProfile: Boolean(draft.publishedToProfile),
        session: sessionIdNum,
        wsetTasting: (draft.wsetTasting as Record<string, unknown>) ?? {},
        ...(draft.submittedAt ? { submittedAt: draft.submittedAt } : {}),
      }
    },
    [customWineSnapshot, wineId, sessionId],
  )
  const {
    status: saveStatus,
    queueSave,
    lockIn,
    restoredFromDraft,
  } = useSessionDraft({
    kind: 'review',
    sessionId: sessionId ?? 'none',
    pourOrder: pourOrder ?? 0,
    endpoint: '/api/reviews',
    buildBody: buildReviewBody,
  })
  // Surface the "answers restored" banner once.
  const restoredFiredRef = React.useRef(false)
  React.useEffect(() => {
    if (isSessionDraft && restoredFromDraft && !restoredFiredRef.current) {
      restoredFiredRef.current = true
      onRestored?.()
    }
  }, [isSessionDraft, restoredFromDraft, onRestored])
```

- [ ] **Step 7: Mirror every field change into the draft.** Add a helper that builds the current WSET snapshot and queues a save, then call it from a single effect that watches all fields. Add right after the hook wiring from Step 6:

```ts
  // Build the full WSET snapshot from current state (used for autosave + lock-in).
  const buildWsetSnapshot = React.useCallback(
    () => ({
      appearance: {
        clarity: appearanceClarity || undefined,
        intensity: appearanceIntensity || undefined,
        color: appearanceColor || undefined,
      },
      nose: {
        intensity: noseIntensity || undefined,
        primaryAromas,
        secondaryAromas,
        tertiaryAromas,
      },
      palate: {
        sweetness: palateSweetness || undefined,
        acidity: palateAcidity || undefined,
        tannin: palateTannin || undefined,
        alcohol: palateAlcohol || undefined,
        body: palateBody || undefined,
        flavourIntensity: palateIntensity || undefined,
        primaryFlavours,
        secondaryFlavours,
        tertiaryFlavours,
        finish: palateFinish || undefined,
      },
      conclusion: { quality: quality || undefined, summary: notes || undefined },
    }),
    [
      appearanceClarity, appearanceIntensity, appearanceColor, noseIntensity,
      primaryAromas, secondaryAromas, tertiaryAromas, palateSweetness, palateAcidity,
      palateTannin, palateAlcohol, palateBody, palateIntensity, primaryFlavours,
      secondaryFlavours, tertiaryFlavours, palateFinish, quality, notes,
    ],
  )

  // Autosave whenever any tracked field changes (only in session draft mode,
  // and not while showing the submitted/locked-in summary).
  const skipFirstAutosave = React.useRef(true)
  React.useEffect(() => {
    if (!isSessionDraft) return
    if (submittedReview) return // showing locked-in summary, not editing
    if (skipFirstAutosave.current) {
      skipFirstAutosave.current = false
      return
    }
    queueSave({
      rating,
      buyAgain,
      notes,
      publishedToProfile,
      wsetTasting: buildWsetSnapshot(),
    })
  }, [
    isSessionDraft, submittedReview, rating, buyAgain, notes, publishedToProfile,
    buildWsetSnapshot, queueSave,
  ])
```

- [ ] **Step 8: Turn the submit into "Klar / Lås in" in session mode.** The `handleSubmit` (`:450-604`) keeps the wine-linkage sanity check (`:490`) — note Workstream B relaxes the required-field gate at `:454-496`; A's only change here is the persistence path. After B has removed the field gates, the network section (`:498-604`) is replaced so session mode uses `lockIn()` instead of a one-shot POST. Replace the `try` block body that does the `fetch('/api/reviews', …)` through the `setSubmittedReview(reviewDoc)` lines (`:498-583`) — specifically from `setIsSubmitting(true)` (`:498`) through the `toast.success('Din vinrecension har skickats')` (`:583`):

```ts
    setIsSubmitting(true)
    try {
      // Convert IDs to numbers for Payload relationships
      const sessionIdNum = sessionId ? Number(sessionId) : undefined
      const participantIdNum = participantId ? Number(participantId) : undefined

      // When editing an existing review (initialReview), preserve its session
      // context. Otherwise editing a session review via /mina-recensioner/[id]
      // would lose the session/participant, breaking the dedup key and creating
      // a duplicate row instead of updating.
      const effectiveSessionId =
        initialReview?.session != null
          ? typeof initialReview.session === 'object'
            ? (initialReview.session as any).id
            : initialReview.session
          : sessionIdNum
      const effectiveParticipantId =
        initialReview?.sessionParticipant != null
          ? typeof initialReview.sessionParticipant === 'object'
            ? (initialReview.sessionParticipant as any).id
            : initialReview.sessionParticipant
          : participantIdNum

      // Either send a library wine relationship or a custom-wine snapshot (XOR).
      const wineIdentity = customWineSnapshot
        ? { customWine: customWineSnapshot }
        : { wine: wineId ? Number(wineId) : undefined }

      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          // Note: lesson field removed - content items reference reviews, not the other way around
          ...wineIdentity,
          rating,
          buyAgain,
          reviewText: notes,
          publishedToProfile,
          session: effectiveSessionId || undefined,
          sessionParticipant: effectiveParticipantId || undefined,
          wsetTasting: {
            appearance: {
              clarity: appearanceClarity || undefined,
              intensity: appearanceIntensity || undefined,
              color: appearanceColor || undefined,
            },
            nose: {
              intensity: noseIntensity || undefined,
              primaryAromas: primaryAromas,
              secondaryAromas: secondaryAromas,
              tertiaryAromas: tertiaryAromas,
            },
            palate: {
              sweetness: palateSweetness || undefined,
              acidity: palateAcidity || undefined,
              tannin: palateTannin || undefined,
              alcohol: palateAlcohol || undefined,
              body: palateBody || undefined,
              flavourIntensity: palateIntensity || undefined,
              primaryFlavours,
              secondaryFlavours,
              tertiaryFlavours,
              finish: palateFinish || undefined,
            },
            conclusion: {
              quality: quality || undefined,
              summary: notes || undefined,
            },
          },
        }),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        const errorMessage =
          errorData?.errors?.[0]?.message || errorData?.message || 'Kunde inte spara vinrecensionen'
        console.error('Review submission error:', errorData)
        throw new Error(errorMessage)
      }
      const json = await res.json()
      // Extract the review document from the response (API returns { success, doc })
      const reviewDoc = json.doc || json
      setSubmittedReview(reviewDoc)
      // Prepend to history list
      setHistory((prev) => [reviewDoc, ...prev])
      toast.success('Din vinrecension har skickats')
```

with (session mode → `lockIn`; non-session mode → keep the explicit POST):

```ts
    setIsSubmitting(true)
    try {
      // Session mode: the draft is already autosaved continuously. "Klar / Lås
      // in" just stamps submittedAt via the hook (queueSave already mirrored
      // every field). Reuse the same upsert route the hook uses.
      if (isSessionDraft) {
        // Make sure the very latest field values are queued, then lock in.
        queueSave({
          rating,
          buyAgain,
          notes,
          publishedToProfile,
          wsetTasting: buildWsetSnapshot(),
        })
        await lockIn()
        // Reflect "locked in" using the local state we already hold.
        const lockedDoc = {
          rating,
          buyAgain,
          reviewText: notes,
          publishedToProfile,
          wsetTasting: buildWsetSnapshot(),
          submittedAt: new Date().toISOString(),
          ...(customWineSnapshot ? { customWine: customWineSnapshot } : { wine: wineId }),
        } as unknown as ReviewDoc
        setSubmittedReview(lockedDoc)
        setHistory((prev) => [lockedDoc, ...prev])
        toast.success('Din smaknotering är inlåst')
        onSubmit?.()
        setIsSubmitting(false)
        return
      }

      // Non-session (standalone / lesson-only) explicit submit.
      const sessionIdNum = sessionId ? Number(sessionId) : undefined
      const participantIdNum = participantId ? Number(participantId) : undefined
      const effectiveSessionId =
        initialReview?.session != null
          ? typeof initialReview.session === 'object'
            ? (initialReview.session as any).id
            : initialReview.session
          : sessionIdNum
      const effectiveParticipantId =
        initialReview?.sessionParticipant != null
          ? typeof initialReview.sessionParticipant === 'object'
            ? (initialReview.sessionParticipant as any).id
            : initialReview.sessionParticipant
          : participantIdNum
      const wineIdentity = customWineSnapshot
        ? { customWine: customWineSnapshot }
        : { wine: wineId ? Number(wineId) : undefined }

      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...wineIdentity,
          rating,
          buyAgain,
          reviewText: notes,
          publishedToProfile,
          session: effectiveSessionId || undefined,
          sessionParticipant: effectiveParticipantId || undefined,
          submittedAt: new Date().toISOString(),
          wsetTasting: buildWsetSnapshot(),
        }),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        const errorMessage =
          errorData?.errors?.[0]?.message || errorData?.message || 'Kunde inte spara vinrecensionen'
        console.error('Review submission error:', errorData)
        throw new Error(errorMessage)
      }
      const json = await res.json()
      const reviewDoc = json.doc || json
      setSubmittedReview(reviewDoc)
      setHistory((prev) => [reviewDoc, ...prev])
      toast.success('Din vinrecension har skickats')
```

The remaining tail of the original `try` (`:584-598`: `await fetchAnswerKey(); onSubmit?.(); progress POST`) stays unchanged for the non-session path. Since the session path already called `onSubmit?.()` and returned, no double-fire occurs.

- [ ] **Step 9: Relabel the submit button in session mode.** The submit button (`:1155-1157`):

```tsx
          <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
            {isSubmitting ? 'Skickar...' : 'Skicka in'}
          </Button>
```

Replace with (show the autosave status next to it; relabel to "Klar / Lås in" in session mode):

```tsx
          <div className="flex items-center gap-3 w-full md:w-auto">
            {isSessionDraft && <ReviewSaveStatus status={saveStatus} />}
            <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
              {isSubmitting
                ? isSessionDraft
                  ? 'Låser in…'
                  : 'Skickar...'
                : isSessionDraft
                  ? 'Klar / Lås in'
                  : 'Skicka in'}
            </Button>
          </div>
```

Add the `ReviewSaveStatus` component and `SaveStatus` import. Update the hook import from Step 1:

```ts
import { useSessionDraft, type SaveStatus } from '@/lib/use-session-draft'
```

And add the component just above the final `return` of the file's default function, after `renderHighRatingCTAs` (`:662`), or as a module-level function at the bottom of the file:

```tsx
function ReviewSaveStatus({ status }: { status: SaveStatus }) {
  if (status === 'saving')
    return <span className="text-xs text-muted-foreground">Sparar…</span>
  if (status === 'saved') return <span className="text-xs text-green-600">Sparat ✓</span>
  if (status === 'retrying')
    return <span className="text-xs text-amber-600">Återförsöker…</span>
  if (status === 'error') return <span className="text-xs text-red-600">Kunde inte spara</span>
  return null
}
```

- [ ] **Step 10: Lint.**

```bash
pnpm lint
```

Expected: no use-before-declaration or unused-var errors. If `fetchLatestSubmission` references `populateFormWithReview` before its declaration, move the `fetchLatestSubmission` `useCallback` to directly below the `populateFormWithReview` `useCallback` (`:319`).

- [ ] **Step 11: Commit.**

```bash
git add src/components/course/WineReviewForm.tsx
git commit -m "otter: persistence — WineReviewForm autosaves; cookie+custom-wine rehydration; 'Klar/Lås in'"
```

---

### Task 8: Update `PlanSessionContent` rehydration + pass new props

- [ ] **Step 1: Fold guess rehydration into the single `my-submissions` call.** In `src/components/tasting-plan/PlanSessionContent.tsx`, the mount effect (`:222-263`) makes two fetches (`/my-submissions` and `/api/session-guesses`). Replace it with a single call to the now-enriched `/my-submissions` (which returns both reviews and guesses). Also track `submittedAt` per pour for the lock-in state. First extend the `LocalGuess` type and add a submittedAt map. The state block (`:216-221`):

```ts
  type LocalGuess = {
    country: string | null
    grape: string | null
    priceBucket: PriceBucket | null
  }
  const [myGuesses, setMyGuesses] = React.useState<Map<number, LocalGuess>>(new Map())
```

Replace with:

```ts
  type LocalGuess = {
    country: string | null
    grape: string | null
    priceBucket: PriceBucket | null
    submittedAt: string | null
  }
  const [myGuesses, setMyGuesses] = React.useState<Map<number, LocalGuess>>(new Map())
  // One-time "answers restored" banner trigger.
  const [restoredBanner, setRestoredBanner] = React.useState(false)
```

- [ ] **Step 2: Replace the two-fetch effect (`:222-263`).** Currently:

```ts
  React.useEffect(() => {
    let aborted = false
    fetch(`/api/sessions/${session.id}/my-submissions`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (aborted) return
        if (data && Array.isArray(data.submittedPourOrders)) {
          setSubmittedPourOrders(new Set(data.submittedPourOrders))
        }
      })
      .catch(() => {})
    fetch(`/api/session-guesses?session=${session.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (aborted) return
        const arr = (
          data as {
            guesses?: Array<{
              pourOrder: number
              guessedCountry: string | null
              guessedGrape: string | null
              guessedPriceBucket: PriceBucket | null
            }>
          }
        )?.guesses
        if (Array.isArray(arr)) {
          const map = new Map<number, LocalGuess>()
          for (const g of arr) {
            map.set(g.pourOrder, {
              country: g.guessedCountry ?? null,
              grape: g.guessedGrape ?? null,
              priceBucket: g.guessedPriceBucket ?? null,
            })
          }
          setMyGuesses(map)
        }
      })
      .catch(() => {})
    return () => {
      aborted = true
    }
  }, [session.id])
```

Replace with (single endpoint; both reviews + guesses):

```ts
  React.useEffect(() => {
    let aborted = false
    fetch(`/api/sessions/${session.id}/my-submissions`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (aborted || !data) return
        if (Array.isArray(data.submittedPourOrders)) {
          setSubmittedPourOrders(new Set(data.submittedPourOrders))
        }
        const guesses = Array.isArray(data.guesses)
          ? (data.guesses as Array<{
              pourOrder: number
              guessedCountry: string | null
              guessedGrape: string | null
              guessedPriceBucket: PriceBucket | null
              submittedAt: string | null
            }>)
          : []
        const map = new Map<number, LocalGuess>()
        for (const g of guesses) {
          map.set(g.pourOrder, {
            country: g.guessedCountry ?? null,
            grape: g.guessedGrape ?? null,
            priceBucket: g.guessedPriceBucket ?? null,
            submittedAt: g.submittedAt ?? null,
          })
        }
        setMyGuesses(map)
        // If the server returned any content at all, the "restored" banner is
        // warranted. BlindGuessCard / WineReviewForm also fire onRestored from
        // their local mirror; this covers the durable-server case.
        const reviewsCount = Array.isArray(data.reviews) ? data.reviews.length : 0
        if (guesses.length > 0 || reviewsCount > 0) setRestoredBanner(true)
      })
      .catch(() => {})
    return () => {
      aborted = true
    }
  }, [session.id])
```

- [ ] **Step 3: Pass `initialSubmittedAt` + `onRestored` to `BlindGuessCard`.** The render (`:541-553`):

```tsx
                        {isBlind && !isHost && (
                          <BlindGuessCard
                            sessionId={Number(session.id)}
                            pourOrder={row.pourOrder}
                            isRevealed={effectiveRevealed.has(row.pourOrder)}
                            answer={row.blindAnswer}
                            easyModeOptions={row.easyModeOptions}
                            initialGuess={(() => {
                              const g = myGuesses.get(row.pourOrder)
                              return g ?? null
                            })()}
                          />
                        )}
```

Replace with:

```tsx
                        {isBlind && !isHost && (
                          <BlindGuessCard
                            sessionId={Number(session.id)}
                            pourOrder={row.pourOrder}
                            isRevealed={effectiveRevealed.has(row.pourOrder)}
                            answer={row.blindAnswer}
                            easyModeOptions={row.easyModeOptions}
                            initialGuess={(() => {
                              const g = myGuesses.get(row.pourOrder)
                              return g ?? null
                            })()}
                            initialSubmittedAt={
                              myGuesses.get(row.pourOrder)?.submittedAt ?? null
                            }
                            onRestored={() => setRestoredBanner(true)}
                          />
                        )}
```

- [ ] **Step 4: Pass `pourOrder` + `onRestored` to the two `WineReviewForm` instances.** The dialog (`:575-598`) renders `WineReviewForm` twice. Add `pourOrder={reviewing.pourOrder}` and `onRestored={() => setRestoredBanner(true)}` to both. The library-wine instance (`:576-586`):

```tsx
              <WineReviewForm
                lessonId={0}
                sessionId={String(session.id)}
                wineIdProp={reviewing.libraryWineId}
                insideDialog
                onSubmit={() => {
                  setSubmittedPourOrders((prev) => new Set([...prev, reviewing!.pourOrder]))
                  setReviewing(null)
                }}
              />
```

→

```tsx
              <WineReviewForm
                lessonId={0}
                sessionId={String(session.id)}
                pourOrder={reviewing.pourOrder}
                wineIdProp={reviewing.libraryWineId}
                insideDialog
                onRestored={() => setRestoredBanner(true)}
                onSubmit={() => {
                  setSubmittedPourOrders((prev) => new Set([...prev, reviewing!.pourOrder]))
                  setReviewing(null)
                }}
              />
```

The custom-wine instance (`:588-597`):

```tsx
              <WineReviewForm
                lessonId={0}
                sessionId={String(session.id)}
                customWineSnapshot={reviewing.customWineSnapshot}
                insideDialog
                onSubmit={() => {
                  setSubmittedPourOrders((prev) => new Set([...prev, reviewing!.pourOrder]))
                  setReviewing(null)
                }}
              />
```

→

```tsx
              <WineReviewForm
                lessonId={0}
                sessionId={String(session.id)}
                pourOrder={reviewing.pourOrder}
                customWineSnapshot={reviewing.customWineSnapshot}
                insideDialog
                onRestored={() => setRestoredBanner(true)}
                onSubmit={() => {
                  setSubmittedPourOrders((prev) => new Set([...prev, reviewing!.pourOrder]))
                  setReviewing(null)
                }}
              />
```

- [ ] **Step 5: Render the "answers restored" banner (Task 11) + connection banner (Task 10) at the top of the layout.** This is wired in Task 10/11; leave the `restoredBanner` state in place for now.

- [ ] **Step 6: Lint + commit.**

```bash
pnpm lint
git add src/components/tasting-plan/PlanSessionContent.tsx
git commit -m "otter: persistence — PlanSessionContent rehydrates via my-submissions; threads pourOrder + restore"
```

---

### Task 9: Re-join recovery by participant token

- [ ] **Step 1: Accept a `participantToken` in the join body + recover by it.** In `src/components/course/JoinSessionDialog.tsx`, `submitJoin` builds the body (`:77`). The token is already in `localStorage` (`:112`). Add it to the request. Currently (`:77`):

```ts
      const body: Record<string, string> = { joinCode: joinCode.toUpperCase().trim() }
```

Replace with (attach the stored token so the server can recover the original participant when the cookie is gone):

```ts
      const body: Record<string, string> = { joinCode: joinCode.toUpperCase().trim() }
      try {
        const storedToken = localStorage.getItem('participantToken')
        if (storedToken) body.participantToken = storedToken
      } catch {
        // localStorage may be blocked — fall through to fresh join.
      }
```

- [ ] **Step 2: Recover by body token in the guest branch of the join route.** In `src/app/api/sessions/join/route.ts`, parse the token from the body. The body destructure (`:42-46`):

```ts
    const { joinCode, nickname: nicknameRaw, email: emailRaw } = body as {
      joinCode?: string
      nickname?: string
      email?: string
    }
```

Replace with:

```ts
    const { joinCode, nickname: nicknameRaw, email: emailRaw, participantToken: bodyToken } =
      body as {
        joinCode?: string
        nickname?: string
        email?: string
        participantToken?: string
      }
```

- [ ] **Step 3: Use the body token as a fallback in the guest re-join branch (`:145-172`).** Currently:

```ts
    } else {
      // Guest re-join: try to recover via existing cookie token
      const cookieStore = await cookies()
      const existingToken = cookieStore.get(PARTICIPANT_COOKIE)?.value
      let recovered = false
      if (existingToken) {
        const recoveredRes = await payload.find({
          collection: 'session-participants',
          where: {
            and: [
              { session: { equals: session.id } },
              { participantToken: { equals: existingToken } },
            ],
          },
          limit: 1,
        })
        if (recoveredRes.totalDocs > 0) {
          participant = recoveredRes.docs[0]
          if (!participant.isActive) {
            participant = await payload.update({
              collection: 'session-participants',
              id: participant.id,
              data: { isActive: true, lastActivityAt: new Date().toISOString() },
            })
          }
          recovered = true
        }
      }
```

Replace with (cookie first, then the localStorage-supplied body token — closing the orphan gap when the httpOnly cookie was lost but localStorage survived):

```ts
    } else {
      // Guest re-join: recover the original participant via the httpOnly cookie
      // token, falling back to the token the client still holds in
      // localStorage (sent in the body). This closes the orphan gap where the
      // cookie was lost (e.g. Safari ITP) but the client retained the token.
      const cookieStore = await cookies()
      const cookieToken = cookieStore.get(PARTICIPANT_COOKIE)?.value
      const candidateToken =
        cookieToken || (typeof bodyToken === 'string' && bodyToken.trim() ? bodyToken.trim() : null)
      let recovered = false
      if (candidateToken) {
        const recoveredRes = await payload.find({
          collection: 'session-participants',
          where: {
            and: [
              { session: { equals: session.id } },
              { participantToken: { equals: candidateToken } },
            ],
          },
          limit: 1,
        })
        if (recoveredRes.totalDocs > 0) {
          participant = recoveredRes.docs[0]
          if (!participant.isActive) {
            participant = await payload.update({
              collection: 'session-participants',
              id: participant.id,
              data: { isActive: true, lastActivityAt: new Date().toISOString() },
            })
          }
          recovered = true
        }
      }
```

The `if (!recovered) { … create … }` block (`:174-187`) and the cookie-reset at the end (`:261-267`, which re-sets `PARTICIPANT_COOKIE` to `participant.participantToken`) stay unchanged — on recovery the cookie is restored to the recovered participant's token.

- [ ] **Step 4: Lint + commit.**

```bash
pnpm lint
git add src/components/course/JoinSessionDialog.tsx src/app/api/sessions/join/route.ts
git commit -m "otter: persistence — re-join recovers original participant by localStorage token when cookie is gone"
```

---

### Task 10: `connectionState` in context + RealtimeSync onopen/onerror + banner

- [ ] **Step 1: Add `connectionState` to the context type.** In `src/context/SessionContext.tsx`, the `SessionContextValue` interface adds a field. After the `clearActiveSession` declaration (`:74`):

```ts
  /** Force-clear the active session state + localStorage. Used when the host
   * ends the session — RealtimeSync calls this after it has redirected the
   * client to the recap so the ActiveSessionBanner doesn't reappear. */
  clearActiveSession: () => void
}
```

Replace with:

```ts
  /** Force-clear the active session state + localStorage. Used when the host
   * ends the session — RealtimeSync calls this after it has redirected the
   * client to the recap so the ActiveSessionBanner doesn't reappear. */
  clearActiveSession: () => void
  /** Live SSE connection state. Set by RealtimeSync via EventSource events. */
  connectionState: 'connecting' | 'open' | 'reconnecting'
  setConnectionState: (s: 'connecting' | 'open' | 'reconnecting') => void
}
```

- [ ] **Step 2: Add the state + setter to the provider.** After the `sessionStatus` state (`:96`):

```ts
  const [sessionStatus, setSessionStatus] = useState<string | null>(null)
```

Add:

```ts
  const [sessionStatus, setSessionStatus] = useState<string | null>(null)
  const [connectionState, setConnectionStateRaw] = useState<
    'connecting' | 'open' | 'reconnecting'
  >('connecting')
  const setConnectionState = useCallback((s: 'connecting' | 'open' | 'reconnecting') => {
    setConnectionStateRaw(s)
  }, [])
```

- [ ] **Step 3: Expose it in the `value` object.** The `value` object ends (`:304-307`):

```ts
    sessionStatus,
    setSessionStatus,
    clearActiveSession,
  }
```

Replace with:

```ts
    sessionStatus,
    setSessionStatus,
    clearActiveSession,
    connectionState,
    setConnectionState,
  }
```

- [ ] **Step 4: Wire onopen/onerror in RealtimeSync.** In `src/components/course/RealtimeSync.tsx`, pull `setConnectionState` from the context (`:16-25`):

```ts
  const {
    setHostCurrentLessonId,
    setHostCurrentWinePourOrder,
    setHostFocusStartedAt,
    setRevealedPourOrders,
    setRoster,
    setSwarm,
    setSessionStatus,
    clearActiveSession,
  } = useActiveSession()
```

Replace with:

```ts
  const {
    setHostCurrentLessonId,
    setHostCurrentWinePourOrder,
    setHostFocusStartedAt,
    setRevealedPourOrders,
    setRoster,
    setSwarm,
    setSessionStatus,
    clearActiveSession,
    setConnectionState,
  } = useActiveSession()
```

Then add the handlers right after the `EventSource` is created (`:31-32`):

```ts
    const url = `/api/sessions/${encodeURIComponent(sessionId)}/stream`
    const es = new EventSource(url, { withCredentials: true })
```

Replace with:

```ts
    const url = `/api/sessions/${encodeURIComponent(sessionId)}/stream`
    const es = new EventSource(url, { withCredentials: true })

    setConnectionState('connecting')
    es.onopen = () => {
      setConnectionState('open')
    }
    es.onerror = () => {
      // EventSource auto-reconnects; surface the gap to the banner. When it
      // re-establishes, onopen flips this back to 'open'.
      setConnectionState('reconnecting')
    }
```

Add `setConnectionState` to the effect's dependency array (`:101-112`):

```ts
  }, [
    sessionId,
    setHostCurrentLessonId,
    setHostCurrentWinePourOrder,
    setHostFocusStartedAt,
    setRevealedPourOrders,
    setRoster,
    setSwarm,
    setSessionStatus,
    clearActiveSession,
    router,
  ])
```

→

```ts
  }, [
    sessionId,
    setHostCurrentLessonId,
    setHostCurrentWinePourOrder,
    setHostFocusStartedAt,
    setRevealedPourOrders,
    setRoster,
    setSwarm,
    setSessionStatus,
    clearActiveSession,
    setConnectionState,
    router,
  ])
```

- [ ] **Step 5: Create the banner component.** Create `src/components/realtime/ConnectionBanner.tsx`:

```tsx
'use client'

import * as React from 'react'
import { useActiveSession } from '@/context/SessionContext'
import { CloudOff, Wifi } from 'lucide-react'

/**
 * Thin status strip for the live session screen. Renders nothing while the
 * connection is healthy; shows "reconnecting" when the SSE stream drops and a
 * brief "reconnected" confirmation when it recovers.
 */
export function ConnectionBanner() {
  const { connectionState } = useActiveSession()
  const [showReconnected, setShowReconnected] = React.useState(false)
  const wasDisconnected = React.useRef(false)

  React.useEffect(() => {
    if (connectionState === 'reconnecting') {
      wasDisconnected.current = true
    } else if (connectionState === 'open' && wasDisconnected.current) {
      wasDisconnected.current = false
      setShowReconnected(true)
      const t = setTimeout(() => setShowReconnected(false), 3000)
      return () => clearTimeout(t)
    }
  }, [connectionState])

  if (connectionState === 'reconnecting') {
    return (
      <div className="mb-3 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        <CloudOff className="h-4 w-4 flex-shrink-0" />
        <span>Ingen anslutning — återförsöker… Dina svar sparas ändå.</span>
      </div>
    )
  }
  if (showReconnected) {
    return (
      <div className="mb-3 flex items-center gap-2 rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200">
        <Wifi className="h-4 w-4 flex-shrink-0" />
        <span>Återansluten</span>
      </div>
    )
  }
  return null
}
```

- [ ] **Step 6: Render the banner on the live screen.** In `src/components/tasting-plan/PlanSessionContent.tsx`, add the import alongside the other component imports (after `BlindGuessCard`, `:29`):

```ts
import { BlindGuessCard } from '@/components/tasting-plan/BlindGuessCard'
```

→

```ts
import { BlindGuessCard } from '@/components/tasting-plan/BlindGuessCard'
import { ConnectionBanner } from '@/components/realtime/ConnectionBanner'
```

Then render it immediately under the `<header>` block (`:413-416`):

```tsx
      </header>
      {isHost && (
        <HostSessionTour blind={isBlind} hasTimer={!!plan.defaultMinutesPerWine} />
      )}
```

→

```tsx
      </header>
      <ConnectionBanner />
      {isHost && (
        <HostSessionTour blind={isBlind} hasTimer={!!plan.defaultMinutesPerWine} />
      )}
```

- [ ] **Step 7: Lint + commit.**

```bash
pnpm lint
git add src/context/SessionContext.tsx src/components/course/RealtimeSync.tsx src/components/realtime/ConnectionBanner.tsx src/components/tasting-plan/PlanSessionContent.tsx
git commit -m "otter: persistence — connectionState in context; RealtimeSync onopen/onerror; reconnect banner"
```

---

### Task 11: "Answers restored" one-time banner

- [ ] **Step 1: Render the banner using the `restoredBanner` state from Task 8.** In `src/components/tasting-plan/PlanSessionContent.tsx`, the `restoredBanner` state already exists (Task 8, Step 1) and is set true by the rehydration effect and the `onRestored` callbacks. Render a dismissible one-time banner right under `<ConnectionBanner />` (added in Task 10). The block from Task 10 Step 6:

```tsx
      </header>
      <ConnectionBanner />
      {isHost && (
        <HostSessionTour blind={isBlind} hasTimer={!!plan.defaultMinutesPerWine} />
      )}
```

Replace with:

```tsx
      </header>
      <ConnectionBanner />
      {restoredBanner && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-brand-400/40 bg-brand-400/10 px-3 py-2 text-sm">
          <span>Vi har sparat dina tidigare svar.</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={() => setRestoredBanner(false)}
          >
            Stäng
          </Button>
        </div>
      )}
      {isHost && (
        <HostSessionTour blind={isBlind} hasTimer={!!plan.defaultMinutesPerWine} />
      )}
```

- [ ] **Step 2: Lint + commit.**

```bash
pnpm lint
git add src/components/tasting-plan/PlanSessionContent.tsx
git commit -m "otter: persistence — one-time 'answers restored' banner on the live screen"
```

---

### Task 12: PostHog instrumentation verification + build sanity + manual QA

PostHog events (`vk_session_save_attempt | _success | _failure | _retry`) are emitted inside `useSessionDraft` (Task 3). This task verifies they fire with the contracted payload and that the whole workstream builds.

- [ ] **Step 1: Confirm the event payload shape in the hook.** The `track` helper in `src/lib/use-session-draft.ts` calls `posthog.capture(event, { kind, sessionId: String(sessionId), pourOrder })`. Verify the four call sites exist:

```bash
grep -n "vk_session_save_" src/lib/use-session-draft.ts
```

Expected: `vk_session_save_attempt` (in `flush`), `vk_session_save_success` (on ok), `vk_session_save_failure` (on catch), and `vk_session_save_retry` (in the online listener + the scheduled-retry path) — at least four matches across attempt/success/failure/retry.

- [ ] **Step 2: Build sanity for the whole workstream.** Run:

```bash
pnpm build
```

Expected: `generate:importmap` runs, then `next build --experimental-build-mode compile` completes with no type errors. Watch specifically for errors in the touched files (`use-session-draft.ts`, `BlindGuessCard.tsx`, `WineReviewForm.tsx`, `PlanSessionContent.tsx`, `RealtimeSync.tsx`, `SessionContext.tsx`, the three routes).

- [ ] **Step 3: MANUAL QA — partial guess survives refresh.**
  1. Start `pnpm dev`. As host, create a blind plan session; open the join link in a second browser as a guest.
  2. As the guest, on wine #1 pick only a country (do NOT press "Lås in"). Watch the status flip `Sparar…` → `Sparat`.
  3. Hard-refresh the guest tab.
  - Expected: the country is still selected; the "Vi har sparat dina tidigare svar" banner appears once; the edit form is open (not the locked-in summary).

- [ ] **Step 4: MANUAL QA — offline queue + reconnect.**
  1. As the guest, open DevTools → Network → set "Offline".
  2. Change the grape selection.
  - Expected: status shows `Återförsöker…`; the connection banner shows "Ingen anslutning — återförsöker…".
  3. Set Network back to "Online".
  - Expected: the queued write flushes, status → `Sparat`, banner → "Återansluten" then disappears. In PostHog (project Vinakademin, id 106729), the events `vk_session_save_failure` then `vk_session_save_retry`/`vk_session_save_success` appear with `{ kind: 'guess', sessionId, pourOrder }`.

- [ ] **Step 5: MANUAL QA — custom-wine note rehydration (regression on the old skip).**
  1. As the guest, open "Betygsätt" on a custom-wine pour, set a rating + a note, wait for `Sparat`, close the dialog WITHOUT pressing Klar/Lås in.
  2. Hard-refresh, reopen "Betygsätt" on the same pour.
  - Expected: rating + note are repopulated (previously custom-wine reviews never rehydrated).

- [ ] **Step 6: MANUAL QA — re-join after clearing the cookie.**
  1. As the guest (with a saved guess), open DevTools → Application → Cookies and delete `vk_participant_token` (leave `localStorage.participantToken` intact). Reload `/delta` and re-join with the same code.
  - Expected: the original participant is recovered (same guesses visible, recap shows the same identity), not a fresh orphan row. Confirm in the admin that the session has not gained an extra `SessionParticipant`.

- [ ] **Step 7: MANUAL QA — draft counts in recap without lock-in.**
  1. As the guest, leave wine #2 as a saved draft (rating only, never pressed Klar/Lås in). As host, reveal #2 and end the session.
  - Expected: the recap counts the guest's #2 entry (presence of content, not `submittedAt`), i.e. NOT "did not submit".

- [ ] **Step 8: Commit any QA-driven fixes** (if none, skip). Example:

```bash
git add -A
git commit -m "otter: persistence — QA fixes for autosave/rehydration edge cases"
```

---

## Workstream B — Tasting-note form for amateurs (`src/components/course/WineReviewForm.tsx`)

Default the review form to the beginner-friendly **Enkel** mode (remembered per device), soften the WSET jargon in that mode, and remove the blocking required-field validation so partial autosaved notes count. All changes are confined to `WineReviewForm.tsx`; the autosave/lock-in rewrite of the submit path is owned by Workstream A — this workstream only removes the **blocking** validation gate and updates copy.

**Files**
- Modify `src/components/course/WineReviewForm.tsx`
  - `:98` — `mode` initial state `'advanced'` → `'simple'` (Task 20)
  - `:783-792` (Tabs `onValueChange`) + new mount effect — persist/read `vk_review_mode` (Task 20)
  - `:797-810` (Enkel "Primära smaker" `InputRow` label) + `:481-489` (validation messages) — relabel (Task 21)
  - `:811-852` (Enkel Sötma/Syra/Fyllighet labels) — plain-language hints (Task 21)
  - `:454-496` (`handleSubmit` validation block) — relax to wine-linkage check only (Task 22)

Note: `InputRow` (`src/components/course/WineReviewFormHelpers.tsx:19-44`) takes only a `label` string and no description prop; hints are embedded directly into the `label` text (matching the spec's `"Sötma (torr → söt)"` example) so the shared helper is left untouched.

---

### Task 20: Default to Enkel and remember last-used mode per device

- [ ] **Step 1: Change the `mode` initial state from `'advanced'` to `'simple'` (`:98`).**

  Current code (line 98):
  ```tsx
    const [mode, setMode] = React.useState<'simple' | 'advanced'>('advanced')
  ```

  Replace with (lazy initializer reads the persisted per-device preference; falls back to `'simple'`):
  ```tsx
    const [mode, setMode] = React.useState<'simple' | 'advanced'>(() => {
      if (typeof window === 'undefined') return 'simple'
      const saved = window.localStorage.getItem('vk_review_mode')
      return saved === 'advanced' || saved === 'simple' ? saved : 'simple'
    })
  ```

  This both flips the default to `'simple'` and reads the remembered mode on mount in one place. Using a lazy initializer (function form of `useState`) avoids a flash of the wrong tab and avoids a separate mount `useEffect` that would fight Radix Tabs' controlled value.

- [ ] **Step 2: Persist the mode to `localStorage` on change (`:783-792`).**

  Current Tabs declaration (lines 783-792):
  ```tsx
        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as 'simple' | 'advanced')}
          className="w-full"
        >
          <div className="flex justify-center mb-6">
            <TabsList>
              <TabsTrigger value="simple">Enkel</TabsTrigger>
              <TabsTrigger value="advanced">Avancerad</TabsTrigger>
            </TabsList>
          </div>
  ```

  Replace the `onValueChange` handler so the choice is written through to `localStorage`:
  ```tsx
        <Tabs
          value={mode}
          onValueChange={(v) => {
            const next = v as 'simple' | 'advanced'
            setMode(next)
            if (typeof window !== 'undefined') {
              window.localStorage.setItem('vk_review_mode', next)
            }
          }}
          className="w-full"
        >
          <div className="flex justify-center mb-6">
            <TabsList>
              <TabsTrigger value="simple">Enkel</TabsTrigger>
              <TabsTrigger value="advanced">Avancerad</TabsTrigger>
            </TabsList>
          </div>
  ```

- [ ] **Step 3: Lint to confirm no syntax/hook issues.**
  ```bash
  pnpm lint
  ```
  Expected: no new errors referencing `WineReviewForm.tsx`. (Pre-existing warnings elsewhere are unrelated.)

- [ ] **Step 4: Commit.**
  ```bash
  git add src/components/course/WineReviewForm.tsx
  git commit -m "otter: review form — default to Enkel mode, remember last-used per device"
  ```

- [ ] **MANUAL QA (mode persistence):** `pnpm dev` → open any wine review form (e.g. a live tasting note for a guest, or `/mina-recensioner/<id>`). Confirm the **Enkel** tab is active on first load. Click **Avancerad**, then hard-refresh (Cmd-Shift-R): the form must reopen on **Avancerad**. In DevTools → Application → Local Storage, confirm key `vk_review_mode` = `advanced`. Switch back to **Enkel**, refresh, confirm it stays on **Enkel** and the key reads `simple`.

---

### Task 21: Relabel Enkel-mode jargon (vocabulary file unchanged)

- [ ] **Step 1: Rename the Enkel "Primära smaker" row to "Smaker du känner igen" (`:797-810`).**

  Current code (lines 797-810):
  ```tsx
              <InputRow
                label="Primära smaker"
                error={errors['primaryFlavours']}
                attemptSubmit={attemptSubmit}
              >
                <MultiSelect
                  modalPopover={insideDialog}
                  options={buildFlavourOptions(PRIMARY_VOCAB, 'primary', wineType)}
                  value={primaryFlavours}
                  onValueChange={setPrimaryFlavours}
                  placeholder="Välj smaker"
                  className="w-full"
                />
              </InputRow>
  ```

  Replace with (only the `label` changes; `errors['primaryFlavours']` key, state, and vocabulary are untouched):
  ```tsx
              <InputRow
                label="Smaker du känner igen"
                error={errors['primaryFlavours']}
                attemptSubmit={attemptSubmit}
              >
                <MultiSelect
                  modalPopover={insideDialog}
                  options={buildFlavourOptions(PRIMARY_VOCAB, 'primary', wineType)}
                  value={primaryFlavours}
                  onValueChange={setPrimaryFlavours}
                  placeholder="Välj smaker"
                  className="w-full"
                />
              </InputRow>
  ```

  Note: the **Avancerad** "Primära smaker" row (`:1032-1045`) and "Primära aromer" (`:960-973`) stay expert-facing and are NOT changed.

- [ ] **Step 2: Add plain-language hints to the Enkel Sötma / Syra / Fyllighet labels (`:811-852`).**

  Current code (lines 811-852):
  ```tsx
              <InputRow label="Sötma" attemptSubmit={attemptSubmit}>
                <Select value={palateSweetness} onValueChange={setPalateSweetness}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Välj" />
                  </SelectTrigger>
                  <SelectContent>
                    {['Torr', 'Halvtorr', 'Mellan', 'Söt'].map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InputRow>
              <InputRow label="Syra" attemptSubmit={attemptSubmit}>
                <Select value={palateAcidity} onValueChange={setPalateAcidity}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Välj" />
                  </SelectTrigger>
                  <SelectContent>
                    {['Låg', 'Mellan', 'Hög'].map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InputRow>
              <InputRow label="Fyllighet" attemptSubmit={attemptSubmit}>
                <Select value={palateBody} onValueChange={setPalateBody}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Välj" />
                  </SelectTrigger>
                  <SelectContent>
                    {['Lätt', 'Mellan', 'Fyllig'].map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InputRow>
  ```

  Replace with (only the three `label` strings change — the plain-language cue is embedded inline since `InputRow` has no separate hint prop):
  ```tsx
              <InputRow label="Sötma (torr → söt)" attemptSubmit={attemptSubmit}>
                <Select value={palateSweetness} onValueChange={setPalateSweetness}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Välj" />
                  </SelectTrigger>
                  <SelectContent>
                    {['Torr', 'Halvtorr', 'Mellan', 'Söt'].map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InputRow>
              <InputRow label="Syra (hur frisk?)" attemptSubmit={attemptSubmit}>
                <Select value={palateAcidity} onValueChange={setPalateAcidity}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Välj" />
                  </SelectTrigger>
                  <SelectContent>
                    {['Låg', 'Mellan', 'Hög'].map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InputRow>
              <InputRow label="Fyllighet (lätt → kraftig)" attemptSubmit={attemptSubmit}>
                <Select value={palateBody} onValueChange={setPalateBody}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Välj" />
                  </SelectTrigger>
                  <SelectContent>
                    {['Lätt', 'Mellan', 'Fyllig'].map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InputRow>
  ```

  Note: the **Avancerad** Smak block (`:996-1031`) builds these same fields from a tuple array with labels `'Sötma'`, `'Syra'`, `'Fyllighet'` — those stay expert-facing and are NOT changed. Only the Enkel `TabsContent value="simple"` rows are touched. The `palateSweetness` / `palateAcidity` / `palateBody` option arrays are unchanged so the value strings stored on `wsetTasting.palate.*` remain identical (no data/scoring impact).

- [ ] **Step 3: Update the validation message at `:481-489` to match the new label.**

  This is coordinated with Task 22 (which removes the *blocking* behaviour). Even after Task 22 removes the gate, the spec asks the user-facing message wording to be updated to match the relabelled field. The relevant current block (lines 481-489):
  ```tsx
      if (mode === 'simple') {
        if (!primaryFlavours || primaryFlavours.length === 0)
          newErrors['primaryFlavours'] = 'Välj minst en primär smak'
      } else {
        if (!primaryAromas || primaryAromas.length === 0)
          newErrors['primaryAromas'] = 'Välj minst en primär arom'
        if (!primaryFlavours || primaryFlavours.length === 0)
          newErrors['primaryFlavours'] = 'Välj minst en primär smak'
      }
  ```

  Task 22 deletes this entire block. If for any reason the team chooses to keep a *non-blocking* hint instead of deleting it, the simple-mode message must read `'Välj minst en smak du känner igen'`. Since Task 22 removes the block outright, no standalone edit is required here — this step is satisfied by Task 22 and exists only to record the wording decision.

- [ ] **Step 4: Lint.**
  ```bash
  pnpm lint
  ```
  Expected: no new errors referencing `WineReviewForm.tsx`.

- [ ] **Step 5: Commit.**
  ```bash
  git add src/components/course/WineReviewForm.tsx
  git commit -m "otter: review form — plain-language Enkel labels (Smaker du känner igen + hints)"
  ```

- [ ] **MANUAL QA (labels read clearly):** `pnpm dev` → open a review form on the **Enkel** tab. Confirm the first row reads **"Smaker du känner igen"** (not "Primära smaker"), and the three rows read **"Sötma (torr → söt)"**, **"Syra (hur frisk?)"**, **"Fyllighet (lätt → kraftig)"**. Switch to **Avancerad**: confirm the Smak section still reads plain **"Sötma"**, **"Syra"**, **"Fyllighet"**, **"Primära smaker"**, **"Primära aromer"** (unchanged). Select a couple of flavours and a sweetness/acidity/body value, save, and confirm in Payload admin (Reviews → the new row → `wsetTasting.palate`) that the stored values are the same strings as before (`Torr`, `Hög`, etc.).

---

### Task 22: Allow partial responses — remove the blocking required-field gate in `handleSubmit`

- [ ] **Step 1: Replace the validation block in `handleSubmit` (`:454-496`) so only the wine-linkage sanity check remains.**

  Current code (lines 454-496):
  ```tsx
      const newErrors: Record<string, string> = {}
      const requiredPairs: Array<[string, string]> =
        mode === 'simple'
          ? [['rating', String(rating || '')]]
          : [
              ['appearanceClarity', appearanceClarity],
              ['appearanceIntensity', appearanceIntensity],
              ['appearanceColor', appearanceColor],
              ['noseIntensity', noseIntensity],
              ['palateSweetness', palateSweetness],
              ['palateAcidity', palateAcidity],
              ['palateTannin', palateTannin],
              ['palateAlcohol', palateAlcohol],
              ['palateBody', palateBody],
              ['palateIntensity', palateIntensity],
              ['palateFinish', palateFinish],
              ['quality', quality],
            ]

      requiredPairs.forEach(([key, val]) => {
        if (!val) newErrors[key] = 'Detta fält är obligatoriskt'
      })

      if (!rating || rating < 1 || rating > 5) {
        newErrors['rating'] = 'Välj ett betyg mellan 1–5'
      }

      if (mode === 'simple') {
        if (!primaryFlavours || primaryFlavours.length === 0)
          newErrors['primaryFlavours'] = 'Välj minst en primär smak'
      } else {
        if (!primaryAromas || primaryAromas.length === 0)
          newErrors['primaryAromas'] = 'Välj minst en primär arom'
        if (!primaryFlavours || primaryFlavours.length === 0)
          newErrors['primaryFlavours'] = 'Välj minst en primär smak'
      }
      if (!wineId && !customWineSnapshot) newErrors['wine'] = 'Inget vin kopplat till detta moment'

      setErrors(newErrors)
      if (Object.keys(newErrors).length > 0) {
        toast.error('Vänligen fyll i alla obligatoriska fält')
        return
      }
  ```

  Replace with (drop every WSET/rating/flavour requirement; keep ONLY the wine-linkage check, which is a real data-integrity guard — a review with no wine and no custom-wine snapshot cannot be persisted meaningfully):
  ```tsx
      // Partial responses are allowed — any single saved field counts (autosave
      // owns persistence; this submit path only "locks in"). The sole blocking
      // check is wine linkage: a review needs either a library wine or a
      // custom-wine snapshot to attach to. All WSET/rating/flavour fields are
      // optional. Field-level error display (errors[...]) may still surface as
      // hints elsewhere but must never block save here.
      const newErrors: Record<string, string> = {}
      if (!wineId && !customWineSnapshot) newErrors['wine'] = 'Inget vin kopplat till detta moment'

      setErrors(newErrors)
      if (newErrors['wine']) {
        toast.error('Inget vin kopplat till detta moment')
        return
      }
  ```

  Coordination note (Workstream A): A converts this `handleSubmit` from a one-shot `fetch` into autosave + a `lockIn()` call that sets `submittedAt`. This task only removes the **blocking** required-field validation — it leaves the `setErrors(...)` / `errors[...]` display plumbing and the `attemptSubmit` flag intact so A's status UI and any non-blocking field hints keep working. When A rewrites the persistence, the wine-linkage early-return above is the one guard that must survive (a write with neither `wine` nor `customWine` is invalid). A must not re-introduce a rating/flavour gate.

- [ ] **Step 2: Lint.**
  ```bash
  pnpm lint
  ```
  Expected: no new errors referencing `WineReviewForm.tsx`. (`rating`, `appearanceClarity`, etc. are still referenced in the POST body and in render, so no "unused variable" warnings are introduced by removing the validation.)

- [ ] **Step 3: Commit.**
  ```bash
  git add src/components/course/WineReviewForm.tsx
  git commit -m "otter: review form — allow partial responses (drop blocking WSET/rating validation)"
  ```

- [ ] **MANUAL QA (partial save works):** `pnpm dev` → open a review form (live tasting note or `/mina-recensioner` flow). On **Enkel**, leave the rating at 0 and select no flavours, type only a short note in **Noteringar**, then press **Skicka in**. Expected: the submit proceeds (no "Vänligen fyll i alla obligatoriska fält" toast, no red field errors blocking it) and the success/locked-in state appears. Repeat on **Avancerad** with only one Select filled. Then test the one surviving guard: render the form with a momentary no-wine state (a content item with no `answerKeyReview.wine` and no `customWineSnapshot`) and confirm pressing submit shows the "Inget vin kopplat till detta moment" toast and does NOT POST. In Payload admin, confirm the partial review row was created with whatever single field you entered (e.g. only `reviewText` populated).

---

### Task 23: Final verification for Workstream B

- [ ] **Step 1: Full lint pass.**
  ```bash
  pnpm lint
  ```
  Expected: completes with no new errors attributable to `WineReviewForm.tsx`.

- [ ] **Step 2: Confirm no collection/type changes were made in this workstream** (so no `pnpm generate:types` / migration is required). Workstream B touches only the React component — the `submittedAt` field, price enums, and any new API fields belong to Workstreams A/C/D. Verify with:
  ```bash
  git diff --stat HEAD~3 -- src/components/course/WineReviewForm.tsx
  ```
  Expected: only `src/components/course/WineReviewForm.tsx` is listed; no files under `src/collections/`, `src/migrations/`, or `src/payload-types.ts`.

- [ ] **Step 3: Cross-workstream handoff check.** Confirm with Workstream A that the `handleSubmit` wine-linkage early-return (Task 22 Step 1) is preserved when they swap in `useSessionDraft` + `lockIn()`, and that they own the `localStorage.getItem('participantId')` removal (`:142-147`, `:202-207`) and the custom-wine rehydration (`:272-276`) — those are explicitly NOT touched by Workstream B per the shared-file ownership split.

---

## Workstream C — Price (buckets + exact price at reveal)

Switches the global price buckets to the new six-value enum (`0_99 … 300_plus`), mirrors the enum in all three duplicate definitions plus a Postgres remap migration, and surfaces the exact kronor price at reveal — in the live `BlindGuessCard` and in the post-reveal recap shown to everyone.

**Files**
- Create: `scripts/verify-price-buckets.ts` (new)
- Create: `scripts/verify-price-remap.ts` (new)
- Create: `src/migrations/<generated>_price_buckets_v2.ts` (new, via `pnpm migrate:create`) + index entry in `src/migrations/index.ts`
- Modify: `src/lib/blind-guess-vocab.ts` (PriceBucket :29-34, PRICE_BUCKETS :36-42, priceToBucket :47-54)
- Modify: `src/collections/SessionGuesses.ts` (:61-67)
- Modify: `src/collections/TastingPlans.ts` (:158-164)
- Modify: `src/app/api/session-guesses/route.ts` (:11-17)
- Modify: `src/components/tasting-plan/BlindGuessCard.tsx` (reveal block :149-158)
- Modify: `src/lib/session-recap.ts` (`PerWineRecap` :12-29, projection :264-296)
- Modify: `src/components/session-history/WineRecapCard.tsx`

---

### Task 30: Write the failing price-bucket verification script (TDD)

- [ ] **Step 1: Create `scripts/verify-price-buckets.ts` asserting the NEW buckets.** This imports the not-yet-changed module so it fails first. Write the file:

```ts
/**
 * Verifies the new global price buckets and priceToBucket thresholds.
 * Run: npx tsx scripts/verify-price-buckets.ts
 */
import assert from 'node:assert/strict'
import {
  PRICE_BUCKETS,
  priceToBucket,
  priceBucketLabel,
  type PriceBucket,
} from '../src/lib/blind-guess-vocab'

// 1. The six bucket values + labels, in order.
const expectedBuckets: ReadonlyArray<{ value: PriceBucket; label: string }> = [
  { value: '0_99', label: 'Under 100 kr' },
  { value: '100_149', label: '100–149 kr' },
  { value: '150_199', label: '150–199 kr' },
  { value: '200_249', label: '200–249 kr' },
  { value: '250_299', label: '250–299 kr' },
  { value: '300_plus', label: '300+ kr' },
]
assert.deepEqual(
  PRICE_BUCKETS.map((b) => ({ value: b.value, label: b.label })),
  expectedBuckets,
  'PRICE_BUCKETS values/labels must match the new six-bucket set in order',
)

// 2. priceToBucket thresholds: <100, <150, <200, <250, <300, else 300_plus.
const cases: Array<[number, PriceBucket]> = [
  [0, '0_99'],
  [99, '0_99'],
  [100, '100_149'],
  [149, '100_149'],
  [150, '150_199'],
  [199, '150_199'],
  [200, '200_249'],
  [249, '200_249'],
  [250, '250_299'],
  [299, '250_299'],
  [300, '300_plus'],
  [9999, '300_plus'],
]
for (const [price, expected] of cases) {
  assert.equal(priceToBucket(price), expected, `priceToBucket(${price}) → ${expected}`)
}

// 3. Missing / negative → null.
assert.equal(priceToBucket(null), null, 'priceToBucket(null) → null')
assert.equal(priceToBucket(undefined), null, 'priceToBucket(undefined) → null')
assert.equal(priceToBucket(-1), null, 'priceToBucket(-1) → null')
assert.equal(priceToBucket(Number.NaN), null, 'priceToBucket(NaN) → null')

// 4. priceBucketLabel round-trip.
assert.equal(priceBucketLabel('0_99'), 'Under 100 kr')
assert.equal(priceBucketLabel('300_plus'), '300+ kr')
assert.equal(priceBucketLabel(null), null)
assert.equal(priceBucketLabel('under_100' as PriceBucket), null, 'old value no longer recognized')

console.log('OK')
```

- [ ] **Step 2: Run it and confirm it FAILS** (because `blind-guess-vocab.ts` still has the old buckets):

```
npx tsx scripts/verify-price-buckets.ts
```

Expected: a non-zero exit with an `AssertionError` (the first `deepEqual` fails — `PRICE_BUCKETS` still lists `under_100`/`100_200`/…).

---

### Task 31: Implement the new buckets in `src/lib/blind-guess-vocab.ts`

- [ ] **Step 1: Replace the `PriceBucket` type (current :29-34).** Current:

```ts
export type PriceBucket =
  | 'under_100'
  | '100_200'
  | '200_300'
  | '300_500'
  | '500_plus'
```

New:

```ts
export type PriceBucket =
  | '0_99'
  | '100_149'
  | '150_199'
  | '200_249'
  | '250_299'
  | '300_plus'
```

- [ ] **Step 2: Replace `PRICE_BUCKETS` (current :36-42).** Current:

```ts
export const PRICE_BUCKETS: ReadonlyArray<{ value: PriceBucket; label: string }> = [
  { value: 'under_100', label: 'Under 100 kr' },
  { value: '100_200', label: '100–200 kr' },
  { value: '200_300', label: '200–300 kr' },
  { value: '300_500', label: '300–500 kr' },
  { value: '500_plus', label: '500+ kr' },
]
```

New:

```ts
export const PRICE_BUCKETS: ReadonlyArray<{ value: PriceBucket; label: string }> = [
  { value: '0_99', label: 'Under 100 kr' },
  { value: '100_149', label: '100–149 kr' },
  { value: '150_199', label: '150–199 kr' },
  { value: '200_249', label: '200–249 kr' },
  { value: '250_299', label: '250–299 kr' },
  { value: '300_plus', label: '300+ kr' },
]
```

- [ ] **Step 3: Replace the `priceToBucket` thresholds (current :47-54).** Current:

```ts
export function priceToBucket(priceSek: number | null | undefined): PriceBucket | null {
  if (priceSek == null || !Number.isFinite(priceSek) || priceSek < 0) return null
  if (priceSek < 100) return 'under_100'
  if (priceSek < 200) return '100_200'
  if (priceSek < 300) return '200_300'
  if (priceSek < 500) return '300_500'
  return '500_plus'
}
```

New:

```ts
export function priceToBucket(priceSek: number | null | undefined): PriceBucket | null {
  if (priceSek == null || !Number.isFinite(priceSek) || priceSek < 0) return null
  if (priceSek < 100) return '0_99'
  if (priceSek < 150) return '100_149'
  if (priceSek < 200) return '150_199'
  if (priceSek < 250) return '200_249'
  if (priceSek < 300) return '250_299'
  return '300_plus'
}
```

- [ ] **Step 4: Re-run the verification script and confirm it PASSES:**

```
npx tsx scripts/verify-price-buckets.ts
```

Expected output: `OK` (exit 0).

- [ ] **Step 5: Commit.**

```
git add src/lib/blind-guess-vocab.ts scripts/verify-price-buckets.ts
git commit -m "price: new six-bucket price scale (0–99 … 300+) in blind-guess-vocab"
```

---

### Task 32: Mirror the new enum values in the three duplicates + regenerate types

- [ ] **Step 1: `src/collections/SessionGuesses.ts` (current :61-67).** Current:

```ts
      options: [
        { label: 'Under 100 kr', value: 'under_100' },
        { label: '100–200 kr', value: '100_200' },
        { label: '200–300 kr', value: '200_300' },
        { label: '300–500 kr', value: '300_500' },
        { label: '500+ kr', value: '500_plus' },
      ],
```

New:

```ts
      options: [
        { label: 'Under 100 kr', value: '0_99' },
        { label: '100–149 kr', value: '100_149' },
        { label: '150–199 kr', value: '150_199' },
        { label: '200–249 kr', value: '200_249' },
        { label: '250–299 kr', value: '250_299' },
        { label: '300+ kr', value: '300_plus' },
      ],
```

- [ ] **Step 2: `src/collections/TastingPlans.ts` (current :158-164).** Current:

```ts
          options: [
            { label: 'Under 100 kr', value: 'under_100' },
            { label: '100–200 kr', value: '100_200' },
            { label: '200–300 kr', value: '200_300' },
            { label: '300–500 kr', value: '300_500' },
            { label: '500+ kr', value: '500_plus' },
          ],
```

New:

```ts
          options: [
            { label: 'Under 100 kr', value: '0_99' },
            { label: '100–149 kr', value: '100_149' },
            { label: '150–199 kr', value: '150_199' },
            { label: '200–249 kr', value: '200_249' },
            { label: '250–299 kr', value: '250_299' },
            { label: '300+ kr', value: '300_plus' },
          ],
```

- [ ] **Step 3: `src/app/api/session-guesses/route.ts` POST allowlist (current :11-17).** Current:

```ts
const PRICE_BUCKETS: ReadonlyArray<PriceBucket> = [
  'under_100',
  '100_200',
  '200_300',
  '300_500',
  '500_plus',
]
```

New:

```ts
const PRICE_BUCKETS: ReadonlyArray<PriceBucket> = [
  '0_99',
  '100_149',
  '150_199',
  '200_249',
  '250_299',
  '300_plus',
]
```

- [ ] **Step 4: Regenerate Payload types** (the two `*_price_bucket` union types in `src/payload-types.ts` change):

```
pnpm generate:types
```

- [ ] **Step 5: Confirm the new unions landed in `src/payload-types.ts`** (should show `'0_99' | '100_149' | ...`, no `under_100`):

```
grep -n "0_99\|under_100" src/payload-types.ts
```

Expected: lines containing `'0_99'`; no remaining `under_100`.

- [ ] **Step 6: Lint.**

```
pnpm lint
```

Expected: no new errors from the touched files.

- [ ] **Step 7: Commit.**

```
git add src/collections/SessionGuesses.ts src/collections/TastingPlans.ts src/app/api/session-guesses/route.ts src/payload-types.ts
git commit -m "price: mirror new six-bucket enum across SessionGuesses, TastingPlans, session-guesses route + regenerate types"
```

---

### Task 33: Add a pure-function verify script for the remap, then implement the remap function

- [ ] **Step 1: Create `scripts/verify-price-remap.ts` (write FIRST — will fail to import `remapLegacyPriceBucket`).**

```ts
/**
 * Verifies the legacy → new price-bucket remap used by the enum migration.
 * Run: npx tsx scripts/verify-price-remap.ts
 */
import assert from 'node:assert/strict'
import {
  remapLegacyPriceBucket,
  type PriceBucket,
} from '../src/lib/blind-guess-vocab'

const cases: Array<[string, PriceBucket | null]> = [
  ['under_100', '0_99'],   // exact
  ['100_200', '100_149'],  // lossy split → lower sub-bucket
  ['200_300', '200_249'],  // lossy split → lower sub-bucket
  ['300_500', '300_plus'], // merged
  ['500_plus', '300_plus'], // merged
  // Already-new values pass through unchanged (idempotent re-runs).
  ['0_99', '0_99'],
  ['300_plus', '300_plus'],
  // Garbage → null (migration leaves such rows as NULL).
  ['nonsense', null],
  ['', null],
]
for (const [legacy, expected] of cases) {
  assert.equal(
    remapLegacyPriceBucket(legacy),
    expected,
    `remapLegacyPriceBucket(${JSON.stringify(legacy)}) → ${JSON.stringify(expected)}`,
  )
}

console.log('OK')
```

- [ ] **Step 2: Run it and confirm it FAILS** (export does not exist yet):

```
npx tsx scripts/verify-price-remap.ts
```

Expected: non-zero exit, `SyntaxError`/`TypeError` about `remapLegacyPriceBucket` not being exported.

- [ ] **Step 3: Add `remapLegacyPriceBucket` to `src/lib/blind-guess-vocab.ts`** (append after `priceBucketLabel`, before `normalizeAnswer`). The mapping is the single source of truth the SQL migration mirrors:

```ts
/**
 * Map a legacy (pre-2026-05-30) price bucket value to the new six-bucket scale.
 * Used by the enum migration's row remap. Lossy on the wide split buckets
 * (100_200 / 200_300) — defaults to the lower sub-bucket per the spec.
 * New values pass through unchanged so re-runs are idempotent; unknown → null.
 */
export function remapLegacyPriceBucket(value: string | null | undefined): PriceBucket | null {
  switch (value) {
    case 'under_100':
      return '0_99'
    case '100_200':
      return '100_149'
    case '200_300':
      return '200_249'
    case '300_500':
    case '500_plus':
      return '300_plus'
    case '0_99':
    case '100_149':
    case '150_199':
    case '200_249':
    case '250_299':
    case '300_plus':
      return value
    default:
      return null
  }
}
```

- [ ] **Step 4: Re-run and confirm it PASSES:**

```
npx tsx scripts/verify-price-remap.ts
```

Expected output: `OK`.

- [ ] **Step 5: Commit.**

```
git add src/lib/blind-guess-vocab.ts scripts/verify-price-remap.ts
git commit -m "price: add remapLegacyPriceBucket helper + verify script for migration remap"
```

---

### Task 34: Generate and author the Postgres enum migration with best-effort remap

The origin migration `src/migrations/20260517_090445.ts:5-6` created both enum types directly with `CREATE TYPE`. Postgres cannot drop in-use enum *values*, so the new migration recreates each enum type and remaps existing rows. The remap table mirrors `remapLegacyPriceBucket`.

- [ ] **Step 1: Generate the migration shell** (this writes a timestamped file and updates `src/migrations/index.ts`):

```
pnpm migrate:create -- "price_buckets_v2"
```

Note the generated filename (e.g. `src/migrations/20260530_120000_price_buckets_v2.ts`). Because there is no Drizzle schema diff for an enum *value* change, the generated `up`/`down` will be near-empty — replace their bodies entirely in Step 2.

- [ ] **Step 2: Replace the generated migration file body** with the recreate-and-remap SQL. The pattern for each enum: add a temporary `varchar` column / cast the column to text, drop the old type, create the new type, remap text values, then cast back. The two affected columns are `session_guesses.guessed_price_bucket` (type `enum_session_guesses_guessed_price_bucket`) and `tasting_plans_wines.blind_answer_price_bucket` (type `enum_tasting_plans_wines_blind_answer_price_bucket`).

```ts
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  -- ── session_guesses.guessed_price_bucket ──────────────────────────────
  -- 1. Detach the column from the old enum type (cast to text).
  ALTER TABLE "session_guesses"
    ALTER COLUMN "guessed_price_bucket" TYPE varchar
    USING "guessed_price_bucket"::varchar;

  -- 2. Remap legacy values in place (lossy split → lower sub-bucket).
  UPDATE "session_guesses" SET "guessed_price_bucket" = CASE "guessed_price_bucket"
    WHEN 'under_100' THEN '0_99'
    WHEN '100_200'  THEN '100_149'
    WHEN '200_300'  THEN '200_249'
    WHEN '300_500'  THEN '300_plus'
    WHEN '500_plus' THEN '300_plus'
    ELSE "guessed_price_bucket"
  END
  WHERE "guessed_price_bucket" IS NOT NULL;

  -- 3. Null out anything that still isn't a valid new value (defensive).
  UPDATE "session_guesses" SET "guessed_price_bucket" = NULL
  WHERE "guessed_price_bucket" IS NOT NULL
    AND "guessed_price_bucket" NOT IN ('0_99','100_149','150_199','200_249','250_299','300_plus');

  -- 4. Recreate the enum type with the new values.
  DROP TYPE "public"."enum_session_guesses_guessed_price_bucket";
  CREATE TYPE "public"."enum_session_guesses_guessed_price_bucket"
    AS ENUM('0_99','100_149','150_199','200_249','250_299','300_plus');

  -- 5. Re-attach the column to the new enum type.
  ALTER TABLE "session_guesses"
    ALTER COLUMN "guessed_price_bucket" TYPE "public"."enum_session_guesses_guessed_price_bucket"
    USING "guessed_price_bucket"::"public"."enum_session_guesses_guessed_price_bucket";

  -- ── tasting_plans_wines.blind_answer_price_bucket ─────────────────────
  ALTER TABLE "tasting_plans_wines"
    ALTER COLUMN "blind_answer_price_bucket" TYPE varchar
    USING "blind_answer_price_bucket"::varchar;

  UPDATE "tasting_plans_wines" SET "blind_answer_price_bucket" = CASE "blind_answer_price_bucket"
    WHEN 'under_100' THEN '0_99'
    WHEN '100_200'  THEN '100_149'
    WHEN '200_300'  THEN '200_249'
    WHEN '300_500'  THEN '300_plus'
    WHEN '500_plus' THEN '300_plus'
    ELSE "blind_answer_price_bucket"
  END
  WHERE "blind_answer_price_bucket" IS NOT NULL;

  UPDATE "tasting_plans_wines" SET "blind_answer_price_bucket" = NULL
  WHERE "blind_answer_price_bucket" IS NOT NULL
    AND "blind_answer_price_bucket" NOT IN ('0_99','100_149','150_199','200_249','250_299','300_plus');

  DROP TYPE "public"."enum_tasting_plans_wines_blind_answer_price_bucket";
  CREATE TYPE "public"."enum_tasting_plans_wines_blind_answer_price_bucket"
    AS ENUM('0_99','100_149','150_199','200_249','250_299','300_plus');

  ALTER TABLE "tasting_plans_wines"
    ALTER COLUMN "blind_answer_price_bucket" TYPE "public"."enum_tasting_plans_wines_blind_answer_price_bucket"
    USING "blind_answer_price_bucket"::"public"."enum_tasting_plans_wines_blind_answer_price_bucket";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  -- Reverse: recreate the legacy enums and best-effort remap new → old.
  -- (Lossy splits can't be un-split; new sub-buckets fold back to the wide bucket.)
  ALTER TABLE "session_guesses"
    ALTER COLUMN "guessed_price_bucket" TYPE varchar
    USING "guessed_price_bucket"::varchar;

  UPDATE "session_guesses" SET "guessed_price_bucket" = CASE "guessed_price_bucket"
    WHEN '0_99'     THEN 'under_100'
    WHEN '100_149'  THEN '100_200'
    WHEN '150_199'  THEN '100_200'
    WHEN '200_249'  THEN '200_300'
    WHEN '250_299'  THEN '200_300'
    WHEN '300_plus' THEN '300_500'
    ELSE "guessed_price_bucket"
  END
  WHERE "guessed_price_bucket" IS NOT NULL;

  DROP TYPE "public"."enum_session_guesses_guessed_price_bucket";
  CREATE TYPE "public"."enum_session_guesses_guessed_price_bucket"
    AS ENUM('under_100','100_200','200_300','300_500','500_plus');

  ALTER TABLE "session_guesses"
    ALTER COLUMN "guessed_price_bucket" TYPE "public"."enum_session_guesses_guessed_price_bucket"
    USING "guessed_price_bucket"::"public"."enum_session_guesses_guessed_price_bucket";

  ALTER TABLE "tasting_plans_wines"
    ALTER COLUMN "blind_answer_price_bucket" TYPE varchar
    USING "blind_answer_price_bucket"::varchar;

  UPDATE "tasting_plans_wines" SET "blind_answer_price_bucket" = CASE "blind_answer_price_bucket"
    WHEN '0_99'     THEN 'under_100'
    WHEN '100_149'  THEN '100_200'
    WHEN '150_199'  THEN '100_200'
    WHEN '200_249'  THEN '200_300'
    WHEN '250_299'  THEN '200_300'
    WHEN '300_plus' THEN '300_500'
    ELSE "blind_answer_price_bucket"
  END
  WHERE "blind_answer_price_bucket" IS NOT NULL;

  DROP TYPE "public"."enum_tasting_plans_wines_blind_answer_price_bucket";
  CREATE TYPE "public"."enum_tasting_plans_wines_blind_answer_price_bucket"
    AS ENUM('under_100','100_200','200_300','300_500','500_plus');

  ALTER TABLE "tasting_plans_wines"
    ALTER COLUMN "blind_answer_price_bucket" TYPE "public"."enum_tasting_plans_wines_blind_answer_price_bucket"
    USING "blind_answer_price_bucket"::"public"."enum_tasting_plans_wines_blind_answer_price_bucket";
  `)
}
```

- [ ] **Step 3: Confirm `src/migrations/index.ts` got the new import + array entry appended** (it should auto-insert at the bottom, after `20260519_201730`). If `pnpm migrate:create` did not append it (because the body was empty), add manually, e.g.:

```ts
import * as migration_20260530_120000_price_buckets_v2 from './20260530_120000_price_buckets_v2';
```

and at the end of the `migrations` array:

```ts
  {
    up: migration_20260530_120000_price_buckets_v2.up,
    down: migration_20260530_120000_price_buckets_v2.down,
    name: '20260530_120000_price_buckets_v2',
  },
```

- [ ] **Step 4: Dry-run against a COPY of the DB (never prod directly).** Staging Neon is the safe target (per MEMORY: `ep-purple-night` = staging). Branch a throwaway copy and run the migration against it:

```
# 1. Create a Neon branch off staging as a disposable copy:
#    neonctl branches create --name price-buckets-dryrun --parent <staging-branch>
# 2. Point a one-off env at the branch's connection string:
DATABASE_URI='postgres://<branch-conn-string>' pnpm payload migrate
# 3. Spot-check the remap on the copy:
DATABASE_URI='postgres://<branch-conn-string>' \
  psql "$DATABASE_URI" -c "SELECT DISTINCT guessed_price_bucket FROM session_guesses;" \
  -c "SELECT DISTINCT blind_answer_price_bucket FROM tasting_plans_wines;"
# 4. Confirm only new values appear (0_99,100_149,150_199,200_249,250_299,300_plus); no under_100/100_200/etc.
# 5. Delete the throwaway branch when done:
#    neonctl branches delete price-buckets-dryrun
```

Expected: migrate completes without error; the `SELECT DISTINCT` output contains only the six new values (or NULL); zero legacy values remain.

- [ ] **Step 5: Commit.**

```
git add src/migrations/
git commit -m "price: enum migration recreating both price-bucket types + best-effort legacy remap"
```

---

### Task 35: Show the exact kronor price at reveal in `BlindGuessCard.tsx`

The reveal block at `:149-158` renders only the bucket label and uses `answer.priceBucket ?? null` for the "rätt" answer. We switch to `resolveAnswerPriceBucket(answer)` (already imported pattern in scoring) so the highlighted bucket is correct even when only `priceSek` is set, and add an exact-price line. (Workstream C owns this reveal-block region; Workstream A owns the submit/persistence rewrite elsewhere in this file.)

- [ ] **Step 1: Extend the scoring import to include `resolveAnswerPriceBucket` (current :21).** Current:

```ts
import { scoreOne, type BlindAnswer } from '@/lib/blind-guess-scoring'
```

New:

```ts
import { scoreOne, resolveAnswerPriceBucket, type BlindAnswer } from '@/lib/blind-guess-scoring'
```

- [ ] **Step 2: Replace the price `Row` in the reveal block (current :149-158)** so the answer reflects the resolved bucket (handles `priceSek`-only wines):

Current:

```tsx
          {scored.priceScored && (
            <Row
              correct={scored.priceCorrect}
              label="Pris"
              guess={priceBucketLabel(submitted.priceBucket)}
              answer={priceBucketLabel(
                answer.priceBucket ?? null,
              )}
            />
          )}
        </div>
```

New:

```tsx
          {scored.priceScored && (
            <Row
              correct={scored.priceCorrect}
              label="Pris"
              guess={priceBucketLabel(submitted.priceBucket)}
              answer={priceBucketLabel(resolveAnswerPriceBucket(answer))}
            />
          )}
        </div>
        {typeof answer.priceSek === 'number' && (
          <p className="pt-1 text-sm">
            <span className="text-muted-foreground">Pris:</span>{' '}
            <span className="font-medium text-foreground">{answer.priceSek} kr</span>
            {priceBucketLabel(resolveAnswerPriceBucket(answer)) && (
              <span className="ml-2 inline-flex items-center rounded-full bg-brand-400/10 text-brand-400 px-2 py-0.5 text-xs font-medium">
                {priceBucketLabel(resolveAnswerPriceBucket(answer))}
              </span>
            )}
          </p>
        )}
```

- [ ] **Step 3: Lint.**

```
pnpm lint
```

Expected: no new errors. Note `priceBucketLabel` and `PRICE_BUCKETS` are already imported at the top of the file (:14-19), so no import churn beyond Step 1.

- [ ] **Step 4: MANUAL QA.** With `pnpm dev`: start a blind tasting where one wine has a known SEK price (library wine with `price`, or custom wine with `priceSek`). As a guest, submit a price-bucket guess, then have the host reveal that pour. Expected on the guest card: the scored "Pris:" row shows your bucket vs the resolved correct bucket, and below it a new line "Pris: 189 kr" with the matching bucket chip highlighted in brand color.

- [ ] **Step 5: Commit.**

```
git add src/components/tasting-plan/BlindGuessCard.tsx
git commit -m "price: show exact kronor price + highlighted bucket at reveal on BlindGuessCard"
```

---

### Task 36: Add `priceSek` to the recap and render it in `WineRecapCard`

Surface the exact price to everyone in the post-reveal recap. The recap projection already resolves library `price` and custom `priceSek` inside the blind-leaderboard block (`session-recap.ts:372-396`); we lift that resolution into the per-wine projection so it is available regardless of whether the session was blind.

- [ ] **Step 1: Add `priceSek` to the `PerWineRecap` interface (current :12-29).** Current ends:

```ts
  topFlavours: Array<{ label: string; count: number }>
  myReview: {
    rating: number | null
    flavours: string[]
    reviewText: string | null
  } | null
}
```

New (insert `priceSek` before `topFlavours`):

```ts
  /** Exact SEK price of the wine, resolved from library `price` or custom `priceSek`. `null` when unknown. */
  priceSek: number | null
  topFlavours: Array<{ label: string; count: number }>
  myReview: {
    rating: number | null
    flavours: string[]
    reviewText: string | null
  } | null
}
```

- [ ] **Step 2: Resolve and emit `priceSek` in the per-wine projection (current :264-296).** Add a price resolution inside the `wines.map` and include it in the returned object. Current `map` head:

```ts
  const perWine: PerWineRecap[] = wines.map((w, idx) => {
    const pourOrder = w.pourOrder ?? idx + 1
    const titleInfo = wineTitle(w)
    const acc = accs.get(pourOrder)
```

New (add price resolution after `titleInfo`):

```ts
  const perWine: PerWineRecap[] = wines.map((w, idx) => {
    const pourOrder = w.pourOrder ?? idx + 1
    const titleInfo = wineTitle(w)
    const lib = w.libraryWine && typeof w.libraryWine === 'object' ? (w.libraryWine as Wine) : null
    const libPrice =
      lib && typeof (lib as { price?: number }).price === 'number'
        ? ((lib as { price?: number }).price as number)
        : null
    const custPrice =
      !lib && w.customWine && typeof w.customWine.priceSek === 'number'
        ? w.customWine.priceSek
        : null
    const priceSek = libPrice ?? custPrice
    const acc = accs.get(pourOrder)
```

Then in the returned object literal (current ends with `topFlavours: top,` / `myReview: acc?.myReview ?? null,`), add `priceSek`:

Current:

```ts
    return {
      pourOrder,
      title: titleInfo.title,
      subtitle: titleInfo.subtitle,
      thumbUrl: titleInfo.thumbUrl,
      isCustomWine: titleInfo.isCustomWine,
      ratingCount,
      avgRating,
      ratingStdDev,
      topFlavours: top,
      myReview: acc?.myReview ?? null,
    }
  })
```

New:

```ts
    return {
      pourOrder,
      title: titleInfo.title,
      subtitle: titleInfo.subtitle,
      thumbUrl: titleInfo.thumbUrl,
      isCustomWine: titleInfo.isCustomWine,
      priceSek,
      ratingCount,
      avgRating,
      ratingStdDev,
      topFlavours: top,
      myReview: acc?.myReview ?? null,
    }
  })
```

- [ ] **Step 3: Render the price in `WineRecapCard.tsx`.** Add it under the wine title/subtitle block (current :56-61). Current:

```tsx
        <div className="flex-1 min-w-0 pt-1">
          <p className="text-sm sm:text-base font-medium truncate">{wine.title}</p>
          {wine.subtitle && (
            <p className="text-xs text-muted-foreground truncate">{wine.subtitle}</p>
          )}
        </div>
```

New:

```tsx
        <div className="flex-1 min-w-0 pt-1">
          <p className="text-sm sm:text-base font-medium truncate">{wine.title}</p>
          {wine.subtitle && (
            <p className="text-xs text-muted-foreground truncate">{wine.subtitle}</p>
          )}
          {wine.priceSek != null && (
            <p className="text-xs text-foreground font-medium pt-0.5">{wine.priceSek} kr</p>
          )}
        </div>
```

- [ ] **Step 4: Lint.**

```
pnpm lint
```

Expected: no new errors. `Wine` is already imported in `session-recap.ts:2`; `PerWineRecap` is already imported in `WineRecapCard.tsx:8`.

- [ ] **Step 5: MANUAL QA.** With `pnpm dev`, open a finished session's recap (`mina-sidor` / session history) where at least one wine has a known price. Expected: each wine card shows "189 kr" under the wine name/subtitle, visible to everyone (host and guests), not gated on having submitted.

- [ ] **Step 6: Commit.**

```
git add src/lib/session-recap.ts src/components/session-history/WineRecapCard.tsx
git commit -m "price: surface exact wine price (priceSek) in recap PerWineRecap + WineRecapCard"
```

---

Notes for the assembler:
- This workstream is self-contained (one migration), per the spec's phasing.
- Shared-file boundary respected: in `BlindGuessCard.tsx` only the reveal-block price rendering (~:149-158) and (already-present) price `<Select>` imports are touched — Workstream A owns the submit/persistence rewrite in the same file.
- `resolveAnswerPriceBucket` (from `src/lib/blind-guess-scoring.ts:48`) and `answer.priceSek` (`blind-guess-scoring.ts:24`) already exist; no new scoring API invented.

---

## Workstream D — Host "who-submitted" tracker + reveal guard

Adds a status-only `submissions` SSE event (per pour order: which `SessionParticipant` ids have content vs. are locked in), wires it into `SessionContext.submissionsByPour` via `RealtimeSync`, renders a per-participant ✓/✎/— tracker against the live roster on the host's focused wine, and guards the reveal control with a confirm dialog when online participants are still missing an entry. Depends on Workstream A's nullable `submittedAt` field on `SessionGuesses` + `Reviews` (and its identity work — not edited here).

**Files**
- Modify `src/app/api/sessions/[sessionId]/stream/route.ts` (add `buildSubmissions` aggregator + `submissions` event + its poller + cleanup; mirrors the swarm block at `:317-418` and the cleanup at `:426-437`)
- Modify `src/context/SessionContext.tsx` (add `SubmissionsByPour` type + `submissionsByPour` state/value at the roster region `:20-33`, `:66-70`, `:95`, `:283-307`)
- Modify `src/components/course/RealtimeSync.tsx` (add `submissions` listener + `setSubmissionsByPour` dep, alongside `roster`/`swarm` at `:71-92`, `:101-112`)
- Modify `src/components/tasting-plan/PlanSessionContent.tsx` (read `submissionsByPour` from context `:268-275`; render a host status panel on the focused wine; wrap `revealWine` `:379-396` / the "Avslöja vin" button `:508-518` with a reveal-guard `AlertDialog`)
- Create `scripts/verify-submission-status.ts` (pure-logic assertion for the `hasContent` / `locked` row-classification helper)
- Create `src/lib/session-submission-status.ts` (extracted pure helper imported by both the stream route and the verify script)

> Shared-file note: Workstream A owns `SessionContext`'s `connectionState` addition and the `submittedAt` collection fields; this section only adds `submissionsByPour` (named per the cross-cutting contract). Both additions are independent object-literal/state entries — reference, don't duplicate, A's lines.

---

### Task 40: Extract + test the pure row-classification helper

The aggregator must decide, per row, whether it "has content" (any field set) and whether it's "locked" (`submittedAt` set). Extracting it as a pure function lets us TDD it without a DB.

- [ ] **Step 1: Write the failing verify script first.** Create `scripts/verify-submission-status.ts`:

```ts
import assert from 'node:assert/strict'
import {
  guessHasContent,
  reviewHasContent,
  isLocked,
} from '../src/lib/session-submission-status'

// guessHasContent — any one field counts
assert.equal(guessHasContent({ guessedCountry: 'Frankrike' }), true)
assert.equal(guessHasContent({ guessedGrape: 'Pinot Noir' }), true)
assert.equal(guessHasContent({ guessedPriceBucket: '100_149' }), true)
assert.equal(guessHasContent({ guessedCountry: '  ' }), false, 'whitespace is empty')
assert.equal(guessHasContent({}), false)
assert.equal(guessHasContent({ guessedCountry: null, guessedGrape: null }), false)

// reviewHasContent — rating, text, or any wset palate flavour tier
assert.equal(reviewHasContent({ rating: 4 }), true)
assert.equal(reviewHasContent({ reviewText: 'gott' }), true)
assert.equal(
  reviewHasContent({ wsetTasting: { palate: { primaryFlavours: ['Körsbär'] } } }),
  true,
)
assert.equal(
  reviewHasContent({ wsetTasting: { palate: { secondaryFlavours: ['Vanilj'] } } }),
  true,
)
assert.equal(reviewHasContent({ reviewText: '   ' }), false, 'whitespace text is empty')
assert.equal(reviewHasContent({}), false)
assert.equal(reviewHasContent({ rating: null, reviewText: null }), false)

// isLocked — submittedAt presence only (NULL = draft)
assert.equal(isLocked({ submittedAt: '2026-05-30T10:00:00.000Z' }), true)
assert.equal(isLocked({ submittedAt: null }), false)
assert.equal(isLocked({}), false)

console.log('OK')
```

Run it to confirm it fails (module missing):

```
npx tsx scripts/verify-submission-status.ts
```

Expected: it throws `Cannot find module '../src/lib/session-submission-status'` (non-zero exit). This is the red state.

- [ ] **Step 2: Implement the helper.** Create `src/lib/session-submission-status.ts`:

```ts
/**
 * Pure row-classification helpers for the host "who-submitted" tracker.
 *
 * Used by the SSE `submissions` aggregator (`src/app/api/sessions/[sessionId]/
 * stream/route.ts`). NEVER returns guess/answer content — only booleans —
 * so blind guesses stay secret until reveal.
 *
 * "Has content"  = any single answer field is set (matches the recap's
 *                  "any saved field counts as a submission" rule).
 * "Locked"       = `submittedAt` is set (the explicit "Lås in" action from
 *                  Workstream A). NULL submittedAt = draft.
 */

const isNonEmptyString = (v: unknown): boolean =>
  typeof v === 'string' && v.trim().length > 0

export function guessHasContent(g: {
  guessedCountry?: string | null
  guessedGrape?: string | null
  guessedPriceBucket?: string | null
}): boolean {
  return (
    isNonEmptyString(g.guessedCountry) ||
    isNonEmptyString(g.guessedGrape) ||
    isNonEmptyString(g.guessedPriceBucket)
  )
}

export function reviewHasContent(r: {
  rating?: number | null
  reviewText?: string | null
  wsetTasting?: {
    palate?: {
      primaryFlavours?: unknown
      secondaryFlavours?: unknown
      tertiaryFlavours?: unknown
    } | null
  } | null
}): boolean {
  if (typeof r.rating === 'number') return true
  if (isNonEmptyString(r.reviewText)) return true
  const palate = r.wsetTasting?.palate
  for (const source of [
    palate?.primaryFlavours,
    palate?.secondaryFlavours,
    palate?.tertiaryFlavours,
  ]) {
    if (Array.isArray(source) && source.some((x) => isNonEmptyString(x))) return true
  }
  return false
}

export function isLocked(row: { submittedAt?: string | null }): boolean {
  return isNonEmptyString(row.submittedAt)
}
```

- [ ] **Step 3: Re-run the verify script (green).**

```
npx tsx scripts/verify-submission-status.ts
```

Expected output: `OK` (exit 0).

- [ ] **Step 4: Commit.**

```
git add src/lib/session-submission-status.ts scripts/verify-submission-status.ts
git commit -m "otter: session submissions — pure has-content/locked classifier + verify script"
```

---

### Task 41: Emit the `submissions` SSE event from the stream route

Aggregate, per pour order, the set of `SessionParticipant` ids that have content (guess OR review row) and the subset that are locked (`submittedAt` set). Mirror the swarm block's structure exactly so it's reviewable. Content is never serialized — only id arrays.

> Depends on Workstream A having added the nullable `submittedAt` field to both `session-guesses` and `reviews` and run `pnpm generate:types`. The aggregator reads `submittedAt` via `overrideAccess: true` finds; if A hasn't landed yet, `submittedAt` is simply `undefined` and every row classifies as a draft (graceful — the tracker shows ✎ until A lands).

- [ ] **Step 1: Import the classifier.** In `src/app/api/sessions/[sessionId]/stream/route.ts`, the current imports (`:1-8`) are:

```ts
import { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { cookies } from 'next/headers'
import { PARTICIPANT_COOKIE } from '@/lib/sessions'
import { loggerFor } from '@/lib/logger'
import { buildPourMaps, resolvePourForReview } from '@/lib/session-pour-mapping'
import { computeLivePoints } from '@/lib/session-live-scores'
```

Replace with (adds the classifier import):

```ts
import { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { cookies } from 'next/headers'
import { PARTICIPANT_COOKIE } from '@/lib/sessions'
import { loggerFor } from '@/lib/logger'
import { buildPourMaps, resolvePourForReview } from '@/lib/session-pour-mapping'
import { computeLivePoints } from '@/lib/session-live-scores'
import {
  guessHasContent,
  reviewHasContent,
  isLocked,
} from '@/lib/session-submission-status'
```

- [ ] **Step 2: Add the `buildSubmissions` aggregator + initial frame + poller.** The current swarm-poller-to-heartbeat region (`:405-423`) is:

```ts
      let lastSwarmJson = JSON.stringify({ byPourOrder: {} })
      const initialSwarm = await buildSwarm()
      lastSwarmJson = JSON.stringify(initialSwarm)
      send('swarm', initialSwarm)

      const swarmPoll = setInterval(async () => {
        if (closed) return
        const next = await buildSwarm()
        const nextJson = JSON.stringify(next)
        if (nextJson !== lastSwarmJson) {
          lastSwarmJson = nextJson
          send('swarm', next)
        }
      }, LESSON_POLL_INTERVAL_MS)

      // Heartbeat
      const heartbeat = setInterval(() => {
        send('heartbeat', { ts: Date.now() })
      }, HEARTBEAT_INTERVAL_MS)
```

Replace with (inserts the submissions aggregator + its poller between swarm and heartbeat):

```ts
      let lastSwarmJson = JSON.stringify({ byPourOrder: {} })
      const initialSwarm = await buildSwarm()
      lastSwarmJson = JSON.stringify(initialSwarm)
      send('swarm', initialSwarm)

      const swarmPoll = setInterval(async () => {
        if (closed) return
        const next = await buildSwarm()
        const nextJson = JSON.stringify(next)
        if (nextJson !== lastSwarmJson) {
          lastSwarmJson = nextJson
          send('swarm', next)
        }
      }, LESSON_POLL_INTERVAL_MS)

      // ───── Submission-status aggregator (host tracker) ─────
      // Per pour order: which SessionParticipant ids have ANY content and
      // which have locked in (submittedAt set). STATUS ONLY — guess/answer
      // content is never serialized, so blind guesses stay secret.
      type SubmissionEntry = { withContent: number[]; locked: number[] }
      type SubmissionsPayload = { byPourOrder: Record<number, SubmissionEntry> }

      const buildSubmissions = async (): Promise<SubmissionsPayload> => {
        try {
          const session = await payload.findByID({
            collection: 'course-sessions',
            id: sessionId,
            depth: 2,
            overrideAccess: true,
          })
          if (!session?.tastingPlan || typeof session.tastingPlan !== 'object') {
            return { byPourOrder: {} }
          }
          const wines = ((session.tastingPlan as any).wines ?? []) as any[]
          const pourMaps = buildPourMaps(wines)

          // pour → { withContent:Set, locked:Set }. Resolve the participant id
          // for both guests (sessionParticipant) and the rare authed-user row
          // (we map user→participant once below).
          const acc: Record<number, { withContent: Set<number>; locked: Set<number> }> = {}
          const ensure = (pour: number) =>
            (acc[pour] ||= { withContent: new Set<number>(), locked: new Set<number>() })

          // Build a user-id → participant-id map so authed-user rows resolve to
          // the same roster id the host renders against.
          const partsRes = await payload.find({
            collection: 'session-participants',
            where: { session: { equals: sessionId } },
            limit: 500,
            depth: 0,
            overrideAccess: true,
          })
          const userToParticipant = new Map<number, number>()
          for (const p of partsRes.docs as any[]) {
            const uid = typeof p.user === 'object' && p.user ? p.user.id : p.user
            if (typeof uid === 'number') userToParticipant.set(uid, p.id)
          }
          const resolveParticipantId = (row: {
            sessionParticipant?: number | { id: number } | null
            user?: number | { id: number } | null
          }): number | null => {
            const sp = row.sessionParticipant
            if (sp != null) return typeof sp === 'object' ? sp.id : sp
            const u = row.user
            const uid = u != null ? (typeof u === 'object' ? u.id : u) : null
            return uid != null ? userToParticipant.get(uid) ?? null : null
          }

          // Guesses carry pourOrder directly.
          const guesses = await payload.find({
            collection: 'session-guesses',
            where: { session: { equals: sessionId } },
            limit: 1000,
            depth: 0,
            overrideAccess: true,
          })
          for (const g of guesses.docs as any[]) {
            const pour = typeof g.pourOrder === 'number' ? g.pourOrder : null
            if (pour == null) continue
            const pid = resolveParticipantId(g)
            if (pid == null) continue
            if (guessHasContent(g)) ensure(pour).withContent.add(pid)
            if (isLocked(g)) ensure(pour).locked.add(pid)
          }

          // Reviews map to a pour via the shared pour maps.
          const reviews = await payload.find({
            collection: 'reviews',
            where: { session: { equals: sessionId } },
            limit: 1000,
            depth: 0,
            overrideAccess: true,
          })
          for (const r of reviews.docs as any[]) {
            const pour = resolvePourForReview(r, pourMaps)
            if (pour == null) continue
            const pid = resolveParticipantId(r)
            if (pid == null) continue
            if (reviewHasContent(r)) ensure(pour).withContent.add(pid)
            if (isLocked(r)) ensure(pour).locked.add(pid)
          }

          const byPourOrder: Record<number, SubmissionEntry> = {}
          for (const [pourStr, sets] of Object.entries(acc)) {
            byPourOrder[Number(pourStr)] = {
              withContent: Array.from(sets.withContent).sort((a, b) => a - b),
              locked: Array.from(sets.locked).sort((a, b) => a - b),
            }
          }
          return { byPourOrder }
        } catch (err) {
          log.error({ err, sessionId }, 'sse_build_submissions_failed')
          return { byPourOrder: {} }
        }
      }

      let lastSubmissionsJson = JSON.stringify({ byPourOrder: {} })
      const initialSubmissions = await buildSubmissions()
      lastSubmissionsJson = JSON.stringify(initialSubmissions)
      send('submissions', initialSubmissions)

      const submissionsPoll = setInterval(async () => {
        if (closed) return
        const next = await buildSubmissions()
        const nextJson = JSON.stringify(next)
        if (nextJson !== lastSubmissionsJson) {
          lastSubmissionsJson = nextJson
          send('submissions', next)
        }
      }, LESSON_POLL_INTERVAL_MS)

      // Heartbeat
      const heartbeat = setInterval(() => {
        send('heartbeat', { ts: Date.now() })
      }, HEARTBEAT_INTERVAL_MS)
```

- [ ] **Step 3: Clear the new interval on abort.** The current cleanup block (`:426-437`) is:

```ts
      // Cleanup on client disconnect
      const onAbort = () => {
        closed = true
        clearInterval(lessonPoll)
        clearInterval(rosterPoll)
        clearInterval(swarmPoll)
        clearInterval(heartbeat)
        try {
          controller.close()
        } catch {
          // already closed
        }
      }
```

Replace with (adds `clearInterval(submissionsPoll)`):

```ts
      // Cleanup on client disconnect
      const onAbort = () => {
        closed = true
        clearInterval(lessonPoll)
        clearInterval(rosterPoll)
        clearInterval(swarmPoll)
        clearInterval(submissionsPoll)
        clearInterval(heartbeat)
        try {
          controller.close()
        } catch {
          // already closed
        }
      }
```

- [ ] **Step 4: Lint the route.**

```
pnpm lint
```

Expected: no new errors in `src/app/api/sessions/[sessionId]/stream/route.ts`.

- [ ] **Step 5: Commit.**

```
git add src/app/api/sessions/[sessionId]/stream/route.ts
git commit -m "otter: session stream — emit status-only submissions event per pour order"
```

---

### Task 42: Add `submissionsByPour` to SessionContext

Carry the new map in context so `RealtimeSync` can write it and `PlanSessionContent` can read it.

- [ ] **Step 1: Add the exported type next to `RosterEntry`.** The current end of the `RosterEntry` interface (`:20-33`) is:

```ts
export interface RosterEntry {
  id: number
  nickname: string
  currentLessonId: number | null
  isHost: boolean
  /** Cumulative points from blind-tasting guesses scored against revealed
   * wines. 0 on non-blind sessions or before the first reveal. */
  points: number
  /** Public profile slug — set only when the underlying user has `handle`
   * set AND `profilePublic: true`. Null for hosts/guests without a public
   * profile and for anonymous (cookie-only) participants. */
  profileHandle: string | null
}
```

> Note: `online` exists on `RosterEntry` between `isHost` and the `points` doc comment in the live file — it's elided from this anchor only because grep collapsed it; do not remove it. Add the new type immediately after the closing brace:

```ts
export interface RosterEntry {
  id: number
  nickname: string
  currentLessonId: number | null
  isHost: boolean
  online: boolean
  /** Cumulative points from blind-tasting guesses scored against revealed
   * wines. 0 on non-blind sessions or before the first reveal. */
  points: number
  /** Public profile slug — set only when the underlying user has `handle`
   * set AND `profilePublic: true`. Null for hosts/guests without a public
   * profile and for anonymous (cookie-only) participants. */
  profileHandle: string | null
}

/**
 * Status-only submission map keyed by pour order (host "who-submitted"
 * tracker). Arrays are SessionParticipant ids. NEVER carries guess/answer
 * content. Pushed by the SSE `submissions` event.
 */
export type SubmissionsByPour = Record<
  number,
  { withContent: number[]; locked: number[] }
>
```

- [ ] **Step 2: Add the context value entries.** The current `swarm` + `roster` region of `SessionContextValue` (`:56-67`) is:

```ts
  /** Plan-mode swarm aggregations keyed by pour order. */
  swarm: Record<
    number,
    {
      avgRating: number
      ratingCount: number
      aromaCounts: Array<{ label: string; count: number }>
    }
  >
  setSwarm: (s: SessionContextValue['swarm']) => void
  roster: RosterEntry[]
  setRoster: (r: RosterEntry[]) => void
```

Replace with (adds the `submissionsByPour` pair after `setRoster`):

```ts
  /** Plan-mode swarm aggregations keyed by pour order. */
  swarm: Record<
    number,
    {
      avgRating: number
      ratingCount: number
      aromaCounts: Array<{ label: string; count: number }>
    }
  >
  setSwarm: (s: SessionContextValue['swarm']) => void
  roster: RosterEntry[]
  setRoster: (r: RosterEntry[]) => void
  /** Plan-mode host "who-submitted" tracker — status only, keyed by pour
   * order. Pushed by the SSE `submissions` event. */
  submissionsByPour: SubmissionsByPour
  setSubmissionsByPour: (s: SubmissionsByPour) => void
```

- [ ] **Step 3: Add the state hook.** The current roster/status state region (`:95-96`) is:

```ts
  const [roster, setRoster] = useState<RosterEntry[]>([])
  const [sessionStatus, setSessionStatus] = useState<string | null>(null)
```

Replace with:

```ts
  const [roster, setRoster] = useState<RosterEntry[]>([])
  const [submissionsByPour, setSubmissionsByPour] = useState<SubmissionsByPour>({})
  const [sessionStatus, setSessionStatus] = useState<string | null>(null)
```

- [ ] **Step 4: Wire it into the value object.** The current `roster` → `sessionStatus` region of `value` (`:301-305`) is:

```ts
    swarm,
    setSwarm,
    roster,
    setRoster,
    sessionStatus,
    setSessionStatus,
```

Replace with:

```ts
    swarm,
    setSwarm,
    roster,
    setRoster,
    submissionsByPour,
    setSubmissionsByPour,
    sessionStatus,
    setSessionStatus,
```

- [ ] **Step 5: Lint.**

```
pnpm lint
```

Expected: no new errors in `src/context/SessionContext.tsx`.

- [ ] **Step 6: Commit.**

```
git add src/context/SessionContext.tsx
git commit -m "otter: session context — add submissionsByPour status map"
```

---

### Task 43: Handle the `submissions` event in RealtimeSync

Listen for the new SSE event and push it into `setSubmissionsByPour`, alongside the existing `roster`/`swarm` listeners.

- [ ] **Step 1: Pull the setter from context.** The current destructure (`:16-25`) is:

```ts
  const {
    setHostCurrentLessonId,
    setHostCurrentWinePourOrder,
    setHostFocusStartedAt,
    setRevealedPourOrders,
    setRoster,
    setSwarm,
    setSessionStatus,
    clearActiveSession,
  } = useActiveSession()
```

Replace with:

```ts
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
  } = useActiveSession()
```

- [ ] **Step 2: Add the listener after the `swarm` listener.** The current `swarm` listener + `heartbeat` listener (`:80-96`) is:

```ts
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

    es.addEventListener('heartbeat', () => {
      // No-op; the connection is alive. EventSource handles reconnection on drop.
    })
```

Replace with (inserts the `submissions` listener between swarm and heartbeat):

```ts
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
        const data = JSON.parse((e as MessageEvent).data) as {
          byPourOrder: Record<number, { withContent: number[]; locked: number[] }>
        }
        if (data?.byPourOrder) setSubmissionsByPour(data.byPourOrder)
      } catch {
        // ignore
      }
    })

    es.addEventListener('heartbeat', () => {
      // No-op; the connection is alive. EventSource handles reconnection on drop.
    })
```

- [ ] **Step 3: Add `setSubmissionsByPour` to the effect deps.** The current deps array (`:101-112`) is:

```ts
  }, [
    sessionId,
    setHostCurrentLessonId,
    setHostCurrentWinePourOrder,
    setHostFocusStartedAt,
    setRevealedPourOrders,
    setRoster,
    setSwarm,
    setSessionStatus,
    clearActiveSession,
    router,
  ])
```

Replace with:

```ts
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
    router,
  ])
```

- [ ] **Step 4: Lint.**

```
pnpm lint
```

Expected: no new errors in `src/components/course/RealtimeSync.tsx`.

- [ ] **Step 5: Commit.**

```
git add src/components/course/RealtimeSync.tsx
git commit -m "otter: realtime sync — handle submissions event into context"
```

---

### Task 44: Render the host "who-submitted" tracker on the focused wine

Against the live roster, show per-participant status for the focused pour: ✓ klar (locked) · ✎ utkast (has content, not locked) · — inget (nothing). Host-only; renders inside the active wine card.

- [ ] **Step 1: Read `submissionsByPour` from context.** The current `useActiveSession` destructure (`:268-275`) is:

```ts
  const {
    hostCurrentWinePourOrder,
    hostFocusStartedAt,
    revealedPourOrders,
    swarm,
    leaveSession,
    clearActiveSession,
  } = useActiveSession()
```

Replace with:

```ts
  const {
    hostCurrentWinePourOrder,
    hostFocusStartedAt,
    revealedPourOrders,
    swarm,
    submissionsByPour,
    roster,
    leaveSession,
    clearActiveSession,
  } = useActiveSession()
```

- [ ] **Step 2: Add the presenter component at the bottom of the file.** After the `NextWineButton` component (the final `}` closing it at `:683`), append a new component. It takes the focused pour's submission entry + the online non-host roster and renders the three-state list:

```ts
/**
 * Host-only per-participant submission tracker for the focused wine.
 * Status only — never shows guess/answer content. Renders against the live
 * roster (online, non-host participants).
 */
function HostSubmissionTracker({
  roster,
  entry,
}: {
  roster: RosterEntry[]
  entry: { withContent: number[]; locked: number[] } | undefined
}) {
  const withContent = new Set(entry?.withContent ?? [])
  const locked = new Set(entry?.locked ?? [])
  const guests = roster.filter((r) => !r.isHost && r.online)
  if (guests.length === 0) {
    return (
      <div className="mt-3 rounded-md border bg-muted/40 p-3">
        <p className="text-xs text-muted-foreground">Inga anslutna deltagare ännu.</p>
      </div>
    )
  }
  return (
    <div className="mt-3 rounded-md border bg-muted/40 p-3" data-tour="session-tracker">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Vem har svarat</p>
      <ul className="space-y-1">
        {guests.map((g) => {
          const isLockedIn = locked.has(g.id)
          const hasDraft = !isLockedIn && withContent.has(g.id)
          const { symbol, label, cls } = isLockedIn
            ? { symbol: '✓', label: 'klar', cls: 'text-green-600' }
            : hasDraft
              ? { symbol: '✎', label: 'utkast', cls: 'text-amber-600' }
              : { symbol: '—', label: 'inget', cls: 'text-muted-foreground' }
          return (
            <li key={g.id} className="flex items-center justify-between text-xs">
              <span className="truncate">{g.nickname}</span>
              <span className={`ml-2 flex-shrink-0 tabular-nums ${cls}`}>
                {symbol} {label}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
```

> `RosterEntry` is already imported indirectly via `useActiveSession`; add it to the existing type import. The current context import (`:32`) is `import { useActiveSession } from '@/context/SessionContext'` — change it to `import { useActiveSession, type RosterEntry } from '@/context/SessionContext'`.

- [ ] **Step 3: Apply the import change.** The current import line (`:32`) is:

```ts
import { useActiveSession } from '@/context/SessionContext'
```

Replace with:

```ts
import { useActiveSession, type RosterEntry } from '@/context/SessionContext'
```

- [ ] **Step 4: Render the tracker inside the active wine card.** The current host-controls block where the swarm renders for the host (`:540-556`) is:

```tsx
                        {isBlind && !isHost && (
                          <BlindGuessCard
                            sessionId={Number(session.id)}
                            pourOrder={row.pourOrder}
                            isRevealed={effectiveRevealed.has(row.pourOrder)}
                            answer={row.blindAnswer}
                            easyModeOptions={row.easyModeOptions}
                            initialGuess={(() => {
                              const g = myGuesses.get(row.pourOrder)
                              return g ?? null
                            })()}
                          />
                        )}

                        {shouldShowSwarm && <SwarmPanel entry={swarmEntry ?? null} />}
```

Replace with (renders the tracker for the host on the focused wine):

```tsx
                        {isBlind && !isHost && (
                          <BlindGuessCard
                            sessionId={Number(session.id)}
                            pourOrder={row.pourOrder}
                            isRevealed={effectiveRevealed.has(row.pourOrder)}
                            answer={row.blindAnswer}
                            easyModeOptions={row.easyModeOptions}
                            initialGuess={(() => {
                              const g = myGuesses.get(row.pourOrder)
                              return g ?? null
                            })()}
                          />
                        )}

                        {isHost && isActive && (
                          <HostSubmissionTracker
                            roster={roster}
                            entry={submissionsByPour[row.pourOrder]}
                          />
                        )}

                        {shouldShowSwarm && <SwarmPanel entry={swarmEntry ?? null} />}
```

- [ ] **Step 5: Lint.**

```
pnpm lint
```

Expected: no new errors in `src/components/tasting-plan/PlanSessionContent.tsx`.

- [ ] **Step 6: Commit.**

```
git add src/components/tasting-plan/PlanSessionContent.tsx
git commit -m "otter: host tracker — per-participant submission status on focused wine"
```

---

### Task 45: Add the reveal guard

Before revealing the focused pour, if online non-host participants lack content for it, show a confirm dialog "X av Y har inte svarat än — avslöja ändå?". The host can proceed.

- [ ] **Step 1: Add guard state next to the other dialog state.** The current dialog state (`:276-278`) is:

```ts
  const [endDialog, setEndDialog] = React.useState(false)
  const [leaveDialog, setLeaveDialog] = React.useState(false)
  const [endingOrLeaving, setEndingOrLeaving] = React.useState(false)
```

Replace with (adds the pending-reveal-pour state used by the guard dialog):

```ts
  const [endDialog, setEndDialog] = React.useState(false)
  const [leaveDialog, setLeaveDialog] = React.useState(false)
  const [endingOrLeaving, setEndingOrLeaving] = React.useState(false)
  // Pour order whose reveal is awaiting host confirmation because online
  // participants are still missing an entry. null = no pending guard.
  const [revealGuardPour, setRevealGuardPour] = React.useState<number | null>(null)
```

- [ ] **Step 2: Add a "missing count" helper + a gated reveal entry point.** The current `revealWine` function (`:379-396`) is:

```ts
  async function revealWine(pourOrder: number) {
    setLocalRevealed((prev) => new Set([...prev, pourOrder]))
    trackEvent('session_wine_revealed', {
      session_id: String(session.id),
      plan_id: plan.id,
      pour_order: pourOrder,
    })
    try {
      const res = await fetch(`/api/sessions/${session.id}/host-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revealPourOrder: pourOrder }),
      })
      if (!res.ok) toast.error('Kunde inte avslöja vinet.')
    } catch {
      toast.error('Nätverksfel — försök igen.')
    }
  }
```

Replace with (keeps `revealWine` as the actual POST; adds `missingCountForPour` + `attemptReveal` which gates on the tracker):

```ts
  // Online non-host participants who have NO content yet for this pour.
  function missingCountForPour(pourOrder: number): { missing: number; total: number } {
    const guests = roster.filter((r) => !r.isHost && r.online)
    const entry = submissionsByPour[pourOrder]
    const withContent = new Set(entry?.withContent ?? [])
    const missing = guests.filter((g) => !withContent.has(g.id)).length
    return { missing, total: guests.length }
  }

  // Reveal entry point used by the UI: confirm first if anyone online is
  // still missing an entry, otherwise reveal immediately.
  function attemptReveal(pourOrder: number) {
    const { missing } = missingCountForPour(pourOrder)
    if (missing > 0) {
      setRevealGuardPour(pourOrder)
      return
    }
    void revealWine(pourOrder)
  }

  async function revealWine(pourOrder: number) {
    setLocalRevealed((prev) => new Set([...prev, pourOrder]))
    trackEvent('session_wine_revealed', {
      session_id: String(session.id),
      plan_id: plan.id,
      pour_order: pourOrder,
    })
    try {
      const res = await fetch(`/api/sessions/${session.id}/host-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revealPourOrder: pourOrder }),
      })
      if (!res.ok) toast.error('Kunde inte avslöja vinet.')
    } catch {
      toast.error('Nätverksfel — försök igen.')
    }
  }
```

- [ ] **Step 3: Point the reveal button at `attemptReveal`.** The current reveal button (`:508-518`) is:

```tsx
                          {showRevealButton && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => revealWine(row.pourOrder)}
                              {...(idx === 0 ? { 'data-tour': 'session-reveal' } : {})}
                            >
                              Avslöja vin #{row.pourOrder}
                            </Button>
                          )}
```

Replace with:

```tsx
                          {showRevealButton && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => attemptReveal(row.pourOrder)}
                              {...(idx === 0 ? { 'data-tour': 'session-reveal' } : {})}
                            >
                              Avslöja vin #{row.pourOrder}
                            </Button>
                          )}
```

- [ ] **Step 4: Add the guard dialog after the leave dialog.** The current leave-dialog block + closing fragment (`:627-650`) is:

```tsx
      <AlertDialog open={leaveDialog} onOpenChange={setLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lämna provningen?</AlertDialogTitle>
            <AlertDialogDescription>
              Du kan ansluta igen med samma kod om sessionen fortfarande är aktiv.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={endingOrLeaving}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              disabled={endingOrLeaving}
              onClick={(e) => {
                e.preventDefault()
                void handleGuestLeave()
              }}
            >
              {endingOrLeaving ? 'Lämnar…' : 'Lämna'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
```

Replace with (inserts the reveal-guard dialog before the closing fragment):

```tsx
      <AlertDialog open={leaveDialog} onOpenChange={setLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lämna provningen?</AlertDialogTitle>
            <AlertDialogDescription>
              Du kan ansluta igen med samma kod om sessionen fortfarande är aktiv.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={endingOrLeaving}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              disabled={endingOrLeaving}
              onClick={(e) => {
                e.preventDefault()
                void handleGuestLeave()
              }}
            >
              {endingOrLeaving ? 'Lämnar…' : 'Lämna'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={revealGuardPour !== null}
        onOpenChange={(o) => !o && setRevealGuardPour(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Avslöja redan nu?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                if (revealGuardPour === null) return null
                const { missing, total } = missingCountForPour(revealGuardPour)
                return `${missing} av ${total} har inte svarat än — avslöja ändå?`
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                const pour = revealGuardPour
                setRevealGuardPour(null)
                if (pour !== null) void revealWine(pour)
              }}
            >
              Avslöja ändå
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
```

- [ ] **Step 5: Lint + build sanity.** The `AlertDialog` family is already imported (`:17-25`), so no import change is needed. Run:

```
pnpm lint && pnpm build
```

Expected: lint passes with no new errors; build completes (runs `generate:importmap` + compile) with no type errors in `PlanSessionContent.tsx`.

- [ ] **Step 6: Commit.**

```
git add src/components/tasting-plan/PlanSessionContent.tsx
git commit -m "otter: reveal guard — confirm before revealing while answers are missing"
```

---

### Task 46: Manual QA — two-browser host + guest loop

No e2e exists; verify the full tracker + guard loop manually. Requires Workstream A merged (so `submittedAt` is set on lock-in) for the ✓ path; the ✎/— paths work regardless.

- [ ] **Step 1: Start the app.**

```
pnpm dev
```

Expected: server on `http://localhost:3000`.

- [ ] **Step 2: Host a blind session.** In Browser 1 (your normal profile), create/host a blind tasting plan session and open the live screen (`/mina-provningar/planer/<id>?session=<sid>`). Set focus on wine #1 ("Sätt fokus"). Expected: the active card shows the "Vem har svarat" panel reading "Inga anslutna deltagare ännu." (no guests yet).

- [ ] **Step 3: Join as a guest.** In Browser 2 (a private/incognito window), join via the session code. Expected within ~5s (roster poll): Browser 1's tracker now lists the guest nickname with "— inget".

- [ ] **Step 4: Guest enters a draft (no lock-in).** In Browser 2, on wine #1 type a country guess in the BlindGuessCard (or open "Betygsätt" and type a note) — do NOT press the lock-in action. Expected within ~2s (submissions poll): Browser 1's tracker flips that guest to "✎ utkast".

- [ ] **Step 5: Guest locks in.** In Browser 2, press the "Klar / Lås in" action (Workstream A). Expected within ~2s: Browser 1's tracker flips that guest to "✓ klar".

- [ ] **Step 6: Reveal guard fires when someone is missing.** Have a SECOND guest (a third browser / another incognito window) join and enter nothing. In Browser 1, click "Avslöja vin #1". Expected: the confirm dialog appears reading "1 av 2 har inte svarat än — avslöja ändå?". Click "Avbryt" — the wine is NOT revealed. Click "Avslöja vin #1" again, then "Avslöja ändå" — the wine reveals (guest cards show the answer + the tracker matches).

- [ ] **Step 7: Reveal guard skips when everyone has content.** Have both guests enter at least a draft for wine #2, set focus on #2 in Browser 1, then click "Avslöja vin #2". Expected: NO dialog — it reveals immediately (since `missing === 0`).

- [ ] **Step 8: Confirm no content leaks.** In Browser 1's devtools Network tab, open the `/stream` EventSource and inspect the `submissions` frames. Expected: each `data:` line is `{"byPourOrder":{"1":{"withContent":[...],"locked":[...]}}}` containing only integer participant ids — never any country/grape/price/rating/text strings.
