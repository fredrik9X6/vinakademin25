# Chunk P — Admin Frontend Editor for TastingTemplates — Design

**Author:** Fredrik (with assistant)
**Date:** 2026-05-17
**Status:** Draft, awaiting final review

## Context & motivation

Today `TastingTemplates` are admin-curated via the Payload admin UI. After Chunk O the public library at `/provningsmallar` knows how to display them (with access chips, locked teasers, etc.) — but adding/editing templates means leaving the site and using Payload's grid editor.

We want admins to live on the site: create and edit templates with the same UX members use for their own plans, plus the template-specific extras (hero image, SEO meta, tags, access level, publish toggle). The end goal is a one-stop experience where admins build the library without ever opening `/admin`.

Templates only contain library wines (`tasting_templates.wines[].libraryWine`, required) — no customWines, no blind-answer fields. So the form is simpler than `TastingPlanForm`. We'll build a focused `TemplateForm` and a new `LibraryWinePicker` for searching the curated `wines` collection (the existing `/api/wines/search` endpoint already serves this).

## What ships in v1

- Two admin-only frontend routes:
  - `/provningsmallar/ny` — create a new template.
  - `/provningsmallar/redigera/[id]` — edit an existing one (numeric id).
- New `TemplateForm` component covering: title, slug (auto-derived, editable), description, target participants, host script, tags (chip input), featured image upload, SEO title/description, access level toggle, publish toggle, wines list with library-wine search + drag-to-reorder + host notes per wine.
- New `LibraryWinePicker` component (search-as-you-type against `/api/wines/search`).
- Two new API endpoints:
  - `POST /api/tasting-templates` — create (admin-only).
  - `PATCH /api/tasting-templates/[id]` — update (admin-only).
- A "Skapa ny mall" button on `/provningsmallar` visible only to admins.
- A "Redigera" button on `/provningsmallar/[slug]` (unlocked detail view) visible only to admins.

Slug uniqueness: the existing TastingTemplates collection already has a slug field with collection-level uniqueness; we re-derive on each save from the title unless the admin has manually edited it.

No migration. No schema change. No subscription work (Chunk Q).

## Architecture

### Routes

```
src/app/(frontend)/(site)/provningsmallar/
  ny/page.tsx                    — create form (server component, admin gate, mounts <TemplateForm/>)
  redigera/[id]/page.tsx         — edit form  (admin gate + loads existing template, mounts <TemplateForm initialTemplate={...} />)
  [slug]/page.tsx                — (existing, gets "Redigera" affordance for admins)
  page.tsx                       — (existing, gets "Skapa ny mall" CTA for admins)
```

Both editor routes server-side check `getUser().role === 'admin'`. Non-admins get a `notFound()` (404). Logged-out → middleware bounces to `/logga-in`.

### `TemplateForm` (new) — `src/components/tasting-template/TemplateForm.tsx`

Client component. Single form for both create + edit. Shape:

```tsx
interface TemplateFormProps {
  /** Undefined for create; populated for edit. */
  initialTemplate?: TastingTemplate
}
```

Top-to-bottom layout (mobile-first, sm+ adds a side rail):

```
┌─────────────────────────────────────────────────────┐
│  Provningsmall                                       │
│                                                      │
│  Titel*  [────────────────────────]                  │
│  Slug    [provningsmall-slug] (auto-derived,         │
│          editable)                                   │
│  Beskrivning [───── textarea ─────]                  │
│  Antal deltagare  [4 ▾]                              │
│                                                      │
│  Omslagsbild                                         │
│  [hero preview]   [Ladda upp]   [Ta bort]           │
│                                                      │
│  Taggar (chip input)                                 │
│  [Rött vin ×] [Frankrike ×] [Add: ...]              │
│                                                      │
│  Viner                                               │
│  [Lägg till vin från biblioteket ▾]                  │
│  ┌─ 1 [bottle] Wine A — notes ──────── [drag][×]─┐  │
│  ┌─ 2 [bottle] Wine B — notes ──────── [drag][×]─┐  │
│  ...                                                 │
│                                                      │
│  Manus för värden (frivilligt)                       │
│  [───── textarea ─────]                              │
│                                                      │
│  SEO                                                 │
│    SEO-titel    [───]                                │
│    SEO-beskrivning [───]                             │
│                                                      │
│  Status                                              │
│   ◯ Utkast   ◉ Publicerad                            │
│   ◉ Fri      ◯ Endast medlemmar                      │
│                                                      │
│  [Spara]  [Avbryt]                                   │
└─────────────────────────────────────────────────────┘
```

Validation:
- title required (1–100 chars)
- ≥1 wine required to publish (saving as draft with 0 wines allowed)
- slug regex `[a-z0-9-]+`, derived from title via slugify if untouched
- targetParticipants 1–50

Drag-to-reorder reuses the existing `SortableWineRow` visual look (big-faded-number-behind-bottle) but with template-specific simplifications: only library wine display, no BlindAnswerInputs, no priceSek input. May or may not reuse `SortableWineRow` directly — likely a small `TemplateSortableWineRow` (subset of fields) to avoid type contortions. Either way, dnd-kit setup is identical.

### `LibraryWinePicker` (new) — `src/components/tasting-template/LibraryWinePicker.tsx`

Lightweight popover with a search input. Hits `/api/wines/search?q=<query>` (debounced 250 ms). Renders the top 10 results: bottle thumb + name + producer + vintage. Click → emits `{ id, title, producer, vintage, region, thumbnailUrl }` to the parent. Empty query state: a short helper text "Sök efter ett vin från biblioteket".

The endpoint already requires auth — we don't expose library search to anonymous visitors. Admins are auth-ed by definition.

### Hero image upload

Reuses Payload's `/api/media` endpoint (it accepts `multipart/form-data` for upload). The picker uploads → gets back the Media doc id → stores `featuredImage: id` on the template payload. We show the preview from `media.url` after upload succeeds.

For simplicity, no in-form cropping — admins crop ahead of time. The S3 prod prefix handling (dev/ vs production/) is already wired in `payload.config.ts`.

### Tags input

A small chip-style component. Empty input + Enter adds the chip; X removes. Tags are free-form strings, matching the existing collection field (`type: 'text', hasMany: true`).

Implementation: state is `string[]`. A controlled `<Input>` on Enter pushes the trimmed value if non-empty and not duplicate. Suggestions from existing tags (the `/provningsmallar` index already aggregates tag counts) — fetch the top 20 most-used tags via a new tiny endpoint OR just from a server-rendered prop on the page. Pragmatic v1: omit autocomplete — admins type tags directly.

### Save endpoints

`POST /api/tasting-templates`:
```ts
{
  title: string,
  slug: string,
  description?: string,
  targetParticipants?: number,
  featuredImage?: number,            // media id
  tags?: string[],
  seoTitle?: string,
  seoDescription?: string,
  publishedStatus: 'draft' | 'published',
  accessLevel: 'free' | 'members_only',
  hostScript?: string,
  wines: Array<{
    libraryWine: number,             // wine id (required)
    pourOrder?: number,
    hostNotes?: string,
  }>,
}
```

Admin-only via `getUser().role === 'admin'`. Returns the created template (with id + slug for redirect to `/provningsmallar/redigera/<id>` and then on `[Visa publikt]` to `/provningsmallar/<slug>`).

`PATCH /api/tasting-templates/[id]`: same body shape, all fields optional. Admin-only. Returns the updated template.

Delete? Not in v1 — admins use Payload admin if they need to delete. (We can add a `DELETE` endpoint later.)

### Read-only surface updates

`/provningsmallar/page.tsx`:
- Above the grid (next to the filter pills), if `user.role === 'admin'`: show a `<Button asChild><Link href="/provningsmallar/ny">+ Skapa ny mall</Link></Button>`.

`/provningsmallar/[slug]/page.tsx` (unlocked path → `TemplateDetailView`):
- In the right rail (where `UseTemplateButton` lives), if admin: show an additional `<Button asChild variant="outline"><Link href={\`/provningsmallar/redigera/\${template.id}\`}>Redigera mallen</Link></Button>` above the "Använd den här mallen" button.

The locked detail view doesn't get the edit affordance — admins always see the full view (per `viewerIsMember`).

### Reused utilities / patterns

- `getUser`
- `/api/wines/search` (existing)
- `Payload`'s `/api/media` upload endpoint (existing)
- `SortableWineRow` visual pattern (the big-faded-number-behind-bottle look)
- `Button`, `Input`, `Textarea`, `Select` from shadcn UI
- `Switch` or radio for status / access level
- `toast` from sonner for save success/error
- Slugify: a tiny inline helper (lowercase, strip non-`[a-z0-9-]`, collapse hyphens)

## What we explicitly do NOT do in v1

- **No delete from frontend.** Admins use Payload admin for destructive ops.
- **No image cropping in the form.** Admins prep images ahead of time.
- **No tag autocomplete from existing tags.** Free-text only. Can fold in later if tag drift becomes annoying.
- **No bulk import / CSV upload.** A nice future feature; out of scope.
- **No duplicate-from-existing flow.** Admins clone in Payload admin if they want to start from an existing template.
- **No live preview pane.** Admins click "Visa publikt" after save to see the rendered detail.
- **No instructor-role access.** Only `admin` can hit the editor. Adding `instructor` is a one-line change later.
- **No autosave.** Explicit save button. (TastingPlanForm has autosave for plans-in-flight; templates are a more deliberate authoring surface.)

## Verification

End-to-end smoke list:

1. **Non-admin gating.** As a regular user, visit `/provningsmallar/ny` → 404. Same for `/provningsmallar/redigera/<id>`. As a logged-out visitor → bounced to `/logga-in`.
2. **Admin sees CTA on the index.** As admin, `/provningsmallar` shows a "+ Skapa ny mall" button above the grid. Regular users don't see it.
3. **Create flow.** As admin, click "+ Skapa ny mall". Fill in title, description, upload a hero image, add 3 wines from the library picker, drag to reorder, add tags, set status=Publicerad + accessLevel=members_only. Click Spara. Land on `/provningsmallar/redigera/<id>` with all fields persisted. Confirm in Payload admin too.
4. **Slug auto-derive.** Type title "Champagnens hemligheter". Confirm slug auto-fills "champagnens-hemligheter". Edit slug to "bubbel-101" — confirm it stays edited on subsequent title changes.
5. **Library wine picker.** Open the wine picker, type "pongracz". Confirm hits appear with thumb + producer. Click one → it lands in the wines list with the next pourOrder.
6. **Drag to reorder.** Drag wine 3 to slot 1. Confirm pourOrders renumber 1..N.
7. **Edit flow.** Visit `/provningsmallar/redigera/<id>` of a template you just created. Confirm all fields pre-fill. Edit the title, add a tag, remove a wine, save. Confirm the changes persist on `/provningsmallar/<slug>`.
8. **"Redigera" button on detail.** As admin, visit `/provningsmallar/<slug>`. Confirm a "Redigera mallen" button appears in the right rail above the "Använd" button. Click → lands on editor.
9. **Publish gating.** Set status=Utkast on a template. Confirm it does NOT appear in `/provningsmallar` index (existing filter via publishedStatus=published).
10. **Hero image upload.** Upload a 4 MB PNG. Confirm Payload returns a Media row with the uploaded image; preview renders in the form; save persists.
11. **SEO meta.** Fill in SEO title + description. Confirm they render in `<head>` of `/provningsmallar/<slug>` via the existing `generateMetadata`.
12. **No wines + draft = OK.** Create a template with 0 wines and status=Utkast. Save succeeds. Setting status=Publicerad on the same template with 0 wines → validation error "Lägg till minst ett vin för att publicera."
13. **Server validation backstop.** Use curl to POST `/api/tasting-templates` as a non-admin → 403. As an unauthed visitor → 401.

## Risk / fallback

- **Media upload errors.** If the S3 upload fails, the form surfaces the error and the template save doesn't fire. Admin retries.
- **Slug collision.** The collection's existing slug uniqueness throws a Payload ValidationError. The form catches and shows "Den här slug:en är upptagen — välj en annan." If it ships without that catch, admins see the raw error message until we polish.
- **Drag perf with 20+ wines.** dnd-kit handles this fine (we already use it on TastingPlanForm with similar sizes). Not a real concern at template sizes (4–8 wines typical).
- **API surface for `/api/wines/search`.** Already auth-gated. Admins are authed; no leak.
- **Concurrent edits.** Two admins editing the same template at the same time: last write wins. No optimistic locking in v1. Mitigated by Payload's `updatedAt` and the fact that we have only ~2 admins in practice.
- **Editor route name collision.** `/provningsmallar/[slug]` is dynamic and could in theory match `/provningsmallar/ny` or `/provningsmallar/redigera`. Next.js's file-system routing handles `[slug]` as catch-all *after* static segments, so `ny/page.tsx` and `redigera/[id]/page.tsx` take precedence. Verified during build.
- **Browser back / unsaved changes.** Not handled in v1. Browser default warning fires on full navigation; Next.js link clicks don't. Future polish.
