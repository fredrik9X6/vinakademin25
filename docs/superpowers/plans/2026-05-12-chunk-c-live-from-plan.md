# Chunk C — Live from Plan + Host Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A host can run a live group tasting driven by their own tasting plan — plan detail page with start-session, plan-mode SessionView, shopping list, and printable cheat sheet.

**Architecture:** Three new server pages under `/mina-provningar/planer/[id]/...` plus a chrome-free `/varguide/[id]` print page under a `(bare)` route group. SessionView gets an inline branch for plan-driven sessions that renders a new `PlanSessionContent` component (wine list with active-wine pacing). `StartSessionButton` is generalized to accept `tastingPlanId` instead of `courseId`. `WineReviewForm` extended to accept a `customWineSnapshot` so guests can review custom wines. No schema changes.

**Tech Stack:** Next.js 15 (App Router) + React 19 + Payload CMS 3.33 + shadcn UI + sonner toast + existing SSE/host-state infrastructure.

**Spec:** `docs/superpowers/specs/2026-05-12-chunk-c-live-from-plan-design.md`

---

## File Structure

```
NEW src/components/tasting-plan/PlanDetailView.tsx                                  Task 2
NEW src/app/(frontend)/(site)/mina-provningar/planer/[id]/page.tsx                  Task 2
MOD src/components/tasting-plan/PlanCard.tsx                                        Task 2
MOD src/components/course/StartSessionButton.tsx                                    Task 1
MOD src/components/course/WineReviewForm.tsx                                        Task 3
NEW src/components/tasting-plan/PlanSessionContent.tsx                              Task 4
MOD src/components/course/SessionView.tsx                                           Task 5
NEW src/components/tasting-plan/PlanShoppingList.tsx                                Task 6
NEW src/app/(frontend)/(site)/mina-provningar/planer/[id]/handlingslista/page.tsx   Task 6
NEW src/app/(frontend)/(bare)/layout.tsx                                            Task 7
NEW src/components/tasting-plan/PlanPrintCheatSheet.tsx                             Task 7
NEW src/app/(frontend)/(bare)/varguide/[id]/page.tsx                                Task 7
END E2E smoke + push to production                                                  Task 8
```

---

## Task 1: Generalize `StartSessionButton` to accept `tastingPlanId`

**Files:**
- Modify: `src/components/course/StartSessionButton.tsx`

- [ ] **Step 1: Widen prop type**

Find the existing interface (around lines 20-24):

```ts
interface StartSessionButtonProps {
  courseId: number
  courseTitle: string
  courseSlug?: string
}
```

Replace with a discriminated XOR:

```ts
type StartSessionButtonProps =
  | {
      courseId: number
      courseTitle: string
      courseSlug?: string
      tastingPlanId?: never
      planTitle?: never
    }
  | {
      tastingPlanId: number
      planTitle: string
      courseId?: never
      courseTitle?: never
      courseSlug?: never
    }
```

- [ ] **Step 2: Update function signature and body for the polymorphic post**

Find the existing component signature:

```tsx
export default function StartSessionButton({
  courseId,
  courseTitle,
  courseSlug,
}: StartSessionButtonProps) {
```

Replace with:

```tsx
export default function StartSessionButton(props: StartSessionButtonProps) {
  const isPlan = 'tastingPlanId' in props && props.tastingPlanId != null
  const titleText = isPlan ? props.planTitle : props.courseTitle
```

Then inside `handleCreateSession`, replace the body JSON construction. Find:

```ts
        body: JSON.stringify({
          courseId,
          sessionName: sessionName || `${courseTitle} - Gruppsession`,
          maxParticipants: 50,
        }),
```

Replace with:

```ts
        body: JSON.stringify({
          ...(isPlan
            ? { tastingPlanId: props.tastingPlanId }
            : { courseId: props.courseId }),
          sessionName: sessionName || `${titleText} - Gruppsession`,
          maxParticipants: 50,
        }),
```

- [ ] **Step 3: Replace remaining bare `courseTitle` / `courseSlug` references in the JSX**

The component uses `courseTitle` and `courseSlug` for display copy and the "Open course" link. Replace each remaining usage:

- `courseTitle` → `titleText` everywhere it appears in the JSX (greeting copy, modal text).
- The `courseSlug`-based open-link must be guarded: only render the "Öppna kurssida" anchor (or whatever the existing label is) when `!isPlan && courseSlug` truthy. For plan sessions, replace with a "Öppna provningssida" anchor that points to `/mina-provningar/planer/[tastingPlanId]?session=[id]`.

Read the file fully (`Read src/components/course/StartSessionButton.tsx` — it's ~261 lines) and apply these substitutions wherever the bare variables appear. Use `grep -n courseTitle src/components/course/StartSessionButton.tsx` and `grep -n courseSlug src/components/course/StartSessionButton.tsx` to find every occurrence.

- [ ] **Step 4: TS sweep**

```bash
pnpm exec tsc --noEmit 2>&1 | grep "StartSessionButton" | head
```
Expected: no output.

If existing callers (e.g. `src/components/course/CourseOverview.tsx`) now mismatch the new XOR type, fix call sites by ensuring they pass `courseId + courseTitle` (still works in the `courseId` branch). Re-run TS sweep.

- [ ] **Step 5: Commit**

```bash
git add src/components/course/StartSessionButton.tsx
git commit -m "$(cat <<'EOF'
otter: StartSessionButton accepts tastingPlanId (XOR with courseId)

Discriminated-union prop shape so the same button can launch either a
course session (existing) or a plan-driven session (Chunk C). Body of
POST /api/sessions/create swaps courseId ↔ tastingPlanId; the route
itself was made polymorphic in Chunk A's Task 4.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Plan detail page + PlanCard body-link change

**Files:**
- Create: `src/components/tasting-plan/PlanDetailView.tsx`
- Create: `src/app/(frontend)/(site)/mina-provningar/planer/[id]/page.tsx`
- Modify: `src/components/tasting-plan/PlanCard.tsx`

- [ ] **Step 1: Create `PlanDetailView.tsx`**

```tsx
'use client'

import * as React from 'react'
import Link from 'next/link'
import type { TastingPlan, Wine } from '@/payload-types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Pencil, ShoppingBag, Printer } from 'lucide-react'
import StartSessionButton from '@/components/course/StartSessionButton'

const STATUS_LABEL: Record<TastingPlan['status'], string> = {
  draft: 'Utkast',
  ready: 'Klar',
  archived: 'Arkiverad',
}
const STATUS_VARIANT: Record<TastingPlan['status'], 'brand' | 'default' | 'secondary'> = {
  draft: 'brand',
  ready: 'default',
  archived: 'secondary',
}

function formatRelative(iso: string): string {
  const ts = new Date(iso).getTime()
  if (Number.isNaN(ts)) return ''
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (diffSec < 60) return 'just nu'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min sedan`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} tim sedan`
  if (diffSec < 86400 * 30) return `${Math.floor(diffSec / 86400)} d sedan`
  return new Date(iso).toLocaleDateString('sv-SE')
}

function wineTitle(w: NonNullable<TastingPlan['wines']>[number]): string {
  if (w.libraryWine && typeof w.libraryWine === 'object') {
    const lib = w.libraryWine as Wine
    return lib.name || `Vin #${lib.id}`
  }
  return w.customWine?.name || 'Namnlöst vin'
}

function wineSubtitle(w: NonNullable<TastingPlan['wines']>[number]): string {
  if (w.libraryWine && typeof w.libraryWine === 'object') {
    const lib = w.libraryWine as Wine
    const region =
      typeof lib.region === 'object' && lib.region ? lib.region.name ?? null : null
    return [lib.winery, lib.vintage, region].filter(Boolean).join(' · ')
  }
  const c = w.customWine
  return [c?.producer, c?.vintage].filter(Boolean).join(' · ')
}

export interface PlanDetailViewProps {
  plan: TastingPlan
}

export function PlanDetailView({ plan }: PlanDetailViewProps) {
  const wines = plan.wines ?? []
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-32 grid gap-8 md:grid-cols-[1fr_280px]">
      <div className="space-y-6 min-w-0">
        <header>
          <h1 className="text-3xl font-heading">{plan.title}</h1>
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <Badge variant={STATUS_VARIANT[plan.status]}>{STATUS_LABEL[plan.status]}</Badge>
            <span>{plan.occasion || '—'}</span>
            <span>·</span>
            <span>Senast uppdaterad {formatRelative(plan.updatedAt)}</span>
          </div>
        </header>

        {plan.description && (
          <Card className="p-4">
            <p className="text-sm whitespace-pre-wrap">{plan.description}</p>
          </Card>
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Viner ({wines.length})</h2>
          {wines.length === 0 ? (
            <p className="text-sm text-muted-foreground">Inga viner tillagda.</p>
          ) : (
            <ul className="space-y-2">
              {wines.map((w, idx) => (
                <li key={w.id ?? idx} className="flex gap-3 rounded-md border bg-card p-3 items-start">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-400/10 text-brand-400 text-sm font-medium flex items-center justify-center">
                    {w.pourOrder ?? idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{wineTitle(w)}</p>
                    {wineSubtitle(w) && (
                      <p className="text-xs text-muted-foreground truncate">{wineSubtitle(w)}</p>
                    )}
                    {w.hostNotes && (
                      <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">
                        {w.hostNotes}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {plan.hostScript && (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Manus för värden</h2>
            <Card className="p-4">
              <p className="text-sm whitespace-pre-wrap">{plan.hostScript}</p>
            </Card>
          </section>
        )}
      </div>

      <aside className="md:sticky md:top-20 md:self-start space-y-2">
        <StartSessionButton tastingPlanId={plan.id} planTitle={plan.title} />
        <Button asChild variant="outline" className="w-full">
          <Link href={`/mina-provningar/planer/${plan.id}/handlingslista`}>
            <ShoppingBag className="h-4 w-4 mr-2" />
            Visa handlingslista
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href={`/varguide/${plan.id}`}>
            <Printer className="h-4 w-4 mr-2" />
            Skriv ut värdguide
          </Link>
        </Button>
        <Button asChild variant="ghost" className="w-full">
          <Link href={`/skapa-provning/${plan.id}`}>
            <Pencil className="h-4 w-4 mr-2" />
            Redigera
          </Link>
        </Button>
      </aside>
    </div>
  )
}
```

- [ ] **Step 2: Create the detail page route**

`src/app/(frontend)/(site)/mina-provningar/planer/[id]/page.tsx`:

```tsx
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { PlanDetailView } from '@/components/tasting-plan/PlanDetailView'
import type { TastingPlan } from '@/payload-types'

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getUser()
  if (!user) {
    const { id } = await params
    redirect(`/logga-in?from=/mina-provningar/planer/${id}`)
  }

  const { id } = await params
  const planId = Number(id)
  if (!Number.isInteger(planId)) notFound()

  const payload = await getPayload({ config })
  let plan: TastingPlan | null = null
  try {
    plan = (await payload.findByID({
      collection: 'tasting-plans',
      id: planId,
      depth: 2,
      overrideAccess: true,
    })) as TastingPlan
  } catch {
    notFound()
  }
  if (!plan) notFound()

  const ownerId = typeof plan.owner === 'object' ? plan.owner?.id : plan.owner
  const isAdmin = user.role === 'admin'
  if (!isAdmin && ownerId !== user.id) notFound()

  return <PlanDetailView plan={plan} />
}
```

- [ ] **Step 3: Update `PlanCard` body-link target**

In `src/components/tasting-plan/PlanCard.tsx`, find:

```tsx
<Link href={`/skapa-provning/${plan.id}`} className="absolute inset-0 z-0" aria-label={plan.title} />
```

Replace with:

```tsx
<Link href={`/mina-provningar/planer/${plan.id}`} className="absolute inset-0 z-0" aria-label={plan.title} />
```

(Edit becomes accessible via the detail page's `Redigera` button.)

- [ ] **Step 4: TS sweep**

```bash
pnpm exec tsc --noEmit 2>&1 | grep -E "(PlanDetailView|tasting-plan/PlanCard|planer/\[id\]/page)" | head
```
Expected: no output.

- [ ] **Step 5: Smoke test**

```bash
lsof -nP -i tcp:3000 | grep LISTEN | head -1 || (pnpm dev > /tmp/dev.log 2>&1 &)
until curl -s --max-time 3 http://localhost:3000/api/users/me >/dev/null 2>&1; do sleep 2; done
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" http://localhost:3000/mina-provningar/planer/1
```
Expected: 3xx redirecting to `/logga-in?from=/mina-provningar/planer/1`.

- [ ] **Step 6: Commit**

```bash
git add src/components/tasting-plan/PlanDetailView.tsx \
  "src/app/(frontend)/(site)/mina-provningar/planer/[id]/page.tsx" \
  src/components/tasting-plan/PlanCard.tsx
git commit -m "$(cat <<'EOF'
otter: plan detail page + PlanCard body-link change

Read-only detail page at /mina-provningar/planer/[id] with header,
wine list, host script, and an action rail (start session, shopping
list, print guide, edit). PlanCard body now navigates to the detail
page instead of straight to the edit form.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Extend `WineReviewForm` for custom-wine submissions

**Files:**
- Modify: `src/components/course/WineReviewForm.tsx`

The form (~610 lines) currently requires `wineIdProp` and submits with `wine: <number>`. We add an alternative branch accepting `customWineSnapshot`, which is sent as `customWine: {...}` on submit. The Reviews collection (post Chunk A) accepts this XOR.

- [ ] **Step 1: Add the new prop type and add it to the destructure**

Find the existing interface:

```ts
interface WineReviewFormProps {
  ...
  wineIdProp?: number | string
}
```

Add a new optional prop `customWineSnapshot`:

```ts
interface CustomWineSnapshot {
  name: string
  producer?: string
  vintage?: string
  type?: 'red' | 'white' | 'rose' | 'sparkling' | 'dessert' | 'fortified' | 'other'
  systembolagetUrl?: string
  priceSek?: number
}

interface WineReviewFormProps {
  // ...existing props
  wineIdProp?: number | string
  customWineSnapshot?: CustomWineSnapshot
}
```

Add `customWineSnapshot` to the destructure in `export function WineReviewForm({ ... })`.

- [ ] **Step 2: Skip wineId-required paths when in custom mode**

The form currently has two wineId-coupled flows:

1. **Validation** at ~line 394: `if (!wineId) newErrors['wine'] = 'Inget vin kopplat till detta moment'`
2. **Fetch latest submission** effect at ~line 184: gated on `wineId` truthy

Modify both:

(a) Replace the validation guard so it only fires when neither `wineId` nor `customWineSnapshot` is set:

Find:
```ts
    if (!wineId) newErrors['wine'] = 'Inget vin kopplat till detta moment'
```

Replace with:
```ts
    if (!wineId && !customWineSnapshot) newErrors['wine'] = 'Inget vin kopplat till detta moment'
```

(b) The "fetch latest submission" effect queries by `wine: <id>`. For custom wines there's no stable id — skip this effect entirely. Find the effect at ~line 184:
```ts
  React.useEffect(() => {
    if (wineId) {
      fetchLatestSubmission()
    }
  }, [wineId, fetchLatestSubmission])
```

Replace with:
```ts
  React.useEffect(() => {
    if (wineId && !customWineSnapshot) {
      fetchLatestSubmission()
    }
  }, [wineId, customWineSnapshot, fetchLatestSubmission])
```

- [ ] **Step 3: Send `customWine` instead of `wine` in submit**

Find the submit body construction at ~line 405-415:

```ts
      const wineIdNum = wineId ? Number(wineId) : undefined
      ...
        body: JSON.stringify({
          ...
          wine: wineIdNum,
          ...
        })
```

The exact shape of the body is around line 415. Look for the `wine: wineIdNum` line in the JSON payload and modify the entire body object construction. Inspect by reading lines 400-460.

You need the body to set EITHER `wine: <id>` (library) OR `customWine: {...}` (custom). The cleanest change is to compute the wine identity once and spread it:

Find code that looks like this (the body construction passed to `fetch('/api/reviews/...')` or `payload.create({collection: 'reviews', ...})`):

```ts
      const wineIdNum = wineId ? Number(wineId) : undefined
      // ... fetch call:
      body: JSON.stringify({
        wine: wineIdNum,
        // ... other fields (rating, notes, WSET fields, etc.)
      })
```

Replace the `wineIdNum` computation and the field in body. Compute a `wineIdentity` object first:

```ts
      const wineIdentity = customWineSnapshot
        ? { customWine: customWineSnapshot }
        : { wine: wineId ? Number(wineId) : undefined }
```

Then in the body, replace `wine: wineIdNum` with `...wineIdentity`. So:

```ts
      body: JSON.stringify({
        ...wineIdentity,
        // ... other fields (unchanged)
      })
```

- [ ] **Step 4: Audit any "wine name" / "wine title" UI render that reads from a fetched Wine doc**

Some parts of the form display the wine name from a server-fetched library Wine. In custom mode, no library Wine exists — fall back to `customWineSnapshot.name`.

Read the full file and locate any `wine.title`, `wine.name`, or similar render. Replace with:

```ts
const displayWineName =
  customWineSnapshot?.name ??
  (typeof fetchedWine === 'object' ? fetchedWine?.name ?? '' : '') ??
  ''
```

(Exact variable names depend on what the form has — use the same fallback pattern.)

If the form does NOT render a wine name visibly (e.g. it's just a rating + notes form pinned to a known wine), skip this step.

- [ ] **Step 5: TS sweep**

```bash
pnpm exec tsc --noEmit 2>&1 | grep "WineReviewForm" | head
```
Expected: no output (or only pre-existing errors unrelated to this task).

- [ ] **Step 6: Commit**

```bash
git add src/components/course/WineReviewForm.tsx
git commit -m "$(cat <<'EOF'
otter: WineReviewForm accepts customWineSnapshot

New optional prop `customWineSnapshot` lets the form submit a custom-wine
review (Reviews collection accepts customWine XOR wine since Chunk A).
Skips wineId-required paths (validation, latest-submission fetch) when
in custom mode. Used by plan-driven sessions in Chunk C.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `PlanSessionContent` component

**Files:**
- Create: `src/components/tasting-plan/PlanSessionContent.tsx`

This is the wine-list-with-pacing UI shown when a session is plan-driven (`session.tastingPlan` set, `session.course` null). It mirrors the existing course-session "host vs guest" patterns but renders a flat ordered wine list instead of modules.

- [ ] **Step 1: Create the component**

```tsx
'use client'

import * as React from 'react'
import { toast } from 'sonner'
import type { TastingPlan, Wine, CourseSession } from '@/payload-types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Wine as WineIcon, Crown } from 'lucide-react'
import { WineReviewForm } from '@/components/course/WineReviewForm'

interface PlanSessionContentProps {
  session: CourseSession
  plan: TastingPlan
  isHost: boolean
  followingHost: boolean
  sidebarExtra?: React.ReactNode
}

type WineRow = {
  key: string
  pourOrder: number
  title: string
  subtitle: string
  hostNotes: string | null
  libraryWineId: number | null
  customWineSnapshot: {
    name: string
    producer?: string
    vintage?: string
    type?: 'red' | 'white' | 'rose' | 'sparkling' | 'dessert' | 'fortified' | 'other'
    systembolagetUrl?: string
    priceSek?: number
  } | null
}

function rowFromEntry(
  w: NonNullable<TastingPlan['wines']>[number],
  idx: number,
): WineRow {
  const pourOrder = w.pourOrder ?? idx + 1
  if (w.libraryWine && typeof w.libraryWine === 'object') {
    const lib = w.libraryWine as Wine
    const region =
      typeof lib.region === 'object' && lib.region ? lib.region.name ?? null : null
    return {
      key: w.id ?? `lib-${lib.id}-${idx}`,
      pourOrder,
      title: lib.name || `Vin #${lib.id}`,
      subtitle: [lib.winery, lib.vintage, region].filter(Boolean).join(' · '),
      hostNotes: w.hostNotes ?? null,
      libraryWineId: lib.id,
      customWineSnapshot: null,
    }
  }
  const c = w.customWine
  return {
    key: w.id ?? `cust-${idx}`,
    pourOrder,
    title: c?.name || 'Namnlöst vin',
    subtitle: [c?.producer, c?.vintage].filter(Boolean).join(' · '),
    hostNotes: w.hostNotes ?? null,
    libraryWineId: null,
    customWineSnapshot: c?.name
      ? {
          name: c.name,
          producer: c.producer || undefined,
          vintage: c.vintage || undefined,
          type: (c.type || undefined) as WineRow['customWineSnapshot'] extends infer T
            ? T extends { type?: infer U }
              ? U
              : never
            : never,
          systembolagetUrl: c.systembolagetUrl || undefined,
          priceSek: c.priceSek ?? undefined,
        }
      : null,
  }
}

export function PlanSessionContent({
  session,
  plan,
  isHost,
  followingHost,
  sidebarExtra,
}: PlanSessionContentProps) {
  const rows: WineRow[] = (plan.wines ?? []).map(rowFromEntry)
  const [reviewing, setReviewing] = React.useState<WineRow | null>(null)
  const [settingFocus, setSettingFocus] = React.useState(false)
  const activePour =
    typeof session.currentLesson === 'number' ? session.currentLesson : null

  const scrollRefs = React.useRef<Record<string, HTMLLIElement | null>>({})
  React.useEffect(() => {
    if (!followingHost || activePour == null) return
    const row = rows.find((r) => r.pourOrder === activePour)
    if (!row) return
    const node = scrollRefs.current[row.key]
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [activePour, followingHost, rows])

  async function setFocus(pourOrder: number) {
    setSettingFocus(true)
    try {
      const res = await fetch(`/api/sessions/${session.id}/host-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentLesson: pourOrder, lessonType: 'wine' }),
      })
      if (!res.ok) {
        toast.error('Kunde inte sätta fokus.')
      }
    } catch {
      toast.error('Nätverksfel — försök igen.')
    } finally {
      setSettingFocus(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4 min-w-0">
        <header className="space-y-1">
          <h2 className="text-xl font-heading">{plan.title}</h2>
          {plan.occasion && (
            <p className="text-sm text-muted-foreground">{plan.occasion}</p>
          )}
        </header>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Inga viner i planen.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => {
              const isActive = activePour === row.pourOrder
              return (
                <li
                  key={row.key}
                  ref={(el) => {
                    scrollRefs.current[row.key] = el
                  }}
                >
                  <Card
                    className={`p-4 transition-shadow ${
                      isActive ? 'border-brand-400 ring-2 ring-brand-400/40' : ''
                    }`}
                  >
                    <div className="flex gap-3 items-start">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-400/10 text-brand-400 text-sm font-semibold flex items-center justify-center">
                        {row.pourOrder}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate">{row.title}</p>
                          {isActive && (
                            <Badge variant="brand">
                              <WineIcon className="h-3 w-3 mr-1" />
                              Värden pratar om detta
                            </Badge>
                          )}
                        </div>
                        {row.subtitle && (
                          <p className="text-xs text-muted-foreground truncate">{row.subtitle}</p>
                        )}
                        {isHost && row.hostNotes && (
                          <p className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">
                            <Crown className="inline h-3 w-3 mr-1" />
                            {row.hostNotes}
                          </p>
                        )}
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
                      </div>
                    </div>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {sidebarExtra && (
        <aside className="lg:sticky lg:top-20 lg:self-start space-y-3">{sidebarExtra}</aside>
      )}

      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Betygsätt: {reviewing?.title}</DialogTitle>
          </DialogHeader>
          {reviewing && (
            <WineReviewForm
              {...(reviewing.libraryWineId
                ? { wineIdProp: reviewing.libraryWineId }
                : reviewing.customWineSnapshot
                ? { customWineSnapshot: reviewing.customWineSnapshot }
                : {})}
              onSubmit={() => setReviewing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: TS sweep**

```bash
pnpm exec tsc --noEmit 2>&1 | grep "PlanSessionContent" | head
```

If the `type:` conditional-type in `rowFromEntry` produces a TS error (too clever), simplify to:

```ts
type: (c.type || undefined) as
  | 'red' | 'white' | 'rose' | 'sparkling' | 'dessert' | 'fortified' | 'other'
  | undefined,
```

Re-run TS sweep.

- [ ] **Step 3: Commit**

```bash
git add src/components/tasting-plan/PlanSessionContent.tsx
git commit -m "$(cat <<'EOF'
otter: PlanSessionContent — wine-list session UI for plans

Plan-driven session content used by SessionView when session.tastingPlan
is set. Hosts can 'Sätt fokus' on a wine (POSTs to host-state), guests
following auto-scroll to the active wine. 'Betygsätt' opens
WineReviewForm in either library-wine or custom-wine snapshot mode.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: SessionView inline branching

**Files:**
- Modify: `src/components/course/SessionView.tsx`

- [ ] **Step 1: Identify the early-render insertion point**

Read the file (`src/components/course/SessionView.tsx` — ~234 lines). Locate the spot in the component body where it first renders course-dependent UI (typically after auth checks and session-loaded checks, before `<LessonViewer />` / `<CourseTableOfContents />` are rendered).

Add the import at the top:

```ts
import { PlanSessionContent } from '@/components/tasting-plan/PlanSessionContent'
import type { TastingPlan } from '@/payload-types'
```

- [ ] **Step 2: Insert the branch**

Before the existing course rendering, add this branch. The exact location depends on the component shape — look for where `session.course` / course data is accessed. Insert this guard:

```tsx
  // Plan-driven session — render flat wine list instead of course modules/lessons.
  // The session pacing pointer (session.currentLesson) is reused to carry the
  // active wine's pourOrder; lessonType='wine' on host-state POST signals plan mode.
  if (
    !session.course &&
    session.tastingPlan &&
    typeof session.tastingPlan === 'object'
  ) {
    return (
      <PlanSessionContent
        session={session}
        plan={session.tastingPlan as TastingPlan}
        isHost={isHost}
        followingHost={followingHost}
        sidebarExtra={sidebarExtra}
      />
    )
  }
```

The variable names `isHost`, `followingHost`, `sidebarExtra` must match what's in scope at that insertion point. Read the file to confirm these names; they were introduced in Chunks 1-3.

- [ ] **Step 3: TS sweep**

```bash
pnpm exec tsc --noEmit 2>&1 | grep "SessionView" | head
```
Expected: no output.

If TS complains that `session.tastingPlan` doesn't exist on the type or is wider than expected, the prop type for `session` may need a precise import — use `import type { CourseSession } from '@/payload-types'` if not already.

- [ ] **Step 4: Commit**

```bash
git add src/components/course/SessionView.tsx
git commit -m "$(cat <<'EOF'
otter: SessionView — branch into PlanSessionContent for plan sessions

Inline early-return when session.course is null and session.tastingPlan
is populated. Course-driven path is unchanged. Roster + Följer värden
toggle stay in scope because they're upstream of the branch.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Shopping list page

**Files:**
- Create: `src/components/tasting-plan/PlanShoppingList.tsx`
- Create: `src/app/(frontend)/(site)/mina-provningar/planer/[id]/handlingslista/page.tsx`

- [ ] **Step 1: Create `PlanShoppingList.tsx`**

```tsx
import Link from 'next/link'
import type { TastingPlan, Wine } from '@/payload-types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ExternalLink, Search } from 'lucide-react'

function libraryRow(lib: Wine, hostNotesShown: boolean, hostNotes: string | null) {
  const region =
    typeof lib.region === 'object' && lib.region ? lib.region.name ?? null : null
  const subtitle = [lib.winery, lib.vintage, region].filter(Boolean).join(' · ')
  const thumb =
    typeof lib.image === 'object' && lib.image
      ? lib.image.sizes?.thumbnail?.url ?? lib.image.url ?? null
      : null
  const url = (lib as { systembolagetUrl?: string }).systembolagetUrl
  const price = (lib as { systembolagetPrice?: number }).systembolagetPrice
  const searchUrl = `https://www.systembolaget.se/sok/?varuNr=&sok=${encodeURIComponent(lib.name)}`
  return { title: lib.name, subtitle, thumb, url, price, searchUrl, hostNotes: hostNotesShown ? hostNotes : null }
}

export interface PlanShoppingListProps {
  plan: TastingPlan
}

export function PlanShoppingList({ plan }: PlanShoppingListProps) {
  const wines = plan.wines ?? []
  const prices = wines
    .map((w) => {
      if (w.libraryWine && typeof w.libraryWine === 'object') {
        return (w.libraryWine as { systembolagetPrice?: number }).systembolagetPrice ?? null
      }
      return w.customWine?.priceSek ?? null
    })
    .filter((p): p is number => typeof p === 'number')
  const sum = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) : null

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href={`/mina-provningar/planer/${plan.id}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Tillbaka till planen
      </Link>

      <header className="mb-6">
        <h1 className="text-2xl font-heading">Handlingslista — {plan.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {wines.length} viner
          {sum != null && (
            <>
              {' '}· totalt ~{sum} kr {prices.length < wines.length && <span>(saknar pris på {wines.length - prices.length})</span>}
            </>
          )}
        </p>
      </header>

      {wines.length === 0 ? (
        <p className="text-sm text-muted-foreground">Inga viner i planen.</p>
      ) : (
        <ul className="space-y-3">
          {wines.map((w, idx) => {
            const pourOrder = w.pourOrder ?? idx + 1
            const isLibrary = w.libraryWine && typeof w.libraryWine === 'object'
            const lib = isLibrary ? (w.libraryWine as Wine) : null
            const c = w.customWine

            const title = lib ? lib.name || `Vin #${lib.id}` : c?.name || 'Namnlöst vin'
            const subtitle = lib
              ? [lib.winery, lib.vintage, typeof lib.region === 'object' && lib.region ? lib.region.name ?? null : null]
                  .filter(Boolean)
                  .join(' · ')
              : [c?.producer, c?.vintage].filter(Boolean).join(' · ')
            const thumb =
              lib && typeof lib.image === 'object' && lib.image
                ? lib.image.sizes?.thumbnail?.url ?? lib.image.url ?? null
                : null
            const price = lib
              ? (lib as { systembolagetPrice?: number }).systembolagetPrice ?? null
              : c?.priceSek ?? null
            const url = lib
              ? (lib as { systembolagetUrl?: string }).systembolagetUrl ?? null
              : c?.systembolagetUrl ?? null
            const searchTitle = title
            const searchUrl = `https://www.systembolaget.se/sok/?varuNr=&sok=${encodeURIComponent(
              searchTitle,
            )}`

            return (
              <li key={w.id ?? idx}>
                <Card className="p-4 flex gap-3 items-start">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-400/10 text-brand-400 text-sm font-semibold flex items-center justify-center">
                    {pourOrder}
                  </div>
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="h-12 w-12 rounded object-cover flex-shrink-0" />
                  ) : (
                    <div className="h-12 w-12 rounded bg-muted flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{title}</p>
                    {subtitle && (
                      <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
                    )}
                    {price != null && (
                      <p className="text-xs text-muted-foreground mt-1">{price} kr</p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {url ? (
                      <Button asChild size="sm" variant="outline">
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Köp hos Systembolaget
                        </a>
                      </Button>
                    ) : (
                      <Button asChild size="sm" variant="ghost">
                        <a href={searchUrl} target="_blank" rel="noopener noreferrer">
                          <Search className="h-3 w-3 mr-1" />
                          Hitta hos Systembolaget
                        </a>
                      </Button>
                    )}
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create the route**

`src/app/(frontend)/(site)/mina-provningar/planer/[id]/handlingslista/page.tsx`:

```tsx
import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { PlanShoppingList } from '@/components/tasting-plan/PlanShoppingList'
import type { TastingPlan } from '@/payload-types'

export const metadata: Metadata = {
  title: 'Handlingslista — Vinakademin',
}

export default async function HandlingslistaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getUser()
  if (!user) {
    const { id } = await params
    redirect(`/logga-in?from=/mina-provningar/planer/${id}/handlingslista`)
  }

  const { id } = await params
  const planId = Number(id)
  if (!Number.isInteger(planId)) notFound()

  const payload = await getPayload({ config })
  let plan: TastingPlan | null = null
  try {
    plan = (await payload.findByID({
      collection: 'tasting-plans',
      id: planId,
      depth: 2,
      overrideAccess: true,
    })) as TastingPlan
  } catch {
    notFound()
  }
  if (!plan) notFound()

  const ownerId = typeof plan.owner === 'object' ? plan.owner?.id : plan.owner
  const isAdmin = user.role === 'admin'
  if (!isAdmin && ownerId !== user.id) notFound()

  return <PlanShoppingList plan={plan} />
}
```

- [ ] **Step 3: TS sweep + smoke + commit**

```bash
pnpm exec tsc --noEmit 2>&1 | grep -E "(PlanShoppingList|handlingslista/page)" | head
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" http://localhost:3000/mina-provningar/planer/1/handlingslista
git add src/components/tasting-plan/PlanShoppingList.tsx \
  "src/app/(frontend)/(site)/mina-provningar/planer/[id]/handlingslista/page.tsx"
git commit -m "$(cat <<'EOF'
otter: handlingslista — shopping list page for plans

Owner-scoped server-rendered list of plan wines with Systembolaget
buy-links (when URL set) or fallback search links. Shows price totals
when at least one wine has a price.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Smoke expected: HTTP 307 → `/logga-in?from=...`.

---

## Task 7: Print/`(bare)` layout + cheat sheet page

**Files:**
- Create: `src/app/(frontend)/(bare)/layout.tsx`
- Create: `src/components/tasting-plan/PlanPrintCheatSheet.tsx`
- Create: `src/app/(frontend)/(bare)/varguide/[id]/page.tsx`

- [ ] **Step 1: Create the bare layout**

`src/app/(frontend)/(bare)/layout.tsx`:

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Värdguide — Vinakademin',
}

export default function BareLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background text-foreground">{children}</div>
}
```

(No TopNavHeader / BreadcrumbBar / MobileBottomNav / Footer — those are added by `(site)/layout.tsx`, which doesn't wrap `(bare)` routes.)

- [ ] **Step 2: Create `PlanPrintCheatSheet.tsx`**

```tsx
'use client'

import * as React from 'react'
import Link from 'next/link'
import type { TastingPlan, Wine } from '@/payload-types'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Printer } from 'lucide-react'

function wineTitle(w: NonNullable<TastingPlan['wines']>[number]): string {
  if (w.libraryWine && typeof w.libraryWine === 'object') {
    const lib = w.libraryWine as Wine
    return lib.name || `Vin #${lib.id}`
  }
  return w.customWine?.name || 'Namnlöst vin'
}

function wineSubtitle(w: NonNullable<TastingPlan['wines']>[number]): string {
  if (w.libraryWine && typeof w.libraryWine === 'object') {
    const lib = w.libraryWine as Wine
    const region =
      typeof lib.region === 'object' && lib.region ? lib.region.name ?? null : null
    const price = (lib as { systembolagetPrice?: number }).systembolagetPrice
    return [
      lib.winery,
      lib.vintage ? String(lib.vintage) : null,
      region,
      price != null ? `${price} kr` : null,
    ]
      .filter(Boolean)
      .join(' · ')
  }
  const c = w.customWine
  return [c?.producer, c?.vintage, c?.priceSek != null ? `${c.priceSek} kr` : null]
    .filter(Boolean)
    .join(' · ')
}

export interface PlanPrintCheatSheetProps {
  plan: TastingPlan
}

export function PlanPrintCheatSheet({ plan }: PlanPrintCheatSheetProps) {
  const wines = plan.wines ?? []
  const today = new Date().toLocaleDateString('sv-SE')
  return (
    <>
      <style>{`
        @media print {
          .screen-only { display: none !important; }
          @page { margin: 16mm; }
          body { font-size: 11pt; }
          .wine-row { break-inside: avoid; }
        }
      `}</style>

      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="screen-only mb-6 flex items-center justify-between">
          <Link
            href={`/mina-provningar/planer/${plan.id}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Tillbaka till planen
          </Link>
          <Button type="button" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Skriv ut
          </Button>
        </div>

        <header className="mb-6 pb-4 border-b">
          <h1 className="text-3xl font-heading">Värdguide — {plan.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {plan.occasion || '—'} · {plan.targetParticipants ?? 4} deltagare · Utskriven {today}
          </p>
        </header>

        {plan.hostScript && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-2">Manus</h2>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{plan.hostScript}</p>
          </section>
        )}

        <section>
          <h2 className="text-lg font-semibold mb-3">Viner</h2>
          {wines.length === 0 ? (
            <p className="text-sm text-muted-foreground">Inga viner i planen.</p>
          ) : (
            <ul className="space-y-4">
              {wines.map((w, idx) => (
                <li key={w.id ?? idx} className="wine-row pb-4 border-b last:border-b-0">
                  <div className="flex gap-3 items-baseline">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full border border-foreground text-sm font-semibold flex items-center justify-center">
                      {w.pourOrder ?? idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-semibold">{wineTitle(w)}</p>
                      {wineSubtitle(w) && (
                        <p className="text-xs text-muted-foreground">{wineSubtitle(w)}</p>
                      )}
                    </div>
                  </div>
                  {w.hostNotes && (
                    <p className="mt-2 ml-10 text-sm whitespace-pre-wrap leading-relaxed">
                      {w.hostNotes}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
```

- [ ] **Step 3: Create the page route**

`src/app/(frontend)/(bare)/varguide/[id]/page.tsx`:

```tsx
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { PlanPrintCheatSheet } from '@/components/tasting-plan/PlanPrintCheatSheet'
import type { TastingPlan } from '@/payload-types'

export default async function VarguidePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getUser()
  if (!user) {
    const { id } = await params
    redirect(`/logga-in?from=/varguide/${id}`)
  }

  const { id } = await params
  const planId = Number(id)
  if (!Number.isInteger(planId)) notFound()

  const payload = await getPayload({ config })
  let plan: TastingPlan | null = null
  try {
    plan = (await payload.findByID({
      collection: 'tasting-plans',
      id: planId,
      depth: 2,
      overrideAccess: true,
    })) as TastingPlan
  } catch {
    notFound()
  }
  if (!plan) notFound()

  const ownerId = typeof plan.owner === 'object' ? plan.owner?.id : plan.owner
  const isAdmin = user.role === 'admin'
  if (!isAdmin && ownerId !== user.id) notFound()

  return <PlanPrintCheatSheet plan={plan} />
}
```

- [ ] **Step 4: TS sweep + smoke + commit**

```bash
pnpm exec tsc --noEmit 2>&1 | grep -E "(varguide|PlanPrintCheatSheet|\\(bare\\)/layout)" | head
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" http://localhost:3000/varguide/1
git add "src/app/(frontend)/(bare)" src/components/tasting-plan/PlanPrintCheatSheet.tsx
git commit -m "$(cat <<'EOF'
otter: varguide cheat sheet page + (bare) layout

Print-friendly host pack at /varguide/[id], rendered under a (bare)
route group with no top nav / footer / mobile bottom nav. Print CSS
hides the screen-only header bar and applies break-inside:avoid per
wine row.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Smoke expected: HTTP 307 → `/logga-in?from=/varguide/1`.

---

## Task 8: E2E smoke + push to production

- [ ] **Step 1: Lint + TS clean for touched files**

```bash
pnpm lint 2>&1 | tail -20
pnpm exec tsc --noEmit 2>&1 | grep -E "(tasting-plan/|skapa-provning|mina-provningar/planer|varguide|StartSessionButton|WineReviewForm|SessionView)" | head -40
```
Expected: lint clean for the new files; no NEW TS errors in touched files. (Repo-wide pre-existing errors in `ProfileDetailsForm`, `UserReviewsPanel` etc. are not blockers.)

- [ ] **Step 2: Build smoke**

```bash
pnpm build 2>&1 | tail -40
```
Expected: "Compiled successfully". If build fails on a file we touched, STOP and report BLOCKED.

- [ ] **Step 3: Curl-based smoke**

```bash
lsof -nP -i tcp:3000 | grep LISTEN | head -1 || (pnpm dev > /tmp/dev.log 2>&1 &)
until curl -s --max-time 3 http://localhost:3000/api/users/me >/dev/null 2>&1; do sleep 2; done

curl -s -o /dev/null -w "/mina-provningar/planer/1 → %{http_code} %{redirect_url}\n" http://localhost:3000/mina-provningar/planer/1
curl -s -o /dev/null -w "/mina-provningar/planer/1/handlingslista → %{http_code} %{redirect_url}\n" http://localhost:3000/mina-provningar/planer/1/handlingslista
curl -s -o /dev/null -w "/varguide/1 → %{http_code} %{redirect_url}\n" http://localhost:3000/varguide/1
```
Expected: all three return HTTP 307 → `/logga-in?from=...`.

- [ ] **Step 4: Manual UI smoke (logged in as a regular user)**

In a real browser, exercise the golden path:

1. From `/mina-provningar/planer`, click a plan card → land on `/mina-provningar/planer/[id]` (detail page).
2. From detail page, click `Starta gruppsession` → modal opens with QR + join code.
3. In a second incognito browser, scan/enter the join code → land in session view with the wine list (no lesson tabs).
4. On the host browser, click `Sätt fokus` on wine 2 → guest's view (with `Följer värden` ON) highlights wine 2 + scrolls.
5. On the guest, click `Betygsätt` on a library wine → review form submits → Review row created with `wine: <id>`.
6. On the guest, click `Betygsätt` on a custom wine (test plan must have one) → submits → Review row created with `customWine: {...}`.
7. From detail page → `Visa handlingslista` → list renders, library wines have appropriate buy/search links.
8. From detail page → `Skriv ut värdguide` → opens `/varguide/[id]` WITHOUT top nav / footer. Print preview shows clean host pack.
9. Hit `/mina-provningar/planer/999999` (non-existent or someone else's) → 404.

If any step fails: fix and re-commit before pushing.

- [ ] **Step 5: Push to main**

```bash
git log --oneline origin/main..HEAD
git push origin main
```

- [ ] **Step 6: Merge main → production**

```bash
git fetch origin
git checkout production
git pull --ff-only origin production
git merge --no-ff main -m "$(cat <<'EOF'
release: Chunk C — Live from Plan + Host Tools

Plan-driven live sessions and host tooling:
- Plan detail page at /mina-provningar/planer/[id]
- Shopping list at /mina-provningar/planer/[id]/handlingslista
- Printable cheat sheet at /varguide/[id]
- StartSessionButton accepts tastingPlanId (XOR with courseId)
- SessionView branches into PlanSessionContent for plan sessions
- WineReviewForm accepts customWineSnapshot for custom-wine reviews

No schema changes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push origin production
git checkout main
```

- [ ] **Step 7: Verify deploy**

```bash
git log origin/production --oneline -3
```
Expected: the merge commit at HEAD.

---

## Out of scope (deferred)

- Mark-as-ready status transition.
- Edit-during-live-session lock.
- Wrap-up email (Chunk D).
- Tasting templates (Chunk E).
