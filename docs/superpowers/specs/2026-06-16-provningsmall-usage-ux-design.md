# Provningsmall usage UX — public page declutter + start-session flow

- **Date:** 2026-06-16
- **Status:** Approved (ready for implementation plan)
- **Area:** Public template detail page + the "use a template → start a session → invite" flow
- **Schema impact:** None (pure UI + routing). No migration, no `generate:types`.

## Problem

Two issues surfaced after shipping the richer per-wine info feature:

1. **The public template page (`/provningsmallar/[slug]`) looks cluttered.** Each
   wine card stacks bottle + name + subtitle + the host's private **manus**
   (`hostNotes`) + the abv/serving-temp/description/pairing block. Showing host
   manus publicly is wrong (it's host-only working notes), and the stacked detail
   makes a marketing/browse page read like a dense data dump.

2. **Starting a session is hard to find.** "Använd mallen" drops the user on the
   bare **editor** (`/skapa-provning/[id]`, only Save/Delete). The
   "Bjud in gäster" action (which already does join-code + link + QR) lives only
   on the separate **detail** page (`/mina-provningar/planer/[id]`), reachable via
   menu → "Mina provningar" → list → click the plan. The invite mechanism is
   fine; it's purely a findability problem.

## Goals

- Public template wine list reads as a clean, scannable gallery — identity + an
  optional one-line teaser per wine.
- A user who uses a template reaches "start session + invite" in one obvious step.
- No host-only content (`hostNotes` manus) leaks onto the public page.

## Non-goals

- No broader redesign of the public page hero/layout (scoped to per-wine clutter).
- No change to the invite mechanism itself (code/link/QR dialog stays as-is).
- No change to the session runtime, blind redaction, or the per-wine data model.
- `LockedTemplateDetailView` (paid, redacted "Dolt vin") is unaffected.

## Item 1 — Declutter the public template wine list

In `src/components/tasting-template/TemplateDetailView.tsx`, each wine card
currently renders: bottle (with faded pour number) → title → subtitle →
`hostNotes` paragraph → `<WineInfoReadout>` (abv/serving-temp/description/pairing).

Change the per-wine card to render **only**:
- bottle + faded pour number (unchanged)
- title (wine name) (unchanged)
- subtitle (producer · vintage · region) (unchanged)
- **one truncated line of `guestDescription`** as a teaser, when present:
  `line-clamp-1`, `text-xs text-muted-foreground`.

Remove:
- the `{w.hostNotes && (…)}` paragraph (host-only — must not be public),
- the `<div><WineInfoReadout …/></div>` block (during-session/host content),
- the now-unused `WineInfoReadout` import.

The rich per-wine info still appears where it belongs (the host's plan editor,
plan detail view, host cheat sheet, and the live session). This is purely about
what the **public browse page** shows.

## Item 2 — Make "start session + invite" obvious

The `StartSessionButton` (`src/components/course/StartSessionButton.tsx`) already
handles session creation + the invite dialog (join code, direct link, QR). It is
shared with course sessions, so any prop changes MUST be backward-compatible
(new props optional with current defaults).

### 2.1 Land on the detail page after "Använd mallen"
In `src/components/tasting-template/UseTemplateButton.tsx`, change the success
redirect from `/skapa-provning/${plan.id}` (bare editor) to
`/mina-provningar/planer/${plan.id}` (the detail hub, which has start-session +
edit + everything). Update the toast copy to reflect the new landing, e.g.
*"Provning skapad — granska, redigera eller starta direkt."*

### 2.2 Elevate start-session on the detail page
In `src/components/tasting-plan/PlanDetailView.tsx`, the start CTA currently sits
in the right rail, which stacks far below the content on mobile. Promote it to a
**prominent primary button at the top of the main content column** (under the
header, before the wines) so it's the first action on every viewport. Remove the
duplicate `StartSessionButton` from the right rail; the rail keeps the secondary
actions (handlingslista, värdguide, redigera, skapa kopia).

### 2.3 Add a start-session button to the editor
In `src/components/tasting-plan/TastingPlanForm.tsx`, add a "Starta provning &
bjud in gäster" action in **edit mode only** (when `initialPlan` / a plan id
exists), so a host editing a plan can start without navigating away. Reuses
`StartSessionButton` with `tastingPlanId={initialPlan.id}`,
`planTitle={title}`, `defaultBlindTasting={blindTastingByDefault}`. The plan is
already persisted (autosave), so the created session reads a saved plan. Place it
in the bottom action bar (or header) as a secondary-to-Save action; do NOT render
it in create mode (no plan id yet).

### Supporting change: make `StartSessionButton` styleable
Add optional props to `StartSessionButton` so it fits each context without
duplicating the component:
- `variant?` (button variant; default keeps current `"outline"`),
- `label?` (trigger text; default keeps current `"Bjud in gäster"`),
- `size?` / `className?` (optional passthrough).
All defaults reproduce today's appearance so the existing course call site is
unchanged. The detail-page CTA uses `variant="default"` (primary) and label
*"Starta provning & bjud in gäster"*; the editor button can use the same.

## Architecture & touch points

- `src/components/tasting-template/TemplateDetailView.tsx` — trim per-wine card;
  add 1-line teaser; drop `WineInfoReadout` import.
- `src/components/tasting-template/UseTemplateButton.tsx` — redirect to detail;
  toast copy.
- `src/components/course/StartSessionButton.tsx` — add optional
  `variant`/`label`/`size`/`className` props (backward-compatible defaults).
- `src/components/tasting-plan/PlanDetailView.tsx` — prominent top primary CTA;
  remove duplicate start button from the right rail.
- `src/components/tasting-plan/TastingPlanForm.tsx` — start-session button in edit
  mode.

No collections, no migration, no `payload-types` regeneration.

## Risks & edge cases

- **Backward compat:** `StartSessionButton` is also used for course sessions —
  new props must be optional and default to current behavior, or the course CTA
  changes unintentionally. Verify the existing call site still renders identically.
- **Editor start in create mode:** only render the editor start button when a
  plan id exists (`isEdit`); a brand-new unsaved plan has no id to start from.
- **Autosave lag:** starting from the editor uses the last autosaved state
  (debounced ~1.5s). Acceptable; the session reads the plan server-side at create
  time. No forced pre-save needed.
- **Detail-page access:** the user who just cloned is the plan owner, so the
  detail page's owner check passes after the 2.1 redirect.
- **Lint:** removing `WineInfoReadout` from `TemplateDetailView` leaves an unused
  import — delete it.

## Decisions (resolved during brainstorming)

- Public page: **trim per-wine clutter** (not a broader page redesign).
- Public per-wine card: **keep a one-line `guestDescription` teaser**; drop manus,
  abv, serving temp, pairing.
- Start-session flow: **both** — land on detail page AND add a start button to the
  editor (plus elevate the detail-page CTA).
