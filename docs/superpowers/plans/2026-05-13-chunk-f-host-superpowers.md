# Chunk F — Host Superpowers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship three host-game mechanics for plan-driven sessions — blind tasting with per-wine reveal, per-wine pacing timer, and tasting-note swarm panel gated on own-submission.

**Architecture:** Five additive schema fields (2 on TastingPlans, 3 on CourseSessions). Backend extends `host-state` (new `revealPourOrder` body field + focus-timestamp stamp), `sessions/create` (accepts `blindTasting`), and the SSE stream (extended lesson event + new `swarm` event with server-side aggregation). New `my-submissions` endpoint for per-participant gating. Three new client components (WineFocusTimer, SwarmPanel) wired into PlanSessionContent via SessionContext extensions.

**Tech Stack:** Next.js 15 + React 19 + Payload CMS 3.33 + Postgres + existing SSE plumbing.

**Spec:** `docs/superpowers/specs/2026-05-13-chunk-f-host-superpowers-design.md`

---

## File structure

```
MOD src/collections/TastingPlans.ts                                    Task 1
MOD src/collections/CourseSessions.ts                                  Task 1
NEW src/migrations/<ts>_chunk_f_host_superpowers.ts                    Task 1
MOD src/app/api/sessions/[sessionId]/host-state/route.ts               Task 2
MOD src/app/api/sessions/create/route.ts                               Task 2
NEW src/app/api/sessions/[sessionId]/my-submissions/route.ts           Task 2
MOD src/app/(frontend)/(site)/mina-provningar/planer/[id]/page.tsx     Task 2
MOD src/app/api/sessions/[sessionId]/stream/route.ts                   Task 3
MOD src/context/SessionContext.tsx                                     Task 3
MOD src/components/course/RealtimeSync.tsx                             Task 3
MOD src/components/tasting-plan/TastingPlanForm.tsx                    Task 4
MOD src/components/course/StartSessionButton.tsx                       Task 4
NEW src/components/tasting-plan/WineFocusTimer.tsx                     Task 5
NEW src/components/tasting-plan/SwarmPanel.tsx                         Task 5
MOD src/components/tasting-plan/PlanSessionContent.tsx                 Task 6
END E2E + push                                                         Task 7
```

---

## Task 1: Schema + migration

**Files:**
- Modify: `src/collections/TastingPlans.ts`
- Modify: `src/collections/CourseSessions.ts`
- Auto-create: `src/migrations/<ts>_chunk_f_host_superpowers.ts`

- [ ] **Step 1: Add fields to TastingPlans**

In `src/collections/TastingPlans.ts`, add these two fields near the existing settings (e.g. after `targetParticipants`):

```ts
    {
      name: 'blindTastingByDefault',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'When checked, sessions started from this plan default to blind tasting.',
      },
    },
    {
      name: 'defaultMinutesPerWine',
      type: 'number',
      min: 1,
      max: 60,
      admin: {
        description: 'Optional per-wine timer in minutes (1–60). Leave empty for no timer.',
        position: 'sidebar',
      },
    },
```

- [ ] **Step 2: Add fields to CourseSessions**

In `src/collections/CourseSessions.ts`, add these three fields in the fields array (sidebar position for the readonly ones):

```ts
    {
      name: 'blindTasting',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description:
          'Runtime flag for plan sessions. Stamped from plan.blindTastingByDefault at create-time; may be overridden.',
      },
    },
    {
      name: 'revealedPourOrders',
      type: 'json',
      defaultValue: [],
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Pour orders the host has revealed (blind mode). JSON array of numbers.',
      },
    },
    {
      name: 'currentWineFocusStartedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Stamped on every plan-mode focus change. Used to compute timer remaining.',
      },
    },
```

- [ ] **Step 3: Regenerate types**

```bash
pnpm generate:types 2>&1 | tail -3
```
Expected: "Types written to .../src/payload-types.ts".

Verify:
```bash
grep -n "blindTastingByDefault\|defaultMinutesPerWine\|blindTasting\b\|revealedPourOrders\|currentWineFocusStartedAt" src/payload-types.ts | head
```
Expected: each field appears in the TastingPlan or CourseSession interface.

- [ ] **Step 4: Generate migration**

```bash
pnpm payload migrate:create chunk-f-host-superpowers 2>&1 | tail -5
```
Expected: "Migration created at .../src/migrations/<ts>_chunk_f_host_superpowers.ts".

Inspect the generated file. Expected: 5 `ADD COLUMN` statements (2 on `tasting_plans`, 3 on `course_sessions`), all nullable or defaulted.

- [ ] **Step 5: TS sweep + commit**

```bash
pnpm exec tsc --noEmit 2>&1 | grep -E "(TastingPlans|CourseSessions|blindTasting|defaultMinutesPerWine|revealedPourOrders|currentWineFocusStartedAt)" | head
git add src/collections/TastingPlans.ts \
  src/collections/CourseSessions.ts \
  src/migrations/ \
  src/payload-types.ts
git commit -m "$(cat <<'EOF'
otter: schema for Chunk F — blind, timer, swarm

Five additive columns:
- TastingPlans.blindTastingByDefault (checkbox, default false)
- TastingPlans.defaultMinutesPerWine (number, 1–60, nullable)
- CourseSessions.blindTasting (checkbox, default false)
- CourseSessions.revealedPourOrders (json array, default [])
- CourseSessions.currentWineFocusStartedAt (date, nullable)

Migration runs on Railway boot via prodMigrations.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: API extensions

**Files:**
- Modify: `src/app/api/sessions/[sessionId]/host-state/route.ts`
- Modify: `src/app/api/sessions/create/route.ts`
- Create: `src/app/api/sessions/[sessionId]/my-submissions/route.ts`
- Modify: `src/app/(frontend)/(site)/mina-provningar/planer/[id]/page.tsx`

- [ ] **Step 1: Extend host-state route**

In `src/app/api/sessions/[sessionId]/host-state/route.ts`, find the body parsing block (currently accepts `currentLessonId` and `currentWinePourOrder`). Add `revealPourOrder` and focus-timestamp stamping. Replace this block:

```ts
    const body = await request.json().catch(() => ({}))
    const rawLesson = (body as any)?.currentLessonId
    const rawWine = (body as any)?.currentWinePourOrder
    const currentLessonId = typeof rawLesson === 'number' ? rawLesson : null
    const currentWinePourOrder = typeof rawWine === 'number' ? rawWine : null

    if (currentLessonId === null && currentWinePourOrder === null) {
      return NextResponse.json(
        { error: 'currentLessonId or currentWinePourOrder must be a number' },
        { status: 400 },
      )
    }

    const data: Record<string, unknown> = {}
    if (currentLessonId !== null) data.currentLesson = currentLessonId
    if (currentWinePourOrder !== null) data.currentWinePourOrder = currentWinePourOrder
```

with:

```ts
    const body = await request.json().catch(() => ({}))
    const rawLesson = (body as any)?.currentLessonId
    const rawWine = (body as any)?.currentWinePourOrder
    const rawReveal = (body as any)?.revealPourOrder
    const currentLessonId = typeof rawLesson === 'number' ? rawLesson : null
    const currentWinePourOrder = typeof rawWine === 'number' ? rawWine : null
    const revealPourOrder =
      typeof rawReveal === 'number' && Number.isInteger(rawReveal) && rawReveal >= 1
        ? rawReveal
        : null

    if (
      currentLessonId === null &&
      currentWinePourOrder === null &&
      revealPourOrder === null
    ) {
      return NextResponse.json(
        {
          error:
            'currentLessonId, currentWinePourOrder, or revealPourOrder must be provided',
        },
        { status: 400 },
      )
    }

    const data: Record<string, unknown> = {}
    if (currentLessonId !== null) data.currentLesson = currentLessonId
    if (currentWinePourOrder !== null) {
      data.currentWinePourOrder = currentWinePourOrder
      // Stamp the focus moment so timers compute remaining correctly across clients.
      data.currentWineFocusStartedAt = new Date().toISOString()
    }
    if (revealPourOrder !== null) {
      const existing = Array.isArray((session as any).revealedPourOrders)
        ? ((session as any).revealedPourOrders as number[])
        : []
      const merged = Array.from(new Set([...existing, revealPourOrder])).sort((a, b) => a - b)
      data.revealedPourOrders = merged
    }
```

This adds the reveal handler, stamps focus timestamps when the focus changes, and merges the reveal list defensively.

- [ ] **Step 2: Extend sessions/create**

In `src/app/api/sessions/create/route.ts`, find the body destructure (currently `courseId`, `tastingPlanId`, `sessionName`, `maxParticipants`). Add `blindTasting` to the destructure:

```ts
    const { courseId, tastingPlanId, sessionName, maxParticipants = 50, blindTasting } = body
```

Then in the plan-mode branch (where `tastingPlanId` is checked and the plan is fetched), compute the effective blind setting and pass it to `payload.create`. Find this block:

```ts
    if (courseId) {
      // course lookup
    } else {
      const plan = await payload.findByID({
        collection: 'tasting-plans',
        id: tastingPlanId,
        overrideAccess: true,
      })
      ...
    }
```

After the plan is loaded (or right where the create-data is built), determine `effectiveBlind`:

```ts
    const explicitBlind = typeof blindTasting === 'boolean' ? blindTasting : null
    const planDefaultBlind =
      tastingPlanId && typeof (plan as any)?.blindTastingByDefault === 'boolean'
        ? (plan as any).blindTastingByDefault
        : false
    const effectiveBlind = explicitBlind ?? planDefaultBlind
```

(Adjust variable scope so `plan` is accessible at the create-data step. If the plan was fetched inside an `else` block, hoist its declaration above.)

Then in the `payload.create` data object, add:

```ts
        blindTasting: effectiveBlind,
        revealedPourOrders: [],
```

(`currentWineFocusStartedAt` stays null until first focus.)

- [ ] **Step 3: Create my-submissions route**

`src/app/api/sessions/[sessionId]/my-submissions/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { cookies } from 'next/headers'
import { PARTICIPANT_COOKIE } from '@/lib/sessions'

/**
 * GET /api/sessions/[sessionId]/my-submissions
 *
 * Returns the pour orders the calling participant has already submitted
 * reviews for. Used by PlanSessionContent to seed the swarm-gate Set on
 * mount. Identity is the participant cookie (vk_participant_token) OR the
 * authenticated user.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params
  const sid = Number(sessionId)
  if (!Number.isInteger(sid)) {
    return NextResponse.json({ error: 'Invalid session id' }, { status: 400 })
  }

  const payload = await getPayload({ config })

  // Identify caller: cookie first, then payload-token user
  const cookieStore = await cookies()
  const participantToken = cookieStore.get(PARTICIPANT_COOKIE)?.value ?? null

  let participantId: number | null = null
  if (participantToken) {
    const found = await payload.find({
      collection: 'session-participants',
      where: {
        and: [
          { session: { equals: sid } },
          { participantToken: { equals: participantToken } },
        ],
      },
      limit: 1,
      overrideAccess: true,
    })
    if (found.docs.length > 0) participantId = (found.docs[0] as any).id
  }

  // Fall back to authed user → participant lookup
  if (participantId === null) {
    const cookieString = _request.headers.get('cookie') || ''
    const { user } = await payload.auth({ headers: new Headers({ Cookie: cookieString }) })
    if (user) {
      const found = await payload.find({
        collection: 'session-participants',
        where: {
          and: [
            { session: { equals: sid } },
            { user: { equals: user.id } },
          ],
        },
        limit: 1,
        overrideAccess: true,
      })
      if (found.docs.length > 0) participantId = (found.docs[0] as any).id
    }
  }

  if (participantId === null) {
    return NextResponse.json({ submittedPourOrders: [] })
  }

  // Find this participant's reviews in this session, then map to pour orders
  // via the plan's wines list.
  const reviewRes = await payload.find({
    collection: 'reviews',
    where: { sessionParticipant: { equals: participantId } },
    limit: 100,
    depth: 0,
    overrideAccess: true,
  })

  // To map a review to a pour order, fetch the session + plan and walk the wines.
  const session = await payload.findByID({
    collection: 'course-sessions',
    id: sid,
    depth: 2,
    overrideAccess: true,
  })

  const wineIdToPour: Record<number, number> = {}
  const titleToPour: Record<string, number> = {}
  if (session?.tastingPlan && typeof session.tastingPlan === 'object') {
    const wines = (session.tastingPlan as any).wines ?? []
    wines.forEach((w: any, idx: number) => {
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

- [ ] **Step 4: Server-side blind redaction in the plan detail page**

In `src/app/(frontend)/(site)/mina-provningar/planer/[id]/page.tsx`, find the block where the session is fetched and the shell is rendered:

```ts
    if (session && sessionPlanId === plan.id && session.status === 'active') {
      const isHost = sp.host === 'true'
      return (
        <PlanSessionShell
          plan={plan}
          session={session}
          isHost={isHost}
          sessionId={String(session.id)}
        />
      )
    }
```

Insert redaction logic before constructing the shell:

```ts
    if (session && sessionPlanId === plan.id && session.status === 'active') {
      const isHost = sp.host === 'true'
      // Blind redaction: for guests, strip wine identity from un-revealed pours.
      // Hosts always see full info.
      let renderPlan = plan
      if (!isHost && (session as any).blindTasting) {
        const revealed: number[] = Array.isArray((session as any).revealedPourOrders)
          ? (session as any).revealedPourOrders
          : []
        renderPlan = {
          ...plan,
          wines: (plan.wines ?? []).map((w, idx) => {
            const pourOrder = w.pourOrder ?? idx + 1
            if (revealed.includes(pourOrder)) return w
            // Redact for unrevealed wines
            return {
              ...w,
              libraryWine: null,
              customWine: undefined,
              hostNotes: null,
            }
          }),
        } as typeof plan
      }
      return (
        <PlanSessionShell
          plan={renderPlan}
          session={session}
          isHost={isHost}
          sessionId={String(session.id)}
        />
      )
    }
```

(The redacted entries lose their wine identity but keep their pour-order — exactly what we need.)

- [ ] **Step 5: TS sweep + smoke + commit**

```bash
pnpm exec tsc --noEmit 2>&1 | grep -E "(host-state|sessions/create|my-submissions|mina-provningar/planer/\[id\]/page)" | head

lsof -nP -i tcp:3000 | grep LISTEN | head -1 || (pnpm dev > /tmp/dev.log 2>&1 &)
until curl -s --max-time 3 http://localhost:3000/api/users/me >/dev/null 2>&1; do sleep 2; done

# my-submissions returns empty for unknown caller
curl -s "http://localhost:3000/api/sessions/1/my-submissions" -w "\nHTTP %{http_code}\n" | head -3
```
Expected for unknown caller: `{"submittedPourOrders":[]}` + HTTP 200.

```bash
git add "src/app/api/sessions/[sessionId]/host-state/route.ts" \
  src/app/api/sessions/create/route.ts \
  "src/app/api/sessions/[sessionId]/my-submissions/route.ts" \
  "src/app/(frontend)/(site)/mina-provningar/planer/[id]/page.tsx"
git commit -m "$(cat <<'EOF'
otter: API extensions for blind / timer / swarm

- host-state accepts revealPourOrder (dedupes and merges) and stamps
  currentWineFocusStartedAt whenever currentWinePourOrder changes
- sessions/create accepts blindTasting; falls back to plan default
- new my-submissions endpoint returns the calling participant's
  submitted pour orders for swarm-gate seeding
- plan detail page server-side redacts wine identity for guest views
  in blind mode

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: SSE stream + SessionContext + RealtimeSync

**Files:**
- Modify: `src/app/api/sessions/[sessionId]/stream/route.ts`
- Modify: `src/context/SessionContext.tsx`
- Modify: `src/components/course/RealtimeSync.tsx`

- [ ] **Step 1: Extend SSE lesson payload + add swarm event**

In `src/app/api/sessions/[sessionId]/stream/route.ts`, find the `readHostPointer` helper. Extend it to read three more fields:

```ts
      const readHostPointer = async (): Promise<{
        currentLessonId: number | null
        currentWinePourOrder: number | null
        currentWineFocusStartedAt: string | null
        revealedPourOrders: number[]
        blindTasting: boolean
      }> => {
        try {
          const fresh = await payload.findByID({
            collection: 'course-sessions',
            id: sessionId,
            depth: 0,
          })
          if (!fresh)
            return {
              currentLessonId: null,
              currentWinePourOrder: null,
              currentWineFocusStartedAt: null,
              revealedPourOrders: [],
              blindTasting: false,
            }
          const cl = (fresh as any).currentLesson
          const wp = (fresh as any).currentWinePourOrder
          const startedAt = (fresh as any).currentWineFocusStartedAt
          const revealedRaw = (fresh as any).revealedPourOrders
          return {
            currentLessonId: cl == null ? null : typeof cl === 'object' ? cl.id : cl,
            currentWinePourOrder: typeof wp === 'number' ? wp : null,
            currentWineFocusStartedAt:
              typeof startedAt === 'string' ? startedAt : null,
            revealedPourOrders: Array.isArray(revealedRaw)
              ? (revealedRaw as number[]).filter((n) => typeof n === 'number')
              : [],
            blindTasting: Boolean((fresh as any).blindTasting),
          }
        } catch (err) {
          log.error({ err, sessionId }, 'sse_read_host_pointer_failed')
          return {
            currentLessonId: null,
            currentWinePourOrder: null,
            currentWineFocusStartedAt: null,
            revealedPourOrders: [],
            blindTasting: false,
          }
        }
      }
```

The existing change-detection logic compares the JSON-stringified payload — keep it working by extending the equality check. Find the comparison and replace with a deep JSON check:

```ts
      const lessonPoll = setInterval(async () => {
        if (closed) return
        const next = await readHostPointer()
        if (JSON.stringify(next) !== JSON.stringify(lastPointer)) {
          lastPointer = next
          send('lesson', next)
        }
      }, LESSON_POLL_INTERVAL_MS)
```

(Replaces the per-field `!==` comparison with a JSON.stringify diff. Cheap for tiny objects; semantically clearer.)

- [ ] **Step 2: Add swarm aggregation + emit**

In the same file, after the roster poller setup, add a swarm poller. The pattern mirrors the lesson poller:

```ts
      // ───── Swarm aggregator ─────
      type SwarmEntry = {
        avgRating: number
        ratingCount: number
        aromaCounts: Array<{ label: string; count: number }>
      }
      type SwarmPayload = { byPourOrder: Record<number, SwarmEntry> }

      const buildSwarm = async (): Promise<SwarmPayload> => {
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
          const wineIdToPour: Record<number, number> = {}
          const titleToPour: Record<string, number> = {}
          wines.forEach((w, idx) => {
            const pourOrder = w.pourOrder ?? idx + 1
            if (w.libraryWine) {
              const id = typeof w.libraryWine === 'object' ? w.libraryWine.id : w.libraryWine
              if (typeof id === 'number') wineIdToPour[id] = pourOrder
            } else if (w.customWine?.name) {
              titleToPour[String(w.customWine.name).toLowerCase()] = pourOrder
            }
          })

          const reviews = await payload.find({
            collection: 'reviews',
            where: { session: { equals: sessionId } },
            limit: 1000,
            depth: 0,
            overrideAccess: true,
          })

          type Acc = { ratings: number[]; aromas: Map<string, number> }
          const accs: Record<number, Acc> = {}
          for (const r of reviews.docs as any[]) {
            let pour: number | undefined
            if (r.wine) {
              const id = typeof r.wine === 'object' ? r.wine.id : r.wine
              if (typeof id === 'number') pour = wineIdToPour[id]
            } else if (r.customWine?.name) {
              pour = titleToPour[String(r.customWine.name).toLowerCase()]
            }
            if (pour == null) continue
            const acc = (accs[pour] ||= { ratings: [], aromas: new Map() })
            if (typeof r.rating === 'number') acc.ratings.push(r.rating)
            const aromas = r.wsetTasting?.nose?.primaryAromas
            if (Array.isArray(aromas)) {
              for (const a of aromas) {
                const label = typeof a === 'string' ? a.trim() : ''
                if (!label) continue
                const key = label.toLocaleLowerCase('sv')
                const prev = acc.aromas.get(key)
                acc.aromas.set(key, (prev ?? 0) + 1)
              }
            }
          }

          const byPourOrder: Record<number, SwarmEntry> = {}
          for (const [pourStr, acc] of Object.entries(accs)) {
            const pour = Number(pourStr)
            const avg =
              acc.ratings.length > 0
                ? acc.ratings.reduce((s, r) => s + r, 0) / acc.ratings.length
                : 0
            const allAromas = Array.from(acc.aromas.entries())
              .map(([key, count]) => ({ label: key, count }))
              .sort((a, b) => b.count - a.count)
            const top = allAromas.slice(0, 10)
            const rest = allAromas.slice(10).reduce((s, e) => s + e.count, 0)
            const aromaCounts = top
            if (rest > 0) aromaCounts.push({ label: 'Annat', count: rest })
            byPourOrder[pour] = {
              avgRating: Number(avg.toFixed(2)),
              ratingCount: acc.ratings.length,
              aromaCounts,
            }
          }
          return { byPourOrder }
        } catch (err) {
          log.error({ err, sessionId }, 'sse_build_swarm_failed')
          return { byPourOrder: {} }
        }
      }

      let lastSwarmJson = JSON.stringify({ byPourOrder: {} })
      // Initial swarm frame (empty for fresh session, populated if reviews already exist)
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
```

And in the cleanup at the end of the stream (where `clearInterval(lessonPoll)` etc. live), add `clearInterval(swarmPoll)`.

- [ ] **Step 3: Extend SessionContext**

In `src/context/SessionContext.tsx`, add to the interface:

```ts
  /** Plan-mode focus timestamp; null when no wine is in focus. Set by RealtimeSync. */
  hostFocusStartedAt: string | null
  setHostFocusStartedAt: (s: string | null) => void
  /** Plan-mode revealed pour orders. Set by RealtimeSync. */
  revealedPourOrders: number[]
  setRevealedPourOrders: (a: number[]) => void
  /** Plan-mode swarm aggregations keyed by pour order. */
  swarm: Record<number, { avgRating: number; ratingCount: number; aromaCounts: Array<{ label: string; count: number }> }>
  setSwarm: (s: SessionContextValue['swarm']) => void
```

Add the corresponding `useState` declarations:

```ts
  const [hostFocusStartedAt, setHostFocusStartedAtState] = useState<string | null>(null)
  const [revealedPourOrders, setRevealedPourOrdersState] = useState<number[]>([])
  const [swarm, setSwarmState] = useState<SessionContextValue['swarm']>({})
```

And stable setter callbacks:

```ts
  const setHostFocusStartedAt = useCallback((s: string | null) => {
    setHostFocusStartedAtState(s)
  }, [])
  const setRevealedPourOrders = useCallback((a: number[]) => {
    setRevealedPourOrdersState(a)
  }, [])
  const setSwarm = useCallback((s: SessionContextValue['swarm']) => {
    setSwarmState(s)
  }, [])
```

Add them to the `value` object at the end:

```ts
  const value: SessionContextValue = {
    // ...existing...
    hostFocusStartedAt,
    setHostFocusStartedAt,
    revealedPourOrders,
    setRevealedPourOrders,
    swarm,
    setSwarm,
  }
```

- [ ] **Step 4: Extend RealtimeSync**

In `src/components/course/RealtimeSync.tsx`, destructure the new setters:

```ts
  const {
    setHostCurrentLessonId,
    setHostCurrentWinePourOrder,
    setHostFocusStartedAt,
    setRevealedPourOrders,
    setRoster,
    setSwarm,
  } = useActiveSession()
```

Extend the lesson listener:

```ts
    es.addEventListener('lesson', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as {
          currentLessonId: number | null
          currentWinePourOrder?: number | null
          currentWineFocusStartedAt?: string | null
          revealedPourOrders?: number[]
          blindTasting?: boolean
        }
        setHostCurrentLessonId(data.currentLessonId)
        if ('currentWinePourOrder' in data) {
          setHostCurrentWinePourOrder(data.currentWinePourOrder ?? null)
        }
        if ('currentWineFocusStartedAt' in data) {
          setHostFocusStartedAt(data.currentWineFocusStartedAt ?? null)
        }
        if (Array.isArray(data.revealedPourOrders)) {
          setRevealedPourOrders(data.revealedPourOrders)
        }
      } catch {
        // ignore
      }
    })
```

Add the swarm listener:

```ts
    es.addEventListener('swarm', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as {
          byPourOrder: Record<number, {
            avgRating: number
            ratingCount: number
            aromaCounts: Array<{ label: string; count: number }>
          }>
        }
        if (data?.byPourOrder) setSwarm(data.byPourOrder)
      } catch {
        // ignore
      }
    })
```

Extend the cleanup deps array:

```ts
  }, [
    sessionId,
    setHostCurrentLessonId,
    setHostCurrentWinePourOrder,
    setHostFocusStartedAt,
    setRevealedPourOrders,
    setRoster,
    setSwarm,
  ])
```

- [ ] **Step 5: TS sweep + commit**

```bash
pnpm exec tsc --noEmit 2>&1 | grep -E "(stream/route|SessionContext|RealtimeSync)" | head
git add "src/app/api/sessions/[sessionId]/stream/route.ts" \
  src/context/SessionContext.tsx \
  src/components/course/RealtimeSync.tsx
git commit -m "$(cat <<'EOF'
otter: realtime layer for blind / timer / swarm

- SSE lesson event now carries currentWineFocusStartedAt,
  revealedPourOrders, and blindTasting
- New swarm SSE event with server-side aggregation (avg rating,
  rating count, top-10 aroma frequencies + Annat overflow)
- SessionContext exposes hostFocusStartedAt, revealedPourOrders,
  and swarm to consumers
- RealtimeSync wires both

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Wizard + StartSessionButton

**Files:**
- Modify: `src/components/tasting-plan/TastingPlanForm.tsx`
- Modify: `src/components/course/StartSessionButton.tsx`

- [ ] **Step 1: TastingPlanForm — Provningsinställningar section**

In `src/components/tasting-plan/TastingPlanForm.tsx`, find the state declarations near the top of the component (where `title`, `occasion`, etc. live). Add two new pieces of state:

```ts
  const [blindTastingByDefault, setBlindTastingByDefault] = React.useState<boolean>(
    initialPlan?.blindTastingByDefault ?? false,
  )
  const [defaultMinutesPerWine, setDefaultMinutesPerWine] = React.useState<number | ''>(
    initialPlan?.defaultMinutesPerWine ?? '',
  )
```

In the `save` function's `payload` object, add both fields:

```ts
    const payload = {
      title: title.trim(),
      description: description || undefined,
      occasion: occasion || undefined,
      targetParticipants,
      hostScript: hostScript || undefined,
      blindTastingByDefault,
      defaultMinutesPerWine: defaultMinutesPerWine === '' ? null : Number(defaultMinutesPerWine),
      wines: wines.map((w, idx) => ({ /* unchanged */ })),
    }
```

Now find the JSX section between participants and wines. Insert a "Provningsinställningar" section. Look for the section containing `targetParticipants` — add this immediately after it:

```tsx
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Provningsinställningar</h2>
        <div className="space-y-3 rounded-md border bg-card p-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input accent-brand-400"
              checked={blindTastingByDefault}
              onChange={(e) => setBlindTastingByDefault(e.target.checked)}
            />
            <span className="text-sm">
              <span className="font-medium">Blindprovning</span>{' '}
              <span className="text-muted-foreground">
                — viner visas anonymt tills du avslöjar dem.
              </span>
            </span>
          </label>
          <div>
            <Label htmlFor="t-minutes">Tid per vin (minuter)</Label>
            <Input
              id="t-minutes"
              type="number"
              min={1}
              max={60}
              value={defaultMinutesPerWine}
              onChange={(e) =>
                setDefaultMinutesPerWine(e.target.value === '' ? '' : Number(e.target.value))
              }
              className="w-28"
              placeholder="t.ex. 5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Lämna tomt för ingen timer.
            </p>
          </div>
        </div>
      </section>
```

(If `Label` and `Input` aren't imported in the file already, they are — verify with a quick grep.)

- [ ] **Step 2: StartSessionButton — blindTasting modal toggle**

In `src/components/course/StartSessionButton.tsx`, locate the form-create step (the "Skapa session" step that renders before the share step). It currently has a session-name input and a submit button.

Find the props destructure / variables — there's `isPlan` and `props.tastingPlanId`. The button also has access to the plan via prop OR could lookup the default from the parent. Simplest path: accept `defaultBlindTasting` as a NEW optional prop in the plan-mode shape:

```ts
type StartSessionButtonProps =
  | {
      courseId: number
      courseTitle: string
      courseSlug?: string
      tastingPlanId?: never
      planTitle?: never
      defaultBlindTasting?: never
    }
  | {
      tastingPlanId: number
      planTitle: string
      courseId?: never
      courseTitle?: never
      courseSlug?: never
      defaultBlindTasting?: boolean
    }
```

In the component body:

```ts
  const defaultBlindTasting = isPlan ? props.defaultBlindTasting ?? false : false
  const [blindTasting, setBlindTasting] = useState<boolean>(defaultBlindTasting)
```

In the `handleCreateSession` body, add `blindTasting` to the POST body when in plan mode:

```ts
        body: JSON.stringify({
          ...(isPlan
            ? { tastingPlanId: props.tastingPlanId, blindTasting }
            : { courseId: props.courseId }),
          sessionName: sessionName || `${titleText} - Gruppsession`,
          maxParticipants: 50,
        }),
```

In the modal JSX for the create-step (find the existing form with the session-name input), add a small toggle row gated on `isPlan`. Find the form body and inject after the session-name input:

```tsx
            {isPlan && (
              <label className="flex items-center gap-2 mt-3 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input accent-brand-400"
                  checked={blindTasting}
                  onChange={(e) => setBlindTasting(e.target.checked)}
                />
                <span>
                  <span className="font-medium">Blindprovning</span>{' '}
                  <span className="text-muted-foreground">
                    — du kan avslöja viner ett i taget.
                  </span>
                </span>
              </label>
            )}
```

- [ ] **Step 3: Pass defaultBlindTasting from PlanDetailView**

In `src/components/tasting-plan/PlanDetailView.tsx`, find where `<StartSessionButton tastingPlanId={...} planTitle={...} />` is rendered. Add the prop:

```tsx
        <StartSessionButton
          tastingPlanId={plan.id}
          planTitle={plan.title}
          defaultBlindTasting={plan.blindTastingByDefault ?? false}
        />
```

- [ ] **Step 4: TS sweep + commit**

```bash
pnpm exec tsc --noEmit 2>&1 | grep -E "(TastingPlanForm|StartSessionButton|PlanDetailView)" | head
git add src/components/tasting-plan/TastingPlanForm.tsx \
  src/components/course/StartSessionButton.tsx \
  src/components/tasting-plan/PlanDetailView.tsx
git commit -m "$(cat <<'EOF'
otter: wizard + start-session UI for blind / timer

- TastingPlanForm gains Provningsinställningar section
  (blindTastingByDefault + defaultMinutesPerWine)
- StartSessionButton in plan mode shows a Blindprovning toggle
  defaulting from plan.blindTastingByDefault, sent in POST body
- PlanDetailView passes the plan default through

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: WineFocusTimer + SwarmPanel

**Files:**
- Create: `src/components/tasting-plan/WineFocusTimer.tsx`
- Create: `src/components/tasting-plan/SwarmPanel.tsx`

- [ ] **Step 1: WineFocusTimer**

`src/components/tasting-plan/WineFocusTimer.tsx`:

```tsx
'use client'

import * as React from 'react'

export interface WineFocusTimerProps {
  /** ISO timestamp of when this wine got focus. */
  startedAt: string | null
  /** Total countdown duration in minutes. */
  minutesPerWine: number
}

/**
 * Countdown chip for the currently-focused wine. Renders nothing if either
 * `startedAt` or `minutesPerWine` is missing/invalid.
 *
 * Color states:
 *   > 30s remaining: muted
 *   ≤ 30s and > 0: amber
 *   ≤ 0: red "Dags att gå vidare?"
 *
 * Recomputes once per second via a setInterval. Stops auto-updating once
 * the remaining time is past zero (the display is stable from there on).
 */
export function WineFocusTimer({ startedAt, minutesPerWine }: WineFocusTimerProps) {
  const totalSeconds = React.useMemo(() => {
    if (!minutesPerWine || minutesPerWine <= 0) return 0
    return Math.floor(minutesPerWine * 60)
  }, [minutesPerWine])

  const [now, setNow] = React.useState<number>(() => Date.now())
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!startedAt || totalSeconds <= 0) return null

  const startMs = new Date(startedAt).getTime()
  if (Number.isNaN(startMs)) return null

  const elapsedSec = Math.max(0, Math.floor((now - startMs) / 1000))
  const remainingSec = totalSeconds - elapsedSec

  const mm = Math.floor(Math.abs(remainingSec) / 60)
  const ss = Math.abs(remainingSec) % 60
  const mmss = `${mm}:${String(ss).padStart(2, '0')}`

  if (remainingSec <= 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive px-2.5 py-0.5 text-xs font-medium">
        Dags att gå vidare?
      </span>
    )
  }

  const isWarn = remainingSec <= 30
  const tone = isWarn
    ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200'
    : 'bg-muted text-muted-foreground'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums ${tone}`}
    >
      {mmss}
    </span>
  )
}
```

- [ ] **Step 2: SwarmPanel**

`src/components/tasting-plan/SwarmPanel.tsx`:

```tsx
'use client'

import * as React from 'react'

export interface SwarmEntry {
  avgRating: number
  ratingCount: number
  aromaCounts: Array<{ label: string; count: number }>
}

export interface SwarmPanelProps {
  entry: SwarmEntry | null | undefined
}

function renderStars(rating: number | null): string {
  if (rating == null) return '—'
  const full = Math.max(0, Math.min(5, Math.round(rating)))
  return '★'.repeat(full) + '☆'.repeat(5 - full)
}

/**
 * Tiny per-wine swarm card. Renders below a wine row's action buttons.
 *
 * - When `entry` is null/undefined OR has zero ratings, shows an empty state.
 * - Otherwise shows: avg rating chip + reviewer count + aroma frequency chips.
 *
 * The parent is responsible for gating visibility (host always; guest only
 * after they've submitted their own review for this wine).
 */
export function SwarmPanel({ entry }: SwarmPanelProps) {
  if (!entry || entry.ratingCount === 0) {
    return (
      <div className="mt-3 rounded-md border border-dashed bg-card/50 p-3">
        <p className="text-xs text-muted-foreground">Inga betyg ännu — du var först.</p>
      </div>
    )
  }

  return (
    <div className="mt-3 rounded-md border bg-card p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-brand-400 text-sm tracking-wider tabular-nums">
          {renderStars(entry.avgRating)}
        </span>
        <span className="text-sm font-medium">{entry.avgRating.toFixed(1)}</span>
        <span className="text-xs text-muted-foreground">
          ({entry.ratingCount} {entry.ratingCount === 1 ? 'betyg' : 'betyg'})
        </span>
      </div>
      {entry.aromaCounts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entry.aromaCounts.map((a) => (
            <span
              key={a.label}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
            >
              <span className="capitalize">{a.label}</span>
              <span className="text-muted-foreground">({a.count})</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: TS sweep + commit**

```bash
pnpm exec tsc --noEmit 2>&1 | grep -E "(WineFocusTimer|SwarmPanel)" | head
git add src/components/tasting-plan/WineFocusTimer.tsx \
  src/components/tasting-plan/SwarmPanel.tsx
git commit -m "$(cat <<'EOF'
otter: WineFocusTimer + SwarmPanel components

Two small presentational components for the live plan-session UI:
- WineFocusTimer: per-second countdown chip with muted → amber → red
  color states, gentle "Dags att gå vidare?" at zero
- SwarmPanel: avg rating + reviewer count + aroma frequency chips

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: PlanSessionContent integration

**File:** `src/components/tasting-plan/PlanSessionContent.tsx`

This is the big integration task. Read the full current file first.

- [ ] **Step 1: New imports + types**

Add at the top:

```ts
import { WineFocusTimer } from './WineFocusTimer'
import { SwarmPanel } from './SwarmPanel'
```

The existing import of `useActiveSession` already pulls the new context fields after Task 3 — just destructure them.

- [ ] **Step 2: Extend the context destructure + add submission tracking state**

Find the existing line:

```ts
  const { hostCurrentWinePourOrder } = useActiveSession()
```

Replace with:

```ts
  const {
    hostCurrentWinePourOrder,
    hostFocusStartedAt,
    revealedPourOrders,
    swarm,
  } = useActiveSession()
```

Below the existing state declarations, add:

```ts
  // Track which wines THIS participant has already submitted reviews for.
  // Seeded from /my-submissions on mount; appended locally on each submit.
  const [submittedPourOrders, setSubmittedPourOrders] = React.useState<Set<number>>(new Set())
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
    return () => {
      aborted = true
    }
  }, [session.id])
```

- [ ] **Step 3: Compute effective revealed set (with optimistic local additions)**

Below the state declarations, add:

```ts
  // Optimistic local reveal set so the host sees the change instantly
  // before SSE catches up.
  const [localRevealed, setLocalRevealed] = React.useState<Set<number>>(new Set())
  const effectiveRevealed = React.useMemo(() => {
    const s = new Set<number>(revealedPourOrders ?? [])
    localRevealed.forEach((p) => s.add(p))
    return s
  }, [revealedPourOrders, localRevealed])

  const isBlind = Boolean((session as any).blindTasting)
```

- [ ] **Step 4: Reveal handler**

Below `setFocus`, add:

```ts
  async function revealWine(pourOrder: number) {
    setLocalRevealed((prev) => new Set([...prev, pourOrder]))
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

- [ ] **Step 5: Per-row redaction in the render**

In the JSX `rows.map((row) => ...)` block, BEFORE computing `isActive`, derive a `displayRow` that respects blind redaction for guests:

```tsx
              const isHiddenForGuest =
                isBlind && !isHost && !effectiveRevealed.has(row.pourOrder)
              const displayRow = isHiddenForGuest
                ? {
                    ...row,
                    title: `Vin #${row.pourOrder}`,
                    subtitle: '',
                    hostNotes: null as string | null,
                    imageUrl: null as string | null,
                  }
                : row
              const isActive = activePour === row.pourOrder
              const showRevealButton = isHost && isBlind && !effectiveRevealed.has(row.pourOrder)
              const swarmEntry = swarm[row.pourOrder]
              const shouldShowSwarm = isHost || submittedPourOrders.has(row.pourOrder)
```

Use `displayRow` everywhere `row` was used for visible fields (`title`, `subtitle`, `imageUrl`, `hostNotes`). The pour-order pill and action handlers still use `row.pourOrder`.

- [ ] **Step 6: Render the timer chip and reveal/next buttons**

In the card's existing action row, add timer chip + new-buttons logic. Find:

```tsx
                        <div className="mt-3 flex gap-2 flex-wrap">
                          {isHost && (
                            <Button
                              type="button"
                              size="sm"
                              variant={isActive ? 'default' : 'outline'}
                              disabled={settingFocus}
                              onClick={() => setFocus(row.pourOrder)}
                            >
                              {isActive ? 'I fokus' : 'Sätt fokus'}
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setReviewing(row)}
                          >
                            Betygsätt
                          </Button>
                        </div>
```

Replace with:

```tsx
                        <div className="mt-3 flex gap-2 flex-wrap items-center">
                          {isHost && (
                            <Button
                              type="button"
                              size="sm"
                              variant={isActive ? 'default' : 'outline'}
                              disabled={settingFocus}
                              onClick={() => setFocus(row.pourOrder)}
                            >
                              {isActive ? 'I fokus' : 'Sätt fokus'}
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setReviewing(row)}
                          >
                            Betygsätt
                          </Button>
                          {showRevealButton && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => revealWine(row.pourOrder)}
                            >
                              Avslöja vin #{row.pourOrder}
                            </Button>
                          )}
                          {isActive && plan.defaultMinutesPerWine ? (
                            <WineFocusTimer
                              startedAt={hostFocusStartedAt}
                              minutesPerWine={plan.defaultMinutesPerWine}
                            />
                          ) : null}
                          {isActive &&
                          isHost &&
                          plan.defaultMinutesPerWine &&
                          hostFocusStartedAt &&
                          row.pourOrder < rows.length ? (
                            <NextWineButton
                              startedAt={hostFocusStartedAt}
                              minutesPerWine={plan.defaultMinutesPerWine}
                              onNext={() => setFocus(row.pourOrder + 1)}
                              disabled={settingFocus}
                            />
                          ) : null}
                        </div>

                        {shouldShowSwarm && (
                          <SwarmPanel entry={swarmEntry ?? null} />
                        )}
```

(Replace `row.title`, etc. with `displayRow.title` in the rendering above this block.)

- [ ] **Step 7: NextWineButton helper**

At the bottom of the file (outside the main component), add this small subcomponent so the "→ Nästa vin" button only renders when the timer is at zero or below:

```tsx
function NextWineButton({
  startedAt,
  minutesPerWine,
  onNext,
  disabled,
}: {
  startedAt: string
  minutesPerWine: number
  onNext: () => void
  disabled?: boolean
}) {
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const elapsedSec = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000))
  if (elapsedSec < minutesPerWine * 60) return null
  return (
    <Button
      type="button"
      size="sm"
      variant="default"
      disabled={disabled}
      onClick={onNext}
      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
    >
      → Nästa vin
    </Button>
  )
}
```

- [ ] **Step 8: Append-on-submit for swarm gating**

Update the WineReviewForm `onSubmit` callback for both library and custom dialog rendering:

Find:
```tsx
              <WineReviewForm
                lessonId={0}
                sessionId={String(session.id)}
                wineIdProp={reviewing.libraryWineId}
                insideDialog
                onSubmit={() => setReviewing(null)}
              />
```

Replace BOTH similar blocks (library and custom) with:

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

And the custom-snapshot variant:

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

- [ ] **Step 9: TS sweep + commit**

```bash
pnpm exec tsc --noEmit 2>&1 | grep "PlanSessionContent" | head
git add src/components/tasting-plan/PlanSessionContent.tsx
git commit -m "$(cat <<'EOF'
otter: PlanSessionContent — blind, timer, swarm integration

Wires Task 1-5 into the live session UI:
- Blind-mode redaction per row for guests (host always sees full info)
- Host-only Avslöja button per hidden wine (optimistic local + POST)
- WineFocusTimer chip when wine is in focus + plan.defaultMinutesPerWine
- → Nästa vin button (host only, only at timer zero)
- SwarmPanel below each row, gated on host OR own-submission
- Submission tracking: seeded from /my-submissions on mount, appended
  on each successful WineReviewForm onSubmit

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: E2E + push to production

- [ ] **Step 1: Lint + TS sweep**

```bash
pnpm lint 2>&1 | tail -20
pnpm exec tsc --noEmit 2>&1 | grep -E "(TastingPlans|CourseSessions|host-state|sessions/create|my-submissions|stream/route|SessionContext|RealtimeSync|TastingPlanForm|StartSessionButton|PlanDetailView|WineFocusTimer|SwarmPanel|PlanSessionContent|mina-provningar/planer/\[id\]/page)" | head -40
```
Expected: lint clean; no NEW TS errors in touched files.

- [ ] **Step 2: Build smoke**

```bash
pnpm build 2>&1 | tail -40
```
Expected: "Compiled successfully".

- [ ] **Step 3: Local migration**

```bash
pnpm payload migrate 2>&1 | tail -5
```
Expected: applies the new migration cleanly. Verify columns:

```bash
psql "$DATABASE_URI" -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'tasting_plans' AND column_name IN ('blind_tasting_by_default','default_minutes_per_wine');"
psql "$DATABASE_URI" -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'course_sessions' AND column_name IN ('blind_tasting','revealed_pour_orders','current_wine_focus_started_at');"
```
Expected: each query returns the requested columns.

- [ ] **Step 4: Curl smoke (unauth paths)**

```bash
lsof -nP -i tcp:3000 | grep LISTEN | head -1 || (pnpm dev > /tmp/dev.log 2>&1 &)
until curl -s --max-time 3 http://localhost:3000/api/users/me >/dev/null 2>&1; do sleep 2; done

# my-submissions returns empty for unknown caller (no participant token)
curl -s "http://localhost:3000/api/sessions/1/my-submissions" -w "\nHTTP %{http_code}\n" | tail -2

# host-state unauth → 401
curl -s -X POST -H "Content-Type: application/json" -d '{"revealPourOrder":1}' \
  http://localhost:3000/api/sessions/1/host-state -w "\nHTTP %{http_code}\n" | tail -2

# sessions/create unauth → 401
curl -s -X POST -H "Content-Type: application/json" -d '{"tastingPlanId":1,"blindTasting":true}' \
  http://localhost:3000/api/sessions/create -w "\nHTTP %{http_code}\n" | tail -2
```
Expected: my-submissions returns `{"submittedPourOrders":[]}`+200; host-state returns 401; sessions/create returns 401.

- [ ] **Step 5: Manual UI smoke** (deferred to user; document):

1. Create a plan with `blindTastingByDefault = true` and `defaultMinutesPerWine = 1` (so the timer fires fast).
2. Start a session from the plan — confirm the Blindprovning toggle is on by default in the modal; uncheck and verify the session is NOT blind. Re-check; start.
3. Open the session as guest (incognito). Wine cards show `Vin #1`, `Vin #2`, etc. — no wine identity in DOM or network responses.
4. Host taps `Sätt fokus` on wine 2 → guest's card shows the focused border within 2s. Timer chip starts at `1:00`, counts down, turns amber at `0:30`, turns red at zero with `Dags att gå vidare?`. Host sees a `→ Nästa vin` button next to it.
5. Host taps `Avslöja vin #2` → guest's card flips to show the wine identity within 2s.
6. Guest submits a review for wine 2 → swarm panel appears immediately under the row. Avg rating + aroma chip(s) match what was submitted.
7. Another participant submits a review for wine 2 → swarm panel updates within 2s on both browsers.
8. Reload the guest browser mid-session → previously-submitted swarm visibility is restored (from /my-submissions).

- [ ] **Step 6: Push to main**

```bash
git log --oneline origin/main..HEAD
git push origin main
```

If push rejected, STOP and report.

- [ ] **Step 7: Merge main → production**

```bash
git fetch origin
git checkout production
git pull --ff-only origin production
git merge --no-ff main -m "$(cat <<'EOF'
release: Chunk F — Host superpowers (blind / timer / swarm)

Three new live-session mechanics for plan-driven sessions:
- Blind tasting with per-wine reveal (per-plan default + per-session override)
- Per-wine pacing timer with gentle nudge at zero (no auto-advance)
- Tasting-note swarm: avg rating + aroma frequency, gated on
  own-submission for guests

Schema: 5 nullable/defaulted columns (2 on tasting_plans, 3 on
course_sessions). SSE stream extended; new my-submissions endpoint.
Migration runs on Railway boot via prodMigrations.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push origin production
git checkout main
```

- [ ] **Step 8: Verify deploy**

```bash
git log origin/production --oneline -3
```
Expected: the merge commit at HEAD on origin/production.

---

## Out of scope (deferred)

- Bulk reveal ("avslöja alla").
- Auto-advance on timer zero.
- Sound or haptic at timer zero.
- Timer pause/resume.
- Re-blind a revealed wine.
- Per-participant submission deadline.
- Aroma autocomplete to enforce canonical labels.
- Swarm bar-chart/visualization.
