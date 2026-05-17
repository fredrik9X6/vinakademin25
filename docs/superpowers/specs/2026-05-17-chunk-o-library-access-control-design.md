# Chunk O — Library Access Control + Locked Teaser — Design

**Author:** Fredrik (with assistant)
**Date:** 2026-05-17
**Status:** Draft, awaiting final review

## Context & motivation

We have `TastingTemplates` — admin-curated tasting blueprints surfaced at `/provningsmallar` that members "Use" to seed their own `TastingPlans`. The collection is well-formed but the surface treats every template identically: anyone visiting `/provningsmallar` sees the full list, and anyone clicking through sees every wine.

This chunk introduces the **access tier** — each template is either `free` (publicly visible, all details) or `members_only` (visible in the index but content gated). Non-members viewing a locked template see only what's behind the curtain: how many wines, the total price, and a "Bli medlem" CTA placeholder. Wine names, producers, regions, notes, blind-tasting answers — all redacted server-side.

No Stripe yet. The CTA is a placeholder until **Chunk Q** wires real subscriptions. For now, admins see everything (they're the test cohort) and `subscriber`-role users see everything too — but no signup path exists, so only admins-or-manually-promoted-test-accounts will pass the gate. That's intentional: it lets us populate the library and validate the gating UX before turning on commerce.

## What ships in v1

- One additive field on `TastingTemplates`: `accessLevel: 'free' | 'members_only'`, default `free`. One migration.
- `/provningsmallar` (index):
  - "Fri" / "Medlem" badge on every card.
  - Filter pills above the grid: **Alla · Fri · Medlem**. URL-stateful via `?access=`.
  - Estimated-duration + difficulty filters deferred to a later spec — keep this chunk tight.
- `/provningsmallar/[slug]` (detail):
  - Server-side viewer-access check: `viewerIsMember = user.role === 'admin' || user.subscriptionStatus === 'active'`.
  - Free templates: render fully (today's behaviour).
  - Members-only templates, viewer is a member: render fully.
  - Members-only templates, viewer is NOT a member: render the **locked view** — wine count, total price aggregated server-side, generic placeholder cards instead of wine names, locked-state CTA banner ("Bli medlem för att se vinerna").
- A `getLockedTemplatePreview()` helper extracts the aggregations + redacts the wines array before render.
- Sitemap / SEO: members-only template pages keep their meta (title/description) so search engines index the *existence* of the tasting; the wine list is gone from the rendered HTML.

No new collections. No subscription signup yet — that's Chunk Q.

## Architecture

### Schema + migration

```ts
// TastingTemplates
{
  name: 'accessLevel',
  type: 'select',
  required: true,
  defaultValue: 'free',
  options: [
    { label: 'Fri – alla kan se', value: 'free' },
    { label: 'Endast medlemmar', value: 'members_only' },
  ],
  admin: {
    position: 'sidebar',
    description:
      'Free templates render their wine list to everyone. Members-only templates redact the wines for non-members; only count + total price are visible.',
  },
}
```

Migration: `ALTER TABLE tasting_templates ADD COLUMN access_level varchar NOT NULL DEFAULT 'free';` (using the generated enum once Payload's migrate:create runs).

### Subscription detection

A new helper `src/lib/membership.ts`:

```ts
import type { User } from '@/payload-types'

/** True when the viewer has unfettered access to all members-only content. */
export function viewerIsMember(user: User | null | undefined): boolean {
  if (!user) return false
  if (user.role === 'admin') return true
  // `subscriber` role is the long-term path (set by webhook in Chunk Q).
  // `subscriptionStatus` is read for users on the older billing model — also
  // honoured so admins can flip the flag manually during the bootstrap phase.
  if (user.role === 'subscriber') return true
  const status = (user as { subscriptionStatus?: string | null }).subscriptionStatus
  return status === 'active' || status === 'trialing'
}
```

Single read site for membership across the codebase. Chunk Q will tighten this when real subscriptions flow.

### Locked template preview — `src/lib/template-locked-preview.ts`

```ts
import type { TastingTemplate, Wine } from '@/payload-types'

export interface LockedTemplatePreview {
  /** Total wines in the tasting. Always shown. */
  wineCount: number
  /** Sum of library wine prices for wines that have a price set. Null when no
   *  prices are available (rare — most curated templates use library wines). */
  totalPriceSek: number | null
  /** Pour orders 1..N for the placeholder card rendering. */
  pourOrders: number[]
}

export function getLockedTemplatePreview(template: TastingTemplate): LockedTemplatePreview
```

Sums `wine.price` across the wines that have library wines (templates are library-only — see `TastingTemplates.ts:60`). Returns `null` total when no wine has a price set.

Called server-side in the page; the redacted template payload sent to the client never includes the wines list itself when the viewer is locked out.

### `/provningsmallar` (index)

- Server-side fetch already lists published templates. Add `accessLevel` to the select and surface as a chip on each card.
- Filter pills: parse `?access=free|members_only` from search params, narrow the find query. "Alla" is no param.
- Pills are real links (not client state) so the filter is shareable and SEO-friendly.

The `TemplateCard.tsx` component gets a new small badge in the corner of the hero image:

```
[Fri]      // green-tinted
[Medlem]   // brand-orange-tinted
```

### `/provningsmallar/[slug]` (detail)

Server component flow:

```ts
const user = await getUser()
const isMember = viewerIsMember(user)
const isLocked = template.accessLevel === 'members_only' && !isMember

if (isLocked) {
  const preview = getLockedTemplatePreview(template)
  return <LockedTemplateDetailView template={template} preview={preview} />
}
return <TemplateDetailView template={template} />
```

`TemplateDetailView.tsx` stays as-is for the unlocked path. New `LockedTemplateDetailView.tsx`:

```
┌───────────────────────────────────────────────────┐
│ <hero image>                                       │
│                                                    │
│ Champagnens hemligheter [Medlem]                  │
│ "En djupdykning i...” (description, unredacted)   │
│                                                    │
│ 6 viner · ~1500 kr · ~90 minuter                  │
│                                                    │
│ 🔒  Bli medlem för att se vinerna                 │
│     Medlemskap låser upp alla provningar i       │
│     biblioteket samt skapande av egna provningar.│
│     [Kommer snart]   (Chunk Q will swap to CTA)  │
│                                                    │
│ Vin för vin (innehåll dolt):                      │
│ [1] [bottle placeholder]    [4] [bottle …]        │
│ [2] [bottle placeholder]    [5] [bottle …]        │
│ [3] [bottle placeholder]    [6] [bottle …]        │
└───────────────────────────────────────────────────┘
```

Placeholder cards reuse the existing `WineImagePlaceholder` for visual continuity. No "Use this template" button — locked templates can't be cloned by non-members.

### Reused utilities / patterns

- `getUser` from `src/lib/get-user.ts`
- `WineImagePlaceholder`
- The existing `TemplateCard` and `TemplateDetailView` components — extended, not rewritten.
- Existing card grid + filter chip patterns on `/vinlistan` for visual consistency.

## What we explicitly do NOT do in v1

- **No subscription signup flow.** The "Bli medlem" CTA is a placeholder ("Kommer snart") until Chunk Q. Manually-promoted admin/subscriber accounts can test the unlocked path.
- **No payment / Stripe integration.** Chunk Q.
- **No "preview a single wine" affordance.** Either fully unlocked or fully locked. Adding a "free sample" tier per template would be a v2 spec.
- **No difficulty / duration filters.** Tag-based filters today are already enough; we'll add structured ones later when the library has more entries.
- **No member counts / "X members have used this" social proof.** Future polish.
- **No edit-from-frontend.** Admins still edit templates via Payload admin in this chunk. Chunk P brings the frontend editor.
- **No analytics events on locked-card impressions/clicks.** Easy to add later when commerce is live.

## Verification

End-to-end smoke list:

1. **Migration applies cleanly.** `pnpm payload migrate:create` generates the additive column. All existing templates default to `accessLevel: 'free'`. Admin lists at `/admin/collections/tasting-templates` show the new field with sensible defaults.
2. **Free templates unchanged.** Browse `/provningsmallar`, click any free template — `TemplateDetailView` renders identically to today.
3. **Members-only as admin.** Switch a template's access to `members_only` via Payload admin. Visit the detail page as admin — full view renders, "Medlem" badge appears in the card and on the detail header. "Använd den här mallen" button still works.
4. **Members-only as logged-out visitor.** Open the same URL in an incognito window. **Expect:** locked view, wine count + price visible, names hidden, placeholder cards rendered, "Bli medlem" banner with a `Kommer snart` button.
5. **Members-only as regular logged-in user.** Same view as #4 — `viewerIsMember` returns false because `role !== 'admin'/'subscriber'` and `subscriptionStatus !== 'active'`.
6. **Members-only as test subscriber.** Manually set a user's `role: 'subscriber'` via Payload admin. Reload — full view renders.
7. **Index filter pills.** Visit `/provningsmallar?access=free`. Confirm only free templates show. `?access=members_only` shows only locked. No param shows all.
8. **Index badges.** Each card carries a colour-tinted access chip in the top-right of the hero image. Mobile + desktop.
9. **Total price aggregation correctness.** Set a members-only template with 4 wines priced 200/250/300/null — confirm the locked view shows "4 viner · ~750 kr" (null gets skipped). For all-null pricing, "≈ N viner" without the kr line.
10. **Sitemap intact.** `/provningsmallar/<members-only-slug>` still appears in the sitemap. Page metadata (`<title>`, `<meta description>`) renders for SEO; only the body is gated.
11. **No leakage in payload.** Inspect the rendered HTML of a locked page in DevTools. Confirm no wine name, producer, region, or hostNotes string is present anywhere — server-side redaction works as advertised.

## Risk / fallback

- **Existing templates default safely.** `default: 'free'` means the migration changes no existing behaviour for any current row.
- **Subscription detection drift.** `viewerIsMember` is the single chokepoint. When Chunk Q tightens the rules (real Stripe-driven `subscriptionStatus`), only this helper changes — all surfaces inherit.
- **HTML leakage paranoia.** The redaction lives at the **server boundary** (the page component). The locked detail view never has the wine objects in its props — no client-side guard required to be safe.
- **Migration with NOT NULL default.** Tested pattern in this codebase. If Payload's generated migration uses a different ENUM-style approach, the migration script might need a small tweak — verified during build.
- **"Use this template" leak.** The locked-view component must NOT render the "Använd" button; otherwise a click would clone the redacted plan into the user's TastingPlans. Easy to enforce — `<UseTemplateButton>` only mounts in `TemplateDetailView`, not the locked one.
- **Admin override safety.** Admins always see the full view, even on locked templates. Useful for content QA. If we ever want admins to "preview the locked experience" we can add a `?preview=locked` query param later.
