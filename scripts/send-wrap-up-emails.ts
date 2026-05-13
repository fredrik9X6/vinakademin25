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
