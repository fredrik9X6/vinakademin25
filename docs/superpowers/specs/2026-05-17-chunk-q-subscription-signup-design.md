# Chunk Q — Subscription Signup + Stripe Wiring — Design

**Author:** Fredrik (with assistant)
**Date:** 2026-05-17
**Status:** Draft, awaiting final review

## Context & motivation

Chunk O introduced the `members_only` access level on TastingTemplates and the locked teaser view. Chunk P gave admins a frontend editor for the library. The third leg of the stool is the actual commerce: a way for users to **become** members so the locked content unlocks.

The codebase already has substantial Stripe infrastructure:
- `src/lib/stripe.ts` configures the Stripe client + customer portal options.
- `src/lib/stripe-products.ts` defines a `SUBSCRIPTION_PLANS` array (currently with `wine_club_monthly` / `wine_club_yearly` placeholders that aren't yet exposed to users).
- `src/app/api/webhooks/stripe/route.ts` already handles `customer.subscription.created/updated/deleted` events.
- `Subscriptions` collection + `/api/subscriptions/*` endpoints.
- `Users.subscriptionStatus` + `subscriptionPlan` + a `stripeCustomer` link.

What's missing is the user-facing surface: there's no `/bli-medlem` page, no Stripe Checkout flow, no `/prenumeration` management page, and the webhook handler doesn't (yet) flip `user.role: 'subscriber'`. This chunk fills those gaps.

Per the architecture decision in the parent thread: **single tier, all-you-can-taste**, monthly + annual SKUs. Netflix-style — predictable revenue, no per-template gating.

## What ships in v1

- **Stripe setup**: a new "Vinakademin Premium" product with two recurring prices (monthly + annual). Created via a one-time setup script (`scripts/setup-stripe-premium.ts`) for repeatability across dev/staging/prod environments. Stripe IDs land in env vars (`STRIPE_PREMIUM_MONTHLY_PRICE_ID`, `STRIPE_PREMIUM_YEARLY_PRICE_ID`).
- **New `/bli-medlem` page**: value prop + monthly/annual toggle + Stripe Checkout redirect.
- **New `/prenumeration` page**: shows current subscription status + a "Hantera prenumeration" button that opens a Stripe Customer Portal session for cancel/upgrade/payment-method changes.
- **Webhook extension**: `customer.subscription.*` and `invoice.payment_failed` handlers now flip `user.role` between `'user'` and `'subscriber'` AND set `user.subscriptionStatus` accordingly. Idempotent (re-runs are safe).
- **Existing locked-template CTAs** (`LockedTemplateDetailView`): "Kommer snart" disabled button → real link to `/bli-medlem`.
- **14-day free trial** baked into the Checkout session (configurable). Users get full library access during trial; status flips to `'trialing'` then `'active'` per Stripe lifecycle. `viewerIsMember` already treats both as unlocked.

No new collections. No schema changes (existing User fields cover what we need). One small additive migration only IF `stripePriceId` isn't already on `Subscriptions` (verify during build).

## Architecture

### Stripe product setup

`scripts/setup-stripe-premium.ts` (new, run once per environment):

```ts
// Creates one product + two prices in Stripe. Idempotent via metadata lookup:
//   product.metadata.kind === 'vinakademin_premium'
// If it already exists, returns the existing ids.
//
// Outputs price ids to stdout for the operator to paste into env vars.
```

Pricing proposal (open for adjustment):
- Monthly: **99 kr/mån** — easy on the conscience for a casual member
- Annual: **990 kr/år** — equivalent to 2 months free (10x monthly)

These live in `src/lib/stripe-products.ts` alongside the existing wine-club placeholder. (Wine-club plans stay in code — they're for a future physical-wine-delivery product line — but they're inert until exposed.)

```ts
export const VINAKADEMIN_PREMIUM: SubscriptionPlan = {
  id: 'vinakademin_premium',
  name: 'Vinakademin Premium',
  description: 'Tillgång till alla provningsmallar i biblioteket samt verktyg för att hosta egna provningar.',
  monthly: { price: 99, stripePriceId: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID! },
  yearly: { price: 990, stripePriceId: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID! },
  trialDays: 14,
  features: [
    'Tillgång till alla provningsmallar i biblioteket',
    'Skapa egna provningar och dela med vänner',
    'Live gissningsspel i blindprovningar',
    'Detaljerad post-tasting analys + leaderboard',
    'Stötta Vinakademin direkt',
  ],
}
```

### `/bli-medlem` (signup page)

`src/app/(frontend)/(site)/bli-medlem/page.tsx` — server component, public read.

Layout (mobile-first):
```
┌──────────────────────────────────────────────────┐
│ Bli medlem i Vinakademin                          │
│ "Få tillgång till alla provningar..." (subhead)  │
│                                                   │
│ [Månadsvis 99 kr]   [Årligen 990 kr ← 2 mån gratis] │
│                                                   │
│ • Tillgång till alla provningsmallar             │
│ • Skapa egna provningar och dela                 │
│ • Live gissningsspel i blindprovningar           │
│ • Detaljerad post-tasting analys                 │
│ • 14 dagars gratis provperiod                    │
│                                                   │
│ [Starta gratis provperiod →]                     │
│                                                   │
│ Avbryt när som helst. Inga bindningstider.       │
└──────────────────────────────────────────────────┘
```

Client component for the toggle + Checkout redirect (`<BliMedlemForm />`). On click:
1. POST `/api/subscriptions/checkout` with `{ priceId: monthly|yearly }`.
2. Server creates (or reuses) the Stripe customer for the logged-in user, then creates a Checkout Session (`mode: 'subscription'`, `trial_period_days: 14`, success/cancel urls).
3. Server returns `{ url }`. Client `window.location = url` to Stripe.
4. After payment Stripe redirects to `/prenumeration?welcome=1` (success) or `/bli-medlem?canceled=1` (cancel).

**Auth requirement**: must be logged in to subscribe. Logged-out visitors hitting "Starta provperiod" get bounced to `/logga-in?from=/bli-medlem`. The current state (existing member?) is detected server-side; existing active members see a "Du är redan medlem — visa prenumeration" panel instead of the toggle.

### `/prenumeration` (management page)

`src/app/(frontend)/(site)/prenumeration/page.tsx` — server component, requires auth (existing middleware protectedPaths already covers this).

Three states:

1. **Active / trialing**:
   - "Du är medlem!"
   - Current plan + renewal date.
   - "Hantera prenumeration" button → POST `/api/subscriptions/portal` → opens Stripe Customer Portal session → user manages everything there.
2. **Canceled but not yet ended** (`subscriptionStatus: 'canceled'` + `currentPeriodEnd > now`):
   - "Du har avslutat ditt medlemskap. Du har tillgång till X. <date>."
   - "Hantera prenumeration" → portal (can resume).
3. **None / expired**:
   - "Du har inget aktivt medlemskap."
   - "Bli medlem" CTA → `/bli-medlem`.

`?welcome=1` query param shows a one-shot welcome toast on landing post-Checkout.

### `/api/subscriptions/checkout` (new endpoint)

```ts
POST /api/subscriptions/checkout
Body: { priceId: string }       // must be one of the two configured Premium price ids
Returns: { url: string }        // Stripe Checkout URL

Auth: required (user must be logged in)
```

Logic:
- Reject if priceId isn't one of the configured Premium prices.
- Reject if user already has an active subscription (status === 'active' || 'trialing').
- Use existing helper to find/create the Stripe customer keyed by user.email.
- Create Checkout Session with:
  - `mode: 'subscription'`
  - `customer: <stripe_customer_id>`
  - `line_items: [{ price: priceId, quantity: 1 }]`
  - `subscription_data: { trial_period_days: 14, metadata: { userId, plan: 'vinakademin_premium' } }`
  - `success_url: ${SITE_URL}/prenumeration?welcome=1`
  - `cancel_url: ${SITE_URL}/bli-medlem?canceled=1`
  - `allow_promotion_codes: true`
- Return the URL.

### `/api/subscriptions/portal` (new endpoint)

```ts
POST /api/subscriptions/portal
Returns: { url: string }
```

Auth: required, and the user must have a `stripeCustomerId` (i.e. they've subscribed before — even if currently inactive, the portal works to re-subscribe / view past invoices).

Creates a Billing Portal Session with `return_url: ${SITE_URL}/prenumeration`, returns the URL. Client navigates.

### Webhook extension

`src/app/api/webhooks/stripe/route.ts` — existing route. Three event types matter:

- `checkout.session.completed` — first signal of a successful subscribe. Read `session.subscription`, pull the subscription doc, write user row.
- `customer.subscription.created` / `updated` — Stripe is the source of truth. We mirror status:
  - `'trialing'` or `'active'` → `user.role: 'subscriber'`, `user.subscriptionStatus: 'active'`, `user.subscriptionPlan: 'vinakademin_premium'`.
  - `'past_due'` → keep `user.role: 'subscriber'` (grace period), `user.subscriptionStatus: 'past_due'`. UI surfaces a banner asking to update payment method.
  - `'canceled'` or `'unpaid'` or `'incomplete_expired'` → `user.role: 'user'`, `user.subscriptionStatus: 'canceled'` (or `'none'` if no prior).
- `customer.subscription.deleted` — same downgrade as canceled.
- `invoice.payment_failed` — log only (the subscription event will fire too).

User lookup: by `stripeCustomerId` on the user doc. If missing, fall back to `customer.email`.

Idempotency: all writes are upserts via Payload's `update`. Stripe retries are safe — same end state.

### Locked CTA rewiring

`src/components/tasting-template/LockedTemplateDetailView.tsx` — swap the two `disabled` "Kommer snart" buttons for active `<Link href="/bli-medlem">` buttons. Two sites in the file: the banner card and the right-rail aside.

### Reused utilities / patterns

- `getStripeServer` from `src/lib/stripe.ts`.
- `findOrCreateCustomer` (or equivalent) for Stripe customer lookup.
- Existing webhook signing verification.
- `viewerIsMember` from `src/lib/membership.ts` already covers `subscriptionStatus: 'active' | 'trialing'`.

## What we explicitly do NOT do in v1

- **No multi-tier pricing.** Single Premium tier. If down the road we want a "Pro" tier with extra features, that's a future spec.
- **No promo codes UI.** Stripe Checkout has `allow_promotion_codes: true` so codes work via the Checkout flow itself, but we don't expose a "have a code?" field on `/bli-medlem`.
- **No gift subscriptions** (give a year to a friend). Future feature.
- **No team / family plan.** Single seat per user.
- **No prorated refunds on cancel.** Stripe's default policy applies — full access until the end of the paid period.
- **No "downgrade to free" affordance other than canceling** — there's no paid downgrade path because there's only one tier.
- **No iOS / Android in-app subscriptions.** Web-only. Mobile is just the web app via the browser.
- **No usage tracking / metered billing** — flat rate.

## Verification

End-to-end smoke list:

1. **Stripe setup runs cleanly.** `pnpm tsx scripts/setup-stripe-premium.ts` creates the product + two prices in Stripe test mode. Re-running is idempotent (existing product detected via metadata). Copy the printed price ids into `.env`.
2. **`/bli-medlem` renders for logged-out visitors.** No subscribe button enabled; click "Starta gratis provperiod" → bounce to `/logga-in?from=/bli-medlem`.
3. **`/bli-medlem` renders for logged-in non-member.** Toggle works monthly/annual; clicking subscribe redirects to Stripe Checkout. Stripe shows correct price (99 / 990 kr), trial badge.
4. **Checkout completes.** Use a Stripe test card (`4242 4242 4242 4242`, any future date + CVC). After success → land on `/prenumeration?welcome=1` with a welcome toast.
5. **User role + status updated.** Inspect the user row in Payload admin: `role: 'subscriber'`, `subscriptionStatus: 'active'` (or `'trialing'` during the trial), `stripeCustomerId` populated.
6. **`/prenumeration` shows active state.** Current plan, next renewal date, "Hantera prenumeration" button visible.
7. **Customer portal opens.** Click "Hantera prenumeration" → Stripe-hosted portal opens. Cancel from there.
8. **Cancellation propagates.** After clicking cancel in the portal → webhook fires → user.subscriptionStatus → `'canceled'`. User keeps `role: 'subscriber'` until period ends, then `'user'`. (Test by triggering the cancel event in Stripe CLI: `stripe trigger customer.subscription.deleted`.)
9. **Locked template unlocks for active member.** Visit a members-only template — `LockedTemplateDetailView` no longer renders; full `TemplateDetailView` does. Verified by Chunk O's `viewerIsMember`.
10. **Locked template CTA rewired.** As a logged-out visitor, view a members-only template — the "Bli medlem för att se vinerna" banner now has an active `<Link href="/bli-medlem">` (not "Kommer snart"). Click navigates.
11. **Trial expiration without payment**: If the user removes their payment method during trial, Stripe fires `customer.subscription.deleted` after expiry — webhook downgrades. User can re-subscribe via `/bli-medlem`.
12. **Double-subscribe blocked.** As an already-active member, hit `/bli-medlem` directly — see the "Du är redan medlem" state instead of the toggle. Direct POST to `/api/subscriptions/checkout` rejected.
13. **Webhook signing.** Tamper with the signature header — endpoint returns 400, doesn't process.

## Risk / fallback

- **Stripe env vars missing in prod.** The setup script's output ids must land in Railway env vars for the production Stripe account before deploy. Surfacing this in a deploy checklist; if missing, `/bli-medlem` shows "Beställning är tillfälligt otillgänglig — försök igen senare."
- **Race between Checkout success and webhook**: the success redirect lands the user on `/prenumeration?welcome=1` before the webhook necessarily fires. The page polls `user.subscriptionStatus` once after a 2s grace period; if still not active, shows "Aktiveras strax…" with a refresh prompt. Stripe typically fires within ~500ms; this is belt-and-suspenders.
- **Duplicate Stripe customers**: existing helper looks up by email before creating. If two users share an email (shouldn't happen — email is unique on Users), the existing customer is reused. Acceptable.
- **Test-mode vs live-mode confusion**: keys are env-controlled. The setup script reads the same env, so dev sets up test products, prod sets up live products. Document clearly.
- **`Subscriptions` collection drift**: the existing collection is a mirror of Stripe state. The webhook continues to write to it (existing behaviour). User-level fields (`role`, `subscriptionStatus`) become the read source for membership gating since they're easier to query.
- **`subscriptionStatus` field options**: confirm the existing enum on `Users` includes `'trialing'` and `'past_due'`. If not, add to the field definition (no migration needed — Postgres column is `varchar`, enum is enforced in Payload's validation only).
- **Refund policy disclosure**: copy on `/bli-medlem` says "Avbryt när som helst. Inga bindningstider." That's the policy. Anything fancier (pro-rata, refund window) requires legal text out of scope for this spec.
- **Tax / VAT**: Stripe Tax handles Swedish moms (25% on digital services). Enable in Stripe Dashboard for the Premium product. Out of scope for the code; flag in the deploy checklist.
