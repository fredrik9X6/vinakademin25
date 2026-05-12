# Chunk B — Host Wizard: Design Spec

**Status:** Approved 2026-05-12. Implementation plan to follow.

## Goal

Logged-in members can create, edit, and delete their own tasting plans through a single-page wizard at `/skapa-provning`, and browse their plans at `/mina-provningar/planer`. Plans are owner-scoped (Chunk A built the data layer). No session-start integration yet — that lands in Chunk C.

## Scope decisions (locked)

- **Full plan CRUD** — create, list, edit, delete (soft-delete via archive).
- **Wine count:** hard min 3, soft max 8 (warn but allow above).
- **After save:** stay on form in edit mode (URL transitions to `/skapa-provning/[id]` on first create).
- **Persistence:** explicit save button; no autosave.
- **Custom wine:** only `name` is required; `producer`, `vintage`, `type`, `systembolagetUrl`, `priceSek` are optional.
- **Listing:** card grid, 1/2/3 cols by viewport.

## File structure

```
NEW src/app/(frontend)/(site)/skapa-provning/page.tsx              create flow
NEW src/app/(frontend)/(site)/skapa-provning/[id]/page.tsx         edit flow (same form, pre-filled)
NEW src/app/(frontend)/(site)/mina-provningar/planer/page.tsx      listing (card grid)
NEW src/components/tasting-plan/TastingPlanForm.tsx                shared create+edit form
NEW src/components/tasting-plan/WinePicker.tsx                     typeahead + custom-wine reveal
NEW src/components/tasting-plan/PlanCard.tsx                       single card for listing
NEW src/app/api/tasting-plans/route.ts                             POST
NEW src/app/api/tasting-plans/[id]/route.ts                        PATCH, DELETE
NEW src/app/api/wines/search/route.ts                              typeahead lookup
```

No schema changes. Chunk A covers everything.

## Wizard page

Both `/skapa-provning` and `/skapa-provning/[id]` render the same `TastingPlanForm` component. The `[id]` variant fetches the plan server-side (Payload, owner-scoped) and passes it as `initialPlan`. Non-owners hitting `/skapa-provning/[id]` get `notFound()`.

Single scrollable page, vertical sections (Swedish copy):

1. **Titel** (required, max 100), **Tillfälle** (optional, e.g. "Min systers förlovning"), **Beskrivning** (optional, max 500).
2. **Antal deltagare** — number input, default 4.
3. **Viner** (3–8) — ordered list, each row shows position number, wine title, producer/vintage (or custom name fallback), notes-for-host textarea, remove button. Reorder via drag-handle (or up/down arrows if `@dnd-kit/core` isn't already a dep — check at plan time and fall back). Beneath the list: `<WinePicker />`.
4. **Manus för värden** — rich text, optional. Inherits the block set from `Vinprovningar.fullDescription`.
5. **Sticky footer** — `Spara utkast` button (disabled until title present AND ≥3 wines). On the edit page, also `Radera` button (confirms; archives first time, hard-deletes if already archived).

After successful POST, `router.replace('/skapa-provning/[newId]')` so the back button doesn't return a stale create form. After PATCH, stay in place + success toast.

Soft max-8 warning: when wine count ≥ 9, render a yellow inline callout: *"Långa provningar är svåra att hålla fokus på. Överväg att dela upp i två tillfällen."* Does not block save.

## WinePicker

Single component, two modes via segment-control:

- **Från biblioteket** — debounced 300ms typeahead, calls `GET /api/wines/search?q=...`, returns ≤10 results with id, title, producer, vintage, region, thumbnail. Click → adds to plan's `wines` array as `{ libraryWine: <id>, pourOrder: <next>, hostNotes: '' }`, clears input.
- **Egen vinflaska** — inline form, `name` required, all others optional. "Lägg till"-button → adds as `{ customWine: {...}, pourOrder: <next>, hostNotes: '' }`, resets form.

Both modes display the same yellow soft-cap warning when the host attempts the 9th wine; entry is still accepted.

## Plan listing (`/mina-provningar/planer`)

Server component. Fetches the user's plans via Payload (`where: { owner: { equals: user.id } }`, `sort: '-updatedAt'`). By default filters out `archived`.

- **Empty state:** centered illustration/icon, headline, and `Skapa din första provning` CTA → `/skapa-provning`.
- **Populated:** responsive card grid (1 col mobile, 2 col tablet, 3 col desktop).
- **Header:** `Mina provningsplaner` + `+ Ny provning` CTA → `/skapa-provning`.

`PlanCard` shows: title, occasion (or em-dash placeholder), wine count, status badge (`brand` variant for draft, `default` for ready, `secondary` for archived), relative "Senast uppdaterad …" timestamp. Click card body → `/skapa-provning/[id]`. Trailing menu icon (three dots) opens dropdown with `Arkivera` (or `Ta bort permanent` if already archived).

## API routes

All routes auth-gated. Owner check happens in collection ACL; route handlers re-verify for clean error semantics.

**`POST /api/tasting-plans`**
- Body: `{ title, description?, occasion?, targetParticipants?, wines: WineEntry[], hostScript? }`
- Server stamps `owner: user.id`, defaults `status: 'draft'`.
- Validates: title present, 3 ≤ wines.length, each wine XOR-valid (libraryWine OR customWine.name). Collection `beforeValidate` is the second gate.
- Returns: created plan.

**`PATCH /api/tasting-plans/[id]`**
- Owner check (admin override OK).
- Accepts partial body.
- Re-runs validation.

**`DELETE /api/tasting-plans/[id]`**
- Owner check.
- Behavior:
  - If `status !== 'archived'` → set status to `archived` (soft delete, plan disappears from default listing but remains in DB).
  - If `status === 'archived'` → hard delete.

**`GET /api/wines/search?q=<term>`**
- Auth required (any logged-in user).
- Filter: `title ILIKE '%q%' OR producer ILIKE '%q%'`.
- Limit 10.
- Returns lean projection: `[{ id, title, producer, vintage, region, thumbnailUrl }]`.
- Existing index on `wines.title` is sufficient.
- Rate-limit per user to ~30 req/min (loose protection against scraping; reuse any existing in-memory limiter or skip if none — note in plan).

## Validation & error UX

- **Inline** for self-correctable errors as the host types: title length, wine count <3, custom-wine name required.
- **On submit:** if server rejects, scroll to first error and show toast.
- **Optimistic UI** for in-form actions (add/remove wines, reorder) — local state, persisted on Save.
- All Swedish copy.

## Navigation

Add link to `/mina-provningar/planer` in the existing user-area nav (under `/mina-sidor`). Concrete insertion point determined when writing the implementation plan. Add a discoverability slot from the `/mina-sidor` dashboard if there's a clean place — otherwise the nav link alone is fine for MVP.

## Live-session interaction

Sessions reference the plan (Chunk A schema), not a snapshot. Editing a plan while a session is in flight propagates to the session — acceptable and arguably desirable for MVP (host can fix a typo). Edit-during-live-session lock is a 10-line addition deferred to Chunk C (when Start Session lands and we know about live state).

## Testing approach

Repo has no formal test suite. Smoke-verify in dev:

1. Create plan with 3 library wines → land on edit page with data populated.
2. Add a 4th custom wine with only `name` → save → confirm persisted.
3. Reorder wines → save → reload → confirm order persists.
4. Delete a draft → confirm archived (still in DB, gone from default listing).
5. Delete an already-archived → confirm hard delete.
6. Hit `/skapa-provning/[someoneelses-id]` → 404.
7. Two tabs editing same plan → last write wins (document the limitation, no MVP fix).

## Reuse

| Need | Source |
|---|---|
| Card/Button/Input/Textarea/Select/Badge (brand variant) | `src/components/ui/*` |
| Toast | existing sonner |
| richText editor (hostScript) | block set inherited from `Vinprovningar.fullDescription` |
| Auth (server) | existing `getPayload` + `getUser` pattern (see `vinlistan/page.tsx`) |
| Wine title display fallback | `getWineTitle` from `src/lib/wines/get-wine-display.ts` |
| Owner-scoped page fetch pattern | mirror `src/collections/UserWineLists.ts` consumers |
| Drag-reorder | `@dnd-kit/core` if present; else up/down arrow buttons |

## Risks

| Risk | Mitigation |
|---|---|
| `/api/wines/search` could be scraped | Auth-gate + per-user rate limit; cheap protection for MVP. |
| Drag-reorder dep may not be present | Plan-time check; fall back to arrow-button reorder if not in `package.json`. |
| Race on two-tab edit | Last write wins; document. Will revisit if it bites a user. |
| Custom wines blow up downstream displays missed in Chunk A's audit | Chunk B's smoke test #2 exercises this; any new render path uses `getWineTitle`. |

## Out of scope (deferred)

- Mark-as-ready status transition (Chunk C — when start-session lands).
- Plan detail page (`/mina-provningar/planer/[id]`) — Chunk C.
- Shopping list, host cheat sheet — Chunk C.
- Edit-while-live lock — Chunk C.
- Wines from outside Vinakademin's library indexed for re-use across plans — never (custom wines stay as per-plan snapshots, per project-wide YAGNI).

## Verification (end-of-chunk)

1. Lint clean, TS clean for touched files.
2. All 7 smoke tests pass.
3. Migration: none.
4. Generated types: no changes (no schema delta).
5. Commit, push main → production.

## Effort estimate

5–6 working days. No external dependencies on Chunk A schema fixes.
