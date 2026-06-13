# Vinkurs / Provningsmall product split — design

**Date:** 2026-06-13
**Status:** Draft for review
**Companion plan:** _none yet — to be created after this design lands_

## Problem

We have two products that have drifted into name collision:

| Product | What it is | Today's collection slug | Today's URL | Today's display copy |
|---|---|---|---|---|
| **Video course** with modules, lessons, quizzes, optional host-led session | Customer buys, then can also invite guests to a live session built on the course | `vinprovningar` | `/vinprovningar/[slug]` | "Vinkurs" (since commit `ca59d18`, copy-only) |
| **Tasting template** ("provningsmall") | Customer clones a template, hosts the tasting themselves | `tasting-templates` | `/provningsmallar/[slug]` | "Provningsmall" |

The video-course product is *internally* called `vinprovningar` everywhere — collection slug, URL, DB table, type names — but the customer-facing copy was renamed to "Vinkurs". The two products look like the same thing from the outside; the home page surfaces both back-to-back with no copy that says how they differ.

On top of the rename we want three product changes (price bump, harder paywall, homepage differentiation). Bundling them avoids two rounds of refactor on the same files.

## Goals

1. **End the name collision.** Video courses become **Vinkurs** end-to-end — collection slug, route, type names, copy. Templates stay **Provningsmall**.
2. **Lift the offering.** Price one flagship course 199 → 499; hide wines and TOC for non-purchasers; show only intro video + total wine cost.
3. **Make the home page say which is which.** A side-by-side comparison so a visitor understands within ten seconds whether they want a Vinkurs or a Provningsmall.

## Non-goals

- Renaming the templates product or its collection (`tasting-templates` stays).
- Changing the video-course data model beyond what gating + pricing need.
- Migrating the `vinprovningar` Postgres table. We will preserve the table name via `dbName` override (see decision D1).
- Changing Stripe Product IDs. We let Stripe's normal "archive old Price, create new Price" flow handle the 199→499 bump via the existing `afterChange` sync.

## Decisions

### D1 — Collection slug change uses `dbName` override; no DB rename

**Decision:** Set the collection slug to `vinkurser`, labels to `Wine course` / `Wine courses`, and add `dbName: 'vinprovningar'` so the Postgres table stays `vinprovningar`.

**Why:** A full table rename would cascade across 13 foreign keys (`enrollments`, `user_progress`, `transactions`, `subscriptions_rels`, `orders_items`, `course_reviews`, `course_sessions`, `payload_locked_documents_rels`, `vinprovningar_modules`, plus version tables), 8 PostgreSQL enum types, 36 indexes, and the parent-id versioning link. That's a high-risk migration on a live production table for zero functional benefit — the table name is invisible to users.

**Tradeoff:** Forever after, the table name and the collection slug disagree. We document this in `CLAUDE.md`. It's the same shape as `payload_locked_documents`-style overrides used by Payload internally.

### D2 — Field names with "vinprovning" in them keep their names; only labels change

**Decision:** Don't rename schema field names like `VinkompassArchetypes.recommendedVinprovning` or `CourseReviews.course` (whose admin label says "Vinprovning"). Update the `relationTo` target string to `'vinkurser'` and the `admin.label` to "Vinkurs" / "Rekommenderad vinkurs".

**Why:** Field renames in Payload = DB column renames = migrations. Field names are invisible to end users; only `relationTo` strings affect runtime resolution and only `label` affects what admins see.

**Tradeoff:** A future code-reader sees `recommendedVinprovning: ... relationTo: 'vinkurser'`. We add a one-line comment on each of these fields explaining the legacy.

### D3 — `/vinprovningar/*` URLs get permanent 301s in middleware

**Decision:** Add 301 redirects in `src/middleware.ts` for:
- `/vinprovningar` → `/vinkurser`
- `/vinprovningar/[slug]` → `/vinkurser/[slug]` (preserve query string)
- `/vinprovningar/[slug]/recension` → `/vinkurser/[slug]/recension`

**Why:** Sitemap entries at priority 0.9 (32+ courses currently published) are indexed by Google. Old emails, Stripe `cancel_url`s in flight, bookmarks, and any inbound links from blog/social must not 404. 301 is permanent because we don't plan to bring the old paths back.

**Tradeoff:** Two redirect rules live in middleware indefinitely. Cheap.

### D4 — Hide the TOC entirely from non-purchasers; show intro video only

**Decision:** For non-purchasers (no `Enrollments` row, no active session participation), `CourseOverview` renders:
- Intro video (`previewMuxData.playbackId`)
- Title, description, instructor, level, duration
- **Aggregate** wine cost (`Σ wine.price` from WineList blocks in `fullDescription`)
- **Module list** with module titles and per-module item count, e.g. `Modul 1 — Introduktion · 4 delar`. No individual lesson/quiz titles. No click affordance.
- Reviews
- Purchase CTA

The current `isFree` content-item mechanic is removed from the non-purchaser path. Purchasers and session participants still get the full TOC + lesson player.

**Why:** User said "really just display the intro video for users who hasnt bought anything." Showing module titles + item counts gives visitors a meaningful "what's inside" shape without leaking lesson-level keywords or the impression that lessons are browsable.

**Tradeoff:** We lose the "free preview lesson" growth lever. If we want it back later, we add it explicitly as a `previewLessons` field on the course rather than per-item `isFree` flags.

### D5 — Wine identity is hidden pre-purchase via render-time redaction (no schema migration)

**Decision:** The `WineListBlock` renderer accepts a new `userHasAccess: boolean` prop. When `false`, it renders an aggregate placeholder (count + total SEK + "Lås upp viner med köp" link) instead of the wine list. We compute the aggregate by walking the `fullDescription` rich-text tree server-side on the course detail page to extract WineList blocks and sum `wine.price`.

**Why:** WineList today is a rich-text block embedded inside `fullDescription` — wine identity is structurally entangled with course content. Lifting wines to a top-level `wines` field would require a content migration on every published course. We don't need that for the gating outcome; render-time redaction is enough.

**Tradeoff:** AST walking is fragile if the rich-text shape changes. We isolate it in one helper (`src/lib/course/wine-aggregate.ts`) with a small unit test so the failure mode is loud.

### D6 — Price bump applies to the flagship course only (one document)

**Decision:** The 199 → 499 SEK price change applies to a single course document (the flagship live tasting), edited through the admin UI. The existing `afterChange` hook on `Vinkurser` triggers `syncCourseWithStripe()`, which archives the old `stripePriceId` and creates a new one. Already-enrolled users are unaffected (Stripe Prices are immutable; their `Enrollments.payment.amount` is historical).

**Why:** User said "we want to raise the price from 199 to 499 on our wine tasting" (singular). Other courses keep their current prices.

**Tradeoff:** If user later means "all courses," it's a five-minute change repeated.

### D7 — Homepage gets a two-card comparison strip before everything else

**Decision:** Replace the current hero CTA's single `/vinkurser/{featuredSlug}` link with **two primary CTAs** ("Se vinkurser" / "Bläddra i provningsmallar"), and insert a new **comparison section** directly below the hero — two cards side-by-side, each with: name, one-line "what it is," "who it's for," 3 included-features bullets, CTA.

**Why:** Current homepage surfaces both products implicitly via two different sections (hero copy + ProvningsmallarFeature) without ever explaining the difference. A visitor lands and doesn't know whether they're being sold a course, a template, or both.

**Tradeoff:** More homepage real estate above the fold. Move the hidden "Så fungerar" section and the recommended-course card permanently out (delete the `{false && (…)}` wrappers).

## Scope, in three workstreams

### Workstream A — Rename `vinprovningar` collection → `vinkurser` (the primary)

**Payload collection**
- `src/collections/Vinprovningar.ts` → file rename `Vinkurser.ts`; export `Vinkurser`
- `slug: 'vinkurser'`
- `dbName: 'vinprovningar'` ← decision D1
- `labels: { singular: 'Wine course', plural: 'Wine courses' }`
- `admin.group: 'Wine Courses'`
- Internal comment on the dbName override explaining the legacy
- Update `src/payload.config.ts` import + collections-array entry
- Run `pnpm generate:types` → `Vinprovningar` interface becomes `Vinkurser`, `VinprovningarSelect` → `VinkurserSelect`

**Cross-collection updates** (eight collections + the modules array on the course itself)
| File | Change |
|---|---|
| `src/collections/Enrollments.ts` | `relationTo: 'vinkurser'` |
| `src/collections/UserProgress.ts` | `relationTo: 'vinkurser'` |
| `src/collections/CourseReviews.ts` | `relationTo: 'vinkurser'`, label → "Vinkurs" |
| `src/collections/CourseSessions.ts` | `relationTo: 'vinkurser'` |
| `src/collections/Orders.ts` | `relationTo: 'vinkurser'` |
| `src/collections/Subscriptions.ts` | `relationTo: 'vinkurser'` |
| `src/collections/Transactions.ts` | `relationTo: 'vinkurser'` |
| `src/collections/VinkompassArchetypes.ts` | `relationTo: 'vinkurser'`; label → "Rekommenderad vinkurs"; field name kept |

**Access control + Stripe helpers**
| File | Lines | Change |
|---|---|---|
| `src/lib/access-control.ts` | 323, 390 | Query `'vinkurser'` collection |
| `src/lib/stripe-products.ts` | 4 (type import), 148-149, 334, 364, 422 | Update type import + collection slug refs |

**Frontend routes**
- `src/app/(frontend)/(site)/vinprovningar/` → rename directory to `vinkurser/`
  - `page.tsx` (listing), `[slug]/page.tsx` (detail), `[slug]/recension/page.tsx`, `quiz-actions.ts`
- `src/app/api/vinprovningar/title/route.ts` → rename to `src/app/api/vinkurser/title/route.ts`

**Hardcoded URLs** (full list from discovery)
| File | Line | Change |
|---|---|---|
| `src/middleware.ts` | 105–106 | Allowlist now `/vinkurser` and `/vinkurser/*` |
| `src/middleware.ts` | _new_ | Add 301 redirects (decision D3) |
| `src/app/api/payments/create-checkout-session/route.ts` | 142 | `cancel_url` → `/vinkurser/{slug}?checkout=cancelled` |
| `src/lib/email-templates.ts` | 28, 167 | Review/purchase URLs |
| `src/app/sitemap.ts` | 19, 93 | Static + dynamic entries |
| `src/app/api/revalidate/route.ts` | 40 | ISR path |
| `src/components/breadcrumb-bar.tsx` | 29 | Mapping key |
| `src/components/mobile-bottom-nav.tsx` | 39 | Nav link |
| `src/components/top-nav-header.tsx` | 34 | Nav link |
| `src/components/ui/footer.tsx` | 14 | Footer link |
| `src/context/SessionContext.tsx` | — | Session share URL builder |
| `src/components/course/SessionView.tsx` | — | Session join URLs |
| `src/components/home/NeuralHeroWithBanner.tsx` | — | "Kom igång" → new dual CTA (see Workstream C) |
| All session emails / `claim-your-tasting.ts` | 34 | Subject + body links |
| Vinkompassen result card | — | PostHog event name update + URL |

**Display copy sweep**
Search-and-replace user-facing Swedish strings only. Touched files (from discovery, non-exhaustive): `page.tsx` (homepage), `om-oss/page.tsx`, `styleguide/page.tsx`, `hjalp/HelpPageClient.tsx`, `kontakt/ContactForm.tsx` (keep both options — see open question Q1), `villkor/page.tsx`, `CourseCompletionPage.tsx:134`, `OrderSummary.tsx:87`, footer `:173`, `WineListBlock.tsx:71`.

The hero already says "Vinkurser" since `ca59d18` — no change there.

**Stripe**
No Stripe-side rename required. Product IDs persist. After A lands, run `pnpm sync-stripe` once so Product metadata (name from `course.title`, description) re-syncs cleanly — purely cosmetic in Stripe dashboard.

### Workstream B — Pricing + gating

**B.1 Price 199 → 499 (flagship course only)**
- Admin edits the course's `price` field from 199 to 499
- `afterChange` hook fires `syncCourseWithStripe()` → new `stripePriceId`, old archived
- Existing enrollments unchanged (Stripe Price immutability ⇒ they remain on the 199 SEK price record)
- Active checkout sessions started before the change use the old Price until expiry (≤24h)
- No code change required — this is content-level work executed in admin after Workstream A lands

**B.2 Hide TOC for non-purchasers**
- `src/components/course/CourseOverview.tsx`: split render into `<PurchaserView>` and `<VisitorView>`
- `VisitorView` shows: intro video, hero metadata, total wine cost (from B.3), **module list with titles + per-module item counts** (e.g. `Modul 1 — Introduktion · 4 delar`; no lesson titles, no expand affordance), reviews, purchase CTA
- New `VisitorModuleList` component: flat list, locked-icon next to each row, item count derived from `module.contentItems.length`
- `CourseTableOfContents` (the full clickable TOC) is not mounted on the visitor path
- Remove the `isFree`-routed "preview lesson" path on `[slug]/page.tsx` for unauthenticated/non-purchaser users (D4). Free items inside modules can stay as a data feature for now (admins can keep using it), but the visitor route no longer surfaces them.

**B.3 Hide wine identity for non-purchasers**
- New helper: `src/lib/course/wine-aggregate.ts`
  - `getCourseWineAggregate(course: Vinkurs): { count: number; totalSek: number }`
  - Walks `course.fullDescription` rich-text tree, finds nodes with `blockType === 'wineList'`, sums `wine.price` across all referenced wines, returns `{ count, totalSek }`
  - Small unit test (or `tsc`-level sanity) — the rich-text shape changing should fail loud here, not silently in production
- `src/components/blocks/WineListBlock.tsx`: add `userHasAccess?: boolean` prop
  - When `userHasAccess === false`: render placeholder `<WineAggregatePlaceholder count={…} totalSek={…} />` with "Lås upp vinerna med köp" CTA
  - When `userHasAccess === true`: render today's component
- `[slug]/page.tsx`: pass `userHasAccess` through `RichTextRenderer` block context to `WineListBlock`
- `VisitorView` also shows the aggregate directly above the purchase CTA: "Viner: 6 st · ca 480 kr"

**Touched in B**
- `src/app/(frontend)/(site)/vinkurser/[slug]/page.tsx`
- `src/components/course/CourseOverview.tsx`
- `src/components/blocks/WineListBlock.tsx`
- `src/lib/course/wine-aggregate.ts` (new)
- Optionally `src/components/course/CourseTableOfContents.tsx` (delete unused non-purchaser branches)

### Workstream D — Provningsmall pricing & purchase

Templates move from "free for members" to **99 SEK per template, one-time purchase**. One designated template is free for any logged-in user as a trial of the feature. The pre-existing subscription tier (Subscriptions collection) continues to grant access to all templates (see open question O-3 below if that's not what you want).

**D.1 — Schema changes (`TastingTemplates`)**

| Field | Change |
|---|---|
| `priceSek` | **NEW** `number`, required, default `99`, min `0`. Per-template price. |
| `isFreeTrial` | **NEW** `checkbox`, default `false`. Marks the "try it for free" template visible to any logged-in user. Soft-enforced single-instance (admin convention; we log a warning if more than one is published with this on). |
| `accessLevel` | **REPURPOSED** — `free` semantics become "no purchase required for anyone, ever" (useful for promo or seasonal freebies). `members_only` deprecates; we migrate existing `members_only` templates to `accessLevel: 'paid'` (new option). New enum: `free | paid`. |
| `stripeProductId` | **NEW** `text`, hidden, read-only. Mirrors Vinkurser pattern. |
| `stripePriceId` | **NEW** `text`, hidden, read-only. |

Migration of existing templates:
- All `accessLevel: 'free'` → stay `'free'`, `priceSek = 0`
- All `accessLevel: 'members_only'` → `accessLevel: 'paid'`, `priceSek = 99`
- Admin picks one to flag `isFreeTrial = true` after deploy

**D.2 — Stripe integration**

Mirror the Vinkurser pattern: per-template Stripe Product + Price. `syncTemplateWithStripe()` helper added to `src/lib/stripe-products.ts`. `afterChange` hook on `TastingTemplates` triggers sync when `priceSek` or `title` changes. Old Prices archived on bump.

Why per-template instead of one shared "99 kr Provningsmall" Price: lets you set per-template pricing later (e.g. premium curated 149 kr templates) without restructuring. Stripe products map cleanly to admin-curated content.

**D.3 — New collection: `TemplateEntitlements`**

Mirrors `Enrollments` for templates. One row per `(user, template)` purchase. Stripe webhook creates these.

```ts
TemplateEntitlements {
  user: relationship → users (required)
  template: relationship → tasting-templates (required)
  status: 'active' | 'refunded'
  acquiredVia: 'purchase' | 'subscription' | 'free_trial' | 'free' | 'admin_grant'
  payment: { amount, currency, transactionId, paidAt } // null for non-purchase acquisitions
  // unique index on (user, template)
}
```

**D.4 — Access predicate (extend `src/lib/access-control.ts`)**

```ts
canUseTemplate(user, template) =>
  template.accessLevel === 'free'           // always free
  || template.isFreeTrial && !!user         // free trial visible to any logged-in user
  || hasActiveSubscription(user)            // subscriber backstop (O-3 below)
  || hasTemplateEntitlement(user, template) // bought it
```

Used by:
- `LockedTemplateDetailView` vs `TemplateDetailView` branching on `[slug]/page.tsx`
- `UseTemplateButton` (clone) — checks before POSTing to `/api/tasting-plans/from-template/[templateId]`
- `/api/tasting-plans/from-template/[templateId]` server route — re-checks (defense in depth)

**D.5 — Purchase flow**

New page: `/provningsmallar/[slug]/kop` — Stripe Checkout session creator (mirrors `create-checkout-session` for courses). Posts to `/api/payments/template-checkout`. On `payment_intent.succeeded`, Stripe webhook creates a `TemplateEntitlements` row with `acquiredVia: 'purchase'`.

Anonymous visitor sees `LockedTemplateDetailView` with two CTAs:
- **Köp för 99 kr** → goes to `/logga-in?next=/provningsmallar/[slug]/kop`
- **Logga in** → goes to `/logga-in?next=/provningsmallar/[slug]`

Logged-in non-purchaser sees `LockedTemplateDetailView` with one CTA:
- **Köp för 99 kr** → goes directly to checkout

Logged-in user on the `isFreeTrial` template sees `TemplateDetailView` (full) with "Använd mallen" — no purchase needed; cloning creates an entitlement with `acquiredVia: 'free_trial'`.

**D.6 — `OfferingsComparison` pricing copy**

Now both cards have meaningful pricing:

| | Vinkurs | Provningsmall |
|---|---|---|
| Price | **Från 499 kr · engångsbetalning** | **99 kr per mall · en gratis när du loggar in** |

**Touched in D**
- `src/collections/TastingTemplates.ts` — new fields, hooks
- `src/collections/TemplateEntitlements.ts` — new collection
- `src/lib/access-control.ts` — `canUseTemplate()`, `hasTemplateEntitlement()`
- `src/lib/stripe-products.ts` — `syncTemplateWithStripe()`, `syncAllTemplatesWithStripe()`
- `scripts/sync-templates-with-stripe.ts` (new, mirrors `sync-courses-with-stripe.js`); `package.json` adds `sync-templates` script
- `src/components/tasting-template/LockedTemplateDetailView.tsx` — new CTA copy
- `src/components/tasting-template/UseTemplateButton.tsx` — pre-flight access check
- `src/app/(frontend)/(site)/provningsmallar/[slug]/page.tsx` — branch on `canUseTemplate`
- `src/app/(frontend)/(site)/provningsmallar/[slug]/kop/page.tsx` — new
- `src/app/api/payments/template-checkout/route.ts` — new
- `src/app/api/webhooks/stripe/route.ts` — handle `payment_intent.succeeded` with `metadata.templateId` → create `TemplateEntitlements` row
- `src/app/api/tasting-plans/from-template/[templateId]/route.ts` — server-side `canUseTemplate` check
- `src/lib/template-locked-preview.ts` — keep, used by `LockedTemplateDetailView`
- New migration: add `priceSek`, `isFreeTrial`, `stripeProductId`, `stripePriceId` to `tasting_templates`; create `template_entitlements` table; new enum for `accessLevel`

### Workstream C — Homepage IA

**Final order**
1. `NeuralHeroWithBanner` — same brand statement, dual CTA: **"Se vinkurser"** (→ `/vinkurser`) + **"Bläddra i provningsmallar"** (→ `/provningsmallar`)
2. **NEW: `OfferingsComparison`** — two cards side-by-side
3. `ProvningsmallarFeature` (kept; thin showcase of three templates)
4. **NEW: `VinkurserFeature`** (mirror of `ProvningsmallarFeature` but for courses)
5. Articles
6. About / Vision
7. Newsletter
8. Final CTA

**`OfferingsComparison` content (Swedish, draft copy — to be tweaked by Fredrik)**
| | Vinkurs | Provningsmall |
|---|---|---|
| Intro | Färdig vinkurs du gör i din egen takt | Färdigt provningsupplägg du själv är värd för |
| För dig som | …vill lära dig vin grundligt, gärna med vänner som gäster | …vill samla vänner till en avslappnad provning utan att förbereda allt själv |
| Ingår | Videolektioner · Quiz · Vinval · Värdguide (om du vill bjuda in) | Tema · Vinval · Värdmanus · Smakprotokoll |
| CTA | Se kurserna | Utforska biblioteket |

**Cleanup**
- Delete the `{false && (…)}` wrappers around "Så fungerar" and the recommended course card — they've been hidden for a month and we're not bringing them back as-is (the comparison strip replaces both purposes).

**Touched in C**
- `src/app/(frontend)/(site)/page.tsx`
- `src/components/home/NeuralHeroWithBanner.tsx` (dual CTA)
- `src/components/home/OfferingsComparison.tsx` (new)
- `src/components/home/VinkurserFeature.tsx` (new — copy `ProvningsmallarFeature.tsx`)
- `src/app/(frontend)/(site)/page.tsx` data fetch — add `payload.find({ collection: 'vinkurser', limit: 3, sort: '-publishedAt', ... })` alongside the existing templates fetch

## Migration plan

Five PRs in order, each independently shippable to staging (= `main`). Cut a single `release: product split (A–E)` curated commit onto `production` at the end per the deployment memory.

**PR-A1 — Collection slug rename** _(no URL changes)_
- File rename + slug + `dbName` override + `relationTo` updates across nine collections + access-control + Stripe helpers + type regen
- No frontend route changes yet
- _Smoke test:_ admin login, edit a course, save, verify no schema errors; Stripe sync runs; Enrollments query works
- _Migration:_ none

**PR-A2 — URL move + 301s**
- Frontend route directory rename + API route rename
- Middleware allowlist + redirects
- All hardcoded URL touchpoints
- Sitemap regenerate
- _Smoke test:_ `/vinprovningar/` 301→ `/vinkurser/`; old purchase email link redirects; Stripe cancel URL redirects; session share link works

**PR-A3 — Copy sweep**
- Replace user-facing "vinprovning"/"Vinprovning" → "vinkurs"/"Vinkurs" everywhere except:
  - Places that genuinely mean the templates product (e.g. contact-form category "Vinprovningar" → renamed "Provningsmallar")
  - Admin field names (kept; see D2)
- Update PostHog event names where reasonable (or document the legacy)

**PR-B — Gating + wine aggregate**
- `wine-aggregate.ts` + tests
- `WineListBlock` aggregate variant
- `CourseOverview` visitor vs purchaser split (visitor sees module titles + per-module item counts; no lesson titles)
- Remove visitor `isFree` shortcut
- _Smoke test:_ anon visit to a course page shows: intro video, total wine cost, module titles + item counts, no lesson titles, no TOC click-through; purchase still works; existing enrolled users still see full TOC

**PR-D — Provningsmall pricing & purchase**
- Migration: add `priceSek`, `isFreeTrial`, `stripeProductId`, `stripePriceId` to `tasting_templates`; new enum option `paid` on `access_level`; create `template_entitlements` table; backfill existing `members_only` rows → `paid` with `priceSek = 99`
- `TemplateEntitlements` collection
- `canUseTemplate()` predicate + access-control wiring
- `syncTemplateWithStripe()` helper; `sync-templates` package.json script; run once after deploy to seed Stripe products
- New `/provningsmallar/[slug]/kop` page + `/api/payments/template-checkout` route
- Stripe webhook branch: `payment_intent.succeeded` with `metadata.productKind === 'template'` → create `TemplateEntitlements`
- `LockedTemplateDetailView` CTA copy ("Köp för 99 kr")
- _Smoke test:_ logged-out visitor on a paid template sees lock view + buy CTA; logged-in user sees buy CTA; designated `isFreeTrial` template clones without payment; purchase succeeds end-to-end on staging Stripe; cloning a non-purchased template returns 403
- _Admin step after deploy:_ flag one template as `isFreeTrial: true`; verify pricing on the rest

**PR-C — Homepage IA**
- `OfferingsComparison`, `VinkurserFeature`, dual hero CTA
- Delete dead `{false &&}` blocks
- _Smoke test:_ home page renders both sections; CTAs route correctly; mobile layout doesn't break

**Then in admin (no code):**
- Edit the flagship course's `price` field from 199 → 499; save; verify Stripe gets new Price ID + old archived

**Then deploy to production:**
- Cut `release: product split — vinkurser rename, harder paywall, homepage IA` curated commit onto `production` per memory
- Migrations: none (verify by running `pnpm migrate:status` — should be clean)

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Sitemap loses indexed pages → SEO drop on the flagship course | 301s preserve link equity; resubmit sitemap to Google Search Console after PR-A2 |
| Active Stripe checkout sessions reference old `/vinprovningar` cancel URL | 301 catches them; we don't break the flow |
| Mobile bookmarks 404 | 301 catches them |
| `wine-aggregate.ts` AST walker breaks if rich-text shape changes | Unit test on a known-good WineList block; fail loud on shape mismatch |
| Price bump confuses existing enrollees who paid 199 | Their `Enrollments.payment.amount = 199` is historical; their access is unchanged; we don't email anyone about the bump |
| `recommendedVinprovning` field name on `VinkompassArchetypes` becomes confusing for future devs | D2 note inline + one-line comment |
| Discovery flagged a `subscriptions_rels.vinprovningar_id` column name — we keep it as-is | Document in collection comment; no rename needed (it's an internal junction column) |
| Two homepage sections (`VinkurserFeature` + `ProvningsmallarFeature`) duplicate visual rhythm | Acceptable; they parallel each other intentionally. Could merge into one tabbed component in v2 |

## Resolutions

All open questions answered (2026-06-13).

**Core scope**

| Question | Answer |
|---|---|
| Price-bump scope (199→499) | Single flagship course only |
| Keep `isFree` Modules field | Yes — kept on data model, removed from visitor route |
| Visitor route detail level | Show module titles + per-module item count; no lesson titles |
| Wine identity redaction | AST walk over WineList blocks; aggregate placeholder |
| Release shape | One curated `release:` commit at the end |
| Contact form `Vinprovningar` category | Rename to `Provningsmallar` |
| Admin labels (Swedish vs English) | **English** — `Wine course` / `Wine courses` (matches CLAUDE.md convention) |
| Homepage `VinkurserFeature` section | Add now |
| Free preview growth lever | Drop — purchase CTA is the only door |
| Template pricing model | 99 SEK per template, one-time purchase; one designated template is free for any logged-in user |

**Template pricing details**

| Question | Answer |
|---|---|
| Stripe modeling | **Per-template Product + Price**, mirroring Vinkurser. Each template gets its own Stripe Product. |
| Backfill for existing `members_only` clones | **Yes** — script a one-time backfill that creates `TemplateEntitlements` rows (`acquiredVia: 'admin_grant'`) for any user with an existing `TastingPlan` derived from a now-paid template |
| Subscription unlock | **Yes** — active subscribers unlock all paid templates (`hasActiveSubscription(user)` short-circuits `canUseTemplate`) |
| Refund handling | **Yes** — Stripe refund flips `TemplateEntitlements.status` to `'refunded'`; `canUseTemplate` returns false; already-cloned `TastingPlans` are unaffected |
| `OfferingsComparison` pricing copy | Vinkurs: **Från 499 kr · engångsbetalning** · Provningsmall: **99 kr per mall · en gratis när du loggar in** |

## Out of scope (parking lot)

- Lifting wines from `fullDescription` rich-text blocks to a top-level `wines` field on Vinkurser. Cleaner long-term but a real content migration; not required for this round.
- Per-module pricing or "buy a single module" tiers.
- Splitting "video course" and "live-with-guests" into two separate product types. Today they're the same record with an optional session.
- Templates product price/payment model (templates are currently free-to-clone for members).
- Reviving "Så fungerar det" content elsewhere on the site.
