import type { Payload } from 'payload'
import { loggerFor } from './logger'

const log = loggerFor('lib-notify-team')

const DEFAULT_TEAM_INBOX = 'info@vinakademin.se'

function getTeamInbox(): string {
  return process.env.TEAM_NOTIFICATIONS_TO?.trim() || DEFAULT_TEAM_INBOX
}

export interface TeamNotificationInput {
  payload: Payload
  subject: string
  html: string
  /** Reply-To address (e.g. the contact's email) so the team can hit reply and write back to the user. */
  replyTo?: string
}

/**
 * Fire-and-forget heads-up email to the team. Never throws — failures are logged
 * and swallowed so a missed notification can't break the user-facing flow.
 */
export async function sendTeamNotification(input: TeamNotificationInput): Promise<void> {
  const { payload, subject, html, replyTo } = input
  const to = getTeamInbox()

  try {
    await payload.sendEmail({
      to,
      subject,
      html,
      ...(replyTo ? { replyTo } : {}),
    })
    log.info({ to, subject }, 'team_notification_sent')
  } catch (err) {
    log.error({ err, to, subject }, 'team_notification_failed')
  }
}
