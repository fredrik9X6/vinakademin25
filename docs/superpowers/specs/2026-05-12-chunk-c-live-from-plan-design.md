# Chunk C — Live from Plan + Host Tools: Design Spec

**Status:** Approved 2026-05-12. Implementation plan to follow.

## Goal

A host can run a live group tasting driven by their own tasting plan. Three new pages (plan detail, shopping list, printable cheat sheet) plus modest extensions to existing course-session components so they work polymorphically over `course | tastingPlan`. No schema changes — Chunk A's `tasting-plans` collection and `course-sessions.tastingPlan` FK already exist.

## Scope decisions (locked)

- **Core MVP only**: start-from-plan, plan detail page, shopping list, cheat sheet, SessionView adaptation. No mark-as-ready transition. No edit-during-live-session lock.
- **SessionView strategy**: inline branching, not a full polymorphic refactor. The session-structure normalizer mentioned in Chunk A's plan was never built; we are NOT building it here either.
- **Shopping list**: flat list, ordered by pour, with Systembolaget links (or generic search fallback for items without a URL).
- **Cheat sheet**: full host pack — title, occasion, target participants, host script (richText), then each wine in pour order with title, vintage, producer, price, host-notes.
- **PlanCard body link** changes from `/skapa-provning/[id]` to `/mina-provningar/planer/[id]` so the primary action routes to the detail page (which contains start-session).

## File structure

```
NEW src/app/(frontend)/(site)/mina-provningar/planer/[id]/page.tsx              detail page (server)
NEW src/app/(frontend)/(site)/mina-provningar/planer/[id]/handlingslista/page.tsx  shopping list (server)
NEW src/app/(frontend)/(bare)/varguide/[id]/page.tsx                            cheat sheet (server, no chrome)
NEW src/app/(frontend)/(bare)/layout.tsx                                        bare layout — no top nav, no footer
NEW src/components/tasting-plan/PlanDetailView.tsx                              detail layout (client — start-session button needs state)
NEW src/components/tasting-plan/PlanShoppingList.tsx                            shopping list rendering
NEW src/components/tasting-plan/PlanPrintCheatSheet.tsx                         print-optimized layout
NEW src/components/tasting-plan/PlanSessionContent.tsx                          plan-mode session UI (used by SessionView)
MOD src/components/course/StartSessionButton.tsx                                accept courseId XOR tastingPlanId
MOD src/components/course/SessionView.tsx                                       early branch for session.tastingPlan
MOD src/components/tasting-plan/PlanCard.tsx                                    body link → detail page
MOD src/components/course/WineReviewForm.tsx                                    accept custom-wine submission shape (if needed)
```

No schema changes. No migration.

## Plan detail page (`/mina-provningar/planer/[id]`)

Server component. Auth + owner check (mirror `/skapa-provning/[id]`):
- `getUser`; if no user → `redirect('/logga-in?from=/mina-provningar/planer/[id]')`.
- `payload.findByID({ collection: 'tasting-plans', id, depth: 2, overrideAccess: true })`.
- `Number.isInteger` guard; `notFound()` on missing/invalid.
- Owner check: `typeof plan.owner === 'object' ? plan.owner?.id : plan.owner` against `user.id`, admin override. Non-owner → `notFound()` (not 403, prevents existence leak).

Renders `<PlanDetailView plan={plan} />`.

### `PlanDetailView` layout

Client component (needs `StartSessionButton` state). Single `max-w-4xl` column.

1. **Header**:
   - `h1` Coolvetica title
   - Sub-line: status badge (brand for draft, default for ready, secondary for archived) · occasion (or em-dash) · relative `updatedAt`.
2. **Description** card if `plan.description`.
3. **Wine list** read-only:
   - Header `Viner ({n})`.
   - Cards with pour-number pill, title, subtitle (producer · vintage · region for library; producer · vintage for custom), and host-notes preview if set.
4. **Host script** card if `plan.hostScript` (renders as text — full richText render lives only on the print page).
5. **Action rail** (sticky bottom on mobile, side rail on desktop ≥md):
   - **Primary**: `Starta gruppsession` — uses `StartSessionButton` in `tastingPlanId` mode.
   - **Secondary**: `Visa handlingslista` → `/mina-provningar/planer/[id]/handlingslista`.
   - **Secondary**: `Skriv ut värdguide` → `/varguide/[id]`.
   - **Tertiary**: `Redigera` → `/skapa-provning/[id]`.

Padding accounts for `MobileBottomNav` on mobile.

## `StartSessionButton` generalization

Current prop shape: `{ courseId, ... }`. Generalize:

```ts
type StartSessionButtonProps =
  | { courseId: number; tastingPlanId?: never; ...rest }
  | { tastingPlanId: number; courseId?: never; ...rest }
```

When called in `tastingPlanId` mode, POST body to `/api/sessions/create` uses `{ tastingPlanId, sessionName?, maxParticipants? }`. The route already accepts this XOR-style from Chunk A's Task 4. QR + join code modal and all downstream UX are unchanged.

Default `sessionName` becomes `${plan.title}` when started from a plan (vs `${hostName}'s Session`); the route's fallback only fires when the client doesn't send a name, so pass it explicitly.

After success, redirect target is still `/vinprovningar/<course-slug>?session=<id>` for course mode; for plan mode, redirect to `/mina-provningar/planer/[planId]?session=<id>` (the detail page renders SessionView when `?session=<id>` is set). Detail-page session rendering is the next section.

## SessionView inline branching

`SessionView` currently always assumes `session.course` is populated and walks modules → contentItems. Add this early in the render:

```tsx
if (!session.course && session.tastingPlan && typeof session.tastingPlan === 'object') {
  return <PlanSessionContent session={session} plan={session.tastingPlan} viewer={...} />
}
// existing course path unchanged
```

Roster, header, host-vs-guest detection, claim flow — all unchanged because they're upstream of the content.

### `PlanSessionContent` component

Client component. Props: `{ session, plan, viewer: 'host' | 'guest' }`.

- **Wine list**: same shape as the detail page's wine cards but with two additions:
  - **Active-wine indicator**: when `session.currentLesson === wine.pourOrder`, the card renders with `brand` border + `Värden pratar om detta` chip. Guests with `Följer värden` enabled see the visual cue and the page scrolls the card into view.
  - **Per-card actions**:
    - Host: `Sätt fokus` button — POSTs to existing `/api/sessions/[id]/host-state` with body `{ currentLesson: wine.pourOrder, lessonType: 'wine' }`. The `lessonType: 'wine'` discriminator is new and goes alongside existing `'lesson' | 'quiz'` — verify the route accepts arbitrary strings (it should — it's a passthrough); if not, just send `'lesson'` since SSE consumers in plan mode are our new code anyway.
    - Guest: `Betygsätt` button — opens `WineReviewForm` modal pre-filled with the wine's identity (library id OR custom snapshot).
- **No tabs.** No CourseTableOfContents. No LessonViewer. No CourseQuizViewer.
- **`Följer värden` toggle** lives in the SessionRoster sidebar exactly as today; in plan mode the auto-scroll handler scrolls to the active wine instead of navigating.
- **Sidebar extras** (existing prop pattern): SessionView passes `sidebarExtra={<SessionRoster ... />}` to PlanSessionContent so the roster lives in the same column. Mirrors the Chunk 3 placement fix.

## WineReviewForm custom-wine path

The form currently submits `{ wine: <id>, ...wsetFields }`. Reviews collection (post Chunk A) accepts `{ customWine: {...}, ...wsetFields }` as the XOR alternative. **Plan-time verification:** open `src/components/course/WineReviewForm.tsx`, confirm submit handler can be extended to send `customWine` when no library wine id is provided. If the form bakes in `wineId` requirement, extend its props to accept either:

```ts
type WineReviewFormProps =
  | { libraryWineId: number; ... }
  | { customWineSnapshot: { name, producer?, vintage?, type?, systembolagetUrl?, priceSek? }; ... }
```

…and have the submit handler send the appropriate field. Authorship snapshot (`authorDisplayName`) stays as-is.

## Shopping list page (`/handlingslista`)

Server component. Auth + owner check (same pattern as detail page). `depth: 2` so libraryWine populates.

Renders `<PlanShoppingList plan={plan} />`.

### `PlanShoppingList` layout

- **Header**: `Handlingslista — <plan.title>`, sub-line `<n> viner · totalt ~<sumKr> kr` (sum shown only if ≥1 wine has a price; sum is "ungefärlig" because some wines may lack prices).
- **Flat list**, ordered by pour:
  - Library wines: thumbnail (~40px) if available, title, `producer · vintage · region` subtitle, price-in-SEK if set, then ONE button — `Köp hos Systembolaget` (opens `wine.systembolagetUrl` in new tab) when URL present, else `Hitta hos Systembolaget` (opens `https://www.systembolaget.se/sok/?varuNr=&sok=<encoded-wine-title>` in new tab).
  - Custom wines: muted square placeholder, name, `producer · vintage` subtitle (if set), `customWine.type` chip, priceSek if set, then button — `Köp hos Systembolaget` if `customWine.systembolagetUrl` present, else `Hitta hos Systembolaget` with the wine name as the search query.
- All external links use `target="_blank" rel="noopener noreferrer"`.
- Header back-link `← Tillbaka till planen` → `/mina-provningar/planer/[id]`.
- Print-safe: no fixed positioning; `@media print` hides the back link and adds a print header with date.

## Cheat sheet page (`/varguide/[id]`)

Server component, **no chrome** (no top nav, no breadcrumb, no mobile bottom nav, no footer). The site's main `(site)/layout.tsx` wraps every site route in that chrome. To opt out cleanly without CSS gymnastics, the print page lives under a sibling route group `(bare)`. Route groups don't affect URLs.

URL: `/varguide/[id]` (chosen over `/mina-provningar/planer/[id]/print` so the path is short and screen-shareable). The detail page's `Skriv ut värdguide` link points to this URL.

```
src/app/(frontend)/(bare)/layout.tsx          // renders bare children, no header/footer/nav
src/app/(frontend)/(bare)/varguide/[id]/page.tsx
```

Auth + owner check identical to detail page. `notFound()` for missing / not-owner.

### `PlanPrintCheatSheet` content

Page renders `<PlanPrintCheatSheet plan={plan} />`.

Layout (single column, A4-friendly):
- **Top bar (screen only)**: `Skriv ut värdguide` button → `window.print()`; `Tillbaka` link → detail page. Hidden in `@media print`.
- **Header**: `Värdguide — <plan.title>`, meta line `<plan.occasion or '—'> · <plan.targetParticipants> deltagare · Utskriven YYYY-MM-DD`.
- **Manus** section (only if `plan.hostScript`): renders the text in a readable column.
- **Viner** section: ordered list, each wine:
  - Pour-number circle
  - Wine title (large)
  - Sub-line: producer · vintage · region · price
  - Host-notes box (full width) if set
- **Print CSS**: `@page { margin: 16mm; }`, `@media print { body { font-size: 11pt; } .screen-only { display: none } }`. Avoid page-breaks inside a wine card via `break-inside: avoid`.

## `PlanCard` body-link change

`src/components/tasting-plan/PlanCard.tsx`: change the absolute-overlay `<Link href={...}>` from `/skapa-provning/${plan.id}` to `/mina-provningar/planer/${plan.id}`. Edit becomes a tertiary action from the detail page or the existing dropdown (add `Redigera` item before `Arkivera` / `Ta bort permanent`).

## Reuse map

| Need | Source |
|---|---|
| Auth + owner check | `getUser` + `/skapa-provning/[id]` pattern from Chunk B |
| QR + join modal | `StartSessionButton.tsx` internals (modal opens on click, contains the QR + join code) |
| Realtime SSE / participant identity / claim flow | Chunks 1-3 |
| WineReviewForm | existing component; may need a custom-wine path |
| Host-state POST + `Följer värden` toggle | existing course pacing; we repurpose `currentLesson` field to carry `wine.pourOrder` in plan mode |
| Wine title display helpers | `getWineDoc` / `getWineTitle` (Chunk A) |
| Brand badge variant | shipped styleguide |
| sonner toast | existing |
| Print isolation | colocated bare layout via `(bare)` route group |

## Risks

| Risk | Mitigation |
|---|---|
| `WineReviewForm` may require a library wine id | Plan-time audit; if so, extend props to accept `customWineSnapshot`. Add 30-60 min to that task. |
| `host-state` route may reject `lessonType: 'wine'` | The field is currently free-form text passthrough. If schema rejects, fall back to sending `'lesson'` (we don't read it in plan mode). |
| Print page chrome leaks | Use a `(bare)` route group; verify in dev that no parent layout chrome renders. |
| `currentLesson` dual interpretation (lesson id vs pourOrder) | Document in a code comment near both consumers (PlanSessionContent + SSE handler) so future readers know plan-mode reuses the field. |
| Sticky action rail collides with mobile bottom nav | Bottom padding `pb-24` on PlanDetailView; verify in dev on a 375px viewport. |
| Custom-wine review on submit creates a Review with neither `wine` nor `customWine` if the form's submit handler isn't updated | Plan's Task includes the form audit before SessionView branching. |

## Out of scope (deferred)

- Mark-as-ready transition (no quality gate before start-session in this round).
- Edit-during-live-session lock (host can still edit; sessions read live state).
- Wrap-up email (Chunk D).
- Tasting templates (Chunk E).
- Public plan sharing — never.
- Mobile-print optimization — print is desktop-targeted.

## Verification (E2E smoke)

1. Lint + TS clean for touched files.
2. From `/mina-provningar/planer`, click a plan card → land on `/mina-provningar/planer/[id]` (NOT `/skapa-provning/[id]`).
3. From detail page, click `Starta gruppsession` → QR modal opens → another tab joins via the code.
4. Joining browser lands in a session view with wine list (no lesson tabs, no module headers).
5. Host taps `Sätt fokus` on wine 2 → guest browser (`Följer värden` ON) highlights wine 2 + auto-scrolls.
6. Guest taps `Betygsätt` on a library wine → review form → submits → Review row created with `wine: <id>`.
7. Guest taps `Betygsätt` on a custom wine → review form → submits → Review row created with `customWine: { name, ... }` snapshot.
8. From detail page, click `Visa handlingslista` → all wines listed, library wines have `Köp hos Systembolaget` links where URLs are set, custom wines fall back appropriately.
9. From detail page, click `Skriv ut värdguide` → page renders at `/varguide/[id]` WITHOUT top nav / mobile bottom nav. Print preview shows clean host pack.
10. Non-owner visiting `/mina-provningar/planer/<someone-elses-id>` → 404. Same for `/handlingslista` and `/varguide/<id>` variants.
11. Push main → production.

## Effort estimate

3-4 working days.
