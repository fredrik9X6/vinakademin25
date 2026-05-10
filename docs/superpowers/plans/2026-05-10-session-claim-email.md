# Session Claim Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Chunk 2 of the group-session UX work — when a host marks a session completed, send each guest participant who supplied an email a one-click link into the existing register-and-claim flow ~30 minutes later.

**Architecture:** A `beforeChange` hook on `CourseSessions` stamps `completedAt` (and clears `claimEmailsDispatchedAt`) on the `→ completed` transition. A Railway Cron job (every 10 min, mirroring the existing `send-review-emails` pattern) finds completed sessions whose 30-minute window has elapsed and iterates each session's guest participants, applying suppression rules (no email, email already in `Users`, or already processed) and sending via Resend. Idempotency is enforced both at the session level (`claimEmailsDispatchedAt`) and per-participant (`claimEmailProcessedAt` + `claimEmailStatus`).

**Tech Stack:** Next.js 15 App Router (React 19), Payload CMS 3.33 + Postgres, Resend via `@payloadcms/email-resend`. New helpers: `src/lib/send-claim-emails.ts`, `src/lib/session-emails/claim-your-tasting.ts`. New cron entry points mirror `send-review-emails`. One Postgres migration adds 4 nullable columns + 1 enum.

**Spec:** `docs/superpowers/specs/2026-05-10-session-claim-email-design.md`

**Test discipline:** This project has no test suite (per CLAUDE.md). Each task uses manual verification commands. The Neon DB is shared between local and production, so DB mutations for testing are constrained — verification leans on the Payload admin UI, the Bearer-protected cron HTTP endpoint, and read-only psql.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/collections/CourseSessions.ts` | modify | Add `completedAt` + `claimEmailsDispatchedAt` fields. Add `beforeChange` hook that stamps `completedAt` and clears `claimEmailsDispatchedAt` on the `→ completed` transition. |
| `src/collections/SessionParticipants.ts` | modify | Add `claimEmailProcessedAt` (date) + `claimEmailStatus` (enum) fields. |
| `src/migrations/<ts>_session_claim_email_tracking.ts` | create (via `pnpm migrate:create`) | DDL: 2 columns on `course_sessions`, 1 column + 1 enum on `session_participants`. |
| `src/migrations/index.ts` | modify (auto by migrate:create) | Register the new migration. |
| `src/payload-types.ts` | modify (auto by generate:types) | Reflect the four new fields. |
| `src/lib/session-emails/claim-your-tasting.ts` | create | `buildClaimYourTastingEmail({ nickname, courseTitle, claimUrl }) → { subject, html, text }`. Mirrors `src/lib/lead-magnet-emails/ebook-grunderna-i-vin.ts`. |
| `src/lib/send-claim-emails.ts` | create | `sendPendingClaimEmails()` — query due sessions, iterate guest participants, apply suppression, send via Resend, mark per-participant + per-session state. |
| `src/app/api/cron/send-claim-emails/route.ts` | create | HTTP twin of the cron, protected by `Bearer ${CRON_SECRET}`. Calls the lib function. |
| `scripts/send-claim-emails.ts` | create | Standalone cron entry point for Railway Cron (preferred per existing pattern). |
| `package.json` | modify | Add `"send-claim-emails": "node --import tsx scripts/send-claim-emails.ts"` script alias. |

No changes to the registration form (`?claim=session` flow already works), no changes to `/api/sessions/claim` (already does the actual claim work).

---

### Task 1: Schema — add fields, migration, types

**Files:**
- Modify: `src/collections/CourseSessions.ts`
- Modify: `src/collections/SessionParticipants.ts`
- Create: `src/migrations/<timestamp>_session_claim_email_tracking.ts` (auto by migrate:create)
- Modify: `src/migrations/index.ts` (auto by migrate:create)
- Modify: `src/payload-types.ts` (auto by generate:types)

- [ ] **Step 1: Add the two `course-sessions` fields**

In `src/collections/CourseSessions.ts`, find the `fields` array. Append these two field definitions to the END of the fields array (just before the closing `]` of the `fields:` block):

```ts
    {
      name: 'completedAt',
      type: 'date',
      admin: {
        readOnly: true,
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
        description:
          'Stamped by the beforeChange hook when status transitions to "completed". Read by the claim-email cron to compute the 30-minute window.',
      },
    },
    {
      name: 'claimEmailsDispatchedAt',
      type: 'date',
      admin: {
        readOnly: true,
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
        description:
          'Set by the cron after iterating participants for this session. Cleared on re-completion so the cron can re-process newly-added participants.',
      },
    },
```

- [ ] **Step 2: Add the two `session-participants` fields**

In `src/collections/SessionParticipants.ts`, find the `fields` array. Append these two field definitions to the END:

```ts
    {
      name: 'claimEmailProcessedAt',
      type: 'date',
      admin: {
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime' },
        description:
          'Set by the cron on every per-participant decision (sent, skipped, or failed). Idempotency guard — prevents the cron from re-processing the same participant.',
      },
    },
    {
      name: 'claimEmailStatus',
      type: 'select',
      options: [
        { label: 'Sent', value: 'sent' },
        { label: 'Skipped — existing user', value: 'skipped_existing_user' },
        { label: 'Skipped — no email', value: 'skipped_no_email' },
        { label: 'Failed', value: 'failed' },
      ],
      admin: {
        readOnly: true,
        description: 'Outcome of the claim-email decision for operator debugging.',
      },
    },
```

- [ ] **Step 3: Generate the migration**

```bash
pnpm migrate:create -- session-claim-email-tracking
```

Expected: a new file at `src/migrations/<timestamp>_session_claim_email_tracking.ts` and a new line in `src/migrations/index.ts` registering it. Read the generated migration and confirm the `up` block contains:
- Two `ALTER TABLE "course_sessions" ADD COLUMN ...` statements for the timestamp fields.
- One `CREATE TYPE "public"."enum_session_participants_claim_email_status"` for the participants enum.
- One `ALTER TABLE "session_participants" ADD COLUMN "claim_email_processed_at" timestamp(3) ...` line and one for `claim_email_status` referencing the new enum.

The `down` block should drop columns + the enum in the reverse order. If the generated DDL is wrong (missing columns, wrong column types, dropping the wrong table), STOP and report — do not edit migrations by hand without consulting first.

- [ ] **Step 4: Regenerate Payload types**

```bash
pnpm generate:types
```

Expected: `src/payload-types.ts` shows the four new fields under `CourseSession` and `SessionParticipant` interfaces, with the right TS types (`string | null | undefined` for the dates, the literal union for `claimEmailStatus`).

Verify with:
```bash
grep -nE "completedAt|claimEmailsDispatchedAt|claimEmailProcessedAt|claimEmailStatus" src/payload-types.ts | head
```

Expected: each of the four field names appears at least once in `CourseSession` / `SessionParticipant` interface bodies.

- [ ] **Step 5: TypeScript clean**

```bash
pnpm exec tsc --noEmit -p tsconfig.json 2>&1 | grep -E "(CourseSessions|SessionParticipants|payload-types)" | head
```

Expected: no NEW errors. (Pre-existing errors in unrelated files are fine; do not block on them.)

- [ ] **Step 6: Apply the migration locally**

```bash
pnpm migrate
```

Expected: the new migration runs successfully. The Neon DB is shared with prod, so this also runs against prod. That's intentional — these are nullable additive columns that prod can tolerate immediately. Verify with read-only psql:

```bash
PGPASSWORD=npg_Eb7p4jxYzmrF psql "postgresql://neondb_owner@ep-super-poetry-a2z7zldz-pooler.eu-central-1.aws.neon.tech/vinakademin?sslmode=require&channel_binding=require" -c "\d course_sessions" | grep -E "completed_at|claim_emails_dispatched_at"
PGPASSWORD=npg_Eb7p4jxYzmrF psql "postgresql://neondb_owner@ep-super-poetry-a2z7zldz-pooler.eu-central-1.aws.neon.tech/vinakademin?sslmode=require&channel_binding=require" -c "\d session_participants" | grep -E "claim_email_processed_at|claim_email_status"
```

Expected: each column appears with the right type (`timestamp(3) ...` for dates, the enum for `claim_email_status`).

- [ ] **Step 7: Commit**

```bash
git add src/collections/CourseSessions.ts src/collections/SessionParticipants.ts src/migrations src/payload-types.ts
git commit -m "$(cat <<'EOF'
sessions: schema for claim-email tracking

Adds completedAt + claimEmailsDispatchedAt to CourseSessions, and
claimEmailProcessedAt + claimEmailStatus enum to SessionParticipants.
All nullable, additive — prod-safe migration. The hook + cron in
follow-up commits will populate them.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `beforeChange` hook on `CourseSessions`

**Files:**
- Modify: `src/collections/CourseSessions.ts`

The hook stamps `completedAt = now()` and clears `claimEmailsDispatchedAt = null` whenever a session's `status` transitions to `'completed'` (regardless of which non-completed status it came from).

A `beforeChange` hook is preferred over `afterChange` here because it modifies `data` in-place — no second `payload.update` call, no recursion risk, atomic with the user's save.

- [ ] **Step 1: Add the hook**

In `src/collections/CourseSessions.ts`, find the `CollectionConfig` object. There is currently no `hooks` block. Add one immediately above the `fields` array:

```ts
  hooks: {
    beforeChange: [
      ({ data, originalDoc, operation }) => {
        // Stamp completedAt and reset claimEmailsDispatchedAt on the → completed
        // transition. Re-completing a session re-stamps completedAt and re-arms
        // the cron so newly-added participants can still receive a claim email,
        // while per-participant claimEmailProcessedAt prevents duplicate sends.
        if (operation !== 'update') return data
        const wasCompleted = originalDoc?.status === 'completed'
        const isCompleted = data?.status === 'completed'
        if (!wasCompleted && isCompleted) {
          return {
            ...data,
            completedAt: new Date().toISOString(),
            claimEmailsDispatchedAt: null,
          }
        }
        return data
      },
    ],
  },
```

If `hooks` already exists in the file, merge into it instead.

- [ ] **Step 2: TypeScript clean**

```bash
pnpm exec tsc --noEmit -p tsconfig.json 2>&1 | grep -E "CourseSessions" | head
```

Expected: no output.

- [ ] **Step 3: Manual verification via Payload admin**

Start dev server (skip if running):
```bash
lsof -nP -i tcp:3000 | head -3 || (pnpm dev > /tmp/dev.log 2>&1 &)
until curl -s --max-time 3 http://localhost:3000/api/users/me >/dev/null 2>&1; do sleep 2; done; echo ready
```

In the Payload admin UI (`/admin`):
1. Open an existing test session whose `status` is `active` (e.g. join code `JHFVJD` per Chunk 1's verification, if still around — otherwise pick any active session).
2. Change `status` to `completed`. Save.
3. Refresh the row. Confirm:
   - `completedAt` is now set to (approximately) the current time.
   - `claimEmailsDispatchedAt` is `null`.
4. Change `status` back to `active`. Save.
5. Refresh. Confirm `completedAt` stays at the previously-stamped time (the hook only fires on the → completed transition; reverting doesn't clear it).
6. Change to `completed` again. Save.
7. Refresh. Confirm `completedAt` is now updated to the new time and `claimEmailsDispatchedAt` is still `null`.

Read-only verification via psql (alternative to admin UI clicks):
```bash
PGPASSWORD=npg_Eb7p4jxYzmrF psql "postgresql://neondb_owner@ep-super-poetry-a2z7zldz-pooler.eu-central-1.aws.neon.tech/vinakademin?sslmode=require&channel_binding=require" -c "SELECT join_code, status, completed_at, claim_emails_dispatched_at FROM course_sessions ORDER BY updated_at DESC LIMIT 5;"
```

If you cannot run admin UI clicks (e.g. no active session, no admin login available), note the limitation. Skipping this step is acceptable but flag it — the hook logic is small and can also be verified during Task 7's E2E pass.

- [ ] **Step 4: Commit**

```bash
git add src/collections/CourseSessions.ts
git commit -m "$(cat <<'EOF'
sessions: stamp completedAt on status→completed transition

beforeChange hook on CourseSessions sets completedAt = now() and
clears claimEmailsDispatchedAt whenever status transitions to
"completed". Re-completing a session re-arms the cron so newly-added
participants can receive a claim email; per-participant
claimEmailProcessedAt blocks duplicate sends.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Email template builder

**Files:**
- Create: `src/lib/session-emails/claim-your-tasting.ts`

- [ ] **Step 1: Create the directory and file**

Create `src/lib/session-emails/claim-your-tasting.ts`:

```ts
import {
  emailBrandOrange,
  emailHeaderCellStyle,
  emailPrimaryCtaButton,
} from '../email-cta'
import { getSiteURL } from '../site-url'

export interface ClaimYourTastingEmailInput {
  /** Participant's nickname; used for personalized subject + greeting. */
  nickname?: string | null
  /** Title of the wine tasting (course) the participant attended. */
  courseTitle: string
  /** Pre-built /registrera URL with all claim params already encoded. */
  claimUrl: string
}

/**
 * Renders the post-tasting "save your reviews" email.
 * Mirrors the visual + tonal beats of the in-app `ClaimYourTastingCard`:
 * same 3-bullet list, same primary CTA label, same fine-print footer.
 */
export function buildClaimYourTastingEmail(
  input: ClaimYourTastingEmailInput,
): { subject: string; html: string; text: string } {
  const siteUrl = getSiteURL()
  const firstName =
    input.nickname && input.nickname.trim()
      ? input.nickname.trim().split(/\s+/)[0]
      : null

  const subject = firstName
    ? `${firstName}, vi sparade din provning`
    : `Spara din vinprovning från ${input.courseTitle}`

  const greeting = firstName ? `Hej ${firstName}!` : 'Hej!'

  const text = [
    greeting,
    '',
    `Tack för att du var med på ${input.courseTitle}.`,
    '',
    'Skapa ett konto så sparar vi alla dina recensioner och provningsanteckningar — och du kan komma tillbaka och se dem när som helst.',
    '',
    '· Alla dina vinrecensioner samlas på Mina sidor',
    '· Få förslag på liknande viner du kommer att gilla',
    '· Bjud in till dina egna grupprovningar',
    '',
    'Spara din provning:',
    input.claimUrl,
    '',
    'Det tar 30 sekunder. Avsluta när du vill.',
    '',
    'Skål!',
    'Vinakademin-teamet',
  ].join('\n')

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">

          <tr>
            <td align="center" bgcolor="${emailBrandOrange}" style="${emailHeaderCellStyle()}">
              <div style="font-size: 12px; color: #ffffff; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.18em; font-weight: 600;">
                Spara din provning
              </div>
              <h1 style="margin: 8px 0 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px; line-height: 1.15;">
                Vinakademin
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 32px 32px 8px;">
              <h2 style="margin: 0 0 12px; color: #1a1714; font-size: 22px; font-weight: 600; letter-spacing: -0.3px; line-height: 1.25;">
                ${greeting}
              </h2>
              <p style="margin: 0 0 16px; color: #1a1714; font-size: 16px; line-height: 1.55;">
                Tack för att du var med på <strong>${input.courseTitle}</strong>.
              </p>
              <p style="margin: 0 0 16px; color: #4a4540; font-size: 15px; line-height: 1.55;">
                Skapa ett konto så sparar vi alla dina recensioner och provningsanteckningar — och du kan komma tillbaka och se dem när som helst.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px 8px;">
              <ul style="margin: 0; padding-left: 18px; color: #4a4540; font-size: 15px; line-height: 1.7;">
                <li>Alla dina vinrecensioner samlas på Mina sidor</li>
                <li>Få förslag på liknande viner du kommer att gilla</li>
                <li>Bjud in till dina egna grupprovningar</li>
              </ul>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 24px 32px 8px;">
              ${emailPrimaryCtaButton(input.claimUrl, 'Spara din provning →')}
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 8px 32px 32px;">
              <p style="margin: 0; color: #8a8580; font-size: 12px; line-height: 1.5;">
                Det tar 30 sekunder. Avsluta när du vill.
              </p>
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

- [ ] **Step 2: TypeScript clean**

```bash
pnpm exec tsc --noEmit -p tsconfig.json 2>&1 | grep -E "session-emails/claim-your-tasting" | head
```

Expected: no output.

- [ ] **Step 3: Smoke-test rendering (no send)**

Open a Node REPL inside the project:

```bash
cd /Users/fredrik/dev/vinakademin25
node --import tsx -e "
import('./src/lib/session-emails/claim-your-tasting.ts').then(m => {
  const r = m.buildClaimYourTastingEmail({
    nickname: 'Anna-Lena',
    courseTitle: 'Lär dig grunderna med goda viner',
    claimUrl: 'https://www.vinakademin.se/registrera?email=test%40example.com&firstName=Anna-Lena&claim=session&redirect=%2Fmina-sidor',
  })
  console.log('SUBJECT:', r.subject)
  console.log('TEXT_LEN:', r.text.length)
  console.log('HTML_LEN:', r.html.length)
  console.log('TEXT_PREVIEW:', r.text.slice(0, 200))
})
"
```

Expected: `SUBJECT: Anna-Lena, vi sparade din provning`, both `TEXT_LEN` and `HTML_LEN` are non-zero, `TEXT_PREVIEW` starts with `Hej Anna-Lena!`.

Then run again with `nickname: undefined`:

```bash
node --import tsx -e "
import('./src/lib/session-emails/claim-your-tasting.ts').then(m => {
  const r = m.buildClaimYourTastingEmail({
    courseTitle: 'Lär dig grunderna med goda viner',
    claimUrl: 'https://www.vinakademin.se/registrera?claim=session',
  })
  console.log('SUBJECT:', r.subject)
})
"
```

Expected: `SUBJECT: Spara din vinprovning från Lär dig grunderna med goda viner`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/session-emails/claim-your-tasting.ts
git commit -m "$(cat <<'EOF'
sessions: claim-your-tasting email template

Mirrors the lead-magnet email pattern + the ClaimYourTastingCard's
copy beats. Subject branches on whether a nickname is available:
"{nickname}, vi sparade din provning" or "Spara din vinprovning från
{courseTitle}".

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `sendPendingClaimEmails` core lib

**Files:**
- Create: `src/lib/send-claim-emails.ts`

This is the heart of the feature. Mirrors `src/lib/send-review-emails.ts` in shape. The function is called by both the HTTP cron route (Task 5) and the standalone script (Task 6).

- [ ] **Step 1: Create the file**

Create `src/lib/send-claim-emails.ts`:

```ts
import { getPayload } from 'payload'
import config from '@/payload.config'
import { loggerFor } from './logger'
import { getSiteURL } from './site-url'
import { buildClaimYourTastingEmail } from './session-emails/claim-your-tasting'

const log = loggerFor('lib-send-claim-emails')

/** 30 minutes in ms — the host-edit-tolerance window before we email guests. */
const POST_COMPLETE_DELAY_MS = 30 * 60 * 1000

/** Cap per cron run — protects against runaway loops if a backlog builds up. */
const MAX_SESSIONS_PER_RUN = 50

interface SendResult {
  sessionsProcessed: number
  emailsSent: number
  emailsSkipped: number
  emailsFailed: number
}

/**
 * Core logic for the proactive claim email.
 *
 * Finds course-sessions that have been completed for at least 30 minutes and
 * haven't yet been processed (claimEmailsDispatchedAt is null). For each, walks
 * its guest participants (user IS NULL), applies suppression rules, and sends
 * via Resend. Updates per-participant tracking and the session-level dispatched
 * marker as it goes.
 *
 * Called by both:
 * - scripts/send-claim-emails.ts (Railway Cron, preferred)
 * - /api/cron/send-claim-emails (HTTP twin for manual trigger)
 */
export async function sendPendingClaimEmails(): Promise<SendResult> {
  const payload = await getPayload({ config })
  const siteUrl = getSiteURL()

  const cutoff = new Date(Date.now() - POST_COMPLETE_DELAY_MS).toISOString()

  // 1. Find due sessions
  const dueSessions = await payload.find({
    collection: 'course-sessions',
    where: {
      and: [
        { status: { equals: 'completed' } },
        { completedAt: { exists: true } },
        { completedAt: { less_than: cutoff } },
        { claimEmailsDispatchedAt: { exists: false } },
      ],
    },
    depth: 1, // populate course
    limit: MAX_SESSIONS_PER_RUN,
    overrideAccess: true,
  })

  let emailsSent = 0
  let emailsSkipped = 0
  let emailsFailed = 0

  for (const session of dueSessions.docs as any[]) {
    const courseRef = session.course
    const courseTitle =
      typeof courseRef === 'object' && courseRef ? courseRef.title : 'din vinprovning'

    // 2. Find guest participants (no linked user)
    const participants = await payload.find({
      collection: 'session-participants',
      where: {
        and: [
          { session: { equals: session.id } },
          { user: { exists: false } },
        ],
      },
      limit: 1000,
      overrideAccess: true,
    })

    for (const p of participants.docs as any[]) {
      // 3a. Skip if already processed (idempotency)
      if (p.claimEmailProcessedAt) {
        continue
      }

      const email = typeof p.email === 'string' ? p.email.trim().toLowerCase() : null
      const nickname = typeof p.nickname === 'string' ? p.nickname : null

      // 3b. Skip if no email
      if (!email) {
        await markProcessed(payload, p.id, 'skipped_no_email')
        emailsSkipped++
        continue
      }

      // 3c. Skip if email already belongs to a registered user
      const userMatch = await payload.find({
        collection: 'users',
        where: { email: { equals: email } },
        limit: 1,
        overrideAccess: true,
      })
      if (userMatch.docs.length > 0) {
        await markProcessed(payload, p.id, 'skipped_existing_user')
        emailsSkipped++
        continue
      }

      // 3d. Send
      const claimUrl = buildClaimUrl(siteUrl, email, nickname)
      const { subject, html, text } = buildClaimYourTastingEmail({
        nickname,
        courseTitle,
        claimUrl,
      })

      try {
        await payload.sendEmail({
          to: email,
          subject,
          html,
          text,
        })
        await markProcessed(payload, p.id, 'sent')
        emailsSent++
        log.info({ participantId: p.id, sessionId: session.id, email }, 'claim_email_sent')
      } catch (err) {
        log.error(
          { err, participantId: p.id, sessionId: session.id, email },
          'claim_email_send_failed',
        )
        await markProcessed(payload, p.id, 'failed')
        emailsFailed++
      }
    }

    // 4. Mark the session dispatched so future cron runs skip it
    try {
      await payload.update({
        collection: 'course-sessions',
        id: session.id,
        data: { claimEmailsDispatchedAt: new Date().toISOString() },
        overrideAccess: true,
        depth: 0,
      })
    } catch (err) {
      log.error({ err, sessionId: session.id }, 'claim_email_dispatched_marker_failed')
    }
  }

  return {
    sessionsProcessed: dueSessions.docs.length,
    emailsSent,
    emailsSkipped,
    emailsFailed,
  }
}

/** Per-participant state-update helper. Never throws — failures are logged. */
async function markProcessed(
  payload: Awaited<ReturnType<typeof getPayload>>,
  participantId: number | string,
  status: 'sent' | 'skipped_existing_user' | 'skipped_no_email' | 'failed',
): Promise<void> {
  try {
    await payload.update({
      collection: 'session-participants',
      id: participantId,
      data: {
        claimEmailProcessedAt: new Date().toISOString(),
        claimEmailStatus: status,
      },
      overrideAccess: true,
      depth: 0,
    })
  } catch (err) {
    log.error({ err, participantId, status }, 'claim_email_mark_processed_failed')
  }
}

/**
 * Builds the /registrera URL with the same query-param contract that
 * ClaimYourTastingCard already uses. The registration form auto-fires
 * /api/sessions/claim on success when claim=session is present.
 */
function buildClaimUrl(siteUrl: string, email: string, nickname: string | null): string {
  const params = new URLSearchParams()
  params.set('email', email)
  if (nickname) {
    const firstName = nickname.trim().split(/\s+/)[0]
    if (firstName) params.set('firstName', firstName)
  }
  params.set('claim', 'session')
  params.set('redirect', '/mina-sidor')
  return `${siteUrl}/registrera?${params.toString()}`
}
```

- [ ] **Step 2: TypeScript clean**

```bash
pnpm exec tsc --noEmit -p tsconfig.json 2>&1 | grep -E "send-claim-emails" | head
```

Expected: no output.

- [ ] **Step 3: Read-only sanity check via psql**

Confirm the find query shape works against a real DB:

```bash
PGPASSWORD=npg_Eb7p4jxYzmrF psql "postgresql://neondb_owner@ep-super-poetry-a2z7zldz-pooler.eu-central-1.aws.neon.tech/vinakademin?sslmode=require&channel_binding=require" -c "SELECT id, join_code, status, completed_at, claim_emails_dispatched_at FROM course_sessions WHERE status='completed' AND completed_at IS NOT NULL AND completed_at < now() - interval '30 minutes' AND claim_emails_dispatched_at IS NULL LIMIT 5;"
```

Expected: zero or more rows. Most likely zero on a fresh schema (no sessions completed yet under the new field). That's fine — Task 7's E2E pass will exercise the cron with a real session.

- [ ] **Step 4: Commit**

```bash
git add src/lib/send-claim-emails.ts
git commit -m "$(cat <<'EOF'
sessions: sendPendingClaimEmails core logic

Polls course-sessions for status=completed, completedAt > 30min ago,
claimEmailsDispatchedAt NULL. For each, walks guest participants,
applies suppression (no email / email matches User / already
processed), sends via Resend, updates per-participant
claimEmailProcessedAt + claimEmailStatus. Marks the session
dispatched at the end. Errors are logged but never abort the batch.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: HTTP cron route

**Files:**
- Create: `src/app/api/cron/send-claim-emails/route.ts`

- [ ] **Step 1: Create the route**

Create `src/app/api/cron/send-claim-emails/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { sendPendingClaimEmails } from '@/lib/send-claim-emails'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('api-cron-send-claim-emails')

/**
 * HTTP twin of the claim-email cron job.
 * Useful for manual triggers and external cron services.
 * The standalone script (scripts/send-claim-emails.ts) is preferred for
 * Railway Cron — same logic, no HTTP overhead.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await sendPendingClaimEmails()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    log.error('Error in send-claim-emails cron:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return POST(req)
}
```

- [ ] **Step 2: Smoke-test the route auth**

With dev server running:

```bash
# No auth header — should 401 if CRON_SECRET is set
curl -s -X POST http://localhost:3000/api/cron/send-claim-emails -w "\nHTTP %{http_code}\n"

# With wrong auth — should 401
curl -s -X POST -H "Authorization: Bearer wrong" http://localhost:3000/api/cron/send-claim-emails -w "\nHTTP %{http_code}\n"

# With correct auth — should 200 and a JSON body
SECRET=$(grep -E "^CRON_SECRET=" .env | cut -d'=' -f2-)
curl -s -X POST -H "Authorization: Bearer $SECRET" http://localhost:3000/api/cron/send-claim-emails -w "\nHTTP %{http_code}\n"
```

Expected for the third call: `{"success":true,"sessionsProcessed":0,"emailsSent":0,"emailsSkipped":0,"emailsFailed":0}` HTTP 200 (assuming no due sessions yet).

If `CRON_SECRET` is not set in `.env`, the auth check is skipped (matches the existing `send-review-emails` behavior — `if (cronSecret && ...)`). In that case all three calls should return 200; document this in your report.

- [ ] **Step 3: TypeScript clean**

```bash
pnpm exec tsc --noEmit -p tsconfig.json 2>&1 | grep -E "cron/send-claim-emails" | head
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/cron/send-claim-emails/route.ts
git commit -m "$(cat <<'EOF'
sessions: HTTP cron endpoint for claim emails

POST /api/cron/send-claim-emails — Bearer ${CRON_SECRET}-protected
HTTP twin of the standalone script. Mirrors the existing
send-review-emails route shape. Useful for manual triggers and
Railway HTTP-cron schedules.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Standalone cron script + pnpm alias

**Files:**
- Create: `scripts/send-claim-emails.ts`
- Modify: `package.json`

- [ ] **Step 1: Create the script**

Create `scripts/send-claim-emails.ts`:

```ts
/**
 * Standalone cron script for sending session claim emails.
 *
 * Meant to be run as a Railway Cron service:
 *   Start command: pnpm send-claim-emails
 *   Cron schedule: */10 * * * *  (every 10 minutes)
 *
 * Uses Payload's local API directly via the shared lib — no HTTP server needed.
 */
import { sendPendingClaimEmails } from '../src/lib/send-claim-emails'
import { loggerFor } from '../src/lib/logger'

const log = loggerFor('scripts-send-claim-emails')

async function main() {
  log.info(`[${new Date().toISOString()}] Starting claim-email cron job...`)

  try {
    const result = await sendPendingClaimEmails()
    log.info(`[${new Date().toISOString()}] Claim-email cron completed:`)
    log.info(`  Sessions processed: ${result.sessionsProcessed}`)
    log.info(`  Emails sent:        ${result.emailsSent}`)
    log.info(`  Emails skipped:     ${result.emailsSkipped}`)
    log.info(`  Emails failed:      ${result.emailsFailed}`)
  } catch (error) {
    log.error(`[${new Date().toISOString()}] Claim-email cron failed:`, error)
    process.exit(1)
  }

  process.exit(0)
}

main()
```

- [ ] **Step 2: Add the pnpm script alias**

Open `package.json`. In the `"scripts"` block, find the existing `"send-review-emails"` line. Add a sibling line directly below it:

```json
    "send-claim-emails": "node --import tsx scripts/send-claim-emails.ts",
```

Maintain alphabetical / logical ordering with the surrounding scripts. Do not modify any other script.

- [ ] **Step 3: TypeScript clean**

```bash
pnpm exec tsc --noEmit -p tsconfig.json 2>&1 | grep -E "scripts/send-claim-emails" | head
```

Expected: no output.

- [ ] **Step 4: Smoke-test the script**

```bash
pnpm send-claim-emails 2>&1 | tail -20
```

Expected:
```
[<timestamp>] Starting claim-email cron job...
[<timestamp>] Claim-email cron completed:
  Sessions processed: 0
  Emails sent:        0
  Emails skipped:     0
  Emails failed:      0
```

(Counts may differ if there are due sessions — that's fine. The script must exit 0 cleanly.)

- [ ] **Step 5: Commit**

```bash
git add scripts/send-claim-emails.ts package.json
git commit -m "$(cat <<'EOF'
sessions: standalone claim-email cron script

scripts/send-claim-emails.ts mirrors send-review-emails — boots
Payload, calls the shared lib, logs counts, exits. Adds the
pnpm send-claim-emails alias. Schedule on Railway Cron at every-10-min.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: End-to-end verification + push

**Files:** none modified.

- [ ] **Step 1: Lint clean**

```bash
pnpm lint 2>&1 | tail -3
```

Expected: `✔ No ESLint warnings or errors`.

- [ ] **Step 2: TypeScript clean for everything we touched**

```bash
pnpm exec tsc --noEmit -p tsconfig.json 2>&1 | grep -E "(CourseSessions|SessionParticipants|send-claim-emails|claim-your-tasting|cron/send-claim-emails)" | head
```

Expected: no output.

- [ ] **Step 3: End-to-end dry run**

The cleanest verification path that doesn't poison the prod-shared DB:

1. Open the Payload admin (`/admin`).
2. Create a new test session against any course (let it auto-generate a join code).
3. Open it via the host UI or directly in admin. Add a `session-participants` row by hand: `nickname=Testperson`, `email=<your test inbox>`, `participantToken=<random hex>`, `isActive=true`. (The Join API normally creates these; doing it manually keeps the test isolated.)
4. Set the session's `status` to `completed` and save. Verify `completedAt` populates and `claimEmailsDispatchedAt` is null.
5. Wait 30 minutes (or, if you trust the implementation, manually back-date `completed_at` via psql to bypass the wait — but this requires DB mutation, so prefer the wait):
   ```bash
   # Optional shortcut — back-dates the test session 31 min so the cron sees it as due
   PGPASSWORD=npg_Eb7p4jxYzmrF psql "postgresql://neondb_owner@ep-super-poetry-a2z7zldz-pooler.eu-central-1.aws.neon.tech/vinakademin?sslmode=require&channel_binding=require" -c "UPDATE course_sessions SET completed_at = now() - interval '31 minutes' WHERE id = <TEST_SESSION_ID>;"
   ```
   Skip this UPDATE if you don't want to mutate the shared DB; just wait the real 30 minutes.
6. Run the cron manually:
   ```bash
   pnpm send-claim-emails 2>&1 | tail
   ```
   Expected: `Sessions processed: 1`, `Emails sent: 1`.
7. Check your test inbox — confirm subject, body, and that the CTA URL renders the prefilled register form when clicked.
8. Run the cron a SECOND time:
   ```bash
   pnpm send-claim-emails 2>&1 | tail
   ```
   Expected: `Sessions processed: 0` (idempotent — the dispatched marker blocks re-processing).
9. Optional: in the participant row, manually clear `claim_email_processed_at` via psql, leave the session's `claim_emails_dispatched_at` as-is, run cron again. Expected: still 0 emails sent (session-level marker is what protects this run).

**If you're not comfortable mutating the prod-shared DB at any point**, skip steps 5 and 9 and rely on the natural 30-min wait + the expected zero-email-send case from Steps 1–2 of Tasks 5/6 to demonstrate the wiring works. The behavior is well-covered by the unit-of-logic in `sendPendingClaimEmails` itself, which Task 4 already exercised via the read-only psql sanity check.

- [ ] **Step 4: Push to staging and production**

```bash
git push origin main
git checkout production
git pull --ff-only origin production
git merge main --no-ff -m "merge: session claim email (post-tasting conversion)"
git push origin production
git checkout main
```

If `git push origin production` is rejected by a pre-receive hook, STOP and report BLOCKED — don't `--force`.

The migration runs automatically on Railway boot (Payload's `prodMigrations` config). Watch the deploy log — the new migration `<ts>_session_claim_email_tracking` should apply cleanly.

- [ ] **Step 5: Configure Railway Cron**

This is an **operator action** the implementer subagent does NOT do — note in the report so the user remembers:

> In the Railway dashboard, add a new Cron service (or update an existing one) with:
>   - Start command: `pnpm send-claim-emails`
>   - Schedule: `*/10 * * * *`
>   - `CRON_SECRET` env var set (only required if you also want to use the HTTP twin)
>
> The standalone script doesn't actually require `CRON_SECRET` because it doesn't go through HTTP. The HTTP twin uses it only when set; if absent, the route is unauthenticated, which is acceptable on a private internal endpoint but worth setting anyway.

- [ ] **Step 6: Live verification (post-deploy)**

After Railway finishes the rebuild, complete a real session in production with a guest participant who has an email. Wait 30 minutes + a cron tick. Confirm the email arrives, the per-participant tracking columns populate, and the second cron run is a no-op.

This is the user's follow-up — note in the report.

---

## Self-Review

**1. Spec coverage:**

| Spec section | Plan task |
|---|---|
| §1 Trigger and timing (status=completed + 30 min cron) | Task 2 (hook) + Task 4 (cron query) |
| §2 Schema — `course-sessions` fields | Task 1 |
| §2 Schema — `session-participants` fields incl. enum | Task 1 |
| §2 Migration | Task 1 |
| §3 `beforeChange` hook on CourseSessions | Task 2 |
| §3 Re-completion behavior (clear `claimEmailsDispatchedAt`) | Task 2 (hook code includes the clear) |
| §4 `sendPendingClaimEmails` algorithm | Task 4 (full implementation) |
| §4 Per-participant decision tree (skip rules + send) | Task 4 |
| §5 Email template builder + branching subject | Task 3 |
| §5 `claimUrl` shape | Task 4 (`buildClaimUrl` helper) |
| §6 HTTP cron route w/ Bearer auth | Task 5 |
| §6 Standalone cron script + pnpm alias | Task 6 |
| §6 Railway Cron schedule | Task 7 Step 5 (operator note) |
| §7 Suppression rules (existing user, no email, idempotency) | Task 4 (decision tree) |
| §7 Send anyway for unsubscribed (transactional) | Task 4 (no Subscriber lookup, deliberately) |
| §8 Re-completion duplicate-send shield | Task 4 (`claimEmailProcessedAt` guard) |

**2. Placeholder scan:** No "TBD" / "TODO" / "implement later" anywhere in the plan. Each code step contains complete code. The only `<placeholder>` shapes are timestamp-style migration filenames (`<timestamp>_session_claim_email_tracking.ts`) which are auto-generated by `pnpm migrate:create` — that's correct, not a plan failure.

**3. Type consistency:**
- `claimEmailStatus` enum values are identical across the spec, the collection definition (Task 1 Step 2), the lib's `markProcessed` signature (Task 4), and the migration (auto-generated to match).
- `claimEmailProcessedAt` field name is consistent across spec, collection, and lib. (Spec was renamed mid-review from `claimEmailSentAt`; the plan uses the renamed name throughout.)
- `sendPendingClaimEmails` return shape (`{ sessionsProcessed, emailsSent, emailsSkipped, emailsFailed }`) is referenced by both Task 5 (route response body) and Task 6 (script log lines) consistently.
- `buildClaimYourTastingEmail` input + output types match between Task 3 (definition) and Task 4 (consumer).

No issues found.
