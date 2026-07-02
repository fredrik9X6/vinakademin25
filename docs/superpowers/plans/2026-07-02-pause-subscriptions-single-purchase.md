# Pause Subscriptions — Single-Purchase Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove every user-facing path to a subscription so paid tasting templates are unlocked only by one-time purchase, while keeping all subscription plumbing (DB schema, collections, webhooks) intact for later re-enable.

**Architecture:** Pure code-level pause: the access predicate drops its subscription branch, the subscription checkout API returns 410, subscription pages become redirects, and CTAs/badges are rewritten for single purchase. No Payload collection changes, therefore **no migration**. Spec: `docs/superpowers/specs/2026-07-02-pause-subscriptions-single-purchase-design.md`.

**Tech Stack:** Next.js 15 App Router (React 19), Payload CMS 3.33 (pinned exact), TypeScript, Tailwind/Shadcn. Package manager is **pnpm**.

## Global Constraints

- **No schema changes.** Do not touch `src/collections/*`, `src/payload-types.ts`, or `src/migrations/*`. No `pnpm migrate:create` needed because no collection changes are made.
- **Keep the plumbing.** Do NOT delete or modify: `src/collections/Subscriptions.ts`, `src/lib/stripe-products.ts`, `src/app/api/webhooks/stripe/route.ts`, `src/lib/send-welcome-premium-email.ts`, `src/lib/session-emails/welcome-premium.ts`, the non-checkout `/api/subscriptions/*` routes (`portal`, `[id]`, `user/[userId]`, `user/[userId]/cancel`, `user/[userId]/reactivate`), or `scripts/setup-stripe-premium.ts`.
- **Swedish copy** for all user-facing text.
- **No test suite exists** in this repo (per CLAUDE.md). Verification is grep assertions per task plus `pnpm build` at the end. Do not add a test framework.
- All `@payloadcms/*` versions stay pinned at exact `3.33.0` — do not touch `package.json`.
- Commit after every task with a conventional-commit message.

---

### Task 1: Remove the subscription branch from template access control

**Files:**
- Modify: `src/lib/access-control.ts:418-507`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `canUseTemplate(req, user, template)` keeps its exact existing signature and export; only its body loses the `hasActiveSubscription` call. `hasActiveSubscription` stays exported (now uncalled) so re-enable is a one-line revert. Callers (`/provningsmallar/[slug]/page.tsx`, `/api/tasting-plans/from-template/[templateId]`) need no changes.

- [ ] **Step 1: Update the section comment and `canUseTemplate`**

In `src/lib/access-control.ts`, replace the section comment block (lines 418–425):

```ts
// ---------------------------------------------------------------------------
// Template entitlements (provningsmallar)
//
// Per spec 2026-06-13 (PR-D): templates move from members_only to per-template
// purchase (99 SEK each, one designated isFreeTrial). Active subscribers
// unlock all paid templates; the rest of users pay per template and the
// entitlement is recorded in TemplateEntitlements.
// ---------------------------------------------------------------------------
```

with:

```ts
// ---------------------------------------------------------------------------
// Template entitlements (provningsmallar)
//
// Per spec 2026-06-13 (PR-D): templates are sold per-template (99 SEK each,
// one designated isFreeTrial) and the entitlement is recorded in
// TemplateEntitlements.
//
// PAUSED 2026-07-02: subscriptions are on hold — hasActiveSubscription below
// is intentionally no longer consulted by canUseTemplate. See
// docs/superpowers/specs/2026-07-02-pause-subscriptions-single-purchase-design.md
// ---------------------------------------------------------------------------
```

Replace the `hasActiveSubscription` doc comment (lines 427–430):

```ts
/**
 * Whether the user has an active subscription. Used as a short-circuit unlock
 * across all paid templates (per Q-3 resolution).
 */
```

with:

```ts
/**
 * Whether the user has an active subscription. PAUSED: kept for re-enable but
 * no longer consulted by canUseTemplate (subscriptions are on hold).
 */
```

Replace the `canUseTemplate` doc comment and body (lines 482–507):

```ts
/**
 * Composite predicate. Returns true if the user should see the full template
 * (wines, host script, "Använd mallen"):
 *   - role === 'admin'                         (staff bypass — no purchase needed)
 *   - accessLevel === 'free'                   (always free)
 *   - isFreeTrial && user logged in            (try-it-free unlock)
 *   - active subscription                      (subscribers get everything)
 *   - active TemplateEntitlements row          (one-time purchase)
 */
export const canUseTemplate = async (
  req: PayloadRequest,
  user: { id: string | number; role?: string | null } | null | undefined,
  template: {
    id: string | number
    accessLevel?: 'free' | 'paid' | string | null
    isFreeTrial?: boolean | null
  },
): Promise<boolean> => {
  if (user?.role === 'admin') return true
  if (template.accessLevel === 'free') return true
  if (template.isFreeTrial && user) return true
  if (!user) return false
  if (await hasActiveSubscription(req, String(user.id))) return true
  if (await hasTemplateEntitlement(req, String(user.id), String(template.id))) return true
  return false
}
```

with:

```ts
/**
 * Composite predicate. Returns true if the user should see the full template
 * (wines, host script, "Använd mallen"):
 *   - role === 'admin'                         (staff bypass — no purchase needed)
 *   - accessLevel === 'free'                   (always free)
 *   - isFreeTrial && user logged in            (try-it-free unlock)
 *   - active TemplateEntitlements row          (one-time purchase)
 *
 * NOTE: the subscription short-circuit is paused (2026-07-02). To re-enable,
 * reinsert `if (await hasActiveSubscription(req, String(user.id))) return true`
 * before the entitlement check.
 */
export const canUseTemplate = async (
  req: PayloadRequest,
  user: { id: string | number; role?: string | null } | null | undefined,
  template: {
    id: string | number
    accessLevel?: 'free' | 'paid' | string | null
    isFreeTrial?: boolean | null
  },
): Promise<boolean> => {
  if (user?.role === 'admin') return true
  if (template.accessLevel === 'free') return true
  if (template.isFreeTrial && user) return true
  if (!user) return false
  if (await hasTemplateEntitlement(req, String(user.id), String(template.id))) return true
  return false
}
```

- [ ] **Step 2: Verify the branch is gone and the helper remains**

Run:

```bash
grep -n "hasActiveSubscription" src/lib/access-control.ts
```

Expected: matches only in the paused comment and the `export const hasActiveSubscription` definition — **no match inside `canUseTemplate`**.

- [ ] **Step 3: Commit**

```bash
git add src/lib/access-control.ts
git commit -m "feat(subscriptions): pause subscription unlock in canUseTemplate

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Subscription checkout API returns 410 Gone

**Files:**
- Modify: `src/app/api/subscriptions/checkout/route.ts` (full rewrite)

**Interfaces:**
- Consumes: nothing.
- Produces: `POST /api/subscriptions/checkout` → HTTP 410 with JSON `{ error: 'subscriptions_paused', message: 'Medlemskap är pausat. Provningsmallar köps som engångsköp.' }`. The old client (`BliMedlemForm`) is deleted in Task 5, so nothing calls this in-app; the 410 covers stray/bookmarked clients.

- [ ] **Step 1: Replace the entire file content**

Replace **all** of `src/app/api/subscriptions/checkout/route.ts` with:

```ts
import { NextResponse } from 'next/server'

/**
 * POST /api/subscriptions/checkout
 *
 * PAUSED (2026-07-02): subscriptions are on hold — tasting templates are sold
 * as one-time purchases only. This endpoint was the sole entry point for
 * creating new Stripe subscriptions; it now returns 410 Gone. Restore the
 * previous implementation from git history to re-enable. See
 * docs/superpowers/specs/2026-07-02-pause-subscriptions-single-purchase-design.md
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'subscriptions_paused',
      message: 'Medlemskap är pausat. Provningsmallar köps som engångsköp.',
    },
    { status: 410 },
  )
}
```

- [ ] **Step 2: Verify no Stripe imports remain in the file**

Run:

```bash
grep -cn "stripe\|getUser\|payload" src/app/api/subscriptions/checkout/route.ts || echo CLEAN
```

Expected: `CLEAN` (zero matches — the file no longer imports Stripe, auth, or Payload).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/subscriptions/checkout/route.ts
git commit -m "feat(subscriptions): subscription checkout returns 410 while paused

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: LockedTemplateDetailView — single purchase CTA

**Files:**
- Modify: `src/components/tasting-template/LockedTemplateDetailView.tsx`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: component props (`LockedTemplateDetailViewProps`) unchanged — `template`, `preview`, `priceSek`, `isAuthenticated`. Only JSX/copy changes; the caller `/provningsmallar/[slug]/page.tsx` needs no edits.

- [ ] **Step 1: Remove the membership route constant**

Delete lines 52–55 (the comment and `memberHref`):

```ts
  // Active subscribers unlock every paid template (canUseTemplate handles
  // this), so the membership CTA needs to be reachable from here. Route is
  // /bli-medlem; anon users land on the page itself which then prompts login.
  const memberHref = '/bli-medlem'
```

(Nothing replaces them; `loginHref` on line 51 remains the last constant.)

- [ ] **Step 2: Rewrite the CTA card (lines 112–146)**

Replace:

```tsx
        <Card className="border-brand-400/40 bg-brand-400/5">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-brand-400/15 text-brand-400 flex items-center justify-center">
                <Lock className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  Köp denna mall, eller bli medlem och lås upp hela biblioteket
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Engångsköp för {formattedTemplatePrice} — eller lås upp alla mallar med ett medlemskap.
                </p>
              </div>
            </div>
            <div className="flex-shrink-0 flex flex-col gap-2 sm:items-end">
              <div className="flex flex-col sm:flex-row gap-2">
                <Button asChild size="sm">
                  <Link href={buyHref}>Köp för {formattedTemplatePrice}</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={memberHref}>Bli medlem</Link>
                </Button>
              </div>
              {!isAuthenticated && (
                <Link
                  href={loginHref}
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline text-center sm:text-right"
                >
                  Redan medlem? Logga in
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
```

with:

```tsx
        <Card className="border-brand-400/40 bg-brand-400/5">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-brand-400/15 text-brand-400 flex items-center justify-center">
                <Lock className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  Köp denna mall och lås upp hela provningen
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Engångsköp för {formattedTemplatePrice} — du får tillgång direkt.
                </p>
              </div>
            </div>
            <div className="flex-shrink-0 flex flex-col gap-2 sm:items-end">
              <Button asChild size="sm">
                <Link href={buyHref}>Köp för {formattedTemplatePrice}</Link>
              </Button>
              {!isAuthenticated && (
                <Link
                  href={loginHref}
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline text-center sm:text-right"
                >
                  Redan köpt? Logga in
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
```

- [ ] **Step 3: Rewrite the sticky aside (lines 183–201)**

Replace:

```tsx
      <aside className="md:sticky md:top-20 md:self-start space-y-2">
        <Button asChild className="w-full">
          <Link href={buyHref}>Köp för {formattedTemplatePrice}</Link>
        </Button>
        <Button asChild className="w-full" variant="outline">
          <Link href={memberHref}>Bli medlem &amp; lås upp alla mallar</Link>
        </Button>
        {!isAuthenticated && (
          <Link
            href={loginHref}
            className="block text-center text-xs text-muted-foreground hover:text-foreground hover:underline pt-1"
          >
            Redan medlem? Logga in
          </Link>
        )}
        <p className="text-xs text-muted-foreground text-center">
          Engångsbetalning för denna mall. Medlemskap låser upp hela biblioteket.
        </p>
      </aside>
```

with:

```tsx
      <aside className="md:sticky md:top-20 md:self-start space-y-2">
        <Button asChild className="w-full">
          <Link href={buyHref}>Köp för {formattedTemplatePrice}</Link>
        </Button>
        {!isAuthenticated && (
          <Link
            href={loginHref}
            className="block text-center text-xs text-muted-foreground hover:text-foreground hover:underline pt-1"
          >
            Redan köpt? Logga in
          </Link>
        )}
        <p className="text-xs text-muted-foreground text-center">
          Engångsbetalning för denna mall — inga abonnemang.
        </p>
      </aside>
```

- [ ] **Step 4: Verify no membership references remain**

Run:

```bash
grep -n "medlem\|Medlem\|memberHref" src/components/tasting-template/LockedTemplateDetailView.tsx || echo CLEAN
```

Expected: `CLEAN`.

- [ ] **Step 5: Commit**

```bash
git add src/components/tasting-template/LockedTemplateDetailView.tsx
git commit -m "feat(provning): locked template view sells single purchase only

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: TemplateCard — price badge instead of "Medlem"

**Files:**
- Modify: `src/components/tasting-template/TemplateCard.tsx`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `TemplateCardProps` unchanged (`template: TastingTemplate`, optional `href`). Paid templates show a badge with the one-time price from `template.priceSek` (falls back to the label `Köp` if the field is missing on a partial object); free templates keep the green `Fri` badge.

- [ ] **Step 1: Replace the badge logic**

In `src/components/tasting-template/TemplateCard.tsx`, replace lines 22–23:

```tsx
  const isMembersOnly =
    (template as { accessLevel?: string }).accessLevel === 'paid'
```

with:

```tsx
  const isPaid = (template as { accessLevel?: string }).accessLevel === 'paid'
  const priceSek = (template as { priceSek?: number | null }).priceSek ?? null
  const paidBadgeLabel =
    priceSek != null ? `${new Intl.NumberFormat('sv-SE').format(priceSek)} kr` : 'Köp'
```

and replace the badge `<span>` (lines 37–52):

```tsx
          <span
            className={
              isMembersOnly
                ? 'absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-brand-400 text-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider shadow-sm'
                : 'absolute top-2 right-2 inline-flex items-center rounded-full bg-emerald-500 text-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider shadow-sm'
            }
          >
            {isMembersOnly ? (
              <>
                <Lock className="h-2.5 w-2.5" />
                Medlem
              </>
            ) : (
              'Fri'
            )}
          </span>
```

with:

```tsx
          <span
            className={
              isPaid
                ? 'absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-brand-400 text-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider shadow-sm'
                : 'absolute top-2 right-2 inline-flex items-center rounded-full bg-emerald-500 text-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider shadow-sm'
            }
          >
            {isPaid ? (
              <>
                <Lock className="h-2.5 w-2.5" />
                {paidBadgeLabel}
              </>
            ) : (
              'Fri'
            )}
          </span>
```

- [ ] **Step 2: Verify**

Run:

```bash
grep -n "Medlem\|isMembersOnly" src/components/tasting-template/TemplateCard.tsx || echo CLEAN
```

Expected: `CLEAN`.

- [ ] **Step 3: Commit**

```bash
git add src/components/tasting-template/TemplateCard.tsx
git commit -m "feat(provning): template cards show one-time price instead of member badge

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Retire subscription pages — redirects, deletions, breadcrumb, middleware

**Files:**
- Modify: `src/app/(frontend)/(site)/bli-medlem/page.tsx` (full rewrite → redirect)
- Delete: `src/app/(frontend)/(site)/bli-medlem/BliMedlemForm.tsx`
- Modify: `src/app/(frontend)/(site)/prenumeration/page.tsx` (full rewrite → redirect)
- Delete: `src/app/(frontend)/(site)/prenumeration/PortalLaunchButton.tsx`
- Delete: `src/app/(frontend)/(site)/prenumeration/OnboardingChecklist.tsx`
- Delete: `src/app/(frontend)/(site)/prenumeration/WelcomeBannerTracker.tsx`
- Delete: `src/components/profile/SubscriptionManagementForm.tsx` (already has zero importers)
- Modify: `src/components/breadcrumb-bar.tsx:44-45`
- Modify: `src/middleware.ts:15-17`

**Interfaces:**
- Consumes: Task 2 must land first only in spirit (the form that POSTed to the checkout endpoint is deleted here); there is no compile-time dependency.
- Produces: `GET /bli-medlem` → 307 redirect to `/provningsmallar`; `GET /prenumeration` → 307 redirect to `/profil` (anon visitors then hit the existing `/profil` middleware guard → login).

- [ ] **Step 1: Replace `/bli-medlem` page with a redirect**

Replace **all** of `src/app/(frontend)/(site)/bli-medlem/page.tsx` with:

```tsx
import { redirect } from 'next/navigation'

/**
 * PAUSED (2026-07-02): membership signup is on hold — tasting templates are
 * sold as one-time purchases only. Restore this page (and BliMedlemForm) from
 * git history to re-enable. See
 * docs/superpowers/specs/2026-07-02-pause-subscriptions-single-purchase-design.md
 */
export default function BliMedlemPage() {
  redirect('/provningsmallar')
}
```

- [ ] **Step 2: Replace `/prenumeration` page with a redirect**

Replace **all** of `src/app/(frontend)/(site)/prenumeration/page.tsx` with:

```tsx
import { redirect } from 'next/navigation'

/**
 * PAUSED (2026-07-02): subscriptions are on hold — there is nothing to manage
 * here. Restore this page (and its client components) from git history to
 * re-enable. See
 * docs/superpowers/specs/2026-07-02-pause-subscriptions-single-purchase-design.md
 */
export default function PrenumerationPage() {
  redirect('/profil')
}
```

- [ ] **Step 3: Delete the dead components**

```bash
git rm "src/app/(frontend)/(site)/bli-medlem/BliMedlemForm.tsx" \
       "src/app/(frontend)/(site)/prenumeration/PortalLaunchButton.tsx" \
       "src/app/(frontend)/(site)/prenumeration/OnboardingChecklist.tsx" \
       "src/app/(frontend)/(site)/prenumeration/WelcomeBannerTracker.tsx" \
       "src/components/profile/SubscriptionManagementForm.tsx"
```

- [ ] **Step 4: Remove the breadcrumb labels**

In `src/components/breadcrumb-bar.tsx`, delete lines 44–45:

```ts
  'bli-medlem': 'Bli medlem',
  prenumeration: 'Prenumeration',
```

- [ ] **Step 5: Remove the `/prenumeration` protected path from middleware**

In `src/middleware.ts`, delete the entry (lines 15–17 of the `protectedPaths` array):

```ts
  {
    path: '/prenumeration', // Assuming Swedish name for /subscription
    roles: ['admin', 'instructor', 'subscriber', 'user'],
  },
```

- [ ] **Step 6: Verify no dangling imports of the deleted components**

Run:

```bash
grep -rn "BliMedlemForm\|PortalLaunchButton\|OnboardingChecklist\|WelcomeBannerTracker\|SubscriptionManagementForm\|viewerIsMember" src --include="*.ts" --include="*.tsx" | grep -v "src/lib/membership.ts" || echo CLEAN
```

Expected: `CLEAN` (the only remaining `viewerIsMember` reference is its definition in `src/lib/membership.ts`, which stays as paused plumbing).

- [ ] **Step 7: Commit**

```bash
git add -A "src/app/(frontend)/(site)/bli-medlem" "src/app/(frontend)/(site)/prenumeration" src/components/breadcrumb-bar.tsx src/middleware.ts src/components/profile
git commit -m "feat(subscriptions): retire membership pages — bli-medlem and prenumeration redirect

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Full verification sweep

**Files:**
- No new modifications expected; fixes only if the sweep finds stragglers.

**Interfaces:**
- Consumes: all previous tasks committed.
- Produces: a green `pnpm build` and a documented manual check.

- [ ] **Step 1: Repo-wide reference sweep**

Run:

```bash
grep -rn "bli-medlem\|/prenumeration\|Bli medlem" src --include="*.ts" --include="*.tsx" \
  | grep -vE "src/(lib/(stripe|send-welcome|session-emails)|app/api/(webhooks|subscriptions)|collections)" \
  | grep -vE "site./(bli-medlem|prenumeration)/page.tsx"
```

Expected: **no output.** Allowed leftovers are only inside paused plumbing (webhooks, email templates, stripe libs, non-checkout subscription routes) and the two redirect pages' comments. If anything else appears (e.g. a nav link missed during design), remove/replace it the same way Tasks 3–5 did, and amend into a small fix commit.

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: passes with no new errors (pre-existing warnings are fine).

- [ ] **Step 3: Production build**

Run: `pnpm build`
Expected: completes successfully — this catches any dangling import of the deleted components.

- [ ] **Step 4: Manual smoke test on dev server**

Run `pnpm dev`, then verify:

1. `/bli-medlem` → lands on `/provningsmallar`.
2. `/prenumeration` → lands on `/profil` (or the login page when logged out).
3. A paid template's detail page (logged out) shows exactly one CTA style: "Köp för X kr" — no "Bli medlem" anywhere.
4. `/provningsmallar` cards show a price badge (e.g. "99 kr") on paid templates and "Fri" on free ones.
5. `curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/subscriptions/checkout` prints `410`.
6. From a paid template, "Köp för X kr" still reaches the `/kop` purchase page (logged in) — the purchase flow is untouched.

- [ ] **Step 5: Commit any sweep fixes**

Only if Step 1 or 3 required changes:

```bash
git add -A
git commit -m "fix(subscriptions): sweep remaining membership references

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
