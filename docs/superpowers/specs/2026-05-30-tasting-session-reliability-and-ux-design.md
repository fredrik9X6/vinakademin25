# Live Tasting Session — Reliability & UX Improvements

**Date:** 2026-05-30
**Status:** Approved design, pending implementation plan
**Scope:** The user-created live tasting / blind-tasting feature ("flow A": `CourseSession` driven by a `TastingPlan`). Out of scope: the standalone Blindkamp submission collection, course-lesson tastings except where they share the same components.

## Problem

Real-world use surfaced four problems:

1. **Submissions get lost.** A participant who refreshed the page or briefly lost connection found their entry missing at the reveal — the recap showed them as "did not submit."
2. **Unclear save model.** Some participants didn't realise they had to press a "send" button for their entry to persist.
3. **Price is hidden at reveal.** Participants guess the price bucket but never see the actual kronor price when the wine is revealed.
4. **The tasting-note form is intimidating.** It defaults to the advanced WSET view, uses jargon ("primär arom" etc.), and forces every field to be filled before submitting.

## Root cause of the data loss (verified against source)

Three compounding mechanisms, plus a secondary one:

1. **No autosave — explicit-submit only.** `BlindGuessCard.handleSubmit` (`src/components/tasting-plan/BlindGuessCard.tsx:83-115`) and `WineReviewForm.handleSubmit` (`src/components/course/WineReviewForm.tsx:450-604`) persist only on an explicit button press (`Skicka gissning` / `Skicka in`). Everything typed beforehand lives only in React state, so a refresh or accidental navigation wipes it.
2. **Single-shot network write, no retry.** Each handler does exactly one `fetch`. On a brief disconnect the POST throws, a toast flashes (`BlindGuessCard.tsx:110-111`, `WineReviewForm.tsx:599-600`), and nothing is saved or retried.
3. **Rehydration trusts `localStorage`, not the durable cookie.** Even when a save landed, after a refresh `WineReviewForm` reads identity from `localStorage.getItem('participantId')` (`WineReviewForm.tsx:142-147`) and `fetchLatestSubmission` early-returns without it (`:202-207`); **custom-wine reviews are never rehydrated** (`:272-276`). The save, by contrast, derives identity server-side from the httpOnly cookie `vk_participant_token` — so the read and the write disagree about "who you are."
4. **Secondary — re-join orphans.** A guest who loses the cookie and rejoins gets a *new* `SessionParticipant` row (`src/app/api/sessions/join/route.ts:174-187` recovers only when the same cookie is still present), so earlier entries are orphaned and the recap (`src/lib/session-recap.ts`, matches "yours" by participant id) legitimately shows "did not submit."

## Decisions (from brainstorming)

- **Save model:** Hybrid — continuous autosave (nothing lost) + a lightweight "lock in" action.
- **Price buckets:** Switch the single global default to `0–99 / 100–149 / 150–199 / 200–249 / 250–299 / 300+`. No per-host configuration this round (kept easy to add later since the enum stays).
- **Price at reveal:** Exact kronor price to everyone, with the matching bucket highlighted.
- **Partial responses:** Any single saved field counts as a submission; "did not submit" only when truly empty.
- **Enkel form:** Default to Enkel for everyone, remember last-used mode per device; relabel jargon only (keep the current flavour vocabulary).
- **Additional improvements (all in scope):** host "who-submitted" tracker + reveal guard; offline/reconnect banner; "answers restored" banner; PostHog save instrumentation.

---

## Workstream A — Reliable persistence (highest priority)

### A1. Shared autosave hook
Create one reusable hook (e.g. `src/lib/use-session-draft.ts` / `useSessionDraft`) used by both `BlindGuessCard` and `WineReviewForm`, so the two save paths can't drift. Responsibilities:

- **Debounced server upsert** (~600–1000 ms after last change). Reuses the existing upsert routes (`/api/session-guesses`, `/api/reviews`) which already dedup one row per identity+wine+session.
- **Synchronous localStorage mirror** written on every change, keyed by `vk_draft_<sessionId>_<pourOrder|wineKey>`. Restores instantly on mount even before any network read.
- **Retry with backoff + offline queue.** A failed write is retried; if offline, it's queued and flushed on `online`/reconnect. A final `navigator.sendBeacon` flush on `beforeunload`.
- **Save status** exposed to the UI: `idle | saving | saved | retrying | error`.
- **Row-creation floor:** only create a server row once there is ≥1 field of content (avoids empty rows; satisfies "any single field counts").

### A2. "Klar / Lås in" action (no longer a data gate)
Both components keep an explicit action, but it only sets a **`submittedAt`** timestamp (= "locked in", feeds the swarm/leaderboard/host tracker and the "I'm done" social moment). Recap inclusion is based on **presence of content**, not `submittedAt` — so forgetting to lock in never loses a participant. The current success UI in `WineReviewForm` (`:665-703`, `:706-778`) and the read-only summary in `BlindGuessCard` (`:180-206`) are repurposed as the locked-in state.

### A3. Identity unification
- Add/standardise a server endpoint that returns the current participant identity + their saved entries from the **httpOnly cookie** (reuse the pattern in `src/app/api/sessions/[sessionId]/my-submissions/route.ts`). `WineReviewForm` rehydration stops depending on `localStorage` participantId (`:142-147`, `:202-207`).
- **Rehydrate custom-wine reviews** too (remove the skip at `:272-276`); match the saved row by session + participant + custom-wine snapshot key rather than a library wine id.
- **Re-join recovery:** `JoinSessionDialog` already stores the participant *token* in `localStorage` (`:112-115`). Extend `/api/sessions/join` to recover the original `SessionParticipant` row when that token is presented in the join body and the cookie is gone — closing the orphan gap (`join/route.ts:174-187`). Logged-in users continue to recover by user id.

### A4. Trust + observability
- **Offline/reconnect banner.** Add `connectionState: 'connecting' | 'open' | 'reconnecting'` to `SessionContext`. `RealtimeSync` sets it via `EventSource` `onopen` / `onerror` (currently unhandled — `RealtimeSync.tsx:30-112`). A small banner ("Ingen anslutning — återförsöker…" / "Återansluten") renders on the live screen.
- **"Answers restored" banner.** When mount-time rehydration finds saved content, show a one-time "Vi har sparat dina tidigare svar".
- **PostHog instrumentation.** Emit `vk_session_save_attempt | _success | _failure | _retry` with `{ kind: 'guess' | 'review', sessionId, pourOrder }` so save failures are observable and the fix is verifiable.

---

## Workstream B — Tasting-note form for amateurs (`WineReviewForm.tsx`)

- **Default to Enkel.** Change `mode` initial state from `'advanced'` to `'simple'` (`:98`); on change, persist to `localStorage` (e.g. `vk_review_mode`) and read it back on mount so the last-used mode is remembered per device.
- **Relabel Enkel jargon** (keep the flavour vocabulary in `src/lib/wset-flavour-vocab.ts` unchanged):
  - `Primära smaker` → **"Smaker du känner igen"** (`:797-810`); validation message at `:483` updated to match.
  - Add plain-language helper hints to `Sötma` / `Syra` / `Fyllighet` (e.g. "Sötma (torr → söt)", "Syra (hur frisk?)", "Fyllighet (lätt → kraftig)") — `:811-852`.
  - Avancerad stays expert-facing and unchanged.
  - *(Exact Swedish wording is owner-tunable; this section is the proposal.)*
- **Allow partial responses.** Remove the required-field gate in `handleSubmit` (`:454-496`): drop the simple-mode rating + `primaryFlavours` requirement (`:477-483`), the advanced 12-select + aromas + flavours requirements (`:459-489`). Keep only the wine-linkage sanity check (`:490`). With autosave, all fields are optional. Server (`/api/reviews`) already does not enforce WSET completeness — no server change needed.

---

## Workstream C — Price

### C1. New buckets (single source + the duplicates that mirror it)
Update `src/lib/blind-guess-vocab.ts`:

```ts
export type PriceBucket = '0_99' | '100_149' | '150_199' | '200_249' | '250_299' | '300_plus'

export const PRICE_BUCKETS = [
  { value: '0_99',     label: 'Under 100 kr' },
  { value: '100_149',  label: '100–149 kr' },
  { value: '150_199',  label: '150–199 kr' },
  { value: '200_249',  label: '200–249 kr' },
  { value: '250_299',  label: '250–299 kr' },
  { value: '300_plus', label: '300+ kr' },
]

// priceToBucket thresholds: <100, <150, <200, <250, <300, else 300_plus
```

Mirror the same values in the three places that duplicate the enum (cross-cutting risk — all must match):
- `src/collections/SessionGuesses.ts:59-68` (`guessedPriceBucket` select)
- `src/collections/TastingPlans.ts:156-169` (`blindAnswerPriceBucket` select)
- `src/app/api/session-guesses/route.ts:11-17` (POST allowlist)

### C2. Migration + best-effort remap
`pnpm migrate:create` to change both Postgres enums (`enum_session_guesses_guessed_price_bucket`, `enum_tasting_plans_wines_blind_answer_price_bucket` — origin `src/migrations/20260517_090445.ts`). Because Postgres can't drop in-use enum values directly, the migration recreates each enum type and remaps existing rows:

| Old value  | New value  | Note |
|-----------|------------|------|
| `under_100` | `0_99`    | exact |
| `100_200`  | `100_149`  | lossy split — default to the lower sub-bucket (tunable) |
| `200_300`  | `200_249`  | lossy split — default to the lower sub-bucket (tunable) |
| `300_500`  | `300_plus` | merged |
| `500_plus` | `300_plus` | merged |

Lossy only on the split buckets; acceptable since sessions are ephemeral (24h). Regenerate `src/payload-types.ts`.

### C3. Exact price at reveal
`BlindAnswer` already carries `priceSek` (`src/lib/blind-guess-scoring.ts:24`) and `PlanSessionContent` resolves it from `Wine.price` / `customWine.priceSek`.
- `BlindGuessCard` reveal block (`:149-158`): render the exact price (e.g. "189 kr") alongside the bucket, highlighting the bucket the price falls into.
- Recap: add `priceSek` to `PerWineRecap` (`src/lib/session-recap.ts:12-29`, projection `:264-296`) and render it in `src/components/session-history/WineRecapCard.tsx`.
- Shown to everyone, post-reveal.

---

## Workstream D — Host "who-submitted" tracker + reveal guard

Depends on A2's `submittedAt` and a stream extension.

- **Stream extension.** Add a per-pour submission map to the SSE stream (new `submissions` event, or augment the existing `swarm`/`roster` payloads — `RealtimeSync.tsx:71-92`): for each pour order, which participant ids **have content** and which are **locked in**. **Content is never included — only status**, so blind guesses stay secret until reveal.
- **Host panel.** Against the live `roster` (`SessionContext` already carries it), show per-participant status for the focused wine: **✓ klar · ✎ utkast · — inget**.
- **Reveal guard.** Before revealing the focused pour, if online participants still lack an entry, the reveal control confirms: *"2 av 6 har inte svarat än — avslöja ändå?"* Host can proceed.

---

## Data model & migrations summary
- Add nullable **`submittedAt`** (date) to `SessionGuesses` and `Reviews` (additive). Drives lock-in / swarm / host tracker; does **not** gate recap inclusion.
- Price enum value change + row remap on both enums (Workstream C2).
- Both via `pnpm migrate:create`, committed with the code (prod is migration-driven). Run `pnpm generate:types` after collection edits.

## Error handling & edge cases
- **Offline:** queue writes, flush on reconnect, `sendBeacon` on unload; banner reflects connection state.
- **Two tabs / two devices, same identity:** last-write-wins via upsert; localStorage draft is per device. Acceptable.
- **Cookie + localStorage both wiped mid-session:** unrecoverable identity (rare); autosave + banners still protect within the current load. Documented limitation.
- **Swarm with drafts:** the live swarm counts entries that have content (drafts + locked) to stay live; gate on `submittedAt` later if it proves noisy (tunable). Guess content is never broadcast.
- **Migration on mixed-vintage rows:** old guesses/answers remapped per the table; if a row can't map, leave it and let `scoreOne` treat it as non-matching.

## Testing & verification (no automated suite configured)
Manual end-to-end loop, including a cookie-blocking browser (Safari private):
1. Join → enter a *partial* guess + note (don't lock in) → hard-refresh → entry restored.
2. Toggle offline mid-edit → banner shows → re-enable → queued write flushes, status → "Sparat".
3. Custom-wine note → refresh → note re-displays (regression on the old skip).
4. Re-join after clearing the cookie → original entries recovered, not orphaned.
5. Host reveals a wine while a participant has only a draft → participant still counts in the recap; exact price + bucket shown.
6. Host tracker shows correct ✓/✎/— and the reveal guard fires.
7. Run the migration against a copy of the DB; spot-check old recaps and new guesses.

## Implementation phasing
Implement **A → B → C → D**. A and B are independently shippable; C is self-contained (one migration); D depends on A's `submittedAt` + stream extension. Suggest separate PRs per workstream.

## Assumptions
- Live swarm counts both drafts and locked-in entries.
- "Klar / Lås in" is optional, never required.
- One spec covers all four workstreams; implementation is staged per the phasing above.
