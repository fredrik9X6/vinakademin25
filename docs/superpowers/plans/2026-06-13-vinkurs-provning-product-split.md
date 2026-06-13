# Vinkurs / Provningsmall product split — implementation plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to execute this plan. Tasks use checkbox (`- [ ]`) syntax.

**Goal:** Cleanly separate the two products (video courses = Vinkurs at `/vinkurser`, tasting templates = Provningsmall at `/provningsmallar`), raise the flagship course price 199 → 499 SEK, harden the course paywall, introduce per-template pricing (99 SEK with one free trial), and redesign the homepage to make the offering distinction visible. Per the design at `docs/superpowers/specs/2026-06-13-vinkurs-provning-product-split-design.md`.

**Architecture:**
- The `vinprovningar` Payload collection is renamed to `vinkurser` at the slug + label + type level, but the Postgres table stays `vinprovningar` via `dbName` override — zero data migration on the courses table.
- `/vinprovningar/*` URLs get permanent 301s in `src/middleware.ts`.
- Course visitor route (non-purchasers) is reduced to: intro video + hero metadata + module list with item counts + aggregate wine cost + reviews + purchase CTA. No lesson titles, no clickable TOC, no `isFree` shortcut.
- Wine identity is hidden via render-time redaction in `WineListBlock` (AST walks `fullDescription` to compute an aggregate placeholder).
- Templates get per-template Stripe Products + Prices, a new `TemplateEntitlements` collection mirroring `Enrollments`, and a one-time-purchase flow at `/provningsmallar/[slug]/kop`. Active subscribers and the designated `isFreeTrial` template bypass purchase. Refunds revoke access.
- Homepage gains a side-by-side `OfferingsComparison`, a new `VinkurserFeature` mirror of the existing `ProvningsmallarFeature`, and the dead `{false && (…)}` blocks are deleted.

**Conventions (read once, apply everywhere):**
- pnpm only. Pin `@payloadcms/*` packages to exact `3.33.0`.
- Any collection or enum change → `pnpm migrate:create -- "<name>"`. Commit migration alongside collection edits.
- After collection edits → `pnpm generate:types`. Never hand-edit `src/payload-types.ts`.
- After admin component changes → `pnpm generate:importmap`.
- Swedish for user-facing copy. No emojis in copy or code.
- Server components by default. `'use client'` only where state/effects need it.
- Shadcn UI from `src/components/ui/`. `cn()` from `src/lib/utils.ts`.
- Access control types: `Access`, `PayloadRequest` from `payload` (NOT `payload/types`).
- Logger: `import { loggerFor } from '@/lib/logger'; const log = loggerFor('module-name')`.
- PostHog: `trackEvent` from `@/components/analytics`.
- Use `getPayload` from `src/lib/payload.ts` for server-side Payload access.

**Production deploy convention:** `main` = staging, `production` = live (per `project_deployment_branches` memory). One curated `release:` commit onto `production` at the very end of this entire spec — not per-PR.

---

## File map

### Renamed / removed

| Old path | New path | Note |
|---|---|---|
| `src/collections/Vinprovningar.ts` | `src/collections/Vinkurser.ts` | Collection slug → `vinkurser`; `dbName: 'vinprovningar'` override preserves table |
| `src/app/(frontend)/(site)/vinprovningar/` | `src/app/(frontend)/(site)/vinkurser/` | All four files: `page.tsx`, `[slug]/page.tsx`, `[slug]/recension/page.tsx`, `quiz-actions.ts` |
| `src/app/api/vinprovningar/title/route.ts` | `src/app/api/vinkurser/title/route.ts` | |

### Modified — collections (relationTo update)

- `src/collections/Enrollments.ts`
- `src/collections/UserProgress.ts`
- `src/collections/CourseReviews.ts`
- `src/collections/CourseSessions.ts`
- `src/collections/Orders.ts`
- `src/collections/Subscriptions.ts`
- `src/collections/Transactions.ts`
- `src/collections/VinkompassArchetypes.ts`
- `src/collections/Vinkurser.ts` (post-rename — internal `modules` relationship array)

### Modified — lib

- `src/lib/access-control.ts` — `'vinkurser'` collection refs (lines 323, 390); new `canUseTemplate`, `hasTemplateEntitlement`, `hasActiveSubscription` helpers
- `src/lib/stripe-products.ts` — `'vinkurser'` collection refs; new `syncTemplateWithStripe`, `syncAllTemplatesWithStripe`
- `src/lib/course/wine-aggregate.ts` — **NEW** AST walker over `fullDescription` returning `{ count, totalSek }`
- `src/lib/template-locked-preview.ts` — keep, used by `LockedTemplateDetailView`

### Modified — frontend routes (URL refs)

- `src/middleware.ts` — allowlist `/vinkurser*`; add 301 redirects for `/vinprovningar*`
- `src/app/api/payments/create-checkout-session/route.ts:142` — `cancel_url` → `/vinkurser/{slug}?checkout=cancelled`
- `src/lib/email-templates.ts:28, 167` — `/vinkurser/{slug}/recension` + `/vinkurser/{slug}`
- `src/app/sitemap.ts:19, 93` — `/vinkurser` static + `/vinkurser/{slug}` dynamic
- `src/app/api/revalidate/route.ts:40` — `/vinkurser` in ISR paths
- `src/components/breadcrumb-bar.tsx:29` — mapping key `vinkurser` → `Vinkurser`
- `src/components/mobile-bottom-nav.tsx:39` — `/vinkurser` link
- `src/components/top-nav-header.tsx:34` — `/vinkurser` link
- `src/components/ui/footer.tsx:14, 173` — `/vinkurser` link + copy
- `src/context/SessionContext.tsx` — session share URL builder
- `src/components/course/SessionView.tsx` — session join URL constructor
- `src/lib/session-emails/claim-your-tasting.ts:34` — subject + body URLs
- `src/app/(frontend)/(site)/vinkompassen/resultat/[attemptId]/VinprovningCard.tsx:17-19` — PostHog event name + URL

### Modified — copy

- `src/app/(frontend)/(site)/page.tsx` (homepage — both hero + sections; rebuilt in PR-C)
- `src/app/(frontend)/(site)/om-oss/page.tsx`
- `src/app/(frontend)/(site)/styleguide/page.tsx`
- `src/app/(frontend)/(site)/hjalp/HelpPageClient.tsx:49-84`
- `src/app/(frontend)/(site)/kontakt/ContactForm.tsx:41-42` (rename `Vinprovningar` category → `Provningsmallar`)
- `src/app/(frontend)/(site)/villkor/page.tsx:48-165`
- `src/components/course/CourseCompletionPage.tsx:134`
- `src/components/payment/OrderSummary.tsx:87`
- `src/components/blocks/WineListBlock.tsx:71` (default title)

### Modified — course gating

- `src/components/course/CourseOverview.tsx` — split into `VisitorView` and `PurchaserView` (or branch internally)
- `src/components/course/CourseTableOfContents.tsx` — keep for purchasers, no longer mounted for visitors
- `src/components/blocks/WineListBlock.tsx` — accept `userHasAccess` prop, render aggregate placeholder when false
- `src/app/(frontend)/(site)/vinkurser/[slug]/page.tsx` — pass `userHasAccess` through rich-text block context

### New — visitor course components

- `src/components/course/VisitorModuleList.tsx` — flat list of modules with title + per-module item count, lock icon
- `src/components/course/WineAggregatePlaceholder.tsx` — "X viner · ca Y kr · Lås upp med köp"

### New — template pricing

- `src/collections/TemplateEntitlements.ts` — **NEW** collection (user, template, status, acquiredVia, payment)
- `src/app/(frontend)/(site)/provningsmallar/[slug]/kop/page.tsx` — **NEW** purchase landing
- `src/app/api/payments/template-checkout/route.ts` — **NEW** Stripe Checkout session creator
- `scripts/sync-templates-with-stripe.ts` — **NEW** wrapper for `syncAllTemplatesWithStripe`
- `scripts/backfill-template-entitlements.ts` — **NEW** one-shot script for O-2 backfill

### Modified — template surface

- `src/collections/TastingTemplates.ts` — add `priceSek`, `isFreeTrial`, `stripeProductId`, `stripePriceId`; repurpose `accessLevel` enum to `'free' | 'paid'`; new afterChange hook for Stripe sync
- `src/components/tasting-template/LockedTemplateDetailView.tsx` — CTAs update to "Köp för 99 kr" / "Logga in"
- `src/components/tasting-template/TemplateDetailView.tsx` — show `isFreeTrial` badge when applicable
- `src/components/tasting-template/UseTemplateButton.tsx` — pre-flight `canUseTemplate` check before POST
- `src/app/(frontend)/(site)/provningsmallar/[slug]/page.tsx` — branch on `canUseTemplate`
- `src/app/api/tasting-plans/from-template/[templateId]/route.ts` — server-side `canUseTemplate` enforcement
- `src/app/api/webhooks/stripe/route.ts` — branch on `metadata.productKind` to create `Enrollments` (course) or `TemplateEntitlements` (template); handle `charge.refunded`

### Modified — homepage IA (PR-C)

- `src/app/(frontend)/(site)/page.tsx` — new section order; delete `{false && (…)}` blocks; add data fetch for top-3 vinkurser
- `src/components/home/NeuralHeroWithBanner.tsx` — dual CTA
- `src/components/home/OfferingsComparison.tsx` — **NEW**
- `src/components/home/VinkurserFeature.tsx` — **NEW** (mirror of `ProvningsmallarFeature.tsx`)

### Migrations (new)

- `src/migrations/<ts>_rename_vinprovningar_to_vinkurser.ts` — slug-only rename; expected to be a near-empty migration since `dbName` keeps the table name. Confirm by inspecting the generated diff.
- `src/migrations/<ts>_template_pricing.ts` — add `priceSek`, `isFreeTrial`, `stripeProductId`, `stripePriceId` columns on `tasting_templates`; rename `access_level` enum option `members_only` → `paid`; create `template_entitlements` table + indexes

---

## Phase PR-A1 — Collection rename, no URL changes

**Branch:** `vinkurs-rename-collection` (from `main`).

- [ ] Rename `src/collections/Vinprovningar.ts` → `src/collections/Vinkurser.ts`
- [ ] In `Vinkurser.ts`: change `slug` to `'vinkurser'`, add `dbName: 'vinprovningar'`, set `labels: { singular: 'Wine course', plural: 'Wine courses' }`, `admin.group: 'Wine Courses'`. Add an inline comment explaining the `dbName` override.
- [ ] Update `src/payload.config.ts` — import path + collections array entry name → `Vinkurser`
- [ ] Update every `relationTo: 'vinprovningar'` → `'vinkurser'` across these collections (8 + the modules array on the course itself):
  - [ ] `src/collections/Enrollments.ts`
  - [ ] `src/collections/UserProgress.ts`
  - [ ] `src/collections/CourseReviews.ts` (also change admin label to `Wine course`)
  - [ ] `src/collections/CourseSessions.ts`
  - [ ] `src/collections/Orders.ts`
  - [ ] `src/collections/Subscriptions.ts`
  - [ ] `src/collections/Transactions.ts`
  - [ ] `src/collections/VinkompassArchetypes.ts` (keep `recommendedVinprovning` field name; only `relationTo` + label change. Add inline `// legacy field name; relationTo is 'vinkurser'` comment.)
  - [ ] `src/collections/Vinkurser.ts` — internal `modules` array `relationTo: 'modules'` (no change there) but confirm
- [ ] Update `src/lib/access-control.ts` — collection name strings at lines 323, 390 → `'vinkurser'`
- [ ] Update `src/lib/stripe-products.ts` — type import (`Vinprovningar` → `Vinkurser` from `payload-types`), collection name strings at lines 148-149, 334, 364, 422
- [ ] Generate migration: `pnpm migrate:create -- "rename-vinprovningar-to-vinkurser"`
- [ ] **Verify** generated migration is near-empty (collection metadata change only — no `ALTER TABLE`). If Payload tries to rename tables, double-check `dbName` is set correctly. Commit the migration.
- [ ] Run `pnpm generate:types`. Commit the regenerated `src/payload-types.ts`.
- [ ] Run `pnpm generate:importmap`. Commit if changed.
- [ ] Run `pnpm tsc --noEmit` — fix any straggling `Vinprovningar` type imports (search-replace `Vinprovningar` → `Vinkurser` for type identifiers only).
- [ ] Run `pnpm lint`.

**Acceptance criteria:**
- Admin login works; `Wine Courses` group appears in left nav; opening a course edits and saves without DB error.
- A course's Stripe sync still runs (edit price by 1 SEK, save, revert; check logs for `syncCourseWithStripe` success).
- `Enrollments`, `UserProgress`, `CourseReviews`, `CourseSessions` admin lists load and resolve the course relationship correctly.
- `pnpm tsc --noEmit` passes.
- No URL changes yet — `/vinprovningar/*` still works exactly as before. (You haven't touched routes.)

**Merge → `main`.** Smoke-test on staging.

---

## Phase PR-A2 — URL move + 301 redirects

**Branch:** `vinkurs-routes` (from `main`).

- [ ] Rename frontend directory `src/app/(frontend)/(site)/vinprovningar/` → `vinkurser/`. Use `git mv` to preserve history.
- [ ] Rename API directory `src/app/api/vinprovningar/` → `src/app/api/vinkurser/`. `git mv`.
- [ ] Inside the renamed directory, confirm internal `Link` hrefs and `redirect` calls still point at the new path. Update where they don't.
- [ ] Update `src/middleware.ts`:
  - Allowlist: change `/vinprovningar` and `/vinprovningar/*` checks to `/vinkurser` and `/vinkurser/*`
  - Add new 301 redirects (block runs early, before auth gating):
    - `/vinprovningar` → `/vinkurser` (preserve query string)
    - `/vinprovningar/[slug]` → `/vinkurser/[slug]` (preserve query string)
    - `/vinprovningar/[slug]/recension` → `/vinkurser/[slug]/recension` (preserve query)
- [ ] Update every hardcoded `/vinprovningar` URL across the codebase. Reference list:
  - [ ] `src/app/api/payments/create-checkout-session/route.ts:142` — `cancel_url`
  - [ ] `src/lib/email-templates.ts:28, 167` — review + purchase confirmation links
  - [ ] `src/app/sitemap.ts:19, 93` — static + dynamic entries
  - [ ] `src/app/api/revalidate/route.ts:40` — ISR path list
  - [ ] `src/components/breadcrumb-bar.tsx:29` — mapping key
  - [ ] `src/components/mobile-bottom-nav.tsx:39`
  - [ ] `src/components/top-nav-header.tsx:34`
  - [ ] `src/components/ui/footer.tsx:14`
  - [ ] `src/context/SessionContext.tsx` — share URL builder
  - [ ] `src/components/course/SessionView.tsx`
  - [ ] `src/lib/session-emails/claim-your-tasting.ts:34`
  - [ ] `src/components/home/NeuralHeroWithBanner.tsx` — hero CTAs (will be replaced in PR-C; for now just point at `/vinkurser`)
  - [ ] `src/app/(frontend)/(site)/vinkompassen/resultat/[attemptId]/VinprovningCard.tsx:17-19` — URL + PostHog event name `vinkompass_vinkurs_clicked`
- [ ] Final sweep — repo-wide `grep -rn "/vinprovningar" src/` should return zero matches except 301 source paths in middleware.
- [ ] Run `pnpm tsc --noEmit`, `pnpm lint`, `pnpm build`.

**Acceptance criteria:**
- `curl -I https://staging/vinprovningar/some-course` → 301 to `/vinkurser/some-course`
- `curl -I https://staging/vinprovningar/some-course?lesson=abc` → 301 preserves query
- Course detail loads at `/vinkurser/[slug]`. Lesson player, quiz player, review submission all work.
- Purchase flow: cancel button in Stripe Checkout returns to `/vinkurser/{slug}?checkout=cancelled` (no 404 hop)
- Session participant URL `/vinkurser/[slug]?session=...` works
- Sitemap at `/sitemap.xml` shows `/vinkurser/*` URLs
- Mobile + top nav land on `/vinkurser`

**Merge → `main`.** Smoke-test.

---

## Phase PR-A3 — Display copy sweep

**Branch:** `vinkurs-copy` (from `main`).

- [ ] Replace user-facing Swedish "Vinprovning" / "vinprovning" → "Vinkurs" / "vinkurs" across these files (verify each replacement IS about the course product, not the templates product):
  - [ ] `src/app/(frontend)/(site)/page.tsx` (where applicable — heavier rewrite in PR-C)
  - [ ] `src/app/(frontend)/(site)/om-oss/page.tsx`
  - [ ] `src/app/(frontend)/(site)/styleguide/page.tsx`
  - [ ] `src/app/(frontend)/(site)/hjalp/HelpPageClient.tsx` (FAQ entries on lines 49-84)
  - [ ] `src/app/(frontend)/(site)/villkor/page.tsx` (lines 48-165 — terms of service)
  - [ ] `src/components/course/CourseCompletionPage.tsx:134`
  - [ ] `src/components/payment/OrderSummary.tsx:87` ("Vad ingår i vinkursen:")
  - [ ] `src/components/ui/footer.tsx:173` ("Guidade vinkurser hemma")
  - [ ] `src/components/blocks/WineListBlock.tsx:71` (default title)
  - [ ] `src/lib/session-emails/claim-your-tasting.ts` body copy
- [ ] In `src/app/(frontend)/(site)/kontakt/ContactForm.tsx:41-42` — rename the second category from `Vinprovningar` to `Provningsmallar` (this is the templates product, not the courses one).
- [ ] Hero already says "Vinkurser" since `ca59d18` — no change in `NeuralHeroWithBanner.tsx` for this PR.
- [ ] SEO metadata: `src/app/(frontend)/(site)/page.tsx:33` already says "Vinkurser online på svenska" — verify and tweak description if needed.
- [ ] Run `pnpm tsc --noEmit`, `pnpm lint`, `pnpm build`.

**Acceptance criteria:**
- Browse the staging site — `Vinprovning` no longer appears in user-facing copy except where it genuinely refers to a hosted tasting (template flow).
- Contact form dropdown shows `Vinkursfrågor` and `Provningsmallar`.
- Terms of service reads coherently.

**Merge → `main`.**

---

## Phase PR-B — Course gating + wine aggregate

**Branch:** `vinkurs-gating` (from `main`).

- [ ] Create `src/lib/course/wine-aggregate.ts`:
  - `getCourseWineAggregate(course: Vinkurs): { count: number; totalSek: number }`
  - Walks `course.fullDescription` rich-text tree; finds nodes with `blockType === 'wineList'`; sums `wine.price` across all referenced wines; returns `{ count, totalSek }`
  - Returns `{ count: 0, totalSek: 0 }` on missing/malformed `fullDescription`
- [ ] Add a sibling `wine-aggregate.test.ts` (use `tsx` or whatever the project's preferred ad-hoc runner is, OR a one-shot script under `scripts/` for verification — the project has no Jest). Test:
  - Empty `fullDescription` → zero
  - One `wineList` block with 3 wines (prices 100, 150, 250) → `{ count: 3, totalSek: 500 }`
  - Two `wineList` blocks → sums across both
  - Missing `wine.price` on a wine → treats as 0 (don't NaN the total)
- [ ] Update `src/components/blocks/WineListBlock.tsx`:
  - Accept new prop `userHasAccess?: boolean` (defaults to `true` for safety; explicit `false` triggers redaction)
  - When `userHasAccess === false`: render `<WineAggregatePlaceholder count={...} totalSek={...} />` instead of the wine list
- [ ] Create `src/components/course/WineAggregatePlaceholder.tsx`:
  - Props: `count: number`, `totalSek: number`
  - Renders a card: heading "X viner ingår i kursen", subhead "Total kostnad ca Y kr (köps separat)", CTA "Lås upp vinerna med köp"
  - Match the styleguide visual language; use `cn()` and Shadcn primitives
- [ ] Create `src/components/course/VisitorModuleList.tsx`:
  - Props: `modules: Array<{ id, title, itemCount }>`
  - Flat list, each row: module title + "N delar" + lock icon, no click affordance
  - Numbered "Modul 1, 2, 3 ..." prefix
- [ ] Update `src/components/course/CourseOverview.tsx`:
  - Internally branch on `userHasAccess`. Visitor branch renders: intro video → hero metadata → `<WineAggregatePlaceholder>` (using `getCourseWineAggregate(course)`) → `<VisitorModuleList>` (derive `itemCount` from `module.contentItems.length`) → reviews → purchase CTA
  - Purchaser branch: unchanged (intro video + `CourseTableOfContents` + lesson player)
  - **Important:** the visitor branch must NOT mount `CourseTableOfContents`
- [ ] Update `src/app/(frontend)/(site)/vinkurser/[slug]/page.tsx`:
  - Compute `userHasAccess` server-side (existing logic)
  - Pass `userHasAccess` through to `RichTextRenderer` block context so `WineListBlock` can read it
  - Remove the existing branch that surfaces "isFree" lessons to non-purchasers on the visitor path (free items inside modules still exist in data, just not surfaced to anonymous/non-purchasing users)
- [ ] Verify session participants (`?session=` or `vk_participant_token`) still see the full purchaser view — they should, the existing `userHasAccess || isSessionParticipant` logic upstream handles this.
- [ ] Run `pnpm tsc --noEmit`, `pnpm lint`, `pnpm build`.

**Acceptance criteria:**
- Anonymous visit to `/vinkurser/[slug]`: shows intro video, hero metadata, "X viner ingår — ca Y kr", module list with titles + item counts, NO lesson titles, NO clickable TOC, "Köp kursen för Z kr" CTA, reviews
- Logged-in non-purchaser: same view
- Logged-in purchaser: full TOC, lesson player works
- Session participant (anonymous, via token): full view as before
- Existing tests / smoke flows for course purchase, enrollment, progress tracking still pass

**Merge → `main`.** Smoke-test.

---

## Phase PR-D — Template pricing & purchase

**Branch:** `provningsmall-pricing` (from `main`).

### D.1 — Schema & migration

- [ ] Update `src/collections/TastingTemplates.ts`:
  - Add `priceSek` — `number`, required, default `99`, min `0`, admin description "Pris per mall i SEK. 0 = gratis."
  - Add `isFreeTrial` — `checkbox`, default `false`, admin description "Markera denna mall som gratis för alla inloggade användare (gratisprov av funktionen). Endast EN mall bör ha detta."
  - Add `stripeProductId` — `text`, admin: `hidden: true`, `readOnly: true`
  - Add `stripePriceId` — `text`, admin: `hidden: true`, `readOnly: true`
  - Repurpose `accessLevel` enum: replace `members_only` with `paid`. Final options: `free | paid`. Admin description updated.
  - Add `afterChange` hook (mirroring `Vinkurser`'s pattern) that calls `syncTemplateWithStripe()` via `setImmediate` when `priceSek` or `title` changes and `accessLevel === 'paid'`
- [ ] Create `src/collections/TemplateEntitlements.ts`:
  ```ts
  {
    slug: 'template-entitlements',
    labels: { singular: 'Template entitlement', plural: 'Template entitlements' },
    admin: { group: 'Templates', useAsTitle: 'id', defaultColumns: ['user', 'template', 'status', 'acquiredVia', 'acquiredAt'] },
    access: { /* admins read all; users read their own */ },
    fields: [
      { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
      { name: 'template', type: 'relationship', relationTo: 'tasting-templates', required: true, index: true },
      { name: 'status', type: 'select', options: ['active', 'refunded'], required: true, defaultValue: 'active' },
      { name: 'acquiredVia', type: 'select', options: ['purchase', 'subscription', 'free_trial', 'free', 'admin_grant'], required: true },
      { name: 'acquiredAt', type: 'date', required: true, defaultValue: () => new Date() },
      { name: 'payment', type: 'group', fields: [
        { name: 'amount', type: 'number' },
        { name: 'currency', type: 'text', defaultValue: 'SEK' },
        { name: 'transactionId', type: 'text', index: true },
        { name: 'paidAt', type: 'date' },
      ] },
    ],
    indexes: [{ fields: ['user', 'template'], unique: true }],
  }
  ```
- [ ] Register `TemplateEntitlements` in `src/payload.config.ts`
- [ ] Generate migration: `pnpm migrate:create -- "template-pricing-and-entitlements"`
- [ ] Inspect the generated migration: should add 4 columns to `tasting_templates`, alter the `access_level` enum (drop `members_only`, add `paid`; if Payload won't do an in-place enum edit, add a manual `UPDATE tasting_templates SET access_level = 'paid' WHERE access_level = 'members_only';` before the enum alter), create `template_entitlements` table + indexes. Edit migration to include the data-preserving `UPDATE` if needed.
- [ ] Run `pnpm generate:types`. Commit `payload-types.ts`.
- [ ] Run `pnpm generate:importmap`. Commit if changed.

### D.2 — Access control

- [ ] Update `src/lib/access-control.ts`:
  - Add `hasActiveSubscription(payload, userId): Promise<boolean>` — queries `subscriptions` collection for any `status: 'active'` row for the user
  - Add `hasTemplateEntitlement(payload, userId, templateId): Promise<boolean>` — queries `template-entitlements` for `(user=userId, template=templateId, status='active')`
  - Add `canUseTemplate(payload, user, template): Promise<boolean>`:
    ```ts
    if (template.accessLevel === 'free') return true
    if (template.isFreeTrial && !!user) return true
    if (!user) return false
    if (await hasActiveSubscription(payload, user.id)) return true
    if (await hasTemplateEntitlement(payload, user.id, template.id)) return true
    return false
    ```
  - Export all three functions

### D.3 — Stripe sync

- [ ] Update `src/lib/stripe-products.ts`:
  - Add `syncTemplateWithStripe(payload, templateId)` — mirrors `syncCourseWithStripe`. Creates/updates Stripe Product; if `priceSek` changes, archives old Price and creates a new one. Stores `stripeProductId` + `stripePriceId` back. Stripe Product `metadata.productKind = 'template'`, `metadata.templateId = template.id`.
  - Add `syncAllTemplatesWithStripe(payload)` — finds all `tasting-templates` with `publishedStatus = 'published'` and `accessLevel = 'paid'`; calls `syncTemplateWithStripe` for each.
- [ ] Create `scripts/sync-templates-with-stripe.ts` — wrapper that calls `syncAllTemplatesWithStripe`
- [ ] Add `"sync-templates": "tsx scripts/sync-templates-with-stripe.ts"` to `package.json`'s `scripts`

### D.4 — Purchase flow

- [ ] Create `src/app/(frontend)/(site)/provningsmallar/[slug]/kop/page.tsx`:
  - Server component. Loads template by slug. If not logged in: redirect to `/logga-in?next=/provningsmallar/[slug]/kop`. If `canUseTemplate(user, template)` is already true: redirect to `/provningsmallar/[slug]` (user already has access).
  - Otherwise: render a thin confirmation page ("Köp Provningsmall: [title] för 99 kr") with a button that POSTs to `/api/payments/template-checkout` and redirects to Stripe Checkout.
- [ ] Create `src/app/api/payments/template-checkout/route.ts`:
  - POST handler. Auth-gated. Body: `{ templateId: string }`.
  - Verifies template `accessLevel === 'paid'` and `priceSek > 0`.
  - Creates a Stripe Checkout Session: `mode: 'payment'`, line items `[{ price: template.stripePriceId, quantity: 1 }]`, `metadata: { productKind: 'template', templateId, userId }`, `success_url: /provningsmallar/[slug]?purchase=success`, `cancel_url: /provningsmallar/[slug]?purchase=cancelled`
  - Returns `{ url }`.
- [ ] Update `src/app/api/webhooks/stripe/route.ts`:
  - In the `payment_intent.succeeded` handler, branch on `session.metadata.productKind`:
    - `'course'` (existing) → create `Enrollments` row as today
    - `'template'` → create `TemplateEntitlements` row with `acquiredVia: 'purchase'`, `payment: { amount, currency, transactionId, paidAt }`. Idempotent on `(user, template)` unique index.
  - Add `charge.refunded` handler:
    - Lookup payment intent → find `Enrollments` or `TemplateEntitlements` row by `transactionId`; flip `status` to `'refunded'`.
- [ ] Update `src/components/tasting-template/UseTemplateButton.tsx`:
  - Before POSTing to `/api/tasting-plans/from-template/[templateId]`, the surrounding page already knows `canUseTemplate` (from server). The button only renders when access is granted (or when `isFreeTrial` for logged-in users). For not-authorized state, render "Köp för 99 kr" linking to `/provningsmallar/[slug]/kop`. Don't reach the from-template API at all in the not-authorized state.
- [ ] Update `src/app/api/tasting-plans/from-template/[templateId]/route.ts`:
  - Server-side `canUseTemplate(user, template)` check before cloning. Return 403 if false. Logs the rejection with `loggerFor`. Belt-and-suspenders alongside the UI gate.
  - For `isFreeTrial` + first clone, also create a `TemplateEntitlements` row with `acquiredVia: 'free_trial'` (idempotent on unique index)

### D.5 — Visitor UI

- [ ] Update `src/components/tasting-template/LockedTemplateDetailView.tsx`:
  - Replace "Bli medlem" CTA copy with:
    - Anonymous: "**Köp för 99 kr**" linking to `/logga-in?next=/provningsmallar/[slug]/kop` + secondary "Logga in" linking to `/logga-in?next=/provningsmallar/[slug]`
    - Logged-in non-purchaser: "**Köp för 99 kr**" linking directly to `/provningsmallar/[slug]/kop`
  - Existing aggregate (wine count + total price) stays
- [ ] Update `src/components/tasting-template/TemplateDetailView.tsx`:
  - If `template.isFreeTrial === true`, show a small "Gratisprov" badge near the title
- [ ] Update `src/app/(frontend)/(site)/provningsmallar/[slug]/page.tsx`:
  - Replace `accessLevel === 'members_only' && !isMember` branch with `await canUseTemplate(payload, user, template)` → branches to `TemplateDetailView` or `LockedTemplateDetailView`
- [ ] Update `src/app/(frontend)/(site)/provningsmallar/page.tsx` (listing):
  - Drop `accessLevel` filter chips (or repurpose to `free | paid`)
  - Each card shows price (or "Gratisprov" for free trial / "Gratis" for `free`)

### D.6 — Backfill

- [ ] Create `scripts/backfill-template-entitlements.ts`:
  - Find every `tasting-plans` row where `derivedFromTemplate` is set
  - For each unique `(user, template)` pair, create a `TemplateEntitlements` row if missing: `status: 'active'`, `acquiredVia: 'admin_grant'`, `acquiredAt: tastingPlan.createdAt`. Idempotent on unique index.
  - Log count of created entitlements
- [ ] Run on staging first; verify entitlement count matches expected. Then run on prod (after the release lands).

### D.7 — Verification

- [ ] Smoke test on staging end-to-end:
  - Anonymous visit `/provningsmallar/[slug]` (paid template) → locked view with "Köp för 99 kr" CTA
  - Logged-in visit (no entitlement, not subscriber) → locked view with "Köp för 99 kr" directly to `/kop`
  - Click "Köp" → Stripe Checkout → use test card → success URL lands on `/provningsmallar/[slug]?purchase=success` → page now shows full template + "Använd mallen"
  - Subscriber account → full template view immediately, no purchase
  - `isFreeTrial` template + logged-in user → full template view + "Gratisprov" badge + "Använd mallen" works (first use creates `acquiredVia: 'free_trial'` entitlement)
  - Run `pnpm sync-templates` once on staging — verify Stripe dashboard shows one Product per published paid template
  - Refund test purchase via Stripe dashboard → check `TemplateEntitlements.status` flips to `'refunded'`, page reverts to locked view
- [ ] Run `pnpm tsc --noEmit`, `pnpm lint`, `pnpm build`.

**Acceptance criteria:** All scenarios above pass on staging.

**Merge → `main`.**

---

## Phase PR-C — Homepage IA

**Branch:** `homepage-ia` (from `main`).

- [ ] Update `src/components/home/NeuralHeroWithBanner.tsx`:
  - Replace single `Kom igång` CTA with two:
    - Primary: "**Se vinkurser**" → `/vinkurser`
    - Secondary: "**Bläddra i provningsmallar**" → `/provningsmallar`
  - Keep the gradient/visual treatment
  - Description: tweak to something like "Lär dig vin på riktigt — välj mellan färdiga videokurser eller egna provningsupplägg du själv är värd för."
- [ ] Create `src/components/home/OfferingsComparison.tsx`:
  - Two-card grid (responsive: stacked on mobile, side-by-side from `md:`)
  - Card content:

    | | Vinkurs | Provningsmall |
    |---|---|---|
    | Eyebrow | Videokurs | Färdigt upplägg |
    | Headline | Lär dig vin i din egen takt | Var värd för en provning |
    | För dig som | …vill lära dig grundligt, gärna med vänner som gäster | …vill samla folk och guida en avslappnad provning |
    | Ingår (bullets) | Videolektioner · Quiz · Vinval · Värdguide om du bjuder in | Tema · Vinval · Värdmanus · Smakprotokoll |
    | Pris | Från **499 kr** · engångsbetalning | **99 kr** per mall · en gratis när du loggar in |
    | CTA | Se kurserna → `/vinkurser` | Utforska biblioteket → `/provningsmallar` |
  - Match `/styleguide` visual language; subtle brand accent
- [ ] Create `src/components/home/VinkurserFeature.tsx`:
  - Mirror of `ProvningsmallarFeature.tsx` (use it as a template)
  - Eyebrow: "Kurser"
  - Heading: "Färdiga vinkurser på några klick"
  - Three benefit chips
  - Grid of 3 top featured vinkurser cards (reuse `FeaturedCourseCard` or a smaller variant)
  - CTA: "Se alla kurser" → `/vinkurser`
- [ ] Update `src/app/(frontend)/(site)/page.tsx`:
  - Fetch top-3 featured/published vinkurser alongside existing template fetch
  - New render order (delete `{false && (…)}` blocks at the same time):
    1. `NeuralHeroWithBanner`
    2. `OfferingsComparison`
    3. `VinkurserFeature` (top-3 courses)
    4. `ProvningsmallarFeature` (top-3 templates — existing)
    5. Articles (existing)
    6. About/Vision (existing)
    7. Newsletter (existing)
    8. Final CTA (existing)
- [ ] Run `pnpm tsc --noEmit`, `pnpm lint`, `pnpm build`.

**Acceptance criteria:**
- Homepage renders in the new order
- Hero shows both CTAs and they route correctly
- `OfferingsComparison` shows both products with clear "this vs that" framing
- Both `VinkurserFeature` and `ProvningsmallarFeature` show 3 cards each, with proper CTAs
- The hidden `{false && (…)}` blocks are gone
- Mobile layout passes a quick visual check (stacked, no overflow)

**Merge → `main`.**

---

## Phase Final — Admin actions on staging, then production cut

### Admin actions (on staging, then prod — content-level, not code)

- [ ] In Payload admin on staging:
  - Edit the flagship Vinkurs course → change `price` from `199` → `499` → save
  - Watch logs / Stripe dashboard for the `afterChange` sync; verify new `stripePriceId` is created and stored on the course; verify old Price is archived in Stripe
  - For each published template, set `priceSek = 99` if it isn't already (the migration backfills `members_only` → `paid` + 99 SEK, so most are done)
  - Pick the designated "free trial" template (Fredrik decides which one) → set `isFreeTrial = true` → save
- [ ] Run `pnpm sync-templates` against staging once to seed Stripe Products for all paid templates
- [ ] End-to-end test once more on staging:
  - Anon visitor → `/vinkurser/flagship-slug` → sees `499 kr` price → buys with Stripe test card → enrollment created → full course access
  - Anon visitor → `/provningsmallar/some-paid-slug` → sees locked view + `99 kr` CTA → buys with test card → entitlement created → full template access → can "Använd mallen"
  - Logged-in user → free-trial template → no purchase prompt → can use immediately

### Production cut

- [ ] Confirm staging is green across all PR-A1 → PR-C smoke tests
- [ ] On `production` branch, merge the diff from `main` per the deployment convention. Choose between:
  - **Option α (recommended):** Cherry-pick / curated `release:` commit that bundles A1+A2+A3+B+D+C as one release commit on production, message: `release: product split — vinkurser rename, harder paywall, homepage IA, template pricing`
  - **Option β:** Standard merge from main into production, but craft a release tag + changelog entry
- [ ] Push `production`. Watch CI/CD; verify migrations run cleanly via `migrate.yml` (per the deployment memory).
- [ ] On production:
  - Re-do the admin actions above against production data:
    - Bump flagship course price 199 → 499 (sync to Stripe)
    - Set `isFreeTrial` on the chosen template
  - Run `pnpm sync-templates` on production
  - Run `scripts/backfill-template-entitlements.ts` on production to grant existing template clones
- [ ] Verify production:
  - `curl -I https://vinakademin.se/vinprovningar/flagship` → 301 to `/vinkurser/flagship`
  - Open the flagship course in incognito → 499 kr price visible
  - Pick a paid template in incognito → locked view with `99 kr` CTA
  - Sitemap regenerated with `/vinkurser/*` URLs
- [ ] Resubmit sitemap to Google Search Console (preserve link equity from the redirected paths)

---

## Rollback notes

**If PR-A1 (slug rename) breaks something subtle:** revert the merge commit; the `dbName` override means the table is intact. No data loss.

**If PR-A2 (URL move) breaks an inbound link path you didn't anticipate:** add another 301 rule in middleware; redirects are append-only.

**If PR-D Stripe webhook handler creates wrong entitlement rows:** the unique index on `(user, template)` prevents duplicates. Fix the webhook code and re-deploy. To revoke an over-granted entitlement, `UPDATE template_entitlements SET status='refunded' WHERE id=...`.

**If price bump (199→499) needs to be undone:** edit the course's `price` field back to 199 in admin; afterChange hook will sync. Stripe Price IDs are immutable but already-archived old Prices remain usable for in-flight checkouts.

**Hard rollback (worst case — full revert of the spec):** revert the `release:` commit on production. Migrations are forward-only; the new `template_entitlements` table can stay (unused). The slug→table override means the courses table is untouched. The only manual cleanup is the new template columns on `tasting_templates` — leave them; they're additive and ignored by old code.
