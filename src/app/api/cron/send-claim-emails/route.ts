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
