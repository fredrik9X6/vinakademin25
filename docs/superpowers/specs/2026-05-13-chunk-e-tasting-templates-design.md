# Chunk E — Tasting Templates: Design Spec

**Status:** Approved 2026-05-13. Implementation plan to follow.

## Goal

Admin-curated "starter pack" tasting plans browsable at `/provningsmallar`. A member clicks `Använd mallen` and lands on a pre-filled draft `TastingPlan` they own. Public listing for SEO + signup-funnel; cloning requires auth.

## Scope decisions (locked)

- **Public browsing** of listing and detail. Cloning requires authentication.
- **Library wines only** in templates — no XOR with customWine. Cloned plans inherit the library-wine references.
- **Lean superset** field set: TastingPlans fields + `slug`, `featuredImage`, `seoTitle`, `seoDescription`, `publishedStatus`, `publishedAt`. No difficulty / duration / taste-profile fields.
- **Brand-only byline** ("Av Vinakademin") — no per-template author field.

## Schema

### New collection `TastingTemplates`

| Field | Type | Constraints / Notes |
|---|---|---|
| `title` | text | required, maxLength 100 |
| `slug` | text | required, unique, lowercase-hyphenated; auto-generated from title via `beforeChange` hook |
| `description` | textarea | maxLength 500 |
| `occasion` | text | optional, e.g. "Sommarrosé-flight" |
| `targetParticipants` | number | default 4, min 1, max 50 |
| `wines` | array | each item: `libraryWine` (rel→wines, **required**), `pourOrder` (number, min 1), `hostNotes` (textarea). No customWine group. Minimum length not enforced at the schema level — admins may save drafts with <3 wines. |
| `hostScript` | textarea | plain text (matches TastingPlans.hostScript) |
| `featuredImage` | rel→media | optional |
| `seoTitle` | text | optional, maxLength 60 |
| `seoDescription` | text | optional, maxLength 160 |
| `publishedStatus` | select | options: `draft` / `published`. default `draft`. position: sidebar. |
| `publishedAt` | date | readOnly. Auto-stamped on draft→published transition via `beforeChange`. |

**Access**:
- `read`:
  - admins: all docs
  - everyone else (including unauthenticated): `publishedStatus = 'published'` filter
- `create` / `update` / `delete`: admins only

**Slug generation**: `beforeChange` hook normalises `slug = slugify(title)` if `slug` is empty or matches a pattern of automatic dirtiness; otherwise respects admin-set slug. Use a simple slugify (`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')`). Unique constraint on the column.

### Change to existing `TastingPlans` schema

Currently:
```ts
{
  name: 'derivedFromTemplate',
  type: 'relationship',
  relationTo: 'tasting-plans',
  hasMany: false,
}
```

Change `relationTo` to `'tasting-templates'`. The column has no data (no clones yet), so this is a safe FK swap. Payload's migration generator will emit `DROP CONSTRAINT … ADD CONSTRAINT …` against the existing nullable column.

## API

**`POST /api/tasting-plans/from-template/[templateId]`**
- Auth required: `getUser` → 401 with `{error: 'Unauthorized'}` if no user.
- Fetch template via `payload.findByID({ collection: 'tasting-templates', id, overrideAccess: false, user })` so the access rules apply (drafts blocked for non-admins).
- If `!template` or `template.publishedStatus !== 'published'` (and user is not admin) → 404.
- Build new TastingPlan data:
  - `owner: user.id`
  - `title: template.title`
  - `description: template.description || undefined`
  - `occasion: template.occasion || undefined`
  - `targetParticipants: template.targetParticipants ?? 4`
  - `wines:` `template.wines.map(w => ({ libraryWine: <id>, pourOrder: w.pourOrder, hostNotes: w.hostNotes ?? '' }))`
  - `hostScript: template.hostScript || undefined`
  - `status: 'draft'`
  - `derivedFromTemplate: template.id`
- Create via `payload.create({ collection: 'tasting-plans', data, overrideAccess: false, user })`.
- Wrap the create in try/catch — return 500 with Swedish fallback on failure, 400 with `err.message` on `ValidationError` (mirrors POST `/api/tasting-plans` from Chunk B).
- Response: `{ plan }` HTTP 201.

## Routes

### `/provningsmallar` (listing — public, server)

- Server component. No auth required. `dynamic = 'force-dynamic'` so freshly-published templates appear immediately.
- Query: `payload.find({ collection: 'tasting-templates', where: { publishedStatus: { equals: 'published' } }, sort: '-publishedAt', limit: 60, depth: 1 })` (depth=1 to populate featuredImage).
- Render:
  - Header: `Provningsmallar` (h1), tagline `Färdiga provningsupplägg från Vinakademin. Klona en mall, anpassa och starta din egen provning.`
  - Empty state if no published: `Inga mallar än — kom tillbaka snart.`
  - Otherwise: responsive grid (1 / 2 / 3 cols at base / md / lg) of `<TemplateCard />`.
- Metadata:
  - `title: 'Provningsmallar — Vinakademin'`
  - `description: 'Curated tasting plans from Vinakademin. Use as a starting point for your next group tasting.'`
  - canonical → `/provningsmallar`

### `/provningsmallar/[slug]` (detail — public, server)

- Server component. No auth required. `dynamic = 'force-dynamic'`.
- Query: `payload.find({ collection: 'tasting-templates', where: { and: [{ slug: { equals: slug } }, { publishedStatus: { equals: 'published' } }] }, depth: 2 })`. `notFound()` if none.
- Render `<TemplateDetailView template={template} />`.
- Metadata:
  - `title: template.seoTitle || \`${template.title} — Provningsmallar | Vinakademin\``
  - `description: template.seoDescription || template.description?.slice(0, 160)`
  - canonical → `/provningsmallar/[slug]`
  - openGraph: title + description + featured image URL

### `TemplateDetailView` layout (client for the Use-button)

- Hero block: featuredImage (full-width 16:9 if present, else muted placeholder card), title (h1), description.
- Meta row: occasion (or em-dash) · `<wineCount> viner` · `Av Vinakademin` · `~<targetParticipants> deltagare`.
- Wine list (read-only): ordered cards with pour-number pill, library wine thumbnail (40×40), title, subtitle (producer · vintage · region), hostNotes (when set).
- Host script section (if set): textarea-style readable block.
- **Sticky action rail** (right column on desktop, bottom on mobile): primary `Använd mallen` (UseTemplateButton) + secondary back-link `Tillbaka till alla mallar`.

### `TemplateCard` layout

- Card with featuredImage (4:3 cropped) at top, body padding 16px:
  - Title (h3, font-medium truncate)
  - Subtitle: occasion · `<n> viner`
  - Footer: `Av Vinakademin` caption (12px, muted).
- Whole card is a `<Link href="/provningsmallar/${slug}">` (no absolute-overlay trick — simpler since templates don't have menus).

### `UseTemplateButton`

- Client component. Props: `{ templateId: number; templateSlug: string }`.
- On click:
  - POST `/api/tasting-plans/from-template/${templateId}`
  - On 201 + `{plan}`: `router.push('/skapa-provning/${plan.id}')`
  - On 401: `router.push('/logga-in?from=/provningsmallar/${templateSlug}')`
  - On other error: `toast.error(data?.error || 'Kunde inte använda mallen.')`
- Loading state: button label flips to `Skapar plan…` while in flight; disabled.

## Navigation

Add a `Provningsmallar` link to `top-nav-header.tsx`'s `NAV_LINKS` array. Insertion point: between `Vinprovningar` and `Vinlistan` so the discovery sequence flows from "browse our courses" → "browse our templates" → "browse our wines".

## Files

```
NEW  src/collections/TastingTemplates.ts                                       new collection
MOD  src/collections/TastingPlans.ts                                           derivedFromTemplate.relationTo
EDIT src/payload.config.ts                                                     register TastingTemplates
NEW  src/migrations/<ts>_chunk_e_tasting_templates.ts                          create table + FK swap
NEW  src/app/(frontend)/(site)/provningsmallar/page.tsx                        listing (server)
NEW  src/app/(frontend)/(site)/provningsmallar/[slug]/page.tsx                 detail (server)
NEW  src/components/tasting-template/TemplateCard.tsx                          listing card
NEW  src/components/tasting-template/TemplateDetailView.tsx                    detail layout
NEW  src/components/tasting-template/UseTemplateButton.tsx                     client component (clone + redirect)
NEW  src/app/api/tasting-plans/from-template/[templateId]/route.ts             clone API
MOD  src/components/top-nav-header.tsx                                         add NAV_LINKS entry
EDIT src/payload-types.ts                                                      auto
```

## Reuse map

| Need | Source |
|---|---|
| Auth (`getUser`) | `src/lib/get-user.ts` |
| Plan-creation logic (data shape, validation) | mirror POST `/api/tasting-plans` (Chunk B) |
| Owner-scoped page pattern | mirror `/skapa-provning/[id]` (Chunk B) |
| Wine helpers | `getWineDoc` / `getWineTitle` from `src/lib/wines/get-wine-display.ts` (Chunk A) |
| shadcn primitives | Card, Button, Badge, AlertDialog already in use |
| sonner toast | existing |
| `slugify` | tiny inline helper; no new dep |
| Media thumbnail extraction | mirror Chunk D's pattern (`image.sizes?.thumbnail?.url ?? image.url`) |

## Risks

| Risk | Mitigation |
|---|---|
| `derivedFromTemplate` FK swap creates a tricky migration | Inspect generated migration carefully; expect DROP/ADD CONSTRAINT. Column has no data → safe. |
| Slug collision when admin reuses a title | `unique: true` on the column; admin sees a clear error and renames before save. |
| Featured image missing on early templates | Render muted placeholder; never crash. |
| Sitemap doesn't include templates by default | Plan-time check of the sitemap generator; add a templates section if missing. Acceptable to defer if no generator exists yet. |
| `publishedAt` not stamped on the first published save | `beforeChange` hook reads `originalDoc.publishedStatus` and compares to `data.publishedStatus`; if transition is `draft → published`, stamp `publishedAt = now`. |
| Cloning a template fails mid-flight (network/DB error) | The clone is a single `payload.create`; failure surfaces as 500 with Swedish fallback. User retries. No partial state to clean up. |

## Out of scope (deferred / never)

- Categories, filters, tags.
- Featured-templates carousel.
- Per-template ratings.
- Per-author byline (decided: brand-only).
- Custom wines in templates (library-only by design).
- Member-authored public templates.
- Localization beyond Swedish.
- Featured-image cropping UI (Payload's default upload UI is enough).

## Verification

1. Migration applies cleanly: new `tasting_templates` table + FK swap on `tasting_plans.derived_from_template_id`.
2. Admin creates a published template with title, slug auto-fills, featured image, ≥3 library wines.
3. Public `/provningsmallar` → listing renders the published template; drafts hidden.
4. Public `/provningsmallar/[slug]` → detail renders. SEO meta is the template's `seoTitle/seoDescription` or fallback.
5. Guest clicks `Använd mallen` → redirected to `/logga-in?from=/provningsmallar/[slug]`.
6. Authed user clicks `Använd mallen` → POST clones → lands on `/skapa-provning/[newId]` with the wines pre-filled.
7. Cloned plan has `derivedFromTemplate = template.id` set in admin.
8. Setting `publishedStatus = 'draft'` on a template removes it from public listing and 404s its detail page.
9. Lint + TS clean; push main → production.

## Effort

2-3 working days.
