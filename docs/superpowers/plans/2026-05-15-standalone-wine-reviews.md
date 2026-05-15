# Standalone Wine Reviews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standalone "review a wine" flow for members outside tasting sessions, with private-by-default storage and opt-in publishing to public profile.

**Architecture:** Pure composition over existing pieces — `WinePicker`, `WineReviewForm`, `/api/reviews`, `Reviews` collection. One additive `publishedToProfile` field + one access-rule extension. Five new Next.js page routes + one shared list-item component.

**Tech Stack:** Next.js 15 App Router (RSC), Payload CMS 3.33, Postgres, Shadcn UI, Tailwind. No tests in this codebase — verification is `pnpm build` + manual browser checks.

**Verification convention:** Every task ends with `pnpm build` (must be green) and where relevant `pnpm generate:types`. Manual UI verification on `pnpm dev` against staging-equivalent locally (note: `.env` points to PROD per `[[neon-databases]]` memory — be deliberate when testing).

**Spec:** `docs/superpowers/specs/2026-05-15-standalone-wine-reviews-design.md`

---

## File structure

**Created:**
- `src/migrations/<auto-timestamp>_add_review_published_to_profile.{ts,json}` — adds boolean column
- `src/app/(frontend)/(site)/recensera-vin/page.tsx` — standalone create flow
- `src/app/(frontend)/(site)/mina-recensioner/page.tsx` — member's own review list
- `src/app/(frontend)/(site)/mina-recensioner/[id]/page.tsx` — view/edit single review
- `src/app/(frontend)/(site)/profil/[handle]/recensioner/page.tsx` — public listing
- `src/app/(frontend)/(site)/profil/[handle]/recension/[id]/page.tsx` — public detail
- `src/components/wine-review/WineReviewListItem.tsx` — shared card

**Modified:**
- `src/collections/Reviews.ts` — add field + extend access.read
- `src/components/course/WineReviewForm.tsx` — accept `initialReview`, add publish toggle, support `standalone` mode that skips comparison
- `src/app/(frontend)/(site)/vinlistan/[slug]/page.tsx` — add CTA in hero area
- `src/components/top-nav-header.tsx` — add "Mina recensioner" `DropdownMenuItem` in account menu

---

## Task 1: Schema field + access rule + migration

**Files:**
- Modify: `src/collections/Reviews.ts`
- Create: `src/migrations/<auto>_add_review_published_to_profile.{ts,json}`
- Auto-modify: `src/migrations/index.ts`, `src/payload-types.ts`

- [ ] **Step 1: Add `publishedToProfile` checkbox field to `Reviews.ts`**

Insert this field block right after the `isTrusted` field (around line 393–407 in the current `Reviews.ts`):

```ts
{
  name: 'publishedToProfile',
  type: 'checkbox',
  label: 'Publicera på min profil',
  defaultValue: false,
  admin: {
    description:
      "When checked, this review appears on the owner's /profil/<handle>/recensioner page (only when the owner's profile is also public).",
    position: 'sidebar',
  },
  access: {
    // Allow form building, enforced at collection level
    read: () => true,
    update: () => true,
  },
},
```

- [ ] **Step 2: Extend `Reviews.access.read` to honor publishedToProfile**

Replace the existing `read` function (lines 17–28 in `Reviews.ts`) with:

```ts
read: ({ req }) => {
  if (req.user?.role === 'admin' || req.user?.role === 'instructor') return true
  const publishedClause = {
    and: [
      { publishedToProfile: { equals: true } },
      { 'user.profilePublic': { equals: true } },
    ],
  }
  if (req.user) {
    return {
      or: [
        { user: { equals: req.user.id } },
        { isTrusted: { equals: true } },
        publishedClause,
      ],
    } as any
  }
  return { or: [{ isTrusted: { equals: true } }, publishedClause] } as any
},
```

- [ ] **Step 3: Generate the migration**

Run: `pnpm migrate:create -- "add_review_published_to_profile"`

Expected output:
```
INFO: Migration created at /Users/fredrik/dev/vinakademin25/src/migrations/<timestamp>_add_review_published_to_profile.ts
```

- [ ] **Step 4: Verify the generated SQL is just the additive column**

Read the new `.ts` file. The `up()` body should contain only:
```sql
ALTER TABLE "reviews" ADD COLUMN "published_to_profile" boolean DEFAULT false;
```

If it contains anything else (constraints, drops, other tables), STOP and inspect — something in the Reviews access rule edit may have inadvertently changed schema. Roll back the field/access changes and try again.

- [ ] **Step 5: Apply migration to current DB (default = prod via .env)**

Run: `pnpm migrate`

Expected: `Migrated: <timestamp>_add_review_published_to_profile (XXms)` and `Done.`

- [ ] **Step 6: Apply migration to staging DB too**

Run:
```bash
DATABASE_URI="postgresql://neondb_owner:npg_Eb7p4jxYzmrF@ep-purple-night-a29kjy8j-pooler.eu-central-1.aws.neon.tech/vinakademin?sslmode=require&channel_binding=require" pnpm migrate
```

Expected: same migrated-OK output.

- [ ] **Step 7: Regenerate types**

Run: `pnpm generate:types`

Expected: success, no errors. Verify the new field appears in `src/payload-types.ts`:
```bash
grep -n "publishedToProfile" src/payload-types.ts
```
Should show entries in the `Review` interface and `ReviewsSelect`.

- [ ] **Step 8: Build smoke**

Run: `pnpm build`

Expected: build green, no type errors.

- [ ] **Step 9: Commit**

```bash
git add src/collections/Reviews.ts src/migrations src/payload-types.ts
git commit -m "otter: Reviews — publishedToProfile field + access rule extension"
```

---

## Task 2: Modify `WineReviewForm` to support standalone mode

**Files:**
- Modify: `src/components/course/WineReviewForm.tsx`

We add three things: an `initialReview` prop that pre-populates state on mount, a `standalone` mode flag that disables session/comparison logic, and a `publishedToProfile` field exposed in the footer.

- [ ] **Step 1: Extend the props interface**

Find the `WineReviewFormProps` interface (around line 34). Add these three optional fields:

```ts
interface WineReviewFormProps {
  lessonId: number
  courseId?: number
  sessionId?: string
  onSubmit?: () => void
  wineIdProp?: number | string
  customWineSnapshot?: CustomWineSnapshot
  insideDialog?: boolean
  /**
   * When provided, the form mounts in "edit" mode — populates state from this
   * review on first render. Used by /mina-recensioner/[id].
   */
  initialReview?: ReviewDoc | null
  /**
   * Standalone mode (no session, no lesson). Skips the answer-key fetch,
   * the participant-cookie logic, and the post-submit comparison view.
   * Caller is responsible for redirecting via `onSubmit`.
   */
  standalone?: boolean
}
```

- [ ] **Step 2: Add `publishedToProfile` state**

Below the existing state declarations (around line 69–110), add:

```ts
const [publishedToProfile, setPublishedToProfile] = React.useState<boolean>(
  initialReview?.publishedToProfile ?? false,
)
```

Add `initialReview` and `standalone` to the destructured props at the top of the component:

```ts
export function WineReviewForm({
  lessonId,
  courseId,
  sessionId,
  onSubmit,
  wineIdProp,
  customWineSnapshot,
  insideDialog = false,
  initialReview,
  standalone = false,
}: WineReviewFormProps) {
```

- [ ] **Step 3: Hydrate state from `initialReview` on mount**

Right after the `populateFormWithReview` definition (it currently ends around line 253), add:

```ts
const initialReviewRef = React.useRef<ReviewDoc | null>(initialReview ?? null)
React.useEffect(() => {
  if (initialReviewRef.current) {
    populateFormWithReview(initialReviewRef.current)
    setSubmittedReview(null) // don't go straight to "submitted" UI; show editable form
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

- [ ] **Step 4: Skip answer-key + history fetches in standalone mode**

In the existing `fetchAnswerKey` function (around line 115), make it a no-op when standalone:

```ts
const fetchAnswerKey = React.useCallback(async () => {
  if (standalone) return
  // Plan-driven sessions pass lessonId=0 sentinel (no underlying lesson). Skip the fetch.
  if (!lessonId) return
  // ...existing body unchanged
}, [lessonId, standalone])
```

In `fetchLatestSubmission` (around line 137), add at the top:

```ts
const fetchLatestSubmission = React.useCallback(async () => {
  if (standalone) return
  if (!wineId) return
  // ...existing body unchanged
}, [wineId, user?.id, participantId, standalone])
```

- [ ] **Step 5: Preserve session context when editing + include `publishedToProfile`**

In `handleSubmit` (around line 375), find the section where `sessionIdNum` and `participantIdNum` are derived (around lines 426–427). Right after those lines, add:

```ts
// When editing an existing review (initialReview), preserve its session
// context. Otherwise editing a session review via /mina-recensioner/[id]
// would lose the session/participant, breaking the dedup key and creating
// a duplicate row instead of updating.
const effectiveSessionId =
  initialReview?.session != null
    ? typeof initialReview.session === 'object'
      ? (initialReview.session as any).id
      : initialReview.session
    : sessionIdNum
const effectiveParticipantId =
  initialReview?.sessionParticipant != null
    ? typeof initialReview.sessionParticipant === 'object'
      ? (initialReview.sessionParticipant as any).id
      : initialReview.sessionParticipant
    : participantIdNum
```

Then find the `body: JSON.stringify({...` block (around line 438). Replace its `session` and `sessionParticipant` fields and add `publishedToProfile`:

```ts
body: JSON.stringify({
  ...wineIdentity,
  rating,
  buyAgain,
  reviewText: notes,
  publishedToProfile,
  session: effectiveSessionId || undefined,
  sessionParticipant: effectiveParticipantId || undefined,
  wsetTasting: { /* unchanged */ },
}),
```

Also extend `ReviewDoc` (Step 8) to make `session` and `sessionParticipant` typed:

```ts
type ReviewDoc = {
  id: number | string
  rating?: number
  reviewText?: any
  wsetTasting?: any
  buyAgain?: boolean
  createdAt?: string
  user?: number | { id: number }
  session?: number | { id: number } | null
  sessionParticipant?: number | { id: number } | null
  customWine?: any
  publishedToProfile?: boolean
}
```

- [ ] **Step 6: Skip the post-submit comparison view in standalone mode**

Find the comparison-view return blocks (around lines 514 and 555 — `if (submittedReview && sessionId)` and `if (submittedReview && !sessionId)`). Wrap both with a `!standalone` guard so standalone mode never renders them — the parent route handles the redirect via `onSubmit`:

```ts
if (!standalone && submittedReview && sessionId) {
  return ( /* existing group-session success card */ )
}

if (!standalone && submittedReview && !sessionId) {
  return ( /* existing single-session comparison view */ )
}
```

- [ ] **Step 7: Render the publish toggle in the footer**

Find the footer row at the bottom of the form (around line 1190 — the `<div className="flex flex-col md:flex-row items-center justify-between gap-4">` containing the `buyAgain` checkbox and submit button). Add a second checkbox between the `buyAgain` block and the submit button:

```tsx
<div className="flex items-center space-x-2 p-4 bg-muted/30 rounded-lg w-full md:w-auto">
  <Checkbox
    id="publishedToProfile"
    checked={publishedToProfile}
    onCheckedChange={(checked) => setPublishedToProfile(checked as boolean)}
  />
  <label
    htmlFor="publishedToProfile"
    className="text-sm font-medium leading-none cursor-pointer"
  >
    Publicera på min profil
  </label>
</div>
```

- [ ] **Step 8: Confirm `ReviewDoc` type updated**

This was already updated in Step 5 above. Verify the type declaration at the top of the file (around line 49) now has the extended fields. No further change needed in this step.

- [ ] **Step 9: Build smoke**

Run: `pnpm build`

Expected: build green, no errors. The form file should compile cleanly with all the new optional props.

- [ ] **Step 10: Commit**

```bash
git add src/components/course/WineReviewForm.tsx
git commit -m "otter: WineReviewForm — initialReview + standalone mode + publish toggle"
```

---

## Task 3: Create `/recensera-vin` standalone create route

**Files:**
- Create: `src/app/(frontend)/(site)/recensera-vin/page.tsx`

This route handles two paths:
- `?wine=<id>` → mount form directly with `wineIdProp`, picker hidden
- no params → mount `WinePicker`, then on pick switch to form with appropriate snapshot/id

- [ ] **Step 1: Create the page file**

```tsx
'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { WinePicker, type CustomWineInput, type LibraryWineResult } from '@/components/tasting-plan/WinePicker'
import { WineReviewForm } from '@/components/course/WineReviewForm'

function RecenseraVinInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialWineIdParam = searchParams.get('wine')
  const initialWineId = initialWineIdParam ? Number(initialWineIdParam) : null

  const [picked, setPicked] = useState<
    | { kind: 'library'; wineId: number }
    | { kind: 'custom'; snapshot: CustomWineInput }
    | null
  >(initialWineId && !Number.isNaN(initialWineId) ? { kind: 'library', wineId: initialWineId } : null)

  function pickLibrary(w: LibraryWineResult) {
    setPicked({ kind: 'library', wineId: w.id })
  }

  function pickCustom(w: CustomWineInput) {
    setPicked({ kind: 'custom', snapshot: w })
  }

  const handleReviewSubmitted = (newReviewId?: number | string) => {
    // The form's onSubmit doesn't receive the new id today; we rely on the
    // form's `submittedReview` state internally. For the redirect, we'd need
    // to extend onSubmit. For v1, redirect to the listing.
    router.push('/mina-recensioner')
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <header>
        <h1 className="text-2xl font-heading">Recensera vin</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Skriv ner dina intryck av ett vin du druckit.
        </p>
      </header>

      {!picked && (
        <Card>
          <CardContent className="p-6">
            <WinePicker onPickLibrary={pickLibrary} onPickCustom={pickCustom} />
          </CardContent>
        </Card>
      )}

      {picked && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setPicked(null)}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            ← Välj ett annat vin
          </button>
          <Card>
            <CardContent className="p-6">
              <WineReviewForm
                lessonId={0}
                standalone
                {...(picked.kind === 'library'
                  ? { wineIdProp: picked.wineId }
                  : {
                      customWineSnapshot: {
                        name: picked.snapshot.name,
                        producer: picked.snapshot.producer,
                        vintage: picked.snapshot.vintage,
                        type: picked.snapshot.type,
                        systembolagetUrl: picked.snapshot.systembolagetUrl,
                        priceSek: picked.snapshot.priceSek,
                        systembolagetProductNumber: picked.snapshot.systembolagetProductNumber,
                        imageUrl: picked.snapshot.imageUrl,
                      },
                    })}
                onSubmit={() => handleReviewSubmitted()}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default function RecenseraVinPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-8">Laddar…</div>}>
      <RecenseraVinInner />
    </Suspense>
  )
}
```

Note: `useSearchParams` requires `Suspense` boundary in Next.js 15.

- [ ] **Step 2: Add an auth guard via middleware behaviour (no code needed — the existing middleware handles unauthenticated routes through `/api/reviews` 401)**

Actually, since the form posts to `/api/reviews` which 401s without auth, an unauthenticated user gets stuck. Add an early auth check by making the outer wrapper server-rendered:

Replace the file with a hybrid: server component that gates auth + redirects, and inner client component for state. Update `page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/get-user'
import { RecenseraVinClient } from './RecenseraVinClient'

export const metadata = {
  title: 'Recensera vin — Vinakademin',
}

export const dynamic = 'force-dynamic'

export default async function RecenseraVinPage() {
  const user = await getUser()
  if (!user) redirect('/logga-in?from=/recensera-vin')
  return <RecenseraVinClient />
}
```

- [ ] **Step 3: Move the client component into its own file**

Create `src/app/(frontend)/(site)/recensera-vin/RecenseraVinClient.tsx` with the inner content (everything from Step 1 except the default export wrapper, and renamed to `RecenseraVinClient`):

```tsx
'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { WinePicker, type CustomWineInput, type LibraryWineResult } from '@/components/tasting-plan/WinePicker'
import { WineReviewForm } from '@/components/course/WineReviewForm'

function RecenseraVinInner() {
  // ...exact body from Step 1's RecenseraVinInner...
}

export function RecenseraVinClient() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-8">Laddar…</div>}>
      <RecenseraVinInner />
    </Suspense>
  )
}
```

- [ ] **Step 4: Build smoke**

Run: `pnpm build`

Expected: build green; the new route appears in the route list.

Confirm: `grep "/recensera-vin" .next/types/routes.d.ts`

- [ ] **Step 5: Manual smoke (optional but recommended)**

Run `pnpm dev`. Visit `/recensera-vin` (logged out → redirect to login). Log in. Visit again — picker should render. Pick a wine via Systembolaget tab → form should render. Submit → redirected to `/mina-recensioner` (which doesn't exist yet — 404 expected at this stage, will be fixed in Task 4).

- [ ] **Step 6: Commit**

```bash
git add src/app/\(frontend\)/\(site\)/recensera-vin
git commit -m "otter: page — /recensera-vin standalone review create flow"
```

---

## Task 4: Create `/mina-recensioner` member listing route

**Files:**
- Create: `src/app/(frontend)/(site)/mina-recensioner/page.tsx`
- Create: `src/components/wine-review/WineReviewListItem.tsx`

Pattern mirrors `src/app/(frontend)/(site)/mina-provningar/planer/page.tsx` exactly.

- [ ] **Step 1: Create the shared list-item component**

Create `src/components/wine-review/WineReviewListItem.tsx`:

```tsx
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Review, Wine, Media } from '@/payload-types'

export interface WineReviewListItemProps {
  review: Review
  /** When set, the card is a link to this href. Otherwise rendered as a static card. */
  href?: string
  /** Show the "Publicerad" badge. Defaults to true. */
  showPublishedBadge?: boolean
}

function reviewWineTitle(r: Review): string {
  if (r.wine && typeof r.wine === 'object') {
    return (r.wine as Wine).name || `Vin #${(r.wine as Wine).id}`
  }
  return (r.customWine as any)?.name || 'Vin'
}

function reviewWineSubtitle(r: Review): string {
  if (r.wine && typeof r.wine === 'object') {
    const w = r.wine as Wine
    const parts = [w.winery, w.vintage].filter(Boolean)
    return parts.join(' · ')
  }
  const c = (r.customWine as any) || {}
  const parts = [c.producer, c.vintage].filter(Boolean)
  return parts.join(' · ')
}

function reviewThumbnailUrl(r: Review): string | null {
  if (r.wine && typeof r.wine === 'object') {
    const img = (r.wine as Wine).image
    if (typeof img === 'object' && img) {
      const m = img as Media
      return m.sizes?.thumbnail?.url ?? m.url ?? null
    }
  }
  return (r.customWine as any)?.imageUrl ?? null
}

export function WineReviewListItem({ review, href, showPublishedBadge = true }: WineReviewListItemProps) {
  const title = reviewWineTitle(review)
  const subtitle = reviewWineSubtitle(review)
  const thumb = reviewThumbnailUrl(review)
  const rating = (review as any).rating as number | undefined
  const date = review.createdAt ? new Date(review.createdAt).toLocaleDateString('sv-SE') : null

  const content = (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="w-14 h-14 rounded-md overflow-hidden bg-muted/40 flex-shrink-0">
          {thumb ? (
            <Image src={thumb} alt="" width={56} height={56} className="object-contain w-full h-full p-1" />
          ) : null}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{title}</p>
            {showPublishedBadge && review.publishedToProfile && (
              <Badge variant="secondary">Publicerad</Badge>
            )}
          </div>
          {subtitle && <p className="text-sm text-muted-foreground truncate">{subtitle}</p>}
          <div className="flex items-center gap-3 mt-1">
            {typeof rating === 'number' && (
              <span className="text-brand-400 text-sm tracking-wider">
                {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}
              </span>
            )}
            {date && <span className="text-xs text-muted-foreground">{date}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return href ? <Link href={href}>{content}</Link> : content
}
```

- [ ] **Step 2: Create the listing page**

Create `src/app/(frontend)/(site)/mina-recensioner/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import type { Review } from '@/payload-types'
import { WineReviewListItem } from '@/components/wine-review/WineReviewListItem'

export const metadata: Metadata = {
  title: 'Mina recensioner — Vinakademin',
  description: 'Dina vinrecensioner.',
}

export const dynamic = 'force-dynamic'

export default async function MinaRecensionerPage() {
  const user = await getUser()
  if (!user) redirect('/logga-in?from=/mina-recensioner')

  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'reviews',
    where: { user: { equals: user.id } },
    sort: '-createdAt',
    limit: 200,
    depth: 2, // resolve wine + media for thumbnails
  })
  const reviews = docs as Review[]

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading">Mina recensioner</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dina vinrecensioner. Privata som standard — publicera enskilda till din profil.
          </p>
        </div>
        <Button asChild>
          <Link href="/recensera-vin">
            <Plus className="h-4 w-4 mr-2" />
            Recensera vin
          </Link>
        </Button>
      </header>

      {reviews.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Inga recensioner än.</p>
            <Button asChild className="mt-4">
              <Link href="/recensera-vin">Skriv din första recension</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id}>
              <WineReviewListItem review={r} href={`/mina-recensioner/${r.id}`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

Add the missing imports at top: `import { Card, CardContent } from '@/components/ui/card'`

- [ ] **Step 3: Build smoke**

Run: `pnpm build`

Expected: build green. New route `/mina-recensioner` registered.

- [ ] **Step 4: Manual smoke**

Run `pnpm dev`. Log in. Visit `/mina-recensioner` — see list of your existing reviews (from the DB; most likely many since the codebase has 106+ reviews). Click one → goes to `/mina-recensioner/<id>` → 404 expected at this stage (fixed in Task 5).

- [ ] **Step 5: Commit**

```bash
git add src/components/wine-review src/app/\(frontend\)/\(site\)/mina-recensioner/page.tsx
git commit -m "otter: page — /mina-recensioner listing + WineReviewListItem"
```

---

## Task 5: Create `/mina-recensioner/[id]` view/edit route

**Files:**
- Create: `src/app/(frontend)/(site)/mina-recensioner/[id]/page.tsx`

- [ ] **Step 1: Create the edit page**

Create the file:

```tsx
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { Card, CardContent } from '@/components/ui/card'
import type { Review } from '@/payload-types'
import { EditReviewClient } from './EditReviewClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  return { title: `Recension #${id} — Vinakademin` }
}

export default async function EditReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getUser()
  if (!user) {
    const { id } = await params
    redirect(`/logga-in?from=/mina-recensioner/${id}`)
  }

  const { id } = await params
  const reviewId = Number(id)
  if (!Number.isInteger(reviewId)) notFound()

  const payload = await getPayload({ config })
  let review: Review | null = null
  try {
    review = (await payload.findByID({
      collection: 'reviews',
      id: reviewId,
      depth: 2,
      overrideAccess: false,
      user,
    })) as Review
  } catch {
    notFound()
  }

  // Defense in depth — payload's access already filters, but double-check owner
  const ownerId = typeof review.user === 'object' ? (review.user as any)?.id : review.user
  if (ownerId !== user.id && user.role !== 'admin') notFound()

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
      <Link
        href="/mina-recensioner"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Mina recensioner
      </Link>
      <Card>
        <CardContent className="p-6">
          <EditReviewClient review={review} />
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Create the client wrapper that mounts the form**

Create `src/app/(frontend)/(site)/mina-recensioner/[id]/EditReviewClient.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import type { Review, Wine } from '@/payload-types'
import { WineReviewForm } from '@/components/course/WineReviewForm'

interface EditReviewClientProps {
  review: Review
}

export function EditReviewClient({ review }: EditReviewClientProps) {
  const router = useRouter()

  const wine = review.wine
  const wineId = typeof wine === 'object' ? (wine as Wine).id : wine
  const customWine = (review as any).customWine

  return (
    <WineReviewForm
      lessonId={0}
      standalone
      initialReview={review as any}
      {...(wineId
        ? { wineIdProp: wineId as number }
        : customWine?.name
          ? {
              customWineSnapshot: {
                name: customWine.name,
                producer: customWine.producer,
                vintage: customWine.vintage,
                type: customWine.type,
                systembolagetUrl: customWine.systembolagetUrl,
                priceSek: customWine.priceSek,
                systembolagetProductNumber: customWine.systembolagetProductNumber,
                imageUrl: customWine.imageUrl,
              },
            }
          : {})}
      onSubmit={() => router.push('/mina-recensioner')}
    />
  )
}
```

- [ ] **Step 3: Build smoke**

Run: `pnpm build`

Expected: build green. Route `/mina-recensioner/[id]` registered.

- [ ] **Step 4: Manual smoke**

Run `pnpm dev`. Log in. From `/mina-recensioner`, click a review → form should mount pre-populated with that review's data (rating, WSET fields, notes, publish toggle reflecting current state). Edit something, save → redirects back to listing.

- [ ] **Step 5: Commit**

```bash
git add 'src/app/(frontend)/(site)/mina-recensioner/[id]'
git commit -m "otter: page — /mina-recensioner/[id] view/edit single review"
```

---

## Task 6: Add CTA to `/vinlistan/[slug]` above the fold

**Files:**
- Modify: `src/app/(frontend)/(site)/vinlistan/[slug]/page.tsx`

- [ ] **Step 1: Locate the wine-header / hero section**

Run: `grep -n "winery\|name\|h1\|hero\|<header" 'src/app/(frontend)/(site)/vinlistan/[slug]/page.tsx' | head -20`

Find the JSX block that renders the wine's name + winery — that's where the CTA goes. The hero typically lives near the top of the returned JSX with the image and title.

- [ ] **Step 2: Add the button next to the title**

Wrap the wine title in a flex container that includes the CTA:

```tsx
import { Button } from '@/components/ui/button' // ensure imported
import { getUser } from '@/lib/get-user' // ensure imported

// At the top of the default export's body, before the existing fetch:
const user = await getUser()

// In the hero/header JSX, alongside the title:
{user && (
  <Button asChild size="lg" className="mt-4">
    <Link href={`/recensera-vin?wine=${wine.id}`}>
      Recensera detta vin
    </Link>
  </Button>
)}
```

The exact placement depends on the existing structure — put it directly under the wine name and winery, before the description. If the page is server-rendered with no JSX flow control today, ensure the auth check is awaited inline.

- [ ] **Step 3: Build smoke**

Run: `pnpm build`

Expected: green.

- [ ] **Step 4: Manual smoke**

Run `pnpm dev`. Visit `/vinlistan/<some-slug>` while logged out — button should not appear. Log in — button appears, clicking it goes to `/recensera-vin?wine=<id>` with the form pre-loaded with that wine.

- [ ] **Step 5: Commit**

```bash
git add 'src/app/(frontend)/(site)/vinlistan/[slug]/page.tsx'
git commit -m "otter: vinlistan/[slug] — Recensera detta vin CTA"
```

---

## Task 7: Add "Mina recensioner" link to account menu

**Files:**
- Modify: `src/components/top-nav-header.tsx`

- [ ] **Step 1: Find the existing account menu items**

Run: `grep -n "Mina Provningar\|mina-provningar" src/components/top-nav-header.tsx`

Locate the `DropdownMenuItem` block that renders the "Mina Provningar" link (around line 137 in the current file).

- [ ] **Step 2: Add the "Mina recensioner" item right after**

Mirror the surrounding pattern. The new item should look like:

```tsx
<DropdownMenuItem asChild>
  <Link href="/mina-recensioner" className="cursor-pointer">
    <Wine className="mr-2 h-4 w-4" />
    Mina recensioner
  </Link>
</DropdownMenuItem>
```

Verify `Wine` (lucide-react icon) is already imported at the top of the file. If not, add to the imports. If a different icon convention is used in the existing items (e.g. all icons might be omitted, or another lucide icon may already be in use), match that convention exactly.

- [ ] **Step 3: Build smoke**

Run: `pnpm build`

Expected: green.

- [ ] **Step 4: Manual smoke**

Run `pnpm dev`. Log in. Click your avatar in the top nav → dropdown opens → "Mina recensioner" link present, navigates to `/mina-recensioner`.

- [ ] **Step 5: Commit**

```bash
git add src/components/top-nav-header.tsx
git commit -m "otter: top-nav — Mina recensioner in account menu"
```

---

## Task 8: Public `/profil/[handle]/recensioner` listing

**Files:**
- Create: `src/app/(frontend)/(site)/profil/[handle]/recensioner/page.tsx`

- [ ] **Step 1: Inspect existing profile page pattern for handle → user resolution**

Run: `find 'src/app/(frontend)/(site)/profil' -type f -name "page.tsx"` and read the `[handle]/page.tsx` file. Note how it resolves the `handle` route param to a user document. We need the same logic.

- [ ] **Step 2: Create the listing page**

Create `src/app/(frontend)/(site)/profil/[handle]/recensioner/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Review, User } from '@/payload-types'
import { WineReviewListItem } from '@/components/wine-review/WineReviewListItem'

export const dynamic = 'force-dynamic'

async function loadHandle(handle: string): Promise<User | null> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'users',
    where: { handle: { equals: handle } },
    limit: 1,
    overrideAccess: true,
  })
  return (docs[0] as User) ?? null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>
}): Promise<Metadata> {
  const { handle } = await params
  const user = await loadHandle(handle)
  if (!user) return { title: 'Profil saknas — Vinakademin' }
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.handle
  return {
    title: `${name}'s recensioner — Vinakademin`,
    description: `Publicerade vinrecensioner av ${name}.`,
  }
}

export default async function ProfilRecensionerPage({
  params,
}: {
  params: Promise<{ handle: string }>
}) {
  const { handle } = await params
  const profileUser = await loadHandle(handle)
  if (!profileUser || !(profileUser as any).profile_public) notFound()

  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'reviews',
    where: {
      and: [
        { user: { equals: profileUser.id } },
        { publishedToProfile: { equals: true } },
      ],
    },
    sort: '-createdAt',
    limit: 200,
    depth: 2,
    overrideAccess: true, // we've already gated on profile_public + publishedToProfile
  })
  const reviews = docs as Review[]
  const displayName = [profileUser.firstName, profileUser.lastName].filter(Boolean).join(' ') || profileUser.handle

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <Link
          href={`/profil/${handle}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {displayName}
        </Link>
        <h1 className="text-2xl font-heading mt-2">Recensioner av {displayName}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {reviews.length} publicerad{reviews.length === 1 ? '' : 'e'} recension
          {reviews.length === 1 ? '' : 'er'}.
        </p>
      </header>

      {reviews.length === 0 ? (
        <p className="text-muted-foreground">Inga publicerade recensioner än.</p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id}>
              <WineReviewListItem
                review={r}
                href={`/profil/${handle}/recension/${r.id}`}
                showPublishedBadge={false}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Build smoke**

Run: `pnpm build`

Expected: green.

- [ ] **Step 4: Manual smoke**

Run `pnpm dev`. Pick a user handle that has `profile_public=true` and at least one review with `publishedToProfile=true`. Visit `/profil/<handle>/recensioner`. The listing renders. Try logged out — same result (public). Try a handle with `profile_public=false` — 404.

- [ ] **Step 5: Commit**

```bash
git add 'src/app/(frontend)/(site)/profil/[handle]/recensioner'
git commit -m "otter: page — public /profil/[handle]/recensioner listing"
```

---

## Task 9: Public `/profil/[handle]/recension/[id]` detail

**Files:**
- Create: `src/app/(frontend)/(site)/profil/[handle]/recension/[id]/page.tsx`

Renders the full WSET tasting notes for a single published review. Read-only.

- [ ] **Step 1: Create the detail page**

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { Card, CardContent } from '@/components/ui/card'
import type { Review, User, Wine, Media } from '@/payload-types'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

async function loadHandle(handle: string): Promise<User | null> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'users',
    where: { handle: { equals: handle } },
    limit: 1,
    overrideAccess: true,
  })
  return (docs[0] as User) ?? null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string; id: string }>
}): Promise<Metadata> {
  const { handle, id } = await params
  return { title: `Recension #${id} av ${handle} — Vinakademin` }
}

export default async function PublicReviewDetailPage({
  params,
}: {
  params: Promise<{ handle: string; id: string }>
}) {
  const { handle, id } = await params
  const profileUser = await loadHandle(handle)
  if (!profileUser || !(profileUser as any).profile_public) notFound()

  const reviewId = Number(id)
  if (!Number.isInteger(reviewId)) notFound()

  const payload = await getPayload({ config })
  let review: Review | null = null
  try {
    review = (await payload.findByID({
      collection: 'reviews',
      id: reviewId,
      depth: 2,
      overrideAccess: true,
    })) as Review
  } catch {
    notFound()
  }
  if (!review) notFound()

  const ownerId = typeof review.user === 'object' ? (review.user as any)?.id : review.user
  if (ownerId !== profileUser.id) notFound()
  if (!review.publishedToProfile) notFound()

  const wine = review.wine
  const wineObj = typeof wine === 'object' ? (wine as Wine) : null
  const custom: any = (review as any).customWine || {}
  const title = wineObj?.name || custom.name || 'Vin'
  const subtitle = wineObj
    ? [wineObj.winery, wineObj.vintage].filter(Boolean).join(' · ')
    : [custom.producer, custom.vintage].filter(Boolean).join(' · ')
  const image = wineObj?.image
  const thumbUrl =
    typeof image === 'object' && image
      ? (image as Media).url ?? null
      : custom.imageUrl || null
  const rating = (review as any).rating as number | undefined
  const wset: any = (review as any).wsetTasting || {}
  const reviewText = (review as any).reviewText as string | undefined
  const authorDisplay =
    (review as any).authorDisplayName ||
    [profileUser.firstName, profileUser.lastName].filter(Boolean).join(' ') ||
    profileUser.handle

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <Link
        href={`/profil/${handle}/recensioner`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Recensioner av {authorDisplay}
      </Link>

      <Card>
        <CardContent className="p-6 flex gap-4 items-start">
          <div className="w-24 h-24 rounded-md bg-muted/40 overflow-hidden flex-shrink-0">
            {thumbUrl && (
              <Image
                src={thumbUrl}
                alt=""
                width={96}
                height={96}
                className="w-full h-full object-contain p-1"
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-heading">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            {typeof rating === 'number' && (
              <p className="text-brand-400 text-lg tracking-wider mt-2">
                {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">av {authorDisplay}</p>
          </div>
        </CardContent>
      </Card>

      {/* WSET tasting notes — render only sections that have content */}
      {wset.appearance && (wset.appearance.clarity || wset.appearance.intensity || wset.appearance.color) && (
        <Card>
          <CardContent className="p-6">
            <h2 className="font-heading text-lg mb-2">Utseende</h2>
            <dl className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm">
              {wset.appearance.clarity && (<><dt className="text-muted-foreground">Klarhet</dt><dd className="col-span-2">{wset.appearance.clarity}</dd></>)}
              {wset.appearance.intensity && (<><dt className="text-muted-foreground">Intensitet</dt><dd className="col-span-2">{wset.appearance.intensity}</dd></>)}
              {wset.appearance.color && (<><dt className="text-muted-foreground">Färg</dt><dd className="col-span-2">{wset.appearance.color}</dd></>)}
            </dl>
          </CardContent>
        </Card>
      )}

      {wset.nose && (wset.nose.intensity || (wset.nose.primaryAromas?.length ?? 0) > 0) && (
        <Card>
          <CardContent className="p-6">
            <h2 className="font-heading text-lg mb-2">Doft</h2>
            <dl className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm">
              {wset.nose.intensity && (<><dt className="text-muted-foreground">Intensitet</dt><dd className="col-span-2">{wset.nose.intensity}</dd></>)}
              {(wset.nose.primaryAromas?.length ?? 0) > 0 && (<><dt className="text-muted-foreground">Primära</dt><dd className="col-span-2">{wset.nose.primaryAromas.join(', ')}</dd></>)}
              {(wset.nose.secondaryAromas?.length ?? 0) > 0 && (<><dt className="text-muted-foreground">Sekundära</dt><dd className="col-span-2">{wset.nose.secondaryAromas.join(', ')}</dd></>)}
              {(wset.nose.tertiaryAromas?.length ?? 0) > 0 && (<><dt className="text-muted-foreground">Tertiära</dt><dd className="col-span-2">{wset.nose.tertiaryAromas.join(', ')}</dd></>)}
            </dl>
          </CardContent>
        </Card>
      )}

      {wset.palate && (
        <Card>
          <CardContent className="p-6">
            <h2 className="font-heading text-lg mb-2">Smak</h2>
            <dl className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm">
              {wset.palate.sweetness && (<><dt className="text-muted-foreground">Sötma</dt><dd className="col-span-2">{wset.palate.sweetness}</dd></>)}
              {wset.palate.acidity && (<><dt className="text-muted-foreground">Syra</dt><dd className="col-span-2">{wset.palate.acidity}</dd></>)}
              {wset.palate.tannin && (<><dt className="text-muted-foreground">Tannin</dt><dd className="col-span-2">{wset.palate.tannin}</dd></>)}
              {wset.palate.alcohol && (<><dt className="text-muted-foreground">Alkohol</dt><dd className="col-span-2">{wset.palate.alcohol}</dd></>)}
              {wset.palate.body && (<><dt className="text-muted-foreground">Fyllighet</dt><dd className="col-span-2">{wset.palate.body}</dd></>)}
              {wset.palate.flavourIntensity && (<><dt className="text-muted-foreground">Smakintensitet</dt><dd className="col-span-2">{wset.palate.flavourIntensity}</dd></>)}
              {wset.palate.finish && (<><dt className="text-muted-foreground">Eftersmak</dt><dd className="col-span-2">{wset.palate.finish}</dd></>)}
            </dl>
          </CardContent>
        </Card>
      )}

      {wset.conclusion && (wset.conclusion.quality || wset.conclusion.summary) && (
        <Card>
          <CardContent className="p-6">
            <h2 className="font-heading text-lg mb-2">Slutsats</h2>
            {wset.conclusion.quality && (
              <p className="text-sm"><span className="text-muted-foreground">Kvalitet: </span>{wset.conclusion.quality}</p>
            )}
            {wset.conclusion.summary && (
              <p className="text-sm whitespace-pre-wrap mt-2">{wset.conclusion.summary}</p>
            )}
          </CardContent>
        </Card>
      )}

      {reviewText && (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm whitespace-pre-wrap">{reviewText}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build smoke**

Run: `pnpm build`

Expected: green.

- [ ] **Step 3: Manual smoke**

Run `pnpm dev`. Visit `/profil/<handle>/recension/<id>` where you know there's a published review by that handle. WSET sections render only when populated. Try as logged-out user — works. Try with a non-public profile or an unpublished review — 404.

- [ ] **Step 4: Commit**

```bash
git add 'src/app/(frontend)/(site)/profil/[handle]/recension'
git commit -m "otter: page — public /profil/[handle]/recension/[id] detail"
```

---

## Task 10: Final smoke + push to main + squash-release to production

**Files:**
- No new code

- [ ] **Step 1: Full production build**

Run: `pnpm build`

Expected: green.

- [ ] **Step 2: Manual end-to-end walk-through**

Run `pnpm dev`. Execute the full flow:

1. Log in as a non-admin member.
2. Click avatar → "Mina recensioner" → empty or populated list renders.
3. Click "Recensera vin" → picker mounts. Search Systembolaget "Chablis" → click result → form mounts with snapshot prefilled. Fill rating, simple mode primary flavours, toggle "Publicera på min profil", save.
4. Redirected to `/mina-recensioner`. New review visible with "Publicerad" badge.
5. Visit `/vinlistan/<some-slug>` → "Recensera detta vin" CTA visible. Click → `/recensera-vin?wine=<id>` with form prefilled, picker hidden.
6. Visit `/profil/<your-handle>/recensioner` → the published review appears. Log out → still public. Click to detail page → WSET notes render.
7. Toggle `profile_public` off in `/installningar` → the public listing 404s.

- [ ] **Step 3: Push to main**

```bash
git push origin main
```

Watch Railway staging deploy. After deploy, repeat the walkthrough on the staging URL.

- [ ] **Step 4: Squash-merge to production**

```bash
git checkout production
git pull --ff-only origin production
git merge --squash main
git commit -m "release: standalone wine reviews"
git push origin production
git checkout main
```

For the commit body, include the spec summary. Pattern matches `[[Deployment branch flow]]`.

- [ ] **Step 5: Verify prod deploy**

After Railway prod deploy completes, repeat the walkthrough on prod. The migration `add_review_published_to_profile` will auto-apply at server init.

- [ ] **Step 6: Done.**

No follow-up data scripts needed for this feature — the access rule extension applies retroactively to existing reviews (only those with `publishedToProfile=true` show up publicly, which is none of them by default).

---

## Out of scope (per spec)

- Promote-to-library workflow (admins use Chunk 3 picker manually)
- Comments / likes / social interaction on published reviews
- WSET answer-key comparison for solo reviews
- Bulk import of old reviews
- Moderation queue for published reviews

If the user requests any of these mid-implementation, treat as a new spec.
