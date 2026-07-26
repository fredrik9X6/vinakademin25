# Live Tasting Phase 2 — Say What Scores: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make it visible, at the moment of answering, which inputs earn points and which do not — without changing any structure.

**Architecture:** Point values already live as constants in `src/lib/blind-guess-scoring.ts`. This phase derives every user-facing point figure from those constants rather than hardcoding "3 poäng", adds the badges and chips to the existing blind-guess card, turns the participant sidebar into an explicit standings list for blind sessions only, and corrects three pieces of copy that state the wrong option count.

**Tech Stack:** Next.js 15 App Router, React 19, Payload CMS 3.33, TypeScript, Tailwind. Tests are `node:test` + `node:assert/strict` via `npx tsx --test`.

## Global Constraints

- Package manager is **pnpm**. Never npm/yarn.
- All `@payloadcms/*` packages pinned to exact `3.33.0` — never widen to `^` or `~`.
- Payload v3 APIs only; import from `payload`, never `payload/types`.
- `src/payload-types.ts` is generated — never hand-edit it.
- User-facing copy is **Swedish**.
- **"poäng" is invariant in Swedish** — identical in singular and plural. `1 poäng`, `3 poäng`. Never write `poänger` or add a plural branch.
- **Blindness is a security property:** the server must never send an unrevealed wine's identity to a guest client. Nothing in this phase may widen what reaches the client. In particular, the pre-reveal badge must be computed from the `blindTiers` booleans the server already sends — **never** from answer values.
- **No hardcoded point numbers in components.** Every figure derives from `COUNTRY_POINTS` / `GRAPE_POINTS` / `PRICE_POINTS`.
- Never introduce a "0 p" or "poäng" label into a **non-blind** session — those sessions have no scoring at all, and saying "no points" there is noise.
- Styleguide: brand colour is used sparingly; **exactly one primary CTA per screen**. Point badges use the existing `Badge variant="brand"`; do not add new colours.
- Verify with `npx tsc --noEmit`, not `pnpm lint` alone — lint does not catch type errors in this repo.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `src/lib/blind-guess-scoring.ts` | scoring constants + pure helpers | Modify — add `TIER_POINTS`, `maxPointsForTiers`, `pointsLabel` |
| `src/lib/blind-guess-scoring.test.ts` | tests for the new helpers | Create |
| `src/components/tasting-plan/BlindGuessCard.tsx` | blind guess input + scored result | Modify — heading, badge, chips, `+0 poäng` |
| `src/components/course/SessionRoster.tsx` | live participant list | Modify — `Ställning` heading, always-visible points, blind-gated |
| `src/components/course/SessionView.tsx` | session shell | Modify — pass `blind` to the roster |
| `src/components/tasting-plan/PlanSessionContent.tsx` | session content + rating dialog | Modify — `Ger inga poäng` note in the dialog |
| `src/collections/TastingPlans.ts` | plan schema | Modify — option-count copy |
| `src/collections/CourseSessions.ts` | session schema | Modify — option-count copy |
| `src/components/tasting-plan/TastingPlanForm.tsx` | plan editor | Modify — option-count copy |

**No migration is required in this phase.** The only collection edits are `admin.description` strings, which surface as JSDoc comments in `src/payload-types.ts` and have no database schema effect. (The Phase 1 spec claimed these needed a migration — that claim was wrong; confirm it by inspecting the generated migration in Task 5 and deleting it if empty.)

---

## Task 1: Point vocabulary helpers

Components must never hardcode `3`. These pure helpers make the badge, the chips and the post-reveal total all derive from the same constants.

**Files:**
- Modify: `src/lib/blind-guess-scoring.ts` (append after the `PRICE_POINTS` constant near line 13)
- Create: `src/lib/blind-guess-scoring.test.ts`

**Interfaces:**
- Consumes: existing `COUNTRY_POINTS`, `GRAPE_POINTS`, `PRICE_POINTS` in the same file.
- Produces: `TIER_POINTS`, `maxPointsForTiers(tiers)`, `pointsLabel(n)`. Tasks 2 and 4 import them.

- [ ] **Step 1: Write the failing test**

Create `src/lib/blind-guess-scoring.test.ts`:

```ts
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  COUNTRY_POINTS,
  GRAPE_POINTS,
  PRICE_POINTS,
  TIER_POINTS,
  maxPointsForTiers,
  pointsLabel,
} from './blind-guess-scoring'

describe('TIER_POINTS', () => {
  it('mirrors the individual tier constants', () => {
    assert.equal(TIER_POINTS.country, COUNTRY_POINTS)
    assert.equal(TIER_POINTS.grape, GRAPE_POINTS)
    assert.equal(TIER_POINTS.price, PRICE_POINTS)
  })
})

describe('maxPointsForTiers', () => {
  it('sums all three enabled tiers', () => {
    assert.equal(
      maxPointsForTiers({ country: true, grape: true, price: true }),
      COUNTRY_POINTS + GRAPE_POINTS + PRICE_POINTS,
    )
  })

  it('counts only the enabled tiers', () => {
    assert.equal(
      maxPointsForTiers({ country: true, grape: false, price: true }),
      COUNTRY_POINTS + PRICE_POINTS,
    )
    assert.equal(
      maxPointsForTiers({ country: false, grape: true, price: false }),
      GRAPE_POINTS,
    )
  })

  it('is zero when no tier is enabled', () => {
    assert.equal(maxPointsForTiers({ country: false, grape: false, price: false }), 0)
  })
})

describe('pointsLabel', () => {
  // "poäng" is invariant in Swedish — identical singular and plural.
  it('uses the same word for one and many', () => {
    assert.equal(pointsLabel(1), '1 poäng')
    assert.equal(pointsLabel(3), '3 poäng')
  })

  it('renders zero without special-casing', () => {
    assert.equal(pointsLabel(0), '0 poäng')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --test src/lib/blind-guess-scoring.test.ts`
Expected: FAIL — `TIER_POINTS` / `maxPointsForTiers` / `pointsLabel` are not exported.

- [ ] **Step 3: Implement the helpers**

In `src/lib/blind-guess-scoring.ts`, immediately after the `PRICE_POINTS` constant, add:

```ts
/** Point value per guess tier, keyed the same way as `blindTiers`. */
export const TIER_POINTS = {
  country: COUNTRY_POINTS,
  grape: GRAPE_POINTS,
  price: PRICE_POINTS,
} as const

/**
 * Total points obtainable for a wine, given which tiers are active.
 *
 * The guest client is never sent the answers, only the per-tier booleans, so
 * this is the only safe way to state "N poäng" before reveal. Post-reveal the
 * same helper works with `scoreOne`'s `*Scored` flags.
 */
export function maxPointsForTiers(tiers: {
  country: boolean
  grape: boolean
  price: boolean
}): number {
  return (
    (tiers.country ? TIER_POINTS.country : 0) +
    (tiers.grape ? TIER_POINTS.grape : 0) +
    (tiers.price ? TIER_POINTS.price : 0)
  )
}

/**
 * Swedish label for a point count. "poäng" is invariant — identical in
 * singular and plural — so there is deliberately no plural branch here.
 */
export function pointsLabel(points: number): string {
  return `${points} poäng`
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx --test src/lib/blind-guess-scoring.test.ts`
Expected: PASS — 6 tests, exit 0.

- [ ] **Step 5: Include the new test in the session suite**

The `test:session` script globs `src/lib/session-*.test.ts`, which does not match this file. In `package.json`, change the `test:session` script to:

```json
    "test:session": "cross-env NODE_OPTIONS=--no-deprecation npx tsx --test src/lib/session-*.test.ts src/lib/blind-*.test.ts",
```

Run: `pnpm test:session`
Expected: 16 pass (10 existing + 6 new), 0 fail.

- [ ] **Step 6: Commit**

```bash
git add src/lib/blind-guess-scoring.ts src/lib/blind-guess-scoring.test.ts package.json
git commit -m "feat(provning): point vocabulary helpers for blind guessing

Derives every user-facing point figure from the scoring constants so no
component hardcodes 3. pointsLabel has no plural branch — poäng is invariant."
```

---

## Task 2: Point badges, deadline copy and `+0 poäng` in the guess card

Today the card's only framing is a muted `Gissa innan värden avslöjar`, with no mention of points anywhere, and a 0/3 wine shows three red crosses and no score line at all.

**Files:**
- Modify: `src/components/tasting-plan/BlindGuessCard.tsx`

**Interfaces:**
- Consumes: `maxPointsForTiers`, `pointsLabel`, `TIER_POINTS` from Task 1.
- Produces: nothing downstream.

- [ ] **Step 1: Import the helpers**

Extend the existing import from `@/lib/blind-guess-scoring` so it also pulls the three new symbols alongside `scoreOne`, `resolveAnswerPriceBucket` and the `BlindAnswer` type:

```tsx
import {
  scoreOne,
  resolveAnswerPriceBucket,
  maxPointsForTiers,
  pointsLabel,
  TIER_POINTS,
  type BlindAnswer,
} from '@/lib/blind-guess-scoring'
```

- [ ] **Step 2: Always show the post-reveal score, including zero**

Find this block (the reveal-mode result, currently around line 242):

```tsx
        {scored.points > 0 && (
          <p className="pt-1 text-xs text-brand-400 font-medium">
            +{scored.points} {scored.points === 1 ? 'poäng' : 'poäng'}
          </p>
        )}
```

Replace it with:

```tsx
        {/* Always rendered, including +0 poäng. Suppressing the zero case left a
            0/3 wine showing three red crosses and no score at all, which reads
            as "not counted" rather than "counted, and you got none". */}
        <p
          className={`pt-1 text-xs font-medium ${
            scored.points > 0 ? 'text-brand-400' : 'text-muted-foreground'
          }`}
        >
          +{scored.points} av{' '}
          {pointsLabel(
            maxPointsForTiers({
              country: scored.countryScored,
              grape: scored.grapeScored,
              price: scored.priceScored,
            }),
          )}
        </p>
```

Note this also removes the dead ternary (`points === 1 ? 'poäng' : 'poäng'` — both branches were identical).

- [ ] **Step 3: Rewrite the edit-mode header with a points badge and deadline**

Find the header block in the edit-mode return (currently around lines 315-324), which reads:

```tsx
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Gissa innan värden avslöjar
        </p>
        {isEasyMode && (
```

Replace the whole `<div>` (through its closing `</div>`, i.e. including the `isEasyMode` badge) with:

```tsx
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Deliberately a <p>, not an <h2>. The wine's own name is still a
              <p> in this phase, so promoting this subsection to a real heading
              would invert the hierarchy. Heading semantics land in Phase 3
              when the card is restructured. */}
          <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Blindgissning
          </p>
          <Badge variant="brand">{pointsLabel(maxPointsForTiers(show))}</Badge>
          {isEasyMode && (
            <span className="inline-flex items-center rounded-full bg-brand-400/10 text-brand-400 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
              Lättare läge
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Låses när värden avslöjar vinet</p>
      </div>
```

`show` is the already-computed `blindTiers ?? { country: true, grape: true, price: true }` local, so the badge reflects exactly the tiers this wine renders — a two-tier wine reads `2 poäng`, not `3`.

Add the `Badge` import at the top of the file:

```tsx
import { Badge } from '@/components/ui/badge'
```

- [ ] **Step 4: Add per-field point chips**

Each of the three `<Select>` blocks in edit mode is currently a bare select. Wrap each so a point chip sits above it. For the country select, replace:

```tsx
        {show.country && (
          <Select
```

…through that select's closing `</Select>` `)}` with:

```tsx
        {show.country && (
          <div className="space-y-1">
            <TierPointChip label="Land" points={TIER_POINTS.country} />
            <Select
              value={editing.country ?? ''}
              onValueChange={(v) => updateField({ country: v || null })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Land" />
              </SelectTrigger>
              <SelectContent>
                {countryOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
```

Apply the same shape to the grape block (`label="Druva"`, `points={TIER_POINTS.grape}`, placeholder `Druva`, options `grapeOptions`, field `grape`) and the price block (`label="Pris"`, `points={TIER_POINTS.price}`, placeholder `Pris`, options `PRICE_BUCKETS` mapped by `b.value`/`b.label`, field `priceBucket` cast as `PriceBucket | null`). Keep every existing prop and handler exactly as it is — only the wrapper and the chip are new.

Then add this small component near the bottom of the file, beside the existing `SaveStatusLabel`:

```tsx
/** Field label plus its point value, e.g. "Land · 1 p". */
function TierPointChip({ label, points }: { label: string; points: number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-[11px] font-medium tabular-nums text-brand-400">{points} p</span>
    </div>
  )
}
```

- [ ] **Step 5: Verify**

Run: `pnpm test:session` (expect 16/16), then `pnpm lint`, then `npx tsc --noEmit 2>&1 | grep -i BlindGuessCard` (expect empty).

Confirm by reading your diff that the `shownTierCount === 0` early return and the locked-in summary branch are untouched.

- [ ] **Step 6: Commit**

```bash
git add src/components/tasting-plan/BlindGuessCard.tsx
git commit -m "feat(provning): show what scores in the blind guess card

Adds a Blindgissning heading with a derived points badge, a per-field point
chip, the lock deadline, and an always-rendered score line so a 0/3 wine shows
+0 poäng instead of nothing."
```

---

## Task 3: State that tasting notes do not score

**Files:**
- Modify: `src/components/tasting-plan/PlanSessionContent.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: nothing downstream.

- [ ] **Step 1: Add the note to the rating dialog header**

Find the rating dialog's header, which reads:

```tsx
          <DialogHeader>
            <DialogTitle>Betygsätt: {reviewing?.title}</DialogTitle>
          </DialogHeader>
```

Replace it with:

```tsx
          <DialogHeader>
            <DialogTitle>Betygsätt: {reviewing?.title}</DialogTitle>
            {isBlind && (
              // Only in a blind session — a non-blind tasting has no scoring at
              // all, so mentioning points there is noise rather than clarity.
              <DialogDescription>
                Din smaknotering ger inga poäng — bara blindgissningen räknas.
              </DialogDescription>
            )}
          </DialogHeader>
```

`isBlind` is an existing local in this component (`const isBlind = Boolean((session as any).blindTasting)`).

- [ ] **Step 2: Import `DialogDescription`**

Extend the existing `@/components/ui/dialog` import to include `DialogDescription`. Confirm it is exported by `src/components/ui/dialog.tsx` before relying on it; if it is not, add a plain `<p className="text-sm text-muted-foreground">` inside the header instead and say so in your report.

- [ ] **Step 3: Verify**

Run: `pnpm lint`, then `npx tsc --noEmit 2>&1 | grep -i PlanSessionContent` (expect empty).

- [ ] **Step 4: Commit**

```bash
git add src/components/tasting-plan/PlanSessionContent.tsx
git commit -m "feat(provning): say that tasting notes do not score

Blind sessions only — a non-blind tasting has no scoring, so the note would be
noise there."
```

---

## Task 4: Turn the sidebar into explicit standings

The sidebar already **is** the leaderboard — the server sorts it by points descending — but it is titled "Deltagare (N)" and hides the number entirely when `points === 0`, so a player on zero sees nothing at all.

**Files:**
- Modify: `src/components/course/SessionRoster.tsx`
- Modify: `src/components/course/SessionView.tsx` (the plan-session render, around line 194)

**Interfaces:**
- Consumes: `pointsLabel` is **not** needed here — the compact `N p` form is correct in a narrow sidebar.
- Produces: `SessionRoster` gains an optional `blind?: boolean` prop, default `false`.

- [ ] **Step 1: Add the prop**

In `src/components/course/SessionRoster.tsx`, extend the props interface:

```tsx
interface SessionRosterProps {
  /** Optional: when provided, used to show lesson titles instead of just IDs. */
  lessonTitleById?: Map<number, string>
  /**
   * True in a blind tasting. Switches the card into standings mode: the heading
   * becomes "Ställning" and every participant shows a point total including 0.
   * Non-blind sessions have no scoring at all, so points stay hidden there.
   */
  blind?: boolean
}
```

and the signature:

```tsx
export function SessionRoster({ lessonTitleById, blind = false }: SessionRosterProps) {
```

- [ ] **Step 2: Always render points in blind sessions**

Find:

```tsx
        {p.points > 0 && (
          <span className="text-xs font-medium text-brand-400 flex-shrink-0 tabular-nums">
            {p.points} p
          </span>
        )}
```

Replace with:

```tsx
        {/* Rendered for every participant in a blind session, zero included —
            hiding "0 p" meant a player at the bottom saw no score at all and
            could not tell the sidebar was a ranking. Non-blind sessions have no
            scoring, so nothing is shown there. */}
        {blind && (
          <span
            className={`text-xs font-medium flex-shrink-0 tabular-nums ${
              p.points > 0 ? 'text-brand-400' : 'text-muted-foreground'
            }`}
          >
            {p.points} p
          </span>
        )}
```

Note the participant row is rendered by an inner helper function; `blind` is in scope there via closure. Verify that is true where you make the edit — if the helper is defined outside the component body, thread `blind` through as a parameter instead and say so in your report.

- [ ] **Step 3: Rename the heading in blind sessions**

Find:

```tsx
          Deltagare ({participants.length})
```

Replace with:

```tsx
          {blind ? 'Ställning' : `Deltagare (${participants.length})`}
```

- [ ] **Step 4: Pass the flag from the plan session**

In `src/components/course/SessionView.tsx`, in the `isPlanSession && session` branch, change:

```tsx
          sidebarExtra={<SessionRoster lessonTitleById={new Map()} />}
```

to:

```tsx
          sidebarExtra={
            <SessionRoster
              lessonTitleById={new Map()}
              blind={Boolean((session as { blindTasting?: boolean }).blindTasting)}
            />
          }
```

Leave the three course-session call sites unchanged — a video course is never a blind tasting, and the prop defaults to `false`.

- [ ] **Step 5: Verify**

Run: `pnpm lint`, then `npx tsc --noEmit 2>&1 | grep -iE "SessionRoster|SessionView"` (expect empty).

- [ ] **Step 6: Commit**

```bash
git add src/components/course/SessionRoster.tsx src/components/course/SessionView.tsx
git commit -m "feat(provning): sidebar reads as standings in blind sessions

The roster was already sorted by points but titled 'Deltagare' and hid the
number at zero, so a player at the bottom saw no score at all."
```

---

## Task 5: Correct the option-count copy

Three strings claim blind-guess dropdowns show "4 alternativ (correct + 3 decoys)". The code uses `GUESS_OPTION_COUNT = 5` — correct plus **four** decoys. Fix the copy, not the constant.

**Files:**
- Modify: `src/collections/TastingPlans.ts` (the `blindGuessEasyModeByDefault` description)
- Modify: `src/collections/CourseSessions.ts` (the `blindGuessEasyMode` description)
- Modify: `src/components/tasting-plan/TastingPlanForm.tsx` (the Swedish helper text)

**Interfaces:** none.

- [ ] **Step 1: Fix the plan collection description**

In `src/collections/TastingPlans.ts`, replace:

```
'Easy mode: blind-guess dropdowns show only 4 options (correct + 3 decoys) instead of the full list. Default for sessions started from this plan.',
```

with:

```
'Easy mode: blind-guess dropdowns show only 5 options (correct + 4 decoys) instead of the full list. Default for sessions started from this plan.',
```

- [ ] **Step 2: Fix the session collection description**

In `src/collections/CourseSessions.ts`, replace:

```
'When true, blind-guess dropdowns surface only 4 options per tier (correct + 3 decoys). Stamped from plan.blindGuessEasyModeByDefault at create-time.',
```

with:

```
'When true, blind-guess dropdowns surface only 5 options per tier (correct + 4 decoys). Stamped from plan.blindGuessEasyModeByDefault at create-time.',
```

- [ ] **Step 3: Fix the Swedish helper text**

In `src/components/tasting-plan/TastingPlanForm.tsx`, replace:

```
                  — gäster väljer från 4 alternativ per fråga istället för hela listan.
```

with:

```
                  — gäster väljer från 5 alternativ per fråga istället för hela listan.
```

- [ ] **Step 4: Confirm the constant really is 5**

Run: `grep -n "GUESS_OPTION_COUNT" "src/app/(frontend)/(site)/mina-provningar/planer/[id]/page.tsx"`
Expected: `const GUESS_OPTION_COUNT = 5`, used twice. If it is not 5, **stop and report** — the copy may have been right and the constant wrong.

- [ ] **Step 5: Regenerate types and confirm no migration is needed**

Run: `pnpm generate:types`

`admin.description` surfaces only as a JSDoc comment in `src/payload-types.ts` — it has no database schema effect, so **no migration should be required**. Confirm by running:

`DATABASE_URI="<staging URI>" pnpm migrate:create -- "verify_no_schema_change"`

using the staging connection string from `/private/tmp/claude-501/-Users-fredrik-dev-vinakademin25/1e428173-661c-467c-95f6-773408755bd2/scratchpad/staging-db.env`. **Never let this command pick up `.env` — that points at production.**

Read the generated migration. If its `up` is empty (no SQL statements), **delete both generated files and revert the `src/migrations/index.ts` edit** — there is no schema change to record. If it contains SQL, **stop and report**, because that means something other than a description changed.

Do **not** run `pnpm payload migrate` against any database.

- [ ] **Step 6: Verify**

Run: `pnpm lint` and `npx tsc --noEmit 2>&1 | wc -l` (must not exceed 75).

- [ ] **Step 7: Commit**

```bash
git add src/collections/TastingPlans.ts src/collections/CourseSessions.ts src/components/tasting-plan/TastingPlanForm.tsx src/payload-types.ts
git commit -m "fix(provning): copy said 4 guess options, code shows 5

GUESS_OPTION_COUNT is 5 (correct + 4 decoys). Three strings claimed 4.
Description-only change: no schema effect, no migration."
```

---

## Task 6: Regression pass

**Files:** none modified — verification only.

- [ ] **Step 1: Run every automated check**

```bash
pnpm test:session
npx tsx scripts/verify-session-draft-queue.ts
npx tsx scripts/verify-submission-status.ts
pnpm lint
npx tsc --noEmit 2>&1 | wc -l
pnpm build
```

Expected: `test:session` 16/16; draft queue 30/30; submission status 17 passed; lint 0 errors; tsc ≤ 75 lines; build succeeds.

- [ ] **Step 2: Confirm no point figure is hardcoded**

Run: `grep -rn "3 poäng\|2 poäng\|1 poäng" src/components/ || echo "clean"`
Expected: `clean` — every figure must come from `pointsLabel(maxPointsForTiers(...))`.

- [ ] **Step 3: Confirm non-blind sessions gained no scoring copy**

Read the diff for `SessionRoster.tsx` and `PlanSessionContent.tsx` and confirm every new points string is behind a `blind` check. A video-course session must look exactly as it did before this phase.

---

## Deferred to later phases

The spec's §8 copy table also defines strings for structures that do not exist yet, and they are deliberately **not** in this phase:

| String | Blocked on |
|---|---|
| `SMAKNOTERING` section heading | Phase 3 — the notes move out of the modal into a section |
| `Klar med vin #2` | Phase 3 — the single commit button |
| `Klar` + `Ändra` summary | Phase 3 |
| `→ Värden är nu på vin #3` | Phase 4 — the focus nudge |
| `Värden avslöjar vin #2…` | Phase 4 — the reveal moment |
| `Vin #2 avslöjat` · `Ångra` | Phase 4 — host reveal undo |

Also deferred: hiding "Publicera på min profil" for guest participants (spec §11.2) — it is a visual change tied to the Phase 3 form restructure.
