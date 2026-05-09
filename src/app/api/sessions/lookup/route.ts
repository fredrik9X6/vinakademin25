import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { lookupSessionByCode } from '@/lib/sessions'

/**
 * GET /api/sessions/lookup?code=ABC123
 *
 * Read-only status check. Always returns 200 with a `status` field; the page
 * branches on status rather than HTTP code. See lookupSessionByCode in
 * src/lib/sessions.ts for the status semantics.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const payload = await getPayload({ config })
  const result = await lookupSessionByCode(payload, code)

  return NextResponse.json(result, {
    status: 200,
    headers: {
      // Don't cache between participants — status flips matter for the paused
      // → active recovery flow.
      'Cache-Control': 'no-store',
    },
  })
}
