# Chunk G — Polish & Visibility: Design Spec

**Status:** Approved 2026-05-13. Implementation plan to follow.

## Goal

Seven cross-cutting improvements bundled as one chunk. Together they close the retention loop (history view), unstick a stuck data path (archived plans), surface what's been built (template tags, wine cross-link), open a public surface (host profile), reduce first-host confusion (onboarding tour), and finish the live-session UX (Lämna in plan mode).

## Feature catalogue

| # | Slug | Surface | Effort |
|---|---|---|---|
| G1 | Session history | `/mina-provningar/historik` + `[sessionId]` detail | ~2 days |
| G2 | Archive UI with restore | `/mina-provningar/planer` toggle + PlanCard `Återställ` | ~0.5 day |
| G3 | Template tagging | `TastingTemplates.tags` + tag-chip filter on `/provningsmallar` | ~1 day |
| G4 | Wine cross-link | "Smakad i N provningar" on `/vinlistan/[slug]` | ~0.5 day |
| G5 | Public host profile | `/v/[handle]` + `Users.handle/bio` + `TastingPlans.publishedToProfile` | ~2 days |
| G6 | Onboarding tooltips | `react-joyride`-based 3-tour set | ~1 day |
| G7 | Lämna session in plan mode | Header button in `PlanSessionContent` | ~0.5 day |

Total: ~7.5 working days.

## Schema additions

```
TastingTemplates   + tags: text[] | null            -- multi-text via Payload array-of-text
Users              + handle: text | null UNIQUE     -- /v/[handle] route key
                   + bio: text | null               -- max 280 chars, optional
TastingPlans       + publishedToProfile: boolean    -- default false
```

Four additive, nullable/defaulted columns. One migration. No backfill.

`handle` validation: lowercase, hyphen-friendly, 3–30 chars, regex `^[a-z0-9][a-z0-9-]*[a-z0-9]$`. Unique. Server normalizes (lowercase + trim) before save.

## G1. Session history

**Route:** `/mina-provningar/historik` (auth-gated). New top-level link in the user dropdown next to `Mina planer`.

**Listing query** — sessions the user participated in OR hosted:

```ts
payload.find({
  collection: 'course-sessions',
  where: {
    or: [
      { host: { equals: user.id } },
      { id: { in: <session ids from session-participants where user = user.id> } },
    ],
  },
  sort: '-completedAt', // null sorts last; fall back to -expiresAt for non-completed
  limit: 100,
  depth: 1,
})
```

Two-step query: first fetch `session-participants` ids, then the sessions. Cheap.

**Listing card per row:**
- Date — `completedAt` (or `expiresAt` if not completed), formatted `sv-SE`
- Title — `session.tastingPlan.title` or `session.course.title`
- Role badge — `Värd` (brand variant) if `host === user.id`, else `Gäst` (secondary)
- Meta — `<n> viner · <m> deltagare`
- Link → `/mina-provningar/historik/[sessionId]`

**Empty state:** "Du har inte deltagit i några provningar än."

**Detail page (`/mina-provningar/historik/[sessionId]`)** — server component. Auth required. The user must be either host OR a participant; otherwise 404.

Renders:
- Header: title + date + role badge
- Wine list (read-only, with bottle thumbnails) — uses the existing display helpers
- The user's own reviews (if they left any) — rating + tasting notes excerpt + buyAgain chip
- Group averages section (if ≥2 reviewers): per-wine avg rating + top aromas (same aggregation as Chunk D's wrap-up + Chunk F's swarm — extract a shared helper)
- Footer link: if user is the plan's owner, "Visa planen" → `/mina-provningar/planer/[id]`

No interactive controls. No SSE. Just past-tense data.

**Nav** — Add `Historik` to `top-nav-header.tsx` user-dropdown next to `Mina planer`.

## G2. Archive UI with restore

**Listing page (`/mina-provningar/planer`):**
- Add a controlled checkbox above the grid: `Visa arkiverade`. Default `false` (localStorage-backed `vk_show_archived`).
- When `true`, drop the `status != 'archived'` filter from the Payload query.

**Card rendering when status === 'archived':**
- Add `opacity-60` on the Card; existing `Arkiverad` badge stays.
- Dropdown menu items swap:
  - `Arkivera` → `Återställ` (PATCH `status: 'draft'`)
  - Keep `Ta bort permanent` (existing)
- Card body still navigates to the detail page; the detail page already renders for archived plans (Chunk B's owner check doesn't filter on status).

**API**: no changes. Existing PATCH `/api/tasting-plans/[id]` accepts `status` in the body.

## G3. Template tagging

**Schema:** `TastingTemplates.tags: text[] | null` (Payload `type: 'array'` of single text items, OR `type: 'text', hasMany: true` if supported). Admin enters tags in the existing admin form.

**Listing UI (`/provningsmallar`):**
- New tag-chip strip above the grid:
  - Build the tag union server-side from all published templates' tags.
  - Sort by count desc; hide tags with count < 2 (to avoid spammy long-tail tags ruining the layout).
  - Cap at 12 visible tags; the rest hidden behind a `+ <N> fler` expander.
  - Each chip is a `<Link href="/provningsmallar?tag=<tag>">`.
- Active tag (URL has `?tag=<tag>`): chip is filled brand-color; templates list filtered to `tags: { contains: tag }`.
- `Rensa` chip next to the strip when a filter is active.

No multi-tag filter, no AND/OR combinators. Single tag at a time. Out of scope.

## G4. Wine cross-link

**Surface:** `/vinlistan/[slug]` detail page (existing). Insert below the price/buy strip:

```tsx
{tastingCount > 0 && (
  <section className="mt-4">
    <p className="text-sm text-muted-foreground">
      Smakad i {tastingCount} {tastingCount === 1 ? 'provning' : 'provningar'}
    </p>
    {publicPlans.length > 0 && (
      <ul className="mt-1 flex flex-wrap gap-2">
        {publicPlans.slice(0, 3).map((p) => (
          <li key={p.id}>
            <Link href={`/v/${p.owner.handle}/${p.id}`} className="text-sm hover:underline">
              {p.title}
            </Link>
          </li>
        ))}
      </ul>
    )}
  </section>
)}
```

**Count query**: `tastingCount` = number of distinct TastingPlans whose `wines.libraryWine` references this wine. Restrict to plans where `publishedToProfile = true` AND the owner has a handle set:

```sql
SELECT COUNT(DISTINCT tp.id) FROM tasting_plans tp
JOIN tasting_plans_wines tpw ON tpw._parent_id = tp.id
JOIN users u ON tp.owner_id = u.id
WHERE tpw.library_wine_id = $wineId
  AND tp.published_to_profile = true
  AND u.handle IS NOT NULL
```

In Payload terms: `payload.find({ collection: 'tasting-plans', where: { and: [{ 'wines.libraryWine': { equals: wineId } }, { publishedToProfile: { equals: true } }] }, depth: 1 })` and count the docs (or use `limit: 0`'s `totalDocs`). For the linked titles, take the first 3 with non-null `owner.handle`.

If `count = 0`, render nothing.

## G5. Public host profile

**Schema:**
- `Users.handle: text | null` (unique, lowercase, regex-validated)
- `Users.bio: text | null` (max 280 chars)
- `TastingPlans.publishedToProfile: boolean` (default false)

Both `handle` and `bio` editable on the existing user settings page (`/profil`). Empty `handle` = profile not opted in.

**Routes:**
- `/v/[handle]` — public profile page, no auth, server-rendered, dynamic.
  - Fetch the user: `payload.find({ collection: 'users', where: { handle: { equals: handle.toLowerCase() } }, limit: 1, depth: 0 })`.
  - 404 if no user OR `handle` is null/empty.
  - Render header + published-plans section.
- `/v/[handle]/[planId]` — public plan view, no auth.
  - Fetch user by handle; 404 if not found.
  - Fetch plan: `payload.findByID({ collection: 'tasting-plans', id: planId, overrideAccess: true })`.
  - Verify: `plan.owner === user.id` AND `plan.publishedToProfile === true`. Else 404.
  - Render a stripped-down PlanDetailView — wine list, host script, no action rail, byline `Av <handle>`.

**Wizard surface:** in the existing `Provningsinställningar` section of `TastingPlanForm`, add a third option:

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
      — visa den på /v/<ditt-användarnamn>.
    </span>
  </span>
</label>
```

POST/PATCH `/api/tasting-plans` accepts `publishedToProfile` in the body; route already passes through unknown fields via `data` spread.

**Profile settings UI (`/profil` or wherever user settings live):**
- New section "Offentlig profil":
  - Input: `Användarnamn` — sets `handle`. Real-time validation: regex + uniqueness check. Show URL preview: `vinakademin.se/v/<handle>`.
  - Textarea: `Bio` — 280 chars max, char counter.
  - When `handle` is empty: profile is hidden.
- `Visa profil` link → `/v/<handle>` when handle is set.

**`/v/[handle]` layout:**
- Header: large display name (firstName + lastName, or email-local if both empty), optional bio paragraph, "Sedan <createdAt>" small caption.
- Section: `Publicerade provningar` — grid of PlanCard-style cards (reuse `PlanCard` with a public variant — no dropdown menu, no Arkivera). Click → `/v/[handle]/[planId]`.
- Empty state: "Den här värden har inga publicerade provningar än."
- No session counts, no review feed.

## G6. Onboarding tooltips

**Library:** `react-joyride` (~30kB gzipped). Lazy-imported so non-onboarding flows don't pay the cost.

**Three tour components**, each a thin wrapper that:
- Reads localStorage key on mount (`vk_tour_<name>_done`).
- If absent, mounts `<Joyride>` with the steps; on completion or skip, writes the key.

| Component | Mount point | Trigger | Steps |
|---|---|---|---|
| `WizardTour` | `TastingPlanForm` | First visit to `/skapa-provning` (no `id`) | 4: title, wine picker, drag handle, save |
| `PlanDetailTour` | `PlanDetailView` | First visit to a plan detail page (not session-mode) | 3: Starta gruppsession, Handlingslista, Värdguide |
| `HostSessionTour` | `PlanSessionContent` (host only) | First mount as host | 3: Sätt fokus, Avslöja (skipped if not blind), Timer (skipped if no timer) |

Each tour:
- Dismissable via X / Esc / Skip.
- Visible target highlighted with a spotlight.
- Step copy is brief Swedish.
- Locale customized: `next`, `back`, `skip`, `last` → Swedish.

`Visa rundturerna igen` button in `/profil` clears the three localStorage keys.

## G7. Lämna session in plan mode

Currently `PlanSessionContent` has no header or leave button (only the bare wine list). The course-mode `SessionView` has a leave button in the sticky header.

Add a small header to `PlanSessionContent`'s render (above the wine list):

```tsx
<header className="flex items-center justify-between mb-4">
  <div>
    <h2 className="text-xl font-heading">{plan.title}</h2>
    {plan.occasion && <p className="text-sm text-muted-foreground">{plan.occasion}</p>}
  </div>
  <div className="flex items-center gap-2">
    {isHost ? (
      <Button variant="ghost" size="sm" onClick={() => setEndDialogOpen(true)}>
        <LogOut className="h-4 w-4 mr-1.5" /> Avsluta session
      </Button>
    ) : (
      <Button variant="ghost" size="sm" onClick={() => setLeaveDialogOpen(true)}>
        <LogOut className="h-4 w-4 mr-1.5" /> Lämna session
      </Button>
    )}
  </div>
</header>
```

**Host's `Avsluta session` confirm**: AlertDialog: "Avsluta sessionen för alla?" Body: "Alla deltagare kopplas bort och sessionen markeras som klar. Du kan inte återuppta den." Action: PATCH `/api/sessions/[id]` or POST to a new `/api/sessions/[id]/complete` endpoint that sets `status: 'completed'` + `completedAt: now`. Mirrors what an existing course-mode complete handler does — check `src/app/api/sessions/[id]/...` and reuse the existing route. On success, `router.push('/mina-provningar/planer/[id]')`.

**Guest's `Lämna session` confirm**: AlertDialog: "Lämna provningen?" Body: "Du kan ansluta igen med samma kod om sessionen fortfarande är aktiv." Action: call `useActiveSession().leaveSession()`. On success, `router.push('/')`.

The existing header in `PlanSessionContent` (`<header className="space-y-1">...`) is the inner header inside the grid's left column; this new header sits ABOVE the entire grid and is full-width.

## File structure

```
NEW src/app/(frontend)/(site)/mina-provningar/historik/page.tsx                     G1
NEW src/app/(frontend)/(site)/mina-provningar/historik/[sessionId]/page.tsx         G1
NEW src/components/session-history/SessionHistoryList.tsx                            G1
NEW src/components/session-history/SessionHistoryDetail.tsx                          G1
NEW src/lib/sessions/aggregate-group-stats.ts                                        shared aggregator (extract for D + F + G1)
MOD src/components/top-nav-header.tsx                                               G1 (nav link)
MOD src/app/(frontend)/(site)/mina-provningar/planer/page.tsx                       G2
MOD src/components/tasting-plan/PlanCard.tsx                                        G2 (Återställ)
MOD src/collections/TastingTemplates.ts                                             G3
MOD src/app/(frontend)/(site)/provningsmallar/page.tsx                              G3
NEW src/components/tasting-template/TagFilter.tsx                                   G3
MOD src/app/(frontend)/(site)/vinlistan/[slug]/page.tsx (or current detail path)    G4
NEW src/components/wine/WineTastingsLink.tsx                                        G4
MOD src/collections/Users.ts                                                        G5
MOD src/collections/TastingPlans.ts                                                 G5
NEW src/app/(frontend)/(site)/v/[handle]/page.tsx                                   G5
NEW src/app/(frontend)/(site)/v/[handle]/[planId]/page.tsx                          G5
NEW src/components/profile/PublicHostProfile.tsx                                    G5
NEW src/components/profile/PublicPlanView.tsx                                       G5
MOD src/components/tasting-plan/TastingPlanForm.tsx                                 G5 (publishedToProfile toggle)
MOD existing profile-settings UI                                                    G5 (handle + bio fields)
NEW src/components/onboarding/WizardTour.tsx                                        G6
NEW src/components/onboarding/PlanDetailTour.tsx                                    G6
NEW src/components/onboarding/HostSessionTour.tsx                                   G6
MOD src/components/tasting-plan/TastingPlanForm.tsx                                 G6 (mount)
MOD src/components/tasting-plan/PlanDetailView.tsx                                  G6 (mount) + G7 indirectly
MOD src/components/tasting-plan/PlanSessionContent.tsx                              G6 (mount) + G7 (header)
MOD package.json                                                                    G6 (+ react-joyride)
NEW src/migrations/<ts>_chunk_g_polish.ts                                           4 ADD COLUMN
EDIT src/migrations/index.ts                                                        auto
EDIT src/payload-types.ts                                                           auto
```

## Reuse map

| Need | Source |
|---|---|
| Group-stats aggregation | extract from Chunk D's `buildGroupComparison` + Chunk F's swarm builder into `src/lib/sessions/aggregate-group-stats.ts`; both consumers can adopt it later if convenient |
| Wine display helpers | `getWineDoc`, `getWineTitle`, `WineImagePlaceholder` |
| PlanCard styling | reuse exactly; public variant is just same card without the dropdown |
| AlertDialog confirms | shadcn AlertDialog |
| Server-side fetch + owner-check pattern | mirror `/skapa-provning/[id]` and Chunk C surfaces |
| Profile settings UI | existing `/profil` page — verify exact path during plan-time |

## Risks

| Risk | Mitigation |
|---|---|
| `handle` uniqueness race on signup | Postgres `UNIQUE` constraint catches it; surface clear error in profile form. |
| User picks an existing or offensive handle | Manual moderation; this is the same risk as nicknames already shipped. Acceptable. |
| `tags` array UI with > 30 distinct tags clogs `/provningsmallar` | Hide tags with count < 2; cap at 12 + expander. |
| Aggregator extraction risks breaking Chunks D and F | Extract as a NEW helper used only by G1; only refactor D/F to use it if no migration risk. Defer the refactor. |
| react-joyride bundle size on every page | Lazy-import the tour components (`React.lazy` or dynamic import); only host-facing pages mount them. |
| Public profile leaks owner's email or non-public plans | Profile read uses a lean projection (no email exposed); plan filter is `publishedToProfile: true`. |
| `/v/[handle]` route conflicts with existing routes | Verify no existing single-segment route uses `/v/...`. The route group `(site)` doesn't include anything at `/v`. |
| Session history detail page exposed via guessed sessionId | Always check user is host OR participant before render; 404 otherwise. |
| Lämna session — host's Avsluta marks session completed → triggers wrap-up cron 18h later for participants who left reviews | Intended behavior; this is the close-the-loop signal. |

## Out of scope (deferred)

- Tag autocomplete / canonical vocabulary UI.
- Multi-tag filter on `/provningsmallar`.
- Profile avatar / banner / theme customization.
- Following other hosts.
- Activity feeds on profile.
- Session-history filters (date range, role-only, etc.).
- Localized public profile URLs.
- Plan duplication from history (separate Theme C item).
- Pre-session reminder email (Theme B item; not in this bundle).

## Verification

1. Migration applies cleanly: 4 nullable/defaulted columns.
2. `/mina-provningar/historik` shows past sessions; role badges correct.
3. `/mina-provningar/historik/[sessionId]` 200 for participant/host, 404 for non-participant.
4. `/mina-provningar/planer` toggle reveals archived; restore via `Återställ`.
5. Admin adds tags to a template; `/provningsmallar` shows chips; click filters.
6. Wine detail page shows "Smakad i N provningar" when ≥1 published plan references it; titles link to public profiles.
7. User sets handle in profile; `/v/[handle]` renders; non-published plans absent.
8. Public plan view at `/v/[handle]/[planId]` 404 for unpublished plans even when URL is guessed.
9. First-time host triggers each of 3 tours; dismissal persists.
10. `Avsluta session` (host) ends the session; `Lämna session` (guest) removes them.
11. Lint + TS clean.
12. Push main → production.

## Effort

7–8 working days. The bundle is structurally cohesive (4 schema fields, ~25 file touches, no migration risk) so I'll ship it as one chunk unless something blows up at implementation time.
