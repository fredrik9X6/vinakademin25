# Chunk D — Wrap-up Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send a personalized recap email 18h after a session ends to every participant who left ≥1 review, with three content blocks (personal recap, group comparison, grape-overlap recommendations) and copy variants for full vs partial coverage.

**Architecture:** Mirror Chunk 2's claim-email pattern: standalone cron script + HTTP twin sharing a core dispatcher in `src/lib/`. Two additive timestamp columns on `course-sessions` and `session-participants` track per-session and per-participant dispatch state. Email template is a sibling of `claim-your-tasting.ts`. Recommendation helper is a single function that queries `wines` filtered by grape overlap.

**Tech Stack:** Next.js 15 + Payload CMS 3.33 + Postgres + `@payloadcms/email-resend` + Railway Cron.

**Spec:** `docs/superpowers/specs/2026-05-13-chunk-d-wrap-up-email-design.md`

---

## File Structure

```
MOD src/collections/CourseSessions.ts                          Task 1
MOD src/collections/SessionParticipants.ts                     Task 1
NEW src/migrations/<ts>_chunk_d_wrap_up_email.ts               Task 1
NEW src/lib/wines/recommend-by-grape.ts                        Task 2
NEW src/lib/session-emails/wrap-up.ts                          Task 3
NEW src/lib/send-wrap-up-emails.ts                             Task 4
NEW src/app/api/cron/send-wrap-up-emails/route.ts              Task 5
NEW scripts/send-wrap-up-emails.ts                             Task 6
MOD package.json (scripts.send-wrap-up-emails)                 Task 6
END E2E + push to production                                   Task 7
```

---

## Task 1: Schema + migration

**Files:**
- Modify: `src/collections/CourseSessions.ts`
- Modify: `src/collections/SessionParticipants.ts`
- Create: `src/migrations/<ts>_chunk_d_wrap_up_email.ts` (auto-generated)

- [ ] **Step 1: Add `wrapUpEmailsDispatchedAt` to CourseSessions**

In `src/collections/CourseSessions.ts`, locate the existing `claimEmailsDispatchedAt` field (sidebar, admin-readonly). Add a sibling field right after it:

```ts
    {
      name: 'wrapUpEmailsDispatchedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description:
          'Stamped when the wrap-up email cron has processed this session. NULL means not yet dispatched.',
      },
    },
```

- [ ] **Step 2: Add `wrapUpEmailDispatchedAt` to SessionParticipants**

In `src/collections/SessionParticipants.ts`, locate the existing `claimEmailProcessedAt` field. Add a sibling:

```ts
    {
      name: 'wrapUpEmailDispatchedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description:
          'Stamped when this participant has been processed by the wrap-up cron (sent OR skipped).',
      },
    },
```

- [ ] **Step 3: Regenerate types**

```bash
pnpm generate:types 2>&1 | tail -3
```
Expected: "Types written to .../src/payload-types.ts".

- [ ] **Step 4: Generate migration**

```bash
pnpm payload migrate:create chunk-d-wrap-up-email 2>&1 | tail -5
```
Expected: "Migration created at .../src/migrations/<ts>_chunk_d_wrap_up_email.ts".

Inspect the generated file. It should contain two `ADD COLUMN` statements (one per collection) on the timestamp columns. Both nullable.

- [ ] **Step 5: TS sweep**

```bash
pnpm exec tsc --noEmit 2>&1 | grep -E "(CourseSessions|SessionParticipants|wrapUpEmail)" | head
```
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/collections/CourseSessions.ts \
  src/collections/SessionParticipants.ts \
  src/migrations/*chunk_d_wrap_up_email* \
  src/migrations/index.ts \
  src/payload-types.ts
git commit -m "$(cat <<'EOF'
otter: schema for wrap-up email tracking

Adds two nullable timestamp columns:
- course-sessions.wrapUpEmailsDispatchedAt — session-level marker
- session-participants.wrapUpEmailDispatchedAt — per-participant marker

Migration is additive; runs on Railway boot via prodMigrations.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Grape-overlap recommendation helper

**Files:**
- Create: `src/lib/wines/recommend-by-grape.ts`

A single function that returns up to 5 wines sharing ≥1 grape with the "anchor" wines, excluding wines the user has already reviewed and wines in the current session.

- [ ] **Step 1: Create the helper**

```ts
import type { Payload } from 'payload'
import type { Wine } from '@/payload-types'

export interface RecommendByGrapeInput {
  payload: Payload
  /** Wines the user rated highly in this session — recommend by their grape overlap. */
  anchorWines: Pick<Wine, 'id' | 'grapes'>[]
  /** Wine ids already reviewed by the user (any session) — excluded from results. */
  excludeWineIds: number[]
  /** Wine ids in the current session — excluded from results. */
  sessionWineIds: number[]
  /** Max results. Default 5. */
  limit?: number
}

/**
 * Find wines in the library that share at least one grape variety with any of
 * the anchor wines. Returns lean Wine docs; caller renders them.
 *
 * Used by the wrap-up email's "Vinakademins rekommendationer" block. The
 * caller is responsible for the ≥3-hits-or-omit gate.
 */
export async function recommendByGrape({
  payload,
  anchorWines,
  excludeWineIds,
  sessionWineIds,
  limit = 5,
}: RecommendByGrapeInput): Promise<Wine[]> {
  if (anchorWines.length === 0) return []

  // Collect all grape ids the anchor wines share
  const grapeIds = new Set<number>()
  for (const w of anchorWines) {
    for (const g of w.grapes ?? []) {
      const id = typeof g === 'object' ? g.id : g
      if (typeof id === 'number') grapeIds.add(id)
    }
  }
  if (grapeIds.size === 0) return []

  const excludeIds = new Set<number>([...excludeWineIds, ...sessionWineIds])

  const result = await payload.find({
    collection: 'wines',
    where: {
      and: [
        { grapes: { in: Array.from(grapeIds) } },
        ...(excludeIds.size > 0
          ? [{ id: { not_in: Array.from(excludeIds) } }]
          : []),
      ],
    },
    limit: limit * 3, // over-fetch to allow dedupe; dedupe below
    depth: 1,
    overrideAccess: true,
  })

  // Deduplicate by id (Payload + Postgres should already dedupe, but defensive)
  const seen = new Set<number>()
  const out: Wine[] = []
  for (const w of result.docs as Wine[]) {
    if (seen.has(w.id)) continue
    seen.add(w.id)
    out.push(w)
    if (out.length >= limit) break
  }
  return out
}
```

- [ ] **Step 2: TS sweep**

```bash
pnpm exec tsc --noEmit 2>&1 | grep "recommend-by-grape" | head
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/lib/wines/recommend-by-grape.ts
git commit -m "$(cat <<'EOF'
otter: recommendByGrape helper for wrap-up email recs

Given anchor wines (user's top-rated in a session) and exclusion sets
(already-reviewed + in-session wines), returns up to 5 library wines
that share at least one grape variety. Caller gates the omit-if-<3
rule.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Wrap-up email template

**Files:**
- Create: `src/lib/session-emails/wrap-up.ts`

Mirror `src/lib/session-emails/claim-your-tasting.ts`. The template builds HTML + plain-text variants from a structured input.

- [ ] **Step 1: Create the template**

```ts
import {
  emailBrandOrange,
  emailHeaderCellStyle,
  emailPrimaryCtaButton,
  escapeHtml,
} from '../email-cta'
import { getSiteURL } from '../site-url'

export interface WrapUpWine {
  /** Pour order in the session (1-based). */
  pourOrder: number
  /** Library wine slug — used to build /vinlistan/<slug> link. Null for custom wines. */
  slug: string | null
  /** Display title. */
  title: string
  /** Subtitle line: producer · vintage · region (library) or producer · vintage (custom). */
  subtitle: string
}

export interface WrapUpUserReview {
  pourOrder: number
  rating: number | null
  notesExcerpt: string | null
  buyAgain: 'yes' | 'maybe' | 'no' | null
}

export interface WrapUpGroupRow {
  pourOrder: number
  title: string
  avgRating: number
  reviewerCount: number
}

export interface WrapUpRecommendation {
  slug: string
  title: string
  subtitle: string
  thumbnailUrl: string | null
}

export interface WrapUpEmailInput {
  /** Recipient's nickname for personalized greeting. */
  nickname: string | null
  /** Session/plan/course display title for the subject + header. */
  title: string
  /** Occasion line if set on the plan; else null. */
  occasion: string | null
  /** Locale-formatted date the session happened. */
  dateText: string
  /** True when the recipient is unauthenticated (guest). Drives CTA copy. */
  isGuest: boolean
  /** Wines in pour order. */
  wines: WrapUpWine[]
  /** The recipient's reviews; subset of wines. */
  userReviews: WrapUpUserReview[]
  /** Group comparison rows; null when fewer than 2 participants reviewed. */
  groupComparison: { rows: WrapUpGroupRow[]; favoriteTitle: string | null } | null
  /** Recommendation picks; null when fewer than 3 hits. */
  recommendations: WrapUpRecommendation[] | null
  /** Primary CTA URL. /registrera?... for guests, /vinlistan for authed. */
  ctaUrl: string
  /** Primary CTA label. */
  ctaLabel: string
}

function renderStars(rating: number | null): string {
  if (rating == null) return '—'
  const full = Math.max(0, Math.min(5, Math.round(rating)))
  return '★'.repeat(full) + '☆'.repeat(5 - full)
}

function buyAgainChip(value: WrapUpUserReview['buyAgain']): string {
  if (value === 'yes') return 'Skulle köpa igen'
  if (value === 'maybe') return 'Kanske'
  if (value === 'no') return 'Nej'
  return ''
}

export function buildWrapUpEmail(input: WrapUpEmailInput): {
  subject: string
  html: string
  text: string
} {
  const siteUrl = getSiteURL()
  const firstName = input.nickname?.trim().split(/\s+/)[0] ?? null
  const greeting = firstName ? `Hej ${firstName}!` : 'Hej!'

  const subject = `Tack för att du var med — så gick din provning av "${input.title}"`

  const coverageNote =
    input.userReviews.length < input.wines.length
      ? `Du hann inte betygsätta alla viner — kolla in resten på Vinlistan.`
      : null

  // ---- Plain-text variant ----
  const textLines: string[] = []
  textLines.push(greeting, '')
  textLines.push(`Tack för att du var med på "${input.title}".`)
  if (input.occasion) textLines.push(`Tillfälle: ${input.occasion}`)
  textLines.push(`Datum: ${input.dateText}`, '')

  textLines.push('Dina betyg:')
  for (const r of input.userReviews) {
    const wine = input.wines.find((w) => w.pourOrder === r.pourOrder)
    if (!wine) continue
    const chip = buyAgainChip(r.buyAgain)
    textLines.push(
      `${r.pourOrder}. ${wine.title} — ${renderStars(r.rating)}${chip ? ` · ${chip}` : ''}`,
    )
    if (r.notesExcerpt) textLines.push(`   "${r.notesExcerpt}"`)
  }
  if (coverageNote) textLines.push('', coverageNote)

  if (input.groupComparison) {
    textLines.push('', 'Så tyckte gruppen:')
    for (const g of input.groupComparison.rows) {
      textLines.push(
        `${g.pourOrder}. ${g.title} — snitt ${g.avgRating.toFixed(1)} (${g.reviewerCount} recensioner)`,
      )
    }
    if (input.groupComparison.favoriteTitle) {
      textLines.push('', `Veckans favorit: ${input.groupComparison.favoriteTitle}`)
    }
  }

  if (input.recommendations) {
    textLines.push('', 'Vinakademins rekommendationer:')
    for (const rec of input.recommendations) {
      textLines.push(`- ${rec.title} — ${rec.subtitle}`)
    }
  }

  textLines.push('', `${input.ctaLabel}: ${input.ctaUrl}`, '', 'Skål!', 'Vinakademin-teamet')
  const text = textLines.join('\n')

  // ---- HTML variant ----
  const userReviewsHtml = input.userReviews
    .map((r) => {
      const wine = input.wines.find((w) => w.pourOrder === r.pourOrder)
      if (!wine) return ''
      const linked = wine.slug
        ? `<a href="${siteUrl}/vinlistan/${escapeHtml(wine.slug)}" style="color: ${emailBrandOrange}; text-decoration: none;">${escapeHtml(wine.title)}</a>`
        : escapeHtml(wine.title)
      const chip = buyAgainChip(r.buyAgain)
      const chipHtml = chip
        ? `<span style="display: inline-block; margin-left: 8px; padding: 2px 8px; border-radius: 999px; background: rgba(253,186,117,0.18); color: ${emailBrandOrange}; font-size: 11px; font-weight: 600;">${escapeHtml(chip)}</span>`
        : ''
      const notesHtml = r.notesExcerpt
        ? `<p style="margin: 4px 0 0; color: #4a4540; font-size: 14px; line-height: 1.5; font-style: italic;">"${escapeHtml(r.notesExcerpt)}"</p>`
        : ''
      return `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
            <div style="display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;">
              <strong style="color: #8a8580; font-size: 13px; min-width: 18px;">#${r.pourOrder}</strong>
              <span style="color: #1a1714; font-size: 15px; font-weight: 600;">${linked}</span>
              <span style="color: ${emailBrandOrange}; font-size: 14px; letter-spacing: 1px;">${renderStars(r.rating)}</span>
              ${chipHtml}
            </div>
            ${notesHtml}
          </td>
        </tr>`
    })
    .join('')

  const coverageHtml = coverageNote
    ? `<tr><td style="padding: 12px 0 0;"><p style="margin: 0; color: #8a8580; font-size: 13px; line-height: 1.5; font-style: italic;">${escapeHtml(coverageNote)}</p></td></tr>`
    : ''

  const groupHtml = input.groupComparison
    ? `
      <tr>
        <td style="padding: 24px 0 8px;">
          <h3 style="margin: 0 0 12px; color: #1a1714; font-size: 18px; font-weight: 600;">Så tyckte gruppen</h3>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            ${input.groupComparison.rows
              .map(
                (g) => `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                  <div style="display: flex; align-items: baseline; gap: 8px;">
                    <strong style="color: #8a8580; font-size: 13px; min-width: 18px;">#${g.pourOrder}</strong>
                    <span style="color: #1a1714; font-size: 15px;">${escapeHtml(g.title)}</span>
                    <span style="margin-left: auto; color: ${emailBrandOrange}; font-size: 14px; font-weight: 600;">${g.avgRating.toFixed(1)} ★</span>
                    <span style="color: #8a8580; font-size: 12px;">(${g.reviewerCount})</span>
                  </div>
                </td>
              </tr>`,
              )
              .join('')}
          </table>
          ${
            input.groupComparison.favoriteTitle
              ? `<p style="margin: 12px 0 0; color: #1a1714; font-size: 14px;"><strong>Veckans favorit:</strong> ${escapeHtml(input.groupComparison.favoriteTitle)}</p>`
              : ''
          }
        </td>
      </tr>`
    : ''

  const recsHtml = input.recommendations
    ? `
      <tr>
        <td style="padding: 24px 0 8px;">
          <h3 style="margin: 0 0 12px; color: #1a1714; font-size: 18px; font-weight: 600;">Vinakademins rekommendationer</h3>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            ${input.recommendations
              .map(
                (rec) => `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                  <a href="${siteUrl}/vinlistan/${escapeHtml(rec.slug)}" style="color: #1a1714; text-decoration: none; display: block;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                      ${
                        rec.thumbnailUrl
                          ? `<img src="${escapeHtml(rec.thumbnailUrl)}" alt="" width="40" height="40" style="border-radius: 4px; object-fit: cover; flex-shrink: 0;" />`
                          : `<div style="width: 40px; height: 40px; border-radius: 4px; background: #eee; flex-shrink: 0;"></div>`
                      }
                      <div style="flex: 1; min-width: 0;">
                        <p style="margin: 0; color: #1a1714; font-size: 14px; font-weight: 600;">${escapeHtml(rec.title)}</p>
                        <p style="margin: 2px 0 0; color: #8a8580; font-size: 12px;">${escapeHtml(rec.subtitle)}</p>
                      </div>
                      <span style="color: ${emailBrandOrange}; font-size: 13px; font-weight: 600;">Utforska →</span>
                    </div>
                  </a>
                </td>
              </tr>`,
              )
              .join('')}
          </table>
        </td>
      </tr>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">

          <tr>
            <td align="center" bgcolor="${emailBrandOrange}" style="${emailHeaderCellStyle()}">
              <div style="font-size: 12px; color: #ffffff; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.18em; font-weight: 600;">
                Provningens facit
              </div>
              <h1 style="margin: 8px 0 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px; line-height: 1.15;">
                Vinakademin
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 32px 32px 0;">
              <h2 style="margin: 0 0 12px; color: #1a1714; font-size: 22px; font-weight: 600; letter-spacing: -0.3px; line-height: 1.25;">
                ${escapeHtml(greeting)}
              </h2>
              <p style="margin: 0 0 8px; color: #1a1714; font-size: 16px; line-height: 1.55;">
                Tack för att du var med på <strong>${escapeHtml(input.title)}</strong>.
              </p>
              <p style="margin: 0; color: #8a8580; font-size: 13px; line-height: 1.55;">
                ${input.occasion ? escapeHtml(input.occasion) + ' · ' : ''}${escapeHtml(input.dateText)}
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 32px 0;">
              <h3 style="margin: 0 0 8px; color: #1a1714; font-size: 18px; font-weight: 600;">Dina viner och dina betyg</h3>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                ${userReviewsHtml}
                ${coverageHtml}
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px;">
              ${groupHtml}
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px;">
              ${recsHtml}
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 32px;">
              ${emailPrimaryCtaButton(input.ctaUrl, input.ctaLabel)}
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 16px 32px 32px; border-top: 1px solid #eee;">
              <p style="margin: 0; color: #8a8580; font-size: 12px; line-height: 1.5;">
                <a href="${siteUrl}" style="color: ${emailBrandOrange}; text-decoration: none;">vinakademin.se</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return { subject, html, text }
}
```

- [ ] **Step 2: TS sweep**

```bash
pnpm exec tsc --noEmit 2>&1 | grep "session-emails/wrap-up" | head
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/lib/session-emails/wrap-up.ts
git commit -m "$(cat <<'EOF'
otter: wrap-up email template

HTML + text builder for the post-tasting recap. Mirrors the structure
of claim-your-tasting.ts: branded header, content sections, sticky CTA.
Three content blocks: personal reviews + coverage note, group
comparison (optional), recommendations (optional). All Swedish copy.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Core dispatcher `send-wrap-up-emails.ts`

**Files:**
- Create: `src/lib/send-wrap-up-emails.ts`

Mirror `src/lib/send-claim-emails.ts`. Selects due sessions, walks participants, sends per recipient, stamps state.

- [ ] **Step 1: Create the file**

```ts
import { getPayload } from 'payload'
import config from '@/payload.config'
import { loggerFor } from './logger'
import { getSiteURL } from './site-url'
import {
  buildWrapUpEmail,
  type WrapUpEmailInput,
  type WrapUpRecommendation,
} from './session-emails/wrap-up'
import { recommendByGrape } from './wines/recommend-by-grape'
import type { Wine, Review, TastingPlan, Vinprovningar, CourseSession } from '@/payload-types'

const log = loggerFor('lib-send-wrap-up-emails')

/** 18 hours in ms — the post-session delay before recap fires. */
const POST_COMPLETE_DELAY_MS = 18 * 60 * 60 * 1000

/** Cap per cron run — protects against runaway loops. */
const MAX_SESSIONS_PER_RUN = 50

interface SendResult {
  sessionsProcessed: number
  emailsSent: number
  emailsSkipped: number
  emailsFailed: number
}

/**
 * Core logic for the post-tasting wrap-up email.
 *
 * Finds course-sessions either completed-and-aged or expired-and-aged
 * past 18 hours that have not yet been processed (wrapUpEmailsDispatchedAt
 * is null). For each, walks all participants. A participant gets an email
 * only if they have at least one review in this session; otherwise they're
 * stamped as skipped.
 *
 * Called by both:
 * - scripts/send-wrap-up-emails.ts (Railway Cron, preferred)
 * - /api/cron/send-wrap-up-emails (HTTP twin for manual trigger)
 */
export async function sendPendingWrapUpEmails(): Promise<SendResult> {
  const payload = await getPayload({ config })
  const siteUrl = getSiteURL()
  const cutoff = new Date(Date.now() - POST_COMPLETE_DELAY_MS).toISOString()

  // 1. Find due sessions
  const dueSessions = await payload.find({
    collection: 'course-sessions',
    where: {
      and: [
        { wrapUpEmailsDispatchedAt: { exists: false } },
        {
          or: [
            {
              and: [
                { status: { equals: 'completed' } },
                { completedAt: { less_than: cutoff } },
              ],
            },
            {
              and: [
                { status: { not_equals: 'completed' } },
                { expiresAt: { less_than: cutoff } },
              ],
            },
          ],
        },
      ],
    },
    depth: 2, // populate course + tastingPlan (with wines)
    limit: MAX_SESSIONS_PER_RUN,
    overrideAccess: true,
  })

  let emailsSent = 0
  let emailsSkipped = 0
  let emailsFailed = 0

  for (const session of dueSessions.docs as CourseSession[]) {
    const sessionContext = await resolveSessionContext(payload, session)
    if (!sessionContext) {
      log.warn({ sessionId: session.id }, 'wrap_up_session_context_unavailable')
      await stampSession(payload, session.id)
      continue
    }

    const participants = await payload.find({
      collection: 'session-participants',
      where: { session: { equals: session.id } },
      limit: 1000,
      depth: 1,
      overrideAccess: true,
    })

    for (const p of participants.docs as any[]) {
      if (p.wrapUpEmailDispatchedAt) continue

      const email = typeof p.email === 'string' ? p.email.trim().toLowerCase() : null
      if (!email) {
        await stampParticipant(payload, p.id)
        emailsSkipped++
        continue
      }

      // Find this participant's reviews for the session
      const reviewRes = await payload.find({
        collection: 'reviews',
        where: { sessionParticipant: { equals: p.id } },
        limit: 100,
        depth: 2, // populate review.wine + wine.grapes
        overrideAccess: true,
      })
      const userReviews = reviewRes.docs as Review[]

      if (userReviews.length === 0) {
        await stampParticipant(payload, p.id)
        emailsSkipped++
        continue
      }

      try {
        const emailInput = await buildEmailInput({
          payload,
          siteUrl,
          session,
          sessionContext,
          participant: p,
          userReviews,
        })
        const { subject, html, text } = buildWrapUpEmail(emailInput)
        await payload.sendEmail({ to: email, subject, html, text })
        await stampParticipant(payload, p.id)
        emailsSent++
        log.info(
          { participantId: p.id, sessionId: session.id, email },
          'wrap_up_email_sent',
        )
      } catch (err) {
        log.error(
          { err, participantId: p.id, sessionId: session.id, email },
          'wrap_up_email_send_failed',
        )
        emailsFailed++
        // do NOT stamp — retry next tick
      }

      await sleep(100) // gentle on Resend rate limit
    }

    await stampSession(payload, session.id)
  }

  return {
    sessionsProcessed: dueSessions.docs.length,
    emailsSent,
    emailsSkipped,
    emailsFailed,
  }
}

// ───────────────────────────── helpers ───────────────────────────── //

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function stampSession(payload: any, sessionId: number | string) {
  try {
    await payload.update({
      collection: 'course-sessions',
      id: sessionId,
      data: { wrapUpEmailsDispatchedAt: new Date().toISOString() },
      overrideAccess: true,
      depth: 0,
    })
  } catch (err) {
    log.error({ err, sessionId }, 'wrap_up_session_stamp_failed')
  }
}

async function stampParticipant(payload: any, participantId: number | string) {
  try {
    await payload.update({
      collection: 'session-participants',
      id: participantId,
      data: { wrapUpEmailDispatchedAt: new Date().toISOString() },
      overrideAccess: true,
      depth: 0,
    })
  } catch (err) {
    log.error({ err, participantId }, 'wrap_up_participant_stamp_failed')
  }
}

interface SessionContext {
  title: string
  occasion: string | null
  /** Wines in pour order, with display fields. */
  wines: Array<{
    pourOrder: number
    wineId: number | null
    title: string
    subtitle: string
    slug: string | null
    grapes: number[]
  }>
}

/** Resolve a session's display title, occasion, and wine list (handles both course and plan modes). */
async function resolveSessionContext(
  payload: any,
  session: CourseSession,
): Promise<SessionContext | null> {
  if (session.course && typeof session.course === 'object') {
    const course = session.course as Vinprovningar
    // For courses, the "wines" are the lesson's assigned wine (wineReview lessons).
    // Walk modules → contentItems with lessonType === 'wineReview' and assignedWine.
    const contentItemRefs: Array<{ pourOrder: number; wine: Wine }> = []
    let pourOrder = 0
    const modules = (course as any).modules as Array<any> | undefined
    if (modules) {
      for (const mod of modules) {
        const items = (mod as any).contents as Array<any> | undefined
        if (!items) continue
        for (const item of items) {
          const ci = typeof item === 'object' ? item : null
          if (!ci) continue
          const assigned = (ci as any).assignedWine
          if (!assigned || typeof assigned !== 'object') continue
          pourOrder += 1
          contentItemRefs.push({ pourOrder, wine: assigned as Wine })
        }
      }
    }
    return {
      title: course.title ?? 'din vinprovning',
      occasion: null,
      wines: contentItemRefs.map((r) => ({
        pourOrder: r.pourOrder,
        wineId: r.wine.id,
        title: r.wine.name || `Vin #${r.wine.id}`,
        subtitle: buildSubtitle(r.wine),
        slug: r.wine.slug ?? null,
        grapes: extractGrapeIds(r.wine),
      })),
    }
  }
  if (session.tastingPlan && typeof session.tastingPlan === 'object') {
    const plan = session.tastingPlan as TastingPlan
    const planWines = plan.wines ?? []
    return {
      title: plan.title ?? 'din vinprovning',
      occasion: plan.occasion ?? null,
      wines: planWines.map((pw, idx) => {
        const pourOrder = pw.pourOrder ?? idx + 1
        if (pw.libraryWine && typeof pw.libraryWine === 'object') {
          const w = pw.libraryWine as Wine
          return {
            pourOrder,
            wineId: w.id,
            title: w.name || `Vin #${w.id}`,
            subtitle: buildSubtitle(w),
            slug: w.slug ?? null,
            grapes: extractGrapeIds(w),
          }
        }
        const c = pw.customWine
        return {
          pourOrder,
          wineId: null,
          title: c?.name || 'Namnlöst vin',
          subtitle: [c?.producer, c?.vintage].filter(Boolean).join(' · '),
          slug: null,
          grapes: [],
        }
      }),
    }
  }
  return null
}

function buildSubtitle(w: Wine): string {
  const region =
    typeof w.region === 'object' && w.region ? (w.region as any).name ?? null : null
  return [w.winery, w.vintage ? String(w.vintage) : null, region].filter(Boolean).join(' · ')
}

function extractGrapeIds(w: Wine): number[] {
  const out: number[] = []
  for (const g of w.grapes ?? []) {
    const id = typeof g === 'object' ? g.id : g
    if (typeof id === 'number') out.push(id)
  }
  return out
}

interface BuildInput {
  payload: any
  siteUrl: string
  session: CourseSession
  sessionContext: SessionContext
  participant: any
  userReviews: Review[]
}

async function buildEmailInput({
  payload,
  siteUrl,
  session,
  sessionContext,
  participant,
  userReviews,
}: BuildInput): Promise<WrapUpEmailInput> {
  const dateText = (() => {
    const iso = session.completedAt || session.expiresAt || session.createdAt
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('sv-SE')
  })()

  const isGuest = !participant.user

  // Map each user review to its session pour-order (by wine id; custom-wine reviews fall back to title-match)
  const wineIdToPour: Record<number, number> = {}
  const titleToPour: Record<string, number> = {}
  for (const w of sessionContext.wines) {
    if (w.wineId != null) wineIdToPour[w.wineId] = w.pourOrder
    titleToPour[w.title.toLowerCase()] = w.pourOrder
  }

  const userReviewsRendered = userReviews
    .map((r) => {
      const wineRef = (r as any).wine
      let pour: number | undefined
      if (wineRef) {
        const id = typeof wineRef === 'object' ? wineRef.id : wineRef
        if (typeof id === 'number') pour = wineIdToPour[id]
      } else if ((r as any).customWine?.name) {
        pour = titleToPour[String((r as any).customWine.name).toLowerCase()]
      }
      if (pour == null) return null
      const notes = (r as any).reviewText
      const excerpt =
        typeof notes === 'string'
          ? notes.length > 140
            ? notes.slice(0, 137) + '…'
            : notes
          : null
      const buyAgain = (r as any).buyAgain as 'yes' | 'maybe' | 'no' | null | undefined
      return {
        pourOrder: pour,
        rating: typeof (r as any).rating === 'number' ? (r as any).rating : null,
        notesExcerpt: excerpt,
        buyAgain: buyAgain ?? null,
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => a.pourOrder - b.pourOrder)

  // Group comparison: gather all reviews across all participants for this session's wines
  const groupComparison = await buildGroupComparison(payload, session.id, sessionContext)

  // Recommendations: from the user's ≥4-star library wines
  const anchorWineIds = new Set<number>()
  for (const r of userReviews) {
    const rating = (r as any).rating
    if (typeof rating !== 'number' || rating < 4) continue
    const wineRef = (r as any).wine
    if (!wineRef) continue
    const id = typeof wineRef === 'object' ? wineRef.id : wineRef
    if (typeof id === 'number') anchorWineIds.add(id)
  }
  const anchorWines = sessionContext.wines
    .filter((w) => w.wineId != null && anchorWineIds.has(w.wineId))
    .map((w) => ({ id: w.wineId as number, grapes: w.grapes }))

  // All wine ids the user has reviewed anywhere — for exclusion
  const userId = participant.user
    ? typeof participant.user === 'object'
      ? participant.user.id
      : participant.user
    : null
  let userReviewedIds: number[] = []
  if (userId) {
    const userReviewsAll = await payload.find({
      collection: 'reviews',
      where: { user: { equals: userId } },
      limit: 1000,
      depth: 0,
      overrideAccess: true,
    })
    userReviewedIds = (userReviewsAll.docs as any[])
      .map((r) => (typeof r.wine === 'number' ? r.wine : r.wine?.id))
      .filter((id): id is number => typeof id === 'number')
  }

  const sessionWineIds = sessionContext.wines
    .map((w) => w.wineId)
    .filter((id): id is number => typeof id === 'number')

  const recs = await recommendByGrape({
    payload,
    anchorWines: anchorWines.map((w) => ({ id: w.id, grapes: w.grapes })) as any,
    excludeWineIds: userReviewedIds,
    sessionWineIds,
    limit: 5,
  })

  const recommendations: WrapUpRecommendation[] | null =
    recs.length >= 3
      ? recs.map((w) => ({
          slug: w.slug ?? '',
          title: w.name || `Vin #${w.id}`,
          subtitle: buildSubtitle(w),
          thumbnailUrl:
            typeof w.image === 'object' && w.image
              ? w.image.sizes?.thumbnail?.url ?? w.image.url ?? null
              : null,
        }))
      : null

  const ctaUrl = isGuest
    ? `${siteUrl}/registrera?claim=session&redirect=${encodeURIComponent('/mina-sidor')}`
    : `${siteUrl}/vinlistan`
  const ctaLabel = isGuest ? 'Spara dina betyg →' : 'Utforska Vinlistan →'

  return {
    nickname: participant.nickname ?? null,
    title: sessionContext.title,
    occasion: sessionContext.occasion,
    dateText,
    isGuest,
    wines: sessionContext.wines.map((w) => ({
      pourOrder: w.pourOrder,
      slug: w.slug,
      title: w.title,
      subtitle: w.subtitle,
    })),
    userReviews: userReviewsRendered,
    groupComparison,
    recommendations,
    ctaUrl,
    ctaLabel,
  }
}

async function buildGroupComparison(
  payload: any,
  sessionId: number | string,
  sessionContext: SessionContext,
): Promise<WrapUpEmailInput['groupComparison']> {
  // Get all reviews from this session
  const allReviews = await payload.find({
    collection: 'reviews',
    where: { session: { equals: sessionId } },
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  })

  type Acc = { ratings: number[]; title: string; pourOrder: number }
  const byPour: Record<number, Acc> = {}
  for (const w of sessionContext.wines) {
    byPour[w.pourOrder] = { ratings: [], title: w.title, pourOrder: w.pourOrder }
  }

  const wineIdToPour: Record<number, number> = {}
  const titleToPour: Record<string, number> = {}
  for (const w of sessionContext.wines) {
    if (w.wineId != null) wineIdToPour[w.wineId] = w.pourOrder
    titleToPour[w.title.toLowerCase()] = w.pourOrder
  }

  for (const r of allReviews.docs as any[]) {
    let pour: number | undefined
    if (r.wine) {
      const id = typeof r.wine === 'object' ? r.wine.id : r.wine
      if (typeof id === 'number') pour = wineIdToPour[id]
    } else if (r.customWine?.name) {
      pour = titleToPour[String(r.customWine.name).toLowerCase()]
    }
    if (pour == null) continue
    if (typeof r.rating === 'number') byPour[pour].ratings.push(r.rating)
  }

  const rows = Object.values(byPour)
    .filter((a) => a.ratings.length >= 1)
    .map((a) => ({
      pourOrder: a.pourOrder,
      title: a.title,
      avgRating: a.ratings.reduce((s, r) => s + r, 0) / a.ratings.length,
      reviewerCount: a.ratings.length,
    }))
    .sort((a, b) => a.pourOrder - b.pourOrder)

  // Only show the block if ≥2 distinct reviewers contributed at least one rating
  const totalReviewers = new Set<number | string>()
  for (const r of allReviews.docs as any[]) {
    const pid = r.sessionParticipant
    if (pid) totalReviewers.add(typeof pid === 'object' ? pid.id : pid)
  }
  if (totalReviewers.size < 2) return null

  const favorite = rows.reduce<typeof rows[number] | null>(
    (best, row) => (best == null || row.avgRating > best.avgRating ? row : best),
    null,
  )

  return { rows, favoriteTitle: favorite?.title ?? null }
}
```

- [ ] **Step 2: TS sweep**

```bash
pnpm exec tsc --noEmit 2>&1 | grep "send-wrap-up-emails" | head -30
```
Expected: no NEW errors (some `any` casts are intentional for cross-collection lookups; if Payload's generated types yell about specific shape mismatches, narrow the cast minimally).

- [ ] **Step 3: Commit**

```bash
git add src/lib/send-wrap-up-emails.ts
git commit -m "$(cat <<'EOF'
otter: send-wrap-up-emails core dispatcher

Mirrors src/lib/send-claim-emails.ts. Finds sessions completed or
expired ≥18h ago that haven't dispatched, walks participants,
sends per recipient (gated on ≥1 review), stamps state. Builds
the email input from the session's wines (course or plan) and the
recipient's reviews; computes group comparison and grape-overlap
recommendations.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: HTTP twin route

**Files:**
- Create: `src/app/api/cron/send-wrap-up-emails/route.ts`

- [ ] **Step 1: Create the route**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { sendPendingWrapUpEmails } from '@/lib/send-wrap-up-emails'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('api-cron-send-wrap-up-emails')

/**
 * HTTP twin of the wrap-up email cron job.
 * Useful for manual triggers and external cron services.
 * The standalone script (scripts/send-wrap-up-emails.ts) is preferred for
 * Railway Cron — same logic, no HTTP overhead.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await sendPendingWrapUpEmails()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    log.error('Error in send-wrap-up-emails cron:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return POST(req)
}
```

- [ ] **Step 2: TS sweep + commit**

```bash
pnpm exec tsc --noEmit 2>&1 | grep "cron/send-wrap-up-emails" | head
git add "src/app/api/cron/send-wrap-up-emails/route.ts"
git commit -m "$(cat <<'EOF'
otter: HTTP twin /api/cron/send-wrap-up-emails

CRON_SECRET-gated POST/GET that calls sendPendingWrapUpEmails().
Mirrors the claim-email HTTP twin.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Cron script + package.json entry

**Files:**
- Create: `scripts/send-wrap-up-emails.ts`
- Modify: `package.json`

- [ ] **Step 1: Create the script**

```ts
/**
 * Standalone cron script for sending session wrap-up emails.
 *
 * Meant to be run as a Railway Cron service:
 *   Start command: pnpm send-wrap-up-emails
 *   Cron schedule: *\/10 * * * *  (every 10 minutes)
 *
 * Uses Payload's local API directly via the shared lib — no HTTP server needed.
 */
import { sendPendingWrapUpEmails } from '../src/lib/send-wrap-up-emails'
import { loggerFor } from '../src/lib/logger'

const log = loggerFor('scripts-send-wrap-up-emails')

async function main() {
  log.info(`[${new Date().toISOString()}] Starting wrap-up email cron job...`)

  try {
    const result = await sendPendingWrapUpEmails()
    log.info(`[${new Date().toISOString()}] Wrap-up cron completed:`)
    log.info(`  Sessions processed: ${result.sessionsProcessed}`)
    log.info(`  Emails sent:        ${result.emailsSent}`)
    log.info(`  Emails skipped:     ${result.emailsSkipped}`)
    log.info(`  Emails failed:      ${result.emailsFailed}`)
  } catch (error) {
    log.error(`[${new Date().toISOString()}] Wrap-up cron failed:`, error)
    process.exit(1)
  }

  process.exit(0)
}

main()
```

- [ ] **Step 2: Add the npm script to package.json**

Read `package.json`. Find the `"scripts"` section, locate the existing `"send-claim-emails"` line. Add a sibling entry directly below it:

```json
    "send-wrap-up-emails": "tsx scripts/send-wrap-up-emails.ts",
```

Match the exact runner (`tsx`, `ts-node`, whatever the claim-email entry uses).

- [ ] **Step 3: TS sweep + commit**

```bash
pnpm exec tsc --noEmit 2>&1 | grep "scripts/send-wrap-up-emails" | head
git add scripts/send-wrap-up-emails.ts package.json
git commit -m "$(cat <<'EOF'
otter: scripts/send-wrap-up-emails Railway cron entry

Mirrors scripts/send-claim-emails. Invokes the shared lib, logs result,
exits with status. package.json gains the matching pnpm script.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: E2E + push to production

- [ ] **Step 1: Lint + TS sweep**

```bash
pnpm lint 2>&1 | tail -20
pnpm exec tsc --noEmit 2>&1 | grep -E "(send-wrap-up|wrap-up\.ts|recommend-by-grape|cron/send-wrap-up|CourseSessions|SessionParticipants)" | head -30
```
Expected: lint clean for the new files; no NEW TS errors in touched files.

- [ ] **Step 2: Migration applies locally**

```bash
# Use the env that points at your dev/staging DB
pnpm payload migrate 2>&1 | tail -10
```
Expected: "All migrations completed successfully" OR "No migrations to run" (if Railway already ran them).

Verify the columns exist:

```bash
# Adjust connection string as needed
psql "$DATABASE_URI" -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'course_sessions' AND column_name LIKE 'wrap_%';" 2>&1
psql "$DATABASE_URI" -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'session_participants' AND column_name LIKE 'wrap_%';" 2>&1
```
Expected: each query returns one row.

- [ ] **Step 3: Build smoke**

```bash
pnpm build 2>&1 | tail -40
```
Expected: "Compiled successfully".

- [ ] **Step 4: Cron smoke test**

In the Payload admin, find a recently-completed session whose `completedAt` is older than 18 hours (or manually set it via the admin UI: edit a session, set `completedAt` to ~19 hours ago, clear `wrapUpEmailsDispatchedAt`).

Trigger the cron:

```bash
# Local dev — no CRON_SECRET needed if unset
curl -s -X POST http://localhost:3000/api/cron/send-wrap-up-emails -w "\nHTTP %{http_code}\n" | head -10
```

Expected response (JSON):
```json
{"success":true,"sessionsProcessed":1,"emailsSent":N,"emailsSkipped":M,"emailsFailed":0}
```

Check the inbox of a test participant. Verify:
- Subject matches `Tack för att du var med — så gick din provning av "..."`.
- Personal-review block shows their wines.
- Coverage callout appears if they didn't review every wine.
- Group comparison appears if ≥2 participants reviewed.
- Recommendations appear if ≥3 grape-overlap hits.
- CTA differs for guest vs authed.

If the response shows `emailsFailed > 0`, check logs for the per-participant error.

- [ ] **Step 5: Idempotency**

```bash
curl -s -X POST http://localhost:3000/api/cron/send-wrap-up-emails -w "\nHTTP %{http_code}\n"
```
Expected: `sessionsProcessed: 0` — session stamp prevents re-fire.

- [ ] **Step 6: Push to main**

```bash
git log --oneline origin/main..HEAD
git push origin main
```

If push is rejected, STOP and report.

- [ ] **Step 7: Merge main → production**

```bash
git fetch origin
git checkout production
git pull --ff-only origin production
git merge --no-ff main -m "$(cat <<'EOF'
release: Chunk D — Wrap-up Email

Post-tasting recap email:
- Cron-driven (Railway Cron via scripts/send-wrap-up-emails.ts)
- HTTP twin at /api/cron/send-wrap-up-emails
- Fires 18h after session completion OR expiration
- Per-recipient gated on ≥1 review
- Personal recap + group comparison + grape-overlap recommendations
- Coverage-aware copy variant

Schema: nullable timestamp columns on course-sessions and
session-participants. Migration runs on Railway boot.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push origin production
git checkout main
```

- [ ] **Step 8: Configure Railway Cron**

Update the Railway Cron service config (or document for the user to do):

- Start command: `pnpm send-wrap-up-emails`
- Schedule: `*/10 * * * *` (every 10 minutes)
- Environment: same as the main service (DATABASE_URI, PAYLOAD_SECRET, RESEND_API_KEY, etc.)

- [ ] **Step 9: Verify deploy**

```bash
git log origin/production --oneline -3
```
Expected: the merge commit at HEAD. Railway picks up the build; the new cron service must be configured separately in the Railway dashboard.

---

## Out of scope (deferred)

- Admin "send wrap-up now" button.
- Per-recipient unsubscribe.
- Subject-line A/B test.
- Localization beyond Swedish.
- Resend after edits.
- Mobile-tailored template.
