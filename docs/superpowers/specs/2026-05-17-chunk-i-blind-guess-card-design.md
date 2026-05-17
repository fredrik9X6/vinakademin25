# Chunk I — Blind-Tasting Guess Card — Design

**Author:** Fredrik (with assistant)
**Date:** 2026-05-17
**Status:** Draft, awaiting final review

## Context & motivation

Blind tastings today end with a passive reveal: the host clicks "Avslöja vin #N" and everyone's wine row simply un-hides. There's no game, no anticipation, no payoff for the guest who got it right. The reveal moment is the most emotionally charged beat of a blind tasting, and we currently spend zero design energy on it.

This chunk adds a low-stakes guessing game: before the host reveals each blind wine, every guest submits a country + grape guess from dropdowns. On reveal, each guest sees whether they got it right; at session end, a leaderboard sits in the recap showing top guessers across the session.

Three scoring tiers: country, grape, and price-bucket — 1 pt each, max 3 per wine. The price-bucket tier auto-derives the host's "answer" from the wine's price data (`wine.price` for library, `customWine.priceSek` for custom) so the host doesn't have to enter a third field, but can still override.

## What ships in v1

- One new collection: `SessionGuesses`.
- Two additive fields on `TastingPlan.wines` entries: `blindAnswerCountry` and `blindAnswerGrape` (text, optional). For library wines the edit form pre-fills them; for custom wines the host types or leaves blank.
- One constants module: `src/lib/blind-guess-vocab.ts` exporting `COUNTRIES` (~30 wine countries) and `GRAPES` (~50 wine grapes) as the dropdown source.
- One POST endpoint: `/api/session-guesses` (upsert by identity + pourOrder).
- Two new UI pieces:
  - `<BlindGuessCard>` rendered on blind-hidden wine rows in `PlanSessionContent` (guests only).
  - `<BlindLeaderboard>` rendered in the session recap after the per-wine list.
- One new scoring helper: `src/lib/blind-guess-scoring.ts`.
- Two migrations: `add_session_guesses` (new table) and `add_blind_answers_to_tasting_plans` (two columns on `tasting_plans_wines`).

No changes to Reviews, UserWines, Wines, Countries, or Grapes collections. No changes to the WinePicker. No price-bucket scoring. No "guess the producer" or "guess the vintage" — those are v2 territory.

## Architecture

### Where the answer lives

Each `TastingPlan.wines[]` entry gains two optional text fields:

```ts
{
  name: 'blindAnswerCountry',
  type: 'text',
  admin: { description: 'Land som rätt svar i blind provning (frivilligt).' },
},
{
  name: 'blindAnswerGrape',
  type: 'text',
  admin: { description: 'Druva som rätt svar i blind provning (frivilligt).' },
},
```

For **library wines**, the `TastingPlanForm` pre-fills these from `wine.country.name` and `wine.grapes[0].name` on first edit (only if the field is currently empty — don't overwrite host edits).

For **custom wines**, the fields are blank by default; host types into a dropdown bound to `COUNTRIES` / `GRAPES` constants (same enum as the guest will guess from, so matching is trivially exact).

Empty answer = that scoring tier disabled for the wine. The guess card still renders the dropdown so guests can play; their guess just doesn't score points for that tier.

### `SessionGuesses` collection

```ts
const SessionGuesses: CollectionConfig = {
  slug: 'session-guesses',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['session', 'pourOrder', 'guessedCountry', 'guessedGrape'],
    hidden: false,
  },
  access: {
    create: ({ req }) => Boolean(req.user), // logged-in members only in v1
    read: adminOnly, // private; surfaced only through the SSE stream and recap aggregator
    update: ({ req }) => Boolean(req.user),
    delete: adminOnly,
  },
  fields: [
    { name: 'session', type: 'relationship', relationTo: 'course-sessions', required: true, index: true },
    { name: 'sessionParticipant', type: 'relationship', relationTo: 'session-participants', index: true },
    { name: 'user', type: 'relationship', relationTo: 'users', index: true },
    { name: 'pourOrder', type: 'number', required: true, index: true },
    { name: 'guessedCountry', type: 'text' },
    { name: 'guessedGrape', type: 'text' },
    // Reserved for future v2 price-bucket scoring:
    // { name: 'guessedPriceBucket', type: 'select', options: ['under_100', ...] },
  ],
}
```

Identity is *either* `sessionParticipant` (guests) *or* `user` (logged-in members not joining via participant cookie). Both are nullable individually but the POST endpoint requires at least one — enforced in the route, not in the collection (matches the existing `Reviews` pattern).

Uniqueness is enforced in the API: upsert on `(session, pourOrder, sessionParticipant)` for participants and `(session, pourOrder, user)` for member-hosts. A composite-unique index across all three would be cleaner but Payload's `index` doesn't support multi-column unique constraints directly — we handle the upsert in the route.

### `src/lib/blind-guess-vocab.ts`

```ts
export const COUNTRIES: string[] = [
  'Frankrike', 'Italien', 'Spanien', 'Portugal', 'Tyskland', 'Österrike',
  'Ungern', 'Grekland', 'Bulgarien', 'Schweiz', 'Sverige',
  'USA', 'Kanada', 'Chile', 'Argentina', 'Uruguay', 'Mexiko',
  'Sydafrika', 'Australien', 'Nya Zeeland',
  'Georgien', 'Israel', 'Libanon', 'Turkiet',
  'Japan', 'Kina', 'Indien',
  // ~30 total — covers the long tail of Systembolaget origins
]

export const GRAPES: string[] = [
  'Cabernet Sauvignon', 'Merlot', 'Pinot Noir', 'Syrah', 'Grenache',
  'Tempranillo', 'Sangiovese', 'Nebbiolo', 'Barbera', 'Montepulciano',
  'Malbec', 'Carmenère', 'Zinfandel', 'Cabernet Franc', 'Mourvèdre',
  'Chardonnay', 'Sauvignon Blanc', 'Riesling', 'Pinot Grigio', 'Pinot Gris',
  'Gewürztraminer', 'Viognier', 'Chenin Blanc', 'Sémillon', 'Albariño',
  'Verdejo', 'Vermentino', 'Trebbiano', 'Glera', 'Grüner Veltliner',
  'Furmint', 'Assyrtiko', 'Xinomavro', 'Touriga Nacional', 'Tinta Roriz',
  'Aglianico', 'Negroamaro', 'Primitivo', 'Corvina', 'Garganega',
  // ~50 total
]

export function normalizeAnswer(s: string): string {
  return s.trim().toLocaleLowerCase('sv')
}
```

### `src/lib/blind-guess-scoring.ts`

```ts
import { normalizeAnswer } from './blind-guess-vocab'

export const COUNTRY_POINTS = 1
export const GRAPE_POINTS = 1

export interface ScoredGuess {
  pourOrder: number
  countryCorrect: boolean
  grapeCorrect: boolean
  points: number
}

export function scoreOne(
  guess: { guessedCountry?: string | null; guessedGrape?: string | null },
  answer: { country?: string | null; grape?: string | null },
): ScoredGuess {
  const countryCorrect =
    !!answer.country && !!guess.guessedCountry &&
    normalizeAnswer(answer.country) === normalizeAnswer(guess.guessedCountry)
  const grapeCorrect =
    !!answer.grape && !!guess.guessedGrape &&
    normalizeAnswer(answer.grape) === normalizeAnswer(guess.guessedGrape)
  const points =
    (countryCorrect ? COUNTRY_POINTS : 0) + (grapeCorrect ? GRAPE_POINTS : 0)
  return { pourOrder: 0, countryCorrect, grapeCorrect, points }
}
```

`COUNTRY_POINTS = GRAPE_POINTS = 1` is deliberate. The brainstorm proposed 3/3/1 (with price-bucket), but with only two tiers in v1 a 1/1 split feels right — max 2 points per wine, max ~12 points across a 6-wine tasting. Easy to compare on the leaderboard at a glance.

### API endpoint

`POST /api/session-guesses` body:
```ts
{
  sessionId: number,
  pourOrder: number,
  guessedCountry?: string,
  guessedGrape?: string,
}
```

Resolves identity from auth cookie (member) and participant cookie (guest). Validates that:
- the session exists and is `active` (no submitting on completed sessions)
- the pour order matches a wine in `session.tastingPlan.wines`
- the wine has NOT been revealed yet (`revealedPourOrders` doesn't include the pourOrder)
- the guesser is the session host OR a participant in this session

Upserts: if a row already exists for the (session, pourOrder, identity), update it. Otherwise create.

Returns: the saved guess row.

No GET endpoint in v1 — the live UI just keeps its own local state (the "I already guessed" flag), and the recap aggregator does its own server-side fetch (next section).

### Recap leaderboard

`src/lib/session-recap.ts` extended to also load `session-guesses` rows for this session and produce a leaderboard:

```ts
export interface BlindLeaderboardEntry {
  participantId: number | null
  userId: number | null
  displayName: string
  totalPoints: number
  correctCountries: number
  correctGrapes: number
}

export interface RecapData {
  // …existing fields…
  blindLeaderboard: BlindLeaderboardEntry[]  // empty when session wasn't blind
}
```

Computed once per recap load. Gated on `session.blindTasting === true`. Sorted descending by `totalPoints`, ties broken by `correctCountries` desc then `correctGrapes` desc. Sliced to top 10.

`displayName` source: try `sessionParticipant.nickname` → fall back to `user.firstName + lastName` → "Anonym deltagare". (The session-participants collection already has a nickname field per the realtime sync spec.)

### `<BlindGuessCard>` — guest-side live UI

Rendered inside `PlanSessionContent`, only when:
- `session.blindTasting === true`
- The current viewer is **not** the host (`!isHost`)
- The wine is NOT yet revealed (`!effectiveRevealed.has(row.pourOrder)`)

Layout (added below the existing buttons row, above the SwarmPanel):

```
┌──────────────────────────────────────────────────────┐
│ Gissa innan värden avslöjar:                         │
│ Land: [Frankrike ▾]                                  │
│ Druva: [Pinot Noir ▾]                                │
│ [Skicka gissning]                                    │
└──────────────────────────────────────────────────────┘
```

After submission, the card collapses to:
```
Din gissning: Frankrike · Pinot Noir  [Ändra]
```

On reveal (the wine's row un-hides), the card transitions to:
```
✓ Land rätt!   ✗ Druva fel (rätt: Pinot Noir)
```

The "Ändra" affordance updates the same row via PATCH-via-POST (the endpoint handles upsert).

Component-level state: a local `Map<pourOrder, GuessState>` that hydrates from a single fetch on mount (`GET /api/session-guesses?session=X&self=true`) and gets optimistically updated on submit. SSE stream isn't extended to broadcast guesses in v1 — guests only see their own.

### `<BlindLeaderboard>` — recap UI

Below the per-wine list on `SessionHistoryDetail`. Hidden when `blindLeaderboard` is empty (non-blind sessions).

```
┌──────────────────────────────────────────────────────┐
│ Bästa gissare                                        │
│                                                      │
│ 🥇  Anna      8 poäng  (4 land · 4 druva)            │
│ 🥈  Pelle     6 poäng  (3 land · 3 druva)            │
│ 🥉  Mikael    5 poäng  (3 land · 2 druva)            │
│  4   Sara     4 poäng  (2 land · 2 druva)            │
│  5   Erik     3 poäng  (2 land · 1 druva)            │
│                                                      │
│ Visar topp 5 av N deltagare som gissade.             │
└──────────────────────────────────────────────────────┘
```

Component file: `src/components/session-history/BlindLeaderboard.tsx`. Reuses the existing `Card` look.

### Host-side answer entry in `TastingPlanForm`

In the existing per-wine row of the edit form (`SortableWineRow.tsx` lives in `tasting-plan/`), add a collapsed "Blint" section behind a "Visa blint-svar" toggle. Two inputs:
- `Land` — `<Combobox>` bound to `COUNTRIES`, free-text fallback allowed (because legacy plans may have hand-typed values).
- `Druva` — same shape with `GRAPES`.

Pre-fill behavior: when a library wine is selected and the joined wine has `country.name` / `grapes[0].name`, the fields default to those values. Editing the wine entry pre-fills the fields if currently empty (no overwrite on subsequent re-renders).

The host can leave both blank — the guess card still shows for guests, just doesn't score that wine.

This is the heaviest UI change in the chunk. If it proves intrusive, drop it from v1 and instead derive answers automatically: library wines use joined data, custom wines have no answer. The hosts who care about blind sessions are early adopters who'll tell us if they need explicit override controls.

### Reused utilities / patterns

- `useActiveSession()` for `revealedPourOrders` (already populated via SSE).
- `Combobox` from shadcn (check whether the project already has one; if not, the `MultiSelect` from chunk H can be repurposed in single-select mode, or use a plain `<Select>` with the constants).
- `Card`, `Button`, `Badge` — existing UI primitives.
- The same big-faded-number bottle visual stays — `<BlindGuessCard>` slots inside the row, doesn't replace it.

## What we explicitly do NOT do in v1

- **No price-bucket scoring.** The brainstorm included it (1pt). Adding price means another schema field, another enum, bucket boundary debates, and probably extra UI for the host. Defer.
- **No "year/vintage" guess.** Same scope rationale.
- **No real-time broadcast of other guests' guesses.** Each guest only sees their own guesses in the live UI. Hosts can see all guesses via the admin collection. Aggregated leaderboard surfaces in recap.
- **No "hint" affordance after wrong guesses.** ("Closer than your last guess" etc.) Adds judgment calls about hint vagueness vs revealing.
- **No fuzzy matching.** Both host and guest pick from the same enum (or host hand-types and we normalize lowercase). If hosts type "frankrike" and guests pick "Frankrike", the normalize step folds them.
- **No grape-blend scoring.** Many wines are blends ("Bordeaux blend = Cab + Merlot + …"); we score against the first grape only in v1. Hosts can pick the dominant grape as their answer.
- **No per-tier override** ("this wine only scores country, not grape") — hosts achieve this by leaving the grape field blank.
- **No public read on the collection.** Guesses are private to the participant + admin. Only the recap aggregator and the live guest's own UI ever pull them.
- **No retroactive guesses after reveal.** Once `revealedPourOrders` includes the pour, the endpoint 400s. The "Ändra" button auto-disables.
- **No guess audit log / change history.** Each row is upserted in-place; no versioning.

## Verification

End-to-end smoke list:

1. **Schema + migrations apply cleanly.** `pnpm migrate:create -- "add_session_guesses"` and `pnpm migrate:create -- "add_blind_answers_to_tasting_plans"` produce two migrations that apply to dev (`pnpm migrate`). New table + columns exist. Types regen via `pnpm generate:types`.
2. **Edit form pre-fill for library wines.** Open an existing plan that includes a library wine with a populated country/grape. Confirm the Blint section defaults are pre-filled with the library values. Confirm overriding and saving persists the override.
3. **Edit form empty for hand-typed customWines.** Same flow with a hand-typed wine — confirm Blint fields are empty. Type a country + grape. Save. Confirm persisted.
4. **Guest guess submission.** Start a blind session with three wines, two of which have answers set, one without. As a guest, confirm the Blint card appears on all three. Submit guesses on all three. Refresh — confirm guesses persist (re-fetch on mount).
5. **No double-submit.** Submit twice for the same wine — the second submit should update the row, not create a duplicate. Verify via the admin collection listing.
6. **Reveal-aware lockout.** Host reveals wine #1. As the guest, confirm the Blint card on wine #1 transitions to the result display. Try to PATCH wine #1 via curl — endpoint returns 400 "wine already revealed".
7. **Live result display correctness.** With answer = "Frankrike" / "Pinot Noir" and guess = "Frankrike" / "Merlot", confirm the post-reveal display shows "✓ Land rätt! · ✗ Druva fel (rätt: Pinot Noir)".
8. **Leaderboard appears on recap.** End the session. Visit the recap page. Confirm the `<BlindLeaderboard>` card lists top-5 by points, ties broken correctly, with display names resolved from participant.nickname.
9. **Non-blind session: leaderboard hidden.** End a non-blind session. Confirm the leaderboard card does not render.
10. **Sparse session.** Blind session where nobody submitted any guesses. Confirm the leaderboard card shows "Inga gissningar — vi var alla för tysta i kväll." (or similar placeholder copy) rather than crashing.
11. **Host-side admin visibility.** A SessionGuesses row exists for a participant — admins can see it in `/admin/collections/session-guesses` (read-only is fine if Payload defaults work out, but creates + edits are admin-locked via access rules).

## Risk / fallback

- **Enum vs free text.** If hosts hate the constraint of picking countries/grapes from a fixed list, swap the Combobox for a plain text input with the enum surfaced as autocomplete suggestions. Matching still works via `normalizeAnswer`.
- **Collection bloat.** A 6-wine blind session with 10 guests creates up to 60 SessionGuesses rows. At 100 sessions/year that's 6000 rows — trivial. We don't need to worry about archival for v1.
- **Reveal timing race.** A guest hitting submit on the exact moment of reveal could land a guess after the reveal flag flipped. The endpoint's check is server-side and authoritative; worst case the guest sees their submit reject with "Vinet är redan avslöjat". Acceptable.
- **Identity drift.** A participant who later claims their session (claim-via-email flow) gets a `user` field populated retroactively on their `session-participants` row. The leaderboard de-dups on `participantId` first, falling back to `userId` — a single human always counts as one leaderboard entry.
- **Grape blend mismatch.** A host who picked "Cabernet Sauvignon" as the answer for a Bordeaux blend will mark guests who guessed "Merlot" as wrong even though Merlot is also in the wine. We surface this as the only "right" answer because v1 is exact-match. Document this in the host edit form ("Ange den dominerande druvan.").
- **Backwards-compatibility on existing TastingPlans.** The two new columns are nullable — existing plans deserialize fine. Migration is purely additive.
