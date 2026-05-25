import { NextRequest, NextResponse } from 'next/server'
import { sendPendingClaimEmails } from '@/lib/send-claim-emails'
import { sendPendingWrapUpEmails } from '@/lib/send-wrap-up-emails'
import { sendPendingReviewEmails } from '@/lib/send-review-emails'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('api-cron-send-all-emails')

/**
 * Combined HTTP cron endpoint. Runs all three email dispatchers in sequence
 * inside the already-warm Next.js process, reusing the cached Payload
 * singleton. This is dramatically cheaper on Neon compute than the
 * standalone `scripts/send-all-emails.ts` cron service, which cold-starts
 * Payload + opens a fresh Postgres connection every invocation.
 *
 * Each dispatcher is idempotent (state-stamps prevent double-sends), and a
 * failure in one doesn't block the others.
 *
 * Configure Railway Cron to hit this with the same `Authorization: Bearer
 * $CRON_SECRET` header used by the individual endpoints.
 */
export const dynamic = 'force-dynamic'

async function runOne<T>(name: string, fn: () => Promise<T>) {
  try {
    const result = await fn()
    log.info({ name, result }, `${name}: completed`)
    return { name, ok: true, result }
  } catch (err) {
    log.error({ name, err }, `${name}: failed`)
    return { name, ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  log.info('send-all-emails cron starting')
  const results = await Promise.all([
    runOne('send-claim-emails', sendPendingClaimEmails),
    runOne('send-wrap-up-emails', sendPendingWrapUpEmails),
    runOne('send-review-emails', sendPendingReviewEmails),
  ])
  log.info({ results }, 'send-all-emails cron finished')

  return NextResponse.json({ success: true, results })
}

export async function GET(req: NextRequest) {
  return POST(req)
}
