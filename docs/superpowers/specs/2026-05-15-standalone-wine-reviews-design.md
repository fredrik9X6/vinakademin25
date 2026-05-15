# Standalone Wine Reviews — Design

**Author:** Fredrik (with assistant)
**Date:** 2026-05-15
**Status:** Draft, awaiting final review

## Context & motivation

Today, members can only review a wine inside a tasting session (host-led or solo from a plan). Outside that context — say a member opens a bottle at home — there's no way to log the experience. They have to wait for their next tasting.

Meanwhile, all the plumbing for a standalone review flow already exists from the Systembolaget chunks: the 3-tab `WinePicker` (library / Systembolaget / hand-typed), the `WineReviewForm` with WSET simple/advanced modes, the `Reviews` collection with the `wine` OR `customWine` snapshot pattern, and a `/api/reviews` POST handler that correctly accepts both paths. What's missing is the user-facing routes that compose those pieces outside a session.

This spec covers a private-journal-by-default review feature with opt-in publishing to the user's public profile (mirroring the existing `TastingPlans.publishedToProfile` pattern).

## What ships in v1

Six new surfaces + one collection field + one access-control change. No new collections. No new picker. No new form.

## Architecture

### Routes

| Route | Purpose | Auth |
|---|---|---|
| `/recensera-vin` | Standalone create flow: picker → form → save | Logged-in member |
| `/mina-recensioner` | Member's own reviews listing (private) | Owner only |
| `/mina-recensioner/[id]` | View / edit a single review | Owner only |
| `/vinlistan/[slug]` *(existing)* | Add "Recensera detta vin" CTA | Same as existing |
| `/profil/[handle]/recensioner` | Public listing of that user's published reviews | Public read (only published reviews surface) |
| `/profil/[handle]/recension/[id]` | Public single-review detail page | Public read (only if `publishedToProfile && profile_public`) |

### Reused components / endpoints

- `WinePicker` *(`src/components/tasting-plan/WinePicker.tsx`)* — 3-tab picker, used as-is on `/recensera-vin`. We'll move it out of `tasting-plan/` into `wine/` since it's no longer plan-specific (or alias the path). Minor.
- `WineReviewForm` *(`src/components/course/WineReviewForm.tsx`)* — reused with `sessionId={undefined}` and either `wineIdProp` (library wine) or `customWineSnapshot` (Systembolaget / hand-typed). Session-aware branches already gracefully handle no-session — verified by Chunk 2.
- `/api/reviews` POST — already handles both wine paths and admin probes (fixed in Chunk 2 — see [[project_reviews_api_traps]]).
- `/api/reviews` GET — Payload's native list endpoint, used for listings.

### Data model touch — `Reviews` collection

One additive field:

```ts
{
  name: 'publishedToProfile',
  type: 'checkbox',
  defaultValue: false,
  admin: {
    description:
      "When checked, this review appears on the owner's /profil/<handle>/recensioner page.",
  },
}
```

One migration: `add_review_published_to_profile`, single `ALTER TABLE reviews ADD COLUMN published_to_profile boolean DEFAULT false`. Default false means existing 106 prod reviews stay private.

### Access control change on `Reviews.access.read`

Today (`src/collections/Reviews.ts:17-28`):
- Admin/instructor → read all
- Logged-in user → read own + `isTrusted=true`
- Logged-out → read `isTrusted=true` only

The `isTrusted` flag is admin-curated and unrelated to user publishing. We add a fourth condition: anyone (logged-in or out) can read a review when `publishedToProfile === true` AND the author's `profile_public` is `true`. The combined rule becomes:

```ts
read: ({ req }) => {
  if (req.user?.role === 'admin' || req.user?.role === 'instructor') return true
  const publishedClause = {
    and: [
      { publishedToProfile: { equals: true } },
      { 'user.profile_public': { equals: true } },
    ],
  }
  if (req.user) {
    return {
      or: [
        { user: { equals: req.user.id } },
        { isTrusted: { equals: true } },
        publishedClause,
      ],
    } as any
  }
  return { or: [{ isTrusted: { equals: true } }, publishedClause] } as any
}
```

Profile-publishing depends on the user-side `profile_public` toggle that was added in a prior chunk — we honor it. Unpublishing the user's profile cascades: published reviews stop being publicly readable without needing to flip every review's flag.

## User flows

### Flow 1: Review from a library wine page

1. Member opens `/vinlistan/[slug]` (e.g. Barolo Albe G.D. Vajra).
2. Page shows existing content + a new **"Recensera detta vin"** button (primary action).
3. Clicking navigates to `/recensera-vin?wine=<id>`. Using a route (not a modal) so the URL is shareable / bookmarkable and back-button works.
4. The route reads the `wine` query param and mounts `WineReviewForm` with `wineIdProp=<id>`. The picker is skipped — wine is locked in.
5. Member fills WSET fields, sets rating, optionally toggles "Publicera på min profil", saves.
6. POST to `/api/reviews` → review row created with `wine: <id>, user: <self>, session: null, sessionParticipant: null, publishedToProfile: <toggle>`.
7. Redirect to `/mina-recensioner/[id]` (success).

### Flow 2: Standalone create (picker-first)

1. Member clicks "Recensera vin" in member nav / dashboard.
2. Lands on `/recensera-vin` with no query params.
3. `WinePicker` renders (3 tabs default: Systembolaget). Member searches, picks.
4. On pick, the page transitions to the form state — same screen, the picker collapses or hides and `WineReviewForm` renders below it with the picked context.
   - Library wine pick: `wineIdProp` passed
   - Systembolaget / custom pick: `customWineSnapshot` passed (built from the picker's projection — same as `TastingPlanForm` does it)
5. From here, identical to Flow 1 steps 5–7.

### Flow 3: View / edit own review

1. Member visits `/mina-recensioner` → list of their own reviews, newest first. Each row shows wine name (library or customWine.name), rating, date, published-badge if on.
2. Click a row → `/mina-recensioner/[id]` → form pre-filled with existing review data. Same `WineReviewForm` in "edit mode" (the form already handles populate-from-existing via `submittedReview` + `populateFormWithReview` — small adaptation needed to read from a route param instead of session lookup).
3. Save → `/api/reviews` PATCH (Payload's native update via the route handler) → returns to the list.

### Flow 4: Public profile

1. Anyone visits `/profil/[handle]/recensioner`.
2. Server-side fetch with `publishedToProfile=true` AND `user.profile_public=true` filter (Payload `find`). Server-side render the list — similar shape to `/profil/[handle]/[planId]` page pattern.
3. Each card links to `/profil/[handle]/recension/[id]` for the detail view (full WSET tasting notes + author display name snapshot — that snapshot already exists on `Reviews.authorDisplayName`).
4. If `profile_public=false` or no published reviews, the page is 404'd by the existing profile guard.

## Components — what's new

Five small React pages + a couple of layout pieces. All use existing Shadcn components.

| File | Purpose |
|---|---|
| `src/app/(frontend)/(site)/recensera-vin/page.tsx` | Standalone create — handles `?wine=<id>` shortcut and picker-first flow |
| `src/app/(frontend)/(site)/mina-recensioner/page.tsx` | Member's reviews listing (server-rendered, owner-filtered fetch) |
| `src/app/(frontend)/(site)/mina-recensioner/[id]/page.tsx` | Single-review edit view |
| `src/app/(frontend)/(site)/profil/[handle]/recensioner/page.tsx` | Public listing on profile |
| `src/app/(frontend)/(site)/profil/[handle]/recension/[id]/page.tsx` | Public single-review detail |
| `src/components/wine-review/WineReviewListItem.tsx` | Card component reused across the three listing views |
| `src/components/wine-review/PublishToProfileToggle.tsx` *(possibly inline)* | The checkbox surfaced in the form's "side panel" area |

`src/collections/Reviews.ts` gets the `publishedToProfile` field added and the `access.read` rule updated.

`src/migrations/<timestamp>_add_review_published_to_profile.ts` — single `ALTER TABLE` + index optional.

`/vinlistan/[slug]/page.tsx` — add the CTA button. ~10 lines.

Member nav — add a "Mina recensioner" link wherever the existing "Mina provningar" links live. ~5 lines.

## Edge cases

- **Already reviewed?** `/api/reviews` POST dedups on `(user, session, customWine.systembolagetProductNumber || customWine.name)` for customWine, and `(user, wine, session)` for library. For standalone reviews, `session=null` is part of the key — so a member can have one solo review per wine, independent of their session reviews of the same wine. If they create a second from the wine page, we update the first.
- **Publishing a review with a deleted user.** `authorDisplayName` snapshot already captures the name on create. We render the snapshot, not the live user record, so attribution survives. Same pattern as TastingPlans → profile.
- **`profile_public` toggled off.** Public listing/detail return 404 (profile gate already exists). When toggled back on, published reviews reappear without any per-review flag flips.
- **Hand-typed customWine reviews on a public profile.** Render the customWine.name as the wine title; no link to a wine page (since there's no curated wine to link to). Show the Systembolaget URL if present.
- **Editing a published review.** Edits update the public render immediately on save. No moderation queue (consistent with TastingPlan publishing).
- **Unauthenticated user opens `/recensera-vin`.** Redirect to `/logga-in?next=/recensera-vin` — match existing pattern from other authed routes.
- **WineReviewForm's "Edit review" branch.** Currently surfaced after a session submission. For `/mina-recensioner/[id]`, we mount the form in "edit existing" mode from the start — fetch review by id server-side, pass as `initialReview` prop. Form's existing `populateFormWithReview` handles the hydration; the `submittedReview` state initialization needs to accept a prop. Small targeted change inside `WineReviewForm`.

## Out of scope (deferred)

- **Promote-to-library workflow.** Defer entirely — see brainstorming Q4. Admins use the existing Chunk 3 picker to manually curate. The `systembolagetProductNumber` on review customWines stays available for a future analytics chunk.
- **Like / comment / community feed.** Reviews are visible on profiles when published, but no social interaction surfaces in v1.
- **WSET comparison view for solo reviews.** The session flow's "compare to answer key" panel is session-specific. Solo reviews won't have a comparison view in v1.
- **Bulk-import old reviews.** Out of scope.
- **Moderation queue / admin can edit a member's published review.** Admins can already edit any review via Payload admin (existing access). No new moderation tooling.

## Verification

End-to-end:

1. `pnpm migrate:create -- "add_review_published_to_profile"` → commit migration.
2. `pnpm migrate` (against dev URI default = prod per memory; or override for staging).
3. Log in as a member on staging, visit `/vinlistan/<some-slug>`, click "Recensera detta vin", fill in a quick WSET review with simple mode, toggle "Publicera på min profil", save. Verify the review appears in `/mina-recensioner` with a "Publicerad" badge.
4. Visit `/profil/<your-handle>/recensioner` — the published review appears. Open the detail page — full WSET notes render. Log out and reload — still public.
5. Toggle off "Publicera på min profil" in `/mina-recensioner/[id]`. Reload the public URL — 404 (or hidden in listing).
6. Toggle the user's `profile_public` off via `/installningar`. Public listing returns 404 even though the review is still `publishedToProfile=true`. Toggle back on — reappears.
7. New solo review on a wine that you already reviewed in a session: confirm both rows exist (different `session` value means no dedup collision).
8. `pnpm build` green; `pnpm generate:types` produces the new field on the `Review` type.

## Files touched (summary)

**New:**
- 5 page files under `src/app/(frontend)/(site)/{recensera-vin,mina-recensioner,profil/[handle]/{recensioner,recension/[id]}}/...`
- `src/components/wine-review/WineReviewListItem.tsx`
- `src/migrations/<timestamp>_add_review_published_to_profile.{ts,json}`

**Modified:**
- `src/collections/Reviews.ts` — add `publishedToProfile`, update `access.read`
- `src/components/course/WineReviewForm.tsx` — three targeted changes:
  - Accept optional `initialReview: Review | null` prop. When set, hydrate state on mount via the existing `populateFormWithReview` helper. Replaces the post-submit "edit" branch as the mount path for the edit route.
  - Add `publishedToProfile` to the form state, controlled by a Shadcn `Checkbox` rendered in the existing footer row next to the "Köpa igen?" checkbox. Default value reads from `initialReview?.publishedToProfile`. Submit sends it as part of the POST/PATCH body.
  - When `sessionId` is undefined AND `lessonId === 0`, skip the post-submit `ReviewComparison` render and instead redirect to `/mina-recensioner/<new-id>` via the existing `onSubmit` callback. The page route owns the redirect.
- `src/app/(frontend)/(site)/vinlistan/[slug]/page.tsx` — add a primary "Recensera detta vin" button linking to `/recensera-vin?wine=<id>`. Only renders for logged-in members (the existing page already has access to a server-side user via `headers()`).
- `src/components/top-nav-header.tsx` and `src/components/mobile-bottom-nav.tsx` — add a "Mina recensioner" link next to the existing "Mina provningar" entries. Both surfaces stay consistent.
- `src/payload-types.ts` — regenerated

**No changes to:** WinePicker, /api/reviews, /api/systembolaget-products/*, customWine schema, taxonomy collections.
