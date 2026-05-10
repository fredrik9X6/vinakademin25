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
