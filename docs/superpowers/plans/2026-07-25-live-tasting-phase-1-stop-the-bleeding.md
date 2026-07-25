# Live Tasting Phase 1 — Stop the Bleeding: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make rating a wine work before the host reveals it, and make every failed write visible instead of silent — with no visual change to the session UI.

**Architecture:** The client is deliberately denied a blind wine's identity, but the server has it. We add a pure `pourOrder → wine identity` resolver, teach `POST /api/reviews` to use it when a session-scoped body carries no wine identity, and delete the dead `: null` branch that currently renders an empty modal. Alongside, the write path stops lying: Payload validation errors become 4xx instead of an opaque 500, the autosave queue gains a retry ceiling and a permanent-failure state, and the admin-probe escape hatch stops reporting silent data loss as success.

**Tech Stack:** Next.js 15 App Router, React 19, Payload CMS 3.33, Postgres, TypeScript. Tests are `node:test` + `node:assert/strict` in colocated `*.test.ts` files, run via `npx tsx --test` (the pattern already used by `src/lib/vinkompassen/scoring.test.ts`).

## Global Constraints

- Package manager is **pnpm**. Never use npm/yarn to install.
- All `@payloadcms/*` packages are pinned to exact `3.33.0` — never widen to `^` or `~`.
- **Payload v3 APIs only.** Import `Access` and `PayloadRequest` from `payload`, never `payload/types` (that is v2).
- After **any** collection or enum change, run `pnpm generate:types` and create a migration with `pnpm migrate:create -- "<descriptive-name>"`, committed alongside the collection change. Production deploys fail without it.
- Never hand-edit `src/payload-types.ts`.
- User-facing copy is **Swedish**.
- Detect Payload validation failures with `instanceof ValidationError`. **Never** use `err.name === 'ValidationError'` — minification rewrites the name, which is the exact bug that produced the original opaque 500.
- Blindness is a security property: the server must never send an unrevealed wine's identity to a guest client. Identity resolution added in this plan happens **server-side only**.
- No visual/layout changes in this phase. If a change would alter what a participant sees (other than an error message that previously did not appear), it belongs in Phase 2, 3 or 4.

**Line numbers** in this plan refer to the files as they stand at the start of Phase 1
(`edd30c9`). Tasks 3, 4 and 7 all edit `src/app/api/reviews/route.ts`, so once an earlier
task has landed the later line numbers shift. Every anchor is also given as quoted code —
**match the code, not the number.**

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `src/lib/session-pour-mapping.ts` | pure wine↔pour mapping, both directions | Modify — add reverse resolver |
| `src/lib/session-pour-mapping.test.ts` | tests for the above | Create |
| `src/lib/session-draft-queue.ts` | pure offline-queue reducer | Modify — retry ceiling + `gaveUp` |
| `scripts/verify-session-draft-queue.ts` | runnable assertions for the reducer | Modify — extend |
| `src/lib/use-session-draft.ts` | client draft hook, I/O + retry driving | Modify — honour 4xx and `gaveUp` |
| `src/app/api/reviews/route.ts` | review upsert | Modify — identity resolution, error mapping, participant identity |
| `src/collections/Reviews.ts` | Reviews schema | Modify — add `buyAgain` |
| `src/migrations/` | schema migration | Create — generated |
| `src/components/course/WineReviewForm.tsx` | review form | Modify — send `pourOrder`, relax the linkage guard |
| `src/components/tasting-plan/PlanSessionContent.tsx` | session content | Modify — collapse the dead dialog ternary |
| `package.json` | scripts | Modify — add `test:session` |

---

## Task 1: Reverse pour→wine resolver

The server needs to turn `(session plan wines, pourOrder)` into the wine identity a review row requires. `session-pour-mapping.ts` already does the forward direction; this is its inverse. Pure and fully testable.

**Files:**
- Modify: `src/lib/session-pour-mapping.ts` (append after `resolvePourForReview`, ends line 95)
- Create: `src/lib/session-pour-mapping.test.ts`
- Modify: `package.json` (scripts block)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `resolveWineIdentityForPour(wines: ReadonlyArray<unknown>, pourOrder: number): ResolvedWineIdentity | null` and the exported `ResolvedWineIdentity` interface. Task 2 imports both.

- [ ] **Step 1: Add the `test:session` script**

In `package.json`, add this line to `"scripts"` immediately after the existing `"test:vinkompassen"` entry:

```json
    "test:session": "cross-env NODE_OPTIONS=--no-deprecation npx tsx --test src/lib/session-*.test.ts",
```

- [ ] **Step 2: Write the failing test**

Create `src/lib/session-pour-mapping.test.ts`:

```ts
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveWineIdentityForPour } from './session-pour-mapping'

// A plan wine as it arrives from payload.findByID(..., { depth: 2 }).
const libraryWine = (pourOrder: number, id: number) => ({
  pourOrder,
  libraryWine: { id },
  customWine: null,
})

const customWine = (
  pourOrder: number,
  fields: Record<string, unknown>,
) => ({
  pourOrder,
  libraryWine: null,
  customWine: fields,
})

describe('resolveWineIdentityForPour', () => {
  it('resolves a library wine to its numeric id', () => {
    const wines = [libraryWine(1, 501), libraryWine(2, 502)]
    assert.deepEqual(resolveWineIdentityForPour(wines, 2), {
      wine: 502,
      customWine: null,
    })
  })

  it('accepts a bare numeric libraryWine relationship (depth 0)', () => {
    const wines = [{ pourOrder: 1, libraryWine: 777, customWine: null }]
    assert.deepEqual(resolveWineIdentityForPour(wines, 1), {
      wine: 777,
      customWine: null,
    })
  })

  it('resolves a custom wine to a snapshot carrying every persisted field', () => {
    const wines = [
      customWine(1, {
        name: 'Château Test',
        producer: 'Domaine Test',
        vintage: '2019',
        type: 'red',
        priceSek: 189,
        systembolagetProductNumber: '12345',
        systembolagetUrl: 'https://systembolaget.se/12345',
        imageUrl: 'https://example.com/a.png',
      }),
    ]
    assert.deepEqual(resolveWineIdentityForPour(wines, 1), {
      wine: null,
      customWine: {
        name: 'Château Test',
        producer: 'Domaine Test',
        vintage: '2019',
        type: 'red',
        priceSek: 189,
        systembolagetProductNumber: '12345',
        systembolagetUrl: 'https://systembolaget.se/12345',
        imageUrl: 'https://example.com/a.png',
      },
    })
  })

  it('omits absent optional custom-wine fields rather than sending nulls', () => {
    const wines = [customWine(1, { name: 'Bara Namn' })]
    assert.deepEqual(resolveWineIdentityForPour(wines, 1), {
      wine: null,
      customWine: { name: 'Bara Namn' },
    })
  })

  it('falls back to array index when pourOrder is absent', () => {
    const wines = [
      { libraryWine: { id: 10 }, customWine: null },
      { libraryWine: { id: 20 }, customWine: null },
    ]
    assert.deepEqual(resolveWineIdentityForPour(wines, 2), {
      wine: 20,
      customWine: null,
    })
  })

  it('returns null when the pour order is not in the plan', () => {
    assert.equal(resolveWineIdentityForPour([libraryWine(1, 501)], 9), null)
  })

  it('returns null for a custom wine with no usable name', () => {
    assert.equal(resolveWineIdentityForPour([customWine(1, { name: '   ' })], 1), null)
  })

  it('returns null for an entry with neither library nor custom wine', () => {
    assert.equal(
      resolveWineIdentityForPour([{ pourOrder: 1, libraryWine: null, customWine: null }], 1),
      null,
    )
  })

  it('returns null for an empty plan', () => {
    assert.equal(resolveWineIdentityForPour([], 1), null)
  })

  it('prefers the library wine when an entry somehow carries both', () => {
    const wines = [
      { pourOrder: 1, libraryWine: { id: 42 }, customWine: { name: 'Ignored' } },
    ]
    assert.deepEqual(resolveWineIdentityForPour(wines, 1), {
      wine: 42,
      customWine: null,
    })
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm test:session`
Expected: FAIL — `resolveWineIdentityForPour is not a function` (or an import/export error).

- [ ] **Step 4: Implement the resolver**

Append to `src/lib/session-pour-mapping.ts`:

```ts
/**
 * The wine identity a review row needs, resolved from the session's plan.
 * Exactly one of `wine` / `customWine` is non-null, mirroring the shape
 * `POST /api/reviews` and the Reviews collection's beforeValidate hook expect.
 */
export interface ResolvedWineIdentity {
  wine: number | null
  customWine: {
    name: string
    producer?: string
    vintage?: string
    type?: string
    systembolagetUrl?: string
    priceSek?: number
    systembolagetProductNumber?: string
    imageUrl?: string
  } | null
}

/**
 * Inverse of `resolvePourForReview`: given a session's plan wines and a pour
 * order, return the wine identity to persist on a review.
 *
 * This exists so a guest in a blind tasting can write a tasting note for a wine
 * whose identity was deliberately withheld from their client. The server holds
 * the un-redacted plan, so it resolves identity itself and never sends it down.
 *
 * Returns `null` when the pour order has no entry, or the entry carries no
 * usable identity (no library wine and no non-blank custom-wine name).
 */
export function resolveWineIdentityForPour(
  wines: ReadonlyArray<unknown>,
  pourOrder: number,
): ResolvedWineIdentity | null {
  for (let idx = 0; idx < wines.length; idx++) {
    const w = wines[idx] as {
      pourOrder?: number | null
      libraryWine?: number | { id: number } | null
      customWine?: Record<string, unknown> | null
    }
    const entryPour = w.pourOrder ?? idx + 1
    if (entryPour !== pourOrder) continue

    // Library wine wins when both are somehow present — it is the stronger
    // identity and matches rowFromEntry's precedence in PlanSessionContent.
    if (w.libraryWine != null) {
      const id =
        typeof w.libraryWine === 'object'
          ? (w.libraryWine as { id: number }).id
          : (w.libraryWine as number)
      if (typeof id === 'number' && !Number.isNaN(id)) {
        return { wine: id, customWine: null }
      }
    }

    const c = w.customWine
    const name = typeof c?.name === 'string' ? c.name.trim() : ''
    if (!name) return null

    // Copy only the fields the Reviews.customWine group persists, and only
    // when present — an explicit undefined key would overwrite a stored value.
    const snapshot: NonNullable<ResolvedWineIdentity['customWine']> = { name }
    const text = (key: 'producer' | 'vintage' | 'type' | 'systembolagetUrl' | 'imageUrl') => {
      const v = c?.[key]
      if (typeof v === 'string' && v.trim() !== '') snapshot[key] = v
    }
    text('producer')
    text('vintage')
    text('type')
    text('systembolagetUrl')
    text('imageUrl')
    if (typeof c?.priceSek === 'number' && !Number.isNaN(c.priceSek)) {
      snapshot.priceSek = c.priceSek
    }
    const pn = c?.systembolagetProductNumber
    if (pn != null && String(pn).trim() !== '') {
      snapshot.systembolagetProductNumber = String(pn)
    }
    return { wine: null, customWine: snapshot }
  }
  return null
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test:session`
Expected: PASS — 10 passing tests, exit code 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/session-pour-mapping.ts src/lib/session-pour-mapping.test.ts package.json
git commit -m "feat(provning): resolve wine identity from pour order server-side

Inverse of resolvePourForReview. Lets the server attach the correct wine to a
review written by a guest who was never sent that wine's identity."
```

---

## Task 2: Send `pourOrder` from the review form

The route cannot resolve identity without knowing which pour it is. `buildReviewBody` currently omits `pourOrder` even though the hook already has it.

**Files:**
- Modify: `src/components/course/WineReviewForm.tsx:211-233` (`buildReviewBody`), `:661-665` (linkage guard)

**Interfaces:**
- Consumes: nothing.
- Produces: `POST /api/reviews` bodies now carry `pourOrder?: number`. Task 3 depends on this field being present.

- [ ] **Step 1: Add `pourOrder` to the request body**

In `src/components/course/WineReviewForm.tsx`, replace the `buildReviewBody` callback (currently lines 211-233) with:

```tsx
  const buildReviewBody = React.useCallback(
    (draft: Record<string, unknown>) => {
      const wineIdentity = customWineSnapshot
        ? { customWine: customWineSnapshot }
        : { wine: wineId ? Number(wineId) : undefined }
      const sessionIdNum = sessionId ? Number(sessionId) : undefined
      return {
        ...wineIdentity,
        // Never send 0 — the collection validates non-null ratings to the
        // 0.5–5 range, so a pre-stars draft must carry null, not a zero that
        // fails validation on every autosave.
        rating:
          typeof draft.rating === 'number' && draft.rating > 0 ? (draft.rating as number) : null,
        buyAgain: Boolean(draft.buyAgain),
        reviewText: (draft.notes as string) ?? '',
        publishedToProfile: Boolean(draft.publishedToProfile),
        session: sessionIdNum,
        // Blind sessions redact wine identity from the guest's payload, so
        // neither `wine` nor `customWine` is available client-side. The pour
        // order is never secret — the server uses it to resolve identity from
        // the un-redacted plan. See /api/reviews session-scoped path.
        ...(typeof pourOrder === 'number' ? { pourOrder } : {}),
        wsetTasting: (draft.wsetTasting as Record<string, unknown>) ?? {},
        ...(draft.submittedAt ? { submittedAt: draft.submittedAt } : {}),
      }
    },
    [customWineSnapshot, wineId, sessionId, pourOrder],
  )
```

Note the dependency array gains `pourOrder`.

- [ ] **Step 2: Relax the submit guard for session drafts**

The guard at line 661 blocks submission when no wine is linked. In a blind session that is now the normal case — the server resolves it. Replace lines 660-665 with:

```tsx
    // Task 22: only the wine-linkage check is mandatory — everything else is optional.
    // Exception: in a session the server resolves identity from (session,
    // pourOrder), so a blind guest legitimately has neither wineId nor snapshot.
    const canResolveServerSide = isSessionDraft && typeof pourOrder === 'number'
    if (!wineId && !customWineSnapshot && !canResolveServerSide) {
      setErrors({ wine: 'Inget vin kopplat till detta moment' })
      toast.error('Inget vin kopplat till detta moment')
      return
    }
```

- [ ] **Step 3: Fix the locked-doc echo for the resolved case**

Line 699 builds the optimistic locked doc with `...(customWineSnapshot ? { customWine } : { wine: wineId })`. When identity was resolved server-side both are absent, and `wine: undefined` is harmless but misleading. Replace line 699 with:

```tsx
          ...(customWineSnapshot
            ? { customWine: customWineSnapshot }
            : wineId
              ? { wine: wineId }
              : {}),
```

- [ ] **Step 4: Verify it compiles**

Run: `pnpm lint`
Expected: no new errors referencing `WineReviewForm.tsx`.

- [ ] **Step 5: Commit**

```bash
git add src/components/course/WineReviewForm.tsx
git commit -m "feat(provning): send pourOrder with session review writes

Blind guests have no wine identity client-side; pourOrder lets the server
resolve it. Relaxes the linkage guard for the session path only."
```

---

## Task 3: Resolve identity server-side in `/api/reviews`

**Files:**
- Modify: `src/app/api/reviews/route.ts:307-332` (escape hatch), and insert the resolver directly after it

**Interfaces:**
- Consumes: `resolveWineIdentityForPour` / `ResolvedWineIdentity` from Task 1; the `pourOrder` body field from Task 2.
- Produces: a request carrying `session` + `pourOrder` and no wine identity now succeeds and persists the correct wine. Task 7 relies on this.

- [ ] **Step 1: Import the resolver**

Add to the imports at the top of `src/app/api/reviews/route.ts`:

```ts
import { resolveWineIdentityForPour } from '@/lib/session-pour-mapping'
```

- [ ] **Step 2: Replace the escape hatch with session-aware resolution**

Replace lines 307-332 (the block beginning `// Validate: either a library wine OR a customWine snapshot must be present.` and ending with the `{ status: 200 }` closing `)`) with:

```ts
    // Wine identity. Three cases:
    //  1. Body carries a library wine or a named customWine → use it.
    //  2. Body carries session + pourOrder but no identity → resolve it from
    //     the session's plan SERVER-SIDE. This is the blind-tasting path: the
    //     guest's client was deliberately never sent the wine's identity, so it
    //     cannot include one. We must never send it down; we only write it.
    //  3. Neither → Payload admin's relationship-options probe. Return an empty
    //     list shape so the admin UI doesn't break.
    let hasCustomWine =
      !!body.customWine?.name && String(body.customWine.name).trim() !== ''
    const pourOrderFromBody =
      body.pourOrder != null && !isNaN(Number(body.pourOrder))
        ? Number(body.pourOrder)
        : null
    const sessionForResolve = guestParticipant
      ? guestParticipant.sessionId
      : body.session != null && !isNaN(Number(body.session))
        ? Number(body.session)
        : null

    if (!body.wine && !hasCustomWine && sessionForResolve != null && pourOrderFromBody != null) {
      const sessionDoc = await payload.findByID({
        collection: 'course-sessions',
        id: sessionForResolve,
        depth: 2,
        overrideAccess: true,
      })
      const planWines =
        sessionDoc?.tastingPlan && typeof sessionDoc.tastingPlan === 'object'
          ? (((sessionDoc.tastingPlan as any).wines ?? []) as unknown[])
          : []
      const resolved = resolveWineIdentityForPour(planWines, pourOrderFromBody)
      if (!resolved) {
        log.warn(
          { session: sessionForResolve, pourOrder: pourOrderFromBody },
          'Could not resolve wine identity for pour',
        )
        return NextResponse.json(
          {
            error: 'Unknown wine',
            details: `No wine at pour order ${pourOrderFromBody} in this session's plan`,
          },
          { status: 422 },
        )
      }
      if (resolved.wine != null) {
        body.wine = resolved.wine
      } else {
        body.customWine = { ...(body.customWine ?? {}), ...resolved.customWine }
        hasCustomWine = true
      }
      log.info(
        { session: sessionForResolve, pourOrder: pourOrderFromBody, wine: resolved.wine },
        'Resolved wine identity server-side',
      )
    }

    if (!body.wine && !hasCustomWine) {
      // A session write that still has no identity is a real failure, not an
      // admin probe. Reporting 200 here is what previously turned data loss
      // into a silent "success" the client never retried.
      if (sessionForResolve != null) {
        return NextResponse.json(
          {
            error: 'Missing wine identity',
            details: 'A session review requires wine, customWine.name, or pourOrder',
          },
          { status: 422 },
        )
      }
      const { searchParams } = new URL(request.url)
      log.warn(
        { queryParams: searchParams.toString() },
        'Missing required fields — treating as relationship fetch',
      )
      return NextResponse.json(
        {
          docs: [],
          totalDocs: 0,
          limit: 0,
          totalPages: 0,
          page: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        },
        { status: 200 },
      )
    }
```

- [ ] **Step 3: Strip `pourOrder` before it reaches Payload**

`reviewData` spreads `...body` at line 402. `pourOrder` is not a Reviews field and must not be forwarded. In the `reviewData` object literal, add this key immediately after `...body,`:

```ts
      // Transport-only: used above to resolve identity, not a Reviews field.
      pourOrder: undefined,
```

- [ ] **Step 4: Verify it compiles**

Run: `pnpm lint`
Expected: no new errors referencing `api/reviews/route.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/reviews/route.ts
git commit -m "fix(provning): resolve blind wine identity server-side for reviews

A guest in a blind tasting is never sent the wine's identity, so their review
body cannot carry one. Resolve it from the session plan server-side instead of
rejecting the write. Also stops reporting identity-less session writes as 200,
which turned data loss into a silent success."
```

---

## Task 4: Map validation failures to 4xx

An opaque 500 tells the client "retry forever". A 4xx tells it "this body will never work". That distinction is the whole fix.

**Files:**
- Modify: `src/app/api/reviews/route.ts:462-471` (the catch block), plus the import block

**Interfaces:**
- Consumes: nothing.
- Produces: `POST /api/reviews` returns **422** with `{ error, details, fields }` on a Payload validation failure, 500 only for genuine infrastructure faults. Task 6 relies on 4xx being non-retryable.

- [ ] **Step 1: Import `ValidationError`**

Change the payload import at the top of `src/app/api/reviews/route.ts`:

```ts
import { getPayload, ValidationError } from 'payload'
```

- [ ] **Step 2: Split the catch**

Replace the catch block (lines 462-471) with:

```ts
  } catch (error) {
    // A validation failure is the caller's problem and will never succeed on
    // retry — it MUST be 4xx so the client's queue stops. Detect it with
    // `instanceof`: minified builds rewrite `err.name`, and relying on the name
    // is what turned this into an opaque, infinitely-retried 500.
    if (error instanceof ValidationError) {
      const fields = (error as { data?: { errors?: Array<{ path?: string; message?: string }> } })
        .data?.errors
      log.warn({ err: error, fields }, 'Review rejected by validation')
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.message,
          fields: fields ?? [],
        },
        { status: 422 },
      )
    }
    log.error({ err: error }, 'Error creating review')
    return NextResponse.json(
      {
        error: 'Failed to create review',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
```

- [ ] **Step 3: Verify it compiles**

Run: `pnpm lint`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/reviews/route.ts
git commit -m "fix(provning): return 422 not 500 for review validation failures

An opaque 500 made the client retry an unfixable body forever — the mechanism
behind session 21's 49 consecutive failed saves. Uses instanceof ValidationError
because minification rewrites err.name."
```

---

## Task 5: Retry ceiling and permanent-failure state in the queue reducer

Pure reducer change, verified by the existing runnable assertion script.

**Files:**
- Modify: `src/lib/session-draft-queue.ts:10-63`
- Modify: `scripts/verify-session-draft-queue.ts` (append)

**Interfaces:**
- Consumes: nothing.
- Produces: `QueueState.gaveUp: boolean`, `QueueAction` variant `{ type: 'failure'; permanent?: boolean }`, exported const `MAX_AUTOSAVE_ATTEMPTS = 5`. Task 6 consumes all three.

- [ ] **Step 1: Write the failing assertions**

Append to `scripts/verify-session-draft-queue.ts`:

```ts
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
```

Also extend the import at the top of that file to:

```ts
import {
  backoffMs,
  draftHasContent,
  initialQueueState,
  MAX_AUTOSAVE_ATTEMPTS,
  queueReducer,
  type QueueState,
} from '../src/lib/session-draft-queue'
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx tsx scripts/verify-session-draft-queue.ts`
Expected: FAIL — `MAX_AUTOSAVE_ATTEMPTS` is not exported.

- [ ] **Step 3: Implement the reducer change**

In `src/lib/session-draft-queue.ts`:

Add after the `DraftPayload` type (line 8):

```ts
/** Consecutive autosave failures before the queue stops retrying on its own. */
export const MAX_AUTOSAVE_ATTEMPTS = 5
```

Add this field to the `QueueState` interface, after `attempt`:

```ts
  /**
   * True once retries are exhausted or the server rejected the body outright
   * (4xx). The payload STAYS in `pending` so nothing is lost — the hook simply
   * stops retrying and surfaces an error until fresh input arrives.
   */
  gaveUp: boolean
```

Change the `failure` action variant:

```ts
  | { type: 'failure'; permanent?: boolean }
```

Add `gaveUp: false` to `initialQueueState`.

Replace the `enqueue`, `success` and `failure` cases in `queueReducer`:

```ts
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
```

```ts
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx tsx scripts/verify-session-draft-queue.ts`
Expected: every line prints `ok - …`, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/session-draft-queue.ts scripts/verify-session-draft-queue.ts
git commit -m "feat(provning): retry ceiling and permanent-failure state in draft queue

Caps autosave retries at 5 and adds gaveUp for outright rejections. The pending
payload is deliberately retained so the user's data survives a give-up."
```

---

## Task 6: Honour 4xx and surface permanent failure in the hook

**Files:**
- Modify: `src/lib/use-session-draft.ts:14` (`SaveStatus`), `:170-205` (the fetch/catch), `:33-49` (returned interface)

**Interfaces:**
- Consumes: `MAX_AUTOSAVE_ATTEMPTS`, `QueueState.gaveUp`, the `permanent` failure flag from Task 5.
- Produces: `SaveStatus` gains `'failed'`. `UseSessionDraft` gains `retry: () => void`. `WineReviewForm`'s `SaveStatusLabel` and `BlindGuessCard`'s already render on `SaveStatus`; both need a `'failed'` branch (Step 5).

- [ ] **Step 1: Add the terminal status**

Change line 14:

```ts
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'retrying' | 'error' | 'failed'
```

- [ ] **Step 2: Classify the response and stop retrying on 4xx**

Replace the `try { const res = await fetch(...) } catch { ... }` block (lines 170-205) with:

```ts
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
```

- [ ] **Step 3: Expose a manual retry**

Add to the `UseSessionDraft` interface, after `lockIn`:

```ts
  /** Clear a terminal failure and attempt delivery again. No-op unless the
   *  queue has given up. */
  retry: () => void
```

Add this callback just before the `return` at the end of `useSessionDraft`:

```ts
  const retry = React.useCallback(() => {
    if (!queueRef.current.gaveUp) return
    // Re-enqueue the retained payload; `enqueue` clears gaveUp and resets the
    // attempt budget.
    const payload = queueRef.current.pending
    if (payload == null) return
    dispatch({ type: 'enqueue', payload: { ...payload } })
    void flush()
  }, [dispatch, flush])
```

And change the return statement to:

```ts
  return { status, queueSave, lockIn, retry, restoredFromDraft, restoredDraft }
```

- [ ] **Step 4: Stop `lockIn` looping on a terminal failure**

Inside `lockIn`'s `while` loop, add this immediately after the `if (isOffline() || !mountedRef.current) return false` line:

```ts
      // The queue has given up (4xx or exhausted retries). Report failure so
      // the caller does not show a success state.
      if (queueRef.current.gaveUp) return false
```

- [ ] **Step 5: Render the terminal status**

In `src/components/tasting-plan/BlindGuessCard.tsx`, in `SaveStatusLabel` (starts line 393), add this branch immediately before the final `return null`:

```tsx
  if (status === 'failed') {
    return (
      <span className="text-xs text-red-600 flex items-center gap-1">
        <CloudOff className="h-3 w-3" /> Sparades inte — dina svar finns kvar
      </span>
    )
  }
```

In `src/components/course/WineReviewForm.tsx`, replace the `ReviewSaveStatus` component (lines 1351-1359) with:

```tsx
function ReviewSaveStatus({ status }: { status: SaveStatus }) {
  if (status === 'saving')
    return <span className="text-xs text-muted-foreground">Sparar…</span>
  if (status === 'saved') return <span className="text-xs text-green-600">Sparat ✓</span>
  if (status === 'retrying')
    return <span className="text-xs text-amber-600">Återförsöker…</span>
  if (status === 'error') return <span className="text-xs text-red-600">Kunde inte spara</span>
  if (status === 'failed')
    return (
      <span className="text-xs text-red-600">Sparades inte — dina svar finns kvar</span>
    )
  return null
}
```

- [ ] **Step 6: Verify**

Run: `npx tsx scripts/verify-session-draft-queue.ts && pnpm lint`
Expected: assertions all `ok -`, no new lint errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/use-session-draft.ts src/components/tasting-plan/BlindGuessCard.tsx src/components/course/WineReviewForm.tsx
git commit -m "fix(provning): stop retrying rejected saves and surface the failure

4xx responses are terminal — retrying them is what produced the 10-minute
failure loop. Adds a 'failed' status, a manual retry, and keeps the draft."
```

---

## Task 7: Persist `sessionParticipant` for authenticated participants

Today `/api/reviews` sets `sessionParticipant` only for cookie guests. `my-submissions` filters strictly on it (`route.ts:84`), so a **logged-in** participant's session reviews are invisible to draft rehydration, to the completion state, to the host's "Vem har svarat" tracker, and to the reveal guard's missing-count.

**Files:**
- Modify: `src/app/api/reviews/route.ts` — after the `guestParticipant` block (ends line 235), and the `reviewData.sessionParticipant` expression (lines 416-422)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: reviews written by authenticated participants now carry `sessionParticipant`, so `GET /api/sessions/[sessionId]/my-submissions` returns them.

- [ ] **Step 1: Resolve the authenticated user's participant row**

This code reads `body`, so it must run **after** body parsing. Anchor it textually: insert it immediately **before** this existing call, wherever it now sits:

```ts
    log.debug(
      { wine: body.wine, session: body.session, sessionParticipant: body.sessionParticipant },
      'Request body',
    )
```

Insert:

```ts
    // An authenticated participant also has a session-participants row. The
    // review must carry it, because /my-submissions filters strictly on
    // sessionParticipant — without it a logged-in participant's own notes are
    // invisible to rehydration, the host's answered-tracker and the reveal
    // guard.
    let authedParticipantId: number | null = null
    if (user && body.session != null && !isNaN(Number(body.session))) {
      const found = await payload.find({
        collection: 'session-participants',
        where: {
          and: [
            { session: { equals: Number(body.session) } },
            { user: { equals: user.id } },
          ],
        },
        limit: 1,
        overrideAccess: true,
      })
      if (found.docs.length > 0) authedParticipantId = Number((found.docs[0] as any).id)
    }
```

- [ ] **Step 2: Use it in `reviewData`**

Replace the `sessionParticipant` expression in `reviewData` (lines 416-422) with:

```ts
      sessionParticipant: guestParticipant
        ? guestParticipant.id
        : authedParticipantId != null
          ? authedParticipantId
          : body.sessionParticipant
            ? Number(body.sessionParticipant)
            : body.sessionParticipant === null
              ? null
              : undefined,
```

- [ ] **Step 3: Include it in the dedup key**

`buildBaseWhere` (line 350) keys authed reviews on `user` alone. That still dedups correctly, so leave it — but confirm by reading lines 346-385 that adding `sessionParticipant` to the written row cannot create a duplicate. It cannot: the `where` matches on `user` + `wine` + `session`, all unchanged.

- [ ] **Step 4: Verify**

Run: `pnpm lint`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/reviews/route.ts
git commit -m "fix(provning): persist sessionParticipant for logged-in participants

my-submissions filters strictly on sessionParticipant, so a logged-in
participant's session reviews were invisible to rehydration, the host's
answered-tracker and the reveal guard's missing count."
```

---

## Task 8: Add the `buyAgain` field

`WineReviewForm` renders the checkbox, posts it, and `my-submissions` echoes `r.buyAgain ?? false` — but no field and no column exist, so the answer is discarded. Production shows real users rage-clicking it.

**Files:**
- Modify: `src/collections/Reviews.ts`
- Create: `src/migrations/<generated>.ts` + `.json`
- Modify: `src/migrations/index.ts` (generated)
- Modify: `src/payload-types.ts` (generated)

**Interfaces:**
- Consumes: nothing.
- Produces: `Review.buyAgain?: boolean | null` on the generated types.

- [ ] **Step 1: Add the field**

In `src/collections/Reviews.ts`, add to the `fields` array immediately after the `rating` field definition:

```ts
    {
      name: 'buyAgain',
      type: 'checkbox',
      label: 'Skulle köpa igen',
      defaultValue: false,
      admin: {
        description:
          'Participant answered "Jag hade köpt detta vin igen". Feeds the session recap.',
      },
    },
```

- [ ] **Step 2: Regenerate types**

Run: `pnpm generate:types`
Expected: `src/payload-types.ts` gains `buyAgain?: boolean | null` on the `Review` interface.

- [ ] **Step 3: Create the migration**

Run: `pnpm migrate:create -- "reviews_buy_again"`
Expected: a new pair of files in `src/migrations/` and an updated `src/migrations/index.ts`.

- [ ] **Step 4: Verify the migration adds the column**

Read the generated `.ts` migration. Confirm the `up` contains an `ADD COLUMN "buy_again"` on the `reviews` table and the `down` drops it. If the generated SQL is empty, the field was not picked up — recheck Step 1 and regenerate.

- [ ] **Step 5: Apply locally and confirm**

Run: `pnpm payload migrate`
Expected: the new migration reports as applied. Then `pnpm migrate:status` shows it in the applied list.

- [ ] **Step 6: Commit**

```bash
git add src/collections/Reviews.ts src/migrations/ src/payload-types.ts
git commit -m "feat(provning): persist buyAgain on reviews

The checkbox has been rendered, posted and echoed since launch but had no field
and no column, so every answer was discarded. Production rage-click data shows
users noticing."
```

---

## Task 9: Delete the empty-modal branch

The user-visible payoff. With Task 3 in place, the dialog no longer needs wine identity to render a working form.

**Files:**
- Modify: `src/components/tasting-plan/PlanSessionContent.tsx:757-793`

**Interfaces:**
- Consumes: the server-side resolution from Task 3, the `pourOrder` body field from Task 2.
- Produces: nothing downstream.

- [ ] **Step 1: Collapse the ternary**

Replace the dialog body (lines 762-791, the `{reviewing && (…)}` expression) with:

```tsx
          {reviewing && (
            <WineReviewForm
              key={`review-${reviewing.pourOrder}`}
              lessonId={0}
              sessionId={String(session.id)}
              pourOrder={reviewing.pourOrder}
              {...(reviewing.libraryWineId ? { wineIdProp: reviewing.libraryWineId } : {})}
              {...(reviewing.customWineSnapshot
                ? { customWineSnapshot: reviewing.customWineSnapshot }
                : {})}
              insideDialog
              onRestored={() => setRestoredBanner(true)}
              onSubmit={() => {
                setSubmittedPourOrders((prev) => new Set([...prev, reviewing.pourOrder]))
                setReviewing(null)
              }}
            />
          )}
```

Note: `reviewing!.pourOrder` becomes `reviewing.pourOrder` — inside the `{reviewing && …}` guard the narrowing holds, so the non-null assertions are no longer needed.

- [ ] **Step 2: Verify it compiles**

Run: `pnpm lint`
Expected: no new errors.

- [ ] **Step 3: Manual verification — the original bug**

Run: `pnpm dev`

1. Create or open a tasting plan with at least 2 wines.
2. Start a session with **Blindprovning** enabled.
3. Join as a guest in a second browser profile (or private window).
4. As the guest, press **Betygsätt** on an **unrevealed** wine.

Expected: the dialog opens with a **fully rendered form** (Enkel/Avancerad tabs, stars, notes) — not an empty box. Set a rating and type a note; the status label shows `Sparar…` then `Sparat`.

5. As the host, reveal that wine.
6. As the guest, reopen **Betygsätt**.

Expected: the note is still there and is now attached to the real wine.

- [ ] **Step 4: Verify the write landed against the right wine**

With the dev server running and the session id and pour order from Step 3:

```bash
npx tsx --env-file=.env -e "
import { getPayload } from 'payload'
import config from './src/payload.config.ts'
const p = await getPayload({ config })
const r = await p.find({
  collection: 'reviews',
  where: { session: { equals: <SESSION_ID> } },
  depth: 0,
  overrideAccess: true,
})
console.log(JSON.stringify(r.docs.map(d => ({
  id: d.id, wine: d.wine, customWine: d.customWine?.name,
  rating: d.rating, participant: d.sessionParticipant, buyAgain: d.buyAgain,
})), null, 2))
"
```

Expected: one row per rated wine, each with a non-null `wine` **or** a `customWine.name`, and a non-null `sessionParticipant` (Task 7) — even for the wine that was unrevealed when the note was written.

> This reads your **local dev** database. `.env` points at **production** — do not run it against `.env` unless you intend to read production.

- [ ] **Step 5: Commit**

```bash
git add src/components/tasting-plan/PlanSessionContent.tsx
git commit -m "fix(provning): Betygsätt no longer opens an empty modal

Blind redaction strips libraryWine/customWine, so the dialog's ternary fell
through to a bare null and rendered a titled empty box. The server now resolves
identity, so one unconditional form replaces the ternary."
```

---

## Task 10: Full regression pass

**Files:** none modified — verification only.

- [ ] **Step 1: Run every automated check**

```bash
pnpm test:session
npx tsx scripts/verify-session-draft-queue.ts
npx tsx scripts/verify-submission-status.ts
pnpm lint
pnpm build
```

Expected: all pass, exit code 0. `pnpm build` must succeed — it runs `generate:importmap` first and will catch a broken import map.

- [ ] **Step 2: Manual matrix**

For each combination, confirm the tasting note persists and rehydrates after a reload:

| # | Session | Role | Auth | Check |
|---|---|---|---|---|
| 1 | Blind | Guest | cookie | Rate an unrevealed wine; reload; note is still there |
| 2 | Blind | Guest | logged in | Same — this is the path Task 7 fixes |
| 3 | Blind | Host | logged in | Rate any wine; unchanged behaviour |
| 4 | Non-blind | Guest | cookie | Rate any wine; unchanged behaviour |
| 5 | Non-blind | Guest | logged in | Rate any wine; note rehydrates |

- [ ] **Step 3: Verify the failure path is visible**

With the dev server running, open a session, open **Betygsätt**, then in DevTools set the network to **Offline** and type a note.

Expected: status shows `Återförsöker…`. Restore the network — it saves.

Then, to exercise the terminal path: with DevTools open, use a request-blocking rule on `/api/reviews` returning 422 (or temporarily add `return NextResponse.json({error:'x'},{status:422})` at the top of the POST handler), and type a note.

Expected: after **at most 5 attempts** the status becomes `Sparades inte — dina svar finns kvar` and **no further requests are made**. Confirm in the Network tab that requests stop. Revert any temporary edit.

- [ ] **Step 4: Confirm no PostHog regression**

After the next real tasting, re-run the query that found the original problem:

```sql
SELECT properties.kind AS kind,
       countIf(event = 'vk_session_save_attempt') AS attempts,
       countIf(event = 'vk_session_save_success') AS successes,
       countIf(event = 'vk_session_save_failure') AS failures
FROM events
WHERE timestamp >= now() - INTERVAL 7 DAY
  AND event IN ('vk_session_save_attempt','vk_session_save_success','vk_session_save_failure')
GROUP BY kind
```

Acceptance: `review` failures ≈ 0, and no `(sessionId, pourOrder)` pair shows more than 5 consecutive failures.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore(provning): phase 1 regression pass" --allow-empty
```

---

## Deployment note

Per project convention `main` is staging and `production` is a separate curated linear branch — pushing to `main` does **not** deploy. The migration from Task 8 must reach `production` as a `release:` commit, and migrations run via `migrate.yml` CI. Do not consider this phase shipped until `pnpm migrate:status` against production shows `reviews_buy_again` applied.

---

## Self-review notes

**Spec coverage.** §7.1 → Tasks 1-3, 9. §7.2 (commit endpoint) → deliberately deferred to Phase 3; the spec states it depends on §7.3's reliability work, which is Tasks 4-6. §7.3 → Tasks 3 (escape hatch), 4 (4xx mapping), 5-6 (retry ceiling, visible failure). §7.4 → Task 7. §11.1 (`buyAgain`) → Task 8. §11.2 (`publishedToProfile` for guests) is Phase 2 — it is a visual change and this phase makes none.

**Deferred to later phases, by design:** all of §5 (participant surface), §6 (host surface), §8 (copy), §9 (mobile), §10 (component split), §11.3-11.4, §12.
