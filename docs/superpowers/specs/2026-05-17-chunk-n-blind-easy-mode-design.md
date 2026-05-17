# Chunk N — Blind Easy Mode + Grape Blend Support — Design

**Author:** Fredrik (with assistant)
**Date:** 2026-05-17
**Status:** Draft, awaiting final review

## Context & motivation

Two related improvements to the blind-tasting guess game (Chunk I):

1. **Easy mode.** The current dropdowns offer the full enum — 27 countries, 40 grapes. With one correct answer hidden in there, a casual guest's blind-guess hit rate is ~4% for grape, ~4% for country. For advanced palate-school sessions that's the right challenge; for friends-around-a-table tastings it's punishing. We want a host-toggleable mode that shortens each list to a small set (the correct answer + auto-generated decoys), making the game closer to "pick from this menu" than "name that grape blind".

2. **Grape blends.** Today `blindAnswerGrape` is a single text field. For a Bordeaux blend the host picks the dominant grape, and a guest who correctly guessed "Merlot" scores zero because the answer was "Cabernet Sauvignon". Several reasonable answers exist for blends — the scoring should accept any of them.

Both ride on the same data path (host enters answers in the plan editor → server resolves answers per pour → guest sees a guess card → scoring on reveal), so they fit cleanly in one chunk.

## What ships in v1

- **Schema (one migration):**
  - `tasting_plans.blind_guess_easy_mode_by_default` (boolean, default false) — plan-level default.
  - `course_sessions.blind_guess_easy_mode` (boolean, default false) — copied from the plan default at session create, can be overridden later if we add a session-time toggle (out of scope).
  - `tasting_plans_wines.blind_answer_grape` → array (hasMany) of acceptable grapes. The existing single-value rows migrate to a 1-item array.
- **Scoring update:** `scoreOne` now scores grape against the array — any one match = correct.
- **Server-side decoy generation:** when `session.blindGuessEasyMode` is true, the planer page bakes a deterministic decoy set per (pour, tier) into the page payload alongside the (still-redacted) answer. Deterministic seed = `sessionId + pourOrder + tier`, so every guest sees the same options.
- **BlindGuessCard updates:**
  - Accept optional `easyModeOptions: { countries: string[] | null; grapes: string[] | null } | null` prop.
  - When provided, dropdowns render only those values instead of the full enum.
  - Price-bucket is left as the full 5 buckets in both modes (already short enough; no easing needed).
- **Host edit form:**
  - `BlindAnswerInputs` grape input becomes a multi-select bound to the full `GRAPES` enum. Backwards compat: if a wine has a single `blindAnswerGrape` legacy value, it pre-populates the multi-select with that one value.
  - `TastingPlanForm` gains a "Lättare gissningar i gissningsspelet" toggle in the existing advanced-settings accordion, bound to `blindGuessEasyModeByDefault`.
- **Recap aggregator + leaderboard:** read the grape array instead of the single string. Same one-match-counts logic.

No new collections. No new endpoints. One migration. One new helper file for the decoy generator.

## Architecture

### Schema + migration

```ts
// TastingPlans
{ name: 'blindGuessEasyModeByDefault', type: 'checkbox', defaultValue: false,
  admin: { description: 'Aktivera lättare gissningar (begränsade alternativ) som standard.' } },

// CourseSessions
{ name: 'blindGuessEasyMode', type: 'checkbox', defaultValue: false,
  admin: { description: 'När aktiv: gäster ser bara ett urval av alternativ per gissning.' } },

// TastingPlans.wines entry
// Replace:
{ name: 'blindAnswerGrape', type: 'text' },
// With:
{ name: 'blindAnswerGrapes', type: 'text', hasMany: true,
  admin: { description: 'Acceptabla druvor som rätt svar. Lägg till alla för blends.' } },
```

Migration steps (one file):
1. `ALTER TABLE course_sessions ADD COLUMN blind_guess_easy_mode boolean DEFAULT false NOT NULL;`
2. `ALTER TABLE tasting_plans ADD COLUMN blind_guess_easy_mode_by_default boolean DEFAULT false NOT NULL;`
3. Create the new `tasting_plans_wines_blind_answer_grapes` join table (Payload's generated migration handles this — `hasMany text` creates an `*_locales`-style rels table).
4. **Data move:** for each row in `tasting_plans_wines` where `blind_answer_grape IS NOT NULL`, insert a single row into `tasting_plans_wines_blind_answer_grapes` with the same value.
5. `ALTER TABLE tasting_plans_wines DROP COLUMN blind_answer_grape;`

Step 4 lives in the migration's `up` as raw SQL after the Payload-generated DDL. Reversible in `down` by reading the array back into a single column (lossy if blends were entered; acceptable since `down` is for emergencies).

### Decoy generation — `src/lib/blind-guess-decoys.ts` (new)

```ts
/**
 * Pick N options for a blind-guess tier, guaranteeing the correct answer is
 * in the set. Deterministic per (sessionId, pourOrder, tier) so every guest
 * sees the same options across page loads + devices.
 *
 * - When `answers` is empty (host didn't fill that tier), returns null —
 *   the card falls back to hard mode for that tier.
 * - When the full pool is smaller than `count`, returns all of it (no decoys
 *   needed).
 */
export function pickEasyModeOptions(args: {
  pool: ReadonlyArray<string>      // full enum (COUNTRIES or GRAPES)
  answers: ReadonlyArray<string>   // 1+ correct values for this tier
  count: number                    // total options to return (e.g. 4)
  seed: string                     // sessionId + pourOrder + tier
}): string[] | null
```

Implementation uses a small `mulberry32` PRNG seeded from the string. Excludes the correct answers from the decoy pool to avoid silently turning a "correct" pick into a decoy. Includes one of the correct answers (the first one for grapes — host picks the dominant first) plus N-1 decoys, then shuffles.

For grapes specifically, only ONE of the correct grapes appears in the visible set — we don't want to give away the blend structure. Scoring still accepts any match (covered by the scoring update), so a guest who picks "Merlot" from the displayed options gets credit if Merlot is one of the answers, even if "Cabernet Sauvignon" was the one bundled into the easy-mode set.

Wait — that's the subtlety. If only "Cabernet Sauvignon" is in the dropdown but the answers array is `["Cabernet Sauvignon", "Merlot"]`, the guest can't pick Merlot. They can only pick from the displayed options. Scoring against the array is moot here.

**Decision:** include ALL correct grape answers in the easy-mode set + (count - answers.length) decoys. So for a 2-grape blend with count=4, the user sees 4 options: 2 correct + 2 decoys. They can pick any correct one (the scoring's "any match" rule earns a point). If `answers.length >= count`, we just return a shuffled subset that's all-correct (rare; the host has done the work for them) — or cap at count and bias toward including all of them.

Per-tier count default: **4**. Easy mode hit-rate for blind guesses: 25%. Sane middle ground.

### Server-side wiring — `/mina-provningar/planer/[id]/page.tsx`

After the existing blind-redaction block, when `session.blindGuessEasyMode` is true and viewer is `!isHost`:

```ts
if (!isHost && session.blindTasting && session.blindGuessEasyMode) {
  renderPlan = {
    ...renderPlan,
    wines: (renderPlan.wines ?? []).map((w, idx) => {
      const pourOrder = w.pourOrder ?? idx + 1
      if (revealed.includes(pourOrder)) return w  // post-reveal, full data
      // For un-revealed wines, build decoy sets from the (unstripped, server-
      // side) original plan's blind-answer fields. The current redaction
      // already nulled these on `w`, so we re-read from `plan` (unredacted).
      const original = plan.wines![idx]
      const countries = pickEasyModeOptions({
        pool: COUNTRIES,
        answers: original.blindAnswerCountry ? [original.blindAnswerCountry] : [],
        count: 4,
        seed: `${session.id}:${pourOrder}:country`,
      })
      const grapes = pickEasyModeOptions({
        pool: GRAPES,
        answers: original.blindAnswerGrapes ?? [],
        count: 4,
        seed: `${session.id}:${pourOrder}:grape`,
      })
      return {
        ...w,
        easyModeOptions: { countries, grapes },  // attached for the client
      }
    }),
  }
}
```

The `easyModeOptions` field is non-persistent — it's added to the render payload only. PlanSessionContent's `WineRow` type gains the same field, threaded into `BlindGuessCard`.

For HOSTS, easy mode is irrelevant (they don't guess). They get the full plan with answers.

### Scoring + recap

`scoreOne` in `src/lib/blind-guess-scoring.ts`:

```ts
const grapeCorrect =
  grapeScored &&
  !!guess.guessedGrape &&
  Array.isArray(answer.grapes) &&
  answer.grapes.some((g) => normalizeAnswer(g) === normalizeAnswer(guess.guessedGrape))
```

`BlindAnswer.grape: string | null` becomes `grapes: string[]`. Helper sites that build `BlindAnswer` (recap aggregator, session-live-scores, PlanSessionContent's WineRow) all switch to reading the array. For a 1-item array (single-grape wine), behaviour identical to today.

### BlindGuessCard

Adds one optional prop:

```ts
interface BlindGuessCardProps {
  // ...existing...
  easyModeOptions?: { countries: string[] | null; grapes: string[] | null } | null
}
```

In the dropdown render:
```tsx
const countryOptions = easyModeOptions?.countries ?? COUNTRIES
const grapeOptions = easyModeOptions?.grapes ?? GRAPES
```

Price-bucket renders all 5 always.

When `easyModeOptions` is present (easy mode is on), the card adds a small chip label "Lättare läge" so guests know why their dropdowns are short.

### Host edit form

`BlindAnswerInputs.tsx` — the grape `Select` becomes a `MultiSelect` from `@/components/ui/multi-select`, bound to `GRAPES`. Selection is a `string[]`. The "auto from price" fallback for price-bucket stays.

`TastingPlanForm` — gains the new toggle in the advanced-settings accordion next to `blindTastingByDefault`:

```tsx
<Switch
  checked={blindGuessEasyModeByDefault}
  onCheckedChange={setBlindGuessEasyModeByDefault}
/>
<label>Lättare gissningar (4 alternativ per fråga)</label>
```

Wires through to the existing POST /PATCH body.

### Session-create wiring

`POST /api/sessions/create` (or wherever the session is created off a plan) copies `plan.blindGuessEasyModeByDefault → session.blindGuessEasyMode`. Same pattern as `blindTastingByDefault → blindTasting`.

### Reused utilities / patterns

- `COUNTRIES`, `GRAPES` from `src/lib/blind-guess-vocab.ts`.
- `MultiSelect` from `src/components/ui/multi-select.tsx`.
- Existing pour-mapping + redaction in `/mina-provningar/planer/[id]/page.tsx`.

## What we explicitly do NOT do in v1

- **No session-time easy-mode toggle UI.** The host sets it on the plan; the session inherits. If a host wants to change mid-session, they can edit the plan and start a new session. Future spec.
- **No "show me what I got wrong" comparison in easy mode** — the existing reveal-mode card already shows the correct answer next to wrong guesses. Easy mode reuses that as-is.
- **No grape-tier-specific easing toggle.** Single switch governs both country + grape. Keeping the UX simple.
- **No automatic grape resolution from library wines.** When the host adds a library wine with `wine.grapes: ['Cab', 'Merlot']`, only the first grape pre-fills (matches current behaviour). The host expands manually in the multi-select if they want a blend acceptable. Future improvement: pre-fill all joined grapes.
- **No price-bucket easing.** Already 5 options; reducing to 3 would feel arbitrary.
- **No "shuffle per reveal" anti-memorization.** Decoys are deterministic per (session, pour) so all guests see the same options. If a guest takes a photo of wine 1's dropdown and comes back later, the options haven't changed. Fine for a single-session game.
- **No backwards-compat keeping the old `blindAnswerGrape` column.** Clean rename + data migration. Old code paths that read the single string get updated.

## Verification

End-to-end smoke list:

1. **Migration applies cleanly.** `pnpm payload migrate:create` generates the additive + drop + grape-table create steps. Hand-write the data move (single-value → array) in the same migration. Apply locally against a fresh DB and against a snapshot of prod data. Confirm existing single-grape wines roundtrip into 1-item arrays.
2. **Toggle persists.** Create a new plan with easy-mode toggle ON. Save. Reload edit page. Confirm toggle stays ON.
3. **Plan default flows to session.** Start a group session from a plan with `blindGuessEasyModeByDefault: true`. Confirm `session.blindGuessEasyMode === true` in the admin row.
4. **Hard mode unchanged.** With `blindGuessEasyMode: false`, the guest's BlindGuessCard dropdowns show the full COUNTRIES (27) and GRAPES (40) lists. Same as before this chunk.
5. **Easy mode dropdowns show 4 options.** With easy mode on, guest's BlindGuessCard country dropdown shows exactly 4 options. Grape shows up to 4. The correct answer is among them. A "Lättare läge" chip label is visible above the dropdowns.
6. **Determinism across guests.** Two different guest devices on the same session see the IDENTICAL 4 options for wine 1's country (in the same order). Confirm via screen-share or by inspecting the rendered HTML.
7. **Determinism across page loads.** A guest hard-refreshes the page. Their decoy set for wine 1 is the same. (Seed = sessionId + pour + tier; stable.)
8. **Blend scoring.** Host creates a wine with `blindAnswerGrapes: ['Cabernet Sauvignon', 'Merlot']`. In easy mode, guest sees both in the dropdown + 2 decoys. Guest picks "Merlot". On reveal: scored CORRECT (+1pt).
9. **Single-grape backward compat.** Host imports a legacy plan with single `blindAnswerGrape: 'Pinot Noir'`. After migration, `blindAnswerGrapes: ['Pinot Noir']`. Edit form pre-populates with that one value. Easy mode shows it as one of 4 options. Hard mode behaves identically to today.
10. **Recap leaderboard rights.** End an easy-mode blind session with 3 guests of varying skill. Open the recap. Confirm the leaderboard reflects the correct point totals — guests who picked any of multiple acceptable grapes get the point.
11. **Live points reshuffle.** Guest correctly picks one of two acceptable grapes on wine 1. Host reveals. Within 5–7s, guest's roster row gains the point. Same flow as Chunk M.
12. **Host visibility.** Open the host's view of the session. The host's `WineRow` does NOT include `easyModeOptions` (hosts get full info, no need for decoy lists).
13. **Type regen.** `pnpm generate:types` updates `payload-types.ts` with `blindAnswerGrapes` and the two new bool fields. Diff shows them.

## Risk / fallback

- **Data migration bites blank values.** Rows with `blindAnswerGrape: null` shouldn't be inserted into the new array table. The migration's SQL filters on `IS NOT NULL AND <> ''`.
- **Seed collision.** Different sessions hitting the same `${sessionId}:${pourOrder}:country` seed string is impossible — sessionId is unique. Within a session, different tiers + pours yield different seeds.
- **Future toggle override.** If we later add a session-time easy-mode toggle (host flips it mid-session), the SSE roster + redaction logic re-reads on every poll, so a flip would propagate within 5s. No code change needed for that future addition.
- **Empty answers + easy mode.** If a host enables easy mode but leaves `blindAnswerGrapes` empty for a wine, that tier returns null from `pickEasyModeOptions`. The card silently falls back to the full enum for that tier — guests still see a dropdown but no scoring. Acceptable degradation.
- **PRNG quality.** `mulberry32` is enough for a 4-option shuffle. We don't need crypto here — we want determinism + visual variety.
- **Decoy "leaks" the answer space.** A guest who memorises all four options per wine over multiple sessions could narrow the answer. Acceptable; this is a parlor game, not a security boundary.
