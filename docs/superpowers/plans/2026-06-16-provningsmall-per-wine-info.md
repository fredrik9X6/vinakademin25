# Richer per-wine info for provningsmallar — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let hosts attach richer per-wine info (structured facts, host talking points, guest-facing content) to tasting templates and plans without cluttering the wine list, by moving detail out of inline rows into a focused per-wine edit sheet, and surfacing that info correctly in the live session.

**Architecture:** Add 4 optional top-level fields (`abv`, `servingTemp`, `guestDescription`, `foodPairing`) to both `TastingTemplates.wines` and `TastingPlans.wines`. Replace the inline wine rows in both editor forms with a compact `WineSummaryCard` (chips + drag + edit/remove) that opens a shared `WineDetailSheet`. Thread the new fields through the two clone routes, the session row-builder, and the server-side blind-redaction layer. In the live session, host opens a read sheet (manus + fakta) and guests see För gästerna + Fakta on reveal (gated for blind, instant for standard).

**Tech Stack:** Next.js 15 App Router, Payload CMS 3.33 (Postgres), React 19, TypeScript, Tailwind, shadcn UI (`Sheet`, `Badge`, `Textarea`, `Input`), dnd-kit.

> **Testing note:** This repo has **no automated test suite** (confirmed in CLAUDE.md). "Verify" steps therefore use the tools that exist: `pnpm generate:types` (schema validity), `npx tsc --noEmit` (typecheck), `pnpm lint`, and explicit manual checks in `pnpm dev`. Do not scaffold a test framework — it would violate "follow existing patterns".

> **Field placement (read before starting):** The 4 new fields are **top-level on each wine array entry** (siblings of `hostNotes` / `pourOrder`), NOT inside the `customWine` group — so they apply to both library and custom wines. Form state stores `abv` as `number | null` and the three text fields as `string`. On submit, send `abv` as `number | null` and text fields as `string` (empty string is fine; Payload stores it).

---

## File map

**Modify:**
- `src/collections/TastingTemplates.ts` — add 4 fields to `wines`
- `src/collections/TastingPlans.ts` — add 4 fields to `wines`
- `src/app/api/tasting-plans/from-template/[templateId]/route.ts` — carry fields
- `src/app/api/tasting-plans/[id]/duplicate/route.ts` — carry fields
- `src/app/(frontend)/(site)/mina-provningar/planer/[id]/page.tsx` — null fields in blind redaction
- `src/components/tasting-template/TemplateForm.tsx` — use card+sheet, new fields
- `src/components/tasting-plan/TastingPlanForm.tsx` — use card+sheet, new fields
- `src/components/tasting-plan/PlanSessionContent.tsx` — WineRow + rowFromEntry + render
- `src/components/tasting-plan/PlanPrintCheatSheet.tsx` — show fakta/pairing on host värdguide
- `src/components/tasting-plan/PlanDetailView.tsx` — show new fields in owner preview
- `src/components/tasting-template/TemplateDetailView.tsx` — show new fields in template preview

**Out of scope (deferred):**
- `src/components/session-history/WineRecapCard.tsx` — would require extending the `PerWineRecap` builder in `src/lib/session-recap.ts`; see Task 11 note.

**Create:**
- `src/components/tasting-shared/wine-extra-fields.ts` — shared `WineExtraFields` type + chip helpers
- `src/components/tasting-shared/WineSummaryCard.tsx` — compact sortable card
- `src/components/tasting-shared/WineDetailSheet.tsx` — per-wine edit sheet
- `src/components/tasting-shared/WineInfoReadout.tsx` — read-only sections for session

**Delete (after migration):**
- `src/components/tasting-template/TemplateSortableWineRow.tsx`
- `src/components/tasting-plan/SortableWineRow.tsx`

**Generated (do not hand-edit):**
- `src/payload-types.ts` (via `pnpm generate:types`)
- `src/migrations/<timestamp>-tasting-per-wine-info.ts` + `src/migrations/index.ts` (via `pnpm migrate:create`)

---

## Task 1: Add the 4 fields to both collections + migration + types

**Files:**
- Modify: `src/collections/TastingTemplates.ts:101-102`
- Modify: `src/collections/TastingPlans.ts:137-138`
- Generate: migration + `src/payload-types.ts`

- [ ] **Step 1: Add fields to `TastingTemplates.ts`**

In `src/collections/TastingTemplates.ts`, the `wines.fields` array currently ends with:

```ts
        { name: 'pourOrder', type: 'number', min: 1 },
        { name: 'hostNotes', type: 'textarea' },
      ],
```

Replace those two lines with (insert the 4 new fields after `hostNotes`):

```ts
        { name: 'pourOrder', type: 'number', min: 1 },
        { name: 'hostNotes', type: 'textarea' },
        // ── Richer per-wine info (2026-06). All optional. Top-level on the
        // entry so they apply to both library and custom wines.
        {
          name: 'abv',
          type: 'number',
          min: 0,
          max: 25,
          admin: { description: 'Alkoholhalt i procent (frivilligt).' },
        },
        {
          name: 'servingTemp',
          type: 'text',
          admin: { description: 'Serveringstemperatur, t.ex. "8–10 °C" (frivilligt).' },
        },
        {
          name: 'guestDescription',
          type: 'textarea',
          admin: { description: 'Beskrivning som visas för gästerna (vid avslöjande).' },
        },
        {
          name: 'foodPairing',
          type: 'text',
          admin: { description: 'Föreslagen mat till vinet (visas för gästerna).' },
        },
      ],
```

- [ ] **Step 2: Add the SAME 4 fields to `TastingPlans.ts`**

In `src/collections/TastingPlans.ts`, `hostNotes` is followed by the blind-answer fields. Insert the 4 new fields **between** `hostNotes` and the blind-answer comment block. The current code:

```ts
        { name: 'pourOrder', type: 'number', min: 1 },
        { name: 'hostNotes', type: 'textarea' },
        // ── Blind-tasting answers (Chunk I). All optional. Empty field = that
        // scoring tier is disabled for this wine in the guess game.
```

becomes:

```ts
        { name: 'pourOrder', type: 'number', min: 1 },
        { name: 'hostNotes', type: 'textarea' },
        // ── Richer per-wine info (2026-06). All optional. Top-level on the
        // entry so they apply to both library and custom wines. Must mirror
        // TastingTemplates.wines exactly so template→plan cloning is lossless.
        {
          name: 'abv',
          type: 'number',
          min: 0,
          max: 25,
          admin: { description: 'Alkoholhalt i procent (frivilligt).' },
        },
        {
          name: 'servingTemp',
          type: 'text',
          admin: { description: 'Serveringstemperatur, t.ex. "8–10 °C" (frivilligt).' },
        },
        {
          name: 'guestDescription',
          type: 'textarea',
          admin: { description: 'Beskrivning som visas för gästerna (vid avslöjande).' },
        },
        {
          name: 'foodPairing',
          type: 'text',
          admin: { description: 'Föreslagen mat till vinet (visas för gästerna).' },
        },
        // ── Blind-tasting answers (Chunk I). All optional. Empty field = that
        // scoring tier is disabled for this wine in the guess game.
```

- [ ] **Step 3: Regenerate Payload types**

Run: `pnpm generate:types`
Expected: completes without error; `src/payload-types.ts` now lists `abv?`, `servingTemp?`, `guestDescription?`, `foodPairing?` inside the `wines` item type of both `TastingTemplate` and `TastingPlan`.

Verify: `grep -n "guestDescription" src/payload-types.ts` → at least 2 hits.

- [ ] **Step 4: Create the migration**

Run: `pnpm migrate:create -- "tasting-per-wine-info"`
Expected: a new file `src/migrations/<timestamp>-tasting-per-wine-info.ts` is created and `src/migrations/index.ts` imports it. The `up` SQL should `ALTER TABLE` the wine array tables (`tasting_templates_wines`, `tasting_plans_wines`) adding `abv`, `serving_temp`, `guest_description`, `food_pairing` columns.

Verify: `grep -n "guest_description" src/migrations/*tasting-per-wine-info*.ts` → hits in both an `ALTER TABLE ... tasting_templates_wines` and `... tasting_plans_wines` statement.

> If the generated migration is empty or missing one of the two tables, the field edits in Steps 1–2 weren't saved identically — fix and re-run after deleting the empty migration file and reverting the `index.ts` import.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors (collections compile; types regenerated).

- [ ] **Step 6: Commit**

```bash
git add src/collections/TastingTemplates.ts src/collections/TastingPlans.ts src/payload-types.ts src/migrations/
git commit -m "feat(provning): add abv/servingTemp/guestDescription/foodPairing to wine entries"
```

---

## Task 2: Carry the new fields through both clone routes

The new fields are dropped on template→plan clone and plan duplicate unless added to the per-wine `.map()` explicitly (both routes build the wine object by hand).

**Files:**
- Modify: `src/app/api/tasting-plans/from-template/[templateId]/route.ts:143-148`
- Modify: `src/app/api/tasting-plans/[id]/duplicate/route.ts:71-72`

- [ ] **Step 1: from-template route — add fields to the returned wine object**

In `from-template/[templateId]/route.ts`, the `.map()` returns:

```ts
    return {
      libraryWine: libraryWine ?? null,
      ...(customWine ? { customWine } : {}),
      pourOrder: w.pourOrder ?? idx + 1,
      hostNotes: w.hostNotes ?? '',
    }
```

Replace with:

```ts
    return {
      libraryWine: libraryWine ?? null,
      ...(customWine ? { customWine } : {}),
      pourOrder: w.pourOrder ?? idx + 1,
      hostNotes: w.hostNotes ?? '',
      // Carry the richer per-wine info onto the cloned plan.
      abv: (w as { abv?: number | null }).abv ?? null,
      servingTemp: (w as { servingTemp?: string | null }).servingTemp ?? '',
      guestDescription:
        (w as { guestDescription?: string | null }).guestDescription ?? '',
      foodPairing: (w as { foodPairing?: string | null }).foodPairing ?? '',
    }
```

- [ ] **Step 2: duplicate route — add fields to the returned wine object**

In `[id]/duplicate/route.ts`, the `.map()` currently ends each wine with `hostNotes` then the three blind-answer fields. Find:

```ts
    pourOrder: w.pourOrder ?? idx + 1,
    hostNotes: w.hostNotes ?? '',
    // Carry blind-tasting answers across the duplicate so the host doesn't
    // have to re-enter them on the clone.
```

Insert the 4 fields between `hostNotes` and the blind-answer comment:

```ts
    pourOrder: w.pourOrder ?? idx + 1,
    hostNotes: w.hostNotes ?? '',
    // Carry the richer per-wine info across the duplicate.
    abv: (w as { abv?: number | null }).abv ?? null,
    servingTemp: (w as { servingTemp?: string | null }).servingTemp ?? '',
    guestDescription:
      (w as { guestDescription?: string | null }).guestDescription ?? '',
    foodPairing: (w as { foodPairing?: string | null }).foodPairing ?? '',
    // Carry blind-tasting answers across the duplicate so the host doesn't
    // have to re-enter them on the clone.
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/tasting-plans/from-template/[templateId]/route.ts" "src/app/api/tasting-plans/[id]/duplicate/route.ts"
git commit -m "feat(provning): carry per-wine info through template clone + plan duplicate"
```

---

## Task 3: Strip the new guest fields in the blind redaction layer

This is the security-critical step: in a blind tasting, `guestDescription` / `foodPairing` / `abv` / `servingTemp` must not reach a guest before the host reveals the wine. The redaction spreads `{...w}`, so the new fields pass through unless explicitly nulled.

**Files:**
- Modify: `src/app/(frontend)/(site)/mina-provningar/planer/[id]/page.tsx:144-156`

- [ ] **Step 1: Add the fields to the per-wine strip object**

Find the returned redacted object:

```ts
            return {
              ...w,
              libraryWine: null,
              customWine: undefined,
              hostNotes: null,
              // Strip the blind-tasting answers too — they'd otherwise leak
              // the country/grape/price-bucket to the guest before reveal.
              blindAnswerCountry: null,
              blindAnswerGrapes: null,
              blindAnswerPriceBucket: null,
              easyModeOptions,
              blindTiers,
            }
```

Replace with (add the 4 fields after `hostNotes: null,`):

```ts
            return {
              ...w,
              libraryWine: null,
              customWine: undefined,
              hostNotes: null,
              // Strip the richer per-wine info — guest-facing description/
              // pairing/facts would otherwise leak the wine before reveal.
              abv: null,
              servingTemp: null,
              guestDescription: null,
              foodPairing: null,
              // Strip the blind-tasting answers too — they'd otherwise leak
              // the country/grape/price-bucket to the guest before reveal.
              blindAnswerCountry: null,
              blindAnswerGrapes: null,
              blindAnswerPriceBucket: null,
              easyModeOptions,
              blindTiers,
            }
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (The redacted object is cast `as typeof plan`, so extra nulled keys are fine.)

- [ ] **Step 3: Commit**

```bash
git add "src/app/(frontend)/(site)/mina-provningar/planer/[id]/page.tsx"
git commit -m "fix(provning): redact new per-wine guest fields for unrevealed blind wines"
```

---

## Task 4: Shared types + chip helpers

A tiny module both forms and the card import, so the "what counts as filled" logic lives in exactly one place.

**Files:**
- Create: `src/components/tasting-shared/wine-extra-fields.ts`

- [ ] **Step 1: Create the module**

```ts
// Shared shape + helpers for the richer per-wine info (abv / serving temp /
// guest description / food pairing). Used by both editor forms, the summary
// card chips, and the edit sheet.

export type WineExtraFields = {
  /** Alcohol %, null when unset. */
  abv: number | null
  servingTemp: string
  guestDescription: string
  foodPairing: string
}

export const EMPTY_EXTRA: WineExtraFields = {
  abv: null,
  servingTemp: '',
  guestDescription: '',
  foodPairing: '',
}

/** Hydrate WineExtraFields from a stored wine entry (loose-typed). */
export function extraFromStored(w: {
  abv?: number | null
  servingTemp?: string | null
  guestDescription?: string | null
  foodPairing?: string | null
}): WineExtraFields {
  return {
    abv: typeof w.abv === 'number' ? w.abv : null,
    servingTemp: w.servingTemp ?? '',
    guestDescription: w.guestDescription ?? '',
    foodPairing: w.foodPairing ?? '',
  }
}

/** Serialise WineExtraFields for the save payload. */
export function extraToPayload(x: WineExtraFields): {
  abv: number | null
  servingTemp: string
  guestDescription: string
  foodPairing: string
} {
  return {
    abv: x.abv,
    servingTemp: x.servingTemp,
    guestDescription: x.guestDescription,
    foodPairing: x.foodPairing,
  }
}

export function hasFakta(x: Pick<WineExtraFields, 'abv' | 'servingTemp'>): boolean {
  return x.abv != null || x.servingTemp.trim().length > 0
}

export function hasGuestInfo(
  x: Pick<WineExtraFields, 'guestDescription' | 'foodPairing'>,
): boolean {
  return x.guestDescription.trim().length > 0 || x.foodPairing.trim().length > 0
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/tasting-shared/wine-extra-fields.ts
git commit -m "feat(provning): shared WineExtraFields type + chip helpers"
```

---

## Task 5: `WineSummaryCard` — the compact sortable card

Replaces the inline rows. Drag handle + bottle (with faded pour-number) + title/subtitle + "filled" chips + edit (tap body or pencil) + remove. No textareas — that's the whole point.

**Files:**
- Create: `src/components/tasting-shared/WineSummaryCard.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'

import * as React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { WineImagePlaceholder } from '@/components/wine/WineImagePlaceholder'

export interface WineSummaryCardChips {
  fakta: boolean
  manus: boolean
  guest: boolean
  /** Blind facit — plans only. Omit/false to hide. */
  blint?: boolean
}

export interface WineSummaryCardProps {
  /** dnd-kit sortable id (the wine's stable key). */
  id: string
  pourOrder: number
  title: string
  subtitle: string
  imageUrl?: string | null
  chips: WineSummaryCardChips
  onEdit: () => void
  onRemove: () => void
  disabled?: boolean
}

/**
 * Compact, scannable wine card for the template/plan editors. Detail lives in
 * the WineDetailSheet opened via `onEdit`; this card only shows identity + a
 * set of "filled" chips so the list stays a tight overview.
 */
export function WineSummaryCard({
  id,
  pourOrder,
  title,
  subtitle,
  imageUrl,
  chips,
  onEdit,
  onRemove,
  disabled,
}: WineSummaryCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex gap-2 sm:gap-3 rounded-lg border bg-card p-3 items-center overflow-hidden"
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground flex-shrink-0"
        aria-label="Dra för att ändra ordning"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Tapping the body opens the edit sheet. */}
      <button
        type="button"
        onClick={onEdit}
        disabled={disabled}
        className="flex flex-1 min-w-0 items-center gap-3 text-left"
      >
        <div className="relative flex-shrink-0 w-14 h-20">
          <span
            className="absolute inset-0 flex items-start justify-start font-heading leading-[0.85] text-muted-foreground/25 select-none pointer-events-none text-[72px] -ml-1 -mt-1"
            aria-hidden="true"
          >
            {pourOrder}
          </span>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="relative w-full h-full object-contain" />
          ) : (
            <WineImagePlaceholder size="sm" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {chips.fakta && <Badge variant="secondary">Fakta</Badge>}
            {chips.manus && <Badge variant="secondary">Manus</Badge>}
            {chips.guest && <Badge variant="secondary">Gäst</Badge>}
            {chips.blint && <Badge variant="secondary">Blint</Badge>}
          </div>
        </div>
        <Pencil className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        disabled={disabled}
        aria-label="Ta bort vin"
        className="flex-shrink-0"
      >
        <X className="h-4 w-4" />
      </Button>
    </li>
  )
}
```

> Confirmed: `WineImagePlaceholder` accepts `size?: 'sm' | 'md' | 'lg'` but ignores it (image scales via `object-contain`), so `size="sm"` is safe. `Badge` has a `secondary` variant. No verification needed.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/tasting-shared/WineSummaryCard.tsx
git commit -m "feat(provning): WineSummaryCard compact wine card"
```

---

## Task 6: `WineDetailSheet` — per-wine edit sheet

The focused editor that opens when you tap a card. Sections: Fakta, Värdens manus, För gästerna, and an optional blind slot (plans pass `<BlindAnswerInputs/>`).

**Files:**
- Create: `src/components/tasting-shared/WineDetailSheet.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'

import * as React from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import type { WineExtraFields } from './wine-extra-fields'

export type WineDetailValues = WineExtraFields & { hostNotes: string }

export interface WineDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Wine name for the sheet header. */
  title: string
  subtitle?: string
  values: WineDetailValues
  onChange: (patch: Partial<WineDetailValues>) => void
  /** Plan-only blind-answer inputs, rendered as a final "Blint facit" section. */
  blindSlot?: React.ReactNode
  disabled?: boolean
}

/**
 * Full-screen on mobile / side sheet on desktop editor for a single wine's
 * richer info. Keeps the wine list compact: all the longer fields live here.
 */
export function WineDetailSheet({
  open,
  onOpenChange,
  title,
  subtitle,
  values,
  onChange,
  blindSlot,
  disabled,
}: WineDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md overflow-y-auto p-0"
      >
        <SheetHeader className="px-4 py-4 pr-10 border-b">
          <SheetTitle className="truncate">{title || 'Vin'}</SheetTitle>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </SheetHeader>

        <div className="px-4 py-4 space-y-6">
          {/* Fakta */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Fakta</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="wd-abv">Alkohol (%)</Label>
                <Input
                  id="wd-abv"
                  type="number"
                  min={0}
                  max={25}
                  step={0.1}
                  value={values.abv ?? ''}
                  onChange={(e) =>
                    onChange({ abv: e.target.value === '' ? null : Number(e.target.value) })
                  }
                  disabled={disabled}
                />
              </div>
              <div>
                <Label htmlFor="wd-temp">Serveringstemp.</Label>
                <Input
                  id="wd-temp"
                  value={values.servingTemp}
                  onChange={(e) => onChange({ servingTemp: e.target.value })}
                  placeholder="t.ex. 8–10 °C"
                  disabled={disabled}
                />
              </div>
            </div>
          </section>

          {/* Värdens manus (host-only) */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Värdens manus</h3>
            <p className="text-xs text-muted-foreground">Visas bara för värden under provningen.</p>
            <Textarea
              className="min-h-[100px] text-sm"
              placeholder="Berättelse, talepunkter, vad gästerna ska leta efter…"
              value={values.hostNotes}
              onChange={(e) => onChange({ hostNotes: e.target.value })}
              disabled={disabled}
            />
          </section>

          {/* För gästerna */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">För gästerna</h3>
            <p className="text-xs text-muted-foreground">
              Visas för gästerna (vid avslöjande i blindprovning).
            </p>
            <div>
              <Label htmlFor="wd-guest-desc">Beskrivning</Label>
              <Textarea
                id="wd-guest-desc"
                className="min-h-[80px] text-sm"
                placeholder="Beskriv vinet för gästerna."
                value={values.guestDescription}
                onChange={(e) => onChange({ guestDescription: e.target.value })}
                disabled={disabled}
              />
            </div>
            <div>
              <Label htmlFor="wd-pairing">Passar till</Label>
              <Input
                id="wd-pairing"
                value={values.foodPairing}
                onChange={(e) => onChange({ foodPairing: e.target.value })}
                placeholder="t.ex. grillat lamm, hårdost"
                disabled={disabled}
              />
            </div>
          </section>

          {blindSlot && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Blint facit</h3>
              {blindSlot}
            </section>
          )}
        </div>

        <div className="sticky bottom-0 border-t bg-background px-4 py-3 flex justify-end">
          <Button type="button" onClick={() => onOpenChange(false)}>
            Klar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

> Confirmed: `src/components/ui/sheet.tsx` exports `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle` (plus `SheetClose`, `SheetFooter`, etc.). `SheetContent` renders its own close ✕ at top-right and defaults to `p-6` — hence `p-0` + per-section padding above, and `pr-10` on the header so the title clears the ✕.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/tasting-shared/WineDetailSheet.tsx
git commit -m "feat(provning): WineDetailSheet per-wine edit sheet"
```

---

## Task 7: Integrate card + sheet into `TemplateForm`

Swap the inline `TemplateSortableWineRow` for `WineSummaryCard` + `WineDetailSheet`; add the 4 fields to `WineEntry`, hydrate, submit, and handlers.

**Files:**
- Modify: `src/components/tasting-template/TemplateForm.tsx`
- Delete (end of task): `src/components/tasting-template/TemplateSortableWineRow.tsx`

- [ ] **Step 1: Update imports**

Replace:

```ts
import { TemplateSortableWineRow } from './TemplateSortableWineRow'
import { WinePicker, type CustomWineInput } from '@/components/tasting-plan/WinePicker'
```

with:

```ts
import { WinePicker, type CustomWineInput } from '@/components/tasting-plan/WinePicker'
import { WineSummaryCard } from '@/components/tasting-shared/WineSummaryCard'
import { WineDetailSheet } from '@/components/tasting-shared/WineDetailSheet'
import {
  type WineExtraFields,
  EMPTY_EXTRA,
  extraFromStored,
  hasFakta,
  hasGuestInfo,
} from '@/components/tasting-shared/wine-extra-fields'
```

- [ ] **Step 2: Add the 4 fields to `WineEntry` (both arms)**

The `WineEntry` union currently has `hostNotes: string` in each arm. Add `extra: WineExtraFields` to each arm:

```ts
type WineEntry =
  | {
      key: string
      kind: 'library'
      libraryWineId: number
      hit: LibraryWineHit
      pourOrder: number
      hostNotes: string
      extra: WineExtraFields
    }
  | {
      key: string
      kind: 'custom'
      customWine: CustomWineInput
      pourOrder: number
      hostNotes: string
      extra: WineExtraFields
    }
```

- [ ] **Step 3: Hydrate `extra` in `hydrateInitialWines`**

Both `out.push({...})` calls set `hostNotes`. Add `extra: extraFromStored(w)` to each. The library push becomes:

```ts
      out.push({
        key,
        kind: 'library',
        libraryWineId: id,
        hit: {
          id,
          title: lib?.name || `Vin #${id}`,
          producer: lib?.winery ?? null,
          vintage: lib?.vintage ?? null,
          region,
          thumbnailUrl,
        },
        pourOrder,
        hostNotes,
        extra: extraFromStored(w),
      })
```

and the custom push becomes:

```ts
      out.push({
        key,
        kind: 'custom',
        customWine: {
          name: c.name as string,
          producer: (c.producer as string | undefined) ?? undefined,
          vintage: (c.vintage as string | undefined) ?? undefined,
          type: (c.type as CustomWineInput['type'] | undefined) ?? undefined,
          systembolagetUrl: (c.systembolagetUrl as string | undefined) ?? undefined,
          priceSek: (c.priceSek as number | undefined) ?? undefined,
          systembolagetProductNumber:
            (c.systembolagetProductNumber as string | undefined) ?? undefined,
          imageUrl: (c.imageUrl as string | undefined) ?? undefined,
        },
        pourOrder,
        hostNotes,
        extra: extraFromStored(w),
      })
```

- [ ] **Step 4: Seed `extra` on new picks**

In `pickLibraryWine`, the pushed object has `hostNotes: ''`. Add `extra: { ...EMPTY_EXTRA }`:

```ts
      return [
        ...prev,
        {
          key: nextKey(),
          kind: 'library' as const,
          libraryWineId: hit.id,
          hit,
          pourOrder: prev.length + 1,
          hostNotes: '',
          extra: { ...EMPTY_EXTRA },
        },
      ]
```

In `pickCustomWine`, likewise:

```ts
    setWines((prev) => [
      ...prev,
      {
        key: nextKey(),
        kind: 'custom' as const,
        customWine: w,
        pourOrder: prev.length + 1,
        hostNotes: '',
        extra: { ...EMPTY_EXTRA },
      },
    ])
```

- [ ] **Step 5: Add sheet state + update handlers**

After the existing `function updateNotes(...)` add an open-sheet key and a patch handler, and keep `updateNotes` (the sheet patches `hostNotes` through the same shape). Add near the other handlers:

```ts
  const [editingKey, setEditingKey] = React.useState<string | null>(null)

  function updateExtra(key: string, patch: Partial<WineExtraFields & { hostNotes: string }>) {
    setWines((prev) =>
      prev.map((w) => {
        if (w.key !== key) return w
        const { hostNotes, ...extraPatch } = patch
        return {
          ...w,
          ...(hostNotes !== undefined ? { hostNotes } : {}),
          extra: { ...w.extra, ...extraPatch },
        }
      }),
    )
  }
```

- [ ] **Step 6: Add `extra` to the save payload**

In `save()`, the `wines.map(...)` currently sends `libraryWine`/`customWine`/`pourOrder`/`hostNotes`. Add the 4 fields:

```ts
        wines: wines.map((w, idx) => ({
          libraryWine: w.kind === 'library' ? w.libraryWineId : undefined,
          customWine: w.kind === 'custom' ? w.customWine : undefined,
          pourOrder: idx + 1,
          hostNotes: w.hostNotes,
          abv: w.extra.abv,
          servingTemp: w.extra.servingTemp,
          guestDescription: w.extra.guestDescription,
          foodPairing: w.extra.foodPairing,
        })),
```

- [ ] **Step 7: Replace the wine list render with cards + sheet**

Replace the entire `<ul className="space-y-2">…</ul>` block (the `wines.map((w) => { … <TemplateSortableWineRow … /> … })`) with:

```tsx
              <ul className="space-y-2">
                {wines.map((w) => {
                  const title =
                    w.kind === 'library' ? w.hit.title : w.customWine.name || 'Namnlöst vin'
                  const subtitle =
                    w.kind === 'library'
                      ? [w.hit.producer, w.hit.vintage ? String(w.hit.vintage) : null, w.hit.region]
                          .filter(Boolean)
                          .join(' · ')
                      : [w.customWine.producer, w.customWine.vintage].filter(Boolean).join(' · ')
                  const imageUrl =
                    w.kind === 'library' ? w.hit.thumbnailUrl : w.customWine.imageUrl ?? null
                  return (
                    <WineSummaryCard
                      key={w.key}
                      id={w.key}
                      pourOrder={w.pourOrder}
                      title={title}
                      subtitle={subtitle}
                      imageUrl={imageUrl}
                      chips={{
                        fakta: hasFakta(w.extra),
                        manus: w.hostNotes.trim().length > 0,
                        guest: hasGuestInfo(w.extra),
                      }}
                      onEdit={() => setEditingKey(w.key)}
                      onRemove={() => removeAt(w.key)}
                      disabled={submitting}
                    />
                  )
                })}
              </ul>
```

Then, immediately AFTER the closing `</section>` of the Viner section (after line ~542), add the sheet (driven by `editingKey`):

```tsx
      {(() => {
        const editing = wines.find((w) => w.key === editingKey)
        if (!editing) return null
        const title =
          editing.kind === 'library' ? editing.hit.title : editing.customWine.name || 'Vin'
        const subtitle =
          editing.kind === 'library'
            ? [editing.hit.producer, editing.hit.vintage ? String(editing.hit.vintage) : null]
                .filter(Boolean)
                .join(' · ')
            : [editing.customWine.producer, editing.customWine.vintage].filter(Boolean).join(' · ')
        return (
          <WineDetailSheet
            open={!!editingKey}
            onOpenChange={(o) => !o && setEditingKey(null)}
            title={title}
            subtitle={subtitle}
            values={{ ...editing.extra, hostNotes: editing.hostNotes }}
            onChange={(patch) => updateExtra(editing.key, patch)}
            disabled={submitting}
          />
        )
      })()}
```

- [ ] **Step 8: Remove the now-unused `updateNotes`**

`updateNotes` is no longer referenced (the row's notes textarea is gone; the sheet uses `updateExtra`). Delete the `function updateNotes(...)` definition to avoid an unused-var lint error.

- [ ] **Step 9: Delete the obsolete row component**

```bash
git rm src/components/tasting-template/TemplateSortableWineRow.tsx
```

- [ ] **Step 10: Typecheck + lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no errors, no unused-variable warnings for `updateNotes`.

- [ ] **Step 11: Manual check**

Run `pnpm dev`, open `/provningsmallar/redigera/<an existing template id>` (or create one). Verify: wine list shows compact cards; tapping a card opens the sheet; editing Fakta/Manus/Gäst updates the chips after closing; Save persists (reload → values stick).

- [ ] **Step 12: Commit**

```bash
git add src/components/tasting-template/TemplateForm.tsx
git commit -m "feat(provning): template editor uses compact card + detail sheet"
```

---

## Task 8: Integrate card + sheet into `TastingPlanForm`

Same swap, plus the plan sheet carries the blind-answer inputs in its blind slot.

**Files:**
- Modify: `src/components/tasting-plan/TastingPlanForm.tsx`
- Delete (end of task): `src/components/tasting-plan/SortableWineRow.tsx`

- [ ] **Step 1: Update imports**

Replace:

```ts
import { SortableWineRow } from './SortableWineRow'
```

with:

```ts
import { BlindAnswerInputs } from './BlindAnswerInputs'
import { WineSummaryCard } from '@/components/tasting-shared/WineSummaryCard'
import { WineDetailSheet } from '@/components/tasting-shared/WineDetailSheet'
import {
  type WineExtraFields,
  EMPTY_EXTRA,
  extraFromStored,
  hasFakta,
  hasGuestInfo,
} from '@/components/tasting-shared/wine-extra-fields'
```

- [ ] **Step 2: Add `extra` to both arms of `WineEntry`**

Each arm currently ends with `blindAnswers: BlindAnswersState`. Add `extra: WineExtraFields` to both:

```ts
type WineEntry =
  | {
      kind: 'library'
      key: string
      libraryWine: number
      wineSnapshot: LibraryWineResult
      country: string | null
      type: WineType | null
      pourOrder: number
      hostNotes: string
      blindAnswers: BlindAnswersState
      extra: WineExtraFields
    }
  | {
      kind: 'custom'
      key: string
      customWine: CustomWineInput
      country: string | null
      pourOrder: number
      hostNotes: string
      blindAnswers: BlindAnswersState
      extra: WineExtraFields
    }
```

- [ ] **Step 3: Hydrate `extra` in `hydrateInitialWines`**

The library `return { kind: 'library', … blindAnswers }` and the custom `return { kind: 'custom', … blindAnswers: storedBlind }` each need `extra: extraFromStored(w)` added. Library arm:

```ts
      return {
        kind: 'library',
        key,
        libraryWine: lib.id,
        wineSnapshot: {
          id: lib.id,
          title: lib.name || `Vin #${lib.id}`,
          producer: lib.winery ?? null,
          vintage: lib.vintage ?? null,
          region,
          thumbnailUrl,
        },
        country,
        type: libType,
        pourOrder,
        hostNotes,
        blindAnswers,
        extra: extraFromStored(w),
      }
```

Custom arm:

```ts
    return {
      kind: 'custom',
      key,
      customWine: {
        name: w.customWine?.name || '',
        producer: w.customWine?.producer || undefined,
        vintage: w.customWine?.vintage || undefined,
        type: (w.customWine?.type || undefined) as CustomWineInput['type'],
        systembolagetUrl: w.customWine?.systembolagetUrl || undefined,
        priceSek: w.customWine?.priceSek ?? undefined,
        systembolagetProductNumber: w.customWine?.systembolagetProductNumber || undefined,
        imageUrl: w.customWine?.imageUrl || undefined,
      },
      country: null,
      pourOrder,
      hostNotes,
      blindAnswers: storedBlind,
      extra: extraFromStored(w),
    }
```

- [ ] **Step 4: Seed `extra` on new picks**

In `pickCustom`, the new wine object sets `blindAnswers: {…}`. Add `extra: { ...EMPTY_EXTRA }` to it:

```ts
        {
          kind: 'custom' as const,
          key: nextKey(),
          customWine: w,
          country: meta?.country ?? null,
          pourOrder: prev.length + 1,
          hostNotes: '',
          blindAnswers: {
            country: meta?.country ?? null,
            grapes: mappedGrapes,
            priceBucket: null,
          },
          extra: { ...EMPTY_EXTRA },
        },
```

- [ ] **Step 5: Add sheet state + extra handler**

Add near `updateNotes` / `updateBlindAnswers`:

```ts
  const [editingKey, setEditingKey] = React.useState<string | null>(null)

  function updateExtra(key: string, patch: Partial<WineExtraFields & { hostNotes: string }>) {
    setWines((prev) =>
      prev.map((w) => {
        if (w.key !== key) return w
        const { hostNotes, ...extraPatch } = patch
        return {
          ...w,
          ...(hostNotes !== undefined ? { hostNotes } : {}),
          extra: { ...w.extra, ...extraPatch },
        }
      }),
    )
  }
```

> Keep `updateNotes` and `updateBlindAnswers` — `updateBlindAnswers` is still called by the sheet's blind slot; `updateNotes` becomes unused (the sheet patches hostNotes via `updateExtra`), so delete the `updateNotes` definition to avoid a lint error.

- [ ] **Step 6: Add `extra` fields to `buildPayload`**

In `buildPayload`, the `wines.map(...)` sends `hostNotes` + blind answers. Add the 4 fields:

```ts
      wines: wines.map((w, idx) => ({
        libraryWine: w.kind === 'library' ? w.libraryWine : undefined,
        customWine: w.kind === 'custom' ? w.customWine : undefined,
        pourOrder: idx + 1,
        hostNotes: w.hostNotes,
        abv: w.extra.abv,
        servingTemp: w.extra.servingTemp,
        guestDescription: w.extra.guestDescription,
        foodPairing: w.extra.foodPairing,
        blindAnswerCountry: w.blindAnswers.country,
        blindAnswerGrapes: w.blindAnswers.grapes,
        blindAnswerPriceBucket: w.blindAnswers.priceBucket,
      })),
```

- [ ] **Step 7: Carry `extra` + `blindAnswers` through `sortableItems`**

`sortableItems` is the per-wine view-model. Replace it so it carries what the card needs (it currently carries `hostNotes`, `imageUrl`, `blindAnswers`). Change to:

```ts
  const sortableItems = wines.map((w) => ({
    key: w.key,
    pourOrder: w.pourOrder,
    title:
      w.kind === 'library' ? w.wineSnapshot.title : w.customWine.name || 'Namnlöst vin',
    subtitle:
      w.kind === 'library'
        ? [w.wineSnapshot.producer, w.wineSnapshot.vintage, w.wineSnapshot.region]
            .filter(Boolean)
            .join(' · ')
        : [w.customWine.producer, w.customWine.vintage].filter(Boolean).join(' · '),
    hostNotes: w.hostNotes,
    imageUrl:
      w.kind === 'library'
        ? w.wineSnapshot.thumbnailUrl ?? null
        : w.customWine.imageUrl ?? null,
    blindAnswers: w.blindAnswers,
    extra: w.extra,
  }))
```

- [ ] **Step 8: Replace the row render with cards**

Replace the `<ul className="space-y-2">{sortableItems.map((item) => (<SortableWineRow … />))}</ul>` block with:

```tsx
              <ul className="space-y-2">
                {sortableItems.map((item) => (
                  <WineSummaryCard
                    key={item.key}
                    id={item.key}
                    pourOrder={item.pourOrder}
                    title={item.title}
                    subtitle={item.subtitle}
                    imageUrl={item.imageUrl}
                    chips={{
                      fakta: hasFakta(item.extra),
                      manus: item.hostNotes.trim().length > 0,
                      guest: hasGuestInfo(item.extra),
                      blint:
                        !!item.blindAnswers.country ||
                        item.blindAnswers.grapes.length > 0 ||
                        !!item.blindAnswers.priceBucket,
                    }}
                    onEdit={() => setEditingKey(item.key)}
                    onRemove={() => removeAt(item.key)}
                    disabled={submitting}
                  />
                ))}
              </ul>
```

- [ ] **Step 9: Render the plan sheet (with blind slot)**

Immediately after the `</section>` that closes the Viner section (the one containing `<WinePicker … />`, around line 734), add:

```tsx
      {(() => {
        const editing = wines.find((w) => w.key === editingKey)
        if (!editing) return null
        const title =
          editing.kind === 'library' ? editing.wineSnapshot.title : editing.customWine.name || 'Vin'
        const subtitle =
          editing.kind === 'library'
            ? [editing.wineSnapshot.producer, editing.wineSnapshot.vintage]
                .filter(Boolean)
                .join(' · ')
            : [editing.customWine.producer, editing.customWine.vintage]
                .filter(Boolean)
                .join(' · ')
        return (
          <WineDetailSheet
            open={!!editingKey}
            onOpenChange={(o) => !o && setEditingKey(null)}
            title={title}
            subtitle={subtitle}
            values={{ ...editing.extra, hostNotes: editing.hostNotes }}
            onChange={(patch) => updateExtra(editing.key, patch)}
            blindSlot={
              <BlindAnswerInputs
                value={editing.blindAnswers}
                onChange={(next) => updateBlindAnswers(editing.key, next)}
                disabled={submitting}
              />
            }
            disabled={submitting}
          />
        )
      })()}
```

- [ ] **Step 10: Delete the obsolete row component**

```bash
git rm src/components/tasting-plan/SortableWineRow.tsx
```

- [ ] **Step 11: Typecheck + lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no errors. (Confirm `updateNotes` removed; `SortableWineRow` import gone.)

- [ ] **Step 12: Manual check**

`pnpm dev` → `/skapa-provning` (create) and `/mina-provningar/planer/<id>` editor. Verify cards, sheet (with Blint facit section), chips, autosave persistence (edit a field, wait for "Sparat", reload → sticks).

- [ ] **Step 13: Commit**

```bash
git add src/components/tasting-plan/TastingPlanForm.tsx
git commit -m "feat(provning): plan editor uses compact card + detail sheet (blind in slot)"
```

---

## Task 9: Session data plumbing — `WineRow` + `rowFromEntry` + `WineInfoReadout`

Make the new fields available to the session renderer and create the read-only display used by the host sheet and guest reveal.

**Files:**
- Modify: `src/components/tasting-plan/PlanSessionContent.tsx:45-82` (WineRow type) and `:84-199` (rowFromEntry)
- Create: `src/components/tasting-shared/WineInfoReadout.tsx`

- [ ] **Step 1: Add fields to the `WineRow` type**

In `PlanSessionContent.tsx`, the `WineRow` type has `hostNotes: string | null` near the top. Add the 4 fields right after `hostNotes`:

```ts
type WineRow = {
  key: string
  pourOrder: number
  title: string
  subtitle: string
  hostNotes: string | null
  abv: number | null
  servingTemp: string | null
  guestDescription: string | null
  foodPairing: string | null
  libraryWineId: number | null
  imageUrl: string | null
  customWineSnapshot: {
```

(everything below `customWineSnapshot` stays unchanged.)

- [ ] **Step 2: Read the fields once at the top of `rowFromEntry`**

`rowFromEntry` starts with `const pourOrder = w.pourOrder ?? idx + 1`. Add, right after it:

```ts
  const pourOrder = w.pourOrder ?? idx + 1
  const abv = typeof (w as { abv?: number | null }).abv === 'number'
    ? ((w as { abv?: number | null }).abv as number)
    : null
  const servingTemp = (w as { servingTemp?: string | null }).servingTemp ?? null
  const guestDescription = (w as { guestDescription?: string | null }).guestDescription ?? null
  const foodPairing = (w as { foodPairing?: string | null }).foodPairing ?? null
```

- [ ] **Step 3: Include the fields in BOTH returned objects**

`rowFromEntry` has two `return { … }` (library path ~line 142, custom path ~line 162). In each, add the 4 fields right after `hostNotes:`. Library path:

```ts
      hostNotes: w.hostNotes ?? null,
      abv,
      servingTemp,
      guestDescription,
      foodPairing,
      libraryWineId: lib.id,
```

Custom path:

```ts
    hostNotes: w.hostNotes ?? null,
    abv,
    servingTemp,
    guestDescription,
    foodPairing,
    libraryWineId: null,
```

- [ ] **Step 4: Create `WineInfoReadout`**

```tsx
'use client'

import * as React from 'react'

export interface WineInfoReadoutProps {
  /** Värdens manus — pass only for the host view. */
  hostNotes?: string | null
  abv?: number | null
  servingTemp?: string | null
  guestDescription?: string | null
  foodPairing?: string | null
}

/**
 * Read-only render of a wine's richer info. Renders only the sections that
 * have content. Used by the session host sheet (pass hostNotes + facts) and
 * the guest reveal block (pass guest fields + facts, omit hostNotes).
 */
export function WineInfoReadout({
  hostNotes,
  abv,
  servingTemp,
  guestDescription,
  foodPairing,
}: WineInfoReadoutProps) {
  const hasFacts = abv != null || (servingTemp != null && servingTemp.trim().length > 0)
  const hasGuest =
    (guestDescription != null && guestDescription.trim().length > 0) ||
    (foodPairing != null && foodPairing.trim().length > 0)
  const hasManus = hostNotes != null && hostNotes.trim().length > 0

  if (!hasFacts && !hasGuest && !hasManus) return null

  return (
    <div className="space-y-3 text-sm">
      {hasManus && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground">Värdens manus</h4>
          <p className="whitespace-pre-wrap">{hostNotes}</p>
        </div>
      )}
      {hasFacts && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {abv != null && (
            <span>
              <span className="text-muted-foreground">Alkohol: </span>
              {abv} %
            </span>
          )}
          {servingTemp != null && servingTemp.trim().length > 0 && (
            <span>
              <span className="text-muted-foreground">Servering: </span>
              {servingTemp}
            </span>
          )}
        </div>
      )}
      {hasGuest && (
        <div className="space-y-1">
          {guestDescription != null && guestDescription.trim().length > 0 && (
            <p className="whitespace-pre-wrap">{guestDescription}</p>
          )}
          {foodPairing != null && foodPairing.trim().length > 0 && (
            <p>
              <span className="text-muted-foreground">Passar till: </span>
              {foodPairing}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/tasting-plan/PlanSessionContent.tsx src/components/tasting-shared/WineInfoReadout.tsx
git commit -m "feat(provning): session WineRow carries per-wine info + WineInfoReadout"
```

---

## Task 10: Session render — host sheet + guest reveal block

Surface the info live: host gets a "Manus & fakta" button opening a read sheet; guests see För gästerna + Fakta inline once the wine is revealed (or immediately in a standard tasting).

**Files:**
- Modify: `src/components/tasting-plan/PlanSessionContent.tsx` (imports, state, render ~529-534 and ~589-606)

- [ ] **Step 1: Add imports**

Add to the import block:

```ts
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { WineInfoReadout } from '@/components/tasting-shared/WineInfoReadout'
import { Info } from 'lucide-react'
```

> If `Info` is already imported from `lucide-react`, just add it to the existing import. (Current lucide import is `{ Wine as WineIcon, Crown, LogOut, CheckCircle }`.)

- [ ] **Step 2: Add host info-sheet state**

Inside `PlanSessionContent`, near `const [reviewing, setReviewing] = React.useState<WineRow | null>(null)`, add:

```ts
  const [infoWine, setInfoWine] = React.useState<WineRow | null>(null)
```

- [ ] **Step 3: Replace the host inline manus with a "Manus & fakta" button**

Currently (lines ~529-534):

```tsx
                        {isHost && displayRow.hostNotes && (
                          <p className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">
                            <Crown className="inline h-3 w-3 mr-1" />
                            {displayRow.hostNotes}
                          </p>
                        )}
```

Replace with a host-only button that opens the read sheet (shown when there's any host-facing content):

```tsx
                        {isHost &&
                          (row.hostNotes ||
                            row.abv != null ||
                            (row.servingTemp && row.servingTemp.trim()) ||
                            row.guestDescription ||
                            row.foodPairing) && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="mt-2 h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => setInfoWine(row)}
                            >
                              <Info className="h-3 w-3 mr-1" />
                              Manus &amp; fakta
                            </Button>
                          )}
```

> Use `row` (not `displayRow`) — the host always receives full data, and this keeps host content out of the blind-redaction-aware `displayRow`.

- [ ] **Step 4: Add the guest reveal block**

After the `{isBlind && !isHost && (<BlindGuessCard … />)}` block (ends ~line 606), add a guest-facing readout. It renders only for non-host viewers and only when the (server-redaction-aware) `displayRow` actually has guest content — so it's hidden for unrevealed blind wines and shown on reveal / in standard tastings:

```tsx
                        {!isHost &&
                          (displayRow.guestDescription ||
                            displayRow.foodPairing ||
                            displayRow.abv != null ||
                            (displayRow.servingTemp && displayRow.servingTemp.trim())) && (
                            <div className="mt-3 rounded-md border bg-muted/30 p-3">
                              <WineInfoReadout
                                abv={displayRow.abv}
                                servingTemp={displayRow.servingTemp}
                                guestDescription={displayRow.guestDescription}
                                foodPairing={displayRow.foodPairing}
                              />
                            </div>
                          )}
```

- [ ] **Step 5: Extend the `displayRow` strip to cover the new fields**

The hidden-guest `displayRow` (lines ~475-483) strips `title`/`subtitle`/`hostNotes`/`imageUrl`. The server already nulls the new fields, but make the client object self-consistent so the Step-4 guard is correct even if a future caller passes unredacted data. Update:

```tsx
              const displayRow = isHiddenForGuest
                ? {
                    ...row,
                    title: `Vin #${row.pourOrder}`,
                    subtitle: '',
                    hostNotes: null as string | null,
                    imageUrl: null as string | null,
                    abv: null as number | null,
                    servingTemp: null as string | null,
                    guestDescription: null as string | null,
                    foodPairing: null as string | null,
                  }
                : row
```

- [ ] **Step 6: Render the host info sheet**

Near the existing `reviewing` Dialog (around line 630), add a Sheet driven by `infoWine`:

```tsx
      <Sheet open={!!infoWine} onOpenChange={(o) => !o && setInfoWine(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="truncate">{infoWine?.title}</SheetTitle>
            {infoWine?.subtitle && (
              <p className="text-xs text-muted-foreground truncate">{infoWine.subtitle}</p>
            )}
          </SheetHeader>
          <div className="mt-4">
            {infoWine && (
              <WineInfoReadout
                hostNotes={infoWine.hostNotes}
                abv={infoWine.abv}
                servingTemp={infoWine.servingTemp}
                guestDescription={infoWine.guestDescription}
                foodPairing={infoWine.foodPairing}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
```

- [ ] **Step 7: Typecheck + lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no errors. (If `Crown` is now unused after Step 3, remove it from the lucide import.)

- [ ] **Step 8: Manual check (the important one)**

`pnpm dev`. Create a plan with one wine that has abv + serving temp + guest description + food pairing + manus.
1. **Standard tasting session** as host → "Manus & fakta" button opens the sheet showing all sections. As a guest (open an incognito join link) → guest readout (description/pairing/facts) visible immediately; no manus.
2. **Blind tasting session** → as guest, before reveal: NO guest readout (and confirm via DevTools Network that the page payload for that wine has `guestDescription: null`). After host clicks "Avslöja vin" → guest readout appears.

- [ ] **Step 9: Commit**

```bash
git add src/components/tasting-plan/PlanSessionContent.tsx
git commit -m "feat(provning): session shows host manus/fakta sheet + guest reveal block"
```

---

## Task 11: Secondary surfaces (detail / preview / cheat-sheet)

Surface the new fields in the non-session views that already render per-wine info, so the data doesn't silently disappear. All three read top-level fields (`w.abv`, `w.servingTemp`, `w.guestDescription`, `w.foodPairing`), typed after Task 1's `generate:types`.

**Files:**
- Modify: `src/components/tasting-plan/PlanDetailView.tsx:158-162`
- Modify: `src/components/tasting-template/TemplateDetailView.tsx:147-151`
- Modify: `src/components/tasting-plan/PlanPrintCheatSheet.tsx:104-108`

> **`WineRecapCard` is intentionally out of scope.** It renders a `PerWineRecap` from `src/lib/session-recap.ts`, not a raw plan wine — adding guest fields there means extending the recap builder + type for a ratings/flavours-focused summary where description/pairing add little. Deferred (noted at the end of this plan), not silently dropped.

- [ ] **Step 1: `PlanDetailView` — import the readout**

Add to the imports in `src/components/tasting-plan/PlanDetailView.tsx`:

```ts
import { WineInfoReadout } from '@/components/tasting-shared/WineInfoReadout'
```

- [ ] **Step 2: `PlanDetailView` — render new fields under hostNotes**

The per-wine block currently ends:

```tsx
                      {w.hostNotes && (
                        <p className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">
                          {w.hostNotes}
                        </p>
                      )}
                    </div>
```

Replace with (add the readout — omit `hostNotes` since it's already shown above):

```tsx
                      {w.hostNotes && (
                        <p className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">
                          {w.hostNotes}
                        </p>
                      )}
                      <div className="mt-2">
                        <WineInfoReadout
                          abv={w.abv ?? null}
                          servingTemp={w.servingTemp ?? null}
                          guestDescription={w.guestDescription ?? null}
                          foodPairing={w.foodPairing ?? null}
                        />
                      </div>
                    </div>
```

- [ ] **Step 3: `TemplateDetailView` — import the readout**

Add to the imports in `src/components/tasting-template/TemplateDetailView.tsx`:

```ts
import { WineInfoReadout } from '@/components/tasting-shared/WineInfoReadout'
```

- [ ] **Step 4: `TemplateDetailView` — render new fields under hostNotes**

This view's per-wine block ends identically. Replace:

```tsx
                      {w.hostNotes && (
                        <p className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">
                          {w.hostNotes}
                        </p>
                      )}
                    </div>
```

with:

```tsx
                      {w.hostNotes && (
                        <p className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">
                          {w.hostNotes}
                        </p>
                      )}
                      <div className="mt-2">
                        <WineInfoReadout
                          abv={w.abv ?? null}
                          servingTemp={w.servingTemp ?? null}
                          guestDescription={w.guestDescription ?? null}
                          foodPairing={w.foodPairing ?? null}
                        />
                      </div>
                    </div>
```

> Note: `TemplateDetailView` is a public preview page and already renders `w.hostNotes` publicly (pre-existing behavior). The new guest-facing fields showing here is consistent and intended.

- [ ] **Step 5: `PlanPrintCheatSheet` — add fakta + pairing (host värdguide)**

The cheat sheet is host-only (printed guide). The per-wine `<li>` currently ends:

```tsx
                  {w.hostNotes && (
                    <p className="mt-2 ml-10 text-sm whitespace-pre-wrap leading-relaxed">
                      {w.hostNotes}
                    </p>
                  )}
                </li>
```

Replace with:

```tsx
                  {w.hostNotes && (
                    <p className="mt-2 ml-10 text-sm whitespace-pre-wrap leading-relaxed">
                      {w.hostNotes}
                    </p>
                  )}
                  {(w.abv != null || (w.servingTemp && w.servingTemp.trim())) && (
                    <p className="mt-1 ml-10 text-xs text-muted-foreground">
                      {[w.abv != null ? `${w.abv} %` : null, w.servingTemp || null]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}
                  {w.foodPairing && (
                    <p className="mt-1 ml-10 text-xs text-muted-foreground">
                      Passar till: {w.foodPairing}
                    </p>
                  )}
                  {w.guestDescription && (
                    <p className="mt-1 ml-10 text-xs text-muted-foreground whitespace-pre-wrap">
                      {w.guestDescription}
                    </p>
                  )}
                </li>
```

- [ ] **Step 6: Typecheck + lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/tasting-plan/PlanDetailView.tsx src/components/tasting-template/TemplateDetailView.tsx src/components/tasting-plan/PlanPrintCheatSheet.tsx
git commit -m "feat(provning): show per-wine info in plan/template detail + cheat sheet"
```

---

## Task 12: Full build + end-to-end QA + finish

**Files:** none (verification + integration commit if needed)

- [ ] **Step 1: Full production build**

Run: `pnpm build`
Expected: completes successfully (this runs `generate:importmap` then `next build`). Fix any type/lint failures it surfaces.

- [ ] **Step 2: End-to-end QA checklist (in `pnpm dev`)**

- [ ] Template editor: add library wine + custom wine; fill all 4 fields + manus on each; chips reflect filled buckets; Save; reload → values persist.
- [ ] Plan editor: same, plus the Blint facit section inside the sheet still saves blind answers; autosave shows "Sparat".
- [ ] "Använd mallen" (clone a template into a plan): open `/provningsmallar/<slug>` for a published template that has per-wine info → use it → open the resulting plan → the per-wine info carried over.
- [ ] Plan duplicate: duplicate a plan with per-wine info → copy has the info.
- [ ] Standard session: guest sees guest info immediately; host sees "Manus & fakta" sheet.
- [ ] Blind session: guest does NOT see guest info pre-reveal (verify payload `guestDescription: null` in Network tab); appears on reveal.
- [ ] Reorder wines by dragging cards still works; remove works.

- [ ] **Step 3: Update the spec status**

Edit `docs/superpowers/specs/2026-06-16-provningsmall-per-wine-info-design.md` header `Status:` → `Implemented`.

- [ ] **Step 4: Final commit**

```bash
git add docs/superpowers/specs/2026-06-16-provningsmall-per-wine-info-design.md
git commit -m "docs(provning): mark per-wine info spec implemented"
```

- [ ] **Step 5: Integrate the branch**

Use the superpowers:finishing-a-development-branch skill to decide merge/PR. The branch is `feat/provningsmall-per-wine-info`.

---

## Notes / deferred (YAGNI — not in this plan)

- **Auto-fill `abv` from the Systembolaget picker.** `SystembolagetHit.alcoholPercentage` is already fetched but not stored. Pre-filling `abv` on pick would be a nice touch but needs threading through `CustomWineInput`/`PickedWineMeta` — out of scope; add later if wanted.
- **Region/grape per-entry overrides for custom wines.** Deliberately excluded — region/grape resolve for library wines, and the 4-field set was the approved scope.
- **Rich text for `guestDescription`.** Plain textarea only, per spec.
- **`WineRecapCard` (post-session recap).** Showing `guestDescription`/`foodPairing` there needs the `PerWineRecap` builder in `src/lib/session-recap.ts` extended (type + populate). The recap is rating/flavour-focused, so this is low value — add later if asked.
