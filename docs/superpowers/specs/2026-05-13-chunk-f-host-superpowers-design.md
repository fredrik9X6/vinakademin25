# Chunk F — Host Superpowers: Blind tasting + Timer + Swarm

**Status:** Approved 2026-05-13. Implementation plan to follow.

## Goal

Three new mechanics that move plan-driven sessions from "wine list with reviews" to "actual tasting game":

1. **Blind tasting mode** — wines presented anonymously as "Vin #N" until the host reveals each one.
2. **Per-wine pacing timer** — gentle visual countdown when host puts a wine in focus.
3. **Tasting-note swarm panel** — after a participant submits their own review for a wine, they see aggregated star rating + aroma frequency from the rest of the group.

## Scope decisions (locked)

- **Blind mode opt-in**: per-plan default (`blindTastingByDefault`) AND per-session override at start-time. The session row stamps the runtime value.
- **What's hidden in blind mode**: wine title, winery, vintage, region, image, and `hostNotes` (already host-only). Custom-wine `name`, `producer`, `vintage` similarly hidden. Show only `Vin #N` + pour-order pill + a muted bottle silhouette.
- **Review-while-blind allowed**: classic blind-tasting flow — taste, rate, submit, THEN reveal. Submitted reviews stay attached after reveal.
- **Per-wine reveal only**: host taps `Avslöja vin #N` per card. No bulk reveal in MVP.
- **Timer scope**: per-plan default (`defaultMinutesPerWine: number | null`). One number applies to every wine. Null = no timer.
- **Timer-at-zero behavior**: gentle nudge — chip flips to red `Dags att gå vidare?`, with a `→ Nästa vin` button for the host. Nothing auto-advances.
- **Timer visibility**: visible to BOTH host and guests — shared rhythm cue.
- **Swarm host visibility**: panel always visible to host (they're facilitating, not playing blind).
- **Swarm guest visibility**: gated per wine on the guest's own submission. Once submitted, panel appears immediately and live-updates.
- **Swarm contents**: average star rating + reviewer count + aroma frequency counts from `wsetTasting.nose.primaryAromas`. Top 10 aromas; remainder grouped as `Annat (n)`.

## Schema

### TastingPlans — author-time settings

| Field | Type | Constraints |
|---|---|---|
| `blindTastingByDefault` | checkbox | default `false` |
| `defaultMinutesPerWine` | number | min 1, max 60, nullable, sidebar |

### CourseSessions — runtime state

| Field | Type | Constraints |
|---|---|---|
| `blindTasting` | checkbox | default `false`, sidebar |
| `revealedPourOrders` | array of number, OR JSON column | each entry 1+. Default `[]`. Sidebar, readonly. |
| `currentWineFocusStartedAt` | date | nullable, sidebar, readonly. Stamped on every host-focus change in plan mode. |

**Migration**: 5 nullable / defaulted columns. Additive. No data backfill.

Note on `revealedPourOrders`: Payload supports `type: 'json'` for arbitrary JSON; or `type: 'array'` with a single number field. Picking JSON for simplicity — it's a numeric array, never large enough to need querying.

## API surface

### `POST /api/sessions/create` (extend)

Body adds optional `blindTasting?: boolean`. When omitted, the route stamps `session.blindTasting = plan.blindTastingByDefault ?? false` (for plan sessions) or `false` (for course sessions — courses don't have the field).

### `POST /api/sessions/[sessionId]/host-state` (extend)

Body variants accepted:
- `{ currentLessonId: number }` — course mode (existing)
- `{ currentWinePourOrder: number }` — plan mode focus (existing)
- `{ revealPourOrder: number }` — plan mode reveal (NEW). Appends to `revealedPourOrders` (deduped). Returns 400 if not a positive integer.
- May combine `currentWinePourOrder` and `revealPourOrder` in one body.

When `currentWinePourOrder` is set in plan mode, also stamp `currentWineFocusStartedAt = NOW()` so the timer starts from the focus moment.

### SSE stream extensions (`/api/sessions/[sessionId]/stream`)

Existing events: `lesson` (with `currentLessonId` + `currentWinePourOrder`), `roster`, `heartbeat`.

**New: piggyback on existing `lesson` event** — extend payload to include:
- `currentWineFocusStartedAt: string | null` (ISO timestamp)
- `revealedPourOrders: number[]`
- `blindTasting: boolean`

Adding these to the existing event avoids a third event type. Backwards-compatible — old clients ignore unknown fields.

**New event: `swarm`** — fires when the per-wine aggregation changes. Payload:
```ts
{
  byPourOrder: Record<number, {
    avgRating: number
    ratingCount: number
    aromaCounts: Array<{ label: string; count: number }> // top 10, sorted desc
  }>
}
```

Aggregation logic on the backend (in the SSE poller):
1. Fetch all reviews for the session: `payload.find({ collection: 'reviews', where: { session: { equals: sessionId } } })`.
2. Map each review to a pour order via wine id OR custom-wine name (lowercased) — same logic as the wrap-up email's `buildGroupComparison`.
3. For each pour order: collect ratings, collect aromas from `wsetTasting.nose.primaryAromas`.
4. Compute averages; tally aromas; top 10, bucket rest as `Annat`.
5. Compare against last sent; emit only on change.

### Blind redaction in SSE

When `session.blindTasting === true` and a wine's pour order is NOT in `revealedPourOrders`, the SSE backend should NOT include that wine's identity in any payload. Currently SSE only emits the host pointer + roster + swarm — NONE of those include wine identity, so the current SSE design is naturally blind-safe.

**However**: the initial server-rendered detail page (`/mina-provningar/planer/[id]?session=...`) embeds the full `session.tastingPlan.wines` tree in the HTML. We must redact this server-side before passing to PlanSessionContent. Specifically: in `PlanSessionShell` (server component? Actually it's client — let me verify; if client, redact in the page-level `loadSessionContext` step).

**Implementation choice**: redact in the page server-render. The page reads `?session=<id>` and renders `PlanSessionShell`; before passing the plan to the shell, walk `plan.wines` and replace `libraryWine` and `customWine` for any pour order NOT in `revealedPourOrders` when blind. Pass a derived `wines` array with redacted entries.

The non-redacted plan is still available for the **host's** view — only redact for guests. The page knows `isHost` from `?host=true` query param.

Actually simpler: ALWAYS redact for guests in blind mode at the server boundary. The host always sees full info (they're the only person who needs to know the answer). This matches the spec's intent.

### Submission-tracking endpoint

`GET /api/sessions/[sessionId]/my-submissions` (NEW) — returns the pour orders the calling participant has already submitted reviews for:
```ts
{ submittedPourOrders: number[] }
```

Uses cookie-based participant identity (the same `vk_participant_token` Chunks 1-2 set). Falls back to user identity if authed. Returns 401 if neither identifies the caller.

Used on client mount to seed the local "what have I already submitted" Set. After each successful WineReviewForm submission, the client appends the pour order locally — no need to re-fetch.

## UI changes

### `TastingPlanForm` (wizard)

New "Provningsinställningar" section between the participants field and the wine list. Two controls:

- Checkbox: `Blindprovning` (description below: "Viner visas anonymt tills du avslöjar dem.")
- Number input: `Tid per vin (minuter)` — placeholder `t.ex. 5`, helper text "Lämna tomt för ingen timer."

Wires to `blindTastingByDefault` and `defaultMinutesPerWine` on the plan body. Persists through POST/PATCH like the rest.

### `StartSessionButton` (create-session modal)

When in plan mode, add a small toggle row in the create-session step (before "Skapa session"):

- Toggle: `Blindprovning` (defaulted from `plan.blindTastingByDefault`)
- Subtext: "Du kan avslöja viner ett i taget under sessionen."

POST body includes `blindTasting: <bool>`.

For course mode: no change. The toggle row is gated on `isPlan`.

### `PlanSessionContent` (live session)

The biggest change. Each wine card now renders three new pieces conditionally:

**1. Blind redaction**
- If `session.blindTasting && !revealedPourOrders.includes(row.pourOrder)`:
  - Wine title → `Vin #{N}` (where N is the pour order)
  - Wine subtitle → empty
  - Image → `<WineImagePlaceholder size="sm">` always
  - Host-notes line → hidden (already host-only anyway)
- For the host, even when blind, the full wine identity should be visible — pass `isHost` through and skip redaction in the host's render path.

**2. Reveal button (host-only, blind-mode only)**
- When wine is hidden AND viewer is host: extra button in the action row labeled `Avslöja vin #{N}` (variant outline, smaller).
- Click: POST `/api/sessions/[id]/host-state` with `{ revealPourOrder: pourOrder }`. Optimistic: append to local `revealedPourOrders` state.
- Once revealed, the button disappears and the wine identity flips in.

**3. Timer chip** (new `WineFocusTimer` component)
- Renders only when:
  - `session.currentWinePourOrder === row.pourOrder` (this is the focused wine)
  - `plan.defaultMinutesPerWine > 0`
  - `session.currentWineFocusStartedAt` is set
- Chip content: `mm:ss` countdown, refreshed every second via `setInterval`.
- Color states:
  - Remaining > 30s: muted-gray chip (`bg-muted text-muted-foreground`)
  - Remaining ≤ 30s and > 0: amber (`bg-amber-100 text-amber-900` or similar; matches site amber tokens)
  - Remaining ≤ 0: red chip `Dags att gå vidare?` (`bg-destructive/10 text-destructive`)
- For the host only: when at zero, a `→ Nästa vin` button appears next to the chip. Click → POST host-state with `currentWinePourOrder: pourOrder + 1` (skips if last wine — show toast "Sista vinet").

**4. Swarm panel** (new `SwarmPanel` component)
- Renders below the action buttons on each wine card.
- Gated:
  - Host: always visible.
  - Guest: visible only if `submittedPourOrders.includes(row.pourOrder)`.
- Empty state (no reviews yet, but gate satisfied): muted text "Inga betyg ännu — du var först."
- Populated state: a small card with:
  - Header: `★ 4.2 (3 betyg)` (uses `★` + average to 1 decimal + count in parens)
  - Aroma chips: small pill row with `Hallon (3)` `Vanilj (1)` `Päron (1)` etc. Top 10 sorted by count desc, `Annat (n)` at the end if overflow.
- Updates live via the `swarm` SSE event.

### `SessionContext` extensions

Add to `SessionContextValue`:
- `swarm: Record<number, SwarmEntry>` — per-pour-order aggregations.
- `setSwarm: (s: typeof swarm) => void` — used by RealtimeSync.
- `hostFocusStartedAt: string | null` — ISO timestamp for timer calc.
- `setHostFocusStartedAt: (s: string | null) => void`.
- `revealedPourOrders: number[]` — synced from SSE.
- `setRevealedPourOrders: (a: number[]) => void`.

### `RealtimeSync` extensions

Listen for the existing `lesson` event with new fields:
```ts
es.addEventListener('lesson', (e) => {
  const data = JSON.parse((e as MessageEvent).data)
  setHostCurrentLessonId(data.currentLessonId ?? null)
  if ('currentWinePourOrder' in data) setHostCurrentWinePourOrder(data.currentWinePourOrder ?? null)
  if ('currentWineFocusStartedAt' in data) setHostFocusStartedAt(data.currentWineFocusStartedAt ?? null)
  if (Array.isArray(data.revealedPourOrders)) setRevealedPourOrders(data.revealedPourOrders)
})
```

Listen for the new `swarm` event:
```ts
es.addEventListener('swarm', (e) => {
  const data = JSON.parse((e as MessageEvent).data) as { byPourOrder: Record<number, SwarmEntry> }
  setSwarm(data.byPourOrder)
})
```

### Tracking own submissions

In `PlanSessionContent`:
```ts
const [submittedPourOrders, setSubmittedPourOrders] = React.useState<Set<number>>(new Set())

// Seed on mount from /my-submissions
React.useEffect(() => {
  fetch(`/api/sessions/${session.id}/my-submissions`)
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data?.submittedPourOrders) setSubmittedPourOrders(new Set(data.submittedPourOrders))
    })
}, [session.id])

// On successful submission, append locally
function handleReviewSubmit(pourOrder: number) {
  setSubmittedPourOrders(prev => new Set([...prev, pourOrder]))
  setReviewing(null)
}
```

`WineReviewForm`'s `onSubmit` callback gets the pour order or we infer it from the `reviewing` row.

## File structure

```
MOD src/collections/TastingPlans.ts                                    + 2 fields
MOD src/collections/CourseSessions.ts                                  + 3 fields
NEW src/migrations/<ts>_chunk_f_host_superpowers.ts                    additive
MOD src/components/tasting-plan/TastingPlanForm.tsx                    Provningsinställningar section
MOD src/components/course/StartSessionButton.tsx                       blindTasting modal toggle
MOD src/app/api/sessions/create/route.ts                               accept blindTasting; stamp from plan default
MOD src/app/api/sessions/[sessionId]/host-state/route.ts               accept revealPourOrder; stamp focus timestamp
MOD src/app/api/sessions/[sessionId]/stream/route.ts                   extend lesson payload; emit swarm event; aggregator
NEW src/app/api/sessions/[sessionId]/my-submissions/route.ts           my submissions endpoint
MOD src/app/(frontend)/(site)/mina-provningar/planer/[id]/page.tsx     blind redaction for guests
MOD src/context/SessionContext.tsx                                     swarm + focusStartedAt + revealedPourOrders
MOD src/components/course/RealtimeSync.tsx                             listen for new fields/event
MOD src/components/tasting-plan/PlanSessionContent.tsx                 redaction, reveal button, timer, swarm
NEW src/components/tasting-plan/WineFocusTimer.tsx                     countdown chip
NEW src/components/tasting-plan/SwarmPanel.tsx                         per-wine swarm display
```

## Reuse map

| Need | Source |
|---|---|
| Migration tooling | `pnpm migrate:create` |
| `host-state` POST contract | already extended in Chunk C (currentWinePourOrder) — add a third body variant |
| SSE plumbing | existing `/stream` route + RealtimeSync; add fields + new event |
| WineImagePlaceholder | `src/components/wine/WineImagePlaceholder.tsx` |
| Star rendering | `★` / `☆` unicode (already used in wrap-up email) |
| Aroma source-of-truth | participants submit `wsetTasting.nose.primaryAromas` via `WineReviewForm` (already collected) |
| sonner toasts | existing |

## Risks

| Risk | Mitigation |
|---|---|
| Wine identity leaks via SSE/page payload in blind mode | Server-side redact in page render BEFORE passing plan to client. SSE doesn't carry wine identity already. Belt-and-suspenders. |
| Timer drift between clients | Server timestamps; client computes remaining from `now() - startedAt`. ±2s is acceptable. |
| Aroma label drift (case, whitespace) | Trim + Swedish-locale lower-case when keying. First label encountered wins for display capitalization. |
| Swarm payload size | Top-10 cap per wine; rest as `Annat (n)`. |
| `revealedPourOrders` JSON column on Postgres | Payload's `type: 'json'` is well-supported; serialized as JSONB. No need for a separate join table. |
| Reveal-all UX in long tastings | Single reveal per card; no bulk button in MVP. Acceptable. |
| Reveal race: host taps reveal at moment SSE poll runs | Optimistic local state on host's device; SSE catches up within 2s for guests. |

## Out of scope (deferred)

- Bulk reveal ("avslöja alla").
- Auto-advance on timer zero.
- Sound or haptic at timer zero.
- Timer pause/resume.
- Re-blind a revealed wine.
- Per-participant submission deadline.
- Aroma autocomplete to enforce canonical labels.
- Swarm chart visualizations (bar/pie); stick to chips.

## Verification

1. Migration applies cleanly: 5 columns, all nullable/defaulted.
2. Wizard: toggle + minutes input save and round-trip on plan create + edit.
3. Session-create with `blindTasting: true` body stamps the session.
4. Page render: when blind, guest's view shows `Vin #N` for unrevealed wines; host's view shows full info.
5. SSE event payload (inspected via devtools): wine identity NOT present for unrevealed wines (defense-in-depth even though SSE doesn't normally carry it).
6. Reveal: host taps Avslöja → guest's card flips within 2s.
7. Timer: starts on focus; counts down; turns amber at ≤30s; red at zero; `→ Nästa vin` appears for host only.
8. Swarm panel: hidden for guest until they submit; appears immediately on submit; aroma counts match the actual reviews; updates within 2s when a new review lands.
9. Edge case: a wine with zero reviews shows the empty-state in the swarm.
10. Edge case: aroma overflow renders `Annat (n)` chip.

## Effort estimate

3–4 working days.
