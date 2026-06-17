# Locked card + wine price/art.nr + session image fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the locked paywall card (copy + button hierarchy), show price + Systembolaget article number next to wines in buyer/host-facing surfaces, and fix library-wine images that fail to load because their media rows have no persisted CDN URL.

**Architecture:** UI edits for the card; a shared `resolveWinePurchase()` helper + a `WinePurchaseMeta` presentational component reused across the unlocked template view, plan detail, and live session; a data backfill (existing script) plus an importer hardening for the image bug.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind, shadcn UI, Payload CMS 3 (Postgres + S3/R2 media).

> **No schema/migration changes.** `generate:types` not needed.

> **Testing note:** This repo has **no automated test suite**. Verify code tasks with `npx tsc --noEmit` (repo has PRE-EXISTING tsc errors in unrelated files — only ensure touched files add no NEW errors) and `pnpm lint`. Do NOT run `pnpm dev` (`.env` points at the production DB). Manual browser QA and the media backfill happen against **staging**; the production backfill is an operational step to confirm with the user.

---

## File map

**Create:**
- `src/lib/wine-purchase-info.ts` — `resolveWinePurchase()` + `articleNumberFromSystembolagetUrl()`
- `src/components/tasting-shared/WinePurchaseMeta.tsx` — price + art.nr meta line component

**Modify:**
- `src/components/tasting-template/LockedTemplateDetailView.tsx` — card copy + button hierarchy (Item 1)
- `src/components/tasting-template/TemplateDetailView.tsx` — add purchase meta line (Item 2)
- `src/components/tasting-plan/PlanDetailView.tsx` — add purchase meta line (Item 2)
- `src/components/tasting-plan/PlanSessionContent.tsx` — WineRow + rowFromEntry + render (Item 2)
- `scripts/backfill-wine-images.ts` — persist CDN URL on imported media (Item 3 hardening)

**Operational (Item 3, no code):**
- `scripts/backfill-media-urls-to-cdn.ts` (existing) — run with `FORCE=1` to backfill the 9 null-URL media.

---

## Task 1: Locked paywall card — copy + button hierarchy

**Files:**
- Modify: `src/components/tasting-template/LockedTemplateDetailView.tsx:118-141` (inline card) and `:185-189` (aside login button)

- [ ] **Step 1: Fix the subtext copy + restructure the inline card actions**

Find the inline card body (lines 118-141):

```tsx
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  Köp denna mall, eller bli medlem och lås upp hela biblioteket
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Engångsköp för {formattedTemplatePrice} — eller medlemskap som ingår alla mallar.
                </p>
              </div>
            </div>
            <div className="flex-shrink-0 flex flex-col sm:flex-row gap-2">
              <Button asChild size="sm">
                <Link href={buyHref}>Köp för {formattedTemplatePrice}</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={memberHref}>Bli medlem</Link>
              </Button>
              {!isAuthenticated && (
                <Button asChild size="sm" variant="ghost">
                  <Link href={loginHref}>Logga in</Link>
                </Button>
              )}
            </div>
```

Replace with (fixed copy; two buttons grouped; login becomes a text link below):

```tsx
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  Köp denna mall, eller bli medlem och lås upp hela biblioteket
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Engångsköp för {formattedTemplatePrice} — eller lås upp alla mallar med ett medlemskap.
                </p>
              </div>
            </div>
            <div className="flex-shrink-0 flex flex-col gap-2 sm:items-end">
              <div className="flex flex-col sm:flex-row gap-2">
                <Button asChild size="sm">
                  <Link href={buyHref}>Köp för {formattedTemplatePrice}</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={memberHref}>Bli medlem</Link>
                </Button>
              </div>
              {!isAuthenticated && (
                <Link
                  href={loginHref}
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline text-center sm:text-right"
                >
                  Redan medlem? Logga in
                </Link>
              )}
            </div>
```

- [ ] **Step 2: Make the aside login a text link too (consistency)**

In the `<aside>`, find (lines 185-189):

```tsx
        {!isAuthenticated && (
          <Button asChild className="w-full" variant="ghost">
            <Link href={loginHref}>Logga in</Link>
          </Button>
        )}
```

Replace with:

```tsx
        {!isAuthenticated && (
          <Link
            href={loginHref}
            className="block text-center text-xs text-muted-foreground hover:text-foreground hover:underline pt-1"
          >
            Redan medlem? Logga in
          </Link>
        )}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no NEW errors in the file.

- [ ] **Step 4: Commit**

```bash
git add src/components/tasting-template/LockedTemplateDetailView.tsx
git commit -m "fix(provning): polish locked card copy + button hierarchy"
```

---

## Task 2: Shared `resolveWinePurchase` helper

**Files:**
- Create: `src/lib/wine-purchase-info.ts`

- [ ] **Step 1: Create the helper**

```ts
import type { Wine } from '@/payload-types'

export type WinePurchaseInfo = {
  priceSek: number | null
  articleNumber: string | null
  systembolagetUrl: string | null
}

/**
 * Trailing Systembolaget product number from a systembolaget.se product URL,
 * e.g. `…/loxarel-a-pel-rose-795901/` → "795901". Null when none is found.
 * Mirrors scripts/backfill-wine-images.ts `extractProductNumber`.
 */
export function articleNumberFromSystembolagetUrl(
  url: string | null | undefined,
): string | null {
  if (!url) return null
  const m = url.match(/-(\d+)\/?$/)
  return m ? m[1] : null
}

type LooseWineEntry = {
  libraryWine?: number | Wine | null
  customWine?: {
    priceSek?: number | null
    systembolagetProductNumber?: string | null
    systembolagetUrl?: string | null
  } | null
}

/**
 * Resolve price + Systembolaget article number + URL for a wine entry,
 * handling both library wines (price/systembolagetUrl on the joined Wine) and
 * custom-wine snapshots. Returns all-null when neither is resolvable (e.g. a
 * redacted blind-tasting wine where libraryWine/customWine were stripped).
 */
export function resolveWinePurchase(w: LooseWineEntry): WinePurchaseInfo {
  const lib =
    w.libraryWine && typeof w.libraryWine === 'object' ? (w.libraryWine as Wine) : null
  if (lib) {
    const sbUrl = lib.systembolagetUrl ?? null
    return {
      priceSek: typeof lib.price === 'number' ? lib.price : null,
      articleNumber: articleNumberFromSystembolagetUrl(sbUrl),
      systembolagetUrl: sbUrl,
    }
  }
  const c = w.customWine ?? null
  if (c) {
    const sbUrl = c.systembolagetUrl ?? null
    return {
      priceSek: typeof c.priceSek === 'number' ? c.priceSek : null,
      articleNumber:
        (c.systembolagetProductNumber?.trim() || null) ??
        articleNumberFromSystembolagetUrl(sbUrl),
      systembolagetUrl: sbUrl,
    }
  }
  return { priceSek: null, articleNumber: null, systembolagetUrl: null }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in the new file. (`Wine.price` and `Wine.systembolagetUrl` exist in `payload-types.ts`.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/wine-purchase-info.ts
git commit -m "feat(provning): resolveWinePurchase helper (price + Systembolaget art.nr)"
```

---

## Task 3: `WinePurchaseMeta` component

**Files:**
- Create: `src/components/tasting-shared/WinePurchaseMeta.tsx`

- [ ] **Step 1: Create the component**

```tsx
import * as React from 'react'

export interface WinePurchaseMetaProps {
  priceSek: number | null
  articleNumber: string | null
  systembolagetUrl: string | null
  className?: string
}

/**
 * Meta line under a wine name: "145 kr · Systembolaget 795901", where the
 * article number links to the wine's systembolaget.se page. Renders nothing
 * when there's neither a price nor an article number.
 */
export function WinePurchaseMeta({
  priceSek,
  articleNumber,
  systembolagetUrl,
  className,
}: WinePurchaseMetaProps) {
  if (priceSek == null && !articleNumber) return null
  return (
    <p className={`mt-1 text-xs text-muted-foreground ${className ?? ''}`}>
      {priceSek != null && (
        <span className="tabular-nums">{priceSek.toLocaleString('sv-SE')} kr</span>
      )}
      {priceSek != null && articleNumber && <span aria-hidden="true"> · </span>}
      {articleNumber &&
        (systembolagetUrl ? (
          <a
            href={systembolagetUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
          >
            Systembolaget {articleNumber}
          </a>
        ) : (
          <span>Systembolaget {articleNumber}</span>
        ))}
    </p>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/tasting-shared/WinePurchaseMeta.tsx
git commit -m "feat(provning): WinePurchaseMeta price + art.nr line"
```

---

## Task 4: Show purchase meta on the unlocked template view

**Files:**
- Modify: `src/components/tasting-template/TemplateDetailView.tsx` (imports + per-wine block ~147-151)

- [ ] **Step 1: Add imports**

Near the existing imports add:

```ts
import { resolveWinePurchase } from '@/lib/wine-purchase-info'
import { WinePurchaseMeta } from '@/components/tasting-shared/WinePurchaseMeta'
```

- [ ] **Step 2: Render the meta line under the wine**

The per-wine block currently ends:

```tsx
                      {w.guestDescription && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                          {w.guestDescription}
                        </p>
                      )}
                    </div>
```

Replace with (insert the meta line after the teaser):

```tsx
                      {w.guestDescription && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                          {w.guestDescription}
                        </p>
                      )}
                      <WinePurchaseMeta {...resolveWinePurchase(w)} />
                    </div>
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no NEW errors. (`w` is a `TastingTemplate` wine entry with `libraryWine`/`customWine` — matches the helper's loose shape.)

- [ ] **Step 4: Commit**

```bash
git add src/components/tasting-template/TemplateDetailView.tsx
git commit -m "feat(provning): show price + art.nr on unlocked template wines"
```

---

## Task 5: Show purchase meta on the plan detail view

**Files:**
- Modify: `src/components/tasting-plan/PlanDetailView.tsx` (imports + per-wine block ~163-171)

- [ ] **Step 1: Add imports**

```ts
import { resolveWinePurchase } from '@/lib/wine-purchase-info'
import { WinePurchaseMeta } from '@/components/tasting-shared/WinePurchaseMeta'
```

- [ ] **Step 2: Render the meta line**

The per-wine block currently ends with the `WineInfoReadout` div:

```tsx
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

Replace with (add the meta line right after the subtitle, before host notes — i.e., insert a `<WinePurchaseMeta>` immediately after the `{wineSubtitle(w) && (...)}` block). Concretely, find:

```tsx
                      {wineSubtitle(w) && (
                        <p className="text-xs text-muted-foreground truncate">{wineSubtitle(w)}</p>
                      )}
```

and replace with:

```tsx
                      {wineSubtitle(w) && (
                        <p className="text-xs text-muted-foreground truncate">{wineSubtitle(w)}</p>
                      )}
                      <WinePurchaseMeta {...resolveWinePurchase(w)} />
```

(Leave the hostNotes + WineInfoReadout blocks unchanged.)

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no NEW errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/tasting-plan/PlanDetailView.tsx
git commit -m "feat(provning): show price + art.nr on plan detail wines"
```

---

## Task 6: Show purchase meta in the live session

**Files:**
- Modify: `src/components/tasting-plan/PlanSessionContent.tsx` — WineRow type, rowFromEntry, displayRow strip, render

- [ ] **Step 1: Add imports**

```ts
import { resolveWinePurchase } from '@/lib/wine-purchase-info'
import { WinePurchaseMeta } from '@/components/tasting-shared/WinePurchaseMeta'
```

- [ ] **Step 2: Add fields to the `WineRow` type**

In the `WineRow` type, after the `foodPairing: string | null` line (added in a prior feature), add:

```ts
  foodPairing: string | null
  priceSek: number | null
  articleNumber: string | null
  systembolagetUrl: string | null
```

- [ ] **Step 3: Resolve once in `rowFromEntry` and include in both returns**

At the top of `rowFromEntry`, after the `foodPairing` const (added previously), add:

```ts
  const purchase = resolveWinePurchase(w)
```

Then in BOTH returned objects (library path and custom path), after the `foodPairing,` line, add:

```ts
      foodPairing,
      priceSek: purchase.priceSek,
      articleNumber: purchase.articleNumber,
      systembolagetUrl: purchase.systembolagetUrl,
```

(library path uses 6-space indent; custom path uses 4-space — match the surrounding lines.)

- [ ] **Step 4: Strip the new fields for hidden blind guests**

In the `displayRow` object (the `isHiddenForGuest` branch that nulls `abv`/`servingTemp`/etc.), add:

```ts
                    foodPairing: null as string | null,
                    priceSek: null as number | null,
                    articleNumber: null as string | null,
                    systembolagetUrl: null as string | null,
```

(insert after the existing `foodPairing: null as string | null,` line.)

- [ ] **Step 5: Render the meta line in the wine card**

In the wine card, find the subtitle render:

```tsx
                        {displayRow.subtitle && (
                          <p className="text-xs text-muted-foreground truncate">
                            {displayRow.subtitle}
                          </p>
                        )}
```

Add the meta line right after it:

```tsx
                        {displayRow.subtitle && (
                          <p className="text-xs text-muted-foreground truncate">
                            {displayRow.subtitle}
                          </p>
                        )}
                        <WinePurchaseMeta
                          priceSek={displayRow.priceSek}
                          articleNumber={displayRow.articleNumber}
                          systembolagetUrl={displayRow.systembolagetUrl}
                        />
```

- [ ] **Step 6: Typecheck + lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no NEW errors. (Both `rowFromEntry` returns now satisfy the extended `WineRow`; the `displayRow` spread carries the new fields, overridden to null when hidden.)

- [ ] **Step 7: Commit**

```bash
git add src/components/tasting-plan/PlanSessionContent.tsx
git commit -m "feat(provning): show price + art.nr per wine in the live session"
```

---

## Task 7: Harden the wine-image importer to persist CDN URLs

The importer creates media via a proper `payload.create` upload, but media created when `S3_PUBLIC_URL` wasn't applied ended up with NULL `url`/`sizes.*.url`. Ensure freshly-imported media always get the CDN URL persisted.

**Files:**
- Modify: `scripts/backfill-wine-images.ts:192-212`

- [ ] **Step 1: After creating the media, persist CDN URLs when missing**

The media is created and linked at lines 192-212:

```ts
      const media = await payload.create({
        collection: 'media',
        data: {
          alt: `${m.wine.name}${m.wine.vintage ? ` ${m.wine.vintage}` : ''}`,
        },
        file: {
          data: buffer,
          mimetype: 'image/png',
          name: `systembolaget-${m.productNumber}.png`,
          size: buffer.byteLength,
        },
        overrideAccess: true,
      })

      // Link on wines
      await payload.update({
        collection: 'wines',
        id: m.wine.id,
        data: { image: media.id },
        overrideAccess: true,
      })
```

Insert a CDN-URL backfill between the create and the wines update. Add this helper near the top of the file (after `extractProductNumber`):

```ts
const CDN_PUBLIC_URL = process.env.S3_PUBLIC_URL?.replace(/\/$/, '')
const CDN_BUCKET = process.env.S3_BUCKET
const CDN_PREFIX =
  process.env.S3_PREFIX || (process.env.NODE_ENV === 'development' ? 'dev' : 'production')

/** Mirror payload.config's generateFileURL: ${PUBLIC}/${BUCKET}/${PREFIX}/${filename}. */
function cdnUrlForFilename(filename: string | null | undefined): string | null {
  if (!CDN_PUBLIC_URL || !CDN_BUCKET || !filename) return null
  return `${CDN_PUBLIC_URL}/${CDN_BUCKET}/${CDN_PREFIX}/${filename}`
}
```

Then, right after the `const media = await payload.create({...})` block (before the wines `payload.update`), add:

```ts
      // Guard against the historic null-URL bug: if the storage plugin didn't
      // persist a CDN URL (e.g. S3_PUBLIC_URL wasn't applied at upload), set
      // `url` from the filename so the image resolves on the frontend (Payload
      // does NOT recompute media URLs on read). Components fall back through
      // `sizes.bottle.url ?? sizes.thumbnail.url ?? url`, so a populated `url`
      // is enough to display the bottle; the standalone backfill (Task 8) fills
      // the per-size URLs comprehensively. We set only `url` here to avoid a
      // partial `sizes` update clobbering size metadata.
      const cdnUrl = cdnUrlForFilename(media.filename)
      // cdnUrl is non-null only when CDN_PUBLIC_URL is set, so the assertion is safe.
      if (cdnUrl && (!media.url || !media.url.startsWith(CDN_PUBLIC_URL!))) {
        await payload.update({
          collection: 'media',
          id: media.id,
          data: { url: cdnUrl },
          overrideAccess: true,
        })
      }
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no NEW errors in the script.

- [ ] **Step 3: Commit**

```bash
git add scripts/backfill-wine-images.ts
git commit -m "fix(media): wine-image importer persists CDN url on created media"
```

---

## Task 8: Backfill the 9 null-URL media + verify (operational)

This is the actual fix for the user's broken Loxarel image. It mutates media rows; **the production run must be confirmed with the user.**

**Files:** none (runs the existing `scripts/backfill-media-urls-to-cdn.ts`).

- [ ] **Step 1: Confirm the broken rows (read-only)**

Confirm the count of null-URL media on staging and prod via the Neon MCP (read-only `SELECT count(*) FROM media WHERE url IS NULL`). Expected: a small number (≈9 on prod). Note the count.

- [ ] **Step 2: Backfill on STAGING and verify**

Run the backfill against staging (DATABASE_URI pointed at staging, `S3_PUBLIC_URL`/`S3_BUCKET` set, `FORCE=1` to rewrite null rows):

```
FORCE=1 DATABASE_URI="<STAGING_DATABASE_URI>" pnpm backfill-media-urls
```

Then open a staging session for a plan containing a library wine whose media was null (e.g. the "Tre nyanser av rosa" plan / Loxarel) and confirm the bottle image now loads. Also re-query: `SELECT count(*) FROM media WHERE url IS NULL` on staging → expect 0 (or only rows with no filename).

> Pulling staging vs prod DB URIs: see the `project_neon_databases` memory. NEVER run a mutating backfill with the default `.env` (which points at prod) unless you intend the prod run in Step 3.

- [ ] **Step 3: Backfill on PRODUCTION — CONFIRM WITH USER FIRST**

Ask the user to confirm before mutating production media rows. Once confirmed, run with the prod DB URI (the `.env` default) + `FORCE=1`:

```
FORCE=1 pnpm backfill-media-urls
```

Verify on the live site that the Loxarel image loads in a session, and re-query null-URL count → 0.

- [ ] **Step 4: Note the outcome**

Record the staging/prod null-URL counts before/after in the task notes (no silent truncation).

---

## Task 9: Build + QA checklist + finish

**Files:** none (verification).

- [ ] **Step 1: Whole-change typecheck + lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no NEW errors attributable to the touched files (pre-existing baseline unchanged).

- [ ] **Step 2: Staging QA checklist (for the human)**

- [ ] Locked paid template (as a non-purchaser): card reads "…eller lås upp alla mallar med ett medlemskap."; two buttons (Köp primary, Bli medlem outline) with "Redan medlem? Logga in" as a text link below; aside matches.
- [ ] Unlocked template / plan detail / session: each wine shows "{price} kr · Systembolaget {nr}" with the art.nr linking to systembolaget.se; wines with no price/number show no extra line.
- [ ] Blind session as a guest: price/art.nr do NOT appear before reveal; appear on reveal.
- [ ] Loxarel bottle image loads in a session (after Task 8 backfill).

- [ ] **Step 3: Finish the branch**

Use the superpowers:finishing-a-development-branch skill. Branch: `feat/locked-card-wine-price-image`.

---

## Notes

- Items 1 and 2 are pure code; Item 3 is mostly the operational backfill (Task 8) plus a small preventive importer change (Task 7).
- The richer per-wine info still renders where it belongs; this plan only adds the price/art.nr line and fixes media URLs.
