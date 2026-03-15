/**
 * Standalone cron script for sending review request emails.
 *
 * Meant to be run as a Railway Cron service:
 *   Start command: npx tsx scripts/send-review-emails.ts
 *   Cron schedule: 0 *\/6 * * *  (every 6 hours)
 *
 * Uses Payload's local API directly — no HTTP server needed.
 */
import { sendPendingReviewEmails } from '../src/lib/send-review-emails'

async function main() {
  console.log(`[${new Date().toISOString()}] Starting review email cron job...`)

  try {
    const result = await sendPendingReviewEmails()

    console.log(`[${new Date().toISOString()}] Review email cron completed:`)
    console.log(`  Processed: ${result.processed}`)
    console.log(`  Sent: ${result.sent}`)
    console.log(`  Errors: ${result.errors}`)
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Review email cron failed:`, error)
    process.exit(1)
  }

  process.exit(0)
}

main()
