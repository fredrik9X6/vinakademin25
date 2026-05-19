import type { Payload } from 'payload'
import { buildWelcomePremiumEmail } from './session-emails/welcome-premium'
import { loggerFor } from './logger'

const log = loggerFor('lib-send-welcome-premium-email')

interface SendArgs {
  payload: Payload
  to: string
  firstName: string | null
  plan: 'monthly' | 'annual' | null
  renewsOn: Date | null
}

/**
 * Send the Vinakademin+ welcome email. Returns true on success, false on
 * failure (logged). Idempotency is the caller's responsibility — gate on
 * `users.welcomeEmailSentAt` before invoking, and stamp after the resolved
 * `true`.
 */
export async function sendWelcomePremiumEmail(args: SendArgs): Promise<boolean> {
  try {
    const { subject, html, text } = buildWelcomePremiumEmail({
      firstName: args.firstName,
      plan: args.plan,
      renewsOn: args.renewsOn,
    })
    await args.payload.sendEmail({ to: args.to, subject, html, text })
    log.info({ to: args.to, plan: args.plan }, 'welcome_premium_email_sent')
    return true
  } catch (err) {
    log.error({ err, to: args.to }, 'welcome_premium_email_failed')
    return false
  }
}
