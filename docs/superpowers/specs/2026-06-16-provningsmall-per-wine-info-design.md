# Richer per-wine info for provningsmallar — design

- **Date:** 2026-06-16
- **Status:** Approved (ready for implementation plan)
- **Area:** Tasting templates (`TastingTemplates`) + tasting plans (`TastingPlans`) + live session view

## Problem

When building a provningsmall, hosts want to capture more information per wine
(structured facts, host talking points, and guest-facing educational content).
Today every wine is an inline flex row that already stacks title, subtitle, an
always-visible host-notes `Textarea`, and (for plans) a cramped collapsible
"Blint-svar" `<details>`. Adding more fields into that same inline column turns
the list into a tall, cluttered wall — especially on mobile, which is the
primary device for building templates. The same row pattern is reused live, so
the clutter follows into the running session.

## Goals

- Let a wine carry three optional buckets of content without crowding the list:
  - **Fakta** — structured facts (guest-facing on reveal)
  - **Värdens manus** — host-only talking points
  - **För gästerna** — guest-facing educational content
- Keep the wine list compact and scannable (mobile-first, typically 3–6 wines).
- Reuse one interaction pattern — *compact row → focused sheet* — in both the
  editor and the live session.
- Surface the new info correctly live: host-only content stays host-only; guest
  content respects blind-tasting reveal gating.

## Non-goals / out of scope

- No redesign of wine *picking* (Systembolaget search, library picker, custom
  wine entry) — those flows stay as-is.
- No rich-text editor; plain `text` / `textarea` fields only.
- No media/attachments per wine beyond the existing single bottle image (the
  "Media / links" facet was explicitly not requested).
- No change to scoring, swarm, or realtime sync mechanics.

## Content model

Four new **optional** fields are added to each wine entry, plus a relabel of the
existing `hostNotes`. Fields live on **both** `TastingTemplates.wines` and
`TastingPlans.wines` (a template's wines are copied into a plan, and the plan is
what drives the live session). They are **top-level fields on the wine entry**
(siblings of `hostNotes` / `pourOrder`), *not* inside the `customWine` group —
so they apply equally to library and custom wines. Consequence: the blind
redaction `{...w}` spread carries them through by default, so they must be
**explicitly nulled** there for unrevealed blind wines (see touch point 6).

| Field | Type | Bucket | Audience | Notes |
|---|---|---|---|---|
| `abv` | `number` (min 0, max ~25) | Fakta | Guests (on reveal) | Alcohol %, optional |
| `servingTemp` | `text` | Fakta | Guests (on reveal) | Free text so ranges work, e.g. "8–10 °C" |
| `guestDescription` | `textarea` | För gästerna | Guests (on reveal) | Description / story shown to participants |
| `foodPairing` | `text` | För gästerna | Guests (on reveal) | Suggested food pairing |
| `hostNotes` *(existing)* | `textarea` | Värdens manus | Host only | Relabeled "Värdens manus"; no schema change |

Already-present structured facts (name, producer, vintage, type, price,
Systembolaget number; plus region/grape auto-resolved from the `Wines`
collection for library wines) are *surfaced* under **Fakta** but not duplicated.

### Visibility rules

- **Värdens manus** (`hostNotes`): host-only, always — never sent to guests.
- **Fakta** + **För gästerna**: guest-facing, but reveal-gated:
  - **Blind tastings** — hidden until the host reveals that wine.
  - **Standard tastings** — shown immediately.
- Gating MUST be enforced **server-side** in the blind-session redaction layer
  (the same place that currently strips title/subtitle/hostNotes/imageUrl and
  bakes `easyModeOptions` / `blindTiers`), not only hidden client-side —
  otherwise a guest could read the answer from the network payload.

## Editor UX — compact list + edit sheet (Approach A)

### Compact wine card (replaces the current inline row)

- Layout: drag handle · bottle image with faded pour-number · wine name ·
  subtitle · small "filled" chips · remove button.
- **No textareas in the list.** The chips (e.g. `Manus`, `Gästinfo`) indicate at
  a glance which buckets are filled for that wine.
- Reordering is still done by dragging the compact card (existing dnd-kit
  `useSortable` wiring is preserved).

### Edit sheet (opens on tapping a card)

- shadcn `Sheet` — full-screen on mobile, side sheet on desktop.
- Header: bottle image + wine name.
- Stacked, labeled sections:
  1. **Fakta** — existing facts (read-only summary where derived) + `abv`,
     `servingTemp`.
  2. **Värdens manus** — the `hostNotes` textarea.
  3. **För gästerna** — `guestDescription`, `foodPairing`.
  4. **Blint facit** *(plans only)* — the existing blind-answer inputs
     (`blindAnswerCountry`, `blindAnswerGrapes`, `blindAnswerPriceBucket`),
     moved out of today's cramped `<details>` into a proper section.
- Sticky **Klar** action closes back to the list. Edits are held in the form's
  existing wine-entry state and persisted on the normal save (no new endpoint).

## Session UX — same pattern reused

- The live wine list stays compact (as today).
- **Host:** tapping a wine opens the same sheet in read mode showing **Värdens
  manus** + **Fakta**, so the host can present from their phone without those
  notes cluttering the running list.
- **Guests:** on reveal, the wine's expanded / reveal view gains **För
  gästerna** (description, pairing) + **Fakta**. The live list itself stays
  uncluttered; details are one tap away.

## Architecture & touch points

Threading a new per-wine field end-to-end (verified against the current code):

1. **Collections** — add the 4 fields to the `wines` array in:
   - `src/collections/TastingTemplates.ts`
   - `src/collections/TastingPlans.ts`
2. **Migration** — `pnpm migrate:create -- "tasting-per-wine-info"` and commit
   it with the collection change (prod is migration-driven).
3. **Types** — `pnpm generate:types` (regenerates `src/payload-types.ts`).
4. **Clone routes** — carry the new fields through the per-wine `.map()`:
   - `src/app/api/tasting-plans/from-template/[templateId]/route.ts`
   - `src/app/api/tasting-plans/[id]/duplicate/route.ts`
5. **Session row builder** — extend the `WineRow` type and `rowFromEntry()` in
   `src/components/tasting-plan/PlanSessionContent.tsx` to read + carry the new
   fields, and render Fakta / För gästerna in the guest reveal view and Värdens
   manus in the host read-sheet.
6. **Blind redaction (server-side)** — in
   `src/app/(frontend)/(site)/mina-provningar/planer/[id]/page.tsx`, the
   per-wine redacted object (≈ lines 144–156) explicitly nulls answer-bearing
   fields for unrevealed blind wines. Add `abv: null`, `servingTemp: null`,
   `guestDescription: null`, `foodPairing: null` there. This is the **only**
   server redaction point — the SSE stream route never sends plan data — so this
   single edit closes the leak.
7. **Forms** — add fields to the `WineEntry` type, `hydrateInitialWines()`, and
   the submit `.map()` in:
   - `src/components/tasting-plan/TastingPlanForm.tsx`
   - `src/components/tasting-template/TemplateForm.tsx`
8. **New / changed UI components:**
   - Compact card replacing `TemplateSortableWineRow.tsx` and
     `SortableWineRow.tsx` (keep dnd-kit wiring; remove inline textareas; add
     filled-chips + tap-to-open).
   - A shared **wine edit sheet** with the 3–4 sections (used by both forms; the
     plan variant includes the Blint-facit section).
   - A **session read-sheet** for the host (Värdens manus + Fakta).
9. **Secondary surfaces** — add the new fields where relevant:
   - `src/components/tasting-plan/PlanDetailView.tsx`
   - `src/components/tasting-plan/PlanPrintCheatSheet.tsx`
   - `src/components/tasting-template/TemplateDetailView.tsx`
   - `src/components/session-history/WineRecapCard.tsx`

## Risks & edge cases

- **Blind leak:** the biggest correctness risk is guest content leaking before
  reveal — must be enforced server-side (touch point 6), not just in the client.
- **Clone drift:** template→plan and plan duplicate both have hand-written
  per-wine maps; missing a field there silently drops it. Both must be updated.
- **Template vs plan shape divergence:** plan wines are a superset (blind-answer
  fields). The 4 new fields go on both; the Blint-facit section stays plan-only.
- **Empty state:** wines with no extra info should render an unobtrusive compact
  card (chips simply absent), not an empty sheet prompt.

## Decisions (resolved during brainstorming)

- Direction: **A — compact list + edit sheet** (over accordion / wizard).
- Field set: the 4 fields above, as proposed (no region/grape duplication).
- Guest content timing: **gated for blind, instant for standard.**
- Edit device target: **mobile-first** (sheet is full-screen on mobile, side
  sheet on desktop).
