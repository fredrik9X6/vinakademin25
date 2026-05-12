# Chunk A — Tasting Plans Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the data model that lets a member-authored tasting plan exist and be driven by a CourseSession, with custom-wine entry supported wherever a wine reference is used today. No member-facing UI in this chunk — admin can hand-author plans, downstream UI is rough but the system doesn't explode.

**Architecture:** New `TastingPlans` collection (private, owner-scoped). `UserWines.wine` and `Reviews.wine` become optional, with sibling `customWine` groups and a `beforeValidate` XOR enforcing exactly one side is set. `CourseSessions` becomes polymorphic over either a `course` (Vinprovningar) or a `tastingPlan`, with the same XOR pattern. A small `getWineDisplay` helper normalizes the optional/custom wine read path so existing consumers don't crash on null. Live session UI for plan-driven sessions ships in Chunk C — Chunk A only proves the data model holds.

**Tech Stack:** Next.js 15 App Router (React 19), Payload CMS 3.33 + Postgres. No new dependencies. One Postgres migration generated via `pnpm migrate:create`.

**Roadmap:** `/Users/fredrik/.claude/plans/let-s-plan-a-big-elegant-otter.md`

**Test discipline:** Project has no test suite (per CLAUDE.md). Manual verification per task; the smoke pass at the end exercises the polymorphic session creation path end-to-end via curl + Payload admin.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/collections/TastingPlans.ts` | create | New collection, owner-scoped access, fields: title, description, occasion, targetParticipants, wines (array), hostScript, status, derivedFromTemplate. |
| `src/collections/UserWines.ts` | modify | Make `wine` optional, add `customWine` group, add `beforeValidate` XOR hook. |
| `src/collections/Reviews.ts` | modify | Same shape: `wine` optional + `customWine` group + XOR. Update existing title-generation hook to fall back to `customWine.name`. |
| `src/collections/CourseSessions.ts` | modify | Add `tastingPlan` relationship (nullable). Relax `course` to optional. Add XOR `beforeValidate`. |
| `src/payload.config.ts` | modify | Register the new `TastingPlans` collection. |
| `src/lib/wines/get-wine-display.ts` | create | Pure helpers `getWineTitle(ref)`, `getWineSlug(ref)`, `getWineImage(ref)` that read a `Wines` relation OR a `customWine` snapshot. |
| `src/components/profile/UserReviewsPanel.tsx` | modify | Use `getWineTitle` + null-safe wine access. |
| `src/app/(frontend)/(site)/vinlistan/page.tsx` | modify | Same null-safety pass on reviews→wine. |
| `src/app/api/reviews/compare/route.ts` | modify | Null-safe wine access (line 57–59 typeof-null bug). |
| `src/app/api/sessions/create/route.ts` | modify | Accept `tastingPlanId` (alternative to `courseId`), XOR-validate, branch the verification check. |
| `src/migrations/<ts>_chunk_a_tasting_plans_foundation.ts` | create (via `pnpm migrate:create`) | One additive migration: create `tasting_plans` + supporting tables; nullable `tasting_plan_id` on `course_sessions`; make `wine_id` nullable on `user_wines` and `reviews`; add `custom_wine_*` columns on both. |
| `src/migrations/index.ts` | modify (auto) | Register migration. |
| `src/payload-types.ts` | modify (auto) | Regenerate. |

---

### Task 1: Schema — collections + migration + types

**Files:**
- Create: `src/collections/TastingPlans.ts`
- Modify: `src/collections/UserWines.ts`
- Modify: `src/collections/Reviews.ts`
- Modify: `src/collections/CourseSessions.ts`
- Modify: `src/payload.config.ts`
- Create: `src/migrations/<timestamp>_chunk_a_tasting_plans_foundation.ts` (auto)
- Modify: `src/migrations/index.ts` (auto)
- Modify: `src/payload-types.ts` (auto)

This is a big single task because the four schema changes are tightly coupled (the XOR validators on UserWines/Reviews depend on the `customWine` group existing; the migration is one atomic DDL change). Bundling avoids three partial-schema commits and three migrations.

- [ ] **Step 1: Create `src/collections/TastingPlans.ts`**

```ts
import type { CollectionConfig } from 'payload'

export const TastingPlans: CollectionConfig = {
  slug: 'tasting-plans',
  labels: { singular: 'Tasting plan', plural: 'Tasting plans' },
  admin: {
    group: 'Wine Tastings',
    useAsTitle: 'title',
    defaultColumns: ['title', 'owner', 'status', 'updatedAt'],
    description: 'Member-authored tasting plans. Private to the owner.',
  },
  access: {
    // Owner-scoped: a member only sees / edits / deletes their own plans.
    // Admin sees all. Mirrors the access pattern in src/collections/UserWineLists.ts.
    read: ({ req }) => {
      if (!req.user) return false
      if (req.user.role === 'admin') return true
      return { owner: { equals: req.user.id } }
    },
    create: ({ req }) => !!req.user,
    update: ({ req }) => {
      if (!req.user) return false
      if (req.user.role === 'admin') return true
      return { owner: { equals: req.user.id } }
    },
    delete: ({ req }) => {
      if (!req.user) return false
      if (req.user.role === 'admin') return true
      return { owner: { equals: req.user.id } }
    },
  },
  fields: [
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      admin: { description: 'The member who created this plan.' },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      maxLength: 100,
    },
    {
      name: 'description',
      type: 'textarea',
      maxLength: 500,
    },
    {
      name: 'occasion',
      type: 'text',
      admin: { description: 'e.g. "Födelsedagsmiddag", "Sommarrosé-flight"' },
    },
    {
      name: 'targetParticipants',
      type: 'number',
      defaultValue: 4,
      min: 1,
      max: 50,
    },
    {
      name: 'wines',
      type: 'array',
      labels: { singular: 'Vin', plural: 'Viner' },
      fields: [
        {
          name: 'libraryWine',
          type: 'relationship',
          relationTo: 'wines',
          hasMany: false,
          admin: { description: 'Pick from our library, OR fill out customWine below.' },
        },
        {
          name: 'customWine',
          type: 'group',
          admin: { description: 'Use when the wine is not in the library.' },
          fields: [
            { name: 'name', type: 'text' },
            { name: 'producer', type: 'text' },
            { name: 'vintage', type: 'text' },
            {
              name: 'type',
              type: 'select',
              options: [
                { label: 'Rött', value: 'red' },
                { label: 'Vitt', value: 'white' },
                { label: 'Rosé', value: 'rose' },
                { label: 'Mousserande', value: 'sparkling' },
                { label: 'Dessert', value: 'dessert' },
                { label: 'Fortifierat', value: 'fortified' },
                { label: 'Annat', value: 'other' },
              ],
            },
            { name: 'systembolagetUrl', type: 'text' },
            { name: 'priceSek', type: 'number', min: 0 },
          ],
        },
        { name: 'pourOrder', type: 'number', min: 1 },
        { name: 'hostNotes', type: 'textarea' },
      ],
      validate: (value: unknown) => {
        if (!Array.isArray(value)) return true
        for (let i = 0; i < value.length; i++) {
          const w = value[i] as { libraryWine?: unknown; customWine?: { name?: string } }
          const hasLibrary = w?.libraryWine != null && w.libraryWine !== ''
          const hasCustom = !!w?.customWine?.name && w.customWine.name.trim() !== ''
          if (hasLibrary && hasCustom) {
            return `Vin ${i + 1}: välj antingen ett bibliotekvin ELLER fyll i custom wine — inte båda.`
          }
          if (!hasLibrary && !hasCustom) {
            return `Vin ${i + 1}: välj ett bibliotekvin eller fyll i namn på custom wine.`
          }
        }
        return true
      },
    },
    {
      name: 'hostScript',
      type: 'textarea',
      admin: { description: 'Optional flavor text for the host cheat sheet (Chunk C).' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Utkast', value: 'draft' },
        { label: 'Klar', value: 'ready' },
        { label: 'Arkiverad', value: 'archived' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'derivedFromTemplate',
      type: 'relationship',
      relationTo: 'tasting-plans', // self-ref placeholder; replaced by TastingTemplates in Chunk E
      hasMany: false,
      admin: {
        description: 'Set by the clone-template API in Chunk E. Null for now.',
        position: 'sidebar',
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, req, operation }) => {
        // Auto-set owner on create from the authed user, unless admin is explicitly setting it.
        if (operation === 'create' && req.user && !data.owner) {
          return { ...data, owner: req.user.id }
        }
        return data
      },
    ],
  },
  timestamps: true,
}
```

Note: `derivedFromTemplate` self-references `tasting-plans` for now as a placeholder; Chunk E creates the `tasting-templates` collection and we'll change `relationTo` there. Self-ref is harmless because we'll never populate it in Chunk A.

- [ ] **Step 2: Modify `src/collections/UserWines.ts`**

Find the `wine` field (around line 115):

```ts
    {
      name: 'wine',
      type: 'relationship',
      relationTo: 'wines',
      required: true,
      hasMany: false,
      admin: {
        description: 'Wine in the collection',
      },
    },
```

Replace with:

```ts
    {
      name: 'wine',
      type: 'relationship',
      relationTo: 'wines',
      required: false,
      hasMany: false,
      admin: {
        description: 'Library wine, OR leave empty and fill customWine below.',
      },
    },
    {
      name: 'customWine',
      type: 'group',
      admin: {
        description:
          'Use when the wine is not in our library. Exactly one of `wine` or `customWine.name` must be set (validated below).',
      },
      fields: [
        { name: 'name', type: 'text' },
        { name: 'producer', type: 'text' },
        { name: 'vintage', type: 'text' },
        { name: 'type', type: 'text', admin: { description: 'e.g. rött, vitt, rosé, mousserande' } },
        { name: 'systembolagetUrl', type: 'text' },
        { name: 'priceSek', type: 'number', min: 0 },
      ],
    },
```

In the same file, add a `beforeValidate` hook in the `hooks` block (create the block if it doesn't exist; otherwise merge into the existing one):

```ts
  hooks: {
    beforeValidate: [
      ({ data }) => {
        const hasLibrary = data?.wine != null && data.wine !== ''
        const hasCustom = !!data?.customWine?.name && data.customWine.name.trim() !== ''
        if (hasLibrary && hasCustom) {
          throw new Error(
            'UserWines: välj antingen ett bibliotekvin eller fyll i customWine — inte båda.',
          )
        }
        if (!hasLibrary && !hasCustom) {
          throw new Error(
            'UserWines: ange ett bibliotekvin eller fyll i namn på customWine.',
          )
        }
        return data
      },
    ],
    // ... existing hooks if any ...
  },
```

- [ ] **Step 3: Modify `src/collections/Reviews.ts`**

Find the `wine` field (around line 267):

```ts
    {
      name: 'wine',
      type: 'relationship',
      relationTo: 'wines',
      // ... rest ...
    },
```

Change `required: true` (if present) to `required: false`, and update its admin description. Immediately after the `wine` field, add a `customWine` group with the same shape as the one in UserWines (Step 2). Then add the same XOR validator in `hooks.beforeValidate`.

Also update the existing title-generation hook (search the file for the title hook — look for `title` or `data.title` assignment in `beforeChange`). Where it currently reads from `data.wine` or the populated wine doc, fall back to `data.customWine?.name` when the wine ref is missing. Example transformation (adapt to whatever the existing hook actually does):

```ts
// Before:
data.title = `${wineTitle} review`
// After:
const titleSource = wineTitle ?? data.customWine?.name ?? 'Wine review'
data.title = `${titleSource} review`
```

If the title hook reads the populated wine doc via a `payload.findByID`, leave that branch and ADD the customWine fallback for when the wine ref is null.

- [ ] **Step 4: Modify `src/collections/CourseSessions.ts`**

Find the `course` field (line 40):

```ts
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'vinprovningar',
      // ... required: true? ...
    },
```

Change `required: true` to `required: false`. Update admin description: `'A course OR a tastingPlan must be set (XOR).'`

Immediately after the `course` field, add a sibling `tastingPlan` relationship:

```ts
    {
      name: 'tastingPlan',
      type: 'relationship',
      relationTo: 'tasting-plans',
      hasMany: false,
      admin: {
        description: 'Set when this session is driven by a member-authored plan. XOR with course.',
      },
    },
```

In the existing `hooks` block (the `beforeChange` from Chunk 2 lives here), ADD a `beforeValidate` array at the top of the hooks object (don't disturb the existing `beforeChange`):

```ts
  hooks: {
    beforeValidate: [
      ({ data }) => {
        const hasCourse = data?.course != null && data.course !== ''
        const hasPlan = data?.tastingPlan != null && data.tastingPlan !== ''
        if (hasCourse && hasPlan) {
          throw new Error(
            'CourseSessions: a session can be driven by EITHER a course or a tastingPlan, not both.',
          )
        }
        if (!hasCourse && !hasPlan) {
          throw new Error(
            'CourseSessions: a session must have either a course or a tastingPlan set.',
          )
        }
        return data
      },
    ],
    beforeChange: [
      // ... existing beforeChange hook from Chunk 2 ...
    ],
  },
```

- [ ] **Step 5: Register the new collection in `src/payload.config.ts`**

Open `src/payload.config.ts`. Find the `collections` array (it lists `Vinprovningar`, `Modules`, `ContentItems`, `Users`, etc.). Add `TastingPlans` to the imports at top and to the array. Group it near the other tasting-related collections.

```ts
// Imports
import { TastingPlans } from './collections/TastingPlans'

// Inside buildConfig({ ... }):
collections: [
  // ... existing ...
  TastingPlans,
  // ... existing ...
],
```

- [ ] **Step 6: Generate the migration**

```bash
pnpm migrate:create -- chunk-a-tasting-plans-foundation
```

Expected: a new file at `src/migrations/<timestamp>_chunk_a_tasting_plans_foundation.ts` is generated, plus an updated `src/migrations/index.ts`. Read the generated migration and verify the `up()` block contains:
- `CREATE TABLE "tasting_plans" (...)` with columns for owner, title, description, occasion, target_participants, host_script, status, derived_from_template_id, created_at, updated_at.
- `CREATE TABLE "tasting_plans_wines" (...)` (array support table) with columns for the wine array fields.
- `ALTER TABLE "course_sessions" ADD COLUMN "tasting_plan_id" integer` + FK constraint to `tasting_plans(id)`.
- `ALTER TABLE "course_sessions" ALTER COLUMN "course_id" DROP NOT NULL` (relaxing required→optional).
- `ALTER TABLE "user_wines" ALTER COLUMN "wine_id" DROP NOT NULL`.
- `ALTER TABLE "reviews" ALTER COLUMN "wine_id" DROP NOT NULL`.
- `ALTER TABLE "user_wines" ADD COLUMN "custom_wine_name" varchar`, plus the other customWine fields.
- `ALTER TABLE "reviews" ADD COLUMN "custom_wine_name" varchar`, plus the other customWine fields.

If the generated DDL is missing any of these, STOP and report — do not hand-edit migrations.

- [ ] **Step 7: Regenerate Payload types**

```bash
pnpm generate:types
```

Verify with:
```bash
grep -nE "interface TastingPlan|interface UserWine|interface Review|interface CourseSession" src/payload-types.ts | head
grep -nE "customWine|tastingPlan" src/payload-types.ts | head -10
```

Expected: `TastingPlan` interface exists. `UserWine.customWine` exists. `Review.customWine` exists. `CourseSession.tastingPlan` exists. `wine` fields on UserWine and Review are typed as optional (`?`).

- [ ] **Step 8: TypeScript clean (collections-only check)**

```bash
pnpm exec tsc --noEmit -p tsconfig.json 2>&1 | grep -E "(collections/TastingPlans|collections/UserWines|collections/Reviews|collections/CourseSessions|payload.config)" | head
```

Expected: no output. NEW errors elsewhere (in `.wine` consumers) are expected — those get fixed in Task 3. Pre-existing errors in unrelated files are fine.

- [ ] **Step 9: Apply migration locally**

```bash
pnpm migrate
```

Expected: `Migrated: <timestamp>_chunk_a_tasting_plans_foundation (...ms)`. The Neon DB is shared with prod — these are additive columns + relaxing-required-to-nullable, all safe.

Verify with read-only psql:
```bash
PGPASSWORD=npg_Eb7p4jxYzmrF psql "postgresql://neondb_owner@ep-super-poetry-a2z7zldz-pooler.eu-central-1.aws.neon.tech/vinakademin?sslmode=require&channel_binding=require" -c "\d tasting_plans" 2>&1 | tail -5
PGPASSWORD=npg_Eb7p4jxYzmrF psql "postgresql://neondb_owner@ep-super-poetry-a2z7zldz-pooler.eu-central-1.aws.neon.tech/vinakademin?sslmode=require&channel_binding=require" -c "\d course_sessions" 2>&1 | grep tasting_plan
```

Expected: `tasting_plans` table exists; `course_sessions.tasting_plan_id` column exists.

- [ ] **Step 10: Commit**

```bash
git add src/collections/TastingPlans.ts src/collections/UserWines.ts src/collections/Reviews.ts src/collections/CourseSessions.ts src/payload.config.ts src/migrations src/payload-types.ts
git commit -m "$(cat <<'EOF'
otter: schema foundation for member-authored tasting plans

Adds the new TastingPlans collection (private, owner-scoped) and makes
the wine relationship optional on UserWines + Reviews with sibling
customWine groups for entries not in our library. CourseSessions
becomes polymorphic over course OR tastingPlan via a beforeValidate
XOR. One migration covers all four collection changes. All additive
or required→nullable, prod-safe.

No member-facing UI yet; admin can hand-author plans in /admin to
unblock downstream chunks. Downstream consumer audit comes in
follow-up tasks.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Wine-display helper

**Files:**
- Create: `src/lib/wines/get-wine-display.ts`

A tiny pure-function module that every downstream consumer can import to read a wine reference safely. Handles the new optional + customWine shape.

- [ ] **Step 1: Create the helper file**

```ts
import type { Wine } from '@/payload-types'

/**
 * A wine reference that may be either:
 *   - a populated `Wines` document (depth ≥ 1),
 *   - a numeric `wines` id (depth = 0),
 *   - null/undefined when the parent has a `customWine` snapshot instead.
 */
export type WineRef = Wine | number | null | undefined

/**
 * A custom-wine snapshot stored on UserWines/Reviews/TastingPlans-wines when
 * the wine isn't in the library. All fields are independently optional.
 */
export interface CustomWine {
  name?: string | null
  producer?: string | null
  vintage?: string | null
  type?: string | null
  systembolagetUrl?: string | null
  priceSek?: number | null
}

/** Narrow a WineRef to a populated Wine, or null. */
export function getWineDoc(ref: WineRef): Wine | null {
  if (ref && typeof ref === 'object') return ref
  return null
}

/**
 * Display title for a wine, falling back to the customWine snapshot when
 * the library wine isn't set. Returns a non-empty string or null.
 */
export function getWineTitle(
  ref: WineRef,
  custom?: CustomWine | null,
): string | null {
  const doc = getWineDoc(ref)
  if (doc?.name) return doc.name
  const customName = custom?.name?.trim()
  if (customName) return customName
  return null
}

/** Slug for routing to a wine detail page. Null when the wine is custom. */
export function getWineSlug(ref: WineRef): string | null {
  const doc = getWineDoc(ref)
  return doc?.slug ?? null
}

/**
 * Systembolaget URL — prefers the library wine's URL, falls back to the
 * customWine snapshot. Null when neither is set.
 */
export function getWineSystembolagetUrl(
  ref: WineRef,
  custom?: CustomWine | null,
): string | null {
  const doc = getWineDoc(ref)
  if (doc?.systembolagetUrl) return doc.systembolagetUrl
  const customUrl = custom?.systembolagetUrl?.trim()
  if (customUrl) return customUrl
  return null
}

/** Producer / winery — prefers library winery, falls back to customWine.producer. */
export function getWineProducer(
  ref: WineRef,
  custom?: CustomWine | null,
): string | null {
  const doc = getWineDoc(ref)
  if (doc?.winery) return doc.winery
  const customProducer = custom?.producer?.trim()
  if (customProducer) return customProducer
  return null
}
```

- [ ] **Step 2: TypeScript clean**

```bash
pnpm exec tsc --noEmit -p tsconfig.json 2>&1 | grep -E "lib/wines/get-wine-display" | head
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/lib/wines/get-wine-display.ts
git commit -m "$(cat <<'EOF'
otter: wine-display helper for optional + custom-wine reads

Five pure functions — getWineDoc, getWineTitle, getWineSlug,
getWineSystembolagetUrl, getWineProducer — that take a possibly-null
WineRef and an optional customWine snapshot and return the right
display value. Single import everywhere downstream so consumers stop
hand-rolling null checks against the typeof-null-is-object footgun.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Audit pass — update `.wine` consumers

**Files:**
- Modify: `src/components/profile/UserReviewsPanel.tsx`
- Modify: `src/app/(frontend)/(site)/vinlistan/page.tsx`
- Modify: `src/app/api/reviews/compare/route.ts`

After Task 1, `wine` on Reviews and UserWines is typed as `Wine | number | null | undefined`. The existing `typeof review.wine === 'object'` checks fail subtly because `typeof null === 'object'` — those expressions evaluate to `null` (correct intent) but then downstream `.title`/`.id` accesses crash on real null. Replace each with `getWineDoc()` from Task 2.

- [ ] **Step 1: Update `src/components/profile/UserReviewsPanel.tsx`**

Add the import at the top of the file (alongside other `@/lib` imports):

```ts
import { getWineDoc, getWineTitle } from '@/lib/wines/get-wine-display'
```

Then find these three patterns (lines 40, 86, 173 approximately):

```ts
const wine = typeof review.wine === 'object' ? review.wine : null
```

Replace each with:

```ts
const wine = getWineDoc(review.wine)
```

Find line ~248:

```ts
key={String((typeof r.wine === 'object' && r.wine?.id) || r.id)}
```

Replace with:

```ts
key={String(getWineDoc(r.wine)?.id ?? r.id)}
```

If anywhere in this file the code renders `wine.title` (or similar) without an optional chain, replace with `getWineTitle(r.wine, r.customWine)` and check the resulting display. Wrap-up note: `r.customWine` is the new field added in Task 1; TS should know about it after `pnpm generate:types`.

- [ ] **Step 2: Update `src/app/(frontend)/(site)/vinlistan/page.tsx`**

Add the import:

```ts
import { getWineDoc } from '@/lib/wines/get-wine-display'
```

Find lines 81, 100, 116, 169, 170 (matching `typeof review?.wine === 'object'` / `item.wine` patterns). For each:

```ts
// Before:
const wine = typeof review?.wine === 'object' ? review.wine : null
// After:
const wine = getWineDoc(review?.wine)
```

For the `wa = a.wine` / `wb = b.wine` sort comparator at lines 169–170:

```ts
// Before:
const wa = a.wine || null
const wb = b.wine || null
// After:
const wa = getWineDoc(a.wine)
const wb = getWineDoc(b.wine)
```

For the key prop at line 234 (`key={String(item.wine?.id || item.id)}`): replace with `key={String(getWineDoc(item.wine)?.id ?? item.id)}`.

- [ ] **Step 3: Update `src/app/api/reviews/compare/route.ts`**

Add the import:

```ts
import { getWineDoc } from '@/lib/wines/get-wine-display'
```

Find lines 57–59:

```ts
if (answerKeyReview?.wine) {
  wineId =
    typeof answerKeyReview.wine === 'object' ? answerKeyReview.wine.id : answerKeyReview.wine
```

Replace with:

```ts
if (answerKeyReview?.wine) {
  const doc = getWineDoc(answerKeyReview.wine)
  wineId = doc?.id ?? (typeof answerKeyReview.wine === 'number' ? answerKeyReview.wine : null)
```

This handles all three cases: populated doc, raw number id, or null.

- [ ] **Step 4: TypeScript clean (full)**

```bash
pnpm exec tsc --noEmit -p tsconfig.json 2>&1 | grep -E "(UserReviewsPanel|vinlistan/page|reviews/compare|wine|Wine)" | head -20
```

Expected: no NEW errors. Pre-existing errors in unrelated files (e.g. `ProfileDetailsForm.tsx` from prior chunks) are fine.

If a NEW error appears claiming `review.wine` is `null | undefined | Wine | number`, that's the expected widening — verify the consumer at that line uses `getWineDoc()` or an explicit null-safe access.

- [ ] **Step 5: Commit**

```bash
git add src/components/profile/UserReviewsPanel.tsx 'src/app/(frontend)/(site)/vinlistan/page.tsx' src/app/api/reviews/compare/route.ts
git commit -m "$(cat <<'EOF'
otter: null-safe wine reads via getWineDoc helper

After relaxing review.wine and user_wines.wine to optional in Task 1,
the existing typeof-object guards leak null through (typeof null is
'object'). Replace those guards with getWineDoc() in
UserReviewsPanel, vinlistan/page, and the reviews/compare route.
Same behavior on the happy path; safe when wine is null and the
caller should fall back to customWine.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Wire `/api/sessions/create` to accept `tastingPlanId`

**Files:**
- Modify: `src/app/api/sessions/create/route.ts`

The route currently requires `courseId`. After Task 1, sessions are polymorphic over course OR tastingPlan. Add the alternative path.

- [ ] **Step 1: Replace the body-parsing + verification block**

Open `src/app/api/sessions/create/route.ts`. Find the current block (around lines 52–67):

```ts
    const body = await request.json()
    const { courseId, sessionName, maxParticipants = 50 } = body

    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
    }

    // Verify course exists
    const course = await payload.findByID({
      collection: 'vinprovningar',
      id: courseId,
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }
```

Replace with:

```ts
    const body = await request.json()
    const { courseId, tastingPlanId, sessionName, maxParticipants = 50 } = body

    // XOR: exactly one of courseId or tastingPlanId is required.
    if (!courseId && !tastingPlanId) {
      return NextResponse.json(
        { error: 'Either courseId or tastingPlanId is required' },
        { status: 400 },
      )
    }
    if (courseId && tastingPlanId) {
      return NextResponse.json(
        { error: 'Provide exactly one of courseId or tastingPlanId, not both' },
        { status: 400 },
      )
    }

    // Verify the referenced source exists (and, for plans, that the caller owns it).
    if (courseId) {
      const course = await payload.findByID({
        collection: 'vinprovningar',
        id: courseId,
      })
      if (!course) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 })
      }
    } else {
      const plan = await payload.findByID({
        collection: 'tasting-plans',
        id: tastingPlanId,
        overrideAccess: true, // we do the owner check explicitly below
      })
      if (!plan) {
        return NextResponse.json({ error: 'Tasting plan not found' }, { status: 404 })
      }
      const planOwnerId =
        typeof plan.owner === 'object' ? plan.owner?.id : plan.owner
      const isAdmin = user.role === 'admin'
      if (!isAdmin && planOwnerId !== user.id) {
        return NextResponse.json(
          { error: 'You can only start a session from your own tasting plan' },
          { status: 403 },
        )
      }
    }
```

Then find the `payload.create({ collection: 'course-sessions', ... })` call (around line 103). Change its `data` so the foreign key matches whichever id was provided:

```ts
    const session = await payload.create({
      collection: 'course-sessions',
      data: {
        course: courseId ?? undefined,
        tastingPlan: tastingPlanId ?? undefined,
        host: user.id,
        joinCode,
        sessionName: sessionName || `${hostName}'s Session`,
        status: 'active',
        currentActivity: 'waiting',
        participantCount: 0,
        maxParticipants,
        expiresAt: expiresAt.toISOString(),
      },
    })
```

- [ ] **Step 2: TypeScript clean**

```bash
pnpm exec tsc --noEmit -p tsconfig.json 2>&1 | grep -E "sessions/create/route" | head
```

Expected: no output.

- [ ] **Step 3: Smoke-test both paths via curl**

Start the dev server if not running:
```bash
lsof -nP -i tcp:3000 | head -3 || (pnpm dev > /tmp/dev.log 2>&1 &)
until curl -s --max-time 3 http://localhost:3000/api/users/me >/dev/null 2>&1; do sleep 2; done; echo ready
```

Smoke tests (without auth — verifies the input validation gates):

```bash
# Neither id provided → 400
curl -s -X POST -H "Content-Type: application/json" -d '{}' http://localhost:3000/api/sessions/create -w "\nHTTP %{http_code}\n"
# Expected: HTTP 401 (auth fires first, that's fine)

# Both ids provided (auth still wins, but documents the contract)
# Use a real admin cookie if you have one in your browser session, otherwise
# the auth-gate firing first is acceptable for this task; Task 5 covers the
# full E2E with a real admin login.
```

The full both-paths verification — including creating an actual TastingPlan in Payload admin and POSTing `tastingPlanId` — happens in Task 5 (E2E pass). For Task 4 we only need the input-validation lines to be present and TS-clean.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/sessions/create/route.ts
git commit -m "$(cat <<'EOF'
otter: /api/sessions/create accepts tastingPlanId (polymorphic)

XOR body validation between courseId and tastingPlanId. For plan-
driven sessions, verifies the caller owns the plan (admin override
ok). Writes either course or tastingPlan onto the new session row;
the collection's XOR beforeValidate hook is the defense-in-depth
second gate.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: End-to-end verification + push

**Files:** none modified.

- [ ] **Step 1: Lint clean**

```bash
pnpm lint 2>&1 | tail -3
```

Expected: `✔ No ESLint warnings or errors`.

- [ ] **Step 2: TypeScript clean for everything we touched**

```bash
pnpm exec tsc --noEmit -p tsconfig.json 2>&1 | grep -E "(TastingPlans|UserWines|Reviews|CourseSessions|UserReviewsPanel|vinlistan/page|reviews/compare|sessions/create|get-wine-display|payload.config|payload-types)" | head
```

Expected: no NEW errors.

- [ ] **Step 3: Admin smoke test — create a plan, start a plan-driven session**

Start dev server (skip if running). Open `http://localhost:3000/admin` and log in as an admin user.

1. In the admin sidebar under "Wine Tastings", click **Tasting plans** → New.
2. Fill: owner = your admin user, title = "Smoke test rosé flight", status = ready, add 2 wines (one library reference + one custom: e.g. name "Provence Rosé 2024", producer "Test Domaine", type rose).
3. Save. Verify no validation errors.

Then start a plan-driven session via curl (you'll need the admin's Payload cookie — copy from DevTools):

```bash
# Replace COOKIE with your actual payload-token cookie value
TASTING_PLAN_ID=<the plan id from step 2 above>
COOKIE='payload-token=<your-jwt>'
curl -s -X POST -H "Content-Type: application/json" -H "Cookie: $COOKIE" \
  -d "{\"tastingPlanId\": $TASTING_PLAN_ID, \"sessionName\": \"Smoke test\"}" \
  http://localhost:3000/api/sessions/create
```

Expected: `201` with `{ success: true, session: { id, joinCode, ... } }`. Note the join code.

Verify the session row has `course = null` and `tastingPlan = <id>`:
```bash
PGPASSWORD=npg_Eb7p4jxYzmrF psql "postgresql://neondb_owner@ep-super-poetry-a2z7zldz-pooler.eu-central-1.aws.neon.tech/vinakademin?sslmode=require&channel_binding=require" -c "SELECT id, join_code, course_id, tasting_plan_id, status FROM course_sessions ORDER BY created_at DESC LIMIT 1;"
```

Expected: course_id NULL, tasting_plan_id populated.

- [ ] **Step 4: SSE stream sanity check**

With the host's payload-token cookie:

```bash
SESSION_ID=<the session id from step 3>
curl -N --max-time 6 -H "Cookie: $COOKIE" \
  http://localhost:3000/api/sessions/$SESSION_ID/stream
```

Expected: an immediate `event: lesson\ndata: {"currentLessonId":null}\n\n` frame (currentLesson is null for plan-driven sessions until Chunk C wires the wine pointer), followed by a `roster` event with the host entry. After 6s curl times out — normal.

Critically: the response should NOT 500 and the events should be valid JSON with the expected shape. This proves the existing SSE handler tolerates `session.course = null`.

- [ ] **Step 5: Verify XOR enforcement**

Try to create a session with both ids:

```bash
curl -s -X POST -H "Content-Type: application/json" -H "Cookie: $COOKIE" \
  -d '{"courseId": 1, "tastingPlanId": 1}' \
  http://localhost:3000/api/sessions/create
```

Expected: `HTTP 400` with the XOR error message.

Try in the Payload admin: create a CourseSession manually with BOTH `course` and `tastingPlan` set. Save. Expected: validation error from the `beforeValidate` hook.

Try with NEITHER set in admin. Expected: validation error.

- [ ] **Step 6: Verify a Review with custom-wine**

In Payload admin → Reviews → New. Leave `wine` empty, fill `customWine.name = "Provence Rosé 2024"`, set rating = 4. Save. Verify the title hook generates a reasonable title using the custom name.

Try saving with BOTH wine and customWine.name set → expect a validation error.
Try saving with NEITHER → expect a validation error.

- [ ] **Step 7: Push to staging + production**

```bash
git push origin main
git checkout production
git pull --ff-only origin production
git merge main --no-ff -m "merge: otter Chunk A — tasting plans foundation"
git push origin production
git checkout main
```

Migration applies automatically on Railway boot via `prodMigrations`. Already-applied locally so prod sees it as new. Watch the deploy log to confirm `Migrated: <timestamp>_chunk_a_tasting_plans_foundation` runs cleanly.

- [ ] **Step 8: Note for the user (operator action — none required)**

This chunk is admin-only. No member-facing UI changes. No Railway Cron config changes. No Stripe touches. Once Railway settles, downstream chunks (B–E) unlock.

---

## Self-Review

**1. Spec coverage:**

| Spec section | Plan task |
|---|---|
| TastingPlans collection (owner, title, description, occasion, targetParticipants, wines array, hostScript, status, derivedFromTemplate) | Task 1 Step 1 |
| UserWines: wine → optional + customWine group + XOR | Task 1 Step 2 |
| Reviews: same shape, plus title-hook fallback | Task 1 Step 3 |
| CourseSessions: tastingPlan FK + XOR + course → optional | Task 1 Step 4 |
| Register TastingPlans in payload.config | Task 1 Step 5 |
| Single migration covering all schema changes | Task 1 Step 6 |
| Regenerate payload-types | Task 1 Step 7 |
| /api/sessions/create accepts tastingPlanId | Task 4 |
| Audit pass on .wine consumers | Task 3 |
| Wine-display helper (getWineTitle etc.) | Task 2 |
| Migration applies to shared Neon DB safely | Task 1 Step 9 |
| End-to-end smoke + push | Task 5 |

Two items from the spec are explicitly deferred and called out in the plan header / scope discipline section of the roadmap file:
- **Session-structure normalizer**: deferred to Chunk C. The SSE handler today only reads `session.host`, `session.currentLesson`, and the participants table — none of those break when `session.course` is null. Chunk C introduces a wine-pointer (or re-uses `currentLesson` semantics) and the normalizer alongside the UI work.
- **Member-facing UI**: deferred to Chunk B. Admin-only authoring is sufficient to validate the data model.

**2. Placeholder scan:** No "TBD" / "TODO" / "implement later" anywhere. Each step has complete code or complete commands with expected output. The migration filename `<timestamp>_…` is auto-generated by `pnpm migrate:create`, not a placeholder failure.

**3. Type consistency:**
- `customWine` field-set is identical between TastingPlans.wines, UserWines, Reviews (name, producer, vintage, type, systembolagetUrl, priceSek). Field names match in all three Tasks 1.1–1.3.
- `WineRef` type from Task 2 is the same shape used implicitly in Task 3 by `getWineDoc(review.wine)` calls.
- `getWineTitle` signature `(ref, custom?)` is consistent between Task 2 definition and Task 3 consumers.
- `tastingPlan` field name consistent between collection (Task 1 Step 4), API route (Task 4 Step 1), and the body param `tastingPlanId` in `/api/sessions/create`.
- Status enum values (`draft | ready | archived`) match between TastingPlans collection (Task 1 Step 1) and the plan owner-check in Task 4 (which doesn't gate on status — that's intentional, even `draft` plans can spin up a test session).

No issues found.
