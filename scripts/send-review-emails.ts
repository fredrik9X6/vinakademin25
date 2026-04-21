/**
 * Standalone cron script for sending review request emails.
 *
 * Meant to be run as a Railway Cron service:
 *   Start command: node --import tsx scripts/send-review-emails.ts
 *   Cron schedule: 0 *\/6 * * *  (every 6 hours)
 *
 * Uses Payload's local API directly — no HTTP server needed.
 */
import { sendPendingReviewEmails } from '../src/lib/send-review-emails'
import { loggerFor } from '../src/lib/logger'

const log = loggerFor('scripts-send-review-emails')

async function main() {
  log.info(`[${new Date().toISOString()}] Starting review email cron job...`)

  try {
    const result = await sendPendingReviewEmails()

    log.info(`[${new Date().toISOString()}] Review email cron completed:`)
    log.info(`  Processed: ${result.processed}`)
    log.info(`  Sent: ${result.sent}`)
    log.info(`  Errors: ${result.errors}`)
  } catch (error) {
    log.error(`[${new Date().toISOString()}] Review email cron failed:`, error)
    process.exit(1)
  }

  process.exit(0)
}

main()
