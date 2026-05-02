# Vinkompassen — Wine Personality Lead Magnet

## Context

Vinakademin currently has a partial, never-finished feature at `/vinkompass` (~560 lines across `src/app/(frontend)/(site)/vinkompass/page.tsx` + `VinkompassClient.tsx`). We're scrapping it and starting fresh — only the name carries over.

The replacement is a beginner-friendly wine personality quiz, positioned as a top-of-funnel lead magnet. A user completes ~8 questions, lands in one of four archetypes on a 2×2 grid, and — after submitting an email — sees six hand-picked Systembolaget bottles for their archetype plus a soft pitch for a matching Vinprovning. Email capture flows through the existing `subscribeAndMirror` helper, hitting Beehiiv (with archetype tag) and the local `Subscribers` collection.

## Goal

1. Capture newsletter subscribers among wine-curious beginners with a high-completion-rate quiz
2. Tag each subscriber with their wine archetype so the Beehiiv welcome series can be segmented
3. Provide concrete, actionable bottle recommendations that make the email-give feel earned
4. Hand off mid-funnel readers to paid Vinprovningar via a soft pitch

## Design

### 1. User flow

| # | Step | Notes |
|---|---|---|
| 1 | Landing `/vinkompassen` | Hero, social proof, "Starta testet" CTA. Anonymous; no login required. |
| 2 | Quiz, 8 questions, one at a time | Image-driven where natural; progress bar; answers persist to `localStorage`. |
| 3 | Archetype reveal — **always free** | Archetype name, tagline, position-on-grid mini, personality description, share buttons. |
| 4 | Email gate (soft) | Below the fold: "Ange din e-post för att se dina 6 viner." Single field + submit. |
| 5 | Bottle list revealed | 6 wines (image, name, price, "Köp på Systembolaget" CTA), plus 1 Vinprovning pitch. |
| 6 | Email follow-up | Beehiiv welcome series segmented by archetype tag (authored in Beehiiv, out of code scope). |

The result page lives at `/vinkompassen/resultat/[attemptId]` where `attemptId` is the opaque token described in §3. It's shareable; gate state is per-attempt (server checks `email != null` on the Attempt record).

**Logged-in users** skip the gate (we already have their email). Their Attempt records `userId` and the email/subscriber side effects fire automatically using `req.user.email`.

### 2. Personality model

Two axes, four archetypes:

| Axis | Negative | Positive |
|---|---|---|
| Body | Lätt | Fyllig |
| Comfort zone | Klassisk | Äventyrlig |

Working archetype names (final copy in Beehiiv content review pass):

| Quadrant | Working name | Examples |
|---|---|---|
| Lätt + Klassisk | Den Friska Traditionalisten | Sauvignon Blanc, torr Riesling, klassisk Champagne |
| Lätt + Äventyrlig | Den Nyfikna Upptäckaren | Orange wine, pét-nat, Beaujolais |
| Fyllig + Klassisk | Den Trygga Kraftmänniskan | Bordeaux, Barolo, ekfat-Chardonnay |
| Fyllig + Äventyrlig | Den Vågade Äventyraren | Etna Rosso, Pinotage, naturlig Syrah |

### 3. Data model

Three new Payload collections; no changes to existing collections except `Subscribers.source` (add `vinkompassen` to the enum).

**`VinkompassQuestions`** — admin-editable quiz questions.
- `order` (number, indexed)
- `question` (text, sv)
- `helperText` (text, optional)
- `image` (upload, optional)
- `answers` (array, validated to have exactly 4 items via a beforeValidate hook):
  - `label` (text)
  - `image` (upload, optional)
  - `scoreBody` (number, range −2..+2)
  - `scoreComfort` (number, range −2..+2)
- `active` (checkbox, default `true`) — toggle without delete
- Access: read public, write admin/instructor

**`VinkompassArchetypes`** — the four quadrants.
- `key` (select, required, unique): `light-classic` | `light-adventurous` | `bold-classic` | `bold-adventurous`
- `name` (text)
- `tagline` (text)
- `description` (richText)
- `heroImage` (upload)
- `recommendedWines` (relationship → `wines`, hasMany, ordered) — target 6 entries
- `recommendedVinprovning` (relationship → `vinprovningar`, single, optional)
- `beehiivTag` (text) — e.g., `vk-light-classic`. Sent to Beehiiv at subscribe time.
- Access: read public, write admin

**`VinkompassAttempts`** — anonymous quiz submissions.
- `attemptId` (text, required, unique, indexed) — opaque random token (e.g. `nanoid(12)`) used in shareable URLs. Payload's default integer `id` stays as the internal primary key; `attemptId` is the public-facing identifier.
- `answers` (array): one entry per question — `{ questionId: relationship → vinkompassQuestions, answerIndex: number }`
- `scoreBody` (number)
- `scoreComfort` (number)
- `archetype` (relationship → `vinkompassArchetypes`, required)
- `email` (text, nullable) — set on gate submit
- `emailSubmittedAt` (date, nullable)
- `subscriberId` (relationship → `subscribers`, nullable) — set after `subscribeAndMirror`
- `userId` (relationship → `users`, nullable) — set if logged in at submit time
- `createdAt`, `userAgent`, `referer` — analytics
- Access: read admin only at the collection level. **Public access is exclusively through the API routes** (`/api/vinkompassen/...`), which do their own access checks (must know `attemptId`, can only set email/subscriber fields once, can only read fields appropriate to the gate state). Collection-level create/update/delete are admin-only.

### 4. Quiz mechanics

- **8 questions** authored in `VinkompassQuestions`. Sweet spot — meaningful but ~90s to complete.
- **4 answer options** per question.
- **Scoring**: each answer carries `scoreBody` ∈ [−2..+2] and `scoreComfort` ∈ [−2..+2]. After all 8 answered: `scoreBody = Σ`, `scoreComfort = Σ`. Range is −16..+16 per axis.
- **Quadrant rule**: `body = scoreBody > 0 ? 'bold' : 'light'`, `comfort = scoreComfort > 0 ? 'adventurous' : 'classic'`. Strict greater-than means ties (`score === 0`) go to lighter / classic — safer landing for beginners.
- **Persistence during quiz**: answers stored in `localStorage` under key `vinkompassen.draft`. On submit: server creates Attempt, returns the attempt id, client stores `vinkompassen.lastAttemptId` and navigates to `/vinkompassen/resultat/[id]`.
- **Question pool**: 8 fixed questions in v1; no randomization. Themes: weekend activity, food preference, music vibe, holiday destination, smell preference, summer drink, social style, "describe a perfect evening".
- **Image policy**: questions and answers may include images. Image-driven where natural (food, scenes, color); word-driven where image would feel forced.

### 5. Recommendation matching

Each archetype has an editor-curated `recommendedWines` ordered list. The result page renders that list verbatim (target 6, capped at 8). No sensory tagging, no live matching.

**Why**: `Wines` has no sensory fields; building tagging + matching is at least 2× the work and the editorial lift is unclear. Hand curation is cheap (4 lists × 6 wines = 24 wines to curate) and gives editorial control over what beginners see first. A future sensory-tag layer can sit behind this contract without breaking it.

### 6. Result page anatomy

URL: `/vinkompassen/resultat/[attemptId]`. Always-rendered top section + conditionally-rendered email gate or wine grid.

**Top (always visible):**
- Hero with archetype name in display heading + tagline
- Mini 2×2 grid showing user's quadrant lit
- Personality description (richText from archetype)
- Share affordances: copy link, X/Twitter, Facebook, Instagram-story image (auto-generated at `/api/vinkompassen/og/[attemptId]`)

**Below — pre-gate (`email == null`):**
- Email form panel: "Vill du se dina 6 viner från Systembolaget? Ange din e-post — vi skickar dem direkt." Single email input + submit. Privacy line. POST → `/api/vinkompassen/attempts/[id]/email`.

**Below — post-gate (`email != null`, or logged-in user):**
- Wine grid: 6 cards (image, name, winery, price SEK, grape tag, "Köp på Systembolaget" → `systembolagetUrl`)
- Soft Vinprovning card linking to `recommendedVinprovning`
- "Gör om testet" link → clears `localStorage` draft, navigates to `/vinkompassen`

### 7. Email capture wiring

On gate submit:

1. Validate email server-side
2. Load Attempt by id → must exist and have `email == null` (idempotency + prevents email overwrite)
3. Resolve `archetype.beehiivTag` from the related Archetype
4. Call existing `subscribeAndMirror({ payload, email, source: 'vinkompassen', tags: ['vinkompassen', archetype.beehiivTag] })`
5. Update Attempt: `email`, `emailSubmittedAt`, `subscriberId` (resolved by email after the upsert)
6. Return `{ ok: true }` → client refetches the result page

**Required tweak**: extend `Source` type and `Subscribers.source` select options with `'vinkompassen'`.

The Beehiiv welcome series itself is authored in Beehiiv, segmented by tag — not in scope for this spec other than passing the tags. No changes to `src/lib/beehiiv.ts`.

### 8. v1 cleanup

- New feature lives at **`/vinkompassen`** (proper Swedish definite form). Old route stays at `/vinkompass` only as a 301 redirect added to `src/middleware.ts`.
- Delete: `src/app/(frontend)/(site)/vinkompass/page.tsx`, `src/app/(frontend)/(site)/vinkompass/VinkompassClient.tsx`
- Update: `src/app/sitemap.ts` (replace `/vinkompass` with `/vinkompassen`), `src/components/ui/footer.tsx` (link copy + href)

### 9. Analytics (PostHog)

Events fire client-side; all carry `archetype` (string, e.g., `light-classic`) where applicable.

| Event | When | Properties |
|---|---|---|
| `vinkompass_started` | landing → quiz | — |
| `vinkompass_question_answered` | each answer | `questionIndex`, `answerIndex`, `scoreBody`, `scoreComfort` |
| `vinkompass_archetype_revealed` | result page first paint | `archetype` |
| `vinkompass_email_submitted` | gate submit success | `archetype` |
| `vinkompass_wine_clicked` | bottle CTA click | `archetype`, `wineSlug` |
| `vinkompass_vinprovning_clicked` | Vinprovning CTA click | `archetype`, `vinprovningSlug` |
| `vinkompass_shared` | share button click | `archetype`, `channel` |

### 10. Visual / design system

Use Vinakademin's existing design system (`src/app/(frontend)/(site)/styleguide/page.tsx`):
- Headings: `font-heading`, `tracking-[-0.015em]`, `leading-[1.05]`
- Brand orange `#FB914C` (gradient with `#FDBA75` for hero accents)
- Panels: `rounded-2xl border border-border bg-card p-7 shadow-sm`
- Eyebrow labels: `text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground`
- Buttons / inputs / dialogs: existing shadcn components in `src/components/ui/`

## Files Modified / Added

**Added:**
- `src/collections/VinkompassQuestions.ts`
- `src/collections/VinkompassArchetypes.ts`
- `src/collections/VinkompassAttempts.ts`
- `src/app/(frontend)/(site)/vinkompassen/page.tsx` (landing + quiz host)
- `src/app/(frontend)/(site)/vinkompassen/VinkompassenClient.tsx` (quiz state machine)
- `src/app/(frontend)/(site)/vinkompassen/resultat/[attemptId]/page.tsx` (result page)
- `src/app/(frontend)/(site)/vinkompassen/resultat/[attemptId]/EmailGate.tsx` (gate component)
- `src/app/api/vinkompassen/attempts/route.ts` (POST: create attempt from answers)
- `src/app/api/vinkompassen/attempts/[id]/email/route.ts` (POST: submit email + subscribe)
- `src/app/api/vinkompassen/og/[attemptId]/route.ts` (GET: shareable OG image)
- `src/lib/vinkompassen/scoring.ts` (pure scoring fn used by API + tests)
- `scripts/seed-vinkompassen.ts` (idempotent seed for archetypes + questions)

**Modified:**
- `src/payload.config.ts` — register the 3 new collections
- `src/collections/Subscribers.ts` — add `vinkompassen` to `source` enum
- `src/lib/subscribers.ts` — add `'vinkompassen'` to `Source` type
- `src/middleware.ts` — 301 redirect `/vinkompass` → `/vinkompassen`
- `src/app/sitemap.ts` — replace path
- `src/components/ui/footer.tsx` — replace path
- `package.json` — add `seed:vinkompassen` script

**Deleted:**
- `src/app/(frontend)/(site)/vinkompass/page.tsx`
- `src/app/(frontend)/(site)/vinkompass/VinkompassClient.tsx`

## What Is NOT Changing

- The `Wines` collection schema is unchanged — no sensory fields added.
- `src/lib/beehiiv.ts` and `src/lib/subscribers.ts` core logic — only the `Source` literal expands.
- The Beehiiv welcome series itself (authored in Beehiiv, not in code).
- The Vinprovning data model — only a relationship is read.
- Existing access control or middleware logic beyond the one redirect.

## Seed data

A one-shot seed script `scripts/seed-vinkompassen.ts` (added under `package.json` as `pnpm seed:vinkompassen`) creates the four `VinkompassArchetypes` docs with their `key`, `name`, `tagline`, working `description` placeholder, `beehiivTag`, and an empty `recommendedWines` list. Editors fill in `recommendedWines`, `recommendedVinprovning`, and the final `description` copy in the admin UI before launch. The script is idempotent — re-running upserts by `key` and never overwrites editor-curated fields.

The 8 quiz questions are also seeded via the same script with placeholder copy and `scoreBody`/`scoreComfort` values; final question copy and image uploads happen in admin.
