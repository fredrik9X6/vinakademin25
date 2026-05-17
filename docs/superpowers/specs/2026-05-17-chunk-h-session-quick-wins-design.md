# Chunk H — Session Quick Wins — Design

**Author:** Fredrik (with assistant)
**Date:** 2026-05-17
**Status:** Draft, awaiting final review

## Context & motivation

Three small, mostly-independent improvements bundled into one chunk because each lands in a few hours and they all touch the in-session / post-review UX where members spend most of their attention.

1. **Remove the auto-scroll in plan-mode sessions.** Today, when a host advances the focused wine, every participant's wine list scrolls the active row into view. In practice it's jarring — readers lose their reading position mid-sentence, and the scroll fires on every host action even when the user is mid-tap. The well-intentioned "keep current wine in view" effect costs more than it gives.
2. **Smart aroma/flavour suggestions in `WineReviewForm`.** The MultiSelect for primary aromas, primary flavours, secondary flavours and tertiary flavours each renders ~30–50 chips. The vocabulary is good but the choice fatigue is real, especially in simple mode where it's the only required field. The wine's type (red / white / sparkling / rosé / dessert / fortified) is almost always known at review time — we already store it on `Wine.type` and on `customWine.type`. Re-ranking the chip list so the type-relevant ones appear first reduces decision time without removing options.
3. **Wishlist + Systembolaget jump after a high rating.** When a member rates a wine 4★ or higher, the most valuable next action is "I want to remember to buy this again" or "I want to buy this now". Today, neither is one tap away. The `UserWines` collection already exists, and library wines + Systembolaget-sourced customWines both carry the metadata to deep-link to systembolaget.se.

## What ships in v1

- One `useEffect` deletion in `PlanSessionContent.tsx`.
- One new module `src/lib/wset-flavour-vocab.ts` exporting the type→suggested-labels map plus the full alphabetical list, used by `WineReviewForm`.
- One small affordance block at the bottom of `WineReviewForm`'s "submitted" state (the post-submit confirmation view): two inline buttons gated on `rating >= 4` and on the wine identity.
- No new collections. No schema changes. No migrations.

## Architecture

### 1. Auto-scroll removal

**Where:** `src/components/tasting-plan/PlanSessionContent.tsx:247-253`

The relevant block:

```ts
const scrollRefs = React.useRef<Record<string, HTMLLIElement | null>>({})
React.useEffect(() => {
  if (!followingHost || activePour == null) return
  const row = rows.find((r) => r.pourOrder === activePour)
  if (!row) return
  const node = scrollRefs.current[row.key]
  if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' })
}, [activePour, followingHost, rows])
```

**Change:** delete the effect and the `scrollRefs` ref. Delete the `ref={...}` assignment on the `<li>` wrapper inside the list render. The `followingHost` value from `useActiveSession` is still used by course-mode (`SessionView.tsx`) for actual lesson auto-advance — leave that alone, it's a different code path. Only the plan-mode in-page scroll is being removed.

This is purely additive removal — no replacement UI. The active wine still has its visual `ring-2 ring-brand-400/40` highlight, and guests can find it by scanning the list (the list is short — typically 4–8 wines, all visible without scrolling on most viewports anyway).

### 2. Smart aroma/flavour suggestions

**Where:** `src/components/course/WineReviewForm.tsx` — four MultiSelect renders:
- `primaryFlavours` in simple mode (line ~700)
- `primaryAromas` in advanced mode (line ~905)
- `secondaryAromas` in advanced mode (line ~965)
- `primaryFlavours` again in advanced mode (in the palate section)
- (Tertiary aromas/flavours stay alphabetical — they're rarely populated and the vocabulary is small enough to skim.)

**New module:** `src/lib/wset-flavour-vocab.ts`

```ts
export type WineType =
  | 'red' | 'white' | 'rose' | 'sparkling' | 'dessert' | 'fortified' | 'other'

// The full alphabetical vocabulary, single source of truth.
// (Today the same lists are duplicated inline in the form 4 times.)
export const PRIMARY_FLAVOURS: string[] = ['Jordgubbe', 'Päron', /* … */]
export const SECONDARY_AROMAS: string[] = ['Vanilj', 'Ceder', /* … */]
// (etc — re-exported from what's currently inlined)

// Type → ordered list of plausible-first labels. Items not in the suggested
// list still render in alphabetical order beneath the suggested group.
export const SUGGESTED_BY_TYPE: Record<WineType, string[]> = {
  red: ['Hallon', 'Röda körsbär', 'Mörka körsbär', 'Björnbär', 'Svarta vinbär',
        'Mörka plommon', 'Lakrits', 'Svart- & Vitpeppar', 'Mogen frukt', 'Viol'],
  white: ['Citron', 'Lime', 'Grapefrukt', 'Äpple', 'Päron', 'Persika',
          'Aprikos', 'Krusbär', 'Blomma', 'Blöta stenar'],
  rose: ['Jordgubbe', 'Hallon', 'Röda körsbär', 'Grapefrukt', 'Blomma', 'Ros'],
  sparkling: ['Äpple', 'Päron', 'Citron', 'Lime', 'Blomma', 'Bröd', 'Bröddeg'],
  dessert: ['Aprikos', 'Persika', 'Honung', 'Apelsin', 'Mogen frukt', 'Vanilj'],
  fortified: ['Mörka plommon', 'Fikon', 'Russin', 'Choklad', 'Karamell', 'Nötter'],
  other: [], // no suggestions — full alphabetical only
}
```

(Exact suggested lists to be finalized in the plan; the shape is what matters here.)

**UI change:** the MultiSelect's options prop becomes:

```ts
options={buildSuggestedOptions(PRIMARY_FLAVOURS, wineType)}
// returns an array shaped like:
// [
//   { group: 'Föreslagna för rött vin', label: 'Hallon', value: 'Hallon' },
//   { group: 'Föreslagna för rött vin', label: 'Röda körsbär', value: 'Röda körsbär' },
//   …
//   { group: 'Alla', label: 'Ananas', value: 'Ananas' },
//   …
// ]
```

The existing `MultiSelect` component (`src/components/ui/multi-select.tsx`) is the shadcn-style one. If it doesn't yet support group headings natively, the simplest path is a thin wrapper that renders a `<div className="text-xs text-muted-foreground px-2 py-1 sticky top-0 bg-popover">Föreslagna för {label}</div>` row before the suggested options. To be confirmed in the plan.

**Where `wineType` comes from:**
- Library wine: `(wine as Wine).type` — already loaded.
- Custom wine snapshot: `customWineSnapshot.type` — already a prop on `WineReviewForm`.
- Editing an existing review: `initialReview.customWine?.type` or `initialReview.wine?.type` — resolved in `populateFormWithReview`.
- If unknown (`'other'` or null), fall through to alphabetical-only.

### 3. Wishlist + Systembolaget jump

**Where:** `src/components/course/WineReviewForm.tsx` — the post-submit confirmation block. After `submittedReview` is set, today the form shows a "Recension sparad ✓" card. We add two inline buttons below that card, gated by:

```ts
const showWishlistCTAs = (submittedReview?.rating ?? 0) >= 4
```

**Buttons:**

1. **Spara till mina viner** — only shown when there's a library `wineId`. Calls `POST /api/user-wines` with `{ wine: wineId, priority: 'medium', notes: '' }`. (Owner auto-set by Payload from the auth context.) On success, toast "Sparat till dina viner" and disable the button. For pure customWine reviews, this button is hidden in v1 — promoting a customWine snapshot into the curated `Wines` collection or extending `UserWines` to accept snapshots is a future spec.

2. **Köp på Systembolaget** — shown when a Systembolaget URL is available. Sources, in priority order:
   - `wine.systembolagetUrl` for library wines
   - `customWine.systembolagetUrl` for custom-wine snapshots
   - Built from `customWine.systembolagetProductNumber` as a fallback: `https://www.systembolaget.se/sok/?sok={productNumber}` (the canonical product URL needs a slug we don't always have, but the search URL with the product number resolves to the right product reliably).
   Opens in a new tab with `rel="noopener noreferrer"`.

If neither button is shown (no library wine + no URL), the post-submit state looks unchanged from today.

**Reused endpoints:** `POST /api/user-wines` (existing). No new endpoint.

### Reused utilities / patterns

- `cn()` from `src/lib/utils.ts` for class merging — used in the new buttons.
- `toast` from `sonner` for success/error feedback (matches existing form behaviour).
- `Button` from `@/components/ui/button` for the CTAs.
- `useAuth()` from `@/context/AuthContext` to gate the "Spara" button on logged-in members. Guests in a session may not have an account — hide both buttons for them (they can rejoin or sign up later).

## What we explicitly do NOT do in v1

- No promotion of `customWine` snapshots into the curated `Wines` collection. Users who hand-type a wine can't "Spara till mina viner" until that gap is closed in a later chunk.
- No bulk-edit of suggested-flavours vocabulary in the Payload admin. The map lives in code; tweaking it requires a PR. Acceptable trade-off for v1.
- No grape- or region-based filtering of suggested flavours. Type-only. (e.g., we won't refine "red" into "Bordeaux red" vs "Pinot Noir red".)
- No "remove from wishlist" affordance in the form — managing the wishlist lives on `/mina-sidor/viner` (the existing UserWines surface). Once saved, the button just becomes "Sparat" disabled.
- No analytics on the new buttons in v1 — easy to add via the existing `trackEvent('wishlist_added', …)` pattern later, but keeping scope tight.

## Verification

End-to-end smoke list for the implementer:

1. **Auto-scroll removed:** Start a host session. Set focus on wine 3 from the host. Confirm guest's wine list does NOT scroll. Confirm guest can still see "Värden pratar om detta" badge on wine 3 (the ring highlight stays). Confirm course-mode auto-advance (`/vinprovningar/[slug]` session route) still works — that path is untouched.
2. **Smart aromas:** Open `/recensera-vin`, pick a red library wine from the picker. Open the WSET dialog → expand "Primära smaker" multi-select. Confirm "Hallon, Röda körsbär, Mörka körsbär…" appear at the top under a "Föreslagna för rött vin" header. Confirm scrolling further down still shows "Ananas, Banan…" alphabetically. Repeat with a white wine — confirm "Citron, Lime, Grapefrukt…" surface first.
3. **Wishlist button (library wine, 4★+):** Submit a 4-star review of a library wine. Confirm "Spara till mina viner" + "Köp på Systembolaget" appear. Click "Spara" → toast appears → button disables to "Sparat". Visit `/mina-sidor/viner` → confirm the wine is listed.
4. **Wishlist hidden (3★):** Same flow with a 3-star review. Confirm neither button appears.
5. **Systembolaget jump for customWine:** Add a custom wine via the picker with a Systembolaget URL or productNumber. Rate 5★. Confirm "Köp på Systembolaget" appears and "Spara" does NOT (no library wine ID). Confirm the URL opens in a new tab.
6. **Type unknown:** Submit a review with `type: 'other'`. Confirm the smart-aromas drop back to alphabetical-only — no empty "Föreslagna" header.

## Risk / fallback

- **MultiSelect grouping**: if the existing `MultiSelect` component doesn't support group headings or a sticky label row cleanly, fall back to plain reordering — put suggested options first in the flat list, no visual divider. Worse but still useful.
- **UserWines POST shape**: the `/api/user-wines` body shape needs to be verified at implementation time (look at how `/mina-sidor/viner` already creates rows). If admin-only access, may need to surface the user from the cookie; the existing Reviews POST pattern is a good reference.
- **Type missing on legacy wines**: some curated `Wines` rows may have `type: null`. Treat null/'other' the same way — alphabetical-only.
