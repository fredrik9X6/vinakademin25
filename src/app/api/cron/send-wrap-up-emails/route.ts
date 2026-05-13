import { NextRequest, NextResponse } from 'next/server'
import { sendPendingWrapUpEmails } from '@/lib/send-wrap-up-emails'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('api-cron-send-wrap-up-emails')

/**
 * HTTP twin of the wrap-up email cron job.
 * Useful for manual triggers and external cron services.
 * The standalone script (scripts/send-wrap-up-emails.ts) is preferred for
 * Railway Cron — same logic, no HTTP overhead.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await sendPendingWrapUpEmails()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    log.error({ err: error }, 'Error in send-wrap-up-emails cron')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return POST(req)
}
