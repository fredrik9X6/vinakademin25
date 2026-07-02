# Pause subscriptions — single-purchase only for tasting templates

**Date:** 2026-07-02
**Status:** Approved

## Context

Vinakademin has a Stripe-backed subscription/membership feature ("Vinakademin Premium",
`/bli-medlem`, `/prenumeration`, `Subscriptions` collection, subscription fields on `Users`)
that unlocks all paid tasting templates. The business decision is to **pause** this feature —
not delete it — and sell paid tasting templates exclusively as one-time purchases.

Key facts established during design:

- **There are zero real subscribers in production.** No grace-period or honoring logic is
  needed. The Premium Stripe price IDs (`STRIPE_PREMIUM_MONTHLY/YEARLY_PRICE_ID`) were never
  set in the environment, so the subscription checkout was never fully live.
- **One-time template purchase is already implemented end-to-end:** `TemplateEntitlements`
  collection, `/provningsmallar/[slug]/kop` purchase page, `/api/payments/template-checkout`
  route, and the `payment_intent.succeeded` webhook branch (`handleTemplatePurchase`) that
  creates entitlements. This work removes the subscription path around it; it does not build
  purchasing.

## Goal

No visitor can see, start, or be nudged toward a subscription. Paid templates are unlocked
only by one-time purchase (plus the existing free / free-trial / admin-grant paths). All
backend plumbing (DB schema, `Subscriptions` collection, `Users` subscription fields, Stripe
webhook handlers) stays intact so the feature can be re-enabled later without migrations.

## Non-goals

- No DB schema changes, no Payload migrations, no changes to `payload-types.ts`.
- No changes to the template purchase flow itself.
- No removal of the wine-club `Subscriptions` collection or Stripe webhook subscription
  handlers — they are inert plumbing kept for re-enable.
- No Stripe dashboard cleanup (nothing was provisioned).

## Design

### 1. Template access logic

`src/lib/access-control.ts`:

- Remove the `hasActiveSubscription` branch from `canUseTemplate()` (currently line 504).
  Resulting predicate: admin, or `accessLevel === 'free'`, or (`isFreeTrial` template AND
  logged in), or an active `TemplateEntitlement`.
- Keep the `hasActiveSubscription()` helper exported, with a comment marking it paused, so
  re-enabling is a one-line revert.
- `viewerIsMember()` in `src/lib/membership.ts` likewise stays but ends up with no callers.

### 2. UI changes

- **`src/components/tasting-template/LockedTemplateDetailView.tsx`** — remove both
  "Bli medlem" CTAs and the "…eller lås upp alla mallar med ett medlemskap" copy. Single
  primary CTA: "Köp för {price}" (one-time purchase).
- **`src/components/tasting-template/TemplateCard.tsx`** — replace the "Medlem" badge on
  paid templates with a price badge (e.g. "99 kr") sourced from the template's `priceSek`.
- **`/bli-medlem`** (`src/app/(frontend)/(site)/bli-medlem/`) — `page.tsx` replaced with a
  server-side `redirect('/provningsmallar')`; `BliMedlemForm.tsx` deleted (git history is
  the restore path for UI).
- **`/prenumeration`** (`src/app/(frontend)/(site)/prenumeration/`) — `page.tsx` replaced
  with a `redirect('/profil')`; client components `PortalLaunchButton.tsx`,
  `OnboardingChecklist.tsx`, `WelcomeBannerTracker.tsx` deleted.
- **`src/components/profile/SubscriptionManagementForm.tsx`** — already unused; deleted.
- **`src/components/breadcrumb-bar.tsx`** — drop the `bli-medlem` label entry.
- **`src/middleware.ts`** — drop the `/prenumeration` protected-path entry (the page just
  redirects now).

### 3. API changes

- **`src/app/api/subscriptions/checkout/route.ts`** — returns `410 Gone` with a structured
  JSON body and Swedish message ("Medlemskap är pausat …") instead of creating a Stripe
  subscription checkout session.
- **`src/app/api/subscriptions/route.ts` (POST)** — also returns `410 Gone` with the same
  structured response. This was a second subscription-creating path (direct Stripe
  subscription + Payload record, bypassing Checkout) that was initially missed in the
  inventory. Both this and the checkout route are now gated.
- The remaining `/api/subscriptions/*` routes (portal, `[id]`, `user/[userId]`, cancel,
  reactivate) and `GET /api/subscriptions` stay as-is: with zero subscribers they are
  inert, all require auth, and they are part of the paused plumbing.
- **Stripe webhooks** (`src/app/api/webhooks/stripe/route.ts`) — `customer.subscription.*`
  handlers stay untouched; no such events will arrive while paused.
- Template purchase flow (`/api/payments/template-checkout`, `handleTemplatePurchase`,
  `TemplateEntitlements`) — untouched.

### 4. Data & Stripe

No collection changes and therefore no migration (per the project rule that any schema
change requires a committed migration — we make none). Users' subscription fields remain,
all effectively `none`. Nothing to archive in Stripe since Premium prices were never
created in the live environment.

### 5. Error handling

The paused checkout endpoint returns `410` with JSON
`{ error: 'subscriptions_paused', message: 'Medlemskap är pausat. Provningsmallar köps som engångsköp.' }`
so any stray client renders a sane error rather than crashing.

### 6. Verification

No test suite exists. Verification is manual plus build:

1. `pnpm build` passes (catches dangling imports from deleted components).
2. On `pnpm dev`: a locked paid template shows only the purchase CTA; template cards show a
   price badge instead of "Medlem"; `/bli-medlem` redirects to `/provningsmallar`;
   `/prenumeration` redirects to `/profil`; `POST /api/subscriptions/checkout` returns 410.
3. Template purchase flow still reaches Stripe Checkout from `/provningsmallar/[slug]/kop`.

## Re-enable path

Revert the commit(s) from this change (UI files restored from git), re-add the
`hasActiveSubscription` branch in `canUseTemplate()`, restore the checkout route (`POST
/api/subscriptions/checkout`), restore the collection root (`POST /api/subscriptions`), and
set `STRIPE_PREMIUM_MONTHLY/YEARLY_PRICE_ID` via `scripts/setup-stripe-premium.ts`. No data
work required.
