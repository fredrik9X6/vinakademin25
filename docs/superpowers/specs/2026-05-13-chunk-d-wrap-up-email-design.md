# Chunk D — Wrap-up Email: Design Spec

**Status:** Approved 2026-05-13. Implementation plan to follow.

## Goal

Every session participant who left at least one review receives a personalized recap email some hours after the session ends — wines they reviewed, group comparison, recommended wines they might also like. Mirrors the cron+template pattern shipped in Chunk 2 (claim-email).

## Scope decisions (locked)

- **Trigger**: completed OR expired session, BUT only fires per-participant when they have ≥1 review for the session. Skipped participants get stamped so they're not re-checked next tick.
- **Copy variants**:
  - Full coverage (user reviewed every wine): clean recap.
  - Partial coverage (1 ≤ reviews < wineCount): same recap + soft callout "Du hann inte betygsätta alla viner — kolla in resten på Vinlistan."
  - Zero reviews: no email; skip + stamp.
- **Content layers** (all variants): personal recap + group comparison + recommendations.
- **Recommendations**: match by grape-variety overlap with wines the recipient rated ≥4 in this session. Render the block only if ≥3 hits; otherwise omit silently (per master plan).
- **Stagger**: 18h after completion/expiration. Claim-email already fires at +30m, so the two don't conflict.

## Schema (additive, with migration)

Mirrors Chunk 2's claim-email fields:

- `CourseSessions` (admin sidebar, readonly):
  - `wrapUpEmailsDispatchedAt: Date | null` — stamp when the wrap-up cron has processed this session. NULL means not yet dispatched.
- `SessionParticipants` (admin sidebar, readonly):
  - `wrapUpEmailDispatchedAt: Date | null` — stamp when this participant has been processed (sent OR skipped).

Migration: two `ALTER TABLE … ADD COLUMN` statements; both nullable. No backfill.

## Cron behavior

Run cadence: ~every 10 min (matches existing claim-email cron). The script `scripts/send-wrap-up-emails.ts` invokes the same core lib as the HTTP twin.

**Selection query** (sessions due for processing):

```ts
where: {
  and: [
    { wrapUpEmailsDispatchedAt: { equals: null } },
    {
      or: [
        // Explicitly completed sessions, 18h elapsed
        {
          and: [
            { status: { equals: 'completed' } },
            { completedAt: { less_than_equal: now - 18h } },
          ],
        },
        // Expired sessions (host never marked completed), 18h past expiry
        {
          and: [
            { status: { not_equals: 'completed' } },
            { expiresAt: { less_than_equal: now - 18h } },
          ],
        },
      ],
    },
  ],
}
```

For each session:
1. Resolve the wine list (course content-items OR plan wines).
2. Fetch all `session-participants` for the session.
3. For each participant in parallel batches:
   - Skip if `wrapUpEmailDispatchedAt` already stamped (defensive — should never be set if the session-level stamp is null).
   - Query Reviews where `sessionParticipant = participant.id`.
   - If 0 reviews → stamp `wrapUpEmailDispatchedAt = NOW()` and continue (no email).
   - If ≥1 review → compute coverage, render email, send, stamp.
4. After all participants processed, stamp `wrapUpEmailsDispatchedAt = NOW()` on the session.

Email failures (Resend error) do NOT stamp the participant — they retry next tick. Stamp ONLY on confirmed dispatch or explicit skip.

## Email content

### Subject

`Tack för att du var med — så gick din provning av "<title>"`

(Title = session-name if set, else plan-title or course-title.)

### Header block

`Tack för att du var med på "<title>"!`
Meta line: `<occasion if set> · <date>`

### Block 1 — "Dina viner och dina betyg"

For each wine the recipient reviewed:
- Pour-number circle + wine title (linked to `/vinlistan/<slug>` if library, plain text if custom).
- Their score (e.g. ★★★★☆) + a 1-2-line excerpt of their `tastingNotes` (truncated at ~140 chars).
- Their `buyAgain` flag rendered as a small chip ("Skulle köpa igen" / "Kanske" / "Nej") when set.

If `coveragePct < 100%`: append the soft callout below this block:
> Du hann inte betygsätta alla viner — kolla in resten på <a>Vinlistan</a>.

### Block 2 — "Så tyckte gruppen"

Only rendered if at least 2 participants left reviews.

For each wine in the session:
- Title + average rating across all participants' latest reviews + reviewer count.

Trailing callout: `Veckans favorit: <wine title>` (highest avg).

### Block 3 — "Vinakademins rekommendationer"

Algorithm:
1. For each wine the recipient rated ≥4 stars in this session, look up the wine's `grapes` (many-to-many to `grapes` collection).
2. Query `wines` where `grapes` overlaps with any of those grape ids, excluding:
   - wines already reviewed by this user (any session, any time)
   - wines in this session
3. Limit total picks to 5, dedupe by wine id.
4. If `picks.length < 3`: omit the entire block.

Each pick renders: thumbnail (if available), title, producer · vintage · region, "Utforska" link to `/vinlistan/<slug>`.

### Footer CTA

- **Guest** (`!user`): `Skapa ett konto för att spara dina betyg` → `/registrera`.
- **Authed**: `Logga in och utforska Vinlistan` → `/vinlistan`.

## File structure

```
NEW src/lib/session-emails/wrap-up.ts                 template (mirrors claim-your-tasting.ts)
NEW src/lib/send-wrap-up-emails.ts                    core dispatcher (mirrors send-claim-emails.ts)
NEW src/lib/wines/recommend-by-grape.ts               grape-overlap recommender (lean, testable in isolation)
NEW scripts/send-wrap-up-emails.ts                    Railway Cron entry (mirrors scripts/send-claim-emails.ts)
NEW src/app/api/cron/send-wrap-up-emails/route.ts     HTTP twin (mirrors api/cron/send-claim-emails)
MOD src/collections/CourseSessions.ts                 + wrapUpEmailsDispatchedAt
MOD src/collections/SessionParticipants.ts            + wrapUpEmailDispatchedAt
NEW src/migrations/<ts>_chunk_d_wrap_up_email.ts      ALTER TABLE × 2
EDIT src/migrations/index.ts                          auto
EDIT src/payload-types.ts                             auto via generate:types
EDIT package.json (scripts)                           + "send-wrap-up-emails" entry mirroring send-claim-emails
```

## Reuse map

| Need | Source |
|---|---|
| Email infra (Resend) | `@payloadcms/email-resend` configured in `payload.config.ts` |
| `escapeHtml`, CTA helpers | `src/lib/email-cta.ts` |
| Cron+HTTP twin pattern | `src/lib/send-claim-emails.ts`, `scripts/send-claim-emails.ts`, `src/app/api/cron/send-claim-emails/route.ts` |
| Wine title display (XOR library/custom) | `getWineDoc` / `getWineTitle` from `src/lib/wines/get-wine-display.ts` (Chunk A) |
| Reviews lookup by participant | existing `reviews` collection, `sessionParticipant` field |
| Star rendering for emails | Plain unicode `★`/`☆` (no images) — matches existing email aesthetic |

## Risks

| Risk | Mitigation |
|---|---|
| User reviews mid-window (e.g. between cron ticks) | Session-level stamp closes after first complete pass; late reviews don't re-trigger. Acceptable. |
| Group comparison shows nonsense with 1 reviewer | Gate the block on `participantsWithReviews ≥ 2`. |
| Recommendation query is heavy | Limit at 5, indexed on grapes; runs once per recipient. |
| Recipient already received a wrap-up for a similar session | One stamp per (session, participant); no global frequency cap. Acceptable for MVP. |
| Custom wines have no slug | Render as plain text, no link. |
| Resend rate limit | Process participants serially within a session; sleep 100ms between sends if rate-limited (match claim-email pattern). |
| Email failures leave stamp NULL → infinite retry | Add retry counter? **No** — keep it simple; persistent failures will spam logs but not block other sessions. Future: per-participant `wrapUpEmailErrors: number`. |

## Out of scope (deferred)

- Admin "send wrap-up now" button (re-trigger via SQL UPDATE setting timestamps to NULL).
- Email-specific unsubscribe link (global unsubscribe applies).
- A/B test on subject line.
- Localized variants (Swedish only).
- Resend after edits.
- Mobile-tailored template.

## Verification

1. Migration applies cleanly: `pnpm migrate` → both columns exist.
2. Local cron call: `curl /api/cron/send-wrap-up-emails` with a test session whose `completedAt = NOW() - 19h` → log shows per-participant dispatch decisions.
3. Test recipient gets the correct copy variant for 100%-coverage vs partial.
4. Recommendation block omitted silently when matches < 3.
5. Re-running the cron is idempotent (session stamp prevents re-fire).
6. Lint + TS clean; push main → production; Railway Cron picks up the new script.

## Effort estimate

2-3 working days.
