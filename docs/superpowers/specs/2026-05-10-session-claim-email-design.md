# Session Claim Email — Proactive post-tasting conversion

## Context

Group-session guests who don't create an account leave their reviews and tasting notes stranded — visible only via the in-app `ClaimYourTastingCard`, which they only see if they revisit the session page. The card is passive: most guests close their phone after the tasting and never come back to it.

This is the conversion flywheel hole. The tasting itself is the warmest moment, the guest's email is already captured at join (optional but commonly given), and we have an existing `/api/sessions/claim` endpoint plus a `?claim=session` flag on the registration form. What's missing is the proactive nudge: an email, ~30 minutes after the host marks the session completed, with a one-click route into the existing register-and-claim flow.

This is Chunk 2 of the group-session UX work (the "Conversion bundle"). Chunk 1 (QR + status-aware /delta) shipped on 2026-05-09.

## Goal

1. Send a single, well-timed claim email to every guest participant who left an email and isn't already a registered user.
2. Reuse the existing register-and-claim flow — no new auth surface, no magic links.
3. Make the system idempotent and host-edit-tolerant: re-completing a session restarts the clock, but a single completion can never produce duplicate emails.
4. Mirror the existing Railway Cron + standalone-script pattern (`send-review-emails`) so operations look identical.

Out of scope: magic-link claim path, dedicated `/spara-min-provning` landing page, marketing-opt-out filtering (claim emails are transactional), backfilling for sessions completed before this ships, multi-session cool-down across the same email.

## Design

### 1. Trigger and timing

The email fires when a host explicitly transitions a session's `status` to `completed`. Other transitions (`active → paused`, `paused → active`, expiry without explicit completion) do not trigger.

A ~30 minute delay is enforced by the cron polling `completedAt + 30 min < now()`. Worst-case latency is 30 min + cron interval (10 min) = 40 min after the host clicks "complete." Best-case is ~30 min on the dot.

`setTimeout` / in-process scheduling is explicitly rejected — Railway is multi-instance and process restarts kill scheduled jobs. The cron-poll approach trades sub-minute precision for robustness.

### 2. Schema changes

**`course-sessions`** — two new nullable fields:

| Field | Type | Set by | Read by |
|---|---|---|---|
| `completedAt` | `date` | `afterChange` hook when `status` transitions to `completed` | Cron, to compute the 30-min window |
| `claimEmailsDispatchedAt` | `date` | Cron, after iterating participants for this session | Cron, to skip already-processed sessions |

**`session-participants`** — two new nullable fields:

| Field | Type | Set by | Read by |
|---|---|---|---|
| `claimEmailProcessedAt` | `date` | Cron, on **every** per-participant decision (sent, skipped, or failed) | Cron, idempotency guard |
| `claimEmailStatus` | `select`: `'sent' \| 'skipped_existing_user' \| 'skipped_no_email' \| 'failed'` | Cron, on every per-participant decision | Operator debugging |

`claimEmailProcessedAt` is named explicitly to mean "the cron has made a decision about this participant" rather than "the email was sent." That distinction matters because we want skip outcomes to also block re-processing — naming the field `…SentAt` would be a lie when the status is `skipped_*` or `failed`.

Migration: `pnpm migrate:create -- "session-claim-email-tracking"` adds the four columns + the participant select-enum. All start null. No backfill — sessions completed before deploy stay invisible to the cron.

### 3. `afterChange` hook on `CourseSessions`

Single concern: stamp `completedAt` on the `→ completed` transition, and reset `claimEmailsDispatchedAt` so a re-completion can re-trigger.

```ts
// Pseudocode
{
  collection: 'course-sessions',
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (operation !== 'update') return doc
        const wasCompleted = previousDoc?.status === 'completed'
        const isCompleted = doc.status === 'completed'
        if (!wasCompleted && isCompleted) {
          await req.payload.update({
            collection: 'course-sessions',
            id: doc.id,
            data: {
              completedAt: new Date().toISOString(),
              claimEmailsDispatchedAt: null, // reset so cron can re-process
            },
            overrideAccess: true,
            depth: 0,
          })
        }
        return doc
      },
    ],
  },
}
```

The hook does not touch participants — that's the cron's job. The 30-minute window after `completedAt` is when the host can safely undo without us racing them.

### 4. Cron logic — `src/lib/send-claim-emails.ts`

Single exported function called by both surfaces (HTTP route + standalone script):

```ts
export async function sendPendingClaimEmails(): Promise<{
  sessionsProcessed: number
  emailsSent: number
  emailsSkipped: number
  emailsFailed: number
}>
```

Algorithm:

1. **Find due sessions.** Query `course-sessions` where:
   - `status` equals `'completed'`
   - `completedAt` is set and `completedAt <= now() - 30min`
   - `claimEmailsDispatchedAt` is null
   - Limit 50 per run (safety valve; in practice we'll see far fewer).
   - Depth 1 to populate `course` for the email subject/body.

2. **For each session, find guest participants.** Query `session-participants` where:
   - `session` equals the current session id
   - `user` does not exist (guests only — authed users had their account at join time)

3. **Per-participant decision tree:**
   - `email == null` → mark `claimEmailStatus = 'skipped_no_email'`, set `claimEmailProcessedAt = now()` (so we never reconsider). Increment `emailsSkipped`.
   - `claimEmailProcessedAt != null` → already processed by a previous run; do nothing. (Shouldn't happen given the session-level guard, but defense in depth.)
   - Email matches an existing `Users.email` (case-insensitive lookup, exact match) → mark `claimEmailStatus = 'skipped_existing_user'`, set `claimEmailProcessedAt = now()`. Increment `emailsSkipped`.
   - Otherwise → render email via `buildClaimYourTastingEmail()`, send via `req.payload.sendEmail({...})` (Resend), set `claimEmailStatus = 'sent' | 'failed'` based on outcome, set `claimEmailProcessedAt = now()`. Increment `emailsSent` or `emailsFailed`.

4. **After processing all participants for a session:** set `claimEmailsDispatchedAt = now()` on the session. Atomicity isn't critical here — if the cron crashes mid-session, the next run will re-process; the per-participant `claimEmailProcessedAt` ensures no duplicate sends.

5. **Return counts** for the cron logger.

Errors are logged but never throw out of the loop — one bad participant or send must not abort the whole batch.

### 5. Email template — `src/lib/session-emails/claim-your-tasting.ts`

Mirrors the lead-magnet email pattern (`src/lib/lead-magnet-emails/ebook-grunderna-i-vin.ts`). One exported function:

```ts
export interface ClaimYourTastingEmailInput {
  nickname?: string
  courseTitle: string
  claimUrl: string
}

export function buildClaimYourTastingEmail(
  input: ClaimYourTastingEmailInput,
): { subject: string; html: string; text: string }
```

**Subject:** `"{nickname}, vi sparade din provning"` (or `"Spara din vinprovning från {courseTitle}"` when no nickname).

**Body (HTML + plaintext):**
- Hero: `Hej {nickname}! Tack för att du var med på {courseTitle}.`
- Value prop sentence: saving reviews + tasting notes for later.
- 3-bullet list mirroring `ClaimYourTastingCard`:
  - Alla dina vinrecensioner samlas på Mina sidor
  - Få förslag på liknande viner du kommer att gilla
  - Bjud in till dina egna grupprovningar
- CTA button: **"Spara din provning →"** linking to `claimUrl`.
- Footer fine print: `Det tar 30 sekunder. Avsluta när du vill.`

**Brand styling:** uses the existing email brand utilities (`emailBrandOrange`, `emailHeaderCellStyle`, `emailPrimaryCtaButton` from `src/lib/email-cta.ts`) — same look as the e-book delivery email.

**`claimUrl` shape:**

```
${siteUrl}/registrera?
  email=<urlencoded participant email>&
  firstName=<urlencoded first word of nickname>&
  claim=session&
  redirect=/mina-sidor
```

This is the same query-string contract `ClaimYourTastingCard` already uses, so no changes to the registration form. The form already auto-fires `/api/sessions/claim` on successful registration when `claim=session` is present.

### 6. Cron entry points

Mirroring `send-review-emails`:

**HTTP** — `src/app/api/cron/send-claim-emails/route.ts`:
- `POST` (and `GET` aliased to `POST`) handler.
- Validates `Authorization: Bearer ${CRON_SECRET}` header.
- Calls `sendPendingClaimEmails()`, returns the counts as JSON.
- 401 on bad auth, 500 on uncaught exception.

**Standalone script** — `scripts/send-claim-emails.ts`:
- Boots Payload, calls `sendPendingClaimEmails()`, logs counts, exits.
- Wired into `package.json` as `"send-claim-emails": "tsx scripts/send-claim-emails.ts"` so Railway Cron can invoke `pnpm send-claim-emails`.

**Railway Cron schedule:** every 10 minutes (`*/10 * * * *`). Configured in Railway's dashboard, not in repo (matches existing operational pattern). Mention this in the deploy notes / commit body so it doesn't get forgotten.

### 7. Suppression rules summary

| Rule | Decision |
|---|---|
| Email matches existing `Users.email` | Skip → `skipped_existing_user`. Existing customer, don't pester. |
| `claimEmailProcessedAt` already set | Skip silently (idempotency). |
| Participant has no email | Skip → `skipped_no_email`. Mark sent so we never reconsider. |
| Subscriber unsubscribed from marketing | **Send anyway.** Claim emails are transactional. |
| Same email got a claim email <7 days ago | **Send anyway.** Per-session, not per-email. |

### 8. Re-completion behavior

Documented because "what happens if the host changes their mind" was a real question:

- Host completes → `completedAt` stamps now, `claimEmailsDispatchedAt` resets to null (already null on first completion, but explicit).
- Cron sees due session, processes, marks `claimEmailsDispatchedAt`.
- Host then flips to paused → no schema change here (`completedAt` is preserved, `claimEmailsDispatchedAt` is preserved). Future cron runs skip because `status !== 'completed'`.
- Host completes again → `afterChange` updates `completedAt` to the new time and **clears** `claimEmailsDispatchedAt`. The 30-min clock restarts.
- Cron picks it up again. Per-participant `claimEmailProcessedAt` blocks duplicate sends — anyone who already got the email won't get another. Anyone new (or anyone whose initial send failed) gets retried.

This means the worst case for a flap-and-recomplete host is: each new participant added during the second window gets one email; existing recipients are protected.

## Files touched

```
NEW   src/lib/send-claim-emails.ts                               core polling + suppression + send
NEW   src/lib/session-emails/claim-your-tasting.ts               email template builder
NEW   src/app/api/cron/send-claim-emails/route.ts                HTTP cron endpoint w/ Bearer auth
NEW   scripts/send-claim-emails.ts                               Railway Cron entry
EDIT  src/collections/CourseSessions.ts                          afterChange hook + 2 new fields
EDIT  src/collections/SessionParticipants.ts                     2 new tracking fields
EDIT  package.json                                               "send-claim-emails" script alias
NEW   src/migrations/<timestamp>_session-claim-email-tracking.ts 4 nullable columns + 1 enum
EDIT  src/migrations/index.ts                                    register the new migration
EDIT  src/payload-types.ts                                       regenerated after collection changes
```

## Testing

This project has no automated test suite. Manual verification:

1. **Hook fires on completion.** Create a test session, flip status to `completed` via Payload admin, confirm `completedAt` is populated and `claimEmailsDispatchedAt` is null.
2. **Cron processes a due session.** Manually fast-forward `completedAt` to >30 min ago via direct DB update (read-only-safe surrogate: post the cron endpoint with the bearer token in dev), confirm the cron picks up the session and either sends or skips per the suppression rules.
3. **Per-participant outcomes.** Verify three guest participants (one with email matching an existing user, one with no email, one fresh email) each get the right `claimEmailStatus` value.
4. **Idempotency.** Run the cron twice in succession; the second run should report 0 emails sent for the same session.
5. **Email rendering.** Trigger one real send to a test address; confirm subject, body, CTA URL params, and that clicking the CTA lands on a prefilled register form that auto-claims on submit.
6. **Re-completion.** Toggle a session paused → completed again; confirm `claimEmailsDispatchedAt` clears, the cron re-runs, and previously-sent participants are not re-sent.

DB-mutation verification steps must run only against a non-prod DB. The current Neon DB is shared between local and prod (per CLAUDE.md and prior incident notes); use the Payload admin or the cron HTTP endpoint with `Bearer ${CRON_SECRET}` for in-vivo testing once on staging.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Email volume spike if many sessions complete simultaneously | 50-session cap per cron run; the 10-min cadence drains backlog within ~half-day max even at 250 sessions/day. Resend's per-tenant rate limits are well above this. |
| Resend transient failures producing `failed` status | `failed` participants stay reachable via the in-app `ClaimYourTastingCard` (already shipped). A future enhancement could implement automatic retry on `failed`, but v1 ships without that — `claimEmailProcessedAt` blocks the cron from retrying, so a manual operator action would be needed. |
| Host completes-then-edits-then-completes a session within the same 30-min window | Acceptable — the second completion resets `completedAt`, the cron sees a fresh 30-min wait, and `claimEmailProcessedAt` prevents per-participant double-sends. Worst case: a participant added during the second window gets exactly one email. |
| Existing customer with stale email in their Users record | Skipped as `skipped_existing_user`. They keep using the in-app card. No customer support burden. |
| Backfill demand: "I want this for sessions that completed last week" | Out of scope. A one-shot script could be written if there's demand; it would just stamp `completedAt` on existing completed sessions, and the next cron run would pick them up. Not pre-built. |
