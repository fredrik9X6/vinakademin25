# Chunk R — Member Onboarding + Analytics Instrumentation — Design

**Author:** Fredrik (with assistant)
**Date:** 2026-05-19
**Status:** Draft, awaiting final review

## Context & motivation

Two related post-launch gaps:

1. **The first 14 days as a Vinakademin+ member feel like nothing happened.** After Stripe checkout succeeds, the new member lands on `/prenumeration?welcome=1` with a green "Välkommen" banner and… nothing else. No welcome email (Stripe sends a payment receipt; we send no brand-side confirmation), no guided next action. Members who pay are our most engaged users — they deserve a path into the product. Easy retention win.
2. **We can't see the funnel.** PostHog gets events for tasting-plan creation and group sessions (Chunk H), but the newer surfaces are blind: template editing, blind-tasting guesses, the subscription signup flow, locked-template CTAs. We just turned on commerce yesterday and can't measure conversion, drop-off, or which locked templates drive the most upgrades.

Bundling because both are scaffolding for the same lifecycle: someone discovers Premium → upgrades → has a great first week. Onboarding is the UX side, analytics is the measurement side.

## What ships in v1

### Onboarding
- **Welcome email** sent on first subscription activation (one-shot, idempotent). React Email template via Resend, brand-matched.
- New `Users.welcomeEmailSentAt` timestamp + migration. Webhook sets it on first send, lookup prevents re-send on subsequent `subscription.updated` events.
- **First-action panel** on `/prenumeration` for active members, showing a 3-step quick-start checklist. Each step is server-side-checkable. Dismissible via localStorage; auto-hides after 14 days post-`welcomeEmailSentAt` or when all steps are complete.

### Instrumentation
- New PostHog events sprinkled across the missing surfaces:
  - **Subscription funnel:** `bli_medlem_viewed`, `subscription_checkout_started`, `subscription_completed`, `subscription_portal_opened`, `subscription_canceled` (webhook-side).
  - **Locked templates:** `locked_template_viewed`, `locked_template_cta_clicked`.
  - **Template editor (admin):** `template_created`, `template_edited`, `template_published`.
  - **Blind guesses:** `blind_guess_submitted`, `blind_guess_reveal_scored`.
- **PostHog dashboard** "Vinakademin+ launch" assembled via MCP with three insights: signup funnel, locked-template CTA click-through, daily blind-guess submissions. Created once; lives in PostHog.

No new Stripe products, no new collections, no new pages. One additive column on `Users`. One migration.

## Architecture

### 1. Welcome email — `src/lib/session-emails/welcome-premium.ts`

New file, mirrors the existing `wrap-up.ts` pattern. Uses the shared email primitives from `src/lib/email-cta` (already exported: `emailBrandOrange`, `emailHeaderCellStyle`, `emailPrimaryCtaButton`).

```ts
export interface WelcomePremiumEmailInput {
  email: string
  firstName: string | null
  plan: 'monthly' | 'annual'
  /** Date the next renewal will charge — shown so the user knows the calendar. */
  renewsOn: Date | null
}

export function buildWelcomePremiumEmail(input: WelcomePremiumEmailInput): {
  subject: string
  html: string
  text: string
}
```

Subject: `Välkommen till Vinakademin+ 🍷`

Content blocks (in order):
1. Brand-gradient header bar with "Vinakademin+" wordmark.
2. `Hej {firstName}!` greeting fallback to `Hej!`.
3. Welcome paragraph + plan + next renewal date.
4. "Det här ingår nu" block listing the 5 features from `VINAKADEMIN_PREMIUM.features`.
5. "Kom igång" — three brand-orange CTA buttons stacked vertically:
   - "Bläddra i biblioteket" → `/provningsmallar`
   - "Skapa din första provning" → `/skapa-provning`
   - "Anpassa din profil" → `/profil`
6. Footer line: "Hantera prenumerationen när som helst på `/prenumeration`."

### 2. Webhook send + idempotency

`src/collections/Users.ts` — new field:

```ts
{
  name: 'welcomeEmailSentAt',
  type: 'date',
  access: { update: adminFieldLevel },
  admin: {
    description: 'Stamped when the Vinakademin+ welcome email was sent. Used to prevent duplicate sends on subsequent subscription events.',
    position: 'sidebar',
    readOnly: true,
  },
}
```

Migration: single additive `ALTER TABLE users ADD COLUMN welcome_email_sent_at timestamp(3) with time zone`.

`src/app/api/webhooks/stripe/route.ts` — inside `syncSubscriptionToUser`, after a successful `payload.update` flipping the user to subscriber:

```ts
const justActivated =
  (user.subscriptionStatus === 'none' || user.subscriptionStatus == null) &&
  (nextStatus === 'active' || nextStatus === 'free_trial')
const alreadyWelcomed = !!(user as any).welcomeEmailSentAt
if (justActivated && !alreadyWelcomed && user.email) {
  await sendWelcomePremiumEmail({ user, subscription, payload })
  await payload.update({
    collection: 'users',
    id: user.id,
    data: { welcomeEmailSentAt: new Date().toISOString() } as never,
    overrideAccess: true,
  })
}
```

`sendWelcomePremiumEmail` is a small helper that pulls plan + renewsOn off the subscription object and calls Resend via the same Resend client `wrap-up.ts` uses. Wrapped in try/catch — a send failure does NOT roll back the role flip.

### 3. First-action panel — `/prenumeration`

New `<OnboardingChecklist />` client component rendered above the existing "Du är medlem" card when:
- `viewerIsMember(user)` is true
- AND `welcomeEmailSentAt` exists and is within 14 days OR is null (defensive — covers admins who flip flags manually for QA)
- AND localStorage `vk_premium_onboarding_dismissed` is not "1"

Three steps (each marked done or todo server-side):

| Step | Done when |
|---|---|
| Bläddra i biblioteket | `localStorage.vk_visited_provningsmallar === '1'` (set client-side on first /provningsmallar visit) |
| Skapa din första provning | `count(tastingPlans where owner == user.id) > 0` (server query) |
| Anpassa din profil | `users.handle != null && users.profilePublic === true` |

Layout:

```
┌────────────────────────────────────────────────────┐
│ ✨  Kom igång med Vinakademin+                     │
│                                                    │
│ ☐ Bläddra i biblioteket               [→]          │
│ ☑ Skapa din första provning           [Skapa →]    │
│ ☐ Anpassa din profil                  [→]          │
│                                                    │
│                                        [Stäng]     │
└────────────────────────────────────────────────────┘
```

Hides immediately if all three are complete. "Stäng" sets the localStorage flag. Brand-gradient border treatment from the styleguide premium-card pattern.

Why localStorage for browse + dismiss but server-side for plan-created + profile-set: the first is a low-stakes UX hint (no need to persist across devices), the second/third are real product state.

### 4. PostHog events

Naming convention: `<surface>_<verb>` (lowercase, snake_case), payload as flat object. Match the existing `tasting_plan_*` style from Chunk H.

**Subscription funnel** (`/bli-medlem`, `/prenumeration`, `BliMedlemForm`):
```ts
trackEvent('bli_medlem_viewed', { unauthenticated, has_active_subscription })
trackEvent('subscription_checkout_started', { plan: 'monthly' | 'yearly' })
trackEvent('subscription_completed', { plan, status }) // fired once on first welcome=1 render
trackEvent('subscription_portal_opened', { source: 'prenumeration_page' })
```

Webhook side (`syncSubscriptionToUser`):
```ts
// Server-side event via the recordEvent() helper (same as wrap-up email path)
recordEvent('subscription_canceled', { user_id, plan, previous_status })
recordEvent('subscription_activated', { user_id, plan, status }) // fires once
```

**Locked templates** (`LockedTemplateDetailView`):
```ts
trackEvent('locked_template_viewed', { template_id, slug, wine_count, total_price_sek })
trackEvent('locked_template_cta_clicked', { template_id, slug, cta_location: 'banner' | 'sidebar' })
```

**Template editor** (`TemplateForm`):
```ts
trackEvent('template_created', { template_id, status, access_level, wine_count })
trackEvent('template_edited', { template_id, status, access_level, wine_count })
trackEvent('template_published', { template_id, access_level, wine_count })
```

**Blind guesses** (`BlindGuessCard`, `/api/session-guesses` POST):
```ts
// Client-side, on submit success
trackEvent('blind_guess_submitted', { session_id, pour_order, has_country, has_grape, has_price })
// Server-side, on reveal time when a guess scores — fired from the reveal endpoint
recordEvent('blind_guess_reveal_scored', { session_id, pour_order, points })
```

### 5. PostHog dashboard

After events are in code (so the schema exists in PostHog after first events fire), use the MCP to assemble:

**Dashboard: "Vinakademin+ launch"**
- **Insight 1 — Signup funnel (Funnel):** `bli_medlem_viewed` → `subscription_checkout_started` → `subscription_completed`. Last 14 days. Step conversion %.
- **Insight 2 — Locked template CTA (Trends):** `locked_template_viewed` vs `locked_template_cta_clicked` (CTR per day). Breakdown by template slug.
- **Insight 3 — Daily blind guesses (Trends):** `blind_guess_submitted` daily count, breakdown by `pour_order`.

I'll create these via the PostHog MCP at the end of the build; you can adjust them in the PostHog UI afterward.

### Reused utilities / patterns

- Resend client (used by `wrap-up.ts`).
- `recordEvent` server-side helper from `src/lib/events.ts` (already imported in the Stripe webhook for `order_paid`).
- `trackEvent` client-side from `@/components/analytics`.
- React Email primitives in `src/lib/email-cta.ts`.
- `viewerIsMember` for the panel gate.

## What we explicitly do NOT do in v1

- **No tour / coachmarks** for the new member experience. The 3-step panel is the entire onboarding. A guided react-joyride tour is a future polish.
- **No re-engagement email** for canceled members ("we miss you" 30 days later). Stripe handles the cancellation; we don't chase.
- **No "you just unlocked X" toast** the first time a member visits a previously-locked template. Nice UX but adds state-tracking complexity.
- **No referral / "share Premium with a friend"** affordance. Future spec.
- **No PostHog A/B test infrastructure** — we just instrument. Experiments later if needed.
- **No email preference center.** The welcome email is transactional, not marketing — same legal basis as the wrap-up email and the password reset, no unsubscribe link required.
- **No backfilling welcome emails** for the test subscriber(s) you've already created. They get the email next time someone activates from scratch; admins who flipped the flag manually never receive one (expected).

## Verification

End-to-end smoke list:

1. **Welcome email content renders cleanly.** Trigger `buildWelcomePremiumEmail` with sample input in a script; eyeball the HTML in a browser. Confirm brand-orange header, wordmark, plan + renewal date, feature list, three CTAs link correctly.
2. **Welcome email fires on first activation.** With Stripe CLI, trigger `customer.subscription.created` for a user with `subscriptionStatus: 'none'`. Confirm the email lands in your inbox (or Resend dashboard logs) AND `users.welcomeEmailSentAt` is stamped.
3. **No duplicate send on subsequent events.** Trigger `customer.subscription.updated` for the same user. Confirm no second email, no `welcomeEmailSentAt` overwrite (or at least no second send).
4. **No welcome on cancel.** Trigger `customer.subscription.deleted` for a user who never had `welcomeEmailSentAt`. No email fires; user downgrades cleanly.
5. **Onboarding panel renders for new members.** Subscribe in test mode, visit `/prenumeration`. Confirm the 3-step panel appears above the existing card. All three should show as ☐ initially (or ☑ if applicable).
6. **Steps tick on completion.** Visit `/provningsmallar` — refresh `/prenumeration`, step 1 shows ☑ (via localStorage). Create a tasting plan — refresh, step 2 ☑. Set handle + profilePublic in `/profil` — step 3 ☑. With all three ☑, panel disappears.
7. **Stäng dismisses.** Click "Stäng" — panel disappears, localStorage flag set. Reload — stays hidden.
8. **Auto-hide after 14 days.** Set `welcomeEmailSentAt` to 15 days ago in Payload admin. Reload `/prenumeration` — panel hidden regardless of step state.
9. **PostHog funnel events fire.** Visit `/bli-medlem` (event `bli_medlem_viewed`), click subscribe (event `subscription_checkout_started`), complete Checkout (event `subscription_completed` after redirect). Check the PostHog activity log.
10. **Locked template CTA tracks.** Logged out, visit a members-only template (event `locked_template_viewed`), click "Bli medlem" (event `locked_template_cta_clicked` with `cta_location: 'banner'`). Try the sidebar button — same event with `cta_location: 'sidebar'`.
11. **Template events.** As admin, create a template (event `template_created`), save edits (event `template_edited`), flip status to published (event `template_published`).
12. **Blind guess events.** In a blind session, submit a guess — event `blind_guess_submitted`. Reveal the wine — server-side `blind_guess_reveal_scored` fires for guests who scored.
13. **Dashboard exists.** PostHog → Dashboards → "Vinakademin+ launch" — three insights present, populated with the live data from the smoke test.

## Risk / fallback

- **Welcome email delivery failure.** Wrapped in try/catch; the role flip is the priority. If Resend is down we log + continue. Worst case the user doesn't get a welcome email but is still a member.
- **Race between checkout success redirect and webhook.** The `?welcome=1` URL param renders the success banner immediately. The actual `welcomeEmailSentAt` stamp arrives ~500ms later from the webhook. The onboarding panel checks `welcomeEmailSentAt` server-side, so on a hard refresh within that window the panel might not render. Acceptable — second refresh shows it; the redirect-time welcome banner covers the immediate moment.
- **localStorage out of sync across devices.** Step 1 (browsed library) and the dismiss flag use localStorage so they're per-device. A user who browses on desktop sees step 1 ☑ on desktop but ☐ on mobile until they browse there. Acceptable for first-week soft hints. If we ever want cross-device, promote to a `Users.onboardingState` field.
- **Reused `recordEvent` correctness.** The existing helper already handles errors silently per the pattern in the webhook. New events follow the same path.
- **PostHog event name drift.** Once we add events, downstream insights reference them by name — renaming is a breaking change. Locking the v1 names now.
- **Dashboard via MCP.** If MCP dashboard creation fails for any reason, the events still fire and you can build the dashboard manually in PostHog. No code-side dependency.
