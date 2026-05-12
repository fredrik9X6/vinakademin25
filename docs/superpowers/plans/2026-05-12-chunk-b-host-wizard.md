# Chunk B — Host Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Logged-in members create, list, edit, and soft-delete their own tasting plans via a single-scrollable-page wizard at `/skapa-provning` and a card grid at `/mina-provningar/planer`.

**Architecture:** Server components for pages (owner-scoped Payload reads), client components for the form + WinePicker (controlled state, explicit save). REST routes under `/api/tasting-plans` for mutation; typeahead lookup at `/api/wines/search`. Same `TastingPlanForm` component handles create and edit. Drag-reorder via `@dnd-kit/*` (already a dep).

**Tech Stack:** Next.js 15 (App Router) + React 19 + Payload CMS 3.33 + shadcn UI + `@dnd-kit/sortable` + sonner (toast) + Swedish UI copy.

**Spec:** `docs/superpowers/specs/2026-05-12-chunk-b-host-wizard-design.md`

**Schema (from Chunk A — do not change):**

```ts
// TastingPlan (src/payload-types.ts:1359)
{
  id: number
  owner: number | User
  title: string
  description?: string | null
  occasion?: string | null
  targetParticipants?: number | null  // default 4, min 1, max 50
  wines?: Array<{
    libraryWine?: (number | null) | Wine
    customWine?: {
      name?: string | null
      producer?: string | null
      vintage?: string | null
      type?: 'red'|'white'|'rose'|'sparkling'|'dessert'|'fortified'|'other' | null
      systembolagetUrl?: string | null
      priceSek?: number | null
    }
    pourOrder?: number | null
    hostNotes?: string | null
    id?: string | null
  }> | null
  hostScript?: string | null
  status: 'draft' | 'ready' | 'archived'
  derivedFromTemplate?: (number | null) | TastingPlan
  updatedAt: string
  createdAt: string
}
```

**Collection-level validator** (TastingPlans.ts:102-116) already enforces XOR per wine entry. Route validators are belt-and-suspenders.

**Auth helper:** `import { getUser } from '@/lib/get-user'` for server components/routes.

---

## File Structure

```
NEW src/app/api/wines/search/route.ts                              Task 1
NEW src/app/api/tasting-plans/route.ts                             Task 2
NEW src/app/api/tasting-plans/[id]/route.ts                        Task 3
NEW src/components/tasting-plan/WinePicker.tsx                     Task 4
NEW src/components/tasting-plan/SortableWineRow.tsx                Task 5
NEW src/components/tasting-plan/TastingPlanForm.tsx                Task 5
NEW src/components/tasting-plan/PlanCard.tsx                       Task 6
NEW src/app/(frontend)/(site)/skapa-provning/page.tsx              Task 7
NEW src/app/(frontend)/(site)/skapa-provning/[id]/page.tsx         Task 7
NEW src/app/(frontend)/(site)/mina-provningar/planer/page.tsx      Task 8
MOD src/components/top-nav-header.tsx                              Task 9
END E2E smoke + push                                               Task 10
```

---

## Task 1: `GET /api/wines/search` typeahead endpoint

**Files:**
- Create: `src/app/api/wines/search/route.ts`

- [ ] **Step 1: Create the route file**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'

export async function GET(request: NextRequest) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').trim()
  if (q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const payload = await getPayload({ config })

  const docs = await payload.find({
    collection: 'wines',
    limit: 10,
    depth: 1,
    where: {
      or: [
        { title: { like: q } },
        { producer: { like: q } },
      ],
    },
    sort: 'title',
  })

  const results = docs.docs.map((w: any) => ({
    id: w.id,
    title: w.title,
    producer: w.producer ?? null,
    vintage: w.vintage ?? null,
    region: typeof w.region === 'object' ? w.region?.name ?? null : null,
    thumbnailUrl:
      typeof w.image === 'object' && w.image?.sizes?.thumbnail?.url
        ? w.image.sizes.thumbnail.url
        : typeof w.image === 'object'
        ? w.image?.url ?? null
        : null,
  }))

  return NextResponse.json({ results })
}
```

- [ ] **Step 2: Smoke test the auth gate**

```bash
lsof -nP -i tcp:3000 | grep LISTEN | head -1 || (pnpm dev > /tmp/dev.log 2>&1 &)
until curl -s --max-time 3 http://localhost:3000/api/users/me >/dev/null 2>&1; do sleep 2; done
curl -s "http://localhost:3000/api/wines/search?q=ros" -w "\nHTTP %{http_code}\n"
```
Expected: `{"error":"Unauthorized"}` + HTTP 401.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/wines/search/route.ts
git commit -m "$(cat <<'EOF'
otter: GET /api/wines/search typeahead

Auth-gated wine lookup for the tasting-plan wizard's WinePicker.
Minimum 2-char query, returns top 10 with lean projection
(id, title, producer, vintage, region, thumbnail).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `POST /api/tasting-plans` (create + auth list)

**Files:**
- Create: `src/app/api/tasting-plans/route.ts`

- [ ] **Step 1: Define types and validator (top of file)**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'

type CustomWine = {
  name?: string
  producer?: string
  vintage?: string
  type?: 'red' | 'white' | 'rose' | 'sparkling' | 'dessert' | 'fortified' | 'other'
  systembolagetUrl?: string
  priceSek?: number
}

type WineEntry = {
  libraryWine?: number
  customWine?: CustomWine
  pourOrder?: number
  hostNotes?: string
}

type CreateBody = {
  title?: string
  description?: string
  occasion?: string
  targetParticipants?: number
  wines?: WineEntry[]
  hostScript?: string
}

function validateBody(body: CreateBody): string | null {
  if (!body.title || body.title.trim() === '') return 'Titel saknas.'
  if (body.title.length > 100) return 'Titel får vara max 100 tecken.'
  if (body.description && body.description.length > 500)
    return 'Beskrivning får vara max 500 tecken.'
  const wines = body.wines || []
  if (wines.length < 3) return 'En plan måste innehålla minst 3 viner.'
  for (let i = 0; i < wines.length; i++) {
    const w = wines[i]
    const hasLib = w.libraryWine != null
    const hasCustom = !!w.customWine?.name?.trim()
    if (hasLib && hasCustom) return `Vin ${i + 1}: välj antingen ett bibliotekvin ELLER ett eget vin — inte båda.`
    if (!hasLib && !hasCustom) return `Vin ${i + 1}: välj ett vin från biblioteket eller fyll i namn på eget vin.`
  }
  return null
}
```

- [ ] **Step 2: Add the POST handler**

```ts
export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: CreateBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const err = validateBody(body)
  if (err) {
    return NextResponse.json({ error: err }, { status: 400 })
  }

  const payload = await getPayload({ config })

  const created = await payload.create({
    collection: 'tasting-plans',
    data: {
      owner: user.id,
      title: body.title!.trim(),
      description: body.description?.trim() || undefined,
      occasion: body.occasion?.trim() || undefined,
      targetParticipants: body.targetParticipants ?? 4,
      wines: (body.wines || []).map((w, idx) => ({
        libraryWine: w.libraryWine ?? null,
        customWine: w.customWine?.name?.trim() ? w.customWine : undefined,
        pourOrder: w.pourOrder ?? idx + 1,
        hostNotes: w.hostNotes ?? '',
      })),
      hostScript: body.hostScript ?? undefined,
      status: 'draft',
    },
    overrideAccess: false,
    user,
  })

  return NextResponse.json({ plan: created }, { status: 201 })
}
```

- [ ] **Step 3: Smoke test (unauthenticated → 401)**

```bash
curl -s -X POST -H "Content-Type: application/json" -d '{}' \
  http://localhost:3000/api/tasting-plans -w "\nHTTP %{http_code}\n"
```
Expected: `{"error":"Unauthorized"}` + HTTP 401.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/tasting-plans/route.ts
git commit -m "$(cat <<'EOF'
otter: POST /api/tasting-plans (create)

Auth-gated create route for member-authored tasting plans.
Validates title length, min-3 wines, and XOR (libraryWine vs
customWine.name) at the route layer; collection beforeValidate
is the second gate. Server stamps owner and status=draft.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `PATCH` + `DELETE /api/tasting-plans/[id]`

**Files:**
- Create: `src/app/api/tasting-plans/[id]/route.ts`

- [ ] **Step 1: Create the route file**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'

type CustomWine = {
  name?: string
  producer?: string
  vintage?: string
  type?: 'red' | 'white' | 'rose' | 'sparkling' | 'dessert' | 'fortified' | 'other'
  systembolagetUrl?: string
  priceSek?: number
}

type WineEntry = {
  libraryWine?: number
  customWine?: CustomWine
  pourOrder?: number
  hostNotes?: string
}

type PatchBody = {
  title?: string
  description?: string
  occasion?: string
  targetParticipants?: number
  wines?: WineEntry[]
  hostScript?: string
  status?: 'draft' | 'ready' | 'archived'
}

function validatePatch(body: PatchBody): string | null {
  if (body.title !== undefined) {
    if (!body.title || body.title.trim() === '') return 'Titel får inte vara tom.'
    if (body.title.length > 100) return 'Titel får vara max 100 tecken.'
  }
  if (body.description && body.description.length > 500)
    return 'Beskrivning får vara max 500 tecken.'
  if (body.wines !== undefined) {
    if (body.wines.length < 3) return 'En plan måste innehålla minst 3 viner.'
    for (let i = 0; i < body.wines.length; i++) {
      const w = body.wines[i]
      const hasLib = w.libraryWine != null
      const hasCustom = !!w.customWine?.name?.trim()
      if (hasLib && hasCustom) return `Vin ${i + 1}: välj antingen ett bibliotekvin ELLER ett eget vin — inte båda.`
      if (!hasLib && !hasCustom) return `Vin ${i + 1}: välj ett vin från biblioteket eller fyll i namn på eget vin.`
    }
  }
  return null
}

async function loadOwned(planId: number, userId: number, isAdmin: boolean, payload: any) {
  const plan = await payload.findByID({
    collection: 'tasting-plans',
    id: planId,
    overrideAccess: true,
  })
  if (!plan) return { plan: null, status: 404 as const, error: 'Tasting plan not found' }
  const ownerId = typeof plan.owner === 'object' ? plan.owner?.id : plan.owner
  if (!isAdmin && ownerId !== userId) {
    return { plan: null, status: 403 as const, error: 'Not your plan' }
  }
  return { plan, status: 200 as const, error: null }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const planId = Number(id)
  if (!Number.isInteger(planId)) {
    return NextResponse.json({ error: 'Invalid plan id' }, { status: 400 })
  }

  let body: PatchBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const err = validatePatch(body)
  if (err) return NextResponse.json({ error: err }, { status: 400 })

  const payload = await getPayload({ config })
  const isAdmin = user.role === 'admin'
  const guard = await loadOwned(planId, user.id, isAdmin, payload)
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const data: Record<string, unknown> = {}
  if (body.title !== undefined) data.title = body.title.trim()
  if (body.description !== undefined) data.description = body.description.trim() || null
  if (body.occasion !== undefined) data.occasion = body.occasion.trim() || null
  if (body.targetParticipants !== undefined) data.targetParticipants = body.targetParticipants
  if (body.wines !== undefined) {
    data.wines = body.wines.map((w, idx) => ({
      libraryWine: w.libraryWine ?? null,
      customWine: w.customWine?.name?.trim() ? w.customWine : undefined,
      pourOrder: w.pourOrder ?? idx + 1,
      hostNotes: w.hostNotes ?? '',
    }))
  }
  if (body.hostScript !== undefined) data.hostScript = body.hostScript
  if (body.status !== undefined) data.status = body.status

  const updated = await payload.update({
    collection: 'tasting-plans',
    id: planId,
    data,
    overrideAccess: false,
    user,
  })

  return NextResponse.json({ plan: updated })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const planId = Number(id)
  if (!Number.isInteger(planId)) {
    return NextResponse.json({ error: 'Invalid plan id' }, { status: 400 })
  }

  const payload = await getPayload({ config })
  const isAdmin = user.role === 'admin'
  const guard = await loadOwned(planId, user.id, isAdmin, payload)
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })

  if (guard.plan!.status !== 'archived') {
    const updated = await payload.update({
      collection: 'tasting-plans',
      id: planId,
      data: { status: 'archived' },
      overrideAccess: false,
      user,
    })
    return NextResponse.json({ plan: updated, archived: true })
  }

  await payload.delete({
    collection: 'tasting-plans',
    id: planId,
    overrideAccess: false,
    user,
  })
  return NextResponse.json({ deleted: true })
}
```

- [ ] **Step 2: TS sweep on touched files**

```bash
pnpm exec tsc --noEmit 2>&1 | grep -E "tasting-plans|wines/search" | head -20
```
Expected: no output (no new errors in our routes).

- [ ] **Step 3: Smoke test 401**

```bash
curl -s -X PATCH -H "Content-Type: application/json" -d '{}' http://localhost:3000/api/tasting-plans/999 -w "\nHTTP %{http_code}\n"
curl -s -X DELETE http://localhost:3000/api/tasting-plans/999 -w "\nHTTP %{http_code}\n"
```
Both expected: HTTP 401.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/tasting-plans/\[id\]/route.ts
git commit -m "$(cat <<'EOF'
otter: PATCH + DELETE /api/tasting-plans/[id]

Owner-scoped update and soft-then-hard delete:
- PATCH validates partial updates and re-runs wine XOR check
- DELETE archives on first call; hard-deletes already-archived plans
Admin override applied to both routes; Payload ACL also enforces.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `WinePicker` component

**Files:**
- Create: `src/components/tasting-plan/WinePicker.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

export type CustomWineInput = {
  name: string
  producer?: string
  vintage?: string
  type?: 'red' | 'white' | 'rose' | 'sparkling' | 'dessert' | 'fortified' | 'other'
  systembolagetUrl?: string
  priceSek?: number
}

export type LibraryWineResult = {
  id: number
  title: string
  producer: string | null
  vintage: string | null
  region: string | null
  thumbnailUrl: string | null
}

export interface WinePickerProps {
  onPickLibrary: (wine: LibraryWineResult) => void
  onPickCustom: (wine: CustomWineInput) => void
  disabled?: boolean
}

const WINE_TYPE_OPTIONS: Array<{ value: NonNullable<CustomWineInput['type']>; label: string }> = [
  { value: 'red', label: 'Rött' },
  { value: 'white', label: 'Vitt' },
  { value: 'rose', label: 'Rosé' },
  { value: 'sparkling', label: 'Mousserande' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'fortified', label: 'Fortifierat' },
  { value: 'other', label: 'Annat' },
]

export function WinePicker({ onPickLibrary, onPickCustom, disabled }: WinePickerProps) {
  const [tab, setTab] = React.useState<'library' | 'custom'>('library')
  const [q, setQ] = React.useState('')
  const [results, setResults] = React.useState<LibraryWineResult[]>([])
  const [loading, setLoading] = React.useState(false)
  const [custom, setCustom] = React.useState<CustomWineInput>({ name: '' })

  React.useEffect(() => {
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    let aborted = false
    setLoading(true)
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/wines/search?q=${encodeURIComponent(q)}`)
        if (!res.ok) {
          if (!aborted) setResults([])
          return
        }
        const data = await res.json()
        if (!aborted) setResults(data.results || [])
      } finally {
        if (!aborted) setLoading(false)
      }
    }, 300)
    return () => {
      aborted = true
      clearTimeout(handle)
    }
  }, [q])

  return (
    <div className="rounded-md border bg-card p-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'library' | 'custom')}>
        <TabsList className="mb-3">
          <TabsTrigger value="library">Från biblioteket</TabsTrigger>
          <TabsTrigger value="custom">Eget vin</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-2">
          <Input
            placeholder="Sök efter titel eller producent…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            disabled={disabled}
            aria-label="Sök vin"
          />
          {loading && <p className="text-xs text-muted-foreground">Söker…</p>}
          {!loading && q.trim().length >= 2 && results.length === 0 && (
            <p className="text-xs text-muted-foreground">Inga träffar.</p>
          )}
          {results.length > 0 && (
            <ul className="max-h-72 overflow-y-auto divide-y rounded-md border">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-3 disabled:opacity-50"
                    disabled={disabled}
                    onClick={() => {
                      onPickLibrary(r)
                      setQ('')
                      setResults([])
                    }}
                  >
                    {r.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.thumbnailUrl}
                        alt=""
                        className="h-10 w-10 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{r.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[r.producer, r.vintage, r.region].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="custom" className="space-y-3">
          <div>
            <Label htmlFor="cw-name">Namn *</Label>
            <Input
              id="cw-name"
              value={custom.name}
              onChange={(e) => setCustom({ ...custom, name: e.target.value })}
              placeholder="t.ex. Domaine de Tariquet Classic"
              disabled={disabled}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cw-producer">Producent</Label>
              <Input
                id="cw-producer"
                value={custom.producer || ''}
                onChange={(e) => setCustom({ ...custom, producer: e.target.value })}
                disabled={disabled}
              />
            </div>
            <div>
              <Label htmlFor="cw-vintage">Årgång</Label>
              <Input
                id="cw-vintage"
                value={custom.vintage || ''}
                onChange={(e) => setCustom({ ...custom, vintage: e.target.value })}
                disabled={disabled}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cw-type">Typ</Label>
              <Select
                value={custom.type ?? ''}
                onValueChange={(v) =>
                  setCustom({ ...custom, type: (v || undefined) as CustomWineInput['type'] })
                }
                disabled={disabled}
              >
                <SelectTrigger id="cw-type">
                  <SelectValue placeholder="Välj typ" />
                </SelectTrigger>
                <SelectContent>
                  {WINE_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="cw-price">Pris (kr)</Label>
              <Input
                id="cw-price"
                type="number"
                min={0}
                value={custom.priceSek ?? ''}
                onChange={(e) =>
                  setCustom({
                    ...custom,
                    priceSek: e.target.value === '' ? undefined : Number(e.target.value),
                  })
                }
                disabled={disabled}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="cw-url">Systembolaget-länk</Label>
            <Input
              id="cw-url"
              type="url"
              value={custom.systembolagetUrl || ''}
              onChange={(e) => setCustom({ ...custom, systembolagetUrl: e.target.value })}
              placeholder="https://www.systembolaget.se/..."
              disabled={disabled}
            />
          </div>
          <Button
            type="button"
            variant="default"
            disabled={disabled || !custom.name.trim()}
            onClick={() => {
              onPickCustom({ ...custom, name: custom.name.trim() })
              setCustom({ name: '' })
            }}
          >
            Lägg till vin
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 2: TS sweep**

```bash
pnpm exec tsc --noEmit 2>&1 | grep "WinePicker" | head
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/tasting-plan/WinePicker.tsx
git commit -m "$(cat <<'EOF'
otter: WinePicker — typeahead + custom-wine reveal

Two-tab picker (library / custom) for the host wizard. Library tab
debounces /api/wines/search at 300ms with min-2-char gate; custom tab
collects name (required) + producer/vintage/type/url/price (optional).
Returns picked wines via onPickLibrary / onPickCustom callbacks.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: `TastingPlanForm` + `SortableWineRow` (the main wizard)

**Files:**
- Create: `src/components/tasting-plan/SortableWineRow.tsx`
- Create: `src/components/tasting-plan/TastingPlanForm.tsx`

- [ ] **Step 1: Create `SortableWineRow.tsx`**

```tsx
'use client'

import * as React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export interface SortableWineRowItem {
  key: string
  pourOrder: number
  title: string
  subtitle: string
  hostNotes: string
}

export interface SortableWineRowProps {
  item: SortableWineRowItem
  onNotesChange: (notes: string) => void
  onRemove: () => void
  disabled?: boolean
}

export function SortableWineRow({ item, onNotesChange, onRemove, disabled }: SortableWineRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.key,
    disabled,
  })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex gap-3 rounded-md border bg-card p-3 items-start"
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground mt-1"
        aria-label="Dra för att ändra ordning"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-400/10 text-brand-400 text-sm font-medium flex items-center justify-center">
        {item.pourOrder}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title}</p>
        {item.subtitle && (
          <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
        )}
        <Textarea
          className="mt-2 min-h-[60px] text-sm"
          placeholder="Anteckningar för värden (frivilligt)…"
          value={item.hostNotes}
          onChange={(e) => onNotesChange(e.target.value)}
          disabled={disabled}
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        disabled={disabled}
        aria-label="Ta bort vin"
      >
        <X className="h-4 w-4" />
      </Button>
    </li>
  )
}
```

- [ ] **Step 2: Create `TastingPlanForm.tsx` — top, types, helpers**

```tsx
'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import type { TastingPlan, Wine } from '@/payload-types'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Trash2 } from 'lucide-react'
import { WinePicker, type CustomWineInput, type LibraryWineResult } from './WinePicker'
import { SortableWineRow } from './SortableWineRow'

type WineEntry =
  | { kind: 'library'; key: string; libraryWine: number; wineSnapshot: LibraryWineResult; pourOrder: number; hostNotes: string }
  | { kind: 'custom'; key: string; customWine: CustomWineInput; pourOrder: number; hostNotes: string }

export interface TastingPlanFormProps {
  initialPlan?: TastingPlan
}

function nextKey() {
  return Math.random().toString(36).slice(2, 10)
}

function hydrateInitialWines(plan?: TastingPlan): WineEntry[] {
  if (!plan?.wines) return []
  return plan.wines.map((w, idx): WineEntry => {
    const pourOrder = w.pourOrder ?? idx + 1
    const hostNotes = w.hostNotes ?? ''
    const key = w.id ?? nextKey()
    if (w.libraryWine && typeof w.libraryWine === 'object') {
      const lib = w.libraryWine as Wine
      return {
        kind: 'library',
        key,
        libraryWine: lib.id,
        wineSnapshot: {
          id: lib.id,
          title: lib.title || `Vin #${lib.id}`,
          producer: (lib as any).producer ?? null,
          vintage: (lib as any).vintage ?? null,
          region: typeof (lib as any).region === 'object' ? (lib as any).region?.name ?? null : null,
          thumbnailUrl:
            typeof (lib as any).image === 'object' && (lib as any).image?.sizes?.thumbnail?.url
              ? (lib as any).image.sizes.thumbnail.url
              : typeof (lib as any).image === 'object'
              ? (lib as any).image?.url ?? null
              : null,
        },
        pourOrder,
        hostNotes,
      }
    }
    return {
      kind: 'custom',
      key,
      customWine: {
        name: w.customWine?.name || '',
        producer: w.customWine?.producer || undefined,
        vintage: w.customWine?.vintage || undefined,
        type: (w.customWine?.type || undefined) as CustomWineInput['type'],
        systembolagetUrl: w.customWine?.systembolagetUrl || undefined,
        priceSek: w.customWine?.priceSek ?? undefined,
      },
      pourOrder,
      hostNotes,
    }
  })
}
```

- [ ] **Step 3: Add the component body**

Append to `TastingPlanForm.tsx`:

```tsx
export function TastingPlanForm({ initialPlan }: TastingPlanFormProps) {
  const router = useRouter()
  const isEdit = !!initialPlan

  const [title, setTitle] = React.useState(initialPlan?.title ?? '')
  const [occasion, setOccasion] = React.useState(initialPlan?.occasion ?? '')
  const [description, setDescription] = React.useState(initialPlan?.description ?? '')
  const [targetParticipants, setTargetParticipants] = React.useState<number>(
    initialPlan?.targetParticipants ?? 4,
  )
  const [hostScript, setHostScript] = React.useState(initialPlan?.hostScript ?? '')
  const [wines, setWines] = React.useState<WineEntry[]>(() => hydrateInitialWines(initialPlan))
  const [submitting, setSubmitting] = React.useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const wineCount = wines.length
  const titleValid = title.trim().length > 0 && title.length <= 100
  const canSubmit = titleValid && wineCount >= 3 && !submitting

  function pickLibrary(w: LibraryWineResult) {
    setWines((prev) => [
      ...prev,
      {
        kind: 'library',
        key: nextKey(),
        libraryWine: w.id,
        wineSnapshot: w,
        pourOrder: prev.length + 1,
        hostNotes: '',
      },
    ])
  }

  function pickCustom(w: CustomWineInput) {
    setWines((prev) => [
      ...prev,
      {
        kind: 'custom',
        key: nextKey(),
        customWine: w,
        pourOrder: prev.length + 1,
        hostNotes: '',
      },
    ])
  }

  function removeAt(key: string) {
    setWines((prev) =>
      prev.filter((w) => w.key !== key).map((w, idx) => ({ ...w, pourOrder: idx + 1 })),
    )
  }

  function updateNotes(key: string, notes: string) {
    setWines((prev) => prev.map((w) => (w.key === key ? { ...w, hostNotes: notes } : w)))
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    setWines((prev) => {
      const oldIdx = prev.findIndex((w) => w.key === active.id)
      const newIdx = prev.findIndex((w) => w.key === over.id)
      if (oldIdx < 0 || newIdx < 0) return prev
      return arrayMove(prev, oldIdx, newIdx).map((w, idx) => ({ ...w, pourOrder: idx + 1 }))
    })
  }

  async function save() {
    if (!canSubmit) return
    setSubmitting(true)
    const payload = {
      title: title.trim(),
      description: description || undefined,
      occasion: occasion || undefined,
      targetParticipants,
      hostScript: hostScript || undefined,
      wines: wines.map((w, idx) => ({
        libraryWine: w.kind === 'library' ? w.libraryWine : undefined,
        customWine: w.kind === 'custom' ? w.customWine : undefined,
        pourOrder: idx + 1,
        hostNotes: w.hostNotes,
      })),
    }
    try {
      const res = await fetch(
        isEdit ? `/api/tasting-plans/${initialPlan!.id}` : '/api/tasting-plans',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error || 'Kunde inte spara planen.')
        return
      }
      toast.success(isEdit ? 'Sparat.' : 'Planen är skapad.')
      if (!isEdit && data.plan?.id) {
        router.replace(`/skapa-provning/${data.plan.id}`)
      } else {
        router.refresh()
      }
    } catch {
      toast.error('Nätverksfel — försök igen.')
    } finally {
      setSubmitting(false)
    }
  }

  async function deletePlan() {
    if (!initialPlan) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/tasting-plans/${initialPlan.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error || 'Kunde inte ta bort planen.')
        return
      }
      toast.success(data.archived ? 'Arkiverad.' : 'Borttagen permanent.')
      router.push('/mina-provningar/planer')
    } finally {
      setSubmitting(false)
    }
  }

  const sortableItems = wines.map((w) => ({
    key: w.key,
    pourOrder: w.pourOrder,
    title:
      w.kind === 'library'
        ? w.wineSnapshot.title
        : w.customWine.name || 'Namnlöst vin',
    subtitle:
      w.kind === 'library'
        ? [w.wineSnapshot.producer, w.wineSnapshot.vintage, w.wineSnapshot.region]
            .filter(Boolean)
            .join(' · ')
        : [w.customWine.producer, w.customWine.vintage].filter(Boolean).join(' · '),
    hostNotes: w.hostNotes,
  }))

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-32 space-y-8">
      <header>
        <h1 className="text-2xl font-heading">
          {isEdit ? 'Redigera provning' : 'Skapa provning'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Planera din provning. Spara som utkast — du kan ändra när som helst.
        </p>
      </header>

      <section className="space-y-3">
        <div>
          <Label htmlFor="t-title">Titel *</Label>
          <Input
            id="t-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="t.ex. Sommarrosé från Provence"
          />
          <p className="text-xs text-muted-foreground mt-1">{title.length}/100</p>
        </div>
        <div>
          <Label htmlFor="t-occasion">Tillfälle</Label>
          <Input
            id="t-occasion"
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
            placeholder="Födelsedag, fredagsmiddag …"
          />
        </div>
        <div>
          <Label htmlFor="t-desc">Beskrivning</Label>
          <Textarea
            id="t-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            placeholder="Frivilligt — sammanhang för dig som värd."
          />
          <p className="text-xs text-muted-foreground mt-1">{description.length}/500</p>
        </div>
        <div>
          <Label htmlFor="t-participants">Antal deltagare</Label>
          <Input
            id="t-participants"
            type="number"
            min={1}
            max={50}
            value={targetParticipants}
            onChange={(e) => setTargetParticipants(Number(e.target.value) || 1)}
            className="w-28"
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Viner ({wineCount})</h2>
          {wineCount < 3 && (
            <span className="text-xs text-muted-foreground">Minst 3 viner krävs</span>
          )}
        </div>
        {wineCount >= 9 && (
          <div className="rounded-md border border-yellow-300/50 bg-yellow-50 dark:bg-yellow-950/30 p-3 text-sm">
            Långa provningar är svåra att hålla fokus på. Överväg att dela upp i två tillfällen.
          </div>
        )}
        {wineCount === 0 ? (
          <p className="text-sm text-muted-foreground">Inga viner tillagda än.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext
              items={sortableItems.map((i) => i.key)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-2">
                {sortableItems.map((item) => (
                  <SortableWineRow
                    key={item.key}
                    item={item}
                    onNotesChange={(notes) => updateNotes(item.key, notes)}
                    onRemove={() => removeAt(item.key)}
                    disabled={submitting}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
        <WinePicker
          onPickLibrary={pickLibrary}
          onPickCustom={pickCustom}
          disabled={submitting}
        />
      </section>

      <section className="space-y-2">
        <Label htmlFor="t-script">Manus för värden</Label>
        <Textarea
          id="t-script"
          value={hostScript}
          onChange={(e) => setHostScript(e.target.value)}
          rows={8}
          placeholder="Frivilligt — anteckningar du vill ha med på fusklappen under provningen."
        />
      </section>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between gap-3">
          {isEdit ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="ghost" disabled={submitting}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {initialPlan?.status === 'archived' ? 'Ta bort permanent' : 'Radera'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {initialPlan?.status === 'archived'
                      ? 'Ta bort permanent?'
                      : 'Arkivera planen?'}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {initialPlan?.status === 'archived'
                      ? 'Den här åtgärden går inte att ångra.'
                      : 'Planen försvinner från listan men finns kvar i databasen tills du tar bort den igen.'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                  <AlertDialogAction onClick={deletePlan}>Bekräfta</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <span />
          )}
          <Button type="button" onClick={save} disabled={!canSubmit}>
            {submitting ? 'Sparar…' : isEdit ? 'Spara ändringar' : 'Spara utkast'}
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: TS sweep**

```bash
pnpm exec tsc --noEmit 2>&1 | grep -E "tasting-plan/" | head -20
```
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/components/tasting-plan/SortableWineRow.tsx src/components/tasting-plan/TastingPlanForm.tsx
git commit -m "$(cat <<'EOF'
otter: TastingPlanForm + SortableWineRow

Single-scrollable-page wizard for create+edit. Local form state,
explicit save, optimistic add/remove/reorder via @dnd-kit/sortable.
Soft max-8 warning, hard min-3 disables save. Delete on edit page
archives first, hard-deletes second time. After create, replaces URL
to /skapa-provning/[newId] to keep back-button sane.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: `PlanCard` component

**Files:**
- Create: `src/components/tasting-plan/PlanCard.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { TastingPlan } from '@/payload-types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { MoreVertical } from 'lucide-react'

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

export interface PlanCardProps {
  plan: TastingPlan
}

export function PlanCard({ plan }: PlanCardProps) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const wineCount = plan.wines?.length ?? 0
  const isArchived = plan.status === 'archived'

  async function performDelete() {
    setBusy(true)
    try {
      const res = await fetch(`/api/tasting-plans/${plan.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error || 'Kunde inte ta bort planen.')
        return
      }
      toast.success(data.archived ? 'Arkiverad.' : 'Borttagen permanent.')
      router.refresh()
    } finally {
      setBusy(false)
      setConfirmOpen(false)
    }
  }

  return (
    <>
      <Card className="relative p-4 hover:shadow-md transition-shadow flex flex-col gap-3">
        <Link href={`/skapa-provning/${plan.id}`} className="absolute inset-0 z-0" aria-label={plan.title} />
        <div className="flex items-start justify-between relative z-10 pointer-events-none">
          <div className="min-w-0 flex-1 pr-2">
            <h3 className="font-semibold truncate">{plan.title}</h3>
            <p className="text-xs text-muted-foreground truncate">{plan.occasion || '—'}</p>
          </div>
          <div className="flex-shrink-0 pointer-events-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" disabled={busy} aria-label="Åtgärder">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setConfirmOpen(true)}>
                  {isArchived ? 'Ta bort permanent' : 'Arkivera'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex items-center justify-between relative z-10 pointer-events-none">
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[plan.status]}>{STATUS_LABEL[plan.status]}</Badge>
            <span className="text-xs text-muted-foreground">{wineCount} viner</span>
          </div>
          <span className="text-xs text-muted-foreground">{formatRelative(plan.updatedAt)}</span>
        </div>
      </Card>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isArchived ? 'Ta bort permanent?' : 'Arkivera planen?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isArchived
                ? 'Den här åtgärden går inte att ångra.'
                : 'Planen försvinner från listan men finns kvar i databasen tills du tar bort den igen.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={performDelete}>Bekräfta</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
```

- [ ] **Step 2: TS sweep**

```bash
pnpm exec tsc --noEmit 2>&1 | grep "PlanCard" | head
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/tasting-plan/PlanCard.tsx
git commit -m "$(cat <<'EOF'
otter: PlanCard — listing card with archive/delete menu

Card body links to /skapa-provning/[id] via absolute overlay anchor;
trailing dropdown opens archive-or-hard-delete confirm. Status badge
uses brand variant for draft, default for ready, secondary for archived.
Wine count + relative updatedAt timestamp shown in footer.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Wizard pages (`/skapa-provning` + `/skapa-provning/[id]`)

**Files:**
- Create: `src/app/(frontend)/(site)/skapa-provning/page.tsx`
- Create: `src/app/(frontend)/(site)/skapa-provning/[id]/page.tsx`

- [ ] **Step 1: Create `/skapa-provning/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getUser } from '@/lib/get-user'
import { TastingPlanForm } from '@/components/tasting-plan/TastingPlanForm'

export const metadata: Metadata = {
  title: 'Skapa provning — Vinakademin',
}

export default async function SkapaProvningPage() {
  const user = await getUser()
  if (!user) {
    redirect('/logga-in?from=/skapa-provning')
  }
  return <TastingPlanForm />
}
```

- [ ] **Step 2: Create `/skapa-provning/[id]/page.tsx`**

```tsx
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { TastingPlanForm } from '@/components/tasting-plan/TastingPlanForm'
import type { TastingPlan } from '@/payload-types'

export default async function SkapaProvningEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getUser()
  if (!user) {
    const { id } = await params
    redirect(`/logga-in?from=/skapa-provning/${id}`)
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
  if (!isAdmin && ownerId !== user.id) {
    notFound()
  }

  return <TastingPlanForm initialPlan={plan} />
}
```

- [ ] **Step 3: TS sweep**

```bash
pnpm exec tsc --noEmit 2>&1 | grep "skapa-provning" | head
```
Expected: no output.

- [ ] **Step 4: Smoke test**

```bash
# Unauthenticated → redirect (302/307) to /logga-in
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" http://localhost:3000/skapa-provning
```
Expected: 3xx redirecting to `/logga-in?from=/skapa-provning`.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(frontend)/(site)/skapa-provning"
git commit -m "$(cat <<'EOF'
otter: /skapa-provning create + edit pages

Both routes render TastingPlanForm; edit variant fetches the plan
server-side with owner check (404 instead of 403 to avoid leaking
existence to non-owners). Unauthenticated users redirect to login
with from= preserved.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Listing page (`/mina-provningar/planer`)

**Files:**
- Create: `src/app/(frontend)/(site)/mina-provningar/planer/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { Button } from '@/components/ui/button'
import { PlanCard } from '@/components/tasting-plan/PlanCard'
import { Plus, Wine } from 'lucide-react'
import type { TastingPlan } from '@/payload-types'

export const metadata: Metadata = {
  title: 'Mina planer — Vinakademin',
  description: 'Dina egna provningsplaner.',
}

export const dynamic = 'force-dynamic'

export default async function MinaPlanerPage() {
  const user = await getUser()
  if (!user) redirect('/logga-in?from=/mina-provningar/planer')

  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'tasting-plans',
    where: {
      and: [
        { owner: { equals: user.id } },
        { status: { not_equals: 'archived' } },
      ],
    },
    sort: '-updatedAt',
    limit: 100,
    depth: 0,
  })
  const plans = docs as TastingPlan[]

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading">Mina planer</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Provningar du har planerat. Skapa nya och starta sessioner härifrån.
          </p>
        </div>
        <Button asChild>
          <Link href="/skapa-provning">
            <Plus className="h-4 w-4 mr-2" />
            Ny provning
          </Link>
        </Button>
      </header>

      {plans.length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center">
          <Wine className="h-10 w-10 mx-auto text-muted-foreground" />
          <h2 className="mt-3 font-semibold">Inga planer än</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Skapa din första provning för att komma igång.
          </p>
          <Button asChild className="mt-4">
            <Link href="/skapa-provning">
              <Plus className="h-4 w-4 mr-2" />
              Skapa din första provning
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TS sweep**

```bash
pnpm exec tsc --noEmit 2>&1 | grep "mina-provningar/planer" | head
```
Expected: no output.

- [ ] **Step 3: Smoke test**

```bash
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" http://localhost:3000/mina-provningar/planer
```
Expected: 3xx redirecting to login.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(frontend)/(site)/mina-provningar/planer"
git commit -m "$(cat <<'EOF'
otter: /mina-provningar/planer listing page

Server-rendered card grid of the user's own non-archived plans.
Empty state CTA links to /skapa-provning. Archived plans are
hidden by default; we'll add an opt-in toggle later if requested.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Add "Mina planer" to the top-nav user dropdown

**Files:**
- Modify: `src/components/top-nav-header.tsx`

- [ ] **Step 1: Add the new menu item**

Find this block (around line 138-143):

```tsx
                  <DropdownMenuItem asChild>
                    <Link href="/mina-provningar" className="cursor-pointer">
                      <Wine className="mr-2 h-4 w-4" />
                      Mina Provningar
                    </Link>
                  </DropdownMenuItem>
```

Add a new `DropdownMenuItem` right after it:

```tsx
                  <DropdownMenuItem asChild>
                    <Link href="/mina-provningar/planer" className="cursor-pointer">
                      <Wine className="mr-2 h-4 w-4" />
                      Mina planer
                    </Link>
                  </DropdownMenuItem>
```

(Same Wine icon is fine — the label disambiguates.)

- [ ] **Step 2: TS sweep + commit**

```bash
pnpm exec tsc --noEmit 2>&1 | grep "top-nav-header" | head
git add src/components/top-nav-header.tsx
git commit -m "$(cat <<'EOF'
otter: top-nav user dropdown — link Mina planer

Discoverability for the host-wizard listing. Sits next to existing
Mina Provningar.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: E2E smoke + lint sweep + push to production

- [ ] **Step 1: Lint + TS clean**

```bash
pnpm lint 2>&1 | tail -20
pnpm exec tsc --noEmit 2>&1 | grep -E "(tasting-plan|wines/search|skapa-provning|mina-provningar/planer|top-nav-header)" | head -30
```
Expected: lint clean for the new files; TS check produces no new errors for touched files.

- [ ] **Step 2: Build smoke**

```bash
pnpm build 2>&1 | tail -30
```
Expected: "Compiled successfully". Pre-existing TS warnings in unrelated files are fine.

- [ ] **Step 3: Manual UI smoke (browser, logged in as a regular user)**

1. Navigate to `/skapa-provning` from the user dropdown's "Mina planer" entry. Verify the dropdown shows the new link.
2. From `/mina-provningar/planer` (empty state), click `Skapa din första provning` → land on `/skapa-provning`.
3. Type a title. Notice save button is disabled.
4. Add 3 library wines via typeahead (search for any common term, click results). Save button enables. Click `Spara utkast`.
5. URL should change to `/skapa-provning/[id]`. Toast "Planen är skapad."
6. Add a 4th custom wine — only fill `Namn`, leave the rest blank, click `Lägg till vin`. The row appears.
7. Reorder a wine via drag handle. Save changes.
8. Reload the page; confirm wine order persists and the 4th custom wine still shows by name.
9. Navigate back to `/mina-provningar/planer`. Card shows: title, occasion (or `—`), `Utkast` badge, "4 viner", relative time.
10. From the card's `⋮` menu, click `Arkivera`. Confirm. Card disappears from listing.
11. Hit `/skapa-provning/<the-archived-id>` directly. The form loads (archived is still owner-visible). Delete button now says "Ta bort permanent". Hard-delete it. Confirm 404 on subsequent reload.
12. Open `/skapa-provning/999999999` (non-existent or not yours) → 404.

If any step fails, fix and re-commit before pushing.

- [ ] **Step 4: Push to main**

```bash
git log --oneline origin/main..HEAD
git push origin main
```

- [ ] **Step 5: Merge main → production**

```bash
git fetch origin
git checkout production
git pull --ff-only origin production
git merge --no-ff main -m "$(cat <<'EOF'
release: Chunk B — Host Wizard

Member-authored tasting plans:
- /skapa-provning create + edit
- /mina-provningar/planer listing (card grid)
- WinePicker (library typeahead + custom-wine reveal)
- Drag-reorder, soft max-8 warn, archive-then-hard-delete
- Top-nav dropdown surface

No schema changes — Chunk A's TastingPlans collection unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push origin production
git checkout main
```

- [ ] **Step 6: Verify deploy**

```bash
git log origin/production --oneline -3
```
Expected: the merge commit at HEAD.

---

## Out of scope (handled in Chunk C)

- `Mark-as-ready` button to transition `draft → ready` status.
- Plan detail page at `/mina-provningar/planer/[id]` (read-only summary).
- Shopping list / host cheat sheet / start-session integration.
- Edit-while-live-session lock.
