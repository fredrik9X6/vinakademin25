# Chunk M — Live Roster Engagement — Design

**Author:** Fredrik (with assistant)
**Date:** 2026-05-17
**Status:** Draft, awaiting final review

## Context & motivation

The `SessionRoster` card sits in the sidebar of every active session showing who's in the room. Today each row is dead — just a nickname and a "Lobbyn / Vin N" indicator. Two cheap improvements:

1. **Live points.** With the blind-tasting guess card shipped (Chunk I), every guest accumulates points as wines get revealed. Surfacing those points in the roster turns the side panel into a live scoreboard — guests can watch their position move in real time as each new wine is revealed. Same engagement loop as the post-session leaderboard, just live.
2. **Clickable names.** Hosts always have public profiles (`/profil/<handle>`) and guests-with-accounts can opt in. Wrapping the nickname in a `<Link>` when a public handle exists lets people quickly browse a co-taster's reviews + past tastings without leaving the session.

Both ride on data the stream already polls; net-cost is one extra DB query per 5-second roster tick + ~2 fields per roster entry.

## What ships in v1

- `RosterEntry` gains two fields: `points: number` and `profileHandle: string | null`.
- The SSE stream's roster builder is bumped from `depth: 0` to `depth: 1` so it can read each participant's `user.handle` and `user.profilePublic`. The host's handle comes from the already-populated `session.host` join.
- A new `livePoints(payload, session, plan, revealedPourOrders)` helper aggregates points per participant for wines that **have been revealed** (only — pre-reveal guesses don't score, matching the live `BlindGuessCard` reveal-mode display).
- The roster builder calls the helper once per tick and stamps `points` on each entry.
- The `SessionRoster` component renders `points` below the nickname when > 0, and wraps the nickname in `<Link href="/profil/{handle}">` when `profileHandle` is present.

No new collections. No migrations. No schema changes. No new endpoints.

## Architecture

### 1. `RosterEntry` shape change

`src/context/SessionContext.tsx`:

```ts
export interface RosterEntry {
  id: number
  nickname: string
  currentLessonId: number | null
  isHost: boolean
  online: boolean
  /** Points accumulated from blind-tasting guesses that have already been
   * revealed. 0 on non-blind sessions. */
  points: number
  /** Public profile slug, if the participant has opted in. Roster row links
   * to /profil/<handle> when set. `null` for hosts/guests without a public
   * profile (or anonymous guests). */
  profileHandle: string | null
}
```

Backwards compatibility: the new fields are required so all callers update in lockstep — but the only producer is `stream/route.ts` and the only consumer is `SessionRoster.tsx`. Both updated in this chunk.

### 2. Roster builder — `src/app/api/sessions/[sessionId]/stream/route.ts`

Current builder fetches participants at `depth: 0`. Bump to `depth: 1` so the user join lands. Pull the handle when both `user.handle` is non-empty and `user.profilePublic === true`.

```ts
const partsRes = await payload.find({
  collection: 'session-participants',
  where: { session: { equals: sessionId } },
  limit: 200,
  depth: 1,             // <-- was 0
  overrideAccess: true,
})
```

For each participant:

```ts
const userObj =
  typeof p.user === 'object' ? p.user : null
const handle =
  userObj?.profilePublic && typeof userObj.handle === 'string' && userObj.handle.trim()
    ? userObj.handle
    : null
```

Same shape applies to the host entry (already at depth: 1 elsewhere in the builder).

### 3. Live points helper — `src/lib/session-live-scores.ts` (new)

```ts
export interface LiveScoreMaps {
  /** participantId → points */
  byParticipantId: Map<number, number>
  /** userId → points (covers host-as-user reviews & non-guest members) */
  byUserId: Map<number, number>
}

export async function computeLivePoints(
  payload: Payload,
  sessionId: number | string,
  wines: ReadonlyArray<unknown>,
  revealedPourOrders: ReadonlyArray<number>,
): Promise<LiveScoreMaps>
```

Behaviour:
- Returns empty maps when `revealedPourOrders` is empty (saves a DB roundtrip on lobby + early-session ticks).
- Loads all `session-guesses` for the session at `depth: 0`.
- Builds the same per-pour `BlindAnswer` map the recap aggregator builds — country/grape override → library wine join → price-bucket override → raw price → bucket. Lives behind a small inline helper since the recap aggregator already does this inline; we won't extract until a 3rd caller appears.
- For each guess where `revealedPourOrders.includes(pourOrder)`, run `scoreOne` and accumulate per participant + user.

Reuses:
- `scoreOne` and `resolveAnswerPriceBucket` from `src/lib/blind-guess-scoring.ts`.

This helper is called once per roster build inside `buildRoster()`. Adds one DB query per 5s tick — negligible.

### 4. Roster builder wiring

Inside `buildRoster()`:

```ts
const livePoints = blindTasting && revealed.length > 0
  ? await computeLivePoints(payload, sessionId, plan?.wines ?? [], revealed)
  : { byParticipantId: new Map<number, number>(), byUserId: new Map<number, number>() }
```

The `blindTasting && revealed.length > 0` short-circuit keeps non-blind sessions free of the extra query and skips the work entirely when nothing has been revealed yet.

For each participant entry:

```ts
points: livePoints.byParticipantId.get(p.id) ?? 0
```

Host entry: `points: 0` (hosts don't guess in their own session — and if they did via a separate guest device, that's covered by the participant tally).

To get `revealed` and `blindTasting` flags in `buildRoster()`: they're already read in `readHostPointer()`. Either share the read or re-read in the roster builder. Cheapest: pass them in (the roster builder is called inside the SSE stream context — they're in scope after the first `readHostPointer()`).

### 5. `SessionRoster` component

`src/components/course/SessionRoster.tsx` — render the row:

```tsx
<li className="...">
  <div className="flex items-center justify-between gap-2">
    <div className="flex items-center gap-2 min-w-0">
      {p.isHost && <Crown className="..." />}
      {p.profileHandle ? (
        <Link href={`/profil/${p.profileHandle}`} className="hover:underline truncate">
          {p.nickname}
        </Link>
      ) : (
        <span className="truncate">{p.nickname}</span>
      )}
      {isSelf && <span className="text-muted-foreground text-xs"> (du)</span>}
    </div>
    {p.points > 0 && (
      <span className="text-xs font-medium text-brand-400 flex-shrink-0">
        {p.points} p
      </span>
    )}
  </div>
  <div className="...lesson label...">{lessonLabel}</div>
</li>
```

Points hide on `=== 0` so the column doesn't fill with `0 p` clutter on non-blind sessions.

Note: when the host reveals a wine and `BlindGuessCard` transitions to "scored" state, the user's own card already shows their points for that wine. The roster aggregate is the running total across all revealed wines. They line up.

### Reused utilities / patterns

- `scoreOne` from `src/lib/blind-guess-scoring.ts`.
- `Link` from `next/link`.
- Existing `RosterEntry`/`SessionRoster` shape — no new component file beyond the helper.

## Layout + sort change (per feedback)

- **Host renders separately**, in its own labelled section above the participants list. The "Deltagare (N)" block underneath only counts non-host rows.
- **Participants sort by points desc, then nickname asc** for stable ties. With points hidden on non-blind sessions (always 0), the effective behaviour there stays alphabetical, matching pre-chunk behaviour.
- Reshuffle happens server-side in `buildRoster()`. Each 5s tick re-sorts based on the latest live points, so the client sees an already-ordered array and rendering stays declarative.

## What we explicitly do NOT do in v1
- **No medal icons in the roster.** Reserved for the recap. Keep the live view utilitarian.
- **No host-side hover/click affordance to see per-wine breakdown.** The recap is the place for that.
- **No animation on points change.** A subtle pulse would be nice but not in v1.
- **No per-wine "you just got X points!" toast.** The `BlindGuessCard` already shows scored rows on reveal; the toast would be double-counting.
- **No guest-without-handle prompt** to set a handle from the roster. We don't push profile creation here — that's the recap's job (Chunk L).
- **No anonymous participant browse.** If a guest has no `user` linkage (pure anonymous join), the row stays unclickable. We don't surface a fake "view this guest" page.
- **No de-anonymization across sessions** (no "this is the same person who was in your last tasting" hinting).

## Verification

End-to-end smoke list:

1. **Schema unchanged.** Confirm `pnpm generate:types` is a no-op — RosterEntry lives in code only.
2. **Non-blind session.** Run a session with blind tasting OFF. Open the roster. Confirm no "X p" labels appear next to any participant.
3. **Blind session, pre-reveal.** Run a blind session, host hasn't revealed any wines yet. Confirm no points appear on the roster (even though guests have submitted guesses).
4. **Blind session, mid-reveal.** Have 2 guests submit guesses for wines 1 + 2 (different correctness). Host reveals wine 1. Within 5–7s, the roster should update each guest's "X p" tally based only on wine 1's correctness.
5. **Reveal wine 2** — confirm tallies update with wines 1 + 2 combined. The two guests' points should reflect their cumulative correct picks across the two revealed wines.
6. **Roster ordering doesn't reshuffle.** Even when leaderboard order would change, the roster stays alphabetized — only the "X p" labels move.
7. **Clickable name (host).** As a guest, click the host's nickname in the roster. Confirm navigation to `/profil/<host-handle>`.
8. **Clickable name (member guest).** A logged-in guest with `handle` + `profilePublic: true` — click their name in the roster as another guest. Confirm navigation.
9. **Non-clickable name (private profile).** A logged-in guest with `handle` but `profilePublic: false` — confirm their row is a plain `<span>`, no underline-on-hover, no link.
10. **Non-clickable name (anonymous guest).** A pure cookie-only guest with no `user` link — confirm their row is plain text.
11. **Self isn't clickable to themselves.** Mostly a non-issue (clicking your own row goes to your own profile, which is fine) but worth eyeballing.
12. **Roster updates within 5s of a reveal.** Open DevTools → Network → the SSE connection. After clicking "Avslöja vin N", confirm a `roster` event lands within the next poll tick (5s) with the new `points` values on each entry.

## Risk / fallback

- **Stale points after a guess edit.** If a guest edits their guess via "Ändra" after submitting, the change lands in the DB immediately. Until the next 5s roster tick, the roster shows the old point total. Acceptable — guests only edit pre-reveal, when the wine isn't scored anyway.
- **Tie-breaking visual.** Two guests with the same points display "X p" identically. No medal/order on the roster — fine, the leaderboard handles ranking.
- **Roster load with many participants.** A 20-participant session means 20 `user` joins at depth: 1 in the find call. Payload handles this fine; if list view starts feeling slow we'd batch the user lookup, but at v1 scale (typical room is 4–8 people) it's a non-issue.
- **Handle change mid-session.** If a user changes their `handle` while a session is running, the roster picks up the new value on the next poll. The old `/profil/<old-handle>` link 404s for a few seconds. Edge case; not worth special-casing.
- **profilePublic toggled OFF mid-session.** Same — next roster tick drops the link. Existing route protection (`/profil/[handle]/page.tsx`) gates non-public profiles, so any stale link 404s cleanly.
- **Host-as-guest in their own session.** If a host opens the same session on a second device with a participant cookie and submits guesses, those points accumulate against the participant id, not against the host entry. The host's roster row stays at 0 p. Acceptable — hosts shouldn't be playing in their own tasting.
