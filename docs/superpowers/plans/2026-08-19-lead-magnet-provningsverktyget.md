# Provningsverktyget Lead Magnet + Vinkvällen Offer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the entire tasting system (templates + builder + live hosting) free and publicly readable so it works as a lead magnet, add a `/provningsverktyget` landing page that converts visitors into accounts + newsletter subscribers, and reposition the 499 kr course as "Vinkvällen" — an evening with friends rather than a course.

**Architecture:** The paywall collapses to a single predicate change in `canUseTemplate()`, with the branch logic extracted into a pure, unit-tested module. No new gating code is written: the signup gate already exists on the three actions that matter (clone-from-template, builder, hosting). Stripe/entitlement machinery is left dormant rather than deleted so the change is reversible in one commit. Everything else is copy, one new page, and nav wiring.

**Tech Stack:** Next.js 15 App Router (React 19), Payload CMS 3.33, Postgres (migration-driven), Tailwind, Shadcn UI, `node:test` via `tsx` for pure-module unit tests.

**Spec:** `docs/superpowers/specs/2026-08-19-lead-magnet-provningsverktyget-design.md`

## Global Constraints

- **Package manager is pnpm.** Never `npm`/`yarn`.
- **Payload v3 APIs only.** Import `Access` / `PayloadRequest` from `payload`, never `payload/types`. All `@payloadcms/*` packages are pinned to exact `3.33.0` — never widen to `^`/`~`.
- **Prod is migration-driven.** Any collection or enum change requires `pnpm migrate:create -- "<name>"` committed alongside. Migrations live in `src/migrations/`, indexed in `src/migrations/index.ts`.
- **Run `pnpm generate:types` after any collection change.** Never hand-edit `src/payload-types.ts`.
- **All user-facing copy is Swedish.** Route slugs are Swedish.
- **Do NOT touch** the course slug `ldgmgv`, its price `499`, or its Stripe product/price IDs.
- **Do NOT delete** `TemplateEntitlements`, `priceSek`, `isFreeTrial`, `syncTemplateWithStripe`, or the Stripe webhook template branches. They go dormant, not away.
- **Price anchor copy must read "500–1000 kr per person"** (confirmed by Fredrik 2026-08-19). Do not invent per-component "värde" figures — the components are free on the same site, so such claims would be false.
- **No fake scarcity.** No countdown timers, no invented seat limits.
- **Guarantee copy:** unconditional, 30 days, money back.
- Verification commands: `pnpm lint` and `pnpm build` must pass before any commit that touches app code.

---

### Task 1: Extract the access decision into a pure, tested module

The current predicate mixes an async entitlement lookup with pure branch logic, which makes it untestable. Extract the branches; keep the async wrapper's signature identical so all four call sites are untouched.

**Files:**
- Create: `src/lib/template-access.ts`
- Create: `src/lib/template-access.test.ts`
- Modify: `src/lib/access-control.ts:483-513` (the `canUseTemplate` docblock + body)
- Modify: `package.json` (add `test:access` script)
- Modify: `CLAUDE.md` (the stale "No test suite is configured" line)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `resolveTemplateAccess(input: TemplateAccessInput): boolean` and `interface TemplateAccessInput { role?: string | null; accessLevel?: string | null; isAuthenticated: boolean }`, both exported from `src/lib/template-access.ts`. Task 4 does not import these; only `access-control.ts` does.

- [ ] **Step 1: Write the failing test**

Create `src/lib/template-access.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveTemplateAccess } from './template-access'

test('admins see every template, gated or not', () => {
  assert.equal(
    resolveTemplateAccess({ role: 'admin', accessLevel: 'paid', isAuthenticated: true }),
    true,
  )
})

test('a public template is readable by an anonymous visitor', () => {
  assert.equal(
    resolveTemplateAccess({ role: null, accessLevel: 'free', isAuthenticated: false }),
    true,
  )
})

test('a gated template is hidden from an anonymous visitor', () => {
  assert.equal(
    resolveTemplateAccess({ role: null, accessLevel: 'paid', isAuthenticated: false }),
    false,
  )
})

test('any account unlocks a gated template — no purchase needed', () => {
  assert.equal(
    resolveTemplateAccess({ role: 'user', accessLevel: 'paid', isAuthenticated: true }),
    true,
  )
})

test('a missing accessLevel is treated as gated, not public', () => {
  assert.equal(
    resolveTemplateAccess({ role: null, accessLevel: null, isAuthenticated: false }),
    false,
  )
  assert.equal(
    resolveTemplateAccess({ role: null, accessLevel: undefined, isAuthenticated: true }),
    true,
  )
})
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx tsx --test src/lib/template-access.test.ts`
Expected: FAIL — cannot find module `./template-access`.

- [ ] **Step 3: Write the minimal implementation**

Create `src/lib/template-access.ts`:

```ts
/**
 * Who may see a tasting template's full contents.
 *
 * Since 2026-08-19 the whole tasting system is a free lead magnet: templates
 * are public to read, and the signup gate sits on the *actions* instead
 * (clone-from-template, the builder, hosting a session) — all of which were
 * already login-gated. `accessLevel` survives so an admin can still gate one
 * individual template behind a free account:
 *
 *   free = fully public, readable logged out
 *   paid = requires an account (which is free)
 *
 * Pure on purpose — the entitlement/subscription lookups that used to live
 * inline made this untestable. They are now dormant (see access-control.ts).
 *
 * Spec: docs/superpowers/specs/2026-08-19-lead-magnet-provningsverktyget-design.md (Section 1.1)
 */
export interface TemplateAccessInput {
  /** The viewer's role, if any. */
  role?: string | null
  /** The template's accessLevel field. */
  accessLevel?: string | null
  /** Whether a user is logged in at all. */
  isAuthenticated: boolean
}

export function resolveTemplateAccess({
  role,
  accessLevel,
  isAuthenticated,
}: TemplateAccessInput): boolean {
  if (role === 'admin') return true
  if (accessLevel === 'free') return true
  return isAuthenticated
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx tsx --test src/lib/template-access.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Rewire `canUseTemplate` to use it**

In `src/lib/access-control.ts`, add to the imports at the top of the file:

```ts
import { resolveTemplateAccess } from './template-access'
```

Then replace the whole docblock + function at lines 483–513 with:

```ts
/**
 * Composite predicate. Returns true if the user should see the full template
 * (wines, host script, "Använd mallen").
 *
 * Since 2026-08-19 every template is free — the branch logic lives in the pure
 * `resolveTemplateAccess()` so it can be unit-tested. This stays async and
 * keeps its signature so all four call sites are unchanged, and so the
 * entitlement lookup can be reinstated without touching them.
 *
 * DORMANT: `hasTemplateEntitlement` and `hasActiveSubscription` are no longer
 * consulted. To sell templates again, reinsert the entitlement check below the
 * resolveTemplateAccess() call and flip templates back to accessLevel 'paid'.
 *
 * Spec: docs/superpowers/specs/2026-08-19-lead-magnet-provningsverktyget-design.md
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
  return resolveTemplateAccess({
    role: user?.role,
    accessLevel: template.accessLevel,
    isAuthenticated: Boolean(user),
  })
}
```

Note: `req` and `template.id` are now unused inside the body but stay in the signature deliberately. If ESLint flags unused params, prefix nothing — the params are part of the public contract; add `// eslint-disable-next-line @typescript-eslint/no-unused-vars` only if the lint actually errors.

- [ ] **Step 6: Add the test script**

In `package.json`, alongside the existing `test:ia` script (line ~33), add:

```json
"test:access": "cross-env NODE_OPTIONS=--no-deprecation npx tsx --test src/lib/template-access.test.ts",
```

- [ ] **Step 7: Fix the stale CLAUDE.md claim**

In `CLAUDE.md`, replace the line `No test suite is configured.` with:

```markdown
Tests: pure modules under `src/lib/*.test.ts` run on `node --test` via `tsx`. Run them with `pnpm test:ia`, `pnpm test:session`, `pnpm test:vinkompassen`, `pnpm test:access`. There is no component or E2E suite — UI changes are verified manually.
```

- [ ] **Step 8: Verify the whole thing still compiles**

Run: `pnpm test:access && pnpm lint`
Expected: 5 tests pass; lint clean.

- [ ] **Step 9: Commit**

```bash
git add src/lib/template-access.ts src/lib/template-access.test.ts src/lib/access-control.ts package.json CLAUDE.md
git commit -m "feat(templates): any account unlocks every template

Extracts the access branch into a pure, tested resolveTemplateAccess().
Entitlement + subscription lookups go dormant, not deleted."
```

---

### Task 2: Flip every template public and stop the Stripe sync

**Files:**
- Modify: `src/collections/TastingTemplates.ts` (accessLevel field ~line 195-205, priceSek ~207, isFreeTrial ~218, afterChange hook ~291-334)
- Create: `src/migrations/<generated>_templates_all_free.ts` (+ `.json`)
- Modify: `src/migrations/index.ts`

**Interfaces:**
- Consumes: `resolveTemplateAccess` semantics from Task 1 (`free` = public, `paid` = account-gated).
- Produces: every `tasting_templates` row has `access_level = 'free'`; new templates default to `'free'`.

- [ ] **Step 1: Change the field default and document the new meaning**

In `src/collections/TastingTemplates.ts`, find the `accessLevel` field (its admin description currently begins "Free templates render wine details to everyone…"). Set `defaultValue: 'free'` and replace the description:

```ts
      admin: {
        position: 'sidebar',
        description:
          'Fri = helt öppen, syns även för utloggade besökare (standard). Kräver konto = besökaren måste skapa ett gratiskonto för att se vinerna. Sedan 2026-08-19 är allt gratis — detta styr bara om innehållet är publikt eller kräver inloggning.',
      },
```

- [ ] **Step 2: Mark the paused commerce fields as dormant**

Still in `src/collections/TastingTemplates.ts`, update the two admin descriptions so nobody re-enables them by accident. For `priceSek`:

```ts
      admin: {
        position: 'sidebar',
        description:
          'PAUSAD 2026-08-19 — mallar säljs inte längre. Fältet finns kvar för att kunna återuppta försäljning utan migration.',
      },
```

For `isFreeTrial`:

```ts
      admin: {
        position: 'sidebar',
        description:
          'PAUSAD 2026-08-19 — alla mallar är gratis, så "prova gratis" har ingen effekt längre.',
      },
```

- [ ] **Step 3: Remove the Stripe sync trigger**

In the `afterChange` hook (starts ~line 291), delete the entire `if (doc.accessLevel === 'paid' && doc.publishedStatus === 'published' && ...)` block including its nested `shouldSync` logic and `setImmediate`, leaving:

```ts
    afterChange: [
      async ({ doc }) => {
        if (!doc) return doc
        // Stripe sync removed 2026-08-19 — templates are free (lead magnet).
        // syncTemplateWithStripe() is intentionally still exported from
        // ../lib/stripe-products for a future re-enable.
        return doc
      },
    ],
```

Then remove the now-unused import on line 2: `import { syncTemplateWithStripe } from '../lib/stripe-products'`.

- [ ] **Step 4: Generate the migration**

Run: `pnpm migrate:create -- "templates_all_free"`

- [ ] **Step 5: Add the data flip to the generated migration**

Open the generated `src/migrations/<timestamp>_templates_all_free.ts`. Payload will have written the schema delta (the changed column default). Add the data backfill inside `up`, after whatever Payload generated:

```ts
  // Every existing template becomes publicly readable. The signup gate moved
  // from viewing to *using* (clone / builder / hosting), all already gated.
  await db.execute(sql`UPDATE "tasting_templates" SET "access_level" = 'free'`)
```

If the generated file does not already destructure them, the signature is:

```ts
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
```

and `sql` comes from the import Payload generates at the top: `import { sql } from '@payloadcms/db-postgres'`. Add it if absent.

Leave `down` as Payload generated it — do not attempt to restore per-row previous values; the old paid/free split has no business meaning after this change.

- [ ] **Step 6: Regenerate types and verify**

Run: `pnpm generate:types && pnpm lint && pnpm build`
Expected: all pass. Confirm `src/migrations/index.ts` now lists the new migration.

- [ ] **Step 7: Commit**

```bash
git add src/collections/TastingTemplates.ts src/migrations/ src/payload-types.ts
git commit -m "feat(templates): default every template to public, drop Stripe sync

Templates are a lead magnet now. accessLevel is repurposed as
public-vs-requires-account; priceSek and isFreeTrial marked dormant."
```

---

### Task 3: Retire the purchase surfaces

Nothing is deleted. The routes stay so indexed URLs and any in-flight Stripe events resolve rather than 404.

**Files:**
- Modify: `src/app/(frontend)/(site)/provningsmallar/[slug]/kop/page.tsx` (replace body)
- Modify: `src/app/api/payments/template-checkout/route.ts` (return 410)
- Modify: `src/app/api/webhooks/stripe/route.ts:145-147` and `:1024` (add warnings)

**Interfaces:**
- Consumes: nothing.
- Produces: `/provningsmallar/<slug>/kop` permanently redirects to `/provningsmallar/<slug>`.

- [ ] **Step 1: Turn the buy page into a redirect**

Replace the entire contents of `src/app/(frontend)/(site)/provningsmallar/[slug]/kop/page.tsx` with:

```tsx
import { redirect, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'

interface RouteParams {
  params: Promise<{ slug: string }>
}

export const metadata: Metadata = {
  title: 'Vinprovning — Vinakademin',
  robots: { index: false, follow: false },
}

/**
 * Templates stopped being sold on 2026-08-19 — the whole tasting system is a
 * free lead magnet now. The route survives so indexed URLs and old links land
 * on the template instead of a 404.
 *
 * Spec: docs/superpowers/specs/2026-08-19-lead-magnet-provningsverktyget-design.md (Section 1.3)
 */
export default async function TemplateBuyPage({ params }: RouteParams) {
  const { slug } = await params
  permanentRedirect(`/provningsmallar/${slug}`)
}
```

Note: `redirect` is imported but unused — remove it from the import so lint stays clean. The line above should read `import { permanentRedirect } from 'next/navigation'`.

- [ ] **Step 2: Gone-410 the checkout endpoint**

In `src/app/api/payments/template-checkout/route.ts`, replace the body of the exported `POST` handler with an immediate refusal, keeping every import and helper below it intact:

```ts
export async function POST(): Promise<NextResponse> {
  // Templates are free since 2026-08-19 (lead magnet). Kept as 410 rather than
  // deleted so the route can be revived; see the design spec, Section 1.3.
  log.warn('template-checkout called after templates went free — refusing')
  return NextResponse.json(
    { error: 'Provningsmallar är gratis — inget köp behövs.' },
    { status: 410 },
  )
}
```

If the file's logger is named something other than `log`, use whatever it already binds. If it has no logger, add `import { loggerFor } from '@/lib/logger'` and `const log = loggerFor('api-payments-template-checkout')` following the pattern in `src/app/(frontend)/(site)/vinkurser/page.tsx:16`.

- [ ] **Step 3: Warn on the dormant webhook branches**

In `src/app/api/webhooks/stripe/route.ts`, inside the `if (paymentIntent?.metadata?.productKind === 'template') {` block at ~line 147, add as the first statement:

```ts
    // Dormant since 2026-08-19 — templates are free. Still honoured so a real
    // in-flight payment is never silently dropped.
    logger.warn({ paymentIntentId: paymentIntent.id }, 'template purchase webhook fired after templates went free')
```

Do the same at the `if (md.productKind === 'template') {` branch at ~line 1024, using whatever identifier that scope has for the intent. Use the logger binding already present in the file — do not introduce a new one.

- [ ] **Step 4: Verify**

Run: `pnpm lint && pnpm build`
Expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(frontend)/(site)/provningsmallar/[slug]/kop/page.tsx" src/app/api/payments/template-checkout/route.ts src/app/api/webhooks/stripe/route.ts
git commit -m "feat(templates): retire purchase surfaces without deleting them

kop redirects, template-checkout 410s, webhook branches warn but still honour
any in-flight payment."
```

---

### Task 4: De-price the template UI

**Files:**
- Modify: `src/components/tasting-template/TemplateCard.tsx:22-28` and the badge JSX ~40-60
- Modify: `src/components/tasting-template/LockedTemplateDetailView.tsx` (props, CTAs)
- Modify: `src/app/(frontend)/(site)/provningsmallar/[slug]/page.tsx:84-95` (drop the priceSek prop)
- Modify: `src/components/tasting-template/UseTemplateButton.tsx:25-27`
- Modify: `src/app/api/tasting-plans/from-template/[templateId]/route.ts:~76` (403 copy)

**Interfaces:**
- Consumes: Task 1's semantics.
- Produces: `LockedTemplateDetailViewProps` loses `priceSek`; it is now `{ template, preview, isAuthenticated }`.

- [ ] **Step 1: Replace the TemplateCard price badge**

In `src/components/tasting-template/TemplateCard.tsx`, delete lines 22–28 (`isPaid`, the `isFreeTrial` comment + const, `priceSek`, `paidBadgeLabel`) and replace the entire badge `<span>…</span>` block with:

```tsx
          <span className="absolute top-2 right-2 inline-flex items-center rounded-full bg-emerald-500 text-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider shadow-sm">
            Gratis
          </span>
```

Then remove `Lock` from the `lucide-react` import on line 4 — it is now unused.

- [ ] **Step 2: Strip pricing from the locked view**

In `src/components/tasting-template/LockedTemplateDetailView.tsx`:

Replace the props interface with:

```tsx
export interface LockedTemplateDetailViewProps {
  template: TastingTemplate
  preview: LockedTemplatePreview
  /** Whether the viewer is logged in. Anonymous visitors get the signup CTA. */
  isAuthenticated: boolean
}
```

Update the docblock to:

```tsx
/**
 * What an anonymous visitor sees on a template an admin has deliberately gated
 * behind a free account. Since 2026-08-19 templates default to fully public, so
 * this renders only for accessLevel === 'paid'.
 *
 * Spec: docs/superpowers/specs/2026-08-19-lead-magnet-provningsverktyget-design.md (Section 1.4)
 */
```

Change the destructure to `{ template, preview, isAuthenticated }`, delete the `formattedTemplatePrice` const, and replace the href block with:

```tsx
  const detailPath = `/provningsmallar/${template.slug}`
  const signupHref = `/registrera?from=${encodeURIComponent(detailPath)}`
  const loginHref = `/logga-in?from=${encodeURIComponent(detailPath)}`
```

Replace the banner card's copy and buttons:

```tsx
                <p className="text-sm font-medium">
                  Skapa ett gratiskonto och lås upp hela provningen
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Helt gratis — vinlista, värdmanus och smakblad ingår.
                </p>
```

```tsx
              <Button asChild size="sm">
                <Link href={signupHref}>Skapa gratiskonto</Link>
              </Button>
              {!isAuthenticated && (
                <Link
                  href={loginHref}
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline text-center sm:text-right"
                >
                  Har du redan konto? Logga in
                </Link>
              )}
```

Replace the redacted-wine caption:

```tsx
                    <p className="text-xs text-muted-foreground">
                      Skapa ett gratiskonto för att se vad du provar.
                    </p>
```

And the sidebar:

```tsx
        <Button asChild className="w-full">
          <Link href={signupHref}>Skapa gratiskonto</Link>
        </Button>
        {!isAuthenticated && (
          <Link
            href={loginHref}
            className="block text-center text-xs text-muted-foreground hover:text-foreground hover:underline pt-1"
          >
            Har du redan konto? Logga in
          </Link>
        )}
        <p className="text-xs text-muted-foreground text-center">
          Gratis konto — ingen betalning, inget abonnemang.
        </p>
```

- [ ] **Step 3: Drop the priceSek prop at the call site**

In `src/app/(frontend)/(site)/provningsmallar/[slug]/page.tsx`, delete the `const priceSek = …` block (lines ~84–88) and remove `priceSek={priceSek}` from the `<LockedTemplateDetailView />` call.

- [ ] **Step 4: Point the 401 bounce at signup**

In `src/components/tasting-template/UseTemplateButton.tsx`, replace the 401 branch:

```tsx
      if (res.status === 401) {
        // Signup, not login — an anonymous visitor clicking "Använd mallen" is
        // the conversion event this whole page exists for.
        router.push(`/registrera?from=/provningsmallar/${templateSlug}`)
        return
      }
```

- [ ] **Step 5: Fix the now-wrong 403 copy**

In `src/app/api/tasting-plans/from-template/[templateId]/route.ts`, change the 403 response body from `'Du måste köpa denna mall innan du kan använda den.'` to:

```ts
        { error: 'Du behöver ett konto för att använda denna mall.' },
```

and change the log message on the line above from `'from-template rejected — user lacks entitlement'` to `'from-template rejected — template gated and user lacks access'`.

- [ ] **Step 6: Verify**

Run: `pnpm lint && pnpm build`
Expected: both pass, with no unused-import errors for `Lock` or `priceSek`.

- [ ] **Step 7: Commit**

```bash
git add src/components/tasting-template/ "src/app/(frontend)/(site)/provningsmallar/[slug]/page.tsx" "src/app/api/tasting-plans/from-template/[templateId]/route.ts"
git commit -m "feat(templates): replace buy CTAs with free-account signup"
```

---

### Task 5: Remove the free/paid gallery filter

With every template public, a free-vs-paid filter shows a meaningless split. This is covered by existing tests — update them in the same commit.

**Files:**
- Modify: `src/lib/provningar-view.ts` (drop `access` from the state, parser, and builder)
- Modify: `src/lib/provningar-view.test.ts` (lines 14, 30, 37, 53-61, 70)
- Modify: `src/app/(frontend)/(site)/provningsmallar/page.tsx` (lines 38, 86, 130-147, 184, 272, 279)

**Interfaces:**
- Consumes: nothing.
- Produces: `ProvningarFilterState` no longer has an `access` key. Any code reading `filters.access` must be updated in this task.

- [ ] **Step 1: Update the tests first**

In `src/lib/provningar-view.test.ts`: delete the `access: null` and `access: 'paid'` properties from every state literal (lines 14, 30, 37, 70), and delete the whole `test('changing access preserves the active view and tag', …)` block (lines ~53–61).

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `pnpm test:ia`
Expected: FAIL — TypeScript errors on the now-missing `access` property, or assertion failures on hrefs still containing `access=`.

- [ ] **Step 3: Remove `access` from the module**

In `src/lib/provningar-view.ts`:
- Delete the `/** Template access-level filter. */ access: 'free' | 'paid' | null` member from `ProvningarFilterState`.
- In `parseProvningarFilters`, delete the `const access = …` line and remove `access` from the returned object.
- In `buildProvningarHref`, delete `next.access = null` from the drop-filters block and delete `if (next.access) params.set('access', next.access)`.
- Update the module docblock: change "tag/access/status are template concepts" to "tag/status are template concepts".

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm test:ia`
Expected: PASS.

- [ ] **Step 5: Remove the filter UI**

In `src/app/(frontend)/(site)/provningsmallar/page.tsx`:
- Delete `access?: string` from the `searchParams` type (line ~38).
- Delete `if (filters.access) whereAnd.push({ accessLevel: { equals: filters.access } })` (line ~86).
- Delete the whole `const accessPills: Array<…> = [ … ]` declaration (lines ~130–147).
- Delete the `{accessPills.map((p) => ( … ))}` JSX block and its wrapping container if that container has no other children (line ~184).
- At lines ~272 and ~279, change `filters.tag || filters.access` to just `filters.tag`.

- [ ] **Step 6: Verify**

Run: `pnpm test:ia && pnpm lint && pnpm build`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/provningar-view.ts src/lib/provningar-view.test.ts "src/app/(frontend)/(site)/provningsmallar/page.tsx"
git commit -m "refactor(provningar): drop the free/paid filter — every template is free"
```

---

### Task 6: Pre-check the newsletter opt-in

**Files:**
- Modify: `src/components/auth/RegistrationForm.tsx:35` (zod default), `:68` (form default), `:244-250` (consent copy)

**Interfaces:**
- Consumes: nothing.
- Produces: new registrations default to `notifications.email.newsletter === true`.

- [ ] **Step 1: Flip the zod default**

Line 35: `acceptsMarketing: z.boolean().default(false),` → `acceptsMarketing: z.boolean().default(true),`

- [ ] **Step 2: Flip the form default**

Line 68: `acceptsMarketing: false,` → `acceptsMarketing: true,`

- [ ] **Step 3: Rewrite the consent copy**

A pre-checked box has to be more honest about what it is, not less. Replace the `<label>` content (lines ~244–250) with:

```tsx
                      <label
                        htmlFor="acceptsMarketing"
                        className="text-sm leading-snug text-muted-foreground cursor-pointer select-none"
                      >
                        Ja tack — skicka mig vintips, nya provningar och erbjudanden. Ungefär ett
                        mejl i veckan. Avsluta när du vill med ett klick.
                      </label>
```

- [ ] **Step 4: Verify manually**

Run: `pnpm dev`, open `http://localhost:3000/registrera`.
Expected: the newsletter checkbox is checked on load; unchecking it and submitting still creates the account.

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/RegistrationForm.tsx
git commit -m "feat(auth): pre-check the newsletter opt-in at registration"
```

---

### Task 7: Build the `/provningsverktyget` landing page

The page that sells the free tier. Server component, statically rendered, pulls real templates from Payload so the page proves its claim with actual artefacts.

**Files:**
- Create: `src/app/(frontend)/(site)/provningsverktyget/page.tsx`

**Interfaces:**
- Consumes: `TemplateCard` from `@/components/tasting-template/TemplateCard` (props: `{ template: TastingTemplate; href?: string }`), `NewsletterSignupBlock` from `@/components/blocks/NewsletterSignupBlock`, `getSiteURL` from `@/lib/site-url`.
- Produces: the route `/provningsverktyget`, linked from nav in Task 8 and the homepage in Task 9.

- [ ] **Step 1: Create the page**

Create `src/app/(frontend)/(site)/provningsverktyget/page.tsx`:

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getSiteURL } from '@/lib/site-url'
import { TemplateCard } from '@/components/tasting-template/TemplateCard'
import { NewsletterSignupBlock } from '@/components/blocks/NewsletterSignupBlock'
import {
  ArrowRight,
  Check,
  ClipboardList,
  Hammer,
  Smartphone,
  Sparkles,
  Wine,
} from 'lucide-react'
import type { TastingTemplate } from '@/payload-types'

const HEADING = 'font-heading tracking-[-0.015em] leading-[1.05]'

export const metadata: Metadata = {
  title: 'Provningsverktyget — håll en vinprovning hemma, gratis',
  description:
    'Färdiga vinprovningar, inköpslista till Systembolaget, värdmanus och smakblad till alla gäster. Allt gratis — skapa konto och kör igång.',
  alternates: { canonical: `${getSiteURL()}/provningsverktyget` },
  openGraph: {
    title: 'Provningsverktyget — håll en vinprovning hemma, gratis | Vinakademin',
    description:
      'Färdiga vinprovningar, inköpslista, värdmanus och smakblad. Allt gratis.',
    url: `${getSiteURL()}/provningsverktyget`,
    type: 'website',
  },
}

const PILLARS = [
  {
    icon: Wine,
    title: 'Färdiga provningar',
    body: 'Tema, viner och ordning är redan bestämt. Du får en inköpslista rakt in i Systembolaget — handla, ställ in i kylen, klart.',
  },
  {
    icon: Hammer,
    title: 'Bygg din egen',
    body: 'Har du redan viner hemma? Sök upp dem, sätt din egen ordning och skriv dina egna frågor. Verktyget gör resten.',
  },
  {
    icon: Smartphone,
    title: 'Livesession på mobilen',
    body: 'Alla gäster går med via en länk. Du styr takten, de följer med på sin egen telefon. Ingen behöver ladda ner något.',
  },
  {
    icon: ClipboardList,
    title: 'Smakblad och resultat',
    body: 'Var och en fyller i vad de tycker. På slutet jämför ni — vem gillade vad, och vem hade faktiskt rätt.',
  },
] as const

const STEPS = [
  {
    n: '1',
    title: 'Välj en provning',
    body: 'Ta en av våra färdiga, eller bygg en egen på fem minuter.',
  },
  {
    n: '2',
    title: 'Handla vinerna',
    body: 'Du får en lista med exakta viner och priser. Allt finns på Systembolaget.',
  },
  {
    n: '3',
    title: 'Bjud in och kör',
    body: 'Skicka länken till gänget. Ni kör provningen tillsammans, verktyget guidar.',
  },
] as const

const FAQ = [
  {
    q: 'Är det verkligen gratis?',
    a: 'Ja. Alla provningar, verktyget och livesessionerna är gratis. Du skapar ett konto, sen är det ditt. Vi tjänar pengar på vår vinkväll — den är helt frivillig.',
  },
  {
    q: 'Behöver jag kunna något om vin?',
    a: 'Nej. Varje provning kommer med ett värdmanus — vad du säger, vad du frågar, vad som är kul att veta om varje vin. Du läser innantill om du vill.',
  },
  {
    q: 'Hur många kan vara med?',
    a: 'Från två personer till ett helt sällskap. En flaska räcker till ungefär sex provglas, så räkna med en flaska per vin om ni är sex, två om ni är tolv.',
  },
  {
    q: 'Vad kostar vinerna?',
    a: 'Det bestämmer du. Varje provning visar totalpriset innan du börjar, och vi väljer nästan alltid viner som går att hitta i vanliga Systembolagsbutiker.',
  },
] as const

export default async function ProvningsverktygetPage() {
  const payload = await getPayload({ config })
  const templatesResult = await payload.find({
    collection: 'tasting-templates',
    where: { publishedStatus: { equals: 'published' } } as never,
    depth: 1,
    limit: 3,
    sort: '-publishedAt',
  })
  const templates = templatesResult.docs as TastingTemplate[]

  return (
    <div className="min-h-screen">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-16 lg:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-300/30 bg-brand-300/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-400">
            <Sparkles className="h-3 w-3" />
            Helt gratis
          </span>
          <h1 className={`${HEADING} mt-5 text-4xl md:text-5xl lg:text-6xl`}>
            Håll en <span className="text-brand-gradient">vinprovning</span> hemma
            <br className="hidden sm:block" /> utan att kunna något om vin
          </h1>
          <p className="mx-auto mt-5 max-w-[60ch] text-base leading-relaxed text-muted-foreground md:text-lg">
            Provningsverktyget ger dig färdiga provningar, en inköpslista till Systembolaget,
            ett värdmanus att läsa innantill och smakblad till varje gäst. Du bjuder in — vi
            har gjort resten.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/registrera?from=/provningsverktyget" className="btn-brand">
              Skapa gratiskonto
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/provningsmallar"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-brand-400 px-6 text-sm font-medium text-brand-400 transition-colors hover:bg-brand-400/10"
            >
              Se provningarna först
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Ingen betalning. Inget abonnemang. Inget kort.
          </p>
        </div>
      </section>

      {/* ── Fyra pelare ──────────────────────────────────────────────────── */}
      <section className="py-14 lg:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className={`${HEADING} text-3xl md:text-4xl`}>Det här får du</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {PILLARS.map((p) => (
              <article
                key={p.title}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-300/15 text-brand-400">
                  <p.icon className="h-5 w-5" />
                </div>
                <h3 className={`${HEADING} text-xl md:text-2xl`}>{p.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{p.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Så funkar det ────────────────────────────────────────────────── */}
      <section className="bg-muted/30 py-14 lg:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className={`${HEADING} text-3xl md:text-4xl`}>Så funkar det</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              Från idé till provning på en eftermiddag.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="text-center">
                <span
                  className={`${HEADING} block text-5xl text-brand-400/30 md:text-6xl`}
                  aria-hidden="true"
                >
                  {s.n}
                </span>
                <h3 className={`${HEADING} mt-2 text-xl`}>{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Proof: riktiga provningar ────────────────────────────────────── */}
      {templates.length > 0 && (
        <section className="py-14 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <h2 className={`${HEADING} text-3xl md:text-4xl`}>Redo att köra i kväll</h2>
              <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
                Några av provningarna som ligger klara just nu.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((t) => (
                <TemplateCard key={t.id} template={t} />
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link
                href="/provningsmallar"
                className="inline-flex items-center gap-2 text-sm font-medium text-brand-400 hover:underline"
              >
                Se alla provningar
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Signup ───────────────────────────────────────────────────────── */}
      <section className="py-14 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm md:p-12">
            <h2 className={`${HEADING} text-3xl md:text-4xl`}>
              Skapa konto och <span className="text-brand-gradient">kör igång</span>
            </h2>
            <p className="mx-auto mt-4 max-w-[52ch] text-[15px] leading-relaxed text-muted-foreground">
              Gratis, för alltid. Du får hela verktyget direkt — och ett mejl i veckan med
              vintips och nya provningar.
            </p>
            <ul className="mx-auto mt-6 grid max-w-md gap-2 text-left text-[14px]">
              {[
                'Alla färdiga provningar',
                'Bygg egna provningar',
                'Livesessioner med obegränsat antal gäster',
                'Smakblad och resultat som sparas',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link href="/registrera?from=/provningsverktyget" className="btn-brand mt-8">
              Skapa gratiskonto
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="pb-14 lg:pb-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className={`${HEADING} mb-8 text-center text-3xl md:text-4xl`}>Vanliga frågor</h2>
          <dl className="space-y-6">
            {FAQ.map((item) => (
              <div key={item.q} className="rounded-xl border border-border bg-card p-5 md:p-6">
                <dt className="font-medium">{item.q}</dt>
                <dd className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Handoff till Vinkvällen ──────────────────────────────────────── */}
      <section className="pb-16 lg:pb-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-brand-400/40 bg-brand-400/5 p-8 text-center md:p-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-400">
              Vill du slippa vara den som pratar?
            </p>
            <h2 className={`${HEADING} mt-3 text-2xl md:text-3xl`}>
              Låt oss hålla i vinkvällen åt dig
            </h2>
            <p className="mx-auto mt-4 max-w-[54ch] text-[15px] leading-relaxed text-muted-foreground">
              Med Vinkvällen guidar filmerna hela kvällen. Dina vänner tittar med, alla fyller i
              sina smakblad — du häller upp. 499 kr för hela sällskapet.
            </p>
            <Link
              href="/vinkurser"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-brand-400 hover:underline"
            >
              Läs om Vinkvällen
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Last-resort capture for visitors who won't create an account. Props are
          passed explicitly because this component's defaults are English —
          rendering it bare would put English copy on a Swedish page. Mirrors the
          homepage's usage at (site)/page.tsx:471-479. */}
      <section className="pb-16">
        <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8">
          <NewsletterSignupBlock
            title="Inte redo att skapa konto?"
            description="Få nya provningar och vintips i mejlen. Ett mejl i veckan, ungefär."
            buttonText="Prenumerera"
            placeholderText="Din e-postadress"
            style="minimal"
            backgroundColor="transparent"
            disclaimer="Gratis för alltid. Avsluta prenumerationen när du vill."
          />
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Verify the NewsletterSignupBlock contract**

Already checked by the controller — the component lives at
`src/components/blocks/NewsletterSignupBlock.tsx`, is a **named** export, and takes
`{ title?, description?, buttonText?, placeholderText?, style?, backgroundColor?, showIcon?, disclaimer? }`,
all optional. Its defaults are English, which is why Step 1 passes Swedish values for every
prop it uses. `style` accepts `'minimal' | 'featured' | 'inline' | 'swedish'` and
`backgroundColor` accepts `'default' | 'orange' | 'blue' | 'green' | 'transparent'` — do not
pass values outside those unions.

- [ ] **Step 3: Verify it renders**

Run: `pnpm dev`, open `http://localhost:3000/provningsverktyget`.
Expected: hero, four pillars, three steps, three real template cards, signup box, FAQ, Vinkvällen handoff. No console errors. Check it at 375px width — nothing overflows horizontally.

- [ ] **Step 4: Verify the build**

Run: `pnpm lint && pnpm build`
Expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(frontend)/(site)/provningsverktyget/page.tsx"
git commit -m "feat(provningsverktyget): add the free-tier landing page"
```

---

### Task 8: Wire Provningsverktyget into navigation

**Files:**
- Modify: `src/components/top-nav-header.tsx:32-37` (`NAV_LINKS`)
- Modify: `src/components/mobile-bottom-nav.tsx:51-53` (tab array) and the drawer links ~229-250
- Modify: `src/components/ui/footer.tsx:14-15`

**Interfaces:**
- Consumes: the `/provningsverktyget` route from Task 7.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Top nav**

In `src/components/top-nav-header.tsx`, change `NAV_LINKS` to:

```tsx
const NAV_LINKS = [
  { label: 'Vinkvällen', href: '/vinkurser' },
  { label: 'Provningsverktyget', href: '/provningsverktyget' },
  { label: 'Vinprovningar', href: '/provningsmallar' },
  { label: 'Vinlistan', href: '/vinlistan' },
  { label: 'Artiklar', href: '/artiklar' },
]
```

Note the active-link check at line ~76 uses `pathname.startsWith(link.href)` — `/provningsverktyget` and `/provningsmallar` do not prefix-collide, so no change is needed there.

- [ ] **Step 2: Mobile bottom nav**

In `src/components/mobile-bottom-nav.tsx`, the bottom bar holds only a few tabs — keep it to four. Change the tab array (lines ~51–53) to:

```tsx
  { label: 'Hem', href: '/', icon: Home, matchExact: true },
  { label: 'Vinkvällen', href: '/vinkurser', icon: GraduationCap },
  { label: 'Provningar', href: '/provningsmallar', icon: Wine },
```

Then in the drawer's link list (~line 229 onward), add an entry for Provningsverktyget immediately before the existing `/provningsmallar` entry, matching the surrounding component's prop shape exactly (it uses `href` / `label` / an icon — copy the shape of the adjacent entry rather than inventing one):

```tsx
                href="/provningsverktyget"
                label="Provningsverktyget"
```

- [ ] **Step 3: Footer**

In `src/components/ui/footer.tsx`, change the link array at lines ~14–15 to:

```tsx
  { label: 'Vinkvällen', href: '/vinkurser' },
  { label: 'Provningsverktyget', href: '/provningsverktyget' },
  { label: 'Vinprovningar', href: '/provningsmallar' },
```

Also update the footer blurb at line ~180 — "Guidade vinkurser hemma, med vänner" still works, but confirm it reads consistently with the new framing.

- [ ] **Step 4: Verify**

Run: `pnpm dev` and click through every nav surface: desktop header, mobile bottom bar, mobile drawer, footer.
Expected: Provningsverktyget appears in all of them and highlights when active. The mobile bottom bar still fits without wrapping at 375px.

Run: `pnpm lint && pnpm build`

- [ ] **Step 5: Commit**

```bash
git add src/components/top-nav-header.tsx src/components/mobile-bottom-nav.tsx src/components/ui/footer.tsx
git commit -m "feat(nav): surface Provningsverktyget; rename Vinkurser to Vinkvällen"
```

---

### Task 9: Rebuild the homepage around one free thing and one paid thing

The homepage currently compares *Vinkurs vs Vinprovning* and advertises "99 kr per vinprovning · en gratis när du loggar in" — which goes false the moment Task 2 ships. Replace the comparison with **Gratis vs Vinkvällen**.

**Files:**
- Modify: `src/components/home/OfferingsComparison.tsx` (whole component)
- Modify: `src/components/home/ProvningsmallarFeature.tsx` (CTA target + framing)
- Modify: `src/components/home/VinkurserFeature.tsx` (Vinkvällen framing)
- Modify: `src/app/(frontend)/(site)/page.tsx:26-38` (metadata)
- Modify: `src/app/(frontend)/(site)/vinkurser/page.tsx:18-30` (metadata)

**Interfaces:**
- Consumes: the `/provningsverktyget` route from Task 7.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Rewrite the comparison section**

In `src/components/home/OfferingsComparison.tsx`, replace the header block and both `<article>` cards. Keep the outer `<section>`, container divs, and the `HEADING` const exactly as they are.

Header block:

```tsx
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-300/30 bg-brand-300/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-400">
            <Sparkles className="h-3 w-3" />
            Två sätt att hålla vinkväll
          </span>
          <h2 className={`${HEADING} mt-5 text-3xl md:text-4xl lg:text-5xl`}>
            Du är värd — eller <span className="text-brand-gradient">vi</span> är det
          </h2>
          <p className="mx-auto mt-4 max-w-[58ch] text-[15px] leading-relaxed text-muted-foreground">
            Båda ger dig en kväll dina vänner pratar om efteråt. Skillnaden är hur mycket du
            själv vill stå för pratet.
          </p>
        </div>
```

First card — the free tier:

```tsx
          <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-300/15 text-brand-400">
              <WineIcon className="h-5 w-5" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Provningsverktyget
            </p>
            <h3 className={`${HEADING} mt-2 text-2xl md:text-3xl`}>Du håller i kvällen</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              Färdig provning, inköpslista och ett värdmanus du kan läsa innantill. Du gör
              pratet — vi har skrivit det åt dig.
            </p>

            <ul className="mt-5 space-y-2 text-[14px] text-foreground">
              {[
                'Färdiga provningar och inköpslista',
                'Värdmanus med fakta och frågor',
                'Livesession och smakblad till alla gäster',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-6">
              <p className="text-[15px] font-medium">
                <span className="text-brand-gradient text-xl font-bold">Gratis</span>{' '}
                <span className="text-sm text-muted-foreground">· skapa konto, kör igång</span>
              </p>
              <Link
                href="/provningsverktyget"
                className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-brand-400 px-6 text-sm font-medium text-brand-400 transition-colors hover:bg-brand-400/10 focus-visible:outline-2 focus-visible:outline-brand-400 focus-visible:outline-offset-2"
              >
                Kom igång gratis
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </article>
```

Second card — the paid offer:

```tsx
          <article className="flex h-full flex-col rounded-2xl border border-brand-400/40 bg-brand-400/5 p-6 shadow-sm md:p-8">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-300/15 text-brand-400">
              <PlayCircle className="h-5 w-5" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Vinkvällen
            </p>
            <h3 className={`${HEADING} mt-2 text-2xl md:text-3xl`}>Vi håller i kvällen</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              Filmerna guidar hela provningen. Dina vänner tittar med, alla fyller i sina egna
              smakblad — du häller upp och njuter.
            </p>

            <ul className="mt-5 space-y-2 text-[14px] text-foreground">
              {[
                'Guidad provning i film — du behöver inte prata',
                'En betalar, hela sällskapet är med',
                '30 dagars pengarna-tillbaka-garanti',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-6">
              <p className="text-[15px] font-medium">
                <span className="text-brand-gradient text-xl font-bold">499 kr</span>{' '}
                <span className="text-sm text-muted-foreground">· för hela sällskapet</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                En guidad vinprovning ute kostar 500–1000 kr per person.
              </p>
              <Link href="/vinkurser" className="btn-brand mt-4 w-full">
                Läs om Vinkvällen
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </article>
```

Update the component's docblock to describe the free-vs-paid split rather than the old product split, and reference this plan's spec path.

- [ ] **Step 2: Repoint the templates feature**

In `src/components/home/ProvningsmallarFeature.tsx`, change the primary CTA `href` to `/provningsverktyget` and make the free-ness explicit in whatever eyebrow/heading text it carries. Do not leave any "99 kr" or "en gratis" phrasing anywhere in the file.

- [ ] **Step 3: Update homepage metadata**

In `src/app/(frontend)/(site)/page.tsx`, replace the `metadata` block's `description` values (both the top-level one and the `openGraph` one) with:

```ts
    'Håll en vinprovning hemma med vänner. Provningsverktyget är gratis — färdiga provningar, inköpslista och värdmanus. Eller låt Vinkvällen guida hela kvällen åt dig.',
```

Leave `title` and `alternates.canonical` as they are.

- [ ] **Step 4: Reframe the course feature block and the gallery metadata**

In `src/components/home/VinkurserFeature.tsx`, rewrite the eyebrow, heading, and body copy from learning framing to evening framing. The `formatPrice` helper at line 22 returns `'Gratis'` for a zero price — leave that logic alone, it is unrelated. Concretely: the section should promise an evening with friends that we guide, not a course you study. Keep the component's existing layout, class names, and props; change only the copy strings and any CTA label (`Se kurserna` → `Läs om Vinkvällen`).

In `src/app/(frontend)/(site)/vinkurser/page.tsx`, replace the `metadata` block's `description` (and the matching `openGraph.description`) with:

```ts
    'Vinkvällen — bjud hem vänner och håll en vinprovning de pratar om. Filmerna guidar hela kvällen, en betalar för hela sällskapet. 30 dagars pengarna-tillbaka-garanti.',
```

and the `title` / `openGraph.title` with:

```ts
  title: 'Vinkvällen — en vinprovning hemma med vänner',
```

Leave `alternates.canonical` unchanged.

- [ ] **Step 5: Verify**

Run: `pnpm dev`, open `http://localhost:3000/` and `http://localhost:3000/vinkurser`.
Expected: the comparison section reads Gratis vs 499 kr, both CTAs land on the right pages, no "99 kr" appears anywhere on the homepage, and the course gallery reads as Vinkvällen rather than a course catalogue.

Run: `pnpm lint && pnpm build`

- [ ] **Step 6: Commit**

```bash
git add src/components/home/ "src/app/(frontend)/(site)/page.tsx" "src/app/(frontend)/(site)/vinkurser/page.tsx"
git commit -m "feat(home): reframe the homepage as free tool vs Vinkvällen"
```

---

### Task 10: Build the Vinkvällen offer into the course sales page

The sales header currently shows: level badge → title → shortDescription → price → "Köp vinkurs". That is a product listing, not an offer. Add the anchor, the value stack, and the guarantee.

**Files:**
- Modify: `src/components/course/CourseOverview.tsx:46-50` (props type), `:355-393` (the non-purchaser hero block), `:427-430` (the purchaser hero subheadline)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Fix the subheadline that never renders (pre-existing bug)**

`CourseOverview` reads `course.shortDescription` at lines 369 and 427, but the
`Vinkurser` collection has no `shortDescription` field — the column is
`description`, and the page spreads the course in as `...course`. The value is
always `undefined`, so the `&&` guard silently hides it. **Today the course
subheadline does not render at all**, which would make Task 11's repositioned
copy invisible.

In the props type around line 48, add `description` alongside the existing field:

```tsx
    description?: string
    shortDescription?: string
```

Then at **both** line ~369 and line ~427, replace `course.shortDescription` with
a fallback that prefers the real field — mirroring the precedent already in
`src/lib/course-enrollment-utils.ts:36`:

```tsx
                  {(course.description || course.shortDescription) && (
                    <p className="text-base lg:text-lg leading-relaxed">
                      {course.description || course.shortDescription}
                    </p>
                  )}
```

Keep each site's existing `<p>` class names — they differ between the two blocks,
so copy the fallback expression in, do not paste this block verbatim over both.

- [ ] **Step 2: Replace the price + CTA block**

In `src/components/course/CourseOverview.tsx`, inside the non-purchaser hero (the block containing `<h1 className="text-3xl lg:text-5xl leading-tight">{course.title}</h1>`), replace everything from the `{/* Price */}` comment through the closing `</div>` of the CTA block with:

```tsx
                  {/* Value stack — each line answers an objection a would-be
                       host actually has. Everything listed already ships with
                       the course; nothing here is aspirational. */}
                  <ul className="space-y-2 text-[15px]">
                    {[
                      'Filmerna guidar kvällen — du behöver inte kunna något om vin',
                      'Färdig inköpslista till Systembolaget',
                      'En betalar, hela sällskapet är med i samma session',
                      'Alla fyller i egna smakblad och jämför på slutet',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Check className="mt-1 h-4 w-4 flex-shrink-0 text-brand-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Price + anchor. The anchor is a real market comparison,
                       not an invented "värde" figure — the free tier is on the
                       same site, so fabricated component prices would be
                       visibly false. Confirmed 2026-08-19. */}
                  <div>
                    <div className="text-brand-gradient text-3xl font-bold">
                      {formatPrice(course.price || 0)}
                      <span className="ml-2 align-middle text-base font-normal text-muted-foreground">
                        för hela sällskapet
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      En guidad vinprovning ute kostar 500–1000 kr per person.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setIsCheckoutOpen(true)}
                      className="btn-brand btn-brand-lg w-full"
                    >
                      Boka vår vinkväll
                    </button>
                    <p className="text-center text-sm text-muted-foreground">
                      30 dagars pengarna-tillbaka-garanti. Blev kvällen inget att prata om
                      — mejla oss, så får du tillbaka pengarna. Inga villkor.
                    </p>
                    <p className="text-center text-xs text-muted-foreground">
                      Din första vinkväll kan vara redan på fredag.
                    </p>
                  </div>
```

- [ ] **Step 3: Add the Check import**

At the top of `src/components/course/CourseOverview.tsx`, add `Check` to the existing `lucide-react` import. If the file has no `lucide-react` import, add `import { Check } from 'lucide-react'`.

- [ ] **Step 4: Verify**

Run: `pnpm dev`, open `http://localhost:3000/vinkurser/ldgmgv` **while logged out** (or as a user without access).
Expected: the course description now renders under the title (it did not before Step 1), value stack, 499 kr with "för hela sällskapet", the 500–1000 kr anchor, "Boka vår vinkväll", and the guarantee. Clicking the button still opens the existing checkout dialog. Confirm the purchaser view (log in as someone enrolled) renders its subheadline too and is otherwise unchanged.

Run: `pnpm lint && pnpm build`

- [ ] **Step 5: Commit**

```bash
git add src/components/course/CourseOverview.tsx
git commit -m "feat(vinkvallen): add value stack, price anchor and guarantee to the sales page"
```

---

### Task 11: Update the course content in Payload (manual, admin UI)

This is content, not code — it goes through `/admin` so Fredrik can edit the wording before it goes live. Do **not** write a migration for this.

**Files:** none. Payload admin, collection `Vinkurser`, document id **3**, slug **`ldgmgv`** (do not change the slug).

- [ ] **Step 1: Update the title**

`title` → `Vinkvällen — bjud hem vänner och håll en vinprovning de pratar om`

- [ ] **Step 2: Update the short description**

`description` → 

```
Du behöver inte kunna något om vin. Filmerna guidar hela kvällen — dina vänner tittar med, alla fyller i sina egna smakblad, och du häller upp. En betalar, hela sällskapet är med.
```

- [ ] **Step 3: Update the full description**

Replace `full_description` with the following, keeping the existing practical paragraph about glasses and bottles (it is genuinely useful and already correct):

```
Det här är inte en kurs du ska plugga igenom. Det är en kväll.

Du bjuder hem några vänner, häller upp, och låter filmerna sköta pratet. Vi går igenom vinerna ett i taget — vad ni ska titta efter, lukta efter och smaka efter — medan ni gör det tillsammans. Alla fyller i sitt eget smakblad, och på slutet jämför ni. Det är då det blir roligt.

För att genomföra denna provning behöver du minst 1 vinglas per person, men allra bäst om alla har 3 var. En flaska vin räcker till ca 6 glas, men vanligtvis på vinprovningar får man halvglas - så, om ni är fler än 12 personer, överväg att köpa 2 flaskor av varje vin.

Enbart en av er behöver köpa vinkvällen. Ni delar sedan en session med resten av deltagarna, alla fyller i smakbladen själva, och efteråt kan ni enkelt jämföra med varandra.

Ångrar du dig? Mejla oss inom 30 dagar så får du pengarna tillbaka. Inga villkor, inga frågor.
```

- [ ] **Step 4: Verify**

Open `http://localhost:3000/vinkurser/ldgmgv` logged out.
Expected: new title and description render in the hero. Price still shows 499 kr. Confirm in the admin sidebar that `slug` is still `ldgmgv` and `price` is still `499`, and that **`stripeProductId` and `stripePriceId` are unchanged** from before the edit — Payload's afterChange hook re-syncs Stripe when the title changes, which is expected and fine, but the IDs must not be replaced.

- [ ] **Step 5: No commit** — this task changes database content, not files.

---

### Task 12: Sweep stale pricing copy and verify the whole funnel

**Files:** determined by the sweep below.

- [ ] **Step 1: Find every stale claim**

Run:

```bash
grep -rn "99 kr\|99kr\|per vinprovning\|Köp mallen\|köp mallen\|en gratis när du loggar in\|Prova gratis" src --include="*.tsx" --include="*.ts" | grep -v node_modules
```

Every hit is either (a) legitimately about something else, or (b) a false claim that must be rewritten. Fix category (b). Also run:

```bash
grep -rn "isFreeTrial\|priceSek" src --include="*.tsx" | grep -v node_modules
```

Any remaining *UI* reference to these is dead code from Task 4 — remove it. Collection and API references stay.

- [ ] **Step 2: Fix two stale strings the Task 2 review surfaced**

These were flagged as Minor during Task 2's review and deliberately routed here.

In `src/collections/TastingTemplates.ts` around lines 196-197, the `accessLevel` select's
option labels still describe purchase semantics and now contradict the field's own
description two lines below. Replace them with:

```ts
        { label: 'Fri – syns för alla, även utloggade', value: 'free' },
        { label: 'Kräver konto – besökaren måste skapa ett gratiskonto', value: 'paid' },
```

Keep the `value` strings exactly as they are — `free` and `paid` are persisted in the
database and referenced by `resolveTemplateAccess()`. Only the labels change.

At line ~233, `stripeProductId`'s description still claims the field is auto-generated via
`syncTemplateWithStripe`, whose trigger was removed in Task 2. Replace with:

```ts
        description:
          'PAUSAD 2026-08-19 — fylls inte längre i automatiskt. Kvar för att kunna återuppta försäljning.',
```

Apply the same treatment to `stripePriceId`'s description immediately below it if it makes
the same stale claim.

Finally, in `src/components/tasting-template/LockedTemplateDetailView.tsx` around line 161,
the header pill beside the title reads `Kräver konto`. Every sibling CTA in that component
leads with *gratis* ("Skapa gratiskonto", "Helt gratis", "Gratis konto"), so the bare phrase
can read as a soft paywall to someone skimming. Change the pill text to:

```tsx
              Kräver gratiskonto
```

Leave the enclosing `<span>` classes and the `<Lock />` icon exactly as they are.

- [ ] **Step 3: Fix the mobile-clipped "Gratis" badge**

Diagnosed during Task 7's review and reproduced in a live browser. At 375px the template
cards overflow their container and the green "Gratis" badge is clipped entirely out of view —
on this branch's new landing page and on the existing homepage alike.

Mechanism: `truncate` on the card title (`TemplateCard.tsx:40`) sets `white-space: nowrap`,
giving the title an intrinsic min-content width. The CSS Grid item is `TemplateCard`'s root
`<Link>`, which has no `min-width: 0`, so Grid's automatic minimum sizing expands the track to
fit the un-wrapped title and pushes the card past the viewport — where `<main
overflow-x-hidden>` in `src/app/(frontend)/(site)/layout.tsx:19` clips it silently instead of
showing a scrollbar. Note `Card` already carries `min-w-0` (`src/components/ui/card.tsx:9`),
so it is **not** the element to change.

In `src/components/tasting-template/TemplateCard.tsx` line 24, add `min-w-0` to the root
`<Link>`:

```tsx
    <Link href={href ?? `/provningsmallar/${template.slug}`} className="block group h-full min-w-0">
```

Verify at 375px that the badge is visible on both `/provningsverktyget` and `/` before moving on.

- [ ] **Step 4: Audit the membership page**

Open `src/app/(frontend)/(site)/bli-medlem/page.tsx` and read it end to end. Rewrite any claim that templates cost money or that membership is required for tastings.

- [ ] **Step 5: Full manual walkthrough — logged out**

Run `pnpm dev`, then in a **private window**:
1. `/provningsverktyget` renders, CTA goes to `/registrera?from=/provningsverktyget`.
2. `/provningsmallar` lists templates with a "Gratis" badge and no free/paid filter.
3. Open any template — the **full wine list and host script are visible without logging in**.
4. Click "Använd mallen" → lands on `/registrera`, not `/logga-in`.
5. `/provningsmallar/<slug>/kop` → redirects to the template page.
6. `/vinkurser/ldgmgv` shows the Vinkvällen offer, anchor, and guarantee.

- [ ] **Step 6: Full manual walkthrough — signing up**

7. Complete registration. Confirm the newsletter checkbox is **pre-checked**.
8. After signup, "Använd mallen" creates a plan and redirects to `/mina-provningar/planer/<id>`.
9. `/skapa-provning` loads the builder.
10. Start a live session from a plan and join it from a second browser.

- [ ] **Step 7: Confirm the subscriber landed**

Run:

```bash
node -e "
require('dotenv').config();
const {Client}=require('pg');
(async()=>{const c=new Client({connectionString:process.env.DATABASE_URI,ssl:{rejectUnauthorized:false}});
await c.connect();
const r=await c.query(\"select email,status,source,subscribed_at from subscribers order by created_at desc limit 5\");
console.table(r.rows); await c.end();process.exit(0)})().catch(e=>{console.error(e.message);process.exit(0)})
"
```

Expected: the test signup appears with `status = 'subscribed'`.

**Note:** `.env` points at **production**. Use a disposable email for the test signup, or point `DATABASE_URI` at the staging branch (`ep-purple-night`) first.

- [ ] **Step 8: Final verification**

Run: `pnpm test:access && pnpm test:ia && pnpm lint && pnpm build`
Expected: all green.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: sweep stale template pricing copy"
```

---

## Deployment notes

Per `MEMORY.md`: `main` is **staging**, `production` is a separate curated branch. Migrations run via `migrate.yml` CI. This work lands on a feature branch off `main`; pushing to production is a separate, explicit step and is **not** part of this plan.

The `templates_all_free` migration from Task 2 must be applied before or with the deploy — otherwise existing templates keep `access_level = 'paid'` and gate on login, which is a softer failure than a crash but not the intended behaviour.
