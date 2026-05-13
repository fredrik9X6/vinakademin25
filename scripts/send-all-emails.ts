/**
 * Combined cron entry that runs every email dispatcher in sequence:
 *   1. send-claim-emails       — proactive "save your reviews" 30m post-completion
 *   2. send-wrap-up-emails     — personalized recap 18h post-completion
 *   3. send-review-emails      — review-request email for course enrollments
 *
 * Each lib function is idempotent (state-stamps prevent double-sends), so this
 * is safe to run on the most frequent shared cadence — every 10 minutes.
 *
 * Use as the single Railway Cron service start command:
 *   pnpm send-all-emails
 *
 * Failures in one dispatcher don't block the others — each runs inside its
 * own try/catch and only its own error is logged.
 */
import { sendPendingClaimEmails } from '../src/lib/send-claim-emails'
import { sendPendingWrapUpEmails } from '../src/lib/send-wrap-up-emails'
import { sendPendingReviewEmails } from '../src/lib/send-review-emails'
import { loggerFor } from '../src/lib/logger'

const log = loggerFor('scripts-send-all-emails')

async function runOne<T>(name: string, fn: () => Promise<T>): Promise<void> {
  log.info(`[${new Date().toISOString()}] ${name}: starting`)
  try {
    const result = await fn()
    log.info(`[${new Date().toISOString()}] ${name}: completed`, { result })
  } catch (err) {
    log.error(`[${new Date().toISOString()}] ${name}: failed`, { err })
  }
}

async function main() {
  log.info(`[${new Date().toISOString()}] send-all-emails cron starting`)

  await runOne('send-claim-emails', sendPendingClaimEmails)
  await runOne('send-wrap-up-emails', sendPendingWrapUpEmails)
  await runOne('send-review-emails', sendPendingReviewEmails)

  log.info(`[${new Date().toISOString()}] send-all-emails cron finished`)
  process.exit(0)
}

main()
