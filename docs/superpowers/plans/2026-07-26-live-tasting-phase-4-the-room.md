# Live Tasting Phase 4 — The Room: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the session feel like one room — the screen follows the host, the reveal is a moment, and the host's controls read as controls.

**Architecture:** Phases 1–3 fixed correctness, legibility and the per-wine surface. This phase is about pacing and the shared experience. One planning decision keeps it cheap: **reveal-undo needs no schema change.** The host's own client knows when they tapped reveal, so a 30-second undo is a client-side affordance plus an `unrevealPourOrder` action on the existing host-state route. No migration, no new timestamp field.

**Tech Stack:** Next.js 15 App Router, React 19, Payload CMS 3.33, TypeScript, Tailwind, framer-motion (already a dependency).

## Global Constraints

- **pnpm** only. `@payloadcms/*` pinned to exact `3.33.0`. Payload v3 APIs only (`payload`, never `payload/types`). `src/payload-types.ts` is generated.
- User-facing copy is **Swedish**. "poäng" is invariant.
- **Blindness is a security property.** The server must never send an unrevealed wine's identity to a guest. Un-revealing must *re-hide* the wine for guests — an undo that leaves the identity on the client is not an undo.
- **Touch targets ≥ 44 px** for anything a participant or host taps during a live session. This phase brings host controls in scope, which Phase 3 deliberately left out.
- **Exactly one primary CTA per screen.** For the host that is now **Avslöja**; for the participant it remains `Klar med vin #N`. The two roles never render the same screen, so both may use `.btn-brand` — but never two within one role's view.
- Motion must respect `prefers-reduced-motion` and must be interruptible.
- `tailwind.config.js` has **no `screens` key** — there is no `xs` breakpoint.
- `npx tsc --noEmit` currently sits at exactly **75 lines** with **no headroom**. Any new type error breaches it.
- Verify with `tsc`, not `pnpm lint` alone.

---

## Task 1: Reveal undo

Reveal is currently irreversible: `host-state/route.ts` only set-unions `revealedPourOrders`, and no un-reveal path exists. A misclick permanently ends the suspense.

**Files:** `src/app/api/sessions/[sessionId]/host-state/route.ts`, `src/components/tasting-plan/PlanSessionContent.tsx`

- [ ] **Step 1: Accept `unrevealPourOrder`**

In the host-state route, alongside the existing `revealPourOrder` handling, accept `unrevealPourOrder: number`. Where reveal does a set-union, un-reveal must do a set-difference:

```ts
    const rawUnreveal = (body as any)?.unrevealPourOrder
    const unrevealPourOrder =
      typeof rawUnreveal === 'number' && Number.isInteger(rawUnreveal) ? rawUnreveal : null
```

and in the data-building block:

```ts
    if (unrevealPourOrder !== null) {
      const existing = Array.isArray((session as any).revealedPourOrders)
        ? ((session as any).revealedPourOrders as number[])
        : []
      data.revealedPourOrders = existing
        .filter((p) => p !== unrevealPourOrder)
        .sort((a, b) => a - b)
    }
```

Add `unrevealPourOrder` to the "must be provided" guard so a body carrying only it is accepted. Reveal and un-reveal in the same request is contradictory — reject that combination with 400 rather than picking a winner.

Authorization is unchanged: this route is already host-only. Verify that before relying on it.

- [ ] **Step 2: Offer the undo**

In `PlanSessionContent.tsx`, `revealWine` currently shows nothing on success. Give it a toast with an action:

```tsx
      toast.success(`Vin #${pourOrder} avslöjat`, {
        duration: 30000,
        action: {
          label: 'Ångra',
          onClick: () => void unrevealWine(pourOrder),
        },
      })
```

Add `unrevealWine(pourOrder)` mirroring `revealWine`: optimistically remove the pour from `localRevealed`, POST `{ unrevealPourOrder: pourOrder }`, and on failure restore it and `toast.error('Kunde inte ångra.')`.

The 30-second window is the toast's own duration — no server-side expiry, and none is needed: it is the host's own session and un-revealing is their prerogative.

- [ ] **Step 3: Verify the guest actually re-hides**

This is the security-relevant part. Guests receive reveals over the SSE stream and then force a server-component refetch so redaction re-runs. Confirm by reading `PlanSessionContent.tsx`'s reveal-hydration effect that **removal** also triggers a refetch — the existing effect tracks only newly-*added* pours via `seenRevealedRef`, so an un-reveal may not re-hide without an explicit change. If it does not, fix it and say so; if it does, quote the code showing why.

- [ ] **Step 4: Verify and commit**

```bash
pnpm test:session && pnpm lint && npx tsc --noEmit 2>&1 | wc -l
git commit -am "feat(provning): host can undo a reveal

Reveal was irreversible — host-state only set-unioned revealedPourOrders and no
un-reveal path existed, so a misclick permanently ended the suspense. No schema
change: the 30s window is the toast's duration."
```

---

## Task 2: Host controls read as controls

The host's row currently holds three visually identical `variant="outline"` chips — `Sätt fokus`, `Avslöja vin #N` — plus the participant's controls. Nothing signals which is the consequential action.

**Files:** `src/components/tasting-plan/PlanSessionContent.tsx`

- [ ] **Step 1: Make Avslöja the host's primary CTA**

Render the reveal control as `className="btn-brand min-h-11"` instead of an outline `Button`. Keep `attemptReveal` (the missing-answers guard) wired exactly as-is.

Verify that when `isHost` is true, `.btn-brand` renders **once** per wine card and that the participant's `Klar med vin #N` does not also render for the host — check whether the host sees the participant surface at all before assuming.

- [ ] **Step 2: Raise host controls to 44 px**

`Sätt fokus` / `I fokus`, `Avslöja vin #N`, `Manus & fakta` and the `NextWineButton` are all currently `size="sm"` (32 px). Add `min-h-11` to each. These were explicitly out of scope in Phase 3; they are in scope now.

- [ ] **Step 3: Promote "Vem har svarat"**

`HostSubmissionTracker`'s heading is a `<p className="mb-2 text-xs font-medium text-muted-foreground">`. It is the host's only instrument for pacing the room. Give it the same visual weight as the guess-card heading: `text-xs font-semibold text-foreground uppercase tracking-wider`, and render it whenever the wine is active — not only when submissions exist. Read the component first to confirm its current gating.

- [ ] **Step 4: Verify and commit**

Confirm `grep -c "btn-brand" src/components/tasting-plan/PlanSessionContent.tsx` is **2** (one host, one participant) and that they are in mutually exclusive branches.

---

## Task 3: Focus follows the host

Today every wine renders expanded in a flat list, and the host's current wine is marked only by a ring and a badge. Nothing moves. Phase 3 added `expandedPour` with a `?? activePour` fallback, so the *form* already follows the host — this task makes the **view** follow too, without hijacking.

**Files:** `src/components/tasting-plan/PlanSessionContent.tsx`, new `src/lib/use-follow-host.ts` + test

- [ ] **Step 1: Write the failing test for the follow decision**

Create `src/lib/use-follow-host.test.ts`:

```ts
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { shouldFollowHost, FOLLOW_IDLE_MS } from './use-follow-host'

describe('shouldFollowHost', () => {
  it('follows when the user has never interacted', () => {
    assert.equal(shouldFollowHost(null, 10_000), true)
  })

  it('follows when the last interaction is older than the idle window', () => {
    assert.equal(shouldFollowHost(0, FOLLOW_IDLE_MS + 1), true)
  })

  it('does not follow while the user is actively typing', () => {
    assert.equal(shouldFollowHost(0, 1_000), false)
  })

  it('treats exactly the idle window as still active (fails safe: no hijack)', () => {
    assert.equal(shouldFollowHost(0, FOLLOW_IDLE_MS), false)
  })
})
```

- [ ] **Step 2: Run it — expect FAIL (module missing)**

- [ ] **Step 3: Implement**

Create `src/lib/use-follow-host.ts`:

```ts
/** How long after the last interaction the view stops auto-following the host. */
export const FOLLOW_IDLE_MS = 10_000

/**
 * Decide whether the view may auto-advance to the host's wine.
 *
 * Moving the screen out from under someone mid-sentence is worse than letting
 * them fall a wine behind, so this fails safe: at exactly the idle boundary we
 * do NOT follow.
 */
export function shouldFollowHost(
  lastInteractionAt: number | null,
  now: number,
): boolean {
  if (lastInteractionAt === null) return true
  return now - lastInteractionAt > FOLLOW_IDLE_MS
}
```

- [ ] **Step 4: Run — expect PASS (4 tests).** Then widen the `test:session` glob in `package.json` to also match `src/lib/use-*.test.ts`. Expect **33** total.

- [ ] **Step 5: Wire it up**

In `PlanSessionContent.tsx`:
- Track `lastInteractionAt` (a ref updated on any pointer/key event within the wine list).
- When `activePour` changes: if `shouldFollowHost(...)`, set `expandedPour` to `null` (which re-follows the host) and scroll that card into view with `scrollIntoView({ behavior: 'smooth', block: 'start' })`. Guard the scroll behind `prefers-reduced-motion`.
- Otherwise show a dismissible nudge bar: `→ Värden är nu på vin #N`, tapping it follows.

The nudge is a sticky element — it must clear `MobileBottomNav` (h-16, `pb-[env(safe-area-inset-bottom)]`) and the layout's `pb-20 md:pb-0`.

- [ ] **Step 6: Verify and commit**

---

## Task 4: `Alla viner` overview

**Files:** new `src/components/tasting-plan/SessionWineList.tsx`, `src/components/tasting-plan/PlanSessionContent.tsx`

- [ ] **Step 1: Build the list**

One row per wine: pour number, name (or `Vin #N` when unrevealed for a guest), status (`Klar` / `Pågår` / `Ej börjad`), and — in blind sessions only — the points earned once revealed. Rows are `min-h-11` and tap to jump the view to that wine.

Status derives from existing state: `submittedPourOrders` for `Klar`, `activePour` for `Pågår`.

- [ ] **Step 2: Surface it**

Add an `Alla viner` control in the session header opening the list in a bottom `Sheet` (`side="bottom"`, the pattern already proven in `mobile-bottom-nav.tsx` with `rounded-t-2xl border-t pb-[env(safe-area-inset-bottom)] max-h-[88vh]`).

- [ ] **Step 3: Verify and commit**

---

## Task 5: The reveal moment

Reveal is the payoff the blind format is built around. Today it is a 2-second poll followed by an unannounced `router.refresh()`, and during that window the wine renders as "Namnlöst vin" with a placeholder bottle.

**Files:** `src/components/tasting-plan/BlindGuessCard.tsx`, `src/components/tasting-plan/PlanSessionContent.tsx`

- [ ] **Step 1: Kill the broken intermediate state**

`PlanSessionContent.tsx` documents a window where `isHiddenForGuest` flips false while the row still holds load-time redacted nulls. Render an explicit `Avslöjas…` skeleton for that window instead of a half-broken card. Find the existing comment describing it and place the skeleton accordingly.

- [ ] **Step 2: Animate the result**

Using framer-motion (already a dependency): fade/slide the revealed identity in, stagger the guess rows flipping to ✓/✗, and count the points up. Wrap in `useReducedMotion()` — when reduced motion is preferred, render the final state immediately with no transition.

Keep it brief (≲600 ms total). This runs while people are talking; it should punctuate, not perform.

- [ ] **Step 3: Verify and commit**

---

## Task 6: Correctness items carried from the spec

Three defects the spec flagged as in-scope.

**Files:** `src/components/tasting-plan/SwarmPanel.tsx`, `src/lib/session-recap.ts`, `src/components/tasting-plan/BlindGuessCard.tsx`

- [ ] **Step 1: Stop conflating "loading" with "no ratings"**

`SwarmPanel.tsx` returns `Inga betyg ännu — du var först.` for both `!entry` (SSE hasn't delivered) and `entry.ratingCount === 0` (genuinely first). Split them: render a neutral loading state for `!entry`, and keep the copy only for a real zero.

- [ ] **Step 2: Remove the dead plural ternaries**

`SwarmPanel.tsx` has `entry.ratingCount === 1 ? 'betyg' : 'betyg'` — both branches identical. "betyg" is invariant in Swedish, like "poäng". Simplify; do not invent a plural.

Grep for any other identical-branch ternary in the tasting components and fix those too.

- [ ] **Step 3: Reconcile live and final scores**

`session-live-scores.ts` skips unrevealed pours (`if (!revealedSet.has(g.pourOrder)) continue`); the recap loop in `session-recap.ts` has no equivalent check (verified: zero `revealedSet` references). A session ended with a wine unrevealed therefore produces a recap total **above** the last live number the participant saw.

Decide which is correct and make them agree. **Recommended:** the recap should also count only revealed wines — an unrevealed wine was never scored in the room, and a total that grows after the fact is indefensible. If you conclude otherwise, say why in your report rather than changing it silently.

This changes recap numbers, so state clearly in your report what a host would see differently.

- [ ] **Step 4: Verify and commit**

---

## Task 7: Hide meaningless controls from guests

**Files:** `src/components/course/WineReviewForm.tsx`

- [ ] **Step 1:** For guest participants, `/api/reviews` writes `user: null`, so "Publicera på min profil" has no profile to publish to. Hide the checkbox when there is no authenticated user. The component already resolves participant identity — read how before adding new state.

- [ ] **Step 2: Verify and commit**

---

## Task 8: Split `PlanSessionContent`

Now 1061 lines, holding the shell, both roles, the wine rows, the inline form, the info sheet, three alert dialogs, reveal logic, focus logic and the nudge. Every earlier phase has had to edit it.

**Do this last.** It is a pure refactor with no user-visible benefit and real regression risk; everything above must already be green and committed.

- [ ] **Step 1: Extract, one component per commit**, verifying between each:

| Component | Holds |
|---|---|
| `SessionWineCard` | one wine row: header, guess panel, inline note, commit button |
| `HostWineControls` | focus, reveal, undo, "Vem har svarat" |
| `SessionFocusNudge` | the non-hijacking follow bar |
| `SessionDialogs` | end-session / leave / reveal-guard alert dialogs |

`PlanSessionContent` keeps the shell, data plumbing and SSE wiring.

- [ ] **Step 2: Preserve the redaction contract.** `page.tsx` carries an explicit warning that the client reads the plan off `session.tastingPlan`, not the shell's `plan` prop, and that passing the raw session leaks wine names and blind answers to guests. Any prop-threading you introduce must not reconstruct an unredacted plan. Re-read that comment before moving anything.

- [ ] **Step 3: Verify and commit**

---

## Task 9: Regression and ship

- [ ] **Step 1: Automated**

```bash
pnpm test:session                              # 33/33
npx tsx scripts/verify-session-draft-queue.ts  # 30/30
npx tsx scripts/verify-submission-status.ts    # 17 passed
pnpm lint                                      # 0 errors
npx tsc --noEmit 2>&1 | wc -l                  # ≤ 75
pnpm build                                     # succeeds
```

- [ ] **Step 2: Blindness re-check.** Un-reveal is a new way for a wine to become hidden again. Confirm a guest who saw a revealed wine, then had it un-revealed, no longer has its identity in any payload — including any client cache or already-fetched review row.

- [ ] **Step 3: Merge to `main` and push.** `main` is staging; `migrate.yml` runs on push. There is no migration in this phase, so the run should be a no-op — confirm it passes anyway.

- [ ] **Step 4: Smoke-test staging** the same way Phase 3 was: app 200, `POST /api/sessions/1/wines/1/commit` → 401, `/api/reviews` → 401 unauth with `buyAgain` present in GET.

---

## Out of scope, still open after this phase

- Easy mode only limits the country dropdown; grape options are decoy-limited for every blind session and price always shows all six buckets — the `Lättare läge` badge over-promises. A product decision, not a bug fix.
- Easy mode cannot be changed mid-session (`host-state` accepts only pacing actions).
- `tasting-plans/from-template/[templateId]` never copies the blind flags, so a plan cloned from a curated template starts non-blind. A real bug, but in the plan-creation flow rather than the live session.
- `revealStrategy` on `BlindBattles` is required, defaulted, and read by nothing.
- `send-wrap-up-emails.ts:347` treats `buyAgain` as `'yes'|'maybe'|'no'` strings though it is boolean, so the wrap-up email chip never renders.
- Half-star hitboxes are 44×22, not 44×44.
