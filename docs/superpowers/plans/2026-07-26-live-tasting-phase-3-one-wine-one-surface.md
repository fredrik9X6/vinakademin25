# Live Tasting Phase 3 — One Wine, One Surface: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put everything a participant does for one wine on one surface, committed once — and make it usable on a phone held in one hand.

**Architecture:** Two discoveries during planning made this far cheaper than the spec assumed, and the plan is built on them.

1. **`WineReviewForm` is already inline-renderable.** It returns a plain `<div><form>` with no Dialog-specific wrapper. Its `insideDialog` prop does exactly one thing: set `modalPopover` on seven `MultiSelect` components. The spec's proposed `TastingNoteFields` extraction — lifting ~30 pieces of local state out of a 1375-line component — is therefore **unnecessary** and is dropped. We move where the component renders, not what it contains.
2. **The flavour vocabularies are tiny** — `PRIMARY_VOCAB` 8 options, `SECONDARY_VOCAB` 4, `TERTIARY_VOCAB` 3. The cmdk `MultiSelect` (a Popover with a typed search input) is wildly over-built for 8 options, and production data shows it is the single most rage-clicked control in the product. Replacing it with tap-chips fixes the mobile problem **and** removes the only reason `insideDialog`/`modalPopover` exists — which in turn unblocks inline rendering.

So the order is deliberate: kill the popovers first, then move the form inline, then unify the commit.

**Tech Stack:** Next.js 15 App Router, React 19, Payload CMS 3.33, TypeScript, Tailwind. Tests are `node:test` + `node:assert/strict` via `npx tsx --test`.

## Global Constraints

- Package manager is **pnpm**. Never npm/yarn.
- All `@payloadcms/*` pinned to exact `3.33.0` — never widen to `^`/`~`.
- Payload v3 APIs only; import from `payload`, never `payload/types`.
- `src/payload-types.ts` is generated — never hand-edit.
- User-facing copy is **Swedish**. "poäng" is invariant (`1 poäng`, `3 poäng`).
- **Blindness is a security property:** the server must never send an unrevealed wine's identity to a guest client. Phase 1 hardened `POST /api/reviews`, `GET /api/reviews` and `GET /api/sessions/[id]/my-submissions` for this. Any new endpoint must uphold it, and any new response must be checked against it.
- **Touch targets ≥ 44 px** on every control a participant uses during a live session. Current defaults are all below: `Button` `sm` = `h-8`, `default` = `h-9`; `Select` trigger and `Input` = `h-9`.
- `tailwind.config.js` has **no `screens` key**, so there is **no `xs` breakpoint**. `hidden xs:inline` is dead code that never shows. Do not copy that pattern.
- Any new sticky bottom bar must clear `MobileBottomNav` (`fixed bottom-0`, h-16, `pb-[env(safe-area-inset-bottom)]`), the layout's `pb-20 md:pb-0` on `<main>`, and the sonner offset `calc(72px + env(safe-area-inset-bottom))`.
- Styleguide: **exactly one primary CTA per screen**. The per-wine commit button is that CTA for the participant; nothing else in the wine card may use `.btn-brand`.
- Verify with `npx tsc --noEmit`, not `pnpm lint` alone — lint does not catch type errors in this repo. Current ceiling: **75 lines**.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `src/components/ui/chip-multi-select.tsx` | tap-to-toggle multi-select for small vocabularies | Create |
| `src/components/ui/chip-multi-select.test.tsx` | — | **Not created**: this is presentational; behaviour is covered by the pure helper below |
| `src/lib/chip-selection.ts` | pure toggle/ordering logic | Create |
| `src/lib/chip-selection.test.ts` | tests for the above | Create |
| `src/components/course/WineReviewForm.tsx` | review form | Modify — chips replace MultiSelect; drop `insideDialog` |
| `src/components/tasting-plan/PlanSessionContent.tsx` | session content | Modify — inline the form, single commit button |
| `src/app/api/sessions/[sessionId]/wines/[pourOrder]/commit/route.ts` | one-shot commit | Create |
| `src/lib/session-commit.ts` | pure commit-result shaping | Create |
| `src/lib/session-commit.test.ts` | tests | Create |

---

## Task 1: Pure chip-selection logic

The chip component itself is presentational; the part worth testing is the selection behaviour.

**Files:**
- Create: `src/lib/chip-selection.ts`
- Create: `src/lib/chip-selection.test.ts`

**Interfaces:**
- Produces: `toggleChip(selected: readonly string[], value: string, max?: number): string[]`. Task 2 consumes it.

- [ ] **Step 1: Write the failing test**

Create `src/lib/chip-selection.test.ts`:

```ts
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { toggleChip } from './chip-selection'

describe('toggleChip', () => {
  it('adds a value that is not selected', () => {
    assert.deepEqual(toggleChip([], 'Citrus'), ['Citrus'])
    assert.deepEqual(toggleChip(['Bär'], 'Citrus'), ['Bär', 'Citrus'])
  })

  it('removes a value that is already selected', () => {
    assert.deepEqual(toggleChip(['Bär', 'Citrus'], 'Bär'), ['Citrus'])
  })

  it('preserves the order the user selected in', () => {
    let s: string[] = []
    s = toggleChip(s, 'C')
    s = toggleChip(s, 'A')
    s = toggleChip(s, 'B')
    assert.deepEqual(s, ['C', 'A', 'B'])
  })

  it('does not mutate the input array', () => {
    const input = ['Bär']
    const out = toggleChip(input, 'Citrus')
    assert.deepEqual(input, ['Bär'])
    assert.notEqual(out, input)
  })

  it('ignores an add that would exceed max, but still allows removal', () => {
    assert.deepEqual(toggleChip(['A', 'B'], 'C', 2), ['A', 'B'])
    assert.deepEqual(toggleChip(['A', 'B'], 'A', 2), ['B'])
  })

  it('treats an absent max as unlimited', () => {
    assert.deepEqual(toggleChip(['A', 'B'], 'C'), ['A', 'B', 'C'])
  })

  it('is a no-op for a blank value', () => {
    assert.deepEqual(toggleChip(['A'], ''), ['A'])
    assert.deepEqual(toggleChip(['A'], '   '), ['A'])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx tsx --test src/lib/chip-selection.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/lib/chip-selection.ts`:

```ts
/**
 * Selection logic for tap-to-toggle chips.
 *
 * Kept pure and separate from the component so it can be tested without a DOM.
 * Selection order is preserved deliberately: a taster's first-named aroma is
 * meaningful, and re-sorting under them as they tap is disorienting.
 */
export function toggleChip(
  selected: readonly string[],
  value: string,
  max?: number,
): string[] {
  if (!value || value.trim() === '') return [...selected]
  const idx = selected.indexOf(value)
  if (idx >= 0) {
    // Removal is always allowed, even when already at/over `max`.
    return selected.filter((v) => v !== value)
  }
  if (typeof max === 'number' && selected.length >= max) return [...selected]
  return [...selected, value]
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx tsx --test src/lib/chip-selection.test.ts`
Expected: PASS — 7 tests.

- [ ] **Step 5: Add to the test glob**

In `package.json`, extend `test:session` so it also matches `src/lib/chip-*.test.ts`:

```json
    "test:session": "cross-env NODE_OPTIONS=--no-deprecation npx tsx --test src/lib/session-*.test.ts src/lib/blind-*.test.ts src/lib/chip-*.test.ts",
```

Run: `pnpm test:session`
Expected: **23** pass (16 existing + 7 new), 0 fail.

- [ ] **Step 6: Commit**

```bash
git add src/lib/chip-selection.ts src/lib/chip-selection.test.ts package.json
git commit -m "feat(provning): pure toggle logic for chip multi-select

Selection order is preserved on purpose — a taster's first-named aroma carries
meaning and re-sorting under their thumb is disorienting."
```

---

## Task 2: Replace the flavour MultiSelect with tap-chips

Production analytics: the cmdk `MultiSelect` (Popover + typed search input) is the **single most rage-clicked control in the product** — 7 rage-clicks from 2 people, mobile only. It wraps vocabularies of 8, 4 and 3 options. A typed search over 8 options, inside a popover, on a phone, at a dinner table, is the wrong control.

**Files:**
- Create: `src/components/ui/chip-multi-select.tsx`
- Modify: `src/components/course/WineReviewForm.tsx`

**Interfaces:**
- Consumes: `toggleChip` from Task 1.
- Produces: `<ChipMultiSelect options={{label,value}[]} value={string[]} onValueChange={(v: string[]) => void} ariaLabel={string} />`.

> **Plan correction (2026-07-26).** An earlier draft of this task claimed the
> vocabularies were 8 / 4 / 3 options. That was a mis-measurement. The real sizes
> are **`PRIMARY_VOCAB` 45, `SECONDARY_VOCAB` 21, `TERTIARY_VOCAB` 15** — a
> 45-chip wall would be *worse* on mobile than the popover it replaces. The gate
> in Step 1 caught this before any code was written.
>
> What makes chips still correct is `SUGGESTIONS` in the same file: a per-wine-type,
> per-tier pre-ranked subset of **5–12 entries**, which `buildFlavourOptions`
> already emits *first*, grouped under "Föreslagna för {type}", with the remainder
> following under "Alla". The file's own doc comment says this exists "to pre-rank
> the chips".
>
> So the design is: **render the first N options as chips, put the rest behind a
> "Visa alla" disclosure.** Because suggested options already sort first, that one
> rule does the right thing in every case:
>
> | Case | Chips shown | Behind disclosure |
> |---|---|---|
> | red/white primary (12 suggested) | the 12 suggestions | 33 |
> | rosé/sparkling primary (8 suggested) | the 8 suggestions | 37 |
> | **tertiary — zero suggestions for every type** | first 12 alphabetically | 3 |
> | **wineType `other`/null — no suggestions at all** | first 12 | 33 |
>
> The two bolded rows are why the rule must not depend on grouping being present.

- [ ] **Step 1: Confirm the vocabulary and suggestion sizes**

Run: `cat src/lib/wset-flavour-vocab.ts`

Confirm: the three vocabularies are roughly 45 / 21 / 15; `SUGGESTIONS` gives 5–12 entries per (wineType, tier) for the `primary` and `secondary` tiers; and `tertiary` has **no** suggestions for any type. Confirm `buildFlavourOptions` returns `GroupedOption[]` with suggested entries first.

If any of that no longer holds, **stop and report** rather than adapting silently.

- [ ] **Step 2: Build the chip component**

Create `src/components/ui/chip-multi-select.tsx`:

```tsx
'use client'

import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toggleChip } from '@/lib/chip-selection'

export interface ChipOption {
  label: string
  value: string
}

export interface ChipMultiSelectProps {
  /** Ordered options. `buildFlavourOptions` already puts suggestions first. */
  options: ChipOption[]
  value: string[]
  onValueChange: (value: string[]) => void
  /** Accessible name for the group, e.g. "Smaker du känner igen". */
  ariaLabel: string
  /** How many chips to show before the "Visa alla" disclosure. */
  visibleCount?: number
  className?: string
}

const DEFAULT_VISIBLE = 12

/**
 * Tap-to-toggle multi-select.
 *
 * Replaces the cmdk Popover + typed-search MultiSelect on the tasting-note
 * form — the most rage-clicked control in the product, on mobile, at a dinner
 * table. Chips need one tap, no keyboard, and no overlay.
 *
 * The vocabularies are large (45 / 21 / 15), so only the first `visibleCount`
 * options render initially and the rest sit behind a disclosure. Callers pass
 * options from `buildFlavourOptions`, which orders the wine-type suggestions
 * first — so the visible chips are the plausible ones without this component
 * needing to know anything about wine.
 *
 * Any already-selected option is always rendered, even when it falls in the
 * hidden remainder: a selection the user cannot see is worse than a long list.
 *
 * Every chip is min-h-11 (44px) to meet the touch-target floor.
 */
export function ChipMultiSelect({
  options,
  value,
  onValueChange,
  ariaLabel,
  visibleCount = DEFAULT_VISIBLE,
  className,
}: ChipMultiSelectProps) {
  const [showAll, setShowAll] = React.useState(false)

  const shown = React.useMemo(() => {
    if (showAll || options.length <= visibleCount) return options
    const head = options.slice(0, visibleCount)
    const headValues = new Set(head.map((o) => o.value))
    // Keep selected-but-hidden options visible so a selection is never invisible.
    const selectedTail = options.filter(
      (o) => !headValues.has(o.value) && value.includes(o.value),
    )
    return [...head, ...selectedTail]
  }, [options, showAll, visibleCount, value])

  const hiddenCount = options.length - shown.length

  return (
    <div className={cn('space-y-2', className)}>
      <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-2">
        {shown.map((opt) => {
          const selected = value.includes(opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              role="checkbox"
              aria-checked={selected}
              onClick={() => onValueChange(toggleChip(value, opt.value))}
              className={cn(
                'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selected
                  ? 'border-brand-400 bg-brand-400/10 text-brand-400 font-medium'
                  : 'border-input bg-background text-foreground hover:bg-accent',
              )}
            >
              {selected && <Check className="h-3.5 w-3.5" aria-hidden />}
              {opt.label}
            </button>
          )
        })}
      </div>
      {(hiddenCount > 0 || showAll) && (
        <button
          type="button"
          onClick={() => setShowAll((s) => !s)}
          className="min-h-11 text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          {showAll ? 'Visa färre' : `Visa alla (${options.length})`}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Swap all seven usages**

In `src/components/course/WineReviewForm.tsx`, replace every `<MultiSelect ... />` with `<ChipMultiSelect ... />`. There are **seven**: one in the `simple` tab ("Smaker du känner igen") and six in the `advanced` tab (primary/secondary/tertiary aromas and primary/secondary/tertiary flavours).

For each, the mapping is mechanical:
- `options={X}` → unchanged
- `value={Y}` → unchanged
- `onValueChange={setY}` → unchanged
- `placeholder="..."` → **removed** (chips are always visible; there is nothing to placehold)
- `modalPopover={insideDialog}` → **removed**
- `className="w-full"` → removed (the group is already full-width)
- add `ariaLabel` — use the surrounding `InputRow`'s `label` text verbatim, e.g. `ariaLabel="Smaker du känner igen"`

Then remove the now-unused `MultiSelect` import.

- [ ] **Step 4: Delete the dead `insideDialog` prop**

With `modalPopover` gone, `insideDialog` has no remaining use — verify with `grep -n "insideDialog" src/components/course/WineReviewForm.tsx` (expect only the prop declaration and destructure). Remove it from `WineReviewFormProps`, from the destructured parameter list, and from the single call site in `src/components/tasting-plan/PlanSessionContent.tsx`.

Do **not** delete `src/components/ui/multi-select.tsx` — grep for other consumers first (`grep -rn "MultiSelect" src/ | grep -v WineReviewForm`) and leave the component in place if anything else uses it.

- [ ] **Step 5: Verify**

```bash
pnpm test:session                                     # 23/23
pnpm lint
npx tsc --noEmit 2>&1 | grep -iE "WineReviewForm|chip-multi" # empty
npx tsc --noEmit 2>&1 | wc -l                          # ≤ 75
grep -c "modalPopover" src/components/course/WineReviewForm.tsx  # 0
```

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/chip-multi-select.tsx src/components/course/WineReviewForm.tsx src/components/tasting-plan/PlanSessionContent.tsx
git commit -m "feat(provning): tap-chips replace the flavour MultiSelect

The cmdk popover + typed search was the most rage-clicked control in the
product, wrapping vocabularies of 8/4/3 options. Chips are one tap, no
keyboard, no overlay, 44px targets. Removes the now-dead insideDialog prop."
```

---

## Task 3: Render the tasting note inline

The rating form currently lives behind a `Dialog`, which is why "Betygsätt" reads as a separate errand rather than part of the wine. With the popovers gone, the form renders inline unchanged.

**Files:**
- Modify: `src/components/tasting-plan/PlanSessionContent.tsx`

**Interfaces:** none new.

- [ ] **Step 1: Add a per-wine expansion state**

Rendering every wine's full form at once would make a six-wine list unusable. Add local state tracking which pour is expanded, defaulting to the host's current focus:

```tsx
  const [expandedPour, setExpandedPour] = React.useState<number | null>(null)
```

The effective expanded pour is `expandedPour ?? activePour` — so the wine the host is talking about is open by default, and the participant can open a different one.

- [ ] **Step 2: Replace the Betygsätt button with a disclosure**

Where the `Betygsätt` button currently sits, render a full-width disclosure control showing the wine's completion state:

```tsx
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedPour(isExpanded ? -1 : row.pourOrder)
                            }
                            aria-expanded={isExpanded}
                            className="flex min-h-11 w-full items-center justify-between rounded-md border border-input px-3 text-sm hover:bg-accent"
                          >
                            <span className="font-medium">Din smaknotering</span>
                            <span className="text-xs text-muted-foreground">
                              {submittedPourOrders.has(row.pourOrder) ? 'Klar' : 'Ej klar'}
                            </span>
                          </button>
```

with `const isExpanded = (expandedPour ?? activePour) === row.pourOrder` computed alongside `isActive` in the row scope. Note the `-1` sentinel: it means "explicitly collapsed", distinct from `null` ("follow the host").

- [ ] **Step 3: Render the form inline when expanded**

Directly beneath the disclosure, inside the same wine card, render the form the dialog used to hold:

```tsx
                        {isExpanded && (
                          <div className="mt-3 rounded-md border bg-card p-3">
                            {isBlind && (
                              <p className="mb-3 text-xs text-muted-foreground">
                                Din smaknotering ger inga poäng — bara blindgissningen räknas.
                              </p>
                            )}
                            <WineReviewForm
                              key={`review-${row.pourOrder}`}
                              lessonId={0}
                              sessionId={String(session.id)}
                              pourOrder={row.pourOrder}
                              {...(displayRow.libraryWineId
                                ? { wineIdProp: displayRow.libraryWineId }
                                : {})}
                              {...(displayRow.customWineSnapshot
                                ? { customWineSnapshot: displayRow.customWineSnapshot }
                                : {})}
                              onRestored={() => setRestoredBanner(true)}
                              onSubmit={() => {
                                setSubmittedPourOrders((prev) =>
                                  new Set([...prev, row.pourOrder]),
                                )
                              }}
                            />
                          </div>
                        )}
```

Note `onSubmit` no longer closes anything — there is no dialog to close. The section stays open so the participant sees their locked state.

- [ ] **Step 4: Delete the dialog**

Remove the `<Dialog open={!!reviewing} …>` block entirely, along with the `reviewing` state and `setReviewing`. Verify no references remain: `grep -n "reviewing" src/components/tasting-plan/PlanSessionContent.tsx` should return nothing.

Remove now-unused `Dialog*` imports **only** if no other dialog in the file uses them — this file also has `AlertDialog`s and a `Sheet`, so check before deleting.

- [ ] **Step 5: Verify**

```bash
pnpm test:session          # 23/23
pnpm lint
npx tsc --noEmit 2>&1 | grep -i PlanSessionContent   # empty
npx tsc --noEmit 2>&1 | wc -l                        # ≤ 75
```

- [ ] **Step 6: Commit**

```bash
git add src/components/tasting-plan/PlanSessionContent.tsx
git commit -m "feat(provning): tasting note renders inline, not in a dialog

Betygsätt read as a separate errand because the form lived behind a modal. It
is now a disclosure inside the wine card, open by default on the wine the host
is presenting, and showing Klar/Ej klar per wine."
```

---

## Task 4: One commit per wine

Today a blind guest performs **two** explicit lock-ins on two surfaces against two endpoints. This makes it one.

**Files:**
- Create: `src/lib/session-commit.ts`, `src/lib/session-commit.test.ts`
- Create: `src/app/api/sessions/[sessionId]/wines/[pourOrder]/commit/route.ts`
- Modify: `src/components/tasting-plan/PlanSessionContent.tsx`

**Interfaces:**
- Produces: `POST /api/sessions/[sessionId]/wines/[pourOrder]/commit`, body `{ guess?: object, review?: object }`, response `{ guess: 'ok'|'skipped'|'failed', review: 'ok'|'skipped'|'failed', ok: boolean }`.
- Produces: `summariseCommit(parts): { ok: boolean; message: string }` from `session-commit.ts`.

- [ ] **Step 1: Write the failing test for the result shaping**

Create `src/lib/session-commit.test.ts`:

```ts
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { summariseCommit } from './session-commit'

describe('summariseCommit', () => {
  it('is ok when every attempted part succeeded', () => {
    assert.deepEqual(summariseCommit({ guess: 'ok', review: 'ok' }), {
      ok: true,
      message: 'Sparat',
    })
  })

  it('is ok when a part was legitimately skipped', () => {
    assert.deepEqual(summariseCommit({ guess: 'skipped', review: 'ok' }), {
      ok: true,
      message: 'Sparat',
    })
  })

  it('is ok when both parts were skipped — nothing to save is not an error', () => {
    assert.equal(summariseCommit({ guess: 'skipped', review: 'skipped' }).ok, true)
  })

  it('names the guess when only the guess failed', () => {
    const r = summariseCommit({ guess: 'failed', review: 'ok' })
    assert.equal(r.ok, false)
    assert.equal(r.message, 'Gissningen kunde inte sparas')
  })

  it('names the note when only the note failed', () => {
    const r = summariseCommit({ guess: 'ok', review: 'failed' })
    assert.equal(r.ok, false)
    assert.equal(r.message, 'Smaknoteringen kunde inte sparas')
  })

  it('reports both when both failed', () => {
    const r = summariseCommit({ guess: 'failed', review: 'failed' })
    assert.equal(r.ok, false)
    assert.equal(r.message, 'Inget kunde sparas')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx tsx --test src/lib/session-commit.test.ts` → FAIL, module not found.

- [ ] **Step 3: Implement the shaping**

Create `src/lib/session-commit.ts`:

```ts
export type CommitPartResult = 'ok' | 'skipped' | 'failed'

export interface CommitParts {
  guess: CommitPartResult
  review: CommitPartResult
}

/**
 * Collapse the per-part outcomes into one user-facing verdict.
 *
 * A partial failure must never read as success: the participant pressed one
 * button and is entitled to one honest answer about whether their work is
 * safe. "skipped" means the client sent nothing for that part, which is not a
 * failure.
 */
export function summariseCommit(parts: CommitParts): { ok: boolean; message: string } {
  const guessFailed = parts.guess === 'failed'
  const reviewFailed = parts.review === 'failed'
  if (guessFailed && reviewFailed) return { ok: false, message: 'Inget kunde sparas' }
  if (guessFailed) return { ok: false, message: 'Gissningen kunde inte sparas' }
  if (reviewFailed) return { ok: false, message: 'Smaknoteringen kunde inte sparas' }
  return { ok: true, message: 'Sparat' }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test:session` → **29** pass (23 + 6), 0 fail.

- [ ] **Step 5: Build the commit endpoint**

Create `src/app/api/sessions/[sessionId]/wines/[pourOrder]/commit/route.ts`.

It must:
- Accept `POST` with body `{ guess?: object, review?: object }`.
- Resolve caller identity exactly as the existing routes do — participant cookie first, then authenticated user's `session-participants` row. Read `src/app/api/sessions/[sessionId]/my-submissions/route.ts` for the established pattern and follow it; do not invent a third identity scheme.
- For each present part, perform the same upsert the existing endpoint performs, stamping `submittedAt`. **Reuse the existing routes' logic rather than duplicating it** — if that means extracting a shared helper from `src/app/api/session-guesses/route.ts` and `src/app/api/reviews/route.ts`, do that and say so in your report. Duplicating the review upsert would fork the blindness hardening Phase 1 added, which is unacceptable.
- Return `{ guess, review, ok }` where each part is `'ok' | 'skipped' | 'failed'` and `ok` comes from `summariseCommit`.
- **Never** include wine identity in the response. The blindness constraint applies here exactly as it does to `POST /api/reviews`.
- Return 401 when identity cannot be resolved, 400 for a malformed `pourOrder`.

- [ ] **Step 6: Wire the single button**

In the wine card, below the inline form, render one primary CTA:

```tsx
                          <button
                            type="button"
                            className="btn-brand w-full min-h-11"
                            onClick={() => void commitWine(row.pourOrder)}
                            disabled={committingPour === row.pourOrder}
                          >
                            {committingPour === row.pourOrder
                              ? 'Sparar…'
                              : `Klar med vin #${row.pourOrder}`}
                          </button>
```

`commitWine` POSTs to the new endpoint with whatever the guess card and the form currently hold, then on `ok` adds the pour to `submittedPourOrders` and shows `toast.success`. On failure it shows `toast.error` with the returned message and does **not** mark the wine done.

Remove the separate `Lås in` button from `BlindGuessCard` and the `Klar / Lås in` button from `WineReviewForm`'s session path — both are now this one button. Keep both components' **autosave** intact; only the explicit lock-ins move.

Because this is the participant's single primary CTA, verify no other `.btn-brand` renders in the participant's wine card.

- [ ] **Step 7: Verify**

```bash
pnpm test:session          # 29/29
npx tsx scripts/verify-session-draft-queue.ts   # 30/30
pnpm lint
npx tsc --noEmit 2>&1 | wc -l                   # ≤ 75
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/session-commit.ts src/lib/session-commit.test.ts "src/app/api/sessions/[sessionId]/wines/[pourOrder]/commit/route.ts" src/components/tasting-plan/PlanSessionContent.tsx src/components/tasting-plan/BlindGuessCard.tsx src/components/course/WineReviewForm.tsx
git commit -m "feat(provning): one commit per wine

Replaces two explicit lock-ins on two surfaces against two endpoints with a
single Klar med vin #N. Partial failure is reported honestly rather than shown
as success."
```

---

## Task 5: Touch targets

**Files:**
- Modify: `src/components/tasting-plan/BlindGuessCard.tsx`

- [ ] **Step 1: Raise the guess selects**

The three `SelectTrigger`s inherit `h-9` (36 px). Add `className="min-h-11"` to each so they clear the 44 px floor. Do not change the global `Select` default — that would affect every form in the product.

- [ ] **Step 2: Verify no sub-44px control remains in the participant wine card**

Read `BlindGuessCard.tsx` and the wine-card region of `PlanSessionContent.tsx` and list every interactive element with its effective height. Report the list. Anything below 44 px that a participant taps during a live session must be raised; host-only controls are out of scope for this phase.

- [ ] **Step 3: Verify and commit**

```bash
pnpm test:session && pnpm lint && npx tsc --noEmit 2>&1 | wc -l
git add src/components/tasting-plan/BlindGuessCard.tsx
git commit -m "fix(provning): 44px touch targets on the guess selects"
```

---

## Task 6: Regression pass

- [ ] **Step 1: Automated**

```bash
pnpm test:session                              # 29/29
npx tsx scripts/verify-session-draft-queue.ts  # 30/30
npx tsx scripts/verify-submission-status.ts    # 17 passed
pnpm lint                                      # 0 errors
npx tsc --noEmit 2>&1 | wc -l                  # ≤ 75
pnpm build                                     # succeeds
```

- [ ] **Step 2: Confirm the dialog is gone**

`grep -rn "reviewing" src/components/tasting-plan/PlanSessionContent.tsx` → nothing.

- [ ] **Step 3: Confirm the blindness property still holds**

The new commit endpoint is a new exit from the server. Re-read its response construction and confirm no wine identity can appear in it, on any path including errors.

- [ ] **Step 4: Manual matrix** — deferred to the owner, as in Phases 1 and 2, because `.env` targets production.

---

## Deferred to Phase 4

Focus-follows-host and the nudge bar, the reveal moment choreography, host reveal undo, the `Alla viner` overview, and the full component split of `PlanSessionContent`. Also still open from earlier phases: the `Publicera på min profil` checkbox is meaningless for guest participants (`/api/reviews` writes `user: null` for them) and should be hidden — it belongs with Phase 4's form work.
