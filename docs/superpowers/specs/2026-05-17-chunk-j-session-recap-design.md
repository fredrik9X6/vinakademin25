# Chunk J — Session Recap + Compare-Me-vs-Group — Design

**Author:** Fredrik (with assistant)
**Date:** 2026-05-17
**Status:** Draft, awaiting final review

## Context & motivation

When a tasting session ends today, hosts get redirected to the plan detail page and guests get bounced to `/`. There is no place to see "what happened" — no group consensus, no comparison between your palate and the room, no closure. We have all the data (every review with WSET tasting notes, per-pour aggregates already computed live in `stream/route.ts`) — it just disappears the moment the host clicks "Avsluta session".

`/mina-provningar/historik/[sessionId]` already exists and renders a thin "your reviews from this session" list. It's the natural home for the recap — same auth surface (host or participant), same route, just a richer view. Replace the current minimal view with the recap and you get post-tasting closure for free; no new routes, no fresh auth.

This chunk covers improvement **#6 (end-of-session group recap)** and **#7 (compare-me-vs-group)** from the May 17 conversation. They are tightly coupled — the compare card shares the same aggregations as the headline stats, so building them separately would mean computing the same per-wine statistics twice.

## What ships in v1

- One new server-side helper `src/lib/session-recap.ts` that takes a session id + the auth viewer and returns an aggregated `RecapData` object.
- A rewritten `SessionHistoryDetail.tsx` (same file, same export) that renders the recap layout instead of the current minimal list.
- A new `SessionRecapHeader` component for the three headline stats.
- A new `WineRecapCard` component for each per-wine row (group stats + your-vs-group compare).
- Two redirect updates in `PlanSessionContent.tsx`: host-end and guest-leave both now land on `/mina-provningar/historik/[sessionId]` (today they go to the plan detail page and `/` respectively).
- No new collections, no schema changes, no migrations.
- No PNG export (deferred to v2 — easy to bolt on later once the recap shape is stable).

## Architecture

### Route

Reuse the existing route: `src/app/(frontend)/(site)/mina-provningar/historik/[sessionId]/page.tsx`.

The page already does:
1. Auth check (logged-in user required, redirect to /logga-in otherwise).
2. Session lookup at `depth: 2`.
3. Host-vs-participant determination (`isHost = session.host.id === user.id`, else look up `session-participants` row by user+session).
4. Pulls the viewer's own reviews for the session.

We extend it to ALSO call the new `getSessionRecap(payload, session, viewerUserId)` helper, then pass the resulting `recap` plus the existing props into the rewritten `SessionHistoryDetail`.

Out-of-scope for v1: unauthenticated guests with only a participant cookie. They currently can't access `/mina-provningar/historik/[sessionId]` (auth gate). They can claim their participant via email (existing flow) to gain access. Lowering the gate to accept participant cookies is a separate spec.

### Aggregation helper — `src/lib/session-recap.ts`

```ts
export interface PerWineRecap {
  pourOrder: number
  title: string                 // resolved wine title (library or custom)
  thumbUrl: string | null
  isCustomWine: boolean
  ratingCount: number
  avgRating: number | null      // null when ratingCount === 0
  ratingStdDev: number | null   // population std-dev; null when ratingCount < 2
  topFlavours: Array<{ label: string; count: number }>  // top 5 + 'Annat' rollup
  myReview: {
    rating: number | null
    flavours: string[]          // union of palate primary/secondary/tertiary (deduped)
    reviewText: string | null
  } | null
}

export interface RecapHeadline {
  // 'top' = highest avg rating, requires at least 2 ratings to avoid noisy
  // single-reviewer wins. Null when no wine meets the threshold.
  topWine: { pourOrder: number; title: string; avgRating: number; ratingCount: number } | null
  // 'mostDivisive' = highest std-dev. Same min-count gate as above. Null when
  // no wine has >= 2 ratings (std-dev needs at least 2 samples).
  mostDivisive: {
    pourOrder: number
    title: string
    ratingStdDev: number
    ratingCount: number
  } | null
  // Top 3 flavours summed across all wines (deduped per review per wine, then
  // counted across the session). Same dedup logic the swarm aggregator uses.
  topGroupFlavours: Array<{ label: string; count: number }>
  totalReviewers: number        // distinct sessionParticipant ids (or user ids)
  totalReviews: number          // raw review count for this session
}

export interface RecapData {
  headline: RecapHeadline
  perWine: PerWineRecap[]
}

export async function getSessionRecap(
  payload: Payload,
  session: CourseSession,
  viewerUserId: number,
): Promise<RecapData>
```

Implementation outline:
- Load all `reviews` where `session = id`, `limit: 1000`, `depth: 1` (joins wine + sessionParticipant for the lookup map).
- Load the plan's `wines` array off the joined session (already at `depth: 2` from the page).
- Build the same wine-id-to-pour-order and product-number-to-pour-order maps that the live swarm aggregator builds in `src/app/api/sessions/[sessionId]/stream/route.ts:280-298`. Lift that logic into a small shared helper `src/lib/session-pour-mapping.ts` to avoid divergence (or copy with a code comment pointing at the canonical site — TBD in the plan, see Risk section).
- For each pour: accumulate `ratings[]` and `flavoursPerReview: Set<string>[]` from palate primary/secondary/tertiary tiers (matching the `release: session swarm — Smaker label + palate-tier union` shipped earlier).
- Compute avg + population std-dev. Compute top flavours: sum the per-review Sets into a Map, sort desc, slice 5, fold the rest into "Annat" if count > 0.
- For `myReview`: filter the reviews by viewer (host: `review.user.id === viewerUserId`; participant: `review.sessionParticipant.id === participantId`). Capture rating + the union flavour list + reviewText for each pour the viewer reviewed.
- Headline computation:
  - `topWine` = wine with `ratingCount >= 2` and the highest `avgRating`. Ties broken by `ratingCount` desc.
  - `mostDivisive` = wine with `ratingCount >= 2` and highest `ratingStdDev`. Ties broken by `avgRating` ascending (the more controversial wine wins).
  - `topGroupFlavours` = global top 3 from the flavour-frequency union across all wines.
  - `totalReviewers` = distinct `sessionParticipant` ids OR user ids (whichever is non-null on each review).
  - `totalReviews` = `reviews.length`.

### Components

```
src/components/session-history/
  SessionHistoryDetail.tsx       (rewritten, same export)
  SessionRecapHeader.tsx         (new — three headline stat cards)
  WineRecapCard.tsx              (new — per-wine card with group stats + compare)
```

#### `SessionRecapHeader.tsx`

Three stat cards in a row (responsive: stack on mobile). Reuses the same `StatCard` look as the public profile page (`src/components/profile/PublicHostProfile.tsx`) for consistency:

- **Veckans favorit** — title of `topWine` + avg rating in stars. Subtitle: `N betyg`. If null, show "För få betyg".
- **Mest delande** — title of `mostDivisive` + std-dev as bars or numeric. Subtitle: `Spridning ±X betyg`. If null, hide the card.
- **Smaker rummet pratade om** — top 3 group flavour chips. If empty, hide the card.

#### `WineRecapCard.tsx`

Per-wine card. Reuses the same big-faded-number-behind-bottle visual we adopted in `PlanSessionContent` / `TemplateDetailView` so the recap feels visually continuous with the live session view.

Layout (mobile-first, single column; lg+ goes 2-column with the compare card on the right):

```
┌──────────────────────────────────────────────────────┐
│ [4 big # ][bottle]  Wine title                       │
│                     Producer · 2021 · Bordeaux       │
│                                                      │
│ Gruppen                Du                            │
│ ★★★★☆ 4.2 (6 betyg)    ★★★★★ 5.0                    │
│ Vanligaste smaker:     Dina smaker:                  │
│ [Hallon (5)] [Viol (4)] [Hallon] [Vanilj] [Choklad] │
│ [Lakrits (3)]                                        │
│                                                      │
│ "Du gav 0.8 över snittet. Du noterade Vanilj +        │
│  Choklad som gruppen inte plockade upp."            │
└──────────────────────────────────────────────────────┘
```

The narrative footer is generated client-side from the data:
- `diff = myRating - avgRating`. If `|diff| >= 0.5`, generate a sentence: "Du gav X.X över/under snittet."
- `unique = myFlavours - topGroupFlavours.map(f => f.label)`. If `unique.length > 0`, mention up to 2: "Du noterade A och B som gruppen inte plockade upp."
- If the viewer didn't submit a review for this wine: skip the right column, show "Du recenserade inte det här vinet" instead.

#### Rewritten `SessionHistoryDetail.tsx`

```tsx
export function SessionHistoryDetail({ session, isHost, recap }: Props) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      <BackLink href="/mina-provningar/historik" />
      <header>
        <Badge>{isHost ? 'Värd' : 'Gäst'}</Badge>
        <h1>{sessionTitle(session)}</h1>
        <p>{date} · {recap.headline.totalReviewers} deltagare · {recap.headline.totalReviews} recensioner</p>
      </header>
      <SessionRecapHeader headline={recap.headline} />
      <section>
        <h2>Vin för vin</h2>
        <ul>
          {recap.perWine.map((w) => <li key={w.pourOrder}><WineRecapCard {...w} /></li>)}
        </ul>
      </section>
      {isHost && planId && <Link href={`/mina-provningar/planer/${planId}`}>Visa planen →</Link>}
    </div>
  )
}
```

`myReviews` prop drops off — `recap.perWine[].myReview` replaces it.

### Post-session redirect updates

`src/components/tasting-plan/PlanSessionContent.tsx` — two redirect sites:

1. `handleHostEnd` (line ~205): currently `router.push(\`/mina-provningar/planer/${plan.id}\`)`. Change to `router.push(\`/mina-provningar/historik/${session.id}\`)`.
2. `handleGuestLeave` (line ~228): currently `router.push('/')`. Change to `router.push(\`/mina-provningar/historik/${session.id}\`)` but ONLY if the session has been ended (status `'completed'`) OR the guest claimed the session (has account). For an active session the guest is leaving mid-tasting, going to `/` is still right. We detect this via the SSE event for session completion. Simpler v1: only redirect on end-from-host; guest mid-leave still goes to `/`. (The guest will receive the wrap-up email with a "Se sammanfattning" link from chunk D.)

Actually — re-checking: the guest "Lämna" button only fires while the session is active. There's no "session ended" leave path because when the host ends the session, all participants are disconnected by the SSE close. To handle this cleanly, we'd add a "Visa sammanfattning" prompt on the guest side when the SSE detects session completion. That's a follow-up — out of scope for this chunk. **For v1 only the host redirect changes.**

### Reused utilities / patterns

- `getUser()` and the auth gate on the existing page — untouched.
- `StatCard` look from `PublicHostProfile.tsx` — reuse the same Card + Tailwind treatment (don't extract a shared component yet — YAGNI).
- The big-faded-number visual pattern from `PlanSessionContent` / `TemplateDetailView` — copy the same JSX block (it's 6 lines, not worth a shared component until used in a 4th place).
- `WineImagePlaceholder` for missing bottle images.
- `cn` from `src/lib/utils.ts`.

## What we explicitly do NOT do in v1

- **No PNG/shareable export.** Once the recap layout is stable, adding a "Dela" button that captures the page as an image is a 1-day follow-up (using `html-to-image` or similar). Deferred.
- **No unauthenticated guest access via participant cookie.** Guests must log in / claim their participant to view the recap. The wrap-up email (chunk D) gives them a deep link with claim affordance.
- **No mid-session leave redirect change.** A guest who hits "Lämna" while the session is still active still lands on `/`. Only the post-end redirect (host-end) goes to the recap.
- **No "Most aligned with the group" or "Outlier of the night" badges per participant.** Same data shape supports it, but it adds social pressure we haven't designed for.
- **No per-flavour drill-down.** Tapping a chip doesn't show "who picked this?" — that's a multi-tap-to-see-others' surface and clutters v1.
- **No filtering of `topGroupFlavours` to "uncommon" picks.** We show the literal top 3 by raw count even if they're "Hallon, Hallon-ish, Hallon-adjacent".

## Verification

End-to-end smoke list for the implementer:

1. **Recap loads from history.** Create a tasting with 4 wines, run a session with 3 participants, submit a few reviews. End the session. Click into `/mina-provningar/historik/[sessionId]`. Confirm three header cards render with sensible content, four wine cards below.
2. **Top wine pick.** Wine A has avg 4.5 across 4 reviews, wine B has avg 5.0 with 1 review. Confirm `topWine = A` (the min-count threshold kicked the 1-review winner out).
3. **Most divisive pick.** Wine C: 5 reviews all giving exactly 4 stars (std-dev 0). Wine D: 5 reviews giving 2/2/3/5/5 (std-dev > 1). Confirm `mostDivisive = D`.
4. **Top group flavours.** Across 4 wines, "Hallon" picked by 6 different reviewers, "Vanilj" by 4, "Lakrits" by 3, "Päron" by 2. Confirm header shows `[Hallon (6)] [Vanilj (4)] [Lakrits (3)]`.
5. **Compare card for the viewer.** As a guest who rated wine 2 = 5★ with `[Vanilj, Choklad]` while the group avg is 4.0 with top flavours `[Hallon, Viol, Lakrits]`: confirm the narrative footer says something like "Du gav 1.0 över snittet. Du noterade Vanilj och Choklad som gruppen inte plockade upp."
6. **No-review-for-this-wine case.** As a guest who skipped wine 3, confirm the compare side shows "Du recenserade inte det här vinet" instead of a stars row.
7. **Host post-end redirect.** End a session as host → land on `/mina-provningar/historik/[sessionId]`. (Previously landed on the plan detail page.)
8. **Auth still gates.** Logged-out visit to `/mina-provningar/historik/[sessionId]` still redirects to `/logga-in?from=...` — unchanged.
9. **Sparse session.** End a session with zero reviews. Confirm header cards show "För få betyg" / hide the divisive card / hide the group-flavours card. Per-wine cards show "Inga betyg ännu" placeholders. Page doesn't crash.
10. **Custom-wine match.** A wine entered via the picker (no library record) with `systembolagetProductNumber` set. Reviewers submitted via the same product-number → confirm recap counts those reviews against the right pour order.

## Risk / fallback

- **Pour-mapping divergence.** The live swarm aggregator in `stream/route.ts` and the new recap helper both need the wine-id-to-pour and product-number-to-pour maps. Plan task: lift into `src/lib/session-pour-mapping.ts` and update the streamer to use the shared helper too. If that proves intrusive, copy with a comment pointing to the canonical site — slight DRY violation, acceptable.
- **Std-dev with few samples.** With 1 reviewer, std-dev is undefined → return `null` and gate the divisive card on that. With 2 reviewers, std-dev exists but can be noisy — keep the threshold at `ratingCount >= 2` for v1 and tune later if hosts complain.
- **Custom-wine name collision.** Two reviewers entering "Pinot Noir" by hand on the same plan could currently double-count. The existing swarm aggregator handles this with the title-to-pour map (last write wins on collision). The recap helper inherits the same trade-off.
- **Component churn on the historik route.** The current `SessionHistoryDetail` ships in prod today. Rewriting it is a wholesale replacement, not a diff — and the only consumer of the old props (`myReviews`) is the page itself. We update the page in lockstep.
- **Localization.** All copy is Swedish. Narrative footer strings go in `src/lib/session-recap-copy.ts` so they're easy to find later if we extract for i18n.
