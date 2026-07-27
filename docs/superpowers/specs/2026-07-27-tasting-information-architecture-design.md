# Tasting information architecture — one surface for provningar

**Date:** 2026-07-27
**Status:** Design approved, pending implementation plan
**Surfaces:** `/provningsmallar`, `/mina-provningar/*`, `/skapa-provning`, primary nav, breadcrumbs

---

## 1. Why

Users browse the tasting library and never learn they can build their own. Creation lives
behind an account-menu item most visitors never open, and the breadcrumb on the way there
says "Vinkurser" — a different product entirely.

### 1.1 Verified defects

**Creation is unreachable from the place people look.** `/provningsmallar/page.tsx` renders
only `tasting-templates`. Its single create affordance is gated:
`{isAdmin && <Link href="/provningsmallar/ny">Skapa ny mall</Link>}` (`page.tsx:145-152`),
and `/provningsmallar/ny/page.tsx:16` hard-stops non-admins with `notFound()`. The
user-facing creation route `/skapa-provning` is linked from exactly three places —
`mina-provningar/planer/page.tsx`, `PlanCard.tsx`, `PlanDetailView.tsx` — every one of
them already inside the account area. A logged-in user who lands on the gallery has no
path to creating anything.

PostHog, 90 days: `/provningsmallar*` drew **154 unique people** and **180 external
referrals**; `/skapa-provning*` drew **10 people** and 4 referrals. Roughly a 15:1 gap
between browsing and reaching creation.

**The `/mina-provningar` namespace holds two unrelated products.** This is the root cause
of the breadcrumb complaint, and it is not a mislabel:

| Route | Actually renders |
|---|---|
| `/mina-provningar` | `MinaProvningarPage` → **purchased video courses** (`/api/users/[id]/courses`, `transformEnrollmentData`) |
| `/mina-provningar/planer` | tasting plans (`tasting-plans` where `owner = user`) |
| `/mina-provningar/historik` | live-session history |

`breadcrumb-bar.tsx:38` maps `'mina-provningar': 'Mina vinkurser'`. That label is **correct
for the root** and **wrong for both children** — and no single label can be right, because
one path segment means two different things. The root's own metadata agrees:
`title: 'Mina Vinkurser - Vinakademin'`, `description: 'Dina kopta vinkurser och framsteg.'`
(`mina-provningar/page.tsx:5-6`). Relabelling the segment cannot fix this; only splitting it
can.

**Two entry points, no relationship between them.** Primary nav offers `Provningsmallar` →
`/provningsmallar` (`top-nav-header.tsx:35`). The account dropdown offers `Mina provningar`
→ `/mina-provningar/planer` (`:155-159`), and the mobile drawer duplicates both
(`mobile-bottom-nav.tsx:184-189, 213-219`). Neither surface links to the other except from
the plans **empty state** (`planer/page.tsx:88-90`) — i.e. the cross-link exists only for
users who have already found the page and have nothing on it.

---

## 2. What we are not changing

The **data model**. `tasting-plans` and `tasting-templates` stay separate collections with
their existing access rules, entitlements, clone flow (`UseTemplateButton`), and session
machinery. This work is presentational and navigational. No Payload collection changes, and
therefore **no migration** (per CLAUDE.md, migrations are required for collection/enum
changes only).

The **live-session URL** `/mina-provningar/planer/[id]?session=<id>`. Guests hold this link
via join flows and QR codes, `middleware.ts:122-127` carves it out of the auth gate for
cookie-only guests, and `middleware.ts:135-140` does the same for
`/mina-provningar/historik/[sessionId]`. Moving either would break tastings in flight and
already-shared links for no user-visible gain.

---

## 3. Decisions

### D1 — `/provningsmallar` becomes one surface, labelled "Provningar"

The URL stays. It carries 180 external referrals over 90 days and is the site's
best-performing content page; renaming it trades real acquisition for cosmetics.

The page gains a primary segmented control:

```
PROVNINGAR                                        [ + Skapa egen ]
Färdiga upplägg från Vinakademin — eller bygg din egen.

[ Alla ]  [ Mina ]  [ Från Vinakademin ]
   ↑ visa=  (absent)   mina        mallar

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  ▨ gradient      │  │  ▨ photo         │  │  ▨ photo         │
│         [ MIN ]  │  │        [ 249 kr ]│  │        [ Fri ]   │
├──────────────────┤  ├──────────────────┤  ├──────────────────┤
│ Min fredags-     │  │ Bourgogne för    │  │ Smaka Riesling   │
│ provning         │  │ nybörjare        │  │                  │
│ 4 viner · Utkast │  │ 6 viner          │  │ 5 viner          │
│ 2 d sedan        │  │ Av Vinakademin   │  │ Av Vinakademin   │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

**Filter state lives in the URL** as `?visa=mina` / `?visa=mallar`; absent means "Alla".
Swedish param name for consistency with the rest of the site's routing. It composes with
the existing `tag`, `access`, and `status` params already handled at `page.tsx:26`.

**Secondary filters scope to the active view.** The `Fri` / `Betald` access pills
(`page.tsx:111-130`) and `TagFilter` are template-only concepts, so they render under
`Alla` and `Från Vinakademin` and are hidden under `Mina`. `Mina` instead exposes the plan
filter that already exists on the plans page — `Visa arkiverade` (`planer/page.tsx:54-63`).
Filters that cannot apply to what is on screen must not be on screen.

**Sort.** Templates sort `-publishedAt`, plans sort `-updatedAt` (`planer/page.tsx:38`).
Under `Alla`, plans render first, then templates. A user's own drafts are the higher-intent
item and the smaller set; burying them under 60 templates would defeat the change.

### D2 — `PlanCard` gains a card shell matching `TemplateCard`

Today the two cards cannot share a grid. `TemplateCard` is a 4:3 image card with a
top-right badge (`TemplateCard.tsx:32-60`); `PlanCard` is a compact text card with an
absolutely-positioned link overlay and a `MoreVertical` dropdown
(`PlanCard.tsx:137-180`). Interleaving them as-is produces a visibly broken grid.

`PlanCard` gets a 4:3 header block. Plans have no `featuredImage`, so it renders a brand
gradient with a wine icon and the pour count — deliberately distinct from a photo, so
"mine" reads instantly under `Alla` without depending on the badge alone. The existing
top-right slot then carries a `MIN` badge, matching where `TemplateCard` puts its price.

The dropdown (Skapa kopia / Arkivera / Återställ) and its `AlertDialog`s stay. The
`pointer-events-none` / `pointer-events-auto` interplay with the overlay link
(`PlanCard.tsx:145-160`) is load-bearing — the dropdown trigger sits inside an element the
overlay would otherwise swallow. Preserve it.

### D3 — "Skapa egen" is on the gallery, for everyone

A primary button in the page header, visible to all visitors:

- **Logged in** → `/skapa-provning`
- **Logged out** → `/logga-in?from=%2Fskapa-provning`, matching the pattern already used at
  `top-nav-header.tsx:190`

The existing admin-only `Skapa ny mall` button moves beside it as a secondary action —
admins keep authoring templates, but that is no longer the only create affordance on the
page.

**Logged out, the segmented control is not rendered.** Everything visible is a template, so
a `Mina` chip would filter to a guaranteed-empty result — a dead end dressed as a feature.
The header CTA carries the message instead. This resolves the open question from design
review in favour of the simpler surface.

### D4 — Navigation collapses to one primary item

| Surface | Before | After |
|---|---|---|
| Primary nav (`top-nav-header.tsx:35`) | `Provningsmallar` → `/provningsmallar` | `Provningar` → `/provningsmallar` |
| Account dropdown (`:154-159`) | `Mina provningar` → `/mina-provningar/planer` | *removed* |
| Account dropdown (`:166-171`) | `Historik` | unchanged |
| Mobile drawer, Utforska (`mobile-bottom-nav.tsx:213-219`) | `Provningsmallar` | `Provningar` |
| Mobile drawer, Mitt konto (`:184-189`) | `Mina provningar` | *removed* |

One destination, in the nav, for both halves of the concept.

### D5 — Evict the video-courses page from the tasting namespace

`/mina-provningar` (root) → **`/mina-vinkurser`**, with an exact-match 301.

This is the fix for the breadcrumb defect. With the courses page moved out, everything
remaining under `/mina-provningar/` genuinely is a tasting, so
`'mina-provningar': 'Mina provningar'` becomes true for all of it — rather than being a
label we know is wrong on one of the three pages.

Inbound references to update: `checkout/success/page.tsx:97,234,271`,
`aktivera-konto/page.tsx:14`, `onboarding/page.tsx:17`,
`api/webhooks/stripe/route.ts:798`, `mina-sidor/page.tsx:76`,
`dashboard/RoleBasedContent.tsx:54`, `profile/UserProfilePage.tsx:74`, `robots.ts:32`,
and the `protectedPaths` entry at `middleware.ts:19` (which must now cover **both**
prefixes). Account-activation emails already sent contain the old URL; the 301 catches them.

**This decision was added after design review**, on discovering that the segment hosts two
products. It is separable — skipping it means keeping a breadcrumb label that is wrong on
two pages out of three — but it is the only change that makes the namespace honest.

### D6 — Redirects, and the trap in them

Two exact-match 301s, placed with the existing redirects at `middleware.ts:79-95`, i.e.
**before** the `protectedPaths` gate so a logged-out user is redirected rather than bounced
to login:

```
/mina-provningar/planer   →  /provningsmallar?visa=mina
/mina-provningar          →  /mina-vinkurser
```

**Both must match exactly — never by prefix.** The established pattern in this file is
`pathname === X || pathname.startsWith(X + '/')` (`:80`, `:91`). Applying it here breaks
the product:

- `startsWith('/mina-provningar/planer')` swallows `/mina-provningar/planer/[id]`, the live
  tasting session and its `handlingslista`.
- `startsWith('/mina-provningar')` swallows *everything* — sessions, history, guest recaps.

Use `pathname === '/mina-provningar/planer'` and `pathname === '/mina-provningar'`. The
plans redirect must also forward `showArchived=1` (`planer/page.tsx:28`) so the archived
view survives as `?visa=mina&showArchived=1`.

### D7 — Breadcrumbs

In `breadcrumb-bar.tsx`:

- `PAGE_LABELS['mina-provningar']`: `'Mina vinkurser'` → **`'Mina provningar'`** (true once D5 lands)
- `PAGE_LABELS['provningsmallar']`: `'Provningsmallar'` → **`'Provningar'`**
- `PAGE_LABELS['mina-vinkurser']`: new → `'Mina vinkurser'`
- `SUB_LABELS['mina-provningar'].planer` stays `'Planer'` — reachable only as a redirect
  source now, but harmless and correct if hit
- New `PARENT_SECTIONS` map so a root-level segment can declare a parent crumb:
  `'skapa-provning'` → `{ label: 'Provningar', href: '/provningsmallar' }`, rendering
  **`Hem › Provningar › Skapa egen`** instead of the current orphaned `Hem › Skapa provning`

`PAGE_LABELS['skapa-provning']` becomes `'Skapa egen'` to match the CTA that leads there.

### D8 — Details that are easy to lose

**Filter composition.** `pillHref()` and `statusHref()` (`page.tsx:94-109`) rebuild the
query string from scratch. Both must thread `visa` through, or clicking `Fri` silently
throws the user back to `Alla`. Same for `TagFilter`'s link construction.

**The plans empty state must survive.** `planer/page.tsx:73-92` renders a wine icon,
"Inga planer än", the one-line explanation of what a provning is, and two buttons
(`Skapa från grunden` / `Utforska mallar`). That copy is the only place the product
explains itself to a new user; it moves to `visa=mina` with the second button changed to
switch view rather than navigate.

**Page metadata.** `metadata.title` is `'Provningsmallar — Vinakademin'` (`page.tsx:14`)
and the description names only templates. Both need to describe the merged surface.

**Instrumentation.** `trackEvent` is already imported in this area (`PlanCard.tsx:28`).
Fire an event on view-filter change and on the `Skapa egen` click, split by auth state —
the 15:1 browse-to-create gap in §1.1 is the number this work exists to move, and without
these events we cannot tell whether it moved.

**Component paths.** D5 moves the *route* directory
(`app/(frontend)/(site)/mina-provningar/page.tsx` → `mina-vinkurser/page.tsx`). The
component at `src/components/mina-provningar/MinaProvningarPage.tsx` stays put — renaming
it is churn that touches no user-visible surface and inflates the diff.

---

## 4. Naming

"Provningar" covers both halves. The alternative — inventing separate nav words for
"tastings you made" and "tastings you can buy" — reintroduces exactly the split this work
removes, and the two are the same object to a user: a set of wines to taste in order.

The commercial signal stays on the card, where it already works: `TemplateCard` renders a
price badge, a `Prova gratis` badge, or `Fri` (`TemplateCard.tsx:42-59`), plus
"Av Vinakademin" as the byline. Adding `MIN` to plans completes the pair. This resolves the
second open question from design review — no additional commercial treatment is needed
beyond what the badge already carries.

---

## 5. Risks

| Risk | Mitigation |
|---|---|
| A prefix redirect kills live sessions | D6; exact-match assertions in the verification script |
| `/mina-provningar` 301 breaks activation emails already in inboxes | The 301 is what catches them; verify `next=` decode still lands correctly |
| Mixed grid looks broken | D2 gives plans a matching 4:3 shell before they share a grid |
| Gallery becomes a per-request DB query for logged-in users | Page is already `dynamic = 'force-dynamic'` and already calls `getUser()` (`page.tsx:19,33`); plans query only fires when the view includes `Mina` |
| Logged-out users see a personal filter | D3 — control is not rendered logged out |

---

## 6. Success criteria

1. A logged-in user on `/provningsmallar` can reach creation in one click.
2. A logged-out user on `/provningsmallar` sees a create CTA that routes through sign-in
   and returns to `/skapa-provning`.
3. `/mina-provningar/planer` 301s to `/provningsmallar?visa=mina`, preserving `showArchived`.
4. `/mina-provningar/planer/123?session=45` still loads the live session — for an
   authenticated participant **and** for a cookie-only guest.
5. `/mina-provningar/historik/45` still loads for a cookie-only guest.
6. No breadcrumb anywhere under `/mina-provningar/` says "Vinkurser".
7. `/skapa-provning` breadcrumbs read `Hem › Provningar › Skapa egen`.
8. Primary nav contains exactly one tasting entry; the account dropdown contains no
   duplicate of it.
9. `pnpm lint`, `npx tsc --noEmit` (≤75 lines, the standing ceiling), and `pnpm build` all
   pass. `pnpm build` is the real gate — a JSX parse error can make `tsc` report *fewer*
   errors by bailing early.
