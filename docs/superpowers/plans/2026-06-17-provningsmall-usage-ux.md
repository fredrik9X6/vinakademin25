# Provningsmall usage UX — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Declutter the public template page's wine list (identity + a one-line teaser) and make "start a session + invite friends" obvious after using a provningsmall.

**Architecture:** Pure UI + routing. Trim per-wine rendering in `TemplateDetailView`; redirect "Använd mallen" to the plan detail hub; elevate the start-session CTA to a prominent primary button on the detail page and add one to the editor; make the shared `StartSessionButton` styleable via optional, backward-compatible props.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind, shadcn UI.

> **No schema changes.** No migration, no `generate:types`. This is UI/routing only.

> **Testing note:** This repo has **no automated test suite** (CLAUDE.md). Verify each task with `npx tsc --noEmit` (the repo has PRE-EXISTING tsc errors in unrelated files — only ensure touched files add no NEW errors) and `pnpm lint`. Do NOT run `pnpm dev` (the repo's `.env` points at the production DB); manual browser QA is deferred to staging. Do NOT scaffold a test framework.

---

## File map

**Modify:**
- `src/components/course/StartSessionButton.tsx` — add optional `variant`/`size`/`label`/`className` props (defaults reproduce current look)
- `src/components/tasting-template/TemplateDetailView.tsx` — trim per-wine card to identity + 1-line teaser; drop `WineInfoReadout` import
- `src/components/tasting-template/UseTemplateButton.tsx` — redirect to detail page + new toast copy
- `src/components/tasting-plan/PlanDetailView.tsx` — move start CTA to a prominent primary button at the top; remove the duplicate from the right rail
- `src/components/tasting-plan/TastingPlanForm.tsx` — add a "Starta provning & bjud in gäster" button in edit mode

No new files. No deletions.

---

## Task 1: Make `StartSessionButton` styleable (backward-compatible)

`StartSessionButton` is shared by course sessions AND plan sessions. We need to restyle/relabel its trigger in two new contexts without changing the existing call sites. Add optional presentational props whose defaults reproduce today's exact appearance.

**Files:**
- Modify: `src/components/course/StartSessionButton.tsx:21-37` (props type) and `:171-176` (trigger button)

- [ ] **Step 1: Extend the props type**

The current type (lines 21-37) is a discriminated union:

```ts
type StartSessionButtonProps =
  | {
      courseId: number
      courseTitle: string
      courseSlug?: string
      tastingPlanId?: never
      planTitle?: never
      defaultBlindTasting?: never
    }
  | {
      tastingPlanId: number
      planTitle: string
      courseId?: never
      courseTitle?: never
      courseSlug?: never
      defaultBlindTasting?: boolean
    }
```

Replace it with a discriminated union for the target, intersected with optional presentational props:

```ts
type StartSessionTarget =
  | {
      courseId: number
      courseTitle: string
      courseSlug?: string
      tastingPlanId?: never
      planTitle?: never
      defaultBlindTasting?: never
    }
  | {
      tastingPlanId: number
      planTitle: string
      courseId?: never
      courseTitle?: never
      courseSlug?: never
      defaultBlindTasting?: boolean
    }

type StartSessionButtonProps = StartSessionTarget & {
  /** Trigger button overrides — defaults reproduce the current look. */
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  label?: string
  className?: string
}
```

- [ ] **Step 2: Use the props in the trigger button**

The trigger (lines 171-176) is:

```tsx
      <Button onClick={() => setIsOpen(true)} variant="outline" size="lg" className="w-full">
        <Users className="mr-2 h-5 w-5" />
        Bjud in gäster
      </Button>
```

Replace with (defaults preserve current look):

```tsx
      <Button
        onClick={() => setIsOpen(true)}
        variant={props.variant ?? 'outline'}
        size={props.size ?? 'lg'}
        className={props.className ?? 'w-full'}
      >
        <Users className="mr-2 h-5 w-5" />
        {props.label ?? 'Bjud in gäster'}
      </Button>
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no NEW errors in this file. (Accessing `props.variant`/`props.label` is valid — they're on the intersected part, available on both union members. Existing `props.tastingPlanId`/`props.courseId` access via the `isPlan` guard is unaffected.)

- [ ] **Step 4: Commit**

```bash
git add src/components/course/StartSessionButton.tsx
git commit -m "feat(session): make StartSessionButton trigger styleable (variant/label/size)"
```

---

## Task 2: Declutter the public template wine list

On the public page, each wine should show only identity + a one-line `guestDescription` teaser. Remove the public host manus and the full info block.

**Files:**
- Modify: `src/components/tasting-template/TemplateDetailView.tsx:7` (import) and `:148-160` (per-wine block)

- [ ] **Step 1: Replace the per-wine extra rendering**

The per-wine card currently renders (lines 148-160):

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
```

Replace that ENTIRE block with a single truncated teaser:

```tsx
                      {w.guestDescription && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                          {w.guestDescription}
                        </p>
                      )}
```

(The surrounding `<p>{wineTitle(w)}</p>` and subtitle `<p>` above it stay unchanged.)

- [ ] **Step 2: Remove the now-unused import**

Delete line 7:

```ts
import { WineInfoReadout } from '@/components/tasting-shared/WineInfoReadout'
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no NEW errors; no unused-import warning for `WineInfoReadout` (it's removed). `w.guestDescription` is typed on the template wine entry (added in the prior feature).

- [ ] **Step 4: Commit**

```bash
git add src/components/tasting-template/TemplateDetailView.tsx
git commit -m "fix(provning): declutter public template wine cards to identity + 1-line teaser"
```

---

## Task 3: Land on the detail page after "Använd mallen"

**Files:**
- Modify: `src/components/tasting-template/UseTemplateButton.tsx:35-36`

- [ ] **Step 1: Change the redirect + toast**

Current (lines 34-37):

```tsx
      if (data.plan?.id) {
        toast.success('Plan skapad — du kan justera den nu.')
        router.push(`/skapa-provning/${data.plan.id}`)
      }
```

Replace with:

```tsx
      if (data.plan?.id) {
        toast.success('Provning skapad — granska, redigera eller starta direkt.')
        router.push(`/mina-provningar/planer/${data.plan.id}`)
      }
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no NEW errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/tasting-template/UseTemplateButton.tsx
git commit -m "feat(provning): land on plan detail (not bare editor) after using a template"
```

---

## Task 4: Elevate the start-session CTA on the detail page

Promote the start button to a prominent primary button at the top of the main content column (first action on every viewport), and remove the duplicate from the right rail.

**Files:**
- Modify: `src/components/tasting-plan/PlanDetailView.tsx:115-116` (insert after header) and `:190-197` (remove from aside)

- [ ] **Step 1: Add the prominent primary CTA after the header**

The header block ends at line 115 (`</header>`), followed by a blank line and `{plan.description && (`. Insert the CTA right after `</header>`:

```tsx
        </header>

        <div data-tour="detail-start-session">
          <StartSessionButton
            tastingPlanId={plan.id}
            planTitle={plan.title}
            defaultBlindTasting={plan.blindTastingByDefault ?? false}
            variant="default"
            label="Starta provning & bjud in gäster"
          />
        </div>

        {plan.description && (
```

- [ ] **Step 2: Remove the duplicate start button from the right rail**

In the `<aside>`, remove the existing start-session block (lines 190-197):

```tsx
        <div data-tour="detail-start-session">
          <StartSessionButton
            tastingPlanId={plan.id}
            planTitle={plan.title}
            defaultBlindTasting={plan.blindTastingByDefault ?? false}
          />
        </div>
```

So the `<aside>` now begins directly with the "Visa handlingslista" button. (The `data-tour="detail-start-session"` attribute moves with the button to Step 1's element, so `PlanDetailTour` still finds its target.)

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no NEW errors; `StartSessionButton` import is still used (now once, at the top).

- [ ] **Step 4: Commit**

```bash
git add src/components/tasting-plan/PlanDetailView.tsx
git commit -m "feat(provning): elevate start-session to a prominent primary CTA on plan detail"
```

---

## Task 5: Add a start-session button to the editor (edit mode)

So a host editing a plan can start without navigating away. Placed in the editor header, edit mode only.

**Files:**
- Modify: `src/components/tasting-plan/TastingPlanForm.tsx` — add import + a header button block

- [ ] **Step 1: Add the import**

Near the other component imports (e.g. after the `WineDetailSheet` import added previously), add:

```ts
import StartSessionButton from '@/components/course/StartSessionButton'
```

(It's a DEFAULT export — no curly braces.)

- [ ] **Step 2: Add the button after the editor header**

The editor header is:

```tsx
      <header>
        <h1 className="text-2xl font-heading">
          {isEdit ? 'Redigera provning' : 'Skapa provning'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Planera din provning. Spara som utkast — du kan ändra när som helst.
        </p>
      </header>
```

Replace it with the same header plus a start-session button rendered only in edit mode:

```tsx
      <header>
        <h1 className="text-2xl font-heading">
          {isEdit ? 'Redigera provning' : 'Skapa provning'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Planera din provning. Spara som utkast — du kan ändra när som helst.
        </p>
        {isEdit && initialPlan && (
          <div className="mt-3">
            <StartSessionButton
              tastingPlanId={initialPlan.id}
              planTitle={title || initialPlan.title}
              defaultBlindTasting={blindTastingByDefault}
              label="Starta provning & bjud in gäster"
            />
          </div>
        )}
      </header>
```

(`title` and `blindTastingByDefault` are existing form state; `initialPlan` is the prop. In create mode `initialPlan` is undefined, so the button is hidden — correct, there's no saved plan id yet.)

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no NEW errors. (`initialPlan.id` is a number; `StartSessionButton`'s plan arm wants `tastingPlanId: number`, `planTitle: string`, `defaultBlindTasting?: boolean` — all satisfied.)

- [ ] **Step 4: Commit**

```bash
git add src/components/tasting-plan/TastingPlanForm.tsx
git commit -m "feat(provning): add start-session button to the plan editor (edit mode)"
```

---

## Task 6: Verify + QA checklist + finish

**Files:** none (verification).

- [ ] **Step 1: Whole-change typecheck + lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no NEW errors attributable to the 5 touched files. (Pre-existing baseline errors/warnings — including the `TemplateForm.tsx` header `<a>` lint error and repo-wide "unused eslint-disable" warnings — are unchanged and out of scope.)

- [ ] **Step 2: Confirm `StartSessionButton` backward compatibility**

Grep its other call sites and confirm none break:

Run: `grep -rn "StartSessionButton" src/ --include=*.tsx | grep -v "components/course/StartSessionButton.tsx"`
For each call site, confirm it still compiles (it should — all new props are optional). The course call site renders identically (no new props → defaults). Note the result.

- [ ] **Step 3: Staging QA checklist (for the human — do NOT run the dev server here)**

- [ ] `/provningsmallar/rose` (free template): wine cards show bottle + name + subtitle + at most a one-line description; **no host manus**, no abv/temp/pairing dump.
- [ ] "Använd mallen" → lands on `/mina-provningar/planer/<id>` (detail), not the bare editor; toast reads "Provning skapad — granska, redigera eller starta direkt."
- [ ] Detail page: "Starta provning & bjud in gäster" is a prominent primary button at the top (mobile + desktop); the right rail no longer duplicates it; handlingslista/värdguide/redigera/skapa kopia remain.
- [ ] Editor (`/skapa-provning/<id>`, edit mode): the "Starta provning & bjud in gäster" button appears under the header and opens the create-session → share (code/link/QR) dialog; it does NOT appear on a brand-new `/skapa-provning` (create) page.
- [ ] A course session page's "Bjud in gäster" button is unchanged (same label/outline styling).

- [ ] **Step 4: Finish the branch**

Use the superpowers:finishing-a-development-branch skill. Branch: `feat/provningsmall-usage-ux`.

---

## Notes

- No data model / migration changes — this ships without a DB migration.
- The richer per-wine info still renders in the host's plan editor, plan detail view, host cheat sheet, and the live session; only the **public** template page is trimmed.
