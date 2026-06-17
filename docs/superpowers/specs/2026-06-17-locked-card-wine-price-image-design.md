# Locked card polish + wine price/art.nr + session image fix

- **Date:** 2026-06-17
- **Status:** Approved (ready for implementation plan)
- **Scope:** Three independent improvements to the provningsmall experience.

## Item 1 — Locked paywall card (copy + layout)

`src/components/tasting-template/LockedTemplateDetailView.tsx` renders the paywall
card for non-purchasers. Two problems:

1. **Copy:** "Engångsköp för {price} kr — eller medlemskap som ingår alla mallar."
   is grammatically backwards. Replace with:
   **"Engångsköp för {price} kr — eller lås upp alla mallar med ett medlemskap."**
2. **Layout:** three equal-weight buttons in a row (Köp / Bli medlem / Logga in)
   read as visual noise. Restructure to a clear hierarchy:
   - **"Köp för {price} kr"** — primary button
   - **"Bli medlem"** — secondary (outline) button
   - **"Redan medlem? Logga in"** — a small text link (NOT a button), below the two
     buttons. Only shown when `!isAuthenticated`.

Mobile: the two buttons stack full-width, login link beneath. Desktop: the two
buttons sit as a tidy group with the login link below. Tighten spacing so the
card reads as one calm CTA block.

The **right-rail aside** (same file) repeats the same three buttons — apply the
same treatment there (Köp primary, Bli medlem outline, "Redan medlem? Logga in"
as a text link) for consistency.

No copy/behaviour change to the buy/membership routes themselves.

## Item 2 — Price + Systembolaget article number per wine

Where a buyer/host sees full wines, add a meta line under each wine's subtitle:
**"145 kr · Systembolaget 795901"**, where the article number is a link to the
wine's systembolaget.se page (opens in a new tab).

### Surfaces (only where wines are already fully visible)
- `src/components/tasting-template/TemplateDetailView.tsx` (unlocked template view)
- `src/components/tasting-plan/PlanDetailView.tsx` (the owner's plan detail)
- `src/components/tasting-plan/PlanSessionContent.tsx` (the live session)

The public **locked** view is unaffected (it shows "Dolt vin"). Blind sessions are
safe: the server redaction already nulls `libraryWine`/`customWine` for unrevealed
guests, so the helper resolves price/art.nr to nothing until reveal.

### Shared resolution (DRY)
New helper `src/lib/wine-purchase-info.ts`:
- `resolveWinePurchase(w)` — takes a loose wine-entry shape
  (`{ libraryWine?: Wine | number | null; customWine?: {...} | null }`) and returns
  `{ priceSek: number | null; articleNumber: string | null; systembolagetUrl: string | null }`.
  - **price:** `customWine.priceSek` (custom) or `lib.price` (library).
  - **systembolagetUrl:** `customWine.systembolagetUrl` (custom) or `lib.systembolagetUrl` (library).
  - **articleNumber:** `customWine.systembolagetProductNumber` (custom); for library
    wines parse from the URL via `articleNumberFromSystembolagetUrl(url)`.
- `articleNumberFromSystembolagetUrl(url)` — extracts the trailing product number
  from a systembolaget.se URL (e.g. `…/loxarel-a-pel-rose-795901/` → `"795901"`);
  returns `null` when no number is found.

New presentational component `src/components/tasting-shared/WinePurchaseMeta.tsx`:
- Props `{ priceSek, articleNumber, systembolagetUrl }`. Renders nothing when all
  are absent. Renders "{price} kr" and, when an article number exists, "· Systembolaget
  {nr}" as an `<a href={systembolagetUrl} target="_blank" rel="noreferrer">` (plain
  text fallback if there's a number but no URL). Small muted styling matching the
  existing subtitle line.

### Session plumbing
Extend `WineRow` + `rowFromEntry` in `PlanSessionContent.tsx` to carry
`priceSek`, `articleNumber`, `systembolagetUrl` (resolved via the helper for both
the library and custom paths), and render `<WinePurchaseMeta>` in the wine card
using `displayRow` (so redacted/hidden wines show nothing).

## Item 3 — Loxarel image fails to load in a session

### Root cause (confirmed)
The Loxarel is **library wine 106 → media 159**, whose `url` and all `sizes.*.url`
columns are **NULL in the DB**. Such media were created by the Systembolaget
wine-image import, which does not persist the CDN URL (when `S3_PUBLIC_URL` is set,
Payload normally persists `Media.url`/`sizes.*.url` as direct CDN URLs at upload —
the import bypasses that). **9 of 164 media** are affected. Custom wines are immune
because they store the Systembolaget CDN URL as a plain string, not a Payload media.

The static resolution paths for a library-wine image are identical between the
working template preview and the failing session, so the exact template-vs-session
difference can't be pinned from code alone.

### Approach
1. **Reproduce on staging first** — open a session for a plan containing a
   library wine whose media has a null URL; confirm the broken image and inspect
   whether the wine's image URL arrives null. This pins the mechanism before any
   change.
2. **Backfill** the null-URL media using the existing
   `scripts/backfill-media-urls-to-cdn.ts` (populates `url` + every `sizes.*.url`
   from `filename` → CDN). Run against staging, verify, then production. This makes
   the affected images load everywhere regardless of read-time generation. Running
   it against production is an operational step to be confirmed with the user at
   execution time.
3. **Harden the Systembolaget image import** so newly-imported media persist their
   URLs (prevents recurrence). Locate the import during planning.
4. **Verify** on staging that the Loxarel image loads in a session after the backfill.

## Non-goals
- No change to the buy/checkout/membership flows.
- No redesign of the wine card layout beyond adding the price/art.nr meta line.
- No change to blind-tasting redaction logic (it already protects the new fields).

## Decisions (resolved during brainstorming)
- Locked card: fix copy + restructure to 2 buttons + "Redan medlem? Logga in" text
  link; apply to both the inline card and the aside.
- Price/art.nr: a meta line "{price} kr · Systembolaget {nr}" with the art.nr linking
  to systembolaget.se; shown in unlocked template detail, plan detail, and session.
- Image bug: reproduce on staging → backfill null-URL media → harden the import →
  verify.
