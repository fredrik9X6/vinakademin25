/**
 * Standalone cron script for sending session claim emails.
 *
 * Meant to be run as a Railway Cron service:
 *   Start command: pnpm send-claim-emails
 *   Cron schedule: *\/10 * * * *  (every 10 minutes)
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
