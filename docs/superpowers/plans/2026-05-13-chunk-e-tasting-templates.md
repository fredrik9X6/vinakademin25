# Chunk E — Tasting Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin-curated tasting templates browsable at `/provningsmallar`. Members click `Använd mallen` and land on a pre-filled draft `TastingPlan` they own.

**Architecture:** Public read-access collection (admin write) with the same wine-array shape as TastingPlans (library-only). Public server-rendered listing + detail. Clone API mirrors the POST `/api/tasting-plans` pattern but reads from a template and stamps `derivedFromTemplate`. Existing `TastingPlans.derivedFromTemplate` relation gets re-pointed at the new collection (FK swap — column has no data).

**Tech Stack:** Next.js 15 + Payload CMS 3.33 + Postgres + shadcn UI + sonner.

**Spec:** `docs/superpowers/specs/2026-05-13-chunk-e-tasting-templates-design.md`

---

## File Structure

```
NEW  src/collections/TastingTemplates.ts                                       Task 1
MOD  src/collections/TastingPlans.ts                                           Task 1
EDIT src/payload.config.ts                                                     Task 1
NEW  src/migrations/<ts>_chunk_e_tasting_templates.ts                          Task 1
NEW  src/app/api/tasting-plans/from-template/[templateId]/route.ts             Task 2
NEW  src/components/tasting-template/TemplateCard.tsx                          Task 3
NEW  src/components/tasting-template/UseTemplateButton.tsx                     Task 3
NEW  src/components/tasting-template/TemplateDetailView.tsx                    Task 3
NEW  src/app/(frontend)/(site)/provningsmallar/page.tsx                        Task 4
NEW  src/app/(frontend)/(site)/provningsmallar/[slug]/page.tsx                 Task 4
MOD  src/components/top-nav-header.tsx                                         Task 5
END  E2E + push                                                                Task 6
```

---

## Task 1: Schema + migration

**Files:**
- Create: `src/collections/TastingTemplates.ts`
- Modify: `src/collections/TastingPlans.ts` (swap `derivedFromTemplate.relationTo`)
- Edit: `src/payload.config.ts` (register the new collection)

- [ ] **Step 1: Create `TastingTemplates.ts`**

```ts
import type { CollectionConfig } from 'payload'

const slugifyTitle = (input: string): string =>
  String(input)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export const TastingTemplates: CollectionConfig = {
  slug: 'tasting-templates',
  labels: { singular: 'Tasting template', plural: 'Tasting templates' },
  admin: {
    group: 'Wine Tastings',
    useAsTitle: 'title',
    defaultColumns: ['title', 'publishedStatus', 'publishedAt', 'updatedAt'],
    description: 'Admin-curated tasting plan templates that members can clone.',
  },
  access: {
    read: ({ req }) => {
      if (req.user?.role === 'admin') return true
      return { publishedStatus: { equals: 'published' } }
    },
    create: ({ req }) => req.user?.role === 'admin',
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    { name: 'title', type: 'text', required: true, maxLength: 100 },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL-friendly slug. Auto-generated from title if empty.',
        position: 'sidebar',
      },
      hooks: {
        beforeValidate: [
          ({ data }) => {
            const source = data?.slug || data?.title
            if (source) return slugifyTitle(String(source))
            return data?.slug
          },
        ],
      },
    },
    { name: 'description', type: 'textarea', maxLength: 500 },
    { name: 'occasion', type: 'text' },
    {
      name: 'targetParticipants',
      type: 'number',
      defaultValue: 4,
      min: 1,
      max: 50,
    },
    {
      name: 'wines',
      type: 'array',
      labels: { singular: 'Vin', plural: 'Viner' },
      fields: [
        {
          name: 'libraryWine',
          type: 'relationship',
          relationTo: 'wines',
          hasMany: false,
          required: true,
        },
        { name: 'pourOrder', type: 'number', min: 1 },
        { name: 'hostNotes', type: 'textarea' },
      ],
    },
    { name: 'hostScript', type: 'textarea' },
    { name: 'featuredImage', type: 'upload', relationTo: 'media' },
    { name: 'seoTitle', type: 'text', maxLength: 60 },
    { name: 'seoDescription', type: 'text', maxLength: 160 },
    {
      name: 'publishedStatus',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Utkast', value: 'draft' },
        { label: 'Publicerad', value: 'published' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Stamped automatically the first time the template is published.',
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, originalDoc, operation }) => {
        // Stamp publishedAt on the draft → published transition (first publish).
        const wasPublished = originalDoc?.publishedStatus === 'published'
        const isPublished = data?.publishedStatus === 'published'
        if (operation === 'create' && isPublished && !data?.publishedAt) {
          return { ...data, publishedAt: new Date().toISOString() }
        }
        if (operation === 'update' && !wasPublished && isPublished && !originalDoc?.publishedAt) {
          return { ...data, publishedAt: new Date().toISOString() }
        }
        return data
      },
    ],
  },
  timestamps: true,
}
```

- [ ] **Step 2: Swap `TastingPlans.derivedFromTemplate.relationTo`**

In `src/collections/TastingPlans.ts`, find the existing field:

```ts
    {
      name: 'derivedFromTemplate',
      type: 'relationship',
      relationTo: 'tasting-plans',
      hasMany: false,
      admin: {
        description: 'Set by the clone-template API in Chunk E. Null for now.',
        position: 'sidebar',
      },
    },
```

Change `relationTo: 'tasting-plans'` → `relationTo: 'tasting-templates'`. Also update the description:

```ts
    {
      name: 'derivedFromTemplate',
      type: 'relationship',
      relationTo: 'tasting-templates',
      hasMany: false,
      admin: {
        description: 'Set when this plan was cloned from a TastingTemplate.',
        position: 'sidebar',
      },
    },
```

- [ ] **Step 3: Register the collection in `payload.config.ts`**

Open `src/payload.config.ts`. Find the `collections` array. The existing `TastingPlans` import + entry is the closest pattern. Add an import:

```ts
import { TastingTemplates } from './collections/TastingTemplates'
```

And add `TastingTemplates` to the `collections` array (place adjacent to `TastingPlans` for readability).

- [ ] **Step 4: Regenerate types**

```bash
pnpm generate:types 2>&1 | tail -3
```
Expected: "Types written to .../src/payload-types.ts".

Verify `TastingTemplate` interface is exported:

```bash
grep -n "export interface TastingTemplate\b" src/payload-types.ts | head
```
Expected: one match.

- [ ] **Step 5: Generate migration**

```bash
pnpm payload migrate:create chunk-e-tasting-templates 2>&1 | tail -5
```
Expected: "Migration created at .../src/migrations/<ts>_chunk_e_tasting_templates.ts".

Inspect the generated file. It should contain:
- `CREATE TABLE "tasting_templates" ...` plus its supporting array table for `wines`.
- Either an `ALTER TABLE tasting_plans` block dropping the old FK constraint on `derived_from_template_id` and adding a new one against `tasting_templates(id)`, OR drop-and-readd column (depends on Payload's generator). Both are acceptable — the column has no data.

If the generator does NOT include the FK swap (sometimes Payload only generates DDL when columns change), the swap may need a manual addition. Add the SQL by hand if missing:

```sql
ALTER TABLE "tasting_plans" DROP CONSTRAINT IF EXISTS "tasting_plans_derived_from_template_id_tasting_plans_id_fk";
ALTER TABLE "tasting_plans" ADD CONSTRAINT "tasting_plans_derived_from_template_id_tasting_templates_id_fk"
  FOREIGN KEY ("derived_from_template_id") REFERENCES "tasting_templates"("id") ON DELETE set null;
```

(Constraint names vary — inspect the existing schema for the actual name with `grep -n derivedFromTemplate src/migrations/*.json | head` to find what Payload originally generated.)

- [ ] **Step 6: TS sweep + commit**

```bash
pnpm exec tsc --noEmit 2>&1 | grep -E "(TastingTemplates|TastingPlans|payload\.config)" | head
git add src/collections/TastingTemplates.ts \
  src/collections/TastingPlans.ts \
  src/payload.config.ts \
  src/migrations/ \
  src/payload-types.ts
git commit -m "$(cat <<'EOF'
otter: TastingTemplates collection + derivedFromTemplate FK swap

Admin-curated tasting templates (library wines only). Public read
on published-only; admin write. Includes seoTitle/seoDescription,
featuredImage, slug auto-generation, and publishedAt stamping.

TastingPlans.derivedFromTemplate flipped to point at the new
collection (FK swap; column has no rows yet so it's safe).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Clone API

**Files:**
- Create: `src/app/api/tasting-plans/from-template/[templateId]/route.ts`

- [ ] **Step 1: Create the route**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { loggerFor } from '@/lib/logger'
import type { TastingTemplate } from '@/payload-types'

const log = loggerFor('api-tasting-plans-from-template')

/**
 * POST /api/tasting-plans/from-template/[templateId]
 *
 * Auth required. Clones a published TastingTemplate into a new TastingPlan
 * owned by the authenticated user. Returns the new plan in { plan } shape.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> },
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { templateId } = await params
  const tplId = Number(templateId)
  if (!Number.isInteger(tplId)) {
    return NextResponse.json({ error: 'Invalid template id' }, { status: 400 })
  }

  const payload = await getPayload({ config })

  // Read via the collection's access rules — drafts are hidden from non-admins.
  let template: TastingTemplate | null = null
  try {
    template = (await payload.findByID({
      collection: 'tasting-templates',
      id: tplId,
      depth: 1,
      overrideAccess: false,
      user,
    })) as TastingTemplate
  } catch {
    template = null
  }

  if (!template || template.publishedStatus !== 'published') {
    // Admin reading a draft via overrideAccess: false will return the doc;
    // but we still gate cloning on published status to keep prod behavior consistent.
    if (!(user.role === 'admin' && template)) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }
  }

  const wines = (template.wines ?? []).map((w, idx) => ({
    libraryWine:
      typeof w.libraryWine === 'object' && w.libraryWine
        ? w.libraryWine.id
        : (w.libraryWine as number | null),
    pourOrder: w.pourOrder ?? idx + 1,
    hostNotes: w.hostNotes ?? '',
  }))

  try {
    const created = await payload.create({
      collection: 'tasting-plans',
      data: {
        owner: user.id,
        title: template.title,
        description: template.description || undefined,
        occasion: template.occasion || undefined,
        targetParticipants: template.targetParticipants ?? 4,
        wines,
        hostScript: template.hostScript || undefined,
        status: 'draft',
        derivedFromTemplate: template.id,
      },
      overrideAccess: false,
      user,
    })
    return NextResponse.json({ plan: created }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log.error('Failed to clone template', { userId: user.id, templateId: tplId, message })
    const isValidation = err instanceof Error && err.name === 'ValidationError'
    return NextResponse.json(
      { error: isValidation ? message : 'Kunde inte skapa plan från mallen.' },
      { status: isValidation ? 400 : 500 },
    )
  }
}
```

- [ ] **Step 2: TS sweep + smoke + commit**

```bash
pnpm exec tsc --noEmit 2>&1 | grep "from-template" | head
```
Expected: no output.

```bash
lsof -nP -i tcp:3000 | grep LISTEN | head -1 || (pnpm dev > /tmp/dev.log 2>&1 &)
until curl -s --max-time 3 http://localhost:3000/api/users/me >/dev/null 2>&1; do sleep 2; done
curl -s -X POST http://localhost:3000/api/tasting-plans/from-template/1 -w "\nHTTP %{http_code}\n"
```
Expected: `{"error":"Unauthorized"}` + HTTP 401.

```bash
git add "src/app/api/tasting-plans/from-template/[templateId]/route.ts"
git commit -m "$(cat <<'EOF'
otter: POST /api/tasting-plans/from-template/[id]

Auth-required clone of a published TastingTemplate into a new
TastingPlan owned by the requester. Status defaults to 'draft';
derivedFromTemplate is stamped. Mirrors the POST /api/tasting-plans
contract (try/catch, ValidationError → 400, fallback 500).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Components — TemplateCard, UseTemplateButton, TemplateDetailView

**Files:**
- Create: `src/components/tasting-template/TemplateCard.tsx`
- Create: `src/components/tasting-template/UseTemplateButton.tsx`
- Create: `src/components/tasting-template/TemplateDetailView.tsx`

- [ ] **Step 1: Create `TemplateCard.tsx`**

```tsx
import Link from 'next/link'
import type { TastingTemplate, Media } from '@/payload-types'
import { Card } from '@/components/ui/card'
import { Wine as WineIcon } from 'lucide-react'

export interface TemplateCardProps {
  template: TastingTemplate
}

export function TemplateCard({ template }: TemplateCardProps) {
  const wineCount = template.wines?.length ?? 0
  const image =
    typeof template.featuredImage === 'object' && template.featuredImage
      ? (template.featuredImage as Media)
      : null
  const imageUrl =
    image && typeof image === 'object'
      ? image.sizes?.thumbnail?.url ?? image.url ?? null
      : null

  return (
    <Link href={`/provningsmallar/${template.slug}`} className="block group">
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <div className="aspect-[4/3] bg-muted relative">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <WineIcon className="h-10 w-10 text-muted-foreground/40" />
            </div>
          )}
        </div>
        <div className="p-4 space-y-1">
          <h3 className="font-semibold truncate group-hover:text-brand-400 transition-colors">
            {template.title}
          </h3>
          <p className="text-xs text-muted-foreground truncate">
            {[template.occasion, `${wineCount} viner`].filter(Boolean).join(' · ')}
          </p>
          <p className="text-xs text-muted-foreground mt-2">Av Vinakademin</p>
        </div>
      </Card>
    </Link>
  )
}
```

- [ ] **Step 2: Create `UseTemplateButton.tsx`**

```tsx
'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'

export interface UseTemplateButtonProps {
  templateId: number
  templateSlug: string
}

export function UseTemplateButton({ templateId, templateSlug }: UseTemplateButtonProps) {
  const router = useRouter()
  const [busy, setBusy] = React.useState(false)

  async function handleClick() {
    setBusy(true)
    try {
      const res = await fetch(`/api/tasting-plans/from-template/${templateId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.status === 401) {
        router.push(`/logga-in?from=/provningsmallar/${templateSlug}`)
        return
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error || 'Kunde inte använda mallen.')
        return
      }
      if (data.plan?.id) {
        toast.success('Plan skapad — du kan justera den nu.')
        router.push(`/skapa-provning/${data.plan.id}`)
      }
    } catch {
      toast.error('Nätverksfel — försök igen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button type="button" onClick={handleClick} disabled={busy} className="w-full">
      <Sparkles className="h-4 w-4 mr-2" />
      {busy ? 'Skapar plan…' : 'Använd mallen'}
    </Button>
  )
}
```

- [ ] **Step 3: Create `TemplateDetailView.tsx`**

```tsx
import Link from 'next/link'
import type { TastingTemplate, Wine, Media } from '@/payload-types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Wine as WineIcon, Users } from 'lucide-react'
import { UseTemplateButton } from './UseTemplateButton'

function wineTitle(w: NonNullable<TastingTemplate['wines']>[number]): string {
  if (w.libraryWine && typeof w.libraryWine === 'object') {
    const lib = w.libraryWine as Wine
    return lib.name || `Vin #${lib.id}`
  }
  return 'Vin'
}

function wineSubtitle(w: NonNullable<TastingTemplate['wines']>[number]): string {
  if (w.libraryWine && typeof w.libraryWine === 'object') {
    const lib = w.libraryWine as Wine
    const region =
      typeof lib.region === 'object' && lib.region ? lib.region.name ?? null : null
    return [lib.winery, lib.vintage ? String(lib.vintage) : null, region]
      .filter(Boolean)
      .join(' · ')
  }
  return ''
}

function wineThumb(w: NonNullable<TastingTemplate['wines']>[number]): string | null {
  if (!(w.libraryWine && typeof w.libraryWine === 'object')) return null
  const lib = w.libraryWine as Wine
  const image = typeof lib.image === 'object' && lib.image ? lib.image : null
  if (!image) return null
  return image.sizes?.thumbnail?.url ?? image.url ?? null
}

export interface TemplateDetailViewProps {
  template: TastingTemplate
}

export function TemplateDetailView({ template }: TemplateDetailViewProps) {
  const wines = template.wines ?? []
  const featured =
    typeof template.featuredImage === 'object' && template.featuredImage
      ? (template.featuredImage as Media)
      : null
  const heroUrl = featured ? featured.url ?? null : null

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-32 grid gap-8 md:grid-cols-[1fr_280px]">
      <div className="space-y-6 min-w-0">
        <Link
          href="/provningsmallar"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Tillbaka till alla mallar
        </Link>

        {heroUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroUrl}
            alt=""
            className="w-full aspect-[16/9] object-cover rounded-lg"
          />
        ) : (
          <div className="w-full aspect-[16/9] bg-muted rounded-lg flex items-center justify-center">
            <WineIcon className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}

        <header>
          <h1 className="text-3xl font-heading">{template.title}</h1>
          {template.description && (
            <p className="text-base text-muted-foreground mt-2 whitespace-pre-wrap">
              {template.description}
            </p>
          )}
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <span>{template.occasion || '—'}</span>
            <span>·</span>
            <span>{wines.length} viner</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              ~{template.targetParticipants ?? 4} deltagare
            </span>
            <span>·</span>
            <span>Av Vinakademin</span>
          </div>
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Viner</h2>
          {wines.length === 0 ? (
            <p className="text-sm text-muted-foreground">Inga viner i mallen.</p>
          ) : (
            <ul className="space-y-2">
              {wines.map((w, idx) => {
                const thumb = wineThumb(w)
                return (
                  <li
                    key={w.id ?? idx}
                    className="flex gap-3 rounded-md border bg-card p-3 items-start"
                  >
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-400/10 text-brand-400 text-sm font-medium flex items-center justify-center">
                      {w.pourOrder ?? idx + 1}
                    </div>
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt=""
                        className="h-10 w-10 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{wineTitle(w)}</p>
                      {wineSubtitle(w) && (
                        <p className="text-xs text-muted-foreground truncate">{wineSubtitle(w)}</p>
                      )}
                      {w.hostNotes && (
                        <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">
                          {w.hostNotes}
                        </p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {template.hostScript && (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Manus för värden</h2>
            <Card className="p-4">
              <p className="text-sm whitespace-pre-wrap">{template.hostScript}</p>
            </Card>
          </section>
        )}
      </div>

      <aside className="md:sticky md:top-20 md:self-start space-y-2">
        <UseTemplateButton templateId={template.id} templateSlug={template.slug} />
        <p className="text-xs text-muted-foreground text-center">
          Du landar på din egen redigerbara plan.
        </p>
      </aside>
    </div>
  )
}
```

- [ ] **Step 4: TS sweep + commit**

```bash
pnpm exec tsc --noEmit 2>&1 | grep "tasting-template/" | head
git add src/components/tasting-template/
git commit -m "$(cat <<'EOF'
otter: TastingTemplate UI components

TemplateCard for the listing grid; UseTemplateButton (client) calls
the clone API and routes to login if unauth or to the new plan's
edit page on success; TemplateDetailView is the read-only detail
layout with action rail.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Listing + detail pages

**Files:**
- Create: `src/app/(frontend)/(site)/provningsmallar/page.tsx`
- Create: `src/app/(frontend)/(site)/provningsmallar/[slug]/page.tsx`

- [ ] **Step 1: Listing page**

`src/app/(frontend)/(site)/provningsmallar/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { TemplateCard } from '@/components/tasting-template/TemplateCard'
import type { TastingTemplate } from '@/payload-types'

export const metadata: Metadata = {
  title: 'Provningsmallar — Vinakademin',
  description:
    'Färdiga provningsupplägg från Vinakademin. Klona en mall, anpassa, och starta din egen provning.',
}

export const dynamic = 'force-dynamic'

export default async function ProvningsmallarListing() {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'tasting-templates',
    where: { publishedStatus: { equals: 'published' } },
    sort: '-publishedAt',
    limit: 60,
    depth: 1,
  })
  const templates = docs as TastingTemplate[]

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-heading">Provningsmallar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Färdiga provningsupplägg från Vinakademin. Klona en mall, anpassa, och starta din egen
          provning.
        </p>
      </header>

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

- [ ] **Step 2: Detail page**

`src/app/(frontend)/(site)/provningsmallar/[slug]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { TemplateDetailView } from '@/components/tasting-template/TemplateDetailView'
import type { TastingTemplate } from '@/payload-types'

interface RouteParams {
  params: Promise<{ slug: string }>
}

async function loadTemplate(slug: string): Promise<TastingTemplate | null> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'tasting-templates',
    where: {
      and: [
        { slug: { equals: slug } },
        { publishedStatus: { equals: 'published' } },
      ],
    },
    depth: 2,
    limit: 1,
  })
  return (docs[0] as TastingTemplate) ?? null
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { slug } = await params
  const template = await loadTemplate(slug)
  if (!template) return { title: 'Provningsmall — Vinakademin' }
  return {
    title: template.seoTitle || `${template.title} — Provningsmallar | Vinakademin`,
    description:
      template.seoDescription ||
      template.description?.slice(0, 160) ||
      'En provningsmall från Vinakademin.',
  }
}

export const dynamic = 'force-dynamic'

export default async function ProvningsmallDetailPage({ params }: RouteParams) {
  const { slug } = await params
  const template = await loadTemplate(slug)
  if (!template) notFound()
  return <TemplateDetailView template={template} />
}
```

- [ ] **Step 3: TS sweep + smoke + commit**

```bash
pnpm exec tsc --noEmit 2>&1 | grep "provningsmallar" | head
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/provningsmallar
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/provningsmallar/non-existent-slug
```
Expected:
- TS: no output
- Listing: 200
- Bad slug: 404

```bash
git add "src/app/(frontend)/(site)/provningsmallar"
git commit -m "$(cat <<'EOF'
otter: /provningsmallar listing + [slug] detail pages

Public server-rendered listing and detail. Drafts hidden via the
collection's read access. Detail SEO metadata falls back through
seoTitle → title and seoDescription → description excerpt.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Nav link

**File:** `src/components/top-nav-header.tsx`

- [ ] **Step 1: Add the link to NAV_LINKS**

Find the existing array:

```ts
const NAV_LINKS = [
  { label: 'Vinprovningar', href: '/vinprovningar' },
  { label: 'Vinlistan', href: '/vinlistan' },
  { label: 'Artiklar', href: '/artiklar' },
  { label: 'Om oss', href: '/om-oss' },
]
```

Insert `{ label: 'Provningsmallar', href: '/provningsmallar' }` BETWEEN `Vinprovningar` and `Vinlistan`:

```ts
const NAV_LINKS = [
  { label: 'Vinprovningar', href: '/vinprovningar' },
  { label: 'Provningsmallar', href: '/provningsmallar' },
  { label: 'Vinlistan', href: '/vinlistan' },
  { label: 'Artiklar', href: '/artiklar' },
  { label: 'Om oss', href: '/om-oss' },
]
```

- [ ] **Step 2: Commit**

```bash
git add src/components/top-nav-header.tsx
git commit -m "$(cat <<'EOF'
otter: top-nav — Provningsmallar link

Sits between Vinprovningar and Vinlistan so the discovery sequence
goes courses → templates → wines.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: E2E + push to production

- [ ] **Step 1: Lint + TS sweep**

```bash
pnpm lint 2>&1 | tail -20
pnpm exec tsc --noEmit 2>&1 | grep -E "(TastingTemplate|tasting-template|provningsmallar|from-template|top-nav-header)" | head -40
```
Expected: lint clean; no NEW TS errors in touched files.

- [ ] **Step 2: Build smoke**

```bash
pnpm build 2>&1 | tail -40
```
Expected: "Compiled successfully".

- [ ] **Step 3: Curl smoke**

```bash
lsof -nP -i tcp:3000 | grep LISTEN | head -1 || (pnpm dev > /tmp/dev.log 2>&1 &)
until curl -s --max-time 3 http://localhost:3000/api/users/me >/dev/null 2>&1; do sleep 2; done

# Public listing → 200
curl -s -o /dev/null -w "/provningsmallar → %{http_code}\n" http://localhost:3000/provningsmallar

# Non-existent slug → 404
curl -s -o /dev/null -w "/provningsmallar/zzz-not-real → %{http_code}\n" http://localhost:3000/provningsmallar/zzz-not-real

# Clone unauth → 401
curl -s -X POST -w "\nPOST /from-template/1 unauth → %{http_code}\n" \
  http://localhost:3000/api/tasting-plans/from-template/1 | tail -3
```
Expected: 200, 404, 401.

- [ ] **Step 4: Manual UI smoke (deferred to user / document)**

Document for the user:

1. Admin creates a template with `publishedStatus = 'published'`, slug auto-fills, ≥3 wines, featuredImage uploaded.
2. Public visits `/provningsmallar` → sees the card.
3. Click card → lands on `/provningsmallar/[slug]` → sees the read-only detail.
4. Click `Använd mallen` as a guest → redirected to `/logga-in?from=/provningsmallar/[slug]`.
5. Log in → re-click `Använd mallen` → land on `/skapa-provning/[newId]` with title and wines pre-filled.
6. Edit and save → plan persists with `derivedFromTemplate` set (verify in admin).
7. Switch template's `publishedStatus` back to `draft` → it disappears from `/provningsmallar` and `/provningsmallar/[slug]` 404s.

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
release: Chunk E — Tasting Templates

Admin-curated tasting templates members can clone into their own
draft plans:
- TastingTemplates collection (admin write, public-published read)
- /provningsmallar listing + [slug] detail (public, SEO-friendly)
- UseTemplateButton + clone API (auth-gated, drops to login otherwise)
- TastingPlans.derivedFromTemplate now points at tasting-templates
- top-nav adds Provningsmallar between Vinprovningar and Vinlistan

Schema migration creates the new table and swaps the FK on
derivedFromTemplate (no data rows existed yet).

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

## Out of scope (deferred / never)

- Categories, filters, tags.
- Featured-templates carousel.
- Per-template ratings.
- Per-author byline.
- Custom wines in templates.
- Member-authored public templates.
- Localization beyond Swedish.
