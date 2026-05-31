# Chunk G — Polish & Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 7 cross-cutting features as one bundle — session history, archive UI, template tagging, wine→plan cross-link, public host profile, react-joyride onboarding, and Lämna session UX in plan mode.

**Architecture:** 4 additive schema fields (1 on TastingTemplates, 2 on Users, 1 on TastingPlans). One migration. Mostly new server-rendered pages + small surface edits. One new dep (`react-joyride`). No realtime changes.

**Tech Stack:** Next.js 15 + Payload CMS 3.33 + Postgres + react-joyride.

**Spec:** `docs/superpowers/specs/2026-05-13-chunk-g-polish-visibility-design.md`

---

## File structure

```
NEW src/migrations/<ts>_chunk_g_polish.ts                                          Task 1
MOD src/collections/TastingTemplates.ts                                            Task 1
MOD src/collections/Users.ts                                                       Task 1
MOD src/collections/TastingPlans.ts                                                Task 1
MOD existing profile-settings UI (see Task 2 for path)                             Task 2
MOD src/components/tasting-plan/TastingPlanForm.tsx                                Task 3 + 9
NEW src/app/(frontend)/(site)/v/[handle]/page.tsx                                  Task 4
NEW src/app/(frontend)/(site)/v/[handle]/[planId]/page.tsx                         Task 4
NEW src/components/profile/PublicHostProfile.tsx                                   Task 4
NEW src/components/profile/PublicPlanView.tsx                                      Task 4
MOD src/app/(frontend)/(site)/provningsmallar/page.tsx                             Task 5
NEW src/components/tasting-template/TagFilter.tsx                                  Task 5
MOD (vinlistan wine detail page)                                                   Task 6
NEW src/components/wine/WineTastingsLink.tsx                                       Task 6
NEW src/app/(frontend)/(site)/mina-provningar/historik/page.tsx                    Task 7
NEW src/app/(frontend)/(site)/mina-provningar/historik/[sessionId]/page.tsx        Task 7
NEW src/components/session-history/SessionHistoryList.tsx                          Task 7
NEW src/components/session-history/SessionHistoryDetail.tsx                        Task 7
MOD src/components/top-nav-header.tsx                                              Task 7
MOD src/app/(frontend)/(site)/mina-provningar/planer/page.tsx                      Task 8
MOD src/components/tasting-plan/PlanCard.tsx                                       Task 8
MOD src/components/tasting-plan/PlanSessionContent.tsx                             Task 8 + 9
NEW src/components/onboarding/WizardTour.tsx                                       Task 9
NEW src/components/onboarding/PlanDetailTour.tsx                                   Task 9
NEW src/components/onboarding/HostSessionTour.tsx                                  Task 9
MOD src/components/tasting-plan/PlanDetailView.tsx                                 Task 9
MOD package.json                                                                   Task 9
END E2E + push                                                                     Task 10
```

---

## Task 1: Schema + migration

**Files:**
- Modify: `src/collections/TastingTemplates.ts`
- Modify: `src/collections/Users.ts`
- Modify: `src/collections/TastingPlans.ts`
- Auto-create: `src/migrations/<ts>_chunk_g_polish.ts`

- [ ] **Step 1: Add `tags` to TastingTemplates**

In `src/collections/TastingTemplates.ts`, near the other optional fields (e.g. after `seoDescription`), add:

```ts
    {
      name: 'tags',
      type: 'text',
      hasMany: true,
      admin: {
        description: 'Free-form tags shown as filter chips on /provningsmallar.',
      },
    },
```

- [ ] **Step 2: Add `handle` + `bio` to Users**

In `src/collections/Users.ts`, near the existing profile fields (e.g. `firstName`/`lastName`), add:

```ts
    {
      name: 'handle',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        description:
          'Public profile slug — lowercase, 3–30 chars, regex [a-z0-9-]. Empty = profile not opted in.',
      },
      validate: (value: unknown) => {
        if (value == null || value === '') return true
        const s = String(value).toLowerCase().trim()
        if (s.length < 3 || s.length > 30) return 'Användarnamnet måste vara 3–30 tecken.'
        if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(s))
          return 'Användarnamnet får bara innehålla a–z, 0–9 och bindestreck.'
        return true
      },
      hooks: {
        beforeValidate: [
          ({ value }) => {
            if (typeof value === 'string') return value.toLowerCase().trim() || null
            return value
          },
        ],
      },
    },
    {
      name: 'bio',
      type: 'textarea',
      maxLength: 280,
      admin: {
        description: 'Optional bio shown on the public profile page.',
      },
    },
```

- [ ] **Step 3: Add `publishedToProfile` to TastingPlans**

In `src/collections/TastingPlans.ts`, near `status` or another similar boolean:

```ts
    {
      name: 'publishedToProfile',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'When checked, this plan appears on the owner\'s /v/<handle> profile.',
      },
    },
```

- [ ] **Step 4: Regenerate types**

```bash
pnpm generate:types 2>&1 | tail -3
```
Verify with:
```bash
grep -n "tags\|publishedToProfile\|handle\b\|bio" src/payload-types.ts | head
```

- [ ] **Step 5: Generate migration**

```bash
pnpm payload migrate:create chunk-g-polish 2>&1 | tail -5
```
Expected: migration file with 4 ADD COLUMN statements. The `tags` may produce a join table (`tasting_templates_tags`) since Payload uses one-row-per-value for `hasMany: true` text fields.

- [ ] **Step 6: TS sweep + commit**

```bash
pnpm exec tsc --noEmit 2>&1 | grep -E "(TastingTemplates|Users|TastingPlans|handle|bio|publishedToProfile|tags)" | head
git add src/collections/TastingTemplates.ts \
  src/collections/Users.ts \
  src/collections/TastingPlans.ts \
  src/migrations/ \
  src/payload-types.ts
git commit -m "$(cat <<'EOF'
otter: schema for Chunk G — polish & visibility

Four additive fields:
- TastingTemplates.tags (hasMany text, optional)
- Users.handle (unique, validated lowercase slug, optional)
- Users.bio (textarea, max 280, optional)
- TastingPlans.publishedToProfile (checkbox, default false)

Migration runs on Railway boot via prodMigrations.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Profile settings — handle + bio fields

**Goal:** Let the user set their handle and bio from the existing profile-settings page so they can opt into the public profile.

**Files:** the existing user settings UI — needs plan-time discovery.

- [ ] **Step 1: Find the profile-settings file**

```bash
find src/components/profile -type f -name "*.tsx" | head
grep -rn "firstName\|lastName" src/components/profile --include="*.tsx" | head -5
```

The user-edit form lives in `src/components/profile/ProfileDetailsForm.tsx` (or similar). Open it and identify the existing pattern for first-name / last-name editing.

- [ ] **Step 2: Add a "Offentlig profil" section**

Below the existing name/email fields (or in an "Settings" tab), add:

```tsx
<section className="space-y-4 rounded-md border bg-card p-4">
  <h2 className="text-lg font-semibold">Offentlig profil</h2>
  <div>
    <Label htmlFor="handle">Användarnamn</Label>
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">vinakademin.se/v/</span>
      <Input
        id="handle"
        value={handle}
        onChange={(e) => setHandle(e.target.value.toLowerCase())}
        maxLength={30}
        pattern="^[a-z0-9][a-z0-9-]*[a-z0-9]$"
        placeholder="ditt-namn"
      />
    </div>
    <p className="text-xs text-muted-foreground mt-1">
      3–30 tecken, a–z, 0–9, bindestreck. Lämna tomt för att hålla profilen privat.
    </p>
  </div>
  <div>
    <Label htmlFor="bio">Bio</Label>
    <Textarea
      id="bio"
      value={bio}
      onChange={(e) => setBio(e.target.value)}
      maxLength={280}
      placeholder="Vem är du? Vad gillar du för vin?"
    />
    <p className="text-xs text-muted-foreground mt-1">{bio.length}/280</p>
  </div>
  {handle && (
    <Link
      href={`/v/${handle}`}
      target="_blank"
      className="inline-flex items-center gap-1 text-sm text-brand-400 hover:underline"
    >
      Visa profil <ExternalLink className="h-3 w-3" />
    </Link>
  )}
</section>
```

Wire the state and PATCH the user via the existing pattern in the form (find how `firstName`/`lastName` get saved — probably to `/api/users/me` or similar — and mirror it for `handle` + `bio`).

- [ ] **Step 3: TS sweep + commit**

```bash
pnpm exec tsc --noEmit 2>&1 | grep "profile" | head
git add src/components/profile/
git commit -m "$(cat <<'EOF'
otter: profile settings — handle + bio fields

Adds the "Offentlig profil" section to the user settings form
where users opt into the public /v/<handle> profile and write a
short bio. Empty handle = profile hidden.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Wizard publishedToProfile toggle

**File:** `src/components/tasting-plan/TastingPlanForm.tsx`

- [ ] **Step 1: Add state**

Near the other plan-state declarations, add:

```ts
  const [publishedToProfile, setPublishedToProfile] = React.useState<boolean>(
    initialPlan?.publishedToProfile ?? false,
  )
```

- [ ] **Step 2: Include in save payload**

In the `save` function's `payload` object, add:

```ts
      publishedToProfile,
```

- [ ] **Step 3: Add toggle to Provningsinställningar section**

The Provningsinställningar section already exists (from Chunk F). Inside the `<div className="space-y-3 rounded-md border bg-card p-4">`, add a third toggle below the existing blindprovning checkbox and minutes input:

```tsx
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input accent-brand-400"
              checked={publishedToProfile}
              onChange={(e) => setPublishedToProfile(e.target.checked)}
            />
            <span className="text-sm">
              <span className="font-medium">Publicera på din profil</span>{' '}
              <span className="text-muted-foreground">
                — visa den på /v/&lt;ditt-användarnamn&gt;.
              </span>
            </span>
          </label>
```

- [ ] **Step 4: TS sweep + commit**

```bash
pnpm exec tsc --noEmit 2>&1 | grep "TastingPlanForm" | head
git add src/components/tasting-plan/TastingPlanForm.tsx
git commit -m "$(cat <<'EOF'
otter: TastingPlanForm — publishedToProfile toggle

Third option in Provningsinställningar. Defaults to false (private).
When checked, the plan appears on the owner's public profile.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Public profile pages

**Files:**
- Create: `src/components/profile/PublicHostProfile.tsx`
- Create: `src/components/profile/PublicPlanView.tsx`
- Create: `src/app/(frontend)/(site)/v/[handle]/page.tsx`
- Create: `src/app/(frontend)/(site)/v/[handle]/[planId]/page.tsx`

- [ ] **Step 1: PublicHostProfile component**

```tsx
import Link from 'next/link'
import type { User, TastingPlan } from '@/payload-types'
import { Card } from '@/components/ui/card'
import { Wine as WineIcon } from 'lucide-react'

export interface PublicHostProfileProps {
  user: User
  plans: TastingPlan[]
}

export function PublicHostProfile({ user, plans }: PublicHostProfileProps) {
  const displayName =
    `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
    user.email?.split('@')[0] ||
    user.handle ||
    'Värd'
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-heading">{displayName}</h1>
        {user.bio && (
          <p className="text-base text-muted-foreground mt-2 whitespace-pre-wrap">{user.bio}</p>
        )}
        <p className="text-xs text-muted-foreground mt-2">@{user.handle}</p>
      </header>

      <section>
        <h2 className="text-lg font-semibold mb-4">Publicerade provningar</h2>
        {plans.length === 0 ? (
          <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
            Den här värden har inga publicerade provningar än.
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {plans.map((p) => (
              <Link key={p.id} href={`/v/${user.handle}/${p.id}`} className="block">
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-400/10 text-brand-400 flex items-center justify-center">
                      <WineIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{p.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[p.occasion, `${p.wines?.length ?? 0} viner`].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 2: PublicPlanView component**

```tsx
import Link from 'next/link'
import type { TastingPlan, Wine } from '@/payload-types'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Wine as WineIcon, Users } from 'lucide-react'

function wineTitle(w: NonNullable<TastingPlan['wines']>[number]): string {
  if (w.libraryWine && typeof w.libraryWine === 'object') {
    const lib = w.libraryWine as Wine
    return lib.name || `Vin #${lib.id}`
  }
  return w.customWine?.name || 'Vin'
}

function wineSubtitle(w: NonNullable<TastingPlan['wines']>[number]): string {
  if (w.libraryWine && typeof w.libraryWine === 'object') {
    const lib = w.libraryWine as Wine
    const region =
      typeof lib.region === 'object' && lib.region ? lib.region.name ?? null : null
    return [lib.winery, lib.vintage, region].filter(Boolean).join(' · ')
  }
  const c = w.customWine
  return [c?.producer, c?.vintage].filter(Boolean).join(' · ')
}

export interface PublicPlanViewProps {
  plan: TastingPlan
  handle: string
  hostDisplayName: string
}

export function PublicPlanView({ plan, handle, hostDisplayName }: PublicPlanViewProps) {
  const wines = plan.wines ?? []
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <Link
        href={`/v/${handle}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Tillbaka till {hostDisplayName}
      </Link>
      <header>
        <h1 className="text-3xl font-heading">{plan.title}</h1>
        {plan.description && (
          <p className="text-base text-muted-foreground mt-2 whitespace-pre-wrap">
            {plan.description}
          </p>
        )}
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
          <span>{plan.occasion || '—'}</span>
          <span>·</span>
          <span>{wines.length} viner</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            ~{plan.targetParticipants ?? 4} deltagare
          </span>
          <span>·</span>
          <span>Av <Link href={`/v/${handle}`} className="hover:underline">@{handle}</Link></span>
        </div>
      </header>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Viner</h2>
        {wines.length === 0 ? (
          <p className="text-sm text-muted-foreground">Inga viner i planen.</p>
        ) : (
          <ul className="space-y-2">
            {wines.map((w, idx) => (
              <li key={w.id ?? idx} className="flex gap-3 rounded-md border bg-card p-3 items-start">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-400/10 text-brand-400 text-sm font-medium flex items-center justify-center">
                  {w.pourOrder ?? idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{wineTitle(w)}</p>
                  {wineSubtitle(w) && (
                    <p className="text-xs text-muted-foreground truncate">{wineSubtitle(w)}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {plan.hostScript && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Manus för värden</h2>
          <Card className="p-4">
            <p className="text-sm whitespace-pre-wrap">{plan.hostScript}</p>
          </Card>
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 3: /v/[handle] page**

```tsx
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { PublicHostProfile } from '@/components/profile/PublicHostProfile'
import type { TastingPlan, User } from '@/payload-types'

interface RouteParams {
  params: Promise<{ handle: string }>
}

async function loadHostAndPlans(handle: string): Promise<{ user: User; plans: TastingPlan[] } | null> {
  const payload = await getPayload({ config })
  const lowered = handle.toLowerCase()
  const userRes = await payload.find({
    collection: 'users',
    where: { handle: { equals: lowered } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const user = (userRes.docs[0] as User) ?? null
  if (!user) return null
  const plansRes = await payload.find({
    collection: 'tasting-plans',
    where: {
      and: [
        { owner: { equals: user.id } },
        { publishedToProfile: { equals: true } },
      ],
    },
    sort: '-updatedAt',
    limit: 50,
    depth: 0,
    overrideAccess: true,
  })
  return { user, plans: plansRes.docs as TastingPlan[] }
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { handle } = await params
  const data = await loadHostAndPlans(handle)
  if (!data) return { title: 'Profil — Vinakademin' }
  const name = `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim() || `@${data.user.handle}`
  return {
    title: `${name} — Vinakademin`,
    description: data.user.bio ?? undefined,
  }
}

export const dynamic = 'force-dynamic'

export default async function PublicProfilePage({ params }: RouteParams) {
  const { handle } = await params
  const data = await loadHostAndPlans(handle)
  if (!data) notFound()
  return <PublicHostProfile user={data.user} plans={data.plans} />
}
```

- [ ] **Step 4: /v/[handle]/[planId] page**

```tsx
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { PublicPlanView } from '@/components/profile/PublicPlanView'
import type { TastingPlan, User } from '@/payload-types'

interface RouteParams {
  params: Promise<{ handle: string; planId: string }>
}

async function loadHostAndPlan(
  handle: string,
  planId: string,
): Promise<{ user: User; plan: TastingPlan } | null> {
  const payload = await getPayload({ config })
  const lowered = handle.toLowerCase()
  const userRes = await payload.find({
    collection: 'users',
    where: { handle: { equals: lowered } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const user = (userRes.docs[0] as User) ?? null
  if (!user) return null
  const pid = Number(planId)
  if (!Number.isInteger(pid)) return null
  const plan = (await payload
    .findByID({ collection: 'tasting-plans', id: pid, depth: 2, overrideAccess: true })
    .catch(() => null)) as TastingPlan | null
  if (!plan) return null
  const ownerId = typeof plan.owner === 'object' ? plan.owner?.id : plan.owner
  if (ownerId !== user.id) return null
  if (!plan.publishedToProfile) return null
  return { user, plan }
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { handle, planId } = await params
  const data = await loadHostAndPlan(handle, planId)
  if (!data) return { title: 'Provning — Vinakademin' }
  return {
    title: `${data.plan.title} — @${data.user.handle} | Vinakademin`,
    description: data.plan.description ?? undefined,
  }
}

export const dynamic = 'force-dynamic'

export default async function PublicPlanPage({ params }: RouteParams) {
  const { handle, planId } = await params
  const data = await loadHostAndPlan(handle, planId)
  if (!data) notFound()
  const hostDisplayName =
    `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim() ||
    `@${data.user.handle}`
  return (
    <PublicPlanView plan={data.plan} handle={data.user.handle!} hostDisplayName={hostDisplayName} />
  )
}
```

- [ ] **Step 5: TS sweep + smoke + commit**

```bash
pnpm exec tsc --noEmit 2>&1 | grep -E "(PublicHostProfile|PublicPlanView|/v/\[handle\])" | head
git add src/components/profile/PublicHostProfile.tsx \
  src/components/profile/PublicPlanView.tsx \
  "src/app/(frontend)/(site)/v"
git commit -m "$(cat <<'EOF'
otter: public host profile + public plan view

/v/[handle] renders display name + bio + grid of published plans;
404 when no user. /v/[handle]/[planId] is a read-only plan view; 404
when plan is missing, not published, or doesn't belong to that user.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Template tagging

**Files:**
- Modify: `src/app/(frontend)/(site)/provningsmallar/page.tsx`
- Create: `src/components/tasting-template/TagFilter.tsx`

- [ ] **Step 1: Create TagFilter component**

```tsx
import Link from 'next/link'
import * as React from 'react'

export interface TagCount {
  label: string
  count: number
}

export interface TagFilterProps {
  tags: TagCount[]
  activeTag: string | null
}

export function TagFilter({ tags, activeTag }: TagFilterProps) {
  const visibleTags = tags.filter((t) => t.count >= 2).slice(0, 12)
  const hiddenCount = tags.length - visibleTags.length
  if (visibleTags.length === 0 && !activeTag) return null
  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      {visibleTags.map((t) => {
        const isActive = activeTag === t.label
        const href = isActive ? '/provningsmallar' : `/provningsmallar?tag=${encodeURIComponent(t.label)}`
        return (
          <Link
            key={t.label}
            href={href}
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              isActive
                ? 'bg-brand-400 text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {t.label}
            <span className="ml-1 opacity-70">({t.count})</span>
          </Link>
        )
      })}
      {hiddenCount > 0 && (
        <span className="text-xs text-muted-foreground">+ {hiddenCount} fler</span>
      )}
      {activeTag && (
        <Link
          href="/provningsmallar"
          className="inline-flex items-center rounded-full bg-destructive/10 text-destructive px-3 py-1 text-xs font-medium hover:bg-destructive/20"
        >
          Rensa
        </Link>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update /provningsmallar listing page**

In `src/app/(frontend)/(site)/provningsmallar/page.tsx`, extend signature to accept `searchParams`:

```ts
export default async function ProvningsmallarListing({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>
}) {
  const sp = await searchParams
  const activeTag = (sp.tag || '').trim() || null

  const payload = await getPayload({ config })
  const whereAnd: any[] = [{ publishedStatus: { equals: 'published' } }]
  if (activeTag) {
    whereAnd.push({ tags: { contains: activeTag } })
  }
  const { docs } = await payload.find({
    collection: 'tasting-templates',
    where: { and: whereAnd },
    sort: '-publishedAt',
    limit: 60,
    depth: 1,
  })
  const templates = docs as TastingTemplate[]

  // Build tag-count union from a separate query of ALL published templates'
  // tags. Use a small projection.
  const allRes = await payload.find({
    collection: 'tasting-templates',
    where: { publishedStatus: { equals: 'published' } },
    limit: 200,
    depth: 0,
  })
  const tagMap = new Map<string, number>()
  for (const t of allRes.docs as TastingTemplate[]) {
    const arr = (t as any).tags as string[] | undefined
    if (!Array.isArray(arr)) continue
    for (const tag of arr) {
      const norm = String(tag).trim()
      if (!norm) continue
      tagMap.set(norm, (tagMap.get(norm) ?? 0) + 1)
    }
  }
  const tagCounts = Array.from(tagMap.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-heading">Provningsmallar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Färdiga provningsupplägg från Vinakademin. Klona en mall, anpassa, och starta din egen provning.
        </p>
      </header>
      <TagFilter tags={tagCounts} activeTag={activeTag} />
      {/* existing grid render unchanged */}
      {templates.length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
          Inga mallar än — kom tillbaka snart.
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <TemplateCard key={t.id} template={t} />
          ))}
        </div>
      )}
    </div>
  )
}
```

(Add `import { TagFilter } from '@/components/tasting-template/TagFilter'` at top.)

- [ ] **Step 3: TS sweep + commit**

```bash
pnpm exec tsc --noEmit 2>&1 | grep -E "(TagFilter|provningsmallar/page)" | head
git add src/components/tasting-template/TagFilter.tsx \
  "src/app/(frontend)/(site)/provningsmallar/page.tsx"
git commit -m "$(cat <<'EOF'
otter: template tagging — TagFilter chip strip + ?tag= URL filter

/provningsmallar shows a tag-chip filter above the grid. Chips
sorted by count desc, hidden below count=2, capped at 12 with
"+ N fler" overflow indicator. Active filter uses ?tag=<label>.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Wine cross-link

**Files:**
- Modify: the wine detail page (verify path during plan-time — likely `src/app/(frontend)/(site)/vinlistan/[slug]/page.tsx`)
- Create: `src/components/wine/WineTastingsLink.tsx`

- [ ] **Step 1: WineTastingsLink component**

```tsx
import Link from 'next/link'
import type { TastingPlan } from '@/payload-types'

export interface WineTastingsLinkProps {
  count: number
  plans: Array<{ id: number; title: string; handle: string }>
}

export function WineTastingsLink({ count, plans }: WineTastingsLinkProps) {
  if (count === 0) return null
  return (
    <section className="mt-4">
      <p className="text-sm text-muted-foreground">
        Smakad i {count} {count === 1 ? 'provning' : 'provningar'}
      </p>
      {plans.length > 0 && (
        <ul className="mt-1 flex flex-wrap gap-2">
          {plans.slice(0, 3).map((p) => (
            <li key={p.id}>
              <Link
                href={`/v/${p.handle}/${p.id}`}
                className="text-sm text-brand-400 hover:underline"
              >
                {p.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Update wine detail page**

Locate the wine detail page (`grep -rn "vinlistan.*\[slug\]\|wine detail" src/app -l --include="*.tsx" | head`). In the server component, after fetching the wine, query for public plans referencing it:

```ts
import { WineTastingsLink } from '@/components/wine/WineTastingsLink'
// ...

const wineId = wine.id
const plansRes = await payload.find({
  collection: 'tasting-plans',
  where: {
    and: [
      { 'wines.libraryWine': { equals: wineId } },
      { publishedToProfile: { equals: true } },
    ],
  },
  limit: 10,
  depth: 1, // populate owner for handle
})
const publicPlans = (plansRes.docs as any[])
  .filter((p) => {
    const owner = typeof p.owner === 'object' ? p.owner : null
    return owner?.handle
  })
  .map((p) => ({
    id: p.id,
    title: p.title,
    handle: (typeof p.owner === 'object' ? p.owner.handle : '') as string,
  }))
const tastingCount = plansRes.totalDocs
```

Then in the JSX, render:

```tsx
<WineTastingsLink count={tastingCount} plans={publicPlans} />
```

Place this below the existing price/buy strip in the detail layout.

- [ ] **Step 3: TS sweep + commit**

```bash
pnpm exec tsc --noEmit 2>&1 | grep "WineTastingsLink\|vinlistan" | head
git add src/components/wine/WineTastingsLink.tsx \
  "src/app/(frontend)/(site)/vinlistan"
git commit -m "$(cat <<'EOF'
otter: wine detail — "Smakad i N provningar" cross-link

Surfaces the count of published TastingPlans referencing this wine,
and links to up to 3 public plan views on /v/<handle>/<planId>.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Session history

**Files:**
- Create: `src/app/(frontend)/(site)/mina-provningar/historik/page.tsx`
- Create: `src/app/(frontend)/(site)/mina-provningar/historik/[sessionId]/page.tsx`
- Create: `src/components/session-history/SessionHistoryList.tsx`
- Create: `src/components/session-history/SessionHistoryDetail.tsx`
- Modify: `src/components/top-nav-header.tsx`

- [ ] **Step 1: SessionHistoryList component**

```tsx
import Link from 'next/link'
import type { CourseSession } from '@/payload-types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export interface SessionHistoryRow {
  session: CourseSession
  isHost: boolean
}

export interface SessionHistoryListProps {
  rows: SessionHistoryRow[]
}

function formatDate(s: CourseSession): string {
  const iso = s.completedAt || s.expiresAt || s.createdAt
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('sv-SE')
}

function sessionTitle(s: CourseSession): string {
  if (s.tastingPlan && typeof s.tastingPlan === 'object') return (s.tastingPlan as any).title ?? 'Provning'
  if (s.course && typeof s.course === 'object') return (s.course as any).title ?? 'Provning'
  return s.sessionName ?? 'Provning'
}

export function SessionHistoryList({ rows }: SessionHistoryListProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
        Du har inte deltagit i några provningar än.
      </div>
    )
  }
  return (
    <ul className="space-y-2">
      {rows.map(({ session, isHost }) => (
        <li key={session.id}>
          <Link href={`/mina-provningar/historik/${session.id}`} className="block">
            <Card className="p-4 hover:shadow-md transition-shadow flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{sessionTitle(session)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDate(session)} · {session.participantCount ?? 0} deltagare
                </p>
              </div>
              <Badge variant={isHost ? 'brand' : 'secondary'}>{isHost ? 'Värd' : 'Gäst'}</Badge>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 2: SessionHistoryDetail component**

```tsx
import Link from 'next/link'
import type { CourseSession, TastingPlan, Wine, Review } from '@/payload-types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'

export interface SessionHistoryDetailProps {
  session: CourseSession
  isHost: boolean
  myReviews: Review[]
}

function sessionTitle(s: CourseSession): string {
  if (s.tastingPlan && typeof s.tastingPlan === 'object') return (s.tastingPlan as any).title ?? 'Provning'
  if (s.course && typeof s.course === 'object') return (s.course as any).title ?? 'Provning'
  return s.sessionName ?? 'Provning'
}

function wineTitle(w: any): string {
  if (w?.libraryWine && typeof w.libraryWine === 'object') {
    return (w.libraryWine as Wine).name || `Vin #${(w.libraryWine as Wine).id}`
  }
  return w?.customWine?.name || 'Vin'
}

export function SessionHistoryDetail({ session, isHost, myReviews }: SessionHistoryDetailProps) {
  const wines =
    session.tastingPlan && typeof session.tastingPlan === 'object'
      ? ((session.tastingPlan as TastingPlan).wines ?? [])
      : []
  const date = (() => {
    const iso = session.completedAt || session.expiresAt || session.createdAt
    return iso ? new Date(iso).toLocaleDateString('sv-SE') : ''
  })()
  const reviewByWineId = new Map<number, Review>()
  const reviewByCustomName = new Map<string, Review>()
  for (const r of myReviews) {
    if ((r as any).wine) {
      const id = typeof (r as any).wine === 'object' ? (r as any).wine.id : (r as any).wine
      if (typeof id === 'number') reviewByWineId.set(id, r)
    } else if ((r as any).customWine?.name) {
      reviewByCustomName.set(String((r as any).customWine.name).toLowerCase(), r)
    }
  }
  const planId =
    session.tastingPlan && typeof session.tastingPlan === 'object'
      ? (session.tastingPlan as TastingPlan).id
      : null
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <Link
        href="/mina-provningar/historik"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Tillbaka till historik
      </Link>
      <header>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant={isHost ? 'brand' : 'secondary'}>{isHost ? 'Värd' : 'Gäst'}</Badge>
          <span className="text-sm text-muted-foreground">{date}</span>
        </div>
        <h1 className="text-2xl font-heading">{sessionTitle(session)}</h1>
      </header>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Viner</h2>
        <ul className="space-y-2">
          {wines.map((w, idx) => {
            const pourOrder = w.pourOrder ?? idx + 1
            const title = wineTitle(w)
            let myReview: Review | undefined
            if (w.libraryWine && typeof w.libraryWine === 'object') {
              myReview = reviewByWineId.get((w.libraryWine as Wine).id)
            } else if (w.customWine?.name) {
              myReview = reviewByCustomName.get(String(w.customWine.name).toLowerCase())
            }
            return (
              <li key={w.id ?? idx} className="rounded-md border bg-card p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-400/10 text-brand-400 text-sm font-medium flex items-center justify-center">
                    {pourOrder}
                  </div>
                  <p className="text-sm font-medium truncate">{title}</p>
                </div>
                {myReview ? (
                  <div className="mt-2 ml-10 text-xs space-y-1">
                    {typeof (myReview as any).rating === 'number' && (
                      <p className="text-brand-400 tracking-wider">
                        {'★'.repeat(Math.round((myReview as any).rating))}
                        {'☆'.repeat(5 - Math.round((myReview as any).rating))}
                      </p>
                    )}
                    {(myReview as any).reviewText && (
                      <p className="text-muted-foreground italic">"{(myReview as any).reviewText}"</p>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 ml-10 text-xs text-muted-foreground">Ingen recension</p>
                )}
              </li>
            )
          })}
        </ul>
      </section>
      {isHost && planId && (
        <p className="text-sm">
          <Link href={`/mina-provningar/planer/${planId}`} className="text-brand-400 hover:underline">
            Visa planen →
          </Link>
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Listing page**

```tsx
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { SessionHistoryList, type SessionHistoryRow } from '@/components/session-history/SessionHistoryList'

export const metadata: Metadata = {
  title: 'Historik — Vinakademin',
}
export const dynamic = 'force-dynamic'

export default async function HistorikPage() {
  const user = await getUser()
  if (!user) redirect('/logga-in?from=/mina-provningar/historik')

  const payload = await getPayload({ config })

  // Sessions the user hosted
  const hostedRes = await payload.find({
    collection: 'course-sessions',
    where: { host: { equals: user.id } },
    limit: 200,
    depth: 1,
    overrideAccess: true,
  })

  // Sessions the user participated in (as guest)
  const partsRes = await payload.find({
    collection: 'session-participants',
    where: { user: { equals: user.id } },
    limit: 200,
    depth: 0,
    overrideAccess: true,
  })
  const guestSessionIds = (partsRes.docs as any[])
    .map((p) => (typeof p.session === 'object' ? p.session.id : p.session))
    .filter((id): id is number => typeof id === 'number')

  const hostedIds = new Set((hostedRes.docs as any[]).map((s) => s.id))
  const guestOnlyIds = guestSessionIds.filter((id) => !hostedIds.has(id))

  let guestSessions: any[] = []
  if (guestOnlyIds.length > 0) {
    const guestRes = await payload.find({
      collection: 'course-sessions',
      where: { id: { in: guestOnlyIds } },
      limit: 200,
      depth: 1,
      overrideAccess: true,
    })
    guestSessions = guestRes.docs as any[]
  }

  const rows: SessionHistoryRow[] = [
    ...(hostedRes.docs as any[]).map((session) => ({ session, isHost: true })),
    ...guestSessions.map((session) => ({ session, isHost: false })),
  ].sort((a, b) => {
    const aIso = a.session.completedAt || a.session.expiresAt || a.session.createdAt
    const bIso = b.session.completedAt || b.session.expiresAt || b.session.createdAt
    return new Date(bIso || 0).getTime() - new Date(aIso || 0).getTime()
  })

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-heading">Historik</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Alla provningar du har varit med på.
        </p>
      </header>
      <SessionHistoryList rows={rows} />
    </div>
  )
}
```

- [ ] **Step 4: Detail page**

```tsx
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { SessionHistoryDetail } from '@/components/session-history/SessionHistoryDetail'
import type { CourseSession, Review } from '@/payload-types'

interface RouteParams {
  params: Promise<{ sessionId: string }>
}

export const dynamic = 'force-dynamic'

export default async function HistorikDetailPage({ params }: RouteParams) {
  const user = await getUser()
  if (!user) {
    const { sessionId } = await params
    redirect(`/logga-in?from=/mina-provningar/historik/${sessionId}`)
  }
  const { sessionId } = await params
  const sid = Number(sessionId)
  if (!Number.isInteger(sid)) notFound()

  const payload = await getPayload({ config })
  let session: CourseSession | null = null
  try {
    session = (await payload.findByID({
      collection: 'course-sessions',
      id: sid,
      depth: 2,
      overrideAccess: true,
    })) as CourseSession
  } catch {
    notFound()
  }
  if (!session) notFound()

  const hostId = typeof session.host === 'object' ? (session.host as any).id : session.host
  const isHost = hostId === user.id

  let participantId: number | null = null
  if (!isHost) {
    const partsRes = await payload.find({
      collection: 'session-participants',
      where: { and: [{ session: { equals: sid } }, { user: { equals: user.id } }] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (partsRes.docs.length === 0) {
      notFound()
    } else {
      participantId = (partsRes.docs[0] as any).id
    }
  }

  let myReviews: Review[] = []
  if (participantId !== null) {
    const reviewsRes = await payload.find({
      collection: 'reviews',
      where: { sessionParticipant: { equals: participantId } },
      limit: 100,
      depth: 1,
      overrideAccess: true,
    })
    myReviews = reviewsRes.docs as Review[]
  }

  return <SessionHistoryDetail session={session} isHost={isHost} myReviews={myReviews} />
}
```

- [ ] **Step 5: Top-nav link**

In `src/components/top-nav-header.tsx`, find the user dropdown menu and add `Historik` next to `Mina planer`:

```tsx
                  <DropdownMenuItem asChild>
                    <Link href="/mina-provningar/historik" className="cursor-pointer">
                      <Wine className="mr-2 h-4 w-4" />
                      Historik
                    </Link>
                  </DropdownMenuItem>
```

- [ ] **Step 6: TS sweep + commit**

```bash
pnpm exec tsc --noEmit 2>&1 | grep -E "(SessionHistoryList|SessionHistoryDetail|historik)" | head
git add src/components/session-history/ \
  "src/app/(frontend)/(site)/mina-provningar/historik" \
  src/components/top-nav-header.tsx
git commit -m "$(cat <<'EOF'
otter: session history — listing + detail + nav link

/mina-provningar/historik shows every session the user hosted or
participated in, sorted by completedAt desc. Detail page at
[sessionId] is auth+participation-gated and renders the user's own
reviews per wine. Top-nav dropdown gets a Historik entry.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Archive UI + Lämna session

**Files:**
- Modify: `src/app/(frontend)/(site)/mina-provningar/planer/page.tsx`
- Modify: `src/components/tasting-plan/PlanCard.tsx`
- Modify: `src/components/tasting-plan/PlanSessionContent.tsx`

- [ ] **Step 1: Archive toggle on listing page**

In `src/app/(frontend)/(site)/mina-provningar/planer/page.tsx`, accept `searchParams.showArchived`:

```ts
export default async function MinaPlanerPage({
  searchParams,
}: {
  searchParams: Promise<{ showArchived?: string }>
}) {
  const sp = await searchParams
  const showArchived = sp.showArchived === '1'
  // existing auth check, etc.
  const whereAnd: any[] = [{ owner: { equals: user.id } }]
  if (!showArchived) {
    whereAnd.push({ status: { not_equals: 'archived' } })
  }
  // pass whereAnd into payload.find
```

Add a header chip toggle that flips the URL:

```tsx
<Link
  href={showArchived ? '/mina-provningar/planer' : '/mina-provningar/planer?showArchived=1'}
  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
>
  {showArchived ? '← Dölj arkiverade' : 'Visa arkiverade'}
</Link>
```

Place this near the page header, opposite the `+ Ny provning` CTA.

- [ ] **Step 2: PlanCard — `Återställ` for archived**

In `src/components/tasting-plan/PlanCard.tsx`, add an `Återställ` dropdown option that fires only when `status === 'archived'`:

```tsx
{plan.status === 'archived' && (
  <DropdownMenuItem onClick={() => setConfirmRestore(true)}>
    Återställ
  </DropdownMenuItem>
)}
```

Add an AlertDialog for restore confirmation that PATCHes `status: 'draft'`:

```tsx
const [confirmRestore, setConfirmRestore] = React.useState(false)
const [restoring, setRestoring] = React.useState(false)

async function performRestore() {
  setRestoring(true)
  try {
    const res = await fetch(`/api/tasting-plans/${plan.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'draft' }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data?.error || 'Kunde inte återställa planen.')
      return
    }
    toast.success('Återställd.')
    router.refresh()
  } catch {
    toast.error('Nätverksfel — försök igen.')
  } finally {
    setRestoring(false)
    setConfirmRestore(false)
  }
}
```

And render an AlertDialog alongside the existing delete one. Also visually mute archived cards: add `className={\`... \${plan.status === 'archived' ? 'opacity-60' : ''}\`}` to the Card.

- [ ] **Step 3: Lämna session in PlanSessionContent**

In `src/components/tasting-plan/PlanSessionContent.tsx`, add a top-level header above the grid render with a leave/end button. Add state + dialog:

```tsx
import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useActiveSession } from '@/context/SessionContext'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// inside the component:
const router = useRouter()
const { leaveSession } = useActiveSession()
const [endDialog, setEndDialog] = React.useState(false)
const [leaveDialog, setLeaveDialog] = React.useState(false)

async function handleHostEnd() {
  try {
    const res = await fetch(`/api/sessions/${session.id}/complete`, { method: 'POST' })
    // Some installs may not have /complete — try PATCH fallback
    if (!res.ok && res.status === 404) {
      await fetch(`/api/course-sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', completedAt: new Date().toISOString() }),
      })
    }
    toast.success('Sessionen avslutad.')
    router.push(`/mina-provningar/planer/${plan.id}`)
  } catch {
    toast.error('Kunde inte avsluta sessionen.')
  }
}

async function handleGuestLeave() {
  try {
    await leaveSession()
  } finally {
    router.push('/')
  }
}
```

Render the top header just before the existing `<div className="grid gap-6 lg:grid-cols-[1fr_320px]">`:

```tsx
return (
  <>
    <header className="flex items-center justify-between mb-4">
      <div className="min-w-0">
        <h1 className="text-xl font-heading truncate">{plan.title}</h1>
      </div>
      <Button variant="ghost" size="sm" onClick={() => (isHost ? setEndDialog(true) : setLeaveDialog(true))}>
        <LogOut className="h-4 w-4 mr-1.5" />
        {isHost ? 'Avsluta session' : 'Lämna session'}
      </Button>
    </header>
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* existing render */}
    </div>
    <AlertDialog open={endDialog} onOpenChange={setEndDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Avsluta sessionen?</AlertDialogTitle>
          <AlertDialogDescription>
            Alla deltagare kopplas bort och sessionen markeras som klar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Avbryt</AlertDialogCancel>
          <AlertDialogAction onClick={handleHostEnd}>Avsluta</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <AlertDialog open={leaveDialog} onOpenChange={setLeaveDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Lämna provningen?</AlertDialogTitle>
          <AlertDialogDescription>
            Du kan ansluta igen med samma kod om sessionen fortfarande är aktiv.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Avbryt</AlertDialogCancel>
          <AlertDialogAction onClick={handleGuestLeave}>Lämna</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
)
```

The host's end may need a complete endpoint — verify if `/api/sessions/[id]/complete` exists by grepping; if not, the PATCH fallback uses Payload's REST collection endpoint directly. If neither path works, create a tiny `POST /api/sessions/[id]/complete` route during this task as a small ~20-line addition.

- [ ] **Step 4: TS sweep + commit**

```bash
pnpm exec tsc --noEmit 2>&1 | grep -E "(PlanCard|PlanSessionContent|planer/page)" | head
git add src/components/tasting-plan/PlanCard.tsx \
  src/components/tasting-plan/PlanSessionContent.tsx \
  "src/app/(frontend)/(site)/mina-provningar/planer/page.tsx"
git commit -m "$(cat <<'EOF'
otter: archive UI + Lämna session

- /mina-provningar/planer ?showArchived=1 toggle reveals archived plans
- PlanCard shows Återställ for archived (PATCH status='draft')
- Archived cards muted to opacity-60
- PlanSessionContent gains a top header with Lämna/Avsluta button
  and confirm dialogs

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Onboarding tours (react-joyride)

**Files:**
- Modify: `package.json` (add `react-joyride`)
- Create: `src/components/onboarding/WizardTour.tsx`
- Create: `src/components/onboarding/PlanDetailTour.tsx`
- Create: `src/components/onboarding/HostSessionTour.tsx`
- Modify: `src/components/tasting-plan/TastingPlanForm.tsx` (mount + data-tour attrs)
- Modify: `src/components/tasting-plan/PlanDetailView.tsx` (mount + data-tour attrs)
- Modify: `src/components/tasting-plan/PlanSessionContent.tsx` (mount + data-tour attrs)

- [ ] **Step 1: Add the dependency**

```bash
pnpm add react-joyride@^2.9.3
```

(Use whatever the current stable major is; check `npm view react-joyride version` for the latest.)

- [ ] **Step 2: WizardTour component**

```tsx
'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import type { Step } from 'react-joyride'

const Joyride = dynamic(() => import('react-joyride'), { ssr: false })

const STORAGE_KEY = 'vk_tour_wizard_done'

const STEPS: Step[] = [
  {
    target: '[data-tour="wizard-title"]',
    content: 'Börja med en titel. Det här är vad både du och dina gäster ser.',
    disableBeacon: true,
  },
  {
    target: '[data-tour="wizard-wines"]',
    content: 'Lägg till 3-8 viner. Du kan välja från vårt bibliotek eller skriva egna.',
  },
  {
    target: '[data-tour="wizard-reorder"]',
    content: 'Dra i handtaget för att ändra ordningen viner serveras i.',
  },
  {
    target: '[data-tour="wizard-save"]',
    content: 'Spara som utkast. Du kan komma tillbaka och ändra när som helst.',
  },
]

export function WizardTour() {
  const [run, setRun] = React.useState(false)
  React.useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setRun(true)
    } catch {
      // localStorage unavailable; skip
    }
  }, [])
  if (!run) return null
  return (
    <Joyride
      steps={STEPS}
      run={run}
      continuous
      showSkipButton
      showProgress
      disableOverlayClose
      locale={{ back: 'Tillbaka', close: 'Stäng', last: 'Klar', next: 'Nästa', skip: 'Hoppa över' }}
      styles={{ options: { primaryColor: 'rgb(253, 145, 76)' /* brand-400 */, zIndex: 10000 } }}
      callback={(data) => {
        if (data.status === 'finished' || data.status === 'skipped') {
          setRun(false)
          try {
            localStorage.setItem(STORAGE_KEY, '1')
          } catch {}
        }
      }}
    />
  )
}
```

- [ ] **Step 3: PlanDetailTour + HostSessionTour**

Mirror the same pattern with different STEPS arrays and storage keys (`vk_tour_plan_detail_done`, `vk_tour_host_session_done`). For HostSessionTour, only include the reveal/timer steps when those features are active for the given session (conditional inclusion based on session.blindTasting / plan.defaultMinutesPerWine props passed in).

```tsx
// PlanDetailTour — STEPS:
const STEPS: Step[] = [
  { target: '[data-tour="detail-start-session"]', content: 'Tryck här för att starta en grupp-session med QR-kod.' },
  { target: '[data-tour="detail-shopping-list"]', content: 'Få en handlingslista till Systembolaget.' },
  { target: '[data-tour="detail-print-guide"]', content: 'Skriv ut en värdguide som fusk-ark under provningen.' },
]
```

```tsx
// HostSessionTour — STEPS computed from props:
export function HostSessionTour({ blind, hasTimer }: { blind: boolean; hasTimer: boolean }) {
  const steps: Step[] = [
    { target: '[data-tour="session-set-focus"]', content: 'Tryck här för att tala om vilket vin ni provar nu.' },
  ]
  if (blind) {
    steps.push({
      target: '[data-tour="session-reveal"]',
      content: 'I blindprovning kan du avslöja vinerna ett i taget.',
    })
  }
  if (hasTimer) {
    steps.push({
      target: '[data-tour="session-timer"]',
      content: 'Räknaren håller takten. Klar med ett vin? Gå vidare när du vill.',
    })
  }
  // rest mirrors WizardTour
}
```

- [ ] **Step 4: Mount tours in the surfaces + add data-tour attrs**

**TastingPlanForm**:
- Mount `<WizardTour />` near the top of the rendered JSX (only when `!isEdit` — initial visit).
- Add `data-tour="wizard-title"` on the title `<Input>`.
- Add `data-tour="wizard-wines"` on the section header for "Viner".
- Add `data-tour="wizard-reorder"` on the grip handle inside `SortableWineRow` (this requires a separate change to that component or wrapping).
- Add `data-tour="wizard-save"` on the Spara button.

**PlanDetailView**:
- Mount `<PlanDetailTour />` in the action rail or top of the layout.
- Add `data-tour="detail-start-session"` on the StartSessionButton wrapper.
- Add `data-tour="detail-shopping-list"` on the shopping-list link.
- Add `data-tour="detail-print-guide"` on the print-guide link.

**PlanSessionContent**:
- Mount `<HostSessionTour blind={isBlind} hasTimer={!!plan.defaultMinutesPerWine} />` (host only).
- Add `data-tour="session-set-focus"` on the FIRST wine row's Sätt fokus button (use an `idx === 0` conditional in the JSX).
- Add `data-tour="session-reveal"` on the FIRST wine's Avslöja button when present.
- Add `data-tour="session-timer"` on the FIRST in-focus timer (this one is trickier — may need to add the attr to the row container instead).

- [ ] **Step 5: TS sweep + commit**

```bash
pnpm exec tsc --noEmit 2>&1 | grep -E "(WizardTour|PlanDetailTour|HostSessionTour|onboarding)" | head
git add package.json pnpm-lock.yaml \
  src/components/onboarding/ \
  src/components/tasting-plan/TastingPlanForm.tsx \
  src/components/tasting-plan/PlanDetailView.tsx \
  src/components/tasting-plan/PlanSessionContent.tsx
git commit -m "$(cat <<'EOF'
otter: onboarding tours via react-joyride

Three lazy-loaded tours gated on per-tour localStorage flags:
- WizardTour on first /skapa-provning visit
- PlanDetailTour on first plan detail visit
- HostSessionTour on first plan-mode session as host
  (skips reveal step when not blind; skips timer step when no timer)

Tour components are dynamic-imported so non-onboarding flows don't
pay the bundle cost.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: E2E + push to production

- [ ] **Step 1: Lint + TS sweep**

```bash
pnpm lint 2>&1 | tail -20
pnpm exec tsc --noEmit 2>&1 | grep -E "(TastingTemplates|Users|TastingPlans|profile|tasting-template|wine/Wine|session-history|historik|PlanCard|PlanSessionContent|onboarding|v/\[handle\]|provningsmallar)" | head -40
```

Expected: lint clean for the new files; no NEW TS errors in touched files.

- [ ] **Step 2: Build smoke**

```bash
pnpm build 2>&1 | tail -40
```

Expected: "Compiled successfully".

- [ ] **Step 3: Smoke (use production URLs since dev server hangs in this environment)**

```bash
# Public profile 404 for non-existent handle
curl -s -o /dev/null -w "/v/zzz-not-real → %{http_code}\n" https://www.vinakademin.se/v/zzz-not-real

# Templates listing still works
curl -s -o /dev/null -w "/provningsmallar → %{http_code}\n" https://www.vinakademin.se/provningsmallar

# Historik auth-redirect
curl -s -o /dev/null -w "/mina-provningar/historik → %{http_code}\n" https://www.vinakademin.se/mina-provningar/historik
```

Expected (after deploy): public 404, public 200, redirect to login (307).

- [ ] **Step 4: Manual UI smoke (deferred)**

Document for user:
1. Set handle `test-anna` and bio on the profile settings page.
2. Edit a plan → check `Publicera på din profil`. Save.
3. Visit `/v/test-anna` → see the plan card.
4. Click → `/v/test-anna/[planId]` → see the public read-only plan.
5. `/mina-provningar/historik` → past sessions listed; click → detail page.
6. `/mina-provningar/planer` → toggle archived. `Återställ` on archived card.
7. Admin: add tags to a published template. `/provningsmallar` shows tag chips.
8. `/vinlistan/<wine-slug>` → "Smakad i N provningar" if any published plan references it.
9. First-time visit to `/skapa-provning` → wizard tour fires.
10. Plan-mode session → host clicks `Avsluta session` → confirm → session completed.

- [ ] **Step 5: Push to main**

```bash
git log --oneline origin/main..HEAD
git push origin main
```

- [ ] **Step 6: Merge main → production**

```bash
git fetch origin
git checkout production
git pull --ff-only origin production
git merge --no-ff main -m "$(cat <<'EOF'
release: Chunk G — Polish & Visibility

Seven features:
- Session history at /mina-provningar/historik + per-session detail
- Archive UI on /mina-provningar/planer with Återställ on PlanCard
- Template tagging — chips on /provningsmallar with single-tag filter
- Wine cross-link — "Smakad i N provningar" on wine detail page
- Public host profile at /v/<handle> + public plan view
- react-joyride tours on first wizard / first plan detail / first session-as-host
- Lämna session UX in plan mode (Avsluta for host, Lämna for guest)

Schema: 4 nullable/defaulted columns. Migration runs on Railway boot.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push origin production
git checkout main
```

- [ ] **Step 7: Verify deploy**

```bash
git log origin/production --oneline -3
```

Expected: the merge commit at HEAD.

---

## Out of scope (deferred)

- Tag autocomplete / canonical vocabulary.
- Multi-tag filter on /provningsmallar.
- Profile avatar / banner / theme customization.
- Following other hosts.
- Activity feeds on profile.
- Session-history filters (date range, role-only).
- Plan duplication from history.
- Pre-session reminder email.
