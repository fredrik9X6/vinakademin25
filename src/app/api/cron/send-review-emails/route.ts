import { NextRequest, NextResponse } from 'next/server'
import { sendPendingReviewEmails } from '@/lib/send-review-emails'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('api-cron-send-review-emails')

/**
 * HTTP endpoint for triggering review emails.
 * Useful for manual triggers or external cron services.
 * The standalone script (scripts/send-review-emails.ts) is preferred for Railway Cron.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await sendPendingReviewEmails()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    log.error('Error in send-review-emails cron:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return POST(req)
}
