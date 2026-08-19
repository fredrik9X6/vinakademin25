# Provningsverktyget som lead magnet + Vinkvällen-erbjudandet

**Date:** 2026-08-19
**Status:** Approved design, ready for implementation planning

## Why

Vinakademin currently sells two things badly instead of one thing well: tasting
templates at 99 kr each, and a 499 kr video course framed as schoolwork. The
templates have produced zero revenue (7 templates exist, 5 published;
`template_entitlements` holds 2 rows, both `admin_grant`). They cost nothing to
give away and they are the most compelling thing on the site.

So: the whole tasting system — templates plus the builder and live-hosting
stack, internally "Tasting OS", publicly **Provningsverktyget** — becomes free.
It exists to acquire accounts and newsletter subscribers. The site then sells
exactly one product: the 499 kr course, repositioned from "learn to taste wine"
to "host an evening your friends will still talk about".

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Signup gate | Account required, newsletter checkbox **pre-checked** (opt-out) | GDPR-safe, low friction, still grows the list |
| Paywall removal | Gate at the predicate; keep Stripe/entitlement machinery dormant | Reversible in one commit; no destructive migration |
| Public name | **Provningsverktyget**, at `/provningsverktyget` | Swedish, plainly descriptive, reads as a utility |
| Template visibility | **All templates fully public** | Full SEO surface; gate moves from viewing to *using* |
| Course change scope | Copy and packaging only — lessons, price, slug, Stripe product unchanged | Ships fast, breaks nothing |
| Guarantee | Unconditional 30-day money back | Highest conversion lever; small exposure on a 499 kr digital product |
| Price anchor | "En vinprovning ute kostar 500–1000 kr **per person**" | Confirmed by Fredrik 2026-08-19; true, so it survives scrutiny |

### Where the gate actually sits

This is the load-bearing consequence of making every template public. Visitors
read **everything** — theme, wine list, host script, Systembolaget links. The
account is required only to *act*:

- clone a template into your own plan (`POST /api/tasting-plans/from-template/[templateId]` → 401)
- the builder (`/skapa-provning` → redirects to login)
- hosting a live session

All three are already login-gated today. No new gating code is needed — the
funnel is "read freely, sign up at the moment of intent".

`accessLevel` stays on the collection so any single template can be flipped
back to account-gated from the admin. Its semantics are now:
`free` = fully public · `paid` = requires a (free) account.

## Section 1 — Making Provningsverktyget free

**1.1 The predicate.** `canUseTemplate()` in `src/lib/access-control.ts:497`:

    if (user?.role === 'admin') return true
    if (template.accessLevel === 'free') return true   // fully public
    if (user) return true                              // any account unlocks
    return false

The `isFreeTrial` short-circuit is dropped (subsumed). `hasTemplateEntitlement`
and `hasActiveSubscription` remain exported but unreferenced — dormant, not
deleted.

Extract the branch logic into a pure, testable function (see Section 6); the
async wrapper keeps its current signature so all four call sites are untouched.

**1.2 Data.** Migration sets `access_level = 'free'` on every row in
`tasting_templates`, and changes the field's `defaultValue` to `'free'` so new
templates are public unless deliberately gated. Admin `description` updated to
document the new meaning.

**1.3 Stop charging.**
- `src/collections/TastingTemplates.ts` — remove the `syncTemplateWithStripe`
  trigger from the `afterChange` hook. Keep the import path and the function
  itself intact for revival.
- `priceSek` and `isFreeTrial` become vestigial: move to a collapsed
  "Legacy / paused" admin group rather than deleting (no destructive migration).
- `/provningsmallar/[slug]/kop/page.tsx` — replace the body with a permanent
  redirect to `/provningsmallar/[slug]`. Keep the route so old links and any
  indexed URLs resolve instead of 404ing.
- `src/app/api/payments/template-checkout/route.ts` — return 410 Gone and log a
  warning. Do not delete.
- `src/app/api/webhooks/stripe/route.ts` — the two `productKind === 'template'`
  branches (lines ~147 and ~1024) stay, but log a warning if they ever fire.
  A live payment intent must still be honoured with an entitlement row.

**1.4 UI cleanup.**
- `LockedTemplateDetailView` — CTA "Köp för X kr" → "Skapa gratiskonto";
  secondary link → "Logga in". Drop the `priceSek` prop. This view now renders
  only for a template an admin has deliberately flipped to `paid`.
- `TemplateCard` — price badge → "Gratis" (or removed); drop the `isPaid` branch.
- `provningsmallar/page.tsx` + `src/lib/provningar-view.ts` — remove the
  `?access=free|paid` filter and its UI. **Covered by `provningar-view.test.ts`**;
  update those tests alongside.
- `UseTemplateButton` — on 401 route to `/registrera?from=...` instead of
  `/logga-in?from=...`. New visitors are the target; the register page links to login.
- `from-template` route — the 403 copy "Du måste köpa denna mall…" is now
  unreachable in practice; replace with a generic access message.

## Section 2 — The `/provningsverktyget` landing page

New server component at
`src/app/(frontend)/(site)/provningsverktyget/page.tsx`, statically rendered,
Swedish, with full `metadata` + canonical + OG tags matching the conventions in
`vinkurser/page.tsx`.

Structure:

1. **Hero** — outcome-led, not feature-led. Primary CTA "Skapa gratiskonto",
   secondary "Se provningarna" → `/provningsmallar`.
2. **Fyra pelare** — Färdiga provningar · Bygg din egen · Livesession på mobilen ·
   Smakblad och resultat.
3. **Så funkar det, 3 steg** — Välj en provning → Handla vinerna (Systembolaget-lista)
   → Bjud in och kör. Reinforces zero prep.
4. **Proof** — real template cards pulled from Payload, so the page proves the
   claim with the actual artefacts.
5. **Signup block** — account + pre-checked newsletter, restating that it is free.
6. **FAQ** — "Är det verkligen gratis?", "Behöver jag kunna något om vin?",
   "Hur många kan vara med?", "Vad kostar vinerna?"
7. **Handoff** — soft transition to Vinkvällen, framed as the upgrade, not a wall.

Reuse existing components (`TemplateCard`, `NewsletterSignupBlock`) and the
`HEADING`/`btn-brand`/brand-pill idiom established in `OfferingsComparison.tsx`
and `ProvningsmallarFeature.tsx`.

**Navigation:** add to `top-nav-header.tsx` (line ~33 array),
`mobile-bottom-nav.tsx`, and `ui/footer.tsx`.

## Section 3 — The signup gate

`src/components/auth/RegistrationForm.tsx`:
- line 35 — `acceptsMarketing: z.boolean().default(true)`
- line 68 — `acceptsMarketing: true` in `defaultValues`
- line ~247 — consent copy rewritten so the pre-check is honest and legible:
  what they get, how often, and that unsubscribing is one click.

The Beehiiv/Subscribers plumbing already handles `newsletter: true` (line 86).
No change needed there.

**Explicitly not doing:** adding a `provningsverktyget` value to the
`Subscribers.source` enum. That is a migration for data PostHog already
captures via page attribution.

## Section 4 — The Vinkvällen offer

Course: **"Lär dig grunderna med goda viner"**, id 3, slug `ldgmgv`, 499 kr,
published. 10 published video lessons (~38 min): the 5 S-method (Se, Sniffa,
Swirl, Smaka, Sammanfatta), Aromer, Grundsmakerna, Struktur, Avslut, Smakblad.
Plus a quiz and wine-review sheets.

**The value equation today fails on all four terms.** Dream outcome is a skill,
not an experience. Perceived likelihood has no proof and no guarantee. "Kurs"
implies weeks of delay. "Kurs" implies homework.

**4.1 The free/paid split.** The strategic crux: if templates are free, what
does 499 buy? Not "more learning" —

> **Gratis: du är värd.** Manus i handen, du gör pratet.
> **Vinkvällen, 499 kr: vi är värden.** Filmerna guidar kvällen. Dina vänner
> tittar med, alla fyller i sina egna smakblad, du häller upp.

This is honest to what the product already is: the course description states
that only one person needs to buy, the rest join a shared session, everyone
fills in their own smakblad and compares afterwards.

**4.2 Name (MAGIC).** *Vinkvällen — bjud hem vänner och håll en vinprovning de
pratar om.* Display title and sales copy only. **Slug `ldgmgv`, price 499, and
the Stripe product/price IDs are not touched.**

**4.3 Value stack, derived from real obstacles.** Each element already exists:

| Invändning | Svar i erbjudandet |
|---|---|
| "Jag kan inget om vin" | 5S-filmerna — vi lär ut, du behöver inte kunna |
| "Vet inte vilka viner jag ska köpa" | Färdig inköpslista till Systembolaget |
| "Vet inte vad jag ska säga" | Filmerna pratar, inte du |
| "Det blir pinsamt" | Livesession alla följer på sin mobil |
| "Mina vänner bryr sig inte" | Smakbladen + jämförelsen på slutet är spelet |
| "Tänk om det floppar" | 30 dagars pengarna-tillbaka, utan villkor |

**4.4 Price anchor.** Anchor against the real-world alternative, not invented
component values:

> En guidad vinprovning ute kostar 500–1000 kr **per person**.
> Vinkvällen kostar 499 kr — för hela sällskapet.

Assigning fake "värde 299 kr" figures to stack components is rejected
deliberately: those components are now free on the same site, so the claim
would be visibly false.

**4.5 Urgency.** Occasion-driven, never fake. "Din första vinkväll kan vara på
fredag." No countdown timers, no invented seat limits — both would be false and
would sit badly against marknadsföringslagen.

**4.6 Guarantee.** Unconditional, 30 days, stated plainly on the sales page and
repeated next to the buy button.

**4.7 Surfaces to rewrite.** `vinkurser/[slug]/page.tsx` (the sales page), the
course's `title` / `description` / `full_description` in Payload, and
`vinkurser/page.tsx` metadata.

## Section 5 — Site-wide ripple

- `src/components/home/OfferingsComparison.tsx` — rebuilt as **Gratis vs 499**
  instead of *Vinkurs vs Vinprovning*. The "99 kr per vinprovning · en gratis
  när du loggar in" line (line ~113) is now false and must go.
- `src/components/home/ProvningsmallarFeature.tsx` — lead with "gratis",
  point at `/provningsverktyget`.
- `src/components/home/VinkurserFeature.tsx` — Vinkvällen framing.
- Homepage `metadata` — one product, one free tool.
- `bli-medlem/page.tsx` — audit for now-false pricing claims.

Grep for stale "99 kr" and "köp mallen" strings across `src/` before shipping.

## Section 6 — Testing

`CLAUDE.md` says "No test suite is configured" — **that is stale**. The repo
uses `node --test` via `tsx` over pure modules (`pnpm test:ia`,
`pnpm test:session`, `pnpm test:vinkompassen`). Fix that line in CLAUDE.md.

- Extract the access branch into a pure `resolveTemplateAccess({ role, accessLevel, isAuthenticated })`
  in `src/lib/template-access.ts`, with `template-access.test.ts` covering:
  admin / public template + anonymous / gated template + anonymous /
  gated template + account. Add to a `test:access` script.
- Update `provningar-view.test.ts` for the removed `access` filter.
- Manual verification: anonymous visitor reads a full template; clicking
  "Använd mallen" routes to `/registrera`; after signup the clone succeeds;
  `/provningsmallar/x/kop` redirects; newsletter checkbox is pre-checked.

## Out of scope

- Producing new course content (bonuses, printed material, live Q&A).
- Renaming the course slug or Stripe product.
- Deleting `TemplateEntitlements`, `priceSek`, or the Stripe template sync.
- Re-enabling subscriptions (paused 2026-07-02).

## Migrations

Per `CLAUDE.md`, any collection change needs `pnpm migrate:create`. Expected:
one migration for the `access_level` data flip and `defaultValue` change. No
enum changes are introduced by this design — deliberately.
