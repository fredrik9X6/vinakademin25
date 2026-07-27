# Vinprovningar Naming + IA Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the tastings product to **Vinprovningar** across every user-facing surface, recover the ~165 people/month who arrive at `/vinprovningar` and are currently sent to the wrong product, put the gallery in the sitemap, and clear the polish items deferred from the IA branch.

**Architecture:** Copy and routing only. No Payload collection changes, therefore **no migration**. The one behavioural change — splitting the legacy `/vinprovningar` redirect by depth — goes into the existing exact-match redirect module so it is unit-tested rather than hand-rolled in middleware.

**Tech Stack:** Next.js 15 App Router, Payload CMS 3.33, Tailwind, `node:test` + `node:assert/strict` via `npx tsx --test`.

**Predecessor:** `docs/superpowers/plans/2026-07-27-tasting-information-architecture.md` (shipped, `3c12067` on production).

## Global Constraints

- Package manager is **pnpm**. Never `npm`/`yarn`.
- **Swedish for all user-facing copy.** "poäng" and "betyg" are invariant.
- No Payload collection or enum changes ⇒ **do not** run `pnpm migrate:create`.
- Payload v3 APIs only; types from `payload`, never `payload/types`. `@payloadcms/*` pinned to exact `3.33.0`.
- `npx tsc --noEmit` baseline ceiling: **75 lines**. It currently sits at exactly 75.
- `pnpm build` is the real gate. A JSX parse error makes `tsc` report **fewer** errors by bailing early — a drop in the count is a warning sign, not progress.
- Never move or prefix-match `/mina-provningar/planer/[id]` or `/mina-provningar/historik/[id]` — live-session and guest-recap URLs held by real guests.

---

## Design decisions (settled with the user, 2026-07-27)

### D1 — The product is called "Vinprovningar"

PostHog, 90 days:

| Path | Views | People | External referrals |
|---|---|---|---|
| `/vinprovningar` (root) | 284 | **165** | 123 |
| `/provningsmallar*` | 701 | 158 | 180 |
| `/vinprovningar/<slug>` | 274 | 125 | 97 |
| `/vinkurser*` | 113 | 59 | 55 |

Referrers into `/vinprovningar`: Instagram 69 people, Google 64, TikTok 10, direct 80.

The market already searches for this product using the word **vinprovning**, and more people arrive at that word than at the page that actually sells it. "Provning" standing alone is also weak Swedish — it reads as testing or a fitting — and it breaks the `Vinkurser` / `Vinlistan` sibling pattern in the nav.

Applies to every user-facing surface: nav, breadcrumbs, page titles, metadata, headings, homepage, contact form. Where a possessive form is needed, use **"Mina vinprovningar"** — consistency beats brevity, and the phrase must be checked for truncation on a narrow viewport (see Task 2 Step 6).

**Not renamed:** file names, component names, route segments, exported symbols (`ProvningarViewTabs`, `provningar-view.ts`, `/provningsmallar`). Those are internal; renaming them is churn that touches no user-visible surface and inflates the diff. This mirrors the `MinaProvningarPage` decision in the predecessor plan.

### D2 — `/vinprovningar` splits by depth

- `/vinprovningar` **exact** → `/provningsmallar` (the tastings gallery). This is the acquisition path: 165 people/month arriving from Instagram, Google and TikTok with the word "vinprovning" in mind, currently landed on the video-course catalogue.
- `/vinprovningar/<slug>` → `/vinkurser/<slug>`, unchanged. Those are genuine old course-detail URLs from before the collection was renamed, and their destination is correct.

### D3 — The gallery keeps `/provningsmallar` as its URL

Making `/vinprovningar` the canonical gallery URL would put template detail pages at `/vinprovningar/<template-slug>`, colliding head-on with the old course-slug redirect in D2. The label and the URL are allowed to differ; the collision is not worth resolving for a cosmetic gain.

---

## File Structure

**Modified — routing:**
- `src/lib/tasting-route-redirects.ts` + `.test.ts` — add the exact `/vinprovningar` rule.
- `src/middleware.ts` — narrow the legacy prefix rule to sub-paths only.

**Modified — copy:**
- `src/components/top-nav-header.tsx`, `src/components/mobile-bottom-nav.tsx`
- `src/lib/breadcrumb-trail.ts` + `.test.ts`
- `src/app/(frontend)/(site)/provningsmallar/page.tsx`
- `src/components/home/NeuralHeroWithBanner.tsx`, `ProvningsmallarFeature.tsx`, `OfferingsComparison.tsx`
- `src/app/(frontend)/(site)/kontakt/ContactForm.tsx`

**Modified — discoverability + polish:**
- `src/app/sitemap.ts`
- `src/components/tasting-template/TemplateCard.tsx`
- `src/lib/provningar-view.ts` + `.test.ts`

---

### Task 1: Split the legacy `/vinprovningar` redirect by depth

**Files:**
- Modify: `src/lib/tasting-route-redirects.ts`
- Modify: `src/lib/tasting-route-redirects.test.ts`
- Modify: `src/middleware.ts` (the legacy block currently at ~line 91)

**Interfaces:**
- Consumes: existing `resolveTastingRedirect(pathname): TastingRedirect | null`.
- Produces: no signature change — one new entry in the module's `RULES` map, and a narrowed guard in middleware.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/tasting-route-redirects.test.ts`:

```ts
// The bare /vinprovningar root is an ACQUISITION path — 165 people/90d arrive
// from Instagram, Google and TikTok searching for wine tastings, and until
// 2026-07-27 every one of them was 301'd to the video-course catalogue.
test('the bare /vinprovningar root goes to the tastings gallery', () => {
  assert.deepEqual(resolveTastingRedirect('/vinprovningar'), {
    pathname: '/provningsmallar',
    status: 301,
  })
  assert.equal(resolveTastingRedirect('/vinprovningar/')?.pathname, '/provningsmallar')
})

// Sub-paths are genuine old COURSE detail URLs from before the collection was
// renamed. They keep going to /vinkurser/<slug>, which middleware handles with
// a prefix rule — so this module must NOT claim them.
test('/vinprovningar sub-paths are left to the legacy course rule', () => {
  assert.equal(resolveTastingRedirect('/vinprovningar/grunderna-i-vin'), null)
  assert.equal(resolveTastingRedirect('/vinprovningar/nagon-kurs/recension'), null)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test:ia`
Expected: FAIL — `/vinprovningar` currently resolves to `null`.

- [ ] **Step 3: Add the rule**

In `src/lib/tasting-route-redirects.ts`, add to the `RULES` map:

```ts
  // The bare root is an acquisition path (Instagram / Google / TikTok, 165
  // people per 90d) whose visitors want tastings. Its SUB-paths are old course
  // detail URLs and are handled by the separate prefix rule in middleware —
  // deliberately not here, because this module is exact-match by design.
  '/vinprovningar': { pathname: '/provningsmallar', status: 301 },
```

- [ ] **Step 4: Narrow the legacy prefix rule in middleware**

In `src/middleware.ts`, the legacy block currently reads:

```ts
  if (pathname === '/vinprovningar' || pathname.startsWith('/vinprovningar/')) {
```

Replace that condition with a slug-requiring test, so the bare root and a lone
trailing slash both fall through to `resolveTastingRedirect`:

```ts
  // Sub-paths ONLY. The bare /vinprovningar root now routes to the tastings
  // gallery via resolveTastingRedirect (see D2) — a `startsWith('/vinprovningar/')`
  // here would also claim "/vinprovningar/", stranding that spelling on the
  // course catalogue.
  if (/^\/vinprovningar\/.+/.test(pathname)) {
```

Also update the comment block directly above it so it no longer claims the root is included.

**Do not move the block.** It must stay ahead of the `resolveTastingRedirect` call, so that sub-paths are claimed by the course rule before the exact-match module is consulted.

- [ ] **Step 5: Verify**

```bash
pnpm test:ia && pnpm lint && npx tsc --noEmit 2>&1 | wc -l
```
Expected: tests PASS, lint 0 errors, `tsc` ≤ 75.

Then `pnpm dev` and check with curl:
- `curl -sI localhost:3000/vinprovningar | grep -i location` → `/provningsmallar`
- `curl -sI localhost:3000/vinprovningar/ | grep -i location` → `/provningsmallar`
- `curl -sI localhost:3000/vinprovningar/grunderna-i-vin | grep -i location` → `/vinkurser/grunderna-i-vin`
- `curl -sI "localhost:3000/vinprovningar/nagon-kurs?lesson=5" | grep -i location` → query string preserved

- [ ] **Step 6: Commit**

```bash
git add src/lib/tasting-route-redirects.ts src/lib/tasting-route-redirects.test.ts src/middleware.ts
git commit -m "fix(seo): send /vinprovningar root to the tastings gallery

165 people/90d arrive there from Instagram, Google and TikTok looking for
tastings and were 301'd to the video-course catalogue. Sub-paths are real
old course URLs and still go to /vinkurser/<slug>."
```

---

### Task 2: Rename to "Vinprovningar" across app surfaces

**Files:**
- Modify: `src/components/top-nav-header.tsx` (`NAV_LINKS`)
- Modify: `src/components/mobile-bottom-nav.tsx` (Utforska drawer entry)
- Modify: `src/lib/breadcrumb-trail.ts`
- Modify: `src/lib/breadcrumb-trail.test.ts`
- Modify: `src/app/(frontend)/(site)/provningsmallar/page.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: no signature changes — string values only.

- [ ] **Step 1: Nav labels**

`src/components/top-nav-header.tsx`, in `NAV_LINKS`:

```tsx
  { label: 'Vinprovningar', href: '/provningsmallar' },
```

`src/components/mobile-bottom-nav.tsx`, the Utforska `DrawerLink`:

```tsx
                label="Vinprovningar"
```

- [ ] **Step 2: Breadcrumb labels**

In `src/lib/breadcrumb-trail.ts`:

- `PAGE_LABELS.provningsmallar`: `'Provningar'` → `'Vinprovningar'`
- `PAGE_LABELS['mina-provningar']`: `'Mina provningar'` → `'Mina vinprovningar'`
- `PARENT_SECTIONS['skapa-provning'].label`: `'Provningar'` → `'Vinprovningar'`

Leave `SECTION_HREF_OVERRIDES` alone — hrefs do not change.

- [ ] **Step 3: Update the breadcrumb tests**

`src/lib/breadcrumb-trail.test.ts` asserts the old labels in several places. Update every
expected label to match Step 2 — `'Provningar'` → `'Vinprovningar'` and
`'Mina provningar'` → `'Mina vinprovningar'`. Do not weaken any assertion to make it pass;
the href assertions added in the predecessor branch must stay exactly as they are.

- [ ] **Step 4: Gallery page copy**

In `src/app/(frontend)/(site)/provningsmallar/page.tsx`:

```tsx
export const metadata: Metadata = {
  title: 'Vinprovningar — Vinakademin',
  description:
    'Färdiga vinprovningar från Vinakademin — eller bygg din egen. Planera, bjud in vänner och håll provningen live.',
}
```

The `h1` (currently `{showDrafts ? 'Utkast' : 'Provningar'}`):

```tsx
          <h1 className="text-2xl font-heading">{showDrafts ? 'Utkast' : 'Vinprovningar'}</h1>
```

The subtitle under it:

```tsx
              : 'Färdiga upplägg från Vinakademin — eller bygg din egen.'}
```
stays as-is; it does not name the product.

Then the three empty states in the same file:
- `'Logga in för att se dina provningar'` → `'Logga in för att se dina vinprovningar'`
- `'Dina egna provningar sparas på ditt konto.'` → `'Dina egna vinprovningar sparas på ditt konto.'`
- `'Inga provningar än'` → `'Inga vinprovningar än'`
- `'Inga provningar matchar filtret.'` → `'Inga vinprovningar matchar filtret.'`
- `'Inga provningar än — kom tillbaka snart.'` → `'Inga vinprovningar än — kom tillbaka snart.'`

Leave `'En provning är 3–6 viner du planerar…'` as-is — that sentence defines the concept in running prose and reads better without the compound.

- [ ] **Step 5: Verify**

```bash
pnpm test:ia && pnpm lint && npx tsc --noEmit 2>&1 | wc -l
```
Expected: tests PASS (test count unchanged), lint 0 errors, `tsc` ≤ 75.

- [ ] **Step 6: Check the nav and breadcrumbs do not overflow**

"Vinprovningar" is 13 characters against the previous 10, and "Mina vinprovningar" is 18
against 15. Run `pnpm dev` and check at a 375px-wide viewport (iPhone SE):

- the desktop nav row (`md:` and up) still fits four items on one line without wrapping
- `/mina-provningar/historik` breadcrumbs render `Hem › Mina vinprovningar › Historik` without the bar overflowing horizontally

If the breadcrumb overflows on mobile, report it rather than silently shortening — the
naming decision is the user's, and the fix (truncating vs. reverting that one label to
"Mina provningar") is theirs to pick.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(copy): rename the tastings product to Vinprovningar

Nav, breadcrumbs, page title and empty states. 'Provning' alone reads as
testing/fitting in Swedish and breaks the Vinkurser/Vinlistan pattern."
```

---

### Task 3: Homepage and contact-form copy

The homepage is where the largest share of external traffic lands, and it still sells the
old "Provningsmallar" framing — including the side-by-side product explainer, which is the
single clearest statement of what the two products are.

**Files:**
- Modify: `src/components/home/NeuralHeroWithBanner.tsx:14,17`
- Modify: `src/components/home/ProvningsmallarFeature.tsx:32,35`
- Modify: `src/components/home/OfferingsComparison.tsx:26,88,91`
- Modify: `src/app/(frontend)/(site)/kontakt/ContactForm.tsx:42`

**Interfaces:**
- Consumes: nothing.
- Produces: no signature changes. Component names and file names stay (D1).

- [ ] **Step 1: Hero**

`src/components/home/NeuralHeroWithBanner.tsx`:

```tsx
      description="Färdiga vinkurser och vinprovningar att göra hemma — med vänner eller på egen hand."
```
```tsx
        { text: 'Bläddra i vinprovningar', href: '/provningsmallar' },
```

- [ ] **Step 2: Feature block**

`src/components/home/ProvningsmallarFeature.tsx`, the heading at line ~32:

```tsx
            Vinprovningar
```

and the subtitle at line ~35:

```tsx
            Färdiga upplägg — eller bygg din egen
```

That subtitle change matters: the block now links to a page that also lists the visitor's
own tastings, so "Färdiga provningsupplägg" undersells it.

- [ ] **Step 3: Product explainer**

`src/components/home/OfferingsComparison.tsx`, the heading at lines ~25-26:

```tsx
            <span className="text-brand-gradient">Vinkurs</span> eller{' '}
            <span className="text-brand-gradient">Vinprovning</span>?
```

The card heading at line ~88 and its body at ~91:

```tsx
              Var värd för en vinprovning
```
```tsx
              För dig som vill samla folk och guida en avslappnad vinprovning utan att förbereda
```

Also update the file's top JSDoc so it names the products as they are now called.

- [ ] **Step 4: Contact form**

`src/app/(frontend)/(site)/kontakt/ContactForm.tsx:42`:

```tsx
  { value: 'tasting', label: 'Vinprovningar' },
```

Keep `value: 'tasting'` unchanged — it is a stored/submitted key, not display copy, and
changing it would break any routing or reporting keyed on it.

- [ ] **Step 5: Verify**

```bash
pnpm lint && npx tsc --noEmit 2>&1 | wc -l
```
Expected: lint 0 errors, `tsc` ≤ 75.

Then `pnpm dev`, load `/` and `/kontakt`, and confirm no remaining visible instance of
"Provningsmall" or "provningsmallar" in rendered copy:

```bash
curl -s localhost:3000/ | grep -io "provningsmall[a-zä]*" | sort | uniq -c
```
Expected: no matches. (Matches inside `href="/provningsmallar"` are fine and expected —
verify any hit is a URL, not visible text.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(copy): homepage and contact form say Vinprovningar

Includes the side-by-side product explainer, the clearest statement of
what the two products are."
```

---

### Task 4: Put the gallery in the sitemap

`/provningsmallar` draws 180 external referrals per 90 days and is now the canonical
Vinprovningar surface, but `src/app/sitemap.ts` has never listed it, and template detail
pages are absent too.

**Files:**
- Modify: `src/app/sitemap.ts`

**Interfaces:**
- Consumes: the existing `STATIC_ROUTES` array and `fetchSlugs` helper.
- Produces: no signature changes beyond widening `fetchSlugs`' collection union.

- [ ] **Step 1: Add the static entry**

In `STATIC_ROUTES`, directly after the `/vinkurser` entry:

```ts
  { path: '/provningsmallar', changeFrequency: 'daily', priority: 0.9 },
```

Same priority as `/vinkurser` — they are the site's two product surfaces.

- [ ] **Step 2: Include published template detail pages**

`fetchSlugs` is typed to a fixed union of collections. Widen it to include
`'tasting-templates'`.

Templates gate publication on `publishedStatus`, **not** the `_status` field the existing
`requirePublished` option checks — passing `requirePublished` for this collection would
filter on the wrong field and silently return nothing. Add an explicit where-clause for it
instead, and emit the slugs at `/provningsmallar/<slug>` alongside the existing
`/vinkurser/<slug>` block. Follow the shape of the existing per-collection blocks in the
file, including their `try`/`catch` and logging.

Set `changeFrequency: 'weekly'`, `priority: 0.7`.

- [ ] **Step 3: Verify**

```bash
pnpm lint && npx tsc --noEmit 2>&1 | wc -l
```
Expected: lint 0 errors, `tsc` ≤ 75.

Then `pnpm dev` and:

```bash
curl -s localhost:3000/sitemap.xml | grep -c "provningsmallar"
```
Expected: at least 1 + one per published template. Spot-check that no draft template slug
appears — pick a draft from the admin and grep for its slug specifically, expecting no match.

- [ ] **Step 4: Commit**

```bash
git add src/app/sitemap.ts
git commit -m "fix(seo): add /provningsmallar and template pages to the sitemap

180 external referrals/90d to a surface that was never in the sitemap."
```

---

### Task 5: Clear the deferred polish items

Three items deferred from the IA branch's reviews, grouped because they are all small and
all touch the same surface.

**Files:**
- Modify: `src/components/tasting-template/TemplateCard.tsx`
- Modify: `src/app/(frontend)/(site)/provningsmallar/page.tsx`
- Modify: `src/lib/provningar-view.ts`
- Modify: `src/lib/provningar-view.test.ts`

**Interfaces:**
- Consumes: `ProvningarFilterState`, `buildProvningarHref` (unchanged signatures).
- Produces: no signature changes.

- [ ] **Step 1: Fix the mixed-grid stretch mismatch**

`PlanCard` returns a Fragment, so its `<Card>` is the grid item and stretches to row
height. `TemplateCard`'s grid item is its outer `<Link className="block group">`, whose
inner `<Card>` stays at content height — so in a mixed row a shorter template card leaves a
visible gap under its border.

In `src/components/tasting-template/TemplateCard.tsx`, add `h-full` to both the outer
`Link` and the `Card`:

```tsx
    <Link href={href ?? `/provningsmallar/${template.slug}`} className="block group h-full">
      <Card className="overflow-hidden hover:shadow-md transition-shadow h-full">
```

- [ ] **Step 2: Make filter feedback reachable**

In `src/app/(frontend)/(site)/provningsmallar/page.tsx`, the "Inga vinprovningar matchar
filtret." message sits behind `isEmpty`, which requires **both** lists to be empty. A user
who owns any plan can therefore never see it — so under `Alla`, applying a tag that matches
zero templates leaves their plans on screen unchanged and the click looks ignored.

Add a distinct notice, rendered above the grid when a template-only filter is active and
matched nothing but plans are still showing:

```tsx
      {wantsTemplates && (filters.tag || filters.access) && templates.length === 0 && plans.length > 0 && (
        <p className="mb-4 rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
          Inga mallar matchar filtret — visar bara dina egna vinprovningar.
        </p>
      )}
```

- [ ] **Step 3: Trim the tag in the href builder**

`buildProvningarHref` checks `tag` for truthiness but never trims, while
`parseProvningarFilters` does trim. A hand-built state with a whitespace-only tag therefore
serialises to `?tag=%20%20` and parses back to `null`.

In `src/lib/provningar-view.ts`, inside `buildProvningarHref`, replace the tag line:

```ts
  const trimmedTag = next.tag?.trim() || null
  if (trimmedTag) params.set('tag', trimmedTag)
```

- [ ] **Step 4: Add the two missing tests**

Append to `src/lib/provningar-view.test.ts`:

```ts
test('a whitespace-only tag round-trips as absent', () => {
  assert.equal(buildProvningarHref({ ...BASE, tag: '   ' }, {}), '/provningsmallar')
})

// The scoping rule must run AFTER the patch is merged, so a patch that both
// switches view and sets a now-invalid field still drops that field.
test('switching view drops a field set in the same patch', () => {
  assert.equal(
    buildProvningarHref(BASE, { view: 'mallar', showArchived: true }),
    '/provningsmallar?visa=mallar',
  )
})
```

- [ ] **Step 5: Verify**

```bash
pnpm test:ia && pnpm lint && npx tsc --noEmit 2>&1 | wc -l
```
Expected: tests PASS with 2 more than before, lint 0 errors, `tsc` ≤ 75.

Then `pnpm dev`, sign in as a user who owns at least one plan, and confirm:
- on `/provningsmallar` the plan and template cards in a mixed row are the same height
- applying a tag that matches no template shows the new notice and keeps the plans visible

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "fix(ia): grid alignment, reachable filter feedback, tag trim"
```

---

### Task 6: Gate, staging, production

**Files:** none — verify and ship.

- [ ] **Step 1: Full gate**

```bash
pnpm test:ia && pnpm test:session && \
npx tsx scripts/verify-session-draft-queue.ts && \
npx tsx scripts/verify-submission-status.ts && \
pnpm lint && npx tsc --noEmit 2>&1 | wc -l && \
git status --porcelain src/migrations/
```
Expected: all PASS, lint 0 errors, `tsc` ≤ 75, migrations output empty.

- [ ] **Step 2: Build**

```bash
pnpm build
```
Expected: success. Confirm the route table still lists `/mina-provningar/planer/[id]`,
`/handlingslista`, `/historik` and `/historik/[sessionId]`.

- [ ] **Step 3: Redirect smoke test**

With `pnpm dev` running, confirm all four:

| Request | Expected `Location` |
|---|---|
| `/vinprovningar` | `/provningsmallar` |
| `/vinprovningar/nagon-kurs` | `/vinkurser/nagon-kurs` |
| `/mina-provningar` | `/mina-vinkurser` |
| `/mina-provningar/planer` | `/provningsmallar?visa=mina` |

And confirm `/mina-provningar/planer/123` still resolves rather than redirecting.

- [ ] **Step 4: Push to staging**

```bash
git push origin main
```

- [ ] **Step 5: Stop and hand back**

Do **not** push to production. Report to the user that staging is updated, list the URLs to
check, and let them decide when it goes live — the production release is applied as a
curated `release:` commit on the `production` branch, which is the user's call to trigger.

---

## Notes for the implementer

**No migration.** Nothing here touches a collection or enum.

**`value: 'tasting'` in the contact form is a key, not copy.** Only its `label` changes.

**Do not rename files, components, or route segments.** `ProvningsmallarFeature`,
`provningar-view.ts`, `ProvningarViewTabs` and `/provningsmallar` all stay. Only
user-visible strings change (D1).

**`pnpm build` outranks `tsc`.** A drop in the `tsc` line count below 75 means a parse error
made it bail early, not that things improved.

## Deliberately out of scope

Recorded so nobody re-derives them as gaps:

- **The redirect module's double-trailing-slash edge** (`/mina-provningar//`) falls through to `null`. It fails safe, and Next normalises before it matters.
- **Query cost on the gallery** — the tag-count union fetches 200 full docs, `draftCount` is queried even while already viewing drafts, and the tag union is computed over published templates even under `showDrafts`. All pre-existing, all cheap at current traffic.
- **Discoverability of "Mina"** — the account dropdown no longer links a user's own tastings at all, so reaching them is now Vinprovningar → Mina, two extra taps on mobile. That was intentional (predecessor spec D4), but it is worth watching the `provningar_view_changed` event before deciding it was right.
