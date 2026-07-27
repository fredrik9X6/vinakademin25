# Tasting Information Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge user-created tasting plans and Vinakademin templates into one filterable "Provningar" surface at `/provningsmallar`, put a create CTA on it for everyone, collapse two nav entries into one, and evict the video-courses page from the `/mina-provningar` namespace so breadcrumbs stop saying "Vinkurser".

**Architecture:** Presentational + navigational only. No Payload collection changes, therefore **no migration**. Three pure modules carry the logic that is easy to get wrong — redirect matching, filter-URL composition, breadcrumb trail building — so each is unit-testable outside React and Next.

**Tech Stack:** Next.js 15 App Router (React 19 server components), Payload CMS 3.33, Tailwind, Shadcn UI, `node:test` + `node:assert/strict` via `npx tsx --test`.

**Spec:** `docs/superpowers/specs/2026-07-27-tasting-information-architecture-design.md`

## Global Constraints

- Swedish for all user-facing copy. "poäng" and "betyg" are invariant (same singular/plural).
- All `@payloadcms/*` packages pinned to exact `3.33.0` — never widen to `^`/`~`.
- No collection or enum changes in this plan ⇒ **do not** run `pnpm migrate:create`.
- Payload v3 APIs only. Import `Access`/`PayloadRequest` from `payload`, never `payload/types`.
- `pnpm build` is the real gate. A JSX parse error makes `tsc` report **fewer** errors because it bails early — never treat a drop in the `tsc` line count as progress.
- `npx tsc --noEmit` baseline ceiling: **75 lines**. Do not exceed it.
- Package manager is **pnpm**. Never `npm`/`yarn`.
- Never move or prefix-match `/mina-provningar/planer/[id]` or `/mina-provningar/historik/[id]` — those are live-session and guest-recap URLs already in the wild.

---

## File Structure

**New pure modules (unit-tested):**
- `src/lib/tasting-route-redirects.ts` — pathname → redirect decision. Exact-match only.
- `src/lib/provningar-view.ts` — filter state parse + single href builder for every filter link.
- `src/lib/breadcrumb-trail.ts` — pathname → crumb list, extracted from `breadcrumb-bar.tsx`.

**New client components:**
- `src/components/tasting/ProvningarViewTabs.tsx` — the Alla/Mina/Från Vinakademin control.
- `src/components/tasting/SkapaEgenButton.tsx` — the create CTA, auth-aware.

**Modified:**
- `src/middleware.ts` — wire redirects; extend `protectedPaths`.
- `src/app/(frontend)/(site)/provningsmallar/page.tsx` — the merged surface.
- `src/components/tasting-plan/PlanCard.tsx` — 4:3 media header + `MIN` badge.
- `src/components/tasting-template/TagFilter.tsx` — build hrefs through `provningar-view`.
- `src/components/top-nav-header.tsx`, `src/components/mobile-bottom-nav.tsx` — nav.
- `src/components/breadcrumb-bar.tsx` — consume the extracted trail builder.
- `src/app/robots.ts`, plus eight inbound-link sites for the route move.

**Moved:**
- `src/app/(frontend)/(site)/mina-provningar/page.tsx` → `src/app/(frontend)/(site)/mina-vinkurser/page.tsx`. The component at `src/components/mina-provningar/MinaProvningarPage.tsx` **stays put**.

**Deleted:**
- `src/app/(frontend)/(site)/mina-provningar/planer/page.tsx` (its content moves into the merged surface; the URL becomes a 301).

---

### Task 1: Redirect-matching module

The trap this exists to prevent: the established middleware idiom is
`pathname === X || pathname.startsWith(X + '/')` (`middleware.ts:80,91`). Applying it to
either tasting path swallows the live-session route. A pure module with tests makes that
structurally impossible to reintroduce.

**Files:**
- Create: `src/lib/tasting-route-redirects.ts`
- Test: `src/lib/tasting-route-redirects.test.ts`
- Modify: `package.json` (add `test:ia` script)

**Interfaces:**
- Consumes: nothing.
- Produces: `resolveTastingRedirect(pathname: string): TastingRedirect | null` and
  `interface TastingRedirect { pathname: string; setParams?: Record<string, string>; status: 301 }`.
  Task 2 and Task 6 wire this into `src/middleware.ts`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/tasting-route-redirects.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveTastingRedirect } from './tasting-route-redirects'

test('/mina-provningar redirects to the renamed courses route', () => {
  assert.deepEqual(resolveTastingRedirect('/mina-provningar'), {
    pathname: '/mina-vinkurser',
    status: 301,
  })
})

test('/mina-provningar/planer redirects to the merged gallery, filtered to Mina', () => {
  assert.deepEqual(resolveTastingRedirect('/mina-provningar/planer'), {
    pathname: '/provningsmallar',
    setParams: { visa: 'mina' },
    status: 301,
  })
})

test('a trailing slash matches the same rule', () => {
  assert.equal(resolveTastingRedirect('/mina-provningar/')?.pathname, '/mina-vinkurser')
  assert.equal(resolveTastingRedirect('/mina-provningar/planer/')?.pathname, '/provningsmallar')
})

// THE regression this module exists for. A prefix match here takes down every
// live tasting session and every guest recap link already handed out.
test('never matches a live session, its shopping list, or a recap', () => {
  assert.equal(resolveTastingRedirect('/mina-provningar/planer/123'), null)
  assert.equal(resolveTastingRedirect('/mina-provningar/planer/123/handlingslista'), null)
  assert.equal(resolveTastingRedirect('/mina-provningar/historik'), null)
  assert.equal(resolveTastingRedirect('/mina-provningar/historik/45'), null)
})

test('never matches the redirect targets — no loops', () => {
  assert.equal(resolveTastingRedirect('/mina-vinkurser'), null)
  assert.equal(resolveTastingRedirect('/provningsmallar'), null)
})

test('unrelated paths are untouched', () => {
  assert.equal(resolveTastingRedirect('/'), null)
  assert.equal(resolveTastingRedirect('/vinkurser'), null)
  assert.equal(resolveTastingRedirect('/mina-provningarx'), null)
})
```

- [ ] **Step 2: Add the test script and run it to verify it fails**

In `package.json` `scripts`, add after `test:session`:

```json
"test:ia": "cross-env NODE_OPTIONS=--no-deprecation npx tsx --test src/lib/tasting-route-redirects.test.ts"
```

Run: `pnpm test:ia`
Expected: FAIL — cannot find module `./tasting-route-redirects`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/tasting-route-redirects.ts`:

```ts
/**
 * Permanent redirects for the 2026-07-27 tasting IA consolidation.
 *
 * EXACT MATCH ONLY. The surrounding middleware uses
 * `pathname === X || pathname.startsWith(X + '/')` for its other 301s; that
 * idiom is wrong here and dangerous:
 *   - a prefix match on `/mina-provningar/planer` swallows
 *     `/mina-provningar/planer/[id]`, the live tasting session (and its
 *     `/handlingslista`), whose URLs guests already hold via join links;
 *   - a prefix match on `/mina-provningar` swallows all of the above plus
 *     `/mina-provningar/historik/[id]`, the guest recap.
 *
 * Kept as a pure function so those cases are covered by
 * src/lib/tasting-route-redirects.test.ts rather than by hoping.
 *
 * Spec: docs/superpowers/specs/2026-07-27-tasting-information-architecture-design.md (D6)
 */
export interface TastingRedirect {
  /** Destination path, without query string. */
  pathname: string
  /**
   * Params to SET on the destination. The caller preserves the incoming query
   * string, so e.g. `?showArchived=1` survives the hop to `?visa=mina&showArchived=1`.
   */
  setParams?: Record<string, string>
  status: 301
}

/** Exact source path → redirect. Never consulted with a prefix. */
const RULES: Record<string, TastingRedirect> = {
  // The root of this namespace renders purchased VIDEO COURSES, not tastings.
  '/mina-provningar': { pathname: '/mina-vinkurser', status: 301 },
  // The plans index is now a filtered view of the merged gallery.
  '/mina-provningar/planer': {
    pathname: '/provningsmallar',
    setParams: { visa: 'mina' },
    status: 301,
  },
}

export function resolveTastingRedirect(pathname: string): TastingRedirect | null {
  // Next normalises trailing slashes by default, but a redirect that only
  // fires on one of the two spellings is a silent hole — normalise anyway.
  const normalised =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
  return RULES[normalised] ?? null
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test:ia`
Expected: PASS — 6 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tasting-route-redirects.ts src/lib/tasting-route-redirects.test.ts package.json
git commit -m "feat(ia): exact-match redirect module for tasting route moves

Pure + tested so a prefix match can never take down the live-session URL."
```

---

### Task 2: Move the video-courses page out of the tasting namespace

`/mina-provningar` renders `MinaProvningarPage` — purchased video courses, not tastings
(`metadata.title: 'Mina Vinkurser - Vinakademin'`). Every inbound link's own copy already
says "Mina vinkurser". Moving it makes the segment name true and is the actual fix for the
breadcrumb defect.

**Files:**
- Create: `src/app/(frontend)/(site)/mina-vinkurser/page.tsx`
- Delete: `src/app/(frontend)/(site)/mina-provningar/page.tsx`
- Modify: `src/middleware.ts` (wire redirect module; extend `protectedPaths`)
- Modify: `src/app/robots.ts:32`
- Modify: `src/app/(frontend)/(site)/checkout/success/page.tsx:97,234,271`
- Modify: `src/app/(frontend)/(auth)/aktivera-konto/page.tsx:14`
- Modify: `src/app/(frontend)/(auth)/onboarding/page.tsx:17`
- Modify: `src/app/api/webhooks/stripe/route.ts:798`
- Modify: `src/app/(frontend)/(site)/mina-sidor/page.tsx:76`
- Modify: `src/components/dashboard/RoleBasedContent.tsx:54`
- Modify: `src/components/profile/UserProfilePage.tsx:74`

**Interfaces:**
- Consumes: `resolveTastingRedirect` from Task 1.
- Produces: the working `/mina-vinkurser` route. Task 7 adds its breadcrumb label.

- [ ] **Step 1: Create the new route**

Create `src/app/(frontend)/(site)/mina-vinkurser/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { MinaProvningarPage } from '@/components/mina-provningar/MinaProvningarPage'

export const metadata: Metadata = {
  title: 'Mina vinkurser — Vinakademin',
  description: 'Dina köpta vinkurser och dina framsteg.',
}

export default function MinaVinkurserRoute() {
  return <MinaProvningarPage />
}
```

The component keeps its old path and name — renaming it touches no user-visible surface
and would inflate the diff.

- [ ] **Step 2: Point the component's own login bounce at the new URL**

In `src/components/mina-provningar/MinaProvningarPage.tsx`, the redirect on line ~24 reads
`router.push('/logga-in?from=/mina-provningar')`. Change to:

```tsx
router.push('/logga-in?from=/mina-vinkurser')
```

- [ ] **Step 3: Delete the old route file**

```bash
git rm src/app/\(frontend\)/\(site\)/mina-provningar/page.tsx
```

- [ ] **Step 4: Update every inbound reference**

Replace the string `/mina-provningar` with `/mina-vinkurser` at exactly these sites. Do
**not** blanket-replace — `/mina-provningar/planer` and `/mina-provningar/historik` must
survive untouched.

```bash
grep -rn "'/mina-provningar'\|\"/mina-provningar\"" src
```

Expected hits to change: `checkout/success/page.tsx:97,234,271`,
`aktivera-konto/page.tsx:14`, `onboarding/page.tsx:17`,
`api/webhooks/stripe/route.ts:798`, `mina-sidor/page.tsx:76`,
`dashboard/RoleBasedContent.tsx:54`, `profile/UserProfilePage.tsx:74`.

In `src/app/robots.ts`, keep the existing `/mina-provningar` entries (sessions and history
still live there and are private) and add the new route beside them:

```ts
          '/mina-provningar',
          '/mina-provningar/',
          '/mina-vinkurser',
          '/mina-vinkurser/',
```

- [ ] **Step 5: Wire the redirect and extend the auth gate**

In `src/middleware.ts`, add the import at the top:

```ts
import { resolveTastingRedirect } from '@/lib/tasting-route-redirects'
```

Insert this block immediately **after** the `/vinprovningar` 301 (ends line 95) and
**before** the "Skip middleware for API routes" block — i.e. ahead of the `protectedPaths`
gate, so a logged-out visitor following an old bookmark is redirected rather than bounced
to `/logga-in`:

```ts
  // Tasting IA consolidation (2026-07-27). Exact-match only — see
  // src/lib/tasting-route-redirects.ts for why a prefix match is dangerous here.
  const tastingRedirect = resolveTastingRedirect(pathname)
  if (tastingRedirect) {
    url.pathname = tastingRedirect.pathname
    for (const [key, value] of Object.entries(tastingRedirect.setParams ?? {})) {
      url.searchParams.set(key, value)
    }
    return NextResponse.redirect(url, tastingRedirect.status)
  }
```

Then extend `protectedPaths` (line 19) so the moved page keeps its auth gate:

```ts
  {
    path: '/mina-provningar',
    roles: ['admin', 'instructor', 'subscriber', 'user'],
  },
  {
    path: '/mina-vinkurser',
    roles: ['admin', 'instructor', 'subscriber', 'user'],
  },
```

Note: Task 1's rule for `/mina-provningar/planer` is now live. That is intentional and safe
— `visa=mina` is an unknown param until Task 5, so the redirect lands on the existing
template gallery rather than an error. Task 6 removes the nav links that point there.

- [ ] **Step 6: Verify**

```bash
pnpm test:ia && pnpm lint && npx tsc --noEmit 2>&1 | wc -l
```
Expected: tests PASS, lint 0 errors, `tsc` output ≤ 75 lines.

Then `pnpm dev` and check by hand:
- `/mina-provningar` → 301 → `/mina-vinkurser`, page renders purchased courses
- `/mina-provningar/planer/<any existing plan id>` → still loads the plan detail (**not** redirected)
- `/mina-provningar/historik` → still loads

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(ia): move purchased-courses page to /mina-vinkurser

/mina-provningar rendered video courses while its children rendered
tastings, so no single breadcrumb label could be correct. 301 covers
activation emails already in inboxes."
```

---

### Task 3: Filter-state module for the merged gallery

Every filter link on the page is rebuilt from scratch today (`pillHref`, `statusHref`,
`TagFilter`'s inline hrefs). Adding a fourth dimension by hand guarantees one of them drops
it. One builder, tested.

**Files:**
- Create: `src/lib/provningar-view.ts`
- Test: `src/lib/provningar-view.test.ts`
- Modify: `package.json` (extend `test:ia`)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type ProvningarView = 'alla' | 'mina' | 'mallar'`
  - `interface ProvningarFilterState { view: ProvningarView; tag: string | null; access: 'free' | 'paid' | null; status: 'draft' | null; showArchived: boolean }`
  - `parseProvningarFilters(sp: Record<string, string | undefined>): ProvningarFilterState`
  - `buildProvningarHref(current: ProvningarFilterState, patch: Partial<ProvningarFilterState>): string`
  - `viewIncludesPlans(view)`, `viewIncludesTemplates(view)`
  Tasks 5 and 6 consume all of these.

- [ ] **Step 1: Write the failing test**

Create `src/lib/provningar-view.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildProvningarHref,
  parseProvningarFilters,
  viewIncludesPlans,
  viewIncludesTemplates,
  type ProvningarFilterState,
} from './provningar-view'

const BASE: ProvningarFilterState = {
  view: 'alla',
  tag: null,
  access: null,
  status: null,
  showArchived: false,
}

test('an absent or unknown visa param means Alla', () => {
  assert.equal(parseProvningarFilters({}).view, 'alla')
  assert.equal(parseProvningarFilters({ visa: 'nonsense' }).view, 'alla')
  assert.equal(parseProvningarFilters({ visa: 'mina' }).view, 'mina')
  assert.equal(parseProvningarFilters({ visa: 'mallar' }).view, 'mallar')
})

test('parses the pre-existing params alongside it', () => {
  const s = parseProvningarFilters({
    visa: 'mallar',
    tag: 'Bourgogne',
    access: 'paid',
    status: 'draft',
    showArchived: '1',
  })
  assert.deepEqual(s, {
    view: 'mallar',
    tag: 'Bourgogne',
    access: 'paid',
    status: 'draft',
    showArchived: true,
  })
})

test('Alla serialises to a bare path', () => {
  assert.equal(buildProvningarHref(BASE, {}), '/provningsmallar')
})

test('switching view keeps the path clean', () => {
  assert.equal(buildProvningarHref(BASE, { view: 'mina' }), '/provningsmallar?visa=mina')
})

// The regression this module exists for: clicking a secondary filter must not
// throw the user back to Alla.
test('changing access preserves the active view and tag', () => {
  const current: ProvningarFilterState = {
    ...BASE,
    view: 'mallar',
    tag: 'Bourgogne',
  }
  assert.equal(
    buildProvningarHref(current, { access: 'paid' }),
    '/provningsmallar?visa=mallar&tag=Bourgogne&access=paid',
  )
})

test('template-only filters are dropped when switching to Mina', () => {
  const current: ProvningarFilterState = {
    ...BASE,
    view: 'mallar',
    tag: 'Bourgogne',
    access: 'paid',
    status: 'draft',
  }
  assert.equal(buildProvningarHref(current, { view: 'mina' }), '/provningsmallar?visa=mina')
})

test('the plan-only filter is dropped when leaving Mina', () => {
  const current: ProvningarFilterState = { ...BASE, view: 'mina', showArchived: true }
  assert.equal(buildProvningarHref(current, { view: 'mallar' }), '/provningsmallar?visa=mallar')
  assert.equal(
    buildProvningarHref(current, { showArchived: true }),
    '/provningsmallar?visa=mina&showArchived=1',
  )
})

test('tag values are URL-encoded', () => {
  assert.equal(
    buildProvningarHref(BASE, { tag: 'Rhône & Syrah' }),
    '/provningsmallar?tag=Rh%C3%B4ne%20%26%20Syrah',
  )
})

test('view membership predicates', () => {
  assert.equal(viewIncludesPlans('alla'), true)
  assert.equal(viewIncludesPlans('mina'), true)
  assert.equal(viewIncludesPlans('mallar'), false)
  assert.equal(viewIncludesTemplates('alla'), true)
  assert.equal(viewIncludesTemplates('mina'), false)
  assert.equal(viewIncludesTemplates('mallar'), true)
})
```

- [ ] **Step 2: Extend the test script and run it to verify it fails**

In `package.json`, change `test:ia` to:

```json
"test:ia": "cross-env NODE_OPTIONS=--no-deprecation npx tsx --test src/lib/tasting-route-redirects.test.ts src/lib/provningar-view.test.ts"
```

Run: `pnpm test:ia`
Expected: FAIL — cannot find module `./provningar-view`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/provningar-view.ts`:

```ts
/**
 * Filter state for the merged Provningar surface (/provningsmallar).
 *
 * One builder for every filter link on the page. Before this existed the page
 * had two ad-hoc query-string builders (`pillHref`, `statusHref`) plus inline
 * hrefs inside TagFilter; adding the `visa` dimension by hand to all three
 * would reliably leave one of them dropping it, silently throwing the user
 * back to Alla mid-browse.
 *
 * Secondary filters are scoped to the view that can act on them: tag/access/
 * status are template concepts, showArchived is a plan concept. Switching view
 * drops whatever no longer applies, so a URL never claims a filter the visible
 * list ignores.
 *
 * Spec: docs/superpowers/specs/2026-07-27-tasting-information-architecture-design.md (D1, D8)
 */
export type ProvningarView = 'alla' | 'mina' | 'mallar'

export interface ProvningarFilterState {
  view: ProvningarView
  /** Template tag filter. */
  tag: string | null
  /** Template access-level filter. */
  access: 'free' | 'paid' | null
  /** Admin-only: show template drafts instead of published. */
  status: 'draft' | null
  /** Plan-only: include archived plans. */
  showArchived: boolean
}

export function viewIncludesPlans(view: ProvningarView): boolean {
  return view === 'alla' || view === 'mina'
}

export function viewIncludesTemplates(view: ProvningarView): boolean {
  return view === 'alla' || view === 'mallar'
}

export function parseProvningarFilters(
  sp: Record<string, string | undefined>,
): ProvningarFilterState {
  const rawView = sp.visa
  const view: ProvningarView =
    rawView === 'mina' || rawView === 'mallar' ? rawView : 'alla'
  const tag = (sp.tag || '').trim() || null
  const access = sp.access === 'free' || sp.access === 'paid' ? sp.access : null
  const status = sp.status === 'draft' ? 'draft' : null
  return { view, tag, access, status, showArchived: sp.showArchived === '1' }
}

export function buildProvningarHref(
  current: ProvningarFilterState,
  patch: Partial<ProvningarFilterState>,
): string {
  const next: ProvningarFilterState = { ...current, ...patch }

  // Drop filters the resulting view cannot act on.
  if (!viewIncludesTemplates(next.view)) {
    next.tag = null
    next.access = null
    next.status = null
  }
  if (!viewIncludesPlans(next.view)) {
    next.showArchived = false
  }

  // Deterministic order so hrefs are stable and assertable.
  const params = new URLSearchParams()
  if (next.view !== 'alla') params.set('visa', next.view)
  if (next.tag) params.set('tag', next.tag)
  if (next.access) params.set('access', next.access)
  if (next.status) params.set('status', next.status)
  if (next.showArchived) params.set('showArchived', '1')

  // URLSearchParams encodes spaces as "+"; Next and the tag filter both round-trip
  // "%20" cleanly, so normalise to percent-encoding for stable, readable URLs.
  const qs = params.toString().replace(/\+/g, '%20')
  return qs ? `/provningsmallar?${qs}` : '/provningsmallar'
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test:ia`
Expected: PASS — 15 tests total across both files, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/lib/provningar-view.ts src/lib/provningar-view.test.ts package.json
git commit -m "feat(ia): single filter-href builder for the merged Provningar view

Scopes secondary filters to the view that can act on them, so a URL never
claims a filter the visible list ignores."
```

---

### Task 4: Give `PlanCard` a card shell that can share a grid with `TemplateCard`

`TemplateCard` is a 4:3 image card with a top-right badge; `PlanCard` is a compact text
card. Interleaved as-is under "Alla" the grid visibly breaks.

**Files:**
- Modify: `src/components/tasting-plan/PlanCard.tsx:137-180`

**Interfaces:**
- Consumes: nothing.
- Produces: `PlanCard` unchanged in props (`{ plan: TastingPlan }`), now rendering a media
  header. Task 5 renders it beside `TemplateCard`.

- [ ] **Step 1: Add the `Wine` icon import**

In `src/components/tasting-plan/PlanCard.tsx`, extend the existing lucide import:

```tsx
import { MoreVertical, Copy, Wine } from 'lucide-react'
```

- [ ] **Step 2: Replace the Card body with a media header plus body**

Replace the `<Card>` opening and its two child rows (currently lines ~137-180, from
`<Card` through the closing `</div>` of the meta row) with:

```tsx
      <Card
        className={`relative overflow-hidden hover:shadow-md transition-shadow ${
          isArchived ? 'opacity-60' : ''
        }`}
      >
        <Link
          href={`/mina-provningar/planer/${plan.id}`}
          className="absolute inset-0 z-0"
          aria-label={plan.title}
        />
        {/* Plans have no featuredImage. A gradient block — deliberately not a
            photo — keeps the grid even beside TemplateCard while making "mine"
            readable at a glance, without relying on the badge alone. */}
        <div className="aspect-[4/3] relative flex items-center justify-center bg-gradient-to-br from-brand-400/25 via-brand-300/10 to-transparent">
          <Wine className="h-10 w-10 text-brand-400/50" aria-hidden="true" />
          <span className="absolute top-2 right-2 inline-flex items-center rounded-full bg-foreground text-background px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider shadow-sm">
            Min
          </span>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between relative z-10 pointer-events-none">
            <div className="min-w-0 flex-1 pr-2">
              <h3 className="font-semibold truncate">{plan.title}</h3>
            </div>
            <div className="flex-shrink-0 pointer-events-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" disabled={busy} aria-label="Åtgärder">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={performDuplicate} disabled={duplicating}>
                    <Copy className="h-4 w-4 mr-2" />
                    Skapa kopia
                  </DropdownMenuItem>
                  {isArchived && (
                    <DropdownMenuItem onClick={() => setConfirmRestore(true)}>
                      Återställ
                    </DropdownMenuItem>
                  )}
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
        </div>
      </Card>
```

The `pointer-events-none` / `pointer-events-auto` pairing is load-bearing: the overlay
`<Link>` covers the whole card, and the dropdown trigger only stays clickable because its
wrapper re-enables pointer events. Do not "simplify" it away.

- [ ] **Step 3: Verify**

```bash
pnpm lint && npx tsc --noEmit 2>&1 | wc -l
```
Expected: lint 0 errors, `tsc` ≤ 75 lines.

Then `pnpm dev`, open `/mina-provningar/planer`, and confirm: cards show the gradient
header with a `MIN` badge; clicking the card opens the plan; the ⋮ menu still opens and
"Skapa kopia" still works.

- [ ] **Step 4: Commit**

```bash
git add src/components/tasting-plan/PlanCard.tsx
git commit -m "feat(ia): give PlanCard a 4:3 shell so it can share a grid with templates"
```

---

### Task 5: The merged Provningar surface

**Files:**
- Create: `src/components/tasting/ProvningarViewTabs.tsx`
- Create: `src/components/tasting/SkapaEgenButton.tsx`
- Modify: `src/app/(frontend)/(site)/provningsmallar/page.tsx` (full rewrite)
- Modify: `src/components/tasting-template/TagFilter.tsx`
- Delete: `src/app/(frontend)/(site)/mina-provningar/planer/page.tsx`

**Interfaces:**
- Consumes: `parseProvningarFilters`, `buildProvningarHref`, `viewIncludesPlans`,
  `viewIncludesTemplates`, `ProvningarFilterState`, `ProvningarView` (Task 3);
  `PlanCard` (Task 4); `TemplateCard`, `TagFilter`, `getUser`.
- Produces:
  - `<ProvningarViewTabs current={ProvningarFilterState} />`
  - `<SkapaEgenButton isAuthenticated={boolean} />`
  Task 6 relies on `?visa=mina` rendering the user's plans.

- [ ] **Step 1: Create the view control**

Create `src/components/tasting/ProvningarViewTabs.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { buildProvningarHref, type ProvningarFilterState, type ProvningarView } from '@/lib/provningar-view'
import { trackEvent } from '@/components/analytics'
import { cn } from '@/lib/utils'

const TABS: Array<{ view: ProvningarView; label: string }> = [
  { view: 'alla', label: 'Alla' },
  { view: 'mina', label: 'Mina' },
  { view: 'mallar', label: 'Från Vinakademin' },
]

export interface ProvningarViewTabsProps {
  current: ProvningarFilterState
}

export function ProvningarViewTabs({ current }: ProvningarViewTabsProps) {
  return (
    <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Visa">
      {TABS.map((tab) => {
        const isActive = current.view === tab.view
        return (
          <Link
            key={tab.view}
            href={buildProvningarHref(current, { view: tab.view })}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => trackEvent('provningar_view_changed', { view: tab.view })}
            className={cn(
              'inline-flex min-h-9 items-center rounded-full border px-4 text-sm font-medium transition-colors',
              isActive
                ? 'border-brand-400 bg-brand-400 text-white'
                : 'border-border bg-card hover:bg-muted/40',
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Create the create-CTA**

Create `src/components/tasting/SkapaEgenButton.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { trackEvent } from '@/components/analytics'

export interface SkapaEgenButtonProps {
  isAuthenticated: boolean
  className?: string
}

/**
 * The gallery's create affordance. Rendered for everyone — the whole point of
 * the 2026-07-27 IA work is that browsers of the template library could not
 * previously discover that they can build their own (154 people/month on the
 * gallery vs 10 reaching /skapa-provning).
 */
export function SkapaEgenButton({ isAuthenticated, className }: SkapaEgenButtonProps) {
  const href = isAuthenticated
    ? '/skapa-provning'
    : `/logga-in?from=${encodeURIComponent('/skapa-provning')}`

  return (
    <Button asChild className={className}>
      <Link
        href={href}
        onClick={() => trackEvent('provningar_create_clicked', { authenticated: isAuthenticated })}
      >
        <Plus className="h-4 w-4 mr-2" />
        Skapa egen
      </Link>
    </Button>
  )
}
```

- [ ] **Step 3: Make `TagFilter` build hrefs through the shared builder**

Replace `src/components/tasting-template/TagFilter.tsx` entirely:

```tsx
import Link from 'next/link'
import { buildProvningarHref, type ProvningarFilterState } from '@/lib/provningar-view'

export interface TagCount {
  label: string
  count: number
}

export interface TagFilterProps {
  tags: TagCount[]
  /** Full filter state — tag links must preserve the active view and access level. */
  current: ProvningarFilterState
}

export function TagFilter({ tags, current }: TagFilterProps) {
  const activeTag = current.tag
  const visibleTags = tags.filter((t) => t.count >= 2).slice(0, 12)
  const hiddenCount = tags.filter((t) => t.count >= 2).length - visibleTags.length
  if (visibleTags.length === 0 && !activeTag) return null
  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      {visibleTags.map((t) => {
        const isActive = activeTag === t.label
        return (
          <Link
            key={t.label}
            href={buildProvningarHref(current, { tag: isActive ? null : t.label })}
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              isActive
                ? 'bg-brand-400 text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {t.label}
            <span className="ml-1 opacity-70">({t.count})</span>
          </Link>
        )
      })}
      {hiddenCount > 0 && (
        <span className="text-xs text-muted-foreground">+ {hiddenCount} fler</span>
      )}
      {activeTag && (
        <Link
          href={buildProvningarHref(current, { tag: null })}
          className="inline-flex items-center rounded-full bg-destructive/10 text-destructive px-3 py-1 text-xs font-medium hover:bg-destructive/20"
        >
          Rensa
        </Link>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Rewrite the gallery page**

Replace `src/app/(frontend)/(site)/provningsmallar/page.tsx` entirely:

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { getPayload, type Where } from 'payload'
import config from '@/payload.config'
import { TemplateCard } from '@/components/tasting-template/TemplateCard'
import { TagFilter, type TagCount } from '@/components/tasting-template/TagFilter'
import { PlanCard } from '@/components/tasting-plan/PlanCard'
import { ProvningarViewTabs } from '@/components/tasting/ProvningarViewTabs'
import { SkapaEgenButton } from '@/components/tasting/SkapaEgenButton'
import { Button } from '@/components/ui/button'
import { Plus, Wine } from 'lucide-react'
import { getUser } from '@/lib/get-user'
import { cn } from '@/lib/utils'
import {
  buildProvningarHref,
  parseProvningarFilters,
  viewIncludesPlans,
  viewIncludesTemplates,
} from '@/lib/provningar-view'
import type { TastingPlan, TastingTemplate } from '@/payload-types'

export const metadata: Metadata = {
  title: 'Provningar — Vinakademin',
  description:
    'Färdiga provningsupplägg från Vinakademin — eller bygg din egen. Planera, bjud in vänner och håll provningen live.',
}

export const dynamic = 'force-dynamic'

export default async function ProvningarListing({
  searchParams,
}: {
  searchParams: Promise<{
    visa?: string
    tag?: string
    access?: string
    status?: string
    showArchived?: string
  }>
}) {
  const sp = await searchParams
  const filters = parseProvningarFilters(sp)

  const user = await getUser()
  const isAdmin = user?.role === 'admin'
  // Admin-only: ?status=draft flips the template list to utkast. Non-admins
  // always see published — the query is silently ignored for them.
  const showDrafts = isAdmin && filters.status === 'draft'

  const wantsPlans = viewIncludesPlans(filters.view)
  const wantsTemplates = viewIncludesTemplates(filters.view)

  const payload = await getPayload({ config })

  // --- Plans (only for a signed-in user, only when the view includes them) ---
  let plans: TastingPlan[] = []
  if (wantsPlans && user) {
    const planWhere: Where[] = [{ owner: { equals: user.id } }]
    if (!filters.showArchived) {
      planWhere.push({ status: { not_equals: 'archived' } })
    }
    const res = await payload.find({
      collection: 'tasting-plans',
      where: { and: planWhere },
      sort: '-updatedAt',
      limit: 100,
      depth: 0,
    })
    plans = res.docs as TastingPlan[]
  }

  // --- Templates ---
  let templates: TastingTemplate[] = []
  let tagCounts: TagCount[] = []
  let draftCount = 0
  if (wantsTemplates) {
    const whereAnd: any[] = [
      { publishedStatus: { equals: showDrafts ? 'draft' : 'published' } },
    ]
    if (filters.tag) whereAnd.push({ tags: { contains: filters.tag } })
    if (filters.access) whereAnd.push({ accessLevel: { equals: filters.access } })

    if (isAdmin) {
      const draftsRes = await payload.find({
        collection: 'tasting-templates',
        where: { publishedStatus: { equals: 'draft' } } as any,
        limit: 0,
        depth: 0,
      })
      draftCount = draftsRes.totalDocs
    }

    const { docs } = await payload.find({
      collection: 'tasting-templates',
      where: { and: whereAnd } as any,
      sort: '-publishedAt',
      limit: 60,
      depth: 1,
    })
    templates = docs as TastingTemplate[]

    // Tag-count union, queried separately so the chips don't vanish when a tag
    // is active.
    const allRes = await payload.find({
      collection: 'tasting-templates',
      where: { publishedStatus: { equals: 'published' } },
      limit: 200,
      depth: 0,
    })
    const tagMap = new Map<string, number>()
    for (const t of allRes.docs as TastingTemplate[]) {
      const arr = (t as any).tags as string[] | undefined
      if (!Array.isArray(arr)) continue
      for (const tag of arr) {
        const norm = String(tag).trim()
        if (!norm) continue
        tagMap.set(norm, (tagMap.get(norm) ?? 0) + 1)
      }
    }
    tagCounts = Array.from(tagMap.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
  }

  const accessPills: Array<{ key: string; label: string; href: string; active: boolean }> = [
    {
      key: 'all',
      label: 'Alla',
      href: buildProvningarHref(filters, { access: null }),
      active: filters.access == null,
    },
    {
      key: 'free',
      label: 'Fri',
      href: buildProvningarHref(filters, { access: 'free' }),
      active: filters.access === 'free',
    },
    {
      key: 'paid',
      label: 'Betald',
      href: buildProvningarHref(filters, { access: 'paid' }),
      active: filters.access === 'paid',
    },
  ]

  const isEmpty = plans.length === 0 && templates.length === 0

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-heading">{showDrafts ? 'Utkast' : 'Provningar'}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {showDrafts
              ? 'Mallar du har sparat som utkast. Bara du som admin ser dessa.'
              : 'Färdiga upplägg från Vinakademin — eller bygg din egen.'}
          </p>
        </div>
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          <SkapaEgenButton isAuthenticated={Boolean(user)} />
          {isAdmin && (
            <Button asChild size="sm" variant="outline">
              <Link href="/provningsmallar/ny">
                <Plus className="h-4 w-4 mr-1" />
                Skapa ny mall
              </Link>
            </Button>
          )}
        </div>
      </header>

      {/* Logged out, every item on the page is a template, so a "Mina" chip
          would filter to a guaranteed-empty result. The header CTA carries the
          message instead. */}
      {user && <ProvningarViewTabs current={filters} />}

      {wantsTemplates && (
        <div className="mb-4 flex flex-wrap gap-2">
          {accessPills.map((p) => (
            <Link
              key={p.key}
              href={p.href}
              className={cn(
                'inline-flex items-center rounded-full border px-3 py-1 text-xs transition-colors',
                p.active
                  ? 'border-brand-400 bg-brand-400 text-white'
                  : 'border-border bg-card hover:bg-muted/40',
              )}
            >
              {p.label}
            </Link>
          ))}
          {isAdmin && (
            <>
              <span aria-hidden className="mx-1 h-5 w-px self-center bg-border" />
              {showDrafts ? (
                <Link
                  href={buildProvningarHref(filters, { status: null })}
                  className="inline-flex items-center rounded-full border border-border bg-card hover:bg-muted/40 px-3 py-1 text-xs transition-colors"
                >
                  Visa publicerade
                </Link>
              ) : (
                <Link
                  href={buildProvningarHref(filters, { status: 'draft' })}
                  className="inline-flex items-center rounded-full border border-amber-400/60 bg-amber-100/40 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 px-3 py-1 text-xs transition-colors hover:bg-amber-100/70"
                >
                  Visa utkast ({draftCount})
                </Link>
              )}
            </>
          )}
        </div>
      )}

      {filters.view === 'mina' && user && (
        <div className="mb-4">
          <Link
            href={buildProvningarHref(filters, { showArchived: !filters.showArchived })}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {filters.showArchived ? '← Dölj arkiverade' : 'Visa arkiverade'}
          </Link>
        </div>
      )}

      {wantsTemplates && <TagFilter tags={tagCounts} current={filters} />}

      {/* An old /mina-provningar/planer bookmark 301s here before the auth
          gate, so a signed-out visitor can land on visa=mina directly. */}
      {filters.view === 'mina' && !user ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Wine className="h-12 w-12 mx-auto text-brand-400/60" />
          <h2 className="mt-4 font-heading text-xl">Logga in för att se dina provningar</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Dina egna provningar sparas på ditt konto.
          </p>
          <div className="mt-5">
            <Button asChild>
              <Link href={`/logga-in?from=${encodeURIComponent('/provningsmallar?visa=mina')}`}>
                Logga in
              </Link>
            </Button>
          </div>
        </div>
      ) : isEmpty && filters.view === 'mina' ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Wine className="h-12 w-12 mx-auto text-brand-400/60" />
          <h2 className="mt-4 font-heading text-xl">Inga provningar än</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            En provning är 3–6 viner du planerar att smaka tillsammans med vänner — från
            start till klart i en samlad plan.
          </p>
          <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
            <SkapaEgenButton isAuthenticated />
            <Button asChild variant="outline">
              <Link href={buildProvningarHref(filters, { view: 'mallar' })}>Utforska mallar</Link>
            </Button>
          </div>
        </div>
      ) : isEmpty ? (
        <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
          {filters.tag || filters.access
            ? 'Inga provningar matchar filtret.'
            : 'Inga provningar än — kom tillbaka snart.'}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {/* Plans first: the user's own drafts are the higher-intent, smaller
              set, and burying them under 60 templates defeats the change. */}
          {plans.map((plan) => (
            <PlanCard key={`plan-${plan.id}`} plan={plan} />
          ))}
          {templates.map((t) => (
            <TemplateCard
              key={`tpl-${t.id}`}
              template={t}
              href={showDrafts ? `/provningsmallar/redigera/${t.id}` : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Delete the superseded plans page**

```bash
git rm src/app/\(frontend\)/\(site\)/mina-provningar/planer/page.tsx
```

The URL is already a 301 (Task 2). Deleting the file removes the duplicate; leaving it
would shadow nothing (middleware runs first) but would rot.

- [ ] **Step 6: Verify**

```bash
pnpm test:ia && pnpm lint && npx tsc --noEmit 2>&1 | wc -l
```
Expected: tests PASS, lint 0 errors, `tsc` ≤ 75 lines.

Then `pnpm dev` and check by hand, signed in with at least one plan:
- `/provningsmallar` → header "Provningar", `Skapa egen` button, three chips, your plans first then templates
- `/provningsmallar?visa=mina` → only plans, "Visa arkiverade" link, no access pills, no tags
- `/provningsmallar?visa=mallar` → only templates, access pills + tags present
- with `visa=mallar` active, click `Fri` → URL keeps `visa=mallar` (**the regression guard**)
- signed out at `/provningsmallar` → no chips, `Skapa egen` routes to `/logga-in?from=%2Fskapa-provning`
- signed out at `/provningsmallar?visa=mina` → the "Logga in" empty state, not a crash

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(ia): merge plans and templates into one Provningar surface

Adds Alla/Mina/Från Vinakademin filtering and a create CTA visible to
everyone — previously creation was reachable only from the account menu."
```

---

### Task 6: Navigation

**Files:**
- Modify: `src/components/top-nav-header.tsx:33-38,154-159`
- Modify: `src/components/mobile-bottom-nav.tsx:184-189,213-219`

**Interfaces:**
- Consumes: the working `?visa=mina` view from Task 5.
- Produces: one primary nav entry, no account-menu duplicate.

- [ ] **Step 1: Relabel the primary nav item**

In `src/components/top-nav-header.tsx`, change `NAV_LINKS`:

```tsx
const NAV_LINKS = [
  { label: 'Vinkurser', href: '/vinkurser' },
  { label: 'Provningar', href: '/provningsmallar' },
  { label: 'Vinlistan', href: '/vinlistan' },
  { label: 'Artiklar', href: '/artiklar' },
]
```

- [ ] **Step 2: Remove the account-dropdown duplicate**

In the same file, delete the whole `DropdownMenuItem` block for "Mina provningar"
(lines ~154-159, the `<Link href="/mina-provningar/planer">` with the `ClipboardList`
icon). Keep "Historik". Then drop `ClipboardList` from the lucide import on line ~26 — it
becomes unused and `pnpm lint` will flag it.

- [ ] **Step 3: Do the same in the mobile drawer**

In `src/components/mobile-bottom-nav.tsx`:

Delete the `DrawerLink` for "Mina provningar" (lines ~184-189, `href="/mina-provningar/planer"`).
Remove `ClipboardList` from the lucide import (line ~13).

Relabel the Utforska entry (lines ~213-219):

```tsx
              <DrawerLink
                href="/provningsmallar"
                icon={BookOpen}
                label="Provningar"
                onClose={() => setOpen(false)}
                last
              />
```

- [ ] **Step 4: Verify**

```bash
pnpm lint && npx tsc --noEmit 2>&1 | wc -l
```
Expected: lint 0 errors (no unused-import warnings), `tsc` ≤ 75 lines.

Then `pnpm dev`: desktop nav shows "Provningar"; the account dropdown has Mina
recensioner / Mina vinklubbar / Historik and no tasting duplicate; the mobile drawer
matches. Visiting `/mina-provningar/planer` directly still 301s to
`/provningsmallar?visa=mina` and shows your plans.

- [ ] **Step 5: Commit**

```bash
git add src/components/top-nav-header.tsx src/components/mobile-bottom-nav.tsx
git commit -m "feat(ia): one primary nav entry for Provningar

Removes the account-menu duplicate now that creation and browsing share
a surface."
```

---

### Task 7: Breadcrumbs

**Files:**
- Create: `src/lib/breadcrumb-trail.ts`
- Test: `src/lib/breadcrumb-trail.test.ts`
- Modify: `src/components/breadcrumb-bar.tsx`
- Modify: `package.json` (extend `test:ia`)

**Interfaces:**
- Consumes: nothing at runtime.
- Produces: `buildBreadcrumbTrail(input: BuildTrailInput): BreadcrumbEntry[]`, plus the
  exported `TITLE_APIS` map the component still needs for its fetch effects.

- [ ] **Step 1: Write the failing test**

Create `src/lib/breadcrumb-trail.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildBreadcrumbTrail } from './breadcrumb-trail'

const labels = (pathname: string, extra = {}) =>
  buildBreadcrumbTrail({ pathname, ...extra }).map((c) => c.label)

test('the gallery is labelled Provningar', () => {
  assert.deepEqual(labels('/provningsmallar'), ['Hem', 'Provningar'])
})

// The reported defect: creating your own tasting used to breadcrumb under a
// different product entirely.
test('creating a tasting sits under Provningar', () => {
  assert.deepEqual(labels('/skapa-provning'), ['Hem', 'Provningar', 'Skapa egen'])
})

test('editing an existing draft drops the numeric id but keeps the parent', () => {
  assert.deepEqual(labels('/skapa-provning/42'), ['Hem', 'Provningar', 'Skapa egen'])
})

test('nothing under /mina-provningar says Vinkurser', () => {
  for (const p of ['/mina-provningar/historik', '/mina-provningar/planer/7']) {
    assert.ok(
      !labels(p).some((l) => l.includes('Vinkurser')),
      `${p} still breadcrumbs to Vinkurser`,
    )
  }
  assert.deepEqual(labels('/mina-provningar/historik'), ['Hem', 'Mina provningar', 'Historik'])
})

test('the moved courses page keeps its own name', () => {
  assert.deepEqual(labels('/mina-vinkurser'), ['Hem', 'Mina vinkurser'])
})

test('the last crumb is the current page', () => {
  const trail = buildBreadcrumbTrail({ pathname: '/skapa-provning' })
  assert.equal(trail[trail.length - 1].isCurrentPage, true)
  assert.equal(trail[0].isCurrentPage, false)
  // The injected parent is a link, not the current page.
  assert.equal(trail[1].isCurrentPage, false)
  assert.equal(trail[1].href, '/provningsmallar')
})

test('a course lesson still appends its resolved title', () => {
  assert.deepEqual(
    labels('/vinkurser/grunderna', {
      resolvedTitle: 'Grunderna i vin',
      itemKind: 'lesson',
      itemId: '9',
      resolvedItemTitle: 'Syra och sötma',
    }),
    ['Hem', 'Vinkurser', 'Grunderna i vin', 'Syra och sötma'],
  )
})

test('the homepage has no trail', () => {
  assert.deepEqual(buildBreadcrumbTrail({ pathname: '/' }), [])
})
```

- [ ] **Step 2: Extend the test script and run it to verify it fails**

In `package.json`, change `test:ia` to:

```json
"test:ia": "cross-env NODE_OPTIONS=--no-deprecation npx tsx --test src/lib/tasting-route-redirects.test.ts src/lib/provningar-view.test.ts src/lib/breadcrumb-trail.test.ts"
```

Run: `pnpm test:ia`
Expected: FAIL — cannot find module `./breadcrumb-trail`.

- [ ] **Step 3: Create the module**

Create `src/lib/breadcrumb-trail.ts`. Move `PAGE_LABELS`, `SUB_LABELS`, `TITLE_APIS`,
`formatSlug`, `isNumericId`, and the body of `generateBreadcrumbs` here verbatim, then
apply the four label changes and add `PARENT_SECTIONS`:

```ts
/**
 * Pure breadcrumb-trail builder, extracted from breadcrumb-bar.tsx so the
 * label rules are testable.
 *
 * Spec: docs/superpowers/specs/2026-07-27-tasting-information-architecture-design.md (D7)
 */
export interface BreadcrumbEntry {
  label: string
  href: string
  isCurrentPage: boolean
}

export interface BuildTrailInput {
  pathname: string
  /** Title resolved from a TITLE_APIS lookup for a section detail page. */
  resolvedTitle?: string | null
  /** Title resolved for the ?lesson= / ?quiz= param inside the course viewer. */
  resolvedItemTitle?: string | null
  itemKind?: 'lesson' | 'quiz' | null
  itemId?: string | null
}

/**
 * Display label for every first-level path segment. Covers both single-page
 * routes (e.g. `/skapa-provning`) and section roots (e.g. `/vinkurser`).
 * Anything not here falls through to `formatSlug()`.
 */
export const PAGE_LABELS: Record<string, string> = {
  // Section roots
  vinkurser: 'Vinkurser',
  vinprovningar: 'Vinkurser', // legacy URL — middleware 301s but cover the segment for in-flight requests
  kurser: 'Vinkurser',
  provningsmallar: 'Provningar',
  artiklar: 'Artiklar',
  vinlistan: 'Vinlistan',
  regioner: 'Regioner',
  lander: 'Länder',
  // Sections without a detail-title API
  'mina-provningar': 'Mina provningar',
  'mina-vinkurser': 'Mina vinkurser',
  'mina-recensioner': 'Mina recensioner',
  'mina-sidor': 'Mina sidor',
  profil: 'Profil',
  checkout: 'Kassa',
  // Standalone single-page routes
  'recensera-vin': 'Recensera vin',
  'skapa-provning': 'Skapa egen',
  vinkompassen: 'Vinkompassen',
  'grunderna-i-vin': 'Grunderna i vin',
  'om-oss': 'Om oss',
  kontakt: 'Kontakt',
  nyhetsbrev: 'Nyhetsbrev',
  hjalp: 'Hjälp',
  villkor: 'Villkor',
  integritetspolicy: 'Integritetspolicy',
  cookies: 'Cookies',
  sok: 'Sök',
  installningar: 'Inställningar',
  styleguide: 'Designsystem',
  delta: 'Delta',
  join: 'Anslut',
  internt: 'Internt',
  // Auth routes
  'logga-in': 'Logga in',
  registrera: 'Registrera',
  'glomt-losenord': 'Glömt lösenord',
  'aterstall-losenord': 'Återställ lösenord',
  'verifiera-epost': 'Verifiera e-post',
  'verifiera-epost-meddelande': 'Verifiera e-post',
  'aktivera-konto': 'Aktivera konto',
  onboarding: 'Onboarding',
}

/**
 * Root-level routes that belong under a section they are not nested in.
 * `/skapa-provning` is reached from the Provningar gallery, so its trail should
 * say so rather than dangling off Hem.
 */
export const PARENT_SECTIONS: Record<string, { label: string; href: string }> = {
  'skapa-provning': { label: 'Provningar', href: '/provningsmallar' },
}

export const SUB_LABELS: Record<string, Record<string, string>> = {
  provningsmallar: {
    ny: 'Skapa ny mall',
    redigera: 'Redigera mall',
  },
  'mina-provningar': {
    historik: 'Historik',
    planer: 'Planer',
  },
  artiklar: {
    kategori: 'Kategori',
    tagg: 'Tagg',
  },
  vinkompassen: {
    resultat: 'Resultat',
  },
  checkout: {
    success: 'Betalning genomförd',
  },
  'skapa-provning': {},
}

/** Which sections resolve a slug → title via API for the detail breadcrumb. */
export const TITLE_APIS: Record<string, string> = {
  vinkurser: '/api/vinkurser/title',
  vinprovningar: '/api/vinkurser/title', // legacy
  kurser: '/api/vinkurser/title',
  artiklar: '/api/blog-posts/title',
  vinlistan: '/api/wines/title',
  regioner: '/api/regions/title',
  lander: '/api/countries/title',
}

/** Friendly fallback: "skapa-provning" → "Skapa provning". */
function formatSlug(slug: string): string {
  const spaced = slug.replace(/-/g, ' ').trim()
  if (!spaced) return ''
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

/** Numeric id segment — hidden from the trail (e.g. /provningsmallar/redigera/123). */
function isNumericId(s: string): boolean {
  return /^\d+$/.test(s)
}

export function buildBreadcrumbTrail(input: BuildTrailInput): BreadcrumbEntry[] {
  const { pathname, resolvedTitle = null, resolvedItemTitle = null } = input
  const itemKind = input.itemKind ?? null
  const itemId = input.itemId ?? null

  if (pathname === '/') return []

  const pathSegments = pathname.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbEntry[] = [{ label: 'Hem', href: '/', isCurrentPage: false }]

  const parent = pathSegments[0] ? PARENT_SECTIONS[pathSegments[0]] : undefined
  if (parent) {
    breadcrumbs.push({ label: parent.label, href: parent.href, isCurrentPage: false })
  }

  let currentPath = ''
  for (let i = 0; i < pathSegments.length; i++) {
    const segment = pathSegments[i]
    currentPath += `/${segment}`

    if (i > 0 && isNumericId(segment)) continue

    const isLast = i === pathSegments.length - 1
    const section = pathSegments[0]

    let label: string
    if (i === 0) {
      label = PAGE_LABELS[segment] ?? formatSlug(segment)
    } else if (SUB_LABELS[section]?.[segment]) {
      label = SUB_LABELS[section][segment]
    } else if (i === 1 && section && TITLE_APIS[section]) {
      label = resolvedTitle ?? formatSlug(segment)
    } else {
      label = formatSlug(segment)
    }

    breadcrumbs.push({ label, href: currentPath, isCurrentPage: isLast && !itemKind })
  }

  // Append the active lesson / quiz inside the course viewer.
  if (
    itemKind &&
    itemId &&
    (pathSegments[0] === 'kurser' ||
      pathSegments[0] === 'vinkurser' ||
      pathSegments[0] === 'vinprovningar') &&
    pathSegments[1]
  ) {
    const fallback = itemKind === 'quiz' ? `Quiz ${itemId}` : `Moment ${itemId}`
    breadcrumbs.push({
      label: resolvedItemTitle ?? fallback,
      href: `${pathname}?${itemKind}=${itemId}`,
      isCurrentPage: true,
    })
    if (breadcrumbs.length > 2) {
      breadcrumbs[breadcrumbs.length - 2].isCurrentPage = false
    }
  }

  // Numeric segments were skipped, so the last surviving crumb may not have
  // been flagged in the loop.
  if (!itemKind && breadcrumbs.length > 1) {
    breadcrumbs[breadcrumbs.length - 1].isCurrentPage = true
  }

  return breadcrumbs
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test:ia`
Expected: PASS — 23 tests across three files, 0 failures.

- [ ] **Step 5: Make the component consume the module**

In `src/components/breadcrumb-bar.tsx`:

Delete the local `BreadcrumbEntry` interface, `PAGE_LABELS`, `SUB_LABELS`, `TITLE_APIS`,
`formatSlug`, `isNumericId`, and the whole `generateBreadcrumbs` function. Add the import:

```tsx
import { buildBreadcrumbTrail, TITLE_APIS } from '@/lib/breadcrumb-trail'
```

Replace the `const breadcrumbs = generateBreadcrumbs()` line (~286) with:

```tsx
  const breadcrumbs = buildBreadcrumbTrail({
    pathname,
    resolvedTitle,
    resolvedItemTitle,
    itemKind,
    itemId,
  })
```

Everything else — both `useEffect`s, the `isHomepage` early return, the JSX — stays as it
is. `TITLE_APIS` is still referenced inside the first effect, which is why the module
exports it.

- [ ] **Step 6: Verify**

```bash
pnpm test:ia && pnpm lint && npx tsc --noEmit 2>&1 | wc -l
```
Expected: tests PASS, lint 0 errors, `tsc` ≤ 75 lines.

Then `pnpm dev` and confirm in the browser:
- `/skapa-provning` → `Hem › Provningar › Skapa egen`, and "Provningar" links to the gallery
- `/mina-provningar/historik` → `Hem › Mina provningar › Historik`
- `/mina-vinkurser` → `Hem › Mina vinkurser`
- `/vinkurser/<slug>?lesson=<id>` → still resolves both titles

- [ ] **Step 7: Commit**

```bash
git add src/lib/breadcrumb-trail.ts src/lib/breadcrumb-trail.test.ts src/components/breadcrumb-bar.tsx package.json
git commit -m "fix(ia): breadcrumbs stop calling tastings Vinkurser

Extracts the trail builder so the label rules are tested, relabels
provningsmallar to Provningar, and gives /skapa-provning a parent crumb."
```

---

### Task 8: Full gate and staging deploy

**Files:** none modified — this task verifies and ships.

**Interfaces:**
- Consumes: everything above.
- Produces: the change live on staging for the user to test.

- [ ] **Step 1: Run every gate**

```bash
pnpm test:ia && \
pnpm test:session && \
npx tsx scripts/verify-session-draft-queue.ts && \
npx tsx scripts/verify-submission-status.ts && \
pnpm lint && \
npx tsc --noEmit 2>&1 | wc -l
```

Expected: all suites PASS (`test:session` 33 tests, draft-queue 37 assertions,
submission-status 17 assertions), lint 0 errors, `tsc` ≤ 75 lines.

- [ ] **Step 2: Build**

```bash
pnpm build
```

Expected: success. This is the real gate — if `tsc` reported *fewer* errors than the 75-line
baseline at any point above, suspect a parse error and check the build output, do not
celebrate.

- [ ] **Step 3: Confirm no migration was created**

```bash
git status --porcelain src/migrations/
```

Expected: empty. This plan changes no collection or enum; a migration file here means
something was done that the spec did not call for.

- [ ] **Step 4: Manual smoke pass against `pnpm dev`**

Walk the spec's success criteria (§6) in order. The four that matter most, because they
are the ones a prefix-match bug would break silently:

1. `/mina-provningar/planer/<id>?session=<id>` loads the live session as a signed-in participant.
2. The same URL loads for a guest holding only a `vk_participant_token` cookie (use a private window and a join link).
3. `/mina-provningar/historik/<sessionId>` loads for that same cookie-only guest.
4. `/mina-provningar/planer?showArchived=1` → `/provningsmallar?visa=mina&showArchived=1`, archived plans visible.

- [ ] **Step 5: Push to staging**

```bash
git push origin main
```

`main` is staging. Do **not** push to `production` — that branch takes a curated `release:`
commit applied separately, and only after the user has tested staging.

- [ ] **Step 6: Report**

Tell the user staging is updated and list the URLs to check:
`/provningsmallar`, `/provningsmallar?visa=mina`, `/skapa-provning`, `/mina-vinkurser`,
plus one live session started from an existing plan.

---

## Notes for the implementer

**Do not create a migration.** No collection or enum changes here.

**Do not touch `/mina-provningar/planer/[id]`.** It is the live tasting session URL, held
by guests via join links and QR codes, and carved out of the middleware auth gate at
`middleware.ts:122-127`.

**`pnpm build` outranks `tsc`.** A JSX parse error makes `tsc` bail early and report fewer
errors — a *drop* in the line count is a warning sign, not progress.

**Two client components, one server page.** `ProvningarViewTabs` and `SkapaEgenButton` are
`'use client'` only because `trackEvent` needs a click handler. The gallery page itself
stays a server component; do not add `'use client'` to it.
