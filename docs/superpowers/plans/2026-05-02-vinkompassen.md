# Vinkompassen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the unfinished `/vinkompass` v1 with a 4-archetype wine personality lead-magnet at `/vinkompassen` that captures newsletter subscribers (tagged by archetype) in exchange for a curated 6-bottle Systembolaget list.

**Architecture:** Three new Payload collections (`VinkompassQuestions`, `VinkompassArchetypes`, `VinkompassAttempts`); three Next route handlers under `/api/vinkompassen/`; two App-Router pages (landing+quiz, result) under `(frontend)/(site)/vinkompassen/`; a pure scoring helper in `src/lib/vinkompassen/scoring.ts`; reuses existing `subscribeAndMirror()` for the email side-effect.

**Tech Stack:** Next.js 15 App Router, React 19, Payload CMS 3.33, Postgres (push: true), Tailwind + shadcn, PostHog (`posthog-js`), `next/og` for share images, Node's built-in test runner (`node --test`) for the scoring unit test (no new test framework dep).

**Spec:** `docs/superpowers/specs/2026-05-02-vinkompassen-design.md`

---

## File structure

**Added (new files):**
- `src/collections/VinkompassQuestions.ts` — quiz questions, admin-editable
- `src/collections/VinkompassArchetypes.ts` — 4 archetype docs
- `src/collections/VinkompassAttempts.ts` — anonymous quiz submissions
- `src/lib/vinkompassen/scoring.ts` — pure functions: sum scores, derive quadrant key
- `src/lib/vinkompassen/scoring.test.ts` — `node --test` unit test
- `src/lib/vinkompassen/attempt-id.ts` — opaque token generator (stdlib `crypto`)
- `src/lib/vinkompassen/types.ts` — shared types (`QuadrantKey`, `Axis`, `AnswerInput`)
- `src/app/api/vinkompassen/attempts/route.ts` — POST: create Attempt
- `src/app/api/vinkompassen/attempts/[attemptId]/email/route.ts` — POST: email gate
- `src/app/api/vinkompassen/og/[attemptId]/route.tsx` — GET: shareable OG image (uses `next/og`)
- `src/app/(frontend)/(site)/vinkompassen/page.tsx` — landing + quiz host (server component)
- `src/app/(frontend)/(site)/vinkompassen/VinkompassenClient.tsx` — quiz state machine (client)
- `src/app/(frontend)/(site)/vinkompassen/resultat/[attemptId]/page.tsx` — result page (server)
- `src/app/(frontend)/(site)/vinkompassen/resultat/[attemptId]/EmailGate.tsx` — gate form (client)
- `src/app/(frontend)/(site)/vinkompassen/_components/QuadrantMini.tsx` — small 2×2 indicator
- `src/app/(frontend)/(site)/vinkompassen/_components/WineGrid.tsx` — 6-card wine list
- `scripts/seed-vinkompassen.ts` — idempotent seed for archetypes + questions

**Modified:**
- `src/collections/Subscribers.ts` — add `vinkompassen` to `source` enum
- `src/lib/subscribers.ts` — add `'vinkompassen'` to `Source` type
- `src/payload.config.ts` — register the 3 new collections
- `src/middleware.ts` — 301 redirect `/vinkompass` → `/vinkompassen`
- `src/app/sitemap.ts` — replace `/vinkompass` with `/vinkompassen`
- `src/components/ui/footer.tsx` — replace href + label
- `package.json` — add `seed:vinkompassen` and `test:vinkompassen` scripts

**Deleted:**
- `src/app/(frontend)/(site)/vinkompass/page.tsx`
- `src/app/(frontend)/(site)/vinkompass/VinkompassClient.tsx`

---

## Notes for the implementer

- **Project has no test framework.** We add ONE test using Node's built-in `node --test` runner with `tsx` for TS support (already a transitive devDep — `npx tsx` works in `scripts/send-review-emails.ts`). Do not introduce vitest/jest.
- **Schema is migration-driven in production.** `postgresAdapter` is configured `{ push: process.env.PAYLOAD_DB_PUSH === 'true', prodMigrations: migrations }` — push is opt-in, prod runs registered migrations on init. **After every collection or enum change, generate a migration with `pnpm migrate:create -- "<name>"` and commit it.** Migrations live in `src/migrations/` and are registered in `src/migrations/index.ts` (Payload updates the index automatically when generating). Without the migration, fresh prod deploys will fail.
- **Always run `pnpm generate:types`** after a collection change so `src/payload-types.ts` stays in sync. The plan calls this out at every step.
- **Always run `pnpm generate:importmap`** after registering collections, so the admin import map picks up the new collections' admin components.
- **Frequent commits**: each task ends in a `git commit`. If a task is interrupted, the next agent can pick up from a clean state.
- **Swedish copy** for all user-facing strings.
- **Design system tokens** from `src/app/(frontend)/(site)/styleguide/page.tsx`: `font-heading tracking-[-0.015em] leading-[1.05]`, brand orange `#FB914C`, `rounded-2xl border border-border bg-card p-7 shadow-sm`, eyebrow `text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground`.

---

## Task 1: Extend `Source` type and `Subscribers.source` enum

**Files:**
- Modify: `src/lib/subscribers.ts:8-15`
- Modify: `src/collections/Subscribers.ts:46-55`

- [ ] **Step 1: Read current Source type and select options**

```bash
sed -n '1,20p' src/lib/subscribers.ts
sed -n '40,60p' src/collections/Subscribers.ts
```

- [ ] **Step 2: Add `'vinkompassen'` to the Source TypeScript union**

In `src/lib/subscribers.ts`, change:

```ts
type Source =
  | 'footer'
  | 'newsletter_page'
  | 'registration'
  | 'onboarding'
  | 'profile'
  | 'manual'
```

to:

```ts
type Source =
  | 'footer'
  | 'newsletter_page'
  | 'registration'
  | 'onboarding'
  | 'profile'
  | 'manual'
  | 'vinkompassen'
```

- [ ] **Step 3: Add the matching select option in the Subscribers collection**

In `src/collections/Subscribers.ts`, in the `source` field's `options` array, append:

```ts
{ label: 'Vinkompassen', value: 'vinkompassen' },
```

So the full options become:

```ts
options: [
  { label: 'Footer form', value: 'footer' },
  { label: 'Newsletter page', value: 'newsletter_page' },
  { label: 'Registration', value: 'registration' },
  { label: 'Onboarding', value: 'onboarding' },
  { label: 'Profile settings', value: 'profile' },
  { label: 'Manual', value: 'manual' },
  { label: 'Vinkompassen', value: 'vinkompassen' },
],
```

- [ ] **Step 4: Regenerate Payload types**

Run: `pnpm generate:types`
Expected: prints `Types written to /…/src/payload-types.ts` and exits 0.

- [ ] **Step 5: Type-check the project**

Run: `pnpm lint`
Expected: passes (no type errors). The `Source` type and the Subscribers `source` enum should now align.

- [ ] **Step 6: Generate the schema migration**

Run: `pnpm migrate:create -- "add_vinkompassen_to_subscribers_source"`
Expected: creates a new file under `src/migrations/` (e.g. `20260502_*_add_vinkompassen_to_subscribers_source.ts` plus a `.json` snapshot) and updates `src/migrations/index.ts` to include it.

Verify the migration's `up` function alters the existing enum — open the new `.ts` file; you should see something like `ALTER TYPE "public"."enum_subscribers_source" ADD VALUE 'vinkompassen';` (Payload generates this automatically from the enum diff). If the file is empty or unrelated, the schema diff didn't pick up the change — re-run `pnpm generate:types` first, then `pnpm migrate:create` again.

- [ ] **Step 7: Commit**

```bash
git add src/lib/subscribers.ts src/collections/Subscribers.ts src/payload-types.ts src/migrations/
git commit -m "feat(subscribers): allow vinkompassen as a subscription source"
```

---

## Task 2: Create `VinkompassQuestions` collection

**Files:**
- Create: `src/collections/VinkompassQuestions.ts`

- [ ] **Step 1: Create the collection file**

Write `src/collections/VinkompassQuestions.ts`:

```ts
import type { CollectionConfig } from 'payload'
import { adminOnly, adminOrInstructorOnly } from '../lib/access'

/**
 * Quiz questions for the Vinkompassen lead-magnet.
 * Each question has exactly 4 answer options; each answer carries
 * scoreBody and scoreComfort in [-2..+2].
 */
export const VinkompassQuestions: CollectionConfig = {
  slug: 'vinkompass-questions',
  admin: {
    group: 'Vinkompassen',
    useAsTitle: 'question',
    defaultColumns: ['order', 'question', 'active'],
    description: 'Quiz questions for the Vinkompassen lead-magnet',
    defaultSort: 'order',
  },
  access: {
    read: () => true,
    create: adminOrInstructorOnly,
    update: adminOrInstructorOnly,
    delete: adminOnly,
  },
  fields: [
    {
      name: 'order',
      type: 'number',
      required: true,
      index: true,
      admin: { description: 'Display order (1-based)', position: 'sidebar' },
    },
    {
      name: 'question',
      type: 'text',
      required: true,
      label: 'Question (sv)',
    },
    {
      name: 'helperText',
      type: 'text',
      label: 'Helper text (optional)',
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: 'Question image (optional)',
    },
    {
      name: 'answers',
      type: 'array',
      required: true,
      minRows: 4,
      maxRows: 4,
      labels: { singular: 'Answer', plural: 'Answers' },
      admin: {
        description: 'Exactly four answers per question',
      },
      fields: [
        { name: 'label', type: 'text', required: true },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          label: 'Answer image (optional)',
        },
        {
          name: 'scoreBody',
          type: 'number',
          required: true,
          min: -2,
          max: 2,
          admin: { description: '-2 = very light, +2 = very bold' },
        },
        {
          name: 'scoreComfort',
          type: 'number',
          required: true,
          min: -2,
          max: 2,
          admin: { description: '-2 = very classic, +2 = very adventurous' },
        },
      ],
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
  ],
}
```

- [ ] **Step 2: Verify the file compiles in isolation**

Run: `pnpm lint`
Expected: passes (the collection isn't registered yet, but the file should still type-check).

- [ ] **Step 3: Commit**

```bash
git add src/collections/VinkompassQuestions.ts
git commit -m "feat(vinkompassen): add VinkompassQuestions collection"
```

---

## Task 3: Create `VinkompassArchetypes` collection

**Files:**
- Create: `src/collections/VinkompassArchetypes.ts`

- [ ] **Step 1: Create the collection file**

Write `src/collections/VinkompassArchetypes.ts`:

```ts
import type { CollectionConfig } from 'payload'
import { adminOnly } from '../lib/access'

/**
 * Four wine personality archetypes — one per quadrant of the
 * Body × Comfort grid. Each has an editor-curated recommendedWines list.
 */
export const VinkompassArchetypes: CollectionConfig = {
  slug: 'vinkompass-archetypes',
  admin: {
    group: 'Vinkompassen',
    useAsTitle: 'name',
    defaultColumns: ['key', 'name', 'tagline'],
    description: 'The four wine personality archetypes',
  },
  access: {
    read: () => true,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    {
      name: 'key',
      type: 'select',
      required: true,
      unique: true,
      index: true,
      options: [
        { label: 'Lätt + Klassisk', value: 'light-classic' },
        { label: 'Lätt + Äventyrlig', value: 'light-adventurous' },
        { label: 'Fyllig + Klassisk', value: 'bold-classic' },
        { label: 'Fyllig + Äventyrlig', value: 'bold-adventurous' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Display name (sv)',
    },
    {
      name: 'tagline',
      type: 'text',
      required: true,
      label: 'One-line tagline (sv)',
    },
    {
      name: 'description',
      type: 'richText',
      required: true,
      label: 'Personality description (sv)',
    },
    {
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
      label: 'Hero image',
    },
    {
      name: 'recommendedWines',
      type: 'relationship',
      relationTo: 'wines',
      hasMany: true,
      admin: {
        description: 'Curated bottle list (target 6, max 8). Order matters.',
      },
    },
    {
      name: 'recommendedVinprovning',
      type: 'relationship',
      relationTo: 'vinprovningar',
      hasMany: false,
      admin: {
        description: 'Soft pitch on the result page',
      },
    },
    {
      name: 'beehiivTag',
      type: 'text',
      required: true,
      admin: {
        description: 'Tag sent to Beehiiv at subscribe (e.g. "vk-light-classic")',
        position: 'sidebar',
      },
    },
  ],
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm lint`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/collections/VinkompassArchetypes.ts
git commit -m "feat(vinkompassen): add VinkompassArchetypes collection"
```

---

## Task 4: Create `VinkompassAttempts` collection

**Files:**
- Create: `src/collections/VinkompassAttempts.ts`

- [ ] **Step 1: Create the collection file**

Write `src/collections/VinkompassAttempts.ts`:

```ts
import type { CollectionConfig } from 'payload'
import { adminOnly } from '../lib/access'

/**
 * Anonymous quiz submissions. Public access goes through the
 * /api/vinkompassen/* routes — never directly through this collection.
 * Collection-level CRUD is admin-only.
 */
export const VinkompassAttempts: CollectionConfig = {
  slug: 'vinkompass-attempts',
  admin: {
    group: 'Vinkompassen',
    useAsTitle: 'attemptId',
    defaultColumns: ['attemptId', 'archetype', 'email', 'createdAt'],
    description: 'Anonymous Vinkompassen quiz submissions',
  },
  access: {
    read: adminOnly,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  timestamps: true,
  fields: [
    {
      name: 'attemptId',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'Opaque token used in shareable URLs',
        position: 'sidebar',
      },
    },
    {
      name: 'answers',
      type: 'array',
      required: true,
      labels: { singular: 'Answer', plural: 'Answers' },
      fields: [
        {
          name: 'questionId',
          type: 'relationship',
          relationTo: 'vinkompass-questions',
          required: true,
        },
        { name: 'answerIndex', type: 'number', required: true, min: 0, max: 3 },
      ],
    },
    { name: 'scoreBody', type: 'number', required: true },
    { name: 'scoreComfort', type: 'number', required: true },
    {
      name: 'archetype',
      type: 'relationship',
      relationTo: 'vinkompass-archetypes',
      required: true,
    },
    { name: 'email', type: 'text' },
    { name: 'emailSubmittedAt', type: 'date' },
    {
      name: 'subscriberId',
      type: 'relationship',
      relationTo: 'subscribers',
      hasMany: false,
    },
    {
      name: 'userId',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      admin: { description: 'Set if user was logged in at submit' },
    },
    { name: 'userAgent', type: 'text', admin: { readOnly: true } },
    { name: 'referer', type: 'text', admin: { readOnly: true } },
  ],
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm lint`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/collections/VinkompassAttempts.ts
git commit -m "feat(vinkompassen): add VinkompassAttempts collection"
```

---

## Task 5: Register the three collections + regenerate types and import map

**Files:**
- Modify: `src/payload.config.ts`

- [ ] **Step 1: Add the imports**

In `src/payload.config.ts`, near the existing collection imports (around line 38), add:

```ts
import { VinkompassQuestions } from './collections/VinkompassQuestions'
import { VinkompassArchetypes } from './collections/VinkompassArchetypes'
import { VinkompassAttempts } from './collections/VinkompassAttempts'
```

- [ ] **Step 2: Register the collections**

Find the `collections: [` array (around line 187) and add the three entries (alphabetical-ish, near other Vinkompass-adjacent collections):

```ts
    VinkompassQuestions,
    VinkompassArchetypes,
    VinkompassAttempts,
```

- [ ] **Step 3: Regenerate Payload types**

Run: `pnpm generate:types`
Expected: prints `Types written to …/src/payload-types.ts` and exits 0. New types `VinkompassQuestion`, `VinkompassArchetype`, `VinkompassAttempt` are now exported.

- [ ] **Step 4: Regenerate the admin import map**

Run: `pnpm generate:importmap`
Expected: writes `src/app/(payload)/admin/importMap.js`. No errors.

- [ ] **Step 5: Type-check**

Run: `pnpm lint`
Expected: passes.

- [ ] **Step 6: Generate the schema migration for the three new collections**

Run: `pnpm migrate:create -- "add_vinkompassen_collections"`
Expected: creates a new migration file under `src/migrations/` (`.ts` + `.json`) plus an updated `src/migrations/index.ts`. Open the new `.ts` file and verify the `up` function creates the three tables: `vinkompass_questions`, `vinkompass_archetypes`, `vinkompass_attempts`, including the array sub-tables for `answers` and any enum types (e.g. `enum_vinkompass_archetypes_key`).

If the migration file is empty, types didn't sync — re-run `pnpm generate:types`, then `pnpm migrate:create` again.

- [ ] **Step 7: Smoke-test by starting dev with PAYLOAD_DB_PUSH=true (local-only)**

Run: `PAYLOAD_DB_PUSH=true pnpm dev` (background it, or run in another terminal). For local dev, push mode lets you skip running migrations; for prod the migration we just generated handles it. Wait for "Ready", verify the admin at `/admin` shows the three new collections under group "Vinkompassen". Stop the dev server.

(Note: the project default is push=false. We use the env var only locally to avoid having to run `pnpm migrate` after every schema change during dev.)

- [ ] **Step 8: Commit**

```bash
git add src/payload.config.ts src/payload-types.ts src/app/\(payload\)/admin/importMap.js src/migrations/
git commit -m "feat(vinkompassen): register the three new collections"
```

---

## Task 6: Pure scoring helper + types

**Files:**
- Create: `src/lib/vinkompassen/types.ts`
- Create: `src/lib/vinkompassen/scoring.ts`

- [ ] **Step 1: Create the shared types**

Write `src/lib/vinkompassen/types.ts`:

```ts
export type Body = 'light' | 'bold'
export type Comfort = 'classic' | 'adventurous'
export type QuadrantKey =
  | 'light-classic'
  | 'light-adventurous'
  | 'bold-classic'
  | 'bold-adventurous'

export interface AnswerInput {
  /** Payload id of the VinkompassQuestion */
  questionId: number
  /** 0..3 — the chosen answer index in the question's answers array */
  answerIndex: number
}

export interface ScoreResult {
  scoreBody: number
  scoreComfort: number
  body: Body
  comfort: Comfort
  quadrant: QuadrantKey
}
```

- [ ] **Step 2: Create the scoring helper**

Write `src/lib/vinkompassen/scoring.ts`:

```ts
import type { VinkompassQuestion } from '@/payload-types'
import type { AnswerInput, Body, Comfort, QuadrantKey, ScoreResult } from './types'

/**
 * Sum the body and comfort scores across the user's chosen answers.
 * Throws if any answer references an unknown question or an out-of-range index.
 *
 * Pure function — easy to unit-test and reuse from the API route.
 */
export function scoreAttempt(
  questions: Pick<VinkompassQuestion, 'id' | 'answers'>[],
  answers: AnswerInput[],
): ScoreResult {
  const byId = new Map(questions.map((q) => [q.id, q]))
  let scoreBody = 0
  let scoreComfort = 0

  for (const a of answers) {
    const q = byId.get(a.questionId)
    if (!q) throw new Error(`Unknown questionId: ${a.questionId}`)
    const opt = q.answers?.[a.answerIndex]
    if (!opt) throw new Error(`Invalid answerIndex ${a.answerIndex} for question ${a.questionId}`)
    scoreBody += opt.scoreBody
    scoreComfort += opt.scoreComfort
  }

  // Strict greater-than means score === 0 falls on the lighter / classic side
  // (per spec §4: "ties go to lighter / classic — safer landing for beginners").
  const body: Body = scoreBody > 0 ? 'bold' : 'light'
  const comfort: Comfort = scoreComfort > 0 ? 'adventurous' : 'classic'
  const quadrant = `${body}-${comfort}` as QuadrantKey

  return { scoreBody, scoreComfort, body, comfort, quadrant }
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm lint`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/lib/vinkompassen/types.ts src/lib/vinkompassen/scoring.ts
git commit -m "feat(vinkompassen): pure scoring helper + shared types"
```

---

## Task 7: Unit-test the scoring helper with `node --test`

**Files:**
- Create: `src/lib/vinkompassen/scoring.test.ts`
- Modify: `package.json` (add `test:vinkompassen` script)

- [ ] **Step 1: Add the test runner script to `package.json`**

Add to the `"scripts"` block (alphabetical insertion is fine):

```json
"test:vinkompassen": "cross-env NODE_OPTIONS=--no-deprecation node --import tsx --test src/lib/vinkompassen/*.test.ts",
```

- [ ] **Step 2: Write the failing test**

Write `src/lib/vinkompassen/scoring.test.ts`:

```ts
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { scoreAttempt } from './scoring'
import type { VinkompassQuestion } from '@/payload-types'

const fixture = (id: number, scores: Array<[number, number]>): Pick<VinkompassQuestion, 'id' | 'answers'> => ({
  id,
  answers: scores.map(([scoreBody, scoreComfort], i) => ({
    label: `A${i}`,
    scoreBody,
    scoreComfort,
    id: String(i),
  })) as VinkompassQuestion['answers'],
})

describe('scoreAttempt', () => {
  it('sums scores across multiple questions', () => {
    const qs = [
      fixture(1, [[-2, -2], [0, 0], [1, 1], [2, 2]]),
      fixture(2, [[-1, -1], [0, 0], [1, 1], [2, 2]]),
    ]
    const r = scoreAttempt(qs, [
      { questionId: 1, answerIndex: 3 }, // (+2, +2)
      { questionId: 2, answerIndex: 2 }, // (+1, +1)
    ])
    assert.equal(r.scoreBody, 3)
    assert.equal(r.scoreComfort, 3)
    assert.equal(r.quadrant, 'bold-adventurous')
  })

  it('treats score=0 as the lighter/classic side (tie-break rule)', () => {
    const qs = [fixture(1, [[0, 0], [0, 0], [0, 0], [0, 0]])]
    const r = scoreAttempt(qs, [{ questionId: 1, answerIndex: 0 }])
    assert.equal(r.scoreBody, 0)
    assert.equal(r.scoreComfort, 0)
    assert.equal(r.body, 'light')
    assert.equal(r.comfort, 'classic')
    assert.equal(r.quadrant, 'light-classic')
  })

  it('produces the right quadrant for a clear lean', () => {
    const qs = [fixture(1, [[-2, -2], [-2, -2], [-2, -2], [-2, -2]])]
    const r = scoreAttempt(qs, [{ questionId: 1, answerIndex: 0 }])
    assert.equal(r.quadrant, 'light-classic')
  })

  it('throws on unknown questionId', () => {
    const qs = [fixture(1, [[0, 0], [0, 0], [0, 0], [0, 0]])]
    assert.throws(
      () => scoreAttempt(qs, [{ questionId: 999, answerIndex: 0 }]),
      /Unknown questionId: 999/,
    )
  })

  it('throws on invalid answerIndex', () => {
    const qs = [fixture(1, [[0, 0], [0, 0], [0, 0], [0, 0]])]
    assert.throws(
      () => scoreAttempt(qs, [{ questionId: 1, answerIndex: 7 }]),
      /Invalid answerIndex 7 for question 1/,
    )
  })
})
```

- [ ] **Step 3: Run the test**

Run: `pnpm test:vinkompassen`
Expected: all 5 tests pass. Output ends with `# pass 5  # fail 0`.

If a test fails, fix the implementation in `scoring.ts` until it passes — do not loosen the test.

- [ ] **Step 4: Commit**

```bash
git add src/lib/vinkompassen/scoring.test.ts package.json
git commit -m "test(vinkompassen): unit-test the scoring helper"
```

---

## Task 8: Opaque attempt-id generator

**Files:**
- Create: `src/lib/vinkompassen/attempt-id.ts`

- [ ] **Step 1: Write the helper**

Write `src/lib/vinkompassen/attempt-id.ts`:

```ts
import { randomBytes } from 'node:crypto'

/**
 * Generates a 12-character URL-safe opaque token for shareable attempt URLs.
 * 9 random bytes → 12 base64url chars. ~72 bits of entropy is plenty for a
 * non-secret share link with no listing/enumeration endpoint.
 */
export function generateAttemptId(): string {
  return randomBytes(9).toString('base64url')
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm lint`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/lib/vinkompassen/attempt-id.ts
git commit -m "feat(vinkompassen): opaque attempt-id helper"
```

---

## Task 9: `POST /api/vinkompassen/attempts` — create attempt from answers

**Files:**
- Create: `src/app/api/vinkompassen/attempts/route.ts`

- [ ] **Step 1: Write the route handler**

Write `src/app/api/vinkompassen/attempts/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { headers as nextHeaders } from 'next/headers'
import { loggerFor } from '@/lib/logger'
import { scoreAttempt } from '@/lib/vinkompassen/scoring'
import { generateAttemptId } from '@/lib/vinkompassen/attempt-id'
import type { AnswerInput } from '@/lib/vinkompassen/types'
import { subscribeAndMirror, findUserIdByEmail } from '@/lib/subscribers'
import { getUser } from '@/lib/get-user'

const log = loggerFor('api-vinkompassen-attempts')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const answers: AnswerInput[] = Array.isArray(body?.answers) ? body.answers : []

    if (answers.length === 0) {
      return NextResponse.json({ error: 'Missing answers' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    // Load questions referenced by the submission. We do NOT trust the
    // client-supplied scores — we recompute from the canonical question docs.
    const questionIds = Array.from(new Set(answers.map((a) => a.questionId)))
    const questionsRes = await payload.find({
      collection: 'vinkompass-questions',
      where: { id: { in: questionIds } },
      limit: 100,
      depth: 0,
    })

    if (questionsRes.docs.length !== questionIds.length) {
      return NextResponse.json({ error: 'Unknown questionId in submission' }, { status: 400 })
    }

    let scored
    try {
      scored = scoreAttempt(questionsRes.docs, answers)
    } catch (err) {
      log.warn({ err }, 'vinkompassen_score_invalid')
      return NextResponse.json({ error: 'Invalid answer payload' }, { status: 400 })
    }

    // Resolve archetype by `key`
    const archetypeRes = await payload.find({
      collection: 'vinkompass-archetypes',
      where: { key: { equals: scored.quadrant } },
      limit: 1,
      depth: 0,
    })
    const archetype = archetypeRes.docs[0]
    if (!archetype) {
      log.error({ quadrant: scored.quadrant }, 'vinkompassen_archetype_missing')
      return NextResponse.json({ error: 'Archetype not configured' }, { status: 500 })
    }

    const attemptId = generateAttemptId()
    const headers = await nextHeaders()
    const userAgent = headers.get('user-agent') || ''
    const referer = headers.get('referer') || ''

    // Logged-in users — auto-subscribe with their email and skip the gate
    const currentUser = await getUser().catch(() => null)
    const userEmail = currentUser?.email?.trim().toLowerCase() || null

    const created = await payload.create({
      collection: 'vinkompass-attempts',
      data: {
        attemptId,
        answers: answers.map((a) => ({ questionId: a.questionId, answerIndex: a.answerIndex })),
        scoreBody: scored.scoreBody,
        scoreComfort: scored.scoreComfort,
        archetype: archetype.id,
        userId: currentUser?.id || null,
        email: userEmail,
        emailSubmittedAt: userEmail ? new Date().toISOString() : null,
        userAgent,
        referer,
      },
    })

    if (userEmail) {
      // Fire-and-forget; do not block the response on Beehiiv
      void (async () => {
        try {
          const beehiivTag = (archetype as { beehiivTag?: string }).beehiivTag || ''
          const tags = ['vinkompassen', beehiivTag].filter(Boolean)
          const relatedUserId = await findUserIdByEmail(payload, userEmail)
          await subscribeAndMirror({
            payload,
            email: userEmail,
            source: 'vinkompassen',
            relatedUserId,
            tags,
          })
        } catch (err) {
          log.warn({ err }, 'vinkompassen_loggedin_subscribe_failed')
        }
      })()
    }

    return NextResponse.json(
      { ok: true, attemptId: created.attemptId, quadrant: scored.quadrant },
      { status: 200 },
    )
  } catch (err) {
    log.error({ err }, 'vinkompassen_create_attempt_failed')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify `getUser` import**

Run: `grep -nE '^export' src/lib/get-user.ts`
Expected: `export const getUser = async () => {…}` (or similar). If the export shape differs, adjust the import line to match.

- [ ] **Step 3: Type-check**

Run: `pnpm lint`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/vinkompassen/attempts/route.ts
git commit -m "feat(vinkompassen): POST /api/vinkompassen/attempts route"
```

---

## Task 10: `POST /api/vinkompassen/attempts/[attemptId]/email` — gate submit

**Files:**
- Create: `src/app/api/vinkompassen/attempts/[attemptId]/email/route.ts`

- [ ] **Step 1: Write the route handler**

Write `src/app/api/vinkompassen/attempts/[attemptId]/email/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { loggerFor } from '@/lib/logger'
import { subscribeAndMirror, findUserIdByEmail } from '@/lib/subscribers'
import type { VinkompassArchetype } from '@/payload-types'

const log = loggerFor('api-vinkompassen-email')

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ attemptId: string }> },
) {
  try {
    const { attemptId } = await ctx.params
    const body = await request.json().catch(() => ({}))
    const email: string = String(body?.email || '').trim().toLowerCase()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Giltig e-postadress krävs' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    const attemptRes = await payload.find({
      collection: 'vinkompass-attempts',
      where: { attemptId: { equals: attemptId } },
      limit: 1,
      depth: 1, // populate `archetype`
    })
    const attempt = attemptRes.docs[0]
    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

    // Idempotency: don't allow overwriting a submitted email
    if (attempt.email) {
      return NextResponse.json({ ok: true, alreadySubmitted: true }, { status: 200 })
    }

    const archetype = attempt.archetype as VinkompassArchetype
    const beehiivTag = archetype?.beehiivTag || ''
    const tags = ['vinkompassen', beehiivTag].filter(Boolean)
    const relatedUserId = await findUserIdByEmail(payload, email)

    const subResult = await subscribeAndMirror({
      payload,
      email,
      source: 'vinkompassen',
      relatedUserId,
      tags,
    })

    if (!subResult.ok && !subResult.alreadySubscribed && !subResult.beehiivSkipped) {
      log.error({ email, err: subResult.error }, 'vinkompassen_subscribe_failed')
      return NextResponse.json(
        { error: 'Kunde inte spara prenumerationen. Försök igen.' },
        { status: 500 },
      )
    }

    // Look up the local Subscribers row to attach to the Attempt
    const subscriberRes = await payload.find({
      collection: 'subscribers',
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
    })
    const subscriberId = subscriberRes.docs[0]?.id || null

    await payload.update({
      collection: 'vinkompass-attempts',
      id: attempt.id,
      data: {
        email,
        emailSubmittedAt: new Date().toISOString(),
        subscriberId,
      },
    })

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    log.error({ err }, 'vinkompassen_email_submit_failed')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm lint`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/vinkompassen/attempts/\[attemptId\]/email/route.ts
git commit -m "feat(vinkompassen): POST email-gate route per attempt"
```

---

## Task 11: `GET /api/vinkompassen/og/[attemptId]` — shareable OG image

**Files:**
- Create: `src/app/api/vinkompassen/og/[attemptId]/route.tsx`

- [ ] **Step 1: Write the route handler**

Write `src/app/api/vinkompassen/og/[attemptId]/route.tsx`:

```tsx
import { ImageResponse } from 'next/og'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { VinkompassArchetype } from '@/payload-types'
// Note: the generated Payload type for slug `vinprovningar` is the plural
// `Vinprovningar` interface — do NOT assume singular here. Same pattern
// applies in the result page.

export const runtime = 'nodejs'
export const revalidate = 60 * 60 * 24 // 24h

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ attemptId: string }> },
) {
  const { attemptId } = await ctx.params

  const payload = await getPayload({ config })
  const attemptRes = await payload.find({
    collection: 'vinkompass-attempts',
    where: { attemptId: { equals: attemptId } },
    limit: 1,
    depth: 1,
  })
  const attempt = attemptRes.docs[0]
  const archetype = attempt?.archetype as VinkompassArchetype | undefined

  const title = archetype?.name || 'Vinkompassen'
  const tagline = archetype?.tagline || 'Hitta din vintyp'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg,#1a1a1a 0%,#2a1a08 100%)',
          color: 'white',
          fontFamily: 'sans-serif',
          padding: 80,
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 6, color: '#FB914C', textTransform: 'uppercase' }}>
          Vinkompassen
        </div>
        <div style={{ fontSize: 96, fontWeight: 700, marginTop: 24, textAlign: 'center', lineHeight: 1.05 }}>
          {title}
        </div>
        <div style={{ fontSize: 36, marginTop: 24, color: '#d8d2c5', textAlign: 'center' }}>
          {tagline}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm lint`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/vinkompassen/og/\[attemptId\]/route.tsx
git commit -m "feat(vinkompassen): OG image route for shareable result links"
```

---

## Task 12: Quadrant mini-indicator component

**Files:**
- Create: `src/app/(frontend)/(site)/vinkompassen/_components/QuadrantMini.tsx`

- [ ] **Step 1: Write the component**

Write `src/app/(frontend)/(site)/vinkompassen/_components/QuadrantMini.tsx`:

```tsx
import type { QuadrantKey } from '@/lib/vinkompassen/types'

interface Props {
  active: QuadrantKey
  size?: number
  className?: string
}

const cells: Array<{ key: QuadrantKey; row: number; col: number; label: string }> = [
  { key: 'light-classic', row: 0, col: 0, label: 'Lätt + Klassisk' },
  { key: 'light-adventurous', row: 0, col: 1, label: 'Lätt + Äventyrlig' },
  { key: 'bold-classic', row: 1, col: 0, label: 'Fyllig + Klassisk' },
  { key: 'bold-adventurous', row: 1, col: 1, label: 'Fyllig + Äventyrlig' },
]

export function QuadrantMini({ active, size = 200, className = '' }: Props) {
  return (
    <div
      className={`grid grid-cols-2 grid-rows-2 gap-1 ${className}`}
      style={{ width: size, height: size }}
      aria-label={`Vinkompassens fyrfält — du är ${cells.find((c) => c.key === active)?.label}`}
    >
      {cells.map((c) => {
        const isActive = c.key === active
        return (
          <div
            key={c.key}
            className={
              isActive
                ? 'rounded-md border border-[#FB914C] bg-[#FB914C]/15'
                : 'rounded-md border border-border bg-card/40'
            }
            aria-current={isActive ? 'true' : undefined}
          />
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm lint`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(frontend\)/\(site\)/vinkompassen/_components/QuadrantMini.tsx
git commit -m "feat(vinkompassen): QuadrantMini indicator component"
```

---

## Task 13: WineGrid component

**Files:**
- Create: `src/app/(frontend)/(site)/vinkompassen/_components/WineGrid.tsx`

- [ ] **Step 1: Write the component**

Write `src/app/(frontend)/(site)/vinkompassen/_components/WineGrid.tsx`:

```tsx
'use client'

import Image from 'next/image'
import posthog from 'posthog-js'
import type { Wine, Media } from '@/payload-types'

interface Props {
  wines: Wine[]
  archetypeKey: string
}

export function WineGrid({ wines, archetypeKey }: Props) {
  const handleClick = (wine: Wine) => {
    posthog?.capture?.('vinkompass_wine_clicked', {
      archetype: archetypeKey,
      wineSlug: wine.slug,
    })
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {wines.map((wine) => {
        const media = (wine.image && typeof wine.image === 'object' ? (wine.image as Media) : null)
        const imageUrl = media?.url || ''
        const url = wine.systembolagetUrl || '#'
        return (
          <a
            key={wine.id}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleClick(wine)}
            className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-[#FB914C]"
          >
            <div className="relative h-44 w-full overflow-hidden rounded-xl bg-muted">
              {imageUrl ? (
                <Image src={imageUrl} alt={wine.name} fill className="object-contain" sizes="(max-width:768px) 100vw, 33vw" />
              ) : null}
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {wine.winery}
              </span>
              <h3 className="font-heading text-lg leading-tight tracking-[-0.015em]">{wine.name}</h3>
              {typeof wine.price === 'number' ? (
                <span className="text-sm text-muted-foreground">{wine.price} kr</span>
              ) : null}
              <span className="mt-2 text-sm font-medium text-[#FB914C] group-hover:underline">
                Köp på Systembolaget →
              </span>
            </div>
          </a>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm lint`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(frontend\)/\(site\)/vinkompassen/_components/WineGrid.tsx
git commit -m "feat(vinkompassen): WineGrid component with PostHog tracking"
```

---

## Task 14: Quiz client + landing page

**Files:**
- Create: `src/app/(frontend)/(site)/vinkompassen/page.tsx`
- Create: `src/app/(frontend)/(site)/vinkompassen/VinkompassenClient.tsx`

- [ ] **Step 1: Write the server component (data fetch + shell)**

Write `src/app/(frontend)/(site)/vinkompassen/page.tsx`:

```tsx
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Metadata } from 'next'
import { VinkompassenClient } from './VinkompassenClient'
import { getSiteURL } from '@/lib/site-url'

export const metadata: Metadata = {
  title: 'Vinkompassen — Hitta din vintyp',
  description: 'Svara på 8 korta frågor och få sex viner från Systembolaget skräddarsydda för dig.',
  alternates: { canonical: `${getSiteURL()}/vinkompassen` },
}

export default async function VinkompassenLandingPage() {
  const payload = await getPayload({ config })
  const questionsRes = await payload.find({
    collection: 'vinkompass-questions',
    where: { active: { equals: true } },
    sort: 'order',
    limit: 50,
    depth: 1, // populate question.image and answers[].image
  })

  return <VinkompassenClient questions={questionsRes.docs} />
}
```

- [ ] **Step 2: Write the quiz client**

Write `src/app/(frontend)/(site)/vinkompassen/VinkompassenClient.tsx`:

```tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import posthog from 'posthog-js'
import type { Media, VinkompassQuestion } from '@/payload-types'
import type { AnswerInput } from '@/lib/vinkompassen/types'
import { Button } from '@/components/ui/button'

const DRAFT_KEY = 'vinkompassen.draft'
const LAST_KEY = 'vinkompassen.lastAttemptId'

type Mode = 'landing' | 'quiz'

interface Props {
  questions: VinkompassQuestion[]
}

export function VinkompassenClient({ questions }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('landing')
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<AnswerInput[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Restore draft if any
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const draft = JSON.parse(raw) as { answers: AnswerInput[]; step: number }
        if (Array.isArray(draft.answers) && draft.answers.length > 0) {
          setAnswers(draft.answers)
          setStep(Math.min(draft.step ?? draft.answers.length, questions.length))
          setMode('quiz')
        }
      }
    } catch {}
  }, [questions.length])

  const current = questions[step]
  const progress = useMemo(
    () => Math.round(((step + (mode === 'quiz' ? 0 : 0)) / Math.max(1, questions.length)) * 100),
    [step, questions.length, mode],
  )

  function start() {
    posthog?.capture?.('vinkompass_started')
    setMode('quiz')
    setStep(0)
    setAnswers([])
    if (typeof window !== 'undefined') window.localStorage.removeItem(DRAFT_KEY)
  }

  function pickAnswer(answerIndex: number) {
    const q = questions[step]
    if (!q) return
    const opt = q.answers?.[answerIndex]
    if (!opt) return

    const next: AnswerInput[] = [...answers, { questionId: q.id, answerIndex }]

    posthog?.capture?.('vinkompass_question_answered', {
      questionIndex: step,
      answerIndex,
      scoreBody: opt.scoreBody,
      scoreComfort: opt.scoreComfort,
    })

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ answers: next, step: step + 1 }))
    }

    if (step + 1 >= questions.length) {
      void submit(next)
    } else {
      setAnswers(next)
      setStep(step + 1)
    }
  }

  async function submit(finalAnswers: AnswerInput[]) {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/vinkompassen/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: finalAnswers }),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; attemptId?: string; error?: string }
      if (!res.ok || !data.ok || !data.attemptId) {
        throw new Error(data?.error || 'Kunde inte slutföra testet')
      }
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LAST_KEY, data.attemptId)
        window.localStorage.removeItem(DRAFT_KEY)
      }
      router.push(`/vinkompassen/resultat/${data.attemptId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte slutföra testet')
      setSubmitting(false)
    }
  }

  if (mode === 'landing') {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Vinkompassen
        </span>
        <h1 className="mt-3 font-heading text-5xl leading-[1.05] tracking-[-0.015em] md:text-6xl">
          Hitta din vintyp på 90 sekunder
        </h1>
        <p className="mt-5 max-w-[55ch] text-lg leading-relaxed text-muted-foreground">
          Svara på 8 korta frågor och få sex handplockade viner från Systembolaget — utvalda för just din smak.
        </p>
        <Button onClick={start} className="mt-8" size="lg" style={{ background: '#FB914C' }}>
          Starta testet
        </Button>
      </main>
    )
  }

  if (!current) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <p>{submitting ? 'Räknar ut din vintyp...' : 'Inga frågor är publicerade än.'}</p>
        {error ? <p className="mt-4 text-red-500">{error}</p> : null}
      </main>
    )
  }

  const questionImage =
    current.image && typeof current.image === 'object' ? (current.image as Media) : null

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <div className="mb-6">
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full transition-all"
            style={{ width: `${(step / questions.length) * 100}%`, background: '#FB914C' }}
          />
        </div>
        <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Fråga {step + 1} av {questions.length}
        </div>
      </div>

      <h2 className="font-heading text-3xl leading-[1.1] tracking-[-0.015em] md:text-4xl">
        {current.question}
      </h2>
      {current.helperText ? (
        <p className="mt-2 text-muted-foreground">{current.helperText}</p>
      ) : null}
      {questionImage?.url ? (
        <div className="relative mt-6 h-56 w-full overflow-hidden rounded-2xl">
          <Image src={questionImage.url} alt="" fill className="object-cover" sizes="(max-width:768px) 100vw, 768px" />
        </div>
      ) : null}

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(current.answers || []).map((a, i) => {
          const aImage = a.image && typeof a.image === 'object' ? (a.image as Media) : null
          return (
            <button
              key={a.id || i}
              onClick={() => pickAnswer(i)}
              disabled={submitting}
              className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-[#FB914C]"
            >
              {aImage?.url ? (
                <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                  <Image src={aImage.url} alt="" fill className="object-cover" sizes="56px" />
                </div>
              ) : null}
              <span className="font-medium leading-snug">{a.label}</span>
            </button>
          )
        })}
      </div>

      {error ? <p className="mt-4 text-red-500">{error}</p> : null}
    </main>
  )
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm lint`
Expected: passes.

- [ ] **Step 4: Smoke-test in dev**

Run: `pnpm dev` (background)
- Open http://localhost:3000/vinkompassen
- Verify the landing copy renders. (The quiz won't actually work yet because no questions are seeded — that comes in Task 19.) Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(frontend\)/\(site\)/vinkompassen/page.tsx src/app/\(frontend\)/\(site\)/vinkompassen/VinkompassenClient.tsx
git commit -m "feat(vinkompassen): landing page + quiz state machine"
```

---

## Task 15: Result page (server component) + email gate component

**Files:**
- Create: `src/app/(frontend)/(site)/vinkompassen/resultat/[attemptId]/page.tsx`
- Create: `src/app/(frontend)/(site)/vinkompassen/resultat/[attemptId]/EmailGate.tsx`
- Create: `src/app/(frontend)/(site)/vinkompassen/resultat/[attemptId]/ResultActions.tsx`

- [ ] **Step 1: Write the EmailGate (client component)**

Write `src/app/(frontend)/(site)/vinkompassen/resultat/[attemptId]/EmailGate.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import posthog from 'posthog-js'
import { Button } from '@/components/ui/button'

interface Props {
  attemptId: string
  archetypeKey: string
}

export function EmailGate({ attemptId, archetypeKey }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/vinkompassen/attempts/${attemptId}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || 'Något gick fel')
      }
      posthog?.capture?.('vinkompass_email_submitted', { archetype: archetypeKey })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Något gick fel')
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border-2 border-[#FB914C] bg-card p-7 shadow-sm"
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Dina viner väntar
      </span>
      <h2 className="mt-3 font-heading text-3xl leading-[1.1] tracking-[-0.015em]">
        Vill du se dina 6 viner från Systembolaget?
      </h2>
      <p className="mt-2 text-muted-foreground">
        Ange din e-post — vi skickar dem direkt och håller dig uppdaterad med viner som matchar din typ.
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="din@epost.se"
          className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-base"
          disabled={submitting}
        />
        <Button type="submit" disabled={submitting} style={{ background: '#FB914C' }}>
          {submitting ? 'Skickar...' : 'Visa mina viner'}
        </Button>
      </div>
      {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}
      <p className="mt-3 text-xs text-muted-foreground">
        Vi delar aldrig din e-post. Avregistrera dig när som helst.
      </p>
    </form>
  )
}
```

- [ ] **Step 2: Write the ResultActions (share + retake, client component)**

Write `src/app/(frontend)/(site)/vinkompassen/resultat/[attemptId]/ResultActions.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import posthog from 'posthog-js'

interface Props {
  attemptId: string
  archetypeKey: string
}

export function ResultActions({ attemptId, archetypeKey }: Props) {
  const router = useRouter()

  function handleShare(channel: string, href?: string) {
    posthog?.capture?.('vinkompass_shared', { archetype: archetypeKey, channel })
    if (href) window.open(href, '_blank', 'noopener,noreferrer')
  }

  async function copyLink() {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    try {
      await navigator.clipboard.writeText(url)
    } catch {}
    handleShare('copy')
  }

  function retake() {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('vinkompassen.draft')
    }
    router.push('/vinkompassen')
  }

  const url = typeof window !== 'undefined' ? window.location.href : ''
  const xHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent('Jag tog Vinkompassen!')}&url=${encodeURIComponent(url)}`
  const fbHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`

  return (
    <div className="flex flex-wrap gap-3">
      <button onClick={copyLink} className="rounded-xl border border-border px-4 py-2 text-sm">
        Kopiera länk
      </button>
      <button
        onClick={() => handleShare('twitter', xHref)}
        className="rounded-xl border border-border px-4 py-2 text-sm"
      >
        Dela på X
      </button>
      <button
        onClick={() => handleShare('facebook', fbHref)}
        className="rounded-xl border border-border px-4 py-2 text-sm"
      >
        Dela på Facebook
      </button>
      <button
        onClick={retake}
        className="ml-auto rounded-xl border border-border px-4 py-2 text-sm"
      >
        Gör om testet
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Write the result server page**

Write `src/app/(frontend)/(site)/vinkompassen/resultat/[attemptId]/page.tsx`:

```tsx
import { getPayload } from 'payload'
import config from '@/payload.config'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { VinkompassArchetype, VinkompassAttempt, Wine, Vinprovningar } from '@/payload-types'
import { getSiteURL } from '@/lib/site-url'
import { RichTextRenderer } from '@/components/ui/rich-text-renderer'
import { QuadrantMini } from '../../_components/QuadrantMini'
import { WineGrid } from '../../_components/WineGrid'
import { EmailGate } from './EmailGate'
import { ResultActions } from './ResultActions'

interface PageProps {
  params: Promise<{ attemptId: string }>
}

async function loadAttempt(attemptId: string) {
  const payload = await getPayload({ config })
  const res = await payload.find({
    collection: 'vinkompass-attempts',
    where: { attemptId: { equals: attemptId } },
    limit: 1,
    depth: 2, // populate archetype + archetype.recommendedWines + recommendedVinprovning
  })
  return res.docs[0] || null
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { attemptId } = await params
  const attempt = await loadAttempt(attemptId)
  const archetype = (attempt?.archetype as VinkompassArchetype | undefined) || null
  const title = archetype ? `${archetype.name} — Vinkompassen` : 'Vinkompassen'
  const description = archetype?.tagline || 'Hitta din vintyp på 90 sekunder.'
  const ogUrl = `${getSiteURL()}/api/vinkompassen/og/${attemptId}`
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: ogUrl, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description, images: [ogUrl] },
  }
}

export default async function VinkompassenResultPage({ params }: PageProps) {
  const { attemptId } = await params
  const attempt = (await loadAttempt(attemptId)) as VinkompassAttempt | null
  if (!attempt) notFound()

  const archetype = attempt.archetype as VinkompassArchetype
  const recommendedWines: Wine[] = Array.isArray(archetype.recommendedWines)
    ? (archetype.recommendedWines as Wine[]).filter((w): w is Wine => typeof w === 'object')
    : []
  const recommendedVinprovning =
    archetype.recommendedVinprovning && typeof archetype.recommendedVinprovning === 'object'
      ? (archetype.recommendedVinprovning as Vinprovningar)
      : null

  const isGated = !attempt.email

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      {/* Top — always visible */}
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Din vintyp
      </span>
      <h1 className="mt-3 font-heading text-5xl leading-[1.05] tracking-[-0.015em] md:text-6xl">
        {archetype.name}
      </h1>
      <p className="mt-3 max-w-[55ch] text-lg leading-relaxed text-muted-foreground">
        {archetype.tagline}
      </p>

      <div className="mt-8 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <QuadrantMini active={archetype.key as never} size={180} />
        <div className="flex-1">
          <RichTextRenderer content={archetype.description} />
        </div>
      </div>

      <div className="mt-8">
        <ResultActions attemptId={attempt.attemptId} archetypeKey={archetype.key} />
      </div>

      {/* Below — gate or grid */}
      <div className="mt-12">
        {isGated ? (
          <EmailGate attemptId={attempt.attemptId} archetypeKey={archetype.key} />
        ) : (
          <>
            <h2 className="mb-5 font-heading text-3xl leading-[1.1] tracking-[-0.015em]">
              Sex viner för dig
            </h2>
            <WineGrid wines={recommendedWines.slice(0, 8)} archetypeKey={archetype.key} />

            {recommendedVinprovning ? (
              <a
                href={`/vinprovningar/${recommendedVinprovning.slug}`}
                className="mt-10 flex flex-col gap-2 rounded-2xl border border-border bg-card p-7 shadow-sm transition hover:border-[#FB914C]"
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Provning för din typ
                </span>
                <h3 className="font-heading text-2xl tracking-[-0.015em]">
                  {recommendedVinprovning.title}
                </h3>
                <span className="text-sm font-medium text-[#FB914C]">Se provningen →</span>
              </a>
            ) : null}
          </>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Verify imports**

Run: `grep -nE "^export interface" src/payload-types.ts | grep -E "Vinprovningar|Wine|VinkompassA"`
Expected: `Wine`, `Vinprovningar`, `VinkompassAttempt`, `VinkompassArchetype` interfaces are exported. The Vinprovningar type is **plural** (Payload generates from slug verbatim), and that's already reflected in the imports above. If it's not, the seeder probably failed and types are stale — re-run `pnpm generate:types`.

- [ ] **Step 5: Type-check**

Run: `pnpm lint`
Expected: passes.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(frontend\)/\(site\)/vinkompassen/resultat
git commit -m "feat(vinkompassen): result page with email gate and share actions"
```

---

## Task 16: Wire result-page reveal PostHog event

**Files:**
- Modify: `src/app/(frontend)/(site)/vinkompassen/resultat/[attemptId]/ResultActions.tsx`

The `vinkompass_archetype_revealed` event needs to fire on result-page first paint. The cleanest place is in `ResultActions` (which is already a client component on this page).

- [ ] **Step 1: Add the reveal event**

In `ResultActions.tsx`, add a `useEffect` that fires `vinkompass_archetype_revealed` once on mount:

```tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import posthog from 'posthog-js'

interface Props {
  attemptId: string
  archetypeKey: string
}

export function ResultActions({ attemptId, archetypeKey }: Props) {
  const router = useRouter()

  useEffect(() => {
    posthog?.capture?.('vinkompass_archetype_revealed', { archetype: archetypeKey })
  }, [archetypeKey])

  // ... rest of the component unchanged
```

(Keep the rest of the existing component body.)

- [ ] **Step 2: Wire `vinkompass_vinprovning_clicked` in the result page**

In `src/app/(frontend)/(site)/vinkompassen/resultat/[attemptId]/page.tsx`, the Vinprovning card is a server-rendered `<a>`. PostHog can't fire from a server component. Extract the card into a tiny client component:

Create `src/app/(frontend)/(site)/vinkompassen/resultat/[attemptId]/VinprovningCard.tsx`:

```tsx
'use client'

import posthog from 'posthog-js'

interface Props {
  href: string
  title: string
  archetypeKey: string
  vinprovningSlug: string
}

export function VinprovningCard({ href, title, archetypeKey, vinprovningSlug }: Props) {
  return (
    <a
      href={href}
      onClick={() =>
        posthog?.capture?.('vinkompass_vinprovning_clicked', {
          archetype: archetypeKey,
          vinprovningSlug,
        })
      }
      className="mt-10 flex flex-col gap-2 rounded-2xl border border-border bg-card p-7 shadow-sm transition hover:border-[#FB914C]"
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Provning för din typ
      </span>
      <h3 className="font-heading text-2xl tracking-[-0.015em]">{title}</h3>
      <span className="text-sm font-medium text-[#FB914C]">Se provningen →</span>
    </a>
  )
}
```

In the result page, replace the inline `<a>` block with:

```tsx
{recommendedVinprovning ? (
  <VinprovningCard
    href={`/vinprovningar/${recommendedVinprovning.slug}`}
    title={recommendedVinprovning.title}
    archetypeKey={archetype.key}
    vinprovningSlug={recommendedVinprovning.slug}
  />
) : null}
```

…and add the import at the top:

```tsx
import { VinprovningCard } from './VinprovningCard'
```

- [ ] **Step 3: Type-check**

Run: `pnpm lint`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(frontend\)/\(site\)/vinkompassen/resultat
git commit -m "feat(vinkompassen): wire reveal + vinprovning click events"
```

---

## Task 17: Middleware redirect `/vinkompass` → `/vinkompassen`

**Files:**
- Modify: `src/middleware.ts`

- [ ] **Step 1: Add the redirect block**

In `src/middleware.ts`, near the top of the `middleware` function (BEFORE the admin gate is fine — but BEFORE the public-paths early return so the redirect actually happens), add:

```ts
  // Redirect old /vinkompass slug to /vinkompassen (fresh feature).
  if (pathname === '/vinkompass' || pathname.startsWith('/vinkompass/')) {
    const target = pathname.replace(/^\/vinkompass/, '/vinkompassen')
    url.pathname = target
    return NextResponse.redirect(url, 301)
  }
```

This must come BEFORE the `if (pathname.startsWith('/_next') ...)` early return, otherwise `/vinkompass` falls through to `NextResponse.next()` and never redirects. Place it directly after the admin gate `if (pathname.startsWith('/admin')) { ... }` block.

- [ ] **Step 2: Verify the placement**

Run: `grep -nE "vinkompass|admin\)|pathname\.startsWith\('/_next'\)" src/middleware.ts | head -10`
Expected: the new `vinkompass` redirect lines appear AFTER the admin block and BEFORE the `_next` early return.

- [ ] **Step 3: Type-check**

Run: `pnpm lint`
Expected: passes.

- [ ] **Step 4: Smoke-test**

Run: `pnpm dev` (background)
- `curl -I http://localhost:3000/vinkompass` → expect `HTTP/1.1 301` with `location: /vinkompassen`
- `curl -I http://localhost:3000/vinkompass/anything` → expect `HTTP/1.1 301` with `location: /vinkompassen/anything`

Stop dev.

- [ ] **Step 5: Commit**

```bash
git add src/middleware.ts
git commit -m "feat(vinkompassen): 301 redirect /vinkompass to /vinkompassen"
```

---

## Task 18: Update sitemap and footer references

**Files:**
- Modify: `src/app/sitemap.ts`
- Modify: `src/components/ui/footer.tsx`

- [ ] **Step 1: Update sitemap path**

In `src/app/sitemap.ts`, replace:

```ts
{ path: '/vinkompass', changeFrequency: 'weekly', priority: 0.7 },
```

with:

```ts
{ path: '/vinkompassen', changeFrequency: 'weekly', priority: 0.7 },
```

- [ ] **Step 2: Update footer link**

In `src/components/ui/footer.tsx`, in the `exploreLinks` array, replace:

```ts
{ label: 'Vinkompass', href: '/vinkompass' },
```

with:

```ts
{ label: 'Vinkompassen', href: '/vinkompassen' },
```

- [ ] **Step 3: Type-check**

Run: `pnpm lint`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/app/sitemap.ts src/components/ui/footer.tsx
git commit -m "feat(vinkompassen): update sitemap + footer to new path"
```

---

## Task 19: Seed script for archetypes + questions

**Files:**
- Create: `scripts/seed-vinkompassen.ts`
- Modify: `package.json` (add `seed:vinkompassen` script)

- [ ] **Step 1: Write the seed script**

Write `scripts/seed-vinkompassen.ts`:

```ts
/**
 * Idempotent seed for Vinkompassen — creates the four archetype docs and
 * eight quiz questions if they don't yet exist (matching by `key` for
 * archetypes and by `order` for questions). Re-running is safe — never
 * overwrites editor-curated fields like recommendedWines or final copy.
 */

import { getPayload } from 'payload'
import config from '../src/payload.config'

type ArchetypeSeed = {
  key: 'light-classic' | 'light-adventurous' | 'bold-classic' | 'bold-adventurous'
  name: string
  tagline: string
  beehiivTag: string
  description: string
}

const ARCHETYPES: ArchetypeSeed[] = [
  {
    key: 'light-classic',
    name: 'Den Friska Traditionalisten',
    tagline: 'Klara, rena viner med syra och elegans.',
    beehiivTag: 'vk-light-classic',
    description: 'Du älskar viner som är klara, rena och eleganta...',
  },
  {
    key: 'light-adventurous',
    name: 'Den Nyfikna Upptäckaren',
    tagline: 'Lätta viner med en oväntad twist.',
    beehiivTag: 'vk-light-adventurous',
    description: 'Du söker det oväntade — pét-nat, orange wine, svalt och spännande...',
  },
  {
    key: 'bold-classic',
    name: 'Den Trygga Kraftmänniskan',
    tagline: 'Fyllig komfort i klassisk form.',
    beehiivTag: 'vk-bold-classic',
    description: 'Bordeaux, Barolo, ekfat-Chardonnay — du vill ha tyngden och historien...',
  },
  {
    key: 'bold-adventurous',
    name: 'Den Vågade Äventyraren',
    tagline: 'Stora, ovanliga smaker — du säger ja.',
    beehiivTag: 'vk-bold-adventurous',
    description: 'Etna Rosso, Pinotage, naturlig Syrah — du vill ha intensitet OCH ovanlighet...',
  },
]

type QuestionSeed = {
  order: number
  question: string
  helperText?: string
  answers: Array<{ label: string; scoreBody: number; scoreComfort: number }>
}

const QUESTIONS: QuestionSeed[] = [
  {
    order: 1,
    question: 'Hur ser en perfekt fredagskväll ut?',
    answers: [
      { label: 'Picknick i parken med vänner', scoreBody: -2, scoreComfort: 0 },
      { label: 'Lugnt hemma med en bok', scoreBody: -1, scoreComfort: -2 },
      { label: 'Middag med dukad bordsservis', scoreBody: 1, scoreComfort: -1 },
      { label: 'Något jag aldrig gjort förut', scoreBody: 0, scoreComfort: 2 },
    ],
  },
  {
    order: 2,
    question: 'Vilken maträtt drar du mest mot?',
    answers: [
      { label: 'Sushi och sallader', scoreBody: -2, scoreComfort: 0 },
      { label: 'Klassisk biff med rödvinssås', scoreBody: 2, scoreComfort: -1 },
      { label: 'Marockansk tagine eller indisk curry', scoreBody: 1, scoreComfort: 2 },
      { label: 'Pasta med smör och parmesan', scoreBody: 0, scoreComfort: -2 },
    ],
  },
  {
    order: 3,
    question: 'Vilken musikstil känns rätt just nu?',
    answers: [
      { label: 'Akustiskt och lugnt', scoreBody: -2, scoreComfort: -1 },
      { label: 'Klassisk pop med tydlig melodi', scoreBody: 0, scoreComfort: -2 },
      { label: 'Något experimentellt jag aldrig hört', scoreBody: 0, scoreComfort: 2 },
      { label: 'Stora, kraftiga produktioner', scoreBody: 2, scoreComfort: 1 },
    ],
  },
  {
    order: 4,
    question: 'Drömsemestern går till...',
    answers: [
      { label: 'En kuststad i Frankrike', scoreBody: -1, scoreComfort: -2 },
      { label: 'En toskansk vingård', scoreBody: 2, scoreComfort: -1 },
      { label: 'En liten by i Georgien eller Armenien', scoreBody: 0, scoreComfort: 2 },
      { label: 'Ett hippt nystart-distrikt i Sydafrika eller Chile', scoreBody: 1, scoreComfort: 2 },
    ],
  },
  {
    order: 5,
    question: 'Vilken doft tilltalar dig mest?',
    answers: [
      { label: 'Citron och nyklippt gräs', scoreBody: -2, scoreComfort: -1 },
      { label: 'Mörka bär och tobak', scoreBody: 2, scoreComfort: -1 },
      { label: 'Jord och mossa efter regn', scoreBody: 1, scoreComfort: 2 },
      { label: 'Vita blommor och persika', scoreBody: -1, scoreComfort: 0 },
    ],
  },
  {
    order: 6,
    question: 'Sommardrycken är...',
    answers: [
      { label: 'Iskall sparkling', scoreBody: -2, scoreComfort: 0 },
      { label: 'Klassisk gin & tonic', scoreBody: 0, scoreComfort: -2 },
      { label: 'Naturlig pét-nat', scoreBody: -1, scoreComfort: 2 },
      { label: 'Mörk negroni', scoreBody: 2, scoreComfort: 0 },
    ],
  },
  {
    order: 7,
    question: 'På fest är du den som...',
    answers: [
      { label: 'Lyssnar mer än pratar', scoreBody: -1, scoreComfort: -1 },
      { label: 'Drar igång en diskussion om något oväntat', scoreBody: 0, scoreComfort: 2 },
      { label: 'Ser till att alla har det bra', scoreBody: 0, scoreComfort: -1 },
      { label: 'Är där tills bara grundgänget är kvar', scoreBody: 2, scoreComfort: 1 },
    ],
  },
  {
    order: 8,
    question: 'Vilken upplevelse drar dig mest?',
    answers: [
      { label: 'En oklanderlig restaurang med vit duk', scoreBody: 1, scoreComfort: -2 },
      { label: 'En naturvinsbar i kväll', scoreBody: 0, scoreComfort: 2 },
      { label: 'En picknick på en sommaräng', scoreBody: -2, scoreComfort: -1 },
      { label: 'Ett rökigt grillrestaurang-besök', scoreBody: 2, scoreComfort: 1 },
    ],
  },
]

async function main() {
  const payload = await getPayload({ config: await config })

  // Archetypes — upsert by `key`
  for (const a of ARCHETYPES) {
    const existing = await payload.find({
      collection: 'vinkompass-archetypes',
      where: { key: { equals: a.key } },
      limit: 1,
      depth: 0,
    })
    if (existing.docs[0]) {
      console.log(`[archetype] exists, skipping: ${a.key}`)
    } else {
      await payload.create({
        collection: 'vinkompass-archetypes',
        data: {
          key: a.key,
          name: a.name,
          tagline: a.tagline,
          beehiivTag: a.beehiivTag,
          // Lexical richText placeholder — paragraph node
          description: {
            root: {
              type: 'root',
              format: '',
              indent: 0,
              version: 1,
              children: [
                {
                  type: 'paragraph',
                  format: '',
                  indent: 0,
                  version: 1,
                  children: [{ type: 'text', text: a.description, format: 0, version: 1 }],
                },
              ],
              direction: 'ltr',
            },
          } as never,
        },
      })
      console.log(`[archetype] created: ${a.key}`)
    }
  }

  // Questions — upsert by `order`
  for (const q of QUESTIONS) {
    const existing = await payload.find({
      collection: 'vinkompass-questions',
      where: { order: { equals: q.order } },
      limit: 1,
      depth: 0,
    })
    if (existing.docs[0]) {
      console.log(`[question] exists, skipping: order=${q.order}`)
    } else {
      await payload.create({
        collection: 'vinkompass-questions',
        data: {
          order: q.order,
          question: q.question,
          helperText: q.helperText,
          answers: q.answers,
          active: true,
        },
      })
      console.log(`[question] created: order=${q.order}`)
    }
  }

  console.log('\nDone.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Add the package.json script**

In the `"scripts"` block of `package.json`, add:

```json
"seed:vinkompassen": "cross-env NODE_OPTIONS=--no-deprecation npx tsx scripts/seed-vinkompassen.ts",
```

- [ ] **Step 3: Run the seed**

Run: `pnpm seed:vinkompassen`
Expected: prints `[archetype] created: light-classic` (and 3 more), then 8 `[question] created: order=N` lines, then `Done.` Re-running prints `exists, skipping: …` for each.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-vinkompassen.ts package.json
git commit -m "feat(vinkompassen): idempotent seed script for archetypes + questions"
```

---

## Task 20: Delete v1 files

**Files:**
- Delete: `src/app/(frontend)/(site)/vinkompass/page.tsx`
- Delete: `src/app/(frontend)/(site)/vinkompass/VinkompassClient.tsx`

- [ ] **Step 1: Delete the directory**

Run:
```bash
rm -rf "src/app/(frontend)/(site)/vinkompass"
```

- [ ] **Step 2: Verify nothing else imports them**

Run: `grep -rn "/vinkompass\b\|VinkompassClient" src --include="*.ts" --include="*.tsx" 2>/dev/null`
Expected: only matches that say `vinkompassen` (with the `en`) — i.e., nothing references the old route or the old client component anymore. The middleware redirect (Task 17) still mentions `/vinkompass` but that's the source string for the redirect, which is correct.

- [ ] **Step 3: Type-check**

Run: `pnpm lint`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add -A "src/app/(frontend)/(site)/vinkompass"
git commit -m "chore(vinkompassen): remove unfinished v1"
```

---

## Task 21: End-to-end smoke test

This task has no code changes — only verification.

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev` (in foreground)
Wait for "Ready".

- [ ] **Step 2: Configure recommended wines via admin (one archetype only — manual smoke)**

- Open http://localhost:3000/admin
- Navigate to Vinkompassen → Archetypes → Den Friska Traditionalisten
- Add 6 wines from the Wines collection to `recommendedWines`
- (Optional) Set a `recommendedVinprovning`
- Save

- [ ] **Step 3: Walk through the quiz**

- Open http://localhost:3000/vinkompassen
- Click "Starta testet"
- Answer all 8 questions (any answers are fine, but try to land in `light-classic` to see the populated archetype)
- Confirm: redirected to `/vinkompassen/resultat/<attemptId>`
- Confirm: archetype name + tagline + description render
- Confirm: QuadrantMini shows the correct quadrant lit
- Confirm: email gate panel renders
- Submit your email
- Confirm: page refreshes and the wine grid renders with 6 wines + Vinprovning card if configured

- [ ] **Step 4: Verify the redirect**

Run: `curl -I http://localhost:3000/vinkompass`
Expected: `HTTP/1.1 301`, `location: /vinkompassen`

- [ ] **Step 5: Verify the OG image**

Run: `curl -s -o /tmp/og.png -w "%{http_code} %{content_type}\n" "http://localhost:3000/api/vinkompassen/og/<attemptId>"`
Expected: `200 image/png`. Open `/tmp/og.png` in Preview to eyeball.

- [ ] **Step 6: Verify PostHog events fire**

In the dev server console (or PostHog devtools), confirm `vinkompass_started`, `vinkompass_question_answered`, `vinkompass_archetype_revealed`, `vinkompass_email_submitted`, and `vinkompass_wine_clicked` (when a wine is clicked) all appear.

- [ ] **Step 7: Verify subscriber landed in DB and was tagged**

In Payload admin → CRM → Subscribers, find the row for the email you submitted. Verify:
- `source` = `vinkompassen`
- `tags` array contains `vinkompassen` and the archetype tag (e.g. `vk-light-classic`)
- `beehiivId` is set (or `lastSyncError` is set if Beehiiv env vars aren't configured locally — that's fine for smoke)

- [ ] **Step 8: Stop dev**

Stop the dev server. If everything passed, the feature is ready. Open a PR with the full series of commits.

---
